"""Tests for the members endpoint."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.memberships.entity import TripMembership
from app.domain.trips.entity import Trip
from app.domain.users.entity import User


async def _create_trip(session, *, owner_id, name="Italy 2026") -> Trip:
    trip = Trip(name=name, owner_id=owner_id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


async def test_owner_sees_self_and_member(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()
    as_user(test_user)

    response = await client.get(f"/trips/{trip.id}/members")

    assert response.status_code == 200
    members = response.json()
    by_email = {m["email"]: m for m in members}
    assert by_email["tester@example.com"]["is_owner"] is True
    assert by_email["second@example.com"]["is_owner"] is False
    assert len(members) == 2


async def test_member_sees_all_members(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()
    as_user(second_user)

    response = await client.get(f"/trips/{trip.id}/members")

    assert response.status_code == 200
    assert len(response.json()) == 2


async def test_outsider_cannot_list_members(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    # second_user is NOT a member.
    as_user(second_user)

    response = await client.get(f"/trips/{trip.id}/members")
    assert response.status_code == 404


async def _add_member(session, *, trip_id, user_id) -> TripMembership:
    m = TripMembership(trip_id=trip_id, user_id=user_id)
    session.add(m)
    await session.commit()
    return m


async def test_owner_can_remove_member(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    await _add_member(session, trip_id=trip.id, user_id=second_user.id)
    as_user(test_user)

    response = await client.delete(f"/trips/{trip.id}/members/{second_user.id}")

    assert response.status_code == 204
    # Member should no longer appear in the list.
    list_resp = await client.get(f"/trips/{trip.id}/members")
    emails = [m["email"] for m in list_resp.json()]
    assert "second@example.com" not in emails


async def test_owner_cannot_remove_themselves(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(test_user)

    response = await client.delete(f"/trips/{trip.id}/members/{test_user.id}")

    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot remove the trip owner"


async def test_remove_non_existent_member_returns_404(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    # second_user never joined.
    as_user(test_user)

    response = await client.delete(f"/trips/{trip.id}/members/{second_user.id}")

    assert response.status_code == 404


async def test_non_owner_cannot_remove_member(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    await _add_member(session, trip_id=trip.id, user_id=second_user.id)
    # second_user tries to remove test_user (the owner).
    as_user(second_user)

    response = await client.delete(f"/trips/{trip.id}/members/{test_user.id}")

    # Non-owner gets 404 (no leak of existence).
    assert response.status_code == 404
