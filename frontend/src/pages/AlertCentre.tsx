import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { acknowledgeAlert, listAlerts } from '../api/client';
import type { Alert } from '../api/types';
import { RiskLevelBadge } from '../components/Badge';

const SEVERITY_OPTIONS = ['Critical', 'High', 'Moderate', 'Low'];

const SOURCE_LINK: Record<string, string> = {
  recommendation: '/recommendations',
  safety_action: '/safety-actions',
  risk_register: '/risk-register',
  incident: '/incidents',
};

function AlertRow({ alert, onAcknowledged }: { alert: Alert; onAcknowledged: (key: string) => void }) {
  const [acking, setAcking] = useState(false);

  async function handleAck() {
    setAcking(true);
    try {
      await acknowledgeAlert(alert.alert_key);
      onAcknowledged(alert.alert_key);
    } finally {
      setAcking(false);
    }
  }

  const basePath = SOURCE_LINK[alert.source_type];
  // Deep-link straight to the specific record that triggered this alert
  // (every destination page supports ?highlight= now), not just the
  // page - this is the "Affected Entity" / "View Related Data" link.
  const link = basePath ? `${basePath}?highlight=${alert.source_id}` : null;

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div className="defense-badge-row" style={{ marginBottom: 6 }}>
            <RiskLevelBadge level={alert.severity} />
            <span className="text-muted" style={{ fontSize: 12 }}>{alert.category}</span>
            {alert.relevant_date && (
              <span className="tabular text-muted" style={{ fontSize: 12 }}>{alert.relevant_date}</span>
            )}
          </div>
          <h3 style={{ margin: 0 }}>{alert.title}</h3>
          <p style={{ fontSize: 13, margin: '6px 0' }}>{alert.description}</p>
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            <strong>Recommended action:</strong> {alert.recommended_action}
          </p>
          {link && (
            <p style={{ marginTop: 6 }}>
              <Link to={link} style={{ fontSize: 13 }}>
                Open affected {alert.source_type.replace('_', ' ')} record →
              </Link>
            </p>
          )}
        </div>
        <button type="button" className="btn-secondary btn-small" onClick={handleAck} disabled={acking}>
          {acking ? 'Acknowledging…' : 'Acknowledge'}
        </button>
      </div>
    </div>
  );
}

export function AlertCentre() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState('');

  function load() {
    setLoading(true);
    listAlerts({ severity: severity || undefined })
      .then(setAlerts)
      .catch((err) => setError(err?.message ?? 'Failed to load alerts'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity]);

  function handleAcknowledged(key: string) {
    setAlerts((rows) => rows.filter((a) => a.alert_key !== key));
  }

  const summary = useMemo(() => {
    const counts = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
    for (const a of alerts) counts[a.severity] += 1;
    return { total: alerts.length, ...counts };
  }, [alerts]);

  return (
    <div>
      <div className="page-header">
        <h1>Alert Centre</h1>
        <p>
          Live, severity-ranked alerts computed directly from real data across recommendations,
          safety actions, the risk register, and incident management - not a separately-invented
          notification feed. Every alert traces to an actual row you can open and act on.
        </p>
      </div>

      {!loading && !error && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-tile">
            <h3>Total active</h3>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-tile">
            <h3>Critical</h3>
            <div className="stat-value" style={{ color: summary.Critical > 0 ? 'var(--risk-critical)' : undefined }}>
              {summary.Critical}
            </div>
          </div>
          <div className="stat-tile">
            <h3>High</h3>
            <div className="stat-value" style={{ color: summary.High > 0 ? 'var(--risk-high)' : undefined }}>
              {summary.High}
            </div>
          </div>
          <div className="stat-tile">
            <h3>Moderate / Low</h3>
            <div className="stat-value">{summary.Moderate + summary.Low}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">All severities</option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">Loading alerts…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && alerts.length === 0 && (
        <div className="empty-state">
          No active alerts. Nothing overdue, unaddressed, or flagged for attention right now.
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div>
          {alerts.map((a) => (
            <AlertRow key={a.alert_key} alert={a} onAcknowledged={handleAcknowledged} />
          ))}
        </div>
      )}
    </div>
  );
}
