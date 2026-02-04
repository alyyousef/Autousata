import json
import os
from typing import List, Optional

import faiss
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

from prompts import SYSTEM_PROMPT, USER_PROMPT
from llm_runner import generate_json

DATA_DIR = os.environ.get("AUTOWRITER_DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))
INDEX_PATH = os.path.join(DATA_DIR, "index.faiss")
CHUNKS_PATH = os.path.join(DATA_DIR, "chunks.jsonl")
EMBED_MODEL = os.environ.get("AUTOWRITER_EMBED_MODEL", "sentence-transformers/BAAI/bge-m3")

app = FastAPI()

index = None
chunks = []
embedder = None


def load_assets():
    global index, chunks, embedder
    if index is None:
        if not os.path.exists(INDEX_PATH):
            raise FileNotFoundError(f"Missing index at {INDEX_PATH}")
        index = faiss.read_index(INDEX_PATH)
    if not chunks:
        with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
            for line in f:
                chunks.append(json.loads(line))
    if embedder is None:
        embedder = SentenceTransformer(EMBED_MODEL)


def embed_text(text: str) -> np.ndarray:
    vec = embedder.encode([text], normalize_embeddings=True, convert_to_numpy=True)
    return vec.astype("float32")


def filter_chunks(chunk_list: List[dict], filters: dict) -> List[dict]:
    if not filters:
        return chunk_list
    def match(chunk):
        meta = chunk.get("metadata", {})
        for key, value in filters.items():
            if value is None:
                continue
            if meta.get(key) != value:
                return False
        return True
    return [c for c in chunk_list if match(c)]


class RetrieveRequest(BaseModel):
    query: str
    filters: Optional[dict] = None
    k: int = 6


class GenerateRequest(BaseModel):
    highlights: str
    fields: dict
    evidence: List[dict]
    tone: str
    languages: List[str]


@app.post("/v1/retrieve")
def retrieve(req: RetrieveRequest):
    load_assets()
    vec = embed_text(req.query)
    scores, indices = index.search(vec, min(req.k * 4, len(chunks)))
    candidates = [chunks[i] for i in indices[0] if i >= 0]
    filtered = filter_chunks(candidates, req.filters or {})
    if len(filtered) < req.k:
        filtered = candidates
    results = []
    for item in filtered[: req.k]:
        results.append({
            "chunk_id": item["chunk_id"],
            "text": item["text"],
            "metadata": item.get("metadata", {})
        })
    return {"chunks": results}


@app.post("/v1/generate")
def generate(req: GenerateRequest):
    schema = json.dumps({
        "description_paragraph": "string",
        "bullet_highlights": ["string"],
        "keywords": ["string"],
        "warnings": ["string"],
        "detected_entities": {
            "make": "string|null",
            "model": "string|null",
            "year": "number|null",
            "trim": "string|null",
            "mileage": "string|null",
            "transmission": "string|null",
            "engine": "string|null",
            "condition": "string|null"
        },
        "evidence": [{"chunk_id": "string", "note": "string"}]
    }, ensure_ascii=False, indent=2)

    evidence_lines = []
    for idx, ev in enumerate(req.evidence, start=1):
        snippet = ev.get("text", "")
        if len(snippet) > 320:
            snippet = snippet[:320] + "..."
        evidence_lines.append(f"{idx}) [chunk_id={ev.get('chunk_id')}] {snippet}")

    prompt = SYSTEM_PROMPT + "\n\n" + USER_PROMPT.format(
        schema=schema,
        highlights=req.highlights,
        fields=json.dumps(req.fields, ensure_ascii=False),
        evidence="\n".join(evidence_lines)
    )

    output = generate_json(prompt)
    if output is None:
        raise HTTPException(status_code=503, detail="Local LLM unavailable.")

    return output
