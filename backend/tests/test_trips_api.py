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


async def test_create_trip_with_date_range_persists_dates(
    authed_client: AsyncClient,
) -> None:
    response = await authed_client.post(
        "/trips",
        json={
            "name": "Italy 2026",
            "start_date": "2026-08-01",
            "end_date": "2026-08-10",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["start_date"] == "2026-08-01"
    assert body["end_date"] == "2026-08-10"


async def test_create_trip_without_dates_defaults_to_null(
    authed_client: AsyncClient,
) -> None:
    body = (await authed_client.post("/trips", json={"name": "No dates"})).json()

    assert body["start_date"] is None
    assert body["end_date"] is None


async def test_create_trip_rejects_end_before_start(
    authed_client: AsyncClient,
) -> None:
    response = await authed_client.post(
        "/trips",
        json={
            "name": "Backwards",
            "start_date": "2026-08-10",
            "end_date": "2026-08-01",
        },
    )

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


async def test_member_sees_shared_trip_in_list(
    client: AsyncClient,
    session,
    test_user: User,
    second_user: User,
    as_user,
) -> None:
    """A collaborator's GET /trips includes trips they don't own."""
    from app.domain.memberships.entity import TripMembership
    from app.domain.trips.entity import Trip

    # test_user owns 1 trip, second_user is added as collaborator.
    trip = Trip(name="Greece 2026", owner_id=test_user.id)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    session.add(TripMembership(trip_id=trip.id, user_id=second_user.id))
    await session.commit()

    as_user(second_user)
    listed = await client.get("/trips")

    assert listed.status_code == 200
    names = [t["name"] for t in listed.json()]
    assert "Greece 2026" in names
