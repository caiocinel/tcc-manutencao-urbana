/**
 * Porta de entrada: na primeira vez, o guia de boas-vindas; depois, direto
 * para o mapa (que é público — telas com sessão redirecionam sozinhas).
 */

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { getOnboardingVisto } from '@/services/storage';

export default function Index() {
  const [visto, setVisto] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingVisto()
      .then(setVisto)
      .catch(() => setVisto(true));
  }, []);

  // Splash ainda visível; decide sem piscar tela nenhuma.
  if (visto === null) return null;

  return <Redirect href={visto ? '/(tabs)/mapa' : '/boas-vindas'} />;
}
