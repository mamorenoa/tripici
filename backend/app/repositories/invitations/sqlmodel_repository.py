"""SQLModel-backed implementation of ``InvitationRepository``."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import desc, select

from app.domain.invitations.entity import TripInvitation


class SQLModelInvitationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, invitation: TripInvitation) -> TripInvitation:
        self._session.add(invitation)
        await self._session.commit()
        await self._session.refresh(invitation)
        return invitation

    async def get_by_id(self, invitation_id: UUID) -> TripInvitation | None:
        return await self._session.get(TripInvitation, invitation_id)

    async def get_by_token(self, token: str) -> TripInvitation | None:
        statement = select(TripInvitation).where(TripInvitation.token == token)
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def list_active_for_trip(
        self, trip_id: UUID
    ) -> list[TripInvitation]:
        now = datetime.now(timezone.utc)
        statement = (
            select(TripInvitation)
            .where(
                TripInvitation.trip_id == trip_id,
                TripInvitation.revoked_at.is_(None),  # type: ignore[union-attr]
                TripInvitation.expires_at > now,
            )
            .order_by(desc(TripInvitation.created_at))
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def update(self, invitation: TripInvitation) -> TripInvitation:
        self._session.add(invitation)
        await self._session.commit()
        await self._session.refresh(invitation)
        return invitation
