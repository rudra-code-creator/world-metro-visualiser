import type { CityPoiCategory } from '../types';

export type PoiDetails = {
  imageUrl: string | null;
  description: string | null;
  googleMapsUrl: string;
};

const detailsCache = new Map<string, PoiDetails>();

const SKIP_IMAGE_PATTERN =
  /flag|coat of arms|logo|map of|icon|emblem|seal of|diagram|chart|locator/i;

function cacheKey(name: string, coords: [number, number]): string {
  return `${name}:${coords[0].toFixed(4)},${coords[1].toFixed(4)}`;
}

export function googleMapsUrl(name: string, coords: [number, number]): string {
  const query = encodeURIComponent(`${name}@${coords[1]},${coords[0]}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

async function fetchWikiDetails(
  name: string,
  cityName: string,
  category: CityPoiCategory,
): Promise<{ imageUrl: string | null; description: string | null }> {
  const categoryHint =
    category === 'airport'
      ? 'airport'
      : category === 'port'
        ? 'port harbour'
        : category === 'university'
          ? 'university'
          : '';

  const searchQueries = [
    `${name} ${cityName}`,
    categoryHint ? `${name} ${categoryHint} ${cityName}` : name,
    name,
  ];

  for (const query of searchQueries) {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '0',
      prop: 'pageimages|extracts|info',
      piprop: 'thumbnail',
      pithumbsize: '400',
      exintro: '1',
      explaintext: '1',
      exsentences: '3',
      inprop: 'url',
      format: 'json',
      gsrlimit: '3',
      origin: '*',
    });

    try {
      const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
      if (!response.ok) continue;

      const text = await response.text();
      if (text.startsWith('You are making too many requests')) break;

      const data = JSON.parse(text);
      const pages = Object.values(data.query?.pages ?? {}) as Array<{
        title?: string;
        extract?: string;
        thumbnail?: { source?: string };
      }>;

      for (const page of pages) {
        const extract = page.extract?.trim();
        const thumb = page.thumbnail?.source;
        const imageUrl =
          thumb && !/\.svg(\.|$)/i.test(thumb) && !SKIP_IMAGE_PATTERN.test(page.title ?? '')
            ? thumb
            : null;

        if (extract || imageUrl) {
          return {
            imageUrl,
            description: extract ? truncate(extract, 220) : null,
          };
        }
      }
    } catch {
      // try next query
    }
  }

  return { imageUrl: null, description: null };
}

export async function resolvePoiDetails(
  name: string,
  category: CityPoiCategory,
  coords: [number, number],
  cityName: string,
): Promise<PoiDetails> {
  const key = cacheKey(name, coords);
  const cached = detailsCache.get(key);
  if (cached) return cached;

  const mapsUrl = googleMapsUrl(name, coords);
  const wiki = await fetchWikiDetails(name, cityName, category);

  const details: PoiDetails = {
    imageUrl: wiki.imageUrl,
    description: wiki.description,
    googleMapsUrl: mapsUrl,
  };

  detailsCache.set(key, details);
  return details;
}
