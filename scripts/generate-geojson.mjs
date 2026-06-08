/**
 * Generates simplified metro GeoJSON for starter cities.
 * Lines are schematic approximations for visualization — not survey-grade geometry.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'data', 'geojson');
mkdirSync(outDir, { recursive: true });

function offsetCoord([lng, lat], dLng, dLat) {
  return [lng + dLng, lat + dLat];
}

function arcPath(center, startAngle, endAngle, radiusLng, radiusLat, steps = 12) {
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + (endAngle - startAngle) * t;
    const rad = (angle * Math.PI) / 180;
    coords.push(offsetCoord(center, Math.cos(rad) * radiusLng, Math.sin(rad) * radiusLat));
  }
  return coords;
}

function lineFeature(name, color, lengthKm, coordinates) {
  return {
    type: 'Feature',
    properties: { name, color, lengthKm },
    geometry: { type: 'LineString', coordinates },
  };
}

const networks = {
  santiago: {
    center: [-70.6693, -33.4489],
    scale: [0.12, 0.09],
    lines: [
      { name: 'Línea 1', color: '#E4002B', lengthKm: 20, angles: [0, 180] },
      { name: 'Línea 2', color: '#FFD100', lengthKm: 18, angles: [45, 225] },
      { name: 'Línea 3', color: '#6A2150', lengthKm: 22, angles: [90, 270] },
      { name: 'Línea 4', color: '#009BD4', lengthKm: 24, angles: [135, 315] },
      { name: 'Línea 5', color: '#009A44', lengthKm: 30, angles: [20, 200] },
      { name: 'Línea 6', color: '#80298F', lengthKm: 26, angles: [70, 250] },
    ],
  },
  bangkok: {
    center: [100.5018, 13.7563],
    scale: [0.15, 0.12],
    lines: [
      { name: 'BTS Sukhumvit', color: '#77B255', lengthKm: 24, angles: [10, 190] },
      { name: 'BTS Silom', color: '#007A33', lengthKm: 14, angles: [80, 260] },
      { name: 'MRT Blue', color: '#0066B3', lengthKm: 48, angles: [0, 90, 180] },
      { name: 'MRT Purple', color: '#6A2150', lengthKm: 23, angles: [135, 315] },
      { name: 'MRT Yellow', color: '#FFD100', lengthKm: 23, angles: [45, 225] },
      { name: 'Airport Rail', color: '#E4002B', lengthKm: 28, angles: [160, 340] },
    ],
  },
  taipei: {
    center: [121.5654, 25.033],
    scale: [0.1, 0.08],
    lines: [
      { name: 'Red Line', color: '#E3002C', lengthKm: 28, angles: [0, 180] },
      { name: 'Blue Line', color: '#0070BD', lengthKm: 26, angles: [90, 270] },
      { name: 'Green Line', color: '#008659', lengthKm: 22, angles: [45, 225] },
      { name: 'Orange Line', color: '#F8B62D', lengthKm: 26, angles: [135, 315] },
      { name: 'Brown Line', color: '#C48C31', lengthKm: 25, angles: [20, 200] },
      { name: 'Yellow Line', color: '#FFDB00', lengthKm: 25, angles: [70, 250] },
    ],
  },
  berlin: {
    center: [13.405, 52.52],
    scale: [0.12, 0.07],
    lines: [
      { name: 'U1', color: '#55A822', lengthKm: 9, angles: [30, 210] },
      { name: 'U2', color: '#E4002B', lengthKm: 21, angles: [0, 180] },
      { name: 'U5', color: '#7E5335', lengthKm: 32, angles: [90, 270] },
      { name: 'U6', color: '#8C6DAB', lengthKm: 20, angles: [45, 225] },
      { name: 'U7', color: '#009BD4', lengthKm: 32, angles: [135, 315] },
      { name: 'U8', color: '#0066B3', lengthKm: 18, angles: [160, 340] },
      { name: 'U9', color: '#F37920', lengthKm: 12, angles: [70, 250] },
    ],
  },
  chicago: {
    center: [-87.6298, 41.8781],
    scale: [0.14, 0.1],
    lines: [
      { name: 'CTA Red Line', color: '#C60C30', lengthKm: 35, angles: [0, 180] },
      { name: 'CTA Blue Line', color: '#00A1DE', lengthKm: 43, angles: [90, 270] },
      { name: 'CTA Brown Line', color: '#62361B', lengthKm: 18, angles: [45, 225] },
      { name: 'CTA Green Line', color: '#009B3A', lengthKm: 33, angles: [135, 315] },
      { name: 'CTA Orange Line', color: '#F9461C', lengthKm: 21, angles: [20, 200] },
      { name: 'CTA Pink Line', color: '#E27EA6', lengthKm: 18, angles: [70, 250] },
      { name: 'CTA Purple Line', color: '#522398', lengthKm: 25, angles: [110, 290] },
      { name: 'CTA Yellow Line', color: '#F9E300', lengthKm: 8, angles: [160, 340] },
    ],
  },
  'hong-kong': {
    center: [114.1694, 22.3193],
    scale: [0.08, 0.06],
    lines: [
      { name: 'MTR Island Line', color: '#007DC5', lengthKm: 16, angles: [0, 180] },
      { name: 'MTR Kwun Tong Line', color: '#00A040', lengthKm: 18, angles: [45, 225] },
      { name: 'MTR Tsuen Wan Line', color: '#E4002B', lengthKm: 16, angles: [90, 270] },
      { name: 'MTR Tseung Kwan O', color: '#7E5335', lengthKm: 15, angles: [135, 315] },
      { name: 'MTR Tung Chung', color: '#F7941D', lengthKm: 31, angles: [20, 200] },
      { name: 'MTR East Rail', color: '#5EB6E4', lengthKm: 46, angles: [70, 250] },
      { name: 'MTR South Island', color: '#B5BD00', lengthKm: 7, angles: [110, 290] },
      { name: 'MTR Tuen Ma', color: '#9A3826', lengthKm: 57, angles: [0, 90, 180, 270] },
    ],
  },
  singapore: {
    center: [103.8198, 1.3521],
    scale: [0.1, 0.08],
    lines: [
      { name: 'North-South', color: '#E4002B', lengthKm: 45, angles: [0, 180] },
      { name: 'East-West', color: '#009645', lengthKm: 57, angles: [90, 270] },
      { name: 'Circle Line', color: '#F7931E', lengthKm: 35, angles: [0, 90, 180, 270] },
      { name: 'North East', color: '#9900AA', lengthKm: 20, angles: [45, 225] },
      { name: 'Downtown', color: '#005EB8', lengthKm: 42, angles: [135, 315] },
      { name: 'Thomson-East Coast', color: '#9D5B25', lengthKm: 31, angles: [20, 200] },
    ],
  },
  paris: {
    center: [2.3522, 48.8566],
    scale: [0.08, 0.05],
    lines: [
      { name: 'Ligne 1', color: '#FFCD00', lengthKm: 17, angles: [0, 180] },
      { name: 'Ligne 4', color: '#BE418E', lengthKm: 14, angles: [90, 270] },
      { name: 'Ligne 6', color: '#6EC4E8', lengthKm: 13, angles: [45, 225] },
      { name: 'Ligne 9', color: '#B6BD00', lengthKm: 20, angles: [135, 315] },
      { name: 'Ligne 12', color: '#00814F', lengthKm: 15, angles: [20, 200] },
      { name: 'Ligne 13', color: '#8D5E2A', lengthKm: 25, angles: [70, 250] },
      { name: 'Ligne 14', color: '#62259D', lengthKm: 14, angles: [110, 290] },
      { name: 'RER A', color: '#E4002B', lengthKm: 109, angles: [0, 90] },
    ],
  },
  london: {
    center: [-0.1276, 51.5074],
    scale: [0.12, 0.07],
    lines: [
      { name: 'Central', color: '#E4002B', lengthKm: 74, angles: [0, 180] },
      { name: 'Northern', color: '#000000', lengthKm: 58, angles: [45, 225] },
      { name: 'Piccadilly', color: '#003688', lengthKm: 71, angles: [90, 270] },
      { name: 'District', color: '#007A33', lengthKm: 64, angles: [135, 315] },
      { name: 'Circle', color: '#FFD300', lengthKm: 27, angles: [0, 90, 180, 270] },
      { name: 'Victoria', color: '#0098D4', lengthKm: 21, angles: [20, 200] },
      { name: 'Jubilee', color: '#A0A5A9', lengthKm: 36, angles: [70, 250] },
      { name: 'Metropolitan', color: '#9B0058', lengthKm: 51, angles: [110, 290] },
    ],
  },
  beijing: {
    center: [116.4074, 39.9042],
    scale: [0.2, 0.14],
    lines: [
      { name: 'Line 1', color: '#E4002B', lengthKm: 31, angles: [0, 180] },
      { name: 'Line 2', color: '#0066B3', lengthKm: 23, angles: [0, 90, 180, 270] },
      { name: 'Line 4', color: '#008E9C', lengthKm: 28, angles: [45, 225] },
      { name: 'Line 5', color: '#A192B2', lengthKm: 27, angles: [90, 270] },
      { name: 'Line 6', color: '#B58500', lengthKm: 53, angles: [0, 180] },
      { name: 'Line 10', color: '#009BD4', lengthKm: 57, angles: [0, 90, 180, 270] },
      { name: 'Line 13', color: '#F9E300', lengthKm: 41, angles: [135, 315] },
      { name: 'Line 14', color: '#D5A7A1', lengthKm: 54, angles: [20, 200] },
    ],
  },
};

function buildNetwork(id, config) {
  const { center, scale, lines } = config;
  const [sLng, sLat] = scale;
  const features = [];

  for (const line of lines) {
    if (line.angles.length === 2) {
      const [a1, a2] = line.angles;
      const path = [
        ...arcPath(center, a1, a1 + 90, sLng, sLat, 6),
        ...arcPath(center, a1 + 90, a2, sLng * 1.2, sLat * 1.2, 8),
      ];
      features.push(lineFeature(line.name, line.color, line.lengthKm, path));
    } else {
      // loop line
      const path = arcPath(center, 0, 360, sLng * 1.1, sLat * 1.1, 24);
      features.push(lineFeature(line.name, line.color, line.lengthKm, path));
    }
  }

  const geojson = { type: 'FeatureCollection', features };
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify(geojson, null, 2));
  console.log(`Wrote ${id}.json (${features.length} lines)`);
}

for (const [id, config] of Object.entries(networks)) {
  buildNetwork(id, config);
}

console.log('Done.');
