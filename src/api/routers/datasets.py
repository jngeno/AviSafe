"""
Datasets module -- currently one real, active dataset (data/NTSB.csv).
Structured as a list endpoint from the start so adding a second
dataset later is additive, not a rewrite.
"""

from __future__ import annotations

from fastapi import APIRouter

from src.core.config import Config
from src.data.data_loader import DataLoader

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

    # Reuses DataLoader's own summary method (already used for the CLI's
    # own diagnostics) rather than recomputing quality stats separately.
    # Excludes Accident_Category: it's a derived label that's legitimately
    # NaN for ~90% of rows by design (only narratives matching CFIT/LOC-I/
    # Runway Excursion get one -- see AccidentCategoryLabeler), not a raw
    # data-quality gap. Counting it here would make the source data look
    # far dirtier than it actually is.
    quality = DataLoader.dataset_summary(df.drop(columns=["Accident_Category"], errors="ignore"))

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
            "missing_values": quality["missing_values"],
            "duplicate_rows": quality["duplicate_rows"],
            "column_names": sorted(df.columns.tolist()),
        }
    ]
