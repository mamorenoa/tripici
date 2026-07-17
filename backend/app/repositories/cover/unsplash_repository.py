"""Unsplash-backed implementation of ``CoverImageProvider``.

The only place that knows Unsplash exists. The access key stays here (on
the server, from a secret) — it never reaches the client bundle, which is
the whole point of proxying this through our API.
"""

import httpx

from app.domain.cover.entity import CoverImage

_SEARCH_URL = "https://api.unsplash.com/search/photos"
_TIMEOUT_SECONDS = 8.0
# Appended to Unsplash links per their API attribution guidelines.
_UTM = "utm_source=tripinci&utm_medium=referral"


class UnsplashCoverRepository:
    def __init__(self, access_key: str) -> None:
        self._access_key = access_key

    async def get_cover_image(self, destination: str) -> CoverImage | None:
        # No key configured (e.g. local dev without secrets): degrade to the
        # gradient cover rather than failing the request.
        if not self._access_key or not destination:
            return None

        headers = {
            "Authorization": f"Client-ID {self._access_key}",
            "Accept-Version": "v1",
        }
        params = {
            "query": destination,
            "per_page": 1,
            "orientation": "landscape",
            "content_filter": "high",
        }

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
                res = await client.get(_SEARCH_URL, params=params, headers=headers)
                if res.status_code != 200:
                    return None
                results = res.json().get("results") or []
                if not results:
                    return None

                photo = results[0]
                image_url = (photo.get("urls") or {}).get("regular")
                if not image_url:
                    return None

                # Unsplash asks apps to ping a photo's download endpoint when
                # the image is actually used. Best-effort: never fail on it.
                download_location = (photo.get("links") or {}).get(
                    "download_location"
                )
                if download_location:
                    try:
                        await client.get(download_location, headers=headers)
                    except httpx.HTTPError:
                        pass

                author = (photo.get("user") or {}).get("name")
                page = (photo.get("links") or {}).get("html")
                return CoverImage(
                    image_url=image_url,
                    attribution=f"{author} · Unsplash" if author else "Unsplash",
                    source_url=f"{page}?{_UTM}" if page else None,
                )
        except (httpx.HTTPError, ValueError, KeyError):
            # Network hiccup or unexpected payload — the UI falls back to
            # a gradient. Never surface this as a 5xx.
            return None
