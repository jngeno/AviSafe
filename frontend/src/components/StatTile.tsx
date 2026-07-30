interface Props {
  label: string;
  value: string;
  sub?: string;
}

export function StatTile({ label, value, sub }: Props) {
  return (
    <div className="stat-tile">
      <h3>{label}</h3>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
