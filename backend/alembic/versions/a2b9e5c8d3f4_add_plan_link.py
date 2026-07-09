"""add plan_link

Revision ID: a2b9e5c8d3f4
Revises: f1c7d4a8e6b2
Create Date: 2026-06-26 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op


revision: str = "a2b9e5c8d3f4"
down_revision: Union[str, Sequence[str], None] = "f1c7d4a8e6b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Documentation links attached to a plan (external URLs). Deleting a
    plan removes its links (CASCADE)."""
    op.create_table(
        "plan_link",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("plan_id", sa.Uuid(), nullable=False),
        sa.Column("url", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=False),
        sa.Column("label", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["plan_id"], ["plan.id"],
            name="fk_plan_link_plan_id_plan", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_plan_link_plan_id", "plan_link", ["plan_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_plan_link_plan_id", table_name="plan_link")
    op.drop_table("plan_link")
