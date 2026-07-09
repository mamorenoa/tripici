"""add plan

Revision ID: e8a3f6b2c9d1
Revises: d5f2b8c1a3e7
Create Date: 2026-06-24 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op


revision: str = "e8a3f6b2c9d1"
down_revision: Union[str, Sequence[str], None] = "d5f2b8c1a3e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Freeform trip plans. ``trip_id`` cascades on delete; ``user.id``
    does not (keep history if the account is removed later)."""
    op.create_table(
        "plan",
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column(
            "description",
            sqlmodel.sql.sqltypes.AutoString(length=2000),
            nullable=False,
        ),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("duration", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("cost_cents", sa.Integer(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["trip_id"], ["trip.id"],
            name="fk_plan_trip_id_trip", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"], ["user.id"],
            name="fk_plan_created_by_user_id_user",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_plan_trip_id", "plan", ["trip_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_plan_trip_id", table_name="plan")
    op.drop_table("plan")
