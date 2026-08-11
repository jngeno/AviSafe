"""
Datasets module -- currently one real, active dataset (data/NTSB.csv).
Structured as a list endpoint from the start so adding a second
dataset later is additive, not a rewrite.
"""

from __future__ import annotations

from fastapi import APIRouter

from src.core.config import Config

from .. import schemas
from ..services import analytics_service

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=list[schemas.DatasetInfo])
def list_datasets():

    config = Config()

    path = config.project_root / "data" / "NTSB.csv"

    if not path.exists():
        return []

    df = analytics_service.get_dataset()

    years = df["Event_Year"].dropna()

    date_range = (
        f"{int(years.min())} - {int(years.max())}" if not years.empty else "unknown"
    )

    categories = sorted(df["Accident_Category"].dropna().unique().tolist())

    return [
        {
            "name": "NTSB Aviation Accident Database",
            "path": "data/NTSB.csv",
            "rows": len(df),
            "columns": df.shape[1],
            "date_range": date_range,
            "accident_categories_covered": categories,
            "size_mb": round(path.stat().st_size / (1024 * 1024), 1),
            "status": "Active",
        }
    ]
