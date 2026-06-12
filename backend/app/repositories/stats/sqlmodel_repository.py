"""SQLAlchemy-backed implementation of ``StatsRepository``."""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.stats.entity import CategoryStat, DateStat, MemberStat, TripStats


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
