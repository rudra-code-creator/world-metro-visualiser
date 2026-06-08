import { matchLineColor } from '../lib/osm-fetch.mjs';
import { lineLengthKm } from '../lib/metro-utils.mjs';
import { buildMetroCollection } from '../lib/provider-merge.mjs';

const TFL_API = 'https://api.tfl.gov.uk';

function parseTflSegments(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(data) || data.length === 0) return [];

  if (typeof data[0]?.[0] === 'number') return [data];
  return data.filter((segment) => Array.isArray(segment) && segment.length >= 2);
}

export async function fetchLondonMetro(city) {
  console.log(`  [tfl-api] Fetching London Underground lines...`);

  const linesResponse = await fetch(`${TFL_API}/Line/Mode/tube`, {
    headers: { 'User-Agent': 'world-metro-visualiser/0.1' },
  });

  if (!linesResponse.ok) {
    throw new Error(`TfL API failed (${linesResponse.status})`);
  }

  const tubeLines = await linesResponse.json();
  const lineFeatures = [];
  const stationFeatures = [];
  const seenStations = new Set();

  for (const line of tubeLines) {
    const routeResponse = await fetch(`${TFL_API}/Line/${line.id}/Route/Sequence/inbound`, {
      headers: { 'User-Agent': 'world-metro-visualiser/0.1' },
    });

    if (!routeResponse.ok) continue;

    const route = await routeResponse.json();
    const color = matchLineColor(line.name, city.linesDetail) || '#888888';

    for (let index = 0; index < (route.lineStrings?.length || 0); index++) {
      const segments = parseTflSegments(route.lineStrings[index]);

      segments.forEach((coordinates, segmentIndex) => {
        if (coordinates.length < 2) return;

        const branchCount = route.lineStrings.length * segments.length;
        const branchLabel =
          branchCount > 1 ? ` (branch ${index + 1}${segments.length > 1 ? `.${segmentIndex + 1}` : ''})` : '';

        lineFeatures.push({
          type: 'Feature',
          properties: {
            name: `${line.name}${branchLabel}`,
            groupName: line.name,
            color,
            status: 'operational',
            lengthKm: lineLengthKm(coordinates),
            source: 'tfl-api',
          },
          geometry: { type: 'LineString', coordinates },
        });
      });
    }

    for (const station of route.stations || []) {
      const lon = Number(station.lon);
      const lat = Number(station.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;

      const key = `${lon.toFixed(5)},${lat.toFixed(5)}`;
      if (seenStations.has(key)) continue;
      seenStations.add(key);

      stationFeatures.push({
        type: 'Feature',
        properties: {
          name: station.name || '',
          featureType: 'station',
          status: 'operational',
        },
        geometry: { type: 'Point', coordinates: [lon, lat] },
      });
    }
  }

  const totalKm = lineFeatures.reduce((sum, feature) => sum + feature.properties.lengthKm, 0);
  console.log(
    `  [tfl-api] ${lineFeatures.length} line segments, ${stationFeatures.length} stations, ~${totalKm.toFixed(0)} km`,
  );

  return buildMetroCollection(city, lineFeatures, stationFeatures);
}
