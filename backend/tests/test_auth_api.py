"""Happy-path test for the auth flow: register → login → me."""

from httpx import AsyncClient


async def test_register_login_and_me(client: AsyncClient) -> None:
    # 1. Register a new user.
    register = await client.post(
        "/auth/register",
        json={
            "email": "miguel@example.com",
            "password": "hunter2hunter2",
            "display_name": "Miguel",
        },
    )
    assert register.status_code == 201, register.text
    body = register.json()
    assert body["email"] == "miguel@example.com"
    assert body["display_name"] == "Miguel"

    # 2. Log in via the JWT auth backend. FastAPI-Users login uses the
    #    OAuth2 form payload (``username`` + ``password``).
    login = await client.post(
        "/auth/jwt/login",
        data={"username": "miguel@example.com", "password": "hunter2hunter2"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    assert isinstance(token, str) and len(token) > 0

    # 3. Use the token to fetch the current user.
    me = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me.status_code == 200, me.text
    assert me.json()["email"] == "miguel@example.com"
    assert me.json()["display_name"] == "Miguel"
