import { readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('src/data/manifest.json', 'utf8'));
const profiles = JSON.parse(readFileSync('src/data/cityProfiles.json', 'utf8'));

const cityFilter = process.argv.find((arg) => arg.startsWith('--city='))?.split('=')[1];

function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const USER_AGENT = 'world-metro-visualiser/0.1 (poi builder)';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

async function geocodeLandmarkWiki(landmark, cityName, country, center) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${landmark} ${cityName}`,
    gsrnamespace: '0',
    prop: 'coordinates',
    format: 'json',
    gsrlimit: '5',
    origin: '*',
  });

  const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const pages = Object.values(data.query?.pages ?? {});

  for (const page of pages) {
    const coords = page.coordinates?.[0];
    if (!coords) continue;
    const point = [coords.lon, coords.lat];
    if (distanceKm(center, point) > 60) continue;
    return { name: landmark, category: 'landmark', coords: point };
  }

  // Fallback: Nominatim
  await sleep(1100);
  const nomParams = new URLSearchParams({
    q: `${landmark}, ${cityName}, ${country}`,
    format: 'json',
    limit: '1',
  });
  const results = await fetchJson(`https://nominatim.openstreetmap.org/search?${nomParams}`);
  const hit = results[0];
  if (!hit) return null;

  const point = [Number(hit.lon), Number(hit.lat)];
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
  if (distanceKm(center, point) > 60) return null;

  return { name: landmark, category: 'landmark', coords: point };
}

async function fetchOverpassPois(city, center) {
  const [lng, lat] = center;
  const radius = city.totalKm >= 200 ? 45000 : city.totalKm >= 80 ? 35000 : 25000;

  const query = `[out:json][timeout:40];
(
  node["aeroway"~"aerodrome|international"](around:${radius},${lat},${lng});
  way["aeroway"~"aerodrome|international"](around:${radius},${lat},${lng});
  node["amenity"="university"]["name"](around:${radius},${lat},${lng});
  way["amenity"="university"]["name"](around:${radius},${lat},${lng});
  node["landuse"="harbour"]["name"](around:${radius},${lat},${lng});
  way["landuse"="harbour"]["name"](around:${radius},${lat},${lng});
);
out center tags 30;`;

  const data = await fetchJson(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
  );

  const airports = [];
  const ports = [];
  const universities = [];

  for (const element of data.elements ?? []) {
    const tags = element.tags ?? {};
    const name = tags.name || tags['name:en'];
    if (!name) continue;

    const elLat = element.lat ?? element.center?.lat;
    const elLng = element.lon ?? element.center?.lon;
    if (!Number.isFinite(elLat) || !Number.isFinite(elLng)) continue;

    const coords = [elLng, elLat];
    const entry = { name, coords };

    if (tags.aeroway) airports.push(entry);
    else if (tags.landuse === 'harbour' || tags.harbour === 'yes') ports.push(entry);
    else if (tags.amenity === 'university') universities.push(entry);
  }

  const pick = (items, category, limit) =>
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

function dedupePois(pois) {
  const seen = new Set();
  return pois.filter((poi) => {
    const key = `${poi.category}:${poi.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

let existing = {};
try {
  existing = JSON.parse(readFileSync('src/data/cityPois.json', 'utf8'));
} catch {
  existing = {};
}

let cities = manifest.cities;
if (cityFilter) cities = cities.filter((c) => c.id === cityFilter);

const out = cityFilter ? { ...existing } : {};

for (let i = 0; i < cities.length; i += 1) {
  const city = cities[i];
  const profile = profiles[city.id];
  const center = city.coords;
  const collected = [];

  if (profile?.landmarks) {
    for (const landmark of profile.landmarks) {
      try {
        await sleep(150);
        const poi = await geocodeLandmarkWiki(landmark, city.name, city.country, center);
        if (poi) collected.push(poi);
      } catch {
        // skip failed landmark
      }
    }
  }

  try {
    await sleep(250);
    collected.push(...(await fetchOverpassPois(city, center)));
  } catch {
    // skip overpass failure
  }

  out[city.id] = dedupePois(collected);
  writeFileSync('src/data/cityPois.json', `${JSON.stringify(out, null, 2)}\n`);
  process.stdout.write(`\r${i + 1}/${cities.length} ${city.name} (${out[city.id].length})`);
}

console.log(`\nWrote POIs for ${Object.keys(out).length} cities.`);
