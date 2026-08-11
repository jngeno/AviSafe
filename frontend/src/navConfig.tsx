import type { ReactNode } from 'react';
import {
  IconClipboard,
  IconClock,
  IconCpu,
  IconDatabase,
  IconFile,
  IconFlask,
  IconGrid,
  IconLayers,
  IconMap,
  IconPlane,
  IconSettings,
  IconTarget,
  IconTower,
  IconTrendUp,
} from './components/icons';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  comingSoon?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: <IconGrid />, end: true }],
  },
  {
    label: 'Data & Models',
    items: [
      { to: '/datasets', label: 'Datasets', icon: <IconDatabase /> },
      { to: '/train', label: 'Model Training', icon: <IconCpu /> },
      { to: '/experiments', label: 'Experiments', icon: <IconFlask /> },
      { to: '/performance', label: 'Model Performance', icon: <IconTrendUp /> },
    ],
  },
  {
    label: 'Explainability & Risk',
    items: [
      { to: '/explainable-ai', label: 'Explainable AI', icon: <IconLayers /> },
      { to: '/pattern-discovery', label: 'Pattern Discovery', icon: <IconTarget /> },
      { to: '/flight-risk-assessment', label: 'Flight Risk Assessment', icon: <IconPlane /> },
      { to: '/risk-heatmaps', label: 'Risk Heat Maps', icon: <IconMap /> },
    ],
  },
  {
    label: 'Safety Management',
    items: [
      { to: '/recommendations', label: 'Safety Recommendation Centre', icon: <IconClipboard /> },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/airports', label: 'Airport Analytics', icon: <IconTower />, comingSoon: true },
      { to: '/aircraft', label: 'Aircraft Analytics', icon: <IconPlane /> },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/reports', label: 'Reports', icon: <IconFile /> },
      { to: '/settings', label: 'Settings', icon: <IconSettings />, comingSoon: true },
    ],
  },
];

export const FUTURE_READY: { label: string; icon: ReactNode }[] = [
  { label: 'METAR / TAF Feeds', icon: <IconClock /> },
  { label: 'NOTAM Integration', icon: <IconClock /> },
  { label: 'SMS Management', icon: <IconClock /> },
  { label: 'AI Copilot', icon: <IconClock /> },
];
