"""add settlement_payment

Revision ID: d5f2b8c1a3e7
Revises: c4e1a7d9b2f3
Create Date: 2026-06-23 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d5f2b8c1a3e7"
down_revision: Union[str, Sequence[str], None] = "c4e1a7d9b2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Manual reimbursements between trip members ("settle up").

    Deleting a trip removes its payments (CASCADE); user FKs do not
    cascade (keep history if an account is removed later).
    """
    op.create_table(
        "settlement_payment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("from_user_id", sa.Uuid(), nullable=False),
        sa.Column("to_user_id", sa.Uuid(), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["trip_id"], ["trip.id"],
            name="fk_settlement_payment_trip_id_trip", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["from_user_id"], ["user.id"],
            name="fk_settlement_payment_from_user_id_user",
        ),
        sa.ForeignKeyConstraint(
            ["to_user_id"], ["user.id"],
            name="fk_settlement_payment_to_user_id_user",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"], ["user.id"],
            name="fk_settlement_payment_created_by_user_id_user",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_settlement_payment_trip_id", "settlement_payment", ["trip_id"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_settlement_payment_trip_id", table_name="settlement_payment")
    op.drop_table("settlement_payment")
