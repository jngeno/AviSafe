import type { ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconClipboard,
  IconCpu,
  IconDatabase,
  IconFile,
  IconFlask,
  IconGrid,
  IconLayers,
  IconMap,
  IconPlane,
  IconSearch,
  IconTarget,
  IconTower,
  IconTrendUp,
} from './components/icons';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

// Full product IA (AviSafe product spec, section 6). Every item routes
// to a real, working page against the existing FastAPI backend.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Command Centre',
    items: [{ to: '/', label: 'Command Centre', icon: <IconGrid />, end: true }],
  },
  {
    label: 'Safety Operations',
    items: [
      { to: '/safety-intelligence', label: 'Safety Intelligence', icon: <IconTrendUp /> },
      { to: '/flight-risk-assessment', label: 'Flight Risk Assessment', icon: <IconPlane /> },
      { to: '/incidents', label: 'Incident Management', icon: <IconAlertTriangle /> },
      { to: '/investigations', label: 'Investigations', icon: <IconSearch /> },
      { to: '/risk-register', label: 'Risk Register', icon: <IconClipboard /> },
    ],
  },
  {
    label: 'Recommendations & Actions',
    items: [
      { to: '/recommendations', label: 'Safety Recommendation Centre', icon: <IconClipboard /> },
      { to: '/safety-actions', label: 'Safety Actions', icon: <IconCheck /> },
      { to: '/safety-reporting', label: 'Safety Reporting', icon: <IconFile /> },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/airports', label: 'Airport Analytics', icon: <IconTower /> },
      { to: '/aircraft', label: 'Aircraft Analytics', icon: <IconPlane /> },
    ],
  },
  {
    label: 'Reporting & Alerts',
    items: [
      { to: '/reports', label: 'Reports', icon: <IconFile /> },
      { to: '/alerts', label: 'Alerts', icon: <IconBell /> },
    ],
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
    label: 'Explainability',
    items: [
      { to: '/explainable-ai', label: 'Explainable AI', icon: <IconLayers /> },
      { to: '/pattern-discovery', label: 'Pattern Discovery', icon: <IconTarget /> },
      { to: '/risk-heatmaps', label: 'Risk Heat Maps', icon: <IconMap /> },
    ],
  },
];
