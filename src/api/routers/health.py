"""
Health check endpoint.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.database.base import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    """
    Report API and database liveness.
    """

    try:
        db.execute(text("SELECT 1"))
        database_status = "ok"
    except Exception:  # noqa: BLE001
        database_status = "unreachable"

    return {"status": "ok", "database": database_status}
