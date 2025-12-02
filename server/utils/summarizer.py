import os
from typing import List, Tuple

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_ollama import ChatOllama

# -----------------------------------------------------------------------------
# Configuration (audit-friendly)
# -----------------------------------------------------------------------------
MODEL_VERSION = os.getenv("LLM_MODEL_VERSION", "llama3-legal-v1")
PROMPT_VERSION = os.getenv("LLM_PROMPT_VERSION", "v2.0-context-aware")

# -----------------------------------------------------------------------------
# LLM Client (local Ollama; adjust base_url/model as needed)
# -----------------------------------------------------------------------------
llm = ChatOllama(
    model=os.getenv("LLM_MODEL_NAME", "llama3"),
    temperature=float(os.getenv("LLM_TEMPERATURE", "0.1")),
    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
)

# -----------------------------------------------------------------------------
# Prompts
# -----------------------------------------------------------------------------
clause_template = """
You are an expert legal analyst. Summarize the TARGET CLAUSE below.

CONTEXT INFORMATION:
The surrounding clauses are provided only for disambiguation; do NOT summarize them.

--- BEGIN CONTEXT ---
PREVIOUS CLAUSE: {prev_text}
NEXT CLAUSE: {next_text}
--- END CONTEXT ---

TARGET CLAUSE:
"{target_text}"

INSTRUCTIONS:
1. One concise sentence capturing the obligation/right/definition.
2. If boilerplate, state that briefly.
3. Avoid lead-ins like "The clause states that...".

Summary:
"""
clause_prompt = PromptTemplate.from_template(clause_template)
clause_chain = clause_prompt | llm | StrOutputParser()

doc_template = """
You are a Senior Legal Partner. Based on the clause summaries below, write an Executive Summary.

LIST OF CLAUSE SUMMARIES:
{clause_summaries_text}

FORMAT:
- **Core Purpose**: what the agreement covers
- **Key Obligations**: what parties must do
- **Risks & Termination**: how disputes/termination are handled

Executive Summary:
"""
doc_prompt = PromptTemplate.from_template(doc_template)
doc_chain = doc_prompt | llm | StrOutputParser()


async def generate_clause_summary(
    target_text: str, prev_text: str = "", next_text: str = ""
) -> Tuple[str, bool]:
    """
    Asynchronously summarize a single clause using sliding-window context.
    Returns (summary_text, is_failed).
    """
    try:
        inputs = {
            "target_text": target_text,
            "prev_text": prev_text if prev_text else "None",
            "next_text": next_text if next_text else "None",
        }
        summary = await clause_chain.ainvoke(inputs)
        return summary.strip(), False
    except Exception as exc:
        print(f"Summarization error (clause): {exc}")
        return "Summary unavailable due to processing error.", True


async def generate_document_summary(clause_summaries: List[str]) -> str:
    """
    Aggregate clause-level summaries into a document-level executive summary.
    """
    if not clause_summaries:
        return "No clause summaries available to generate document overview."
    try:
        joined = "\n- ".join(clause_summaries)
        summary = await doc_chain.ainvoke({"clause_summaries_text": joined})
        return summary.strip()
    except Exception as exc:
        print(f"Summarization error (document): {exc}")
        return "Document summary unavailable due to processing error."
