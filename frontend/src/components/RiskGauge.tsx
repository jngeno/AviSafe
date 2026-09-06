import { useEffect, useState } from 'react';

interface RiskGaugeProps {
  /** 0-100 */
  value: number;
  level: 'Low' | 'Moderate' | 'High' | 'Critical';
  label: string;
}

const LEVEL_VAR: Record<RiskGaugeProps['level'], string> = {
  Low: 'var(--risk-low)',
  Moderate: 'var(--risk-moderate)',
  High: 'var(--risk-high)',
  Critical: 'var(--risk-critical)',
};

// Semi-circle SVG arc gauge -- animates its fill on mount via a CSS
// transition on stroke-dashoffset. Pure vector, no chart library, no
// photography (product spec section 4).
export function RiskGauge({ value, level, label }: RiskGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedValue(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const radius = 80;
  const circumference = Math.PI * radius; // half circumference (semi-circle)
  const clamped = Math.max(0, Math.min(100, animatedValue));
  const offset = circumference - (clamped / 100) * circumference;
  const color = LEVEL_VAR[level];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={200} height={112} viewBox="0 0 200 112">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={16}
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
        <text x="100" y="82" textAnchor="middle" fontSize="30" fontWeight={700} fill="var(--text-primary)">
          {Math.round(clamped)}
        </text>
        <text x="100" y="100" textAnchor="middle" fontSize="10" fill="var(--text-muted)" letterSpacing="0.06em">
          / 100
        </text>
      </svg>
      <span
        className="badge"
        style={{ borderColor: color, color, marginTop: -6 }}
      >
        {level} Risk
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{label}</span>
    </div>
  );
}
