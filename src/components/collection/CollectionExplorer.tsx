'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { CuratedSource } from '@/modules/registry/types';
import type { SearchResponse, StyleFilter, SearchIconItem } from '@/modules/search/types';
import { IconGrid } from '@/components/search/IconGrid';
import { PaginationControls } from '@/components/search/PaginationControls';
import { useCollectionFavorites, recordRecentlyViewedCollection } from '@/modules/storage';
import { useSearchKeyboardShortcut } from '@/modules/keyboard';

interface CollectionExplorerProps {
  readonly source: CuratedSource;
}

export function CollectionExplorer({ source }: CollectionExplorerProps) {
  const { isFavorite, toggleFavorite } = useCollectionFavorites();
  const isFav = isFavorite(source.canonicalPrefix);

  // Record this collection in recently viewed on mount
  useEffect(() => {
    recordRecentlyViewedCollection(source.canonicalPrefix);
  }, [source.canonicalPrefix]);

  // Local browsing state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeStyle, setActiveStyle] = useState<StyleFilter>('all');
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [accumulatedIcons, setAccumulatedIcons] = useState<readonly SearchIconItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useSearchKeyboardShortcut({
    inputRef: searchInputRef,
    onEscape: () => setSearchInput(''),
  });

  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const continuationAbortRef = useRef<AbortController | null>(null);
  const requestGenRef = useRef(0);

  // Fetch icons for this collection
  const fetchIcons = useCallback(
    async (q: string, style: StyleFilter, targetPage: number, targetCursor?: number) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (continuationAbortRef.current) {
        continuationAbortRef.current.abort();
        continuationAbortRef.current = null;
        setIsLoadingMore(false);
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentGen = ++requestGenRef.current;

      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('source', source.canonicalPrefix);
      if (q) params.set('q', q);
      if (style !== 'all') params.set('style', style);
      params.set('page', String(targetPage));
      params.set('limit', '36');
      if (typeof targetCursor === 'number' && targetCursor >= 0) {
        params.set('cursor', String(targetCursor));
      }

      try {
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (currentGen !== requestGenRef.current) return;

        if (response.status === 429) {
          setError('API rate limit reached. Please wait a moment before trying again.');
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch collection icons (HTTP ${response.status})`);
        }

        const resData: SearchResponse = await response.json();
        if (currentGen === requestGenRef.current) {
          setData(resData);
          setAccumulatedIcons(resData.icons);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (currentGen === requestGenRef.current) {
          setError((err as Error)?.message || 'Failed to fetch collection icons.');
        }
      } finally {
        if (currentGen === requestGenRef.current) {
          setIsLoading(false);
        }
      }
    },
    [source.canonicalPrefix]
  );

  // Trigger search on query, style, or page change with 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = searchInput.trim();
      setDebouncedQuery(q);
      fetchIcons(q, activeStyle, page, cursor);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, activeStyle, page, cursor, fetchIcons]);

  // Load more continuation handler
  const handleLoadMore = useCallback(async () => {
    if (!data?.hasMore || isLoadingMore) return;

    if (continuationAbortRef.current) {
      continuationAbortRef.current.abort();
    }
    const contController = new AbortController();
    continuationAbortRef.current = contController;
    const currentGen = requestGenRef.current;

    setIsLoadingMore(true);

    const params = new URLSearchParams();
    params.set('source', source.canonicalPrefix);
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (activeStyle !== 'all') params.set('style', activeStyle);
    params.set('page', String(page + 1));
    params.set('limit', '36');
    if (typeof data.nextCursor === 'number') {
      params.set('cursor', String(data.nextCursor));
    }

    try {
      const response = await fetch(`/api/search?${params.toString()}`, {
        signal: contController.signal,
      });

      if (currentGen !== requestGenRef.current) return;

      if (!response.ok) {
        throw new Error('Failed to load additional icons.');
      }

      const resData: SearchResponse = await response.json();
      if (currentGen === requestGenRef.current) {
        setAccumulatedIcons((prev) => {
          const seen = new Set(prev.map((i) => i.canonicalId));
          const newUnique = resData.icons.filter((i) => !seen.has(i.canonicalId));
          return [...prev, ...newUnique];
        });
        setData(resData);
        setPage((p) => p + 1);
        setCursor(resData.nextCursor);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
    } finally {
      if (currentGen === requestGenRef.current) {
        setIsLoadingMore(false);
        continuationAbortRef.current = null;
      }
    }
  }, [data, isLoadingMore, source.canonicalPrefix, debouncedQuery, activeStyle, page]);

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Collection Verified Metadata Header & Transparency Card */}
      <section aria-labelledby="heading-collection-meta" className="flex flex-col gap-6">
        {/* Top Badges & Favorite Button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-primary)] font-bold border border-[var(--color-border)]">
              prefix: {source.canonicalPrefix}
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Verified Source
            </span>
            {source.verifiedTotal && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                {source.verifiedTotal.toLocaleString()} verified icons
              </span>
            )}
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-heading)] border border-[var(--color-border)]">
              License: {source.license.spdxId}
            </span>
          </div>

          {/* Favorite Library Button */}
          <button
            type="button"
            onClick={() => toggleFavorite(source.canonicalPrefix)}
            aria-label={isFav ? `Remove ${source.displayName} from favorites` : `Add ${source.displayName} to favorites`}
            aria-pressed={isFav}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
              isFav
                ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:border-amber-600'
                : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-heading)] hover:border-amber-400 hover:text-amber-500'
            }`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={isFav ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{isFav ? 'Favorited' : 'Favorite Library'}</span>
          </button>
        </div>

        {/* Title & Description */}
        <div>
          <h1 id="heading-collection-meta" className="text-3xl sm:text-4xl font-extrabold text-[var(--color-heading)] tracking-tight mb-3">
            {source.displayName} Icons
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-body)] max-w-3xl leading-relaxed">
            {source.description}
          </p>
        </div>

        {/* Licensing & Upstream Transparency Grid */}
        <div className="p-5 sm:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-heading)] mb-4">
            Licensing Transparency &amp; Upstream Attribution
          </h2>

          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <dt className="text-[var(--color-text-muted)] font-medium">Artwork License</dt>
              <dd className="font-semibold text-[var(--color-heading)] mt-0.5">
                {source.license.title} ({source.license.spdxId})
              </dd>
            </div>

            <div>
              <dt className="text-[var(--color-text-muted)] font-medium">Commercial Usage</dt>
              <dd className="font-semibold text-[var(--color-heading)] mt-0.5">
                {source.license.commercialUse === 'allowed' ? (
                  <span className="text-emerald-700 dark:text-emerald-400">Permitted for commercial projects</span>
                ) : (
                  <span className="text-amber-700">Restricted / Non-commercial only</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-[var(--color-text-muted)] font-medium">Attribution Requirement</dt>
              <dd className="font-semibold text-[var(--color-heading)] mt-0.5">
                {source.license.attributionTerms === 'required' ? (
                  <span className="text-amber-700 font-bold">Attribution strictly required</span>
                ) : (
                  <span className="text-slate-700 dark:text-slate-300">No mandatory UI attribution</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-[var(--color-text-muted)] font-medium">Supported Styles</dt>
              <dd className="font-semibold text-[var(--color-heading)] mt-0.5 capitalize">
                {source.supportedStyles.join(', ')}
              </dd>
            </div>

            <div>
              <dt className="text-[var(--color-text-muted)] font-medium">Default Canvas ViewBox</dt>
              <dd className="font-mono font-semibold text-[var(--color-heading)] mt-0.5">
                {source.defaultViewBox.width} × {source.defaultViewBox.height}px
              </dd>
            </div>

            <div>
              <dt className="text-[var(--color-text-muted)] font-medium">Maintenance Status</dt>
              <dd className="font-semibold text-[var(--color-heading)] mt-0.5 capitalize">
                {source.maintenanceStatus}
              </dd>
            </div>

            {source.upstreamUrl && (
              <div>
                <dt className="text-[var(--color-text-muted)] font-medium">Official Project Website</dt>
                <dd className="font-semibold text-[var(--color-primary)] mt-0.5 truncate">
                  <a href={source.upstreamUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {source.upstreamUrl.replace(/^https?:\/\//, '')}
                  </a>
                </dd>
              </div>
            )}

            {source.repositoryUrl && (
              <div>
                <dt className="text-[var(--color-text-muted)] font-medium">Upstream Source Repository</dt>
                <dd className="font-semibold text-[var(--color-primary)] mt-0.5 truncate">
                  <a href={source.repositoryUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {source.repositoryUrl.replace('https://github.com/', '')}
                  </a>
                </dd>
              </div>
            )}

            <div>
              <dt className="text-[var(--color-text-muted)] font-medium">License Verification Date</dt>
              <dd className="font-mono text-[var(--color-heading)] mt-0.5">
                {source.license.verificationDate}
              </dd>
            </div>

            {source.trademarkPolicy?.hasRestrictions && (
              <div className="sm:col-span-2 md:col-span-3 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                <dt className="text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider text-2xs mb-0.5">
                  Trademark Protection Notice
                </dt>
                <dd className="text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                  {source.trademarkPolicy.notice}
                </dd>
              </div>
            )}

            {source.license.notes && (
              <div className="sm:col-span-2 md:col-span-3 text-[11px] text-[var(--color-text-muted)] italic pt-2 border-t border-[var(--color-border)]/60">
                Registry audit note: {source.license.notes}
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* 2. Collection Icon Search & Browse Explorer */}
      <section aria-labelledby="heading-browse-icons" className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex-1 max-w-md relative">
            <input
              ref={searchInputRef}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search in ${source.displayName} icons...`}
              aria-label={`Search within ${source.displayName} icons`}
              className="w-full pl-9 pr-12 py-2 text-xs sm:text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-heading)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none select-none" aria-hidden="true">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-text-muted)] font-semibold shadow-2xs">
                /
              </kbd>
            </div>
          </div>

          {/* Style Filter (Only if collection supports multiple styles) */}
          {(() => {
            const selectableStyles = source.supportedStyles.filter(
              (st): st is Extract<StyleFilter, 'outline' | 'solid' | 'duotone'> =>
                st === 'outline' || st === 'solid' || st === 'duotone'
            );

            if (selectableStyles.length > 1) {
              return (
                <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                  <span className="text-2xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mr-1">
                    Style:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStyle('all');
                      setPage(1);
                      setCursor(undefined);
                    }}
                    aria-pressed={activeStyle === 'all'}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-colors ${
                      activeStyle === 'all'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs font-semibold'
                        : 'border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                    }`}
                  >
                    All Styles
                  </button>
                  {selectableStyles.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setActiveStyle(st);
                        setPage(1);
                        setCursor(undefined);
                      }}
                      aria-pressed={activeStyle === st}
                      className={`px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-colors ${
                        activeStyle === st
                          ? 'bg-[var(--color-primary)] text-white shadow-xs font-semibold'
                          : 'border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              );
            }

            return (
              <div className="text-2xs font-semibold px-2.5 py-1 rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                Single Style: <span className="capitalize text-[var(--color-heading)]">{source.supportedStyles[0]}</span>
              </div>
            );
          })()}
        </div>

        {/* Results Counter / Filter status */}
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
          <div>
            {isLoading ? (
              <span>Loading glyphs from {source.displayName}...</span>
            ) : data ? (
              <span>
                Showing <span className="font-semibold text-[var(--color-heading)]">{accumulatedIcons.length}</span> of{' '}
                <span className="font-semibold text-[var(--color-heading)]">
                  {typeof data.total === 'number' ? data.total.toLocaleString() : accumulatedIcons.length.toLocaleString()}
                </span> glyphs
                {debouncedQuery && <span> matching &ldquo;{debouncedQuery}&rdquo;</span>}
              </span>
            ) : null}
          </div>

          {(debouncedQuery || activeStyle !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setActiveStyle('all');
                setPage(1);
                setCursor(undefined);
              }}
              className="text-xs font-medium text-[var(--color-primary)] hover:underline focus:outline-none"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchIcons(debouncedQuery, activeStyle, page, cursor)}
              className="px-3 py-1 rounded-lg bg-amber-600 text-white font-semibold text-2xs hover:bg-amber-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Icon Grid */}
        <IconGrid icons={accumulatedIcons} isLoading={isLoading && accumulatedIcons.length === 0} />

        {/* Empty state */}
        {!isLoading && accumulatedIcons.length === 0 && !error && (
          <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)]/20">
            <h3 className="text-base font-bold text-[var(--color-heading)] mb-1">
              No matching icons found
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto mb-4">
              We couldn&apos;t find any icons matching &ldquo;{debouncedQuery}&rdquo; in {source.displayName}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setActiveStyle('all');
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Clear search query
            </button>
          </div>
        )}

        {/* Pagination & Load More */}
        {data && accumulatedIcons.length > 0 && (
          <PaginationControls
            page={page}
            totalPages={data.totalPages}
            total={data.total}
            hasMore={data.hasMore}
            iconCount={accumulatedIcons.length}
            isFilteredContinuation={Boolean(debouncedQuery || activeStyle !== 'all')}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
            onPageChange={(newPage) => {
              setPage(newPage);
              setCursor(undefined);
              window.scrollTo({ top: 350, behavior: 'smooth' });
            }}
          />
        )}
      </section>

      {/* Back to collections link */}
      <div className="pt-6 border-t border-[var(--color-border)] flex items-center justify-between">
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)] hover:underline focus:outline-none"
        >
          &larr; Back to all libraries directory
        </Link>
        <Link
          href="/"
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
        >
          Home Overview
        </Link>
      </div>
    </div>
  );
}
