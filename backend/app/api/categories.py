"""HTTP endpoints for expense categories.

Categories are seed data — read-only from the API's perspective. The
list comes pre-populated from a migration; admins update it via DB
migrations, not the API.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.categories.entity import Category
from app.domain.users.entity import User

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[Category])
async def list_categories(
    session: Annotated[AsyncSession, Depends(get_session)],
    _user: Annotated[User, Depends(current_active_user)],
) -> list[Category]:
    result = await session.execute(select(Category).order_by(Category.label))
    return list(result.scalars().all())
