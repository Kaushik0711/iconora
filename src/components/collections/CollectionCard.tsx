'use client';

import React from 'react';
import Link from 'next/link';
import type { CuratedSource } from '@/modules/registry/types';
import { useCollectionFavorites } from '@/modules/storage';

interface CollectionCardProps {
  source: CuratedSource;
}

export function CollectionCard({ source }: CollectionCardProps) {
  const { isFavorite, toggleFavorite } = useCollectionFavorites();
  const favorited = isFavorite(source.canonicalPrefix);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] p-5 sm:p-6 transition-all duration-200 hover:border-[var(--color-primary)]/40 hover:shadow-sm focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
      <div>
        {/* Header: Title, Prefix, Badges & Favorite Button */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-2xs px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]">
                {source.canonicalPrefix}
              </span>
              <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified
              </span>
              {source.maintenanceStatus === 'archived' && (
                <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-medium border border-amber-500/20">
                  Archived
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-[var(--color-heading)] tracking-tight group-hover:text-[var(--color-primary)] transition-colors truncate">
              <Link
                href={`/collection/${source.canonicalPrefix}`}
                className="focus:outline-none"
              >
                {source.displayName}
              </Link>
            </h3>
          </div>

          {/* Star favorite toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(source.canonicalPrefix);
            }}
            aria-label={favorited ? `Remove ${source.displayName} from favorites` : `Add ${source.displayName} to favorites`}
            aria-pressed={favorited}
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
              favorited
                ? 'border-amber-300 bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:border-amber-700/50'
                : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-amber-500 hover:border-amber-300'
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={favorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        </div>

        {/* Visual Tag */}
        <div className="mb-3">
          <span className="inline-block text-2xs font-semibold px-2 py-0.5 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            {source.visualTag}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--color-text-body)] line-clamp-2 leading-relaxed mb-4">
          {source.description}
        </p>

        {/* Supported Styles & Stats Row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {source.verifiedTotal && (
            <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-heading)] border border-[var(--color-border)]">
              {source.verifiedTotal.toLocaleString()} icons
            </span>
          )}
          <span className="text-2xs font-medium px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
            {source.license.spdxId}
          </span>
          {source.license.commercialUse === 'allowed' ? (
            <span className="text-2xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Commercial Free
            </span>
          ) : (
            <span className="text-2xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-700">
              Restricted Use
            </span>
          )}
          {source.license.attributionTerms === 'not_required' ? (
            <span className="text-2xs font-medium px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400">
              No Attr. Req.
            </span>
          ) : (
            <span className="text-2xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-700">
              Attr. Req.
            </span>
          )}
        </div>
      </div>

      {/* Card Footer: Action links */}
      <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2 mt-2">
        <Link
          href={`/collection/${source.canonicalPrefix}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded"
        >
          Browse Icons
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <div className="flex items-center gap-2 text-2xs text-[var(--color-text-muted)]">
          {source.upstreamUrl && (
            <a
              href={source.upstreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Official website for ${source.displayName} (opens in new tab)`}
              className="hover:text-[var(--color-heading)] transition-colors p-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>
          )}
          {source.repositoryUrl && (
            <a
              href={source.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Source repository for ${source.displayName} (opens in new tab)`}
              className="hover:text-[var(--color-heading)] transition-colors p-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
