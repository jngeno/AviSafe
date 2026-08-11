import { useEffect, useState } from 'react';
import { getExperiment, listExperiments } from '../api/client';
import type { ExperimentDetail, ExperimentSummary } from '../api/types';
import { FeatureImportanceChart } from '../components/FeatureImportanceChart';

export function ExplainableAI() {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listExperiments().then((list) => {
      setExperiments(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    getExperiment(selectedId).then(setExperiment);
  }, [selectedId]);

  return (
    <div>
      <div className="page-header">
        <h1>Explainable AI</h1>
        <p>
          Global SHAP feature importance for a trained model — which inputs drive its
          predictions overall, ranked by mean absolute contribution.
        </p>
      </div>

      {loading && <div className="loading-state">Loading experiments…</div>}

      {!loading && experiments.length === 0 && (
        <div className="empty-state">No trained models yet. Train one first.</div>
      )}

      {experiments.length > 0 && (
        <div className="card">
          <div className="field">
            <label htmlFor="experiment">Model</label>
            <select
              id="experiment"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.model_name} — {exp.target_column} (#{exp.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {experiment && (
        <div className="card-grid">
          <div className="card">
            <h2>Global feature importance (SHAP)</h2>
            <FeatureImportanceChart data={experiment.feature_importances} limit={15} />
          </div>

          <div className="card">
            <h2>Model parameters</h2>
            <table>
              <tbody>
                {Object.entries(experiment.parameters).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td className="tabular">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {experiment && (
        <div className="card">
          <h2>All ranked features</h2>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Feature</th>
                <th>Importance</th>
              </tr>
            </thead>
            <tbody>
              {experiment.feature_importances.map((row) => (
                <tr key={row.feature}>
                  <td className="tabular">{row.rank}</td>
                  <td>{row.feature}</td>
                  <td className="tabular">{row.importance.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
