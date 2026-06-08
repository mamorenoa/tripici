# Tripinci backend

FastAPI app (async SQLAlchemy + SQLModel) following the Clean
Architecture layout (view / domain / repository) described in the root
`CLAUDE.md`.

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

OpenAPI docs: <http://localhost:8000/docs>.

## Auth flow

The API uses FastAPI-Users with JWT Bearer tokens.

```bash
# Register
curl -sS -X POST http://localhost:8000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"a@b.com","password":"hunter2hunter2","display_name":"Miguel"}'

# Login (form-urlencoded, as FastAPI-Users expects)
curl -sS -X POST http://localhost:8000/auth/jwt/login \
  -d 'username=a@b.com&password=hunter2hunter2' \
  -H 'content-type: application/x-www-form-urlencoded'
# → { "access_token": "...", "token_type": "bearer" }

# Current user
curl -sS http://localhost:8000/users/me -H 'Authorization: Bearer <token>'

# Create + list trips (now require the token)
curl -sS -X POST http://localhost:8000/trips \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"name":"Italy 2026"}'
curl -sS http://localhost:8000/trips -H 'Authorization: Bearer <token>'
```

## Settings

Defaults are in `app/core/config.py`. Override with a `backend/.env`
based on `.env.example`.

> ⚠️ The default `AUTH_SECRET` is a dev placeholder. **Production must
> set `AUTH_SECRET` to a high-entropy value** (e.g. `openssl rand -hex
> 32`) or JWTs are forgeable.

## Tests

```bash
uv run pytest -q
```

Tests run against the separate `tripinci_test` database (created on
first `docker compose up`) and TRUNCATE all tables between tests for
isolation. They bypass the real auth flow with a dependency override —
plus one end-to-end test that exercises `/auth/register` → login →
`/users/me`.

## Database migrations

```bash
# After changing a model
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

`alembic/env.py` registers two metadatas (SQLModel for `trip`,
SQLAlchemy Declarative for `user` via FastAPI-Users) so autogenerate
picks up both.

## Layout

```
app/
  main.py                # FastAPI bootstrap (CORS, mount routers)
  core/
    config.py            # Pydantic settings
    db.py                # async engine + session
    auth.py              # FastAPI-Users wiring (manager, JWT, deps)
  api/                   # view layer: routers (health, auth, trips)
  domain/
    users/{entity,schemas}.py    # SQLAlchemy User + Pydantic schemas
    trips/{entity,ports,service}.py
  repositories/
    trips/sqlmodel_repository.py
alembic/                 # migrations
tests/                   # pytest (async fixtures, current_user override)
docker-compose.yml       # Postgres for local dev
```
