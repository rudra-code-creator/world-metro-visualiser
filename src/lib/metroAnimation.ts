import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import { distanceKm } from './geo';
import { METRO_LINES_SOURCE, METRO_STATIONS_SOURCE } from './mapLayers';

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const REVEAL_DURATION_MS = 5000;
const REVEAL_DURATION_LARGE_MS = 10000;
const LARGE_NETWORK_KM = 100;

export function getMetroRevealDurationMs(totalKm: number): number {
  return totalKm >= LARGE_NETWORK_KM ? REVEAL_DURATION_LARGE_MS : REVEAL_DURATION_MS;
}

export type MetroRevealHandle = {
  cancel: () => void;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function collectLineCoords(geometry: GeoJSON.Geometry): GeoJSON.Position[][] {
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

/** Geographic center of the line network. */
export function computeNetworkCenter(
  lines: GeoJSON.FeatureCollection,
  fallback: [number, number],
): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;

  for (const feature of lines.features) {
    if (!feature.geometry) continue;
    for (const coords of collectLineCoords(feature.geometry)) {
      for (const c of coords) {
        sumLng += c[0];
        sumLat += c[1];
        count += 1;
      }
    }
  }

  if (count === 0) return fallback;
  return [sumLng / count, sumLat / count];
}

function featureMinDistanceKm(
  feature: GeoJSON.Feature,
  center: [number, number],
): number {
  if (!feature.geometry) return Infinity;

  let min = Infinity;
  for (const coords of collectLineCoords(feature.geometry)) {
    for (const c of coords) {
      min = Math.min(min, distanceKm(center, c as [number, number]));
    }
  }
  return min;
}

export function setMetroDataInstant(
  map: MapboxMap,
  lines: GeoJSON.FeatureCollection,
  stations: GeoJSON.FeatureCollection,
) {
  const linesSource = map.getSource(METRO_LINES_SOURCE) as GeoJSONSource | undefined;
  const stationsSource = map.getSource(METRO_STATIONS_SOURCE) as GeoJSONSource | undefined;
  linesSource?.setData(lines);
  stationsSource?.setData(stations);
  map.triggerRepaint();
}

/**
 * Reveal metro by expanding a distance threshold from the network center.
 * Features appear as the wave reaches them (lightweight — no per-frame geometry clipping).
 */
export function animateMetroRadialSpread(
  map: MapboxMap,
  lines: GeoJSON.FeatureCollection,
  stations: GeoJSON.FeatureCollection,
  cityCoords: [number, number],
  options?: { durationMs?: number; onComplete?: () => void },
): MetroRevealHandle {
  const durationMs = options?.durationMs ?? REVEAL_DURATION_MS;
  const linesSource = map.getSource(METRO_LINES_SOURCE) as GeoJSONSource | undefined;
  const stationsSource = map.getSource(METRO_STATIONS_SOURCE) as GeoJSONSource | undefined;

  if (!linesSource || !stationsSource) {
    options?.onComplete?.();
    return { cancel: () => {} };
  }

  if (lines.features.length === 0) {
    setMetroDataInstant(map, lines, stations);
    options?.onComplete?.();
    return { cancel: () => {} };
  }

  const center = computeNetworkCenter(lines, cityCoords);

  const rankedLines = lines.features
    .map((feature) => ({ feature, dist: featureMinDistanceKm(feature, center) }))
    .sort((a, b) => a.dist - b.dist);

  const maxDist = rankedLines[rankedLines.length - 1]?.dist ?? 0;
  if (maxDist <= 0) {
    setMetroDataInstant(map, lines, stations);
    options?.onComplete?.();
    return { cancel: () => {} };
  }

  const rankedStations = stations.features
    .map((feature) => ({
      feature,
      dist:
        feature.geometry?.type === 'Point'
          ? distanceKm(center, feature.geometry.coordinates as [number, number])
          : Infinity,
    }))
    .sort((a, b) => a.dist - b.dist);

  let cancelled = false;
  let rafId = 0;
  let startTime = 0;

  linesSource.setData(EMPTY_COLLECTION);
  stationsSource.setData(EMPTY_COLLECTION);
  map.triggerRepaint();

  const applyProgress = (t: number) => {
    const thresholdKm = easeOutCubic(t) * maxDist * 1.05;

    const visibleLines = rankedLines
      .filter((item) => item.dist <= thresholdKm)
      .map((item) => item.feature);

    const visibleStations = rankedStations
      .filter((item) => item.dist <= thresholdKm)
      .map((item) => item.feature);

    linesSource.setData({ type: 'FeatureCollection', features: visibleLines });
    stationsSource.setData({ type: 'FeatureCollection', features: visibleStations });
    map.triggerRepaint();
  };

  const tick = (now: number) => {
    if (cancelled) return;

    if (startTime === 0) startTime = now;
    const t = Math.min(1, (now - startTime) / durationMs);
    applyProgress(t);

    if (t >= 1) {
      setMetroDataInstant(map, lines, stations);
      options?.onComplete?.();
      return;
    }

    rafId = window.requestAnimationFrame(tick);
  };

  applyProgress(0);
  rafId = window.requestAnimationFrame(tick);

  return {
    cancel: () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    },
  };
}
