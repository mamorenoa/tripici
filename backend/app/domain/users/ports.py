"""Minimal port for the users feature.

FastAPI-Users handles most user operations (registration, login,
fetching the current user). For our own domain services that need to
read a user by id (e.g., the invitation preview needs the inviter's
display name), we expose a tiny ``UserReader`` instead of leaking
SQLAlchemy sessions into the domain.
"""

from typing import Protocol
from uuid import UUID

from app.domain.users.entity import User


class UserReader(Protocol):
    async def get_by_id(self, user_id: UUID) -> User | None: ...
