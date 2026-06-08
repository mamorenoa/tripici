"""Application settings.

Loaded from environment variables, with optional overrides from a local
``.env`` file. Defaults are tuned for the docker-compose stack in
``backend/docker-compose.yml`` so the app runs out of the box.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # SQLAlchemy-style URL. psycopg v3 supports both sync and async with
    # the same prefix; we use the async engine in app/core/db.py.
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

    # Whitelist for CORSMiddleware. Matches the Expo dev server.
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:8081",
            "http://localhost:19006",
        ]
    )


settings = Settings()
