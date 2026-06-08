"""Application settings.

Loaded from environment variables, with optional overrides from a local
``.env`` file. Defaults are tuned for the docker-compose stack in
``backend/docker-compose.yml`` so the app runs out of the box.
"""

from uuid import UUID

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # SQLAlchemy-style URL. Use the psycopg (v3) dialect so we get sync.
    database_url: str = (
        "postgresql+psycopg://tripinci:tripinci@localhost:5432/tripinci"
    )

    # Placeholder until real auth lands in slice 3. All trips are owned
    # by this user during development.
    dev_owner_id: UUID = UUID("00000000-0000-0000-0000-000000000001")

    # Whitelist for CORSMiddleware. Matches the Expo dev server.
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:8081",
            "http://localhost:19006",
        ]
    )


settings = Settings()
