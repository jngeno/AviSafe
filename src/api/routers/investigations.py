"""
Investigations endpoints -- each investigation is worked against a
specific incident, with its own chronological timeline of entries.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import IncidentRepository, InvestigationRepository

from .. import schemas

router = APIRouter(prefix="/investigations", tags=["investigations"])


@router.get("", response_model=list[schemas.InvestigationOut])
def list_investigations(
    status: str | None = None,
    incident_id: int | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
) -> list:
    try:
        return InvestigationRepository.list(
            db, status=status, incident_id=incident_id, limit=limit
        )
    except Exception:
        return []


@router.post("", response_model=schemas.InvestigationOut, status_code=201)
def create_investigation(
    payload: schemas.InvestigationCreate,
    db: Session = Depends(get_db),
):
    try:
        incident = IncidentRepository.get(db, payload.incident_id)
        if incident is None:
            raise HTTPException(status_code=404, detail="Incident not found")

        return InvestigationRepository.create(
            db,
            incident_id=payload.incident_id,
            lead_investigator=payload.lead_investigator,
            status=payload.status,
            summary=payload.summary,
            root_cause=payload.root_cause,
            contributing_factors=payload.contributing_factors,
            started_at=payload.started_at,
            target_completion=payload.target_completion,
            completed_at=payload.completed_at,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/{investigation_id}", response_model=schemas.InvestigationOut)
def get_investigation(investigation_id: int, db: Session = Depends(get_db)):
    record = InvestigationRepository.get(db, investigation_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return record


@router.patch("/{investigation_id}", response_model=schemas.InvestigationOut)
def update_investigation(
    investigation_id: int,
    payload: schemas.InvestigationUpdate,
    db: Session = Depends(get_db),
):
    try:
        record = InvestigationRepository.get(db, investigation_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Investigation not found")

        InvestigationRepository.update(
            db,
            record,
            lead_investigator=payload.lead_investigator,
            status=payload.status,
            summary=payload.summary,
            root_cause=payload.root_cause,
            contributing_factors=payload.contributing_factors,
            started_at=payload.started_at,
            target_completion=payload.target_completion,
            completed_at=payload.completed_at,
        )
        return InvestigationRepository.get(db, investigation_id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{investigation_id}", status_code=204)
def delete_investigation(investigation_id: int, db: Session = Depends(get_db)):
    try:
        record = InvestigationRepository.get(db, investigation_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Investigation not found")

        InvestigationRepository.delete(db, record)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.post(
    "/{investigation_id}/timeline",
    response_model=schemas.InvestigationTimelineOut,
    status_code=201,
)
def add_timeline_entry(
    investigation_id: int,
    payload: schemas.InvestigationTimelineCreate,
    db: Session = Depends(get_db),
):
    try:
        record = InvestigationRepository.get(db, investigation_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Investigation not found")

        return InvestigationRepository.add_timeline_entry(
            db,
            investigation_id,
            note=payload.note,
            occurred_at=payload.occurred_at,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{investigation_id}/timeline/{entry_id}", status_code=204)
def delete_timeline_entry(
    investigation_id: int,
    entry_id: int,
    db: Session = Depends(get_db),
):
    try:
        entry = InvestigationRepository.get_timeline_entry(db, entry_id)

        if entry is None or entry.investigation_id != investigation_id:
            raise HTTPException(status_code=404, detail="Timeline entry not found")

        InvestigationRepository.delete_timeline_entry(db, entry)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.post(
    "/{investigation_id}/evidence",
    response_model=schemas.InvestigationEvidenceOut,
    status_code=201,
)
def add_evidence(
    investigation_id: int,
    payload: schemas.InvestigationEvidenceCreate,
    db: Session = Depends(get_db),
):
    try:
        record = InvestigationRepository.get(db, investigation_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Investigation not found")

        return InvestigationRepository.add_evidence(
            db,
            investigation_id,
            title=payload.title,
            description=payload.description,
            source_type=payload.source_type,
            reference=payload.reference,
            added_by=payload.added_by,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{investigation_id}/evidence/{evidence_id}", status_code=204)
def delete_evidence(
    investigation_id: int,
    evidence_id: int,
    db: Session = Depends(get_db),
):
    try:
        item = InvestigationRepository.get_evidence(db, evidence_id)

        if item is None or item.investigation_id != investigation_id:
            raise HTTPException(status_code=404, detail="Evidence item not found")

        InvestigationRepository.delete_evidence(db, item)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")
