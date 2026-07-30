const PRIORITY_COLOR: Record<string, string> = {
  High: 'var(--status-serious)',
  Medium: 'var(--status-warning)',
  Low: 'var(--status-good)',
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
  completed: 'var(--status-good)',
  running: 'var(--status-warning)',
  pending: 'var(--text-muted)',
  failed: 'var(--status-critical)',
};

export function StatusBadge({ status }: { status: string }) {
  const color = JOB_STATUS_COLOR[status] ?? 'var(--text-muted)';
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {status}
    </span>
  );
}
