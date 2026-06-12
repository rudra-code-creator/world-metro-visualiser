import profilesData from '../data/cityProfiles.json';
import type { CityProfile, MetroCity } from '../types';

const profiles = profilesData as Record<string, CityProfile>;

export function getCityProfile(city: MetroCity): CityProfile {
  const profile = profiles[city.id];
  if (profile) return profile;

  return {
    imageUrl: '',
    imageAlt: `${city.name} cityscape`,
    population: '—',
    landmarks: [`${city.name} city centre`],
    knownFor: `${city.name} is a major city in ${city.country}, served by a metro network spanning ${city.totalKm} km across ${city.lines} lines and ${city.stations} stations. It remains an influential centre of culture, commerce, and urban life in its region, drawing visitors to its distinctive neighbourhoods, landmarks, and everyday street life.`,
    trafficRating: 5,
    wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(city.name.replace(/ /g, '_'))}`,
  };
}
