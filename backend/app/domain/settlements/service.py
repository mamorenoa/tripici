"""Settlement use case ("who owes whom") for a trip.

Framework-agnostic. Reuses existing ports — no new SQL:
- ``StatsRepository.trip_member_attributed`` gives what each member paid
  (expenses with a concrete ``paid_by_user_id``; common expenses are
  excluded, which is correct: joint money creates no inter-member debt).
- ``MembershipRepository.list_members`` gives every member (incl. those
  who paid nothing).

Model (N current members):
- ``paid[m]``   = sum of expenses paid by m.
- ``T``         = Σ paid[m].
- ``share[m]``  = T / N, integer cents with the remainder handed to the
  first members so balances sum to exactly zero.
- ``balance[m] = paid[m] − share[m]``  (>0 owed money, <0 owes money).

Authorization mirrors ``StatsService.get_trip_stats`` (404 for outsiders).
"""

from uuid import UUID

from app.domain.memberships.ports import MembershipRepository
from app.domain.settlements.entity import (
    MemberBalance,
    Settlement,
    TripSettlement,
)
from app.domain.stats.ports import StatsRepository
from app.domain.trips.exceptions import TripNotFound
from app.domain.trips.ports import TripRepository


class SettlementService:
    def __init__(
        self,
        stats_repo: StatsRepository,
        trip_repo: TripRepository,
        membership_repo: MembershipRepository,
    ) -> None:
        self._stats = stats_repo
        self._trips = trip_repo
        self._memberships = membership_repo

    async def get_for_trip(
        self, *, trip_id: UUID, user_id: UUID
    ) -> TripSettlement:
        trip = await self._trips.get_by_id(trip_id)
        if trip is None:
            raise TripNotFound(trip_id)
        if trip.owner_id != user_id:
            if not await self._memberships.exists(trip_id=trip_id, user_id=user_id):
                raise TripNotFound(trip_id)

        members = await self._memberships.list_members(trip_id)
        attributed = await self._stats.trip_member_attributed(trip_id)

        balances = self._compute_balances(members, attributed)
        settlements = self._settle_up(balances)
        return TripSettlement(balances=balances, settlements=settlements)

    def _compute_balances(
        self, members, attributed: list[tuple[UUID, str, int]]
    ) -> list[MemberBalance]:
        member_ids = {m.user_id for m in members}
        # Only payments from CURRENT members count (keeps the split exact).
        paid = {
            uid: total for uid, _name, total in attributed if uid in member_ids
        }
        n = len(members)
        if n == 0:
            return []

        total = sum(paid.values())
        base, remainder = divmod(total, n)

        out: list[MemberBalance] = []
        for i, m in enumerate(members):
            share = base + (1 if i < remainder else 0)
            out.append(
                MemberBalance(
                    user_id=m.user_id,
                    display_name=m.display_name,
                    balance_cents=paid.get(m.user_id, 0) - share,
                )
            )
        return out

    def _settle_up(self, balances: list[MemberBalance]) -> list[Settlement]:
        # Greedy: match the biggest debtor with the biggest creditor until
        # everyone is square. Produces at most N-1 transfers.
        creditors = sorted(
            (b for b in balances if b.balance_cents > 0),
            key=lambda b: b.balance_cents,
            reverse=True,
        )
        debtors = sorted(
            (b for b in balances if b.balance_cents < 0),
            key=lambda b: b.balance_cents,  # most negative first
        )

        # Work on mutable copies of the amounts.
        cred = [[b, b.balance_cents] for b in creditors]
        debt = [[b, -b.balance_cents] for b in debtors]

        settlements: list[Settlement] = []
        i = j = 0
        while i < len(debt) and j < len(cred):
            debtor, owed = debt[i]
            creditor, due = cred[j]
            pay = min(owed, due)
            if pay > 0:
                settlements.append(
                    Settlement(
                        from_user_id=debtor.user_id,
                        from_name=debtor.display_name,
                        to_user_id=creditor.user_id,
                        to_name=creditor.display_name,
                        amount_cents=pay,
                    )
                )
            debt[i][1] -= pay
            cred[j][1] -= pay
            if debt[i][1] == 0:
                i += 1
            if cred[j][1] == 0:
                j += 1
        return settlements
