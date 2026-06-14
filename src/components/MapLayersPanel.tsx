import type { MapLayerVisibility } from '../lib/mapLayers';
import { POI_CATEGORY_COLORS, POI_CATEGORY_LABELS } from '../lib/cityPois';
import type { CityPoiCategory } from '../types';

type MapLayersPanelProps = {
  visibility: MapLayerVisibility;
  onChange: (visibility: MapLayerVisibility) => void;
};

type LayerToggle = {
  key: keyof MapLayerVisibility;
  label: string;
  hint: string;
  swatchClass?: string;
};

const LAYER_TOGGLES: LayerToggle[] = [
  {
    key: 'lines',
    label: 'Metro lines',
    hint: 'Open and upcoming routes',
    swatchClass: 'map-layers__swatch--lines',
  },
  {
    key: 'stations',
    label: 'Stations',
    hint: 'Stop markers along the network',
    swatchClass: 'map-layers__swatch--stations',
  },
  {
    key: 'pois',
    label: 'Points of interest',
    hint: 'Landmarks, airports, ports, universities',
    swatchClass: 'map-layers__swatch--pois',
  },
];

const POI_LEGEND: CityPoiCategory[] = ['landmark', 'airport', 'port', 'university'];

export function MapLayersPanel({ visibility, onChange }: MapLayersPanelProps) {
  const toggle = (key: keyof MapLayerVisibility) => {
    onChange({ ...visibility, [key]: !visibility[key] });
  };

  return (
    <div className="map-layers">
      <p className="map-layers__intro">
        Toggle what appears on the map for the selected city. City markers always stay visible.
      </p>
      <div className="map-layers__grid">
        {LAYER_TOGGLES.map((layer) => (
          <label key={layer.key} className="map-layers__row">
            <input
              type="checkbox"
              className="map-layers__checkbox"
              checked={visibility[layer.key]}
              onChange={() => toggle(layer.key)}
            />
            <span className={`map-layers__swatch ${layer.swatchClass ?? ''}`} aria-hidden />
            <span className="map-layers__copy">
              <span className="map-layers__label">{layer.label}</span>
              <span className="map-layers__hint">{layer.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="map-layers__legend" aria-label="POI categories">
        <span className="map-layers__legend-title">POI colours</span>
        <div className="map-layers__legend-items">
          {POI_LEGEND.map((category) => (
            <span key={category} className="map-layers__legend-item">
              <span
                className="map-layers__legend-dot"
                style={{ background: POI_CATEGORY_COLORS[category] }}
                aria-hidden
              />
              {POI_CATEGORY_LABELS[category]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
