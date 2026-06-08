import { getContinentCount, getHistorySpan } from '../lib/cities';

type GlobalStatsProps = {
  citiesShown: number;
  totalCities: number;
  totalLengthKm: number;
};

export function GlobalStats({ citiesShown, totalCities, totalLengthKm }: GlobalStatsProps) {
  const { min, max } = getHistorySpan();

  return (
    <div className="global-stats">
      <div className="global-stats__row">
        <span className="global-stats__label">CITIES</span>
        <span className="global-stats__value">
          {citiesShown} / {totalCities}
        </span>
      </div>
      <div className="global-stats__row">
        <span className="global-stats__label">CONTINENTS</span>
        <span className="global-stats__value">{getContinentCount()}</span>
      </div>
      <div className="global-stats__row">
        <span className="global-stats__label">HISTORY</span>
        <span className="global-stats__value">
          {min}–{max}
        </span>
      </div>
      <div className="global-stats__row global-stats__row--primary">
        <span className="global-stats__label">TOTAL LENGTH</span>
        <span className="global-stats__value global-stats__value--large">
          {totalLengthKm.toLocaleString()} km
        </span>
      </div>
    </div>
  );
}
