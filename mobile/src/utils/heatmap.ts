/**
 * Mapa de calor.
 *
 * O web usa `leaflet.heat`, que borra os pontos num canvas. O react-native-maps
 * só traz `Heatmap` no provider Google (indisponível no Apple Maps), então aqui
 * a densidade é aproximada agrupando os chamados numa grade e desenhando um
 * círculo translúcido por célula, com raio e cor proporcionais ao peso.
 */

import type { Defeito } from '@/types';

export type HeatCell = {
  key: string;
  latitude: number;
  longitude: number;
  peso: number;
};

/** ~110m por 0.001 grau de latitude; a grade fica nessa ordem de grandeza. */
const PRECISAO_GRAU = 0.002;

export function agruparParaHeatmap(defeitos: Defeito[]): HeatCell[] {
  const celulas = new Map<string, HeatCell>();

  for (const d of defeitos) {
    if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') continue;
    const lat = Math.round(d.latitude / PRECISAO_GRAU) * PRECISAO_GRAU;
    const lng = Math.round(d.longitude / PRECISAO_GRAU) * PRECISAO_GRAU;
    const key = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const atual = celulas.get(key);
    if (atual) atual.peso += 1;
    else celulas.set(key, { key, latitude: lat, longitude: lng, peso: 1 });
  }

  return [...celulas.values()];
}

/** Gradiente frio -> quente, equivalente à escala padrão do leaflet.heat. */
export function corDoPeso(peso: number, pesoMaximo: number) {
  const t = pesoMaximo <= 1 ? 0.35 : Math.min(peso / pesoMaximo, 1);
  if (t < 0.25) return 'rgba(74,144,217,0.35)';
  if (t < 0.5) return 'rgba(212,175,55,0.35)';
  if (t < 0.75) return 'rgba(249,115,22,0.40)';
  return 'rgba(207,68,68,0.45)';
}

/** Raio em metros: células mais densas ocupam mais área, como no blur do web. */
export function raioDoPeso(peso: number, pesoMaximo: number) {
  const t = pesoMaximo <= 1 ? 0.4 : Math.min(peso / pesoMaximo, 1);
  return 120 + t * 260;
}
