# Multi-stage so the runtime image doesn't carry uv, gcc or build deps.
#
# Stage 1 — `builder`: install Python deps into an isolated `.venv`
# using uv. Pinned to 3.12 (matches `.python-version`).
# Stage 2 — `runtime`: copy the venv + source, run uvicorn.

# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS builder

# Pin uv via the official prebuilt image. ~10 MB, no network resolution.
COPY --from=ghcr.io/astral-sh/uv:0.5.7 /uv /usr/local/bin/uv

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

# Install deps first (cached layer) before copying the rest of the code.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Now copy the source and finalize the venv with the project itself.
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini
RUN uv sync --frozen --no-dev


FROM python:3.12-slim AS runtime

# Match the venv path the builder used so the shebangs inside it work.
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app /app

# Drop privileges. Fly doesn't require it but it's good hygiene.
RUN groupadd --system app && useradd --system --gid app app \
    && chown -R app:app /app
USER app

EXPOSE 8000

# Two workers fit comfortably in the 256MB VM and use both vCPU cycles.
# `--forwarded-allow-ips='*'` so uvicorn trusts the proxy's
# X-Forwarded-Proto / X-Forwarded-For headers (Fly terminates TLS).
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--forwarded-allow-ips=*"]
