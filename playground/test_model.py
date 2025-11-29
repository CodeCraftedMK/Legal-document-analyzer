import re
import torch
import pdfplumber
import json
import pandas as pd
from transformers import AutoTokenizer, AutoModelForTokenClassification

MODEL_PATH = "../models/fine-tuned-legalbert"
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
model.eval()

PDF_PATH = "LegacyEducationAllianceInc_20200330_10-K_EX-10.18_12090678_EX-10.18_Development Agreement.pdf"

def extract_pdf_text(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

text = extract_pdf_text(PDF_PATH)

def split_into_clauses(text):
    clauses = re.split(r'\n{2,}|(?<=\.)\s+(?=[A-Z])', text)
    clauses = [c.strip() for c in clauses if len(c.strip()) > 20]
    return clauses

clauses = split_into_clauses(text)
print(f"Extracted {len(clauses)} clauses from PDF")

def classify_clause(clause):
    inputs = tokenizer(clause, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    preds = torch.argmax(outputs.logits, dim=-1)
    id2label = model.config.id2label
    labels = [id2label[p.item()] for p in preds[0]]
    non_o_labels = [l for l in labels if l != "O"]
    return max(set(non_o_labels), key=non_o_labels.count) if non_o_labels else "Other"

results = []
for i, clause in enumerate(clauses, start=1):
    category = classify_clause(clause)
    results.append({"clause_no": int(i), "category": str(category), "clause": str(clause)})

print("📊 Classified Clauses:\n" + "-" * 70)
useful_results = [r for r in results if r["category"] != "Other"]
if not useful_results:
    print("No meaningful clauses detected.")
else:
    print(f"{len(useful_results)} useful clauses found\n" + "-" * 70)
    serializable_results = json.loads(json.dumps(useful_results, default=str))
    print(serializable_results)