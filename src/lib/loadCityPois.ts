import type { MetroCity, CityPoi } from '../types';
import { getCityPois } from './cityPois';

const memoryCache = new Map<string, CityPoi[]>();

function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function dedupePois(pois: CityPoi[]): CityPoi[] {
  const seen = new Set<string>();
  return pois.filter((poi) => {
    const key = `${poi.category}:${poi.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasInfrastructurePois(pois: CityPoi[]): boolean {
  return pois.some((poi) => poi.category !== 'landmark');
}

async function geocodeLandmarkWiki(
  landmark: string,
  cityName: string,
  center: [number, number],
): Promise<CityPoi | null> {
  const titleGuesses = [landmark, `${landmark} (${cityName})`, `${landmark}, ${cityName}`];

  for (const title of titleGuesses) {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'coordinates',
      format: 'json',
      origin: '*',
    });

    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!response.ok) continue;

    const text = await response.text();
    if (text.startsWith('You are making too many requests')) return null;

    const data = JSON.parse(text);
    const pages = Object.values(data.query?.pages ?? {}) as Array<{
      missing?: unknown;
      coordinates?: Array<{ lat: number; lon: number }>;
    }>;

    for (const page of pages) {
      if (page.missing !== undefined) continue;
      const coords = page.coordinates?.[0];
      if (!coords) continue;
      const point: [number, number] = [coords.lon, coords.lat];
      if (distanceKm(center, point) <= 80) {
        return { name: landmark, category: 'landmark', coords: point };
      }
    }
  }

  const searchParams = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${landmark} ${cityName}`,
    gsrnamespace: '0',
    prop: 'coordinates',
    format: 'json',
    gsrlimit: '5',
    origin: '*',
  });

  const response = await fetch(`https://en.wikipedia.org/w/api.php?${searchParams}`);
  if (!response.ok) return null;

  const text = await response.text();
  if (text.startsWith('You are making too many requests')) return null;

  const data = JSON.parse(text);
  const pages = Object.values(data.query?.pages ?? {}) as Array<{
    coordinates?: Array<{ lat: number; lon: number }>;
  }>;

  for (const page of pages) {
    const coords = page.coordinates?.[0];
    if (!coords) continue;
    const point: [number, number] = [coords.lon, coords.lat];
    if (distanceKm(center, point) <= 80) {
      return { name: landmark, category: 'landmark', coords: point };
    }
  }

  return null;
}

async function fetchOverpassPois(city: MetroCity): Promise<CityPoi[]> {
  const center = city.coords;
  const [lng, lat] = center;
  const radius = city.totalKm >= 200 ? 45000 : city.totalKm >= 80 ? 35000 : 25000;

  const query = `[out:json][timeout:40];
(
  node["aeroway"~"aerodrome|international"]["name"](around:${radius},${lat},${lng});
  way["aeroway"~"aerodrome|international"]["name"](around:${radius},${lat},${lng});
  node["amenity"="university"]["name"](around:${radius},${lat},${lng});
  way["amenity"="university"]["name"](around:${radius},${lat},${lng});
  node["landuse"="harbour"]["name"](around:${radius},${lat},${lng});
  way["landuse"="harbour"]["name"](around:${radius},${lat},${lng});
);
out center tags 25;`;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) return [];

  const data = await response.json();
  const airports: Array<{ name: string; coords: [number, number] }> = [];
  const ports: Array<{ name: string; coords: [number, number] }> = [];
  const universities: Array<{ name: string; coords: [number, number] }> = [];

  for (const element of data.elements ?? []) {
    const tags = element.tags ?? {};
    const name = tags.name || tags['name:en'];
    if (!name) continue;

    const elLat = element.lat ?? element.center?.lat;
    const elLng = element.lon ?? element.center?.lon;
    if (!Number.isFinite(elLat) || !Number.isFinite(elLng)) continue;

    const coords: [number, number] = [elLng, elLat];
    const entry = { name, coords };

    if (tags.aeroway) airports.push(entry);
    else if (tags.landuse === 'harbour' || tags.harbour === 'yes') ports.push(entry);
    else if (tags.amenity === 'university') universities.push(entry);
  }

  const pick = (
    items: Array<{ name: string; coords: [number, number] }>,
    category: CityPoi['category'],
    limit: number,
  ): CityPoi[] =>
    items
      .sort((a, b) => distanceKm(center, a.coords) - distanceKm(center, b.coords))
      .slice(0, limit)
      .map((item) => ({ name: item.name, category, coords: item.coords }));

  return [
    ...pick(airports, 'airport', 2),
    ...pick(ports, 'port', 2),
    ...pick(universities, 'university', 3),
  ];
}

async function fetchRuntimePois(city: MetroCity, profileLandmarks: string[]): Promise<CityPoi[]> {
  const center = city.coords;
  const collected: CityPoi[] = [];

  for (const landmark of profileLandmarks) {
    const poi = await geocodeLandmarkWiki(landmark, city.name, center);
    if (poi) collected.push(poi);
  }

  try {
    collected.push(...(await fetchOverpassPois(city)));
  } catch {
    // Overpass is optional at runtime
  }

  return dedupePois(collected);
}

async function supplementStaticPois(city: MetroCity, staticPois: CityPoi[]): Promise<CityPoi[]> {
  if (hasInfrastructurePois(staticPois)) return staticPois;

  const cacheKey = `${city.id}:supplement`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const infrastructure = await fetchOverpassPois(city);
    const merged = dedupePois([...staticPois, ...infrastructure]);
    memoryCache.set(cacheKey, merged);
    return merged;
  } catch {
    return staticPois;
  }
}

export async function loadCityPois(
  city: MetroCity,
  profileLandmarks: string[],
): Promise<CityPoi[]> {
  const staticPois = getCityPois(city.id);
  if (staticPois.length > 0) {
    if (hasInfrastructurePois(staticPois)) return staticPois;
    return supplementStaticPois(city, staticPois);
  }

  const cached = memoryCache.get(city.id);
  if (cached) return cached;

  try {
    const fetched = await fetchRuntimePois(city, profileLandmarks);
    memoryCache.set(city.id, fetched);
    return fetched;
  } catch {
    return [];
  }
}
