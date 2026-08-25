/**
 * Superfície do mapa — implementação web (Leaflet).
 *
 * O Metro resolve este arquivo no lugar de `map-surface.tsx` quando a
 * plataforma é web. Usa Leaflet + react-leaflet, o mesmo stack do frontend
 * Vite, porque `react-native-maps` depende de `codegenNativeComponent`, que
 * não existe no react-native-web.
 */

import 'leaflet/dist/leaflet.css';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';

import type { LatLng } from '@/utils/geo';

import type { MapSurfaceHandle, MapSurfaceProps, Regiao } from './map-surface.types';

const TILES_ESCURO = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILES_CLARO = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

/** Anel que cobre o mundo; com o município como buraco, escurece o entorno. */
const ANEL_MUNDO: [number, number][] = [
  [85, -180],
  [85, 180],
  [-85, 180],
  [-85, -180],
];

/** O react-native-maps pensa em deltas de grau; o Leaflet, em níveis de zoom. */
function zoomDaRegiao(regiao: Regiao) {
  const delta = Math.max(regiao.longitudeDelta, 0.0001);
  const zoom = Math.round(Math.log2(360 / delta)) + 1;
  return Math.min(Math.max(zoom, 3), 18);
}

function paraLeaflet(pontos: LatLng[]): [number, number][] {
  return pontos.map((p) => [p.latitude, p.longitude]);
}

function CliqueNoMapa({ onPress }: { onPress: (coordenada: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPress({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

export const MapSurface = forwardRef<MapSurfaceHandle, MapSurfaceProps>(function MapSurface(
  {
    regiaoInicial,
    poligonoMunicipio,
    circulos,
    marcadores,
    onPressMapa,
    onPressMarcador,
    escuro,
  },
  ref,
) {
  const mapRef = useRef<LeafletMap | null>(null);

  useImperativeHandle(ref, () => ({
    animarPara(regiao) {
      mapRef.current?.flyTo([regiao.latitude, regiao.longitude], zoomDaRegiao(regiao));
    },
  }));

  const anelMunicipio = useMemo(
    () => (poligonoMunicipio ? paraLeaflet(poligonoMunicipio) : null),
    [poligonoMunicipio],
  );

  return (
    <MapContainer
      ref={mapRef}
      center={[regiaoInicial.latitude, regiaoInicial.longitude]}
      zoom={zoomDaRegiao(regiaoInicial)}
      minZoom={3}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <TileLayer url={escuro ? TILES_ESCURO : TILES_CLARO} noWrap />
      <CliqueNoMapa onPress={onPressMapa} />

      {anelMunicipio ? (
        <>
          <Polygon
            positions={anelMunicipio}
            pathOptions={{
              color: '#D4A017',
              weight: 2,
              fillColor: 'rgb(180,140,50)',
              fillOpacity: 0.15,
              interactive: false,
            }}
          />
          {/* Segundo anel = mundo com o município recortado (buraco). */}
          <Polygon
            positions={[ANEL_MUNDO, [...anelMunicipio].reverse()]}
            pathOptions={{
              stroke: false,
              fillColor: '#000',
              fillOpacity: 0.45,
              interactive: false,
            }}
          />
        </>
      ) : null}

      {circulos.map((circulo) => (
        <Circle
          key={circulo.key}
          center={[circulo.centro.latitude, circulo.centro.longitude]}
          radius={circulo.raio}
          pathOptions={{
            stroke: !!circulo.corBorda,
            color: circulo.corBorda,
            weight: circulo.larguraBorda ?? 0,
            fillColor: circulo.corPreenchimento,
            // As cores já vêm com alpha embutido no rgba().
            fillOpacity: 1,
            interactive: false,
          }}
        />
      ))}

      {marcadores.map((marcador) => (
        <CircleMarker
          key={marcador.key}
          center={[marcador.coordenada.latitude, marcador.coordenada.longitude]}
          radius={7}
          pathOptions={{
            color: '#fff',
            weight: 2,
            fillColor: marcador.cor,
            fillOpacity: 1,
          }}
          eventHandlers={{ click: () => onPressMarcador(marcador.key) }}
        />
      ))}
    </MapContainer>
  );
});
