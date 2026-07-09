"""Plan use cases.

Framework-agnostic. Enforces that only the trip's owner OR a
collaborator can read or write its plans — the same membership-aware
pattern as ``ExpenseService``.
"""

from datetime import datetime, timezone
from uuid import UUID

from app.domain.memberships.ports import MembershipRepository
from app.domain.plans.entity import Plan, PlanCreate, PlanUpdate
from app.domain.plans.ports import PlanRepository
from app.domain.trips.entity import Trip
from app.domain.trips.exceptions import TripNotFound
from app.domain.trips.ports import TripRepository


class PlanNotFound(Exception):
    """The plan id does not exist (or doesn't belong to the trip)."""

    def __init__(self, plan_id: UUID) -> None:
        super().__init__(f"Plan {plan_id} not found")
        self.plan_id = plan_id


class PlanService:
    def __init__(
        self,
        plan_repository: PlanRepository,
        trip_repository: TripRepository,
        membership_repository: MembershipRepository,
    ) -> None:
        self._plans = plan_repository
        self._trips = trip_repository
        self._memberships = membership_repository

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

    async def create(
        self, *, trip_id: UUID, user_id: UUID, payload: PlanCreate
    ) -> Plan:
        await self._authorize_trip(trip_id, user_id)
        plan = Plan(
            **payload.model_dump(),
            trip_id=trip_id,
            created_by_user_id=user_id,
        )
        return await self._plans.add(plan)

    async def list_for_trip(self, *, trip_id: UUID, user_id: UUID) -> list[Plan]:
        await self._authorize_trip(trip_id, user_id)
        return await self._plans.list_for_trip(trip_id)

    async def update(
        self, *, trip_id: UUID, plan_id: UUID, user_id: UUID, patch: PlanUpdate
    ) -> Plan:
        await self._authorize_trip(trip_id, user_id)
        plan = await self._plans.get_by_id(plan_id)
        if plan is None or plan.trip_id != trip_id:
            raise PlanNotFound(plan_id)
        for key, value in patch.model_dump(exclude_unset=True).items():
            setattr(plan, key, value)
        plan.updated_at = datetime.now(timezone.utc)
        return await self._plans.update(plan)

    async def delete(
        self, *, trip_id: UUID, plan_id: UUID, user_id: UUID
    ) -> None:
        await self._authorize_trip(trip_id, user_id)
        plan = await self._plans.get_by_id(plan_id)
        if plan is None or plan.trip_id != trip_id:
            raise PlanNotFound(plan_id)
        await self._plans.delete(plan)
