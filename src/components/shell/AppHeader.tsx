'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from './Container';
import { ThemeToggle } from './ThemeToggle';

interface NavLink {
  readonly label: string;
  readonly href: string;
}

const NAV_LINKS: readonly NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Icon Sets', href: '/search' },
  { label: 'Collections', href: '/collections' },
  { label: 'About', href: '/about' },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);

  // Close mobile drawer on Escape and restore focus
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileMenuOpen(false);
        mobileMenuToggleRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/95 backdrop-blur-md border-b border-[var(--color-border)] transition-colors">
      <Container>
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Mark & Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-[var(--radius-sm)] p-1 group"
            aria-label="IconHub Homepage"
          >
            <div
              className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white shadow-xs transition-transform duration-200 group-hover:scale-105"
              aria-hidden="true"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="7" height="7" x="3" y="3" rx="1.5" />
                <rect width="7" height="7" x="14" y="3" rx="1.5" />
                <rect width="7" height="7" x="14" y="14" rx="1.5" />
                <rect width="7" height="7" x="3" y="14" rx="1.5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[var(--color-heading)] leading-none">
                IconHub
              </span>
            </div>
          </Link>

          {/* Center: Desktop Navigation Rhythm with Purple Text & Thin Underline */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8" aria-label="Primary Navigation">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative py-1 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-xs ${
                    isActive
                      ? 'text-[var(--color-primary)] font-semibold border-b-2 border-[var(--color-primary)]'
                      : 'text-[var(--color-text-body)] hover:text-[var(--color-heading)] font-medium border-b-2 border-transparent hover:border-[var(--color-border)]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Theme Toggle & Sign In UI Affordances */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {/* Sign In Action Button */}
            <button
              type="button"
              className="px-4 py-1.5 text-sm font-semibold text-[var(--color-heading)] bg-[var(--color-bg-secondary)] hover:bg-[#EDEFF8] dark:hover:bg-slate-800 border border-[var(--color-border)] rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-all cursor-pointer"
              title="Sign in"
            >
              Sign In
            </button>
          </div>

          {/* Mobile Navigation Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              ref={mobileMenuToggleRef}
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="min-w-[44px] min-h-[44px] p-2 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--color-heading)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            className="md:hidden py-4 border-t border-[var(--color-border)] flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
            aria-label="Mobile Navigation"
          >
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 text-base font-medium rounded-[var(--radius-md)] transition-colors ${
                    isActive
                      ? 'text-[var(--color-primary)] font-semibold bg-[var(--color-primary-light)]'
                      : 'text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:bg-[var(--color-bg-secondary)]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-[var(--color-border)] flex items-center justify-between px-2">
              <span className="text-xs text-[var(--color-text-muted)]">IconHub</span>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-[var(--color-heading)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-md)]"
              >
                Sign In
              </button>
            </div>
          </nav>
        )}
      </Container>
    </header>
  );
}
