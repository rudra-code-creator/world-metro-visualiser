## Learned User Preferences

- Prefer real metro geometry from dedicated per-city data sources (GTFS, operator APIs, curated feeds)—not schematic or generic OSM-only approximations
- Data completeness matters: branches, LRT/light-rail, and upcoming lines should be included where available
- Dark map basemap must stay legible for roads, parks, hospitals, and other city features
- Timeline playback should support adjustable speed and reverse direction (largest→smallest)
- Strict cursor zones (Google Maps style): grab/grabbing on map canvas only; pointer on overlay panels and bottom dock—never pointer on the map while panning; user has repeatedly flagged random pointer leaks as a major UX frustration
- GeoJSON fetches should run in parallel; multi-hour sequential fetches are unacceptable
- Zooming to zoom 8+ should auto-select the nearest city and load its metro
- City markers should scale larger when zoomed out so small cities stay clickable
- Metro lines should reveal with a radial spread from the network center (not all at once, not line-by-line): ~5s for most cities, ~10s for networks ≥100 km; skip animation during timeline auto-advance; on manual city select, start reveal after the map fly completes
- Bottom dock panels (timeline, leaderboard, city info) must have strong contrast against the map and stay readable

## Learned Workspace Facts

- World Metro Visualiser: Vite + React + TypeScript + Mapbox GL JS
- City metadata in `src/data/manifest.json` (111 cities); GeoJSON served from `public/data/geojson/`
- Metro data refreshed via `npm run fetch:metro` (`--skip-existing`, `--jobs=N`); per-city providers in fetch scripts
- Map basemap style is `mapbox://styles/mapbox/navigation-night-v1`
- Open lines render with bright glow; upcoming/planned lines render dimmer with dashed pattern
- Default load: Beijing focused, L→S playback (largest→smallest); cities sorted ascending by `totalKm` in manifest
- Shareable city links via `?city=` URL param; header city search; first-visit welcome onboarding (localStorage dismiss)
- GitHub repo: `rudra-code-creator/world-metro-visualiser`; target deploy is Netlify with `VITE_MAPBOX_TOKEN` env var
- UI uses a shared resizable bottom dock (`BottomDock.tsx`): ~25vh default height, minimizable tab bar, drag top edge to resize; tabs for Timeline, Leaderboard (all cities largest→smallest), and City info; more bottom panels expected
- Per-city profiles in `src/data/cityProfiles.json` (regenerate via `npm run build:profiles`); City info tab shows skyline image, population, landmarks, paragraph “known for”, traffic rating 1–10, and Wikipedia link; images use direct Wikimedia Commons `upload.wikimedia.org` URLs with runtime Commons-search fallback
