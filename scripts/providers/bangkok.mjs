import { fetchGtfsMetro } from '../lib/gtfs-fetch.mjs';
import { buildMetroCollection } from '../lib/provider-merge.mjs';

const NAMTANG_GTFS_URL = 'https://namtang-api.otp.go.th/download/namtang-gtfs.zip';

const BANGKOK_RAIL_AGENCIES = new Set(['BTSC', 'BEM', 'MRTA', 'SRTET']);

function isBangkokRail(route) {
  return BANGKOK_RAIL_AGENCIES.has(route.agency_id) && Number(route.route_type) !== 3;
}

export async function fetchBangkokMetro(city) {
  const { lines, stations } = await fetchGtfsMetro(city, {
    url: NAMTANG_GTFS_URL,
    source: 'namtang-gtfs',
    routeTypes: [0, 1, 2],
    routeFilter: isBangkokRail,
  });

  return buildMetroCollection(city, lines, stations);
}
