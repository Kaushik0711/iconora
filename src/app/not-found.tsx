import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/shell/Container';

export const metadata = {
  title: 'Page Not Found — IconHub',
  description: 'The requested page or icon collection could not be found.',
};

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center py-16 sm:py-24">
      <Container>
        <div className="max-w-lg mx-auto text-center">
          {/* Visual 404 Badge */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shadow-xs">
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

          <span className="font-mono text-xs px-2.5 py-1 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)] mb-3 inline-block">
            404 Error
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-heading)] tracking-tight mb-3">
            Page Not Found
          </h1>

          <p className="text-sm text-[var(--color-text-body)] mb-8 leading-relaxed">
            The page, collection, or icon you are looking for does not exist or may have been moved.
            Explore our curated directory of verified open-source libraries or search for icons.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/search"
              className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Search Icons
            </Link>
            <Link
              href="/collections"
              className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)] text-xs font-semibold hover:bg-[var(--color-bg-main)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Browse Collections
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-transparent text-[var(--color-text-body)] hover:text-[var(--color-heading)] text-xs font-semibold transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

