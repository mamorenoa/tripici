"""Stats use cases.

Framework-agnostic. Authorization follows the same pattern as
``ExpenseService``: owner OR collaborator can read; 404 for everyone
else (no existence leak).

This service owns the business rules of statistics:
- percentages,
- and the split of "common" expenses across trip members. A common
  expense (``paid_by_user_id is None``) is shared equally by everyone
  in the trip, so in the per-member view each member is charged
  ``common_total ÷ member_count``. Integer cents are distributed
  exactly (the remainder goes to the first members), so the per-member
  totals still sum to the trip total.
"""

from uuid import UUID

from app.domain.memberships.ports import MembershipRepository
from app.domain.stats.entity import (
    CategoryStat,
    DateStat,
    GlobalStats,
    MemberStat,
    MonthStat,
    TripStat,
    TripStats,
)
from app.domain.stats.ports import StatsRepository
from app.domain.trips.exceptions import TripNotFound
from app.domain.trips.ports import TripRepository


def _pct(part: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round(part / total * 100, 1)


class StatsService:
    def __init__(
        self,
        stats_repo: StatsRepository,
        trip_repo: TripRepository,
        membership_repo: MembershipRepository,
    ) -> None:
        self._stats = stats_repo
        self._trips = trip_repo
        self._memberships = membership_repo

    # ── Per-trip ─────────────────────────────────────────────────────

    async def get_trip_stats(self, *, trip_id: UUID, user_id: UUID) -> TripStats:
        trip = await self._trips.get_by_id(trip_id)
        if trip is None:
            raise TripNotFound(trip_id)
        if trip.owner_id != user_id:
            if not await self._memberships.exists(trip_id=trip_id, user_id=user_id):
                raise TripNotFound(trip_id)

        category_rows = await self._stats.trip_category_totals(trip_id)
        date_rows = await self._stats.trip_date_totals(trip_id)
        attributed = await self._stats.trip_member_attributed(trip_id)
        common_total = await self._stats.trip_common_total(trip_id)
        members = await self._memberships.list_members(trip_id)

        total = sum(t for _, _, t in category_rows)

        return TripStats(
            total_cents=total,
            by_category=[
                CategoryStat(
                    category_code=code,
                    label=label,
                    total_cents=t,
                    pct=_pct(t, total),
                )
                for code, label, t in category_rows
            ],
            by_member=self._build_member_stats(
                members=members,
                attributed=attributed,
                common_total=common_total,
                trip_total=total,
            ),
            by_date=[DateStat(date=d, total_cents=t) for d, t in date_rows],
        )

    def _build_member_stats(
        self,
        *,
        members,
        attributed: list[tuple[UUID, str, int]],
        common_total: int,
        trip_total: int,
    ) -> list[MemberStat]:
        # name + running total per user. Seed with attributed expenses so
        # ex-members who still have expenses on record keep showing up.
        acc: dict[UUID, list] = {}
        for uid, name, amount in attributed:
            acc[uid] = [name, amount]

        # Split the common pot across CURRENT members only. Exact cents:
        # the first ``remainder`` members each get one extra cent.
        member_count = len(members)
        if member_count > 0 and common_total > 0:
            base, remainder = divmod(common_total, member_count)
            for i, m in enumerate(members):
                entry = acc.setdefault(m.user_id, [m.display_name, 0])
                entry[0] = m.display_name  # prefer the current display name
                entry[1] += base + (1 if i < remainder else 0)

        out = [
            MemberStat(
                user_id=uid,
                display_name=name,
                total_cents=amount,
                pct=_pct(amount, trip_total),
            )
            for uid, (name, amount) in acc.items()
            if amount != 0
        ]
        out.sort(key=lambda s: s.total_cents, reverse=True)
        return out

    # ── Global (cross-trip) ──────────────────────────────────────────

    async def get_global_stats(
        self, *, user_id: UUID, category_code: str | None = None
    ) -> GlobalStats:
        category_rows = await self._stats.global_category_totals(user_id)
        gross_total = sum(t for _, _, t in category_rows)

        total = await self._stats.global_total(user_id, category_code)
        trip_rows = await self._stats.global_trip_totals(user_id, category_code)
        month_rows = await self._stats.global_month_totals(user_id, category_code)

        attributed = await self._stats.global_personal_attributed(
            user_id, category_code
        )
        common_shares = await self._stats.global_common_shares(
            user_id, category_code
        )
        # Each trip's common pot divided by its member count, rounded to
        # the nearest cent. (A headline figure — exact per-cent fairness
        # only matters in the per-trip by_member view.)
        personal = attributed + sum(
            round(common_total / member_count)
            for common_total, member_count in common_shares
            if member_count > 0
        )

        return GlobalStats(
            total_cents=total,
            personal_total_cents=personal,
            by_category=[
                CategoryStat(
                    category_code=code,
                    label=label,
                    total_cents=t,
                    pct=_pct(t, gross_total),
                )
                for code, label, t in category_rows
            ],
            by_trip=[
                TripStat(
                    trip_id=tid,
                    trip_name=name,
                    total_cents=t,
                    days=days,
                    daily_cents=round(t / days) if days else t,
                )
                for tid, name, t, days in trip_rows
            ],
            by_month=[
                MonthStat(month=month, total_cents=t) for month, t in month_rows
            ],
        )
