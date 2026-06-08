import { useState } from 'react';
import { cities } from '../lib/cities';

const STORAGE_KEY = 'world-metro-welcome-dismissed';

function isDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function WelcomeOverlay() {
  const [visible, setVisible] = useState(() => !isDismissed());

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  return (
    <div className="welcome-overlay" role="dialog" aria-labelledby="welcome-title">
      <div className="welcome-overlay__card">
        <h2 id="welcome-title" className="welcome-overlay__title">
          Welcome to World Metros
        </h2>
        <p className="welcome-overlay__intro">
          Explore underground networks across {cities.length} cities, sorted by network length.
        </p>
        <ul className="welcome-overlay__list">
          <li>
            <strong>Timeline</strong> — press play or Space to animate; switch{' '}
            <span className="welcome-overlay__kbd">L→S</span> for largest-to-smallest; adjust speed
          </li>
          <li>
            <strong>Find a city</strong> — use the search bar, click timeline blocks, map markers, or the top-10 chart
          </li>
          <li>
            <strong>Map</strong> — drag to pan, scroll or pinch to zoom
          </li>
          <li>
            <strong>Legend</strong> — bright lines are open; dim dashed lines are upcoming
          </li>
        </ul>
        <button type="button" className="welcome-overlay__dismiss" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
