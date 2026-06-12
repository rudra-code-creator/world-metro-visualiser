import { useCallback, useEffect, useState } from 'react';
import { MetroMap } from './components/MetroMap';
import { Header } from './components/Header';
import { GlobalStats } from './components/GlobalStats';
import { CityPanel } from './components/CityPanel';
import { BottomDock, clampDockHeight, getDefaultDockHeight } from './components/BottomDock';
import { LeaderboardChart } from './components/LeaderboardChart';
import { CityInfoPanel } from './components/CityInfoPanel';
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

  const [dockExpanded, setDockExpanded] = useState(true);
  const [activeDockTab, setActiveDockTab] = useState('timeline');
  const [dockHeight, setDockHeight] = useState(getDefaultDockHeight);
  const [dockResizing, setDockResizing] = useState(false);

  useEffect(() => {
    setCityIdInUrl(currentCity.id);
  }, [currentCity.id]);

  useEffect(() => {
    const onWindowResize = () => {
      setDockHeight((current) => clampDockHeight(current));
    };
    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }, []);

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
    <div
      className={`app${dockExpanded ? '' : ' app--dock-minimized'}${dockResizing ? ' app--dock-resizing' : ''}`}
      style={
        dockExpanded
          ? ({ '--bottom-dock-expanded-height': `${dockHeight}px` } as React.CSSProperties)
          : undefined
      }
    >
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
          </div>
          <CityPanel city={currentCity} />
        </div>
      </div>

      <BottomDock
        expanded={dockExpanded}
        onExpandedChange={setDockExpanded}
        activeTabId={activeDockTab}
        onActiveTabChange={setActiveDockTab}
        height={dockHeight}
        onHeightChange={setDockHeight}
        onResizingChange={setDockResizing}
        tabs={[
          {
            id: 'timeline',
            label: 'Timeline',
            hint: currentCity.name,
            panel: (
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
            ),
          },
          {
            id: 'leaderboard',
            label: 'Leaderboard',
            panel: (
              <LeaderboardChart
                currentCityId={currentCity.id}
                onCitySelect={handleCitySelectById}
                onScrubStart={pause}
                isActive={activeDockTab === 'leaderboard'}
              />
            ),
          },
          {
            id: 'city-info',
            label: 'City',
            hint: currentCity.name,
            panel: <CityInfoPanel key={currentCity.id} city={currentCity} />,
          },
        ]}
      />

      <WelcomeOverlay />
    </div>
  );
}
