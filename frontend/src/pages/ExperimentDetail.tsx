import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getExperiment } from '../api/client';
import type { ExperimentDetail } from '../api/types';
import { StatTile } from '../components/StatTile';
import { FeatureImportanceChart } from '../components/FeatureImportanceChart';
import { CategoryBarChart } from '../components/CategoryBarChart';
import { RecommendationList } from '../components/RecommendationList';
import { categoryColor } from '../components/categoryColor';

function formatMetric(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return value.toFixed(3);
}

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getExperiment(Number(id))
      .then(setExperiment)
      .catch((err) => setError(err?.message ?? 'Failed to load experiment'));
  }, [id]);

  if (error) return <div className="error-state">{error}</div>;
  if (!experiment) return <div className="loading-state">Loading…</div>;

  const rawBestParams = experiment.cv_metrics.best_parameters;
  const bestParams =
    rawBestParams && typeof rawBestParams === 'object'
      ? (rawBestParams as Record<string, unknown>)
      : null;

  return (
    <div>
      <div className="page-header">
        <h1>{experiment.model_name}</h1>
        <p>
          Target <strong>{experiment.target_column}</strong> · Dataset {experiment.dataset_name} · Started{' '}
          {new Date(experiment.started_at).toLocaleString()}
        </p>
      </div>

      <div className="stat-grid">
        <StatTile label="Accuracy" value={formatMetric(experiment.test_metrics.accuracy)} />
        <StatTile label="F1 (weighted)" value={formatMetric(experiment.test_metrics.f1_score)} />
        <StatTile label="ROC AUC" value={formatMetric(experiment.test_metrics.roc_auc)} />
        <StatTile label="Matthews CC" value={formatMetric(experiment.test_metrics.matthews_cc)} />
        <StatTile label="Balanced accuracy" value={formatMetric(experiment.test_metrics.balanced_accuracy)} />
        <StatTile label="Cohen's kappa" value={formatMetric(experiment.test_metrics.cohen_kappa)} />
        <StatTile
          label="CV F1 (weighted mean)"
          value={formatMetric(experiment.cv_metrics.f1_weighted_mean)}
          sub="5-fold cross-validation, used for model selection"
        />
        <StatTile
          label="Training time"
          value={experiment.training_time > 0 ? `${experiment.training_time.toFixed(1)}s` : '—'}
        />
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Top predictive features (SHAP)</h2>
          <FeatureImportanceChart data={experiment.feature_importances} limit={20} />
        </div>

        <div className="card">
          <h2>Discovered patterns by category</h2>
          {experiment.patterns.map((p) => (
            <div key={p.category} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong style={{ color: categoryColor(p.category), fontSize: 13 }}>
                  {p.category}
                </strong>
                <span className="tabular" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.occurrences} occurrences
                </span>
              </div>
              <div className="evidence-list">
                {p.top_features.map((f) => (
                  <span className="evidence-chip" key={f}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <CategoryBarChart
            data={experiment.patterns.map((p) => ({ category: p.category, value: p.confidence }))}
            ariaLabel="Confidence by category"
          />
        </div>
      </div>

      <div className="card">
        <h2>Safety recommendations</h2>
        <RecommendationList recommendations={experiment.recommendations} />
      </div>

      {bestParams && (
        <div className="card">
          <h2>Hyperparameter search result</h2>
          <p>
            The specific values RandomizedSearchCV selected out of its search space during
            cross-validation -- a subset of the full parameter table below, scoped to what was
            actually tuned rather than every constructor argument.
          </p>
          <table>
            <tbody>
              {Object.entries(bestParams).map(([key, value]) => (
                <tr key={key}>
                  <td style={{ color: 'var(--text-muted)' }}>{key}</td>
                  <td className="tabular">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>Model parameters</h2>
        <p>
          Non-default values only - the underlying estimator accepts many more
          constructor arguments left at their library default (shown as null and
          omitted here).
        </p>
        <table>
          <tbody>
            {Object.entries(experiment.parameters)
              .filter(([, value]) => value !== null)
              .map(([key, value]) => (
                <tr key={key}>
                  <td style={{ color: 'var(--text-muted)' }}>{key}</td>
                  <td className="tabular">{String(value)}</td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
