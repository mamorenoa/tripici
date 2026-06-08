"""Tripinci API entry point.

Bootstraps FastAPI, mounts CORS, and registers the routers. Business
logic lives in the layers below: ``app.api.*`` (view) →
``app.domain.*`` (services / entities) → ``app.repositories.*``
(persistence). Auth is delegated to FastAPI-Users (wired in
``app.core.auth`` and mounted in ``app.api.auth``).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, health, trips
from app.core.config import settings

app = FastAPI(title="Tripinci API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(trips.router)
