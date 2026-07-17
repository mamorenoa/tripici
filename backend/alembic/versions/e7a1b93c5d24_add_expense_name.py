"""add expense name

Revision ID: e7a1b93c5d24
Revises: d4f9a2c7e1b8
Create Date: 2026-07-17 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op


revision: str = "e7a1b93c5d24"
down_revision: Union[str, Sequence[str], None] = "d4f9a2c7e1b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Every expense gets a required short title.

    Backfill, in order of preference:
      1. its ``description`` (what the list used to show as the title), and
      2. its category's label — ``description`` is nullable, so rows without
         one would otherwise be left NULL and block the NOT NULL below.

    ``category_code`` is NOT NULL and ``category.label`` is NOT NULL, so the
    COALESCE always resolves and the column can be tightened safely.
    """
    op.add_column(
        "expense",
        sa.Column(
            "name",
            sqlmodel.sql.sqltypes.AutoString(length=200),
            nullable=True,
        ),
    )
    op.execute(
        """
        UPDATE expense AS e
        SET name = COALESCE(
            NULLIF(TRIM(e.description), ''),
            (SELECT c.label FROM category AS c WHERE c.code = e.category_code)
        )
        """
    )
    op.alter_column("expense", "name", nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("expense", "name")
