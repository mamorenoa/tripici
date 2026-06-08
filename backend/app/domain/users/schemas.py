"""Pydantic schemas for the user feature.

These are the input/output shapes used by the FastAPI-Users routers:

- ``UserRead``: returned from ``GET /users/me`` and elsewhere.
- ``UserCreate``: accepted by ``POST /auth/register``.
- ``UserUpdate``: accepted by ``PATCH /users/me``.

The FastAPI-Users base classes already include email + password + flags.
We extend them with ``display_name``.
"""

from uuid import UUID

from fastapi_users import schemas


class UserRead(schemas.BaseUser[UUID]):
    display_name: str


class UserCreate(schemas.BaseUserCreate):
    display_name: str


class UserUpdate(schemas.BaseUserUpdate):
    display_name: str | None = None
