import type { CityPoiCategory } from '../types';
import { POI_CATEGORY_LABELS } from './cityPois';
import type { PoiDetails } from './resolvePoiDetails';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function poiPopupLoadingHtml(name: string, category: CityPoiCategory): string {
  const label = POI_CATEGORY_LABELS[category] ?? category;
  return (
    `<div class="poi-popup__inner">` +
    `<div class="poi-popup__title">${escapeHtml(name)}</div>` +
    `<div class="poi-popup__category">${escapeHtml(label)}</div>` +
    `<div class="poi-popup__loading">Loading details…</div>` +
    `</div>`
  );
}

export function poiPopupContentHtml(
  name: string,
  category: CityPoiCategory,
  details: PoiDetails,
): string {
  const label = POI_CATEGORY_LABELS[category] ?? category;
  const imageBlock = details.imageUrl
    ? `<img class="poi-popup__image" src="${escapeHtml(details.imageUrl)}" alt="${escapeHtml(name)}" loading="lazy" />`
    : '';

  const descriptionBlock = details.description
    ? `<p class="poi-popup__description">${escapeHtml(details.description)}</p>`
    : '';

  return (
    `<div class="poi-popup__inner">` +
    imageBlock +
    `<div class="poi-popup__body">` +
    `<div class="poi-popup__title">${escapeHtml(name)}</div>` +
    `<div class="poi-popup__category">${escapeHtml(label)}</div>` +
    descriptionBlock +
    `<a class="poi-popup__maps-link" href="${escapeHtml(details.googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` +
    `</div>` +
    `</div>`
  );
}
