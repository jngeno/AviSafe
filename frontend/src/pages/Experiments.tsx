import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listExperiments } from '../api/client';
import type { ExperimentSummary } from '../api/types';

function accuracyOf(exp: ExperimentSummary): number {
  const v = exp.test_metrics.accuracy;
  return typeof v === 'number' ? v : -1;
}

export function Experiments() {
  const [allExperiments, setAllExperiments] = useState<ExperimentSummary[] | null>(null);
  const [experiments, setExperiments] = useState<ExperimentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState('');

  // Fetched once, unfiltered -- populates the filter dropdown itself, so
  // selecting a target doesn't shrink the list of targets you could pick.
  useEffect(() => {
    listExperiments()
      .then(setAllExperiments)
      .catch(() => setAllExperiments([]));
  }, []);

  useEffect(() => {
    listExperiments(targetColumn || undefined)
      .then(setExperiments)
      .catch((err) => setError(err?.message ?? 'Failed to load experiments'));
  }, [targetColumn]);

  const targetOptions = useMemo(() => {
    if (!allExperiments) return [];
    return Array.from(new Set(allExperiments.map((e) => e.target_column)));
  }, [allExperiments]);

  const bestByTarget = useMemo(() => {
    const best: Record<string, number> = {};
    for (const exp of experiments ?? []) {
      const acc = accuracyOf(exp);
      if (acc > (best[exp.target_column] ?? -1)) best[exp.target_column] = acc;
    }
    return best;
  }, [experiments]);

  return (
    <div>
      <div className="page-header">
        <h1>Experiments</h1>
        <p>All completed training runs, most recent first.</p>
      </div>

      {error && <div className="error-state">{error}</div>}

      <div className="card">
        <div className="field">
          <label>Target column</label>
          <select value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)}>
            <option value="">All targets</option>
            {targetOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

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
              {experiments.map((exp) => {
                const acc = accuracyOf(exp);
                const isBest = acc >= 0 && acc === bestByTarget[exp.target_column];
                return (
                  <tr key={exp.id}>
                    <td>
                      {exp.model_name}
                      {isBest && (
                        <span
                          className="badge"
                          style={{ marginLeft: 8, borderColor: 'var(--risk-low)', color: 'var(--risk-low)' }}
                        >
                          Best for target
                        </span>
                      )}
                    </td>
                    <td>{exp.target_column}</td>
                    <td>{exp.dataset_name}</td>
                    <td className="tabular">{acc >= 0 ? acc.toFixed(3) : '-'}</td>
                    <td className="tabular">
                      {typeof exp.test_metrics.f1_score === 'number'
                        ? exp.test_metrics.f1_score.toFixed(3)
                        : '-'}
                    </td>
                    <td>{new Date(exp.started_at).toLocaleString()}</td>
                    <td>
                      <Link to={`/experiments/${exp.id}`}>View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
