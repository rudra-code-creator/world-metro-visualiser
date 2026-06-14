import { readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('src/data/manifest.json', 'utf8'));

const PREFERRED_CHANNELS = [
  { handle: 'MetroLiner', label: 'Metro Liner' },
  { handle: 'metrocucumber', label: 'MetroCucumber' },
  { handle: 'qsmillustrations', label: 'QSM Illustrations' },
  { handle: 'ARTA_Singapore', label: 'Asian Rail Transit Alliance' },
];

const USER_AGENT = 'world-metro-visualiser/0.1 (video builder)';
const DELAY_MS = 400;
const cityFilter = process.argv.find((arg) => arg.startsWith('--city='))?.split('=')[1];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchTerms(city) {
  const base = city.name.replace(/\s*\([^)]*\)/g, '').trim();
  const terms = new Set([
    `${base} metro`,
    `${base} subway`,
    `${base} rapid transit`,
    `${base} mass transit`,
  ]);

  if (base.includes(' ')) {
    const first = base.split(' ')[0];
    terms.add(`${first} metro`);
  }

  return [...terms];
}

function scoreVideo(title, city) {
  const normalizedTitle = normalize(title);
  const normalizedCity = normalize(city.name.replace(/\s*\([^)]*\)/g, ''));
  const cityTokens = normalizedCity.split(' ').filter((token) => token.length > 2);

  let score = 0;
  if (normalizedTitle.includes(normalizedCity)) score += 12;
  else if (cityTokens.every((token) => normalizedTitle.includes(token))) score += 8;
  else if (cityTokens.some((token) => normalizedTitle.includes(token))) score += 3;
  else return 0;

  if (/evolution|expansion|history|geographic map|development|growth/i.test(title)) score += 6;
  if (/metro|subway|rapid transit|mass transit|u-?bahn|underground|mrt|lrt/i.test(title)) score += 4;
  if (/shorts/i.test(title)) score -= 8;
  if (/every|railway system in greater|largest metro systems/i.test(title) && !normalizedTitle.includes(normalizedCity)) {
    score -= 4;
  }

  return score;
}

async function searchChannel(handle, query) {
  const url = `https://www.youtube.com/@${handle}/search?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) return [];

  const text = await response.text();
  const entries = [
    ...text.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"\}\].*?"videoId":"([a-zA-Z0-9_-]{11})"/gs),
  ];

  const seen = new Set();
  const results = [];
  for (const [, title, videoId] of entries) {
    if (seen.has(videoId)) continue;
    seen.add(videoId);
    results.push({ videoId, title: title.replace(/\\u0026/g, '&') });
  }
  return results;
}

async function findCityVideo(city) {
  let best = null;

  for (const channel of PREFERRED_CHANNELS) {
    for (const query of searchTerms(city)) {
      try {
        const results = await searchChannel(channel.handle, query);
        for (const result of results) {
          const score = scoreVideo(result.title, city);
          if (score <= 0) continue;
          if (!best || score > best.score) {
            best = {
              videoId: result.videoId,
              title: result.title,
              channel: channel.label,
              channelHandle: channel.handle,
              score,
            };
          }
        }
      } catch {
        // try next query
      }
      await sleep(DELAY_MS);
      if (best?.score >= 16) return best;
    }
  }

  return best;
}

let existing = {};
try {
  existing = JSON.parse(readFileSync('src/data/cityMetroVideos.json', 'utf8'));
} catch {
  existing = {};
}

let cities = manifest.cities;
if (cityFilter) cities = cities.filter((city) => city.id === cityFilter);

const out = cityFilter ? { ...existing } : { ...existing };

for (let i = 0; i < cities.length; i += 1) {
  const city = cities[i];
  if (!cityFilter && out[city.id]?.videoId) {
    process.stdout.write(`\r${i + 1}/${cities.length} ${city.name} (skip)`);
    continue;
  }

  const match = await findCityVideo(city);
  if (match) {
    out[city.id] = {
      videoId: match.videoId,
      title: match.title,
      channel: match.channel,
      channelHandle: match.channelHandle,
    };
  } else {
    delete out[city.id];
  }

  writeFileSync('src/data/cityMetroVideos.json', `${JSON.stringify(out, null, 2)}\n`);
  process.stdout.write(
    `\r${i + 1}/${cities.length} ${city.name} (${match ? match.videoId : 'none'})`,
  );
}

console.log(`\nMapped videos for ${Object.keys(out).length} cities.`);
