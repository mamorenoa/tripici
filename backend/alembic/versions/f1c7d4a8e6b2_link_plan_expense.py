"""link plan cost to expense

Revision ID: f1c7d4a8e6b2
Revises: e8a3f6b2c9d1
Create Date: 2026-06-25 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op


revision: str = "f1c7d4a8e6b2"
down_revision: Union[str, Sequence[str], None] = "e8a3f6b2c9d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """A plan can mirror its cost into a trip expense.

    - ``plan.count_as_expense`` (bool) + ``plan.expense_category_code``
      capture the intent and the category of the mirrored expense.
    - ``expense.plan_id`` links the derived expense back to its plan and
      cascades on delete, so removing a plan removes its derived expense.
    """
    op.add_column(
        "plan",
        sa.Column(
            "count_as_expense",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "plan",
        sa.Column(
            "expense_category_code",
            sqlmodel.sql.sqltypes.AutoString(length=40),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_plan_expense_category_code_category",
        "plan",
        "category",
        ["expense_category_code"],
        ["code"],
    )

    op.add_column(
        "expense",
        sa.Column("plan_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_expense_plan_id_plan",
        "expense",
        "plan",
        ["plan_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_expense_plan_id", "expense", ["plan_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_expense_plan_id", table_name="expense")
    op.drop_constraint("fk_expense_plan_id_plan", "expense", type_="foreignkey")
    op.drop_column("expense", "plan_id")
    op.drop_constraint(
        "fk_plan_expense_category_code_category", "plan", type_="foreignkey"
    )
    op.drop_column("plan", "expense_category_code")
    op.drop_column("plan", "count_as_expense")
