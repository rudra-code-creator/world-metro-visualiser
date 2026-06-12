import type { MetroCity, CitiesManifest } from '../types';
import manifestData from '../data/manifest.json';

const manifest = manifestData as CitiesManifest;

export const cities: MetroCity[] = [...manifest.cities].sort(
  (a, b) => a.totalKm - b.totalKm,
);

export function getCityById(id: string): MetroCity | undefined {
  return cities.find((city) => city.id === id);
}

export function getCityIndex(id: string): number {
  return cities.findIndex((city) => city.id === id);
}

export const DEFAULT_CITY_ID = 'beijing';

export function getDefaultCityIndex(): number {
  const index = getCityIndex(DEFAULT_CITY_ID);
  return index >= 0 ? index : cities.length - 1;
}

export function getCitiesRankedByKm(): MetroCity[] {
  return [...cities].sort((a, b) => b.totalKm - a.totalKm);
}

export function getTopTen(): MetroCity[] {
  return getCitiesRankedByKm().slice(0, 10);
}

export function getCumulativeLength(upToIndex: number): number {
  return cities.slice(0, upToIndex + 1).reduce((sum, city) => sum + city.totalKm, 0);
}

export function getHistorySpan(): { min: number; max: number } {
  const years = cities.map((city) => city.openedYear);
  return { min: Math.min(...years), max: Math.max(...years) };
}

export function getContinentCount(): number {
  return new Set(cities.map((city) => city.continent)).size;
}

export async function loadCityGeoJson(path: string): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load GeoJSON: ${path}`);
  }
  return response.json();
}

const geoJsonCache = new Map<string, GeoJSON.FeatureCollection>();

export async function loadCityGeoJsonCached(
  path: string,
): Promise<GeoJSON.FeatureCollection> {
  const cached = geoJsonCache.get(path);
  if (cached) return cached;

  const data = await loadCityGeoJson(path);
  geoJsonCache.set(path, data);
  return data;
}

export function prefetchCityGeoJson(path: string): void {
  void loadCityGeoJsonCached(path).catch(() => undefined);
}
