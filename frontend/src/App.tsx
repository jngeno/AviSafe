import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';

const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
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
const Reports = lazy(() =>
  import('./pages/Reports').then((m) => ({ default: m.Reports })),
);
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
        <Sidebar />
        <div className="app-content">
          <TopBar />
          <main className="app-main">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
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
