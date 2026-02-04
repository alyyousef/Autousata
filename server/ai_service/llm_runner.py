import json
import os
import subprocess
from typing import Optional


def run_ollama(prompt: str, model: str) -> Optional[str]:
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
        return result.stdout.decode("utf-8").strip()
    except Exception:
        return None


def generate_json(prompt: str) -> Optional[dict]:
    model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b-instruct")
    if model:
        raw = run_ollama(prompt, model)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    return None
