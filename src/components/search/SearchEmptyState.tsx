'use client';

import React from 'react';

interface SearchEmptyStateProps {
  readonly query: string;
  readonly activeCategory: string;
  readonly onClearFilters: () => void;
  readonly onSuggestionClick: (suggestedQuery: string) => void;
}

export function SearchEmptyState({
  query,
  activeCategory,
  onClearFilters,
  onSuggestionClick,
}: SearchEmptyStateProps) {
  const suggestions = ['arrow', 'interface', 'device', 'user', 'settings', 'code'];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-bg-secondary)]/40 my-6">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-4 shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[var(--color-heading)] mb-1">
        {query ? `No icons found for "${query}"` : 'No icons found'}
      </h3>

      <p className="text-xs sm:text-sm text-[var(--color-text-body)] max-w-md mb-6 leading-relaxed">
        {activeCategory !== 'all'
          ? `No matching icons in the "${activeCategory}" category with active filters. Try broadening your search or resetting filters.`
          : 'Try searching with alternate keywords or clearing source and style filters.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        <span className="text-xs text-[var(--color-text-muted)] mr-1">Suggestions:</span>
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestionClick(s)}
            className="px-2.5 py-1 rounded-md bg-[var(--color-bg-main)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-xs text-[var(--color-heading)] font-medium transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onClearFilters}
        className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        Clear all filters
      </button>
    </div>
  );
}

