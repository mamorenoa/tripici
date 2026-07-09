"""HTTP endpoints for plans inside a trip.

All endpoints require authentication. The ``PlanService`` enforces that
the trip belongs to the current user (owner or member) — view-layer code
does not duplicate that check.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.plans.entity import (
    PlanCreate,
    PlanLink,
    PlanLinkCreate,
    PlanRead,
    PlanUpdate,
)
from app.domain.plans.service import PlanService
from app.domain.users.entity import User
from app.repositories.expenses.sqlmodel_repository import SQLModelExpenseRepository
from app.repositories.memberships.sqlmodel_repository import (
    SQLModelMembershipRepository,
)
from app.repositories.plans.link_repository import SQLModelPlanLinkRepository
from app.repositories.plans.sqlmodel_repository import SQLModelPlanRepository
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository

router = APIRouter(prefix="/trips/{trip_id}/plans", tags=["plans"])


def get_plan_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlanService:
    """Wire the plans service with SQLModel-backed repositories."""
    return PlanService(
        plan_repository=SQLModelPlanRepository(session),
        trip_repository=SQLModelTripRepository(session),
        membership_repository=SQLModelMembershipRepository(session),
        expense_repository=SQLModelExpenseRepository(session),
        link_repository=SQLModelPlanLinkRepository(session),
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PlanRead)
async def create_plan(
    trip_id: UUID,
    payload: PlanCreate,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[PlanService, Depends(get_plan_service)],
) -> PlanRead:
    return await service.create(trip_id=trip_id, user_id=user.id, payload=payload)


@router.get("", response_model=list[PlanRead])
async def list_plans(
    trip_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[PlanService, Depends(get_plan_service)],
) -> list[PlanRead]:
    return await service.list_for_trip(trip_id=trip_id, user_id=user.id)


@router.patch("/{plan_id}", response_model=PlanRead)
async def update_plan(
    trip_id: UUID,
    plan_id: UUID,
    patch: PlanUpdate,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[PlanService, Depends(get_plan_service)],
) -> PlanRead:
    return await service.update(
        trip_id=trip_id, plan_id=plan_id, user_id=user.id, patch=patch
    )


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    trip_id: UUID,
    plan_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[PlanService, Depends(get_plan_service)],
) -> None:
    await service.delete(trip_id=trip_id, plan_id=plan_id, user_id=user.id)


# ── Documentation links ──────────────────────────────────────────────


@router.post(
    "/{plan_id}/links",
    status_code=status.HTTP_201_CREATED,
    response_model=PlanLink,
)
async def add_plan_link(
    trip_id: UUID,
    plan_id: UUID,
    payload: PlanLinkCreate,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[PlanService, Depends(get_plan_service)],
) -> PlanLink:
    return await service.add_link(
        trip_id=trip_id, plan_id=plan_id, user_id=user.id, payload=payload
    )


@router.delete(
    "/{plan_id}/links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_plan_link(
    trip_id: UUID,
    plan_id: UUID,
    link_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[PlanService, Depends(get_plan_service)],
) -> None:
    await service.delete_link(
        trip_id=trip_id, plan_id=plan_id, link_id=link_id, user_id=user.id
    )
