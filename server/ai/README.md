# AutoWriter AI (Offline)

This folder explains what to do and where. It assumes brochures are in `D:\cars`.

## 1) One-time ingestion (build local index)
Run these commands in a Python environment:

```powershell
cd C:\Users\yinya\Autousata\server\ai_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python ingest_brochures.py --source D:\cars --out data
```

Outputs:
- `server/ai_service/data/index.faiss`
- `server/ai_service/data/chunks.jsonl`

## 2) Start the local AI service
```powershell
cd C:\Users\yinya\Autousata\server\ai_service
.\.venv\Scripts\Activate.ps1
$env:OLLAMA_MODEL = "qwen2.5:7b-instruct"
ollama pull qwen2.5:7b-instruct
$env:OLLAMA_MODEL = "qwen2.5:7b-instruct"  # multilingual, strong English+Arabic
uvicorn app:app --host 127.0.0.1 --port 7001
```

Notes:
- This service is **offline**. It only uses your local index + local model.
- If no local model is available, the API returns 503 and the Node server will fall back to the deterministic template.

## 3) Call the API from the website (Node server)
The Node server route is:
- `POST /api/autowriter/generate`

Example payload:
```json
{
  "highlights": "M-Sport package, ceramic coating, new tyres, service records available",
  "fields": {
    "make": "BMW",
    "model": "320i",
    "year": 2020
  }
}
```

## 4) Where each piece lives
- Ingestion + index: `server/ai_service/ingest_brochures.py`
- Local AI service: `server/ai_service/app.py`
- Prompts: `server/ai_service/prompts.py`
- Node orchestration: `server/services/autowriter/index.js`
- Deterministic fallback: `server/services/autowriter/fallback.js`
- Validator: `server/services/autowriter/validator.js`
- Taxonomy + synonyms: `server/services/autowriter/taxonomy.json`, `server/services/autowriter/synonyms.json`
- Express route: `server/routes/autowriter.js`

## 5) Environment variables
Optional:
- `AUTOWRITER_SERVICE_URL` (default `http://127.0.0.1:7001`)
- `AUTOWRITER_TIMEOUT_MS` (default `15000`)
- `AUTOWRITER_DATA_DIR` (python service, default `server/ai_service/data`)
- `AUTOWRITER_EMBED_MODEL` (python service)
- `OLLAMA_MODEL` (python service, local LLM)

## 6) Testing quickly
Start the Node server, then run:
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5005/api/autowriter/generate -Method POST -ContentType 'application/json' -Body '{"highlights":"M-Sport package, ceramic coating, new tyres, service records available","fields":{"make":"BMW","model":"320i","year":2020}}'
```

If the python service is not running, you will still get a valid JSON result from the fallback template.
