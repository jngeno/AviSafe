import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listExperiments } from '../api/client';
import type { ExperimentSummary } from '../api/types';

export function Experiments() {
  const [experiments, setExperiments] = useState<ExperimentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listExperiments()
      .then(setExperiments)
      .catch((err) => setError(err?.message ?? 'Failed to load experiments'));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Experiments</h1>
        <p>All completed training runs, most recent first.</p>
      </div>

      {error && <div className="error-state">{error}</div>}

      {experiments && experiments.length === 0 && (
        <div className="empty-state">
          No experiments yet. <Link to="/train">Train a model</Link> to get started.
        </div>
      )}

      {experiments && experiments.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Target</th>
                <th>Dataset</th>
                <th>Accuracy</th>
                <th>F1</th>
                <th>Started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.model_name}</td>
                  <td>{exp.target_column}</td>
                  <td>{exp.dataset_name}</td>
                  <td className="tabular">
                    {typeof exp.test_metrics.accuracy === 'number'
                      ? exp.test_metrics.accuracy.toFixed(3)
                      : '—'}
                  </td>
                  <td className="tabular">
                    {typeof exp.test_metrics.f1_score === 'number'
                      ? exp.test_metrics.f1_score.toFixed(3)
                      : '—'}
                  </td>
                  <td>{new Date(exp.started_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/experiments/${exp.id}`}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
