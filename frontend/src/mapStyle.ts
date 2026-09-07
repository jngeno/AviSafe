// Esri's public World_Dark_Gray_Base tile service -- no API key
// required (unlike CARTO's basemap tiles, which now gate raster
// access behind a key and watermark unauthenticated requests).
// Verified directly against the service's own metadata (copyrightText,
// 256px tiles, 24 zoom levels) before adopting it.
export const DARK_BASEMAP_STYLE = {
  version: 8 as const,
  sources: {
    'esri-dark-gray': {
      type: 'raster' as const,
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
    },
  },
  layers: [{ id: 'esri-dark-gray-layer', type: 'raster' as const, source: 'esri-dark-gray' }],
};
