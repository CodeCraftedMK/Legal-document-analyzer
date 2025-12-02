import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

# 1. Define paths
# Use the exact folder path from your screenshot
adapter_path = "/content/drive/MyDrive/mistral-7b-legal-lora" 
# The base model you fine-tuned on (usually v0.1 or Instruct-v0.1)
base_model_id = "mistralai/Mistral-7B-v0.1" 

# 2. Load Base Model (with 4-bit quantization for efficiency)
# If you have a massive GPU (A100), you can remove quantization_config
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)

print("Loading base model...")
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_id,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True
)

# 3. Load Tokenizer
tokenizer = AutoTokenizer.from_pretrained(
    base_model_id,
    trust_remote_code=True
)
tokenizer.pad_token = tokenizer.eos_token

# 4. Attach Your Local Adapter
print("Loading adapter...")
model = PeftModel.from_pretrained(base_model, adapter_path)

# 5. Run Inference
# Since this is a legal summarization model, format your input accordingly
legal_text = """
14.2 Termination for Convenience. Either Party may terminate this Agreement at any time without cause upon providing at least sixty (60) days' prior written notice to the other Party. In the event of such termination, Company shall pay Provider for all Services performed and expenses incurred up to the effective date of termination. Upon the effective date of termination, Provider shall immediately cease all Services and shall return to Company all Confidential Information, data, and materials provided by Company in connection with this Agreement within ten (10) business days.
"""

# Apply the prompt template used during training (if any)
prompt = f"Summarize the following legal text:\n{legal_text}\nSummary:"

inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

print("Generating...")
with torch.no_grad():
    outputs = model.generate(
        **inputs, 
        max_new_tokens=150, 
        temperature=0.7, 
        do_sample=True
    )

print("-" * 30)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))