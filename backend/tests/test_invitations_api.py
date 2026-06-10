"""Tests for the invitation flow: create, preview, accept, revoke."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.invitations.entity import TripInvitation
from app.domain.trips.entity import Trip
from app.domain.users.entity import User


async def _create_trip(session: AsyncSession, *, owner_id, name="Italy 2026") -> Trip:
    trip = Trip(name=name, owner_id=owner_id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


async def test_owner_creates_invitation_returns_token_and_expiry(
    client: AsyncClient, session: AsyncSession, test_user: User, as_user
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(test_user)

    response = await client.post(f"/trips/{trip.id}/invitations")

    assert response.status_code == 201, response.text
    body = response.json()
    assert isinstance(body["token"], str) and len(body["token"]) > 10
    assert body["trip_id"] == str(trip.id)
    assert body["revoked_at"] is None
    assert datetime.fromisoformat(body["expires_at"]) > datetime.now(
        timezone.utc
    ).replace(tzinfo=None)


async def test_non_owner_cannot_create_invitation(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    # test_user owns the trip; second_user tries to invite for it.
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(second_user)

    response = await client.post(f"/trips/{trip.id}/invitations")

    assert response.status_code == 404


async def test_preview_invitation_returns_trip_info(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id, name="Greece 2026")
    as_user(test_user)
    create_resp = await client.post(f"/trips/{trip.id}/invitations")
    token = create_resp.json()["token"]

    as_user(second_user)
    preview = await client.get(f"/invitations/preview/{token}")

    assert preview.status_code == 200
    body = preview.json()
    assert body["trip_id"] == str(trip.id)
    assert body["trip_name"] == "Greece 2026"
    assert body["inviter_display_name"] == "Tester"


async def test_accept_invitation_grants_access(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(test_user)
    create_resp = await client.post(f"/trips/{trip.id}/invitations")
    token = create_resp.json()["token"]

    as_user(second_user)
    # Before accept, second_user cannot see the trip.
    deny = await client.get(f"/trips/{trip.id}")
    assert deny.status_code == 404

    accept_resp = await client.post(
        "/invitations/accept", json={"token": token}
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["id"] == str(trip.id)

    # Now second_user has access.
    allow = await client.get(f"/trips/{trip.id}")
    assert allow.status_code == 200


async def test_accept_idempotent_when_already_member(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(test_user)
    token = (await client.post(f"/trips/{trip.id}/invitations")).json()["token"]

    as_user(second_user)
    first = await client.post("/invitations/accept", json={"token": token})
    second = await client.post("/invitations/accept", json={"token": token})

    assert first.status_code == 200
    assert second.status_code == 200


async def test_accept_revoked_token_returns_404(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(test_user)
    created = (await client.post(f"/trips/{trip.id}/invitations")).json()
    token = created["token"]
    invite_id = created["id"]

    revoke = await client.delete(f"/trips/{trip.id}/invitations/{invite_id}")
    assert revoke.status_code == 204

    as_user(second_user)
    accept = await client.post("/invitations/accept", json={"token": token})
    assert accept.status_code == 404


async def test_accept_expired_token_returns_404(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    expired = TripInvitation(
        trip_id=trip.id,
        token="manually-expired-token",
        created_by_user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    session.add(expired)
    await session.commit()

    as_user(second_user)
    accept = await client.post(
        "/invitations/accept", json={"token": "manually-expired-token"}
    )
    assert accept.status_code == 404


async def test_accept_unknown_token_returns_404(
    client: AsyncClient, second_user: User, as_user
) -> None:
    as_user(second_user)
    accept = await client.post(
        "/invitations/accept", json={"token": "does-not-exist"}
    )
    assert accept.status_code == 404


async def test_owner_lists_active_invitations(
    client: AsyncClient, session: AsyncSession, test_user: User, as_user
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(test_user)
    await client.post(f"/trips/{trip.id}/invitations")
    await client.post(f"/trips/{trip.id}/invitations")

    listed = await client.get(f"/trips/{trip.id}/invitations")
    assert listed.status_code == 200
    assert len(listed.json()) == 2


async def test_revoked_invitation_disappears_from_list(
    client: AsyncClient, session: AsyncSession, test_user: User, as_user
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(test_user)
    created = (await client.post(f"/trips/{trip.id}/invitations")).json()
    invite_id = created["id"]

    await client.delete(f"/trips/{trip.id}/invitations/{invite_id}")
    listed = await client.get(f"/trips/{trip.id}/invitations")

    assert listed.json() == []


async def test_unknown_trip_invitations_returns_404(
    client: AsyncClient, test_user: User, as_user
) -> None:
    as_user(test_user)
    response = await client.post(f"/trips/{uuid4()}/invitations")
    assert response.status_code == 404
