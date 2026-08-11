"""
SQLAlchemy ORM models for AviSafe.

One row in `experiments` per completed training run (mirrors the
Experiment dataclass in src/models/experiment.py, but is the
database-backed source of truth once the API is involved). Everything
the explainability layer produces for that run -- global feature
importance, per-category patterns, and safety recommendations -- is
stored as child rows so a full experiment can be reconstructed with a
single query.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    experiment_id: Mapped[str] = mapped_column(
        String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True
    )

    model_name: Mapped[str] = mapped_column(String(100))

    dataset_name: Mapped[str] = mapped_column(String(255))

    target_column: Mapped[str] = mapped_column(String(100), index=True)

    model_path: Mapped[str] = mapped_column(String(500))

    random_state: Mapped[int] = mapped_column(Integer, default=42)

    parameters: Mapped[dict] = mapped_column(JSONB, default=dict)

    cv_metrics: Mapped[dict] = mapped_column(JSONB, default=dict)

    test_metrics: Mapped[dict] = mapped_column(JSONB, default=dict)

    feature_names: Mapped[list] = mapped_column(JSONB, default=list)

    categorical_encodings: Mapped[dict] = mapped_column(JSONB, default=dict)

    target_label_map: Mapped[dict] = mapped_column(JSONB, default=dict)

    training_time: Mapped[float] = mapped_column(Float, default=0.0)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    feature_importances: Mapped[list["FeatureImportanceRecord"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan"
    )

    recommendations: Mapped[list["SafetyRecommendationRecord"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan"
    )

    patterns: Mapped[list["CategoryPatternRecord"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan"
    )

    predictions: Mapped[list["PredictionLog"]] = relationship(
        back_populates="experiment"
    )


class FeatureImportanceRecord(Base):
    __tablename__ = "feature_importances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )

    feature: Mapped[str] = mapped_column(String(255))

    importance: Mapped[float] = mapped_column(Float)

    rank: Mapped[int] = mapped_column(Integer)

    experiment: Mapped["Experiment"] = relationship(
        back_populates="feature_importances"
    )


class SafetyRecommendationRecord(Base):
    __tablename__ = "safety_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )

    category: Mapped[str] = mapped_column(String(100))

    priority: Mapped[str] = mapped_column(String(20))

    recommendation: Mapped[str] = mapped_column(Text)

    stakeholder: Mapped[str] = mapped_column(String(100))

    confidence: Mapped[float] = mapped_column(Float)

    evidence: Mapped[list] = mapped_column(JSONB, default=list)

    icao_reference: Mapped[str] = mapped_column(String(255), default="")

    hfacs_classification: Mapped[str] = mapped_column(String(255), default="")

    swiss_cheese_layer: Mapped[str] = mapped_column(String(100), default="")

    status: Mapped[str] = mapped_column(String(20), default="Open", index=True)

    assigned_officer: Mapped[str | None] = mapped_column(String(150), nullable=True)

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    experiment: Mapped["Experiment"] = relationship(back_populates="recommendations")


class CategoryPatternRecord(Base):
    __tablename__ = "category_patterns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )

    category: Mapped[str] = mapped_column(String(100))

    top_features: Mapped[list] = mapped_column(JSONB, default=list)

    average_importance: Mapped[float] = mapped_column(Float)

    occurrences: Mapped[int] = mapped_column(Integer)

    confidence: Mapped[float] = mapped_column(Float)

    experiment: Mapped["Experiment"] = relationship(back_populates="patterns")


class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)

    target_column: Mapped[str] = mapped_column(String(100))

    model_candidates: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    experiment_id: Mapped[int | None] = mapped_column(
        ForeignKey("experiments.id"), nullable=True
    )

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    experiment: Mapped["Experiment | None"] = relationship()


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id"), index=True
    )

    input_features: Mapped[dict] = mapped_column(JSONB)

    predicted_class: Mapped[str] = mapped_column(String(100))

    probabilities: Mapped[dict] = mapped_column(JSONB)

    shap_explanation: Mapped[list] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    experiment: Mapped["Experiment"] = relationship(back_populates="predictions")
