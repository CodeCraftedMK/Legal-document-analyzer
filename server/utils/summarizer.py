import os
from typing import List, Tuple, Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.retrievers import BaseRetriever
from langchain_ollama import ChatOllama

# -----------------------------------------------------------------------------
# Configuration (audit-friendly)
# -----------------------------------------------------------------------------
MODEL_VERSION = os.getenv("LLM_MODEL_VERSION", "llama3-legal-v1")
PROMPT_VERSION = os.getenv("LLM_PROMPT_VERSION", "v3.0-rag-enhanced")

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
The surrounding clauses and retrieved relevant clauses are provided for disambiguation; do NOT summarize them.

--- BEGIN CONTEXT ---
PREVIOUS CLAUSE: {prev_text}
NEXT CLAUSE: {next_text}
{rag_context}
--- END CONTEXT ---

TARGET CLAUSE:
"{target_text}"

INSTRUCTIONS:
1. One concise sentence capturing the obligation/right/definition.
2. If boilerplate, state that briefly.
3. Avoid lead-ins like "The clause states that...".
4. Use the retrieved context to understand references (e.g., "as defined in Section X").

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
    target_text: str, 
    prev_text: str = "", 
    next_text: str = "",
    retriever: Optional[BaseRetriever] = None
) -> Tuple[str, bool]:
    """
    Asynchronously summarize a single clause using sliding-window context + RAG.
    Returns (summary_text, is_failed).
    
    If retriever is provided, it will search for relevant clauses across the document
    to provide better context (e.g., definitions referenced in the target clause).
    """
    try:
        # RAG: Retrieve relevant clauses if retriever is available
        rag_context = ""
        if retriever and target_text:
            try:
                # Search for relevant clauses using the target clause text
                # Handle both langchain-core 0.3.x and 1.x API
                if hasattr(retriever, 'ainvoke'):
                    retrieved_docs = await retriever.ainvoke(target_text)
                elif hasattr(retriever, 'aget_relevant_documents'):
                    retrieved_docs = await retriever.aget_relevant_documents(target_text)
                else:
                    # Fallback to sync if async not available
                    retrieved_docs = retriever.get_relevant_documents(target_text)
                
                if retrieved_docs:
                    rag_parts = []
                    for doc in retrieved_docs:
                        # Skip if it's the same as prev/next to avoid duplication
                        doc_text = doc.page_content
                        if doc_text != prev_text and doc_text != next_text and doc_text != target_text:
                            clause_no = doc.metadata.get("clause_no", "?")
                            category = doc.metadata.get("category", "Unknown")
                            rag_parts.append(f"RELEVANT CLAUSE #{clause_no} ({category}): {doc_text[:200]}...")
                    
                    if rag_parts:
                        rag_context = "RETRIEVED RELEVANT CLAUSES:\n" + "\n".join(rag_parts) + "\n"
            except Exception as rag_error:
                print(f"RAG retrieval error (non-fatal): {rag_error}")
                # Continue without RAG context if retrieval fails
        
        inputs = {
            "target_text": target_text,
            "prev_text": prev_text if prev_text else "None",
            "next_text": next_text if next_text else "None",
            "rag_context": rag_context if rag_context else "",
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
