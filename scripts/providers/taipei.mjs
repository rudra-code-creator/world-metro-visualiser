import { matchLineColor } from '../lib/osm-fetch.mjs';
import { geometryLengthKm } from '../lib/metro-utils.mjs';
import { buildMetroCollection } from '../lib/provider-merge.mjs';

const TDX_TRACKS_API =
  'https://api.github.com/repos/ianlkl11234s/mini-taiwan-learning-project/contents/public/data/trtc/tracks';
const TDX_RAW_BASE =
  'https://raw.githubusercontent.com/ianlkl11234s/mini-taiwan-learning-project/main/public/data/trtc';

const STATION_FILES = [
  'red_line_stations.geojson',
  'blue_line_stations.geojson',
  'green_line_stations.geojson',
  'orange_line_stations.geojson',
  'brown_line_stations.geojson',
  'tymc_stations.geojson',
  'ntmc_stations.geojson',
];

const USER_AGENT = 'world-metro-visualiser/0.1';

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`);
  return response.json();
}

function convertTrackFeature(feature, city) {
  const props = feature.properties || {};
  const geom = feature.geometry;
  if (!geom || geom.type !== 'LineString') return null;

  const groupName = props.name || props.route_id || 'Taipei Metro';
  const color = props.color || matchLineColor(groupName, city.linesDetail) || '#888888';

  return {
    type: 'Feature',
    properties: {
      name: groupName,
      groupName,
      color,
      status: 'operational',
      lengthKm: geometryLengthKm(geom),
      source: 'tdx-trtc',
      routeId: props.route_id,
    },
    geometry: geom,
  };
}

function convertStationFeature(feature) {
  const props = feature.properties || {};
  const geom = feature.geometry;
  if (!geom || geom.type !== 'Point') return null;

  return {
    type: 'Feature',
    properties: {
      name: props.name || props.station_name || props.station_id || '',
      featureType: 'station',
      status: 'operational',
      stationCode: props.station_id,
    },
    geometry: geom,
  };
}

export async function fetchTaipeiMetro(city) {
  console.log(`  [tdx-trtc] Downloading Taipei Metro tracks (TDX-derived)...`);

  const trackIndex = await fetchJson(TDX_TRACKS_API);
  const trackFiles = trackIndex.filter((entry) => entry.name.endsWith('.geojson'));

  const trackCollections = await Promise.all(
    trackFiles.map((entry) => fetchJson(entry.download_url)),
  );

  const lineFeatures = trackCollections
    .flatMap((collection) => collection.features || [])
    .map((feature) => convertTrackFeature(feature, city))
    .filter(Boolean);

  const stationCollections = await Promise.all(
    STATION_FILES.map((file) => fetchJson(`${TDX_RAW_BASE}/${file}`)),
  );

  const seenStations = new Set();
  const stationFeatures = [];

  for (const collection of stationCollections) {
    for (const feature of collection.features || []) {
      const station = convertStationFeature(feature);
      if (!station) continue;

      const key = `${station.geometry.coordinates[0].toFixed(5)},${station.geometry.coordinates[1].toFixed(5)}`;
      if (seenStations.has(key)) continue;
      seenStations.add(key);
      stationFeatures.push(station);
    }
  }

  const totalKm = lineFeatures.reduce((sum, feature) => sum + feature.properties.lengthKm, 0);
  console.log(
    `  [tdx-trtc] ${lineFeatures.length} line segments, ${stationFeatures.length} stations, ~${totalKm.toFixed(0)} km`,
  );

  return buildMetroCollection(city, lineFeatures, stationFeatures);
}
