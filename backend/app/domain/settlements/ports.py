"""Port for persisting settlement payments (reimbursements)."""

from typing import Protocol
from uuid import UUID

from app.domain.settlements.entity import SettlementPayment


class SettlementRepository(Protocol):
    async def add(self, payment: SettlementPayment) -> SettlementPayment: ...

    async def list_for_trip(self, trip_id: UUID) -> list[SettlementPayment]: ...

    async def get_by_id(self, payment_id: UUID) -> SettlementPayment | None: ...

    async def delete(self, payment: SettlementPayment) -> None: ...
