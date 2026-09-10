"""
Environment-backed application settings for AviSafe.

Distinct from Config (src/core/config.py), which manages filesystem
paths: Settings loads service configuration (database connection, API
host/port) from the environment / .env file via pydantic-settings.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/avisafe"

    api_host: str = "0.0.0.0"

    api_port: int = 8000

    # Comma-separated extra origins (e.g. a deployed frontend's URL) to
    # allow alongside the local-dev origins hardcoded in main.py.
    cors_extra_origins: str = ""

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_driver(cls, value: str) -> str:
        """
        Managed Postgres providers (Railway, Render, etc.) hand out a
        bare `postgresql://` URL, which makes SQLAlchemy default to the
        psycopg2 driver -- not installed here (only psycopg 3 is, see
        requirements.txt). Normalize it so those URLs work unmodified.
        """
        prefix = "postgresql://"
        if value.startswith(prefix):
            return "postgresql+psycopg://" + value[len(prefix):]
        return value


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached Settings instance.
    """

    return Settings()
