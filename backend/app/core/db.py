"""Async database engine and session helpers.

We use SQLAlchemy's async API on top of psycopg v3 (the same driver
package we installed for sync; it supports both modes). FastAPI-Users
requires async, and going async uniformly across the app removes the
risk of mixing paradigms.
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
)

# ``expire_on_commit=False`` is the SQLAlchemy + FastAPI-Users
# recommendation for async work: it lets us keep using the same model
# instances after a commit without triggering refresh I/O.
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with async_session_maker() as session:
        yield session
