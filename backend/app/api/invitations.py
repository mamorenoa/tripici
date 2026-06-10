"""HTTP endpoints for trip invitations.

Owner-only:
  - POST   /trips/{trip_id}/invitations
  - GET    /trips/{trip_id}/invitations
  - DELETE /trips/{trip_id}/invitations/{invitation_id}

Any authenticated user:
  - GET  /invitations/preview/{token}
  - POST /invitations/accept

Both groups live in one router because they share the
``InvitationService`` and live in the same feature.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import current_active_user
from app.core.db import get_session
from app.domain.invitations.entity import (
    InvitationAcceptInput,
    InvitationPreview,
    InvitationRead,
)
from app.domain.invitations.service import InvitationService
from app.domain.trips.entity import Trip
from app.domain.users.entity import User
from app.repositories.invitations.sqlmodel_repository import (
    SQLModelInvitationRepository,
)
from app.repositories.memberships.sqlmodel_repository import (
    SQLModelMembershipRepository,
)
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository
from app.repositories.users.sqlalchemy_repository import SQLAlchemyUserReader

router = APIRouter(tags=["invitations"])


def get_invitation_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> InvitationService:
    return InvitationService(
        invitations=SQLModelInvitationRepository(session),
        memberships=SQLModelMembershipRepository(session),
        trips=SQLModelTripRepository(session),
        users=SQLAlchemyUserReader(session),
    )


@router.post(
    "/trips/{trip_id}/invitations",
    status_code=status.HTTP_201_CREATED,
    response_model=InvitationRead,
)
async def create_invitation(
    trip_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> InvitationRead:
    invitation = await service.create(trip_id=trip_id, owner_id=user.id)
    return InvitationRead.model_validate(invitation, from_attributes=True)


@router.get(
    "/trips/{trip_id}/invitations",
    response_model=list[InvitationRead],
)
async def list_invitations(
    trip_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> list[InvitationRead]:
    invitations = await service.list_active(trip_id=trip_id, owner_id=user.id)
    return [
        InvitationRead.model_validate(i, from_attributes=True)
        for i in invitations
    ]


@router.delete(
    "/trips/{trip_id}/invitations/{invitation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_invitation(
    trip_id: UUID,
    invitation_id: UUID,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> None:
    await service.revoke(
        trip_id=trip_id, invitation_id=invitation_id, owner_id=user.id
    )


@router.get(
    "/invitations/preview/{token}",
    response_model=InvitationPreview,
)
async def preview_invitation(
    token: str,
    _user: Annotated[User, Depends(current_active_user)],
    service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> InvitationPreview:
    return await service.preview(token)


@router.post("/invitations/accept", response_model=Trip)
async def accept_invitation(
    payload: InvitationAcceptInput,
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> Trip:
    return await service.accept(token=payload.token, user_id=user.id)
