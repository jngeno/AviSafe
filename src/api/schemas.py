"""
Pydantic request/response schemas for the AviSafe API.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FeatureImportanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature: str
    importance: float
    rank: int


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    experiment_id: int | None
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
    source: str = "rule_engine"
    created_at: datetime | None = None

    # Enhanced depth fields
    impact_assessment: str = ""
    implementation_steps: list[str] = []
    affected_systems: list[str] = []
    regulatory_framework: str = ""
    industry_precedent: str = ""
    risk_mitigation_factor: float = 0.0
    related_accidents_count: int = 0


class RecommendationUpdate(BaseModel):
    status: str | None = None
    assigned_officer: str | None = None
    due_date: date | None = None


class RecommendationCreate(BaseModel):
    category: str
    priority: str
    recommendation: str
    stakeholder: str
    confidence: float = 1.0
    evidence: list[str] = []
    icao_reference: str = ""
    hfacs_classification: str = ""
    swiss_cheese_layer: str = ""
    experiment_id: int | None = None


class RecommendationSimulateRequest(BaseModel):
    experiment_id: int
    features: dict[str, Any]


class SimulatedRecommendation(BaseModel):
    category: str
    priority: str
    recommendation: str
    stakeholder: str
    confidence: float
    evidence: list[str]
    icao_reference: str
    hfacs_classification: str
    swiss_cheese_layer: str


class RecommendationSimulateResponse(BaseModel):
    predicted_class: str
    probabilities: dict[str, float]
    dominant_features: list[str]
    recommendations: list[SimulatedRecommendation]


class RiskRegisterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    description: str
    likelihood: int
    severity: int
    risk_score: int
    risk_level: str
    status: str
    owner: str
    mitigation: str
    linked_recommendation_id: int | None
    review_date: date | None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RiskRegisterCreate(BaseModel):
    title: str
    category: str = ""
    description: str = ""
    likelihood: int = Field(ge=1, le=5)
    severity: int = Field(ge=1, le=5)
    status: str = "Identified"
    owner: str = ""
    mitigation: str = ""
    linked_recommendation_id: int | None = None
    review_date: date | None = None


class RiskRegisterUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    description: str | None = None
    likelihood: int | None = Field(default=None, ge=1, le=5)
    severity: int | None = Field(default=None, ge=1, le=5)
    status: str | None = None
    owner: str | None = None
    mitigation: str | None = None
    linked_recommendation_id: int | None = None
    review_date: date | None = None


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    event_type: str
    category: str
    severity: str
    status: str
    description: str
    occurred_at: date | None
    location: str
    airport: str
    aircraft: str
    operator: str
    flight_phase: str
    weather: str
    assigned_investigator: str
    reported_by: str
    linked_recommendation_id: int | None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class IncidentCreate(BaseModel):
    title: str
    event_type: str = "Safety Report"
    category: str = ""
    severity: str = "Medium"
    status: str = "New"
    description: str = ""
    occurred_at: date | None = None
    location: str = ""
    airport: str = ""
    aircraft: str = ""
    operator: str = ""
    flight_phase: str = ""
    weather: str = ""
    assigned_investigator: str = ""
    reported_by: str = ""
    linked_recommendation_id: int | None = None


class IncidentUpdate(BaseModel):
    title: str | None = None
    event_type: str | None = None
    category: str | None = None
    severity: str | None = None
    status: str | None = None
    description: str | None = None
    occurred_at: date | None = None
    location: str | None = None
    airport: str | None = None
    aircraft: str | None = None
    operator: str | None = None
    flight_phase: str | None = None
    weather: str | None = None
    assigned_investigator: str | None = None
    reported_by: str | None = None
    linked_recommendation_id: int | None = None


class InvestigationTimelineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    investigation_id: int
    occurred_at: date | None
    note: str
    created_at: datetime | None = None


class InvestigationTimelineCreate(BaseModel):
    note: str
    occurred_at: date | None = None


class InvestigationEvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    investigation_id: int
    title: str
    description: str
    source_type: str
    reference: str
    added_by: str
    created_at: datetime | None = None


class InvestigationEvidenceCreate(BaseModel):
    title: str
    description: str = ""
    source_type: str = "Other"
    reference: str = ""
    added_by: str = ""


class InvestigationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    incident: IncidentOut | None = None
    lead_investigator: str
    status: str
    summary: str
    root_cause: str
    contributing_factors: list[str]
    started_at: date | None
    target_completion: date | None
    completed_at: date | None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    timeline: list[InvestigationTimelineOut] = []
    evidence: list[InvestigationEvidenceOut] = []


class InvestigationCreate(BaseModel):
    incident_id: int
    lead_investigator: str = ""
    status: str = "Open"
    summary: str = ""
    root_cause: str = ""
    contributing_factors: list[str] = []
    started_at: date | None = None
    target_completion: date | None = None
    completed_at: date | None = None


class InvestigationUpdate(BaseModel):
    lead_investigator: str | None = None
    status: str | None = None
    summary: str | None = None
    root_cause: str | None = None
    contributing_factors: list[str] | None = None
    started_at: date | None = None
    target_completion: date | None = None
    completed_at: date | None = None


class SafetyActionCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action_id: int
    author: str
    text: str
    created_at: datetime | None = None


class SafetyActionCommentCreate(BaseModel):
    author: str = ""
    text: str


class SafetyActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    linked_recommendation_id: int | None
    owner: str
    priority: str
    status: str
    due_date: date | None
    verification_notes: str
    closed_at: date | None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    comments: list[SafetyActionCommentOut] = []


class SafetyActionCreate(BaseModel):
    title: str
    description: str = ""
    linked_recommendation_id: int | None = None
    owner: str = ""
    priority: str = "Medium"
    status: str = "Open"
    due_date: date | None = None
    verification_notes: str = ""


class SafetyActionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    owner: str | None = None
    priority: str | None = None
    status: str | None = None
    due_date: date | None = None
    verification_notes: str | None = None


class AlertOut(BaseModel):
    alert_key: str
    category: str
    severity: str
    title: str
    description: str
    recommended_action: str
    source_type: str
    source_id: int
    relevant_date: date | None = None


class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: str = ""


class AlertAcknowledgementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alert_key: str
    acknowledged_by: str
    acknowledged_at: datetime | None = None


class PatternOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str
    top_features: list[str]
    average_importance: float
    occurrences: int
    confidence: float
    lime_top_features: list[str] = []
    consensus_features: list[str] = []
    agreement_ratio: float | None = None


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


class AirportOut(BaseModel):
    ident: str
    type: str
    name: str
    latitude: float
    longitude: float
    elevation_ft: float | None
    continent: str | None
    country: str | None
    region: str | None
    municipality: str | None
    scheduled_service: bool
    icao_code: str | None
    iata_code: str | None
    gps_code: str | None
    local_code: str | None
    wikipedia_link: str | None


class AirportSearchResult(BaseModel):
    results: list[AirportOut]
    total: int


class CountryCount(BaseModel):
    code: str
    count: int


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
    missing_values: int = 0
    duplicate_rows: int = 0
    column_names: list[str] = []


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
