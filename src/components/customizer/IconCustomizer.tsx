'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type {
  CustomizerState,
  IconArtworkAnalysis,
  SiblingVariant,
} from '@/modules/customizer/types';
import type { IconItemData } from '@/modules/provider/types';
import type { CuratedSource } from '@/modules/registry/types';
import { buildCustomizedSvg } from '@/modules/customizer/svg-builder';
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

  // Update handler
  const handleStateChange = useCallback((patch: Partial<CustomizerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Reset handler
  const handleReset = useCallback(() => {
    setState(initialDefaultState);
  }, [initialDefaultState]);

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

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Breadcrumbs & Top Meta */}
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-text-muted)]">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <Link href="/" className="hover:text-[var(--color-heading)] underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li>
            <Link href="/search" className="hover:text-[var(--color-heading)] underline">
              Icons
            </Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li>
            <Link
              href={`/collection/${iconData.prefix}`}
              className="hover:text-[var(--color-heading)] underline"
            >
              {source.displayName}
            </Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li className="font-semibold text-[var(--color-heading)]" aria-current="page">
            {iconData.name}
          </li>
        </ol>
      </nav>

      {/* Main Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-xs text-[var(--color-primary)] font-semibold">
              {iconData.canonicalId}
            </span>
            <span className="text-2xs px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
              {source.displayName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-heading)] tracking-tight">
            {iconData.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/search?collection=${iconData.prefix}`}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)] transition-colors"
          >
            ← More from {source.displayName}
          </Link>
        </div>
      </div>

      {/* Workbench Grid Layout: Split desktop / Stacked mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Preview Canvas & Export Code */}
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

        {/* Right Column: Customization Controls & Metadata */}
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

