"""Port for the stats domain."""

from typing import Protocol
from uuid import UUID

from app.domain.stats.entity import GlobalStats, TripStats


class StatsRepository(Protocol):
    async def aggregate_for_trip(self, trip_id: UUID) -> TripStats: ...

    async def aggregate_for_user(
        self, user_id: UUID, category_code: str | None = None
    ) -> GlobalStats: ...
