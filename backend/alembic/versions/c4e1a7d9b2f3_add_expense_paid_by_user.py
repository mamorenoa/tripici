"""add expense paid_by_user_id

Revision ID: c4e1a7d9b2f3
Revises: 7b5d436b4613
Create Date: 2026-06-22 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c4e1a7d9b2f3"
down_revision: Union[str, Sequence[str], None] = "7b5d436b4613"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Adds the nullable ``paid_by_user_id`` column. ``NULL`` means the
    expense is "common" (split across members in the stats). Existing
    rows are backfilled to ``created_by_user_id`` so historical
    per-member stats keep their meaning — only new expenses can opt into
    being common.
    """
    op.add_column(
        "expense",
        sa.Column("paid_by_user_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_expense_paid_by_user_id_user",
        "expense",
        "user",
        ["paid_by_user_id"],
        ["id"],
    )
    op.execute(
        "UPDATE expense SET paid_by_user_id = created_by_user_id"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_expense_paid_by_user_id_user", "expense", type_="foreignkey"
    )
    op.drop_column("expense", "paid_by_user_id")
