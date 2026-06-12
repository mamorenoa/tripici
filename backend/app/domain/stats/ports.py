"""Port for the stats domain."""

from typing import Protocol
from uuid import UUID

from app.domain.stats.entity import TripStats


class StatsRepository(Protocol):
    async def aggregate_for_trip(self, trip_id: UUID) -> TripStats: ...
