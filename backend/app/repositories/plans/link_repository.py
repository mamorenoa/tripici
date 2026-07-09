"""SQLModel-backed implementation of ``PlanLinkRepository``."""

from uuid import UUID

from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import asc, select

from app.domain.plans.entity import Plan, PlanLink


class SQLModelPlanLinkRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, link: PlanLink) -> PlanLink:
        self._session.add(link)
        await self._session.commit()
        await self._session.refresh(link)
        return link

    async def get_by_id(self, link_id: UUID) -> PlanLink | None:
        return await self._session.get(PlanLink, link_id)

    async def list_for_trip(self, trip_id: UUID) -> list[PlanLink]:
        statement = (
            select(PlanLink)
            .join(Plan, Plan.id == PlanLink.plan_id)
            .where(Plan.trip_id == trip_id)
            .order_by(asc(PlanLink.created_at))
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def delete(self, link: PlanLink) -> None:
        await self._session.delete(link)
        await self._session.commit()

    async def delete_for_plan(self, plan_id: UUID) -> None:
        await self._session.execute(
            sa_delete(PlanLink).where(PlanLink.plan_id == plan_id)
        )
        await self._session.commit()
