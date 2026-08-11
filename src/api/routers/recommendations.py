"""
Safety Recommendation Centre endpoints -- cross-experiment recommendation
listing/filtering/search plus workflow updates (status, assignment, due date).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import RecommendationRepository

from .. import schemas

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[schemas.RecommendationOut])
def list_recommendations(
    category: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
) -> list:
    return RecommendationRepository.list(
        db,
        category=category,
        priority=priority,
        status=status,
        search=search,
        limit=limit,
    )


@router.patch("/{recommendation_id}", response_model=schemas.RecommendationOut)
def update_recommendation(
    recommendation_id: int,
    payload: schemas.RecommendationUpdate,
    db: Session = Depends(get_db),
):
    record = RecommendationRepository.get(db, recommendation_id)

    if record is None:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return RecommendationRepository.update_workflow(
        db,
        record,
        status=payload.status,
        assigned_officer=payload.assigned_officer,
        due_date=payload.due_date,
    )
