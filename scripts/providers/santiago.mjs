import { fetchGtfsMetro } from '../lib/gtfs-fetch.mjs';
import { buildMetroCollection } from '../lib/provider-merge.mjs';

const DTPM_GTFS_URL = 'https://www.dtpm.cl/descargas/gtfs/GTFS_20260418.zip';

function isSantiagoMetro(route, agency) {
  if (route.agency_id === 'M') return true;
  const agencyName = (agency?.agency_name || '').toLowerCase();
  return agencyName === 'metro de santiago';
}

export async function fetchSantiagoMetro(city) {
  const { lines, stations } = await fetchGtfsMetro(city, {
    url: DTPM_GTFS_URL,
    source: 'dtpm-gtfs',
    routeFilter: isSantiagoMetro,
  });

  return buildMetroCollection(city, lines, stations);
}
