"""Invitation use cases.

Owner-only: ``create``, ``list_active``, ``revoke``.
Any-user: ``preview``, ``accept``.

The service authorizes owner-only operations by consulting the
``TripRepository``. ``accept`` is idempotent: if the user is already
the trip's owner or a member, it returns the trip silently instead of
erroring.
"""

import secrets
from datetime import datetime, timezone
from uuid import UUID

from app.domain.invitations.entity import (
    InvitationPreview,
    TripInvitation,
)
from app.domain.invitations.exceptions import InvitationInvalid
from app.domain.invitations.ports import InvitationRepository
from app.domain.memberships.entity import TripMembership
from app.domain.memberships.ports import MembershipRepository
from app.domain.trips.entity import Trip
from app.domain.trips.exceptions import TripNotFound
from app.domain.trips.ports import TripRepository
from app.domain.users.ports import UserReader


def _now() -> datetime:
    return datetime.now(timezone.utc)


class InvitationService:
    def __init__(
        self,
        invitations: InvitationRepository,
        memberships: MembershipRepository,
        trips: TripRepository,
        users: UserReader,
    ) -> None:
        self._invitations = invitations
        self._memberships = memberships
        self._trips = trips
        self._users = users

    async def _require_owner(self, trip_id: UUID, user_id: UUID) -> Trip:
        # Same "no leak existence" pattern as elsewhere.
        trip = await self._trips.get_by_id(trip_id)
        if trip is None or trip.owner_id != user_id:
            raise TripNotFound(trip_id)
        return trip

    async def create(
        self, *, trip_id: UUID, owner_id: UUID
    ) -> TripInvitation:
        await self._require_owner(trip_id, owner_id)
        invitation = TripInvitation(
            trip_id=trip_id,
            created_by_user_id=owner_id,
            token=secrets.token_urlsafe(32),
        )
        return await self._invitations.add(invitation)

    async def list_active(
        self, *, trip_id: UUID, owner_id: UUID
    ) -> list[TripInvitation]:
        await self._require_owner(trip_id, owner_id)
        return await self._invitations.list_active_for_trip(trip_id)

    async def revoke(
        self,
        *,
        trip_id: UUID,
        invitation_id: UUID,
        owner_id: UUID,
    ) -> None:
        await self._require_owner(trip_id, owner_id)
        invitation = await self._invitations.get_by_id(invitation_id)
        if invitation is None or invitation.trip_id != trip_id:
            # Treat unknown / mismatched as not-found.
            raise InvitationInvalid()
        invitation.revoked_at = _now()
        await self._invitations.update(invitation)

    async def preview(self, token: str) -> InvitationPreview:
        invitation = await self._invitations.get_by_token(token)
        self._ensure_active(invitation)
        assert invitation is not None  # _ensure_active raises otherwise
        trip = await self._trips.get_by_id(invitation.trip_id)
        if trip is None:
            raise InvitationInvalid()
        inviter = await self._users.get_by_id(invitation.created_by_user_id)
        return InvitationPreview(
            trip_id=trip.id,
            trip_name=trip.name,
            inviter_display_name=inviter.display_name if inviter else "",
            expires_at=invitation.expires_at,
        )

    async def accept(self, *, token: str, user_id: UUID) -> Trip:
        invitation = await self._invitations.get_by_token(token)
        self._ensure_active(invitation)
        assert invitation is not None
        trip = await self._trips.get_by_id(invitation.trip_id)
        if trip is None:
            raise InvitationInvalid()

        # Idempotent: owner accepting their own link or member accepting again.
        if trip.owner_id == user_id:
            return trip
        if not await self._memberships.exists(
            trip_id=trip.id, user_id=user_id
        ):
            await self._memberships.add(
                TripMembership(trip_id=trip.id, user_id=user_id)
            )
        return trip

    def _ensure_active(self, invitation: TripInvitation | None) -> None:
        if invitation is None:
            raise InvitationInvalid()
        if invitation.revoked_at is not None:
            raise InvitationInvalid()
        # Postgres ``TIMESTAMP`` columns drop the tzinfo on the way out,
        # so the loaded ``expires_at`` is naive. Compare against a naive
        # UTC ``now()`` to avoid a "can't compare offset-naive and
        # offset-aware" TypeError. Migrating to ``TIMESTAMPTZ`` is a
        # separate, schema-wide refactor.
        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        expires_at_naive = (
            invitation.expires_at.replace(tzinfo=None)
            if invitation.expires_at.tzinfo is not None
            else invitation.expires_at
        )
        if expires_at_naive < now_naive:
            raise InvitationInvalid()
