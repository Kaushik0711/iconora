'use client';

import React from 'react';

interface PaginationControlsProps {
  readonly page: number;
  readonly totalPages?: number;
  readonly total?: number;
  readonly hasMore: boolean;
  readonly onPageChange: (newPage: number) => void;
  readonly isFilteredContinuation?: boolean;
  readonly onLoadMore?: () => void;
  readonly isLoadingMore?: boolean;
  readonly iconCount?: number;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  hasMore,
  onPageChange,
  isFilteredContinuation = false,
  onLoadMore,
  isLoadingMore = false,
  iconCount,
}: PaginationControlsProps) {
  // If in filtered cursor continuation mode:
  if (isFilteredContinuation || typeof totalPages !== 'number') {
    if (hasMore) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8 border-t border-[var(--color-border)] mt-8 w-full">
          {typeof iconCount === 'number' && (
            <div className="text-xs text-[var(--color-text-muted)] font-medium">
              Showing <span className="font-semibold text-[var(--color-heading)]">{iconCount}</span> matching icons
            </div>
          )}
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold shadow-xs hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            aria-label="Load more matching icons"
          >
            {isLoadingMore ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading more icons...</span>
              </>
            ) : (
              <>
                <span>Load More Icons</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </>
            )}
          </button>
        </div>
      );
    }

    // Filtered continuation reached the end
    return (
      <div className="flex justify-center items-center py-6 text-xs text-[var(--color-text-muted)] font-medium border-t border-[var(--color-border)] mt-8">
        Showing all {typeof iconCount === 'number' ? `${iconCount} ` : ''}matching icons (End of results)
      </div>
    );
  }

  // Exact total known and 1 or fewer pages
  if (typeof totalPages === 'number' && totalPages <= 1) {
    return (
      <div className="flex justify-center items-center py-6 text-xs text-[var(--color-text-muted)] font-medium border-t border-[var(--color-border)] mt-8">
        Showing all {total?.toLocaleString() ?? ''} matching icons
      </div>
    );
  }

  // Exact numbered pagination for unfiltered search
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 py-8 border-t border-[var(--color-border)] mt-8"
      aria-label="Pagination Navigation"
    >
      <div className="text-xs text-[var(--color-text-muted)]">
        {typeof totalPages === 'number' && typeof total === 'number' ? (
          <>
            Page <span className="font-semibold text-[var(--color-heading)]">{page}</span> of{' '}
            <span className="font-semibold text-[var(--color-heading)]">{totalPages}</span>{' '}
            ({total.toLocaleString()} total icons)
          </>
        ) : (
          <>
            Page <span className="font-semibold text-[var(--color-heading)]">{page}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
          aria-label="Go to previous page"
        >
          &larr; Previous
        </button>

        {/* Page indicator pills when exact page count is known */}
        {typeof totalPages === 'number' && (
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let p = page - 2 + i;
              if (p < 1) p = i + 1;
              if (p > totalPages) return null;

              const isCurrent = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-md text-xs font-semibold flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer ${
                    isCurrent
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-secondary)]'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={typeof totalPages === 'number' ? page >= totalPages : !hasMore}
          className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
          aria-label="Go to next page"
        >
          Next &rarr;
        </button>
      </div>
    </nav>
  );
}
