# World Metros — Underground Arteries

Interactive map visualization of metro systems around the world. Explore cities on a dark Mapbox globe, scrub through systems from smallest to largest, or press play to animate the tour.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Metro line data uses dedicated providers per city (already committed). Re-fetch if needed:

   ```bash
   npm run fetch:metro              # all cities
   npm run fetch:metro singapore    # single city
   ```

3. Copy `.env.example` to `.env` and add your [Mapbox public token](https://account.mapbox.com/):

   ```
   VITE_MAPBOX_TOKEN=pk.your_token_here
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Features

- **Globe map** with clickable city markers
- **City zoom** with schematic metro line overlays
- **Info panel** — lines, stations, opened year, ridership
- **Top 10 chart** — click any bar to jump to that city
- **Play / scrub** — timeline sorted ascending by total km
- **Keyboard** — Space (play/pause), ← → (step)

City metadata lives in `src/data/manifest.json`. GeoJSON line files are served from `public/data/geojson/`.

## Cities (111)

From **Catania** (4 km, 1999) to **Beijing** (836 km) — sorted ascending on the timeline scrubber. Coverage spans **1863–2025** (162 years of underground rail) across **7 regions**: Africa, Asia, Europe, Middle East, North America, Oceania, and South America.

```bash
npm run build:manifest   # regenerate manifest from scripts/data/world-cities.mjs
npm run fetch:metro -- --skip-existing   # fetch only missing GeoJSON
npm run fetch:metro -- --jobs=8          # parallel OSM workers (default 6; auto-retries failures)
```

### Data providers

| City | Provider | Source |
|------|----------|--------|
| **Singapore** | sgraildata + OSM | [cheeaun/sgraildata](https://github.com/cheeaun/sgraildata); upcoming lines from OSM |
| **London** | TfL Unified API | [api.tfl.gov.uk](https://api.tfl.gov.uk/Line/Mode/tube) |
| **Paris** | Île-de-France Mobilités GTFS | [IDFM GTFS](https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip) |
| **Berlin** | VBB GTFS (U-Bahn) | [VBB GTFS](https://www.vbb.de/fileadmin/user_upload/VBB/Dokumente/API-Datensaetze/gtfs-mastscharf/GTFS.zip) |
| **Chicago** | CTA GTFS | [CTA google_transit.zip](https://www.transitchicago.com/downloads/sch_data/google_transit.zip) |
| **Santiago** | DTPM GTFS (Metro de Santiago) | [DTPM GTFS](https://www.dtpm.cl/descargas/gtfs/GTFS_20260418.zip) |
| **Bangkok** | Namtang GTFS (BTS/MRT) | [namtang-gtfs.zip](https://namtang-api.otp.go.th/download/namtang-gtfs.zip) |
| **Hong Kong** | Community MTR GTFS | [wheelstransit/hongkong-community-gtfs](https://github.com/wheelstransit/hongkong-community-gtfs) |
| **Taipei** | TDX-derived TRTC tracks | [mini-taiwan-learning-project](https://github.com/ianlkl11234s/mini-taiwan-learning-project) (from [TDX](https://tdx.transportdata.tw/)) |
| **Beijing** | OpenStreetMap | Best openly available geometry; no official GTFS shapes |

Upcoming/planned lines are supplemented from [OpenStreetMap](https://www.openstreetmap.org) where the primary feed does not include them.

Run `npm run fetch:metro` to refresh GeoJSON from these sources.

**Visual encoding:** open lines glow brightly; upcoming/planned lines render dimmer with a dashed pattern.

## Deploy to Netlify

```bash
npm run build
```

Set `VITE_MAPBOX_TOKEN` in Netlify environment variables. The included `netlify.toml` publishes the `dist/` folder.
