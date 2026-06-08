"""SQLModel-backed implementation of ``ExpenseRepository``."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import desc, select

from app.domain.expenses.entity import Expense


class SQLModelExpenseRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, expense: Expense) -> Expense:
        self._session.add(expense)
        await self._session.commit()
        await self._session.refresh(expense)
        return expense

    async def get_by_id(self, expense_id: UUID) -> Expense | None:
        return await self._session.get(Expense, expense_id)

    async def list_for_trip(self, trip_id: UUID) -> list[Expense]:
        statement = (
            select(Expense)
            .where(Expense.trip_id == trip_id)
            .order_by(desc(Expense.expense_date), desc(Expense.created_at))
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def update(self, expense: Expense) -> Expense:
        self._session.add(expense)
        await self._session.commit()
        await self._session.refresh(expense)
        return expense

    async def delete(self, expense: Expense) -> None:
        await self._session.delete(expense)
        await self._session.commit()
