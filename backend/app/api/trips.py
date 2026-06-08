"""HTTP endpoints for the trips feature.

This is the View layer: it converts HTTP into domain calls and back. It
wires the concrete ``SQLModelTripRepository`` into the ``TripService``
via FastAPI dependencies, and reads the placeholder owner id from
settings (replaced by the authenticated user in slice 3).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.config import settings
from app.core.db import get_session
from app.domain.trips.entity import Trip, TripCreate
from app.domain.trips.service import TripService
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository

router = APIRouter(prefix="/trips", tags=["trips"])


def get_trip_service(
    session: Annotated[Session, Depends(get_session)],
) -> TripService:
    """Wire the trips service with a SQLModel-backed repository."""
    repository = SQLModelTripRepository(session)
    return TripService(repository)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Trip)
def create_trip(
    payload: TripCreate,
    service: Annotated[TripService, Depends(get_trip_service)],
) -> Trip:
    return service.create_trip(
        name=payload.name,
        owner_id=settings.dev_owner_id,
    )


@router.get("", response_model=list[Trip])
def list_trips(
    service: Annotated[TripService, Depends(get_trip_service)],
) -> list[Trip]:
    return service.list_trips(owner_id=settings.dev_owner_id)
