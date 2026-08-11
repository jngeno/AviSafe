"""
Aggregated accident-data analytics service.

Backs the Dashboard, Aircraft Analytics, and Risk Heat Maps modules --
all of which need rollups over the *raw* accident dataset (not a
specific trained experiment's predictions). Loading + preprocessing +
labelling data/NTSB.csv takes real time (tens of seconds, dominated by
narrative-text label matching over ~88k rows), so it's loaded once per
process and cached rather than repeated per request. See
src.api.main's startup event, which warms this cache eagerly so the
first real request isn't the one that pays for it.
"""

from __future__ import annotations

from functools import lru_cache

import pandas as pd

from src.core.config import Config
from src.core.logger import LoggerManager
from src.data.data_loader import DataLoader
from src.data.label_engineering import AccidentCategoryLabeler
from src.data.preprocessing import Preprocessor

logger = LoggerManager.get_logger(__name__)


@lru_cache(maxsize=1)
def _load_labeled_dataset() -> pd.DataFrame:

    config = Config()

    path = config.project_root / "data" / "NTSB.csv"

    logger.info("Analytics: loading and labelling %s (cold cache)...", path)

    dataframe = DataLoader().load(path)

    dataframe = Preprocessor().run(dataframe)

    dataframe = AccidentCategoryLabeler().label(dataframe)

    logger.info("Analytics: cached %d rows.", len(dataframe))

    return dataframe


def get_dataset() -> pd.DataFrame:
    return _load_labeled_dataset()


def clear_cache() -> None:
    _load_labeled_dataset.cache_clear()


def dashboard_facts() -> dict:
    """
    Dataset-derived facts for the dashboard (accident/incident counts,
    category breakdown, trends). Model/recommendation-derived facts
    (best model, open recommendations) are added by the router, which
    has DB access this service deliberately does not.
    """

    df = get_dataset()

    total_accidents = int((df["Investigation_Type"] == "Accident").sum())
    total_incidents = int((df["Investigation_Type"] == "Incident").sum())

    labeled = df.dropna(subset=["Accident_Category"])

    category_breakdown = labeled["Accident_Category"].value_counts().to_dict()

    monthly = (
        df.dropna(subset=["Event_Year", "Event_Month"])
        .groupby(["Event_Year", "Event_Month"])
        .size()
        .reset_index(name="count")
        .sort_values(["Event_Year", "Event_Month"])
        .tail(24)
    )

    monthly_trend = [
        {
            "year": int(row["Event_Year"]),
            "month": int(row["Event_Month"]),
            "count": int(row["count"]),
        }
        for _, row in monthly.iterrows()
    ]

    flight_phase_breakdown = (
        df["Broad_Phase_Of_Flight"].value_counts().head(10).to_dict()
        if "Broad_Phase_Of_Flight" in df.columns
        else {}
    )

    weather_breakdown = (
        df["Weather_Condition"].value_counts().to_dict()
        if "Weather_Condition" in df.columns
        else {}
    )

    return {
        "total_accidents": total_accidents,
        "total_incidents": total_incidents,
        "category_breakdown": {str(k): int(v) for k, v in category_breakdown.items()},
        "monthly_trend": monthly_trend,
        "flight_phase_breakdown": {
            str(k): int(v) for k, v in flight_phase_breakdown.items()
        },
        "weather_breakdown": {str(k): int(v) for k, v in weather_breakdown.items()},
    }


def aircraft_analytics(limit: int = 30) -> list[dict]:
    """
    Aggregate by aircraft manufacturer (Make). Model-level aggregation
    isn't offered: NTSB's free-text Model field has ~11.5k distinct,
    largely uncleaned values -- too dirty to roll up meaningfully
    without a dedicated normalization pass this project hasn't done.
    """

    df = get_dataset().copy()

    df["_manufacturer"] = df["Make"].astype(str).str.strip().str.lower()

    df = df[df["_manufacturer"].notna() & (df["_manufacturer"] != "unknown")]

    top_makes = df["_manufacturer"].value_counts().head(limit).index

    results = []

    for make in top_makes:

        subset = df[df["_manufacturer"] == make]

        category_counts = (
            subset.dropna(subset=["Accident_Category"])["Accident_Category"]
            .value_counts()
            .to_dict()
        )

        top_phase = (
            subset["Broad_Phase_Of_Flight"].mode().iloc[0]
            if "Broad_Phase_Of_Flight" in subset.columns and not subset.empty
            else None
        )

        results.append(
            {
                "manufacturer": make,
                "total_accidents": int((subset["Investigation_Type"] == "Accident").sum()),
                "total_incidents": int((subset["Investigation_Type"] == "Incident").sum()),
                "fatal_accidents": int((subset["Total_Fatal_Injuries"] > 0).sum())
                if "Total_Fatal_Injuries" in subset.columns
                else 0,
                "category_breakdown": {str(k): int(v) for k, v in category_counts.items()},
                "top_flight_phase": top_phase,
                "avg_seats": float(subset["Number_Of_Seats"].mean())
                if "Number_Of_Seats" in subset.columns and subset["Number_Of_Seats"].notna().any()
                else None,
            }
        )

    return results


def hotspots(category: str | None = None, precision: int = 0, limit: int = 800) -> list[dict]:
    """
    Coordinate-rounded accident density points per category, for the
    Risk Heat Maps module. `precision` decimal places (0 ~= 111km grid
    cells, appropriate for a world-view map) keeps point count
    manageable -- each point becomes a DOM marker on the client, so an
    unbounded count (a naive precision=1 grid produces several thousand)
    both floods the map visually and is slow to render. `limit` caps the
    result to the busiest cells as a hard backstop.
    """

    df = get_dataset()

    labeled = df.dropna(subset=["Accident_Category", "Latitude", "Longitude"])

    if category:
        labeled = labeled[labeled["Accident_Category"] == category]

    if labeled.empty:
        return []

    grouped = (
        labeled.assign(
            lat_bin=labeled["Latitude"].round(precision),
            lon_bin=labeled["Longitude"].round(precision),
        )
        .groupby(["lat_bin", "lon_bin", "Accident_Category"])
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
        .head(limit)
    )

    return [
        {
            "latitude": float(row["lat_bin"]),
            "longitude": float(row["lon_bin"]),
            "category": row["Accident_Category"],
            "count": int(row["count"]),
        }
        for _, row in grouped.iterrows()
    ]
