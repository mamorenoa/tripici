"""Cover image use case.

Wraps the provider with a time-boxed memo. This is the main reason the
proxy exists besides hiding the API key: Unsplash's demo tier allows only
50 requests/hour, and a destination's photo does not change by the minute.
Without this, every cold page load would burn quota.

The cache lives on the instance, and the API layer keeps one instance
alive (see ``app.api.cover.get_cover_service``). That makes it a
per-process cache, which is enough at our scale: a single Fly machine and
a handful of distinct destinations. With several machines it degrades to
one cache each — still correct, just less effective. Move it to
Redis/Postgres then, not before.
"""

import time

from app.domain.cover.entity import CoverImage
from app.domain.cover.ports import CoverImageProvider

_DEFAULT_TTL_SECONDS = 24 * 60 * 60


class CoverService:
    def __init__(
        self,
        provider: CoverImageProvider,
        ttl_seconds: float = _DEFAULT_TTL_SECONDS,
    ) -> None:
        self._provider = provider
        self._ttl_seconds = ttl_seconds
        # destination (normalised) -> (result, expires_at). Negative results
        # are cached too, so junk destinations don't hammer the provider on
        # every page load.
        self._cache: dict[str, tuple[CoverImage | None, float]] = {}

    async def get_cover_image(self, *, destination: str) -> CoverImage | None:
        query = destination.strip()
        if not query:
            return None

        key = query.lower()
        now = time.monotonic()

        cached = self._cache.get(key)
        if cached is not None and cached[1] > now:
            return cached[0]

        image = await self._provider.get_cover_image(query)
        self._cache[key] = (image, now + self._ttl_seconds)
        return image
