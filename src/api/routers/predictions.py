"""
Live single-record and batch (CSV import) prediction endpoints.
"""

from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from src.database.base import get_db
from src.database.repositories import ExperimentRepository

from .. import schemas
from ..services.prediction_service import (
    MAX_BATCH_ROWS,
    PredictionError,
    predict,
    predict_many,
)

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


@router.post("/batch", response_model=schemas.BatchPredictionResponse)
async def create_batch_predictions(
    experiment_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Run every row of an uploaded CSV through the given experiment's
    model. Columns should match (a subset of) the experiment's
    feature_names -- see GET /experiments/{id} for the expected names
    and, for categorical columns, the valid category values.
    """

    experiment = ExperimentRepository.get(db, experiment_id)

    if experiment is None:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only .csv files are supported")

    raw_bytes = await file.read()

    try:
        dataframe = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Could not parse CSV: {exc}"
        ) from exc

    if dataframe.empty:
        raise HTTPException(status_code=422, detail="CSV has no rows")

    if len(dataframe) > MAX_BATCH_ROWS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"CSV has {len(dataframe)} rows; batch import is capped "
                f"at {MAX_BATCH_ROWS}"
            ),
        )

    rows = dataframe.where(pd.notna(dataframe), None).to_dict(orient="records")

    results, errors = predict_many(db, experiment, rows)

    if not results and errors:
        raise HTTPException(
            status_code=422,
            detail={"message": "All rows failed to predict", "errors": errors[:5]},
        )

    return {"results": results, "errors": errors}
