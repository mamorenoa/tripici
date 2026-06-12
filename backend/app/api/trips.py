"""HTTP endpoints for the trips feature."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.stats.entity import TripStats
from app.domain.stats.service import StatsService
from app.domain.trips.entity import Trip, TripCreate
from app.domain.trips.service import TripService
from app.domain.users.entity import User
from app.repositories.memberships.sqlmodel_repository import (
    SQLModelMembershipRepository,
)
from app.repositories.stats.sqlmodel_repository import SQLModelStatsRepository
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository

router = APIRouter(prefix="/trips", tags=["trips"])


def get_trip_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripService:
    """Wire the trips service with its repository dependencies."""
    return TripService(
        repository=SQLModelTripRepository(session),
        memberships=SQLModelMembershipRepository(session),
    )


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
    return await service.list_trips(user_id=user.id)


@router.get("/{trip_id}", response_model=Trip)
async def get_trip(
    trip_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[TripService, Depends(get_trip_service)],
) -> Trip:
    return await service.get_for_member(trip_id=trip_id, user_id=user.id)


@router.get("/{trip_id}/stats", response_model=TripStats)
async def get_trip_stats(
    trip_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TripStats:
    return await StatsService(
        stats_repo=SQLModelStatsRepository(session),
        trip_repo=SQLModelTripRepository(session),
        membership_repo=SQLModelMembershipRepository(session),
    ).get_trip_stats(trip_id=trip_id, user_id=user.id)
