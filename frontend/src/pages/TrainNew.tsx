import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createTrainingJob, getTrainingJob, listTrainingJobs } from '../api/client';
import type { TrainingJob } from '../api/types';
import { StatusBadge } from '../components/Badge';

const MODEL_OPTIONS = ['random_forest', 'extra_trees', 'xgboost', 'lightgbm', 'svm'];

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export function TrainNew() {
  const [targetColumn, setTargetColumn] = useState('Accident_Category');
  const [selectedModels, setSelectedModels] = useState<string[]>([...MODEL_OPTIONS]);
  const [job, setJob] = useState<TrainingJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TrainingJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const pollRef = useRef<number | null>(null);

  function loadHistory() {
    listTrainingJobs()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }

  useEffect(() => {
    loadHistory();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  function toggleModel(model: string) {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const created = await createTrainingJob({
        target_column: targetColumn,
        model_candidates: selectedModels.length > 0 ? selectedModels : null,
      });
      setJob(created);
      loadHistory();

      pollRef.current = window.setInterval(async () => {
        const updated = await getTrainingJob(created.id);
        setJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          if (pollRef.current) window.clearInterval(pollRef.current);
          loadHistory();
        }
      }, 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start training job');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Train a new model</h1>
        <p>
          Runs the full pipeline against data/NTSB.csv: preprocessing, feature/risk
          engineering, hyperparameter-tuned cross-validation, SHAP/LIME explanations, and
          safety recommendations. This can take several minutes depending on the target and
          number of candidate models.
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="target">Target</label>
            <select id="target" value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)}>
              <option value="Accident_Category">
                Accident_Category (CFIT / LOC-I / Runway Excursion)
              </option>
              <option value="Fatal_Accident">Fatal_Accident (binary smoke-test target)</option>
            </select>
          </div>

          <div className="field">
            <label>Candidate models</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {MODEL_OPTIONS.map((model) => (
                <label key={model} style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model)}
                    onChange={() => toggleModel(model)}
                  />
                  {model}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn" disabled={submitting || selectedModels.length === 0}>
            {submitting ? 'Starting…' : 'Start training'}
          </button>
        </form>

        {error && (
          <div className="error-state" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        {job && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--gridline)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusBadge status={job.status} />
              <span className="tabular" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                job {job.id}
              </span>
            </div>

            {job.status === 'failed' && (
              <div className="error-state" style={{ marginTop: 12 }}>
                {job.error_message}
              </div>
            )}

            {job.status === 'completed' && job.experiment_id && (
              <p style={{ marginTop: 12 }}>
                Done. <Link to={`/experiments/${job.experiment_id}`}>View the trained model →</Link>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Recent training jobs</h2>
        {historyLoading && <div className="loading-state">Loading job history…</div>}
        {!historyLoading && history.length === 0 && (
          <div className="empty-state">No training jobs run yet.</div>
        )}
        {!historyLoading && history.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Target</th>
                <th>Candidates</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((j) => (
                <tr key={j.id}>
                  <td>{j.target_column}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {j.model_candidates ? j.model_candidates.join(', ') : 'all'}
                  </td>
                  <td>
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="tabular">{formatDuration(j.started_at, j.finished_at)}</td>
                  <td className="tabular">
                    {j.started_at ? new Date(j.started_at).toLocaleString() : '—'}
                  </td>
                  <td>
                    {j.status === 'completed' && j.experiment_id ? (
                      <Link to={`/experiments/${j.experiment_id}`}>View →</Link>
                    ) : j.status === 'failed' ? (
                      <span style={{ fontSize: 12, color: 'var(--risk-critical)' }} title={j.error_message ?? ''}>
                        {(j.error_message ?? 'Failed').slice(0, 40)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
