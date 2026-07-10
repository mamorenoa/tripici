"""add plan location

Revision ID: c3e8b1f6a4d9
Revises: b7d3f1a9c2e5
Create Date: 2026-06-28 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op


revision: str = "c3e8b1f6a4d9"
down_revision: Union[str, Sequence[str], None] = "b7d3f1a9c2e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Optional free-text location for a plan."""
    op.add_column(
        "plan",
        sa.Column(
            "location",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("plan", "location")
