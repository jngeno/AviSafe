"""
Live single-record prediction endpoint.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import ExperimentRepository

from .. import schemas
from ..services.prediction_service import PredictionError, predict

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.post("", response_model=schemas.PredictionResponse)
def create_prediction(
    payload: schemas.PredictionRequest, db: Session = Depends(get_db)
):
    experiment = ExperimentRepository.get(db, payload.experiment_id)

    if experiment is None:
        raise HTTPException(status_code=404, detail="Experiment not found")

    try:
        record = predict(db, experiment, payload.features)
    except PredictionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return record
