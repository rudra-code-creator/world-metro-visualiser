import { readFileSync, writeFileSync } from 'node:fs';



const manifest = JSON.parse(readFileSync('src/data/manifest.json', 'utf8'));

const profiles = JSON.parse(readFileSync('src/data/cityProfiles.json', 'utf8'));



const USER_AGENT = 'world-metro-visualiser/0.1 (POI build)';

const DELAY_MS = 500;

const forceRebuild = process.argv.includes('--force');

const cityFilter = process.argv.find((arg) => arg.startsWith('--city='))?.split('=')[1];



const LANDMARK_TITLE_ALIASES = {

  'KL Tower': 'Kuala Lumpur Tower',

  'Big Ben': 'Elizabeth Tower',

  'Opera House': 'Sydney Opera House',

  'Christ the Redeemer': 'Christ the Redeemer (statue)',

  'Sagrada Familia': 'Sagrada Família',

  Acropolis: 'Acropolis of Athens',

};



function sleep(ms) {

  return new Promise((resolve) => setTimeout(resolve, ms));

}



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



async function fetchJson(url, options = {}) {

  const response = await fetch(url, {

    ...options,

    headers: { 'User-Agent': USER_AGENT, ...options.headers },

  });

  const text = await response.text();

  if (!response.ok || text.startsWith('You are making too many requests')) {

    throw new Error(text.slice(0, 120));

  }

  return JSON.parse(text);

}



function titleForLandmark(landmark) {

  return LANDMARK_TITLE_ALIASES[landmark] ?? landmark;

}



async function geocodeLandmarksBatch(landmarks, cityName, center) {

  if (landmarks.length === 0) return [];



  const titleByLandmark = new Map(

    landmarks.map((landmark) => [landmark, titleForLandmark(landmark)]),

  );

  const titles = [...new Set(titleByLandmark.values())].join('|');



  const params = new URLSearchParams({

    action: 'query',

    titles,

    prop: 'coordinates',

    format: 'json',

    origin: '*',

  });



  const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);

  const titleToCoords = new Map();



  for (const page of Object.values(data.query?.pages ?? {})) {

    if (page.missing !== undefined || !page.coordinates?.[0]) continue;

    titleToCoords.set(page.title, [page.coordinates[0].lon, page.coordinates[0].lat]);

  }



  const resolved = [];

  const missing = [];



  for (const landmark of landmarks) {

    const title = titleByLandmark.get(landmark);

    const coords = titleToCoords.get(title);

    if (coords && distanceKm(center, coords) <= 80) {

      resolved.push({ name: landmark, category: 'landmark', coords });

    } else {

      missing.push(landmark);

    }

  }



  for (const landmark of missing) {

    await sleep(DELAY_MS);

    const searchParams = new URLSearchParams({

      action: 'query',

      generator: 'search',

      gsrsearch: `${landmark} ${cityName}`,

      gsrnamespace: '0',

      prop: 'coordinates',

      format: 'json',

      gsrlimit: '3',

      origin: '*',

    });



    try {

      const searchData = await fetchJson(`https://en.wikipedia.org/w/api.php?${searchParams}`);

      for (const page of Object.values(searchData.query?.pages ?? {})) {

        const coords = page.coordinates?.[0];

        if (!coords) continue;

        const point = [coords.lon, coords.lat];

        if (distanceKm(center, point) <= 80) {

          resolved.push({ name: landmark, category: 'landmark', coords: point });

          break;

        }

      }

    } catch {

      // skip

    }

  }



  return resolved;

}



async function fetchOverpassPois(city, center) {

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



  const data = await fetchJson('https://overpass-api.de/api/interpreter', {

    method: 'POST',

    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },

    body: `data=${encodeURIComponent(query)}`,

  });



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



function hasInfrastructurePois(pois) {

  return pois.some((poi) => poi.category !== 'landmark');

}



async function buildCityPois(city, existing = []) {

  const profile = profiles[city.id];

  const center = city.coords;

  const collected = [...existing];



  const needsLandmarks =

    forceRebuild || existing.filter((poi) => poi.category === 'landmark').length === 0;

  const needsInfrastructure = forceRebuild || !hasInfrastructurePois(existing);



  if (needsLandmarks) {

    try {

      const landmarks = await geocodeLandmarksBatch(profile?.landmarks ?? [], city.name, center);

      collected.push(...landmarks);

    } catch {

      // wiki optional

    }

  }



  if (needsInfrastructure) {

    try {

      await sleep(DELAY_MS);

      collected.push(...(await fetchOverpassPois(city, center)));

    } catch {

      // overpass optional

    }

  }



  return dedupePois(collected);

}



let out = {};

try {

  out = JSON.parse(readFileSync('src/data/cityPois.json', 'utf8'));

} catch {

  out = {};

}



let cities = manifest.cities;

if (cityFilter) cities = cities.filter((c) => c.id === cityFilter);



for (let i = 0; i < cities.length; i += 1) {

  const city = cities[i];

  const existing = out[city.id] ?? [];

  const pois = await buildCityPois(city, existing);

  out[city.id] = pois;

  writeFileSync('src/data/cityPois.json', `${JSON.stringify(out, null, 2)}\n`);

  process.stdout.write(`\r${i + 1}/${cities.length} ${city.name} (${pois.length} POIs)`);

  await sleep(DELAY_MS);

}



console.log(

  `\nDone — ${Object.keys(out).length} cities, ${Object.values(out).flat().length} POIs total.`,

);

