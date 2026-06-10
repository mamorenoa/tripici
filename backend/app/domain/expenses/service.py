"""Expense use cases.

The service is framework-agnostic. It enforces that only the trip's
owner OR a collaborator can read or write its expenses — consulting
both ``TripRepository`` and ``MembershipRepository`` before each
operation.
"""

from datetime import datetime, timezone
from uuid import UUID

from app.domain.expenses.entity import Expense, ExpenseCreate, ExpenseUpdate
from app.domain.expenses.ports import ExpenseRepository
from app.domain.memberships.ports import MembershipRepository
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
        membership_repository: MembershipRepository,
    ) -> None:
        self._expenses = expense_repository
        self._trips = trip_repository
        self._memberships = membership_repository

    async def _authorize_trip(self, trip_id: UUID, user_id: UUID) -> Trip:
        # 404 for "not exists" and for "you're neither owner nor member".
        trip = await self._trips.get_by_id(trip_id)
        if trip is None:
            raise TripNotFound(trip_id)
        if trip.owner_id == user_id:
            return trip
        if await self._memberships.exists(trip_id=trip_id, user_id=user_id):
            return trip
        raise TripNotFound(trip_id)

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
        for key, value in patch.model_dump(exclude_unset=True).items():
            setattr(expense, key, value)
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
