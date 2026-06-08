"""Pytest fixtures (async).

The test database (``tripinci_test``) lives in the same Postgres
container that ``docker-compose.yml`` provisions. The schema is created
once per pytest session via ``metadata.create_all`` for both SQLModel
and SQLAlchemy bases (we intentionally bypass Alembic in tests).

Each test starts with empty tables. We TRUNCATE in an autouse fixture
after every test — simpler than a full async savepoint dance and fast
enough for the test count we have.
"""

import uuid
from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import SQLModel

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.trips import entity as _trips_entity  # noqa: F401 (registers tables)
from app.domain.users.entity import Base as UsersBase, User
from app.main import app

TEST_DATABASE_URL = (
    "postgresql+psycopg://tripinci:tripinci@localhost:5432/tripinci_test"
)


@pytest_asyncio.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(UsersBase.metadata.create_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(UsersBase.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def reset_tables(engine) -> AsyncIterator[None]:
    """Empty every table between tests."""
    yield
    async with engine.begin() as conn:
        # ``"user"`` must be quoted (reserved keyword). CASCADE handles
        # the FK from trip.owner_id.
        await conn.execute(text('TRUNCATE TABLE "trip", "user" RESTART IDENTITY CASCADE'))


@pytest_asyncio.fixture
async def session(engine) -> AsyncIterator[AsyncSession]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


@pytest_asyncio.fixture
async def test_user(session: AsyncSession) -> User:
    """Insert a test user so trip rows can satisfy the FK."""
    user = User(
        id=uuid.uuid4(),
        email="tester@example.com",
        hashed_password="not-a-real-hash",
        display_name="Tester",
        is_active=True,
        is_superuser=False,
        is_verified=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """``AsyncClient`` with the test session injected. No auth bypass —
    use this fixture for tests that exercise the real auth flow."""

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def authed_client(
    session: AsyncSession, test_user: User
) -> AsyncIterator[AsyncClient]:
    """``AsyncClient`` for tests that need an authenticated user.

    Overrides both ``get_session`` and ``current_active_user`` so the
    test doesn't need to go through the real login flow.
    """

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        yield session

    def override_current_active_user() -> User:
        return test_user

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[current_active_user] = override_current_active_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        app.dependency_overrides.clear()
