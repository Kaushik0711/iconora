'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import type {
  CustomizerState,
  IconArtworkAnalysis,
  SiblingVariant,
} from '@/modules/customizer/types';
import type { IconItemData } from '@/modules/provider/types';
import type { CuratedSource } from '@/modules/registry/types';
import { buildCustomizedSvg } from '@/modules/customizer/svg-builder';
import { useIconFavorites, recordRecentlyViewedIcon } from '@/modules/storage';
import { showToast } from '@/modules/toast/toast';
import { PreviewCanvas } from './PreviewCanvas';
import { ControlsPanel } from './ControlsPanel';
import { ExportPanel } from './ExportPanel';
import { MetadataPanel } from './MetadataPanel';

interface IconCustomizerProps {
  iconData: IconItemData;
  source: CuratedSource;
  analysis: IconArtworkAnalysis;
  siblingVariants?: readonly SiblingVariant[];
}

export function IconCustomizer({
  iconData,
  source,
  analysis,
  siblingVariants = [],
}: IconCustomizerProps) {
  // Favorites persistence
  const { isFavorite, toggleFavorite } = useIconFavorites();
  const isIconFavorited = isFavorite(iconData.canonicalId);

  // Record recently viewed on mount
  useEffect(() => {
    try {
      recordRecentlyViewedIcon(iconData.canonicalId, iconData.prefix, iconData.name);
    } catch {
      // ignore storage failure
    }
  }, [iconData.canonicalId, iconData.prefix, iconData.name]);

  // Compute baseline defaults from analysis
  const initialDefaultState = useMemo<CustomizerState>(() => {
    const defaultSize = analysis.nativeWidth >= 16 && analysis.nativeWidth <= 64
      ? analysis.nativeWidth
      : 24;

    return {
      size: defaultSize,
      color: analysis.isMulticolor ? 'currentColor' : '#000000',
      hasBackground: false,
      backgroundColor: '#ffffff',
      strokeWidth: 2,
      rotate: 0,
      flipHorizontal: false,
      flipVertical: false,
      containerShape: 'none',
      padding: 16,
      borderRadius: 8,
      borderWidth: 0,
      borderColor: '#e2e8f0',
    };
  }, [analysis]);

  const [state, setState] = useState<CustomizerState>(initialDefaultState);
  const [copiedId, setCopiedId] = useState(false);

  // Update handler
  const handleStateChange = useCallback((patch: Partial<CustomizerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Reset handler
  const handleReset = useCallback(() => {
    setState(initialDefaultState);
    showToast('Reset customizations to default', 'info');
  }, [initialDefaultState]);

  // Copy canonical ID helper
  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(iconData.canonicalId);
      setCopiedId(true);
      showToast(`Copied ${iconData.canonicalId} to clipboard!`, 'success');
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      showToast('Failed to copy ID to clipboard', 'error');
    }
  }, [iconData.canonicalId]);

  // Generate customized SVG
  const { svgString } = useMemo(() => {
    return buildCustomizedSvg(iconData.body, state, analysis);
  }, [iconData.body, state, analysis]);

  const safeSvg = svgString || `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">${iconData.body}</svg>`;

  const exportMetadata = useMemo(
    () => ({
      prefix: iconData.prefix,
      name: iconData.name,
      source,
    }),
    [iconData.prefix, iconData.name, source]
  );

  // Quick Copy SVG Handler
  const handleQuickCopySvg = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(safeSvg);
      showToast('Copied customized SVG to clipboard!', 'success');
    } catch {
      showToast('Failed to copy SVG', 'error');
    }
  }, [safeSvg]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* 1. Header Section: Breadcrumbs & Icon Identity Bar */}
      <div className="flex flex-col gap-4">
        {/* Navigation Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-text-muted)]">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/" className="hover:text-[var(--color-heading)] underline transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li>
              <Link href="/collections" className="hover:text-[var(--color-heading)] underline transition-colors">
                Icon Sets
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li>
              <Link
                href={`/collection/${iconData.prefix}`}
                className="hover:text-[var(--color-heading)] underline transition-colors"
              >
                {source.displayName}
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li className="font-semibold text-[var(--color-heading)]" aria-current="page">
              {iconData.name}
            </li>
          </ol>
        </nav>

        {/* Hero Identity Banner Card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-5 sm:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-xs">
          {/* Left: Icon Glyph Avatar + Title + Badges */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            {/* Visual Icon Avatar */}
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center p-2.5 shrink-0 shadow-2xs text-[var(--color-heading)]"
              aria-hidden="true"
              dangerouslySetInnerHTML={{
                __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${iconData.width} ${iconData.height}" class="w-full h-full text-current" fill="none" stroke="currentColor" stroke-width="2">${iconData.body}</svg>`,
              }}
            />

            {/* Title & Metadata Badges */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Canonical ID with copy action */}
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Click to copy canonical identifier"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-2xs font-bold text-[var(--color-primary)] hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer group"
                >
                  <span>{iconData.canonicalId}</span>
                  {copiedId ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-3xs font-sans">✓ Copied</span>
                  ) : (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-60 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>

                {/* Collection Badge */}
                <Link
                  href={`/collection/${iconData.prefix}`}
                  className="text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:border-[var(--color-primary)]/40 transition-colors"
                >
                  {source.displayName}
                </Link>

                {/* License Badge */}
                <span className="text-2xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {source.license.spdxId || source.license.id}
                </span>

                {/* Commercial Use Pill */}
                <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hidden sm:inline-block">
                  Commercial Free
                </span>
              </div>

              {/* Icon Name Main Heading */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-heading)] tracking-tight truncate">
                {iconData.name}
              </h1>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0 flex-wrap">
            {/* Favorite toggle button */}
            <button
              type="button"
              onClick={() => {
                toggleFavorite(iconData.canonicalId);
                showToast(
                  isIconFavorited
                    ? `Removed ${iconData.name} from favorites`
                    : `Added ${iconData.name} to favorites`,
                  'info'
                );
              }}
              aria-label={isIconFavorited ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isIconFavorited}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isIconFavorited
                  ? 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:bg-[var(--color-bg-main)]'
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isIconFavorited ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{isIconFavorited ? 'Saved' : 'Save'}</span>
            </button>

            {/* Quick Copy SVG Button */}
            <button
              type="button"
              onClick={handleQuickCopySvg}
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)] hover:bg-[var(--color-bg-main)] hover:border-[var(--color-primary)]/40 transition-all cursor-pointer shadow-2xs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Quick SVG</span>
            </button>

            {/* More from collection button */}
            <Link
              href={`/collection/${iconData.prefix}`}
              className="px-3.5 py-2 min-h-[40px] flex items-center justify-center text-xs font-bold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 transition-all shadow-2xs"
            >
              More from {source.displayName} →
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Studio Workspace (Left: Preview & Code Exporter, Right: Controls & Provenance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Prominent Preview Canvas & Code Exporter */}
        <div className="lg:col-span-7 flex flex-col gap-6 lg:sticky lg:top-24">
          <PreviewCanvas
            svgMarkup={safeSvg}
            state={state}
            onReset={handleReset}
          />

          <ExportPanel
            svgMarkup={safeSvg}
            metadata={exportMetadata}
          />
        </div>

        {/* Right Column (5 cols): Customization Controls Studio & Provenance */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <ControlsPanel
            state={state}
            analysis={analysis}
            onChange={handleStateChange}
          />

          <MetadataPanel
            prefix={iconData.prefix}
            name={iconData.name}
            source={source}
            siblingVariants={siblingVariants}
          />
        </div>
      </div>
    </div>
  );
}
