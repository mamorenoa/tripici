"""add memberships and invitations

Revision ID: 7b5d436b4613
Revises: f697cf6f8b97
Create Date: 2026-06-08 17:26:01.274303

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic import op


revision: str = "7b5d436b4613"
down_revision: Union[str, Sequence[str], None] = "f697cf6f8b97"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Adds two new tables for the invitation flow. The existing schema
    (``trip``, ``expense``, etc.) is untouched — autogenerate flagged a
    few false positives (single-vs-composite index, FK ondelete) which
    we intentionally ignore here to keep the prior state intact.
    """

    # Collaborator membership. The trip owner is NOT in this table;
    # ``trip.owner_id`` keeps tracking the owner.
    op.create_table(
        "trip_membership",
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["trip_id"],
            ["trip.id"],
            name="fk_trip_membership_trip_id_trip",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            name="fk_trip_membership_user_id_user",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("trip_id", "user_id"),
    )

    # Reusable invite tokens. ``token`` is indexed and unique; we look
    # invitations up by token on every accept / preview.
    op.create_table(
        "trip_invitation",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["trip_id"],
            ["trip.id"],
            name="fk_trip_invitation_trip_id_trip",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["user.id"],
            name="fk_trip_invitation_created_by_user_id_user",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_trip_invitation_token",
        "trip_invitation",
        ["token"],
        unique=True,
    )
    op.create_index(
        "ix_trip_invitation_trip_id",
        "trip_invitation",
        ["trip_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_trip_invitation_trip_id", table_name="trip_invitation")
    op.drop_index("ix_trip_invitation_token", table_name="trip_invitation")
    op.drop_table("trip_invitation")
    op.drop_table("trip_membership")
