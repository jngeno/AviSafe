"""
Environment-backed application settings for AviSafe.

Distinct from Config (src/core/config.py), which manages filesystem
paths: Settings loads service configuration (database connection, API
host/port) from the environment / .env file via pydantic-settings.
"""

from __future__ import annotations

from functools import lru_cache

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


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached Settings instance.
    """

    return Settings()
