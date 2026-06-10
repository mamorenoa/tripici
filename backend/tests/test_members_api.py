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
