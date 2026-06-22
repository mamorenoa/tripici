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


_CREATOR = object()  # sentinel: attribute the expense to its creator


async def _add_expense(
    session: AsyncSession,
    *,
    trip_id,
    user_id,
    amount_cents: int,
    category_code: str,
    expense_date: date | None = None,
    paid_by=_CREATOR,
) -> Expense:
    # By default the expense is attributed to its creator (mirrors the
    # migration backfill). Pass ``paid_by=None`` for a common expense or
    # an explicit user id to attribute it to someone else.
    expense = Expense(
        trip_id=trip_id,
        created_by_user_id=user_id,
        amount_cents=amount_cents,
        category_code=category_code,
        expense_date=expense_date or date(2026, 6, 1),
        paid_by_user_id=user_id if paid_by is _CREATOR else paid_by,
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


async def test_stats_common_expense_split_across_members(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """A common expense is divided equally among the trip's members in
    the per-member view; the trip total stays whole."""
    trip = await _create_trip(session, owner_id=test_user.id)
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()
    # 1000 attributed to the owner + 600 common (split 300/300).
    await _add_expense(
        session, trip_id=trip.id, user_id=test_user.id,
        amount_cents=1000, category_code="RESTAURANTS",
    )
    await _add_expense(
        session, trip_id=trip.id, user_id=test_user.id,
        amount_cents=600, category_code="OTHER", paid_by=None,
    )
    as_user(test_user)

    data = (await client.get(f"/trips/{trip.id}/stats")).json()

    assert data["total_cents"] == 1600
    by_member = {m["display_name"]: m["total_cents"] for m in data["by_member"]}
    assert by_member["Tester"] == 1300  # 1000 + 300
    assert by_member["Second"] == 300   # 0 + 300
    # The split keeps the per-member totals summing to the trip total.
    assert sum(by_member.values()) == 1600


async def test_stats_common_split_distributes_remainder_cents(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """An indivisible common pot still sums back to the total (no cents
    lost): 101 across 2 members → 51 + 50."""
    trip = await _create_trip(session, owner_id=test_user.id)
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()
    await _add_expense(
        session, trip_id=trip.id, user_id=test_user.id,
        amount_cents=101, category_code="OTHER", paid_by=None,
    )
    as_user(test_user)

    data = (await client.get(f"/trips/{trip.id}/stats")).json()

    totals = sorted(m["total_cents"] for m in data["by_member"])
    assert totals == [50, 51]
    assert sum(totals) == 101


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
