"""Plan use cases.

Framework-agnostic. Enforces that only the trip's owner OR a
collaborator can read or write its plans — the same membership-aware
pattern as ``ExpenseService``.

A plan can optionally mirror its cost into a trip expense
(``count_as_expense``). ``PlanService`` is the sole owner of that
derived expense: it creates/updates/deletes it to match the plan. The
mirror is booked as a **common** expense (``paid_by_user_id = None``)
under ``expense_category_code``, and linked via ``expense.plan_id``.

Plans also carry documentation links (``PlanLink``) — external URLs
(Google Drive, maps, booking confirmations...). Reads return
``PlanRead`` with the links embedded.
"""

from datetime import datetime, timezone
from uuid import UUID

from app.domain.expenses.entity import Expense
from app.domain.expenses.ports import ExpenseRepository
from app.domain.memberships.ports import MembershipRepository
from app.domain.plans.entity import (
    Plan,
    PlanCreate,
    PlanLink,
    PlanLinkCreate,
    PlanRead,
    PlanUpdate,
)
from app.domain.plans.ports import PlanLinkRepository, PlanRepository
from app.domain.trips.entity import Trip
from app.domain.trips.exceptions import TripNotFound
from app.domain.trips.ports import TripRepository


class PlanNotFound(Exception):
    """The plan id does not exist (or doesn't belong to the trip)."""

    def __init__(self, plan_id: UUID) -> None:
        super().__init__(f"Plan {plan_id} not found")
        self.plan_id = plan_id


class PlanLinkNotFound(Exception):
    """The link id does not exist (or doesn't belong to the plan)."""

    def __init__(self, link_id: UUID) -> None:
        super().__init__(f"Plan link {link_id} not found")
        self.link_id = link_id


class PlanService:
    def __init__(
        self,
        plan_repository: PlanRepository,
        trip_repository: TripRepository,
        membership_repository: MembershipRepository,
        expense_repository: ExpenseRepository,
        link_repository: PlanLinkRepository,
    ) -> None:
        self._plans = plan_repository
        self._trips = trip_repository
        self._memberships = membership_repository
        self._expenses = expense_repository
        self._links = link_repository

    async def _authorize_trip(self, trip_id: UUID, user_id: UUID) -> Trip:
        # 404 for "not exists" and for "you're neither owner nor member".
        trip = await self._trips.get_by_id(trip_id)
        if trip is None:
            raise TripNotFound(trip_id)
        if trip.owner_id == user_id:
            return trip
        if await self._memberships.exists(trip_id=trip_id, user_id=user_id):
            return trip
        raise TripNotFound(trip_id)

    @staticmethod
    def _to_read(plan: Plan, links: list[PlanLink]) -> PlanRead:
        return PlanRead(**plan.model_dump(), links=links)

    async def _links_for_plan(self, plan: Plan) -> list[PlanLink]:
        return [
            link
            for link in await self._links.list_for_trip(plan.trip_id)
            if link.plan_id == plan.id
        ]

    # ── Plan CRUD ────────────────────────────────────────────────────

    async def create(
        self, *, trip_id: UUID, user_id: UUID, payload: PlanCreate
    ) -> PlanRead:
        await self._authorize_trip(trip_id, user_id)
        plan = Plan(
            **payload.model_dump(),
            trip_id=trip_id,
            created_by_user_id=user_id,
        )
        plan = await self._plans.add(plan)
        await self._reconcile_expense(plan, user_id)
        return self._to_read(plan, [])

    async def list_for_trip(
        self, *, trip_id: UUID, user_id: UUID
    ) -> list[PlanRead]:
        await self._authorize_trip(trip_id, user_id)
        plans = await self._plans.list_for_trip(trip_id)
        links = await self._links.list_for_trip(trip_id)
        by_plan: dict[UUID, list[PlanLink]] = {}
        for link in links:
            by_plan.setdefault(link.plan_id, []).append(link)
        return [self._to_read(p, by_plan.get(p.id, [])) for p in plans]

    async def update(
        self, *, trip_id: UUID, plan_id: UUID, user_id: UUID, patch: PlanUpdate
    ) -> PlanRead:
        await self._authorize_trip(trip_id, user_id)
        plan = await self._plans.get_by_id(plan_id)
        if plan is None or plan.trip_id != trip_id:
            raise PlanNotFound(plan_id)
        for key, value in patch.model_dump(exclude_unset=True).items():
            setattr(plan, key, value)
        plan.updated_at = datetime.now(timezone.utc)
        plan = await self._plans.update(plan)
        await self._reconcile_expense(plan, user_id)
        return self._to_read(plan, await self._links_for_plan(plan))

    async def delete(
        self, *, trip_id: UUID, plan_id: UUID, user_id: UUID
    ) -> None:
        await self._authorize_trip(trip_id, user_id)
        plan = await self._plans.get_by_id(plan_id)
        if plan is None or plan.trip_id != trip_id:
            raise PlanNotFound(plan_id)
        # Remove children first (explicit, so it works whether or not the
        # DB has ON DELETE CASCADE).
        linked = await self._expenses.get_by_plan_id(plan.id)
        if linked is not None:
            await self._expenses.delete(linked)
        await self._links.delete_for_plan(plan.id)
        await self._plans.delete(plan)

    # ── Documentation links ──────────────────────────────────────────

    async def add_link(
        self, *, trip_id: UUID, plan_id: UUID, user_id: UUID, payload: PlanLinkCreate
    ) -> PlanLink:
        await self._authorize_trip(trip_id, user_id)
        plan = await self._plans.get_by_id(plan_id)
        if plan is None or plan.trip_id != trip_id:
            raise PlanNotFound(plan_id)
        link = PlanLink(plan_id=plan_id, url=payload.url, label=payload.label)
        return await self._links.add(link)

    async def delete_link(
        self, *, trip_id: UUID, plan_id: UUID, link_id: UUID, user_id: UUID
    ) -> None:
        await self._authorize_trip(trip_id, user_id)
        plan = await self._plans.get_by_id(plan_id)
        if plan is None or plan.trip_id != trip_id:
            raise PlanNotFound(plan_id)
        link = await self._links.get_by_id(link_id)
        if link is None or link.plan_id != plan_id:
            raise PlanLinkNotFound(link_id)
        await self._links.delete(link)

    # ── Derived expense ──────────────────────────────────────────────

    async def _reconcile_expense(self, plan: Plan, user_id: UUID) -> None:
        """Make the derived expense match the plan's intent."""
        existing = await self._expenses.get_by_plan_id(plan.id)
        desired = (
            plan.count_as_expense
            and plan.cost_cents is not None
            and plan.expense_category_code is not None
        )
        if not desired:
            if existing is not None:
                await self._expenses.delete(existing)
            return

        expense_date = plan.start_date or datetime.now(timezone.utc).date()
        if existing is None:
            await self._expenses.add(
                Expense(
                    trip_id=plan.trip_id,
                    created_by_user_id=user_id,
                    paid_by_user_id=None,  # common
                    name=plan.name,
                    amount_cents=plan.cost_cents,
                    category_code=plan.expense_category_code,
                    expense_date=expense_date,
                    plan_id=plan.id,
                )
            )
        else:
            existing.name = plan.name
            existing.amount_cents = plan.cost_cents
            existing.category_code = plan.expense_category_code
            existing.expense_date = expense_date
            existing.updated_at = datetime.now(timezone.utc)
            await self._expenses.update(existing)
