import { useEffect, useRef } from 'react';
import { getCitiesRankedByKm } from '../lib/cities';
import type { MetroCity } from '../types';

type LeaderboardChartProps = {
  currentCityId: string;
  onCitySelect: (cityId: string) => void;
  onScrubStart: () => void;
  isActive?: boolean;
};

export function LeaderboardChart({
  currentCityId,
  onCitySelect,
  onScrubStart,
  isActive = true,
}: LeaderboardChartProps) {
  const ranked = getCitiesRankedByKm();
  const maxKm = ranked[0]?.totalKm ?? 1;
  const activeRowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!isActive) return;
    activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentCityId, isActive]);

  return (
    <div className="leaderboard">
      <p className="leaderboard__summary">
        {ranked.length} metro systems · sorted largest to smallest
      </p>
      <ul className="leaderboard__list">
        {ranked.map((city: MetroCity, index) => {
          const width = (city.totalKm / maxKm) * 100;
          const isCurrent = city.id === currentCityId;

          return (
            <li
              key={city.id}
              ref={isCurrent ? activeRowRef : undefined}
              className="leaderboard__item"
            >
              <button
                type="button"
                className={`leaderboard__button${isCurrent ? ' leaderboard__button--active' : ''}`}
                onClick={() => {
                  onScrubStart();
                  onCitySelect(city.id);
                }}
              >
                <span className="leaderboard__rank">{index + 1}</span>
                <span className="leaderboard__name" style={{ color: city.accentColor }}>
                  {city.name}
                </span>
                <span className="leaderboard__bar-track">
                  <span
                    className="leaderboard__bar"
                    style={{
                      width: `${width}%`,
                      backgroundColor: city.accentColor,
                      opacity: isCurrent ? 1 : 0.65,
                    }}
                  />
                </span>
                <span className="leaderboard__km">{city.totalKm} km</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
