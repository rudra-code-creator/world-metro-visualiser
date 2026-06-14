import type { MetroLineDetail } from '../types';

type MetroLinesListProps = {
  lines: MetroLineDetail[];
  loading?: boolean;
};

export function MetroLinesList({ lines, loading }: MetroLinesListProps) {
  return (
    <ul className="metro-lines">
      {loading && lines.length === 0 ? (
        <li className="metro-lines__loading">Loading lines…</li>
      ) : null}
      {lines.map((line) => (
        <li
          key={line.name}
          className={`metro-lines__item${line.status === 'construction' ? ' metro-lines__item--upcoming' : ''}`}
        >
          <span
            className="metro-lines__dot"
            style={{
              backgroundColor: line.color,
              opacity: line.status === 'construction' ? 0.45 : 1,
            }}
          />
          <span className="metro-lines__name">
            {line.name}
            {line.status === 'construction' ? ' (upcoming)' : ''}
          </span>
          <span className="metro-lines__km">{line.lengthKm} km</span>
        </li>
      ))}
    </ul>
  );
}
