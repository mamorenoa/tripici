# Tripinci backend

FastAPI app. Currently at the connectivity-skeleton stage: only exposes
`GET /health`.

## Requirements

- Python 3.12 (managed by `uv`)
- [`uv`](https://docs.astral.sh/uv/) installed

## Run

```bash
cd backend
uv sync                                # creates .venv and installs deps
uv run uvicorn app.main:app --reload   # serves on http://localhost:8000
```

- Health check: `curl http://localhost:8000/health` → `{"status":"ok"}`
- OpenAPI docs: open `http://localhost:8000/docs`
