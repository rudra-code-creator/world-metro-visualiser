import { fetchOsmMetro } from './osm-fetch.mjs';

function featureGroupKey(feature) {
  return (feature.properties.groupName || feature.properties.name || '').toLowerCase();
}

export async function mergeWithOsmConstruction(city, lineFeatures) {
  const operationalNames = new Set(lineFeatures.map(featureGroupKey));

  try {
    console.log(`  [OSM] Fetching upcoming/planned lines...`);
    const { lines: constructionLines } = await fetchOsmMetro(city, { constructionOnly: true });

    const upcomingOnly = constructionLines.filter((line) => !operationalNames.has(featureGroupKey(line)));
    console.log(`  [OSM] Adding ${upcomingOnly.length} upcoming segments`);
    return upcomingOnly;
  } catch (error) {
    console.warn(`  [OSM] Skipped upcoming lines (Overpass unavailable): ${error.message}`);
    return [];
  }
}

export async function buildMetroCollection(city, lineFeatures, stationFeatures, { includeConstruction = true } = {}) {
  const upcoming = includeConstruction ? await mergeWithOsmConstruction(city, lineFeatures) : [];
  const allLines = [...lineFeatures, ...upcoming];
  const totalKm = allLines.reduce((sum, feature) => sum + feature.properties.lengthKm, 0);

  console.log(
    `  Total: ${allLines.length} segments, ${stationFeatures.length} stations, ~${totalKm.toFixed(0)} km`,
  );

  return { type: 'FeatureCollection', features: [...allLines, ...stationFeatures] };
}
