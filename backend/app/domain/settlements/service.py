"""Settlement use case ("who owes whom") for a trip.

Framework-agnostic. Reuses existing ports — no new SQL for the balance
math:
- ``StatsRepository.trip_member_attributed`` gives what each member paid
  in expenses (common expenses excluded — joint money creates no debt).
- ``MembershipRepository.list_members`` gives every member.
- ``SettlementRepository`` persists manual reimbursements between members.

Model (N current members):
- ``paid[m]``   = sum of expenses paid by m.
- ``T``         = Σ paid[m].
- ``share[m]``  = T / N (integer cents, remainder to the first members).
- A recorded payment D→C of X shifts balances: ``balance[D] += X`` and
  ``balance[C] -= X`` (D paid down their debt; C got reimbursed).
- ``balance[m] = paid[m] − share[m] + payments_made[m] − payments_received[m]``.

Authorization mirrors ``StatsService.get_trip_stats`` (404 for outsiders).
"""

from uuid import UUID, uuid4

from app.domain.memberships.ports import MembershipRepository
from app.domain.settlements.entity import (
    MemberBalance,
    PaymentRead,
    Settlement,
    SettlementPayment,
    SettlementPaymentCreate,
    TripSettlement,
)
from app.domain.settlements.exceptions import (
    SettlementPaymentInvalid,
    SettlementPaymentNotFound,
)
from app.domain.settlements.ports import SettlementRepository
from app.domain.stats.ports import StatsRepository
from app.domain.trips.exceptions import TripNotFound
from app.domain.trips.ports import TripRepository


class SettlementService:
    def __init__(
        self,
        stats_repo: StatsRepository,
        trip_repo: TripRepository,
        membership_repo: MembershipRepository,
        settlement_repo: SettlementRepository,
    ) -> None:
        self._stats = stats_repo
        self._trips = trip_repo
        self._memberships = membership_repo
        self._payments = settlement_repo

    async def _authorize(self, trip_id: UUID, user_id: UUID) -> None:
        trip = await self._trips.get_by_id(trip_id)
        if trip is None:
            raise TripNotFound(trip_id)
        if trip.owner_id != user_id:
            if not await self._memberships.exists(trip_id=trip_id, user_id=user_id):
                raise TripNotFound(trip_id)

    async def get_for_trip(
        self, *, trip_id: UUID, user_id: UUID
    ) -> TripSettlement:
        await self._authorize(trip_id, user_id)
        return await self._build(trip_id)

    async def record_payment(
        self, *, trip_id: UUID, user_id: UUID, payload: SettlementPaymentCreate
    ) -> SettlementPayment:
        await self._authorize(trip_id, user_id)

        members = await self._memberships.list_members(trip_id)
        member_ids = {m.user_id for m in members}
        if (
            payload.amount_cents <= 0
            or payload.from_user_id == payload.to_user_id
            or payload.from_user_id not in member_ids
            or payload.to_user_id not in member_ids
        ):
            raise SettlementPaymentInvalid()

        payment = SettlementPayment(
            id=uuid4(),
            trip_id=trip_id,
            from_user_id=payload.from_user_id,
            to_user_id=payload.to_user_id,
            amount_cents=payload.amount_cents,
            created_by_user_id=user_id,
        )
        return await self._payments.add(payment)

    async def delete_payment(
        self, *, trip_id: UUID, user_id: UUID, payment_id: UUID
    ) -> None:
        await self._authorize(trip_id, user_id)
        payment = await self._payments.get_by_id(payment_id)
        if payment is None or payment.trip_id != trip_id:
            raise SettlementPaymentNotFound(payment_id)
        await self._payments.delete(payment)

    # ── Internals ────────────────────────────────────────────────────

    async def _build(self, trip_id: UUID) -> TripSettlement:
        members = await self._memberships.list_members(trip_id)
        attributed = await self._stats.trip_member_attributed(trip_id)
        payments = await self._payments.list_for_trip(trip_id)
        names = {m.user_id: m.display_name for m in members}

        balances = self._compute_balances(members, attributed, payments)
        settlements = self._settle_up(balances)
        payment_reads = [
            PaymentRead(
                id=p.id,
                from_user_id=p.from_user_id,
                from_name=names.get(p.from_user_id, "—"),
                to_user_id=p.to_user_id,
                to_name=names.get(p.to_user_id, "—"),
                amount_cents=p.amount_cents,
            )
            for p in payments
        ]
        return TripSettlement(
            balances=balances,
            settlements=settlements,
            payments=payment_reads,
        )

    def _compute_balances(
        self,
        members,
        attributed: list[tuple[UUID, str, int]],
        payments: list[SettlementPayment],
    ) -> list[MemberBalance]:
        member_ids = {m.user_id for m in members}
        # Only amounts involving CURRENT members count (keeps Σ = 0).
        paid = {
            uid: total for uid, _name, total in attributed if uid in member_ids
        }
        n = len(members)
        if n == 0:
            return []

        total = sum(paid.values())
        base, remainder = divmod(total, n)

        # Fold recorded reimbursements: payer's balance up, payee's down.
        adjust: dict[UUID, int] = {}
        for p in payments:
            if p.from_user_id in member_ids and p.to_user_id in member_ids:
                adjust[p.from_user_id] = adjust.get(p.from_user_id, 0) + p.amount_cents
                adjust[p.to_user_id] = adjust.get(p.to_user_id, 0) - p.amount_cents

        out: list[MemberBalance] = []
        for i, m in enumerate(members):
            share = base + (1 if i < remainder else 0)
            balance = paid.get(m.user_id, 0) - share + adjust.get(m.user_id, 0)
            out.append(
                MemberBalance(
                    user_id=m.user_id,
                    display_name=m.display_name,
                    balance_cents=balance,
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
