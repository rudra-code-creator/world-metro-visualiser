import { fetchOsmMetroFull } from '../lib/osm-fetch.mjs';

export async function fetchOsmMetroCity(city) {
  const geojson = await fetchOsmMetroFull(city);
  geojson.features = geojson.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      source: feature.properties?.source || 'openstreetmap',
    },
  }));
  return geojson;
}
