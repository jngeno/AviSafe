"""
Experiment (training run) read endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import ExperimentRepository

from .. import schemas

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("", response_model=list[schemas.ExperimentSummary])
def list_experiments(
    target_column: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list:
    try:
        return ExperimentRepository.list(db, target_column=target_column, limit=limit)
    except Exception:
        # Database unavailable - return empty list
        return []


@router.get("/latest", response_model=schemas.ExperimentDetail)
def get_latest_experiment(
    target_column: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        experiment = ExperimentRepository.get_latest(db, target_column=target_column)

        if experiment is None:
            raise HTTPException(status_code=404, detail="No experiments found")

        return experiment
    except HTTPException:
        raise
    except Exception:
        # Database unavailable
        raise HTTPException(status_code=404, detail="No experiments found")


@router.get("/{experiment_id}", response_model=schemas.ExperimentDetail)
def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    try:
        experiment = ExperimentRepository.get(db, experiment_id)

        if experiment is None:
            raise HTTPException(status_code=404, detail="Experiment not found")

        return experiment
    except HTTPException:
        raise
    except Exception:
        # Database unavailable
        raise HTTPException(status_code=404, detail="Experiment not found")
