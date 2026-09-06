import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  createRecommendation,
  deleteRecommendation,
  getExperiment,
  listExperiments,
  listRecommendations,
  listRiskRegister,
  listSafetyActions,
  simulateRecommendations,
  updateRecommendation,
} from '../api/client';
import type {
  ExperimentDetail,
  ExperimentSummary,
  Recommendation,
  RecommendationCreate,
  RecommendationSimulateResponse,
  RiskRegisterEntry,
  SafetyAction,
  SimulatedRecommendation,
} from '../api/types';
import { PriorityBadge, SourceBadge, WorkflowStatusBadge } from '../components/Badge';
import { categoryColor } from '../components/categoryColor';
import { CATEGORY_ORDER } from '../components/categoryColor';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed', 'Dismissed'];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

const BLANK_DRAFT: RecommendationCreate = {
  category: CATEGORY_ORDER[0],
  priority: 'Medium',
  recommendation: '',
  stakeholder: '',
  confidence: 1,
  evidence: [],
  icao_reference: '',
  hfacs_classification: '',
  swiss_cheese_layer: '',
};

function AddRecommendationForm({
  draft,
  onCreated,
  onCancel,
}: {
  draft: RecommendationCreate;
  onCreated: (rec: Recommendation) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RecommendationCreate>(draft);
  const [evidenceText, setEvidenceText] = useState((draft.evidence ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(draft);
    setEvidenceText((draft.evidence ?? []).join(', '));
  }, [draft]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recommendation.trim() || !form.stakeholder.trim()) {
      setError('Recommendation text and stakeholder are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createRecommendation({
        ...form,
        evidence: evidenceText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onCreated(created);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to create recommendation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Add a recommendation</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
        Author a recommendation directly - for evidence not yet captured by the rule engine, or a
        judgement call a safety officer wants on record.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Stakeholder</label>
            <input
              value={form.stakeholder}
              onChange={(e) => setForm((f) => ({ ...f, stakeholder: e.target.value }))}
              placeholder="e.g. Flight Operations"
            />
          </div>
        </div>

        <div className="field" style={{ marginTop: 10 }}>
          <label>Recommendation</label>
          <textarea
            rows={3}
            value={form.recommendation}
            onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value }))}
            placeholder="What should change, and what evidence supports it?"
          />
        </div>

        <div className="field-row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>ICAO reference (optional)</label>
            <input
              value={form.icao_reference}
              onChange={(e) => setForm((f) => ({ ...f, icao_reference: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>HFACS classification (optional)</label>
            <input
              value={form.hfacs_classification}
              onChange={(e) => setForm((f) => ({ ...f, hfacs_classification: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Swiss Cheese layer (optional)</label>
            <input
              value={form.swiss_cheese_layer}
              onChange={(e) => setForm((f) => ({ ...f, swiss_cheese_layer: e.target.value }))}
            />
          </div>
        </div>

        <div className="field" style={{ marginTop: 10 }}>
          <label>Evidence (comma-separated, optional)</label>
          <input value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} />
        </div>

        {error && (
          <div className="error-state" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save recommendation'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ScenarioSimulator({
  onSaveMatch,
}: {
  onSaveMatch: (match: SimulatedRecommendation) => void;
}) {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RecommendationSimulateResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listExperiments('Accident_Category')
      .then((list) => {
        setExperiments(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    setResult(null);
    setError(null);
    getExperiment(selectedId).then((exp) => {
      setExperiment(exp);
      setValues({});
    });
  }, [selectedId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!experiment) return;

    const features: Record<string, string | number> = {};
    for (const name of experiment.feature_names) {
      const raw = values[name];
      if (raw === undefined || raw === '') continue;
      features[name] = experiment.categorical_encodings[name] ? raw : Number(raw);
    }

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await simulateRecommendations({ experiment_id: experiment.id, features });
      setResult(response);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Simulation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Simulate a scenario</h3>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -4 }}>
        Describe a hypothetical flight scenario - the trained model predicts its accident category
        and SHAP-dominant features, matched live against the same rule base used at training time.
        Nothing here is saved unless you choose to add a matched recommendation below.
      </p>

      {experiments.length === 0 && (
        <div className="empty-state">No trained Accident_Category models available to simulate against.</div>
      )}

      {experiments.length > 0 && (
        <>
          <div className="field">
            <label>Model</label>
            <select value={selectedId ?? ''} onChange={(e) => setSelectedId(Number(e.target.value))}>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.model_name} ({exp.id})
                </option>
              ))}
            </select>
          </div>

          {experiment && (
            <form onSubmit={handleSubmit}>
              <div className="field-row">
                {experiment.feature_names.map((name) => {
                  const options = experiment.categorical_encodings[name];
                  return (
                    <div className="field" key={name}>
                      <label htmlFor={`sim-${name}`}>{name}</label>
                      {options ? (
                        <select
                          id={`sim-${name}`}
                          value={values[name] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                        >
                          <option value="">-</option>
                          {Object.keys(options).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`sim-${name}`}
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

              <button type="submit" className="btn" style={{ marginTop: 14 }} disabled={submitting}>
                {submitting ? 'Simulating…' : 'Simulate recommendations'}
              </button>
            </form>
          )}
        </>
      )}

      {error && (
        <div className="error-state" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <p>
            Predicted category:{' '}
            <strong style={{ color: categoryColor(result.predicted_class) }}>{result.predicted_class}</strong>
            {' - '}
            {((result.probabilities[result.predicted_class] ?? 0) * 100).toFixed(1)}% probability
          </p>
          <p style={{ fontSize: 13 }}>
            <strong>Dominant features:</strong> {result.dominant_features.join(', ')}
          </p>

          {result.recommendations.length === 0 && (
            <div className="empty-state">
              No rule in the current rule base matches this scenario's dominant features - the rule base
              may need a new entry for this pattern.
            </div>
          )}

          {result.recommendations.map((match, i) => (
            <div className="card" key={i} style={{ margin: '10px 0' }}>
              <div className="field-row" style={{ alignItems: 'center' }}>
                <PriorityBadge priority={match.priority} />
                <span style={{ color: categoryColor(match.category), fontWeight: 600 }}>{match.category}</span>
              </div>
              <p style={{ margin: '8px 0' }}>{match.recommendation}</p>
              <p className="text-muted" style={{ fontSize: 12 }}>
                {match.stakeholder} · {match.icao_reference || 'No ICAO reference'}
              </p>
              <button type="button" className="btn-secondary btn-small" onClick={() => onSaveMatch(match)}>
                Add to Recommendation Centre
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationRow({
  rec,
  expanded,
  linkedRisks,
  linkedActions,
  onToggle,
  onSaved,
  onDeleted,
}: {
  rec: Recommendation;
  expanded: boolean;
  linkedRisks: RiskRegisterEntry[];
  linkedActions: SafetyAction[];
  onToggle: () => void;
  onSaved: (updated: Recommendation) => void;
  onDeleted: (id: number) => void;
}) {
  const [status, setStatus] = useState(rec.status);
  const [officer, setOfficer] = useState(rec.assigned_officer ?? '');
  const [dueDate, setDueDate] = useState(rec.due_date ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteRecommendation(rec.id);
      onDeleted(rec.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <tr id={`recommendation-row-${rec.id}`} style={expanded ? { background: 'var(--surface-2)' } : undefined}>
        <td style={{ color: categoryColor(rec.category), fontWeight: 600 }}>{rec.category}</td>
        <td>
          <PriorityBadge priority={rec.priority} />
        </td>
        <td style={{ maxWidth: 360 }}>{rec.recommendation}</td>
        <td>{rec.stakeholder}</td>
        <td>
          <WorkflowStatusBadge status={rec.status} />
        </td>
        <td>
          <SourceBadge source={rec.source} />
        </td>
        <td>{rec.assigned_officer || '-'}</td>
        <td className="tabular">{rec.due_date ?? '-'}</td>
        <td>
          <button type="button" className="btn-secondary btn-small" onClick={onToggle}>
            {expanded ? 'Hide' : 'Manage'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9}>
            <div className="card" style={{ margin: '4px 0' }}>
              <div className="field-row">
                <div>
                  <p>
                    <strong>ICAO reference:</strong> {rec.icao_reference || '-'}
                  </p>
                  <p>
                    <strong>HFACS classification:</strong> {rec.hfacs_classification || '-'}
                  </p>
                  <p>
                    <strong>Swiss Cheese layer:</strong> {rec.swiss_cheese_layer || '-'}
                  </p>
                  <p>
                    <strong>Confidence:</strong> {(rec.confidence * 100).toFixed(0)}%
                  </p>
                  <p>
                    <strong>Source model:</strong>{' '}
                    {rec.experiment_id ? (
                      <Link to={`/experiments/${rec.experiment_id}`}>
                        Experiment {rec.experiment_id} - view SHAP evidence &amp; patterns →
                      </Link>
                    ) : (
                      'Manually authored - not derived from a specific training run'
                    )}
                  </p>
                </div>
              </div>

              {(linkedRisks.length > 0 || linkedActions.length > 0) && (
                <div style={{ marginTop: 10 }}>
                  {linkedRisks.length > 0 && (
                    <p style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Referenced by risk register:</strong>{' '}
                      {linkedRisks.map((r, i) => (
                        <span key={r.id}>
                          {i > 0 && ', '}
                          <Link to={`/risk-register?highlight=${r.id}`}>{r.title}</Link>
                        </span>
                      ))}
                    </p>
                  )}
                  {linkedActions.length > 0 && (
                    <p style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Safety actions created from this:</strong>{' '}
                      {linkedActions.map((a, i) => (
                        <span key={a.id}>
                          {i > 0 && ', '}
                          <Link to={`/safety-actions?highlight=${a.id}`}>{a.title}</Link>
                          {' ('}
                          {a.status}
                          {')'}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              )}

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

              <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
                <button type="button" className="btn btn-small" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save workflow update'}
                </button>
                {rec.source === 'manual' && (
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                )}
                <Link
                  to={`/safety-actions?from_recommendation=${rec.id}`}
                  className="btn-secondary btn-small"
                  style={{ display: 'inline-block' }}
                >
                  Create Safety Action →
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function RecommendationCentre() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(
    highlightId ? Number(highlightId) : null,
  );

  // Deep-link support: /recommendations?category=<name>, e.g. from
  // Command Centre's "View Recommendation" action on a specific
  // high-risk category.
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [panel, setPanel] = useState<'none' | 'add' | 'simulate'>('none');
  const [draft, setDraft] = useState<RecommendationCreate>(BLANK_DRAFT);

  // Fetched once for reverse-traceability: which risks/actions reference
  // each recommendation (see linkedRisksFor/linkedActionsFor below).
  const [allRisks, setAllRisks] = useState<RiskRegisterEntry[]>([]);
  const [allActions, setAllActions] = useState<SafetyAction[]>([]);

  useEffect(() => {
    listRiskRegister({ limit: 500 }).then(setAllRisks).catch(() => setAllRisks([]));
    listSafetyActions({ limit: 500 }).then(setAllActions).catch(() => setAllActions([]));
  }, []);

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

  useEffect(() => {
    if (searchParams.get('category')) {
      setSearchParams((params) => {
        params.delete('category');
        return params;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link support: /recommendations?highlight=<id> from other pages
  // (Risk Register, Incident Management, Safety Actions, Investigations)
  // that reference a recommendation by id but have no detail route of
  // their own to send the user to.
  useEffect(() => {
    if (!highlightId || recommendations.length === 0) return;
    const id = Number(highlightId);
    setExpandedId(id);
    const row = document.getElementById(`recommendation-row-${id}`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSearchParams((params) => {
      params.delete('highlight');
      return params;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let open = 0;
    let highPriority = 0;
    let overdue = 0;
    for (const rec of recommendations) {
      if (rec.status === 'Open' || rec.status === 'In Progress') open += 1;
      if (rec.priority === 'High' || rec.priority === 'Critical') highPriority += 1;
      if (rec.due_date && rec.due_date < today && rec.status !== 'Completed' && rec.status !== 'Dismissed') {
        overdue += 1;
      }
    }
    return { total: recommendations.length, open, highPriority, overdue };
  }, [recommendations]);

  function handleSaved(updated: Recommendation) {
    setRecommendations((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleDeleted(id: number) {
    setRecommendations((rows) => rows.filter((r) => r.id !== id));
  }

  function handleCreated(created: Recommendation) {
    setRecommendations((rows) => [created, ...rows]);
    setPanel('none');
    setDraft(BLANK_DRAFT);
  }

  function handleSaveMatch(match: SimulatedRecommendation) {
    setDraft({
      category: match.category,
      priority: match.priority,
      recommendation: match.recommendation,
      stakeholder: match.stakeholder,
      confidence: match.confidence,
      evidence: match.evidence,
      icao_reference: match.icao_reference,
      hfacs_classification: match.hfacs_classification,
      swiss_cheese_layer: match.swiss_cheese_layer,
    });
    setPanel('add');
  }

  return (
    <div>
      <div className="page-header">
        <h1>Safety Recommendation Centre</h1>
        <p>
          Evidence-based recommendations synthesised from SHAP-driven pattern analysis, mapped to
          ICAO references, HFACS classification, and the Swiss Cheese Model layer they address.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            className={panel === 'add' ? 'btn' : 'btn-secondary'}
            onClick={() => {
              setDraft(BLANK_DRAFT);
              setPanel(panel === 'add' ? 'none' : 'add');
            }}
          >
            + Add recommendation
          </button>
          <button
            type="button"
            className={panel === 'simulate' ? 'btn' : 'btn-secondary'}
            onClick={() => setPanel(panel === 'simulate' ? 'none' : 'simulate')}
          >
            Simulate a scenario
          </button>
        </div>
      </div>

      {!loading && !error && recommendations.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-tile">
            <h3>Matching recommendations</h3>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-tile">
            <h3>Open / in progress</h3>
            <div className="stat-value">{summary.open}</div>
          </div>
          <div className="stat-tile">
            <h3>High / critical priority</h3>
            <div className="stat-value">{summary.highPriority}</div>
          </div>
          <div className="stat-tile">
            <h3>Overdue</h3>
            <div className="stat-value" style={{ color: summary.overdue > 0 ? 'var(--risk-high)' : undefined }}>
              {summary.overdue}
            </div>
          </div>
        </div>
      )}

      {panel === 'add' && (
        <div style={{ marginBottom: 16 }}>
          <AddRecommendationForm draft={draft} onCreated={handleCreated} onCancel={() => setPanel('none')} />
        </div>
      )}

      {panel === 'simulate' && (
        <div style={{ marginBottom: 16 }}>
          <ScenarioSimulator onSaveMatch={handleSaveMatch} />
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
                <th>Source</th>
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
                  linkedRisks={allRisks.filter((r) => r.linked_recommendation_id === rec.id)}
                  linkedActions={allActions.filter((a) => a.linked_recommendation_id === rec.id)}
                  onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
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
