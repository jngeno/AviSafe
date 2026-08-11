export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

export interface Recommendation {
  id: number;
  experiment_id: number;
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
}

export interface RecommendationUpdate {
  status?: string;
  assigned_officer?: string;
  due_date?: string;
}

export interface Pattern {
  category: string;
  top_features: string[];
  average_importance: number;
  occurrences: number;
  confidence: number;
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
