/** Overpass search radius from published network length (km). */
export function radiusKmForCity(city) {
  const km = Number(city.totalKm) || 25;
  return Math.min(42, Math.max(6, Math.round(5 + Math.sqrt(km) * 2.2)));
}
