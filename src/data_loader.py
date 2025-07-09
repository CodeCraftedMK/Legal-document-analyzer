import os
import json
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer
from typing import Dict, Optional, List

class LegalBertDataset(Dataset):
    """PyTorch Dataset for LEGAL-BERT tokenized data"""
    
    def __init__(self, split_dir: str, manifest_path: str):
        """Initialize dataset from split directory and manifest"""
        self.split_dir = split_dir
        self.manifest_path = manifest_path
        
        # Load manifest
        self.samples = []
        with open(manifest_path, 'r') as f:
            for line in f:
                self.samples.append(json.loads(line.strip()))
        
        # Load tensors
        self.input_ids = torch.load(os.path.join(split_dir, 'input_ids.pt'))
        self.attention_masks = torch.load(os.path.join(split_dir, 'attention_masks.pt'))
        self.labels = torch.load(os.path.join(split_dir, 'labels.pt'))
        
        print(f"Loaded {len(self.samples)} samples from {manifest_path}")
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        """Get a single sample"""
        sample = self.samples[idx]
        tensor_idx = sample['tensor_index']
        
        return {
            'input_ids': self.input_ids[tensor_idx],
            'attention_mask': self.attention_masks[tensor_idx],
            'labels': self.labels[tensor_idx],
            'id': sample['id'],
            'original_index': sample['original_index']
        }

class LegalDataLoaderFactory:
    """Factory class to create data loaders for LEGAL-BERT splits"""
    
    def __init__(self, splits_dir: str = "data/splits"):
        """Initialize the factory with splits directory"""
        self.splits_dir = splits_dir
        self.datasets = {}
        self._load_splits_metadata()
    
    def _load_splits_metadata(self):
        """Load splits metadata"""
        metadata_path = os.path.join(self.splits_dir, 'splits_metadata.json')
        with open(metadata_path, 'r') as f:
            self.metadata = json.load(f)
        
        print(f"Loaded splits metadata: {self.metadata['total_samples']} total samples")
        for split_name, split_info in self.metadata['splits'].items():
            print(f"   {split_name.upper()}: {split_info['size']} samples")
    
    def get_dataset(self, split_name: str) -> LegalBertDataset:
        """Get dataset for a specific split"""
        if split_name not in self.datasets:
            split_dir = os.path.join(self.splits_dir, split_name)
            manifest_path = os.path.join(self.splits_dir, f"{split_name}_manifest.jsonl")
            
            if not os.path.exists(split_dir) or not os.path.exists(manifest_path):
                raise FileNotFoundError(f"Split '{split_name}' not found in {self.splits_dir}")
            
            self.datasets[split_name] = LegalBertDataset(split_dir, manifest_path)
        
        return self.datasets[split_name]
    
    def get_dataloader(self, split_name: str, batch_size: int = 8, shuffle: Optional[bool] = None) -> DataLoader:
        """Get PyTorch DataLoader for a specific split"""
        dataset = self.get_dataset(split_name)
        
        # Default shuffle behavior
        if shuffle is None:
            shuffle = (split_name == 'train')
        
        return DataLoader(
            dataset,
            batch_size=batch_size,
            shuffle=shuffle,
            num_workers=0,  # Avoid multiprocessing issues on Windows
            pin_memory=torch.cuda.is_available()
        )
    
    def get_all_dataloaders(self, batch_size: int = 8) -> Dict[str, DataLoader]:
        """Get all data loaders (train, val, test)"""
        loaders = {}
        for split_name in ['train', 'val', 'test']:
            try:
                loaders[split_name] = self.get_dataloader(split_name, batch_size)
            except FileNotFoundError:
                print(f"Error loading {split_name.upper()}: FileNotFoundError")
        
        return loaders
    
    def get_split_info(self) -> Dict:
        """Get information about all splits"""
        return self.metadata
    
    def print_sample(self, split_name: str = 'train', sample_idx: int = 0):
        """Print a sample from the dataset for debugging"""
        dataset = self.get_dataset(split_name)
        sample = dataset[sample_idx]
        
        print(f"\nSample from {split_name} split (index {sample_idx}):")
        print(f"   ID: {sample['id']}")
        print(f"   Original index: {sample['original_index']}")
        print(f"   Label: {sample['labels'].item()}")
        print(f"   Input IDs shape: {sample['input_ids'].shape}")
        print(f"   Attention mask shape: {sample['attention_mask'].shape}")
        print(f"   First 10 tokens: {sample['input_ids'][:10].tolist()}")

def test_data_loaders():
    """Test function to validate data loaders work correctly"""
    print("\nTesting data loaders...")
    
    # Initialize factory
    factory = LegalDataLoaderFactory()
    
    # Test individual datasets
    for split_name in ['train', 'val', 'test']:
        try:
            dataset = factory.get_dataset(split_name)
            print(f"{split_name.upper()} dataset: {len(dataset)} samples")
            
            # Test getting a sample
            if len(dataset) > 0:
                sample = dataset[0]
                assert 'input_ids' in sample
                assert 'attention_mask' in sample
                assert 'labels' in sample
                print(f"   Sample 0 - Label: {sample['labels'].item()}, Shape: {sample['input_ids'].shape}")
        
        except FileNotFoundError as e:
            print(f"Error in {split_name.upper()}: {e}")
    
    # Test data loaders
    print("\nTesting data loaders...")
    loaders = factory.get_all_dataloaders(batch_size=2)
    
    for split_name, loader in loaders.items():
        print(f"{split_name.upper()} loader: {len(loader)} batches")
        
        # Test one batch
        for batch in loader:
            print(f"   Batch shape - Input IDs: {batch['input_ids'].shape}, Labels: {batch['labels'].shape}")
            break
    
    # Print a sample
    factory.print_sample('train', 0)
    
    print("\nAll data loader tests passed!")

def main():
    """Main function to demonstrate data loader usage"""
    print("LEGAL-BERT Data Loader Interface - Muhammad Abdullah Khan")
    
    # Test the data loaders
    test_data_loaders()
    
    # Show usage example
    print("\nUsage Example:")
    print("```python")
    print("from src.data_loader import LegalDataLoaderFactory")
    print("")
    print("# Initialize factory")
    print("factory = LegalDataLoaderFactory()")
    print("")
    print("# Get individual dataset")
    print("train_dataset = factory.get_dataset('train')")
    print("")
    print("# Get data loader")
    print("train_loader = factory.get_dataloader('train', batch_size=8)")
    print("")
    print("# Get all loaders")
    print("loaders = factory.get_all_dataloaders(batch_size=16)")
    print("```")

if __name__ == "__main__":
    main() 