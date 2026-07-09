"""Pytest fixtures (async).

The test database (``tripinci_test``) lives in the same Postgres
container that ``docker-compose.yml`` provisions. The schema is created
once per pytest session via ``metadata.create_all``; categories seed is
inserted at the same time. We then TRUNCATE the data tables between
tests (preserving the seed) for isolation.
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
from app.domain.categories import entity as _categories_entity  # noqa: F401
from app.domain.categories.entity import Category
from app.domain.expenses import entity as _expenses_entity  # noqa: F401
from app.domain.trips import entity as _trips_entity  # noqa: F401
from app.domain.users.entity import User
from app.main import app

TEST_DATABASE_URL = (
    "postgresql+psycopg://tripinci:tripinci@localhost:5432/tripinci_test"
)

CATEGORY_SEED = [
    ("RESTAURANTS", "Restaurants"),
    ("GROCERIES", "Groceries"),
    ("ACCOMMODATION", "Accommodation"),
    ("TRANSPORT", "Transport"),
    ("FUEL", "Fuel"),
    ("ACTIVITIES", "Activities"),
    ("OTHER", "Other"),
]


@pytest_asyncio.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    # Seed categories once per session (TRUNCATE preserves them — see
    # ``reset_tables`` below).
    async with AsyncSession(engine, expire_on_commit=False) as session:
        for code, label in CATEGORY_SEED:
            session.add(Category(code=code, label=label))
        await session.commit()
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def reset_tables(engine) -> AsyncIterator[None]:
    """Empty data tables between tests; keep the ``category`` seed."""
    yield
    async with engine.begin() as conn:
        await conn.execute(
            text(
                'TRUNCATE TABLE "settlement_payment", "trip_invitation", '
                '"trip_membership", "expense", "plan_link", "plan", "trip", '
                '"user" '
                "RESTART IDENTITY CASCADE"
            )
        )


@pytest_asyncio.fixture
async def session(engine) -> AsyncIterator[AsyncSession]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


def _make_user(*, email: str, display_name: str) -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        hashed_password="not-a-real-hash",
        display_name=display_name,
        is_active=True,
        is_superuser=False,
        is_verified=False,
    )


@pytest_asyncio.fixture
async def test_user(session: AsyncSession) -> User:
    user = _make_user(email="tester@example.com", display_name="Tester")
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def second_user(session: AsyncSession) -> User:
    user = _make_user(email="second@example.com", display_name="Second")
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


import pytest  # noqa: E402  (kept next to the related fixtures)


@pytest.fixture
def as_user():
    """Switch the ``current_active_user`` dependency override mid-test.

    Used together with the ``client`` fixture for flows where one user
    creates a resource and another consumes it (e.g., invitations). The
    ``client`` fixture clears every override in teardown, so this
    helper doesn't need its own cleanup.
    """

    def switch(user: User) -> None:
        app.dependency_overrides[current_active_user] = lambda: user

    return switch


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
