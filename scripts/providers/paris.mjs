import { fetchGtfsMetro } from '../lib/gtfs-fetch.mjs';
import { buildMetroCollection } from '../lib/provider-merge.mjs';

const IDFM_GTFS_URL = 'https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip';

function isParisMetroOrRer(route) {
  const routeType = Number(route.route_type);
  const label = `${route.route_short_name} ${route.route_long_name}`.toUpperCase();

  if (routeType === 1) return true;
  if (routeType === 2 && label.includes('RER')) return true;
  return false;
}

export async function fetchParisMetro(city) {
  const { lines, stations } = await fetchGtfsMetro(city, {
    url: IDFM_GTFS_URL,
    source: 'idfm-gtfs',
    routeFilter: isParisMetroOrRer,
  });

  return buildMetroCollection(city, lines, stations);
}
