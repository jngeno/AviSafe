import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Link } from 'react-router-dom';
import { getDashboardSummary, getLatestExperiment } from '../api/client';
import type { DashboardSummary, ExperimentDetail } from '../api/types';
import { StatTile } from '../components/StatTile';
import { CategoryBarChart } from '../components/CategoryBarChart';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { RecommendationList } from '../components/RecommendationList';
import { useTheme } from '../useTheme';
import { cssVar } from '../chartTheme';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(3);
}

function MonthlyTrendChart({ trend }: { trend: DashboardSummary['monthly_trend'] }) {
  const [theme] = useTheme();

  const option = useMemo(() => {
    const sorted = [...trend].sort((a, b) => (a.year - b.year) || (a.month - b.month));
    const labels = sorted.map((d) => `${MONTH_NAMES[d.month - 1] ?? d.month} ${d.year}`);
    const values = sorted.map((d) => d.count);
    const lineColor = cssVar('--series-cfit');
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

  return (
    <div>
      <div className="page-header">
        <h1>Aviation Safety Dashboard</h1>
        <p>
          Executive overview across {summary.active_datasets} dataset
          {summary.active_datasets === 1 ? '' : 's'} and {summary.models_trained} trained model
          {summary.models_trained === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="stat-grid">
        <StatTile label="Total accidents" value={summary.total_accidents.toLocaleString()} />
        <StatTile label="Total incidents" value={summary.total_incidents.toLocaleString()} />
        <StatTile
          label="Best model accuracy"
          value={formatMetric(summary.best_accuracy)}
          sub={summary.best_model ?? undefined}
        />
        <StatTile label="Open recommendations" value={String(summary.open_recommendations)} />
      </div>

      {summary.high_risk_categories.length > 0 && (
        <div className="card">
          <h2>Highest-risk categories</h2>
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
          <h2>Accident category breakdown</h2>
          <CategoryBarChart data={categoryData} format={(v) => v.toFixed(0)} ariaLabel="Accident category breakdown" />
        </div>

        <div className="card">
          <h2>Events over time</h2>
          <MonthlyTrendChart trend={summary.monthly_trend} />
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Flight phase at time of event</h2>
          <SimpleBarChart data={flightPhaseData} ariaLabel="Flight phase breakdown" />
        </div>

        <div className="card">
          <h2>Weather condition</h2>
          <SimpleBarChart data={weatherData} ariaLabel="Weather condition breakdown" />
        </div>
      </div>

      {experiment && (
        <div className="card">
          <h2>Safety recommendations — latest experiment</h2>
          <p>
            From <strong>{experiment.model_name}</strong> on {experiment.target_column}.{' '}
            <Link to={`/experiments/${experiment.id}`}>View full experiment →</Link>
          </p>
          <div style={{ marginTop: 12 }}>
            <RecommendationList recommendations={experiment.recommendations} />
          </div>
        </div>
      )}
    </div>
  );
}
