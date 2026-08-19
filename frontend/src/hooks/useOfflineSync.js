import { useEffect, useState, useCallback } from 'react';

function countPending() {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) return resolve(0);
    const req = indexedDB.open('ciu-offline', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('defeitos', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('defeitos', 'readonly');
        const count = tx.objectStore('defeitos').count();
        count.onsuccess = () => { db.close(); resolve(count.result); };
        count.onerror = () => { db.close(); resolve(0); };
      } catch { db.close(); resolve(0); }
    };
    req.onerror = () => resolve(0);
  });
}

export function useOfflineSync() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const n = await countPending();
    setPending(n);
    if (n > 0 && navigator.onLine && 'serviceWorker' in navigator && 'SyncManager' in window) {
      setSyncing(true);
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-defeitos');
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refresh();
    const t = setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(t);
    };
  }, [refresh]);

  return { pending, online, syncing };
}