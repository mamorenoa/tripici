"""Ports (interfaces) the trips domain depends on.

A ``Protocol`` keeps the domain decoupled from any specific persistence
backend. Concrete implementations live in ``app.repositories.trips``.
"""

from typing import Protocol
from uuid import UUID

from app.domain.trips.entity import Trip


class TripRepository(Protocol):
    def add(self, trip: Trip) -> Trip: ...

    def list_for_owner(self, owner_id: UUID) -> list[Trip]: ...
