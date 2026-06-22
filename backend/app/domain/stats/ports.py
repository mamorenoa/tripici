"""Port for the stats domain.

The repository only does raw aggregation (pure data access). All the
business logic — computing percentages and, crucially, splitting
"common" expenses across trip members — lives in ``StatsService``.
Methods return plain Python tuples/ints so the domain stays free of any
SQLAlchemy types.
"""

from datetime import date
from typing import Protocol
from uuid import UUID


class StatsRepository(Protocol):
    # ── Per-trip aggregates ──────────────────────────────────────────
    async def trip_category_totals(
        self, trip_id: UUID
    ) -> list[tuple[str, str, int]]:
        """``(category_code, label, total_cents)`` ordered by total desc."""
        ...

    async def trip_date_totals(self, trip_id: UUID) -> list[tuple[date, int]]:
        """``(expense_date, total_cents)`` ordered by date asc."""
        ...

    async def trip_member_attributed(
        self, trip_id: UUID
    ) -> list[tuple[UUID, str, int]]:
        """``(paid_by_user_id, display_name, total_cents)`` for expenses
        attributed to a person (``paid_by_user_id`` not null)."""
        ...

    async def trip_common_total(self, trip_id: UUID) -> int:
        """Sum of common expenses (``paid_by_user_id`` is null)."""
        ...

    # ── Global (cross-trip) aggregates ───────────────────────────────
    async def global_category_totals(
        self, user_id: UUID
    ) -> list[tuple[str, str, int]]:
        """Unfiltered ``(category_code, label, total_cents)`` desc."""
        ...

    async def global_total(
        self, user_id: UUID, category_code: str | None
    ) -> int: ...

    async def global_trip_totals(
        self, user_id: UUID, category_code: str | None
    ) -> list[tuple[UUID, str, int, int]]:
        """``(trip_id, trip_name, total_cents, days)`` desc. ``days`` is the
        full-trip span (ignores the category filter)."""
        ...

    async def global_month_totals(
        self, user_id: UUID, category_code: str | None
    ) -> list[tuple[str, int]]:
        """``(month "YYYY-MM", total_cents)`` asc."""
        ...

    async def global_personal_attributed(
        self, user_id: UUID, category_code: str | None
    ) -> int:
        """Total of expenses attributed to ``user_id`` across their trips."""
        ...

    async def global_common_shares(
        self, user_id: UUID, category_code: str | None
    ) -> list[tuple[int, int]]:
        """Per trip with common expenses: ``(common_total, member_count)``.
        The service turns each into the user's share."""
        ...
