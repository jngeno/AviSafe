import axios from 'axios';
import type {
  AircraftAnalytics,
  Airport,
  AirportSearchResult,
  BatchPredictionResponse,
  CountryCount,
  DashboardSummary,
  DatasetInfo,
  ExperimentDetail,
  ExperimentSummary,
  HotspotPoint,
  PredictionRequest,
  PredictionResponse,
  Recommendation,
  RecommendationCreate,
  RecommendationSimulateRequest,
  RecommendationSimulateResponse,
  RecommendationUpdate,
  ReportSummary,
  Incident,
  IncidentCreate,
  IncidentUpdate,
  Investigation,
  InvestigationCreate,
  InvestigationUpdate,
  InvestigationTimelineEntry,
  InvestigationTimelineCreate,
  InvestigationEvidenceItem,
  InvestigationEvidenceCreate,
  SafetyAction,
  SafetyActionCreate,
  SafetyActionUpdate,
  SafetyActionComment,
  SafetyActionCommentCreate,
  Alert,
  RiskRegisterEntry,
  RiskRegisterCreate,
  RiskRegisterUpdate,
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

export async function createRecommendation(
  payload: RecommendationCreate,
): Promise<Recommendation> {
  const { data } = await api.post<Recommendation>('/recommendations', payload);
  return data;
}

export async function deleteRecommendation(id: number): Promise<void> {
  await api.delete(`/recommendations/${id}`);
}

export async function simulateRecommendations(
  payload: RecommendationSimulateRequest,
): Promise<RecommendationSimulateResponse> {
  const { data } = await api.post<RecommendationSimulateResponse>('/recommendations/simulate', payload);
  return data;
}

export async function listRiskRegister(params?: {
  category?: string;
  status?: string;
  risk_level?: string;
  search?: string;
  limit?: number;
}): Promise<RiskRegisterEntry[]> {
  const { data } = await api.get<RiskRegisterEntry[]>('/risk-register', { params });
  return data;
}

export async function createRiskRegisterEntry(
  payload: RiskRegisterCreate,
): Promise<RiskRegisterEntry> {
  const { data } = await api.post<RiskRegisterEntry>('/risk-register', payload);
  return data;
}

export async function updateRiskRegisterEntry(
  id: number,
  payload: RiskRegisterUpdate,
): Promise<RiskRegisterEntry> {
  const { data } = await api.patch<RiskRegisterEntry>(`/risk-register/${id}`, payload);
  return data;
}

export async function deleteRiskRegisterEntry(id: number): Promise<void> {
  await api.delete(`/risk-register/${id}`);
}

export async function listIncidents(params?: {
  event_type?: string;
  severity?: string;
  status?: string;
  category?: string;
  search?: string;
  limit?: number;
}): Promise<Incident[]> {
  const { data } = await api.get<Incident[]>('/incidents', { params });
  return data;
}

export async function createIncident(payload: IncidentCreate): Promise<Incident> {
  const { data } = await api.post<Incident>('/incidents', payload);
  return data;
}

export async function updateIncident(id: number, payload: IncidentUpdate): Promise<Incident> {
  const { data } = await api.patch<Incident>(`/incidents/${id}`, payload);
  return data;
}

export async function deleteIncident(id: number): Promise<void> {
  await api.delete(`/incidents/${id}`);
}

export async function listInvestigations(params?: {
  status?: string;
  incident_id?: number;
  limit?: number;
}): Promise<Investigation[]> {
  const { data } = await api.get<Investigation[]>('/investigations', { params });
  return data;
}

export async function getInvestigation(id: number): Promise<Investigation> {
  const { data } = await api.get<Investigation>(`/investigations/${id}`);
  return data;
}

export async function createInvestigation(
  payload: InvestigationCreate,
): Promise<Investigation> {
  const { data } = await api.post<Investigation>('/investigations', payload);
  return data;
}

export async function updateInvestigation(
  id: number,
  payload: InvestigationUpdate,
): Promise<Investigation> {
  const { data } = await api.patch<Investigation>(`/investigations/${id}`, payload);
  return data;
}

export async function deleteInvestigation(id: number): Promise<void> {
  await api.delete(`/investigations/${id}`);
}

export async function addInvestigationTimelineEntry(
  investigationId: number,
  payload: InvestigationTimelineCreate,
): Promise<InvestigationTimelineEntry> {
  const { data } = await api.post<InvestigationTimelineEntry>(
    `/investigations/${investigationId}/timeline`,
    payload,
  );
  return data;
}

export async function addInvestigationEvidence(
  investigationId: number,
  payload: InvestigationEvidenceCreate,
): Promise<InvestigationEvidenceItem> {
  const { data } = await api.post<InvestigationEvidenceItem>(
    `/investigations/${investigationId}/evidence`,
    payload,
  );
  return data;
}

export async function deleteInvestigationEvidence(
  investigationId: number,
  evidenceId: number,
): Promise<void> {
  await api.delete(`/investigations/${investigationId}/evidence/${evidenceId}`);
}

export async function deleteInvestigationTimelineEntry(
  investigationId: number,
  entryId: number,
): Promise<void> {
  await api.delete(`/investigations/${investigationId}/timeline/${entryId}`);
}

export async function listSafetyActions(params?: {
  status?: string;
  priority?: string;
  owner?: string;
  search?: string;
  limit?: number;
}): Promise<SafetyAction[]> {
  const { data } = await api.get<SafetyAction[]>('/safety-actions', { params });
  return data;
}

export async function getSafetyAction(id: number): Promise<SafetyAction> {
  const { data } = await api.get<SafetyAction>(`/safety-actions/${id}`);
  return data;
}

export async function createSafetyAction(payload: SafetyActionCreate): Promise<SafetyAction> {
  const { data } = await api.post<SafetyAction>('/safety-actions', payload);
  return data;
}

export async function updateSafetyAction(
  id: number,
  payload: SafetyActionUpdate,
): Promise<SafetyAction> {
  const { data } = await api.patch<SafetyAction>(`/safety-actions/${id}`, payload);
  return data;
}

export async function deleteSafetyAction(id: number): Promise<void> {
  await api.delete(`/safety-actions/${id}`);
}

export async function addSafetyActionComment(
  actionId: number,
  payload: SafetyActionCommentCreate,
): Promise<SafetyActionComment> {
  const { data } = await api.post<SafetyActionComment>(
    `/safety-actions/${actionId}/comments`,
    payload,
  );
  return data;
}

export async function listAlerts(params?: {
  severity?: string;
  category?: string;
  include_acknowledged?: boolean;
}): Promise<Alert[]> {
  const { data } = await api.get<Alert[]>('/alerts', { params });
  return data;
}

export async function acknowledgeAlert(alertKey: string, acknowledgedBy = ''): Promise<void> {
  await api.post(`/alerts/${encodeURIComponent(alertKey)}/acknowledge`, {
    acknowledged_by: acknowledgedBy,
  });
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

export async function getReportContent(filename: string): Promise<string> {
  const { data } = await api.get<string>(`/reports/${encodeURIComponent(filename)}`, {
    responseType: 'text',
  });
  return data;
}

export async function searchAirports(params?: {
  search?: string;
  country?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<AirportSearchResult> {
  const { data } = await api.get<AirportSearchResult>('/airports', { params });
  return data;
}

export async function getAirport(ident: string): Promise<Airport> {
  const { data } = await api.get<Airport>(`/airports/${encodeURIComponent(ident)}`);
  return data;
}

export async function listAirportCountries(): Promise<CountryCount[]> {
  const { data } = await api.get<CountryCount[]>('/airports/countries');
  return data;
}

export async function listAirportTypes(): Promise<string[]> {
  const { data } = await api.get<string[]>('/airports/types');
  return data;
}
