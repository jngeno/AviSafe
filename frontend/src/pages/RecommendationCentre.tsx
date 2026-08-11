import { useEffect, useState } from 'react';
import { listRecommendations, updateRecommendation } from '../api/client';
import type { Recommendation } from '../api/types';
import { PriorityBadge, WorkflowStatusBadge } from '../components/Badge';
import { categoryColor } from '../components/categoryColor';
import { CATEGORY_ORDER } from '../components/categoryColor';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed', 'Dismissed'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

function RecommendationRow({
  rec,
  expanded,
  onToggle,
  onSaved,
}: {
  rec: Recommendation;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: Recommendation) => void;
}) {
  const [status, setStatus] = useState(rec.status);
  const [officer, setOfficer] = useState(rec.assigned_officer ?? '');
  const [dueDate, setDueDate] = useState(rec.due_date ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateRecommendation(rec.id, {
        status,
        assigned_officer: officer || undefined,
        due_date: dueDate || undefined,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr>
        <td style={{ color: categoryColor(rec.category), fontWeight: 600 }}>{rec.category}</td>
        <td>
          <PriorityBadge priority={rec.priority} />
        </td>
        <td style={{ maxWidth: 360 }}>{rec.recommendation}</td>
        <td>{rec.stakeholder}</td>
        <td>
          <WorkflowStatusBadge status={rec.status} />
        </td>
        <td>{rec.assigned_officer || '—'}</td>
        <td className="tabular">{rec.due_date ?? '—'}</td>
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
              <div className="field-row">
                <div>
                  <p>
                    <strong>ICAO reference:</strong> {rec.icao_reference || '—'}
                  </p>
                  <p>
                    <strong>HFACS classification:</strong> {rec.hfacs_classification || '—'}
                  </p>
                  <p>
                    <strong>Swiss Cheese layer:</strong> {rec.swiss_cheese_layer || '—'}
                  </p>
                  <p>
                    <strong>Confidence:</strong> {(rec.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <p style={{ marginBottom: 6 }}>
                  <strong>Evidence</strong>
                </p>
                <div className="evidence-list">
                  {rec.evidence.map((item) => (
                    <span className="evidence-chip" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="field-row" style={{ marginTop: 16 }}>
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
                  <label>Assigned officer</label>
                  <input value={officer} onChange={(e) => setOfficer(e.target.value)} placeholder="Unassigned" />
                </div>
                <div className="field">
                  <label>Due date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <button type="button" className="btn btn-small" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save workflow update'}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function RecommendationCentre() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  function load() {
    setLoading(true);
    listRecommendations({
      category: category || undefined,
      priority: priority || undefined,
      status: status || undefined,
      search: search || undefined,
    })
      .then(setRecommendations)
      .catch((err) => setError(err?.message ?? 'Failed to load recommendations'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, priority, status]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function handleSaved(updated: Recommendation) {
    setRecommendations((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Safety Recommendation Centre</h1>
        <p>
          Evidence-based recommendations synthesised from SHAP-driven pattern analysis, mapped to
          ICAO references, HFACS classification, and the Swiss Cheese Model layer they address.
        </p>
      </div>

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
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
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
              placeholder="Search recommendation text…"
            />
          </form>
        </div>
      </div>

      {loading && <div className="loading-state">Loading recommendations…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && recommendations.length === 0 && (
        <div className="empty-state">No recommendations match these filters.</div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Priority</th>
                <th>Recommendation</th>
                <th>Stakeholder</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec) => (
                <RecommendationRow
                  key={rec.id}
                  rec={rec}
                  expanded={expandedId === rec.id}
                  onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                  onSaved={handleSaved}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
