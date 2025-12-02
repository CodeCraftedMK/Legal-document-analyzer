from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
import os
import shutil
import asyncio
from utils import predict_clauses as clause_utils
from utils import summarizer
from db import db
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


async def run_summarization_job(job_id: str, pdf_path: str):
    """
    Asynchronously run clause-level + document-level summarization.
    Uses sliding window context (previous + next clause).
    """
    job_object_id = ObjectId(job_id)
    start_time = datetime.datetime.utcnow()

    try:
        await db["summaries"].update_one(
            {"_id": job_object_id},
            {"$set": {"status": "PROCESSING", "started_at": start_time}},
        )

        loop = asyncio.get_running_loop()
        clauses = await loop.run_in_executor(None, clause_utils.predict_clauses, pdf_path)

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

        clause_summaries = []
        failure_count = 0

        for idx, clause in enumerate(clauses):
            current_text = clause.get("clause", "")
            prev_text = clauses[idx - 1]["clause"] if idx > 0 else ""
            next_text = clauses[idx + 1]["clause"] if idx < len(clauses) - 1 else ""

            summary_text, failed = await summarizer.generate_clause_summary(
                current_text, prev_text, next_text
            )
            failure_count += 1 if failed else 0

            clause_summaries.append(
                {
                    "clause_no": clause.get("clause_no", idx + 1),
                    "category": clause.get("category", "Unknown"),
                    "original_text": current_text,
                    "summary_text": summary_text,
                    "is_failed": bool(failed),
                    "model_version": summarizer.MODEL_VERSION,
                    "prompt_version": summarizer.PROMPT_VERSION,
                }
            )

        valid_clause_summaries = [
            c["summary_text"] for c in clause_summaries if not c["is_failed"]
        ]
        document_summary = await summarizer.generate_document_summary(
            valid_clause_summaries
        )

        if failure_count == 0:
            status = "COMPLETED"
        elif failure_count == len(clause_summaries):
            status = "FAILED"
        else:
            status = "PARTIAL_FAILURE"

        await db["summaries"].update_one(
            {"_id": job_object_id},
            {
                "$set": {
                    "status": status,
                    "clause_summaries": clause_summaries,
                    "document_summary": document_summary,
                    "model_version": summarizer.MODEL_VERSION,
                    "prompt_version": summarizer.PROMPT_VERSION,
                    "failure_count": failure_count,
                    "total_clauses": len(clause_summaries),
                    "completed_at": datetime.datetime.utcnow(),
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

    # Save to MongoDB
    doc = {
        "pdf_path": pdf_path,
        "predicted_clauses": results,
        "timestamp": datetime.datetime.utcnow(),
    }
    await db["clauses"].insert_one(doc)

    return {"predicted_clauses": results, "saved_to_db": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
