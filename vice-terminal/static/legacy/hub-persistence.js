/* Versioned, additive migration for the preserved Hub island. */
(() => {
  'use strict';
  const DB_NAME = 'vice-suite';
  const DB_VERSION = 1;
  const LEGACY_KEY = 'viceHub.v1';
  let queuedRaw = null;
  let mirrorTimer = null;

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

  function parseLegacySnapshot(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.layouts || typeof parsed.layouts !== 'object') return null;
      return { raw, parsed };
    } catch { return null; }
  }

  function readLegacySnapshot() {
    try { return parseLegacySnapshot(localStorage.getItem(LEGACY_KEY)); }
    catch { return null; }
  }

  async function mirrorLegacySnapshot(raw) {
    const snapshot = raw ? parseLegacySnapshot(raw) : readLegacySnapshot();
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

  function scheduleMirror(raw) {
    if (!parseLegacySnapshot(raw)) return;
    queuedRaw = raw;
    clearTimeout(mirrorTimer);
    mirrorTimer = setTimeout(() => {
      const next = queuedRaw;
      queuedRaw = null;
      void mirrorLegacySnapshot(next).catch(() => {});
    }, 300);
  }

  // The preserved Hub calls this only after its own localStorage commit. It
  // remains best-effort: the legacy local-first UX never waits on IndexedDB.
  window.viceHubPersistMirror = scheduleMirror;

  async function restoreLegacySnapshot() {
    // localStorage remains authoritative while it exists; never overwrite a
    // current or corrupt record with a mirror during normal startup.
    try { if (localStorage.getItem(LEGACY_KEY) !== null) return false; }
    catch { return false; }
    const db = await openDatabase();
    try {
      const record = await new Promise((resolve, reject) => {
        const request = db.transaction('hubLayouts', 'readonly').objectStore('hubLayouts').get('legacy-v1');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
      });
      const snapshot = parseLegacySnapshot(record?.raw);
      if (!snapshot) return false;
      try { localStorage.setItem(LEGACY_KEY, snapshot.raw); }
      catch { return false; }
      return true;
    } finally { db.close(); }
  }

  // Hub awaits this only when its normal local record is absent. The promise
  // is intentionally public to the immediately-following legacy script, not
  // to a remote service or execution surface.
  window.viceHubRestorePromise = restoreLegacySnapshot().catch(() => false);

  // Never delay a Hub boot that already has a localStorage record.
  void mirrorLegacySnapshot().catch(() => {});
})();
