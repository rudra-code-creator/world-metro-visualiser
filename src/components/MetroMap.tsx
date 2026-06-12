import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { MetroCity } from '../types';
import { cities, loadCityGeoJsonCached } from '../lib/cities';
import { findNearestCity, isMapNearCity } from '../lib/geo';
import {
  animateMetroRadialSpread,
  getMetroRevealDurationMs,
  setMetroDataInstant,
} from '../lib/metroAnimation';
import { skipNextMetroAnimationRef } from '../lib/playbackFlags';
import {
  CITY_MARKERS_SOURCE,
  DARK_MAP_STYLE,
  MAPBOX_TOKEN,
  METRO_LINES_SOURCE,
  METRO_STATIONS_SOURCE,
  cityMarkersGeoJson,
  splitMetroGeoJson,
} from '../lib/mapLayers';

const LINE_COLOR = ['coalesce', ['get', 'color'], '#888888'] as mapboxgl.Expression;
const IS_OPERATIONAL = ['==', ['coalesce', ['get', 'status'], 'operational'], 'operational'] as mapboxgl.Expression;
const IS_CONSTRUCTION = ['==', ['coalesce', ['get', 'status'], 'operational'], 'construction'] as mapboxgl.Expression;

type MetroMapProps = {
  currentCity: MetroCity;
  currentIndex: number;
  onCitySelect: (index: number) => void;
  onScrubStart: () => void;
};

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

type MapPanCursor = 'grab' | 'grabbing';

function applyMapPanCursor(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  cursor: MapPanCursor,
) {
  canvas.style.setProperty('cursor', cursor, 'important');
  container.style.setProperty('cursor', cursor, 'important');
}

function stripMapPointerCursor(container: HTMLElement, canvas: HTMLCanvasElement) {
  if (container.classList.contains('mapboxgl-track-pointer')) {
    container.classList.remove('mapboxgl-track-pointer');
  }

  const inlineCursor = canvas.style.getPropertyValue('cursor');
  if (inlineCursor && inlineCursor !== 'grab' && inlineCursor !== 'grabbing') {
    canvas.style.removeProperty('cursor');
  }
}

