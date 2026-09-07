"""
Training orchestration service for the API layer.

Runs TrainingPipeline() as a background job and persists the outcome
(or failure) against the triggering TrainingJob row. Each invocation
opens its own database session, since it runs outside the request /
response cycle that would normally supply one via the get_db
dependency (that session is closed as soon as the HTTP response is
sent, long before a background training run finishes).
"""

from __future__ import annotations

from src.core.config import config
from src.core.logger import LoggerManager
from src.database.base import SessionLocal
from src.database.repositories import ExperimentRepository, TrainingJobRepository
from src.pipeline.train_pipeline import TrainingPipeline

logger = LoggerManager.get_logger(__name__)


def run_training_job(
    job_id: str,
    csv_path: str,
    target_column: str,
    model_candidates: list[str] | None,
) -> None:
    """
    Execute a training run and persist the outcome against the given
    TrainingJob. Intended to be scheduled as a FastAPI background task.
    """

    db = SessionLocal()

    try:
        job = TrainingJobRepository.get(db, job_id)

        if job is None:
            logger.error("Training job %s not found", job_id)
            return

        TrainingJobRepository.mark_running(db, job)

        pipeline = TrainingPipeline()

        results = pipeline.run(
            csv_path,
            target_column=target_column,
            model_candidates=model_candidates,
            models_dir=config.models_dir,
        )

        experiment = ExperimentRepository.create_from_pipeline_results(db, results)

        TrainingJobRepository.mark_completed(db, job, experiment)

        logger.info(
            "Training job %s completed (experiment %s, model %s)",
            job_id,
            experiment.experiment_id,
            experiment.model_name,
        )

    except Exception as exc:  # noqa: BLE001 -- must not crash the background thread

        logger.exception("Training job %s failed", job_id)

        job = TrainingJobRepository.get(db, job_id)

        if job is not None:
            TrainingJobRepository.mark_failed(db, job, str(exc))

    finally:
        db.close()
