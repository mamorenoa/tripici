"""HTTP endpoints for the trips feature.

This is the View layer: it converts HTTP into domain calls and back. It
wires the concrete ``SQLModelTripRepository`` into the ``TripService``
via FastAPI dependencies and resolves the trip owner from the currently
authenticated user.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.trips.entity import Trip, TripCreate
from app.domain.trips.service import TripService
from app.domain.users.entity import User
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository

router = APIRouter(prefix="/trips", tags=["trips"])


def get_trip_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripService:
    """Wire the trips service with a SQLModel-backed repository."""
    repository = SQLModelTripRepository(session)
    return TripService(repository)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Trip)
async def create_trip(
    payload: TripCreate,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[TripService, Depends(get_trip_service)],
) -> Trip:
    return await service.create_trip(name=payload.name, owner_id=user.id)


@router.get("", response_model=list[Trip])
async def list_trips(
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[TripService, Depends(get_trip_service)],
) -> list[Trip]:
    return await service.list_trips(owner_id=user.id)


@router.get("/{trip_id}", response_model=Trip)
async def get_trip(
    trip_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[TripService, Depends(get_trip_service)],
) -> Trip:
    return await service.get_for_owner(trip_id=trip_id, owner_id=user.id)
