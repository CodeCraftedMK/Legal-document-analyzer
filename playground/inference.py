from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch  # ✅ make sure this line is included

# Path to your model folder
model_path = "../model"

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForTokenClassification.from_pretrained(model_path)
model.eval()  # Set model to inference mode

samples = [
    "The vendor shall indemnify and hold harmless the company against any losses.",
    "This agreement shall terminate automatically upon written notice from either party.",
    "The party shall maintain confidentiality of all proprietary information."
]

for text in samples:
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    predictions = torch.argmax(outputs.logits, dim=-1)
    id2label = model.config.id2label
    predicted_labels = [id2label[p.item()] for p in predictions[0]]
    print(f"\n{text}\nPredicted Labels: {set(predicted_labels)}")