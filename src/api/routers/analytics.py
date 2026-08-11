"""
Cross-cutting analytics endpoints: executive dashboard summary,
aircraft-manufacturer rollups, and accident-category hotspot points
for the map. All derived from the raw accident dataset (via
analytics_service) combined, where noted, with experiment/recommendation
facts from the database.
"""

from __future__ import annotations

from sqlalchemy import func, select

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database import models

from .. import schemas
from ..services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):

    facts = analytics_service.dashboard_facts()

    models_trained = db.execute(
        select(func.count()).select_from(models.Experiment)
    ).scalar_one()

    latest_experiment = db.execute(
        select(models.Experiment).order_by(models.Experiment.started_at.desc()).limit(1)
    ).scalar_one_or_none()

    open_recommendations = db.execute(
        select(func.count())
        .select_from(models.SafetyRecommendationRecord)
        .where(models.SafetyRecommendationRecord.status == "Open")
    ).scalar_one()

    category_breakdown = facts["category_breakdown"]

    high_risk_categories = sorted(
        category_breakdown, key=category_breakdown.get, reverse=True
    )[:3]

    return {
        "total_accidents": facts["total_accidents"],
        "total_incidents": facts["total_incidents"],
        "active_datasets": 1,
        "models_trained": models_trained,
        "best_model": latest_experiment.model_name if latest_experiment else None,
        "best_accuracy": (
            latest_experiment.test_metrics.get("accuracy")
            if latest_experiment and latest_experiment.test_metrics
            else None
        ),
        "open_recommendations": open_recommendations,
        "high_risk_categories": high_risk_categories,
        "category_breakdown": category_breakdown,
        "monthly_trend": facts["monthly_trend"],
        "flight_phase_breakdown": facts["flight_phase_breakdown"],
        "weather_breakdown": facts["weather_breakdown"],
    }


@router.get("/aircraft", response_model=list[schemas.AircraftAnalyticsOut])
def aircraft_analytics(limit: int = 30):
    return analytics_service.aircraft_analytics(limit=limit)


@router.get("/hotspots", response_model=list[schemas.HotspotPoint])
def hotspots(category: str | None = None):
    return analytics_service.hotspots(category=category)
