"""HTTP endpoint for listing trip members.

Anyone with access to the trip (owner OR collaborator) can list its
members. Authorization is delegated to ``TripService.get_for_member``,
which raises ``TripNotFound`` for outsiders.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.memberships.entity import TripMemberRead
from app.domain.trips.service import TripService
from app.domain.users.entity import User
from app.repositories.memberships.sqlmodel_repository import (
    SQLModelMembershipRepository,
)
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository

router = APIRouter(
    prefix="/trips/{trip_id}/members", tags=["members"]
)


@router.get("", response_model=list[TripMemberRead])
async def list_members(
    trip_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[TripMemberRead]:
    memberships = SQLModelMembershipRepository(session)
    trips = SQLModelTripRepository(session)
    # Validates access (raises 404 if outsider).
    await TripService(repository=trips, memberships=memberships).get_for_member(
        trip_id=trip_id, user_id=user.id
    )
    return await memberships.list_members(trip_id)
