# Tripinci backend

FastAPI app following the Clean Architecture layout (view / domain /
repository) described in the root `CLAUDE.md`.

## Requirements

- Python 3.12 (managed by `uv`)
- [`uv`](https://docs.astral.sh/uv/)
- Docker Desktop (for local Postgres)

## First-time setup

```bash
cd backend
uv sync                          # creates .venv, installs deps (incl. dev)
docker compose up -d             # starts Postgres on :5432 (tripinci + tripinci_test)
uv run alembic upgrade head      # applies migrations to the main DB
```

## Run the API

```bash
uv run uvicorn app.main:app --reload   # serves on http://localhost:8000
```

- Health: `curl http://localhost:8000/health` → `{"status":"ok"}`
- Trips:
  - `curl -X POST http://localhost:8000/trips -H 'content-type: application/json' -d '{"name":"Italy 2026"}'`
  - `curl http://localhost:8000/trips`
- OpenAPI docs: open `http://localhost:8000/docs`

## Tests

```bash
uv run pytest -q
```

Tests use the separate `tripinci_test` database (created automatically
on the first `docker compose up`) and isolate every test with a rolled
back outer transaction.

## Database migrations

```bash
# After changing a model
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

`alembic/env.py` wires `SQLModel.metadata` and reads the connection URL
from `app.core.config.settings`, so no edits to `alembic.ini` are needed.

## Configuration

Defaults come from `app/core/config.py`. Override anything by creating
`backend/.env` based on `.env.example`.

## Layout

```
app/
  main.py                # FastAPI bootstrap (CORS, mount routers)
  core/                  # settings, db engine, cross-cutting
  api/                   # view: routers
  domain/                # entities, services, repository interfaces
  repositories/          # repository implementations
alembic/                 # migrations
tests/                   # pytest (transactional fixtures)
docker-compose.yml       # Postgres for local dev
```
