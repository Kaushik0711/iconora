import React from 'react';
import Link from 'next/link';
import { Container } from './Container';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Column 1: Brand & Philosophy */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white"
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="7" height="7" x="3" y="3" rx="1.5" />
                  <rect width="7" height="7" x="14" y="3" rx="1.5" />
                  <rect width="7" height="7" x="14" y="14" rx="1.5" />
                  <rect width="7" height="7" x="3" y="14" rx="1.5" />
                </svg>
              </div>
              <span className="text-lg font-bold text-[var(--color-heading)] tracking-tight">IconHub</span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--color-text-body)] max-w-md leading-relaxed mb-4">
              A responsive, open-source icon discovery and customization platform.
              Crafted for designers and developers seeking permissively licensed vector assets with transparent attribution.
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>All artwork belongs to respective authors under open licenses</span>
            </div>
          </div>

          {/* Column 2: Libraries */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-heading)] mb-3">
              Icon Libraries
            </h3>
            <ul className="flex flex-col gap-2 text-xs text-[var(--color-text-body)]">
              <li>
                <Link href="/collection/lucide" className="hover:text-[var(--color-primary)] transition-colors">
                  Lucide
                </Link>
              </li>
              <li>
                <Link href="/collection/heroicons" className="hover:text-[var(--color-primary)] transition-colors">
                  Heroicons
                </Link>
              </li>
              <li>
                <Link href="/collection/tabler" className="hover:text-[var(--color-primary)] transition-colors">
                  Tabler Icons
                </Link>
              </li>
              <li>
                <Link href="/collection/ph" className="hover:text-[var(--color-primary)] transition-colors">
                  Phosphor
                </Link>
              </li>
              <li>
                <Link href="/collections" className="text-[var(--color-primary)] font-semibold hover:underline">
                  View all collections &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Transparency */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-heading)] mb-3">
              Platform
            </h3>
            <ul className="flex flex-col gap-2 text-xs text-[var(--color-text-body)]">
              <li>
                <Link href="/collections" className="hover:text-[var(--color-primary)] transition-colors">
                  Browse All Sets
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[var(--color-primary)] transition-colors">
                  About &amp; Licensing
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-[var(--color-primary)] transition-colors">
                  Icon Explorer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
          <p>© 2026 IconHub • Open Source Icons for Modern Projects.</p>
          <p>Built with Next.js &amp; Iconify</p>
        </div>
      </Container>
    </footer>
  );
}
