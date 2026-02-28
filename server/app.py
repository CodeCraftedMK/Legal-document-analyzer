from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, StreamingResponse
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List
import os
import shutil
import asyncio
import hashlib
import pdfplumber
import jwt
from passlib.context import CryptContext
import datetime
from bson import ObjectId
import json

from utils import predict_clauses as clause_utils
from utils import summarizer
from db import db

# Import new chat modules
try:
    from utils import chat
    from utils.conversation_manager import ConversationManager
    CHAT_AVAILABLE = True
    conversation_manager = ConversationManager(db)
except ImportError as e:
    print(f"⚠️ Chat not available: {e}. Continuing without chat support.")
    CHAT_AVAILABLE = False
    chat = None
    conversation_manager = None

# RAG is optional
try:
    from utils import rag
    RAG_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ RAG not available: {e}. Continuing without RAG support.")
    RAG_AVAILABLE = False
    rag = None

# ----------------------
# APP SETUP
# ----------------------
app = FastAPI(title="Legal Clause Classifier API with Chat")

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount static directories
app.mount("/uploads", StaticFiles(directory="../client/uploads"), name="uploads")
app.mount("/node_modules", StaticFiles(directory="../client/node_modules"), name="node_modules")


# ----------------------
# AUTH CONFIGURATION
# ----------------------
SECRET_KEY = "your_secret_key_here"  # replace with a strong secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict, expires_delta: datetime.timedelta = None):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db["users"].find_one({"username": username})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----------------------
# STARTUP
# ----------------------
@app.on_event("startup")
def load_model_once():
    global model_loaded
    if not hasattr(clause_utils, "model"):
        clause_utils.tokenizer = clause_utils.tokenizer
        clause_utils.model = clause_utils.model
    model_loaded = True
    print("✅ LegalBERT model loaded and ready for inference")
    if CHAT_AVAILABLE:
        print("✅ Chat system initialized")


# ----------------------
# MODELS
# ----------------------
class PDFRequest(BaseModel):
    pdf_path: str

class ClauseSummaryRequest(BaseModel):
    text: str
    job_id: str
    prev_text: str = ""
    next_text: str = ""
    clause_no: int = 0

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

# New Chat Models
class ChatRequest(BaseModel):
    job_id: str
    message: str
    conversation_id: Optional[str] = None

class CreateConversationRequest(BaseModel):
    job_id: str
    title: Optional[str] = None

class UpdateConversationRequest(BaseModel):
    title: str


# ----------------------
# UTILS
# ----------------------
def compute_file_hash(path: str) -> str:
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha.update(chunk)
    return sha.hexdigest()


async def get_cached_clauses(pdf_path: str):
    file_hash = compute_file_hash(pdf_path)
    cached = await db["clause_cache"].find_one({"file_hash": file_hash})
    return cached["predicted_clauses"] if cached else None, file_hash


async def cache_clauses(file_hash: str, clauses: list, pdf_path: str):
    await db["clause_cache"].update_one(
        {"file_hash": file_hash},
        {
            "$set": {
                "predicted_clauses": clauses,
                "pdf_path": pdf_path,
                "updated_at": datetime.datetime.utcnow(),
            }
        },
        upsert=True,
    )


def extract_full_text(pdf_path: str) -> str:
    text = ""
    try:
        if not os.path.exists(pdf_path):
            print(f"❌ PDF file not found: {pdf_path}")
            return ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text.strip()
    except Exception as exc:
        print(f"❌ Error extracting full text: {exc}")
        return ""


