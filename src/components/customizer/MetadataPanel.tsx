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
    <div className="flex flex-col gap-4">
      {/* Sibling Variants Selector (if family has variants) */}
      {siblingVariants.length > 1 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-2xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-heading)] tracking-tight">
              Style Variants in this Collection
            </span>
            <span className="text-2xs text-[var(--color-text-muted)] font-mono font-medium">
              {siblingVariants.length} styles
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {siblingVariants.map((v) => (
              <Link
                key={v.name}
                href={`/icon/${prefix}/${v.name}`}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  v.isCurrent
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs font-bold'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:border-[var(--color-primary)]/40'
                }`}
              >
                {v.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Licensing & Rights Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-2xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[var(--color-heading)] tracking-tight">
              Artwork Licensing & Rights
            </span>
          </div>

          <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]/20">
            {source.license.spdxId || source.license.id}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs border-t border-[var(--color-border)] pt-3">
          <div>
            <dt className="text-[var(--color-text-muted)] text-2xs font-medium">Primary License</dt>
            <dd className="font-semibold text-[var(--color-heading)] mt-0.5">
              {source.license.url ? (
                <a
                  href={source.license.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[var(--color-primary)] inline-flex items-center gap-1"
                >
                  <span>{source.license.title}</span>
                  <span className="text-2xs">↗</span>
                </a>
              ) : (
                source.license.title
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)] text-2xs font-medium">Commercial Use</dt>
            <dd className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <span>✓ Allowed</span>
            </dd>
          </div>
        </dl>

        {/* Attribution alert banner */}
        {isAttributionRequired ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed mt-1">
            <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
              <span>⚠ Attribution Required</span>
            </div>
            <p>
              This collection is licensed under {source.license.title}. You must provide appropriate credit and link to the license when embedding or redistributing.
            </p>
          </div>
        ) : (
          <p className="text-2xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] p-2.5 rounded-xl border border-[var(--color-border)] leading-relaxed">
            Attribution is not legally required for embedding, though preserving code comments is appreciated.
          </p>
        )}

        {/* Trademark notice banner */}
        {hasTrademark && (
          <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs text-[var(--color-text-body)] leading-relaxed mt-1">
            <span className="font-bold block text-[var(--color-heading)] mb-1">
              Trademark Notice
            </span>
            <span>{source.trademarkNotice}</span>
          </div>
        )}
      </div>

      {/* Upstream & Collection Information Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-2xs flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <span className="text-xs font-bold text-[var(--color-heading)] tracking-tight">
            Provenance & Collection Info
          </span>
        </div>

        <div className="flex flex-col gap-2 text-xs border-t border-[var(--color-border)] pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Canonical ID</span>
            <span className="font-mono text-2xs font-bold text-[var(--color-primary)] bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded border border-[var(--color-border)]">
              {prefix}:{name}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Collection</span>
            <Link
              href={`/collection/${prefix}`}
              className="font-semibold text-[var(--color-heading)] hover:text-[var(--color-primary)] underline decoration-[var(--color-primary)]/30 hover:decoration-[var(--color-primary)] transition-colors"
            >
              {source.displayName}
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Official Site</span>
            <a
              href={source.upstreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] hover:underline truncate max-w-[200px] font-medium"
            >
              {source.upstreamUrl.replace(/^https?:\/\//, '')} ↗
            </a>
          </div>

          {source.repositoryUrl && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Source Code</span>
              <a
                href={source.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline truncate max-w-[200px] font-medium"
              >
                GitHub ↗
              </a>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)] text-2xs text-[var(--color-text-muted)]">
            <span>Verified Library</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <span>●</span> Verified Catalog
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
