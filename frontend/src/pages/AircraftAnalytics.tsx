import { useEffect, useState } from 'react';
import { getAircraftAnalytics } from '../api/client';
import type { AircraftAnalytics as AircraftAnalyticsRow } from '../api/types';
import { categoryColor } from '../components/categoryColor';

export function AircraftAnalytics() {
  const [rows, setRows] = useState<AircraftAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAircraftAnalytics(30)
      .then(setRows)
      .catch((err) => setError(err?.message ?? 'Failed to load aircraft analytics'))
      .finally(() => setLoading(false));
  }, []);

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
                return (
                  <tr key={row.manufacturer}>
                    <td style={{ textTransform: 'capitalize' }}>{row.manufacturer}</td>
                    <td className="tabular">{row.total_accidents.toLocaleString()}</td>
                    <td className="tabular">{row.total_incidents.toLocaleString()}</td>
                    <td className="tabular">{row.fatal_accidents.toLocaleString()}</td>
                    <td style={topCategory ? { color: categoryColor(topCategory) } : undefined}>
                      {topCategory ?? '—'}
                    </td>
                    <td>{row.top_flight_phase ?? '—'}</td>
                    <td className="tabular">{row.avg_seats?.toFixed(0) ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
