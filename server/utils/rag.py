import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

# 1. Setup Embeddings (We use a small, fast local model)
# "all-MiniLM-L6-v2" is standard, fast, and runs on CPU.
embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# 2. Initialize Vector DB (Chroma)
# We use a persistent directory so data survives server restarts
VECTOR_DB_DIR = "./chroma_db"


def index_document(doc_id: str, clauses: list):
    """
    Takes the extracted clauses and saves them into the Vector DB.
    """
    vectorstore = Chroma(
        collection_name=f"doc_{doc_id}",
        embedding_function=embedding_function,
        persist_directory=VECTOR_DB_DIR
    )
    
    # Convert your clauses dict to LangChain Documents
    docs = []
    for item in clauses:
        text = item.get("clause", "")
        # Add metadata so we know where this text came from
        meta = {"clause_no": item.get("clause_no"), "category": item.get("category")}
        docs.append(Document(page_content=text, metadata=meta))
    
    # Add to database
    if docs:
        vectorstore.add_documents(docs)
        print(f"✅ Indexed {len(docs)} clauses for RAG (Doc ID: {doc_id})")
    
    return vectorstore


def get_retriever(doc_id: str):
    """
    Returns a tool that lets you search this specific document.
    """
    vectorstore = Chroma(
        collection_name=f"doc_{doc_id}",
        embedding_function=embedding_function,
        persist_directory=VECTOR_DB_DIR
    )
    # Search for top 3 most relevant chunks
    return vectorstore.as_retriever(search_kwargs={"k": 3})


