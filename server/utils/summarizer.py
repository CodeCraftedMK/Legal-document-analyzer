import os
from typing import List, Tuple, Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.retrievers import BaseRetriever
from langchain_ollama import ChatOllama
from langchain_text_splitters import RecursiveCharacterTextSplitter

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
MODEL_VERSION = os.getenv("LLM_MODEL_VERSION", "llama3-legal-v1")
PROMPT_VERSION = os.getenv("LLM_PROMPT_VERSION", "v3.0-map-reduce")

# -----------------------------------------------------------------------------
# LLM Client
# -----------------------------------------------------------------------------
llm = ChatOllama(
    model=os.getenv("LLM_MODEL_NAME", "tinyllama"),
    temperature=0.1,
    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
    num_ctx=8192 # Ensure context window is large enough for chunks
)

# -----------------------------------------------------------------------------
# 1. CLAUSE SUMMARIZATION PROMPTS (Micro-Level)
# -----------------------------------------------------------------------------
clause_template = """
You are an expert legal analyst. Summarize the TARGET CLAUSE below.

CONTEXT:
{rag_context}

TARGET CLAUSE:
"{target_text}"

INSTRUCTIONS:
1. One concise sentence capturing the obligation/right.
2. Use the context to clarify defined terms.

Summary:
"""
clause_prompt = PromptTemplate.from_template(clause_template)
clause_chain = clause_prompt | llm | StrOutputParser()

# -----------------------------------------------------------------------------
# 2. GENERAL SUMMARIZATION PROMPTS (Macro-Level / Map-Reduce)
# -----------------------------------------------------------------------------
# MAP STEP: Summarize a chunk of the raw document
map_template = """
Summarize the following section of a legal document. Capture key terms, dates, financial figures, and obligations.

DOCUMENT SECTION:
"{text}"

CONCISE SUMMARY:
"""
map_prompt = PromptTemplate.from_template(map_template)
map_chain = map_prompt | llm | StrOutputParser()

# REDUCE STEP: Combine chunk summaries into final executive summary
reduce_template = """
You are a Senior Legal Partner. Below are summaries of different sections of a contract.

Merge them into a cohesive, professional Executive Summary.

SECTION SUMMARIES:
{text}

FORMAT:
- **Core Purpose**: The main goal of the agreement.
- **Key Terms**: Financials, dates, and major deliverables.
- **Critical Risks**: Liabilities, indemnities, and termination rights.

Executive Summary:
"""
reduce_prompt = PromptTemplate.from_template(reduce_template)
reduce_chain = reduce_prompt | llm | StrOutputParser()

# -----------------------------------------------------------------------------
# FUNCTIONS
# -----------------------------------------------------------------------------
async def generate_clause_summary(
    target_text: str, 
    prev_text: str = "", 
    next_text: str = "",
    retriever: Optional[BaseRetriever] = None
) -> Tuple[str, bool]:
    """
    Summarize specific extracted clauses (High precision).
    """
    try:
        rag_context = f"PREV: {prev_text}\nNEXT: {next_text}"
        
        if retriever:
            try:
                # Use sync invoke if async not supported by specific retriever version
                docs = await retriever.ainvoke(target_text)
                if docs:
                    rag_context += "\nRELATED:\n" + "\n".join([d.page_content[:200] for d in docs])
            except:
                pass
        inputs = {
            "target_text": target_text,
            "rag_context": rag_context,
        }
        summary = await clause_chain.ainvoke(inputs)
        return summary.strip(), False
    except Exception as exc:
        print(f"Clause Error: {exc}")
        return "Summary unavailable.", True

async def generate_general_summary_map_reduce(full_doc_text: str) -> str:
    """
    Splits the FULL document text into chunks, summarizes each, 
    and then aggregates them into an Executive Summary.
    """
    if not full_doc_text:
        print("⚠️ No text available for general summarization")
        return "No text available to summarize."
    
    if len(full_doc_text.strip()) < 50:
        print(f"⚠️ Text too short for summarization: {len(full_doc_text)} chars")
        return "Document text is too short to generate a meaningful summary."
    
    try:
        # 1. Split text into chunks (Llama 3 has 8k context, so 4k chunks are safe)
        print(f"📄 Starting Map-Reduce summarization. Document length: {len(full_doc_text)} characters")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        docs = text_splitter.create_documents([full_doc_text])
        print(f"📄 Split document into {len(docs)} chunks for general summarization.")

        if not docs or len(docs) == 0:
            print("⚠️ No chunks created from document")
            return "Unable to split document into processable chunks."

        # 2. MAP: Summarize each chunk
        chunk_summaries = []
        for idx, doc in enumerate(docs):
            try:
                print(f"  📝 Summarizing chunk {idx + 1}/{len(docs)}...")
                summary = await map_chain.ainvoke({"text": doc.page_content})
                if summary and summary.strip():
                    chunk_summaries.append(summary.strip())
                else:
                    print(f"  ⚠️ Chunk {idx + 1} returned empty summary")
            except Exception as chunk_error:
                print(f"  ❌ Error summarizing chunk {idx + 1}: {chunk_error}")
                import traceback
                traceback.print_exc()
                # Continue with other chunks even if one fails

        if not chunk_summaries:
            print("❌ No chunk summaries generated")
            return "Failed to generate summaries for document chunks."

        print(f"✅ Generated {len(chunk_summaries)} chunk summaries")

        # 3. REDUCE: Combine summaries
        combined_text = "\n\n".join(chunk_summaries)
        print(f"🔄 Combining {len(chunk_summaries)} summaries into executive summary...")
        final_summary = await reduce_chain.ainvoke({"text": combined_text})
        
        if not final_summary or not final_summary.strip():
            print("⚠️ Reduce step returned empty summary")
            return "Failed to generate final executive summary."
        
        print("✅ Executive summary generated successfully")
        return final_summary.strip()
    except Exception as exc:
        print(f"❌ General Summary Error: {exc}")
        import traceback
        traceback.print_exc()
        return f"Executive summary unavailable due to processing error: {str(exc)}"
