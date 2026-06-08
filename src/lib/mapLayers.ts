export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

/** Hosted dark style with readable roads, parks, and POIs (requires Mapbox token). */
export const DARK_MAP_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';

export const CITY_MARKERS_SOURCE = 'city-markers';
export const METRO_LINES_SOURCE = 'metro-lines';
export const METRO_STATIONS_SOURCE = 'metro-stations';

export function cityMarkersGeoJson(
  cities: { id: string; name: string; coords: [number, number]; accentColor: string; totalKm: number }[],
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cities.map((city) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: city.coords },
      properties: {
        id: city.id,
        name: city.name,
        accentColor: city.accentColor,
        totalKm: city.totalKm,
      },
    })),
  };
}

export function splitMetroGeoJson(geojson: GeoJSON.FeatureCollection): {
  lines: GeoJSON.FeatureCollection;
  stations: GeoJSON.FeatureCollection;
} {
  const lineFeatures: GeoJSON.Feature[] = [];
  const stationFeatures: GeoJSON.Feature[] = [];

  for (const feature of geojson.features) {
    if (feature.properties?.featureType === 'station' && feature.geometry.type === 'Point') {
      stationFeatures.push(feature);
      continue;
    }

    if (
      feature.geometry.type === 'LineString' ||
      feature.geometry.type === 'MultiLineString'
    ) {
      lineFeatures.push({
        ...feature,
        properties: {
          ...feature.properties,
          status: feature.properties?.status ?? 'operational',
        },
      });
    }
  }

  if (stationFeatures.length === 0) {
    for (const feature of lineFeatures) {
      if (feature.geometry.type !== 'LineString') continue;
      const coords = feature.geometry.coordinates;
      if (coords.length < 2) continue;
      stationFeatures.push(
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords[0] },
          properties: {},
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords[coords.length - 1] },
          properties: {},
        },
      );
    }
  }

  return {
    lines: { type: 'FeatureCollection', features: lineFeatures },
    stations: { type: 'FeatureCollection', features: stationFeatures },
  };
}
