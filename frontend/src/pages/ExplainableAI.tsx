import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getExperiment, listExperiments } from '../api/client';
import type { ExperimentDetail, ExperimentSummary } from '../api/types';
import { FeatureImportanceChart } from '../components/FeatureImportanceChart';
import { SwissCheeseModel } from '../components/SwissCheeseModel';
import { categoryColor } from '../components/categoryColor';

export function ExplainableAI() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // Deep-link support: /explainable-ai?category=<name>, e.g. from Command
  // Centre's "Explain" action -- opens the Swiss Cheese Model already
  // scoped to that category instead of the CFIT default.
  const [cheeseCategory, setCheeseCategory] = useState(categoryParam || 'CFIT');

  useEffect(() => {
    if (categoryParam) {
      document.getElementById('swiss-cheese-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSearchParams((params) => {
        params.delete('category');
        return params;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listExperiments().then((list) => {
      setExperiments(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    getExperiment(selectedId).then(setExperiment);
  }, [selectedId]);

  return (
    <div>
      <div className="page-header">
        <div className="defense-badge-row" style={{ marginBottom: 6 }}>
          <span className="research-tag">Academic Causation Framework</span>
          <span className="badge badge--success">TreeSHAP &amp; HFACS</span>
        </div>
        <h1>Explainable AI &amp; Causal Attribution</h1>
        <p>
          Global SHAP feature importance for trained models - quantifying which input features drive predictions overall, ranked by mean absolute Shapley values and mapped to Reason&apos;s Swiss Cheese defensive barriers.
        </p>
      </div>

      {loading && <div className="loading-state">Loading experiments…</div>}

      {!loading && experiments.length === 0 && (
        <div className="empty-state">No trained models yet. Train one first.</div>
      )}

      {experiments.length > 0 && (
        <div className="card">
          <div className="field">
            <label htmlFor="experiment">Model</label>
            <select
              id="experiment"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.model_name} - {exp.target_column} ({exp.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {experiment && (
        <div className="card-grid">
          <div className="card">
            <h2>Global feature importance (SHAP)</h2>
            <FeatureImportanceChart data={experiment.feature_importances} limit={15} />
          </div>

          <div className="card">
            <h2>Model parameters</h2>
            <table>
              <tbody>
                {Object.entries(experiment.parameters).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td className="tabular">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {experiment && experiment.patterns.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2>Discovered patterns by category</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: -2, marginBottom: 12 }}>
            Per-category SHAP feature aggregation -- the raw material Pattern Discovery and the
            Safety Recommendation Centre are built from. Confidence measures how much the top
            features dominate that category&apos;s predictions relative to its single most
            important feature; occurrences is the evaluation-sample size behind that pattern.
          </p>
          <div className="card-grid">
            {experiment.patterns.map((p) => (
              <div key={p.category} className="card" style={{ background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: categoryColor(p.category) }}>{p.category}</strong>
                  <span className="tabular" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {p.occurrences} occurrences · confidence {p.confidence.toFixed(2)}
                  </span>
                </div>
                <div className="evidence-list" style={{ marginTop: 10 }}>
                  {p.top_features.map((f) => (
                    <span className="evidence-chip" key={f}>
                      {f}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-muted)', marginBottom: 6 }}>
                    SHAP vs. LIME comparison
                  </p>
                  {p.agreement_ratio !== null ? (
                    <>
                      <p style={{ fontSize: 13, marginBottom: 6 }}>
                        <strong>{(p.agreement_ratio * 100).toFixed(0)}% agreement</strong> between the two
                        independent explanation methods (game-theoretic SHAP attribution vs. LIME
                        local surrogate coefficients) - higher agreement is stronger evidence the
                        signal is real rather than an artifact of one method.
                      </p>
                      {p.consensus_features.length > 0 ? (
                        <div className="evidence-list">
                          {p.consensus_features.map((f) => (
                            <span
                              className="evidence-chip"
                              key={f}
                              style={{ borderColor: 'var(--risk-low)', color: 'var(--risk-low)' }}
                              title="Flagged by both SHAP and LIME"
                            >
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted" style={{ fontSize: 12 }}>
                          No features in the two methods&apos; top-5 lists overlapped for this category.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted" style={{ fontSize: 12 }}>
                      Not available for this experiment - it was trained before SHAP/LIME
                      cross-validation was added. Retrain this target to populate it.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embedded Swiss Cheese Model Framework */}
      <div className="card" id="swiss-cheese-card" style={{ marginTop: 20 }}>
        <SwissCheeseModel
          selectedCategory={cheeseCategory}
          onCategoryChange={setCheeseCategory}
        />
      </div>

      {experiment && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2>All ranked features &amp; Shapley attributions</h2>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Feature</th>
                <th>Importance</th>
              </tr>
            </thead>
            <tbody>
              {experiment.feature_importances.map((row) => (
                <tr key={row.feature}>
                  <td className="tabular">{row.rank}</td>
                  <td>{row.feature}</td>
                  <td className="tabular">{row.importance.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
