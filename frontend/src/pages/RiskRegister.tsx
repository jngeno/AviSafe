import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  createRiskRegisterEntry,
  deleteRiskRegisterEntry,
  listRecommendations,
  listRiskRegister,
  updateRiskRegisterEntry,
} from '../api/client';
import type { Recommendation, RiskRegisterCreate, RiskRegisterEntry } from '../api/types';
import { RiskLevelBadge, RiskStatusBadge } from '../components/Badge';
import { CATEGORY_ORDER, categoryColor } from '../components/categoryColor';

const STATUS_OPTIONS = ['Identified', 'Under Review', 'Mitigating', 'Monitoring', 'Closed'];
const RISK_LEVELS = ['Critical', 'High', 'Moderate', 'Low'];
const SCALE = [1, 2, 3, 4, 5];

const BLANK_DRAFT: RiskRegisterCreate = {
  title: '',
  category: CATEGORY_ORDER[0],
  description: '',
  likelihood: 3,
  severity: 3,
  status: 'Identified',
  owner: '',
  mitigation: '',
  linked_recommendation_id: null,
  review_date: null,
};

function riskLevelFor(score: number): 'Low' | 'Moderate' | 'High' | 'Critical' {
  if (score >= 16) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Moderate';
  return 'Low';
}

function levelColor(level: string): string {
  switch (level) {
    case 'Critical':
      return 'var(--risk-critical)';
    case 'High':
      return 'var(--risk-high)';
    case 'Moderate':
      return 'var(--risk-moderate)';
    default:
      return 'var(--risk-low)';
  }
}

