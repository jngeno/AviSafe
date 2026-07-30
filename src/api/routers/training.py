"""
Training job trigger and status endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.config import Config
from src.database.base import get_db
from src.database.repositories import TrainingJobRepository

from .. import schemas
from ..services.training_service import run_training_job

router = APIRouter(prefix="/training", tags=["training"])


@router.post("/jobs", response_model=schemas.TrainingJobOut, status_code=202)
def create_training_job(
    payload: schemas.TrainingJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Trigger a training run in the background and return immediately
    with a job to poll. Defaults to data/NTSB.csv when no csv_path is
    given.
    """

    config = Config()

    csv_path = payload.csv_path or str(config.project_root / "data" / "NTSB.csv")

    job = TrainingJobRepository.create(
        db, payload.target_column, payload.model_candidates
    )

    background_tasks.add_task(
        run_training_job,
        job.id,
        csv_path,
        payload.target_column,
        payload.model_candidates,
    )

    return job


@router.get("/jobs", response_model=list[schemas.TrainingJobOut])
def list_training_jobs(limit: int = 50, db: Session = Depends(get_db)) -> list:
    return TrainingJobRepository.list(db, limit=limit)


@router.get("/jobs/{job_id}", response_model=schemas.TrainingJobOut)
def get_training_job(job_id: str, db: Session = Depends(get_db)):
    job = TrainingJobRepository.get(db, job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Training job not found")

    return job
