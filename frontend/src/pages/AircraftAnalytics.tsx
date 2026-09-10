import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAircraftAnalytics } from '../api/client';
import type { AircraftAnalytics as AircraftAnalyticsRow } from '../api/types';
import { categoryColor } from '../components/categoryColor';
import { SimpleBarChart } from '../components/SimpleBarChart';

function label(m: string): string {
  return m.replace(/\b\w/g, (c) => c.toUpperCase());
}

function ManufacturerComparison({ rows }: { rows: AircraftAnalyticsRow[] }) {
  const [leftName, setLeftName] = useState(rows[0]?.manufacturer ?? '');
  const [rightName, setRightName] = useState(rows[1]?.manufacturer ?? '');

  const left = rows.find((r) => r.manufacturer === leftName);
  const right = rows.find((r) => r.manufacturer === rightName);

  const categories = useMemo(() => {
    if (!left || !right) return [];
    return [...new Set([...Object.keys(left.category_breakdown), ...Object.keys(right.category_breakdown)])];
  }, [left, right]);

  return (
    <div className="card">
      <h2>Compare manufacturers</h2>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -2, marginBottom: 12 }}>
        Side-by-side comparison using the same real per-manufacturer aggregates shown in the table
        below - limited to the manufacturers with enough recorded accidents to compare (top 30 by
        volume).
      </p>
      <div className="field-row">
        <div className="field">
          <label>Manufacturer A</label>
          <select value={leftName} onChange={(e) => setLeftName(e.target.value)}>
            {rows.map((r) => (
              <option key={r.manufacturer} value={r.manufacturer}>
                {label(r.manufacturer)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Manufacturer B</label>
          <select value={rightName} onChange={(e) => setRightName(e.target.value)}>
            {rows.map((r) => (
              <option key={r.manufacturer} value={r.manufacturer}>
                {label(r.manufacturer)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {left && right && (
        <>
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Metric</th>
                <th>{label(left.manufacturer)}</th>
                <th>{label(right.manufacturer)}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Accidents</td>
                <td className="tabular">{left.total_accidents.toLocaleString()}</td>
                <td className="tabular">{right.total_accidents.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Incidents</td>
                <td className="tabular">{left.total_incidents.toLocaleString()}</td>
                <td className="tabular">{right.total_incidents.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Fatal accidents</td>
                <td className="tabular">{left.fatal_accidents.toLocaleString()}</td>
                <td className="tabular">{right.fatal_accidents.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Fatal rate</td>
                <td className="tabular">
                  {left.total_accidents > 0 ? `${((left.fatal_accidents / left.total_accidents) * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="tabular">
                  {right.total_accidents > 0 ? `${((right.fatal_accidents / right.total_accidents) * 100).toFixed(1)}%` : '-'}
                </td>
              </tr>
              <tr>
                <td>Top flight phase</td>
                <td>{left.top_flight_phase ?? '-'}</td>
                <td>{right.top_flight_phase ?? '-'}</td>
              </tr>
              <tr>
                <td>Avg. seats</td>
                <td className="tabular">{left.avg_seats?.toFixed(0) ?? '-'}</td>
                <td className="tabular">{right.avg_seats?.toFixed(0) ?? '-'}</td>
              </tr>
            </tbody>
          </table>

          <p style={{ fontSize: 13, marginTop: 14, marginBottom: 6 }}>
            <strong>Accident category breakdown</strong>
          </p>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>{label(left.manufacturer)}</th>
                <th>{label(right.manufacturer)}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat}>
                  <td style={{ color: categoryColor(cat), fontWeight: 600 }}>{cat}</td>
                  <td className="tabular">{(left.category_breakdown[cat] ?? 0).toLocaleString()}</td>
                  <td className="tabular">{(right.category_breakdown[cat] ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export function AircraftAnalytics() {
  const [searchParams] = useSearchParams();
  const highlightManufacturer = searchParams.get('highlight');

  const [rows, setRows] = useState<AircraftAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAircraftAnalytics(30)
      .then(setRows)
      .catch((err) => setError(err?.message ?? 'Failed to load aircraft analytics'))
      .finally(() => setLoading(false));
  }, []);

  // Deep-link support: /aircraft?highlight=<manufacturer>, e.g. from
  // Command Centre's High-Risk Aircraft table.
  useEffect(() => {
    if (!highlightManufacturer || rows.length === 0) return;
    document
      .getElementById(`aircraft-row-${highlightManufacturer}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const totals = useMemo(() => {
    const totalAccidents = rows.reduce((sum, r) => sum + r.total_accidents, 0);
    const totalFatal = rows.reduce((sum, r) => sum + r.fatal_accidents, 0);
    return {
      manufacturers: rows.length,
      totalAccidents,
      totalFatal,
      fatalRate: totalAccidents > 0 ? (totalFatal / totalAccidents) * 100 : null,
    };
  }, [rows]);

  return (
    <div>
      <div className="page-header">
        <h1>Aircraft Analytics</h1>
        <p>
          Accident and incident volume by aircraft manufacturer, from the NTSB dataset's
          reported make. Registration, model reliability scores, and fleet-level data are not
          yet available in the source dataset.
        </p>
      </div>

      {loading && <div className="loading-state">Loading aircraft analytics…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="empty-state">No aircraft data available.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="stat-grid">
            <div className="stat-tile">
              <h3>Manufacturers shown</h3>
              <div className="stat-value">{totals.manufacturers}</div>
            </div>
            <div className="stat-tile">
              <h3>Total accidents</h3>
              <div className="stat-value">{totals.totalAccidents.toLocaleString()}</div>
            </div>
            <div className="stat-tile">
              <h3>Fatal accidents</h3>
              <div className="stat-value">{totals.totalFatal.toLocaleString()}</div>
            </div>
            <div className="stat-tile">
              <h3>Fatal rate</h3>
              <div className="stat-value">
                {totals.fatalRate !== null ? `${totals.fatalRate.toFixed(1)}%` : '-'}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Top manufacturers by accident volume</h2>
            <SimpleBarChart
              data={rows.map((r) => ({ label: r.manufacturer, value: r.total_accidents }))}
              format={(v) => v.toLocaleString()}
              ariaLabel="Top manufacturers by accident volume"
              limit={10}
            />
          </div>

          <ManufacturerComparison rows={rows} />

          <div className="card">
          <table>
            <thead>
              <tr>
                <th>Manufacturer</th>
                <th>Accidents</th>
                <th>Incidents</th>
                <th>Fatal accidents</th>
                <th>Top category</th>
                <th>Top flight phase</th>
                <th>Avg. seats</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const topCategory = Object.entries(row.category_breakdown).sort(
                  (a, b) => b[1] - a[1],
                )[0]?.[0];
                const isHighlighted =
                  highlightManufacturer?.toLowerCase() === row.manufacturer.toLowerCase();
                return (
                  <tr
                    key={row.manufacturer}
                    id={`aircraft-row-${row.manufacturer}`}
                    style={isHighlighted ? { background: 'var(--surface-2)' } : undefined}
                  >
                    <td style={{ textTransform: 'capitalize' }}>{row.manufacturer}</td>
                    <td className="tabular">{row.total_accidents.toLocaleString()}</td>
                    <td className="tabular">{row.total_incidents.toLocaleString()}</td>
                    <td className="tabular">{row.fatal_accidents.toLocaleString()}</td>
                    <td style={topCategory ? { color: categoryColor(topCategory) } : undefined}>
                      {topCategory ?? '-'}
                    </td>
                    <td>{row.top_flight_phase ?? '-'}</td>
                    <td className="tabular">{row.avg_seats?.toFixed(0) ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
