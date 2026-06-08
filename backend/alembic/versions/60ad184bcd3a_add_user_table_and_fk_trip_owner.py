"""add user table and fk trip owner

Revision ID: 60ad184bcd3a
Revises: 7945d8dc809f
Create Date: 2026-06-08 15:49:52.490034

"""
from typing import Sequence, Union

import fastapi_users_db_sqlalchemy
import sqlalchemy as sa
import sqlmodel  # noqa: F401  (kept for future migrations that reference SQLModel types)
from alembic import op


revision: str = "60ad184bcd3a"
down_revision: Union[str, Sequence[str], None] = "7945d8dc809f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# UUID that slice 2 used as the dev placeholder for ``trip.owner_id``.
# These rows have no real user; they would violate the new FK, so we
# delete them as part of this migration.
LEGACY_DEV_OWNER_ID = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user",
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column(
            "id",
            fastapi_users_db_sqlalchemy.generics.GUID(),
            nullable=False,
        ),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=1024), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)

    # Slice 2 left legacy rows pointing at a placeholder owner that
    # never existed as a real user. Drop them before adding the FK so
    # the constraint can be created cleanly. Cast the literal to ``uuid``
    # explicitly — Postgres won't compare ``uuid`` to ``varchar``.
    op.execute(
        sa.text(
            f"DELETE FROM trip WHERE owner_id = '{LEGACY_DEV_OWNER_ID}'::uuid"
        )
    )

    op.create_foreign_key(
        "fk_trip_owner_id_user",
        source_table="trip",
        referent_table="user",
        local_cols=["owner_id"],
        remote_cols=["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_trip_owner_id_user", "trip", type_="foreignkey")
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_table("user")