function AddRiskForm({
  recommendations,
  onCreated,
  onCancel,
}: {
  recommendations: Recommendation[];
  onCreated: (entry: RiskRegisterEntry) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RiskRegisterCreate>(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewScore = form.likelihood * form.severity;
  const previewLevel = riskLevelFor(previewScore);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createRiskRegisterEntry(form);
      onCreated(created);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to create risk entry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Add a risk</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
        Log a hazard or risk for tracking through mitigation to closure. Likelihood and severity
        follow a standard 1 (lowest) to 5 (highest) scale - the risk score and level are computed
        automatically.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Unstabilized approach rate at high-altitude airports"
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="General">General</option>
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: 10 }}>
          <label>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What is the hazard, and what evidence supports tracking it?"
          />
        </div>

        <div className="field-row" style={{ marginTop: 10, alignItems: 'flex-end' }}>
          <div className="field">
            <label>Likelihood (1-5)</label>
            <select
              value={form.likelihood}
              onChange={(e) => setForm((f) => ({ ...f, likelihood: Number(e.target.value) }))}
            >
              {SCALE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Severity (1-5)</label>
            <select
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: Number(e.target.value) }))}
            >
              {SCALE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Computed risk</label>
            <div style={{ padding: '8px 0' }}>
              <span className="tabular" style={{ fontWeight: 700, marginRight: 8 }}>
                {previewScore}
              </span>
              <RiskLevelBadge level={previewLevel} />
            </div>
          </div>
          <div className="field">
            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Owner</label>
            <input
              value={form.owner}
              onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              placeholder="e.g. Flight Safety Officer"
            />
          </div>
          <div className="field">
            <label>Review date</label>
            <input
              type="date"
              value={form.review_date ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, review_date: e.target.value || null }))}
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

        <div className="field" style={{ marginTop: 10 }}>
          <label>Mitigation plan (optional)</label>
          <textarea
            rows={2}
            value={form.mitigation}
            onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))}
            placeholder="What controls reduce this risk, and what's the plan to close it out?"
          />
        </div>

        {error && (
          <div className="error-state" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save risk'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function RiskRow({
  entry,
  expanded,
  onToggle,
  onSaved,
  onDeleted,
}: {
  entry: RiskRegisterEntry;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: RiskRegisterEntry) => void;
  onDeleted: (id: number) => void;
}) {
  const [status, setStatus] = useState(entry.status);
  const [owner, setOwner] = useState(entry.owner);
  const [mitigation, setMitigation] = useState(entry.mitigation);
  const [reviewDate, setReviewDate] = useState(entry.review_date ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateRiskRegisterEntry(entry.id, {
        status,
        owner,
        mitigation,
        review_date: reviewDate || null,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteRiskRegisterEntry(entry.id);
      onDeleted(entry.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <tr id={`risk-row-${entry.id}`} style={expanded ? { background: 'var(--surface-2)' } : undefined}>
        <td style={{ maxWidth: 280 }}>{entry.title}</td>
        <td style={{ color: categoryColor(entry.category), fontWeight: 600 }}>
          {entry.category || '-'}
        </td>
        <td className="tabular">
          {entry.likelihood} × {entry.severity} = {entry.risk_score}
        </td>
        <td>
          <RiskLevelBadge level={entry.risk_level} />
        </td>
        <td>
          <RiskStatusBadge status={entry.status} />
        </td>
        <td>{entry.owner || '-'}</td>
        <td className="tabular">{entry.review_date ?? '-'}</td>
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
                <strong>Description:</strong> {entry.description || '-'}
              </p>
              {entry.linked_recommendation_id && (
                <p style={{ fontSize: 13 }}>
                  <strong>Linked recommendation:</strong>{' '}
                  <Link to={`/recommendations?highlight=${entry.linked_recommendation_id}`}>
                    {entry.linked_recommendation_id} →
                  </Link>
                </p>
              )}

              <div className="field-row" style={{ marginTop: 12 }}>
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
                <div className="field">
                  <label>Owner</label>
                  <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Unassigned" />
                </div>
                <div className="field">
                  <label>Review date</label>
                  <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
                </div>
              </div>

              <div className="field" style={{ marginTop: 10 }}>
                <label>Mitigation plan</label>
                <textarea
                  rows={2}
                  value={mitigation}
                  onChange={(e) => setMitigation(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
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
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function RiskRegister() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [entries, setEntries] = useState<RiskRegisterEntry[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(
    highlightId ? Number(highlightId) : null,
  );

  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [search, setSearch] = useState('');
  const [matrixCell, setMatrixCell] = useState<{ likelihood: number; severity: number } | null>(
    null,
  );

  const [showAdd, setShowAdd] = useState(false);

  function load() {
    setLoading(true);
    listRiskRegister({
      category: category || undefined,
      status: status || undefined,
      risk_level: riskLevel || undefined,
      search: search || undefined,
    })
      .then(setEntries)
      .catch((err) => setError(err?.message ?? 'Failed to load risk register'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, riskLevel]);

  // Deep-link support: /risk-register?highlight=<id>, e.g. from a
  // recommendation's "Referenced by risk register" list.
  useEffect(() => {
    if (!highlightId || entries.length === 0) return;
    document.getElementById(`risk-row-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSearchParams((params) => {
      params.delete('highlight');
      return params;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  useEffect(() => {
    listRecommendations({ limit: 200 })
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  const filtered = useMemo(() => {
    if (!matrixCell) return entries;
    return entries.filter(
      (e) => e.likelihood === matrixCell.likelihood && e.severity === matrixCell.severity,
    );
  }, [entries, matrixCell]);

  const matrixCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      const key = `${e.likelihood}-${e.severity}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let open = 0;
    let highOrCritical = 0;
    let overdueReview = 0;
    for (const e of entries) {
      if (e.status !== 'Closed') open += 1;
      if (e.risk_level === 'High' || e.risk_level === 'Critical') highOrCritical += 1;
      if (e.review_date && e.review_date < today && e.status !== 'Closed') overdueReview += 1;
    }
    return { total: entries.length, open, highOrCritical, overdueReview };
  }, [entries]);

  function handleCreated(created: RiskRegisterEntry) {
    setEntries((rows) => [created, ...rows]);
    setShowAdd(false);
  }

  function handleSaved(updated: RiskRegisterEntry) {
    setEntries((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleDeleted(id: number) {
    setEntries((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Risk Register</h1>
        <p>
          A living record of identified hazards and risks, scored on a standard 5×5
          likelihood/severity matrix and tracked through mitigation to closure. Entries are
          authored directly by safety staff, optionally linked to a Safety Recommendation Centre
          entry for traceability.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            className={showAdd ? 'btn' : 'btn-secondary'}
            onClick={() => setShowAdd((v) => !v)}
          >
            + Add risk
          </button>
        </div>
      </div>

      {showAdd && (
        <div style={{ marginBottom: 16 }}>
          <AddRiskForm
            recommendations={recommendations}
            onCreated={handleCreated}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-tile">
            <h3>Total risks</h3>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-tile">
            <h3>Open (not closed)</h3>
            <div className="stat-value">{summary.open}</div>
          </div>
          <div className="stat-tile">
            <h3>High / critical</h3>
            <div className="stat-value">{summary.highOrCritical}</div>
          </div>
          <div className="stat-tile">
            <h3>Overdue review</h3>
            <div className="stat-value" style={{ color: summary.overdueReview > 0 ? 'var(--risk-high)' : undefined }}>
              {summary.overdueReview}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="card">
          <h2>Risk matrix</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: -2, marginBottom: 12 }}>
            Click a cell to filter the table below to that likelihood/severity combination.
            {matrixCell && (
              <>
                {' '}
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={() => setMatrixCell(null)}
                  style={{ marginLeft: 8 }}
                >
                  Clear filter
                </button>
              </>
            )}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 480 }}>
              <tbody>
                {[5, 4, 3, 2, 1].map((likelihood) => (
                  <tr key={likelihood}>
                    <td className="tabular text-muted" style={{ fontSize: 12, paddingRight: 8 }}>
                      L{likelihood}
                    </td>
                    {SCALE.map((severity) => {
                      const score = likelihood * severity;
                      const level = riskLevelFor(score);
                      const count = matrixCounts.get(`${likelihood}-${severity}`) ?? 0;
                      const isSelected =
                        matrixCell?.likelihood === likelihood && matrixCell?.severity === severity;
                      return (
                        <td key={severity} style={{ padding: 0 }}>
                          <button
                            type="button"
                            onClick={() =>
                              setMatrixCell(
                                isSelected ? null : { likelihood, severity },
                              )
                            }
                            title={`Likelihood ${likelihood} × Severity ${severity} = ${score} (${level})`}
                            style={{
                              width: 52,
                              height: 40,
                              border: isSelected ? '2px solid var(--text-primary)' : '1px solid transparent',
                              borderRadius: 6,
                              background: `color-mix(in srgb, ${levelColor(level)} ${count > 0 ? 45 : 22}%, transparent)`,
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              fontWeight: count > 0 ? 700 : 400,
                              fontSize: 13,
                            }}
                          >
                            {count > 0 ? count : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td />
                  {SCALE.map((severity) => (
                    <td key={severity} className="tabular text-muted" style={{ fontSize: 12, textAlign: 'center' }}>
                      S{severity}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="diverging-legend" style={{ marginTop: 12 }}>
            {RISK_LEVELS.map((l) => (
              <span key={l}>
                <i style={{ background: levelColor(l) }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="General">General</option>
            </select>
          </div>
          <div className="field">
            <label>Risk level</label>
            <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
              <option value="">All levels</option>
              {RISK_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
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
          <form className="field" onSubmit={handleSearchSubmit}>
            <label>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, description, owner…"
            />
          </form>
        </div>
      </div>

      {loading && <div className="loading-state">Loading risk register…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <div className="empty-state">
          No risks logged yet. Use &ldquo;+ Add risk&rdquo; above to start the register.
        </div>
      )}

      {!loading && !error && entries.length > 0 && filtered.length === 0 && (
        <div className="empty-state">No risks match this matrix cell. Clear the filter to see all.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Score</th>
                <th>Level</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Review</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <RiskRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
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
