import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listExperiments } from '../api/client';
import type { ExperimentSummary } from '../api/types';
import { SimpleBarChart } from '../components/SimpleBarChart';

function metric(exp: ExperimentSummary, key: string): number | null {
  const value = exp.test_metrics[key];
  return typeof value === 'number' ? value : null;
}

export function ModelPerformance() {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState('');

  useEffect(() => {
    listExperiments()
      .then(setExperiments)
      .catch((err) => setError(err?.message ?? 'Failed to load experiments'))
      .finally(() => setLoading(false));
  }, []);

  const targetOptions = useMemo(
    () => Array.from(new Set(experiments.map((e) => e.target_column))),
    [experiments],
  );

  const filtered = useMemo(
    () => (targetColumn ? experiments.filter((e) => e.target_column === targetColumn) : experiments),
    [experiments, targetColumn],
  );

  const ranked = useMemo(
    () => [...filtered].sort((a, b) => (metric(b, 'accuracy') ?? 0) - (metric(a, 'accuracy') ?? 0)),
    [filtered],
  );

  const chartData = ranked
    .filter((e) => metric(e, 'accuracy') !== null)
    .map((e) => ({ label: `${e.model_name} (${e.id})`, value: metric(e, 'accuracy') as number }));

  // Average accuracy per model family -- mixing accuracy across different
  // targets (binary Fatal_Accident vs. 3-class Accident_Category) isn't
  // comparable, so this is computed within the current target filter only.
  const modelFamilyData = useMemo(() => {
    const byModel = new Map<string, number[]>();
    for (const exp of filtered) {
      const acc = metric(exp, 'accuracy');
      if (acc === null) continue;
      if (!byModel.has(exp.model_name)) byModel.set(exp.model_name, []);
      byModel.get(exp.model_name)!.push(acc);
    }
    return Array.from(byModel.entries())
      .map(([label, values]) => ({
        label,
        value: values.reduce((a, b) => a + b, 0) / values.length,
        runs: values.length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  return (
    <div>
      <div className="page-header">
        <h1>Model Performance</h1>
        <p>Accuracy and evaluation metrics across every trained experiment, ranked best-first.</p>
      </div>

      {loading && <div className="loading-state">Loading experiments…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && experiments.length === 0 && (
        <div className="empty-state">
          No experiments yet. <Link to="/train">Train a model</Link> to see performance here.
        </div>
      )}

      {targetOptions.length > 1 && (
        <div className="card">
          <div className="field">
            <label>Target column</label>
            <p className="text-muted" style={{ fontSize: 12, marginTop: -2, marginBottom: 6 }}>
              Accuracy isn&apos;t comparable across different targets (binary vs. multi-class) --
              filter to one before comparing models.
            </p>
            <select value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)}>
              <option value="">All targets (mixed, not directly comparable)</option>
              {targetOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {modelFamilyData.length > 1 && (
        <div className="card">
          <h2>Average accuracy by model family{targetColumn ? ` — ${targetColumn}` : ''}</h2>
          <p className="text-muted" style={{ fontSize: 12, marginTop: -2, marginBottom: 8 }}>
            Mean test accuracy across all runs of each algorithm ({modelFamilyData
              .map((m) => `${m.label}: ${m.runs} run${m.runs === 1 ? '' : 's'}`)
              .join(', ')}
            ).
          </p>
          <SimpleBarChart data={modelFamilyData} ariaLabel="Average accuracy by model family" format={(v) => v.toFixed(3)} />
        </div>
      )}

      {chartData.length > 0 && (
        <div className="card">
          <h2>Accuracy by model</h2>
          <SimpleBarChart
            data={chartData}
            ariaLabel="Accuracy by model"
            format={(v) => v.toFixed(3)}
            limit={15}
          />
        </div>
      )}

      {ranked.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Model</th>
                <th>Target</th>
                <th>Accuracy</th>
                <th>F1</th>
                <th>ROC AUC</th>
                <th>Matthews CC</th>
                <th>Trained</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((exp, i) => (
                <tr key={exp.id}>
                  <td className="tabular">{i + 1}</td>
                  <td>{exp.model_name}</td>
                  <td>{exp.target_column}</td>
                  <td className="tabular">{metric(exp, 'accuracy')?.toFixed(3) ?? '-'}</td>
                  <td className="tabular">{metric(exp, 'f1_score')?.toFixed(3) ?? '-'}</td>
                  <td className="tabular">{metric(exp, 'roc_auc')?.toFixed(3) ?? '-'}</td>
                  <td className="tabular">{metric(exp, 'matthews_cc')?.toFixed(3) ?? '-'}</td>
                  <td className="tabular">{new Date(exp.started_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/experiments/${exp.id}`}>Details →</Link>
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
