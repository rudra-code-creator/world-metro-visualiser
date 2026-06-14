import { useEffect, useState } from 'react';
import type { MetroCity, MetroLineDetail } from '../types';
import { loadCityGeoJsonCached } from '../lib/cities';
import { deriveMetroLinesFromGeoJson } from '../lib/metroLinesFromGeoJson';

type MetroLinesState = {
  lines: MetroLineDetail[];
  loading: boolean;
  fromGeoJson: boolean;
};

export function useMetroLines(city: MetroCity, enabled = true): MetroLinesState {
  const [lines, setLines] = useState<MetroLineDetail[]>(city.linesDetail);
  const [loading, setLoading] = useState(false);
  const [fromGeoJson, setFromGeoJson] = useState(false);

  useEffect(() => {
    setLines(city.linesDetail);
    setFromGeoJson(false);

    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    void loadCityGeoJsonCached(city.geojsonPath)
      .then((collection) => {
        if (cancelled) return;
        const { lines: derived, fromGeoJson: derivedFromGeoJson } =
          deriveMetroLinesFromGeoJson(collection, city.linesDetail);
        setLines(derived);
        setFromGeoJson(derivedFromGeoJson);
      })
      .catch(() => {
        if (!cancelled) {
          setLines(city.linesDetail);
          setFromGeoJson(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city.id, city.geojsonPath, city.linesDetail, enabled]);

  return { lines, loading, fromGeoJson };
}
