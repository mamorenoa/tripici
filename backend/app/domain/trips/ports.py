"""Ports (interfaces) the trips domain depends on.

A ``Protocol`` keeps the domain decoupled from any specific persistence
backend. Concrete implementations live in ``app.repositories.trips``.
"""

from typing import Protocol
from uuid import UUID

from app.domain.trips.entity import Trip


class TripRepository(Protocol):
    async def add(self, trip: Trip) -> Trip: ...

    async def get_by_id(self, trip_id: UUID) -> Trip | None: ...

    async def list_for_owner(self, owner_id: UUID) -> list[Trip]: ...
