import { fetchGtfsMetro } from '../lib/gtfs-fetch.mjs';
import { buildMetroCollection } from '../lib/provider-merge.mjs';

const VBB_GTFS_URL =
  'https://www.vbb.de/fileadmin/user_upload/VBB/Dokumente/API-Datensaetze/gtfs-mastscharf/GTFS.zip';

function isBerlinUBahn(route) {
  const shortName = (route.route_short_name || '').trim();
  const longName = (route.route_long_name || '').toLowerCase();
  return /^U\d+$/i.test(shortName) || longName.includes('u-bahn');
}

export async function fetchBerlinMetro(city) {
  const { lines, stations } = await fetchGtfsMetro(city, {
    url: VBB_GTFS_URL,
    source: 'vbb-gtfs',
    routeFilter: isBerlinUBahn,
  });

  return buildMetroCollection(city, lines, stations);
}
