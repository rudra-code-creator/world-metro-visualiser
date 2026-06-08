import AdmZip from 'adm-zip';
import { createReadStream } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { matchLineColor } from './osm-fetch.mjs';
import { lineLengthKm, normalizeColor } from './metro-utils.mjs';

const USER_AGENT = 'world-metro-visualiser/0.1 (educational map project)';

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

export function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

export async function downloadGtfsZip(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Failed to download GTFS (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return new AdmZip(buffer);
}

function findZipEntry(zip, filename) {
  return (
    zip.getEntry(filename) ??
    zip.getEntries().find((entry) => entry.entryName.endsWith(`/${filename}`) || entry.entryName === filename)
  );
}

function readGtfsEntry(zip, filename) {
  const entry = findZipEntry(zip, filename);
  if (!entry) return null;
  return zip.readAsText(entry, 'utf8');
}

function extractGtfsEntry(zip, filename, tempDir) {
  const entry = findZipEntry(zip, filename);
  if (!entry) return null;
  zip.extractEntryTo(entry, tempDir, false, true);
  const baseName = entry.entryName.split('/').pop();
  return join(tempDir, baseName);
}

async function streamCsvRows(filePath, onRow) {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;

  for await (const line of reader) {
    if (!line.trim()) continue;
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    onRow(row);
  }
}

export function buildShapesMap(shapeRows) {
  const pointsByShape = new Map();

  for (const row of shapeRows) {
    if (!row.shape_id) continue;
    if (!pointsByShape.has(row.shape_id)) pointsByShape.set(row.shape_id, []);
    pointsByShape.get(row.shape_id).push({
      seq: Number(row.shape_pt_sequence),
      lon: Number(row.shape_pt_lon),
      lat: Number(row.shape_pt_lat),
    });
  }

  const shapes = new Map();
  for (const [shapeId, points] of pointsByShape) {
    points.sort((a, b) => a.seq - b.seq);
    const coordinates = points
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat))
      .map((p) => [p.lon, p.lat]);
    if (coordinates.length >= 2) shapes.set(shapeId, coordinates);
  }

  return shapes;
}

async function loadNeededShapes(zip, tempDir, neededShapeIds) {
  const shapesPath = extractGtfsEntry(zip, 'shapes.txt', tempDir);
  if (!shapesPath) return new Map();

  const pointsByShape = new Map();
  await streamCsvRows(shapesPath, (row) => {
    if (!neededShapeIds.has(row.shape_id)) return;
    if (!pointsByShape.has(row.shape_id)) pointsByShape.set(row.shape_id, []);
    pointsByShape.get(row.shape_id).push({
      seq: Number(row.shape_pt_sequence),
      lon: Number(row.shape_pt_lon),
      lat: Number(row.shape_pt_lat),
    });
  });

  const shapes = new Map();
  for (const [shapeId, points] of pointsByShape) {
    points.sort((a, b) => a.seq - b.seq);
    const coordinates = points
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat))
      .map((p) => [p.lon, p.lat]);
    if (coordinates.length >= 2) shapes.set(shapeId, coordinates);
  }

  return shapes;
}

async function loadStopIdsForTrips(zip, tempDir, tripIds) {
  const stopTimesPath = extractGtfsEntry(zip, 'stop_times.txt', tempDir);
  if (!stopTimesPath) return new Set();

  const stopIds = new Set();
  await streamCsvRows(stopTimesPath, (row) => {
    if (tripIds.has(row.trip_id)) stopIds.add(row.stop_id);
  });
  return stopIds;
}

function routeDisplayName(route) {
  return route.route_long_name || route.route_short_name || 'Metro line';
}

