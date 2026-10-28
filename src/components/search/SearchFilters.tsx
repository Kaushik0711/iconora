'use client';

import React, { useEffect, useState } from 'react';
import { SourceRegistry } from '@/modules/registry';
import { TaxonomyService } from '@/modules/taxonomy';
import { isStyleSupportedByPrefix } from '@/modules/search';
import type { StyleFilter, LicenseFilter } from '@/modules/search/types';

interface SearchFiltersProps {
  readonly activeCategory: string;
  readonly activeSources: readonly string[];
  readonly activeStyle: StyleFilter;
  readonly activeLicense: LicenseFilter;
  readonly onCategoryChange: (category: string) => void;
  readonly onSourceToggle: (prefix: string) => void;
  readonly onStyleChange: (style: StyleFilter) => void;
  readonly onLicenseChange: (license: LicenseFilter) => void;
  readonly onResetFilters: () => void;
  readonly isMobileOpen: boolean;
  readonly onCloseMobile: () => void;
}

export function SearchFilters({
  activeCategory,
  activeSources,
  activeStyle,
  activeLicense,
  onCategoryChange,
  onSourceToggle,
  onStyleChange,
  onLicenseChange,
  onResetFilters,
  isMobileOpen,
  onCloseMobile,
}: SearchFiltersProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const verifiedSources = SourceRegistry.getAllSources();
  const categories = TaxonomyService.getAllCategories();
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 9);
  const visibleSources = showAllSources ? verifiedSources : verifiedSources.slice(0, 6);

  const activeSourceSet = new Set(activeSources.map((s) => s.toLowerCase()));

  const activeFilterCount =
    (activeCategory !== 'all' ? 1 : 0) +
    activeSources.length +
    (activeStyle !== 'all' ? 1 : 0) +
    (activeLicense !== 'all' ? 1 : 0);

  const filterContent = (
    <div className="space-y-6 text-xs">
      {/* Header with Active Filters & Reset */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
        <span>
          <span className="block text-sm font-bold text-[var(--color-heading)]">Refine results</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{activeFilterCount ? `${activeFilterCount} active` : 'All collections'}</span>
        </span>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[var(--color-primary)] hover:underline font-semibold"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-3">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {visibleCategories.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                disabled={!cat.isSupported}
                className={`min-h-8 px-3 rounded-full text-[11px] font-semibold transition-colors ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white font-semibold'
                    : cat.isSupported
                    ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:bg-[var(--color-border)]/60'
                    : 'opacity-40 cursor-not-allowed bg-[var(--color-bg-secondary)]'
                }`}
                title={cat.description}
                aria-pressed={isSelected}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        {categories.length > 9 && (
          <button type="button" onClick={() => setShowAllCategories((value) => !value)} className="mt-2 text-[11px] font-semibold text-[var(--color-primary)] hover:underline">
            {showAllCategories ? 'Show fewer' : `Show all ${categories.length} categories`}
          </button>
        )}
      </div>

      {/* Source / Collection Filter */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-2">
          Icon sets <span className="normal-case tracking-normal">({verifiedSources.length})</span>
        </label>
        <div className="space-y-1">
          {visibleSources.map((source) => {
            const isChecked = activeSourceSet.has(source.canonicalPrefix);
            return (
              <label
                key={source.id}
                className="flex min-h-9 items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onSourceToggle(source.canonicalPrefix)}
                  className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                  />
                  <span className="font-medium text-[var(--color-heading)] truncate">
                    {source.displayName}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono ml-1">
                  {source.verifiedTotal?.toLocaleString() ?? ''}
                </span>
              </label>
            );
          })}
        </div>
        {verifiedSources.length > 6 && (
          <button type="button" onClick={() => setShowAllSources((value) => !value)} className="mt-2 text-[11px] font-semibold text-[var(--color-primary)] hover:underline">
            {showAllSources ? 'Show fewer sets' : `Show all ${verifiedSources.length} sets`}
          </button>
        )}
      </div>

      {/* Style / Variant Filter */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-3">
          Visual Style
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['all', 'outline', 'solid', 'duotone'] as const).map((s) => {
            const isSelected = activeStyle === s;
            const isAvailable =
              s === 'all' ||
              activeSources.length === 0 ||
              activeSources.some((prefix) => isStyleSupportedByPrefix(prefix, s));

            return (
              <button
                key={s}
                type="button"
                onClick={() => onStyleChange(s)}
                disabled={!isAvailable}
                title={!isAvailable ? `Not available for the selected collection(s)` : undefined}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize text-center transition-colors border ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/40 text-[var(--color-primary)] font-semibold'
                    : isAvailable
                    ? 'border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-secondary)] cursor-pointer'
                    : 'border-[var(--color-border)]/50 text-[var(--color-text-muted)] opacity-40 cursor-not-allowed bg-[var(--color-bg-secondary)]/30'
                }`}
              >
                {s === 'all' ? 'All Styles' : s}
              </button>
            );
          })}
        </div>
      </div>

      {/* License Filter */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-3">
          Licensing &amp; Attribution
        </label>
        <div className="space-y-1">
          {[
            { id: 'all', label: 'All Licenses' },
            { id: 'commercial', label: 'Commercial Permitted' },
            { id: 'no-attribution', label: 'No UI Attribution Required' },
            { id: 'trademark-safe', label: 'Trademark Neutral' },
          ].map((l) => {
            const isSelected = activeLicense === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onLicenseChange(l.id as LicenseFilter)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-[var(--color-primary-light)]/50 text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-bg-secondary)]'
                }`}
              >
                <span>{l.label}</span>
                {isSelected && <span>&bull;</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  return (
    <>
      {/* Desktop Sidebar (&ge; 768px) */}
      <aside className="hidden md:block w-full md:w-[252px] lg:w-[270px] shrink-0 p-5 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border)] shadow-sm self-start sticky top-24">
        {filterContent}
      </aside>

      {/* Mobile Slide-over Drawer (< 768px) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Pane */}
          <div className="relative ml-auto w-full max-w-xs h-full bg-[var(--color-bg-main)] p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
                <span className="font-extrabold text-base text-[var(--color-heading)]">Filter Icons</span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-lg text-[var(--color-text-body)] hover:bg-[var(--color-bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer"
                  aria-label="Close filters"
                >
                  &times;
                </button>
              </div>

              {filterContent}
            </div>

            <div className="pt-4 border-t border-[var(--color-border)] mt-6">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full min-h-[44px] flex items-center justify-center py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-xs text-center shadow-sm cursor-pointer hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

