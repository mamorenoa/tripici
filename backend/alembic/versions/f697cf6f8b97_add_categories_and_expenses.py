"""add categories and expenses

Revision ID: f697cf6f8b97
Revises: 60ad184bcd3a
Create Date: 2026-06-08 16:36:59.753808

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op


revision: str = "f697cf6f8b97"
down_revision: Union[str, Sequence[str], None] = "60ad184bcd3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Initial seed shipped with the schema. Adding rows later is a separate
# data migration; changing labels happens here when the wording drifts.
CATEGORY_SEED = [
    {"code": "RESTAURANTS", "label": "Restaurants"},
    {"code": "GROCERIES", "label": "Groceries"},
    {"code": "ACCOMMODATION", "label": "Accommodation"},
    {"code": "TRANSPORT", "label": "Transport"},
    {"code": "FUEL", "label": "Fuel"},
    {"code": "ACTIVITIES", "label": "Activities"},
    {"code": "OTHER", "label": "Other"},
]


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Lookup table for expense categories.
    category = op.create_table(
        "category",
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint("code"),
    )

    # 2. Seed the categories so newly-created expenses have something
    # to reference. Alembic's bulk_insert is the right tool for the
    # job — it uses the metadata-derived table object.
    op.bulk_insert(category, CATEGORY_SEED)

    # 3. The expense table itself. ``trip_id`` cascades on delete so
    # removing a trip wipes its expenses; ``user.id`` does not cascade
    # (we keep history if the user account is removed in the future).
    op.create_table(
        "expense",
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("category_code", sa.String(length=40), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_code"],
            ["category.code"],
            name="fk_expense_category_code_category",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["user.id"],
            name="fk_expense_created_by_user_id_user",
        ),
        sa.ForeignKeyConstraint(
            ["trip_id"],
            ["trip.id"],
            name="fk_expense_trip_id_trip",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 4. Composite index used by ``list_for_trip``: filter by trip_id
    # and order by expense_date DESC.
    op.create_index(
        "ix_expense_trip_date",
        "expense",
        ["trip_id", "expense_date"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_expense_trip_date", table_name="expense")
    op.drop_table("expense")
    op.drop_table("category")
