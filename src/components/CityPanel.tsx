import type { CSSProperties } from 'react';
import type { MetroCity } from '../types';

type CityPanelProps = {
  city: MetroCity;
};

function formatRidership(value?: number): string {
  if (!value) return '—';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B/YEAR`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M/YEAR`;
  return value.toLocaleString();
}

export function CityPanel({ city }: CityPanelProps) {
  return (
    <aside
      className="city-panel"
      style={{ '--accent': city.accentColor } as CSSProperties}
    >
      <div className="city-panel__header">
        <div>
          <h2 className="city-panel__title">{city.name}</h2>
          <span className="city-panel__country">{city.country}</span>
        </div>
        <span className="city-panel__badge">{city.totalKm} km</span>
      </div>

      <div className="city-panel__stats">
        <div className="city-panel__stat">
          <span className="city-panel__stat-value">{city.lines}</span>
          <span className="city-panel__stat-label">LINES</span>
        </div>
        <div className="city-panel__stat">
          <span className="city-panel__stat-value">{city.stations}</span>
          <span className="city-panel__stat-label">STATIONS</span>
        </div>
        <div className="city-panel__stat">
          <span className="city-panel__stat-value">{city.openedYear}</span>
          <span className="city-panel__stat-label">OPENED</span>
        </div>
        <div className="city-panel__stat">
          <span className="city-panel__stat-value">{formatRidership(city.ridershipPerYear)}</span>
          <span className="city-panel__stat-label">RIDERSHIP</span>
        </div>
      </div>

      {city.expansionRate !== undefined && (
        <p className="city-panel__expansion">
          {city.expansionRate.toFixed(2)} stations / year expansion
        </p>
      )}

      <ul className="city-panel__lines">
        {city.linesDetail.map((line) => (
          <li
            key={line.name}
            className={`city-panel__line${line.status === 'construction' ? ' city-panel__line--upcoming' : ''}`}
          >
            <span
              className="city-panel__line-dot"
              style={{
                backgroundColor: line.color,
                opacity: line.status === 'construction' ? 0.45 : 1,
              }}
            />
            <span className="city-panel__line-name">
              {line.name}
              {line.status === 'construction' ? ' (upcoming)' : ''}
            </span>
            <span className="city-panel__line-km">{line.lengthKm} km</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
