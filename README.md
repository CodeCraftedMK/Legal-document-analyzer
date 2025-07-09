# Legal Document Analyzer

A 4-day sprint project to build a legal document classifier using LEGAL-BERT.

## Team Structure
- **Arslan**: Preprocessing, model training, evaluation plots
- **Member B**: Repo structure, visualizations, logging
- **Muhammad Abdullah Khan**: Dataset & tokenization pipeline, data splitting, evaluation metrics

## Setup Instructions

### Environment Setup
1. Create virtual environment:
   ```bash
   python -m venv legal-bert-env
   # Windows:
   .\legal-bert-env\Scripts\activate
   # macOS/Linux:
   source legal-bert-env/bin/activate
   ```

2. Install dependencies:
   ```bash
   python -m pip install --upgrade pip
   pip install "transformers[torch]" datasets pandas scikit-learn torch numpy matplotlib seaborn tqdm
   pip freeze > requirements.txt
   ```

### Project Structure
```
├── data/
│   ├── raw/          # Raw legal documents
│   ├── processed/    # Cleaned by Arslan
│   ├── tokenized/    # Tokenized by Abdullah
│   └── split/        # Train/val/test splits
├── models/           # Saved models
├── src/              # Source code
├── results/          # Evaluation results
└── requirements.txt  # Dependency lock file
```

### Testing
Run initial LEGAL-BERT test:
```bash
python src/test_legal_bert.py
```

## Tokenization Pipeline
Once Arslan provides the cleaned data in `data/processed/cleaned_legal_documents.csv`:

```bash
# Run tokenization
python src/legal_tokenizer.py

# Test tokenization output
python src/test_tokenize.py
```

After tokenization, you should have:
```
data/tokenized/
├── input_ids.pt          # Shape: (N, 512) - Token IDs
├── attention_masks.pt    # Shape: (N, 512) - Attention masks
├── labels.pt             # Shape: (N,) - Labels
└── metadata.json         # Dataset metadata
```

## Best Practices & Pitfalls
- Always batch-process to avoid OOM errors on large CSVs.
- Keep `max_length=512`; truncation silently happens otherwise.
- Verify label encoding (int not string) before tokenizing.
- Use relative paths so teammates on different OSes don’t break.
- Commit the small metadata JSON but git-ignore the huge `.pt` tensors if size is a concern.

## Quick End-to-End Smoke Test
```bash
python src/test_legal_bert.py
python src/legal_tokenizer.py
python src/test_tokenize.py
``` 