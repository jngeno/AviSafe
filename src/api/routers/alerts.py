"""
Alert Centre endpoints -- alerts are computed live from real data
(see src/api/services/alert_service.py) rather than stored; only
acknowledgement is persisted.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import AlertAcknowledgementRepository

from .. import schemas
from ..services import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[schemas.AlertOut])
def list_alerts(
    severity: str | None = None,
    category: str | None = None,
    include_acknowledged: bool = False,
    db: Session = Depends(get_db),
) -> list:
    try:
        alerts = alert_service.sort_alerts(alert_service.compute_alerts(db))

        if not include_acknowledged:
            acknowledged = AlertAcknowledgementRepository.acknowledged_keys(db)
            alerts = [a for a in alerts if a.alert_key not in acknowledged]

        if severity:
            alerts = [a for a in alerts if a.severity == severity]

        if category:
            alerts = [a for a in alerts if a.category == category]

        return [
            schemas.AlertOut(
                alert_key=a.alert_key,
                category=a.category,
                severity=a.severity,
                title=a.title,
                description=a.description,
                recommended_action=a.recommended_action,
                source_type=a.source_type,
                source_id=a.source_id,
                relevant_date=a.relevant_date,
            )
            for a in alerts
        ]
    except Exception:
        return []


@router.post("/{alert_key}/acknowledge", response_model=schemas.AlertAcknowledgementOut)
def acknowledge_alert(
    alert_key: str,
    payload: schemas.AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
):
    try:
        return AlertAcknowledgementRepository.acknowledge(
            db, alert_key, acknowledged_by=payload.acknowledged_by
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{alert_key}/acknowledge", status_code=204)
def unacknowledge_alert(alert_key: str, db: Session = Depends(get_db)):
    try:
        found = AlertAcknowledgementRepository.unacknowledge(db, alert_key)
        if not found:
            raise HTTPException(status_code=404, detail="Acknowledgement not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/acknowledged", response_model=list[schemas.AlertAcknowledgementOut])
def list_acknowledged(db: Session = Depends(get_db)) -> list:
    try:
        return AlertAcknowledgementRepository.list(db)
    except Exception:
        return []
