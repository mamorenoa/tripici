"""Ports the plans domain depends on."""

from typing import Protocol
from uuid import UUID

from app.domain.plans.entity import Plan


class PlanRepository(Protocol):
    async def add(self, plan: Plan) -> Plan: ...

    async def get_by_id(self, plan_id: UUID) -> Plan | None: ...

    async def list_for_trip(self, trip_id: UUID) -> list[Plan]: ...

    async def update(self, plan: Plan) -> Plan: ...

    async def delete(self, plan: Plan) -> None: ...
