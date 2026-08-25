/**
 * Contrato compartilhado entre as duas implementações do mapa
 * (`map-surface.tsx` nativo e `map-surface.web.tsx`).
 *
 * Fica num arquivo só de tipos para que a tela possa importá-lo sem arrastar
 * junto a implementação da outra plataforma.
 */

import type { LatLng } from '@/utils/geo';

export type Regiao = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type CirculoMapa = {
  key: string;
  centro: LatLng;
  /** Raio em metros. */
  raio: number;
  corPreenchimento: string;
  corBorda?: string;
  larguraBorda?: number;
};

export type MarcadorMapa = {
  key: string;
  coordenada: LatLng;
  cor: string;
};

export type MapSurfaceProps = {
  regiaoInicial: Regiao;
  /** Anel externo do perímetro municipal; o entorno é escurecido. */
  poligonoMunicipio: LatLng[] | null;
  circulos: CirculoMapa[];
  marcadores: MarcadorMapa[];
  onPressMapa: (coordenada: LatLng) => void;
  onPressMarcador: (key: string) => void;
  escuro: boolean;
  mostrarUsuario: boolean;
};

export type MapSurfaceHandle = {
  animarPara: (regiao: Regiao, duracaoMs?: number) => void;
};
