import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getExperiment, listExperiments } from '../api/client';
import type { ExperimentDetail, ExperimentSummary } from '../api/types';
import { categoryColor } from '../components/categoryColor';
import { SimpleBarChart } from '../components/SimpleBarChart';

export function PatternDiscovery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightCategory = searchParams.get('category');

  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);

  // Mirrors PatternDiscovery.dominant_feature_frequency() in the backend:
  // counts how often each feature appears among a category's top features,
  // surfacing features that drive risk across multiple accident categories
  // rather than being specific to just one.
  const crossCuttingFeatures = useMemo(() => {
    if (!experiment) return [];
    const frequency = new Map<string, { count: number; categories: string[] }>();
    for (const pattern of experiment.patterns) {
      for (const feature of pattern.top_features) {
        const entry = frequency.get(feature) ?? { count: 0, categories: [] };
        entry.count += 1;
        entry.categories.push(pattern.category);
        frequency.set(feature, entry);
      }
    }
    return [...frequency.entries()]
      .map(([feature, { count, categories }]) => ({ feature, count, categories }))
      .filter((row) => row.count > 1)
      .sort((a, b) => b.count - a.count);
  }, [experiment]);

  useEffect(() => {
    listExperiments('Accident_Category').then((list) => {
      setExperiments(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    getExperiment(selectedId).then(setExperiment);
  }, [selectedId]);

  // Deep-link support: /pattern-discovery?category=<name>, e.g. from
  // Command Centre's "Investigate" action on a specific high-risk category.
  useEffect(() => {
    if (!highlightCategory || !experiment || experiment.patterns.length === 0) return;
    setHighlightedCard(highlightCategory);
    document
      .getElementById(`pattern-card-${highlightCategory}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSearchParams((params) => {
      params.delete('category');
      return params;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiment]);

  return (
    <div>
      <div className="page-header">
        <h1>Pattern Discovery</h1>
        <p>
          Unified causal patterns per accident category - the features that consistently drive
          each category's predictions, synthesised from SHAP importance across the category's
          predicted cases.
        </p>
      </div>

      {loading && <div className="loading-state">Loading experiments…</div>}

      {!loading && experiments.length === 0 && (
        <div className="empty-state">
          No Accident_Category experiments yet - pattern discovery needs a categorical model.
        </div>
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
                  {exp.model_name} ({exp.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {experiment && experiment.patterns.length === 0 && (
        <div className="empty-state">No patterns discovered for this experiment.</div>
      )}

      {experiment && crossCuttingFeatures.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2>Cross-cutting risk factors</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: -2, marginBottom: 12 }}>
            Features that appear among the top drivers of more than one accident category -
            systemic risk factors worth prioritising, since mitigating them reduces risk across
            multiple failure modes at once rather than a single category.
          </p>
          <SimpleBarChart
            data={crossCuttingFeatures.map((row) => ({ label: row.feature, value: row.count }))}
            format={(v) => `${v} categories`}
            ariaLabel="Features shared across multiple accident categories"
            limit={10}
          />
          <div className="evidence-list" style={{ marginTop: 14 }}>
            {crossCuttingFeatures.slice(0, 10).map((row) => (
              <span className="evidence-chip" key={row.feature} title={row.categories.join(', ')}>
                {row.feature}: {row.categories.join(', ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {experiment && experiment.patterns.length > 0 && (
        <div className="card-grid">
          {experiment.patterns.map((pattern) => (
            <div
              className="card"
              key={pattern.category}
              id={`pattern-card-${pattern.category}`}
              style={
                highlightedCard === pattern.category
                  ? { borderColor: categoryColor(pattern.category), borderWidth: 2 }
                  : undefined
              }
            >
              <h2 style={{ color: categoryColor(pattern.category) }}>{pattern.category}</h2>
              <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-tile">
                  <h3>Confidence</h3>
                  <div className="stat-value">{(pattern.confidence * 100).toFixed(0)}%</div>
                </div>
                <div className="stat-tile">
                  <h3>Occurrences</h3>
                  <div className="stat-value">{pattern.occurrences}</div>
                </div>
                <div className="stat-tile">
                  <h3>Avg. importance</h3>
                  <div className="stat-value">{pattern.average_importance.toFixed(3)}</div>
                </div>
              </div>
              <p style={{ marginBottom: 6 }}>
                <strong>Top contributing features</strong>
              </p>
              <div className="evidence-list">
                {pattern.top_features.map((f) => (
                  <span className="evidence-chip" key={f}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
