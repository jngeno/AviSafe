export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

export interface Recommendation {
  category: string;
  priority: string;
  recommendation: string;
  stakeholder: string;
  confidence: number;
  evidence: string[];
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
  predicted_class: string;
  probabilities: Record<string, number>;
  shap_explanation: { Feature: string; Contribution: number; Absolute: number }[];
  created_at: string;
}
