"""HTTP endpoints for expenses inside a trip.

All endpoints require authentication. The ``ExpenseService`` enforces
that the trip belongs to the current user — view-layer code does not
duplicate that check.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.expenses.entity import Expense, ExpenseCreate, ExpenseUpdate
from app.domain.expenses.service import ExpenseService
from app.domain.users.entity import User
from app.repositories.expenses.sqlmodel_repository import SQLModelExpenseRepository
from app.repositories.memberships.sqlmodel_repository import (
    SQLModelMembershipRepository,
)
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository

router = APIRouter(prefix="/trips/{trip_id}/expenses", tags=["expenses"])


def get_expense_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ExpenseService:
    """Wire the expenses service with SQLModel-backed repositories."""
    return ExpenseService(
        expense_repository=SQLModelExpenseRepository(session),
        trip_repository=SQLModelTripRepository(session),
        membership_repository=SQLModelMembershipRepository(session),
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Expense)
async def create_expense(
    trip_id: UUID,
    payload: ExpenseCreate,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[ExpenseService, Depends(get_expense_service)],
) -> Expense:
    return await service.create(trip_id=trip_id, user_id=user.id, payload=payload)


@router.get("", response_model=list[Expense])
async def list_expenses(
    trip_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[ExpenseService, Depends(get_expense_service)],
) -> list[Expense]:
    return await service.list_for_trip(trip_id=trip_id, user_id=user.id)


@router.patch("/{expense_id}", response_model=Expense)
async def update_expense(
    trip_id: UUID,
    expense_id: UUID,
    patch: ExpenseUpdate,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[ExpenseService, Depends(get_expense_service)],
) -> Expense:
    return await service.update(
        trip_id=trip_id,
        expense_id=expense_id,
        user_id=user.id,
        patch=patch,
    )


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    trip_id: UUID,
    expense_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[ExpenseService, Depends(get_expense_service)],
) -> None:
    await service.delete(trip_id=trip_id, expense_id=expense_id, user_id=user.id)
