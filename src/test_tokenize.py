import os, json, torch
from transformers import AutoTokenizer

TOK_DIR = "data/tokenized"
REQ = ["input_ids.pt", "attention_masks.pt", "labels.pt", "metadata.json"]

def test():
    print("🔍 Validating tokenized output…")
    missing = [f for f in REQ if not os.path.exists(os.path.join(TOK_DIR,f))]
    if missing:
        print("❌ Missing files:", missing); return

    ids  = torch.load(os.path.join(TOK_DIR,"input_ids.pt"))
    mask = torch.load(os.path.join(TOK_DIR,"attention_masks.pt"))
    lab  = torch.load(os.path.join(TOK_DIR,"labels.pt"))
    meta = json.load(open(os.path.join(TOK_DIR,"metadata.json")))

    assert ids.shape == mask.shape, "input_ids & attention_mask mismatch"
    assert ids.size(0) == lab.size(0), "Sample count mismatch"
    assert ids.size(1) == 512, "Sequence length ≠ 512"

    tok = AutoTokenizer.from_pretrained(meta["model_name"])
    print(f"✅ {ids.size(0)} samples, each 512 tokens")
    print(f"🏷️  Labels: {meta['unique_labels']}")
    print(f"📊 Distribution: {meta['label_distribution']}")
    print("🔍 First 20 tokens of sample 0:", tok.convert_ids_to_tokens(ids[0][:20]))

if __name__ == "__main__":
    test() 