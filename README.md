# Legal Document Analyzer

A 4-day sprint project to build a legal document classifier using LEGAL-BERT.

## Team Structure
- **Arslan**: Preprocessing, model training, evaluation plots
- **Member B**: Repo structure, visualizations, logging
- **Muhammad Abdullah Khan**: Dataset & tokenization pipeline, data splitting, evaluation metrics

## 🚀 Quick Start

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
   pip install -r requirements.txt
   ```

### Test Setup
```bash
python src/test_legal_bert.py
```

## 📁 Project Structure

```
├── src/
│   ├── test_legal_bert.py      # Model validation & testing
│   ├── legal_tokenizer.py     # LEGAL-BERT tokenization pipeline
│   ├── data_split.py          # Train/val/test data splitting
│   ├── data_loader.py         # PyTorch DataLoader factory
│   ├── evaluate_metrics.py    # Evaluation metrics & reporting
│   └── test_tokenize.py       # Tokenization validation
├── data/
│   ├── raw/                   # Original data files
│   ├── processed/             # Cleaned data from preprocessing
│   ├── tokenized/            # LEGAL-BERT tokens & tensors
│   └── splits/               # Train/val/test splits with manifests
├── models/                   # Saved model checkpoints
├── results/                  # Evaluation results & reports
├── presentation/            # Project deliverables & summaries
└── requirements.txt         # Python dependencies
```

## 🔄 Workflow

### Day 1 & 2: Data Preparation (Muhammad Abdullah Khan)

1. **Test LEGAL-BERT Setup**:
   ```bash
   python src/test_legal_bert.py
   ```

2. **Tokenize Dataset** (after Arslan provides cleaned data):
   ```bash
   python src/legal_tokenizer.py
   ```

3. **Validate Tokenization**:
   ```bash
   python src/test_tokenize.py
   ```

### Day 3: Data Splitting (Muhammad Abdullah Khan)

4. **Create Train/Val/Test Splits**:
   ```bash
   python src/data_split.py
   ```

5. **Test Data Loaders**:
   ```bash
   python src/data_loader.py
   ```

### Day 4: Evaluation (Muhammad Abdullah Khan)

6. **Evaluate Model** (after Arslan provides predictions):
   ```bash
   python src/evaluate_metrics.py
   ```

## 📊 Components

### 1. Tokenization Pipeline (`legal_tokenizer.py`)
- Loads LEGAL-BERT tokenizer (`nlpaueb/legal-bert-base-uncased`)
- Processes CSV files with text and label columns
- Creates PyTorch tensors with padding/truncation to 512 tokens
- Saves tokenized data and metadata

**Usage:**
```python
from src.legal_tokenizer import LegalBertTokenizer

tokenizer = LegalBertTokenizer()
tokenizer.tokenize_csv("data/processed/cleaned_legal_documents.csv")
```

### 2. Data Splitting (`data_split.py`)
- Smart train/val/test splitting with stratification when possible
- Handles small datasets gracefully
- Creates JSONL manifests for each split
- Validates no data leakage between splits

**Usage:**
```python
from src.data_split import LegalDataSplitter

splitter = LegalDataSplitter()
splits, metadata = splitter.main()
```

### 3. Data Loaders (`data_loader.py`)
- PyTorch Dataset and DataLoader factory
- HuggingFace transformers compatible
- Memory-efficient batch processing
- Windows-optimized (no multiprocessing issues)

**Usage:**
```python
from src.data_loader import LegalDataLoaderFactory

factory = LegalDataLoaderFactory()
train_loader = factory.get_dataloader('train', batch_size=8)
```

### 4. Evaluation Metrics (`evaluate_metrics.py`)
- Comprehensive classification metrics (precision, recall, F1)
- Supports multiple prediction formats (CSV, JSON, NPY)
- Handles edge cases (single samples, missing classes)
- Exports results in multiple formats

**Usage:**
```python
from src.evaluate_metrics import LegalBertEvaluator

evaluator = LegalBertEvaluator()
ground_truth = evaluator.load_ground_truth("test")
predictions = evaluator.load_predictions("predictions.csv")
results = evaluator.compute_metrics(ground_truth['labels'], predictions['predictions'])
```

## 🎯 Key Features

### Data Pipeline
- **Robust Error Handling**: Graceful handling of missing files, columns, or edge cases
- **Memory Efficient**: Processes large datasets without memory overflow
- **Reproducible**: Seeded randomization for consistent results
- **Scalable**: Configurable batch sizes and processing parameters

### Evaluation Framework
- **Multi-format Support**: CSV, JSON, NumPy array prediction files
- **Comprehensive Metrics**: Accuracy, precision, recall, F1-score (per-class and averaged)
- **Edge Case Handling**: Single-sample evaluations, missing classes
- **Export Options**: JSON, CSV, and human-readable text reports

### Team Integration
- **Clear Interfaces**: Well-defined inputs/outputs for team collaboration
- **Extensive Documentation**: README, docstrings, and example usage
- **Validation Tools**: Testing scripts for each component
- **Flexible Design**: Adapts to different dataset sizes and formats

## 📈 Status

### ✅ Completed (Muhammad Abdullah Khan)
- [x] Environment setup and LEGAL-BERT validation
- [x] Tokenization pipeline with batch processing
- [x] Data splitting with stratification and manifests
- [x] PyTorch DataLoader factory
- [x] Comprehensive evaluation metrics
- [x] Documentation and testing

### 🔄 In Progress (Team)
- [ ] Data preprocessing (Arslan)
- [ ] Model training (Arslan)
- [ ] Visualizations and logging (Member B)
- [ ] Final presentation preparation

### 📋 Dependencies
- Muhammad's work is **complete and ready**
- Waiting for Arslan's cleaned data (`data/processed/cleaned_legal_documents.csv`)
- Waiting for Arslan's model predictions for final evaluation

## 🛠 Troubleshooting

### Common Issues

1. **Import Error with tokenize.py**:
   - Solution: File renamed to `legal_tokenizer.py` to avoid conflict with Python's built-in module

2. **Memory Issues**:
   - Reduce batch size in tokenization or data loading
   - Check available RAM and adjust accordingly

3. **Small Dataset Warnings**:
   - Normal for datasets with <10 samples
   - Uses simple random splitting instead of stratified

4. **Missing Files**:
   - Ensure previous steps completed successfully
   - Check file paths and permissions

### Support
For issues specific to Muhammad Abdullah Khan's components:
- Check individual script documentation and examples
- Run test scripts to validate setup
- Review error messages for specific guidance

---

*Last updated: Day 4 completion*  
*Primary contributor: Muhammad Abdullah Khan* 