import os, json, pandas as pd, torch
from tqdm import tqdm
from transformers import AutoTokenizer

MODEL_NAME = "nlpaueb/legal-bert-base-uncased"
MAX_LEN = 512
BATCH_SIZE = 32

class LegalBertTokenizer:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        print(f"✅ Tokenizer loaded: {MODEL_NAME}")

    def encode_batch(self, texts, labels=None):
        enc = self.tokenizer(
            texts, truncation=True, padding="max_length",
            max_length=MAX_LEN, return_tensors="pt"
        )
        out = {"input_ids": enc["input_ids"],
               "attention_mask": enc["attention_mask"]}
        if labels is not None:
            out["labels"] = torch.tensor(labels, dtype=torch.long)
        return out

    def tokenize_file(self, csv_in, out_dir):
        if not os.path.exists(csv_in):
            raise FileNotFoundError(f"{csv_in} not found.")
        os.makedirs(out_dir, exist_ok=True)

        df = pd.read_csv(csv_in)
        if {"text", "label"} - set(df.columns):
            raise ValueError("CSV must contain 'text' and 'label' columns.")

        ids, masks, labels = [], [], []
        for i in tqdm(range(0, len(df), BATCH_SIZE), desc="Tokenizing"):
            batch = df.iloc[i:i+BATCH_SIZE]
            enc = self.encode_batch(batch["text"].tolist(), batch["label"].tolist())
            ids.append(enc["input_ids"])
            masks.append(enc["attention_mask"])
            labels.append(enc["labels"])

        torch.save(torch.cat(ids),   os.path.join(out_dir, "input_ids.pt"))
        torch.save(torch.cat(masks), os.path.join(out_dir, "attention_masks.pt"))
        torch.save(torch.cat(labels),os.path.join(out_dir, "labels.pt"))

        meta = {
            "num_samples": len(df),
            "max_length": MAX_LEN,
            "model_name": MODEL_NAME,
            "unique_labels": df.label.unique().tolist(),
            "label_distribution": df.label.value_counts().to_dict()
        }
        json.dump(meta, open(os.path.join(out_dir, "metadata.json"), "w"), indent=2)
        print(f"✅ Saved tokenized tensors & metadata to {out_dir}")
        return meta

def main():
    input_csv = "data/processed/cleaned_legal_documents.csv"
    out_dir   = "data/tokenized"
    tokenizer = LegalBertTokenizer()
    tokenizer.tokenize_file(input_csv, out_dir)

if __name__ == "__main__":
    main() 