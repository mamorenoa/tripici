"""SQLModel-backed implementation of ``SettlementRepository``."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.domain.settlements.entity import SettlementPayment


class SQLModelSettlementRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, payment: SettlementPayment) -> SettlementPayment:
        self._session.add(payment)
        await self._session.commit()
        await self._session.refresh(payment)
        return payment

    async def list_for_trip(self, trip_id: UUID) -> list[SettlementPayment]:
        statement = (
            select(SettlementPayment)
            .where(SettlementPayment.trip_id == trip_id)
            .order_by(SettlementPayment.created_at)
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def get_by_id(self, payment_id: UUID) -> SettlementPayment | None:
        return await self._session.get(SettlementPayment, payment_id)

    async def delete(self, payment: SettlementPayment) -> None:
        await self._session.delete(payment)
        await self._session.commit()
