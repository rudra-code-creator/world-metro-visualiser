import { fetchGtfsMetro } from '../lib/gtfs-fetch.mjs';
import { buildMetroCollection } from '../lib/provider-merge.mjs';

const HK_GTFS_URL = 'https://github.com/user-attachments/files/23604998/hk.gtfs.zip';

function isHongKongMetro(route) {
  return route.agency_id === 'MTRR' || route.agency_id === 'LR';
}

export async function fetchHongKongMetro(city) {
  const { lines, stations } = await fetchGtfsMetro(city, {
    url: HK_GTFS_URL,
    source: 'hk-gtfs',
    routeTypes: [0, 1],
    routeFilter: isHongKongMetro,
  });

  return buildMetroCollection(city, lines, stations);
}
