import { Fragment, useEffect, useState } from 'react';
import { createBatchPredictions, createPrediction, getExperiment, listExperiments } from '../api/client';
import type {
  BatchPredictionResponse,
  ExperimentDetail,
  ExperimentSummary,
  PredictionResponse,
} from '../api/types';
import { CategoryBarChart } from '../components/CategoryBarChart';
import { DivergingBarChart } from '../components/DivergingBarChart';
import { categoryColor } from '../components/categoryColor';

type Mode = 'manual' | 'import';

function PredictionResult({ result }: { result: PredictionResponse }) {
  return (
    <>
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
    </>
  );
}

export function Predict() {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [mode, setMode] = useState<Mode>('manual');

  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<BatchPredictionResponse | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

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
    setBatch(null);
    setError(null);
    getExperiment(selectedId).then((exp) => {
      setExperiment(exp);
      setValues({});
    });
  }, [selectedId]);

  function switchMode(next: Mode) {
    setMode(next);
    setResult(null);
    setBatch(null);
    setError(null);
  }

  async function handleManualSubmit(e: React.FormEvent) {
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

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!experiment || !file) return;
    setSubmitting(true);
    setError(null);
    setBatch(null);
    setExpandedRow(null);

    try {
      const response = await createBatchPredictions(experiment.id, file);
      setBatch(response);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === 'string' ? detail : (detail?.message ?? err?.message ?? 'Batch prediction failed'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Live prediction</h1>
        <p>Run one record, or a whole CSV of records, through a trained model and see its SHAP explanation.</p>
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

          <div className="mode-toggle">
            <button
              type="button"
              className={mode === 'manual' ? 'btn-toggle btn-toggle--active' : 'btn-toggle'}
              onClick={() => switchMode('manual')}
            >
              Manual input
            </button>
            <button
              type="button"
              className={mode === 'import' ? 'btn-toggle btn-toggle--active' : 'btn-toggle'}
              onClick={() => switchMode('import')}
            >
              Import CSV
            </button>
          </div>

          {experiment && mode === 'manual' && (
            <form onSubmit={handleManualSubmit}>
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

          {experiment && mode === 'import' && (
            <form onSubmit={handleImportSubmit}>
              <p>
                Upload a CSV with columns matching this model's features — a subset is fine, missing
                columns default to 0. A small ready-to-use example ships at{' '}
                <code>data/sample_predictions.csv</code> in the project.
              </p>

              <div className="field">
                <label htmlFor="csv-file">CSV file</label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <button type="submit" className="btn" disabled={submitting || !file}>
                {submitting ? 'Predicting…' : 'Predict all rows'}
              </button>
            </form>
          )}
        </div>
      )}

      {error && (
        <div className="error-state" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card">
          <h2>Result</h2>
          <PredictionResult result={result} />
        </div>
      )}

      {batch && (
        <div className="card">
          <h2>
            Batch results ({batch.results.length} predicted
            {batch.errors.length > 0 ? `, ${batch.errors.length} failed` : ''})
          </h2>

          {batch.errors.length > 0 && (
            <div className="error-state" style={{ marginBottom: 12 }}>
              {batch.errors.map((e) => (
                <div key={e.row}>
                  Row {e.row}: {e.error}
                </div>
              ))}
            </div>
          )}

          {batch.results.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Predicted category</th>
                  <th>Confidence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batch.results.map((row, i) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="tabular">{i + 1}</td>
                      <td style={{ color: categoryColor(row.predicted_class), fontWeight: 600 }}>
                        {row.predicted_class}
                      </td>
                      <td className="tabular">
                        {((row.probabilities[row.predicted_class] ?? 0) * 100).toFixed(1)}%
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-small"
                          onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                        >
                          {expandedRow === i ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr>
                        <td colSpan={4}>
                          <PredictionResult result={row} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
