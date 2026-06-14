export type InfrastructureStatus = 'operational' | 'construction';

export type MetroLineDetail = {
  name: string;
  color: string;
  lengthKm: number;
  status?: InfrastructureStatus;
};

export type MetroContinent =
  | 'africa'
  | 'asia'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'oceania'
  | 'middle-east';

export type MetroCity = {
  id: string;
  name: string;
  country: string;
  continent: MetroContinent;
  coords: [number, number];
  totalKm: number;
  lines: number;
  stations: number;
  openedYear: number;
  ridershipPerYear?: number;
  expansionRate?: number;
  accentColor: string;
  linesDetail: MetroLineDetail[];
  geojsonPath: string;
  dataProvider?:
    | 'openstreetmap'
    | 'sgraildata'
    | 'tfl-api'
    | 'idfm-gtfs'
    | 'vbb-gtfs'
    | 'cta-gtfs'
    | 'dtpm-gtfs'
    | 'namtang-gtfs'
    | 'hk-gtfs'
    | 'tdx-trtc'
    | 'osm-beijing';
  dataSourceUrl?: string;
};

export type CitiesManifest = {
  cities: MetroCity[];
};

export type CityProfile = {
  imageUrl: string;
  imageAlt: string;
  population: string;
  landmarks: string[];
  knownFor: string;
  trafficRating: number;
  wikipediaUrl: string;
};

export type CityMetroVideo = {
  videoId: string;
  title: string;
  channel: string;
  channelHandle: string;
};

export type CityPoiCategory = 'landmark' | 'airport' | 'port' | 'university';

export type CityPoi = {
  name: string;
  category: CityPoiCategory;
  coords: [number, number];
};
