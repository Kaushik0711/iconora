import React from 'react';
import Link from 'next/link';
import { Container } from '../shell/Container';
import { POPULAR_LIBRARIES, LibraryCardItem } from '@/data/libraries';

// Bespoke, lightweight SVG brand marks for the 8 libraries
function LibraryMark({ id }: { id: string }) {
  switch (id) {
    case 'lucide':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'heroicons':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
          <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
          <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        </svg>
      );
    case 'tabler':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );
    case 'phosphor':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      );
    case 'remix':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
        </svg>
      );
    case 'feather':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
      );
    case 'bootstrap':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M8 8h4.5a2.5 2.5 0 0 1 0 5H8z" />
          <path d="M8 13h5a2.5 2.5 0 0 1 0 5H8z" />
        </svg>
      );
    case 'simple-icons':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
        </svg>
      );
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
        </svg>
      );
  }
}

export function LibraryCards() {
  return (
    <section className="py-7 sm:py-9" aria-labelledby="libraries-heading">
      <Container>
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-1">
              <span>Curated Icon Sets</span>
            </div>
            <h2 id="libraries-heading" className="text-xl sm:text-2xl font-extrabold text-[var(--color-heading)] tracking-tight">
              Popular Icon Libraries
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-body)] mt-0.5 max-w-xl">
              Verified open-source collections ready for real-time browsing, customization, and export.
            </p>
          </div>

          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-[var(--radius-sm)] py-0.5"
          >
            <span>View All Libraries</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        {/* 4-Column Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {POPULAR_LIBRARIES.map((lib: LibraryCardItem) => (
            <article
              key={lib.id}
              className="group relative flex flex-col justify-between p-5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-[0_8px_25px_-6px_rgba(96,69,255,0.12)] transition-all duration-200"
            >
              <div>
                {/* Card Top: Mark and Tags */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-heading)] group-hover:text-[var(--color-primary)] group-hover:bg-[var(--color-primary-light)] transition-colors duration-200 shadow-2xs">
                    <LibraryMark id={lib.id} />
                  </div>

                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] border border-[var(--color-border)]">
                    {lib.licenseSpdx}
                  </span>
                </div>

                {/* Library Title */}
                <h3 className="text-base font-bold text-[var(--color-heading)] tracking-tight group-hover:text-[var(--color-primary)] transition-colors">
                  {lib.name}
                </h3>

                {/* Visual Style Tag */}
                <p className="text-[11px] font-semibold text-[var(--color-text-muted)] mt-0.5 mb-2">
                  {lib.visualTag}
                </p>

                {/* Description */}
                <p className="text-xs text-[var(--color-text-body)] leading-relaxed mb-4 line-clamp-2">
                  {lib.description}
                </p>

                {lib.trademarkNotice && (
                  <p className="text-[10px] text-[var(--color-text-muted)] italic mb-3 leading-tight">
                    * {lib.trademarkNotice}
                  </p>
                )}
              </div>

              {/* Card Footer: Canonical link & upstream repo */}
              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between mt-auto">
                <Link
                  href={lib.collectionPath}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
                >
                  <span>Explore Library</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                <a
                  href={lib.upstreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-heading)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded p-0.5"
                  title={`View ${lib.name} upstream source`}
                  aria-label={`${lib.name} repository`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
