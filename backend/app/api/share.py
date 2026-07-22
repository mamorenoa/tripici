"""PUBLIC link-preview metadata (Open Graph) for shared invitations.

Deliberately unauthenticated: the consumers are link crawlers (WhatsApp,
Gmail, Slack…) which cannot log in. The invite token is the secret — it is
unguessable, expires, and can be revoked, so exposure is bounded and
reversible. Only preview strings and a public image URL are returned; never
amounts, members or emails.

An invalid / expired / revoked token yields 404 (handled globally by the
``InvitationInvalid`` handler), so dead links get no preview.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.cover import get_cover_service
from app.core.db import get_session
from app.domain.cover.service import CoverService
from app.domain.invitations.service import InvitationService
from app.domain.share.entity import ShareMeta
from app.domain.share.service import ShareService
from app.repositories.invitations.sqlmodel_repository import (
    SQLModelInvitationRepository,
)
from app.repositories.memberships.sqlmodel_repository import (
    SQLModelMembershipRepository,
)
from app.repositories.trips.sqlmodel_repository import SQLModelTripRepository
from app.repositories.users.sqlalchemy_repository import SQLAlchemyUserReader

router = APIRouter(prefix="/share", tags=["share"])


def get_share_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    cover: Annotated[CoverService, Depends(get_cover_service)],
) -> ShareService:
    return ShareService(
        invitations=InvitationService(
            invitations=SQLModelInvitationRepository(session),
            memberships=SQLModelMembershipRepository(session),
            trips=SQLModelTripRepository(session),
            users=SQLAlchemyUserReader(session),
        ),
        trips=SQLModelTripRepository(session),
        cover=cover,
    )


@router.get("/invitations/{token}", response_model=ShareMeta)
async def invitation_share_meta(
    token: str,
    service: Annotated[ShareService, Depends(get_share_service)],
) -> ShareMeta:
    return await service.invitation_meta(token=token)
