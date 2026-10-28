import React, { Suspense } from 'react';
import { SearchExplorer } from '@/components/search/SearchExplorer';

export const metadata = {
  title: 'Icon Explorer — Search & Filter Icons — IconHub',
  description:
    'Search, filter, and discover thousands of open-source vector icons across 14 verified collections.',
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-[var(--color-text-muted)] animate-pulse">
          Loading Icon Explorer...
        </div>
      }
    >
      <SearchExplorer />
    </Suspense>
  );
}

