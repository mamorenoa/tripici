"""SQLAlchemy-backed implementation of ``StatsRepository``.

Pure data access: each method runs one GROUP BY and returns plain
tuples/ints. Percentages and the common-expense split are computed by
``StatsService`` (the domain), not here.
"""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class SQLModelStatsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Per-trip aggregates ──────────────────────────────────────────

    async def trip_category_totals(
        self, trip_id: UUID
    ) -> list[tuple[str, str, int]]:
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
        return [(r.category_code, r.label, r.total_cents) for r in result.fetchall()]

    async def trip_date_totals(self, trip_id: UUID):
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
        return [(r.expense_date, r.total_cents) for r in result.fetchall()]

    async def trip_member_attributed(
        self, trip_id: UUID
    ) -> list[tuple[UUID, str, int]]:
        result = await self._session.execute(
            text(
                """
                SELECT e.paid_by_user_id, u.display_name,
                       SUM(e.amount_cents) AS total_cents
                FROM expense e
                JOIN "user" u ON u.id = e.paid_by_user_id
                WHERE e.trip_id = :trip_id AND e.paid_by_user_id IS NOT NULL
                GROUP BY e.paid_by_user_id, u.display_name
                ORDER BY total_cents DESC
                """
            ),
            {"trip_id": trip_id},
        )
        return [
            (r.paid_by_user_id, r.display_name, r.total_cents)
            for r in result.fetchall()
        ]

    async def trip_common_total(self, trip_id: UUID) -> int:
        result = await self._session.execute(
            text(
                """
                SELECT COALESCE(SUM(e.amount_cents), 0) AS total_cents
                FROM expense e
                WHERE e.trip_id = :trip_id AND e.paid_by_user_id IS NULL
                """
            ),
            {"trip_id": trip_id},
        )
        row = result.fetchone()
        return row.total_cents if row else 0

    # ── Global (cross-trip) aggregates ───────────────────────────────

    _USER_TRIPS_CTE = """
        WITH user_trips AS (
            SELECT id AS trip_id FROM trip WHERE owner_id = :user_id
            UNION
            SELECT trip_id FROM trip_membership WHERE user_id = :user_id
        )
    """

    @staticmethod
    def _cat_filter(category_code: str | None) -> str:
        return "AND e.category_code = :category_code" if category_code else ""

    @staticmethod
    def _params(user_id: UUID, category_code: str | None) -> dict:
        params: dict = {"user_id": user_id}
        if category_code:
            params["category_code"] = category_code
        return params

    async def global_category_totals(
        self, user_id: UUID
    ) -> list[tuple[str, str, int]]:
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
        return [(r.category_code, r.label, r.total_cents) for r in result.fetchall()]

    async def global_total(self, user_id: UUID, category_code: str | None) -> int:
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + f"""
                SELECT COALESCE(SUM(e.amount_cents), 0) AS total_cents
                FROM expense e
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                {self._cat_filter(category_code)}
                """
            ),
            self._params(user_id, category_code),
        )
        row = result.fetchone()
        return row.total_cents if row else 0

    async def global_trip_totals(
        self, user_id: UUID, category_code: str | None
    ) -> list[tuple[UUID, str, int]]:
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + f"""
                SELECT t.id AS trip_id, t.name AS trip_name,
                       SUM(e.amount_cents) AS total_cents
                FROM expense e
                JOIN trip t ON t.id = e.trip_id
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                {self._cat_filter(category_code)}
                GROUP BY t.id, t.name
                ORDER BY total_cents DESC
                """
            ),
            self._params(user_id, category_code),
        )
        return [(r.trip_id, r.trip_name, r.total_cents) for r in result.fetchall()]

    async def global_month_totals(
        self, user_id: UUID, category_code: str | None
    ) -> list[tuple[str, int]]:
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + f"""
                SELECT TO_CHAR(e.expense_date, 'YYYY-MM') AS month,
                       SUM(e.amount_cents) AS total_cents
                FROM expense e
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                {self._cat_filter(category_code)}
                GROUP BY month
                ORDER BY month ASC
                """
            ),
            self._params(user_id, category_code),
        )
        return [(r.month, r.total_cents) for r in result.fetchall()]

    async def global_personal_attributed(
        self, user_id: UUID, category_code: str | None
    ) -> int:
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + f"""
                SELECT COALESCE(SUM(e.amount_cents), 0) AS total_cents
                FROM expense e
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                WHERE e.paid_by_user_id = :user_id
                {self._cat_filter(category_code)}
                """
            ),
            self._params(user_id, category_code),
        )
        row = result.fetchone()
        return row.total_cents if row else 0

    async def global_common_shares(
        self, user_id: UUID, category_code: str | None
    ) -> list[tuple[int, int]]:
        # Per trip the user belongs to: the common pot (filtered) and the
        # trip's member count (owner + collaborators).
        result = await self._session.execute(
            text(
                self._USER_TRIPS_CTE + f"""
                SELECT SUM(e.amount_cents) AS common_total,
                       1 + (
                           SELECT COUNT(*) FROM trip_membership m
                           WHERE m.trip_id = e.trip_id
                       ) AS member_count
                FROM expense e
                JOIN user_trips ut ON ut.trip_id = e.trip_id
                WHERE e.paid_by_user_id IS NULL
                {self._cat_filter(category_code)}
                GROUP BY e.trip_id
                """
            ),
            self._params(user_id, category_code),
        )
        return [(r.common_total, r.member_count) for r in result.fetchall()]
