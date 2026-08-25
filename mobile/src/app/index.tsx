/**
 * Porta de entrada: manda para o mapa.
 *
 * O mapa é público (como no web, onde `/mapa` mostra o heatmap sem login), e
 * as telas que exigem sessão redirecionam para o login por conta própria.
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/mapa" />;
}
