import { useCallback, useEffect, useRef, useState } from 'react';
import { cities, getCumulativeLength, prefetchCityGeoJson } from '../lib/cities';
import { skipNextMetroAnimationRef } from '../lib/playbackFlags';

const STEP_MS = 2800;

export const PLAYBACK_SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEED_OPTIONS)[number];

type MetroPlaybackOptions = {
  initialIndex?: number;
  initialReverse?: boolean;
};

export function useMetroPlayback(options: MetroPlaybackOptions = {}) {
  const { initialIndex = 0, initialReverse = true } = options;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [reverse, setReverse] = useState(initialReverse);
  const timerRef = useRef<number | null>(null);

  const currentCity = cities[currentIndex];
  const citiesShown = reverse
    ? cities.length - currentIndex
    : currentIndex + 1;
  const totalLengthKm = reverse
    ? cities.slice(currentIndex).reduce((sum, city) => sum + city.totalKm, 0)
    : getCumulativeLength(currentIndex);

  const goToIndex = useCallback((index: number) => {
    skipNextMetroAnimationRef.current = false;
    const clamped = Math.max(0, Math.min(index, cities.length - 1));
    setCurrentIndex(clamped);
  }, []);

  const stepForward = useCallback(() => {
    skipNextMetroAnimationRef.current = false;
    setCurrentIndex((index) => Math.min(index + 1, cities.length - 1));
  }, []);

  const stepBackward = useCallback(() => {
    skipNextMetroAnimationRef.current = false;
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((playing) => !playing);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggleReverse = useCallback(() => {
    setReverse((value) => !value);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = STEP_MS / playbackSpeed;

    timerRef.current = window.setInterval(() => {
      skipNextMetroAnimationRef.current = true;
      setCurrentIndex((index) => {
        if (reverse) {
          if (index <= 0) {
            setIsPlaying(false);
            return index;
          }
          return index - 1;
        }

        if (index >= cities.length - 1) {
          setIsPlaying(false);
          return index;
        }
        return index + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, reverse]);

  useEffect(() => {
    prefetchCityGeoJson(cities[currentIndex].geojsonPath);
    const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < cities.length) {
      prefetchCityGeoJson(cities[nextIndex].geojsonPath);
    }
  }, [currentIndex, reverse]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.code === 'ArrowRight') {
        pause();
        stepForward();
      } else if (event.code === 'ArrowLeft') {
        pause();
        stepBackward();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pause, stepBackward, stepForward, togglePlay]);

  return {
    currentIndex,
    currentCity,
    citiesShown,
    totalLengthKm,
    totalCities: cities.length,
    isPlaying,
    goToIndex,
    stepForward,
    stepBackward,
    togglePlay,
    pause,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    reverse,
    toggleReverse,
  };
}
