import osmtogeojson from 'osmtogeojson';
import { radiusKmForCity } from './city-radius.mjs';
import {
  DEFAULT_COLORS,
  bboxFromCenter,
  geometryLengthKm,
  getInfrastructureStatus,
  lineLengthKm,
  normalizeColor,
} from './metro-utils.mjs';

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

export const CITY_RADIUS_KM = {
  santiago: 22,
  bangkok: 28,
  taipei: 22,
  berlin: 22,
  chicago: 28,
  'hong-kong': 18,
  singapore: 22,
  paris: 22,
  london: 35,
  beijing: 38,
};

const LINE_ALIASES = {
  'north-south': ['north south', 'north-south', 'nsl'],
  'east-west': ['east west', 'east-west', 'ewl'],
  'circle': ['circle', 'ccl'],
  'north east': ['north east', 'north-east', 'nel'],
  'downtown': ['downtown', 'dtl'],
  'thomson': ['thomson', 'east coast', 'tel'],
  'jurong': ['jurong', 'jrl'],
  'red': ['red line', 'red'],
  'blue': ['blue line', 'blue'],
  'green': ['green line', 'green'],
  'orange': ['orange line', 'orange'],
  'brown': ['brown line', 'brown'],
  'yellow': ['yellow line', 'yellow'],
  'purple': ['purple line', 'purple'],
  'pink': ['pink line', 'pink'],
};

const GENERIC_TOKENS = new Set([
  'line', 'lines', 'mrt', 'cta', 'metro', 'rail', 'route', 'lrt', 'rer', 'ligne', 'loop',
]);

