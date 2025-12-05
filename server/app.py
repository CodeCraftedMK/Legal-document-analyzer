from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
import os
import shutil
import asyncio
import hashlib
import pdfplumber
from utils import predict_clauses as clause_utils
from utils import summarizer
from db import db

# RAG is optional - import only if available
try:
    from utils import rag
    RAG_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ RAG not available: {e}. Continuing without RAG support.")
    RAG_AVAILABLE = False
    rag = None
import datetime
from bson import ObjectId

app = FastAPI(title="Legal Clause Classifier API")

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories for client uploads + PDF.js
app.mount("/uploads", StaticFiles(directory="../client/uploads"), name="uploads")
app.mount("/node_modules", StaticFiles(directory="../client/node_modules"), name="node_modules")

@app.on_event("startup")
def load_model_once():
    global model_loaded
    if not hasattr(clause_utils, "model"):
        clause_utils.tokenizer = clause_utils.tokenizer
        clause_utils.model = clause_utils.model
    model_loaded = True
    print("LegalBERT model loaded and ready for inference")

class PDFRequest(BaseModel):
    pdf_path: str

class ClauseSummaryRequest(BaseModel):
    text: str
    job_id: str  # To lookup RAG context
    prev_text: str = ""
    next_text: str = ""
    clause_no: int = 0


