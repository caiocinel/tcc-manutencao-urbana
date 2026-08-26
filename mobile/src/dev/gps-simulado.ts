/**
 * GPS simulado — só em desenvolvimento.
 *
 * Um store minúsculo que o `useLocalizacao` consulta: enquanto `ativo`, a
 * posição e a bússola vêm daqui em vez do aparelho. Quem alimenta é o painel
 * `GpsJoystick` (joystick para andar, campos de lat/lng para teleportar).
 *
 * Nada aqui roda em produção: o painel só é montado sob `__DEV__`, e sem ele
 * o store fica inerte (`ativo = false`).
 */

import type { Posicao } from '@/hooks/use-localizacao';

export type EstadoSimulado = {
  ativo: boolean;
  posicao: Posicao | null;
  /** Para onde o "aparelho" aponta, em graus (0 = norte). */
  bussola: number | null;
};

type Ouvinte = (estado: EstadoSimulado) => void;

let estado: EstadoSimulado = { ativo: false, posicao: null, bussola: null };
const ouvintes = new Set<Ouvinte>();

function emitir() {
  for (const ouvinte of ouvintes) ouvinte(estado);
}

export const gpsSimulado = {
  get: () => estado,

  subscribe(ouvinte: Ouvinte) {
    ouvintes.add(ouvinte);
    ouvinte(estado);
    return () => {
      ouvintes.delete(ouvinte);
    };
  },

  ativar(inicial: { latitude: number; longitude: number }) {
    estado = {
      ativo: true,
      bussola: estado.bussola ?? 0,
      posicao: {
        latitude: inicial.latitude,
        longitude: inicial.longitude,
        precisao: 5,
        heading: null,
        timestamp: Date.now(),
      },
    };
    emitir();
  },

  desativar() {
    estado = { ...estado, ativo: false };
    emitir();
  },

  /** Teleporta para uma coordenada (mantém a bússola). */
  irPara(latitude: number, longitude: number) {
    if (!estado.posicao) return;
    estado = {
      ...estado,
      posicao: { ...estado.posicao, latitude, longitude, heading: null, timestamp: Date.now() },
    };
    emitir();
  },

  /**
   * Anda `metros` no rumo `bearing` (graus). O rumo vira também a bússola e o
   * `heading` do GPS, como aconteceria num aparelho em movimento.
   */
  andar(metros: number, bearing: number) {
    if (!estado.posicao) return;
    const { latitude, longitude } = estado.posicao;
    const rad = (bearing * Math.PI) / 180;
    const dLat = (metros * Math.cos(rad)) / 111000;
    const dLng =
      (metros * Math.sin(rad)) / (111000 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.2));
    const rumo = ((bearing % 360) + 360) % 360;
    estado = {
      ...estado,
      bussola: rumo,
      posicao: {
        ...estado.posicao,
        latitude: latitude + dLat,
        longitude: longitude + dLng,
        heading: rumo,
        timestamp: Date.now(),
      },
    };
    emitir();
  },

  /** Só gira o "aparelho", sem sair do lugar. */
  virar(bearing: number) {
    estado = { ...estado, bussola: ((bearing % 360) + 360) % 360 };
    emitir();
  },
};
