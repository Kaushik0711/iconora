'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/shell/Container';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected errors
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center py-16 sm:py-24">
      <Container>
        <div className="max-w-md mx-auto text-center" role="alert" aria-live="assertive">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-heading)] tracking-tight mb-3">
            Something went wrong
          </h1>

          <p className="text-sm text-[var(--color-text-body)] mb-6 leading-relaxed">
            An unexpected error occurred while rendering this page. You can try recovering by clicking below or returning to the homepage.
          </p>

          {error.message && (
            <div className="mb-6 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-left text-2xs font-mono text-[var(--color-text-muted)] overflow-x-auto max-h-28">
              {error.message}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)] text-xs font-semibold hover:bg-[var(--color-bg-main)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Return Home
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

