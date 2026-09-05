'use client';

import { addFavorite, listFavorites, removeFavorite } from './favoritesApi';

/**
 * Sayfadaki her kalp ikonu kendi GET /favorites isteğini atmasın diye (N+1) —
 * bir kez yüklenir, modül seviyesinde paylaşılır. Context/Provider kurmadan
 * en yalın çözüm; tam sayfa yenilemede sıfırlanır, kabul edilebilir.
 */
let ids: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

async function ensureLoaded(): Promise<Set<string>> {
  if (ids) return ids;
  if (!loadPromise) {
    loadPromise = listFavorites()
      .then((rows) => {
        ids = new Set(rows.map((r) => r.id));
        return ids;
      })
      .catch(() => {
        ids = new Set();
        return ids;
      });
  }
  return loadPromise;
}

export function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getSnapshot(villaId: string) {
  return ids?.has(villaId) ?? false;
}

export function isLoaded() {
  return ids !== null;
}

export function load() {
  return ensureLoaded();
}

export async function toggle(villaId: string) {
  await ensureLoaded();
  const has = ids!.has(villaId);
  // İyimser güncelleme: önce arayüz değişir, istek arka planda gider.
  if (has) ids!.delete(villaId);
  else ids!.add(villaId);
  notify();
  try {
    if (has) await removeFavorite(villaId);
    else await addFavorite(villaId);
  } catch {
    // Başarısızsa geri al.
    if (has) ids!.add(villaId);
    else ids!.delete(villaId);
    notify();
  }
}

/** Girişsiz kullanıcıda 401 gelir — store'u kirletmeden sessizce boş kalır. */
export function reset() {
  ids = null;
  loadPromise = null;
  notify();
}
