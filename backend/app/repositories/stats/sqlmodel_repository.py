"""SQLAlchemy-backed implementation of ``StatsRepository``."""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.stats.entity import (
    CategoryStat,
    DateStat,
    GlobalStats,
    MemberStat,
    MonthStat,
    TripStat,
    TripStats,
)


def _pct(part: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round(part / total * 100, 1)


class SQLModelStatsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def aggregate_for_trip(self, trip_id: UUID) -> TripStats:
        by_category = await self._by_category(trip_id)
        by_member = await self._by_member(trip_id)
        by_date = await self._by_date(trip_id)

        total = sum(r.total_cents for r in by_category)

        return TripStats(
            total_cents=total,
            by_category=[
                CategoryStat(
                    category_code=r.category_code,
                    label=r.label,
                    total_cents=r.total_cents,
                    pct=_pct(r.total_cents, total),
                )
                for r in by_category
            ],
            by_member=[
                MemberStat(
                    user_id=r.created_by_user_id,
                    display_name=r.display_name,
                    total_cents=r.total_cents,
                    pct=_pct(r.total_cents, total),
                )
                for r in by_member
            ],
            by_date=[
                DateStat(date=r.expense_date, total_cents=r.total_cents)
                for r in by_date
            ],
        )

    async def _by_category(self, trip_id: UUID):
        result = await self._session.execute(
            text(
                """
                SELECT e.category_code, c.label, SUM(e.amount_cents) AS total_cents
                FROM expense e
                JOIN category c ON c.code = e.category_code
                WHERE e.trip_id = :trip_id
                GROUP BY e.category_code, c.label
                ORDER BY total_cents DESC
                """
            ),
            {"trip_id": trip_id},
        )
        return result.fetchall()

    async def _by_member(self, trip_id: UUID):
        result = await self._session.execute(
            text(
                """
                SELECT e.created_by_user_id, u.display_name, SUM(e.amount_cents) AS total_cents
                FROM expense e
                JOIN "user" u ON u.id = e.created_by_user_id
                WHERE e.trip_id = :trip_id
                GROUP BY e.created_by_user_id, u.display_name
                ORDER BY total_cents DESC
                """
            ),
            {"trip_id": trip_id},
        )
        return result.fetchall()

    async def _by_date(self, trip_id: UUID):
        result = await self._session.execute(
            text(
                """
                SELECT e.expense_date, SUM(e.amount_cents) AS total_cents
                FROM expense e
                WHERE e.trip_id = :trip_id
                GROUP BY e.expense_date
                ORDER BY e.expense_date ASC
                """
            ),
            {"trip_id": trip_id},
        )
        return result.fetchall()

    # ── Global (cross-trip) aggregations ─────────────────────────────

    _USER_TRIPS_CTE = """
        WITH user_trips AS (
            SELECT id AS trip_id FROM trip WHERE owner_id = :user_id
            UNION
            SELECT trip_id FROM trip_membership WHERE user_id = :user_id
        )
    """

    async def aggregate_for_user(
        self, user_id: UUID, category_code: str | None = None
    ) -> GlobalStats:
        cat_filter = "AND e.category_code = :category_code" if category_code else ""
        params: dict = {"user_id": user_id}
        if category_code:
            params["category_code"] = category_code

        by_category_rows = await self._global_by_category(user_id)
        gross_total = sum(r.total_cents for r in by_category_rows)

        total_row = await self._global_total(user_id, cat_filter, params)
        filtered_total = total_row or 0

        by_trip_rows = await self._global_by_trip(cat_filter, params)
        by_month_rows = await self._global_by_month(cat_filter, params)

        return GlobalStats(
            total_cents=filtered_total,
            by_category=[
                CategoryStat(
                    category_code=r.category_code,
                    label=r.label,
                    total_cents=r.total_cents,
                    pct=_pct(r.total_cents, gross_total),
                )
                for r in by_category_rows
            ],
            by_trip=[
                TripStat(
                    trip_id=r.trip_id,
                    trip_name=r.trip_name,
                    total_cents=r.total_cents,
                )
                for r in by_trip_rows
            ],
            by_month=[
                MonthStat(month=r.month, total_cents=r.total_cents)
                for r in by_month_rows
            ],
        )

    async def _global_by_category(self, user_id: UUID):
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + """
                SELECT e.category_code, c.label, SUM(e.amount_cents) AS total_cents
                FROM expense e
                JOIN category c ON c.code = e.category_code
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                GROUP BY e.category_code, c.label
                ORDER BY total_cents DESC
                """
            ),
            {"user_id": user_id},
        )
        return result.fetchall()

    async def _global_total(
        self, user_id: UUID, cat_filter: str, params: dict
    ) -> int:
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + f"""
                SELECT COALESCE(SUM(e.amount_cents), 0) AS total_cents
                FROM expense e
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                {cat_filter}
                """
            ),
            params,
        )
        row = result.fetchone()
        return row.total_cents if row else 0

    async def _global_by_trip(self, cat_filter: str, params: dict):
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + f"""
                SELECT t.id AS trip_id, t.name AS trip_name,
                       SUM(e.amount_cents) AS total_cents
                FROM expense e
                JOIN trip t ON t.id = e.trip_id
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                {cat_filter}
                GROUP BY t.id, t.name
                ORDER BY total_cents DESC
                """
            ),
            params,
        )
        return result.fetchall()

    async def _global_by_month(self, cat_filter: str, params: dict):
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + f"""
                SELECT TO_CHAR(e.expense_date, 'YYYY-MM') AS month,
                       SUM(e.amount_cents) AS total_cents
                FROM expense e
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                {cat_filter}
                GROUP BY month
                ORDER BY month ASC
                """
            ),
            params,
        )
        return result.fetchall()
