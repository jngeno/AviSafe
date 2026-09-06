import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  createIncident,
  deleteIncident,
  listIncidents,
  listRecommendations,
  updateIncident,
} from '../api/client';
import type { Incident, IncidentCreate, Recommendation } from '../api/types';
import { IncidentStatusBadge, SeverityBadge } from '../components/Badge';
import { CATEGORY_ORDER, categoryColor } from '../components/categoryColor';

const EVENT_TYPES = ['Accident', 'Incident', 'Near Miss', 'Hazard', 'Safety Report', 'Operational Event'];
const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const STATUS_FLOW = ['New', 'Triaged', 'Investigating', 'Analysed', 'Action Required', 'Resolved', 'Closed'];

const BLANK_DRAFT: IncidentCreate = {
  title: '',
  event_type: 'Safety Report',
  category: '',
  severity: 'Medium',
  status: 'New',
  description: '',
  occurred_at: null,
  location: '',
  airport: '',
  aircraft: '',
  operator: '',
  flight_phase: '',
  weather: '',
  assigned_investigator: '',
  linked_recommendation_id: null,
};

function AddIncidentForm({
  recommendations,
  onCreated,
  onCancel,
}: {
  recommendations: Recommendation[];
  onCreated: (incident: Incident) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<IncidentCreate>(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createIncident(form);
      onCreated(created);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to create incident');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Log a safety event</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
        Record an accident, incident, near miss, hazard, safety report, or operational event for
        triage and investigation tracking.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Short summary of the event"
            />
          </div>
          <div className="field">
            <label>Event type</label>
            <select
              value={form.event_type}
              onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
            >
              {EVENT_TYPES.map((t) => (
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
        </div>

        <div className="field" style={{ marginTop: 10 }}>
          <label>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What happened?"
          />
        </div>

        <div className="field-row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Category (optional)</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">None</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date occurred</label>
            <input
              type="date"
              value={form.occurred_at ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value || null }))}
            />
          </div>
          <div className="field">
            <label>Flight phase</label>
            <input
              value={form.flight_phase}
              onChange={(e) => setForm((f) => ({ ...f, flight_phase: e.target.value }))}
              placeholder="e.g. Approach"
            />
          </div>
          <div className="field">
            <label>Weather</label>
            <input
              value={form.weather}
              onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))}
              placeholder="e.g. IMC"
            />
          </div>
        </div>

        <div className="field-row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Airport</label>
            <input
              value={form.airport}
              onChange={(e) => setForm((f) => ({ ...f, airport: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Aircraft</label>
            <input
              value={form.aircraft}
              onChange={(e) => setForm((f) => ({ ...f, aircraft: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Operator</label>
            <input
              value={form.operator}
              onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
            />
          </div>
        </div>

        <div className="field-row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Assigned investigator</label>
            <input
              value={form.assigned_investigator}
              onChange={(e) => setForm((f) => ({ ...f, assigned_investigator: e.target.value }))}
              placeholder="Unassigned"
            />
          </div>
          <div className="field">
            <label>Linked recommendation (optional)</label>
            <select
              value={form.linked_recommendation_id ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  linked_recommendation_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
            >
              <option value="">None</option>
              {recommendations.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.id} - {rec.recommendation.slice(0, 60)}
                  {rec.recommendation.length > 60 ? '…' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="error-state" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Log event'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function IncidentRow({
  incident,
  expanded,
  onToggle,
  onSaved,
  onDeleted,
}: {
  incident: Incident;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: Incident) => void;
  onDeleted: (id: number) => void;
}) {
  const [status, setStatus] = useState(incident.status);
  const [investigator, setInvestigator] = useState(incident.assigned_investigator);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateIncident(incident.id, {
        status,
        assigned_investigator: investigator,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteIncident(incident.id);
      onDeleted(incident.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <tr id={`incident-row-${incident.id}`} style={expanded ? { background: 'var(--surface-2)' } : undefined}>
        <td style={{ maxWidth: 260 }}>{incident.title}</td>
        <td>{incident.event_type}</td>
        <td style={{ color: incident.category ? categoryColor(incident.category) : undefined, fontWeight: 600 }}>
          {incident.category || '-'}
        </td>
        <td>
          <SeverityBadge severity={incident.severity} />
        </td>
        <td>
          <IncidentStatusBadge status={incident.status} />
        </td>
        <td>{incident.assigned_investigator || '-'}</td>
        <td className="tabular">{incident.occurred_at ?? '-'}</td>
        <td>
          <button type="button" className="btn-secondary btn-small" onClick={onToggle}>
            {expanded ? 'Hide' : 'Manage'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8}>
            <div className="card" style={{ margin: '4px 0' }}>
              <p>
                <strong>Description:</strong> {incident.description || '-'}
              </p>
              <div className="field-row" style={{ marginTop: 8 }}>
                <div>
                  <p style={{ fontSize: 13 }}>
                    <strong>Location:</strong> {incident.location || '-'}
                  </p>
                  <p style={{ fontSize: 13 }}>
                    <strong>Airport:</strong> {incident.airport || '-'}
                  </p>
                  <p style={{ fontSize: 13 }}>
                    <strong>Aircraft:</strong> {incident.aircraft || '-'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 13 }}>
                    <strong>Operator:</strong> {incident.operator || '-'}
                  </p>
                  <p style={{ fontSize: 13 }}>
                    <strong>Flight phase:</strong> {incident.flight_phase || '-'}
                  </p>
                  <p style={{ fontSize: 13 }}>
                    <strong>Weather:</strong> {incident.weather || '-'}
                  </p>
                </div>
              </div>
              {incident.linked_recommendation_id && (
                <p style={{ fontSize: 13 }}>
                  <strong>Linked recommendation:</strong>{' '}
                  <Link to={`/recommendations?highlight=${incident.linked_recommendation_id}`}>
                    {incident.linked_recommendation_id} →
                  </Link>
                </p>
              )}

              <div className="field-row" style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Assigned investigator</label>
                  <input
                    value={investigator}
                    onChange={(e) => setInvestigator(e.target.value)}
                    placeholder="Unassigned"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
                <button type="button" className="btn btn-small" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save workflow update'}
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <Link
                  to={`/investigations?incident_id=${incident.id}`}
                  className="btn-secondary btn-small"
                  style={{ display: 'inline-block' }}
                >
                  Open investigation →
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function IncidentManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(
    highlightId ? Number(highlightId) : null,
  );

  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    setLoading(true);
    listIncidents({
      event_type: eventType || undefined,
      severity: severity || undefined,
      status: status || undefined,
      search: search || undefined,
    })
      .then(setIncidents)
      .catch((err) => setError(err?.message ?? 'Failed to load incidents'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, severity, status]);

  // Deep-link support: /incidents?highlight=<id>, followed from
  // Investigations or Safety Reporting.
  useEffect(() => {
    if (!highlightId || incidents.length === 0) return;
    const id = Number(highlightId);
    setExpandedId(id);
    document.getElementById(`incident-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSearchParams((params) => {
      params.delete('highlight');
      return params;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents]);

  useEffect(() => {
    listRecommendations({ limit: 200 })
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  const summary = useMemo(() => {
    const open = incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed').length;
    const actionRequired = incidents.filter((i) => i.status === 'Action Required').length;
    const unassigned = incidents.filter(
      (i) => !i.assigned_investigator && i.status !== 'Closed' && i.status !== 'Resolved',
    ).length;
    return { total: incidents.length, open, actionRequired, unassigned };
  }, [incidents]);

  function handleCreated(created: Incident) {
    setIncidents((rows) => [created, ...rows]);
    setShowAdd(false);
  }

  function handleSaved(updated: Incident) {
    setIncidents((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleDeleted(id: number) {
    setIncidents((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Incident Management</h1>
        <p>
          Log, triage, and track safety events through their full lifecycle - from first report
          to closure. Entries are authored directly by safety staff.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            className={showAdd ? 'btn' : 'btn-secondary'}
            onClick={() => setShowAdd((v) => !v)}
          >
            + Log event
          </button>
        </div>
      </div>

      {showAdd && (
        <div style={{ marginBottom: 16 }}>
          <AddIncidentForm
            recommendations={recommendations}
            onCreated={handleCreated}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {!loading && !error && incidents.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-tile">
            <h3>Total events</h3>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-tile">
            <h3>Open</h3>
            <div className="stat-value">{summary.open}</div>
          </div>
          <div className="stat-tile">
            <h3>Action required</h3>
            <div className="stat-value" style={{ color: summary.actionRequired > 0 ? 'var(--risk-high)' : undefined }}>
              {summary.actionRequired}
            </div>
          </div>
          <div className="stat-tile">
            <h3>Unassigned (open)</h3>
            <div className="stat-value">{summary.unassigned}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Event type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="">All types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">All severities</option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <form className="field" onSubmit={handleSearchSubmit}>
            <label>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, description, airport, aircraft…"
            />
          </form>
        </div>
      </div>

      {loading && <div className="loading-state">Loading incidents…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && incidents.length === 0 && (
        <div className="empty-state">
          No safety events logged yet. Use &ldquo;+ Log event&rdquo; above to start the inbox.
        </div>
      )}

      {!loading && !error && incidents.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Investigator</th>
                <th>Occurred</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <IncidentRow
                  key={incident.id}
                  incident={incident}
                  expanded={expandedId === incident.id}
                  onToggle={() => setExpandedId(expandedId === incident.id ? null : incident.id)}
                  onSaved={handleSaved}
                  onDeleted={handleDeleted}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
