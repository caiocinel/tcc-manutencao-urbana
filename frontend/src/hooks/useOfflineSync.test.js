// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';

function makeWindowStub() {
  const listeners = {};
  return {
    document: typeof globalThis.document !== 'undefined' ? globalThis.document : undefined,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: () => {},
    dispatch: (type) => { listeners[type]?.(); },
  };
}

function mockIndexedDBCount(count) {
  const countReq = { onsuccess: null, onerror: null, result: count };
  const store = { count: () => { setTimeout(() => countReq.onsuccess?.(), 0); return countReq; } };
  const tx = { objectStore: () => store };
  const db = { transaction: () => tx, close: () => {} };
  const req = {
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: db,
  };
  const open = vi.fn(() => {
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  });
  open.createObjectStore = () => {};
  vi.stubGlobal('indexedDB', { open });
  if (typeof window !== 'undefined') window.indexedDB = { open };
  return { open, req };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  const win = makeWindowStub();
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('serviceWorker', undefined);
  vi.stubGlobal('SyncManager', undefined);
  vi.stubGlobal('indexedDB', undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useOfflineSync', () => {
  it('retorna online=true e pending=0 sem IndexedDB', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.online).toBe(true);
    expect(result.current.pending).toBe(0);
  });

  it('conta pendentes quando o store tem 2 registros', async () => {
    mockIndexedDBCount(2);
    const { result } = renderHook(() => useOfflineSync());
    await waitFor(() => expect(result.current.pending).toBe(2));
  });

  it('responde ao evento offline', () => {
    const win = window;
    const { result } = renderHook(() => useOfflineSync());
    act(() => {
      win.dispatch('offline');
    });
    expect(result.current.online).toBe(false);
  });
});
