"""Minimal SQLAlchemy reader for the ``user`` table.

FastAPI-Users handles the heavy lifting (auth, password hashing,
registration). For domain services that need to read a user by id
(e.g., ``InvitationService.preview`` needing the inviter's name) we
expose this tiny class instead of teaching the domain about
``AsyncSession``.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.entity import User


class SQLAlchemyUserReader:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self._session.get(User, user_id)
