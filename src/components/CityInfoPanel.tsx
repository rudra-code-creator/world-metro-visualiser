import { useEffect, useState } from 'react';
import type { MetroCity } from '../types';
import { getCityProfile } from '../lib/cityProfiles';
import { resolveCityImage } from '../lib/resolveCityImage';

type CityInfoPanelProps = {
  city: MetroCity;
};

function TrafficMeter({ rating }: { rating: number }) {
  const clamped = Math.max(1, Math.min(10, Math.round(rating)));

  return (
    <div className="city-info__traffic">
      <div className="city-info__traffic-bars" aria-hidden>
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className={`city-info__traffic-bar${index < clamped ? ' city-info__traffic-bar--filled' : ''}`}
            style={
              index < clamped
                ? { opacity: 0.35 + (index / 10) * 0.65 }
                : undefined
            }
          />
        ))}
      </div>
      <span className="city-info__traffic-value">
        {clamped}
        <span className="city-info__traffic-scale"> / 10</span>
      </span>
    </div>
  );
}

export function CityInfoPanel({ city }: CityInfoPanelProps) {
  const profile = getCityProfile(city);
  const [imageSrc, setImageSrc] = useState(profile.imageUrl);
  const [imageFailed, setImageFailed] = useState(false);
  const [resolvingImage, setResolvingImage] = useState(false);

  useEffect(() => {
    setImageSrc(profile.imageUrl);
    setImageFailed(false);
    setResolvingImage(false);
  }, [city.id, profile.imageUrl]);

  const handleImageError = async () => {
    if (resolvingImage || imageFailed) return;

    setResolvingImage(true);
    const fallback = await resolveCityImage(city.name);
    setResolvingImage(false);

    if (fallback) {
      setImageSrc(fallback);
      return;
    }

    setImageFailed(true);
  };

  return (
    <article className="city-info">
      <div className="city-info__hero">
        {imageFailed ? (
          <div className="city-info__image city-info__image--fallback" aria-hidden />
        ) : (
          <img
            className="city-info__image"
            src={imageSrc}
            alt={profile.imageAlt}
            loading="lazy"
            decoding="async"
            onError={() => void handleImageError()}
          />
        )}
        <div className="city-info__hero-overlay">
          <h2 className="city-info__title">{city.name}</h2>
          <p className="city-info__country">{city.country}</p>
        </div>
      </div>

      <div className="city-info__body">
        <dl className="city-info__facts">
          <div className="city-info__fact">
            <dt>Population</dt>
            <dd>{profile.population}</dd>
          </div>
          <div className="city-info__fact city-info__fact--traffic">
            <dt>Traffic congestion</dt>
            <dd>
              <TrafficMeter rating={profile.trafficRating} />
            </dd>
          </div>
        </dl>

        <section className="city-info__section">
          <h3 className="city-info__section-title">Known for</h3>
          <p className="city-info__text">{profile.knownFor}</p>
          <a
            className="city-info__wiki"
            href={profile.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read more on Wikipedia ↗
          </a>
        </section>

        <section className="city-info__section">
          <h3 className="city-info__section-title">Famous landmarks</h3>
          <ul className="city-info__landmarks">
            {profile.landmarks.map((landmark) => (
              <li key={landmark}>{landmark}</li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
