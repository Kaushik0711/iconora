import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/shell/Container';
import { Button } from '@/components/common/Button';

export const metadata = {
  title: 'About — IconHub',
  description: 'About the IconHub open-source discovery platform.',
};

export default function AboutPage() {
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="max-w-2xl">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <li>
                <Link href="/" className="hover:text-[var(--color-heading)] underline">
                  Home
                </Link>
              </li>
              <li>&gt;</li>
              <li className="font-semibold text-[var(--color-heading)]" aria-current="page">
                About
              </li>
            </ol>
          </nav>

          <h1 className="text-3xl font-extrabold text-[var(--color-heading)] tracking-tight mb-4">
            About IconHub
          </h1>

          <p className="text-base text-[var(--color-text-body)] mb-6 leading-relaxed">
            IconHub is a developer-focused, open-source icon discovery and customization website.
            Our mission is to provide instantaneous access to high-quality vector icons with full attribution transparency,
            direct SVG/React export, and unified customization tooling.
          </p>

          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] mb-8">
            <h2 className="text-sm font-bold text-[var(--color-heading)] mb-2">
              Transparency &amp; Open Source
            </h2>
            <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
              Every icon set cataloged on IconHub maintains strict separation between software wrapper licensing and underlying icon artwork licensing.
              Attribution terms and upstream repository links are prominently displayed on every collection.
            </p>
          </div>

          <Button href="/" variant="outline" size="sm">
            &larr; Return to Homepage
          </Button>
        </div>
      </Container>
    </div>
  );
}

