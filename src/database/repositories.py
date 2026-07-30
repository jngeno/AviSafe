"""
Repositories for AviSafe's database-backed entities.

Each repository is a thin, explicit wrapper around a Session -- no
active-record magic, no hidden queries. Callers (API routes, services)
pass in the Session they already have from the get_db dependency.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.models.experiment import Experiment as ExperimentMeta
from src.pipeline.train_pipeline import PipelineResults

from . import models


class ExperimentRepository:
    """
    Persists a completed training run (experiment + its explainability
    outputs) and reads experiments back out.
    """

    @staticmethod
    def create_from_pipeline_results(
        db: Session,
        results: PipelineResults,
        experiment_meta: ExperimentMeta | None = None,
    ) -> models.Experiment:
        """
        Persist a PipelineResults object (and the Experiment metadata
        the pipeline generated for it) as a full experiment record,
        including its feature importances, patterns, and
        recommendations.
        """

        meta = experiment_meta or results.experiment

        record = models.Experiment(
            experiment_id=meta.experiment_id,
            model_name=meta.model_name,
            dataset_name=meta.dataset_name,
            target_column=meta.target_column,
            model_path=str(results.model_path),
            random_state=meta.random_state,
            parameters=_json_safe(meta.parameters),
            cv_metrics=_json_safe(results.cv_metrics),
            test_metrics=_json_safe(results.test_metrics),
            feature_names=meta.feature_names,
            categorical_encodings=_json_safe(results.categorical_encodings),
            target_label_map=_json_safe(results.target_label_map or {}),
            training_time=meta.training_time,
        )

        for _, row in results.feature_importance.reset_index(drop=True).iterrows():
            record.feature_importances.append(
                models.FeatureImportanceRecord(
                    feature=row["Feature"],
                    importance=float(row["Importance"]),
                    rank=int(row.name) + 1,
                )
            )

        for _, row in results.recommendations.iterrows():
            record.recommendations.append(
                models.SafetyRecommendationRecord(
                    category=row["Category"],
                    priority=row["Priority"],
                    recommendation=row["Recommendation"],
                    stakeholder=row["Stakeholder"],
                    confidence=float(row["Confidence"]),
                    evidence=[
                        item.strip() for item in row["Evidence"].split(",")
                    ],
                )
            )

        for _, row in results.patterns.iterrows():
            record.patterns.append(
                models.CategoryPatternRecord(
                    category=row["Category"],
                    top_features=[
                        item.strip() for item in row["Top Features"].split(",")
                    ],
                    average_importance=float(row["Average Importance"]),
                    occurrences=int(row["Occurrences"]),
                    confidence=float(row["Confidence"]),
                )
            )

        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def get(db: Session, experiment_pk: int) -> models.Experiment | None:
        stmt = (
            select(models.Experiment)
            .where(models.Experiment.id == experiment_pk)
            .options(
                selectinload(models.Experiment.feature_importances),
                selectinload(models.Experiment.recommendations),
                selectinload(models.Experiment.patterns),
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def list(
        db: Session,
        target_column: str | None = None,
        limit: int = 50,
    ) -> list[models.Experiment]:
        stmt = select(models.Experiment).order_by(
            models.Experiment.started_at.desc()
        )

        if target_column:
            stmt = stmt.where(models.Experiment.target_column == target_column)

        stmt = stmt.limit(limit)

        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_latest(
        db: Session, target_column: str | None = None
    ) -> models.Experiment | None:
        stmt = select(models.Experiment).order_by(
            models.Experiment.started_at.desc()
        )

        if target_column:
            stmt = stmt.where(models.Experiment.target_column == target_column)

        stmt = stmt.limit(1).options(
            selectinload(models.Experiment.feature_importances),
            selectinload(models.Experiment.recommendations),
            selectinload(models.Experiment.patterns),
        )

        return db.execute(stmt).scalar_one_or_none()


class TrainingJobRepository:
    """
    Tracks background training jobs triggered via the API.
    """

    @staticmethod
    def create(
        db: Session,
        target_column: str,
        model_candidates: list[str] | None,
    ) -> models.TrainingJob:
        job = models.TrainingJob(
            target_column=target_column,
            model_candidates=model_candidates,
            status="pending",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def get(db: Session, job_id: str) -> models.TrainingJob | None:
        return db.get(models.TrainingJob, job_id)

    @staticmethod
    def list(db: Session, limit: int = 50) -> list[models.TrainingJob]:
        stmt = (
            select(models.TrainingJob)
            .order_by(models.TrainingJob.created_at.desc())
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def mark_running(db: Session, job: models.TrainingJob) -> None:
        from datetime import UTC, datetime

        job.status = "running"
        job.started_at = datetime.now(UTC)
        db.commit()

    @staticmethod
    def mark_completed(
        db: Session, job: models.TrainingJob, experiment: models.Experiment
    ) -> None:
        from datetime import UTC, datetime

        job.status = "completed"
        job.experiment_id = experiment.id
        job.finished_at = datetime.now(UTC)
        db.commit()

    @staticmethod
    def mark_failed(db: Session, job: models.TrainingJob, error_message: str) -> None:
        from datetime import UTC, datetime

        job.status = "failed"
        job.error_message = error_message[:2000]
        job.finished_at = datetime.now(UTC)
        db.commit()


class PredictionRepository:
    """
    Logs live single-record predictions made through the API.
    """

    @staticmethod
    def create(
        db: Session,
        experiment_id: int,
        input_features: dict[str, Any],
        predicted_class: str,
        probabilities: dict[str, float],
        shap_explanation: list[dict[str, Any]],
    ) -> models.PredictionLog:
        record = models.PredictionLog(
            experiment_id=experiment_id,
            input_features=_json_safe(input_features),
            predicted_class=predicted_class,
            probabilities=_json_safe(probabilities),
            shap_explanation=_json_safe(shap_explanation),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def list_for_experiment(
        db: Session, experiment_id: int, limit: int = 50
    ) -> list[models.PredictionLog]:
        stmt = (
            select(models.PredictionLog)
            .where(models.PredictionLog.experiment_id == experiment_id)
            .order_by(models.PredictionLog.created_at.desc())
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())


def _json_safe(value: Any) -> Any:
    """
    Recursively convert numpy/pandas scalar types (which the ML layer
    hands back everywhere) into plain JSON-serializable Python values.
    """

    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}

    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]

    if isinstance(value, Path):
        return str(value)

    if hasattr(value, "item"):
        return value.item()

    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    return value
