import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Link } from 'react-router-dom';
import { getAircraftAnalytics, getDashboardSummary, getLatestExperiment } from '../api/client';
import type { AircraftAnalytics, DashboardSummary, ExperimentDetail } from '../api/types';
import { StatTile } from '../components/StatTile';
import { CategoryBarChart } from '../components/CategoryBarChart';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { RecommendationList } from '../components/RecommendationList';
import { RiskGauge } from '../components/RiskGauge';
import { useTheme } from '../useTheme';
import { cssVar } from '../chartTheme';

function riskLevelFor(pct: number): 'Low' | 'Moderate' | 'High' | 'Critical' {
  if (pct < 15) return 'Low';
  if (pct < 30) return 'Moderate';
  if (pct < 45) return 'High';
  return 'Critical';
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toFixed(3);
}

function MonthlyTrendChart({ trend }: { trend: DashboardSummary['monthly_trend'] }) {
  const [theme] = useTheme();

  const option = useMemo(() => {
    const sorted = [...trend].sort((a, b) => (a.year - b.year) || (a.month - b.month));
    const labels = sorted.map((d) => `${MONTH_NAMES[d.month - 1] ?? d.month} ${d.year}`);
    const values = sorted.map((d) => d.count);
    const lineColor = cssVar('--brand-accent');
    const textColor = cssVar('--text-muted');
    const gridColor = cssVar('--gridline');

    return {
      grid: { left: 40, right: 16, top: 16, bottom: 32 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10, interval: Math.ceil(labels.length / 12) },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 },
      },
      tooltip: { trigger: 'axis' },
      series: [
        {
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: lineColor, width: 2 },
          areaStyle: { color: lineColor, opacity: 0.12 },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trend, theme]);

  if (trend.length === 0) return <p>No data available.</p>;

  return <ReactECharts option={option} style={{ height: 240 }} notMerge />;
}

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [aircraft, setAircraft] = useState<AircraftAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err?.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false));

    getLatestExperiment('Accident_Category')
      .then(setExperiment)
      .catch(() => setExperiment(null));

    getAircraftAnalytics(5)
      .then(setAircraft)
      .catch(() => setAircraft([]));
  }, []);

  if (loading) return <div className="loading-state">Loading dashboard…</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (!summary) return null;

  const categoryData = Object.entries(summary.category_breakdown).map(([category, value]) => ({
    category,
    value,
  }));

  const flightPhaseData = Object.entries(summary.flight_phase_breakdown).map(([label, value]) => ({
    label,
    value,
  }));

  const weatherData = Object.entries(summary.weather_breakdown).map(([label, value]) => ({
    label,
    value,
  }));

  // Accident/Incident rate: real derived percentages, not fetched from a
  // separate endpoint (there isn't one) -- just total_accidents /
  // total_incidents re-expressed as a share of all logged events.
  const totalEvents = summary.total_accidents + summary.total_incidents;
  const accidentRate = totalEvents > 0 ? (summary.total_accidents / totalEvents) * 100 : null;

  // Global Risk Index: same transparent, real-data formula as the Command
  // Centre gauge (share of accidents in the tracked high-risk categories)
  // -- reused, not reinvented, so the two pages never disagree.
  const highRiskCount = summary.high_risk_categories.reduce(
    (sum, cat) => sum + (summary.category_breakdown[cat] ?? 0),
    0,
  );
  const riskIndex = summary.total_accidents > 0 ? (highRiskCount / summary.total_accidents) * 100 : 0;

  const topRiskFactors = experiment?.feature_importances
    ? [...experiment.feature_importances].sort((a, b) => b.importance - a.importance).slice(0, 6)
    : [];

  return (
    <div>
      {/* Safety Intelligence Hero Banner */}
      <div className="card dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-kicker">Aviation Safety Intelligence</div>
          <h1 className="dashboard-hero-title">
            AviSafe Safety Intelligence
          </h1>
          <p className="dashboard-hero-subtitle">
            Monitor aviation risk with clear, explainable insights from accident records, operational patterns, and real-time safety indicators across CFIT, LOC-I, and runway excursions.
          </p>

          <div className="dashboard-hero-actions">
            <Link to="/flight-risk-assessment" className="btn-secondary">
              Live Scenario Simulator
            </Link>
          </div>
        </div>
      </div>

      <div className="page-header" style={{ marginTop: 24 }}>
        <h2>Aviation Safety Analytics &amp; Model Operations</h2>
        <p>
          Live synthesis across {summary.active_datasets} dataset
          {summary.active_datasets === 1 ? '' : 's'}, {summary.models_trained} trained model
          {summary.models_trained === 1 ? '' : 's'}, and real-time causal risk attributions.
        </p>
      </div>

      <div className="stat-grid">
        <StatTile label="Total accidents analyzed" value={summary.total_accidents.toLocaleString()} />
        <StatTile label="Total safety incidents" value={summary.total_incidents.toLocaleString()} />
        <StatTile
          label="Best model accuracy"
          value={formatMetric(summary.best_accuracy)}
          sub={summary.best_model ?? undefined}
        />
        <StatTile label="Open ICAO safety actions" value={String(summary.open_recommendations)} />
        {accidentRate !== null && (
          <StatTile
            label="Accident rate"
            value={`${accidentRate.toFixed(1)}%`}
            sub="Share of logged events classed as accidents, not incidents"
          />
        )}
      </div>

      {summary.high_risk_categories.length > 0 && (
        <div className="card">
          <h2>Highest-risk systemic categories</h2>
          <div className="evidence-list">
            {summary.high_risk_categories.map((cat) => (
              <span className="evidence-chip" key={cat}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <h2>Accident category distribution</h2>
          <CategoryBarChart data={categoryData} format={(v) => v.toFixed(0)} ariaLabel="Accident category breakdown" />
        </div>

        <div className="card">
          <h2>Historical events timeline</h2>
          <MonthlyTrendChart trend={summary.monthly_trend} />
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Flight phase at time of occurrence</h2>
          <SimpleBarChart data={flightPhaseData} ariaLabel="Flight phase breakdown" />
        </div>

        <div className="card">
          <h2>Meteorological condition (VMC vs IMC)</h2>
          <SimpleBarChart data={weatherData} ariaLabel="Weather condition breakdown" />
        </div>
      </div>

      <div className="card-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ alignSelf: 'flex-start' }}>Global Risk Index</h2>
          <RiskGauge
            value={riskIndex}
            level={riskLevelFor(riskIndex)}
            label="Share of accidents in tracked high-risk categories (CFIT / LOC-I / Runway Excursion)"
          />
        </div>

        <div className="card">
          <h2>Top aircraft by accident volume</h2>
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
                    <td style={{ textTransform: 'capitalize' }}>{a.manufacturer}</td>
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

      {topRiskFactors.length > 0 && (
        <div className="card">
          <h2>Top global risk factors</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: -2, marginBottom: 10 }}>
            Mean |SHAP| feature importance from the latest {experiment?.model_name} run on{' '}
            {experiment?.target_column}.
          </p>
          <SimpleBarChart
            data={topRiskFactors.map((f) => ({ label: f.feature, value: f.importance }))}
            format={(v) => v.toFixed(3)}
            ariaLabel="Top global risk factors by SHAP importance"
          />
        </div>
      )}

      {experiment && (
        <div className="card">
          <h2>Active safety recommendations - latest model run</h2>
          <p>
            Synthesized from <strong>{experiment.model_name}</strong> on {experiment.target_column}.{' '}
            <Link to={`/experiments/${experiment.id}`}>View full model experiment →</Link>
          </p>
          <div style={{ marginTop: 12 }}>
            <RecommendationList recommendations={experiment.recommendations} />
          </div>
        </div>
      )}
    </div>
  );
}
