import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { GlobalSearch } from './components/GlobalSearch';

const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const CommandCentre = lazy(() =>
  import('./pages/CommandCentre').then((m) => ({ default: m.CommandCentre })),
);
const SavedScenarios = lazy(() =>
  import('./pages/SavedScenarios').then((m) => ({ default: m.SavedScenarios })),
);
const PresentationMode = lazy(() =>
  import('./pages/PresentationMode').then((m) => ({ default: m.PresentationMode })),
);
const Datasets = lazy(() =>
  import('./pages/Datasets').then((m) => ({ default: m.Datasets })),
);
const TrainNew = lazy(() =>
  import('./pages/TrainNew').then((m) => ({ default: m.TrainNew })),
);
const Experiments = lazy(() =>
  import('./pages/Experiments').then((m) => ({ default: m.Experiments })),
);
const ExperimentDetailPage = lazy(() =>
  import('./pages/ExperimentDetail').then((m) => ({ default: m.ExperimentDetailPage })),
);
const ModelPerformance = lazy(() =>
  import('./pages/ModelPerformance').then((m) => ({ default: m.ModelPerformance })),
);
const ExplainableAI = lazy(() =>
  import('./pages/ExplainableAI').then((m) => ({ default: m.ExplainableAI })),
);
const PatternDiscovery = lazy(() =>
  import('./pages/PatternDiscovery').then((m) => ({ default: m.PatternDiscovery })),
);
const Predict = lazy(() =>
  import('./pages/Predict').then((m) => ({ default: m.Predict })),
);
const RiskHeatmaps = lazy(() =>
  import('./pages/RiskHeatmaps').then((m) => ({ default: m.RiskHeatmaps })),
);
const RecommendationCentre = lazy(() =>
  import('./pages/RecommendationCentre').then((m) => ({ default: m.RecommendationCentre })),
);
const AirportAnalytics = lazy(() =>
  import('./pages/AirportAnalytics').then((m) => ({ default: m.AirportAnalytics })),
);
const AircraftAnalytics = lazy(() =>
  import('./pages/AircraftAnalytics').then((m) => ({ default: m.AircraftAnalytics })),
);
const IncidentManagement = lazy(() =>
  import('./pages/IncidentManagement').then((m) => ({ default: m.IncidentManagement })),
);
const Investigations = lazy(() =>
  import('./pages/Investigations').then((m) => ({ default: m.Investigations })),
);
const RiskRegister = lazy(() =>
  import('./pages/RiskRegister').then((m) => ({ default: m.RiskRegister })),
);
const SafetyActions = lazy(() =>
  import('./pages/SafetyActions').then((m) => ({ default: m.SafetyActions })),
);
const SafetyReporting = lazy(() =>
  import('./pages/SafetyReporting').then((m) => ({ default: m.SafetyReporting })),
);
const AlertCentre = lazy(() =>
  import('./pages/AlertCentre').then((m) => ({ default: m.AlertCentre })),
);
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Settings = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Settings })),
);

function RouteFallback() {
  return <div className="loading-state">Loading…</div>;
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <GlobalSearch />
        <Sidebar />
        <div className="app-content">
          <TopBar />
          <main className="app-main">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<CommandCentre />} />
                <Route path="/safety-intelligence" element={<Dashboard />} />
                <Route path="/saved-scenarios" element={<SavedScenarios />} />
                <Route path="/presentation" element={<PresentationMode />} />
                <Route path="/datasets" element={<Datasets />} />
                <Route path="/train" element={<TrainNew />} />
                <Route path="/experiments" element={<Experiments />} />
                <Route path="/experiments/:id" element={<ExperimentDetailPage />} />
                <Route path="/performance" element={<ModelPerformance />} />
                <Route path="/explainable-ai" element={<ExplainableAI />} />
                <Route path="/pattern-discovery" element={<PatternDiscovery />} />
                <Route path="/flight-risk-assessment" element={<Predict />} />
                <Route path="/risk-heatmaps" element={<RiskHeatmaps />} />
                <Route path="/recommendations" element={<RecommendationCentre />} />
                <Route path="/airports" element={<AirportAnalytics />} />
                <Route path="/aircraft" element={<AircraftAnalytics />} />
                <Route path="/incidents" element={<IncidentManagement />} />
                <Route path="/investigations" element={<Investigations />} />
                <Route path="/risk-register" element={<RiskRegister />} />
                <Route path="/safety-actions" element={<SafetyActions />} />
                <Route path="/safety-reporting" element={<SafetyReporting />} />
                <Route path="/alerts" element={<AlertCentre />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
