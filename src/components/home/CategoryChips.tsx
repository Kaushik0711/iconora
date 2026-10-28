'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Container } from '../shell/Container';
import { HOMEPAGE_CATEGORIES, CategoryItem } from '@/data/categories';

interface CategoryChipsProps {
  readonly activeCategoryId?: string;
}

export function CategoryChips({ activeCategoryId = 'all' }: CategoryChipsProps) {
  const [showAllChips, setShowAllChips] = useState<boolean>(false);

  // Default desktop slice shows first 13 chips + More button
  const visibleCategories = showAllChips
    ? HOMEPAGE_CATEGORIES
    : HOMEPAGE_CATEGORIES.slice(0, 13);

  const hasHiddenChips = HOMEPAGE_CATEGORIES.length > 13;

  return (
    <section className="py-3.5 border-y border-[var(--color-border)] bg-[var(--color-bg-secondary)]/35" aria-label="Browse by Category">
      <Container>
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar scroll-smooth">
          {visibleCategories.map((category: CategoryItem) => {
            const isSelected = activeCategoryId === category.id;
            const href = category.id === 'all' ? '/search' : `/search?category=${encodeURIComponent(category.id)}`;

            return (
              <Link
                key={category.id}
                href={href}
                className={`inline-flex items-center px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white shadow-xs font-semibold'
                    : 'bg-[var(--color-bg-main)] text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:bg-[var(--color-bg-secondary)] border border-[var(--color-border)]'
                }`}
                aria-current={isSelected ? 'page' : undefined}
              >
                {category.label}
              </Link>
            );
          })}

          {hasHiddenChips && (
            <button
              type="button"
              onClick={() => setShowAllChips((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap bg-[var(--color-bg-main)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              aria-expanded={showAllChips}
            >
              <span>{showAllChips ? 'Less' : 'More'}</span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${showAllChips ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>
      </Container>
    </section>
  );
}
