"""Application settings.

Loaded from environment variables, with optional overrides from a local
``.env`` file. Defaults are tuned for the docker-compose stack in
``backend/docker-compose.yml`` so the app runs out of the box locally.

Production (Fly.io) sets ``DATABASE_URL``, ``AUTH_SECRET`` and
``CORS_ORIGINS`` as secrets — see /DEPLOY.md.
"""

from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # SQLAlchemy-style URL. psycopg v3 supports both sync and async with
    # the same prefix; we use the async engine in app/core/db.py.
    #
    # Fly's `postgres attach` injects a ``postgres://...`` URL (libpq
    # style) — SQLAlchemy needs an explicit driver, so the validator
    # below rewrites the prefix when needed.
    database_url: str = (
        "postgresql+psycopg://tripinci:tripinci@localhost:5432/tripinci"
    )

    # Secret used to sign / verify JWTs. The default exists ONLY so the
    # app boots out of the box for local dev. PRODUCTION MUST OVERRIDE
    # this via the AUTH_SECRET env var — otherwise tokens are forgeable.
    auth_secret: str = "dev-secret-change-in-production-min-32-bytes"

    # Access token lifetime. 24h is generous for local dev; we'll
    # introduce refresh tokens if/when this hurts.
    auth_token_lifetime_seconds: int = 60 * 60 * 24

    # Unsplash access key for trip cover images (see app/api/cover.py).
    # Lives here — not in the app bundle — so it isn't publicly readable.
    # Set it in production with `fly secrets set UNSPLASH_ACCESS_KEY=...`.
    # Empty (the default) simply disables covers: the app falls back to a
    # gradient, so local dev works without any secret.
    unsplash_access_key: str = ""

    # Whitelist for CORSMiddleware. Defaults match the Expo dev server.
    # In production the env var ``CORS_ORIGINS`` is a comma-separated
    # list (e.g. ``https://tripinci.pages.dev,https://app.tripinci.com``).
    #
    # ``NoDecode`` stops pydantic-settings from JSON-decoding the env
    # var before our ``mode="before"`` validator runs — without it a
    # bare CSV like ``a,b`` triggers a JSONDecodeError on startup.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:8081",
            "http://localhost:19006",
        ]
    )

    @field_validator("database_url", mode="after")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        """Ensure the URL uses an explicit SQLAlchemy driver.

        Hosts like Fly.io hand out ``postgres://user:pass@host/db``;
        SQLAlchemy 2.x rejects that and our code expects the psycopg v3
        async driver. Rewrite to ``postgresql+psycopg://...``.
        """
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value[len("postgres://") :]
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value[len("postgresql://") :]
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: object) -> object:
        """Accept either a list (Python default) or a CSV string (env var).

        Pydantic Settings tries JSON-parsing string env vars before this
        validator runs, but a bare ``a,b,c`` isn't JSON, so it lands here
        as the raw string. We split it ourselves.
        """
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


settings = Settings()
