import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  getAircraftAnalytics,
  getDashboardSummary,
  getHotspots,
  listRecommendations,
} from '../api/client';
import type { AircraftAnalytics, DashboardSummary, HotspotPoint, Recommendation } from '../api/types';
import { RiskGauge } from '../components/RiskGauge';
import { PriorityBadge, WorkflowStatusBadge } from '../components/Badge';
import { CATEGORY_ORDER, categoryColor } from '../components/categoryColor';
import {
  IconClipboard,
  IconLayers,
  IconMap,
  IconPlane,
  IconTrendUp,
} from '../components/icons';

const DARK_BASEMAP_STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster' as const, source: 'carto-dark' }],
};

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
}

function riskLevelFor(pct: number): 'Low' | 'Moderate' | 'High' | 'Critical' {
  if (pct < 15) return 'Low';
  if (pct < 30) return 'Moderate';
  if (pct < 45) return 'High';
  return 'Critical';
}

function GlobalSafetyMapPreview() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [hotspots, setHotspots] = useState<HotspotPoint[]>([]);

  useEffect(() => {
    getHotspots().then(setHotspots).catch(() => setHotspots([]));
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_BASEMAP_STYLE,
      center: [-30, 25],
      zoom: 0.9,
      interactive: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // This preview sits in a CSS grid card, so its container can still be
    // resizing (or at width 0) at the instant maplibre reads its size --
    // without an explicit resize once the container settles, the map
    // renders a blank/mis-sized canvas. A ResizeObserver keeps it correct
    // even if the sidebar collapses or the window resizes later.
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(mapContainer.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: maplibregl.Marker[] = [];
    const maxCount = Math.max(...hotspots.map((h) => h.count), 1);

    const render = () => {
      markers.forEach((m) => m.remove());
      markers.length = 0;
      for (const point of hotspots) {
        const size = 5 + (point.count / maxCount) * 18;
        const color = getComputedStyle(document.documentElement)
          .getPropertyValue(
            point.category === 'CFIT'
              ? '--series-cfit'
              : point.category === 'LOC-I'
                ? '--series-loci'
                : '--series-runway',
          )
          .trim();
        const el = document.createElement('div');
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = '50%';
        el.style.background = `rgba(${hexToRgb(color)}, 0.55)`;
        el.style.border = `1px solid rgba(${hexToRgb(color)}, 0.9)`;
        markers.push(new maplibregl.Marker({ element: el }).setLngLat([point.longitude, point.latitude]).addTo(map));
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once('load', render);
    return () => markers.forEach((m) => m.remove());
  }, [hotspots]);

  return <div ref={mapContainer} style={{ height: 240, borderRadius: 8, overflow: 'hidden' }} />;
}

export function CommandCentre() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [aircraft, setAircraft] = useState<AircraftAnalytics[]>([]);
  const [openRecs, setOpenRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getAircraftAnalytics(5),
      listRecommendations({ status: 'Open', limit: 5 }),
    ])
      .then(([s, a, r]) => {
        setSummary(s);
        setAircraft(a);
        setOpenRecs(r);
      })
      .catch((err) => setError(err?.message ?? 'Failed to load Command Centre data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading Command Centre…</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (!summary) return null;

  // Global Safety Risk: transparent, from real data -- the share of all
  // accidents that fall into the three tracked high-risk categories
  // (CFIT/LOC-I/Runway Excursion), not a fabricated ML "risk score."
  // Thresholds (<15/<30/<45/else) are a documented, adjustable heuristic,
  // not a claimed statistical finding.
  const highRiskCount = summary.high_risk_categories.reduce(
    (sum, cat) => sum + (summary.category_breakdown[cat] ?? 0),
    0,
  );
  const highRiskShare = summary.total_accidents > 0 ? (highRiskCount / summary.total_accidents) * 100 : 0;
  const riskLevel = riskLevelFor(highRiskShare);

  const sortedTrend = [...summary.monthly_trend].sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );
  const last = sortedTrend[sortedTrend.length - 1];
  const prev = sortedTrend[sortedTrend.length - 2];
  const trendPct = last && prev && prev.count > 0 ? ((last.count - prev.count) / prev.count) * 100 : null;

  // One real, computed insight -- which tracked high-risk category has
  // the largest share of high-risk-category accidents -- not a
  // fabricated AI claim or a made-up confidence score.
  const topCategory = summary.high_risk_categories
    .map((cat) => ({ cat, count: summary.category_breakdown[cat] ?? 0 }))
    .sort((a, b) => b.count - a.count)[0];
  const topCategoryShare =
    topCategory && highRiskCount > 0 ? (topCategory.count / highRiskCount) * 100 : null;

  // Safety Alerts: only real, derivable signals -- no fabricated alert
  // feed. Overdue = an Open recommendation whose due date has passed.
  const today = new Date().toISOString().slice(0, 10);
  const overdue = openRecs.filter((r) => r.due_date && r.due_date < today);

  return (
    <div>
      <div className="page-header">
        <div className="defense-badge-row" style={{ marginBottom: 6 }}>
          <span className="research-tag">Aviation Safety Intelligence</span>
        </div>
        <h1>Command Centre</h1>
        <p>Global safety posture, derived directly from current data -- not a fixed dashboard, your daily workspace.</p>
      </div>

      <div className="card-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ alignSelf: 'flex-start' }}>Global Safety Risk</h2>
          <RiskGauge value={highRiskShare} level={riskLevel} label="Share of accidents in tracked high-risk categories" />
          {trendPct !== null && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Event volume {trendPct >= 0 ? 'up' : 'down'} {Math.abs(trendPct).toFixed(0)}% vs. previous month
            </p>
          )}
        </div>

        <div className="card">
          <h2>Global Safety Map</h2>
          <GlobalSafetyMapPreview />
          <div className="diverging-legend" style={{ marginTop: 10 }}>
            {CATEGORY_ORDER.map((c) => (
              <span key={c}>
                <i style={{ background: categoryColor(c) }} />
                {c}
              </span>
            ))}
          </div>
          <Link to="/risk-heatmaps" style={{ fontSize: 12, display: 'inline-block', marginTop: 8 }}>
            Open full interactive map →
          </Link>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Safety Alerts</h2>
          {summary.high_risk_categories.length === 0 && overdue.length === 0 ? (
            <div className="empty-state">No active alerts from current data.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {summary.high_risk_categories.map((cat) => (
                <Link
                  key={cat}
                  to={`/pattern-discovery?category=${encodeURIComponent(cat)}`}
                  className="field-row alert-row-link"
                  style={{ alignItems: 'center', gap: 8 }}
                >
                  <span className="badge" style={{ borderColor: categoryColor(cat), color: categoryColor(cat) }}>
                    High-risk
                  </span>
                  <span style={{ fontSize: 13 }}>
                    <strong style={{ color: categoryColor(cat) }}>{cat}</strong> is flagged as a high-risk category
                    ({(summary.category_breakdown[cat] ?? 0).toLocaleString()} accidents) →
                  </span>
                </Link>
              ))}
              {overdue.map((r) => (
                <Link
                  key={r.id}
                  to={`/recommendations?highlight=${r.id}`}
                  className="field-row alert-row-link"
                  style={{ alignItems: 'center', gap: 8 }}
                >
                  <span className="badge" style={{ borderColor: 'var(--risk-high)', color: 'var(--risk-high)' }}>
                    Overdue
                  </span>
                  <span style={{ fontSize: 13 }}>
                    Recommendation for <strong>{r.category}</strong> was due {r.due_date} →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>AI Safety Insight</h2>
          {topCategory && topCategoryShare !== null ? (
            <>
              <p style={{ marginTop: 8 }}>
                <strong style={{ color: categoryColor(topCategory.cat) }}>{topCategory.cat}</strong> accounts for{' '}
                {topCategoryShare.toFixed(0)}% of accidents across the tracked high-risk categories -- the largest
                share of the three.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Derived from current dataset category counts, not a model-generated confidence estimate.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Link to={`/pattern-discovery?category=${encodeURIComponent(topCategory.cat)}`} className="btn-secondary btn-small">
                  Investigate
                </Link>
                <Link to={`/explainable-ai?category=${encodeURIComponent(topCategory.cat)}`} className="btn-secondary btn-small">
                  Explain
                </Link>
                <Link to={`/recommendations?category=${encodeURIComponent(topCategory.cat)}`} className="btn-secondary btn-small">
                  View Recommendation
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state">No high-risk-category data available yet.</div>
          )}
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>High-Risk Airports</h2>
          <div className="empty-state">
            Not available yet -- accident records aren&apos;t currently linked to a specific airport (see{' '}
            <Link to="/airports">Airport Analytics</Link>), so per-airport risk scores can&apos;t be computed
            honestly.
          </div>
        </div>

        <div className="card">
          <h2>High-Risk Aircraft</h2>
          {aircraft.length === 0 ? (
            <div className="empty-state">No aircraft data available.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Accidents</th>
                  <th>Fatal</th>
                  <th>Primary phase</th>
                </tr>
              </thead>
              <tbody>
                {aircraft.map((a) => (
                  <tr key={a.manufacturer}>
                    <td style={{ textTransform: 'capitalize' }}>
                      <Link to={`/aircraft?highlight=${encodeURIComponent(a.manufacturer)}`}>
                        {a.manufacturer}
                      </Link>
                    </td>
                    <td className="tabular">{a.total_accidents.toLocaleString()}</td>
                    <td className="tabular">{a.fatal_accidents.toLocaleString()}</td>
                    <td>{a.top_flight_phase ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link to="/aircraft" style={{ fontSize: 12, display: 'inline-block', marginTop: 8 }}>
            Open Aircraft Analytics →
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Open Actions</h2>
        {openRecs.length === 0 ? (
          <div className="empty-state">No open recommendations right now.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Recommendation</th>
                <th>Priority</th>
                <th>Stakeholder</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {openRecs.map((r) => (
                <tr key={r.id}>
                  <td style={{ maxWidth: 360 }}>
                    <Link to={`/recommendations?highlight=${r.id}`}>{r.recommendation}</Link>
                  </td>
                  <td>
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td>{r.stakeholder}</td>
                  <td className="tabular">{r.due_date ?? '—'}</td>
                  <td>
                    <WorkflowStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Link to="/recommendations" style={{ fontSize: 12, display: 'inline-block', marginTop: 8 }}>
          Open Safety Recommendation Centre →
        </Link>
      </div>

      <div className="card">
        <h2>Quick Links</h2>
        <div className="feature-grid">
          <Link to="/safety-intelligence" className="feature-card feature-card--secondary">
            <span className="feature-card-icon">
              <IconTrendUp size={20} />
            </span>
            <h3 className="feature-card-title">Safety Intelligence</h3>
            <p className="feature-card-desc">Accident/incident trends, category breakdowns, and risk analytics.</p>
            <span className="feature-card-cta">Open dashboard →</span>
          </Link>
          <Link to="/flight-risk-assessment" className="feature-card feature-card--secondary">
            <span className="feature-card-icon">
              <IconPlane size={20} />
            </span>
            <h3 className="feature-card-title">Flight Risk Assessment</h3>
            <p className="feature-card-desc">Run a live scenario prediction with a SHAP-grounded explanation.</p>
            <span className="feature-card-cta">Run a simulation →</span>
          </Link>
          <Link to="/recommendations" className="feature-card feature-card--secondary">
            <span className="feature-card-icon">
              <IconClipboard size={20} />
            </span>
            <h3 className="feature-card-title">Safety Recommendation Centre</h3>
            <p className="feature-card-desc">Evidence-based recommendations, plus your own manual entries.</p>
            <span className="feature-card-cta">Open recommendations →</span>
          </Link>
          <Link to="/explainable-ai" className="feature-card feature-card--secondary">
            <span className="feature-card-icon">
              <IconLayers size={20} />
            </span>
            <h3 className="feature-card-title">Explainable AI</h3>
            <p className="feature-card-desc">SHAP + LIME cross-checked evidence behind every prediction.</p>
            <span className="feature-card-cta">See the reasoning →</span>
          </Link>
          <Link to="/risk-heatmaps" className="feature-card feature-card--secondary">
            <span className="feature-card-icon">
              <IconMap size={20} />
            </span>
            <h3 className="feature-card-title">Risk Heat Maps</h3>
            <p className="feature-card-desc">Geographic risk hotspots across the accident history.</p>
            <span className="feature-card-cta">Explore the map →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
