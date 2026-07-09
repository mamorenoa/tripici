"""Trip plan entity + API payload schemas.

A "plan" is a freeform idea/activity the user wants to keep handy for a
trip (a restaurant, an excursion, a museum...). ``name`` and
``description`` are mandatory; dates, duration and cost are optional.

``duration`` is free text ("2h", "todo el día", "fin de semana"). Cost
is stored as integer cents like expenses. The persisted ``Plan`` is the
entity; ``PlanCreate`` is the POST payload; ``PlanUpdate`` is the
partial PATCH payload.
"""

from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PlanBase(SQLModel):
    """Fields shared by the create payload and the persisted entity."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    start_date: date | None = None
    end_date: date | None = None
    duration: str | None = Field(default=None, max_length=100)
    cost_cents: int | None = Field(default=None, ge=0)


class Plan(PlanBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: UUID = Field(foreign_key="trip.id", index=True)
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
    end_date: date | None = None
    duration: str | None = Field(default=None, max_length=100)
    cost_cents: int | None = Field(default=None, ge=0)