function clearMetroLayers(map: mapboxgl.Map) {
  const linesSource = map.getSource(METRO_LINES_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  const stationsSource = map.getSource(METRO_STATIONS_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  linesSource?.setData(EMPTY_COLLECTION);
  stationsSource?.setData(EMPTY_COLLECTION);
}

async function loadMetroData(city: MetroCity) {
  const geojson = await loadCityGeoJsonCached(city.geojsonPath);
  return splitMetroGeoJson(geojson);
}

/** Marker radius scales with zoom — large when zoomed out, tighter when zoomed in. */
const MARKER_RADIUS: mapboxgl.Expression = [
  'interpolate',
  ['linear'],
  ['zoom'],
  1,
  11,
  4,
  13,
  7,
  15,
  9,
  11,
  7,
  14,
  5,
];

const MARKER_GLOW_RADIUS: mapboxgl.Expression = [
  'interpolate',
  ['linear'],
  ['zoom'],
  1,
  20,
  4,
  24,
  7,
  28,
  11,
  18,
  14,
  12,
];

const MARKER_RADIUS_ACTIVE: mapboxgl.Expression = [
  'interpolate',
  ['linear'],
  ['zoom'],
  1,
  14,
  4,
  17,
  7,
  19,
  11,
  11,
  14,
  8,
];

const MARKER_GLOW_RADIUS_ACTIVE: mapboxgl.Expression = [
  'interpolate',
  ['linear'],
  ['zoom'],
  1,
  26,
  4,
  30,
  7,
  34,
  11,
  24,
  14,
  16,
];

export function MetroMap({
  currentCity,
  currentIndex,
  onCitySelect,
  onScrubStart,
}: MetroMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadGenerationRef = useRef(0);
  const metroRevealRef = useRef<{ cancel: () => void } | null>(null);
  const pendingMetroRevealRef = useRef<{
    lines: GeoJSON.FeatureCollection;
    stations: GeoJSON.FeatureCollection;
    city: MetroCity;
  } | null>(null);
  const awaitingFlyForRevealRef = useRef(false);
  const programmaticMoveRef = useRef(false);
  const currentCityIdRef = useRef(currentCity.id);
  const [mapReady, setMapReady] = useState(false);

  currentCityIdRef.current = currentCity.id;

  const updateMarkerHighlight = useCallback((map: mapboxgl.Map, cityId: string) => {
    if (!map.getLayer('city-marker-glow')) return;

    map.setPaintProperty('city-marker-glow', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], cityId],
      MARKER_GLOW_RADIUS_ACTIVE,
      MARKER_GLOW_RADIUS,
    ]);
    map.setPaintProperty('city-marker-glow', 'circle-opacity', [
      'case',
      ['==', ['get', 'id'], cityId],
      0.45,
      0.2,
    ]);
    map.setPaintProperty('city-markers', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], cityId],
      MARKER_RADIUS_ACTIVE,
      MARKER_RADIUS,
    ]);
    map.setPaintProperty('city-markers', 'circle-stroke-width', [
      'case',
      ['==', ['get', 'id'], cityId],
      2.5,
      1.5,
    ]);
    map.setPaintProperty('city-labels', 'text-opacity', [
      'case',
      ['==', ['get', 'id'], cityId],
      1,
      0.55,
    ]);
    map.setLayoutProperty('city-labels', 'text-size', [
      'interpolate',
      ['linear'],
      ['zoom'],
      1,
      10,
      6,
      12,
      10,
      13,
      14,
      11,
    ]);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_public_token_here') {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DARK_MAP_STYLE,
      center: [20, 20],
      zoom: 1.4,
      projection: 'globe',
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      map.setFog({
        color: '#0b0f19',
        'high-color': '#1a2332',
        'horizon-blend': 0.06,
        'space-color': '#000000',
        'star-intensity': 0.3,
      });

      map.addSource(CITY_MARKERS_SOURCE, {
        type: 'geojson',
        data: cityMarkersGeoJson(cities),
      });

      map.addLayer({
        id: 'city-marker-glow',
        type: 'circle',
        source: CITY_MARKERS_SOURCE,
        paint: {
          'circle-radius': MARKER_GLOW_RADIUS,
          'circle-color': ['get', 'accentColor'],
          'circle-opacity': 0.2,
          'circle-blur': 0.55,
        },
      });

      map.addLayer({
        id: 'city-markers',
        type: 'circle',
        source: CITY_MARKERS_SOURCE,
        paint: {
          'circle-radius': MARKER_RADIUS,
          'circle-color': ['get', 'accentColor'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: CITY_MARKERS_SOURCE,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': ['get', 'accentColor'],
          'text-halo-color': '#0b0f19',
          'text-halo-width': 1.5,
          'text-opacity': 0.55,
        },
      });

      map.addSource(METRO_LINES_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'metro-lines-glow-upcoming',
        type: 'line',
        source: METRO_LINES_SOURCE,
        filter: IS_CONSTRUCTION,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': LINE_COLOR,
          'line-width': 6,
          'line-opacity': 0.12,
          'line-blur': 1,
        },
      });

      map.addLayer({
        id: 'metro-lines-glow',
        type: 'line',
        source: METRO_LINES_SOURCE,
        filter: IS_OPERATIONAL,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': LINE_COLOR,
          'line-width': 14,
          'line-opacity': 0.55,
          'line-blur': 3,
        },
      });

      map.addLayer({
        id: 'metro-lines-upcoming',
        type: 'line',
        source: METRO_LINES_SOURCE,
        filter: IS_CONSTRUCTION,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': LINE_COLOR,
          'line-width': 3,
          'line-opacity': 0.45,
          'line-dasharray': [2, 2],
        },
      });

      map.addLayer({
        id: 'metro-lines',
        type: 'line',
        source: METRO_LINES_SOURCE,
        filter: IS_OPERATIONAL,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': LINE_COLOR,
          'line-width': 4.5,
          'line-opacity': 1,
        },
      });

      map.addSource(METRO_STATIONS_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'metro-stations-upcoming',
        type: 'circle',
        source: METRO_STATIONS_SOURCE,
        filter: IS_CONSTRUCTION,
        paint: {
          'circle-radius': 2,
          'circle-color': '#aaaaaa',
          'circle-opacity': 0.5,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#000000',
          'circle-stroke-opacity': 0.3,
        },
      });

      map.addLayer({
        id: 'metro-stations',
        type: 'circle',
        source: METRO_STATIONS_SOURCE,
        filter: IS_OPERATIONAL,
        paint: {
          'circle-radius': 3.5,
          'circle-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#000000',
          'circle-stroke-opacity': 0.4,
        },
      });

      map.on('click', 'city-markers', (event) => {
        const feature = event.features?.[0];
        if (!feature?.properties?.id) return;
        onScrubStart();
        const index = cities.findIndex((city) => city.id === feature.properties!.id);
        if (index >= 0) onCitySelect(index);
      });

      const tryProximitySelect = () => {
        if (programmaticMoveRef.current) return;

        const zoom = map.getZoom();
        const center = map.getCenter();
        const nearest = findNearestCity([center.lng, center.lat], zoom, cities);
        if (!nearest) return;
        if (nearest.city.id === currentCityIdRef.current) return;

        onScrubStart();
        onCitySelect(nearest.index);
      };

      map.on('moveend', tryProximitySelect);
      map.on('zoomend', tryProximitySelect);

      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [onCitySelect, onScrubStart]);

  useEffect(() => {
    const map = mapRef.current;
    const root = containerRef.current;
    if (!map || !mapReady || !root) return;

    const canvas = map.getCanvas();
    const container = map.getCanvasContainer();
    let syncFrame = 0;

    const syncMapCursor = () => {
      stripMapPointerCursor(container, canvas);
      const dragging = map.dragPan.isActive();
      root.classList.toggle('metro-map--dragging', dragging);
      applyMapPanCursor(canvas, container, dragging ? 'grabbing' : 'grab');
    };

    const scheduleSync = () => {
      if (syncFrame) return;
      syncFrame = requestAnimationFrame(() => {
        syncFrame = 0;
        syncMapCursor();
      });
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(container, { attributes: true, attributeFilter: ['class'] });
    observer.observe(canvas, { attributes: true, attributeFilter: ['style', 'class'] });

    map.on('dragstart', syncMapCursor);
    map.on('dragend', syncMapCursor);
    map.on('mouseup', scheduleSync);
    map.on('mousemove', scheduleSync);
    map.on('moveend', scheduleSync);

    syncMapCursor();

    return () => {
      if (syncFrame) cancelAnimationFrame(syncFrame);
      observer.disconnect();
      map.off('dragstart', syncMapCursor);
      map.off('dragend', syncMapCursor);
      map.off('mouseup', scheduleSync);
      map.off('mousemove', scheduleSync);
      map.off('moveend', scheduleSync);
      root.classList.remove('metro-map--dragging');
      canvas.style.removeProperty('cursor');
      container.style.removeProperty('cursor');
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    updateMarkerHighlight(map, currentCity.id);
  }, [currentCity.id, mapReady, updateMarkerHighlight]);

  const applyMetroToMap = useCallback(
    (
      map: mapboxgl.Map,
      lines: GeoJSON.FeatureCollection,
      stations: GeoJSON.FeatureCollection,
      city: MetroCity,
      animate: boolean,
    ) => {
      metroRevealRef.current?.cancel();
      metroRevealRef.current = null;

      if (animate) {
        clearMetroLayers(map);
        metroRevealRef.current = animateMetroRadialSpread(
          map,
          lines,
          stations,
          city.coords,
          { durationMs: getMetroRevealDurationMs(city.totalKm) },
        );
      } else {
        setMetroDataInstant(map, lines, stations);
      }
    },
    [],
  );

  const flushPendingMetroReveal = useCallback(
    (map: mapboxgl.Map) => {
      const pending = pendingMetroRevealRef.current;
      if (!pending) return;
      pendingMetroRevealRef.current = null;
      applyMetroToMap(map, pending.lines, pending.stations, pending.city, true);
    },
    [applyMetroToMap],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const center = map.getCenter();
    const alreadyNear = isMapNearCity(
      [center.lng, center.lat],
      map.getZoom(),
      currentCity.coords,
    );

    if (alreadyNear) {
      awaitingFlyForRevealRef.current = false;
      flushPendingMetroReveal(map);
      return;
    }

    awaitingFlyForRevealRef.current = true;
    programmaticMoveRef.current = true;
    map.flyTo({
      center: currentCity.coords,
      zoom: 11.5,
      duration: 2200,
      essential: true,
    });

    const onFlyEnd = () => {
      programmaticMoveRef.current = false;
      awaitingFlyForRevealRef.current = false;
      flushPendingMetroReveal(map);
    };
    map.once('moveend', onFlyEnd);

    return () => {
      map.off('moveend', onFlyEnd);
    };
  }, [currentCity.coords, currentIndex, mapReady, flushPendingMetroReveal]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const generation = ++loadGenerationRef.current;
    const city = currentCity;

    pendingMetroRevealRef.current = null;
    metroRevealRef.current?.cancel();
    metroRevealRef.current = null;
    clearMetroLayers(map);

    (async () => {
      try {
        const { lines, stations } = await loadMetroData(city);
        if (loadGenerationRef.current !== generation) return;

        const skipAnimation = skipNextMetroAnimationRef.current;
        skipNextMetroAnimationRef.current = false;

        if (skipAnimation) {
          pendingMetroRevealRef.current = null;
          applyMetroToMap(map, lines, stations, city, false);
          return;
        }

        const mapCenter = map.getCenter();
        const needsFly = !isMapNearCity(
          [mapCenter.lng, mapCenter.lat],
          map.getZoom(),
          city.coords,
        );

        if (needsFly || awaitingFlyForRevealRef.current) {
          pendingMetroRevealRef.current = { lines, stations, city };
          return;
        }

        applyMetroToMap(map, lines, stations, city, true);
      } catch (error) {
        if (loadGenerationRef.current !== generation) return;
        console.error(`Failed to load metro data for ${city.name}:`, error);
        clearMetroLayers(map);
      }
    })();
  }, [currentCity.id, currentCity.geojsonPath, mapReady, applyMetroToMap]);

  const missingToken =
    !MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_public_token_here';

  return (
    <div className="metro-map">
      <div ref={containerRef} className="metro-map__canvas" />
      {missingToken && (
        <div className="metro-map__token-warning">
          <p>
            Add your Mapbox public token to <code>.env</code> as{' '}
            <code>VITE_MAPBOX_TOKEN</code>
          </p>
          <p>
            Copy <code>.env.example</code> and paste a token from{' '}
            <a href="https://account.mapbox.com/" target="_blank" rel="noreferrer">
              mapbox.com
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
