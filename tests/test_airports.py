"""
Tests for the airport directory endpoints, backed by the real
data/airports.csv (OurAirports) reference dataset.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


def test_search_default_excludes_heliports_and_closed():
    response = client.get("/airports?limit=200")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] > 0
    types = {row["type"] for row in body["results"]}
    assert types <= {"small_airport", "medium_airport", "large_airport", "seaplane_base"}


def test_search_by_name_finds_known_airport():
    response = client.get("/airports?search=Jomo Kenyatta")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(row["icao_code"] == "HKJK" for row in body["results"])


def test_country_filter():
    response = client.get("/airports?country=KE&limit=500")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] > 0
    assert all(row["country"] == "KE" for row in body["results"])


def test_countries_and_types_lists():
    countries = client.get("/airports/countries")
    assert countries.status_code == 200
    assert len(countries.json()) > 50  # genuinely global dataset

    types = client.get("/airports/types")
    assert types.status_code == 200
    assert "large_airport" in types.json()


def test_get_airport_by_icao_ident():
    response = client.get("/airports/KJFK")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "John F. Kennedy International Airport"
    assert body["iata_code"] == "JFK"


def test_get_airport_missing_is_404():
    response = client.get("/airports/ZZZZ999")
    assert response.status_code == 404
