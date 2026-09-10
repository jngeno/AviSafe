import { useEffect, useState } from 'react';
import {
  getReportContent,
  listIncidents,
  listRecommendations,
  listRiskRegister,
  listReports,
  listSafetyActions,
  reportDownloadUrl,
} from '../api/client';
import type { ReportSummary } from '../api/types';
import { downloadCsv, downloadJson, downloadMarkdownAsPdf } from '../exportUtils';

function ReportRow({ report }: { report: ReportSummary }) {
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handlePdf() {
    setExportingPdf(true);
    try {
      const content = await getReportContent(report.filename);
      await downloadMarkdownAsPdf(
        report.filename.replace(/\.md$/, '.pdf'),
        report.filename,
        content,
      );
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <tr>
      <td>{report.filename}</td>
      <td>{report.target_column ?? '-'}</td>
      <td>{report.experiment_id ?? '-'}</td>
      <td className="tabular">{new Date(report.generated_at).toLocaleString()}</td>
      <td className="tabular">{report.size_kb.toFixed(1)} KB</td>
      <td style={{ display: 'flex', gap: 8 }}>
        <a
          href={reportDownloadUrl(report.filename)}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary btn-small"
          style={{ display: 'inline-block' }}
        >
          View
        </a>
        <button type="button" className="btn-secondary btn-small" onClick={handlePdf} disabled={exportingPdf}>
          {exportingPdf ? 'Exporting…' : 'PDF'}
        </button>
      </td>
    </tr>
  );
}

interface ExportSource {
  label: string;
  description: string;
  load: () => Promise<Record<string, unknown>[]>;
  filenameBase: string;
}

const EXPORT_SOURCES: ExportSource[] = [
  {
    label: 'Recommendations',
    description: 'All entries in the Safety Recommendation Centre.',
    load: () => listRecommendations({ limit: 1000 }) as Promise<any>,
    filenameBase: 'recommendations',
  },
  {
    label: 'Risk Register',
    description: 'All logged risks and their current scoring/status.',
    load: () => listRiskRegister({ limit: 1000 }) as Promise<any>,
    filenameBase: 'risk_register',
  },
  {
    label: 'Incidents',
    description: 'All safety events logged in Incident Management.',
    load: () => listIncidents({ limit: 1000 }) as Promise<any>,
    filenameBase: 'incidents',
  },
  {
    label: 'Safety Actions',
    description: 'All tracked corrective/preventive action tasks.',
    load: () => listSafetyActions({ limit: 1000 }) as Promise<any>,
    filenameBase: 'safety_actions',
  },
];

function DataExportRow({ source }: { source: ExportSource }) {
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: 'csv' | 'json') {
    setBusy(format);
    setError(null);
    try {
      const rows = await source.load();
      if (format === 'csv') {
        downloadCsv(`${source.filenameBase}.csv`, rows);
      } else {
        downloadJson(`${source.filenameBase}.json`, rows);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <tr>
      <td>{source.label}</td>
      <td className="text-muted" style={{ fontSize: 13 }}>
        {source.description}
        {error && <div className="error-state" style={{ marginTop: 4 }}>{error}</div>}
      </td>
      <td style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-secondary btn-small" onClick={() => handleExport('csv')} disabled={busy !== null}>
          {busy === 'csv' ? 'Exporting…' : 'CSV'}
        </button>
        <button type="button" className="btn-secondary btn-small" onClick={() => handleExport('json')} disabled={busy !== null}>
          {busy === 'json' ? 'Exporting…' : 'JSON'}
        </button>
      </td>
    </tr>
  );
}

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
          evidence-based causal attribution at the end of each training run - plus raw data
          exports of the platform&apos;s live operational records.
        </p>
      </div>

      {loading && <div className="loading-state">Loading reports…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && reports.length === 0 && (
        <div className="empty-state">No reports generated yet. Train a model to produce one.</div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="card">
          <h2>Training run reports</h2>
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
                <ReportRow key={report.filename} report={report} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Data exports</h2>
        <p className="text-muted" style={{ fontSize: 13, marginTop: -2, marginBottom: 12 }}>
          Download the platform&apos;s current live records as CSV (for spreadsheets) or JSON (for
          scripting/integration). Generated on demand from the same data shown on each module&apos;s
          page - not a separate snapshot.
        </p>
        <table>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {EXPORT_SOURCES.map((source) => (
              <DataExportRow key={source.filenameBase} source={source} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
