/**
 * Singapore metro data from cheeaun/sgraildata (CityMapper routes + LRT loops)
 * supplemented with OpenStreetMap for upcoming lines (e.g. Jurong Region Line).
 *
 * Source: https://github.com/cheeaun/sgraildata (MIT-style community data)
 */
import { fetchOsmMetro, matchLineColor } from '../lib/osm-fetch.mjs';
import { geometryLengthKm, normalizeColor } from '../lib/metro-utils.mjs';

const SG_RAIL_URL =
  'https://raw.githubusercontent.com/cheeaun/sgraildata/master/data/v1/sg-rail.geojson';

const SG_LINE_COLORS = {
  orangered: '#E4002B',
  mediumseagreen: '#009645',
  orange: '#F7931E',
  darkmagenta: '#9900AA',
  darkslateblue: '#005EB8',
  saddlebrown: '#9D5B25',
  gray: '#848484',
  grey: '#848484',
};

function colorFromSgRail(props, city) {
  const matched = matchLineColor(props.name, city.linesDetail);
  if (matched) return matched;
  const named = SG_LINE_COLORS[String(props.line_color || '').toLowerCase()];
  if (named) return named;
  return normalizeColor(props.line_color) || '#888888';
}

function convertSgRailFeature(feature, city) {
  const geom = feature.geometry;
  if (geom.type !== 'LineString' && geom.type !== 'MultiLineString') return [];

  const props = feature.properties || {};
  const color = colorFromSgRail(props, city);
  const status = props.status === 'planned' || props.status === 'construction' ? 'construction' : 'operational';

  if (geom.type === 'LineString') {
    return [{
      type: 'Feature',
      properties: {
        name: props.name,
        groupName: props.name,
        color,
        status,
        lengthKm: geometryLengthKm(geom),
        source: 'sgraildata',
      },
      geometry: geom,
    }];
  }

  return geom.coordinates.map((coordinates, index) => ({
    type: 'Feature',
    properties: {
      name: geom.coordinates.length > 1 ? `${props.name} (branch ${index + 1})` : props.name,
      groupName: props.name,
      color,
      status,
      lengthKm: geometryLengthKm({ type: 'LineString', coordinates }),
      source: 'sgraildata',
    },
    geometry: { type: 'LineString', coordinates },
  }));
}

function convertSgRailStations(features) {
  return features
    .filter((f) => f.properties?.stop_type === 'station' && f.geometry?.type === 'Point')
    .map((f) => ({
      type: 'Feature',
      properties: {
        name: f.properties.name,
        featureType: 'station',
        status: 'operational',
        stationCode: f.properties.station_codes,
      },
      geometry: f.geometry,
    }));
}

export async function fetchSingaporeMetro(city) {
  console.log(`  [sgraildata] Downloading Singapore rail network...`);

  const response = await fetch(SG_RAIL_URL, {
    headers: { 'User-Agent': 'world-metro-visualiser/0.1' },
  });

  if (!response.ok) {
    throw new Error(`Failed to download sgraildata: ${response.status}`);
  }

  const sgRail = await response.json();

  const lineFeatures = sgRail.features.flatMap((f) => convertSgRailFeature(f, city));
  const stationFeatures = convertSgRailStations(sgRail.features);

  console.log(
    `  [sgraildata] ${lineFeatures.length} line segments, ${stationFeatures.length} stations`,
  );

  let upcomingOnly = [];

  try {
    console.log(`  [OSM] Fetching upcoming/planned lines...`);
    const { lines: constructionLines } = await fetchOsmMetro(city, {
      constructionOnly: true,
    });

    const operationalNames = new Set(
      lineFeatures.map((f) => f.properties.groupName.toLowerCase()),
    );

    upcomingOnly = constructionLines.filter((line) => {
      const group = (line.properties.groupName || line.properties.name).toLowerCase();
      return !operationalNames.has(group);
    });

    console.log(`  [OSM] Adding ${upcomingOnly.length} upcoming segments`);
  } catch (error) {
    console.warn(`  [OSM] Skipped upcoming lines (Overpass unavailable): ${error.message}`);
  }

  const allLines = [...lineFeatures, ...upcomingOnly];
  const totalKm = allLines.reduce((s, f) => s + f.properties.lengthKm, 0);

  console.log(
    `  Total: ${allLines.length} segments, ${stationFeatures.length} stations, ~${totalKm.toFixed(0)} km`,
  );

  return { type: 'FeatureCollection', features: [...allLines, ...stationFeatures] };
}
