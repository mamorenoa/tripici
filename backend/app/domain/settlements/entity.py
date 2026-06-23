"""Read-only shapes for the per-trip settlement ("who owes whom").

Plain SQLModel types (no ``table=True``) used only as API response
models. No DB table backs them — settlements are computed on the fly
from expenses + memberships.
"""

from uuid import UUID

from sqlmodel import SQLModel


class MemberBalance(SQLModel):
    user_id: UUID
    display_name: str
    # Net balance in cents. Positive = the group owes this member (they
    # are owed money); negative = this member owes the group.
    balance_cents: int


class Settlement(SQLModel):
    """A single suggested transfer: ``from`` pays ``to``."""

    from_user_id: UUID
    from_name: str
    to_user_id: UUID
    to_name: str
    amount_cents: int


class TripSettlement(SQLModel):
    balances: list[MemberBalance]
    settlements: list[Settlement]
