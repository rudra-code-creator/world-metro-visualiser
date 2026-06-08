/**
 * Builds src/data/manifest.json from the global city catalog.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_CITIES } from './data/world-cities.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const manifestPath = join(rootDir, 'src', 'data', 'manifest.json');

const LINE_COLORS = [
  '#E4002B', '#009645', '#005EB8', '#9900AA', '#F7931E', '#9D5B25',
  '#00A1DE', '#009B3A', '#C60C30', '#522398', '#FFCD00', '#6EC4E8',
];

function makeLinesDetail(city, override) {
  if (override?.length) return override;

  const perLine = Math.max(1, Math.round(city.totalKm / Math.max(city.lines, 1)));
  return Array.from({ length: city.lines }, (_, index) => ({
    name: city.lines === 1 ? city.name : `Line ${index + 1}`,
    color: LINE_COLORS[index % LINE_COLORS.length],
    lengthKm: perLine,
  }));
}

function main() {
  const existing = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const linesById = Object.fromEntries(
    existing.cities.map((city) => [city.id, city.linesDetail]),
  );

  const cities = [...WORLD_CITIES]
    .sort((a, b) => a.totalKm - b.totalKm)
    .map((city) => ({
      ...city,
      geojsonPath: `/data/geojson/${city.id}.json`,
      dataProvider: city.dataProvider || 'openstreetmap',
      dataSourceUrl: city.dataSourceUrl || 'https://www.openstreetmap.org',
      linesDetail: makeLinesDetail(city, linesById[city.id]),
    }));

  writeFileSync(manifestPath, `${JSON.stringify({ cities }, null, 2)}\n`);

  const continents = new Set(cities.map((c) => c.continent));
  const years = cities.map((c) => c.openedYear);

  console.log(`Wrote ${cities.length} cities to manifest.json`);
  console.log(`  Range: ${cities[0].name} (${cities[0].totalKm} km) → ${cities.at(-1).name} (${cities.at(-1).totalKm} km)`);
  console.log(`  History: ${Math.min(...years)}–${Math.max(...years)} (${Math.max(...years) - Math.min(...years)} years)`);
  console.log(`  Continents (${continents.size}): ${[...continents].sort().join(', ')}`);
}

main();
