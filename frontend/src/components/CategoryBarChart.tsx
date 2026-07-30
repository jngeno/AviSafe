import { categoryColor } from './categoryColor';

interface Props {
  data: { category: string; value: number }[];
  format?: (v: number) => string;
  ariaLabel: string;
}

export function CategoryBarChart({ data, format = (v) => v.toFixed(3), ariaLabel }: Props) {
  const max = Math.max(...data.map((d) => d.value), 0.0001);

  if (data.length === 0) {
    return <p>No data available.</p>;
  }

  return (
    <div className="bar-chart" role="img" aria-label={ariaLabel}>
      {data.map((row) => (
        <div className="bar-row" key={row.category} title={`${row.category}: ${format(row.value)}`}>
          <span className="bar-label">{row.category}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(row.value / max) * 100}%`, background: categoryColor(row.category) }}
            />
          </div>
          <span className="bar-value tabular">{format(row.value)}</span>
        </div>
      ))}
    </div>
  );
}
