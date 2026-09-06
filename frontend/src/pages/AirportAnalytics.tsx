import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  listAirportCountries,
  listAirportTypes,
  searchAirports,
} from '../api/client';
import type { Airport, CountryCount } from '../api/types';
import { cssVar } from '../chartTheme';
import { useTheme } from '../useTheme';
import { SimpleBarChart } from '../components/SimpleBarChart';

const PAGE_SIZE = 25;

const DARK_BASEMAP_STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster' as const, source: 'carto-dark' }],
};

function typeLabel(type: string): string {
  return type
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function AirportAnalytics() {
  const [theme] = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [countries, setCountries] = useState<CountryCount[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [country, setCountry] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(0);

  const [results, setResults] = useState<Airport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAirportCountries().then(setCountries).catch(() => setCountries([]));
    listAirportTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    searchAirports({
      search: search || undefined,
      country: country || undefined,
      type: type || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        setResults(res.results);
        setTotal(res.total);
      })
      .catch((err) => setError(err?.message ?? 'Failed to load airports'))
      .finally(() => setLoading(false));
  }, [search, country, type, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_BASEMAP_STYLE,
      center: [10, 25],
      zoom: 1.2,
      attributionControl: false,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current.addControl(new maplibregl.AttributionControl({ compact: true }));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers: maplibregl.Marker[] = [];
    const color = cssVar('--brand-accent') || '#3d7dbf';

    const render = () => {
      markers.forEach((m) => m.remove());
      markers.length = 0;

      for (const airport of results) {
        const el = document.createElement('div');
        el.style.width = '8px';
        el.style.height = '8px';
        el.style.borderRadius = '50%';
        el.style.background = color;
        el.style.border = '1px solid rgba(255,255,255,0.6)';
        el.style.cursor = 'pointer';

        const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
          `<strong>${airport.name}</strong><br/>${[airport.icao_code, airport.iata_code]
            .filter(Boolean)
            .join(' / ') || airport.ident} &middot; ${airport.municipality ?? ''} ${airport.country ?? ''}`,
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([airport.longitude, airport.latitude])
          .setPopup(popup);
        marker.addTo(map);
        markers.push(marker);
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once('load', render);

    return () => markers.forEach((m) => m.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, theme]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="page-header">
        <h1>Airport Analytics</h1>
        <p>
          A searchable directory of {total > 0 ? total.toLocaleString() : '49,000+'} airports
          worldwide - name, ICAO/IATA identifiers, type, and location, from the OurAirports
          reference dataset. This is identity and location data, not yet accident analytics:
          the platform's accident records aren't linked to a specific airport, so per-airport
          risk scores and traffic volume aren't shown here.
        </p>
      </div>

      <div className="card">
        <div className="field-row">
          <form className="field" onSubmit={handleSearchSubmit}>
            <label>Search</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, ICAO, IATA, or city…"
            />
          </form>
          <div className="field">
            <label>Country</label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.count.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Airports &amp; seaplane bases</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error-state">{error}</div>}

        <div ref={mapContainer} style={{ height: 340, borderRadius: 8, overflow: 'hidden' }} />
      </div>

      {countries.length > 0 && (
        <div className="card">
          <h2>Top countries by airport count</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: -2, marginBottom: 12 }}>
            From the full OurAirports reference dataset (not filtered by the search above).
          </p>
          <SimpleBarChart
            data={countries.map((c) => ({ label: c.code, value: c.count }))}
            format={(v) => v.toLocaleString()}
            ariaLabel="Top countries by airport count"
            limit={10}
          />
        </div>
      )}

      {loading && <div className="loading-state">Loading airports…</div>}

      {!loading && !error && results.length === 0 && (
        <div className="empty-state">No airports match these filters.</div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>ICAO</th>
                <th>IATA</th>
                <th>Type</th>
                <th>Country</th>
                <th>Municipality</th>
                <th>Elevation</th>
              </tr>
            </thead>
            <tbody>
              {results.map((airport) => (
                <tr key={airport.ident}>
                  <td>
                    {airport.wikipedia_link ? (
                      <a href={airport.wikipedia_link} target="_blank" rel="noreferrer">
                        {airport.name}
                      </a>
                    ) : (
                      airport.name
                    )}
                  </td>
                  <td className="tabular">{airport.icao_code ?? '-'}</td>
                  <td className="tabular">{airport.iata_code ?? '-'}</td>
                  <td>{typeLabel(airport.type)}</td>
                  <td>{airport.country ?? '-'}</td>
                  <td>{airport.municipality ?? '-'}</td>
                  <td className="tabular">
                    {airport.elevation_ft !== null ? `${airport.elevation_ft.toFixed(0)} ft` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              type="button"
              className="btn-secondary btn-small"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Page {page + 1} of {totalPages} &middot; {total.toLocaleString()} airports
            </span>
            <button
              type="button"
              className="btn-secondary btn-small"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
