/**
 * Abre a navegação passo a passo num app externo. Não vale reimplementar
 * turn-by-turn: Google Maps aceita destino por URL universal (abre o app no
 * celular, o site no desktop) e o Waze tem deep link próprio — mas só para
 * um destino, por isso o roteiro sempre navega até a *próxima* parada.
 */

import * as Linking from 'expo-linking';

import type { LatLng } from '@/utils/geo';

export async function navegarGoogleMaps(destino: LatLng, origem?: LatLng | null) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destino.latitude},${destino.longitude}`,
    travelmode: 'driving',
  });
  if (origem) params.set('origin', `${origem.latitude},${origem.longitude}`);
  await Linking.openURL(`https://www.google.com/maps/dir/?${params.toString()}`);
}

export async function navegarWaze(destino: LatLng) {
  const ll = `${destino.latitude},${destino.longitude}`;
  const app = `waze://?ll=${ll}&navigate=yes`;
  try {
    if (await Linking.canOpenURL(app)) {
      await Linking.openURL(app);
      return;
    }
  } catch {
    // Sem o app: cai no link universal abaixo.
  }
  await Linking.openURL(`https://waze.com/ul?ll=${ll}&navigate=yes`);
}
