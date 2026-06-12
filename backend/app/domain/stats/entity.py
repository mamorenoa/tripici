"""Read-only aggregation shapes for trip statistics.

These are plain SQLModel types (no ``table=True``) used exclusively as
API response models. No DB table backs them.
"""

from datetime import date
from uuid import UUID

from sqlmodel import SQLModel


class CategoryStat(SQLModel):
    category_code: str
    label: str
    total_cents: int
    pct: float


class MemberStat(SQLModel):
    user_id: UUID
    display_name: str
    total_cents: int
    pct: float


class DateStat(SQLModel):
    date: date
    total_cents: int


class TripStats(SQLModel):
    total_cents: int
    by_category: list[CategoryStat]
    by_member: list[MemberStat]
    by_date: list[DateStat]
