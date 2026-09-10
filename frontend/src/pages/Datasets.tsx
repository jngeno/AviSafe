import { useState, useEffect } from 'react';
import { listDatasets } from '../api/client';
import type { DatasetInfo } from '../api/types';
import { StatusBadge } from '../components/Badge';
import { categoryColor } from '../components/categoryColor';

export function Datasets() {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showColumns, setShowColumns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    listDatasets()
      .then(setDatasets)
      .catch((err) => setError(err?.message ?? 'Failed to load datasets'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Datasets</h1>
        <p>Data sources feeding model training, explainability, and analytics across the platform.</p>
      </div>

      {loading && <div className="loading-state">Loading datasets…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && datasets.length === 0 && (
        <div className="empty-state">No datasets found.</div>
      )}

      {datasets.map((ds) => (
        <div className="card" key={ds.path}>
          <div className="recommendation-head">
            <h2 style={{ marginBottom: 0 }}>{ds.name}</h2>
            <StatusBadge status={ds.status.toLowerCase()} />
          </div>
          <p style={{ marginTop: 4 }}>
            <code>{ds.path}</code>
          </p>

          <div className="stat-grid" style={{ marginTop: 16 }}>
            <div className="stat-tile">
              <h3>Rows</h3>
              <div className="stat-value">{ds.rows.toLocaleString()}</div>
            </div>
            <div className="stat-tile">
              <h3>Columns</h3>
              <div className="stat-value">{ds.columns}</div>
            </div>
            <div className="stat-tile">
              <h3>Coverage</h3>
              <div className="stat-value">{ds.date_range}</div>
            </div>
            <div className="stat-tile">
              <h3>Size on disk</h3>
              <div className="stat-value">{ds.size_mb} MB</div>
            </div>
            <div className="stat-tile">
              <h3>Missing values</h3>
              <div className="stat-value">{ds.missing_values.toLocaleString()}</div>
            </div>
            <div className="stat-tile">
              <h3>Duplicate rows</h3>
              <div className="stat-value">{ds.duplicate_rows.toLocaleString()}</div>
            </div>
          </div>

          <p style={{ marginTop: 16, marginBottom: 6 }}>
            <strong>Accident categories covered</strong>
          </p>
          <div className="evidence-list">
            {ds.accident_categories_covered.map((c) => (
              <span
                className="evidence-chip"
                key={c}
                style={{ color: categoryColor(c), borderColor: categoryColor(c) }}
              >
                {c}
              </span>
            ))}
          </div>

          {ds.column_names.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => setShowColumns((s) => ({ ...s, [ds.path]: !s[ds.path] }))}
              >
                {showColumns[ds.path] ? 'Hide columns' : `Show all ${ds.column_names.length} columns`}
              </button>
              {showColumns[ds.path] && (
                <div className="evidence-list" style={{ marginTop: 10 }}>
                  {ds.column_names.map((c) => (
                    <span className="evidence-chip" key={c}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
