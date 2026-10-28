'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  getFavoriteCollections,
  toggleFavoriteCollection,
  getFavoriteIcons,
  toggleFavoriteIcon,
  getRecentlyViewedCollections,
  recordRecentlyViewedCollection,
  FAVORITES_CHANGE_EVENT,
  RECENTS_CHANGE_EVENT,
  type RecentCollectionItem,
} from './user-preferences';

const EMPTY_ARRAY: never[] = [];

function subscribeFavorites(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(FAVORITES_CHANGE_EVENT, callback);
  return () => window.removeEventListener(FAVORITES_CHANGE_EVENT, callback);
}

function subscribeRecents(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(RECENTS_CHANGE_EVENT, callback);
  return () => window.removeEventListener(RECENTS_CHANGE_EVENT, callback);
}

// Cached snapshots to maintain referential stability for useSyncExternalStore
let cachedFavoriteCollections: string[] = [];
let rawFavoriteCollectionsKey = '';

function getFavoriteCollectionsSnapshot(): string[] {
  const current = getFavoriteCollections();
  const currentKey = current.join(',');
  if (currentKey !== rawFavoriteCollectionsKey) {
    rawFavoriteCollectionsKey = currentKey;
    cachedFavoriteCollections = current;
  }
  return cachedFavoriteCollections;
}

let cachedFavoriteIcons: string[] = [];
let rawFavoriteIconsKey = '';

function getFavoriteIconsSnapshot(): string[] {
  const current = getFavoriteIcons();
  const currentKey = current.join(',');
  if (currentKey !== rawFavoriteIconsKey) {
    rawFavoriteIconsKey = currentKey;
    cachedFavoriteIcons = current;
  }
  return cachedFavoriteIcons;
}

let cachedRecentCollections: RecentCollectionItem[] = [];
let rawRecentCollectionsKey = '';

function getRecentCollectionsSnapshot(): RecentCollectionItem[] {
  const current = getRecentlyViewedCollections();
  const currentKey = current.map((c) => `${c.prefix}:${c.viewedAt}`).join(',');
  if (currentKey !== rawRecentCollectionsKey) {
    rawRecentCollectionsKey = currentKey;
    cachedRecentCollections = current;
  }
  return cachedRecentCollections;
}

function getServerSnapshot<T>(): T[] {
  return EMPTY_ARRAY as T[];
}

export function useCollectionFavorites() {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoriteCollectionsSnapshot,
    getServerSnapshot<string>
  );

  const toggle = useCallback((prefix: string) => {
    return toggleFavoriteCollection(prefix);
  }, []);

  const isFavorite = useCallback(
    (prefix: string) => {
      return favorites.includes(prefix);
    },
    [favorites]
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite: toggle,
  };
}

export function useRecentlyViewedCollections() {
  const recentCollections = useSyncExternalStore(
    subscribeRecents,
    getRecentCollectionsSnapshot,
    getServerSnapshot<RecentCollectionItem>
  );

  const record = useCallback((prefix: string) => {
    recordRecentlyViewedCollection(prefix);
  }, []);

  return {
    recentCollections,
    recordRecentlyViewed: record,
  };
}

export function useIconFavorites() {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoriteIconsSnapshot,
    getServerSnapshot<string>
  );

  const toggle = useCallback((canonicalId: string) => {
    return toggleFavoriteIcon(canonicalId);
  }, []);

  const isFavorite = useCallback(
    (canonicalId: string) => {
      return favorites.includes(canonicalId);
    },
    [favorites]
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite: toggle,
  };
}

