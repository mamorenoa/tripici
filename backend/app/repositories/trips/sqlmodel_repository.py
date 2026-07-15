"""SQLModel-backed implementation of ``TripRepository``.

The only place in the app that knows about ``AsyncSession`` and SQL
queries. Implements the ``TripRepository`` Protocol structurally — no
inheritance needed, just matching method signatures.
"""

from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import desc, select

from app.domain.memberships.entity import TripMembership
from app.domain.trips.entity import Trip


class SQLModelTripRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, trip: Trip) -> Trip:
        self._session.add(trip)
        await self._session.commit()
        await self._session.refresh(trip)
        return trip

    async def update(self, trip: Trip) -> Trip:
        self._session.add(trip)
        await self._session.commit()
        await self._session.refresh(trip)
        return trip

    async def get_by_id(self, trip_id: UUID) -> Trip | None:
        return await self._session.get(Trip, trip_id)

    async def list_for_user(self, user_id: UUID) -> list[Trip]:
        """Trips the user owns OR is a collaborator in.

        Single query with a subselect on ``trip_membership``.
        """
        member_trip_ids = select(TripMembership.trip_id).where(
            TripMembership.user_id == user_id
        )
        statement = (
            select(Trip)
            .where(
                or_(
                    Trip.owner_id == user_id,
                    Trip.id.in_(member_trip_ids),
                )
            )
            .order_by(desc(Trip.created_at))
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())
