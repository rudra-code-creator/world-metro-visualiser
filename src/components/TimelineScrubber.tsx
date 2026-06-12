import { useCallback, useRef } from 'react';
import { cities } from '../lib/cities';
import {
  PLAYBACK_SPEED_OPTIONS,
  type PlaybackSpeed,
} from '../hooks/useMetroPlayback';

type TimelineScrubberProps = {
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  reverse: boolean;
  onIndexChange: (index: number) => void;
  onTogglePlay: () => void;
  onScrubStart: () => void;
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void;
  onToggleReverse: () => void;
};

function labelIndices(count: number, currentIndex: number): number[] {
  if (count <= 8) return Array.from({ length: count }, (_, i) => i);

  const anchors = new Set([0, count - 1, currentIndex]);
  const step = Math.max(1, Math.floor(count / 6));
  for (let i = step; i < count - 1; i += step) anchors.add(i);

  return [...anchors].sort((a, b) => a - b);
}

export function TimelineScrubber({
  currentIndex,
  isPlaying,
  playbackSpeed,
  reverse,
  onIndexChange,
  onTogglePlay,
  onScrubStart,
  onPlaybackSpeedChange,
  onToggleReverse,
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const indexFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return currentIndex;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (cities.length - 1));
  }, [currentIndex]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    onScrubStart();
    trackRef.current?.setPointerCapture(event.pointerId);
    onIndexChange(indexFromClientX(event.clientX));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    onIndexChange(indexFromClientX(event.clientX));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    trackRef.current?.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="timeline timeline--dock">
      <div className="timeline__controls">
        <button
          type="button"
          className="timeline__play"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="timeline__meta">
          <h2 className="panel-label">
            KM BY CITY · {reverse ? 'PLAYING DESCENDING' : 'SORTED ASCENDING'}
          </h2>
          <span className="timeline__hint">Space to play · ← → to step</span>
        </div>
        <div className="timeline__options">
          <button
            type="button"
            className={`timeline__direction${reverse ? ' timeline__direction--active' : ''}`}
            onClick={onToggleReverse}
            aria-label={reverse ? 'Playing reverse (largest to smallest)' : 'Playing forward (smallest to largest)'}
            title={reverse ? 'Reverse: largest → smallest' : 'Forward: smallest → largest'}
          >
            {reverse ? 'L→S' : 'S→L'}
          </button>
          <div className="timeline__speeds" role="group" aria-label="Playback speed">
            {PLAYBACK_SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={`timeline__speed${playbackSpeed === speed ? ' timeline__speed--active' : ''}`}
                onClick={() => onPlaybackSpeedChange(speed)}
                aria-pressed={playbackSpeed === speed}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        className="timeline__track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={cities.length - 1}
        aria-valuenow={currentIndex}
        aria-label="Metro cities timeline"
      >
        <div className="timeline__blocks">
          {cities.map((city, index) => (
            <button
              key={city.id}
              type="button"
              className={`timeline__block${index === currentIndex ? ' timeline__block--active' : ''}${reverse ? (index >= currentIndex ? ' timeline__block--revealed' : '') : index <= currentIndex ? ' timeline__block--revealed' : ''}`}
              style={{
                backgroundColor: city.accentColor,
                flex: `${city.totalKm} 1 0`,
              }}
              onClick={(event) => {
                event.stopPropagation();
                onScrubStart();
                onIndexChange(index);
              }}
              aria-label={`${city.name}, ${city.totalKm} km`}
            />
          ))}
        </div>
        <div
          className="timeline__playhead"
          style={{ left: `${(currentIndex / Math.max(cities.length - 1, 1)) * 100}%` }}
        />
      </div>

      <div className="timeline__labels">
        {labelIndices(cities.length, currentIndex).map((index) => (
          <span
            key={cities[index].id}
            className={`timeline__label${index === currentIndex ? ' timeline__label--active' : ''}`}
            style={{
              left: `${(index / Math.max(cities.length - 1, 1)) * 100}%`,
              color: index === currentIndex ? cities[index].accentColor : undefined,
            }}
          >
            {cities[index].name}
          </span>
        ))}
      </div>
    </div>
  );
}
