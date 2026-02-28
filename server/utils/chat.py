import os
from typing import List, Optional, AsyncIterator
from datetime import datetime

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.retrievers import BaseRetriever
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
CHAT_MODEL = os.getenv("CHAT_MODEL_NAME", "tinyllama")
CHAT_TEMPERATURE = float(os.getenv("CHAT_TEMPERATURE", "0.3"))

# -----------------------------------------------------------------------------
# LLM Client for Chat
# -----------------------------------------------------------------------------
chat_llm = ChatOllama(
    model=CHAT_MODEL,
    temperature=CHAT_TEMPERATURE,
    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
    num_ctx=8192
)

# Streaming LLM for real-time responses
streaming_llm = ChatOllama(
    model=CHAT_MODEL,
    temperature=CHAT_TEMPERATURE,
    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
    num_ctx=8192,
    streaming=True
)

# -----------------------------------------------------------------------------
# Chat Prompt Templates
# -----------------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert legal assistant specialized in contract analysis. Your role is to help users understand their legal documents by:

1. Answering questions accurately based on the contract content
2. Citing specific clauses when relevant
3. Explaining legal terms in plain language
4. Highlighting potential risks or important obligations
5. Being clear when information is not present in the contract

Always be precise, professional, and helpful. If you're unsure or the information isn't in the provided context, say so clearly."""

chat_template = """RELEVANT CONTRACT SECTIONS:
{context}

CONVERSATION HISTORY:
{history}

USER QUESTION: {question}

Based on the contract sections above and our conversation history, provide a clear and accurate answer. 
If the answer requires information not in the provided sections, clearly state that.

ANSWER:"""

chat_prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", chat_template)
])

# Chain for non-streaming responses
chat_chain = chat_prompt | chat_llm | StrOutputParser()

# Chain for streaming responses
streaming_chat_chain = chat_prompt | streaming_llm | StrOutputParser()

# -----------------------------------------------------------------------------
# Suggested Questions Generator
# -----------------------------------------------------------------------------
suggestions_template = """Based on this contract summary, generate 4 relevant questions a user might ask:

CONTRACT SUMMARY:
{summary}

DOCUMENT TYPE: {doc_type}

Generate 4 short, specific questions (max 10 words each) that would be useful for understanding this contract.
Format as a simple numbered list.

