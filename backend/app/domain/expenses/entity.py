"""Expense domain entity + API payload schemas.

The persisted ``Expense`` is the entity. ``ExpenseCreate`` is the POST
payload (no id / no trip_id / no audit fields — those come from the
route param and the authenticated user). ``ExpenseUpdate`` is the
partial PATCH payload — every field is optional; the service merges
only the keys the client explicitly set.

Amounts are stored as integer cents to avoid floating-point math. The
frontend formats them as euros.
"""

from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ExpenseBase(SQLModel):
    """Fields shared by create payload and persisted entity."""

    amount_cents: int = Field(ge=0)
    category_code: str = Field(max_length=40, foreign_key="category.code")
    expense_date: date = Field(default_factory=_today)
    description: str | None = Field(default=None, max_length=200)
    # Who the expense is attributed to. ``None`` == a "common" expense,
    # split across all trip members in the per-member stats. When set it
    # must be a member of the trip (validated in the service). This is
    # NOT the same as ``created_by_user_id``: I can log an expense paid
    # by someone else.
    paid_by_user_id: UUID | None = Field(default=None, foreign_key="user.id")


class Expense(ExpenseBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: UUID = Field(foreign_key="trip.id", index=True)
    # Audit only: the authenticated user who created the record.
    created_by_user_id: UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class ExpenseCreate(ExpenseBase):
    """Payload accepted by ``POST /trips/{trip_id}/expenses``."""

    pass


class ExpenseUpdate(SQLModel):
    """Payload accepted by ``PATCH /trips/{trip_id}/expenses/{expense_id}``.

    Every field is optional. Clients send only the keys they want to
    change. The service applies ``model_dump(exclude_unset=True)``.
    """

    amount_cents: int | None = Field(default=None, ge=0)
    category_code: str | None = Field(default=None, max_length=40)
    expense_date: date | None = None
    description: str | None = Field(default=None, max_length=200)
    # Optional. Sending ``null`` explicitly converts the expense to a
    # "common" one; omitting the key leaves the attribution untouched
    # (the service applies ``model_dump(exclude_unset=True)``).
    paid_by_user_id: UUID | None = None
