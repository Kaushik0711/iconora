'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  getStoredTheme,
  setStoredTheme,
  resolveTheme,
  applyTheme,
  THEME_CHANGE_EVENT,
  type ThemePreference,
  type ResolvedTheme,
} from './theme';

function subscribeTheme(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener(THEME_CHANGE_EVENT, callback);

  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const handleMedia = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
      callback();
    }
  };

  if (media) {
    if (media.addEventListener) {
      media.addEventListener('change', handleMedia);
    } else if (media.addListener) {
      media.addListener(handleMedia);
    }
  }

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    if (media) {
      if (media.removeEventListener) {
        media.removeEventListener('change', handleMedia);
      } else if (media.removeListener) {
        media.removeListener(handleMedia);
      }
    }
  };
}

function getThemeSnapshot(): ThemePreference {
  return getStoredTheme();
}

function getServerSnapshot(): ThemePreference {
  return 'system';
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerSnapshot
  );

  const resolvedTheme: ResolvedTheme = resolveTheme(theme);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setStoredTheme(newTheme);
  }, []);

  const cycleTheme = useCallback(() => {
    if (theme === 'system') {
      setStoredTheme('light');
    } else if (theme === 'light') {
      setStoredTheme('dark');
    } else {
      setStoredTheme('system');
    }
  }, [theme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    cycleTheme,
  };
}
