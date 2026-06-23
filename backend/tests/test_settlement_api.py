"""Tests for the per-trip settlement endpoint (GET /trips/{id}/settlement)."""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.expenses.entity import Expense
from app.domain.memberships.entity import TripMembership
from app.domain.trips.entity import Trip
from app.domain.users.entity import User

_CREATOR = object()  # sentinel: attribute the expense to its creator


async def _create_trip(session: AsyncSession, *, owner_id, name="Trip") -> Trip:
    trip = Trip(name=name, owner_id=owner_id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


async def _add_member(session: AsyncSession, *, trip_id, user_id) -> None:
    session.add(TripMembership(trip_id=trip_id, user_id=user_id))
    await session.commit()


async def _make_user(session: AsyncSession, *, name: str) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"{name.lower()}@example.com",
        hashed_password="x",
        display_name=name,
        is_active=True,
        is_superuser=False,
        is_verified=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _add_expense(
    session: AsyncSession, *, trip_id, user_id, amount_cents, paid_by=_CREATOR
) -> None:
    session.add(
        Expense(
            trip_id=trip_id,
            created_by_user_id=user_id,
            amount_cents=amount_cents,
            category_code="OTHER",
            paid_by_user_id=user_id if paid_by is _CREATOR else paid_by,
        )
    )
    await session.commit()


async def test_settlement_basic_two_members(
    client: AsyncClient, session: AsyncSession, test_user, second_user, as_user
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    await _add_member(session, trip_id=trip.id, user_id=second_user.id)
    # Tester pays 100 €, split equally → Second owes 50 to Tester.
    await _add_expense(session, trip_id=trip.id, user_id=test_user.id, amount_cents=10000)
    as_user(test_user)

    data = (await client.get(f"/trips/{trip.id}/settlement")).json()

    bal = {b["display_name"]: b["balance_cents"] for b in data["balances"]}
    assert bal["Tester"] == 5000
    assert bal["Second"] == -5000
    assert data["settlements"] == [
        {
            "from_user_id": str(second_user.id),
            "from_name": "Second",
            "to_user_id": str(test_user.id),
            "to_name": "Tester",
            "amount_cents": 5000,
        }
    ]


async def test_settlement_three_members_multiple_payers(
    client: AsyncClient, session: AsyncSession, test_user, second_user, as_user
) -> None:
    third = await _make_user(session, name="Third")
    trip = await _create_trip(session, owner_id=test_user.id)
    await _add_member(session, trip_id=trip.id, user_id=second_user.id)
    await _add_member(session, trip_id=trip.id, user_id=third.id)
    # Only Tester pays (90 €). Each owes 30 → two transfers to Tester.
    await _add_expense(session, trip_id=trip.id, user_id=test_user.id, amount_cents=9000)
    as_user(test_user)

    data = (await client.get(f"/trips/{trip.id}/settlement")).json()

    bal = {b["display_name"]: b["balance_cents"] for b in data["balances"]}
    assert bal == {"Tester": 6000, "Second": -3000, "Third": -3000}
    assert sum(b["balance_cents"] for b in data["balances"]) == 0
    # At most N-1 = 2 transfers, all directed to Tester.
    assert len(data["settlements"]) == 2
    assert all(s["to_name"] == "Tester" for s in data["settlements"])
    assert sum(s["amount_cents"] for s in data["settlements"]) == 6000


async def test_settlement_cent_remainder_sums_to_zero(
    client: AsyncClient, session: AsyncSession, test_user, second_user, as_user
) -> None:
    third = await _make_user(session, name="Third")
    trip = await _create_trip(session, owner_id=test_user.id)
    await _add_member(session, trip_id=trip.id, user_id=second_user.id)
    await _add_member(session, trip_id=trip.id, user_id=third.id)
    # 101 cents over 3 members: shares 34/34/33 → no cents lost.
    await _add_expense(session, trip_id=trip.id, user_id=test_user.id, amount_cents=101)
    as_user(test_user)

    data = (await client.get(f"/trips/{trip.id}/settlement")).json()

    assert sum(b["balance_cents"] for b in data["balances"]) == 0
    assert sum(s["amount_cents"] for s in data["settlements"]) == 67  # the owed part


async def test_settlement_excludes_common_expenses(
    client: AsyncClient, session: AsyncSession, test_user, second_user, as_user
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    await _add_member(session, trip_id=trip.id, user_id=second_user.id)
    await _add_expense(session, trip_id=trip.id, user_id=test_user.id, amount_cents=5000)
    # A common expense (no payer) must NOT change the balances.
    await _add_expense(
        session, trip_id=trip.id, user_id=test_user.id, amount_cents=9999, paid_by=None
    )
    as_user(test_user)

    data = (await client.get(f"/trips/{trip.id}/settlement")).json()

    bal = {b["display_name"]: b["balance_cents"] for b in data["balances"]}
    assert bal == {"Tester": 2500, "Second": -2500}


async def test_settlement_all_common_is_settled(
    client: AsyncClient, session: AsyncSession, test_user, second_user, as_user
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    await _add_member(session, trip_id=trip.id, user_id=second_user.id)
    await _add_expense(
        session, trip_id=trip.id, user_id=test_user.id, amount_cents=8000, paid_by=None
    )
    as_user(test_user)

    data = (await client.get(f"/trips/{trip.id}/settlement")).json()

    assert all(b["balance_cents"] == 0 for b in data["balances"])
    assert data["settlements"] == []


async def test_settlement_404_for_non_member(
    client: AsyncClient, session: AsyncSession, test_user, second_user, as_user
) -> None:
    trip = await _create_trip(session, owner_id=test_user.id)
    as_user(second_user)

    response = await client.get(f"/trips/{trip.id}/settlement")

    assert response.status_code == 404