export async function gtfsToMetroFeatures(city, zip, tables, { source, routeFilter, routeTypes } = {}) {
  const agencies = new Map(tables.agency.map((row) => [row.agency_id, row]));

  const filteredRoutes = tables.routes.filter((route) => {
    if (routeTypes?.length && !routeTypes.includes(Number(route.route_type))) return false;
    if (routeFilter) return routeFilter(route, agencies.get(route.agency_id), agencies);
    return true;
  });

  const routeIds = new Set(filteredRoutes.map((route) => route.route_id));
  const filteredTrips = tables.trips.filter((trip) => routeIds.has(trip.route_id));
  const tripIds = new Set(filteredTrips.map((trip) => trip.trip_id));

  const neededShapeIds = new Set(
    filteredTrips.map((trip) => trip.shape_id).filter(Boolean),
  );

  const tempDir = mkdtempSync(join(tmpdir(), 'gtfs-'));
  let shapes;
  let stopIds;

  try {
    shapes = await loadNeededShapes(zip, tempDir, neededShapeIds);
    stopIds = await loadStopIdsForTrips(zip, tempDir, tripIds);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  const shapesByRoute = new Map();
  for (const trip of filteredTrips) {
    if (!trip.shape_id || !shapes.has(trip.shape_id)) continue;
    if (!shapesByRoute.has(trip.route_id)) shapesByRoute.set(trip.route_id, new Set());
    shapesByRoute.get(trip.route_id).add(trip.shape_id);
  }

  const lineFeatures = [];

  for (const route of filteredRoutes) {
    const shapeIds = shapesByRoute.get(route.route_id);
    if (!shapeIds?.size) continue;

    const groupName = routeDisplayName(route);
    const color =
      normalizeColor(route.route_color) ||
      matchLineColor(groupName, city.linesDetail) ||
      '#888888';

    const shapeList = [...shapeIds];
    shapeList.forEach((shapeId, index) => {
      const coordinates = shapes.get(shapeId);
      lineFeatures.push({
        type: 'Feature',
        properties: {
          name: shapeList.length > 1 ? `${groupName} (branch ${index + 1})` : groupName,
          groupName,
          color,
          status: 'operational',
          lengthKm: lineLengthKm(coordinates),
          source,
          routeId: route.route_id,
        },
        geometry: { type: 'LineString', coordinates },
      });
    });
  }

  const seenStations = new Set();
  const stationFeatures = [];

  for (const stop of tables.stops) {
    if (!stopIds.has(stop.stop_id)) continue;
    if (stop.location_type && stop.location_type !== '0') continue;

    const lon = Number(stop.stop_lon);
    const lat = Number(stop.stop_lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;

    const key = `${lon.toFixed(5)},${lat.toFixed(5)}`;
    if (seenStations.has(key)) continue;
    seenStations.add(key);

    stationFeatures.push({
      type: 'Feature',
      properties: {
        name: stop.stop_name || '',
        featureType: 'station',
        status: 'operational',
      },
      geometry: { type: 'Point', coordinates: [lon, lat] },
    });
  }

  return { lines: lineFeatures, stations: stationFeatures };
}

export async function fetchGtfsMetro(city, config) {
  const { url, source, routeFilter, routeTypes, requiredFiles = ['routes.txt', 'trips.txt', 'shapes.txt'] } =
    config;

  console.log(`  [${source}] Downloading GTFS from ${url}...`);
  const zip = await downloadGtfsZip(url);

  const tables = {
    agency: parseCsv(readGtfsEntry(zip, 'agency.txt') || ''),
    routes: parseCsv(readGtfsEntry(zip, 'routes.txt') || ''),
    trips: parseCsv(readGtfsEntry(zip, 'trips.txt') || ''),
    stops: parseCsv(readGtfsEntry(zip, 'stops.txt') || ''),
  };

  for (const name of requiredFiles) {
    const key = name.replace('.txt', '');
    if (key === 'shapes' || key === 'stop_times') continue;
    if (!tables[key]?.length && !readGtfsEntry(zip, name)) {
      throw new Error(`GTFS feed is missing required file: ${name}`);
    }
  }

  if (!findZipEntry(zip, 'shapes.txt')) {
    throw new Error('GTFS feed is missing required file: shapes.txt');
  }

  const { lines, stations } = await gtfsToMetroFeatures(city, zip, tables, {
    source,
    routeFilter,
    routeTypes,
  });
  const totalKm = lines.reduce((sum, feature) => sum + feature.properties.lengthKm, 0);

  console.log(
    `  [${source}] ${lines.length} line segments, ${stations.length} stations, ~${totalKm.toFixed(0)} km`,
  );

  return { lines, stations };
}

export function toFeatureCollection(lines, stations) {
  return { type: 'FeatureCollection', features: [...lines, ...stations] };
}
