"""Happy-path tests for the trips endpoints (authenticated)."""

from uuid import UUID

from httpx import AsyncClient

from app.domain.users.entity import User


async def test_create_trip_returns_201_and_payload(
    authed_client: AsyncClient, test_user: User
) -> None:
    response = await authed_client.post("/trips", json={"name": "Italy 2026"})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Italy 2026"
    assert body["owner_id"] == str(test_user.id)
    UUID(body["id"])  # parses as UUID
    assert "created_at" in body


async def test_list_trips_is_empty_initially(authed_client: AsyncClient) -> None:
    response = await authed_client.get("/trips")

    assert response.status_code == 200
    assert response.json() == []


async def test_create_then_list_returns_the_created_trips(
    authed_client: AsyncClient,
) -> None:
    await authed_client.post("/trips", json={"name": "Italy 2026"})
    await authed_client.post("/trips", json={"name": "Greece 2026"})

    response = await authed_client.get("/trips")

    assert response.status_code == 200
    names = [t["name"] for t in response.json()]
    assert sorted(names) == ["Greece 2026", "Italy 2026"]


async def test_create_trip_rejects_empty_name(authed_client: AsyncClient) -> None:
    response = await authed_client.post("/trips", json={"name": ""})

    assert response.status_code == 422


async def test_trips_requires_authentication(client: AsyncClient) -> None:
    """Without the override, ``current_active_user`` rejects the call."""
    response = await client.get("/trips")
    assert response.status_code == 401


async def test_get_trip_by_id_returns_the_trip(
    authed_client: AsyncClient, test_user: User
) -> None:
    created = (
        await authed_client.post("/trips", json={"name": "Italy 2026"})
    ).json()

    response = await authed_client.get(f"/trips/{created['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["name"] == "Italy 2026"
    assert body["owner_id"] == str(test_user.id)


async def test_get_trip_owned_by_someone_else_returns_404(
    authed_client: AsyncClient,
    session,
    second_user: User,
) -> None:
    from app.domain.trips.entity import Trip

    trip = Trip(name="Not yours", owner_id=second_user.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)

    response = await authed_client.get(f"/trips/{trip.id}")
    assert response.status_code == 404


async def test_get_unknown_trip_returns_404(authed_client: AsyncClient) -> None:
    from uuid import uuid4

    response = await authed_client.get(f"/trips/{uuid4()}")
    assert response.status_code == 404
