interface Props {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
  ariaLabel: string;
  limit?: number;
}

export function SimpleBarChart({ data, format = (v) => v.toFixed(0), ariaLabel, limit = 8 }: Props) {
  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, limit);
  const max = Math.max(...rows.map((d) => d.value), 1);

  if (rows.length === 0) {
    return <p>No data available.</p>;
  }

  return (
    <div className="bar-chart" role="img" aria-label={ariaLabel}>
      {rows.map((row) => (
        <div className="bar-row" key={row.label} title={`${row.label}: ${format(row.value)}`}>
          <span className="bar-label">{row.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill bar-fill--sequential"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className="bar-value tabular">{format(row.value)}</span>
        </div>
      ))}
    </div>
  );
}