async def run_summarization_job(job_id: str, pdf_path: str):
    job_object_id = ObjectId(job_id)
    start_time = datetime.datetime.utcnow()
    try:
        await db["summaries"].update_one(
            {"_id": job_object_id},
            {"$set": {"status": "PROCESSING", "started_at": start_time}},
        )
        loop = asyncio.get_running_loop()
        cached_clauses, file_hash = await get_cached_clauses(pdf_path)
        if cached_clauses:
            clauses = cached_clauses
        else:
            clauses = await loop.run_in_executor(None, clause_utils.predict_clauses, pdf_path)
            await cache_clauses(file_hash, clauses, pdf_path)

        if RAG_AVAILABLE and rag:
            try:
                await loop.run_in_executor(None, rag.index_document, job_id, clauses)
            except Exception as rag_error:
                print(f"⚠️ RAG indexing failed: {rag_error}")

        full_doc_text = await loop.run_in_executor(None, extract_full_text, pdf_path)
        try:
            document_summary = await summarizer.generate_general_summary_map_reduce(full_doc_text)
        except:
            document_summary = "Executive summary unavailable"

        await db["summaries"].update_one(
            {"_id": job_object_id},
            {
                "$set": {
                    "status": "COMPLETED",
                    "clause_summaries": [],
                    "document_summary": document_summary,
                    "model_version": summarizer.MODEL_VERSION,
                    "prompt_version": summarizer.PROMPT_VERSION,
                    "failure_count": 0,
                    "total_clauses": len(clauses),
                    "completed_at": datetime.datetime.utcnow(),
                    "clauses": clauses,  # Store clauses for chat context
                }
            },
        )
    except Exception as exc:
        await db["summaries"].update_one(
            {"_id": job_object_id},
            {
                "$set": {
                    "status": "FAILED",
                    "error": str(exc),
                    "completed_at": datetime.datetime.utcnow(),
                }
            },
        )


# ----------------------
# AUTH ROUTES
# ----------------------
@app.options("/register")
async def register_options():
    return Response(status_code=200)

@app.options("/login")
async def login_options():
    return Response(status_code=200)

@app.options("/me")
async def me_options():
    return Response(status_code=200)

