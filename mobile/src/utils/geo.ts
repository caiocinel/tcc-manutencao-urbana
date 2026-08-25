/**
 * Utilidades geoespaciais — porte de `frontend/src/utils/map-heatmap.js` e do
 * `pointInPolygon` embutido no MapPage do web.
 */

import type { Defeito, GeoJsonPolygon, Municipio } from '@/types';

const EARTH_RADIUS_M = 6371000;

export type LatLng = { latitude: number; longitude: number };

/** Ray casting. `poligono` vem em pares [lng, lat], como no GeoJSON. */
export function pointInPolygon(point: [number, number], poligono: [number, number][]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterByRadius(defeitos: Defeito[], lat: number, lng: number, raio: number) {
  return defeitos.filter((d) => haversineDistance(lat, lng, d.latitude, d.longitude) <= raio);
}

/** Extrai o anel externo do polígono do município, em pares [lng, lat]. */
export function extrairPoligono(raw: string | GeoJsonPolygon | null | undefined) {
  if (!raw) return null;
  try {
    const poly: GeoJsonPolygon = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const coords =
      poly.type === 'Polygon' ? poly.coordinates?.[0] : poly.coordinates?.[0]?.[0];
    return (coords as [number, number][] | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Converte pares [lng, lat] do GeoJSON para o formato do react-native-maps. */
export function paraLatLng(coords: [number, number][]): LatLng[] {
  return coords.map(([longitude, latitude]) => ({ latitude, longitude }));
}

export function temBoundingBox(municipio?: Municipio | null): municipio is Municipio {
  return (
    !!municipio &&
    typeof municipio.min_lat === 'number' &&
    municipio.min_lat !== 0 &&
    typeof municipio.max_lat === 'number' &&
    typeof municipio.min_lng === 'number' &&
    typeof municipio.max_lng === 'number'
  );
}

/** Região do mapa que enquadra o município inteiro, com uma folga de 15%. */
export function regiaoDoMunicipio(municipio: Municipio) {
  const minLat = municipio.min_lat!;
  const maxLat = municipio.max_lat!;
  const minLng = municipio.min_lng!;
  const maxLng = municipio.max_lng!;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.15, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.15, 0.02),
  };
}

/** Região padrão quando não há município nem GPS (Criciúma/SC, como no web). */
export const REGIAO_PADRAO = {
  latitude: -28.67,
  longitude: -49.38,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

export function regiaoEmTorno(lat: number, lng: number, delta = 0.08) {
  return { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta };
}
