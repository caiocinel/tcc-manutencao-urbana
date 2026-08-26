/**
 * Superfície do mapa — implementação web (Leaflet).
 *
 * O Metro resolve este arquivo no lugar de `map-surface.tsx` quando a
 * plataforma é web. Usa Leaflet + react-leaflet, o mesmo stack do frontend
 * Vite, porque `react-native-maps` depende de `codegenNativeComponent`, que
 * não existe no react-native-web.
 */

import 'leaflet/dist/leaflet.css';

import L, { type Map as LeafletMap } from 'leaflet';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Circle, MapContainer, Marker, Polygon, TileLayer, useMapEvents } from 'react-leaflet';

import type { LatLng } from '@/utils/geo';

import type { MapSurfaceHandle, MapSurfaceProps, Regiao } from './map-surface.types';

const TILES_ESCURO = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILES_CLARO = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

/** Zoom de rua ao seguir o usuário (18 ≈ quarteirão inteiro na tela). */
const ZOOM_NAVEGACAO = 18;
const OURO = '#D4AF37';

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

function iconePino(cor: string, icone: string | undefined, emAlcance: boolean, selecionado: boolean) {
  const tamanho = selecionado ? 40 : 30;
  const borda = emAlcance ? `3px solid ${OURO}` : '2px solid #fff';
  return L.divIcon({
    className: '',
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
    html: `<div style="width:${tamanho}px;height:${tamanho}px;border-radius:50%;background:${cor};border:${borda};box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:${tamanho * 0.5}px;box-shadow:0 2px 4px rgba(0,0,0,.35)">${icone ?? ''}</div>`,
  });
}

/** Ponto azul com o cone da bússola (Google Maps); o cone some sem direção. */
function iconeUsuario(direcao: number | null) {
  const cone =
    direcao == null
      ? ''
      : `<div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from -30deg at 50% 50%, rgba(59,130,246,.35) 0deg 60deg, transparent 60deg)"></div>`;
  return L.divIcon({
    className: '',
    iconSize: [72, 72],
    iconAnchor: [36, 36],
    html: `<div style="position:relative;width:72px;height:72px;transform:rotate(${direcao ?? 0}deg)">${cone}<div style="position:absolute;top:27px;left:27px;width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div></div>`,
  });
}

function EventosDoMapa({
  onLongPress,
  onArrastar,
}: {
  onLongPress: (coordenada: LatLng) => void;
  onArrastar: () => void;
}) {
  useMapEvents({
    // Botão direito no desktop, toque longo no touch.
    contextmenu(e) {
      onLongPress({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
    dragstart: onArrastar,
  });
  return null;
}

export const MapSurface = forwardRef<MapSurfaceHandle, MapSurfaceProps>(function MapSurface(
  {
    regiaoInicial,
    poligonoMunicipio,
    circulos,
    marcadores,
    usuario,
    onLongPressMapa,
    onPressMarcador,
    onArrastar,
    direcao,
    escuro,
  },
  ref,
) {
  const mapRef = useRef<LeafletMap | null>(null);

  useImperativeHandle(ref, () => ({
    animarPara(regiao) {
      mapRef.current?.flyTo([regiao.latitude, regiao.longitude], zoomDaRegiao(regiao));
    },
    seguir(posicao) {
      mapRef.current?.setView([posicao.latitude, posicao.longitude], ZOOM_NAVEGACAO, {
        animate: true,
        duration: 0.7,
      });
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
      zoomControl={false}
      attributionControl={false}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <TileLayer url={escuro ? TILES_ESCURO : TILES_CLARO} noWrap />
      <EventosDoMapa onLongPress={onLongPressMapa} onArrastar={onArrastar} />

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
        <Marker
          key={marcador.key}
          position={[marcador.coordenada.latitude, marcador.coordenada.longitude]}
          icon={iconePino(
            marcador.cor,
            marcador.icone,
            !!marcador.emAlcance,
            !!marcador.selecionado,
          )}
          zIndexOffset={marcador.selecionado ? 200 : marcador.emAlcance ? 100 : 0}
          eventHandlers={{ click: () => onPressMarcador(marcador.key) }}
        />
      ))}

      {usuario ? (
        <>
          {usuario.precisao && usuario.precisao > 15 ? (
            <Circle
              center={[usuario.latitude, usuario.longitude]}
              radius={usuario.precisao}
              pathOptions={{
                color: 'rgba(59,130,246,0.35)',
                weight: 1,
                fillColor: 'rgba(59,130,246,0.12)',
                fillOpacity: 1,
                interactive: false,
              }}
            />
          ) : null}
          <Marker
            position={[usuario.latitude, usuario.longitude]}
            icon={iconeUsuario(direcao)}
            zIndexOffset={300}
            interactive={false}
          />
        </>
      ) : null}
    </MapContainer>
  );
});
