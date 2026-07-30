import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLatestExperiment } from '../api/client';
import type { ExperimentDetail } from '../api/types';
import { StatTile } from '../components/StatTile';
import { FeatureImportanceChart } from '../components/FeatureImportanceChart';
import { CategoryBarChart } from '../components/CategoryBarChart';
import { RecommendationList } from '../components/RecommendationList';

function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(3);
}

export function Dashboard() {
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLatestExperiment('Accident_Category')
      .then(setExperiment)
      .catch((err) => {
        if (err?.response?.status === 404) {
          setError('no-experiments');
        } else {
          setError(err?.message ?? 'Failed to load dashboard');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading latest experiment…</div>;

  if (error === 'no-experiments') {
    return (
      <div className="empty-state">
        <p>No experiments yet.</p>
        <p>
          <Link to="/train">Train a model</Link> to see results here.
        </p>
      </div>
    );
  }

  if (error) return <div className="error-state">{error}</div>;
  if (!experiment) return null;

  const patternConfidence = experiment.patterns.map((p) => ({
    category: p.category,
    value: p.confidence,
  }));

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>
          Latest run for <strong>{experiment.target_column}</strong> — {experiment.model_name}, trained on{' '}
          {experiment.dataset_name}.{' '}
          <Link to={`/experiments/${experiment.id}`}>View full experiment →</Link>
        </p>
      </div>

      <div className="stat-grid">
        <StatTile label="Accuracy" value={formatMetric(experiment.test_metrics.accuracy as number)} />
        <StatTile label="F1 (weighted)" value={formatMetric(experiment.test_metrics.f1_score as number)} />
        <StatTile label="ROC AUC" value={formatMetric(experiment.test_metrics.roc_auc as number)} />
        <StatTile label="Matthews CC" value={formatMetric(experiment.test_metrics.matthews_cc as number)} />
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Top predictive features (SHAP)</h2>
          <FeatureImportanceChart data={experiment.feature_importances} />
        </div>

        <div className="card">
          <h2>Pattern confidence by category</h2>
          <CategoryBarChart
            data={patternConfidence}
            ariaLabel="Pattern confidence by accident category"
          />
        </div>
      </div>

      <div className="card">
        <h2>Safety recommendations</h2>
        <RecommendationList recommendations={experiment.recommendations} />
      </div>
    </div>
  );
}
