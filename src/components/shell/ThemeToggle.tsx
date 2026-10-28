'use client';

import React from 'react';
import { useTheme } from '@/modules/theme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, cycleTheme } = useTheme();

  const getLabel = () => {
    if (theme === 'system') return `Theme: System (${resolvedTheme})`;
    if (theme === 'dark') return 'Theme: Dark';
    return 'Theme: Light';
  };

  const getNextLabel = () => {
    if (theme === 'system') return 'Switch to light mode';
    if (theme === 'light') return 'Switch to dark mode';
    return 'Switch to system theme';
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`${getLabel()}. ${getNextLabel()}.`}
      title={`${getLabel()} (click to cycle: Light, Dark, System)`}
      className={`relative inline-flex items-center justify-center p-2 min-w-[40px] min-h-[40px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className}`}
    >
      {theme === 'system' ? (
        // Monitor / System Icon
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
      ) : resolvedTheme === 'dark' ? (
        // Moon Icon
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        // Sun Icon
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}

