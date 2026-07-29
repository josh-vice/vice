/* Versioned, additive migration for the preserved Hub island. */
(() => {
  'use strict';
  const DB_NAME = 'vice-suite';
  const DB_VERSION = 1;
  const LEGACY_KEY = 'viceHub.v1';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('migrations')) db.createObjectStore('migrations', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('hubLayouts')) db.createObjectStore('hubLayouts', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
  }

  function readLegacySnapshot() {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.layouts || typeof parsed.layouts !== 'object') return null;
      return { raw, parsed };
    } catch { return null; }
  }

  async function mirrorLegacySnapshot() {
    const snapshot = readLegacySnapshot();
    if (!snapshot) return;
    const db = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['migrations', 'hubLayouts'], 'readwrite');
        const metadata = { id: 'hub-localstorage-v1', source: LEGACY_KEY, schemaVersion: 1, migratedAt: Date.now() };
        tx.objectStore('hubLayouts').put({ id: 'legacy-v1', schemaVersion: 1, source: LEGACY_KEY, raw: snapshot.raw, payload: snapshot.parsed, mirroredAt: Date.now() });
        tx.objectStore('migrations').put(metadata);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      });
    } finally { db.close(); }
  }

  // Never make Hub boot depend on this best-effort mirror.
  void mirrorLegacySnapshot().catch(() => {});
})();
