const SKIP_IMAGE_PATTERN =
  /flag|coat of arms|logo|map of|icon|emblem|seal of|diagram|chart|locator/i;

export async function resolveCityImage(cityName: string): Promise<string | null> {
  const queries = [`${cityName} skyline`, `${cityName} panorama`, `${cityName} city view`];

  for (const query of queries) {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '960',
      format: 'json',
      gsrlimit: '6',
      origin: '*',
    });

    try {
      const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
      if (!response.ok) continue;

      const data = await response.json();
      const pages = Object.values(data.query?.pages ?? {}) as Array<{
        title?: string;
        imageinfo?: Array<{ thumburl?: string }>;
      }>;

      for (const page of pages) {
        const thumb = page.imageinfo?.[0]?.thumburl;
        if (!thumb || /\.svg(\.|$)/i.test(thumb)) continue;
        if (SKIP_IMAGE_PATTERN.test(page.title ?? '')) continue;
        return thumb;
      }
    } catch {
      // try next query
    }
  }

  return null;
}
