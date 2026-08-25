/**
 * Superfície do mapa — implementação nativa (react-native-maps).
 *
 * A tela do mapa (`app/(tabs)/mapa.tsx`) fala só com esta interface. No web o
 * Metro resolve `map-surface.web.tsx`, que desenha o mesmo conteúdo com
 * Leaflet — `react-native-maps` chama `codegenNativeComponent`, que não existe
 * no react-native-web e quebraria o bundle.
 */

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polygon } from 'react-native-maps';

import { MAPA_ESTILO_ESCURO } from '@/constants/map-style';
import { Radius } from '@/constants/theme';

import type { MapSurfaceHandle, MapSurfaceProps } from './map-surface.types';

/** Anel que cobre o mundo; com o município como buraco, escurece o entorno. */
const ANEL_MUNDO = [
  { latitude: 85, longitude: -180 },
  { latitude: 85, longitude: 180 },
  { latitude: -85, longitude: 180 },
  { latitude: -85, longitude: -180 },
];

export const MapSurface = forwardRef<MapSurfaceHandle, MapSurfaceProps>(function MapSurface(
  {
    regiaoInicial,
    poligonoMunicipio,
    circulos,
    marcadores,
    onPressMapa,
    onPressMarcador,
    escuro,
    mostrarUsuario,
  },
  ref,
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    animarPara(regiao, duracaoMs = 600) {
      mapRef.current?.animateToRegion(regiao, duracaoMs);
    },
  }));

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={regiaoInicial}
      onPress={(e) => onPressMapa(e.nativeEvent.coordinate)}
      showsUserLocation={mostrarUsuario}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      userInterfaceStyle={escuro ? 'dark' : 'light'}
      customMapStyle={escuro ? MAPA_ESTILO_ESCURO : []}>
      {poligonoMunicipio ? (
        <>
          <Polygon
            coordinates={poligonoMunicipio}
            strokeColor="#D4A017"
            strokeWidth={2}
            fillColor="rgba(180,140,50,0.15)"
          />
          <Polygon
            coordinates={ANEL_MUNDO}
            holes={[poligonoMunicipio]}
            strokeColor="transparent"
            fillColor="rgba(0,0,0,0.45)"
          />
        </>
      ) : null}

      {circulos.map((circulo) => (
        <Circle
          key={circulo.key}
          center={circulo.centro}
          radius={circulo.raio}
          strokeColor={circulo.corBorda ?? 'transparent'}
          strokeWidth={circulo.larguraBorda ?? 0}
          fillColor={circulo.corPreenchimento}
        />
      ))}

      {marcadores.map((marcador) => (
        <Marker
          key={marcador.key}
          coordinate={marcador.coordenada}
          onPress={() => onPressMarcador(marcador.key)}
          tracksViewChanges={false}>
          <View style={[styles.marcador, { backgroundColor: marcador.cor }]} />
        </Marker>
      ))}
    </MapView>
  );
});

const styles = StyleSheet.create({
  marcador: {
    width: 14,
    height: 14,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
