from datasets import load_dataset

dataset = load_dataset("coastalcph/lex_glue", name="unfair_tos", split="test")

dataset.to_csv("./data/unfair_tos_test.csv")
print("Saved unfair_tos_test.csv")