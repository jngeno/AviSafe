import { useEffect, useState } from 'react';
import { getExperiment, listExperiments } from '../api/client';
import type { ExperimentDetail, ExperimentSummary } from '../api/types';
import { categoryColor } from '../components/categoryColor';

export function PatternDiscovery() {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listExperiments('Accident_Category').then((list) => {
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
        <h1>Pattern Discovery</h1>
        <p>
          Unified causal patterns per accident category — the features that consistently drive
          each category's predictions, synthesised from SHAP importance across the category's
          predicted cases.
        </p>
      </div>

      {loading && <div className="loading-state">Loading experiments…</div>}

      {!loading && experiments.length === 0 && (
        <div className="empty-state">
          No Accident_Category experiments yet — pattern discovery needs a categorical model.
        </div>
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
                  {exp.model_name} (#{exp.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {experiment && experiment.patterns.length === 0 && (
        <div className="empty-state">No patterns discovered for this experiment.</div>
      )}

      {experiment && experiment.patterns.length > 0 && (
        <div className="card-grid">
          {experiment.patterns.map((pattern) => (
            <div className="card" key={pattern.category}>
              <h2 style={{ color: categoryColor(pattern.category) }}>{pattern.category}</h2>
              <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-tile">
                  <h3>Confidence</h3>
                  <div className="stat-value">{(pattern.confidence * 100).toFixed(0)}%</div>
                </div>
                <div className="stat-tile">
                  <h3>Occurrences</h3>
                  <div className="stat-value">{pattern.occurrences}</div>
                </div>
                <div className="stat-tile">
                  <h3>Avg. importance</h3>
                  <div className="stat-value">{pattern.average_importance.toFixed(3)}</div>
                </div>
              </div>
              <p style={{ marginBottom: 6 }}>
                <strong>Top contributing features</strong>
              </p>
              <div className="evidence-list">
                {pattern.top_features.map((f) => (
                  <span className="evidence-chip" key={f}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
