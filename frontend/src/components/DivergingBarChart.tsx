interface Props {
  data: { feature: string; contribution: number }[];
}

export function DivergingBarChart({ data }: Props) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.contribution)), 0.0001);

  if (data.length === 0) {
    return <p>No local explanation available.</p>;
  }

  return (
    <div className="diverging-chart" role="img" aria-label="Local SHAP contribution per feature">
      <div className="diverging-legend">
        <span>
          <i style={{ background: 'var(--diverge-pos)' }} /> pushes toward predicted class
        </span>
        <span>
          <i style={{ background: 'var(--diverge-neg)' }} /> pushes away
        </span>
      </div>
      {data.map((row) => {
        const pct = (Math.abs(row.contribution) / maxAbs) * 50;
        const positive = row.contribution >= 0;
        return (
          <div
            className="diverging-row"
            key={row.feature}
            title={`${row.feature}: ${row.contribution >= 0 ? '+' : ''}${row.contribution.toFixed(4)}`}
          >
            <span className="bar-label">{row.feature}</span>
            <div className="diverging-track">
              <div className="diverging-center" />
              <div
                className={positive ? 'diverging-fill diverging-fill--pos' : 'diverging-fill diverging-fill--neg'}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="bar-value tabular">
              {row.contribution >= 0 ? '+' : ''}
              {row.contribution.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
