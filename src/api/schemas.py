"""
Pydantic request/response schemas for the AviSafe API.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class FeatureImportanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature: str
    importance: float
    rank: int


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    experiment_id: int
    category: str
    priority: str
    recommendation: str
    stakeholder: str
    confidence: float
    evidence: list[str]
    icao_reference: str
    hfacs_classification: str
    swiss_cheese_layer: str
    status: str
    assigned_officer: str | None
    due_date: date | None


class RecommendationUpdate(BaseModel):
    status: str | None = None
    assigned_officer: str | None = None
    due_date: date | None = None


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
    input_features: dict[str, Any]
    predicted_class: str
    probabilities: dict[str, float]
    shap_explanation: list[dict[str, Any]]
    created_at: datetime


class BatchPredictionError(BaseModel):
    row: int
    error: str


class BatchPredictionResponse(BaseModel):
    results: list[PredictionResponse]
    errors: list[BatchPredictionError]


class AircraftAnalyticsOut(BaseModel):
    manufacturer: str
    total_accidents: int
    total_incidents: int
    fatal_accidents: int
    category_breakdown: dict[str, int]
    top_flight_phase: str | None
    avg_seats: float | None


class HotspotPoint(BaseModel):
    latitude: float
    longitude: float
    category: str
    count: int


class DatasetInfo(BaseModel):
    name: str
    path: str
    rows: int
    columns: int
    date_range: str
    accident_categories_covered: list[str]
    size_mb: float
    status: str


class ReportSummary(BaseModel):
    filename: str
    target_column: str | None
    experiment_id: str | None
    generated_at: datetime
    size_kb: float


class DashboardSummary(BaseModel):
    total_accidents: int
    total_incidents: int
    active_datasets: int
    models_trained: int
    best_model: str | None
    best_accuracy: float | None
    open_recommendations: int
    high_risk_categories: list[str]
    category_breakdown: dict[str, int]
    monthly_trend: list[dict[str, Any]]
    flight_phase_breakdown: dict[str, int]
    weather_breakdown: dict[str, int]
