import videosData from '../data/cityMetroVideos.json';
import type { CityMetroVideo } from '../types';

const videosByCity = videosData as unknown as Record<string, CityMetroVideo>;

export const METRO_VIDEO_CHANNELS = [
  { handle: 'MetroLiner', label: 'Metro Liner', url: 'https://www.youtube.com/@MetroLiner' },
  { handle: 'metrocucumber', label: 'MetroCucumber', url: 'https://www.youtube.com/@metrocucumber' },
  {
    handle: 'qsmillustrations',
    label: 'QSM Illustrations',
    url: 'https://www.youtube.com/@qsmillustrations',
  },
  {
    handle: 'ARTA_Singapore',
    label: 'Asian Rail Transit Alliance',
    url: 'https://www.youtube.com/@ARTA_Singapore',
  },
] as const;

export function getCityMetroVideo(cityId: string): CityMetroVideo | null {
  return videosByCity[cityId] ?? null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeSearchUrl(cityName: string, channelHandle?: string): string {
  const query = encodeURIComponent(`${cityName} metro evolution`);
  if (channelHandle) {
    return `https://www.youtube.com/@${channelHandle}/search?query=${query}`;
  }
  return `https://www.youtube.com/results?search_query=${query}`;
}
