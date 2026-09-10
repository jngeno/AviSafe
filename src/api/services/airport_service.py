"""
Airport reference/directory service, backed by data/airports.csv (the
OurAirports open dataset -- 85k+ airports worldwide with ICAO/IATA
identifiers, coordinates, and type).

This is deliberately a *reference lookup*, not an accident-analytics
rollup: the CSV carries no accident or incident data, and nothing here
is joined against the NTSB dataset or the ML pipeline. It exists to
answer "what airport is this, where is it, what's its ICAO/IATA code"
-- filling the ICAO/IATA gap the platform previously had no data for --
not "how risky is this airport."
"""

from __future__ import annotations

from functools import lru_cache

import pandas as pd

from src.core.config import Config
from src.core.logger import LoggerManager

logger = LoggerManager.get_logger(__name__)

# Heliports, balloonports, and permanently closed airfields are excluded
# by default -- they're real rows in the source data, but noise for a
# directory aimed at fixed-wing aviation safety use cases.
_DEFAULT_TYPES = {"small_airport", "medium_airport", "large_airport", "seaplane_base"}


@lru_cache(maxsize=1)
def _load_airports() -> pd.DataFrame:

    config = Config()
    path = config.project_root / "data" / "airports.csv"

    logger.info("Loading airport directory: %s (cold cache)...", path)

    df = pd.read_csv(path, low_memory=False)
    df = df.dropna(subset=["latitude_deg", "longitude_deg"])

    logger.info("Airport directory cached: %d rows.", len(df))

    return df


def get_airports() -> pd.DataFrame:
    return _load_airports()


def clear_cache() -> None:
    _load_airports.cache_clear()


def list_types() -> list[str]:
    return sorted(get_airports()["type"].dropna().unique().tolist())


def list_countries() -> list[dict]:
    df = get_airports()
    counts = df["iso_country"].dropna().value_counts()
    return [{"code": code, "count": int(count)} for code, count in counts.items()]


def search_airports(
    *,
    search: str | None = None,
    country: str | None = None,
    airport_type: str | None = None,
    include_all_types: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:

    df = get_airports()

    if airport_type:
        df = df[df["type"] == airport_type]
    elif not include_all_types:
        df = df[df["type"].isin(_DEFAULT_TYPES)]

    if country:
        df = df[df["iso_country"] == country.upper()]

    if search:
        needle = search.strip().lower()
        haystack = (
            df["name"].fillna("")
            + " "
            + df["ident"].fillna("")
            + " "
            + df["icao_code"].fillna("")
            + " "
            + df["iata_code"].fillna("")
            + " "
            + df["municipality"].fillna("")
        ).str.lower()
        df = df[haystack.str.contains(needle, na=False, regex=False)]

    total = len(df)

    df = df.sort_values(
        by=["type", "name"],
        key=lambda col: col.map({"large_airport": 0, "medium_airport": 1, "small_airport": 2, "seaplane_base": 3}).fillna(4)
        if col.name == "type"
        else col,
    )

    page = df.iloc[offset : offset + limit]

    return [_to_dict(row) for _, row in page.iterrows()], total


def get_airport(ident: str) -> dict | None:
    df = get_airports()
    match = df[df["ident"].str.upper() == ident.upper()]
    if match.empty:
        match = df[df["icao_code"].str.upper() == ident.upper()]
    if match.empty:
        return None
    return _to_dict(match.iloc[0])


def _to_dict(row: pd.Series) -> dict:
    return {
        "ident": row["ident"],
        "type": row["type"],
        "name": row["name"],
        "latitude": float(row["latitude_deg"]),
        "longitude": float(row["longitude_deg"]),
        "elevation_ft": float(row["elevation_ft"]) if pd.notna(row["elevation_ft"]) else None,
        "continent": row["continent"] if pd.notna(row["continent"]) else None,
        "country": row["iso_country"] if pd.notna(row["iso_country"]) else None,
        "region": row["iso_region"] if pd.notna(row["iso_region"]) else None,
        "municipality": row["municipality"] if pd.notna(row["municipality"]) else None,
        "scheduled_service": row["scheduled_service"] == "yes",
        "icao_code": row["icao_code"] if pd.notna(row["icao_code"]) else None,
        "iata_code": row["iata_code"] if pd.notna(row["iata_code"]) else None,
        "gps_code": row["gps_code"] if pd.notna(row["gps_code"]) else None,
        "local_code": row["local_code"] if pd.notna(row["local_code"]) else None,
        "wikipedia_link": row["wikipedia_link"] if pd.notna(row["wikipedia_link"]) else None,
    }