@app.post("/register")
async def register(request: RegisterRequest):
    if await db["users"].find_one({"username": request.username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    if await db["users"].find_one({"email": request.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = hash_password(request.password)
    await db["users"].insert_one({
        "username": request.username,
        "email": request.email,
        "password": hashed_pw,
        "created_at": datetime.datetime.utcnow(),
    })
    return {"message": "User registered successfully"}


@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db["users"].find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": user["username"]})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"], "email": current_user["email"]}


# ----------------------
# FILE UPLOAD ROUTES
# ----------------------
@app.options("/upload")
async def upload_options():
    return Response(status_code=200)


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    upload_dir = "../client/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"message": "File uploaded successfully", "file_path": file_path}


# ----------------------
# SUMMARIZATION ROUTES
# ----------------------
@app.post("/summaries/start")
async def start_summarization(request: PDFRequest):
    pdf_path = request.pdf_path
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    job_doc = {
        "pdf_path": pdf_path,
        "status": "PENDING",
        "created_at": datetime.datetime.utcnow(),
        "model_version": summarizer.MODEL_VERSION,
        "prompt_version": summarizer.PROMPT_VERSION,
        "clause_summaries": [],
        "document_summary": None,
        "failure_count": 0,
        "total_clauses": 0,
        "error": None,
    }
    insert_result = await db["summaries"].insert_one(job_doc)
    job_id = str(insert_result.inserted_id)
    asyncio.create_task(run_summarization_job(job_id, pdf_path))
    return {"job_id": job_id, "status": "PENDING"}


@app.get("/summaries/{job_id}")
async def get_summarization(job_id: str):
    try:
        job_oid = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job_id format")
    job = await db["summaries"].find_one({"_id": job_oid})
    if not job:
        raise HTTPException(status_code=404, detail="Summarization job not found")
    job["id"] = str(job.pop("_id"))
    return jsonable_encoder(job)


@app.post("/summaries/clause")
async def summarize_single_clause(request: ClauseSummaryRequest):
    try:
        retriever = None
        if RAG_AVAILABLE and rag:
            loop = asyncio.get_running_loop()
            retriever = await loop.run_in_executor(None, rag.get_retriever, request.job_id)
        summary, failed = await summarizer.generate_clause_summary(
            target_text=request.text,
            prev_text=request.prev_text,
            next_text=request.next_text,
            retriever=retriever
        )
        if failed:
            raise HTTPException(status_code=500, detail="Summarization failed")
        return {"summary": summary}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Clause summarization error: {str(exc)}")


# ----------------------
# CLAUSE PREDICTION ROUTES
# ----------------------
@app.options("/predict-clauses")
async def predict_clauses_options():
    return Response(status_code=200)


@app.post("/predict-clauses")
async def predict_clauses(request: PDFRequest):
    pdf_path = request.pdf_path
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    if not hasattr(clause_utils, "model"):
        raise HTTPException(status_code=500, detail="Model not loaded yet")
    results = clause_utils.predict_clauses(pdf_path)
    file_hash = compute_file_hash(pdf_path)
    await cache_clauses(file_hash, results, pdf_path)
    await db["clauses"].insert_one({
        "pdf_path": pdf_path,
        "predicted_clauses": results,
        "timestamp": datetime.datetime.utcnow(),
    })
    return {"predicted_clauses": results, "saved_to_db": True}


# ----------------------
# CHAT ROUTES
# ----------------------
@app.options("/chat/conversations")
async def chat_conversations_options():
    return Response(status_code=200)

@app.options("/chat/message")
async def chat_message_options():
    return Response(status_code=200)


@app.post("/chat/conversations")
async def create_conversation(
    request: CreateConversationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new chat conversation for a document"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    # Verify the job exists
    try:
        job_oid = ObjectId(request.job_id)
        job = await db["summaries"].find_one({"_id": job_oid})
        if not job:
            raise HTTPException(status_code=404, detail="Document not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid job_id")
    
    conversation_id = await conversation_manager.create_conversation(
        user_id=current_user["username"],
        job_id=request.job_id,
        title=request.title
    )
    
    return {
        "conversation_id": conversation_id,
        "job_id": request.job_id,
        "created_at": datetime.datetime.utcnow().isoformat()
    }


@app.get("/chat/conversations")
async def list_conversations(
    job_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all conversations for the current user"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    conversations = await conversation_manager.get_user_conversations(
        user_id=current_user["username"],
        job_id=job_id
    )
    
    return {"conversations": conversations}


@app.get("/chat/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific conversation with all messages"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    conversation = await conversation_manager.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify user owns this conversation
    if conversation["user_id"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages = await conversation_manager.get_conversation_messages(conversation_id)
    
    return {
        "conversation": conversation,
        "messages": messages
    }


@app.post("/chat/message")
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message and get a response"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=503, detail="RAG system required for chat")
    
    try:
        # Create conversation if needed
        if not request.conversation_id:
            conversation_id = await conversation_manager.create_conversation(
                user_id=current_user["username"],
                job_id=request.job_id
            )
        else:
            conversation_id = request.conversation_id
            # Verify user owns this conversation
            conv = await conversation_manager.get_conversation(conversation_id)
            if not conv or conv["user_id"] != current_user["username"]:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Save user message
        await conversation_manager.add_message(
            conversation_id=conversation_id,
            role="user",
            content=request.message
        )
        
        # Get conversation history
        history = await conversation_manager.get_recent_messages(
            conversation_id=conversation_id,
            limit=5
        )
        
        # Check if we need RAG or just quick response
        if chat.should_use_rag(request.message):
            # Get retriever for this document
            loop = asyncio.get_running_loop()
            retriever = await loop.run_in_executor(None, rag.get_retriever, request.job_id)
            
            # Generate response
            response_text, sources = await chat.generate_chat_response(
                question=request.message,
                retriever=retriever,
                conversation_history=history
            )
        else:
            # Quick response for greetings, etc.
            response_text = await chat.generate_quick_response(request.message)
            sources = []
        
        # Save assistant message
        await conversation_manager.add_message(
            conversation_id=conversation_id,
            role="assistant",
            content=response_text,
            sources=sources
        )
        
        return {
            "conversation_id": conversation_id,
            "response": response_text,
            "sources": sources
        }
    
    except Exception as exc:
        print(f"❌ Chat error: {exc}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat error: {str(exc)}")


@app.post("/chat/message/stream")
async def send_message_stream(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message and get a streaming response"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=503, detail="RAG system required for chat")
    
    try:
        # Create conversation if needed
        if not request.conversation_id:
            conversation_id = await conversation_manager.create_conversation(
                user_id=current_user["username"],
                job_id=request.job_id
            )
        else:
            conversation_id = request.conversation_id
            # Verify user owns this conversation
            conv = await conversation_manager.get_conversation(conversation_id)
            if not conv or conv["user_id"] != current_user["username"]:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Save user message
        await conversation_manager.add_message(
            conversation_id=conversation_id,
            role="user",
            content=request.message
        )
        
        # Get conversation history
        history = await conversation_manager.get_recent_messages(
            conversation_id=conversation_id,
            limit=5
        )
        
        # Get retriever for this document
        loop = asyncio.get_running_loop()
        retriever = await loop.run_in_executor(None, rag.get_retriever, request.job_id)
        
        # Stream response
        async def generate_stream():
            full_response = ""
            async for chunk in chat.generate_streaming_response(
                question=request.message,
                retriever=retriever,
                conversation_history=history
            ):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            # Save complete response
            await conversation_manager.add_message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response
            )
            
            yield f"data: {json.dumps({'done': True, 'conversation_id': conversation_id})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream"
        )
    
    except Exception as exc:
        print(f"❌ Streaming chat error: {exc}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(exc)}")


@app.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a conversation"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    # Verify ownership
    conv = await conversation_manager.get_conversation(conversation_id)
    if not conv or conv["user_id"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    success = await conversation_manager.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"message": "Conversation deleted successfully"}


@app.patch("/chat/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    request: UpdateConversationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update conversation title"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    # Verify ownership
    conv = await conversation_manager.get_conversation(conversation_id)
    if not conv or conv["user_id"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    success = await conversation_manager.update_conversation_title(
        conversation_id=conversation_id,
        title=request.title
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"message": "Conversation updated successfully"}


@app.get("/chat/suggestions/{job_id}")
async def get_suggested_questions(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get suggested questions based on the document"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    try:
        # Get the document summary
        job_oid = ObjectId(job_id)
        job = await db["summaries"].find_one({"_id": job_oid})
        
        if not job:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document_summary = job.get("document_summary", "")
        clauses = job.get("clauses", [])
        
        # Determine document type
        doc_type = await chat.analyze_contract_type(clauses)
        
        # Generate suggestions
        suggestions = await chat.generate_suggested_questions(
            document_summary=document_summary,
            doc_type=doc_type
        )
        
        return {
            "suggestions": suggestions,
            "document_type": doc_type
        }
    
    except Exception as exc:
        print(f"❌ Suggestions error: {exc}")
        # Return default suggestions on error
        return {
            "suggestions": [
                "What are the key obligations in this contract?",
                "What are the termination conditions?",
                "Are there any payment terms specified?",
                "What are the main risks or liabilities?"
            ],
            "document_type": "legal contract"
        }


@app.get("/chat/stats")
async def get_chat_stats(current_user: dict = Depends(get_current_user)):
    """Get user's chat statistics"""
    if not CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Chat feature not available")
    
    stats = await conversation_manager.get_conversation_stats(
        user_id=current_user["username"]
    )
    
    return stats


# ----------------------
# WARMUP
# ----------------------
@app.get("/warmup")
async def warmup():
    load_model_once()
    try:
        summary_text, failed = await summarizer.generate_clause_summary(
            "This is a warmup clause.", "", "", None
        )
        status = "ok" if not failed else "llm_error"
    except Exception as exc:
        status = f"error: {exc}"
    return {"status": status, "chat_available": CHAT_AVAILABLE}


# ----------------------
# HEALTH CHECK
# ----------------------
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "features": {
            "chat": CHAT_AVAILABLE,
            "rag": RAG_AVAILABLE,
            "summarization": True
        }
    }


# ----------------------
# RUN
# ----------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)