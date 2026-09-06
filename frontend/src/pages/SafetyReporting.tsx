import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createIncident, listIncidents } from '../api/client';
import type { Incident, IncidentCreate } from '../api/types';
import { IncidentStatusBadge, SeverityBadge } from '../components/Badge';

// The five voluntary-report categories this portal accepts. These are
// stored in the same `event_type` field Incident Management uses --
// there is no separate report table, so a submission here appears
// immediately in the Incident Management inbox for triage, rather
// than living in a disconnected silo.
const REPORT_TYPES = ['Hazard', 'Near Miss', 'Unsafe Condition', 'Operational Concern', 'Other Safety Event'];
const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

const BLANK_DRAFT: IncidentCreate = {
  title: '',
  event_type: 'Hazard',
  severity: 'Medium',
  status: 'New',
  description: '',
  occurred_at: null,
  location: '',
  aircraft: '',
  flight_phase: '',
  reported_by: '',
};

export function SafetyReporting() {
  const [form, setForm] = useState<IncidentCreate>(BLANK_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Incident | null>(null);

  const [recent, setRecent] = useState<Incident[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  function loadRecent() {
    setLoadingRecent(true);
    listIncidents({ limit: 200 })
      .then((all) => setRecent(all.filter((i) => REPORT_TYPES.includes(i.event_type))))
      .catch(() => setRecent([]))
      .finally(() => setLoadingRecent(false));
  }

  useEffect(() => {
    loadRecent();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description?.trim()) {
      setError('Please describe what you observed.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createIncident({
        ...form,
        title: form.title.trim() || `${form.event_type}: ${form.description.slice(0, 60)}`,
      });
      setSubmitted(created);
      setForm(BLANK_DRAFT);
      loadRecent();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  const summary = useMemo(() => {
    const untriaged = recent.filter((r) => r.status === 'New').length;
    return { total: recent.length, untriaged };
  }, [recent]);

  return (
    <div>
      <div className="page-header">
        <h1>Safety Reporting</h1>
        <p>
          A voluntary safety-reporting portal - hazards, near misses, unsafe conditions, and
          operational concerns, reported by anyone. Submissions feed directly into{' '}
          <Link to="/incidents">Incident Management</Link> for triage.
        </p>
      </div>

      {submitted && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--risk-low)' }}>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--risk-low)' }}>Report submitted.</strong> Thank you -
            this has been logged as {submitted.id} and will be triaged in Incident Management.
          </p>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Submit a report</h3>
        <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
          Leave &ldquo;Your name&rdquo; blank to report anonymously.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label>Report type</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date observed</label>
              <input
                type="date"
                value={form.occurred_at ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value || null }))}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label>What happened?</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe what you observed, as much detail as you can provide…"
            />
          </div>

          <div className="field-row" style={{ marginTop: 10 }}>
            <div className="field">
              <label>Location (optional)</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Aircraft (optional)</label>
              <input
                value={form.aircraft}
                onChange={(e) => setForm((f) => ({ ...f, aircraft: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Flight phase (optional)</label>
              <input
                value={form.flight_phase}
                onChange={(e) => setForm((f) => ({ ...f, flight_phase: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Your name (optional)</label>
              <input
                value={form.reported_by}
                onChange={(e) => setForm((f) => ({ ...f, reported_by: e.target.value }))}
                placeholder="Anonymous"
              />
            </div>
          </div>

          {error && (
            <div className="error-state" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn" style={{ marginTop: 14 }} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </form>
      </div>

      {!loadingRecent && recent.length > 0 && (
        <>
          <div className="stat-grid" style={{ marginTop: 20, marginBottom: 16 }}>
            <div className="stat-tile">
              <h3>Reports submitted (portal)</h3>
              <div className="stat-value">{summary.total}</div>
            </div>
            <div className="stat-tile">
              <h3>Awaiting triage</h3>
              <div className="stat-value">{summary.untriaged}</div>
            </div>
          </div>

          <div className="card">
            <h2>Recent reports</h2>
            <p className="text-muted" style={{ fontSize: 13, marginTop: -2, marginBottom: 12 }}>
              Submitted through this portal - full triage and workflow happens in{' '}
              <Link to="/incidents">Incident Management</Link>.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported by</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td>{r.event_type}</td>
                    <td style={{ maxWidth: 320 }}>{r.description || r.title}</td>
                    <td>
                      <SeverityBadge severity={r.severity} />
                    </td>
                    <td>
                      <IncidentStatusBadge status={r.status} />
                    </td>
                    <td>{r.reported_by || 'Anonymous'}</td>
                    <td className="tabular">{r.occurred_at ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
