"""
Pydantic request/response schemas for the AviSafe API.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class FeatureImportanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature: str
    importance: float
    rank: int


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str
    priority: str
    recommendation: str
    stakeholder: str
    confidence: float
    evidence: list[str]


class PatternOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str
    top_features: list[str]
    average_importance: float
    occurrences: int
    confidence: float


class ExperimentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    experiment_id: str
    model_name: str
    dataset_name: str
    target_column: str
    cv_metrics: dict[str, Any]
    test_metrics: dict[str, Any]
    training_time: float
    started_at: datetime
    finished_at: datetime | None


class ExperimentDetail(ExperimentSummary):
    model_config = ConfigDict(from_attributes=True)

    model_path: str
    random_state: int
    parameters: dict[str, Any]
    feature_names: list[str]
    categorical_encodings: dict[str, dict[str, int]]
    feature_importances: list[FeatureImportanceOut]
    recommendations: list[RecommendationOut]
    patterns: list[PatternOut]


class TrainingJobCreate(BaseModel):
    target_column: str = "Accident_Category"
    model_candidates: list[str] | None = None
    csv_path: str | None = None


class TrainingJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    target_column: str
    model_candidates: list[str] | None
    experiment_id: int | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class PredictionRequest(BaseModel):
    experiment_id: int
    features: dict[str, Any]


class PredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    experiment_id: int
    predicted_class: str
    probabilities: dict[str, float]
    shap_explanation: list[dict[str, Any]]
    created_at: datetime
