/**
 * Beijing has no official open GTFS with shapes. This dedicated provider uses
 * curated OpenStreetMap route relations — the best openly available geometry source.
 */
import { fetchOsmMetroFull } from '../lib/osm-fetch.mjs';

export async function fetchBeijingMetro(city) {
  console.log(`  [osm-beijing] Fetching Beijing Subway from OpenStreetMap...`);
  const geojson = await fetchOsmMetroFull(city);

  geojson.features = geojson.features.map((feature) => {
    if (!feature.properties) return feature;
    return {
      ...feature,
      properties: {
        ...feature.properties,
        source: feature.properties.featureType === 'station' ? 'osm-beijing' : 'osm-beijing',
      },
    };
  });

  return geojson;
}
