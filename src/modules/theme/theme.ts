// ==============================================================================
// IconHub Theme Service
// Resilient light/dark/system theme management with zero-flash persistence.
// ==============================================================================

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'iconhub:theme';
export const THEME_CHANGE_EVENT = 'iconhub:theme-changed';

let inMemoryTheme: ThemePreference = 'system';

export function resetThemeMemory(initial: ThemePreference = 'system'): void {
  inMemoryTheme = initial;
}

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const k = '__theme_test__';
    window.localStorage.setItem(k, k);
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getStoredTheme(): ThemePreference {
  if (!isStorageAvailable()) return inMemoryTheme;
  try {
    const val = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
    return inMemoryTheme;
  } catch {
    return inMemoryTheme;
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', preference);
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  return resolved;
}

export function setStoredTheme(preference: ThemePreference): void {
  inMemoryTheme = preference;
  if (isStorageAvailable()) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage quota or disabled fallback
    }
  }

  applyTheme(preference);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: preference }));
  }
}

export function watchSystemTheme(
  targetWindow?: Window | { matchMedia?: (query: string) => MediaQueryList; dispatchEvent?: (e: Event) => boolean }
): () => void {
  const win = targetWindow ?? (typeof window !== 'undefined' ? window : undefined);
  if (!win || typeof win.matchMedia !== 'function') return () => {};

  const media = win.matchMedia('(prefers-color-scheme: dark)');
  const handleMedia = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
      if (typeof win.dispatchEvent === 'function') {
        win.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: 'system' }));
      }
    }
  };

  if (media.addEventListener) {
    media.addEventListener('change', handleMedia);
  } else if (media.addListener) {
    media.addListener(handleMedia);
  }

  return () => {
    if (media.removeEventListener) {
      media.removeEventListener('change', handleMedia);
    } else if (media.removeListener) {
      media.removeListener(handleMedia);
    }
  };
}
