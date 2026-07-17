"""Tests for the global stats endpoint (GET /stats)."""

from datetime import date

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.expenses.entity import Expense
from app.domain.memberships.entity import TripMembership
from app.domain.trips.entity import Trip
from app.domain.users.entity import User


async def _trip(session: AsyncSession, *, owner_id, name="Trip") -> Trip:
    t = Trip(name=name, owner_id=owner_id)
    session.add(t)
    await session.commit()
    await session.refresh(t)
    return t


_CREATOR = object()  # sentinel: attribute the expense to its creator


async def _expense(
    session: AsyncSession,
    *,
    trip_id,
    user_id,
    amount_cents: int,
    category_code: str,
    expense_date: date = date(2026, 6, 1),
    paid_by=_CREATOR,
) -> None:
    session.add(
        Expense(
            trip_id=trip_id,
            created_by_user_id=user_id,
            name="Test expense",
            amount_cents=amount_cents,
            category_code=category_code,
            expense_date=expense_date,
            paid_by_user_id=user_id if paid_by is _CREATOR else paid_by,
        )
    )
    await session.commit()


async def test_global_stats_totals(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    as_user,
) -> None:
    t1 = await _trip(session, owner_id=test_user.id, name="Italy")
    t2 = await _trip(session, owner_id=test_user.id, name="Spain")
    await _expense(session, trip_id=t1.id, user_id=test_user.id,
                   amount_cents=5000, category_code="RESTAURANTS")
    await _expense(session, trip_id=t2.id, user_id=test_user.id,
                   amount_cents=3000, category_code="FUEL")
    as_user(test_user)

    resp = await client.get("/stats")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_cents"] == 8000

    trip_names = {t["trip_name"]: t["total_cents"] for t in data["by_trip"]}
    assert trip_names["Italy"] == 5000
    assert trip_names["Spain"] == 3000

    cat_codes = {c["category_code"]: c["total_cents"] for c in data["by_category"]}
    assert cat_codes["RESTAURANTS"] == 5000
    assert cat_codes["FUEL"] == 3000


async def test_global_stats_filter_by_category(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    as_user,
) -> None:
    t1 = await _trip(session, owner_id=test_user.id, name="Italy")
    t2 = await _trip(session, owner_id=test_user.id, name="Spain")
    await _expense(session, trip_id=t1.id, user_id=test_user.id,
                   amount_cents=5000, category_code="RESTAURANTS")
    await _expense(session, trip_id=t1.id, user_id=test_user.id,
                   amount_cents=2000, category_code="FUEL")
    await _expense(session, trip_id=t2.id, user_id=test_user.id,
                   amount_cents=3000, category_code="RESTAURANTS")
    as_user(test_user)

    resp = await client.get("/stats?category_code=RESTAURANTS")

    assert resp.status_code == 200
    data = resp.json()
    # filtered total: only RESTAURANTS (5000 + 3000)
    assert data["total_cents"] == 8000

    # by_trip filtered: only RESTAURANTS expenses per trip
    trip_totals = {t["trip_name"]: t["total_cents"] for t in data["by_trip"]}
    assert trip_totals["Italy"] == 5000
    assert trip_totals["Spain"] == 3000

    # by_category is ALWAYS unfiltered (both categories appear)
    cat_codes = {c["category_code"] for c in data["by_category"]}
    assert "RESTAURANTS" in cat_codes
    assert "FUEL" in cat_codes


async def test_global_stats_excludes_other_users_trips(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    t_mine = await _trip(session, owner_id=test_user.id, name="Mine")
    t_other = await _trip(session, owner_id=second_user.id, name="Other's")
    await _expense(session, trip_id=t_mine.id, user_id=test_user.id,
                   amount_cents=1000, category_code="OTHER")
    await _expense(session, trip_id=t_other.id, user_id=second_user.id,
                   amount_cents=9999, category_code="OTHER")
    as_user(test_user)

    resp = await client.get("/stats")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_cents"] == 1000
    trip_names = [t["trip_name"] for t in data["by_trip"]]
    assert "Other's" not in trip_names


async def test_global_stats_includes_member_trips(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    shared_trip = await _trip(session, owner_id=second_user.id, name="Shared")
    session.add(TripMembership(trip_id=shared_trip.id, user_id=test_user.id))
    await session.commit()
    await _expense(session, trip_id=shared_trip.id, user_id=second_user.id,
                   amount_cents=4000, category_code="ACTIVITIES")
    as_user(test_user)

    resp = await client.get("/stats")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_cents"] == 4000
    assert any(t["trip_name"] == "Shared" for t in data["by_trip"])


async def test_global_personal_total_attributed_and_common(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """personal_total = expenses attributed to me + my share of each
    trip's common pot (common ÷ member count)."""
    trip = await _trip(session, owner_id=test_user.id, name="Italy")
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()
    # 1000 attributed to me, 500 attributed to second, 600 common.
    await _expense(session, trip_id=trip.id, user_id=test_user.id,
                   amount_cents=1000, category_code="RESTAURANTS")
    await _expense(session, trip_id=trip.id, user_id=second_user.id,
                   amount_cents=500, category_code="FUEL",
                   paid_by=second_user.id)
    await _expense(session, trip_id=trip.id, user_id=test_user.id,
                   amount_cents=600, category_code="OTHER", paid_by=None)
    as_user(test_user)

    data = (await client.get("/stats")).json()

    assert data["total_cents"] == 2100  # whole trip
    # my share: 1000 + 600/2 = 1300
    assert data["personal_total_cents"] == 1300


async def test_global_personal_total_honors_category_filter(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    as_user,
) -> None:
    trip = await _trip(session, owner_id=test_user.id, name="Italy")
    await _expense(session, trip_id=trip.id, user_id=test_user.id,
                   amount_cents=1000, category_code="RESTAURANTS")
    await _expense(session, trip_id=trip.id, user_id=test_user.id,
                   amount_cents=400, category_code="FUEL")
    as_user(test_user)

    data = (await client.get("/stats?category_code=RESTAURANTS")).json()

    assert data["total_cents"] == 1000
    assert data["personal_total_cents"] == 1000  # FUEL excluded


async def test_global_stats_by_trip_days_and_daily(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    as_user,
) -> None:
    """by_trip carries the trip span (days) and the rounded price/day."""
    trip = await _trip(session, owner_id=test_user.id, name="Italy")
    # 6000 over 3 days (1-jun..3-jun) → days=3, daily=2000.
    await _expense(session, trip_id=trip.id, user_id=test_user.id,
                   amount_cents=4000, category_code="RESTAURANTS",
                   expense_date=date(2026, 6, 1))
    await _expense(session, trip_id=trip.id, user_id=test_user.id,
                   amount_cents=2000, category_code="FUEL",
                   expense_date=date(2026, 6, 3))
    as_user(test_user)

    data = (await client.get("/stats")).json()

    italy = next(t for t in data["by_trip"] if t["trip_name"] == "Italy")
    assert italy["total_cents"] == 6000
    assert italy["days"] == 3
    assert italy["daily_cents"] == 2000


async def test_global_stats_empty(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    as_user,
) -> None:
    as_user(test_user)

    resp = await client.get("/stats")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_cents"] == 0
    assert data["personal_total_cents"] == 0
    assert data["by_category"] == []
    assert data["by_trip"] == []
    assert data["by_month"] == []
