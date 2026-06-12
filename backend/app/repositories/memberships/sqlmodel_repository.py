"""SQLModel-backed implementation of ``MembershipRepository``."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.domain.memberships.entity import TripMemberRead, TripMembership
from app.domain.trips.entity import Trip
from app.domain.users.entity import User


class SQLModelMembershipRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, membership: TripMembership) -> TripMembership:
        self._session.add(membership)
        await self._session.commit()
        await self._session.refresh(membership)
        return membership

    async def exists(self, *, trip_id: UUID, user_id: UUID) -> bool:
        statement = select(TripMembership).where(
            TripMembership.trip_id == trip_id,
            TripMembership.user_id == user_id,
        )
        result = await self._session.execute(statement)
        return result.scalar_one_or_none() is not None

    async def list_trip_ids_for_user(self, user_id: UUID) -> list[UUID]:
        statement = select(TripMembership.trip_id).where(
            TripMembership.user_id == user_id
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def delete(self, *, trip_id: UUID, user_id: UUID) -> bool:
        statement = select(TripMembership).where(
            TripMembership.trip_id == trip_id,
            TripMembership.user_id == user_id,
        )
        result = await self._session.execute(statement)
        membership = result.scalar_one_or_none()
        if membership is None:
            return False
        await self._session.delete(membership)
        await self._session.commit()
        return True

    async def list_members(self, trip_id: UUID) -> list[TripMemberRead]:
        # Owner first (joined_at = trip.created_at), then collaborators
        # in joined_at order.
        trip = await self._session.get(Trip, trip_id)
        if trip is None:
            return []

        owner = await self._session.get(User, trip.owner_id)
        out: list[TripMemberRead] = []
        if owner is not None:
            out.append(
                TripMemberRead(
                    user_id=owner.id,
                    email=owner.email,
                    display_name=owner.display_name,
                    joined_at=trip.created_at,
                    is_owner=True,
                )
            )

        statement = (
            select(TripMembership, User)
            .join(User, User.id == TripMembership.user_id)
            .where(TripMembership.trip_id == trip_id)
            .order_by(TripMembership.joined_at)
        )
        result = await self._session.execute(statement)
        for membership, user in result.all():
            out.append(
                TripMemberRead(
                    user_id=user.id,
                    email=user.email,
                    display_name=user.display_name,
                    joined_at=membership.joined_at,
                    is_owner=False,
                )
            )
        return out
