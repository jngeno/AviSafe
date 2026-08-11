export function cssVar(name: string): string {
  if (typeof window === 'undefined') return '#3987e5';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function chartTextTheme() {
  return {
    textColor: cssVar('--text-secondary'),
    mutedColor: cssVar('--text-muted'),
    gridColor: cssVar('--gridline'),
  };
}
