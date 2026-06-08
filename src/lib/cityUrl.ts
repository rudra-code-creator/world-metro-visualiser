import { getCityIndex, getDefaultCityIndex } from './cities';

const CITY_PARAM = 'city';

export function getCityIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(CITY_PARAM);
}

export function setCityIdInUrl(cityId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(CITY_PARAM, cityId);
  window.history.replaceState(null, '', url);
}

export function resolveInitialCityIndex(): number {
  const fromUrl = getCityIdFromUrl();
  if (fromUrl) {
    const index = getCityIndex(fromUrl);
    if (index >= 0) return index;
  }
  return getDefaultCityIndex();
}
