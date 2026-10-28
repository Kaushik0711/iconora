// ==============================================================================
// IconHub User Preferences & Local Storage Service
// Resilient, SSR-safe local storage for favorite collections, favorite icons,
// and recently viewed libraries/icons.
// ==============================================================================

const STORAGE_KEYS = {
  FAVORITE_COLLECTIONS: 'iconhub:favorites:collections',
  FAVORITE_ICONS: 'iconhub:favorites:icons',
  RECENT_COLLECTIONS: 'iconhub:recent:collections',
  RECENT_ICONS: 'iconhub:recent:icons',
} as const;

export const FAVORITES_CHANGE_EVENT = 'iconhub:favorites-changed';
export const RECENTS_CHANGE_EVENT = 'iconhub:recents-changed';

export interface RecentCollectionItem {
  readonly prefix: string;
  readonly viewedAt: string;
}

export interface RecentIconItem {
  readonly canonicalId: string;
  readonly prefix: string;
  readonly name: string;
  readonly viewedAt: string;
}

// In-memory fallback if localStorage is disabled, private browsing, or quota exceeded
const memoryStore = new Map<string, string>();

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getItem(key: string): string | null {
  if (!isStorageAvailable()) {
    return memoryStore.get(key) ?? null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function setItem(key: string, value: string): void {
  if (!isStorageAvailable()) {
    memoryStore.set(key, value);
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function removeItem(key: string): void {
  if (!isStorageAvailable()) {
    memoryStore.delete(key);
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    memoryStore.delete(key);
  }
}

function dispatchEvent(eventName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

// ==============================================================================
// Favorite Collections
// ==============================================================================

export function getFavoriteCollections(): string[] {
  const raw = getItem(STORAGE_KEYS.FAVORITE_COLLECTIONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function isFavoriteCollection(prefix: string): boolean {
  if (!prefix) return false;
  const list = getFavoriteCollections();
  return list.includes(prefix);
}

export function toggleFavoriteCollection(prefix: string): boolean {
  if (!prefix) return false;
  const list = getFavoriteCollections();
  const index = list.indexOf(prefix);
  let isNowFav = false;

  if (index >= 0) {
    list.splice(index, 1);
    isNowFav = false;
  } else {
    list.push(prefix);
    isNowFav = true;
  }

  setItem(STORAGE_KEYS.FAVORITE_COLLECTIONS, JSON.stringify(list));
  dispatchEvent(FAVORITES_CHANGE_EVENT);
  return isNowFav;
}

// ==============================================================================
// Favorite Icons
// ==============================================================================

export function getFavoriteIcons(): string[] {
  const raw = getItem(STORAGE_KEYS.FAVORITE_ICONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function isFavoriteIcon(canonicalId: string): boolean {
  if (!canonicalId) return false;
  const list = getFavoriteIcons();
  return list.includes(canonicalId);
}

export function toggleFavoriteIcon(canonicalId: string): boolean {
  if (!canonicalId) return false;
  const list = getFavoriteIcons();
  const index = list.indexOf(canonicalId);
  let isNowFav = false;

  if (index >= 0) {
    list.splice(index, 1);
    isNowFav = false;
  } else {
    list.push(canonicalId);
    isNowFav = true;
  }

  setItem(STORAGE_KEYS.FAVORITE_ICONS, JSON.stringify(list));
  dispatchEvent(FAVORITES_CHANGE_EVENT);
  return isNowFav;
}

// ==============================================================================
// Recently Viewed Collections
// ==============================================================================

const MAX_RECENT_COLLECTIONS = 10;

export function getRecentlyViewedCollections(): RecentCollectionItem[] {
  const raw = getItem(STORAGE_KEYS.RECENT_COLLECTIONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentCollectionItem =>
        Boolean(item && typeof item === 'object' && typeof item.prefix === 'string' && typeof item.viewedAt === 'string')
    );
  } catch {
    return [];
  }
}

export function recordRecentlyViewedCollection(prefix: string): void {
  if (!prefix) return;
  const list = getRecentlyViewedCollections().filter((c) => c.prefix !== prefix);
  const now = new Date().toISOString();
  list.unshift({ prefix, viewedAt: now });

  const trimmed = list.slice(0, MAX_RECENT_COLLECTIONS);
  setItem(STORAGE_KEYS.RECENT_COLLECTIONS, JSON.stringify(trimmed));
  dispatchEvent(RECENTS_CHANGE_EVENT);
}

export function clearRecentlyViewedCollections(): void {
  removeItem(STORAGE_KEYS.RECENT_COLLECTIONS);
  dispatchEvent(RECENTS_CHANGE_EVENT);
}

// ==============================================================================
// Recently Viewed Icons
// ==============================================================================

const MAX_RECENT_ICONS = 20;

export function getRecentlyViewedIcons(): RecentIconItem[] {
  const raw = getItem(STORAGE_KEYS.RECENT_ICONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentIconItem =>
        Boolean(
          item &&
          typeof item === 'object' &&
          typeof item.canonicalId === 'string' &&
          typeof item.prefix === 'string' &&
          typeof item.name === 'string' &&
          typeof item.viewedAt === 'string'
        )
    );
  } catch {
    return [];
  }
}

export function recordRecentlyViewedIcon(canonicalId: string, prefix: string, name: string): void {
  if (!canonicalId || !prefix || !name) return;
  const list = getRecentlyViewedIcons().filter((i) => i.canonicalId !== canonicalId);
  const now = new Date().toISOString();
  list.unshift({ canonicalId, prefix, name, viewedAt: now });

  const trimmed = list.slice(0, MAX_RECENT_ICONS);
  setItem(STORAGE_KEYS.RECENT_ICONS, JSON.stringify(trimmed));
  dispatchEvent(RECENTS_CHANGE_EVENT);
}

export function clearRecentlyViewedIcons(): void {
  removeItem(STORAGE_KEYS.RECENT_ICONS);
  dispatchEvent(RECENTS_CHANGE_EVENT);
}

