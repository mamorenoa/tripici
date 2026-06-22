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


class TripStat(SQLModel):
    trip_id: UUID
    trip_name: str
    total_cents: int


class MonthStat(SQLModel):
    month: str  # "YYYY-MM"
    total_cents: int


class GlobalStats(SQLModel):
    total_cents: int
    # What the current user spent personally across all their trips:
    # expenses attributed to them + their share of each trip's common
    # expenses (common total ÷ that trip's member count). Honors the
    # category filter, like ``total_cents``.
    personal_total_cents: int
    by_category: list[CategoryStat]  # always unfiltered — drives the filter pills
    by_trip: list[TripStat]          # filtered when category_code is provided
    by_month: list[MonthStat]        # filtered when category_code is provided
