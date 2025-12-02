import re
import torch
import pdfplumber
import json
from transformers import AutoTokenizer, AutoModelForTokenClassification

MODEL_PATH = "../models/fine-tuned-legalbert"

print("Loading model and tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
model.eval()
print(f"Model loaded on {device}")

def extract_pdf_text(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()

def split_into_clauses(text):
    # Split on paragraph breaks or periods followed by uppercase letters
    clauses = re.split(r'\n{2,}|(?<=\.)\s+(?=[A-Z])', text)
    clauses = [c.strip() for c in clauses if len(c.strip()) > 20]
    return clauses

def classify_clauses(clauses, batch_size=8):
    all_preds = []
    id2label = model.config.id2label

    for i in range(0, len(clauses), batch_size):
        batch = clauses[i:i+batch_size]
        inputs = tokenizer(batch, return_tensors="pt", truncation=True, padding=True).to(device)

        with torch.no_grad():
            outputs = model(**inputs)

        preds = torch.argmax(outputs.logits, dim=-1)

        for pred in preds:
            labels = [id2label[p.item()] for p in pred]
            non_o_labels = [l for l in labels if l != "O"]
            label = max(set(non_o_labels), key=non_o_labels.count) if non_o_labels else "Other"
            all_preds.append(label)

    return all_preds

def predict_clauses(pdf_path):
    import time
    start = time.time()

    print(f"\\nProcessing PDF: {pdf_path}")
    text = extract_pdf_text(pdf_path)
    print(f"Text extraction done in {round(time.time() - start, 2)}s")

    clauses = split_into_clauses(text)
    print(f"Found {len(clauses)} clauses to classify")

    classify_start = time.time()
    categories = classify_clauses(clauses)
    print(f"Classification done in {round(time.time() - classify_start, 2)}s")

    results = [
        {"clause_no": i + 1, "category": categories[i], "clause": clauses[i]}
        for i in range(len(clauses))
    ]

    useful_results = [r for r in results if r["category"] != "Other"]
    serializable_results = []
    if not useful_results:
        print("No meaningful clauses detected.")
    else:
        print(f"{len(useful_results)} meaningful clauses detected.")
        print("-" * 70)
        for r in useful_results[:10]:  # print only first 10 for readability
            print(f"Category: {r['category']}")
            print(f"Text: {r['clause'][:150]}...")
            print("-" * 70)
        serializable_results = json.loads(json.dumps(useful_results, default=str))

    print(f"�o. Total processing time: {round(time.time() - start, 2)}s\\n")
    return serializable_results
