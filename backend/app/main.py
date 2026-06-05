"""Tripinci API entry point.

First vertical slice: only exposes ``GET /health`` so the Expo client can
verify connectivity. No database, no auth yet.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Origins allowed to call the API during local development.
# 8081 is the current Expo Metro web dev server; 19006 is the legacy
# Expo web port, kept as a safety net for older Expo versions.
DEV_ORIGINS = [
    "http://localhost:8081",
    "http://localhost:19006",
]

app = FastAPI(title="Tripinci API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
