"""Ports (interfaces) the trips domain depends on.

A ``Protocol`` keeps the domain decoupled from any specific persistence
backend. Concrete implementations live in ``app.repositories.trips``.
"""

from typing import Protocol
from uuid import UUID

from app.domain.trips.entity import Trip


class TripRepository(Protocol):
    async def add(self, trip: Trip) -> Trip: ...

    async def update(self, trip: Trip) -> Trip:
        """Persist changes to an already-loaded trip and return it."""
        ...

    async def delete(self, trip: Trip) -> None:
        """Remove the trip. Rows that hang off it (expenses, plans,
        memberships, invitations, settlement payments) go with it via
        ``ON DELETE CASCADE`` in the schema."""
        ...

    async def get_by_id(self, trip_id: UUID) -> Trip | None: ...

    async def list_for_user(self, user_id: UUID) -> list[Trip]:
        """Return trips the user owns OR is a collaborator in. The
        implementation joins against ``trip_membership`` in SQL."""
        ...
