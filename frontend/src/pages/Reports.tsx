import { useEffect, useState } from 'react';
import { listReports, reportDownloadUrl } from '../api/client';
import type { ReportSummary } from '../api/types';

export function Reports() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReports()
      .then((list) =>
        setReports(
          [...list].sort(
            (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
          ),
        ),
      )
      .catch((err) => setError(err?.message ?? 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <p>
          Regulator-ready safety recommendation reports, generated from explainable,
          evidence-based causal attribution at the end of each training run.
        </p>
      </div>

      {loading && <div className="loading-state">Loading reports…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && reports.length === 0 && (
        <div className="empty-state">No reports generated yet. Train a model to produce one.</div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Target column</th>
                <th>Experiment</th>
                <th>Generated</th>
                <th>Size</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.filename}>
                  <td>{report.filename}</td>
                  <td>{report.target_column ?? '—'}</td>
                  <td>{report.experiment_id ?? '—'}</td>
                  <td className="tabular">{new Date(report.generated_at).toLocaleString()}</td>
                  <td className="tabular">{report.size_kb.toFixed(1)} KB</td>
                  <td>
                    <a
                      href={reportDownloadUrl(report.filename)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary btn-small"
                      style={{ display: 'inline-block' }}
                    >
                      View
                    </a>
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
