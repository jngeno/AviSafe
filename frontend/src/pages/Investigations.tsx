import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  addInvestigationEvidence,
  addInvestigationTimelineEntry,
  createInvestigation,
  deleteInvestigation,
  deleteInvestigationEvidence,
  deleteInvestigationTimelineEntry,
  getInvestigation,
  listIncidents,
  listInvestigations,
  updateInvestigation,
} from '../api/client';
import type { Incident, Investigation, InvestigationCreate } from '../api/types';
import { InvestigationStatusBadge, SeverityBadge } from '../components/Badge';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Pending Review', 'Complete'];

function OpenInvestigationForm({
  incidents,
  preselectedIncidentId,
  onCreated,
  onCancel,
}: {
  incidents: Incident[];
  preselectedIncidentId?: number | null;
  onCreated: (inv: Investigation) => void;
  onCancel: () => void;
}) {
  const [incidentId, setIncidentId] = useState<number | ''>(preselectedIncidentId ?? '');
  const [leadInvestigator, setLeadInvestigator] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [targetCompletion, setTargetCompletion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!incidentId) {
      setError('Select an incident to investigate.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: InvestigationCreate = {
        incident_id: incidentId,
        lead_investigator: leadInvestigator,
        started_at: startedAt || null,
        target_completion: targetCompletion || null,
      };
      const created = await createInvestigation(payload);
      onCreated(created);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to open investigation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Open an investigation</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
        Every investigation is worked against a specific logged incident. Log the event in
        Incident Management first if it isn&apos;t listed below.
      </p>

      {incidents.length === 0 ? (
        <div className="empty-state">
          No incidents logged yet - go to Incident Management to log one first.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field" style={{ flex: 2 }}>
              <label>Incident</label>
              <select
                value={incidentId}
                onChange={(e) => setIncidentId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Select an incident…</option>
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id} - {inc.title} ({inc.event_type}, {inc.severity})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Lead investigator</label>
              <input
                value={leadInvestigator}
                onChange={(e) => setLeadInvestigator(e.target.value)}
                placeholder="Unassigned"
              />
            </div>
          </div>
          <div className="field-row" style={{ marginTop: 10 }}>
            <div className="field">
              <label>Started</label>
              <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
            </div>
            <div className="field">
              <label>Target completion</label>
              <input
                type="date"
                value={targetCompletion}
                onChange={(e) => setTargetCompletion(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="error-state" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Opening…' : 'Open investigation'}
            </button>
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TimelinePanel({ investigation, onChanged }: { investigation: Investigation; onChanged: (updated: Investigation) => void }) {
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addInvestigationTimelineEntry(investigation.id, {
        note,
        occurred_at: occurredAt || null,
      });
      setNote('');
      setOccurredAt('');
      const fresh = await getInvestigation(investigation.id);
      onChanged(fresh);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: number) {
    await deleteInvestigationTimelineEntry(investigation.id, entryId);
    const fresh = await getInvestigation(investigation.id);
    onChanged(fresh);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ marginBottom: 6 }}>
        <strong>Timeline</strong>
      </p>
      {investigation.timeline.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13 }}>
          No timeline entries yet.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {investigation.timeline.map((entry) => (
            <li
              key={entry.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                padding: '6px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 13,
              }}
            >
              <span>
                {entry.occurred_at && <span className="tabular text-muted">{entry.occurred_at} - </span>}
                {entry.note}
              </span>
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => handleDelete(entry.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="field-row" style={{ marginTop: 10, alignItems: 'flex-end' }}>
        <div className="field">
          <label>Date</label>
          <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>Entry</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened at this point?" />
        </div>
        <button type="submit" className="btn-secondary btn-small" disabled={saving || !note.trim()}>
          {saving ? 'Adding…' : 'Add entry'}
        </button>
      </form>
    </div>
  );
}

const EVIDENCE_SOURCE_TYPES = ['Document', 'Data Analysis', 'Statement', 'Media Reference', 'External Report', 'Other'];

function EvidencePanel({ investigation, onChanged }: { investigation: Investigation; onChanged: (updated: Investigation) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState('Document');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addInvestigationEvidence(investigation.id, {
        title,
        description,
        source_type: sourceType,
        reference,
      });
      setTitle('');
      setDescription('');
      setReference('');
      const fresh = await getInvestigation(investigation.id);
      onChanged(fresh);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(evidenceId: number) {
    await deleteInvestigationEvidence(investigation.id, evidenceId);
    const fresh = await getInvestigation(investigation.id);
    onChanged(fresh);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ marginBottom: 6 }}>
        <strong>Evidence</strong>
      </p>
      <p className="text-muted" style={{ fontSize: 12, marginTop: -2, marginBottom: 8 }}>
        Structured evidence references logged against this investigation - not file uploads (no
        attachment storage exists yet), but a citable record of what supports the findings.
      </p>
      {investigation.evidence.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13 }}>
          No evidence logged yet.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {investigation.evidence.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 13,
              }}
            >
              <div>
                <span className="badge" style={{ marginRight: 8 }}>
                  {item.source_type}
                </span>
                <strong>{item.title}</strong>
                {item.description && <div className="text-muted" style={{ marginTop: 2 }}>{item.description}</div>}
                {item.reference && (
                  <div className="text-muted" style={{ marginTop: 2, fontSize: 12 }}>
                    Reference: {item.reference}
                  </div>
                )}
              </div>
              <button type="button" className="btn-secondary btn-small" onClick={() => handleDelete(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} style={{ marginTop: 10 }}>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is this evidence?" />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              {EVIDENCE_SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row" style={{ marginTop: 8 }}>
          <div className="field" style={{ flex: 2 }}>
            <label>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does it show?" />
          </div>
          <div className="field">
            <label>Reference (optional)</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Citation, link, doc ref…" />
          </div>
        </div>
        <button type="submit" className="btn-secondary btn-small" style={{ marginTop: 8 }} disabled={saving || !title.trim()}>
          {saving ? 'Adding…' : 'Add evidence'}
        </button>
      </form>
    </div>
  );
}

function InvestigationCard({
  investigation,
  initiallyExpanded,
  onSaved,
  onDeleted,
}: {
  investigation: Investigation;
  initiallyExpanded?: boolean;
  onSaved: (updated: Investigation) => void;
  onDeleted: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded ?? false);
  const [current, setCurrent] = useState(investigation);
  const [status, setStatus] = useState(investigation.status);
  const [summary, setSummary] = useState(investigation.summary);
  const [rootCause, setRootCause] = useState(investigation.root_cause);
  const [factorsText, setFactorsText] = useState(investigation.contributing_factors.join(', '));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCurrent(investigation);
  }, [investigation]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateInvestigation(current.id, {
        status,
        summary,
        root_cause: rootCause,
        contributing_factors: factorsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      const merged = { ...updated, incident: current.incident, timeline: current.timeline };
      setCurrent(merged);
      onSaved(merged);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteInvestigation(current.id);
      onDeleted(current.id);
    } finally {
      setDeleting(false);
    }
  }

  const incident = current.incident;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div className="defense-badge-row" style={{ marginBottom: 6 }}>
            <InvestigationStatusBadge status={current.status} />
            {incident && <SeverityBadge severity={incident.severity} />}
          </div>
          <h3 style={{ margin: 0 }}>{incident ? incident.title : `Incident ${current.incident_id}`}</h3>
          <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
            {incident?.event_type ?? '-'} · Lead: {current.lead_investigator || 'Unassigned'} · Started:{' '}
            {current.started_at ?? '-'}
            {current.target_completion && ` · Target: ${current.target_completion}`}
          </p>
        </div>
        <button type="button" className="btn-secondary btn-small" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide' : 'Manage'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          {incident && (
            <p className="text-muted" style={{ fontSize: 13 }}>
              <strong>Incident description:</strong> {incident.description || '-'}{' '}
              <Link to={`/incidents?highlight=${incident.id}`}>View in Incident Management →</Link>
            </p>
          )}

          <div className="field-row" style={{ marginTop: 10 }}>
            <div className="field">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label>Summary</label>
            <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label>Root cause</label>
            <textarea rows={2} value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label>Contributing factors (comma-separated)</label>
            <input value={factorsText} onChange={(e) => setFactorsText(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" className="btn btn-small" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save investigation'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>

          <EvidencePanel
            investigation={current}
            onChanged={(fresh) => {
              setCurrent(fresh);
              onSaved(fresh);
            }}
          />

          <TimelinePanel
            investigation={current}
            onChanged={(fresh) => {
              setCurrent(fresh);
              onSaved(fresh);
            }}
          />
        </div>
      )}
    </div>
  );
}

