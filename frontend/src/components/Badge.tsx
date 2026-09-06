const PRIORITY_COLOR: Record<string, string> = {
  Critical: 'var(--risk-critical)',
  High: 'var(--risk-high)',
  Medium: 'var(--risk-moderate)',
  Low: 'var(--risk-low)',
};

export function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLOR[priority] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {priority}
    </span>
  );
}

const JOB_STATUS_COLOR: Record<string, string> = {
  completed: 'var(--risk-low)',
  running: 'var(--risk-moderate)',
  pending: 'var(--text-muted)',
  failed: 'var(--risk-critical)',
};

export function StatusBadge({ status }: { status: string }) {
  const color = JOB_STATUS_COLOR[status] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {status}
    </span>
  );
}

const WORKFLOW_STATUS_COLOR: Record<string, string> = {
  Open: 'var(--risk-moderate)',
  'In Progress': 'var(--risk-info)',
  Completed: 'var(--risk-low)',
  Dismissed: 'var(--text-muted)',
};

export function WorkflowStatusBadge({ status }: { status: string }) {
  const color = WORKFLOW_STATUS_COLOR[status] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {status}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const isManual = source === 'manual';
  const color = isManual ? 'var(--risk-info)' : 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {isManual ? 'Manual' : 'Rule engine'}
    </span>
  );
}

const RISK_LEVEL_COLOR: Record<string, string> = {
  Critical: 'var(--risk-critical)',
  High: 'var(--risk-high)',
  Moderate: 'var(--risk-moderate)',
  Low: 'var(--risk-low)',
};

export function RiskLevelBadge({ level }: { level: string }) {
  const color = RISK_LEVEL_COLOR[level] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {level}
    </span>
  );
}

const RISK_STATUS_COLOR: Record<string, string> = {
  Identified: 'var(--risk-info)',
  'Under Review': 'var(--risk-moderate)',
  Mitigating: 'var(--risk-moderate)',
  Monitoring: 'var(--risk-low)',
  Closed: 'var(--text-muted)',
};

export function RiskStatusBadge({ status }: { status: string }) {
  const color = RISK_STATUS_COLOR[status] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {status}
    </span>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  Critical: 'var(--risk-critical)',
  High: 'var(--risk-high)',
  Medium: 'var(--risk-moderate)',
  Low: 'var(--risk-low)',
};

export function SeverityBadge({ severity }: { severity: string }) {
  const color = SEVERITY_COLOR[severity] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {severity}
    </span>
  );
}

const INCIDENT_STATUS_COLOR: Record<string, string> = {
  New: 'var(--risk-info)',
  Triaged: 'var(--risk-moderate)',
  Investigating: 'var(--risk-moderate)',
  Analysed: 'var(--risk-moderate)',
  'Action Required': 'var(--risk-high)',
  Resolved: 'var(--risk-low)',
  Closed: 'var(--text-muted)',
};

export function IncidentStatusBadge({ status }: { status: string }) {
  const color = INCIDENT_STATUS_COLOR[status] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {status}
    </span>
  );
}

const INVESTIGATION_STATUS_COLOR: Record<string, string> = {
  Open: 'var(--risk-info)',
  'In Progress': 'var(--risk-moderate)',
  'Pending Review': 'var(--risk-high)',
  Complete: 'var(--risk-low)',
};

export function InvestigationStatusBadge({ status }: { status: string }) {
  const color = INVESTIGATION_STATUS_COLOR[status] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {status}
    </span>
  );
}

const SAFETY_ACTION_STATUS_COLOR: Record<string, string> = {
  Open: 'var(--risk-info)',
  'In Progress': 'var(--risk-moderate)',
  Verification: 'var(--risk-moderate)',
  Closed: 'var(--risk-low)',
};

export function SafetyActionStatusBadge({ status }: { status: string }) {
  const color = SAFETY_ACTION_STATUS_COLOR[status] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {status}
    </span>
  );
}
