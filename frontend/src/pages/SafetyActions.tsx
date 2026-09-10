import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  addSafetyActionComment,
  createSafetyAction,
  deleteSafetyAction,
  getSafetyAction,
  listRecommendations,
  listSafetyActions,
  updateSafetyAction,
} from '../api/client';
import type { Recommendation, SafetyAction, SafetyActionCreate } from '../api/types';
import { PriorityBadge, SafetyActionStatusBadge } from '../components/Badge';

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const STATUS_OPTIONS = ['Open', 'In Progress', 'Verification', 'Closed'];

const BLANK_DRAFT: SafetyActionCreate = {
  title: '',
  description: '',
  linked_recommendation_id: null,
  owner: '',
  priority: 'Medium',
  status: 'Open',
  due_date: null,
  verification_notes: '',
};

function AddActionForm({
  recommendations,
  initialDraft,
  onCreated,
  onCancel,
}: {
  recommendations: Recommendation[];
  initialDraft?: SafetyActionCreate;
  onCreated: (action: SafetyAction) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SafetyActionCreate>(initialDraft ?? BLANK_DRAFT);
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
      const created = await createSafetyAction(form);
      onCreated(created);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to create action');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Create a safety action</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
        A tracked, owned, verifiable corrective/preventive task - optionally tied to an existing
        recommendation.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to happen?"
            />
          </div>
          <div className="field">
            <label>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
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
            placeholder="Context, root cause, and what success looks like."
          />
        </div>

        <div className="field-row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Owner</label>
            <input
              value={form.owner}
              onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              placeholder="Unassigned"
            />
          </div>
          <div className="field">
            <label>Due date</label>
            <input
              type="date"
              value={form.due_date ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value || null }))}
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
            {saving ? 'Saving…' : 'Create action'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionRow({
  action,
  expanded,
  onToggle,
  onSaved,
  onDeleted,
}: {
  action: SafetyAction;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: SafetyAction) => void;
  onDeleted: (id: number) => void;
}) {
  const [current, setCurrent] = useState(action);
  const [status, setStatus] = useState(action.status);
  const [owner, setOwner] = useState(action.owner);
  const [verificationNotes, setVerificationNotes] = useState(action.verification_notes);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    setCurrent(action);
  }, [action]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateSafetyAction(current.id, {
        status,
        owner,
        verification_notes: verificationNotes,
      });
      const merged = { ...updated, comments: current.comments };
      setCurrent(merged);
      onSaved(merged);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSafetyAction(current.id);
      onDeleted(current.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      await addSafetyActionComment(current.id, { author: commentAuthor, text: commentText });
      setCommentText('');
      const fresh = await getSafetyAction(current.id);
      setCurrent(fresh);
      onSaved(fresh);
    } finally {
      setCommenting(false);
    }
  }

  const overdue =
    current.due_date &&
    current.status !== 'Closed' &&
    current.due_date < new Date().toISOString().slice(0, 10);

  return (
    <>
      <tr id={`action-row-${current.id}`} style={expanded ? { background: 'var(--surface-2)' } : undefined}>
        <td style={{ maxWidth: 260 }}>{current.title}</td>
        <td>
          <PriorityBadge priority={current.priority} />
        </td>
        <td>
          <SafetyActionStatusBadge status={current.status} />
        </td>
        <td>{current.owner || '-'}</td>
        <td className="tabular" style={{ color: overdue ? 'var(--risk-high)' : undefined }}>
          {current.due_date ?? '-'}
          {overdue ? ' (overdue)' : ''}
        </td>
        <td className="tabular">{current.comments.length}</td>
        <td>
          <button type="button" className="btn-secondary btn-small" onClick={onToggle}>
            {expanded ? 'Hide' : 'Manage'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7}>
            <div className="card" style={{ margin: '4px 0' }}>
              <p>
                <strong>Description:</strong> {current.description || '-'}
              </p>
              {current.linked_recommendation_id && (
                <p style={{ fontSize: 13 }}>
                  <strong>Linked recommendation:</strong>{' '}
                  <Link to={`/recommendations?highlight=${current.linked_recommendation_id}`}>
                    {current.linked_recommendation_id} →
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
              </div>

              <div className="field" style={{ marginTop: 10 }}>
                <label>Verification notes</label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Evidence this action was completed and verified…"
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

              <div style={{ marginTop: 16 }}>
                <p style={{ marginBottom: 6 }}>
                  <strong>Comments</strong>
                </p>
                {current.comments.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: 13 }}>
                    No comments yet.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {current.comments.map((c) => (
                      <li key={c.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <strong>{c.author || 'Anonymous'}</strong>
                        {c.created_at && (
                          <span className="text-muted"> · {new Date(c.created_at).toLocaleString()}</span>
                        )}
                        <div>{c.text}</div>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={handleAddComment} className="field-row" style={{ marginTop: 10, alignItems: 'flex-end' }}>
                  <div className="field">
                    <label>Name</label>
                    <input value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="field" style={{ flex: 2 }}>
                    <label>Comment</label>
                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment…" />
                  </div>
                  <button type="submit" className="btn-secondary btn-small" disabled={commenting || !commentText.trim()}>
                    {commenting ? 'Posting…' : 'Post comment'}
                  </button>
                </form>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function SafetyActions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromRecommendationId = searchParams.get('from_recommendation');
  const highlightId = searchParams.get('highlight');

  const [actions, setActions] = useState<SafetyAction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(
    highlightId ? Number(highlightId) : null,
  );

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<SafetyActionCreate | undefined>(undefined);

  function load() {
    setLoading(true);
    listSafetyActions({
      status: status || undefined,
      priority: priority || undefined,
      search: search || undefined,
    })
      .then(setActions)
      .catch((err) => setError(err?.message ?? 'Failed to load safety actions'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority]);

  // Deep-link support: /safety-actions?highlight=<id>, e.g. from a
  // recommendation's "Safety actions created from this" list.
  useEffect(() => {
    if (!highlightId || actions.length === 0) return;
    document.getElementById(`action-row-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSearchParams((params) => {
      params.delete('highlight');
      return params;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useEffect(() => {
    listRecommendations({ limit: 200 })
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, []);

  // Deep-link support: /safety-actions?from_recommendation=<id>, followed
  // from "Create Safety Action" on a recommendation -- pre-fills the add
  // form instead of making the user retype the recommendation.
  useEffect(() => {
    if (!fromRecommendationId || recommendations.length === 0) return;
    const rec = recommendations.find((r) => r.id === Number(fromRecommendationId));
    if (rec) {
      setAddDraft({
        title: rec.recommendation.slice(0, 120),
        description: rec.recommendation,
        linked_recommendation_id: rec.id,
        owner: rec.assigned_officer ?? '',
        priority: rec.priority,
        status: 'Open',
        due_date: null,
        verification_notes: '',
      });
      setShowAdd(true);
    }
    setSearchParams((params) => {
      params.delete('from_recommendation');
      return params;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromRecommendationId, recommendations]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const open = actions.filter((a) => a.status !== 'Closed').length;
    const overdue = actions.filter(
      (a) => a.due_date && a.due_date < today && a.status !== 'Closed',
    ).length;
    const closed = actions.filter((a) => a.status === 'Closed').length;
    const completionRate = actions.length > 0 ? (closed / actions.length) * 100 : null;
    return { total: actions.length, open, overdue, completionRate };
  }, [actions]);

  function handleCreated(created: SafetyAction) {
    setActions((rows) => [created, ...rows]);
    setShowAdd(false);
  }

  function handleSaved(updated: SafetyAction) {
    setActions((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleDeleted(id: number) {
    setActions((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Safety Actions</h1>
        <p>
          Turn recommendations into tracked, owned, verifiable corrective-action tasks - with a
          comment thread and closure verification.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            className={showAdd ? 'btn' : 'btn-secondary'}
            onClick={() => {
              setAddDraft(undefined);
              setShowAdd((v) => !v);
            }}
          >
            + Create action
          </button>
        </div>
      </div>

      {showAdd && (
        <div style={{ marginBottom: 16 }}>
          <AddActionForm
            recommendations={recommendations}
            initialDraft={addDraft}
            onCreated={(created) => {
              handleCreated(created);
              setAddDraft(undefined);
            }}
            onCancel={() => {
              setShowAdd(false);
              setAddDraft(undefined);
            }}
          />
        </div>
      )}

      {!loading && !error && actions.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-tile">
            <h3>Total actions</h3>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-tile">
            <h3>Open</h3>
            <div className="stat-value">{summary.open}</div>
          </div>
          <div className="stat-tile">
            <h3>Overdue</h3>
            <div className="stat-value" style={{ color: summary.overdue > 0 ? 'var(--risk-high)' : undefined }}>
              {summary.overdue}
            </div>
          </div>
          <div className="stat-tile">
            <h3>Completion rate</h3>
            <div className="stat-value">
              {summary.completionRate !== null ? `${summary.completionRate.toFixed(0)}%` : '-'}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="field-row">
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, description…" />
          </form>
        </div>
      </div>

      {loading && <div className="loading-state">Loading safety actions…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && actions.length === 0 && (
        <div className="empty-state">
          No safety actions yet. Use &ldquo;+ Create action&rdquo; above to start tracking one.
        </div>
      )}

      {!loading && !error && actions.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Comments</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <ActionRow
                  key={a.id}
                  action={a}
                  expanded={expandedId === a.id}
                  onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
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
