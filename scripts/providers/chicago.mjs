import { fetchGtfsMetro } from '../lib/gtfs-fetch.mjs';
import { buildMetroCollection } from '../lib/provider-merge.mjs';

const CTA_GTFS_URL = 'https://www.transitchicago.com/downloads/sch_data/google_transit.zip';

function isCtaRailRoute(route, agency) {
  const agencyName = (agency?.agency_name || '').toLowerCase();
  const routeName = `${route.route_short_name} ${route.route_long_name}`.toLowerCase();
  if (!agencyName.includes('chicago') && !agencyName.includes('cta')) return false;
  return (
    Number(route.route_type) === 1 ||
    /line$/.test(routeName) ||
    ['red', 'blue', 'brown', 'green', 'orange', 'pink', 'purple', 'yellow'].some((color) =>
      routeName.includes(`${color} line`),
    )
  );
}

export async function fetchChicagoMetro(city) {
  const { lines, stations } = await fetchGtfsMetro(city, {
    url: CTA_GTFS_URL,
    source: 'cta-gtfs',
    routeTypes: [1],
    routeFilter: isCtaRailRoute,
  });

  return buildMetroCollection(city, lines, stations);
}
