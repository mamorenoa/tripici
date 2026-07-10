"""add plan start_time

Revision ID: b7d3f1a9c2e5
Revises: a2b9e5c8d3f4
Create Date: 2026-06-27 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b7d3f1a9c2e5"
down_revision: Union[str, Sequence[str], None] = "a2b9e5c8d3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Optional time of day for a plan."""
    op.add_column("plan", sa.Column("start_time", sa.Time(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("plan", "start_time")
