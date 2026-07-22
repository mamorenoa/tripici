"""Tests for the PUBLIC link-preview (Open Graph) metadata endpoint.

The cover provider is stubbed so these stay offline; what matters here is
that the endpoint needs no auth, exposes only preview strings, and gives
nothing away for dead tokens.
"""

from datetime import date, datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.cover import get_cover_service
from app.domain.cover.entity import CoverImage
from app.domain.cover.service import CoverService
from app.domain.invitations.entity import TripInvitation
from app.domain.trips.entity import Trip
from app.domain.users.entity import User
from app.main import app


class _StubProvider:
    def __init__(self, image: CoverImage | None) -> None:
        self.image = image
        self.calls: list[str] = []

    async def get_cover_image(self, destination: str) -> CoverImage | None:
        self.calls.append(destination)
        return self.image


def _use_cover(provider: _StubProvider) -> None:
    service = CoverService(provider=provider)
    app.dependency_overrides[get_cover_service] = lambda: service


async def _invite(
    session: AsyncSession, *, owner: User, name: str, token: str, **trip_kwargs
) -> None:
    trip = Trip(name=name, owner_id=owner.id, **trip_kwargs)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    session.add(
        TripInvitation(
            trip_id=trip.id,
            token=token,
            created_by_user_id=owner.id,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None)
            + timedelta(days=7),
        )
    )
    await session.commit()


async def test_share_meta_is_public_and_describes_the_trip(
    client: AsyncClient, session: AsyncSession, test_user: User
) -> None:
    """No auth: link crawlers cannot log in."""
    # The real provider already ships sizing params — ours must replace
    # them, not pile up a second copy of each key.
    provider = _StubProvider(
        CoverImage(image_url="https://img.example/rome.jpg?w=1080&fit=max&q=80")
    )
    _use_cover(provider)
    try:
        await _invite(
            session,
            owner=test_user,
            name="Roma en julio",
            token="tok-public",
            start_date=date(2026, 7, 10),
            end_date=date(2026, 7, 18),
        )

        # `client` (not `authed_client`) — deliberately unauthenticated.
        response = await client.get("/share/invitations/tok-public")

        assert response.status_code == 200, response.text
        body = response.json()
        assert "Roma en julio" in body["title"]
        assert test_user.display_name in body["title"]
        assert "julio" in body["description"]
        assert body["image_url"].startswith("https://img.example/rome.jpg")
        # Sized for Open Graph, exactly once per key, keeping the rest.
        query = parse_qs(urlsplit(body["image_url"]).query)
        assert query["w"] == ["1200"]
        assert query["h"] == ["630"]
        assert query["fit"] == ["crop"]
        assert query["q"] == ["80"]
        # The image is looked up by the *derived* destination, matching what
        # the app's cover shows.
        assert provider.calls == ["Roma"]
    finally:
        app.dependency_overrides.pop(get_cover_service, None)


async def test_share_meta_without_cover_returns_null_image(
    client: AsyncClient, session: AsyncSession, test_user: User
) -> None:
    _use_cover(_StubProvider(None))
    try:
        await _invite(session, owner=test_user, name="Test Trip", token="tok-nocover")

        response = await client.get("/share/invitations/tok-nocover")

        assert response.status_code == 200
        assert response.json()["image_url"] is None
    finally:
        app.dependency_overrides.pop(get_cover_service, None)


async def test_share_meta_unknown_token_returns_404(client: AsyncClient) -> None:
    """A dead link must not preview — and must not hint at anything."""
    response = await client.get("/share/invitations/does-not-exist")
    assert response.status_code == 404


async def test_share_meta_expired_token_returns_404(
    client: AsyncClient, session: AsyncSession, test_user: User
) -> None:
    trip = Trip(name="Expired", owner_id=test_user.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    session.add(
        TripInvitation(
            trip_id=trip.id,
            token="tok-expired",
            created_by_user_id=test_user.id,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None)
            - timedelta(days=1),
        )
    )
    await session.commit()

    response = await client.get("/share/invitations/tok-expired")
    assert response.status_code == 404


async def test_share_meta_leaks_no_sensitive_fields(
    client: AsyncClient, session: AsyncSession, test_user: User
) -> None:
    """Only preview strings — no ids, emails, amounts or member data."""
    _use_cover(_StubProvider(None))
    try:
        await _invite(session, owner=test_user, name="Privado", token="tok-fields")

        body = (await client.get("/share/invitations/tok-fields")).json()

        assert set(body.keys()) == {"title", "description", "image_url"}
        assert test_user.email not in str(body)
    finally:
        app.dependency_overrides.pop(get_cover_service, None)