QUESTIONS:"""

suggestions_prompt = PromptTemplate.from_template(suggestions_template)
suggestions_chain = suggestions_prompt | chat_llm | StrOutputParser()

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def format_conversation_history(messages: List[dict], max_messages: int = 5) -> str:
    """
    Format recent conversation history for context.
    """
    if not messages:
        return "No previous conversation."
    
    # Get last N messages
    recent = messages[-max_messages:] if len(messages) > max_messages else messages
    
    formatted = []
    for msg in recent:
        role = "User" if msg["role"] == "user" else "Assistant"
        formatted.append(f"{role}: {msg['content']}")
    
    return "\n".join(formatted)


def extract_clause_references(docs: List) -> List[dict]:
    """
    Extract metadata from retrieved documents for citation.
    """
    references = []
    for doc in docs:
        ref = {
            "text": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
            "category": doc.metadata.get("category", "Unknown"),
            "clause_no": doc.metadata.get("clause_no", 0)
        }
        references.append(ref)
    return references


# -----------------------------------------------------------------------------
# Main Chat Functions
# -----------------------------------------------------------------------------
async def generate_chat_response(
    question: str,
    retriever: BaseRetriever,
    conversation_history: List[dict] = None,
    use_streaming: bool = False
) -> tuple[str, List[dict]]:
    """
    Generate a chat response using RAG and conversation history.
    
    Returns:
        tuple: (response_text, source_references)
    """
    try:
        # Retrieve relevant context from the document
        relevant_docs = await retriever.ainvoke(question)
        
        if not relevant_docs:
            context = "No relevant sections found in the document."
            sources = []
        else:
            context = "\n\n".join([
                f"[Clause {doc.metadata.get('clause_no', '?')} - {doc.metadata.get('category', 'Unknown')}]\n{doc.page_content}"
                for doc in relevant_docs
            ])
            sources = extract_clause_references(relevant_docs)
        
        # Format conversation history
        history = format_conversation_history(conversation_history or [])
        
        # Prepare inputs
        inputs = {
            "context": context,
            "history": history,
            "question": question
        }
        
        # Generate response
        if use_streaming:
            # For streaming, we'll return an async generator
            response = await streaming_chat_chain.ainvoke(inputs)
        else:
            response = await chat_chain.ainvoke(inputs)
        
        return response.strip(), sources
    
    except Exception as exc:
        print(f"❌ Chat Error: {exc}")
        import traceback
        traceback.print_exc()
        return "I apologize, but I encountered an error processing your question. Please try again.", []


async def generate_streaming_response(
    question: str,
    retriever: BaseRetriever,
    conversation_history: List[dict] = None
) -> AsyncIterator[str]:
    """
    Generate a streaming chat response.
    
    Yields chunks of the response as they're generated.
    """
    try:
        # Retrieve relevant context
        relevant_docs = await retriever.ainvoke(question)
        
        if not relevant_docs:
            context = "No relevant sections found in the document."
        else:
            context = "\n\n".join([
                f"[Clause {doc.metadata.get('clause_no', '?')} - {doc.metadata.get('category', 'Unknown')}]\n{doc.page_content}"
                for doc in relevant_docs
            ])
        
        # Format conversation history
        history = format_conversation_history(conversation_history or [])
        
        # Prepare inputs
        inputs = {
            "context": context,
            "history": history,
            "question": question
        }
        
        # Stream response
        async for chunk in streaming_chat_chain.astream(inputs):
            yield chunk
    
    except Exception as exc:
        print(f"❌ Streaming Chat Error: {exc}")
        yield "I apologize, but I encountered an error processing your question."


async def generate_suggested_questions(
    document_summary: str,
    doc_type: str = "legal contract"
) -> List[str]:
    """
    Generate suggested questions based on document summary.
    """
    try:
        inputs = {
            "summary": document_summary[:1000],  # Limit summary length
            "doc_type": doc_type
        }
        
        response = await suggestions_chain.ainvoke(inputs)
        
        # Parse the numbered list
        lines = response.strip().split("\n")
        questions = []
        for line in lines:
            # Remove numbering and clean up
            cleaned = line.strip()
            if cleaned and (cleaned[0].isdigit() or cleaned.startswith("-")):
                # Remove leading numbers, dots, dashes
                question = cleaned.lstrip("0123456789.-) ").strip()
                if question:
                    questions.append(question)
        
        return questions[:4]  # Return max 4 questions
    
    except Exception as exc:
        print(f"❌ Suggestions Error: {exc}")
        # Return default questions
        return [
            "What are the key obligations in this contract?",
            "What are the termination conditions?",
            "Are there any payment terms specified?",
            "What are the main risks or liabilities?"
        ]


async def analyze_contract_type(clauses: List[dict]) -> str:
    """
    Analyze the type of contract based on classified clauses.
    """
    if not clauses:
        return "general contract"
    
    # Count clause categories
    categories = {}
    for clause in clauses:
        cat = clause.get("category", "Other")
        categories[cat] = categories.get(cat, 0) + 1
    
    # Heuristics for contract type detection
    if categories.get("Employment", 0) > 2:
        return "employment contract"
    elif categories.get("Payment", 0) > 2 or categories.get("Pricing", 0) > 1:
        return "service agreement"
    elif categories.get("Confidentiality", 0) > 1:
        return "NDA or confidentiality agreement"
    elif categories.get("IP", 0) > 1 or categories.get("License", 0) > 1:
        return "licensing agreement"
    else:
        return "legal contract"


# -----------------------------------------------------------------------------
# Conversation Context Management
# -----------------------------------------------------------------------------
def should_use_rag(question: str) -> bool:
    """
    Determine if a question requires RAG or is just general conversation.
    """
    # Keywords that indicate need for document lookup
    document_keywords = [
        "clause", "section", "term", "condition", "obligation",
        "contract", "agreement", "document", "states", "says",
        "according", "specified", "mentioned", "payment", "liability",
        "termination", "deadline", "date", "party", "parties"
    ]
    
    question_lower = question.lower()
    
    # Check if question contains document-related keywords
    for keyword in document_keywords:
        if keyword in question_lower:
            return True
    
    # Check if it's a greeting or general question
    greetings = ["hello", "hi", "hey", "thanks", "thank you"]
    if any(greeting in question_lower for greeting in greetings):
        return False
    
    # Default to using RAG for safety
    return True


async def generate_quick_response(question: str) -> str:
    """
    Generate a quick response for non-document questions (greetings, etc.)
    """
    quick_prompt = f"""Respond briefly and professionally to this message: "{question}"
    
Keep it conversational and helpful. If they're asking about the contract, suggest they ask a specific question.

Response:"""
    
    try:
        response = await chat_llm.ainvoke(quick_prompt)
        return response.content if hasattr(response, 'content') else str(response)
    except:
        return "Hello! How can I help you understand your contract today?"