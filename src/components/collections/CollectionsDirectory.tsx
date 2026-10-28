'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import type { CuratedSource } from '@/modules/registry/types';
import type { IconStyle } from '@/types/domain';
import { CollectionCard } from './CollectionCard';
import { useCollectionFavorites, useRecentlyViewedCollections, clearRecentlyViewedCollections } from '@/modules/storage';
import { useSearchKeyboardShortcut } from '@/modules/keyboard';

interface CollectionsDirectoryProps {
  sources: readonly CuratedSource[];
}

type SortOption = 'verified-desc' | 'name-asc' | 'featured';
type LicenseFilterOption = 'all' | 'commercial' | 'no-attribution' | 'trademark-safe';

export function CollectionsDirectory({ sources }: CollectionsDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<IconStyle | 'all'>('all');
  const [selectedLicense, setSelectedLicense] = useState<LicenseFilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useSearchKeyboardShortcut({
    inputRef: searchInputRef,
    onEscape: () => setSearchQuery(''),
  });

  const { favorites } = useCollectionFavorites();
  const { recentCollections } = useRecentlyViewedCollections();

  // Resolve recently viewed source objects
  const recentSources = useMemo(() => {
    if (recentCollections.length === 0) return [];
    const sourceMap = new Map(sources.map((s) => [s.canonicalPrefix, s]));
    return recentCollections
      .map((r) => sourceMap.get(r.prefix))
      .filter((s): s is CuratedSource => Boolean(s));
  }, [recentCollections, sources]);

  // Filter and sort collections
  const filteredSources = useMemo(() => {
    let result = [...sources];

    // Search query filter (matches name, canonical prefix, or description)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.canonicalPrefix.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }

    // Style filter
    if (selectedStyle !== 'all') {
      result = result.filter((s) => s.supportedStyles.includes(selectedStyle));
    }

    // License filter
    if (selectedLicense === 'commercial') {
      result = result.filter((s) => s.license.commercialUse === 'allowed');
    } else if (selectedLicense === 'no-attribution') {
      result = result.filter((s) => s.license.attributionTerms === 'not_required');
    } else if (selectedLicense === 'trademark-safe') {
      result = result.filter((s) => !s.trademarkNotice && !s.trademarkPolicy?.hasRestrictions);
    }

    // Favorites only
    if (favoritesOnly) {
      const favSet = new Set(favorites);
      result = result.filter((s) => favSet.has(s.canonicalPrefix));
    }

    // Sort order
    if (sortBy === 'verified-desc') {
      result.sort((a, b) => (b.verifiedTotal ?? 0) - (a.verifiedTotal ?? 0));
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else if (sortBy === 'featured') {
      result.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.verifiedTotal ?? 0) - (a.verifiedTotal ?? 0);
      });
    }

    return result;
  }, [sources, searchQuery, selectedStyle, selectedLicense, favoritesOnly, favorites, sortBy]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedStyle !== 'all' ||
    selectedLicense !== 'all' ||
    favoritesOnly;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStyle('all');
    setSelectedLicense('all');
    setFavoritesOnly(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Recently Viewed Shelf (if any) */}
      {recentSources.length > 0 && (
        <section aria-labelledby="heading-recents" className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40">
          <div className="flex items-center justify-between mb-3">
            <h2 id="heading-recents" className="text-xs font-bold uppercase tracking-wider text-[var(--color-heading)] flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Recently Viewed Libraries
            </h2>
            <button
              type="button"
              onClick={() => clearRecentlyViewedCollections()}
              className="text-2xs text-[var(--color-text-muted)] hover:text-[var(--color-heading)] underline focus:outline-none"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {recentSources.map((rs) => (
              <Link
                key={rs.canonicalPrefix}
                href={`/collection/${rs.canonicalPrefix}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-main)] hover:border-[var(--color-primary)] text-xs font-semibold text-[var(--color-heading)] transition-all shrink-0 hover:shadow-xs"
              >
                <span>{rs.displayName}</span>
                <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                  {rs.canonicalPrefix}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/30">
        {/* Top: Search bar & Sort dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search libraries by name, prefix, or description..."
              aria-label="Search icon libraries"
              className="w-full pl-9 pr-12 py-2 text-xs sm:text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-heading)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
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

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="sort-collections" className="text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sort-collections"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="verified-desc">Verified Total (High to Low)</option>
              <option value="name-asc">Alphabetical (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Filters Row: Style, License, Favorites Toggle */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border)]/60 text-xs">
          {/* Style Filters */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-2xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mr-1">
              Style:
            </span>
            {(['all', 'outline', 'solid', 'duotone'] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setSelectedStyle(style)}
                aria-pressed={selectedStyle === style}
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-colors ${
                  selectedStyle === style
                    ? 'bg-[var(--color-primary)] text-white shadow-xs font-semibold'
                    : 'border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                }`}
              >
                {style === 'all' ? 'All Styles' : style}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-4 w-px bg-[var(--color-border)] mx-1" />

          {/* License Filters */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-2xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mr-1">
              License:
            </span>
            {(
              [
                { id: 'all', label: 'All Licenses' },
                { id: 'commercial', label: 'Commercial Free' },
                { id: 'no-attribution', label: 'No Attribution Req.' },
                { id: 'trademark-safe', label: 'Trademark Safe' },
              ] as const
            ).map((lic) => (
              <button
                key={lic.id}
                type="button"
                onClick={() => setSelectedLicense(lic.id)}
                aria-pressed={selectedLicense === lic.id}
                className={`px-2.5 py-1 rounded-lg text-2xs font-medium transition-colors ${
                  selectedLicense === lic.id
                    ? 'bg-[var(--color-primary)] text-white shadow-xs font-semibold'
                    : 'border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                }`}
              >
                {lic.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-4 w-px bg-[var(--color-border)] mx-1" />

          {/* Favorites Only Toggle */}
          <button
            type="button"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            aria-pressed={favoritesOnly}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-medium transition-colors ${
              favoritesOnly
                ? 'bg-amber-500 text-white font-semibold'
                : 'border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-amber-500 hover:border-amber-300'
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill={favoritesOnly ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Favorites {favorites.length > 0 ? `(${favorites.length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Results Header: Count & Reset */}
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
        <div>
          Showing <span className="font-bold text-[var(--color-heading)]">{filteredSources.length}</span> of {sources.length} verified libraries
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-[var(--color-primary)] hover:underline focus:outline-none"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Collections Grid */}
      {filteredSources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredSources.map((source) => (
            <CollectionCard key={source.canonicalPrefix} source={source} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)]/20">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-text-muted)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-[var(--color-heading)] mb-1">
            No libraries found
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto mb-4">
            No verified icon libraries match your current filter criteria. Try adjusting your search query, style, or license filters.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
