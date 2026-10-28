import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/shell/Container';
import { SourceRegistry } from '@/modules/registry';
import { CollectionsDirectory } from '@/components/collections/CollectionsDirectory';

export const metadata = {
  title: 'Icon Libraries & Collections Directory — IconHub',
  description:
    'Browse 14 curated, verified open-source icon libraries with authoritative licenses, style details, and verified glyph counts.',
};

export default function CollectionsPage() {
  const sources = SourceRegistry.getAllSources();

  return (
    <div className="py-10 sm:py-14">
      <Container>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--color-heading)] underline">
                Home
              </Link>
            </li>
            <li>&gt;</li>
            <li className="font-semibold text-[var(--color-heading)]" aria-current="page">
              Collections
            </li>
          </ol>
        </nav>

        {/* Directory Title & Intro */}
        <div className="max-w-3xl mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-semibold mb-3">
            <span>Verified Source Registry</span>
            <span>•</span>
            <span>14 Curated Libraries</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-heading)] tracking-tight mb-3">
            Icon Libraries Directory
          </h1>

          <p className="text-sm sm:text-base text-[var(--color-text-body)] leading-relaxed">
            Explore authoritative, evidence-backed open-source icon sets. Every collection has been audited
            against upstream repositories for accurate licensing, commercial usage rights, and verified glyph counts.
          </p>
        </div>

        {/* Client-side directory with search, filtering, sorting & favorites */}
        <CollectionsDirectory sources={sources} />
      </Container>
    </div>
  );
}
