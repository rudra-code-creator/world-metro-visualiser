import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cities } from '../lib/cities';

type CitySearchProps = {
  onCitySelect: (cityId: string) => void;
};

const MAX_RESULTS = 12;

function matchesQuery(name: string, country: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    name.toLowerCase().includes(normalized) ||
    country.toLowerCase().includes(normalized)
  );
}

export function CitySearch({ onCitySelect }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return cities
      .filter((city) => matchesQuery(city.name, city.country, query))
      .slice(0, MAX_RESULTS);
  }, [query]);

  const selectCity = useCallback(
    (cityId: string) => {
      onCitySelect(cityId);
      setQuery('');
      setOpen(false);
      setHighlightIndex(0);
      inputRef.current?.blur();
    },
    [onCitySelect],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (event.key === 'ArrowDown' && query.trim()) {
        setOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectCity(results[highlightIndex].id);
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="city-search" ref={containerRef}>
      <label className="city-search__label" htmlFor="city-search-input">
        Find city
      </label>
      <div className="city-search__field">
        <input
          ref={inputRef}
          id="city-search-input"
          type="search"
          className="city-search__input"
          placeholder="Search 111 cities…"
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {open && results.length > 0 && (
          <ul className="city-search__results" role="listbox">
            {results.map((city, index) => (
              <li key={city.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlightIndex}
                  className={`city-search__result${index === highlightIndex ? ' city-search__result--active' : ''}`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectCity(city.id)}
                >
                  <span className="city-search__result-name">{city.name}</span>
                  <span className="city-search__result-meta">
                    {city.country} · {city.totalKm} km
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && query.trim() && results.length === 0 && (
          <p className="city-search__empty">No cities match &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
