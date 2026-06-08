export const DEFAULT_COLORS = [
  '#E4002B', '#009645', '#005EB8', '#9900AA', '#F7931E', '#9D5B25',
  '#00A1DE', '#009B3A', '#C60C30', '#522398', '#FFCD00', '#6EC4E8',
];

export function normalizeColor(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(value)) return value.length === 4 ? expandShortHex(value) : value;
  if (/^[0-9A-Fa-f]{6}$/.test(value)) return `#${value}`;
  return null;
}

function expandShortHex(hex) {
  const r = hex[1];
  const g = hex[2];
  const b = hex[3];
  return `#${r}${r}${g}${g}${b}${b}`;
}

export function lineLengthKm(coordinates) {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += haversine(coordinates[i - 1], coordinates[i]);
  }
  return Math.round(total * 10) / 10;
}

export function geometryLengthKm(geometry) {
  if (geometry.type === 'LineString') return lineLengthKm(geometry.coordinates);
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.reduce((sum, line) => sum + lineLengthKm(line), 0);
  }
  return 0;
}

function haversine([lng1, lat1], [lng2, lat2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bboxFromCenter([lng, lat], radiusKm) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return { south: lat - dLat, west: lng - dLng, north: lat + dLat, east: lng + dLng };
}

export function getInfrastructureStatus(props) {
  const construction =
    props.construction === 'subway' ||
    props.construction === 'light_rail' ||
    props.construction === 'railway' ||
    props.construction === 'yes' ||
    props['construction:railway'] ||
    props.railway === 'construction';

  const proposed =
    props.proposed === 'yes' ||
    props.railway === 'proposed' ||
    props.state === 'proposed' ||
    props.planned === 'yes' ||
    props.abandoned === 'no' && props.start_date && new Date(props.start_date) > new Date();

  if (construction || proposed) return 'construction';
  return 'operational';
}
