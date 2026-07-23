"""Trip invitation entity + API schemas.

An invitation is a reusable token that any logged-in user can redeem to
join a trip. It stays valid until ``expires_at`` or until the owner
revokes it (``revoked_at`` non-NULL).
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

INVITATION_LIFETIME = timedelta(days=7)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _default_expiry() -> datetime:
    return _now() + INVITATION_LIFETIME


class TripInvitation(SQLModel, table=True):
    __tablename__ = "trip_invitation"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: UUID = Field(foreign_key="trip.id", index=True, ondelete="CASCADE")
    token: str = Field(max_length=64, unique=True, index=True)
    created_by_user_id: UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=_now)
    expires_at: datetime = Field(default_factory=_default_expiry)
    revoked_at: datetime | None = Field(default=None)


class InvitationRead(SQLModel):
    """API representation of an invitation. Owner-facing — includes token."""

    id: UUID
    trip_id: UUID
    token: str
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None


class InvitationPreview(SQLModel):
    """What an invitee sees before accepting."""

    trip_id: UUID
    trip_name: str
    inviter_display_name: str
    expires_at: datetime


class InvitationAcceptInput(SQLModel):
    """Request body for ``POST /invitations/accept``."""

    token: str
