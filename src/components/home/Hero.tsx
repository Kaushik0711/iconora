'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Container } from '../shell/Container';

interface FeatureHighlight {
  readonly title: string;
  readonly iconSvg: React.ReactNode;
}

const FEATURE_HIGHLIGHTS: readonly FeatureHighlight[] = [
  {
    title: 'Free & Open Source',
    iconSvg: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Copy SVG & React Code',
    iconSvg: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: '8+ Curated Libraries',
    iconSvg: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    title: 'Transparent Licenses',
    iconSvg: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
] as const;

export function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (!isEditable && event.key === '/') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (event.key === 'Escape') {
        if (document.activeElement === inputRef.current) {
          if (query) {
            setQuery('');
          } else {
            inputRef.current?.blur();
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <section className="relative pt-8 pb-7 md:pt-12 md:pb-9 overflow-hidden" aria-labelledby="hero-heading">
      {/* Background Decorative Atmosphere */}
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-primary-light)_0%,_transparent_65%)] opacity-35 pointer-events-none"
        aria-hidden="true"
      />

      {/* Floating Decorative Icon Badges (Visible on large desktop screens, non-interactive, aria-hidden) */}
      <div className="hidden xl:block absolute inset-0 pointer-events-none -z-5 overflow-hidden" aria-hidden="true">
        {/* Top Left: Terminal / Code */}
        <motion.div
          animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-10 left-[7%] w-11 h-11 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border)] shadow-xs flex items-center justify-center text-[var(--color-primary)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" x2="20" y1="19" y2="19" />
          </svg>
        </motion.div>

        {/* Mid Left: Sparkles */}
        <motion.div
          animate={shouldReduceMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-36 left-[3%] w-10 h-10 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border)] shadow-xs flex items-center justify-center text-[#F59E0B]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </motion.div>

        {/* Top Right: Zap */}
        <motion.div
          animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="absolute top-10 right-[7%] w-11 h-11 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border)] shadow-xs flex items-center justify-center text-[var(--color-primary)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </motion.div>

        {/* Mid Right: Shield */}
        <motion.div
          animate={shouldReduceMotion ? undefined : { y: [0, 7, 0] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute top-36 right-[3%] w-10 h-10 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border)] shadow-xs flex items-center justify-center text-[#10B981]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </motion.div>
      </div>

      <Container>
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title Matching Reference */}
          <h1
            id="hero-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-[var(--color-heading)] tracking-tight leading-[1.12] mb-3 sm:mb-4"
          >
            Open Source <span className="text-[var(--color-primary)]">Icons</span> for Modern Projects
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-[var(--color-text-body)] max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed font-normal">
            Discover, customize, and copy open-source vector icons from the web&apos;s best icon libraries.
            100% free with transparent licensing for personal and commercial projects.
          </p>

          {/* Prominent Wide Search Field */}
          <div className="max-w-3xl mx-auto mb-6 sm:mb-7">
            <form
              role="search"
              aria-label="Search icon sets"
              onSubmit={handleSubmit}
              className="relative flex items-center"
            >
              <label htmlFor="hero-search-input" className="sr-only">
                Search open-source icons across libraries
              </label>

              {/* Leading Search Icon */}
              <div className="absolute left-4 sm:left-5 text-[var(--color-text-muted)] pointer-events-none" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              {/* Input Field */}
              <input
                ref={inputRef}
                id="hero-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search icons across libraries... (e.g. user, arrow, search)"
                className="w-full h-12 sm:h-14 pl-11 sm:pl-13 pr-20 sm:pr-24 text-sm sm:text-base text-[var(--color-heading)] placeholder:text-[var(--color-text-muted)] bg-[var(--color-bg-main)] border border-[var(--color-border)] rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.04)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/15 transition-all duration-200"
                title="Search icons"
              />

              {/* Keyboard Shortcut Indicator (Clean Badge) */}
              <div className="absolute right-3.5 sm:right-4.5 flex items-center gap-1.5 pointer-events-none select-none" aria-hidden="true">
                <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md shadow-2xs font-mono">
                  /
                </kbd>
                <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md shadow-2xs font-mono">
                  ⌘K
                </kbd>
              </div>
            </form>
          </div>

          {/* Compact Single Horizontal Row of Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-y-2.5 gap-x-6 sm:gap-x-8 text-xs sm:text-sm text-[var(--color-text-body)]">
            {FEATURE_HIGHLIGHTS.map((feat) => (
              <div key={feat.title} className="inline-flex items-center gap-2 font-medium">
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  {feat.iconSvg}
                </span>
                <span>{feat.title}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
