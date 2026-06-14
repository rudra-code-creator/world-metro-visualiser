import type { InfrastructureStatus, MetroLineDetail } from '../types';

function isLineGeometry(geometry: GeoJSON.Geometry | undefined): boolean {
  return geometry?.type === 'LineString' || geometry?.type === 'MultiLineString';
}

/** Strip direction suffixes and endpoint labels so paired routes merge. */
export function normalizeRouteName(name: string): string {
  return name
    .replace(/\s*\([^)]*→[^)]*\)\s*/gu, '')
    .replace(/\s*\([^)]*->[^)]*\)\s*/g, '')
    .replace(/\s*\([^)]*↻[^)]*\)\s*/gu, '')
    .replace(/\s*\([^)]*↺[^)]*\)\s*/gu, '')
    .replace(/:\s*.+$/u, '')
    .replace(/^MRT\s+/i, '')
    .replace(/^CTA\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lineLengthKm(feature: GeoJSON.Feature): number {
  const fromProps = feature.properties?.lengthKm;
  if (typeof fromProps === 'number' && Number.isFinite(fromProps)) return fromProps;
  return 0;
}

function featureGroupKey(feature: GeoJSON.Feature): string {
  const props = feature.properties ?? {};
  const raw =
    (typeof props.groupName === 'string' && props.groupName) ||
    (typeof props.name === 'string' && props.name) ||
    'Metro line';
  return normalizeRouteName(raw) || raw;
}

function featureStatus(feature: GeoJSON.Feature): InfrastructureStatus {
  return feature.properties?.status === 'construction' ? 'construction' : 'operational';
}

/**
 * Build an accurate line list from loaded GeoJSON (grouped routes, real names & lengths).
 */
export function deriveMetroLinesFromGeoJson(
  collection: GeoJSON.FeatureCollection,
  fallback: MetroLineDetail[] = [],
): { lines: MetroLineDetail[]; fromGeoJson: boolean } {
  const lineFeatures = collection.features.filter((feature) =>
    isLineGeometry(feature.geometry),
  );

  if (lineFeatures.length === 0) {
    return { lines: fallback, fromGeoJson: false };
  }

  const grouped = new Map<
    string,
    { name: string; color: string; lengthKm: number; status: InfrastructureStatus }
  >();

  for (const feature of lineFeatures) {
    const props = feature.properties ?? {};
    const key = featureGroupKey(feature);
    const lengthKm = lineLengthKm(feature);
    const color =
      (typeof props.color === 'string' && props.color) ||
      grouped.get(key)?.color ||
      '#888888';
    const status = featureStatus(feature);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { name: key, color, lengthKm, status });
      continue;
    }

    grouped.set(key, {
      name: key,
      color: existing.color || color,
      lengthKm: Math.max(existing.lengthKm, lengthKm),
      status:
        existing.status === 'construction' || status === 'construction'
          ? 'construction'
          : 'operational',
    });
  }

  const derived = [...grouped.values()]
    .filter((line) => line.lengthKm > 0 || line.name)
    .map((line) => ({
      name: line.name,
      color: line.color,
      lengthKm: Math.round(line.lengthKm * 10) / 10,
      status: line.status,
    }))
    .sort((a, b) => b.lengthKm - a.lengthKm || a.name.localeCompare(b.name));

  return derived.length > 0
    ? { lines: derived, fromGeoJson: true }
    : { lines: fallback, fromGeoJson: false };
}
