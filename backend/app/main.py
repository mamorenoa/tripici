"""Tripinci API entry point.

Bootstraps FastAPI, mounts CORS, registers routers, and wires
domain-level exceptions into HTTP responses. Business logic lives in
the layers below: ``app.api.*`` (view) → ``app.domain.*`` (services /
entities) → ``app.repositories.*`` (persistence). Auth is delegated to
FastAPI-Users (wired in ``app.core.auth`` and mounted in
``app.api.auth``).
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    auth,
    categories,
    expenses,
    health,
    invitations,
    members,
    trips,
)
from app.core.config import settings
from app.domain.expenses.service import ExpenseNotFound
from app.domain.invitations.exceptions import InvitationInvalid
from app.domain.trips.exceptions import CannotRemoveOwner, MemberNotFound, TripNotFound

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
app.include_router(categories.router)
app.include_router(trips.router)
app.include_router(expenses.router)
app.include_router(invitations.router)
app.include_router(members.router)


@app.exception_handler(TripNotFound)
async def _trip_not_found_handler(_: Request, exc: TripNotFound) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ExpenseNotFound)
async def _expense_not_found_handler(
    _: Request, exc: ExpenseNotFound
) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(InvitationInvalid)
async def _invitation_invalid_handler(
    _: Request, exc: InvitationInvalid
) -> JSONResponse:
    # 404 (not 410) — keeps the API surface uniform with the other
    # "doesn't exist or not yours" responses.
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(MemberNotFound)
async def _member_not_found_handler(_: Request, exc: MemberNotFound) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": "Member not found"})


@app.exception_handler(CannotRemoveOwner)
async def _cannot_remove_owner_handler(
    _: Request, exc: CannotRemoveOwner
) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": "Cannot remove the trip owner"})