export function normalizeRouteName(name) {
  return String(name)
    .replace(/\s*\([^)]*→[^)]*\)\s*/gu, '')
    .replace(/\s*\([^)]*->[^)]*\)\s*/g, '')
    .replace(/\s*\([^)]*↻[^)]*\)\s*/gu, '')
    .replace(/\s*\([^)]*↺[^)]*\)\s*/gu, '')
    .replace(/^MRT\s+/i, '')
    .replace(/^CTA\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(text) {
  return text
    .toLowerCase()
    .split(/[\s–—-]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 2 && !GENERIC_TOKENS.has(t));
}

export function matchLineColor(name, linesDetail) {
  if (!name || !linesDetail?.length) return null;
  const lower = normalizeRouteName(name).toLowerCase();
  const nameTokens = significantTokens(lower);

  let best = null;
  let bestScore = 0;

  for (const line of linesDetail) {
    const key = line.name.toLowerCase();
    let score = 0;

    if (lower.includes(key) || key.includes(lower)) score += 10;

    for (const [aliasKey, aliases] of Object.entries(LINE_ALIASES)) {
      if (!key.includes(aliasKey)) continue;
      if (aliases.some((a) => lower.includes(a))) score += 8;
    }

    const keyTokens = significantTokens(key);
    const overlap = keyTokens.filter((t) => nameTokens.includes(t)).length;
    score += overlap * 3;

    if (score > bestScore) {
      bestScore = score;
      best = line.color;
    }
  }

  return bestScore >= 3 ? best : null;
}

function overpassQuery(bbox, { constructionOnly = false } = {}) {
  const { south, west, north, east } = bbox;

  if (constructionOnly) {
    return `
[out:json][timeout:180];
(
  relation["type"="route"]["route"~"subway|light_rail|monorail"](${south},${west},${north},${east})["construction"];
  relation["type"="route"]["route"~"subway|light_rail|monorail"](${south},${west},${north},${east})["state"="proposed"];
  way["railway"="construction"](${south},${west},${north},${east});
  way["construction:railway"~"subway|light_rail"](${south},${west},${north},${east});
);
out geom;
`.trim();
  }

  return `
[out:json][timeout:180];
(
  relation["type"="route"]["route"~"subway|light_rail|monorail|tram"](${south},${west},${north},${east});
  way["railway"~"subway|light_rail|monorail|tram"](${south},${west},${north},${east});
  way["construction:railway"~"subway|light_rail"](${south},${west},${north},${east});
  way["railway"="construction"](${south},${west},${north},${east});
  node["station"~"subway|light_rail|monorail"](${south},${west},${north},${east});
  node["railway"="station"]["station"~"subway|light_rail|monorail"](${south},${west},${north},${east});
  node["railway"="station"]["construction"~"subway|light_rail"](${south},${west},${north},${east});
);
out geom;
`.trim();
}

const OVERPASS_TIMEOUT_MS = 90_000;
const OVERPASS_RETRY_STATUSES = new Set([429, 502, 503, 504]);

let overpassRequestCount = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOverpass(query) {
  let lastError;
  const startEndpoint =
    overpassRequestCount++ % OVERPASS_ENDPOINTS.length;

  for (let offset = 0; offset < OVERPASS_ENDPOINTS.length; offset++) {
    const url = OVERPASS_ENDPOINTS[(startEndpoint + offset) % OVERPASS_ENDPOINTS.length];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json',
          'User-Agent': 'world-metro-visualiser/0.1 (educational map project)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`Overpass ${response.status} @ ${url}: ${text.slice(0, 200)}`);
        if (OVERPASS_RETRY_STATUSES.has(response.status)) {
          await sleep(1500 * (offset + 1));
        }
        continue;
      }

      return response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('All Overpass endpoints failed');
}

function osmIdString(props) {
  if (props.id != null) return String(props.id);
  if (props['@id']) return String(props['@id']);
  return '';
}

function rawFeatureName(props) {
  return (
    props.name ||
    props.ref ||
    props['name:en'] ||
    props.route ||
    props.network ||
    'Metro line'
  );
}

function toLineFeature(props, geometry, city) {
  const displayName = rawFeatureName(props);
  const groupName = normalizeRouteName(displayName);
  const osmColor = normalizeColor(props.colour || props.color);
  const matchedColor = matchLineColor(groupName, city.linesDetail);
  const status = getInfrastructureStatus(props);

  if (geometry.type === 'LineString') {
    return [{
      type: 'Feature',
      properties: {
        name: displayName,
        groupName,
        color: matchedColor || osmColor || '#888888',
        status,
        lengthKm: lineLengthKm(geometry.coordinates),
        osmId: osmIdString(props),
        source: 'openstreetmap',
      },
      geometry,
    }];
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.map((coordinates, index) => ({
      type: 'Feature',
      properties: {
        name: geometry.coordinates.length > 1 ? `${displayName} (segment ${index + 1})` : displayName,
        groupName,
        color: matchedColor || osmColor || '#888888',
        status,
        lengthKm: lineLengthKm(coordinates),
        osmId: `${osmIdString(props)}#${index}`,
        source: 'openstreetmap',
      },
      geometry: { type: 'LineString', coordinates },
    }));
  }

  return [];
}

function toStationFeatures(geojson) {
  const stations = [];
  const seen = new Set();

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom || geom.type !== 'Point') continue;

    const props = feature.properties || {};
    const status = getInfrastructureStatus(props);
    const key = `${geom.coordinates[0].toFixed(5)},${geom.coordinates[1].toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    stations.push({
      type: 'Feature',
      properties: {
        name: props.name || '',
        featureType: 'station',
        status,
      },
      geometry: geom,
    });
  }

  return stations;
}

function toLineFeatures(geojson, city, { statusFilter = null, forceStatus = null } = {}) {
  const raw = [];

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom || (geom.type !== 'LineString' && geom.type !== 'MultiLineString')) continue;

    const props = feature.properties || {};
    const lines = toLineFeature(props, geom, city);
    raw.push(...lines);
  }

  const relations = raw.filter((f) => f.properties.osmId.includes('relation'));
  let pool = relations.length > 0 ? relations : raw;

  if (statusFilter) {
    pool = pool.filter((f) => f.properties.status === statusFilter);
  }

  const seen = new Set();
  const deduped = [];

  for (const feature of pool) {
    const id = feature.properties.osmId || JSON.stringify(feature.geometry.coordinates[0]);
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(feature);
  }

  let colorIndex = 0;
  const colorByGroup = new Map();

  return deduped.map((feature) => {
    let color = feature.properties.color;
    if (color === '#888888') {
      const group = feature.properties.groupName;
      if (!colorByGroup.has(group)) {
        colorByGroup.set(group, DEFAULT_COLORS[colorIndex++ % DEFAULT_COLORS.length]);
      }
      color = colorByGroup.get(group);
    } else if (!colorByGroup.has(feature.properties.groupName)) {
      colorByGroup.set(feature.properties.groupName, color);
    } else {
      color = colorByGroup.get(feature.properties.groupName);
    }

    const status = forceStatus ?? feature.properties.status;

    return {
      ...feature,
      properties: { ...feature.properties, color, status },
    };
  });
}

function cityRadiusKm(city) {
  return CITY_RADIUS_KM[city.id] ?? radiusKmForCity(city);
}

export async function fetchOsmMetro(city, options = {}) {
  const radiusKm = cityRadiusKm(city);
  const bbox = bboxFromCenter(city.coords, radiusKm);
  const query = overpassQuery(bbox, options);

  const osmData = await fetchOverpass(query);
  const geojson = osmtogeojson(osmData);
  const statusFilter = options.constructionOnly ? 'construction' : null;
  const forceStatus = options.constructionOnly ? 'construction' : null;
  const lines = toLineFeatures(geojson, city, { statusFilter, forceStatus });
  const stations = options.constructionOnly ? [] : toStationFeatures(geojson);

  return { lines, stations, geojson };
}

export async function fetchOsmMetroFull(city) {
  const radiusKm = cityRadiusKm(city);
  const bbox = bboxFromCenter(city.coords, radiusKm);

  console.log(`  [OSM] Fetching ${city.name} (radius ${radiusKm} km)...`);

  let { lines, stations } = await fetchOsmMetro(city);

  if (lines.length === 0) {
    console.warn(`  [OSM] No relations — retrying wider area...`);
    const wider = bboxFromCenter(city.coords, radiusKm * 1.5);
    const osmData = await fetchOverpass(overpassQuery(wider));
    lines = toLineFeatures(osmtogeojson(osmData), city);
    stations = toStationFeatures(osmtogeojson(osmData));
  }

  const totalKm = lines.reduce((s, f) => s + f.properties.lengthKm, 0);
  const operational = lines.filter((l) => l.properties.status === 'operational').length;
  const construction = lines.filter((l) => l.properties.status === 'construction').length;

  console.log(
    `  [OSM] ${lines.length} segments (${operational} open, ${construction} upcoming), ` +
      `${stations.length} stations, ~${totalKm.toFixed(0)} km`,
  );

  return { type: 'FeatureCollection', features: [...lines, ...stations] };
}
