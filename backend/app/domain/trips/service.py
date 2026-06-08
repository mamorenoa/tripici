"""Trip use cases.

The service is framework-agnostic Python. It depends on the
``TripRepository`` port; the View layer wires the concrete repository.
"""

from uuid import UUID

from app.domain.trips.entity import Trip
from app.domain.trips.ports import TripRepository


class TripService:
    def __init__(self, repository: TripRepository) -> None:
        self._repository = repository

    async def create_trip(self, *, name: str, owner_id: UUID) -> Trip:
        # ``id`` and ``created_at`` come from the entity defaults so the
        # domain (not the DB) controls them. The repository persists
        # whatever the domain produces.
        trip = Trip(name=name, owner_id=owner_id)
        return await self._repository.add(trip)

    async def list_trips(self, *, owner_id: UUID) -> list[Trip]:
        return await self._repository.list_for_owner(owner_id)
