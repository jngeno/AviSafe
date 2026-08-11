"""
Tests for the enterprise-platform API additions: the Safety
Recommendation Centre workflow endpoints and the cross-cutting
analytics endpoints (dashboard, aircraft, hotspots, datasets, reports).

Uses the real database and the real data/NTSB.csv (via analytics_service's
cache) -- these endpoints are read-heavy rollups over real data, not
synthetic fixtures, so exercising them against the actual dataset is
the meaningful test.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.services import analytics_service
from src.database.base import SessionLocal
from src.database import models

client = TestClient(app)


def test_datasets_endpoint_reports_real_dataset():
    response = client.get("/datasets")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["rows"] > 0
    assert set(body[0]["accident_categories_covered"]) <= {"CFIT", "LOC-I", "Runway Excursion"}


def test_dashboard_summary_has_positive_counts():
    response = client.get("/analytics/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert body["total_accidents"] > 0
    assert body["total_incidents"] > 0
    assert body["active_datasets"] == 1
    assert isinstance(body["category_breakdown"], dict)
    assert isinstance(body["monthly_trend"], list)


def test_aircraft_analytics_returns_ranked_manufacturers():
    response = client.get("/analytics/aircraft?limit=5")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 5
    # ranked descending by total accident+incident volume
    counts = [row["total_accidents"] + row["total_incidents"] for row in body]
    assert counts == sorted(counts, reverse=True)


def test_hotspots_filtered_by_category():
    response = client.get("/analytics/hotspots?category=CFIT")
    assert response.status_code == 200
    body = response.json()
    assert len(body) > 0
    assert all(point["category"] == "CFIT" for point in body)


def test_reports_endpoint_lists_generated_reports():
    response = client.get("/reports")
    assert response.status_code == 200
    body = response.json()
    # this repo has at least the reports generated earlier this session
    assert isinstance(body, list)
    for entry in body:
        assert entry["filename"].endswith(".md")


def test_recommendations_list_and_filter():
    response = client.get("/recommendations")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)

    if body:
        category = body[0]["category"]
        filtered = client.get(f"/recommendations?category={category}")
        assert filtered.status_code == 200
        assert all(r["category"] == category for r in filtered.json())


def test_recommendation_workflow_update_roundtrip():
    db = SessionLocal()
    existing = db.query(models.SafetyRecommendationRecord).first()
    db.close()

    if existing is None:
        return  # nothing to test against in an empty DB

    response = client.patch(
        f"/recommendations/{existing.id}",
        json={"status": "Completed", "assigned_officer": "Test Officer"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Completed"
    assert body["assigned_officer"] == "Test Officer"

    # restore original state so this test doesn't leave side effects
    client.patch(
        f"/recommendations/{existing.id}",
        json={"status": existing.status, "assigned_officer": existing.assigned_officer},
    )


def test_recommendation_update_missing_id_is_404():
    response = client.patch("/recommendations/999999999", json={"status": "Open"})
    assert response.status_code == 404


def test_analytics_service_cache_is_reused():
    df1 = analytics_service.get_dataset()
    df2 = analytics_service.get_dataset()
    assert df1 is df2  # same object -- confirms the lru_cache is doing its job
