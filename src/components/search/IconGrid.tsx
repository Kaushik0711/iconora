'use client';

import React from 'react';
import type { SearchIconItem } from '@/modules/search/types';
import { IconCard } from './IconCard';

interface IconGridProps {
  readonly icons: readonly SearchIconItem[];
  readonly isLoading: boolean;
}

export function IconGrid({ icons, isLoading }: IconGridProps) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
        aria-busy="true"
        aria-label="Loading icon results"
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-between p-4 rounded-xl bg-white border border-[var(--color-border)] animate-pulse"
          >
            <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-secondary)] mb-2" />
            <div className="w-16 h-3 rounded bg-[var(--color-bg-secondary)] mb-1" />
            <div className="w-10 h-2 rounded bg-[var(--color-bg-secondary)]" />
            <div className="w-full h-6 rounded bg-[var(--color-bg-secondary)] mt-3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
      role="region"
      aria-label="Search results"
    >
      {icons.map((icon) => (
        <IconCard key={icon.canonicalId} icon={icon} />
      ))}
    </div>
  );
}

