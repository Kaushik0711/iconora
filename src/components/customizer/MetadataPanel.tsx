import React from 'react';
import Link from 'next/link';
import type { CuratedSource } from '@/modules/registry/types';
import type { SiblingVariant } from '@/modules/customizer/types';

interface MetadataPanelProps {
  prefix: string;
  name: string;
  source: CuratedSource;
  siblingVariants?: readonly SiblingVariant[];
}

export function MetadataPanel({
  prefix,
  name,
  source,
  siblingVariants = [],
}: MetadataPanelProps) {
  const isAttributionRequired = source.license.attributionTerms === 'required';
  const hasTrademark = Boolean(source.trademarkNotice);

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {/* Sibling variants if available */}
      {siblingVariants.length > 1 && (
        <div className="flex flex-col gap-2 pb-4 border-b border-[var(--color-border)]">
          <span className="text-xs font-semibold text-[var(--color-heading)]">
            Style Variants in this Collection
          </span>
          <div className="flex flex-wrap gap-1.5">
            {siblingVariants.map((v) => (
              <Link
                key={v.name}
                href={`/icon/${prefix}/${v.name}`}
                className={`px-2.5 py-1 text-2xs font-medium rounded-lg border transition-colors ${
                  v.isCurrent
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                }`}
              >
                {v.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Licensing Card */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-heading)]">Artwork Licensing</span>
          <span className="text-2xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]/20">
            {source.license.spdxId || source.license.id}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-[var(--color-text-muted)] text-2xs">License</dt>
            <dd className="font-medium text-[var(--color-heading)] mt-0.5">
              {source.license.url ? (
                <a
                  href={source.license.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[var(--color-primary)]"
                >
                  {source.license.title} ↗
                </a>
              ) : (
                source.license.title
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)] text-2xs">Commercial Use</dt>
            <dd className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
              ✓ Allowed
            </dd>
          </div>
        </dl>

        {/* Attribution alert banner */}
        {isAttributionRequired ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
              <span>⚠ Attribution Required</span>
            </div>
            <span>
              This collection is licensed under {source.license.title}. You must provide appropriate credit and link to the license when embedding or redistributing.
            </span>
          </div>
        ) : (
          <p className="text-2xs text-[var(--color-text-muted)]">
            Attribution is not legally required for embedding, though preserving code comments is appreciated.
          </p>
        )}

        {/* Trademark notice banner */}
        {hasTrademark && (
          <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs text-[var(--color-text-body)] leading-relaxed">
            <span className="font-semibold block text-[var(--color-heading)] mb-1">
              Trademark Notice
            </span>
            <span>{source.trademarkNotice}</span>
          </div>
        )}
      </div>

      <hr className="border-[var(--color-border)]" />

      {/* Upstream & Collection Information */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-[var(--color-heading)]">Source Information</span>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Canonical ID</span>
          <span className="font-mono text-2xs font-semibold text-[var(--color-heading)]">
            {prefix}:{name}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Collection</span>
          <Link
            href={`/collection/${prefix}`}
            className="font-medium text-[var(--color-heading)] hover:text-[var(--color-primary)] underline"
          >
            {source.displayName}
          </Link>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Official Site</span>
          <a
            href={source.upstreamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline truncate max-w-[200px]"
          >
            {source.upstreamUrl.replace(/^https?:\/\//, '')} ↗
          </a>
        </div>
        {source.repositoryUrl && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">Repository</span>
            <a
              href={source.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] hover:underline truncate max-w-[200px]"
            >
              GitHub ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
