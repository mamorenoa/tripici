"""HTTP wiring for the auth feature.

This module mounts the routers FastAPI-Users provides:

- ``POST /auth/jwt/login`` and ``POST /auth/jwt/logout``
- ``POST /auth/register``
- ``GET /users/me`` and ``PATCH /users/me`` (plus the admin user CRUD).

The implementation of those endpoints lives inside FastAPI-Users; we
just register them with our app and supply the schemas.
"""

from fastapi import APIRouter

from app.core.auth import auth_backend, fastapi_users
from app.domain.users.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter()

router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)
