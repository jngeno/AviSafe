import type { FeatureImportance } from '../api/types';

interface Props {
  data: FeatureImportance[];
  limit?: number;
}

export function FeatureImportanceChart({ data, limit = 12 }: Props) {
  const rows = data.slice(0, limit);
  const max = Math.max(...rows.map((r) => r.importance), 0.0001);

  if (rows.length === 0) {
    return <p>No feature importance data available.</p>;
  }

  return (
    <div
      className="bar-chart"
      role="img"
      aria-label="Global feature importance, mean absolute SHAP value"
    >
      {rows.map((row) => (
        <div
          className="bar-row"
          key={row.feature}
          title={`${row.feature}: ${row.importance.toFixed(4)}`}
        >
          <span className="bar-label">{row.feature}</span>
          <div className="bar-track">
            <div
              className="bar-fill bar-fill--sequential"
              style={{ width: `${(row.importance / max) * 100}%` }}
            />
          </div>
          <span className="bar-value tabular">{row.importance.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}
