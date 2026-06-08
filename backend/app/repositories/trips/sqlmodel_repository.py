"""SQLModel-backed implementation of ``TripRepository``.

The only place in the app that knows about ``AsyncSession`` and SQL
queries. Implements the ``TripRepository`` Protocol structurally — no
inheritance needed, just matching method signatures.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.domain.trips.entity import Trip


class SQLModelTripRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, trip: Trip) -> Trip:
        self._session.add(trip)
        await self._session.commit()
        await self._session.refresh(trip)
        return trip

    async def get_by_id(self, trip_id: UUID) -> Trip | None:
        return await self._session.get(Trip, trip_id)

    async def list_for_owner(self, owner_id: UUID) -> list[Trip]:
        statement = (
            select(Trip)
            .where(Trip.owner_id == owner_id)
            .order_by(Trip.created_at.desc())
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())
