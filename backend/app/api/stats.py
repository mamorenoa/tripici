"""HTTP endpoint for global statistics."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.stats.entity import GlobalStats
from app.domain.stats.service import StatsService
from app.domain.users.entity import User
from app.repositories.memberships.sqlmodel_repository import (
    SQLModelMembershipRepository,
)
from app.repositories.stats.sqlmodel_repository import SQLModelStatsRepository
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=GlobalStats)
async def get_global_stats(
    user: Annotated[User, Depends(current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    category_code: str | None = None,
) -> GlobalStats:
    return await StatsService(
        stats_repo=SQLModelStatsRepository(session),
        trip_repo=SQLModelTripRepository(session),
        membership_repo=SQLModelMembershipRepository(session),
    ).get_global_stats(user_id=user.id, category_code=category_code)
