"""User domain entity (SQLAlchemy-native).

FastAPI-Users provides ``SQLAlchemyBaseUserTableUUID`` as a SQLAlchemy
2.0 mixin that gives the table its base columns: ``id`` (UUID),
``email``, ``hashed_password``, ``is_active``, ``is_superuser``,
``is_verified``. We compose it with a ``DeclarativeBase`` of our own
so Alembic picks up its metadata.

Note: ``Trip`` is a SQLModel entity (different declarative base / metadata).
Both metadatas coexist; ``alembic/env.py`` registers them as a list.
"""

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlmodel import SQLModel


class Base(DeclarativeBase):
    """Declarative base for SQLAlchemy-native models (currently: ``User``).

    We share ``SQLModel.metadata`` so SQLModel-backed tables (e.g.,
    ``Trip``, ``Expense``) can resolve foreign keys that point at the
    SQLAlchemy-native ``user`` table. Without this, cross-metadata FKs
    fail at autogenerate time with ``NoReferencedTableError``.
    """

    metadata = SQLModel.metadata


class User(SQLAlchemyBaseUserTableUUID, Base):
    # FastAPI-Users provides id/email/hashed_password/is_active/is_superuser/is_verified.
    # We add a human-friendly display name shown in the UI.
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
