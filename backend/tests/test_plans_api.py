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


async def _list_expenses(client: AsyncClient, trip_id: str) -> list[dict]:
    resp = await client.get(f"/trips/{trip_id}/expenses")
    assert resp.status_code == 200
    return resp.json()


async def test_plan_cost_mirrors_into_common_expense(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)

    plan = (
        await authed_client.post(
            f"/trips/{trip_id}/plans",
            json={
                "name": "Teleférico",
                "description": "Subida al pico",
                "start_date": "2026-06-12",
                "cost_cents": 3000,
                "count_as_expense": True,
                "expense_category_code": "ACTIVITIES",
            },
        )
    ).json()

    expenses = await _list_expenses(authed_client, trip_id)
    assert len(expenses) == 1
    e = expenses[0]
    assert e["amount_cents"] == 3000
    assert e["category_code"] == "ACTIVITIES"
    assert e["paid_by_user_id"] is None  # common
    assert e["expense_date"] == "2026-06-12"
    assert e["description"] == "Teleférico"
    assert e["plan_id"] == plan["id"]


async def test_plan_without_cost_does_not_create_expense(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    await authed_client.post(
        f"/trips/{trip_id}/plans",
        json={
            "name": "Idea",
            "description": "Sin coste",
            "count_as_expense": True,
            "expense_category_code": "ACTIVITIES",
        },
    )
    assert await _list_expenses(authed_client, trip_id) == []


async def test_updating_plan_cost_syncs_expense(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    plan = (
        await authed_client.post(
            f"/trips/{trip_id}/plans",
            json={
                "name": "Cena",
                "description": "Restaurante",
                "cost_cents": 4000,
                "count_as_expense": True,
                "expense_category_code": "RESTAURANTS",
            },
        )
    ).json()

    await authed_client.patch(
        f"/trips/{trip_id}/plans/{plan['id']}", json={"cost_cents": 5500}
    )

    expenses = await _list_expenses(authed_client, trip_id)
    assert len(expenses) == 1
    assert expenses[0]["amount_cents"] == 5500


async def test_unchecking_count_as_expense_removes_expense(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    plan = (
        await authed_client.post(
            f"/trips/{trip_id}/plans",
            json={
                "name": "Museo",
                "description": "Entrada",
                "cost_cents": 1500,
                "count_as_expense": True,
                "expense_category_code": "ACTIVITIES",
            },
        )
    ).json()
    assert len(await _list_expenses(authed_client, trip_id)) == 1

    await authed_client.patch(
        f"/trips/{trip_id}/plans/{plan['id']}",
        json={"count_as_expense": False},
    )
    assert await _list_expenses(authed_client, trip_id) == []


async def test_deleting_plan_removes_derived_expense(
    authed_client: AsyncClient,
) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    plan = (
        await authed_client.post(
            f"/trips/{trip_id}/plans",
            json={
                "name": "Tour",
                "description": "Guiado",
                "cost_cents": 2000,
                "count_as_expense": True,
                "expense_category_code": "ACTIVITIES",
            },
        )
    ).json()
    assert len(await _list_expenses(authed_client, trip_id)) == 1

    await authed_client.delete(f"/trips/{trip_id}/plans/{plan['id']}")
    assert await _list_expenses(authed_client, trip_id) == []


async def _create_plan(client: AsyncClient, trip_id: str, name: str = "P") -> dict:
    return (
        await client.post(
            f"/trips/{trip_id}/plans",
            json={"name": name, "description": "d"},
        )
    ).json()


async def test_add_and_list_plan_links(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    plan = await _create_plan(authed_client, trip_id)

    resp = await authed_client.post(
        f"/trips/{trip_id}/plans/{plan['id']}/links",
        json={
            "url": "https://drive.google.com/folder/abc",
            "label": "Docs",
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["url"] == "https://drive.google.com/folder/abc"

    plans = (await authed_client.get(f"/trips/{trip_id}/plans")).json()
    links = plans[0]["links"]
    assert len(links) == 1
    assert links[0]["label"] == "Docs"
    assert links[0]["url"] == "https://drive.google.com/folder/abc"


async def test_add_link_rejects_non_url(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    plan = await _create_plan(authed_client, trip_id)

    resp = await authed_client.post(
        f"/trips/{trip_id}/plans/{plan['id']}/links",
        json={"url": "not-a-url"},
    )
    assert resp.status_code == 422


async def test_delete_plan_link(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    plan = await _create_plan(authed_client, trip_id)
    link = (
        await authed_client.post(
            f"/trips/{trip_id}/plans/{plan['id']}/links",
            json={"url": "https://example.com"},
        )
    ).json()

    resp = await authed_client.delete(
        f"/trips/{trip_id}/plans/{plan['id']}/links/{link['id']}"
    )
    assert resp.status_code == 204

    plans = (await authed_client.get(f"/trips/{trip_id}/plans")).json()
    assert plans[0]["links"] == []


async def test_delete_missing_plan_link_404(authed_client: AsyncClient) -> None:
    trip_id = await _create_trip_via_api(authed_client)
    plan = await _create_plan(authed_client, trip_id)

    resp = await authed_client.delete(
        f"/trips/{trip_id}/plans/{plan['id']}/links/{uuid4()}"
    )
    assert resp.status_code == 404


async def test_deleting_plan_removes_its_links(
    authed_client: AsyncClient, session: AsyncSession
) -> None:
    from sqlalchemy import func, select

    from app.domain.plans.entity import PlanLink

    trip_id = await _create_trip_via_api(authed_client)
    plan = await _create_plan(authed_client, trip_id)
    await authed_client.post(
        f"/trips/{trip_id}/plans/{plan['id']}/links",
        json={"url": "https://example.com"},
    )

    await authed_client.delete(f"/trips/{trip_id}/plans/{plan['id']}")

    count = (
        await session.execute(select(func.count()).select_from(PlanLink))
    ).scalar_one()
    assert count == 0


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
