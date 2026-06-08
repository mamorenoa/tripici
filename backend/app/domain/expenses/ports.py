"""Ports the expenses domain depends on."""

from typing import Protocol
from uuid import UUID

from app.domain.expenses.entity import Expense


class ExpenseRepository(Protocol):
    async def add(self, expense: Expense) -> Expense: ...

    async def get_by_id(self, expense_id: UUID) -> Expense | None: ...

    async def list_for_trip(self, trip_id: UUID) -> list[Expense]: ...

    async def update(self, expense: Expense) -> Expense: ...

    async def delete(self, expense: Expense) -> None: ...
