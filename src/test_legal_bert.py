from transformers import AutoTokenizer, AutoModel
import torch

def test_legal_bert():
    print("🔍 Testing LEGAL-BERT setup…")
    model_name = "nlpaueb/legal-bert-base-uncased"
    tok = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)

    sample = "The plaintiff filed a motion for summary judgment based on contract breach."
    batch = tok(sample, return_tensors="pt", padding=True, truncation=True, max_length=512)

    with torch.no_grad():
        out = model(**batch)

    print(f"✅ Model loaded: {model_name}")
    print(f"📝 Sentence: {sample}")
    print(f"🔢 Token IDs shape: {batch['input_ids'].shape}")
    print(f"🎯 Attention mask shape: {batch['attention_mask'].shape}")
    print(f"🧠 Output shape: {out.last_hidden_state.shape}")
    print(f"📊 First 10 tokens: {tok.convert_ids_to_tokens(batch['input_ids'][0][:10])}")

if __name__ == "__main__":
    test_legal_bert() 