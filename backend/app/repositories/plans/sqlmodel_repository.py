"""SQLModel-backed implementation of ``PlanRepository``."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import asc, select

from app.domain.plans.entity import Plan


class SQLModelPlanRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, plan: Plan) -> Plan:
        self._session.add(plan)
        await self._session.commit()
        await self._session.refresh(plan)
        return plan

    async def get_by_id(self, plan_id: UUID) -> Plan | None:
        return await self._session.get(Plan, plan_id)

    async def list_for_trip(self, trip_id: UUID) -> list[Plan]:
        # Undated plans still sort sensibly (nulls last on most PGs) then
        # by creation order.
        statement = (
            select(Plan)
            .where(Plan.trip_id == trip_id)
            .order_by(asc(Plan.start_date), asc(Plan.created_at))
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def update(self, plan: Plan) -> Plan:
        self._session.add(plan)
        await self._session.commit()
        await self._session.refresh(plan)
        return plan

    async def delete(self, plan: Plan) -> None:
        await self._session.delete(plan)
        await self._session.commit()
