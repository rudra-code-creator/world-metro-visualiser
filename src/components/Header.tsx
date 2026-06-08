import type { MetroCity } from '../types';
import { getHistorySpan, cities } from '../lib/cities';
import { CitySearch } from './CitySearch';

type HeaderProps = {
  city: MetroCity;
  onCitySelect: (cityId: string) => void;
};

export function Header({ city, onCitySelect }: HeaderProps) {
  const { min, max } = getHistorySpan();

  return (
    <header className="header">
      <div className="header__row">
        <div className="header__brand">
          <span className="header__title">WORLD METROS</span>
          <span className="header__subtitle">
            {min}–{max} · {cities.length} CITIES · UNDERGROUND ARTERIES
          </span>
        </div>
        <CitySearch onCitySelect={onCitySelect} />
      </div>
      <div className="header__city">
        <h1 className="header__city-name">{city.name.toUpperCase()}</h1>
        <span className="header__country">{city.country.toUpperCase()}</span>
      </div>
    </header>
  );
}
