"""
Risk Register endpoints -- CRUD and workflow operations for the safety
risk register, independent of any single experiment.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import RecommendationRepository, RiskRegisterRepository

from .. import schemas

router = APIRouter(prefix="/risk-register", tags=["risk-register"])


@router.get("", response_model=list[schemas.RiskRegisterOut])
def list_risk_register(
    category: str | None = None,
    status: str | None = None,
    risk_level: str | None = None,
    search: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
) -> list:
    try:
        return RiskRegisterRepository.list(
            db,
            category=category,
            status=status,
            risk_level=risk_level,
            search=search,
            limit=limit,
        )
    except Exception:
        return []


@router.post("", response_model=schemas.RiskRegisterOut, status_code=201)
def create_risk_register_entry(
    payload: schemas.RiskRegisterCreate,
    db: Session = Depends(get_db),
):
    try:
        if payload.linked_recommendation_id is not None:
            linked = RecommendationRepository.get(db, payload.linked_recommendation_id)
            if linked is None:
                raise HTTPException(status_code=404, detail="Linked recommendation not found")

        return RiskRegisterRepository.create(
            db,
            title=payload.title,
            category=payload.category,
            description=payload.description,
            likelihood=payload.likelihood,
            severity=payload.severity,
            status=payload.status,
            owner=payload.owner,
            mitigation=payload.mitigation,
            linked_recommendation_id=payload.linked_recommendation_id,
            review_date=payload.review_date,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.patch("/{entry_id}", response_model=schemas.RiskRegisterOut)
def update_risk_register_entry(
    entry_id: int,
    payload: schemas.RiskRegisterUpdate,
    db: Session = Depends(get_db),
):
    try:
        record = RiskRegisterRepository.get(db, entry_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Risk register entry not found")

        if payload.linked_recommendation_id is not None:
            linked = RecommendationRepository.get(db, payload.linked_recommendation_id)
            if linked is None:
                raise HTTPException(status_code=404, detail="Linked recommendation not found")

        return RiskRegisterRepository.update(
            db,
            record,
            title=payload.title,
            category=payload.category,
            description=payload.description,
            likelihood=payload.likelihood,
            severity=payload.severity,
            status=payload.status,
            owner=payload.owner,
            mitigation=payload.mitigation,
            linked_recommendation_id=payload.linked_recommendation_id,
            review_date=payload.review_date,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{entry_id}", status_code=204)
def delete_risk_register_entry(
    entry_id: int,
    db: Session = Depends(get_db),
):
    try:
        record = RiskRegisterRepository.get(db, entry_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Risk register entry not found")

        RiskRegisterRepository.delete(db, record)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
