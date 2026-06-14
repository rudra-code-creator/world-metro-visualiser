import type { MetroCity } from '../types';
import {
  METRO_VIDEO_CHANNELS,
  getCityMetroVideo,
  youtubeEmbedUrl,
  youtubeSearchUrl,
  youtubeWatchUrl,
} from '../lib/cityMetroVideos';

type CityVideoPanelProps = {
  city: MetroCity;
  isActive?: boolean;
};

export function CityVideoPanel({ city, isActive = true }: CityVideoPanelProps) {
  const video = getCityMetroVideo(city.id);

  if (!video) {
    return (
      <div className="city-video city-video--empty">
        <p className="city-video__empty-title">No evolution video mapped for {city.name} yet</p>
        <p className="city-video__empty-copy">
          Browse these channels for metro system evolution animations:
        </p>
        <ul className="city-video__channel-list">
          {METRO_VIDEO_CHANNELS.map((channel) => (
            <li key={channel.handle}>
              <a
                className="city-video__channel-link"
                href={youtubeSearchUrl(city.name, channel.handle)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {channel.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="city-video">
      <div className="city-video__player-wrap">
        {isActive ? (
          <iframe
            className="city-video__player"
            src={youtubeEmbedUrl(video.videoId)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div className="city-video__player-placeholder" aria-hidden />
        )}
      </div>
      <div className="city-video__meta">
        <h3 className="city-video__title">{video.title}</h3>
        <p className="city-video__channel">
          via{' '}
          <a
            href={`https://www.youtube.com/@${video.channelHandle}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {video.channel}
          </a>
        </p>
        <a
          className="city-video__watch-link"
          href={youtubeWatchUrl(video.videoId)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}
