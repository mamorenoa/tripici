"""Tests for the cover-image proxy endpoint.

The external provider is never called for real: we override the service
dependency with a stub, so these tests stay offline and deterministic.
"""

from httpx import AsyncClient

from app.api.cover import get_cover_service
from app.domain.cover.entity import CoverImage
from app.domain.cover.service import CoverService
from app.main import app


class _StubProvider:
    """Records the destination it was asked for and returns a fixed image."""

    def __init__(self, image: CoverImage | None) -> None:
        self.image = image
        self.calls: list[str] = []

    async def get_cover_image(self, destination: str) -> CoverImage | None:
        self.calls.append(destination)
        return self.image


def _use_provider(provider: _StubProvider) -> None:
    # One service instance for the whole test, mirroring the singleton the
    # app wires in production — otherwise each request would get a fresh
    # cache and we'd never exercise the caching path.
    service = CoverService(provider=provider)
    app.dependency_overrides[get_cover_service] = lambda: service


async def test_cover_returns_provider_image(authed_client: AsyncClient) -> None:
    provider = _StubProvider(
        CoverImage(
            image_url="https://images.example/rome.jpg",
            attribution="Ada · Unsplash",
            source_url="https://unsplash.example/photo",
        )
    )
    _use_provider(provider)
    try:
        response = await authed_client.get("/cover", params={"destination": "Roma"})

        assert response.status_code == 200
        body = response.json()
        assert body["image_url"] == "https://images.example/rome.jpg"
        assert body["attribution"] == "Ada · Unsplash"
        assert provider.calls == ["Roma"]
    finally:
        app.dependency_overrides.pop(get_cover_service, None)


async def test_cover_returns_null_when_provider_has_nothing(
    authed_client: AsyncClient,
) -> None:
    """No image is a normal outcome (the app draws a gradient), not an error."""
    _use_provider(_StubProvider(None))
    try:
        response = await authed_client.get(
            "/cover", params={"destination": "Nowhere at all zzz"}
        )

        assert response.status_code == 200
        assert response.json() is None
    finally:
        app.dependency_overrides.pop(get_cover_service, None)


async def test_cover_caches_so_provider_is_hit_once(
    authed_client: AsyncClient,
) -> None:
    """The whole point of the proxy: repeated views must not burn quota."""
    provider = _StubProvider(CoverImage(image_url="https://images.example/a.jpg"))
    _use_provider(provider)
    try:
        for _ in range(3):
            await authed_client.get("/cover", params={"destination": "Roma"})
        # Case/whitespace differences must hit the same cache entry.
        await authed_client.get("/cover", params={"destination": "  roma "})

        assert provider.calls == ["Roma"]
    finally:
        app.dependency_overrides.pop(get_cover_service, None)


async def test_cover_requires_authentication(client: AsyncClient) -> None:
    """Otherwise this is an open relay for our provider quota."""
    response = await client.get("/cover", params={"destination": "Roma"})
    assert response.status_code == 401


async def test_cover_rejects_empty_destination(authed_client: AsyncClient) -> None:
    response = await authed_client.get("/cover", params={"destination": ""})
    assert response.status_code == 422
