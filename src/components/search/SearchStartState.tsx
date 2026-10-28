'use client';

import React from 'react';
import { TAXONOMY_CATEGORIES } from '@/modules/taxonomy';

interface SearchStartStateProps {
  readonly onCategorySelect: (categoryId: string) => void;
  readonly onKeywordSelect: (keyword: string) => void;
}

export function SearchStartState({
  onCategorySelect,
  onKeywordSelect,
}: SearchStartStateProps) {
  const featuredCategories = TAXONOMY_CATEGORIES.filter((c) => c.id !== 'all').slice(0, 10);

  const popularKeywords = [
    'arrow',
    'user',
    'search',
    'settings',
    'heart',
    'mail',
    'check',
    'menu',
    'home',
    'download',
    'shield',
    'code',
  ];

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border)] shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-4 shadow-2xs">
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
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-heading)] tracking-tight mb-2">
        Discover Open Source Icons
      </h2>
      <p className="text-xs sm:text-sm text-[var(--color-text-body)] max-w-lg mb-6 leading-relaxed">
        Search by keyword or select a category below to explore verified vector icons across 14 open-source libraries.
      </p>

      {/* Popular Keyword Suggestions */}
      <div className="w-full max-w-xl mb-6">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-2.5">
          Popular Searches
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {popularKeywords.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => onKeywordSelect(kw)}
              className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--color-bg-secondary)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] text-[var(--color-text-body)] border border-[var(--color-border)] transition-all cursor-pointer"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Category Shortcuts */}
      <div className="w-full max-w-2xl pt-6 border-t border-[var(--color-border)]">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-3">
          Explore by Topic
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {featuredCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategorySelect(cat.id)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-bg-secondary)]/40 hover:bg-[var(--color-bg-main)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-xs transition-all text-center cursor-pointer group"
            >
              <span className="text-xs font-semibold text-[var(--color-heading)] group-hover:text-[var(--color-primary)] transition-colors">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

