"""Pytest fixtures.

The test database (``tripinci_test``) lives in the same Postgres
container that ``docker-compose.yml`` provisions. The schema is created
once per pytest session via ``SQLModel.metadata.create_all`` — we
intentionally skip Alembic in tests, since the production schema is
already validated when migrations land.

Each test runs inside an outer transaction + a re-opened SAVEPOINT, so
any ``session.commit()`` performed by the production code (e.g. in the
repository) only ends the savepoint. The outer transaction is rolled
back at the end of the test, giving us perfect isolation without
TRUNCATE.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel

from app.core.db import get_session
from app.domain.trips import entity as _trips_entity  # noqa: F401 (register models)
from app.main import app

TEST_DATABASE_URL = (
    "postgresql+psycopg://tripinci:tripinci@localhost:5432/tripinci_test"
)


@pytest.fixture(scope="session")
def engine() -> Generator[Engine, None, None]:
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture()
def session(engine: Engine) -> Generator[Session, None, None]:
    """Session that rolls back after every test.

    Standard SQLAlchemy "join a session into an external transaction"
    pattern: the outer connection runs a transaction, the session sits
    inside a SAVEPOINT, and an event listener re-opens the SAVEPOINT
    whenever the application code commits.
    """
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = Session(bind=connection)
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(_session: Session, _transaction) -> None:
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture()
def client(session: Session) -> Generator[TestClient, None, None]:
    """``TestClient`` wired to the rolled-back session via dep override."""

    def override_get_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
