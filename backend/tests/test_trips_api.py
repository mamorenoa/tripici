"""Happy-path tests for the trips endpoints."""

from uuid import UUID

from fastapi.testclient import TestClient

from app.core.config import settings


def test_create_trip_returns_201_and_payload(client: TestClient) -> None:
    response = client.post("/trips", json={"name": "Italy 2026"})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Italy 2026"
    assert body["owner_id"] == str(settings.dev_owner_id)
    # Parses as a UUID.
    UUID(body["id"])
    assert "created_at" in body


def test_list_trips_is_empty_initially(client: TestClient) -> None:
    response = client.get("/trips")

    assert response.status_code == 200
    assert response.json() == []


def test_create_then_list_returns_the_created_trips(client: TestClient) -> None:
    client.post("/trips", json={"name": "Italy 2026"})
    client.post("/trips", json={"name": "Greece 2026"})

    response = client.get("/trips")

    assert response.status_code == 200
    names = [t["name"] for t in response.json()]
    assert sorted(names) == ["Greece 2026", "Italy 2026"]


def test_create_trip_rejects_empty_name(client: TestClient) -> None:
    response = client.post("/trips", json={"name": ""})

    # Pydantic min_length=1 → 422.
    assert response.status_code == 422
