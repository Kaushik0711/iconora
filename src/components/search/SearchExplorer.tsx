'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/shell/Container';
import { IconGrid } from './IconGrid';
import { SearchFilters } from './SearchFilters';
import { PaginationControls } from './PaginationControls';
import { SearchEmptyState } from './SearchEmptyState';
import type { SearchResponse, StyleFilter, LicenseFilter, SearchIconItem } from '@/modules/search/types';
import { computeSearchKey, isContinuationValid, type ContinuationContext } from '@/modules/search';
import { TaxonomyService } from '@/modules/taxonomy';

const QUICK_CATEGORIES = TaxonomyService.getAllCategories()
  .filter((category) => category.id !== 'all' && category.isSupported)
  .slice(0, 8);

export function SearchExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to extract state from URL search params
  const parseParams = useCallback((params: URLSearchParams) => {
    const q = params.get('q') || '';
    const cat = params.get('category') || 'all';
    const srcParam = params.get('source');
    const srcs = srcParam
      ? srcParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const st = (params.get('style') as StyleFilter) || 'all';
    const lic = (params.get('license') as LicenseFilter) || 'all';
    const p = params.get('page') ? parseInt(params.get('page')!, 10) : 1;
    const cursorParam = params.get('cursor');
    const cur = cursorParam && Number.isFinite(parseInt(cursorParam, 10)) ? parseInt(cursorParam, 10) : undefined;

    return {
      query: q,
      category: cat,
      sources: srcs,
      style: st,
      license: lic,
      page: Number.isFinite(p) && p > 0 ? p : 1,
      cursor: cur,
    };
  }, []);

  const initialValues = parseParams(new URLSearchParams(searchParams.toString()));

  // Local state
  const [searchInput, setSearchInput] = useState(initialValues.query);
  const [activeCategory, setActiveCategory] = useState(initialValues.category);
  const [activeSources, setActiveSources] = useState<readonly string[]>(initialValues.sources);
  const [activeStyle, setActiveStyle] = useState<StyleFilter>(initialValues.style);
  const [activeLicense, setActiveLicense] = useState<LicenseFilter>(initialValues.license);
  const [page, setPage] = useState(initialValues.page);
  const [cursor, setCursor] = useState<number | undefined>(initialValues.cursor);
  const [accumulatedIcons, setAccumulatedIcons] = useState<readonly SearchIconItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileFilterToggleRef = useRef<HTMLButtonElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const continuationAbortControllerRef = useRef<AbortController | null>(null);
  const searchGenerationRef = useRef(0);
  const currentSearchKeyRef = useRef<string>(
    computeSearchKey(
      initialValues.query,
      initialValues.category,
      initialValues.sources,
      initialValues.style,
      initialValues.license
    )
  );
  const lastSyncedUrlRef = useRef<string>(searchParams.toString());
  const initialCursorRef = useRef<number | undefined>(initialValues.cursor);

  // Safely abort pending continuation requests when query/filters change
  const abortPendingContinuation = useCallback(() => {
    if (continuationAbortControllerRef.current) {
      continuationAbortControllerRef.current.abort();
      continuationAbortControllerRef.current = null;
    }
    setIsLoadingMore(false);
  }, [setIsLoadingMore]);

  // Synchronize URL with active state using Next router navigation (single history entry per push)
  // Use replace for typing updates, push for explicit filter or continuation changes
  const updateUrl = useCallback(
    (
      newQuery: string,
      newCategory: string,
      newSources: readonly string[],
      newStyle: StyleFilter,
      newLicense: LicenseFilter,
      newPage: number,
      newCursor?: number,
      mode: 'push' | 'replace' = 'replace'
    ) => {
      const params = new URLSearchParams();
      if (newQuery.trim()) params.set('q', newQuery.trim());
      if (newCategory !== 'all') params.set('category', newCategory);
      if (newSources.length > 0) params.set('source', newSources.join(','));
      if (newStyle !== 'all') params.set('style', newStyle);
      if (newLicense !== 'all') params.set('license', newLicense);
      if (newPage > 1) params.set('page', String(newPage));
      if (typeof newCursor === 'number' && newCursor > 0) params.set('cursor', String(newCursor));

      const queryString = params.toString();
      lastSyncedUrlRef.current = queryString;
      const newUrl = queryString ? `/search?${queryString}` : '/search';

      if (mode === 'push') {
        router.push(newUrl, { scroll: false });
      } else {
        router.replace(newUrl, { scroll: false });
      }
    },
    [router]
  );

  // Perform search fetch with cancellation and race-condition immunity
  const fetchIcons = useCallback(
    async (
      q: string,
      cat: string,
      sources: readonly string[],
      style: StyleFilter,
      license: LicenseFilter,
      targetPage: number,
      targetCursor?: number
    ) => {
      const trimmedQuery = q.trim();

      // Invalidate any pending continuation
      abortPendingContinuation();

      // Abort previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++searchGenerationRef.current;
      const currentKey = computeSearchKey(trimmedQuery, cat, sources, style, license);
      currentSearchKeyRef.current = currentKey;

      setIsLoading(true);
      setError(null);
      setIsRateLimited(false);

      const params = new URLSearchParams();
      if (trimmedQuery) params.set('q', trimmedQuery);
      if (cat !== 'all') params.set('category', cat);
      if (sources.length > 0) params.set('source', sources.join(','));
      if (style !== 'all') params.set('style', style);
      if (license !== 'all') params.set('license', license);
      params.set('page', String(targetPage));
      params.set('limit', '32');
      if (typeof targetCursor === 'number' && targetCursor >= 0) {
        params.set('cursor', String(targetCursor));
      }

      try {
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });

        // Ignore response if superseded by a newer request or key change
        if (currentRequestId !== searchGenerationRef.current || currentKey !== currentSearchKeyRef.current) return;

        if (response.status === 429) {
          setIsRateLimited(true);
          setError('API rate limit reached. Please wait a moment before trying again.');
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Search failed with status ${response.status}`);
        }

        const resData: SearchResponse = await response.json();
        if (currentRequestId === searchGenerationRef.current && currentKey === currentSearchKeyRef.current) {
          setData(resData);
          setAccumulatedIcons(resData.icons);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Newer request superseded this one; ignore cleanly
          return;
        }
        if (currentRequestId === searchGenerationRef.current && currentKey === currentSearchKeyRef.current) {
          setError((err as Error)?.message || 'Failed to fetch search results.');
        }
      } finally {
        if (currentRequestId === searchGenerationRef.current && currentKey === currentSearchKeyRef.current) {
          setIsLoading(false);
        }
      }
    },
    [abortPendingContinuation, setData, setAccumulatedIcons, setIsLoading, setError, setIsRateLimited]
  );

  // Synchronize state when searchParams change externally (popstate/back/forward)
  useEffect(() => {
    const currentParamString = searchParams.toString();
    if (currentParamString !== lastSyncedUrlRef.current) {
      lastSyncedUrlRef.current = currentParamString;
      const parsed = parseParams(new URLSearchParams(currentParamString));

      abortPendingContinuation();
      setSearchInput(parsed.query);
      setActiveCategory(parsed.category);
      setActiveSources(parsed.sources);
      setActiveStyle(parsed.style);
      setActiveLicense(parsed.license);
      setPage(parsed.page);
      setCursor(parsed.cursor);
      fetchIcons(parsed.query, parsed.category, parsed.sources, parsed.style, parsed.license, parsed.page, parsed.cursor);
    }
  }, [searchParams, parseParams, fetchIcons, abortPendingContinuation]);

  // Trigger search on parameter change with 300ms debounce on typing
  useEffect(() => {
    const handler = setTimeout(() => {
      const curToUse = initialCursorRef.current;
      initialCursorRef.current = undefined;
      fetchIcons(searchInput, activeCategory, activeSources, activeStyle, activeLicense, page, curToUse);
      updateUrl(searchInput, activeCategory, activeSources, activeStyle, activeLicense, page, curToUse, 'replace');
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, activeCategory, activeSources, activeStyle, activeLicense, page, fetchIcons, updateUrl]);

  // Global Keyboard shortcuts: '/' or Ctrl+K / Cmd+K focuses search, Escape clears/closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (!isEditable && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === 'Escape') {
        if (isMobileFiltersOpen) {
          setIsMobileFiltersOpen(false);
        } else if (document.activeElement === inputRef.current && searchInput) {
          setSearchInput('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileFiltersOpen, searchInput]);

  // Explicit user action handlers (use 'push' so users have navigable history)
  const handleCategoryChange = (cat: string) => {
    abortPendingContinuation();
    searchGenerationRef.current++;
    setActiveCategory(cat);
    setPage(1);
    setCursor(undefined);
    setAccumulatedIcons([]);
    updateUrl(searchInput, cat, activeSources, activeStyle, activeLicense, 1, undefined, 'push');
  };

  const handleSourceToggle = (prefix: string) => {
    abortPendingContinuation();
    searchGenerationRef.current++;
    const clean = prefix.toLowerCase();
    const updated = activeSources.includes(clean)
      ? activeSources.filter((p) => p !== clean)
      : [...activeSources, clean];
    setActiveSources(updated);
    setPage(1);
    setCursor(undefined);
    setAccumulatedIcons([]);
    updateUrl(searchInput, activeCategory, updated, activeStyle, activeLicense, 1, undefined, 'push');
  };

  const handleStyleChange = (style: StyleFilter) => {
    abortPendingContinuation();
    searchGenerationRef.current++;
    setActiveStyle(style);
    setPage(1);
    setCursor(undefined);
    setAccumulatedIcons([]);
    updateUrl(searchInput, activeCategory, activeSources, style, activeLicense, 1, undefined, 'push');
  };

  const handleLicenseChange = (license: LicenseFilter) => {
    abortPendingContinuation();
    searchGenerationRef.current++;
    setActiveLicense(license);
    setPage(1);
    setCursor(undefined);
    setAccumulatedIcons([]);
    updateUrl(searchInput, activeCategory, activeSources, activeStyle, license, 1, undefined, 'push');
  };

  const handleResetFilters = () => {
    abortPendingContinuation();
    searchGenerationRef.current++;
    setActiveCategory('all');
    setActiveSources([]);
    setActiveStyle('all');
    setActiveLicense('all');
    setPage(1);
    setCursor(undefined);
    setAccumulatedIcons([]);
    updateUrl(searchInput, 'all', [], 'all', 'all', 1, undefined, 'push');
  };

  const handlePageChange = (newPage: number) => {
    abortPendingContinuation();
    searchGenerationRef.current++;
    setPage(newPage);
    setCursor(undefined);
    updateUrl(searchInput, activeCategory, activeSources, activeStyle, activeLicense, newPage, undefined, 'push');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSuggestionClick = (suggested: string) => {
    abortPendingContinuation();
    searchGenerationRef.current++;
    setSearchInput(suggested);
    setActiveCategory('all');
    setPage(1);
    setCursor(undefined);
    setAccumulatedIcons([]);
    updateUrl(suggested, 'all', activeSources, activeStyle, activeLicense, 1, undefined, 'push');
  };

  const handleRetry = () => {
    abortPendingContinuation();
    searchGenerationRef.current++;
    fetchIcons(searchInput, activeCategory, activeSources, activeStyle, activeLicense, page, cursor);
  };

  // Cursor-based load more for filtered continuation
  const handleLoadMore = async () => {
    if (isLoadingMore || isLoading || !data || !data.hasMore || typeof data.nextCursor !== 'number') {
      return;
    }

    // Cancel any prior in-flight continuation
    if (continuationAbortControllerRef.current) {
      continuationAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    continuationAbortControllerRef.current = controller;

    // Snapshot current request generation and search key
    const continuationContext: ContinuationContext = {
      generation: searchGenerationRef.current,
      searchKey: computeSearchKey(
        searchInput,
        activeCategory,
        activeSources,
        activeStyle,
        activeLicense
      ),
    };

    setIsLoadingMore(true);
    setError(null);

    const nextCur = data.nextCursor;
    const params = new URLSearchParams();
    const trimmed = searchInput.trim();
    if (trimmed) params.set('q', trimmed);
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (activeSources.length > 0) params.set('source', activeSources.join(','));
    if (activeStyle !== 'all') params.set('style', activeStyle);
    if (activeLicense !== 'all') params.set('license', activeLicense);
    params.set('page', String(page));
    params.set('limit', '32');
    params.set('cursor', String(nextCur));

    try {
      const res = await fetch(`/api/search?${params.toString()}`, {
        signal: controller.signal,
      });

      // Guard against stale response if filters or query changed mid-request
      if (
        !isContinuationValid(
          continuationContext,
          searchGenerationRef.current,
          currentSearchKeyRef.current,
          controller.signal
        )
      ) {
        return;
      }

      if (res.status === 429) {
        setIsRateLimited(true);
        setError('API rate limit reached. Please wait a moment before trying again.');
        setIsLoadingMore(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Search continuation failed with status ${res.status}`);
      }

      const resData: SearchResponse = await res.json();

      // Guard again after async JSON parsing
      if (
        !isContinuationValid(
          continuationContext,
          searchGenerationRef.current,
          currentSearchKeyRef.current,
          controller.signal
        )
      ) {
        return;
      }

      setAccumulatedIcons((prev) => {
        const seen = new Set(prev.map((i) => i.canonicalId));
        const uniqueNew = resData.icons.filter((i) => !seen.has(i.canonicalId));
        const merged = [...prev, ...uniqueNew];

        setData((prevData) =>
          prevData
            ? {
              ...resData,
              icons: merged,
            }
            : resData
        );

        return merged;
      });

      const cursorForUrl = resData.nextCursor ?? nextCur;
      setCursor(cursorForUrl);
      updateUrl(
        searchInput,
        activeCategory,
        activeSources,
        activeStyle,
        activeLicense,
        page,
        cursorForUrl,
        'push'
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Aborted cleanly mid-request
      }
      if (
        isContinuationValid(
          continuationContext,
          searchGenerationRef.current,
          currentSearchKeyRef.current
        )
      ) {
        setError((err as Error)?.message || 'Failed to load more results.');
      }
    } finally {
      if (
        isContinuationValid(
          continuationContext,
          searchGenerationRef.current,
          currentSearchKeyRef.current
        )
      ) {
        setIsLoadingMore(false);
      }
      if (continuationAbortControllerRef.current === controller) {
        continuationAbortControllerRef.current = null;
      }
    }
  };

  const isFilteredMode = activeCategory !== 'all' || activeStyle !== 'all';
  const displayIcons = isFilteredMode ? accumulatedIcons : (data?.icons ?? []);
  const browseHeading = searchInput.trim()
    ? `Results for “${searchInput.trim()}”`
    : activeCategory === 'all'
      ? 'Browse all icons'
      : `${activeCategory.charAt(0).toUpperCase()}${activeCategory.slice(1)} icons`;

  return (
    <div className="min-h-screen pb-16">
      <Container>
        {/* Search page header */}
        <section className="pt-8 sm:pt-10 pb-7 sm:pb-8" aria-labelledby="icon-explorer-title">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)] mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
                Icon library
              </span>
              <h1 id="icon-explorer-title" className="text-3xl sm:text-4xl font-extrabold text-[var(--color-heading)] tracking-tight mb-2">
                Explore icons
              </h1>
              <p className="text-sm text-[var(--color-text-body)] max-w-2xl">
                Browse every verified collection or search for the right mark across the library.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] px-4 py-3 shadow-sm">
              <span className="flex w-9 h-9 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              <span><strong className="block text-sm text-[var(--color-heading)]">14 verified sets</strong><span className="text-xs text-[var(--color-text-muted)]">One library, many styles</span></span>
            </div>
          </div>

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              updateUrl(searchInput, activeCategory, activeSources, activeStyle, activeLicense, 1, undefined, 'push');
            }}
            className="relative flex items-center max-w-4xl"
          >
            {/* Search Icon */}
            <div className="absolute left-4 text-[var(--color-text-muted)] pointer-events-none" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="search"
              value={searchInput}
              onChange={(e) => {
                abortPendingContinuation();
                searchGenerationRef.current++;
                setSearchInput(e.target.value);
                setPage(1);
                setCursor(undefined);
                setAccumulatedIcons([]);
              }}
              placeholder="Search icons by name or keyword (e.g. arrow, user, settings)..."
              className="w-full pl-12 pr-24 py-4 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border)] shadow-sm text-sm text-[var(--color-heading)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-light)]/40 transition-all"
              aria-label="Search icons"
            />

            {/* Keyboard shortcut hint */}
            <div className="absolute right-4 hidden sm:flex items-center gap-1.5 pointer-events-none select-none" aria-hidden="true">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-text-muted)] font-semibold shadow-2xs">
                /
              </kbd>
              <kbd className="px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-text-muted)] font-semibold shadow-2xs">
                ⌘K
              </kbd>
            </div>
          </form>

          <nav aria-label="Quick icon categories" className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              aria-pressed={activeCategory === 'all'}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${activeCategory === 'all' ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}
            >All icons</button>
            {QUICK_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryChange(category.id)}
                aria-pressed={activeCategory === category.id}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${activeCategory === category.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}
              >{category.label}</button>
            ))}
          </nav>
        </section>

        {/* Mobile Filter Toggle Button (< 768px) */}
        <div className="flex md:hidden items-center justify-between pb-4 mb-4 border-b border-[var(--color-border)]">
          <button
            ref={mobileFilterToggleRef}
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            aria-label="Open filter options"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-heading)] shadow-xs hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
            aria-expanded={isMobileFiltersOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Filter Options
          </button>

          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            {data && !data.isInitialDiscovery
              ? typeof data.total === 'number'
                ? `${data.total.toLocaleString()} results`
                : `${displayIcons.length} results`
              : ''}
          </span>
        </div>

        {/* Screen Reader Live Announcement */}
        <div className="sr-only" aria-live="polite">
          {isLoading
            ? 'Searching icons...'
            : data && !data.isInitialDiscovery
              ? `Showing ${displayIcons.length} icons for ${data.query || data.activeCategory}. Page ${data.page}.`
              : ''}
        </div>

        {/* Main Search Layout: Filters Sidebar + Results Grid */}
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
          {/* Filters Sidebar */}
          <SearchFilters
            activeCategory={activeCategory}
            activeSources={activeSources}
            activeStyle={activeStyle}
            activeLicense={activeLicense}
            onCategoryChange={handleCategoryChange}
            onSourceToggle={handleSourceToggle}
            onStyleChange={handleStyleChange}
            onLicenseChange={handleLicenseChange}
            onResetFilters={handleResetFilters}
            isMobileOpen={isMobileFiltersOpen}
            onCloseMobile={() => {
              setIsMobileFiltersOpen(false);
              mobileFilterToggleRef.current?.focus();
            }}
          />

          {/* Results Area */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)] mb-1">The library</p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-heading)]">{browseHeading}</h2>
              </div>
              <span className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)]" aria-live="polite">
                {isLoading ? 'Loading icons…' : data?.total !== undefined ? `${data.total.toLocaleString()} icons` : `${displayIcons.length} icons`}
              </span>
            </div>
            {/* Status & Error Banner */}
            {error && (
              <div
                className={`p-4 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isRateLimited
                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                    : 'bg-red-50 border border-red-200 text-red-900'
                  }`}
                role="alert"
              >
                <div className="text-xs font-medium">
                  {error}
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-3 py-1 rounded-lg bg-white border border-current text-xs font-semibold hover:bg-black/5 transition-colors shrink-0 cursor-pointer"
                >
                  Retry Search
                </button>
              </div>
            )}

            {/* Requirement 4: Partial Results Warning Banner */}
            {data?.partialFailures && data.partialFailures.length > 0 && !error && (
              <div
                className="p-3.5 rounded-xl mb-6 bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                role="status"
              >
                <div className="text-xs font-medium">
                  Notice: Some icons could not be loaded from upstream collections:{' '}
                  <strong>{data.partialFailures.join(', ')}</strong>. Available results are displayed below.
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--color-bg-main)] border border-amber-300 hover:bg-amber-100/50 text-amber-900 dark:text-amber-200 transition-colors shrink-0 cursor-pointer"
                >
                  Retry Failed
                </button>
              </div>
            )}

            {/* View Modes: Initial Search Start State, Continuation State, Empty State, or Results Grid */}
            {!isLoading && data && displayIcons.length === 0 ? (
              data.hasMore ? (
                /* Bounded scan window found 0 in this window, but hasMore is true */
                <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border)] shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-light)]/20 text-[var(--color-primary)] flex items-center justify-center mb-4">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--color-heading)] mb-2">
                    No matching icons in this scan window
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-md mb-6 leading-relaxed">
                    We checked the initial upstream candidates for your active filters, but more remain in the collections. Continue searching deeper.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {isLoadingMore ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Searching next window...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue Searching</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              ) : (
                <SearchEmptyState
                  query={searchInput}
                  activeCategory={activeCategory}
                  onClearFilters={handleResetFilters}
                  onSuggestionClick={handleSuggestionClick}
                />
              )
            ) : (
              <>
                <IconGrid icons={displayIcons} isLoading={isLoading} />

                {data && !isLoading && displayIcons.length > 0 && (
                  <PaginationControls
                    page={data.page}
                    totalPages={data.totalPages}
                    total={data.total}
                    hasMore={data.hasMore}
                    onPageChange={handlePageChange}
                    isFilteredContinuation={data.isFilteredContinuation ?? isFilteredMode}
                    onLoadMore={handleLoadMore}
                    isLoadingMore={isLoadingMore}
                    iconCount={displayIcons.length}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
