"""Stats use cases.

Framework-agnostic. Authorization follows the same pattern as
``ExpenseService``: owner OR collaborator can read; 404 for everyone
else (no existence leak).
"""

from uuid import UUID

from app.domain.memberships.ports import MembershipRepository
from app.domain.stats.entity import GlobalStats, TripStats
from app.domain.stats.ports import StatsRepository
from app.domain.trips.exceptions import TripNotFound
from app.domain.trips.ports import TripRepository


class StatsService:
    def __init__(
        self,
        stats_repo: StatsRepository,
        trip_repo: TripRepository,
        membership_repo: MembershipRepository,
    ) -> None:
        self._stats = stats_repo
        self._trips = trip_repo
        self._memberships = membership_repo

    async def get_global_stats(
        self, *, user_id: UUID, category_code: str | None = None
    ) -> GlobalStats:
        return await self._stats.aggregate_for_user(user_id, category_code)

    async def get_trip_stats(self, *, trip_id: UUID, user_id: UUID) -> TripStats:
        trip = await self._trips.get_by_id(trip_id)
        if trip is None:
            raise TripNotFound(trip_id)
        if trip.owner_id != user_id:
            if not await self._memberships.exists(trip_id=trip_id, user_id=user_id):
                raise TripNotFound(trip_id)
        return await self._stats.aggregate_for_trip(trip_id)
