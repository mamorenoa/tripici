"""Ports for the invitations domain."""

from typing import Protocol
from uuid import UUID

from app.domain.invitations.entity import TripInvitation


class InvitationRepository(Protocol):
    async def add(self, invitation: TripInvitation) -> TripInvitation: ...

    async def get_by_id(self, invitation_id: UUID) -> TripInvitation | None: ...

    async def get_by_token(self, token: str) -> TripInvitation | None: ...

    async def list_active_for_trip(
        self, trip_id: UUID
    ) -> list[TripInvitation]: ...

    async def update(self, invitation: TripInvitation) -> TripInvitation: ...
