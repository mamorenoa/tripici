"""Expense use cases.

The service is framework-agnostic. It enforces the rule that only the
trip's owner can read or write its expenses by consulting the
``TripRepository`` before each operation. When invitations land, the
check evolves into "owner OR collaborator", a localized change here.
"""

from uuid import UUID

from app.domain.expenses.entity import Expense, ExpenseCreate, ExpenseUpdate
from app.domain.expenses.ports import ExpenseRepository
from app.domain.trips.entity import Trip
from app.domain.trips.exceptions import TripNotFound
from app.domain.trips.ports import TripRepository


class ExpenseNotFound(Exception):
    """The expense id does not exist (or doesn't belong to the trip)."""

    def __init__(self, expense_id: UUID) -> None:
        super().__init__(f"Expense {expense_id} not found")
        self.expense_id = expense_id


class ExpenseService:
    def __init__(
        self,
        expense_repository: ExpenseRepository,
        trip_repository: TripRepository,
    ) -> None:
        self._expenses = expense_repository
        self._trips = trip_repository

    async def _authorize_trip(self, trip_id: UUID, user_id: UUID) -> Trip:
        # 404 for both "doesn't exist" and "not yours" — don't leak the
        # existence of someone else's trip.
        trip = await self._trips.get_by_id(trip_id)
        if trip is None or trip.owner_id != user_id:
            raise TripNotFound(trip_id)
        return trip

    async def create(
        self, *, trip_id: UUID, user_id: UUID, payload: ExpenseCreate
    ) -> Expense:
        await self._authorize_trip(trip_id, user_id)
        expense = Expense(
            **payload.model_dump(),
            trip_id=trip_id,
            created_by_user_id=user_id,
        )
        return await self._expenses.add(expense)

    async def list_for_trip(
        self, *, trip_id: UUID, user_id: UUID
    ) -> list[Expense]:
        await self._authorize_trip(trip_id, user_id)
        return await self._expenses.list_for_trip(trip_id)

    async def update(
        self,
        *,
        trip_id: UUID,
        expense_id: UUID,
        user_id: UUID,
        patch: ExpenseUpdate,
    ) -> Expense:
        await self._authorize_trip(trip_id, user_id)
        expense = await self._expenses.get_by_id(expense_id)
        if expense is None or expense.trip_id != trip_id:
            raise ExpenseNotFound(expense_id)
        # Merge only the fields the client actually sent.
        for key, value in patch.model_dump(exclude_unset=True).items():
            setattr(expense, key, value)
        # Refresh the audit timestamp.
        from datetime import datetime, timezone

        expense.updated_at = datetime.now(timezone.utc)
        return await self._expenses.update(expense)

    async def delete(
        self, *, trip_id: UUID, expense_id: UUID, user_id: UUID
    ) -> None:
        await self._authorize_trip(trip_id, user_id)
        expense = await self._expenses.get_by_id(expense_id)
        if expense is None or expense.trip_id != trip_id:
            raise ExpenseNotFound(expense_id)
        await self._expenses.delete(expense)
