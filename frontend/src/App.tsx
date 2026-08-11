import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './pages/Dashboard';
import { Datasets } from './pages/Datasets';
import { TrainNew } from './pages/TrainNew';
import { Experiments } from './pages/Experiments';
import { ExperimentDetailPage } from './pages/ExperimentDetail';
import { ModelPerformance } from './pages/ModelPerformance';
import { ExplainableAI } from './pages/ExplainableAI';
import { PatternDiscovery } from './pages/PatternDiscovery';
import { Predict } from './pages/Predict';
import { RiskHeatmaps } from './pages/RiskHeatmaps';
import { RecommendationCentre } from './pages/RecommendationCentre';
import { AirportAnalytics } from './pages/AirportAnalytics';
import { AircraftAnalytics } from './pages/AircraftAnalytics';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="app-content">
          <TopBar />
          <main className="app-main">
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
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
