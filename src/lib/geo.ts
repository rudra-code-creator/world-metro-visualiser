import type { MetroCity } from '../types';

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km between [lng, lat] points. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Max distance from map center to city for auto-select; shrinks as zoom increases. */
export function proximityThresholdKm(zoom: number): number {
  if (zoom < 7) return Infinity;
  if (zoom < 8) return 120;
  if (zoom < 9) return 70;
  if (zoom < 10) return 40;
  if (zoom < 11) return 22;
  if (zoom < 12) return 12;
  return 6;
}

export const PROXIMITY_MIN_ZOOM = 8;

/** Skip flyTo when the map is already centered near the city at this zoom. */
export function proximityFlySkipKm(zoom: number): number {
  if (zoom >= 11) return 15;
  if (zoom >= 10) return 25;
  return 40;
}

/** True when the map is already zoomed in and centered on the city (no flyTo needed). */
export function isMapNearCity(
  mapCenter: [number, number],
  zoom: number,
  cityCoords: [number, number],
): boolean {
  return (
    zoom >= 9 &&
    distanceKm(mapCenter, cityCoords) < proximityFlySkipKm(zoom)
  );
}

export function findNearestCity(
  center: [number, number],
  zoom: number,
  cityList: MetroCity[],
): { city: MetroCity; index: number; distanceKm: number } | null {
  if (zoom < PROXIMITY_MIN_ZOOM) return null;

  const maxKm = proximityThresholdKm(zoom);
  let best: { city: MetroCity; index: number; distanceKm: number } | null = null;

  for (let index = 0; index < cityList.length; index++) {
    const city = cityList[index];
    const d = distanceKm(center, city.coords);
    if (d <= maxKm && (!best || d < best.distanceKm)) {
      best = { city, index, distanceKm: d };
    }
  }

  return best;
}
