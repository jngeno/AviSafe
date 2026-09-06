"""
Safety Actions endpoints -- corrective/preventive task tracking that
extends a recommendation's workflow into an owned, verifiable,
closeable task, with a comment thread.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import RecommendationRepository, SafetyActionRepository

from .. import schemas

router = APIRouter(prefix="/safety-actions", tags=["safety-actions"])


@router.get("", response_model=list[schemas.SafetyActionOut])
def list_safety_actions(
    status: str | None = None,
    priority: str | None = None,
    owner: str | None = None,
    search: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
) -> list:
    try:
        return SafetyActionRepository.list(
            db, status=status, priority=priority, owner=owner, search=search, limit=limit
        )
    except Exception:
        # Database unavailable - return empty list
        return []


@router.post("", response_model=schemas.SafetyActionOut, status_code=201)
def create_safety_action(
    payload: schemas.SafetyActionCreate,
    db: Session = Depends(get_db),
):
    try:
        if payload.linked_recommendation_id is not None:
            linked = RecommendationRepository.get(db, payload.linked_recommendation_id)
            if linked is None:
                raise HTTPException(status_code=404, detail="Linked recommendation not found")

        return SafetyActionRepository.create(
            db,
            title=payload.title,
            description=payload.description,
            linked_recommendation_id=payload.linked_recommendation_id,
            owner=payload.owner,
            priority=payload.priority,
            status=payload.status,
            due_date=payload.due_date,
            verification_notes=payload.verification_notes,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/{action_id}", response_model=schemas.SafetyActionOut)
def get_safety_action(action_id: int, db: Session = Depends(get_db)):
    record = SafetyActionRepository.get(db, action_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Safety action not found")
    return record


@router.patch("/{action_id}", response_model=schemas.SafetyActionOut)
def update_safety_action(
    action_id: int,
    payload: schemas.SafetyActionUpdate,
    db: Session = Depends(get_db),
):
    try:
        record = SafetyActionRepository.get(db, action_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Safety action not found")

        SafetyActionRepository.update(
            db,
            record,
            title=payload.title,
            description=payload.description,
            owner=payload.owner,
            priority=payload.priority,
            status=payload.status,
            due_date=payload.due_date,
            verification_notes=payload.verification_notes,
        )
        return SafetyActionRepository.get(db, action_id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{action_id}", status_code=204)
def delete_safety_action(action_id: int, db: Session = Depends(get_db)):
    try:
        record = SafetyActionRepository.get(db, action_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Safety action not found")

        SafetyActionRepository.delete(db, record)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.post(
    "/{action_id}/comments", response_model=schemas.SafetyActionCommentOut, status_code=201
)
def add_comment(
    action_id: int,
    payload: schemas.SafetyActionCommentCreate,
    db: Session = Depends(get_db),
):
    try:
        record = SafetyActionRepository.get(db, action_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Safety action not found")

        return SafetyActionRepository.add_comment(
            db, action_id, author=payload.author, text=payload.text
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
