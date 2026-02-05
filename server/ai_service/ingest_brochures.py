import argparse
import json
import os
import re
from dataclasses import dataclass
from typing import List, Dict

import pdfplumber
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss


@dataclass
class Chunk:
    chunk_id: str
    text: str
    metadata: Dict


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\u00a0", " ", text)
    return text.strip()


def split_into_chunks(text: str, max_words: int = 220, overlap: int = 40) -> List[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_words, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start = end - overlap
    return chunks


def extract_pdf_text(path: str) -> List[str]:
    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages.append(clean_text(text))
    return pages


def infer_metadata_from_path(path: str) -> Dict:
    parts = re.split(r"[/\\]", path)
    meta = {"make": None, "model": None, "year": None, "trim": None, "region": None}
    for part in parts:
        year_match = re.match(r"^(19\d{2}|20\d{2})$", part)
        if year_match:
            meta["year"] = int(year_match.group(1))
    return meta


def build_index(chunks: List[Chunk], model_name: str, out_dir: str):
    model = SentenceTransformer(model_name)
    embeddings = model.encode([c.text for c in chunks], show_progress_bar=True, convert_to_numpy=True, normalize_embeddings=True)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    os.makedirs(out_dir, exist_ok=True)
    faiss.write_index(index, os.path.join(out_dir, "index.faiss"))

    with open(os.path.join(out_dir, "chunks.jsonl"), "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps({
                "chunk_id": chunk.chunk_id,
                "text": chunk.text,
                "metadata": chunk.metadata,
            }, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Folder with brochure PDFs")
    parser.add_argument("--out", default="data", help="Output folder")
    parser.add_argument("--model", default="intfloat/multilingual-e5-small", help="Embedding model")
    args = parser.parse_args()

    pdfs = []
    for root, _, files in os.walk(args.source):
        for file in files:
            if file.lower().endswith(".pdf"):
                pdfs.append(os.path.join(root, file))

    chunks: List[Chunk] = []
    for pdf_path in tqdm(pdfs, desc="Processing PDFs"):
        pages = extract_pdf_text(pdf_path)
        meta_base = infer_metadata_from_path(pdf_path)
        brochure_id = os.path.splitext(os.path.basename(pdf_path))[0]

        for idx, page_text in enumerate(pages, start=1):
            if not page_text:
                continue
            for chunk_idx, chunk_text_item in enumerate(split_into_chunks(page_text), start=1):
                chunk_id = f"{brochure_id}-p{idx}-c{chunk_idx}"
                metadata = {**meta_base, "brochure_id": brochure_id, "page": idx}
                chunks.append(Chunk(chunk_id=chunk_id, text=chunk_text_item, metadata=metadata))

    build_index(chunks, args.model, args.out)


if __name__ == "__main__":
    main()
