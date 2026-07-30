import axios from 'axios';
import type {
  ExperimentDetail,
  ExperimentSummary,
  PredictionRequest,
  PredictionResponse,
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
