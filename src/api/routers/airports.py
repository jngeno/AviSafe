"""
Airport directory endpoints -- a searchable reference lookup over
data/airports.csv (name, ICAO/IATA identifiers, location, type). Not
accident analytics; see airport_service's module docstring.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import schemas
from ..services import airport_service

router = APIRouter(prefix="/airports", tags=["airports"])


@router.get("", response_model=schemas.AirportSearchResult)
def search_airports(
    search: str | None = None,
    country: str | None = None,
    type: str | None = None,
    include_all_types: bool = False,
    limit: int = 50,
    offset: int = 0,
):
    results, total = airport_service.search_airports(
        search=search,
        country=country,
        airport_type=type,
        include_all_types=include_all_types,
        limit=limit,
        offset=offset,
    )
    return {"results": results, "total": total}


@router.get("/countries", response_model=list[schemas.CountryCount])
def list_countries():
    return airport_service.list_countries()


@router.get("/types", response_model=list[str])
def list_types():
    return airport_service.list_types()


@router.get("/{ident}", response_model=schemas.AirportOut)
def get_airport(ident: str):
    airport = airport_service.get_airport(ident)
    if airport is None:
        raise HTTPException(status_code=404, detail="Airport not found")
    return airport
