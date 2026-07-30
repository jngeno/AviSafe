import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { Nav } from './components/Nav';
import { Dashboard } from './pages/Dashboard';
import { Experiments } from './pages/Experiments';
import { ExperimentDetailPage } from './pages/ExperimentDetail';
import { TrainNew } from './pages/TrainNew';
import { Predict } from './pages/Predict';

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/experiments/:id" element={<ExperimentDetailPage />} />
          <Route path="/train" element={<TrainNew />} />
          <Route path="/predict" element={<Predict />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
