"""
SQLAlchemy engine, session, and declarative base for AviSafe.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.core.settings import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """
    Declarative base for all AviSafe ORM models.
    """


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session, closed after use.
    """

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
