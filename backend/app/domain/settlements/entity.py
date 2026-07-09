"""Shapes for the per-trip settlement ("who owes whom") + recorded payments.

``SettlementPayment`` is the only persisted table here: a manual record
that one member reimbursed another (we do NOT verify the real transfer —
that's on the users). The rest are read-only API shapes computed on the
fly from expenses + payments + memberships.
"""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Persisted: a reimbursement between two members ───────────────────


class SettlementPayment(SQLModel, table=True):
    __tablename__ = "settlement_payment"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    trip_id: UUID = Field(foreign_key="trip.id", index=True)
    from_user_id: UUID = Field(foreign_key="user.id")
    to_user_id: UUID = Field(foreign_key="user.id")
    amount_cents: int = Field(gt=0)
    created_by_user_id: UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=_now)


class SettlementPaymentCreate(SQLModel):
    """Payload for ``POST /trips/{id}/settlement/payments``."""

    from_user_id: UUID
    to_user_id: UUID
    amount_cents: int = Field(gt=0)


# ── Read-only API shapes ─────────────────────────────────────────────


class MemberBalance(SQLModel):
    user_id: UUID
    display_name: str
    # Positive = the group owes this member (they are owed money);
    # negative = this member owes the group. Reflects recorded payments.
    balance_cents: int


class Settlement(SQLModel):
    """A single suggested transfer: ``from`` pays ``to``."""

    from_user_id: UUID
    from_name: str
    to_user_id: UUID
    to_name: str
    amount_cents: int


class PaymentRead(SQLModel):
    """A recorded reimbursement, with names resolved for display."""

    id: UUID
    from_user_id: UUID
    from_name: str
    to_user_id: UUID
    to_name: str
    amount_cents: int


class TripSettlement(SQLModel):
    balances: list[MemberBalance]
    settlements: list[Settlement]  # remaining suggested transfers
    payments: list[PaymentRead]    # reimbursements already recorded
