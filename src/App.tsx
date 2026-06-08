import { useCallback, useEffect } from 'react';
import { MetroMap } from './components/MetroMap';
import { Header } from './components/Header';
import { GlobalStats } from './components/GlobalStats';
import { TopTenChart } from './components/TopTenChart';
import { CityPanel } from './components/CityPanel';
import { TimelineScrubber } from './components/TimelineScrubber';
import { WelcomeOverlay } from './components/WelcomeOverlay';
import { useMetroPlayback } from './hooks/useMetroPlayback';
import { getCityIndex } from './lib/cities';
import { resolveInitialCityIndex, setCityIdInUrl } from './lib/cityUrl';

const initialIndex = resolveInitialCityIndex();

export default function App() {
  const {
    currentIndex,
    currentCity,
    citiesShown,
    totalLengthKm,
    totalCities,
    isPlaying,
    goToIndex,
    togglePlay,
    pause,
    playbackSpeed,
    setPlaybackSpeed,
    reverse,
    toggleReverse,
  } = useMetroPlayback({ initialIndex, initialReverse: true });

  useEffect(() => {
    setCityIdInUrl(currentCity.id);
  }, [currentCity.id]);

  const handleCitySelect = useCallback(
    (index: number) => {
      goToIndex(index);
    },
    [goToIndex],
  );

  const handleCitySelectById = useCallback(
    (cityId: string) => {
      const index = getCityIndex(cityId);
      if (index >= 0) goToIndex(index);
    },
    [goToIndex],
  );

  return (
    <div className="app">
      <MetroMap
        currentCity={currentCity}
        currentIndex={currentIndex}
        onCitySelect={handleCitySelect}
        onScrubStart={pause}
      />

      <div className="app__overlay">
        <div className="app__top">
          <Header city={currentCity} onCitySelect={handleCitySelectById} />
          <GlobalStats
            citiesShown={citiesShown}
            totalCities={totalCities}
            totalLengthKm={totalLengthKm}
          />
        </div>

        <div className="app__bottom">
          <div className="app__bottom-left">
            <div className="map-legend" aria-hidden="true">
              <div className="map-legend__item">
                <span className="map-legend__swatch map-legend__swatch--open" />
                <span>Open — bright glow</span>
              </div>
              <div className="map-legend__item">
                <span className="map-legend__swatch map-legend__swatch--upcoming" />
                <span>Upcoming — dim dashed</span>
              </div>
            </div>
            <TopTenChart
              currentCityId={currentCity.id}
              onCitySelect={handleCitySelectById}
              onScrubStart={pause}
            />
          </div>
          <CityPanel city={currentCity} />
        </div>

        <TimelineScrubber
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          reverse={reverse}
          onIndexChange={goToIndex}
          onTogglePlay={togglePlay}
          onScrubStart={pause}
          onPlaybackSpeedChange={setPlaybackSpeed}
          onToggleReverse={toggleReverse}
        />
      </div>

      <WelcomeOverlay />
    </div>
  );
}
