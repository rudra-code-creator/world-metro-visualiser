import { readFileSync, writeFileSync } from 'node:fs';
import { profilesById } from './data/city-profiles-by-id.mjs';
import { commonsThumbUrl } from './lib/commons-thumb.mjs';

const manifest = JSON.parse(readFileSync('src/data/manifest.json', 'utf8'));

const WIKIPEDIA_TITLES = {
  'washington-dc': 'Washington, D.C.',
  'sao-paulo': 'São Paulo',
  medellin: 'Medellín',
  bogota: 'Bogotá',
  'ho-chi-minh-city': 'Ho Chi Minh City',
  'santo-domingo': 'Santo Domingo',
  'panama-city': 'Panama City',
  'nizhny-novgorod': 'Nizhny Novgorod',
  'kryvyi-rih': 'Kryvyi Rih',
  'addis-ababa': 'Addis Ababa',
  'rio-de-janeiro': 'Rio de Janeiro',
  'kuala-lumpur': 'Kuala Lumpur',
  'mexico-city': 'Mexico City',
  'los-angeles': 'Los Angeles',
  'san-francisco': 'San Francisco',
  'hong-kong': 'Hong Kong',
  'new-york-city': 'New York City',
  'saint-petersburg': 'Saint Petersburg',
  'buenos-aires': 'Buenos Aires',
};

/** Verified Wikimedia Commons filenames for reliable skyline photos */
const IMAGE_OVERRIDES = {
  singapore:
    'Skyline_of_the_Central_Business_District_with_the_Old_Parliament_House_in_Singapore.jpg',
  london: "London_skyline_from_Shooter's_Hill.jpg",
  tokyo: 'Tokyo_Skyline.jpg',
  paris: 'Paris_Night.jpg',
  'new-york-city': 'Manhattan_at_night.jpg',
  beijing: 'Beijing_CBD_from_the_southeast.jpg',
  shanghai: 'Shanghai_skyline_from_the_bund.jpg',
  'hong-kong': 'Hong_Kong_Skyline_view_from_the_peak_2017.jpg',
  dubai: 'Dubai_Marina_Skyline.jpg',
  sydney: 'Sydney_Opera_House_and_skyline.jpg',
  moscow: 'Moscow_City_(2).jpg',
  istanbul: 'Istanbul_panorama_from_Galata_Tower.jpg',
  bangkok: 'Bangkok_Skyline_at_night.jpg',
  delhi: 'Delhi_skyline.jpg',
  mumbai: 'Mumbai_Skyline.jpg',
  seoul: 'Seoul_night_view.jpg',
  chicago: 'Chicago_skyline_from_Lincoln_Park.jpg',
  'los-angeles': 'Downtown_Los_Angeles_skyline.jpg',
  'san-francisco': 'San_Francisco_skyline.jpg',
  berlin: 'Berlin_-_Panorama_vom_Fernsehturm.jpg',
  rome: 'Rome_skyline_panorama.jpg',
  jakarta: 'Jakarta_skyline.jpg',
  'mexico-city': 'Mexico_City_skyline.jpg',
  cairo: 'Cairo_skyline.jpg',
  taipei: 'Taipei_skyline.jpg',
  barcelona: 'Barcelona_skyline.jpg',
  amsterdam: 'Amsterdam_skyline.jpg',
};

function wikiTitle(city) {
  return WIKIPEDIA_TITLES[city.id] ?? city.name;
}

function wikiPageUrl(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function buildKnownForParagraph(city, profile) {
  const { landmarks } = profile;
  const landmarkList =
    landmarks.length > 1
      ? `${landmarks.slice(0, -1).join(', ')}, and ${landmarks[landmarks.length - 1]}`
      : landmarks[0];

  return (
    `${city.name} is a major city in ${city.country}, home to a metro network spanning ${city.totalKm} km across ${city.lines} lines and ${city.stations} stations, with rapid transit service dating to ${city.openedYear}. ` +
    `${profile.knownFor} The city is widely recognised for landmarks such as ${landmarkList}, and continues to shape transport, culture, and daily life across its region.`
  );
}

function resolveImageUrl(cityId, profile) {
  const override = IMAGE_OVERRIDES[cityId];
  if (override) return commonsThumbUrl(override);
  if (profile.image) return commonsThumbUrl(profile.image);
  return '';
}

const out = {};

for (const city of manifest.cities) {
  const profile = profilesById[city.id];
  if (!profile) throw new Error(`Missing city profile for: ${city.id}`);

  out[city.id] = {
    imageUrl: resolveImageUrl(city.id, profile),
    imageAlt: `${city.name} cityscape`,
    population: profile.population,
    landmarks: profile.landmarks,
    knownFor: buildKnownForParagraph(city, profile),
    trafficRating: profile.trafficRating,
    wikipediaUrl: wikiPageUrl(wikiTitle(city)),
  };
}

writeFileSync('src/data/cityProfiles.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out).length} city profiles.`);
