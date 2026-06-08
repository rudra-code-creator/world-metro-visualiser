import { getTopTen } from '../lib/cities';
import type { MetroCity } from '../types';

type TopTenChartProps = {
  currentCityId: string;
  onCitySelect: (cityId: string) => void;
  onScrubStart: () => void;
};

export function TopTenChart({ currentCityId, onCitySelect, onScrubStart }: TopTenChartProps) {
  const topTen = getTopTen();
  const maxKm = topTen[0]?.totalKm ?? 1;

  return (
    <div className="top-ten">
      <h2 className="panel-label">KM BY CITY · TOP 10</h2>
      <ul className="top-ten__list">
        {topTen.map((city: MetroCity) => {
          const width = (city.totalKm / maxKm) * 100;
          const isActive = city.id === currentCityId;

          return (
            <li key={city.id} className="top-ten__item">
              <button
                type="button"
                className={`top-ten__button${isActive ? ' top-ten__button--active' : ''}`}
                onClick={() => {
                  onScrubStart();
                  onCitySelect(city.id);
                }}
              >
                <span className="top-ten__name" style={{ color: city.accentColor }}>
                  {city.name}
                </span>
                <span className="top-ten__bar-track">
                  <span
                    className="top-ten__bar"
                    style={{
                      width: `${width}%`,
                      backgroundColor: city.accentColor,
                      opacity: isActive ? 1 : 0.65,
                    }}
                  />
                </span>
                <span className="top-ten__km">{city.totalKm} km</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
