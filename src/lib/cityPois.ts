import poisData from '../data/cityPois.json';
import poiSeeds from '../data/cityPoiSeeds.json';
import type { CityPoi, CityPoiCategory } from '../types';

const poisByCity = poisData as unknown as Record<string, CityPoi[]>;
const seedsByCity = poiSeeds as unknown as Record<string, CityPoi[]>;

export function getCityPois(cityId: string): CityPoi[] {
  const built = poisByCity[cityId] ?? [];
  if (built.length > 0) return built;
  return seedsByCity[cityId] ?? [];
}

export function cityPoisGeoJson(pois: CityPoi[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pois.map((poi, index) => ({
      type: 'Feature',
      id: index,
      geometry: { type: 'Point', coordinates: poi.coords },
      properties: {
        name: poi.name,
        category: poi.category,
      },
    })),
  };
}

export const POI_CATEGORY_LABELS: Record<CityPoiCategory, string> = {
  landmark: 'Landmark',
  airport: 'Airport',
  port: 'Port',
  university: 'University',
};

export const POI_CATEGORY_COLORS: Record<CityPoiCategory, string> = {
  landmark: '#f5d76e',
  airport: '#56ccf2',
  port: '#4facfe',
  university: '#b794f6',
};
