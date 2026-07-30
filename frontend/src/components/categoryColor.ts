// Fixed categorical hue assignment -- never cycled or re-derived from
// data order, so a category keeps the same color everywhere in the app.
const CATEGORY_COLOR_VAR: Record<string, string> = {
  CFIT: 'var(--series-cfit)',
  'LOC-I': 'var(--series-loci)',
  'Runway Excursion': 'var(--series-runway)',
};

export function categoryColor(category: string): string {
  return CATEGORY_COLOR_VAR[category] ?? 'var(--text-muted)';
}

export const CATEGORY_ORDER = ['CFIT', 'LOC-I', 'Runway Excursion'];
