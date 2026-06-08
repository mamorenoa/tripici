"""Database engine and session helpers.

The engine is a process-wide singleton. ``get_session`` is the FastAPI
dependency that hands a fresh SQLModel ``Session`` to each request and
closes it when the request finishes.
"""

from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
