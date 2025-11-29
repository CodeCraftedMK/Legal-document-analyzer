from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from pydantic import BaseModel
import os
import shutil
from utils import predict_clauses as clause_utils
from db import db
import datetime

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