export function Investigations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const incidentIdParam = searchParams.get('incident_id');

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [scopedToIncident, setScopedToIncident] = useState<number | null>(null);
  const [formPreselectedIncidentId, setFormPreselectedIncidentId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    listInvestigations({ status: status || undefined })
      .then(setInvestigations)
      .catch((err) => setError(err?.message ?? 'Failed to load investigations'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    listIncidents({ limit: 200 })
      .then(setIncidents)
      .catch(() => setIncidents([]));
  }, []);

  // Deep-link support: /investigations?incident_id=<id>, followed from an
  // Incident Management row. If that incident already has one or more
  // investigations, jump straight to them (no manual re-lookup needed);
  // otherwise open the "start investigation" form pre-scoped to it, per
  // the "don't recreate the incident to start an investigation" workflow.
  useEffect(() => {
    if (!incidentIdParam) return;
    const id = Number(incidentIdParam);
    setLoading(true);
    listInvestigations({ incident_id: id })
      .then((matches) => {
        if (matches.length > 0) {
          setInvestigations(matches);
          setScopedToIncident(id);
        } else {
          setFormPreselectedIncidentId(id);
          setShowAdd(true);
        }
      })
      .catch((err) => setError(err?.message ?? 'Failed to load investigations'))
      .finally(() => setLoading(false));
    setSearchParams((params) => {
      params.delete('incident_id');
      return params;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentIdParam]);

  const summary = useMemo(() => {
    const open = investigations.filter((i) => i.status !== 'Complete').length;
    const pendingReview = investigations.filter((i) => i.status === 'Pending Review').length;
    return { total: investigations.length, open, pendingReview };
  }, [investigations]);

  function handleCreated(created: Investigation) {
    setInvestigations((rows) => [created, ...rows]);
    setShowAdd(false);
  }

  function handleSaved(updated: Investigation) {
    setInvestigations((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleDeleted(id: number) {
    setInvestigations((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Investigations</h1>
        <p>
          A dedicated workspace for working an incident from evidence to root cause to
          recommendation - each investigation is tied to a specific logged safety event, with its
          own chronological timeline.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            className={showAdd ? 'btn' : 'btn-secondary'}
            onClick={() => setShowAdd((v) => !v)}
          >
            + Open investigation
          </button>
        </div>
      </div>

      {scopedToIncident !== null && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--risk-info)' }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            Showing investigation(s) for incident {scopedToIncident} only.{' '}
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => {
                setScopedToIncident(null);
                load();
              }}
              style={{ marginLeft: 8 }}
            >
              Show all investigations
            </button>
          </p>
        </div>
      )}

      {showAdd && (
        <div style={{ marginBottom: 16 }}>
          <OpenInvestigationForm
            incidents={incidents}
            preselectedIncidentId={formPreselectedIncidentId}
            onCreated={handleCreated}
            onCancel={() => {
              setShowAdd(false);
              setFormPreselectedIncidentId(null);
            }}
          />
        </div>
      )}

      {!loading && !error && investigations.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-tile">
            <h3>Total investigations</h3>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-tile">
            <h3>Open (not complete)</h3>
            <div className="stat-value">{summary.open}</div>
          </div>
          <div className="stat-tile">
            <h3>Pending review</h3>
            <div className="stat-value">{summary.pendingReview}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">Loading investigations…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && investigations.length === 0 && (
        <div className="empty-state">
          No investigations open yet. Use &ldquo;+ Open investigation&rdquo; above to start one
          against a logged incident.
        </div>
      )}

      {!loading && !error && investigations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {investigations.map((inv) => (
            <InvestigationCard
              key={inv.id}
              investigation={inv}
              initiallyExpanded={scopedToIncident !== null}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
