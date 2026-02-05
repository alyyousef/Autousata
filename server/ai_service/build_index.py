import argparse
import json
import os
from typing import List

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


def iter_chunks(path: str):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chunks", default="data/chunks.jsonl", help="Path to chunks.jsonl")
    parser.add_argument("--out", default="data", help="Output directory")
    parser.add_argument("--model", default="intfloat/multilingual-e5-small", help="Embedding model")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size for embeddings")
    parser.add_argument("--resume", action="store_true", help="Resume from existing index")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    index_path = os.path.join(args.out, "index.faiss")

    index = None
    processed = 0
    if args.resume and os.path.exists(index_path):
        index = faiss.read_index(index_path)
        processed = index.ntotal
        print(f"Resuming index with {processed} vectors...")

    model = SentenceTransformer(args.model)

    batch_texts: List[str] = []
    total = 0
    for idx, item in enumerate(iter_chunks(args.chunks)):
        if idx < processed:
            continue
        batch_texts.append(item["text"])
        if len(batch_texts) >= args.batch_size:
            embeddings = model.encode(batch_texts, show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)
            embeddings = embeddings.astype("float32")
            if index is None:
                index = faiss.IndexFlatIP(embeddings.shape[1])
            index.add(embeddings)
            total += len(batch_texts)
            batch_texts = []
            if total % (args.batch_size * 10) == 0:
                faiss.write_index(index, index_path)
                print(f"Saved {index.ntotal} vectors...")

    if batch_texts:
        embeddings = model.encode(batch_texts, show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)
        embeddings = embeddings.astype("float32")
        if index is None:
            index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)

    if index is None:
        raise RuntimeError("No embeddings created. Check chunks.jsonl.")

    faiss.write_index(index, index_path)
    print(f"Index saved to {index_path} with {index.ntotal} vectors.")


if __name__ == "__main__":
    main()
