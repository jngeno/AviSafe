import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getHotspots } from '../api/client';
import type { HotspotPoint } from '../api/types';
import { CATEGORY_ORDER, categoryColor } from '../components/categoryColor';

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

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

export function RiskHeatmaps() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [category, setCategory] = useState<string>('');
  const [hotspots, setHotspots] = useState<HotspotPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_BASEMAP_STYLE,
      center: [-30, 25],
      zoom: 1.6,
      attributionControl: false,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current.addControl(new maplibregl.AttributionControl({ compact: true }));
  }, []);

  useEffect(() => {
    getHotspots(category || undefined)
      .then(setHotspots)
      .catch((err) => setError(err?.message ?? 'Failed to load hotspots'));
  }, [category]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers: maplibregl.Marker[] = [];
    const maxCount = Math.max(...hotspots.map((h) => h.count), 1);

    const render = () => {
      markers.forEach((m) => m.remove());
      markers.length = 0;

      for (const point of hotspots) {
        const size = 6 + (point.count / maxCount) * 26;
        const color = categoryColor(point.category).startsWith('var')
          ? getComputedStyle(document.documentElement)
              .getPropertyValue(
                point.category === 'CFIT'
                  ? '--series-cfit'
                  : point.category === 'LOC-I'
                    ? '--series-loci'
                    : '--series-runway',
              )
              .trim()
          : categoryColor(point.category);

        const el = document.createElement('div');
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = '50%';
        el.style.background = `rgba(${hexToRgb(color)}, 0.55)`;
        el.style.border = `1px solid rgba(${hexToRgb(color)}, 0.9)`;
        el.title = `${point.category}: ${point.count} event${point.count === 1 ? '' : 's'}`;

        const marker = new maplibregl.Marker({ element: el }).setLngLat([
          point.longitude,
          point.latitude,
        ]);
        marker.addTo(map);
        markers.push(marker);
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once('load', render);

    return () => markers.forEach((m) => m.remove());
  }, [hotspots]);

  return (
    <div>
      <div className="page-header">
        <h1>Risk Heat Maps</h1>
        <p>
          Geographic concentration of accidents by category, aggregated from NTSB event
          coordinates. Marker size and opacity scale with event count in each grid cell.
        </p>
      </div>

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Accident category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error-state">{error}</div>}

        <div ref={mapContainer} style={{ height: 520, borderRadius: 8, overflow: 'hidden' }} />

        <div className="diverging-legend" style={{ marginTop: 12 }}>
          {CATEGORY_ORDER.map((c) => (
            <span key={c}>
              <i style={{ background: categoryColor(c) }} />
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
