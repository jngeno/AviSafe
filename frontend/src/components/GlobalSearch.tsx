import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAircraftAnalytics,
  listExperiments,
  listIncidents,
  listRecommendations,
  listRiskRegister,
  listSafetyActions,
  searchAirports,
} from '../api/client';

export const GLOBAL_SEARCH_OPEN_EVENT = 'avisafe:open-global-search';

export function openGlobalSearch() {
  window.dispatchEvent(new CustomEvent(GLOBAL_SEARCH_OPEN_EVENT));
}

interface ResultItem {
  category: string;
  label: string;
  sublabel: string;
  to: string;
}

// Every result here comes from a real, already-existing endpoint --
// this is a client-side fan-out across those endpoints, not a new
// search index or backend service.
async function runSearch(query: string): Promise<ResultItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const qLower = q.toLowerCase();

  const [experiments, recommendations, risks, incidents, actions, airports, aircraft] =
    await Promise.all([
      listExperiments().catch(() => []),
      listRecommendations({ search: q, limit: 5 }).catch(() => []),
      listRiskRegister({ search: q, limit: 5 }).catch(() => []),
      listIncidents({ search: q, limit: 5 }).catch(() => []),
      listSafetyActions({ search: q, limit: 5 }).catch(() => []),
      searchAirports({ search: q, limit: 5 })
        .then((r) => r.results)
        .catch(() => []),
      getAircraftAnalytics(30).catch(() => []),
    ]);

  const results: ResultItem[] = [];

  for (const exp of experiments) {
    if (
      exp.model_name.toLowerCase().includes(qLower) ||
      exp.target_column.toLowerCase().includes(qLower)
    ) {
      results.push({
        category: 'Experiments',
        label: `${exp.model_name} - ${exp.target_column}`,
        sublabel: `${exp.id}`,
        to: `/experiments/${exp.id}`,
      });
      if (results.filter((r) => r.category === 'Experiments').length >= 5) break;
    }
  }

  for (const rec of recommendations) {
    results.push({
      category: 'Recommendations',
      label: rec.recommendation.slice(0, 80),
      sublabel: `${rec.category} · ${rec.priority}`,
      to: `/recommendations?highlight=${rec.id}`,
    });
  }

  for (const risk of risks) {
    results.push({
      category: 'Risk Register',
      label: risk.title,
      sublabel: `${risk.risk_level} · score ${risk.risk_score}`,
      to: `/risk-register?highlight=${risk.id}`,
    });
  }

  for (const inc of incidents) {
    results.push({
      category: 'Incidents',
      label: inc.title,
      sublabel: `${inc.event_type} · ${inc.severity}`,
      to: `/incidents?highlight=${inc.id}`,
    });
  }

  for (const act of actions) {
    results.push({
      category: 'Safety Actions',
      label: act.title,
      sublabel: `${act.priority} · ${act.status}`,
      to: `/safety-actions?highlight=${act.id}`,
    });
  }

  for (const airport of airports) {
    results.push({
      category: 'Airports',
      label: airport.name,
      sublabel: [airport.icao_code, airport.iata_code].filter(Boolean).join(' / ') || airport.ident,
      to: '/airports',
    });
  }

  for (const a of aircraft) {
    if (a.manufacturer.toLowerCase().includes(qLower)) {
      results.push({
        category: 'Aircraft',
        // Source data stores manufacturer lowercase (see AircraftAnalytics.tsx)
        label: a.manufacturer.replace(/\b\w/g, (c) => c.toUpperCase()),
        sublabel: `${a.total_accidents} accidents on record`,
        to: `/aircraft?highlight=${encodeURIComponent(a.manufacturer)}`,
      });
    }
  }

  return results;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    function handleOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(GLOBAL_SEARCH_OPEN_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(GLOBAL_SEARCH_OPEN_EVENT, handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      runSearch(q)
        .then((r) => {
          setResults(r);
          setSelectedIndex(0);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  const grouped = useMemo(() => {
    const map = new Map<string, ResultItem[]>();
    for (const r of results) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }, [results]);

  function goTo(item: ResultItem) {
    navigate(item.to);
    setOpen(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      goTo(results[selectedIndex]);
    }
  }

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(600px, 92vw)',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          aria-label="Search across AviSafe"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-autocomplete="list"
          placeholder="Search experiments, recommendations, risks, incidents, actions, airports, aircraft…"
          style={{
            width: '100%',
            padding: '16px 18px',
            fontSize: 15,
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />

        <div style={{ overflowY: 'auto', padding: results.length > 0 ? '8px 0' : 0 }}>
          {loading && (
            <div style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-muted)' }}>
              Searching…
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-muted)' }}>
              No matches for &ldquo;{query}&rdquo;.
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-muted)' }}>
              Type at least 2 characters to search across the platform&apos;s real data. Press{' '}
              <kbd>Esc</kbd> to close, <kbd>↑</kbd>/<kbd>↓</kbd> then <kbd>Enter</kbd> to navigate.
            </div>
          )}

          {[...grouped.entries()].map(([category, items]) => (
            <div key={category} style={{ marginBottom: 4 }}>
              <div
                style={{
                  padding: '6px 18px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                {category}
              </div>
              {items.map((item) => {
                flatIndex += 1;
                const isSelected = flatIndex === selectedIndex;
                return (
                  <button
                    key={`${item.category}-${item.label}-${item.sublabel}`}
                    type="button"
                    onClick={() => goTo(item)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 18px',
                      background: isSelected ? 'var(--surface-2)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ fontSize: 14 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.sublabel}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
