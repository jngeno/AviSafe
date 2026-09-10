export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

export interface Recommendation {
  id: number;
  experiment_id: number | null;
  category: string;
  priority: string;
  recommendation: string;
  stakeholder: string;
  confidence: number;
  evidence: string[];
  icao_reference: string;
  hfacs_classification: string;
  swiss_cheese_layer: string;
  status: string;
  assigned_officer: string | null;
  due_date: string | null;
  source: 'rule_engine' | 'manual';
  created_at: string | null;
}

export interface RecommendationUpdate {
  status?: string;
  assigned_officer?: string;
  due_date?: string;
}

export interface RecommendationCreate {
  category: string;
  priority: string;
  recommendation: string;
  stakeholder: string;
  confidence?: number;
  evidence?: string[];
  icao_reference?: string;
  hfacs_classification?: string;
  swiss_cheese_layer?: string;
  experiment_id?: number | null;
}

export interface RiskRegisterEntry {
  id: number;
  title: string;
  category: string;
  description: string;
  likelihood: number;
  severity: number;
  risk_score: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  status: string;
  owner: string;
  mitigation: string;
  linked_recommendation_id: number | null;
  review_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RiskRegisterCreate {
  title: string;
  category?: string;
  description?: string;
  likelihood: number;
  severity: number;
  status?: string;
  owner?: string;
  mitigation?: string;
  linked_recommendation_id?: number | null;
  review_date?: string | null;
}

export interface RiskRegisterUpdate {
  title?: string;
  category?: string;
  description?: string;
  likelihood?: number;
  severity?: number;
  status?: string;
  owner?: string;
  mitigation?: string;
  linked_recommendation_id?: number | null;
  review_date?: string | null;
}

export interface Incident {
  id: number;
  title: string;
  event_type: string;
  category: string;
  severity: string;
  status: string;
  description: string;
  occurred_at: string | null;
  location: string;
  airport: string;
  aircraft: string;
  operator: string;
  flight_phase: string;
  weather: string;
  assigned_investigator: string;
  reported_by: string;
  linked_recommendation_id: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IncidentCreate {
  title: string;
  event_type?: string;
  category?: string;
  severity?: string;
  status?: string;
  description?: string;
  occurred_at?: string | null;
  location?: string;
  airport?: string;
  aircraft?: string;
  operator?: string;
  flight_phase?: string;
  weather?: string;
  assigned_investigator?: string;
  reported_by?: string;
  linked_recommendation_id?: number | null;
}

export interface IncidentUpdate {
  title?: string;
  event_type?: string;
  category?: string;
  severity?: string;
  status?: string;
  description?: string;
  occurred_at?: string | null;
  location?: string;
  airport?: string;
  aircraft?: string;
  operator?: string;
  flight_phase?: string;
  weather?: string;
  assigned_investigator?: string;
  reported_by?: string;
  linked_recommendation_id?: number | null;
}

export interface InvestigationTimelineEntry {
  id: number;
  investigation_id: number;
  occurred_at: string | null;
  note: string;
  created_at: string | null;
}

export interface InvestigationEvidenceItem {
  id: number;
  investigation_id: number;
  title: string;
  description: string;
  source_type: string;
  reference: string;
  added_by: string;
  created_at: string | null;
}

export interface InvestigationEvidenceCreate {
  title: string;
  description?: string;
  source_type?: string;
  reference?: string;
  added_by?: string;
}

export interface Investigation {
  id: number;
  incident_id: number;
  incident: Incident | null;
  lead_investigator: string;
  status: string;
  summary: string;
  root_cause: string;
  contributing_factors: string[];
  started_at: string | null;
  target_completion: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  timeline: InvestigationTimelineEntry[];
  evidence: InvestigationEvidenceItem[];
}

export interface InvestigationCreate {
  incident_id: number;
  lead_investigator?: string;
  status?: string;
  summary?: string;
  root_cause?: string;
  contributing_factors?: string[];
  started_at?: string | null;
  target_completion?: string | null;
  completed_at?: string | null;
}

export interface InvestigationUpdate {
  lead_investigator?: string;
  status?: string;
  summary?: string;
  root_cause?: string;
  contributing_factors?: string[];
  started_at?: string | null;
  target_completion?: string | null;
  completed_at?: string | null;
}

export interface InvestigationTimelineCreate {
  note: string;
  occurred_at?: string | null;
}

export interface SafetyActionComment {
  id: number;
  action_id: number;
  author: string;
  text: string;
  created_at: string | null;
}

export interface SafetyAction {
  id: number;
  title: string;
  description: string;
  linked_recommendation_id: number | null;
  owner: string;
  priority: string;
  status: string;
  due_date: string | null;
  verification_notes: string;
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  comments: SafetyActionComment[];
}

export interface SafetyActionCreate {
  title: string;
  description?: string;
  linked_recommendation_id?: number | null;
  owner?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
  verification_notes?: string;
}

export interface SafetyActionUpdate {
  title?: string;
  description?: string;
  owner?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
  verification_notes?: string;
}

export interface SafetyActionCommentCreate {
  author?: string;
  text: string;
}

export interface Alert {
  alert_key: string;
  category: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  title: string;
  description: string;
  recommended_action: string;
  source_type: string;
  source_id: number;
  relevant_date: string | null;
}

export interface RecommendationSimulateRequest {
  experiment_id: number;
  features: Record<string, string | number>;
}

export interface SimulatedRecommendation {
  category: string;
  priority: string;
  recommendation: string;
  stakeholder: string;
  confidence: number;
  evidence: string[];
  icao_reference: string;
  hfacs_classification: string;
  swiss_cheese_layer: string;
}

export interface RecommendationSimulateResponse {
  predicted_class: string;
  probabilities: Record<string, number>;
  dominant_features: string[];
  recommendations: SimulatedRecommendation[];
}

export interface Pattern {
  category: string;
  top_features: string[];
  average_importance: number;
  occurrences: number;
  confidence: number;
  // SHAP+LIME cross-validation -- empty/null for experiments trained
  // before this field existed (not backfilled, not fabricated).
  lime_top_features: string[];
  consensus_features: string[];
  agreement_ratio: number | null;
}

export interface ExperimentSummary {
  id: number;
  experiment_id: string;
  model_name: string;
  dataset_name: string;
  target_column: string;
  cv_metrics: Record<string, unknown>;
  test_metrics: Record<string, number | null>;
  training_time: number;
  started_at: string;
  finished_at: string | null;
}

export interface ExperimentDetail extends ExperimentSummary {
  model_path: string;
  random_state: number;
  parameters: Record<string, unknown>;
  feature_names: string[];
  categorical_encodings: Record<string, Record<string, number>>;
  feature_importances: FeatureImportance[];
  recommendations: Recommendation[];
  patterns: Pattern[];
}

export interface TrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  target_column: string;
  model_candidates: string[] | null;
  experiment_id: number | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface TrainingJobCreate {
  target_column: string;
  model_candidates?: string[] | null;
  csv_path?: string | null;
}

export interface PredictionRequest {
  experiment_id: number;
  features: Record<string, string | number>;
}

export interface PredictionResponse {
  id: number;
  experiment_id: number;
  input_features: Record<string, unknown>;
  predicted_class: string;
  probabilities: Record<string, number>;
  shap_explanation: { Feature: string; Contribution: number; Absolute: number }[];
  created_at: string;
}

export interface BatchPredictionError {
  row: number;
  error: string;
}

export interface BatchPredictionResponse {
  results: PredictionResponse[];
  errors: BatchPredictionError[];
}

export interface AircraftAnalytics {
  manufacturer: string;
  total_accidents: number;
  total_incidents: number;
  fatal_accidents: number;
  category_breakdown: Record<string, number>;
  top_flight_phase: string | null;
  avg_seats: number | null;
}

export interface HotspotPoint {
  latitude: number;
  longitude: number;
  category: string;
  count: number;
}

export interface DatasetInfo {
  name: string;
  path: string;
  rows: number;
  columns: number;
  date_range: string;
  accident_categories_covered: string[];
  size_mb: number;
  status: string;
  missing_values: number;
  duplicate_rows: number;
  column_names: string[];
}

export interface ReportSummary {
  filename: string;
  target_column: string | null;
  experiment_id: string | null;
  generated_at: string;
  size_kb: number;
}

export interface DashboardSummary {
  total_accidents: number;
  total_incidents: number;
  active_datasets: number;
  models_trained: number;
  best_model: string | null;
  best_accuracy: number | null;
  open_recommendations: number;
  high_risk_categories: string[];
  category_breakdown: Record<string, number>;
  monthly_trend: { year: number; month: number; count: number }[];
  flight_phase_breakdown: Record<string, number>;
  weather_breakdown: Record<string, number>;
}

export interface Airport {
  ident: string;
  type: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_ft: number | null;
  continent: string | null;
  country: string | null;
  region: string | null;
  municipality: string | null;
  scheduled_service: boolean;
  icao_code: string | null;
  iata_code: string | null;
  gps_code: string | null;
  local_code: string | null;
  wikipedia_link: string | null;
}

export interface AirportSearchResult {
  results: Airport[];
  total: number;
}

export interface CountryCount {
  code: string;
  count: number;
}
