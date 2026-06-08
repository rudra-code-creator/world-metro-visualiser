## Learned User Preferences

- Prefer real metro geometry from dedicated per-city data sources (GTFS, operator APIs, curated feeds)—not schematic or generic OSM-only approximations
- Data completeness matters: branches, LRT/light-rail, and upcoming lines should be included where available
- Dark map basemap must stay legible for roads, parks, hospitals, and other city features
- Timeline playback should support adjustable speed and reverse direction (largest→smallest)
- Map interaction should stay in pan mode; pointer cursor should not steal control while panning
- GeoJSON fetches should run in parallel; multi-hour sequential fetches are unacceptable

## Learned Workspace Facts

- World Metro Visualiser: Vite + React + TypeScript + Mapbox GL JS
- City metadata in `src/data/manifest.json` (111 cities); GeoJSON served from `public/data/geojson/`
- Metro data refreshed via `npm run fetch:metro` (`--skip-existing`, `--jobs=N`); per-city providers in fetch scripts
- Map basemap style is `mapbox://styles/mapbox/navigation-night-v1`
- Open lines render with bright glow; upcoming/planned lines render dimmer with dashed pattern
- Default playback order is cities sorted ascending by `totalKm`; reverse playback flips direction
- Target deploy is Netlify with `VITE_MAPBOX_TOKEN` env var
