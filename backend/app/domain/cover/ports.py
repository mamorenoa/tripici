"""Ports (interfaces) the cover domain depends on.

Keeps the domain decoupled from any specific image source. The concrete
implementation lives in ``app.repositories.cover`` — swapping Unsplash for
another provider means writing a new class that matches this Protocol and
wiring it in ``app.api.cover``.
"""

from typing import Protocol

from app.domain.cover.entity import CoverImage


class CoverImageProvider(Protocol):
    async def get_cover_image(self, destination: str) -> CoverImage | None:
        """Resolve a cover image for a destination, or ``None`` when the
        provider has nothing suitable. Implementations must never raise —
        a failed lookup is a ``None``, not an error."""
        ...
