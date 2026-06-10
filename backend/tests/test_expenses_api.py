"""Happy-path tests for the expenses endpoints (full CRUD)."""

from uuid import UUID, uuid4

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.trips.entity import Trip
from app.domain.users.entity import User


async def _create_trip_via_api(client: AsyncClient, name: str = "Italy 2026") -> str:
    response = await client.post("/trips", json={"name": name})
    assert response.status_code == 201
    return response.json()["id"]


async def _insert_trip(
    session: AsyncSession, *, owner_id: UUID, name: str
) -> Trip:
    trip = Trip(name=name, owner_id=owner_id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


async def test_create_expense_returns_201_and_payload(
    authed_client: AsyncClient, test_user: User
) -> None:
    trip_id = await _create_trip_via_api(authed_client)

    response = await authed_client.post(
        f"/trips/{trip_id}/expenses",
        json={
            "amount_cents": 1250,
            "category_code": "RESTAURANTS",
            "expense_date": "2026-06-10",
            "description": "Pizza",
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["amount_cents"] == 1250
    assert body["category_code"] == "RESTAURANTS"
    assert body["expense_date"] == "2026-06-10"
    assert body["description"] == "Pizza"
    assert body["trip_id"] == trip_id
    assert body["created_by_user_id"] == str(test_user.id)
    UUID(body["id"])


async def test_list_expenses_is_empty_initially(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)

    response = await authed_client.get(f"/trips/{trip_id}/expenses")

    assert response.status_code == 200
    assert response.json() == []


async def test_create_then_list_returns_expenses_newest_date_first(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    await authed_client.post(
        f"/trips/{trip_id}/expenses",
        json={
            "amount_cents": 1000,
            "category_code": "FUEL",
            "expense_date": "2026-06-09",
        },
    )
    await authed_client.post(
        f"/trips/{trip_id}/expenses",
        json={
            "amount_cents": 2000,
            "category_code": "ACCOMMODATION",
            "expense_date": "2026-06-11",
        },
    )

    response = await authed_client.get(f"/trips/{trip_id}/expenses")

    assert response.status_code == 200
    dates = [e["expense_date"] for e in response.json()]
    assert dates == ["2026-06-11", "2026-06-09"]


async def test_update_expense_returns_updated_payload(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    created = (
        await authed_client.post(
            f"/trips/{trip_id}/expenses",
            json={
                "amount_cents": 1000,
                "category_code": "RESTAURANTS",
                "expense_date": "2026-06-10",
            },
        )
    ).json()

    response = await authed_client.patch(
        f"/trips/{trip_id}/expenses/{created['id']}",
        json={"amount_cents": 1500, "description": "Updated"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["amount_cents"] == 1500
    assert body["description"] == "Updated"
    # Other fields preserved.
    assert body["category_code"] == "RESTAURANTS"
    assert body["expense_date"] == "2026-06-10"


async def test_delete_expense_removes_it(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    created = (
        await authed_client.post(
            f"/trips/{trip_id}/expenses",
            json={
                "amount_cents": 1000,
                "category_code": "OTHER",
                "expense_date": "2026-06-10",
            },
        )
    ).json()

    response = await authed_client.delete(
        f"/trips/{trip_id}/expenses/{created['id']}"
    )
    assert response.status_code == 204

    list_response = await authed_client.get(f"/trips/{trip_id}/expenses")
    assert list_response.json() == []


async def test_create_expense_rejects_negative_amount(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)

    response = await authed_client.post(
        f"/trips/{trip_id}/expenses",
        json={
            "amount_cents": -100,
            "category_code": "OTHER",
            "expense_date": "2026-06-10",
        },
    )
    assert response.status_code == 422


async def test_other_users_trip_returns_404(
    authed_client: AsyncClient,
    session: AsyncSession,
    second_user: User,
) -> None:
    other_trip = await _insert_trip(
        session, owner_id=second_user.id, name="Not yours"
    )

    response = await authed_client.get(f"/trips/{other_trip.id}/expenses")
    assert response.status_code == 404

    response = await authed_client.post(
        f"/trips/{other_trip.id}/expenses",
        json={
            "amount_cents": 100,
            "category_code": "OTHER",
            "expense_date": "2026-06-10",
        },
    )
    assert response.status_code == 404


async def test_unknown_trip_returns_404(authed_client: AsyncClient) -> None:
    response = await authed_client.get(f"/trips/{uuid4()}/expenses")
    assert response.status_code == 404


async def test_collaborator_can_crud_expenses(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """A member (not the owner) has full CRUD on the trip's expenses."""
    from app.domain.memberships.entity import TripMembership

    trip = await _insert_trip(session, owner_id=test_user.id, name="Italy 2026")
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()

    as_user(second_user)
    # Create
    created = await client.post(
        f"/trips/{trip.id}/expenses",
        json={
            "amount_cents": 1500,
            "category_code": "RESTAURANTS",
            "expense_date": "2026-06-10",
        },
    )
    assert created.status_code == 201, created.text
    expense_id = created.json()["id"]

    # List + update + delete
    assert (await client.get(f"/trips/{trip.id}/expenses")).status_code == 200
    upd = await client.patch(
        f"/trips/{trip.id}/expenses/{expense_id}",
        json={"amount_cents": 2000},
    )
    assert upd.status_code == 200 and upd.json()["amount_cents"] == 2000
    delete = await client.delete(f"/trips/{trip.id}/expenses/{expense_id}")
    assert delete.status_code == 204
