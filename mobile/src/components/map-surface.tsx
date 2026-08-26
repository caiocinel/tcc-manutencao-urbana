/**
 * Superfície do mapa — implementação nativa (react-native-maps).
 *
 * A tela do mapa (`app/(tabs)/mapa.tsx`) fala só com esta interface. No web o
 * Metro resolve `map-surface.web.tsx`, que desenha o mesmo conteúdo com
 * Leaflet — `react-native-maps` chama `codegenNativeComponent`, que não existe
 * no react-native-web e quebraria o bundle.
 */

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

/** Zoom de rua ao seguir o usuário (18 ≈ quarteirão inteiro na tela). */
const ZOOM_NAVEGACAO = 18;
const OURO = '#D4AF37';

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
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    animarPara(regiao, duracaoMs = 600) {
      mapRef.current?.animateToRegion(regiao, duracaoMs);
    },
    seguir(posicao) {
      mapRef.current?.animateCamera(
        {
          center: { latitude: posicao.latitude, longitude: posicao.longitude },
          zoom: ZOOM_NAVEGACAO,
          heading: 0,
          pitch: 0,
        },
        { duration: 700 },
      );
    },
  }));

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={regiaoInicial}
      onLongPress={(e) => onLongPressMapa(e.nativeEvent.coordinate)}
      onPanDrag={onArrastar}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
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
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          zIndex={marcador.selecionado ? 2 : marcador.emAlcance ? 1 : 0}>
          <Pino
            cor={marcador.cor}
            icone={marcador.icone}
            emAlcance={!!marcador.emAlcance}
            selecionado={!!marcador.selecionado}
          />
        </Marker>
      ))}

      {usuario ? (
        <>
          {usuario.precisao && usuario.precisao > 15 ? (
            <Circle
              center={{ latitude: usuario.latitude, longitude: usuario.longitude }}
              radius={usuario.precisao}
              strokeColor="rgba(59,130,246,0.35)"
              strokeWidth={1}
              fillColor="rgba(59,130,246,0.12)"
            />
          ) : null}
          {/* Ponto azul com o cone da bússola, como no Google Maps. O cone só
              aparece quando há direção; a rotação gira o marcador inteiro. */}
          <Marker
            coordinate={{ latitude: usuario.latitude, longitude: usuario.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={direcao ?? 0}
            zIndex={3}
            tracksViewChanges={false}>
            <View style={styles.usuarioCaixa}>
              {direcao != null ? <View style={styles.usuarioCone} /> : null}
              <View style={styles.usuarioPonto} />
            </View>
          </Marker>
        </>
      ) : null}
    </MapView>
  );
});

function Pino({
  cor,
  icone,
  emAlcance,
  selecionado,
}: {
  cor: string;
  icone?: string;
  emAlcance: boolean;
  selecionado: boolean;
}) {
  const tamanho = selecionado ? 40 : 30;
  return (
    <View
      style={[
        styles.pino,
        {
          width: tamanho,
          height: tamanho,
          backgroundColor: cor,
          borderColor: emAlcance ? OURO : '#fff',
          borderWidth: emAlcance ? 3 : 2,
        },
      ]}>
      {icone ? <Text style={{ fontSize: tamanho * 0.5 }}>{icone}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pino: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  usuarioCaixa: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Triângulo translúcido saindo do ponto para cima (norte do marcador).
  usuarioCone: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderTopWidth: 0,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(59,130,246,0.28)',
    transform: [{ scaleY: -1 }],
  },
  usuarioPonto: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: '#fff',
  },
});
