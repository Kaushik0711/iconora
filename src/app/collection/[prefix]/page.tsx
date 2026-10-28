import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/shell/Container';
import { Button } from '@/components/common/Button';
import { SourceRegistry } from '@/modules/registry';
import { CollectionExplorer } from '@/components/collection/CollectionExplorer';

export const instant = false;

interface PageProps {
  params: Promise<{ prefix: string }>;
}

export function generateStaticParams() {
  return SourceRegistry.getVerifiedPrefixes().map((prefix) => ({ prefix }));
}

export async function generateMetadata({ params }: PageProps) {
  const { prefix } = await params;
  const source = SourceRegistry.getByPrefix(prefix);
  const title = source ? `${source.displayName} Icons` : `Collection: ${prefix}`;

  return {
    title: `${title} — IconHub`,
    description:
      source?.description ??
      `Browse and discover verified open-source vector icons from ${prefix} on IconHub.`,
  };
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { prefix } = await params;
  const source = SourceRegistry.getByPrefix(prefix);

  // Accessible fallback for unknown or unverified collection prefix
  if (!source) {
    return (
      <div className="py-16 sm:py-24">
        <Container>
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <span className="font-mono text-xs px-2.5 py-1 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)] mb-3 inline-block">
              prefix: {prefix}
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-heading)] tracking-tight mb-3">
              Collection Not Found
            </h1>

            <p className="text-sm text-[var(--color-text-body)] mb-8 leading-relaxed">
              The icon library prefix &ldquo;{prefix}&rdquo; is not cataloged as a verified source in the IconHub registry.
              Browse our directory of 14 verified open-source libraries below.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button href="/collections" variant="primary" size="md">
                Browse Verified Libraries
              </Button>
              <Button href="/" variant="outline" size="md">
                Return Home
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-14">
      <Container>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--color-heading)] underline">
                Home
              </Link>
            </li>
            <li>&gt;</li>
            <li>
              <Link href="/collections" className="hover:text-[var(--color-heading)] underline">
                Collections
              </Link>
            </li>
            <li>&gt;</li>
            <li className="font-semibold text-[var(--color-heading)] truncate" aria-current="page">
              {source.displayName}
            </li>
          </ol>
        </nav>

        {/* Collection Explorer */}
        <CollectionExplorer source={source} />
      </Container>
    </div>
  );
}
