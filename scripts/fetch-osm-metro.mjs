/**
 * Fetches metro line geometry and writes per-city GeoJSON.
 *
 * Usage:
 *   npm run fetch:metro                      # all cities, parallel
 *   npm run fetch:metro -- --skip-existing   # only missing files
 *   npm run fetch:metro -- --jobs=12         # OSM concurrency (default 10)
 *   npm run fetch:metro singapore            # single city
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWithConcurrency } from './lib/parallel.mjs';
import { fetchSingaporeMetro } from './providers/singapore.mjs';
import { fetchLondonMetro } from './providers/london.mjs';
import { fetchParisMetro } from './providers/paris.mjs';
import { fetchBerlinMetro } from './providers/berlin.mjs';
import { fetchChicagoMetro } from './providers/chicago.mjs';
import { fetchSantiagoMetro } from './providers/santiago.mjs';
import { fetchBangkokMetro } from './providers/bangkok.mjs';
import { fetchHongKongMetro } from './providers/hong-kong.mjs';
import { fetchTaipeiMetro } from './providers/taipei.mjs';
import { fetchBeijingMetro } from './providers/beijing.mjs';
import { fetchOsmMetroCity } from './providers/osm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const manifestPath = join(rootDir, 'src', 'data', 'manifest.json');
const outDir = join(rootDir, 'public', 'data', 'geojson');

const DEFAULT_OSM_JOBS = 6;
const DEFAULT_HEAVY_JOBS = 3;
const RETRY_OSM_JOBS = 2;

const DEDICATED_PROVIDERS = {
  singapore: fetchSingaporeMetro,
  london: fetchLondonMetro,
  paris: fetchParisMetro,
  berlin: fetchBerlinMetro,
  chicago: fetchChicagoMetro,
  santiago: fetchSantiagoMetro,
  bangkok: fetchBangkokMetro,
  'hong-kong': fetchHongKongMetro,
  taipei: fetchTaipeiMetro,
  beijing: fetchBeijingMetro,
};

function parseJobsFlag(args) {
  const flag = args.find((a) => a.startsWith('--jobs'));
  if (!flag) return DEFAULT_OSM_JOBS;
  const value = flag.includes('=') ? flag.split('=')[1] : args[args.indexOf(flag) + 1];
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_OSM_JOBS;
}

async function fetchCity(city) {
  const provider = DEDICATED_PROVIDERS[city.id] ?? fetchOsmMetroCity;
  return provider(city);
}

async function processCity(city) {
  const label = `${city.name} (${city.dataProvider || 'openstreetmap'})`;
  console.log(`[start] ${label}`);
  const started = Date.now();

  const geojson = await fetchCity(city);
  const outPath = join(outDir, `${city.id}.json`);
  writeFileSync(outPath, JSON.stringify(geojson));

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[done]  ${label} → ${outPath} (${seconds}s)`);
  return { ok: true, city };
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const positional = args.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
  const onlyId = positional[0];
  const skipExisting = flags.has('--skip-existing');
  const osmJobs = parseJobsFlag(args);

  mkdirSync(outDir, { recursive: true });
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let cities = onlyId
    ? manifest.cities.filter((c) => c.id === onlyId)
    : manifest.cities;

  if (cities.length === 0) {
    console.error(`City not found: ${onlyId}`);
    process.exit(1);
  }

  if (skipExisting) {
    cities = cities.filter((city) => !existsSync(join(outDir, `${city.id}.json`)));
    console.log(`Skipping existing — ${cities.length} cities to fetch`);
  }

  const heavy = cities.filter((city) => DEDICATED_PROVIDERS[city.id]);
  const light = cities.filter((city) => !DEDICATED_PROVIDERS[city.id]);

  console.log(
    `Parallel fetch: ${light.length} OSM @ ${osmJobs} workers, ` +
      `${heavy.length} dedicated @ ${DEFAULT_HEAVY_JOBS} workers\n`,
  );

  const started = Date.now();
  let ok = 0;
  const failures = [];

  async function runQueue(queue, concurrency, queueName) {
    if (queue.length === 0) return;

    await runWithConcurrency(queue, concurrency, async (city) => {
      try {
        await processCity(city);
        ok++;
      } catch (error) {
        failures.push(city);
        console.error(`[fail]  ${city.name}: ${error.message}`);
      }
    });

    console.log(`[queue] ${queueName} finished`);
  }

  await Promise.all([
    runQueue(light, osmJobs, 'OSM'),
    runQueue(heavy, DEFAULT_HEAVY_JOBS, 'dedicated'),
  ]);

  if (failures.length > 0) {
    console.log(
      `\nRetrying ${failures.length} failed cities @ ${RETRY_OSM_JOBS} workers (rate-limit backoff)...\n`,
    );
    const retryQueue = [...failures];
    failures.length = 0;
    await runQueue(retryQueue, RETRY_OSM_JOBS, 'retry');
  }

  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\nDone in ${minutes} min. ${ok} succeeded, ${failures.length} failed.`);
}

main();
