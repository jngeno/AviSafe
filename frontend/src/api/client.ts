import axios from 'axios';
import type {
  AircraftAnalytics,
  BatchPredictionResponse,
  DashboardSummary,
  DatasetInfo,
  ExperimentDetail,
  ExperimentSummary,
  HotspotPoint,
  PredictionRequest,
  PredictionResponse,
  Recommendation,
  RecommendationUpdate,
  ReportSummary,
  TrainingJob,
  TrainingJobCreate,
} from './types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const api = axios.create({ baseURL });

export async function listExperiments(targetColumn?: string): Promise<ExperimentSummary[]> {
  const { data } = await api.get<ExperimentSummary[]>('/experiments', {
    params: targetColumn ? { target_column: targetColumn } : undefined,
  });
  return data;
}

export async function getLatestExperiment(targetColumn?: string): Promise<ExperimentDetail> {
  const { data } = await api.get<ExperimentDetail>('/experiments/latest', {
    params: targetColumn ? { target_column: targetColumn } : undefined,
  });
  return data;
}

export async function getExperiment(id: number): Promise<ExperimentDetail> {
  const { data } = await api.get<ExperimentDetail>(`/experiments/${id}`);
  return data;
}

export async function createTrainingJob(payload: TrainingJobCreate): Promise<TrainingJob> {
  const { data } = await api.post<TrainingJob>('/training/jobs', payload);
  return data;
}

export async function getTrainingJob(id: string): Promise<TrainingJob> {
  const { data } = await api.get<TrainingJob>(`/training/jobs/${id}`);
  return data;
}

export async function listTrainingJobs(): Promise<TrainingJob[]> {
  const { data } = await api.get<TrainingJob[]>('/training/jobs');
  return data;
}

export async function createPrediction(payload: PredictionRequest): Promise<PredictionResponse> {
  const { data } = await api.post<PredictionResponse>('/predictions', payload);
  return data;
}

export async function createBatchPredictions(
  experimentId: number,
  file: File,
): Promise<BatchPredictionResponse> {
  const form = new FormData();
  form.append('experiment_id', String(experimentId));
  form.append('file', file);

  const { data } = await api.post<BatchPredictionResponse>('/predictions/batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listRecommendations(params?: {
  category?: string;
  priority?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<Recommendation[]> {
  const { data } = await api.get<Recommendation[]>('/recommendations', { params });
  return data;
}

export async function updateRecommendation(
  id: number,
  payload: RecommendationUpdate,
): Promise<Recommendation> {
  const { data } = await api.patch<Recommendation>(`/recommendations/${id}`, payload);
  return data;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/analytics/dashboard');
  return data;
}

export async function getAircraftAnalytics(limit?: number): Promise<AircraftAnalytics[]> {
  const { data } = await api.get<AircraftAnalytics[]>('/analytics/aircraft', {
    params: limit ? { limit } : undefined,
  });
  return data;
}

export async function getHotspots(category?: string): Promise<HotspotPoint[]> {
  const { data } = await api.get<HotspotPoint[]>('/analytics/hotspots', {
    params: category ? { category } : undefined,
  });
  return data;
}

export async function listDatasets(): Promise<DatasetInfo[]> {
  const { data } = await api.get<DatasetInfo[]>('/datasets');
  return data;
}

export async function listReports(): Promise<ReportSummary[]> {
  const { data } = await api.get<ReportSummary[]>('/reports');
  return data;
}

export function reportDownloadUrl(filename: string): string {
  return `${baseURL}/reports/${encodeURIComponent(filename)}`;
}
