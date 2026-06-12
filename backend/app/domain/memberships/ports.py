"""Ports for the memberships domain."""

from typing import Protocol
from uuid import UUID

from app.domain.memberships.entity import TripMemberRead, TripMembership


class MembershipRepository(Protocol):
    async def add(self, membership: TripMembership) -> TripMembership: ...

    async def exists(self, *, trip_id: UUID, user_id: UUID) -> bool: ...

    async def list_trip_ids_for_user(self, user_id: UUID) -> list[UUID]: ...

    async def list_members(self, trip_id: UUID) -> list[TripMemberRead]:
        """Return collaborators + the owner of the trip, joined with the
        ``user`` table. The implementation does the join in SQL."""
        ...

    async def delete(self, *, trip_id: UUID, user_id: UUID) -> bool:
        """Remove a collaborator from the trip. Returns True if a row was
        deleted, False if the user was not a member."""
        ...
