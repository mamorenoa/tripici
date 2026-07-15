"""add trip date range

Revision ID: d4f9a2c7e1b8
Revises: c3e8b1f6a4d9
Create Date: 2026-07-15 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op


revision: str = "d4f9a2c7e1b8"
down_revision: Union[str, Sequence[str], None] = "c3e8b1f6a4d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Optional start/end dates delimiting a trip's span."""
    op.add_column("trip", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("trip", sa.Column("end_date", sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("trip", "end_date")
    op.drop_column("trip", "start_date")