def compute_file_hash(path: str) -> str:
    """Return a stable SHA256 hash of the file contents."""
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
    """Extract all text from PDF for Map-Reduce summarization."""
    text = ""
    try:
        if not os.path.exists(pdf_path):
            print(f"❌ PDF file not found: {pdf_path}")
            return ""
        
        print(f"📖 Opening PDF: {pdf_path}")
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"📄 PDF has {total_pages} pages")
            
            for idx, page in enumerate(pdf.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                    else:
                        print(f"  ⚠️ Page {idx + 1} returned no text")
                except Exception as page_error:
                    print(f"  ❌ Error extracting text from page {idx + 1}: {page_error}")
                    continue
        
        extracted_length = len(text.strip())
        print(f"✅ Extracted {extracted_length} characters from PDF")
        return text.strip()
    except Exception as exc:
        print(f"❌ Error extracting full text from {pdf_path}: {exc}")
        import traceback
        traceback.print_exc()
        return ""


async def run_summarization_job(job_id: str, pdf_path: str):
    """
    Fast summarization: Only generates general Map-Reduce summary.
    Clause summaries are generated on-demand via /summaries/clause endpoint.
    """
    job_object_id = ObjectId(job_id)
    start_time = datetime.datetime.utcnow()

    try:
        await db["summaries"].update_one(
            {"_id": job_object_id},
            {"$set": {"status": "PROCESSING", "started_at": start_time}},
        )

        loop = asyncio.get_running_loop()
        
        # 1. Get clauses (for RAG indexing and frontend dropdown)
        cached_clauses, file_hash = await get_cached_clauses(pdf_path)
        if cached_clauses:
            print("✅ Using cached clause predictions")
            clauses = cached_clauses
        else:
            clauses = await loop.run_in_executor(None, clause_utils.predict_clauses, pdf_path)
            await cache_clauses(file_hash, clauses, pdf_path)

        if not clauses:
            await db["summaries"].update_one(
                {"_id": job_object_id},
                {
                    "$set": {
                        "status": "FAILED",
                        "error": "No clauses available for summarization",
                        "completed_at": datetime.datetime.utcnow(),
                    }
                },
            )
            return

        # 2. RAG: Index the document for semantic search (for on-demand clause summaries)
        if RAG_AVAILABLE and rag:
            print(f"📚 Indexing {len(clauses)} clauses into vector database for on-demand summaries...")
            try:
                await loop.run_in_executor(None, rag.index_document, job_id, clauses)
                print(f"✅ RAG indexing complete. Ready for on-demand clause summaries.")
            except Exception as rag_error:
                print(f"⚠️ RAG indexing failed (will continue without RAG): {rag_error}")
        else:
            print("ℹ️ RAG not available, on-demand summaries will use sliding window context only.")

        # 3. Extract full document text and generate ONLY general summary (Map-Reduce)
        print("📄 Extracting full document text for general summarization...")
        full_doc_text = await loop.run_in_executor(None, extract_full_text, pdf_path)
        
        if not full_doc_text or len(full_doc_text.strip()) < 50:
            print(f"⚠️ Warning: Extracted text is empty or too short ({len(full_doc_text) if full_doc_text else 0} chars)")
        else:
            print(f"✅ Extracted {len(full_doc_text)} characters from PDF")
        
        # Generate general summary only (no clause loop)
        try:
            document_summary = await summarizer.generate_general_summary_map_reduce(full_doc_text)
        except Exception as doc_summary_error:
            print(f"❌ Error generating document summary: {doc_summary_error}")
            import traceback
            traceback.print_exc()
            document_summary = f"Executive summary unavailable: {str(doc_summary_error)}"

        # 4. Save & Complete (clause_summaries is empty - generated on-demand)
        await db["summaries"].update_one(
            {"_id": job_object_id},
            {
                "$set": {
                    "status": "COMPLETED",
                    "clause_summaries": [],  # Empty - generated on-demand
                    "document_summary": document_summary,
                    "model_version": summarizer.MODEL_VERSION,
                    "prompt_version": summarizer.PROMPT_VERSION,
                    "failure_count": 0,
                    "total_clauses": len(clauses),  # Count for frontend dropdown
                    "completed_at": datetime.datetime.utcnow(),
                }
            },
        )
        print(f"✅ General summary completed. {len(clauses)} clauses available for on-demand summarization.")

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

@app.options("/upload")
async def upload_options():
    """Handle CORS preflight requests for upload"""
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


@app.post("/summaries/start")
async def start_summarization(request: PDFRequest):
    """
    Kick off summarization for a PDF that has already been uploaded.
    Returns a job_id that can be polled for status/results.
    """
    pdf_path = request.pdf_path
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    if not pdf_path.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

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

    # Fire-and-forget background task
    asyncio.create_task(run_summarization_job(job_id, pdf_path))

    return {"job_id": job_id, "status": "PENDING"}


@app.get("/summaries/{job_id}")
async def get_summarization(job_id: str):
    """
    Retrieve summarization status/results by job_id.
    """
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
    """
    On-demand summarization for a specific clause selected by the user.
    Uses RAG context if available for better accuracy.
    """
    try:
        # 1. Get Retriever for this document (if RAG is available)
        retriever = None
        if RAG_AVAILABLE and rag:
            try:
                loop = asyncio.get_running_loop()
                retriever = await loop.run_in_executor(None, rag.get_retriever, request.job_id)
                print(f"✅ Using RAG retriever for clause {request.clause_no}")
            except Exception as rag_error:
                print(f"⚠️ Could not get RAG retriever (will use sliding window only): {rag_error}")
                retriever = None
        else:
            print("ℹ️ RAG not available, using sliding window context only.")

        # 2. Generate Summary
        summary, failed = await summarizer.generate_clause_summary(
            target_text=request.text,
            prev_text=request.prev_text,
            next_text=request.next_text,
            retriever=retriever
        )

        if failed:
            raise HTTPException(status_code=500, detail="Summarization failed")

        return {"summary": summary}
    except HTTPException:
        raise
    except Exception as exc:
        print(f"❌ Error in clause summarization: {exc}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Clause summarization error: {str(exc)}")


@app.options("/predict-clauses")
async def predict_clauses_options():
    """Handle CORS preflight requests"""
    return Response(status_code=200)

@app.post("/predict-clauses")
async def predict_clauses(request: PDFRequest):
    pdf_path = request.pdf_path

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    if not pdf_path.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    if not hasattr(clause_utils, "model"):
        raise HTTPException(status_code=500, detail="Model not loaded yet")

    print(f"Analyzing: {pdf_path}")
    results = clause_utils.predict_clauses(pdf_path)

    file_hash = compute_file_hash(pdf_path)
    await cache_clauses(file_hash, results, pdf_path)

    # Save to MongoDB
    doc = {
        "pdf_path": pdf_path,
        "predicted_clauses": results,
        "timestamp": datetime.datetime.utcnow(),
    }
    await db["clauses"].insert_one(doc)

    return {"predicted_clauses": results, "saved_to_db": True}


@app.get("/warmup")
async def warmup():
    """
    Warmup endpoint to cache/load models and ensure LLM is responsive.
    """
    load_model_once()
    try:
        # lightweight ping to LLM
        summary_text, failed = await summarizer.generate_clause_summary(
            "This is a warmup clause.", "", "", None
        )
        status = "ok" if not failed else "llm_error"
    except Exception as exc:
        status = f"error: {exc}"
    return {"status": status}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
