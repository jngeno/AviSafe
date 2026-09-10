"""
Incident Management endpoints -- CRUD and workflow operations for the
safety event inbox (accidents, incidents, near misses, hazards, safety
reports, and operational events logged directly by safety staff).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import IncidentRepository, RecommendationRepository

from .. import schemas

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[schemas.IncidentOut])
def list_incidents(
    event_type: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    category: str | None = None,
    search: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
) -> list:
    try:
        return IncidentRepository.list(
            db,
            event_type=event_type,
            severity=severity,
            status=status,
            category=category,
            search=search,
            limit=limit,
        )
    except Exception:
        return []


@router.post("", response_model=schemas.IncidentOut, status_code=201)
def create_incident(
    payload: schemas.IncidentCreate,
    db: Session = Depends(get_db),
):
    try:
        if payload.linked_recommendation_id is not None:
            linked = RecommendationRepository.get(db, payload.linked_recommendation_id)
            if linked is None:
                raise HTTPException(status_code=404, detail="Linked recommendation not found")

        return IncidentRepository.create(
            db,
            title=payload.title,
            event_type=payload.event_type,
            category=payload.category,
            severity=payload.severity,
            status=payload.status,
            description=payload.description,
            occurred_at=payload.occurred_at,
            location=payload.location,
            airport=payload.airport,
            aircraft=payload.aircraft,
            operator=payload.operator,
            flight_phase=payload.flight_phase,
            weather=payload.weather,
            assigned_investigator=payload.assigned_investigator,
            reported_by=payload.reported_by,
            linked_recommendation_id=payload.linked_recommendation_id,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.patch("/{incident_id}", response_model=schemas.IncidentOut)
def update_incident(
    incident_id: int,
    payload: schemas.IncidentUpdate,
    db: Session = Depends(get_db),
):
    try:
        record = IncidentRepository.get(db, incident_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Incident not found")

        if payload.linked_recommendation_id is not None:
            linked = RecommendationRepository.get(db, payload.linked_recommendation_id)
            if linked is None:
                raise HTTPException(status_code=404, detail="Linked recommendation not found")

        return IncidentRepository.update(
            db,
            record,
            title=payload.title,
            event_type=payload.event_type,
            category=payload.category,
            severity=payload.severity,
            status=payload.status,
            description=payload.description,
            occurred_at=payload.occurred_at,
            location=payload.location,
            airport=payload.airport,
            aircraft=payload.aircraft,
            operator=payload.operator,
            flight_phase=payload.flight_phase,
            weather=payload.weather,
            assigned_investigator=payload.assigned_investigator,
            reported_by=payload.reported_by,
            linked_recommendation_id=payload.linked_recommendation_id,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{incident_id}", status_code=204)
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
):
    try:
        record = IncidentRepository.get(db, incident_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Incident not found")

        IncidentRepository.delete(db, record)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
