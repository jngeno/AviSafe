"""
Repositories for AviSafe's database-backed entities.

Each repository is a thin, explicit wrapper around a Session -- no
active-record magic, no hidden queries. Callers (API routes, services)
pass in the Session they already have from the get_db dependency.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import or_, select
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
                    icao_reference=row.get("ICAO Reference", "") or "",
                    hfacs_classification=row.get("HFACS Classification", "") or "",
                    swiss_cheese_layer=row.get("Swiss Cheese Layer", "") or "",
                )
            )

        # SHAP+LIME cross-validation, keyed by category so it can be
        # attached to the matching CategoryPatternRecord below. Older
        # pipelines (or a results object without this field) simply
        # produce an empty map -- every downstream lookup then falls
        # back to "not available", never a fabricated agreement score.
        causal_map = getattr(results, "causal_pattern_map", None)
        causal_by_category: dict[str, Any] = {}
        if causal_map is not None and not causal_map.empty:
            for _, causal_row in causal_map.iterrows():
                causal_by_category[causal_row["Category"]] = causal_row

        for _, row in results.patterns.iterrows():
            causal_row = causal_by_category.get(row["Category"])
            record.patterns.append(
                models.CategoryPatternRecord(
                    category=row["Category"],
                    top_features=[
                        item.strip() for item in row["Top Features"].split(",")
                    ],
                    average_importance=float(row["Average Importance"]),
                    occurrences=int(row["Occurrences"]),
                    confidence=float(row["Confidence"]),
                    lime_top_features=(
                        [f.strip() for f in causal_row["LIME Top Features"].split(",") if f.strip()]
                        if causal_row is not None
                        else []
                    ),
                    consensus_features=(
                        [
                            f.strip()
                            for f in causal_row["Consensus Features"].split(",")
                            if f.strip() and f.strip() != "(none)"
                        ]
                        if causal_row is not None
                        else []
                    ),
                    agreement_ratio=(
                        float(causal_row["Agreement"]) if causal_row is not None else None
                    ),
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


class RecommendationRepository:
    """
    Read/filter/workflow operations for safety recommendations across
    all experiments -- backs the Safety Recommendation Centre.
    """

    @staticmethod
    def list(
        db: Session,
        *,
        category: str | None = None,
        priority: str | None = None,
        status: str | None = None,
        search: str | None = None,
        limit: int = 200,
    ) -> list[models.SafetyRecommendationRecord]:

        stmt = select(models.SafetyRecommendationRecord).order_by(
            models.SafetyRecommendationRecord.id.desc()
        )

        if category:
            stmt = stmt.where(models.SafetyRecommendationRecord.category == category)

        if priority:
            stmt = stmt.where(models.SafetyRecommendationRecord.priority == priority)

        if status:
            stmt = stmt.where(models.SafetyRecommendationRecord.status == status)

        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    models.SafetyRecommendationRecord.recommendation.ilike(pattern),
                    models.SafetyRecommendationRecord.stakeholder.ilike(pattern),
                    models.SafetyRecommendationRecord.icao_reference.ilike(pattern),
                )
            )

        stmt = stmt.limit(limit)

        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get(
        db: Session, recommendation_id: int
    ) -> models.SafetyRecommendationRecord | None:
        return db.get(models.SafetyRecommendationRecord, recommendation_id)

    @staticmethod
    def update_workflow(
        db: Session,
        record: models.SafetyRecommendationRecord,
        *,
        status: str | None = None,
        assigned_officer: str | None = None,
        due_date: date | None = None,
    ) -> models.SafetyRecommendationRecord:

        if status is not None:
            record.status = status

        if assigned_officer is not None:
            record.assigned_officer = assigned_officer

        if due_date is not None:
            record.due_date = due_date

        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def create(
        db: Session,
        *,
        category: str,
        priority: str,
        recommendation: str,
        stakeholder: str,
        confidence: float = 1.0,
        evidence: list[str] | None = None,
        icao_reference: str = "",
        hfacs_classification: str = "",
        swiss_cheese_layer: str = "",
        experiment_id: int | None = None,
        source: str = "manual",
    ) -> models.SafetyRecommendationRecord:
        """
        Insert a recommendation that did not come from
        `RecommendationEngine.generate()` -- either authored directly by a
        user, or accepted from a simulated-scenario preview.
        """

        record = models.SafetyRecommendationRecord(
            experiment_id=experiment_id,
            category=category,
            priority=priority,
            recommendation=recommendation,
            stakeholder=stakeholder,
            confidence=confidence,
            evidence=evidence or [],
            icao_reference=icao_reference,
            hfacs_classification=hfacs_classification,
            swiss_cheese_layer=swiss_cheese_layer,
            source=source,
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def delete(db: Session, record: models.SafetyRecommendationRecord) -> None:
        db.delete(record)
        db.commit()


def _risk_level(score: int) -> str:
    """
    Buckets a 1-25 likelihood x severity score into the standard
    four-tier ICAO-style risk matrix band.
    """
    if score >= 16:
        return "Critical"
    if score >= 10:
        return "High"
    if score >= 5:
        return "Moderate"
    return "Low"


class RiskRegisterRepository:
    """
    CRUD + workflow operations for the safety risk register -- a
    living record of identified risks, independent of any single
    experiment, tracked through mitigation to closure.
    """

    @staticmethod
    def list(
        db: Session,
        *,
        category: str | None = None,
        status: str | None = None,
        risk_level: str | None = None,
        search: str | None = None,
        limit: int = 200,
    ) -> list[models.RiskRegisterEntry]:

        stmt = select(models.RiskRegisterEntry).order_by(
            models.RiskRegisterEntry.risk_score.desc(),
            models.RiskRegisterEntry.id.desc(),
        )

        if category:
            stmt = stmt.where(models.RiskRegisterEntry.category == category)

        if status:
            stmt = stmt.where(models.RiskRegisterEntry.status == status)

        if risk_level:
            stmt = stmt.where(models.RiskRegisterEntry.risk_level == risk_level)

        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    models.RiskRegisterEntry.title.ilike(pattern),
                    models.RiskRegisterEntry.description.ilike(pattern),
                    models.RiskRegisterEntry.owner.ilike(pattern),
                )
            )

        stmt = stmt.limit(limit)

        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get(db: Session, entry_id: int) -> models.RiskRegisterEntry | None:
        return db.get(models.RiskRegisterEntry, entry_id)

    @staticmethod
    def create(
        db: Session,
        *,
        title: str,
        category: str = "",
        description: str = "",
        likelihood: int,
        severity: int,
        status: str = "Identified",
        owner: str = "",
        mitigation: str = "",
        linked_recommendation_id: int | None = None,
        review_date: date | None = None,
    ) -> models.RiskRegisterEntry:
        score = likelihood * severity

        record = models.RiskRegisterEntry(
            title=title,
            category=category,
            description=description,
            likelihood=likelihood,
            severity=severity,
            risk_score=score,
            risk_level=_risk_level(score),
            status=status,
            owner=owner,
            mitigation=mitigation,
            linked_recommendation_id=linked_recommendation_id,
            review_date=review_date,
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def update(
        db: Session,
        record: models.RiskRegisterEntry,
        *,
        title: str | None = None,
        category: str | None = None,
        description: str | None = None,
        likelihood: int | None = None,
        severity: int | None = None,
        status: str | None = None,
        owner: str | None = None,
        mitigation: str | None = None,
        linked_recommendation_id: int | None = None,
        review_date: date | None = None,
    ) -> models.RiskRegisterEntry:

        if title is not None:
            record.title = title

        if category is not None:
            record.category = category

        if description is not None:
            record.description = description

        if status is not None:
            record.status = status

        if owner is not None:
            record.owner = owner

        if mitigation is not None:
            record.mitigation = mitigation

        if linked_recommendation_id is not None:
            record.linked_recommendation_id = linked_recommendation_id

        if review_date is not None:
            record.review_date = review_date

        if likelihood is not None:
            record.likelihood = likelihood

        if severity is not None:
            record.severity = severity

        if likelihood is not None or severity is not None:
            record.risk_score = record.likelihood * record.severity
            record.risk_level = _risk_level(record.risk_score)

        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def delete(db: Session, record: models.RiskRegisterEntry) -> None:
        db.delete(record)
        db.commit()


class IncidentRepository:
    """
    CRUD + workflow operations for the incident/safety-event inbox --
    backs Incident Management.
    """

    @staticmethod
    def list(
        db: Session,
        *,
        event_type: str | None = None,
        severity: str | None = None,
        status: str | None = None,
        category: str | None = None,
        search: str | None = None,
        limit: int = 200,
    ) -> list[models.IncidentRecord]:

        stmt = select(models.IncidentRecord).order_by(models.IncidentRecord.id.desc())

        if event_type:
            stmt = stmt.where(models.IncidentRecord.event_type == event_type)

        if severity:
            stmt = stmt.where(models.IncidentRecord.severity == severity)

        if status:
            stmt = stmt.where(models.IncidentRecord.status == status)

        if category:
            stmt = stmt.where(models.IncidentRecord.category == category)

        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    models.IncidentRecord.title.ilike(pattern),
                    models.IncidentRecord.description.ilike(pattern),
                    models.IncidentRecord.airport.ilike(pattern),
                    models.IncidentRecord.aircraft.ilike(pattern),
                    models.IncidentRecord.operator.ilike(pattern),
                )
            )

        stmt = stmt.limit(limit)

        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get(db: Session, incident_id: int) -> models.IncidentRecord | None:
        return db.get(models.IncidentRecord, incident_id)

    @staticmethod
    def create(
        db: Session,
        *,
        title: str,
        event_type: str = "Safety Report",
        category: str = "",
        severity: str = "Medium",
        status: str = "New",
        description: str = "",
        occurred_at: date | None = None,
        location: str = "",
        airport: str = "",
        aircraft: str = "",
        operator: str = "",
        flight_phase: str = "",
        weather: str = "",
        assigned_investigator: str = "",
        reported_by: str = "",
        linked_recommendation_id: int | None = None,
    ) -> models.IncidentRecord:

        record = models.IncidentRecord(
            title=title,
            event_type=event_type,
            category=category,
            severity=severity,
            status=status,
            description=description,
            occurred_at=occurred_at,
            location=location,
            airport=airport,
            aircraft=aircraft,
            operator=operator,
            flight_phase=flight_phase,
            weather=weather,
            assigned_investigator=assigned_investigator,
            reported_by=reported_by,
            linked_recommendation_id=linked_recommendation_id,
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def update(
        db: Session,
        record: models.IncidentRecord,
        *,
        title: str | None = None,
        event_type: str | None = None,
        category: str | None = None,
        severity: str | None = None,
        status: str | None = None,
        description: str | None = None,
        occurred_at: date | None = None,
        location: str | None = None,
        airport: str | None = None,
        aircraft: str | None = None,
        operator: str | None = None,
        flight_phase: str | None = None,
        weather: str | None = None,
        assigned_investigator: str | None = None,
        reported_by: str | None = None,
        linked_recommendation_id: int | None = None,
    ) -> models.IncidentRecord:

        if title is not None:
            record.title = title
        if event_type is not None:
            record.event_type = event_type
        if category is not None:
            record.category = category
        if severity is not None:
            record.severity = severity
        if status is not None:
            record.status = status
        if description is not None:
            record.description = description
        if occurred_at is not None:
            record.occurred_at = occurred_at
        if location is not None:
            record.location = location
        if airport is not None:
            record.airport = airport
        if aircraft is not None:
            record.aircraft = aircraft
        if operator is not None:
            record.operator = operator
        if flight_phase is not None:
            record.flight_phase = flight_phase
        if weather is not None:
            record.weather = weather
        if assigned_investigator is not None:
            record.assigned_investigator = assigned_investigator
        if reported_by is not None:
            record.reported_by = reported_by
        if linked_recommendation_id is not None:
            record.linked_recommendation_id = linked_recommendation_id

        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def delete(db: Session, record: models.IncidentRecord) -> None:
        db.delete(record)
        db.commit()


class InvestigationRepository:
    """
    CRUD + workflow operations for investigations -- each worked
    against a specific incident, with its own chronological timeline.
    """

    @staticmethod
    def list(
        db: Session,
        *,
        status: str | None = None,
        incident_id: int | None = None,
        limit: int = 200,
    ) -> list[models.InvestigationRecord]:

        stmt = (
            select(models.InvestigationRecord)
            .options(selectinload(models.InvestigationRecord.incident))
            .order_by(models.InvestigationRecord.id.desc())
        )

        if status:
            stmt = stmt.where(models.InvestigationRecord.status == status)

        if incident_id is not None:
            stmt = stmt.where(models.InvestigationRecord.incident_id == incident_id)

        stmt = stmt.limit(limit)

        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get(db: Session, investigation_id: int) -> models.InvestigationRecord | None:
        stmt = (
            select(models.InvestigationRecord)
            .options(
                selectinload(models.InvestigationRecord.incident),
                selectinload(models.InvestigationRecord.timeline),
                selectinload(models.InvestigationRecord.evidence),
            )
            .where(models.InvestigationRecord.id == investigation_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create(
        db: Session,
        *,
        incident_id: int,
        lead_investigator: str = "",
        status: str = "Open",
        summary: str = "",
        root_cause: str = "",
        contributing_factors: list[str] | None = None,
        started_at: date | None = None,
        target_completion: date | None = None,
        completed_at: date | None = None,
    ) -> models.InvestigationRecord:

        record = models.InvestigationRecord(
            incident_id=incident_id,
            lead_investigator=lead_investigator,
            status=status,
            summary=summary,
            root_cause=root_cause,
            contributing_factors=contributing_factors or [],
            started_at=started_at,
            target_completion=target_completion,
            completed_at=completed_at,
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return InvestigationRepository.get(db, record.id)

    @staticmethod
    def update(
        db: Session,
        record: models.InvestigationRecord,
        *,
        lead_investigator: str | None = None,
        status: str | None = None,
        summary: str | None = None,
        root_cause: str | None = None,
        contributing_factors: list[str] | None = None,
        started_at: date | None = None,
        target_completion: date | None = None,
        completed_at: date | None = None,
    ) -> models.InvestigationRecord:

        if lead_investigator is not None:
            record.lead_investigator = lead_investigator
        if status is not None:
            record.status = status
        if summary is not None:
            record.summary = summary
        if root_cause is not None:
            record.root_cause = root_cause
        if contributing_factors is not None:
            record.contributing_factors = contributing_factors
        if started_at is not None:
            record.started_at = started_at
        if target_completion is not None:
            record.target_completion = target_completion
        if completed_at is not None:
            record.completed_at = completed_at

        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def delete(db: Session, record: models.InvestigationRecord) -> None:
        db.delete(record)
        db.commit()

    @staticmethod
    def add_timeline_entry(
        db: Session,
        investigation_id: int,
        *,
        note: str,
        occurred_at: date | None = None,
    ) -> models.InvestigationTimelineEntry:
        entry = models.InvestigationTimelineEntry(
            investigation_id=investigation_id,
            note=note,
            occurred_at=occurred_at,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def get_timeline_entry(
        db: Session, entry_id: int
    ) -> models.InvestigationTimelineEntry | None:
        return db.get(models.InvestigationTimelineEntry, entry_id)

    @staticmethod
    def delete_timeline_entry(db: Session, entry: models.InvestigationTimelineEntry) -> None:
        db.delete(entry)
        db.commit()

    @staticmethod
    def add_evidence(
        db: Session,
        investigation_id: int,
        *,
        title: str,
        description: str = "",
        source_type: str = "Other",
        reference: str = "",
        added_by: str = "",
    ) -> models.InvestigationEvidenceItem:
        item = models.InvestigationEvidenceItem(
            investigation_id=investigation_id,
            title=title,
            description=description,
            source_type=source_type,
            reference=reference,
            added_by=added_by,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def get_evidence(db: Session, item_id: int) -> models.InvestigationEvidenceItem | None:
        return db.get(models.InvestigationEvidenceItem, item_id)

    @staticmethod
    def delete_evidence(db: Session, item: models.InvestigationEvidenceItem) -> None:
        db.delete(item)
        db.commit()


class SafetyActionRepository:
    """
    CRUD + workflow operations for safety actions -- corrective/
    preventive tasks that extend a recommendation's workflow into a
    verifiable, owned, closeable task (or stand alone).
    """

    @staticmethod
    def list(
        db: Session,
        *,
        status: str | None = None,
        priority: str | None = None,
        owner: str | None = None,
        search: str | None = None,
        limit: int = 200,
    ) -> list[models.SafetyActionRecord]:

        stmt = select(models.SafetyActionRecord).order_by(models.SafetyActionRecord.id.desc())

        if status:
            stmt = stmt.where(models.SafetyActionRecord.status == status)

        if priority:
            stmt = stmt.where(models.SafetyActionRecord.priority == priority)

        if owner:
            stmt = stmt.where(models.SafetyActionRecord.owner == owner)

        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    models.SafetyActionRecord.title.ilike(pattern),
                    models.SafetyActionRecord.description.ilike(pattern),
                )
            )

        stmt = stmt.limit(limit)

        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get(db: Session, action_id: int) -> models.SafetyActionRecord | None:
        stmt = (
            select(models.SafetyActionRecord)
            .options(selectinload(models.SafetyActionRecord.comments))
            .where(models.SafetyActionRecord.id == action_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create(
        db: Session,
        *,
        title: str,
        description: str = "",
        linked_recommendation_id: int | None = None,
        owner: str = "",
        priority: str = "Medium",
        status: str = "Open",
        due_date: date | None = None,
        verification_notes: str = "",
    ) -> models.SafetyActionRecord:

        record = models.SafetyActionRecord(
            title=title,
            description=description,
            linked_recommendation_id=linked_recommendation_id,
            owner=owner,
            priority=priority,
            status=status,
            due_date=due_date,
            verification_notes=verification_notes,
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def update(
        db: Session,
        record: models.SafetyActionRecord,
        *,
        title: str | None = None,
        description: str | None = None,
        owner: str | None = None,
        priority: str | None = None,
        status: str | None = None,
        due_date: date | None = None,
        verification_notes: str | None = None,
    ) -> models.SafetyActionRecord:

        if title is not None:
            record.title = title
        if description is not None:
            record.description = description
        if owner is not None:
            record.owner = owner
        if priority is not None:
            record.priority = priority
        if due_date is not None:
            record.due_date = due_date
        if verification_notes is not None:
            record.verification_notes = verification_notes

        if status is not None:
            record.status = status
            if status == "Closed" and record.closed_at is None:
                record.closed_at = date.today()
            elif status != "Closed":
                record.closed_at = None

        db.commit()
        db.refresh(record)

        return record

    @staticmethod
    def delete(db: Session, record: models.SafetyActionRecord) -> None:
        db.delete(record)
        db.commit()

    @staticmethod
    def add_comment(
        db: Session, action_id: int, *, author: str, text: str
    ) -> models.SafetyActionComment:
        comment = models.SafetyActionComment(action_id=action_id, author=author, text=text)
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment


class AlertAcknowledgementRepository:
    """
    Records which computed alerts (see src/api/services/alert_service.py)
    have been acknowledged, keyed by their deterministic alert_key.
    """

    @staticmethod
    def acknowledged_keys(db: Session) -> set[str]:
        stmt = select(models.AlertAcknowledgement.alert_key)
        return set(db.execute(stmt).scalars().all())

    @staticmethod
    def list(db: Session) -> list[models.AlertAcknowledgement]:
        stmt = select(models.AlertAcknowledgement).order_by(
            models.AlertAcknowledgement.acknowledged_at.desc()
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def acknowledge(
        db: Session, alert_key: str, *, acknowledged_by: str = ""
    ) -> models.AlertAcknowledgement:
        existing = db.execute(
            select(models.AlertAcknowledgement).where(
                models.AlertAcknowledgement.alert_key == alert_key
            )
        ).scalar_one_or_none()

        if existing is not None:
            return existing

        record = models.AlertAcknowledgement(alert_key=alert_key, acknowledged_by=acknowledged_by)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def unacknowledge(db: Session, alert_key: str) -> bool:
        existing = db.execute(
            select(models.AlertAcknowledgement).where(
                models.AlertAcknowledgement.alert_key == alert_key
            )
        ).scalar_one_or_none()

        if existing is None:
            return False

        db.delete(existing)
        db.commit()
        return True


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
