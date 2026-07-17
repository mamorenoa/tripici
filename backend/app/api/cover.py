"""HTTP endpoint for trip cover images.

Proxies an external image provider so the API key stays server-side (it
would otherwise be inlined into the public web bundle) and so lookups can
be cached centrally.

Auth is required on purpose: without it this would be an open relay that
anyone could use to burn our provider quota.
"""

from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.auth import current_active_user
from app.core.config import settings
from app.domain.cover.entity import CoverImage
from app.domain.cover.service import CoverService
from app.domain.users.entity import User
from app.repositories.cover.unsplash_repository import UnsplashCoverRepository

router = APIRouter(prefix="/cover", tags=["cover"])


@lru_cache(maxsize=1)
def _build_cover_service() -> CoverService:
    return CoverService(
        provider=UnsplashCoverRepository(settings.unsplash_access_key)
    )


def get_cover_service() -> CoverService:
    """Wire the cover service with its provider.

    Deliberately a singleton: the service holds the response cache, so a
    fresh instance per request would defeat it. Tests override this
    dependency and therefore get their own isolated cache.
    """
    return _build_cover_service()


@router.get("", response_model=CoverImage | None)
async def get_cover(
    destination: Annotated[str, Query(min_length=1, max_length=200)],
    user: Annotated[User, Depends(current_active_user)],
    service: Annotated[CoverService, Depends(get_cover_service)],
) -> CoverImage | None:
    """Returns a cover image for the destination, or ``null`` if there is
    none (the app then renders its gradient fallback)."""
    return await service.get_cover_image(destination=destination)
