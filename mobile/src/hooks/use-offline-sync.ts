/**
 * Drena a fila offline — porte de `frontend/src/hooks/useOfflineSync.js`.
 *
 * No web o service worker fazia isso via Background Sync. Aqui a sincronização
 * roda quando o app volta ao primeiro plano e quando a conexão retorna, já que
 * um app nativo não tem worker rodando em segundo plano.
 */

import * as Network from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { postDefeitoDireto } from '@/services/api';
import { getQueue, removeFromQueue, withExistingImage } from '@/services/offline-queue';
import { getTokenSync } from '@/services/storage';

export type SyncState = {
  pendentes: number;
  sincronizando: boolean;
  online: boolean;
};

export function useOfflineSync() {
  const [state, setState] = useState<SyncState>({
    pendentes: 0,
    sincronizando: false,
    online: true,
  });

  const atualizarPendentes = useCallback(async () => {
    const queue = await getQueue();
    setState((prev) => ({ ...prev, pendentes: queue.length }));
    return queue;
  }, []);

  const sincronizar = useCallback(async () => {
    // Sem token não adianta tentar: o backend exige autenticação para criar.
    if (!getTokenSync()) return;

    const status = await Network.getNetworkStateAsync();
    const online = !!status.isConnected && status.isInternetReachable !== false;
    setState((prev) => ({ ...prev, online }));
    if (!online) return;

    const queue = await atualizarPendentes();
    if (queue.length === 0) return;

    setState((prev) => ({ ...prev, sincronizando: true }));
    try {
      for (const item of queue) {
        const pronto = withExistingImage(item);
        if (!pronto.imagem) {
          // A foto do cache sumiu e o backend não aceita chamado sem ela:
          // descarta para não travar a fila num 400 eterno.
          await removeFromQueue(item.id);
          continue;
        }
        try {
          await postDefeitoDireto(pronto);
          await removeFromQueue(item.id);
        } catch {
          // Falhou (rede ou validação): para aqui e tenta de novo na próxima vez.
          break;
        }
      }
    } finally {
      await atualizarPendentes();
      setState((prev) => ({ ...prev, sincronizando: false }));
    }
  }, [atualizarPendentes]);

  useEffect(() => {
    // `sincronizar` é assíncrona e só chama setState depois de consultar a
    // rede — o lint não consegue enxergar isso e acusa render em cascata.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    sincronizar();

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') sincronizar();
    });

    const networkSubscription = Network.addNetworkStateListener((status) => {
      const online = !!status.isConnected && status.isInternetReachable !== false;
      setState((prev) => ({ ...prev, online }));
      if (online) sincronizar();
    });

    return () => {
      subscription.remove();
      networkSubscription.remove();
    };
  }, [sincronizar]);

  return { ...state, sincronizar, atualizarPendentes };
}
