"""Tests for the plans endpoints (CRUD + auth)."""

from uuid import UUID, uuid4

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.memberships.entity import TripMembership
from app.domain.trips.entity import Trip
from app.domain.users.entity import User


async def _create_trip_via_api(client: AsyncClient, name: str = "Italy 2026") -> str:
    response = await client.post("/trips", json={"name": name})
    assert response.status_code == 201
    return response.json()["id"]


async def _insert_trip(session: AsyncSession, *, owner_id: UUID, name: str) -> Trip:
    trip = Trip(name=name, owner_id=owner_id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


async def test_create_plan_returns_201_and_payload(
    authed_client: AsyncClient, test_user: User
) -> None:
    trip_id = await _create_trip_via_api(authed_client)

    response = await authed_client.post(
        f"/trips/{trip_id}/plans",
        json={
            "name": "Coliseo",
            "description": "Visita guiada al Coliseo y Foro",
            "start_date": "2026-06-10",
            "end_date": "2026-06-10",
            "duration": "3h",
            "cost_cents": 4500,
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["name"] == "Coliseo"
    assert body["description"] == "Visita guiada al Coliseo y Foro"
    assert body["start_date"] == "2026-06-10"
    assert body["duration"] == "3h"
    assert body["cost_cents"] == 4500
    assert body["trip_id"] == trip_id
    assert body["created_by_user_id"] == str(test_user.id)
    UUID(body["id"])


async def test_create_plan_only_mandatory_fields(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)

    response = await authed_client.post(
        f"/trips/{trip_id}/plans",
        json={"name": "Playa", "description": "Día de playa"},
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["start_date"] is None
    assert body["end_date"] is None
    assert body["duration"] is None
    assert body["cost_cents"] is None


async def test_create_plan_requires_name_and_description(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)

    # Missing description.
    r1 = await authed_client.post(f"/trips/{trip_id}/plans", json={"name": "X"})
    assert r1.status_code == 422
    # Empty name.
    r2 = await authed_client.post(
        f"/trips/{trip_id}/plans", json={"name": "", "description": "y"}
    )
    assert r2.status_code == 422


async def test_list_plans_empty_then_populated(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    assert (await authed_client.get(f"/trips/{trip_id}/plans")).json() == []

    await authed_client.post(
        f"/trips/{trip_id}/plans",
        json={"name": "A", "description": "aaa", "start_date": "2026-06-02"},
    )
    await authed_client.post(
        f"/trips/{trip_id}/plans",
        json={"name": "B", "description": "bbb", "start_date": "2026-06-01"},
    )

    plans = (await authed_client.get(f"/trips/{trip_id}/plans")).json()
    # Ordered by start_date ascending.
    assert [p["name"] for p in plans] == ["B", "A"]


async def test_update_plan(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    created = (
        await authed_client.post(
            f"/trips/{trip_id}/plans",
            json={"name": "Museo", "description": "desc", "cost_cents": 1000},
        )
    ).json()

    response = await authed_client.patch(
        f"/trips/{trip_id}/plans/{created['id']}",
        json={"name": "Museo del Prado", "cost_cents": 1500},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["name"] == "Museo del Prado"
    assert body["cost_cents"] == 1500
    assert body["description"] == "desc"  # untouched


async def test_delete_plan(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    created = (
        await authed_client.post(
            f"/trips/{trip_id}/plans",
            json={"name": "P", "description": "d"},
        )
    ).json()

    assert (
        await authed_client.delete(f"/trips/{trip_id}/plans/{created['id']}")
    ).status_code == 204
    assert (await authed_client.get(f"/trips/{trip_id}/plans")).json() == []


async def test_plans_other_users_trip_returns_404(
    authed_client: AsyncClient, session: AsyncSession, second_user: User
) -> None:
    other_trip = await _insert_trip(session, owner_id=second_user.id, name="Not yours")

    assert (
        await authed_client.get(f"/trips/{other_trip.id}/plans")
    ).status_code == 404
    assert (
        await authed_client.post(
            f"/trips/{other_trip.id}/plans",
            json={"name": "x", "description": "y"},
        )
    ).status_code == 404


async def test_unknown_plan_returns_404(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    response = await authed_client.patch(
        f"/trips/{trip_id}/plans/{uuid4()}", json={"name": "z"}
    )
    assert response.status_code == 404


async def test_collaborator_can_crud_plans(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    trip = await _insert_trip(session, owner_id=test_user.id, name="Italy 2026")
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()

    as_user(second_user)
    created = await client.post(
        f"/trips/{trip.id}/plans",
        json={"name": "Cena", "description": "Restaurante"},
    )
    assert created.status_code == 201, created.text
    plan_id = created.json()["id"]
    assert (await client.get(f"/trips/{trip.id}/plans")).status_code == 200
    assert (
        await client.delete(f"/trips/{trip.id}/plans/{plan_id}")
    ).status_code == 204
