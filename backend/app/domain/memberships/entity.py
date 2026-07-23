"""Trip membership (collaborator) entity.

The trip OWNER is NOT in this table — that's recorded by
``trip.owner_id``. Membership only tracks collaborators added via an
invitation. Authorization elsewhere combines both ("owner OR
membership").
"""

from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TripMembership(SQLModel, table=True):
    __tablename__ = "trip_membership"

    trip_id: UUID = Field(
        foreign_key="trip.id", primary_key=True, ondelete="CASCADE"
    )
    user_id: UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    joined_at: datetime = Field(default_factory=_now)


class TripMemberRead(SQLModel):
    """API representation of a trip member (owner OR collaborator).

    Built by the View layer by joining ``trip.owner_id`` and
    ``trip_membership`` against ``user``. ``is_owner`` distinguishes
    the two kinds of membership at the API boundary.
    """

    user_id: UUID
    email: str
    display_name: str
    joined_at: datetime
    is_owner: bool
