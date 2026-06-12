"""Tests for the trip stats endpoint."""

from datetime import date

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.expenses.entity import Expense
from app.domain.memberships.entity import TripMembership
from app.domain.trips.entity import Trip
from app.domain.users.entity import User


async def _create_trip(session: AsyncSession, *, owner_id, name="Italy 2026") -> Trip:
    trip = Trip(name=name, owner_id=owner_id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


async def _add_expense(
    session: AsyncSession,
    *,
    trip_id,
    user_id,
    amount_cents: int,
    category_code: str,
    expense_date: date | None = None,
) -> Expense:
    expense = Expense(
        trip_id=trip_id,
        created_by_user_id=user_id,
        amount_cents=amount_cents,
        category_code=category_code,
        expense_date=expense_date or date(2026, 6, 1),
    )
    session.add(expense)
    await session.commit()
    return expense


async def test_stats_returns_correct_totals(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    await _add_expense(
        session,
        trip_id=trip.id,
        user_id=test_user.id,
        amount_cents=5000,
        category_code="RESTAURANTS",
        expense_date=date(2026, 6, 1),
    )
    await _add_expense(
        session,
        trip_id=trip.id,
        user_id=second_user.id,
        amount_cents=3000,
        category_code="RESTAURANTS",
        expense_date=date(2026, 6, 2),
    )
    await _add_expense(
        session,
        trip_id=trip.id,
        user_id=test_user.id,
        amount_cents=2000,
        category_code="FUEL",
        expense_date=date(2026, 6, 1),
    )
    as_user(test_user)

    response = await client.get(f"/trips/{trip.id}/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["total_cents"] == 10000

    by_cat = {c["category_code"]: c for c in data["by_category"]}
    assert by_cat["RESTAURANTS"]["total_cents"] == 8000
    assert by_cat["RESTAURANTS"]["pct"] == 80.0
    assert by_cat["FUEL"]["total_cents"] == 2000
    assert by_cat["FUEL"]["pct"] == 20.0
    # ordered descending by total
    assert data["by_category"][0]["category_code"] == "RESTAURANTS"

    by_member = {m["display_name"]: m for m in data["by_member"]}
    assert by_member["Tester"]["total_cents"] == 7000
    assert by_member["Second"]["total_cents"] == 3000

    dates = {d["date"]: d["total_cents"] for d in data["by_date"]}
    assert dates["2026-06-01"] == 7000
    assert dates["2026-06-02"] == 3000


async def test_stats_empty_trip(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(test_user)

    response = await client.get(f"/trips/{trip.id}/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["total_cents"] == 0
    assert data["by_category"] == []
    assert data["by_member"] == []
    assert data["by_date"] == []


async def test_stats_404_for_non_member(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    # second_user is not a member
    as_user(second_user)

    response = await client.get(f"/trips/{trip.id}/stats")

    assert response.status_code == 404


async def test_stats_accessible_by_collaborator(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()
    await _add_expense(
        session,
        trip_id=trip.id,
        user_id=test_user.id,
        amount_cents=1000,
        category_code="OTHER",
    )
    as_user(second_user)

    response = await client.get(f"/trips/{trip.id}/stats")

    assert response.status_code == 200
    assert response.json()["total_cents"] == 1000
