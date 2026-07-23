"""Trip plan entity + API payload schemas.

A "plan" is a freeform idea/activity the user wants to keep handy for a
trip (a restaurant, an excursion, a museum...). ``name`` and
``description`` are mandatory; dates, duration and cost are optional.

``duration`` is free text ("2h", "todo el día", "fin de semana"). Cost
is stored as integer cents like expenses. The persisted ``Plan`` is the
entity; ``PlanCreate`` is the POST payload; ``PlanUpdate`` is the
partial PATCH payload.
"""

import re
from datetime import date, datetime, time, timezone
from uuid import UUID, uuid4

from pydantic import field_validator
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


class PlanBase(SQLModel):
    """Fields shared by the create payload and the persisted entity."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    start_date: date | None = None
    start_time: time | None = None  # optional time of day for the plan
    end_date: date | None = None
    duration: str | None = Field(default=None, max_length=100)
    # Free text: an address, place name, coordinates, or a maps URL. The
    # app turns it into an "Open in Maps" action (no geocoding backend).
    location: str | None = Field(default=None, max_length=500)
    cost_cents: int | None = Field(default=None, ge=0)
    # When ``True`` (and a cost is set), the plan's cost is mirrored into
    # a trip expense (see ``PlanService._reconcile_expense``). The mirror
    # uses ``expense_category_code`` and is booked as a common expense.
    count_as_expense: bool = Field(default=False)
    expense_category_code: str | None = Field(
        default=None, max_length=40, foreign_key="category.code"
    )


class Plan(PlanBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: UUID = Field(foreign_key="trip.id", index=True, ondelete="CASCADE")
    created_by_user_id: UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class PlanCreate(PlanBase):
    """Payload accepted by ``POST /trips/{trip_id}/plans``."""

    pass


class PlanUpdate(SQLModel):
    """Payload accepted by ``PATCH /trips/{trip_id}/plans/{plan_id}``.

    Every field is optional. Clients send only the keys they want to
    change; the service applies ``model_dump(exclude_unset=True)``.
    """

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    start_date: date | None = None
    start_time: time | None = None
    end_date: date | None = None
    duration: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=500)
    cost_cents: int | None = Field(default=None, ge=0)
    count_as_expense: bool | None = None
    expense_category_code: str | None = Field(default=None, max_length=40)


# ── Documentation links (Drive, maps, booking confirmations...) ──────


class PlanLink(SQLModel, table=True):
    __tablename__ = "plan_link"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    plan_id: UUID = Field(foreign_key="plan.id", index=True, ondelete="CASCADE")
    url: str = Field(max_length=2000)
    label: str | None = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=_now)


class PlanLinkCreate(SQLModel):
    """Payload for ``POST /trips/{id}/plans/{plan_id}/links``."""

    url: str = Field(max_length=2000)
    label: str | None = Field(default=None, max_length=100)

    @field_validator("url")
    @classmethod
    def _validate_url(cls, value: str) -> str:
        value = value.strip()
        if not _URL_RE.match(value):
            raise ValueError("URL must start with http:// or https://")
        return value


class PlanRead(PlanBase):
    """A plan with its documentation links embedded."""

    id: UUID
    trip_id: UUID
    created_by_user_id: UUID
    created_at: datetime
    updated_at: datetime
    links: list[PlanLink] = Field(default_factory=list)
