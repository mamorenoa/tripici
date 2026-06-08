"""Tests for the categories endpoint (read-only seed)."""

from httpx import AsyncClient

EXPECTED_CODES = {
    "RESTAURANTS",
    "GROCERIES",
    "ACCOMMODATION",
    "TRANSPORT",
    "FUEL",
    "ACTIVITIES",
    "OTHER",
}


async def test_list_categories_returns_seeded_set(
    authed_client: AsyncClient,
) -> None:
    response = await authed_client.get("/categories")

    assert response.status_code == 200
    codes = {c["code"] for c in response.json()}
    assert codes == EXPECTED_CODES


async def test_categories_require_authentication(client: AsyncClient) -> None:
    response = await client.get("/categories")
    assert response.status_code == 401
