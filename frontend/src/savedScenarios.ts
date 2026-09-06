// Per-browser saved-scenario storage for the Flight Risk Simulator.
// Lives only in this viewer's browser (localStorage) -- there is no
// backend model for "a scenario a user named and kept," and these are
// exploratory what-ifs, not data the platform needs to persist or share
// across viewers/devices.

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  experimentId: number;
  experimentLabel: string;
  values: Record<string, string>;
  predictedClass?: string;
  probabilities?: Record<string, number>;
}

const STORAGE_KEY = 'avisafe:saved-scenarios';

function safeParse(raw: string | null): SavedScenario[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listSavedScenarios(): SavedScenario[] {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY)).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

export function saveScenario(scenario: Omit<SavedScenario, 'id' | 'createdAt'>): SavedScenario | null {
  const record: SavedScenario = {
    ...scenario,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  try {
    const existing = safeParse(localStorage.getItem(STORAGE_KEY));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing]));
    return record;
  } catch {
    return null;
  }
}

export function deleteSavedScenario(id: string): void {
  try {
    const existing = safeParse(localStorage.getItem(STORAGE_KEY));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((s) => s.id !== id)));
  } catch {
    // Ignore -- storage unavailable (private browsing, quota, etc.)
  }
}
