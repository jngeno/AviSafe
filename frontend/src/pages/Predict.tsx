import { useEffect, useState } from 'react';
import { createPrediction, getExperiment, listExperiments } from '../api/client';
import type { ExperimentDetail, ExperimentSummary, PredictionResponse } from '../api/types';
import { CategoryBarChart } from '../components/CategoryBarChart';
import { DivergingBarChart } from '../components/DivergingBarChart';
import { categoryColor } from '../components/categoryColor';

export function Predict() {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listExperiments().then((list) => {
      setExperiments(list);
      if (list.length > 0) setSelectedId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    setResult(null);
    setError(null);
    getExperiment(selectedId).then((exp) => {
      setExperiment(exp);
      setValues({});
    });
  }, [selectedId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!experiment) return;
    setSubmitting(true);
    setError(null);

    const features: Record<string, string | number> = {};
    for (const name of experiment.feature_names) {
      const raw = values[name];
      if (raw === undefined || raw === '') continue;
      features[name] = experiment.categorical_encodings[name] ? raw : Number(raw);
    }

    try {
      const prediction = await createPrediction({ experiment_id: experiment.id, features });
      setResult(prediction);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Prediction failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Live prediction</h1>
        <p>Run a single record through a trained model and see its SHAP explanation.</p>
      </div>

      {experiments.length === 0 && (
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

          {experiment && (
            <form onSubmit={handleSubmit}>
              <div className="field-row">
                {experiment.feature_names.map((name) => {
                  const options = experiment.categorical_encodings[name];
                  return (
                    <div className="field" key={name}>
                      <label htmlFor={name}>{name}</label>
                      {options ? (
                        <select
                          id={name}
                          value={values[name] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                        >
                          <option value="">—</option>
                          {Object.keys(options).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={name}
                          type="number"
                          step="any"
                          value={values[name] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Predicting…' : 'Predict'}
              </button>
            </form>
          )}
        </div>
      )}

      {error && <div className="error-state" style={{ marginTop: 16 }}>{error}</div>}

      {result && (
        <div className="card">
          <h2>Result</h2>
          <p>
            Predicted category:{' '}
            <strong style={{ color: categoryColor(result.predicted_class) }}>
              {result.predicted_class}
            </strong>
          </p>

          <div style={{ marginTop: 16 }}>
            <h3>Class probabilities</h3>
            <CategoryBarChart
              data={Object.entries(result.probabilities).map(([category, value]) => ({
                category,
                value,
              }))}
              ariaLabel="Predicted class probabilities"
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <h3>Why — local SHAP explanation</h3>
            <DivergingBarChart
              data={result.shap_explanation.map((row) => ({
                feature: row.Feature,
                contribution: row.Contribution,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
