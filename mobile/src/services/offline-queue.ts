/**
 * Fila offline de chamados.
 *
 * O web usa IndexedDB + Background Sync do service worker. No nativo não há
 * service worker, então a fila mora no AsyncStorage e é drenada quando o app
 * volta ao primeiro plano com conexão (ver `useOfflineSync`).
 *
 * A imagem é referenciada pela URI local do picker. Ela vive no diretório de
 * cache do app, que o sistema pode limpar sob pressão de armazenamento; se o
 * arquivo sumir antes do envio, o chamado é enviado sem foto.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';

import type { NovoDefeito } from './api';

const QUEUE_KEY = 'ciu_offline_defeitos';

export type PendingDefeito = NovoDefeito & {
  id: string;
  criado_em: string;
};

export async function getQueue(): Promise<PendingDefeito[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(items: PendingDefeito[]) {
  if (items.length === 0) return AsyncStorage.removeItem(QUEUE_KEY);
  return AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueDefeito(dados: NovoDefeito) {
  const queue = await getQueue();
  queue.push({
    ...dados,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    criado_em: new Date().toISOString(),
  });
  await saveQueue(queue);
}

export async function removeFromQueue(id: string) {
  const queue = await getQueue();
  await saveQueue(queue.filter((item) => item.id !== id));
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/** Descarta a foto quando o arquivo de cache já não existe. */
export function withExistingImage(item: PendingDefeito): PendingDefeito {
  if (!item.imagem) return item;
  try {
    return new File(item.imagem.uri).exists ? item : { ...item, imagem: null };
  } catch {
    return { ...item, imagem: null };
  }
}
