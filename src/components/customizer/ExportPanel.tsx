'use client';

import React, { useState, useCallback } from 'react';
import type { ExportFormat, PngResolution } from '@/modules/customizer/types';
import type { ExportMetadataOptions } from '@/modules/customizer/exporter';
import {
  generateStandaloneSvg,
  generateReactJsx,
  generateHtmlSnippet,
  generateCssSnippet,
} from '@/modules/customizer/exporter';
import { showToast } from '@/modules/toast/toast';

interface ExportPanelProps {
  svgMarkup: string;
  metadata: ExportMetadataOptions;
}

const PNG_RESOLUTIONS: PngResolution[] = [64, 128, 256, 512];

export function ExportPanel({ svgMarkup, metadata }: ExportPanelProps) {
  const [activeTab, setActiveTab] = useState<ExportFormat>('svg');
  const [copied, setCopied] = useState(false);
  const [pngResolution, setPngResolution] = useState<PngResolution>(256);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Compute code snippet for current tab
  const getExportSnippet = useCallback(
    (format: ExportFormat): string => {
      switch (format) {
        case 'svg':
          return generateStandaloneSvg(svgMarkup, metadata);
        case 'react':
          return generateReactJsx(svgMarkup, metadata);
        case 'html':
          return generateHtmlSnippet(svgMarkup, metadata);
        case 'css':
          return generateCssSnippet(svgMarkup, metadata);
        case 'png':
          return '';
      }
    },
    [svgMarkup, metadata]
  );

  const activeSnippet = getExportSnippet(activeTab);

  // Copy code handler
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeSnippet);
      setCopied(true);
      showToast(`Copied ${activeTab.toUpperCase()} to clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // Download SVG file handler
  const handleDownloadSvg = () => {
    try {
      const standalone = generateStandaloneSvg(svgMarkup, metadata);
      const blob = new Blob([standalone], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metadata.prefix}-${metadata.name}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${metadata.name}.svg`, 'success');
    } catch {
      showToast('Failed to download SVG', 'error');
    }
  };

  // Download PNG rasterized via canvas
  const handleDownloadPng = async () => {
    setIsDownloadingPng(true);
    setDownloadError(null);

    let blobUrl: string | null = null;
    try {
      const standalone = generateStandaloneSvg(svgMarkup, metadata);
      const svgBlob = new Blob([standalone], { type: 'image/svg+xml;charset=utf-8' });
      blobUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to rasterize SVG into image element'));
        img.src = blobUrl!;
      });

      const canvas = document.createElement('canvas');
      canvas.width = pngResolution;
      canvas.height = pngResolution;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      ctx.clearRect(0, 0, pngResolution, pngResolution);
      ctx.drawImage(img, 0, 0, pngResolution, pngResolution);

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );

      if (!pngBlob) {
        throw new Error('Failed to create PNG blob from canvas');
      }

      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${metadata.prefix}-${metadata.name}-${pngResolution}x${pngResolution}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
      showToast(`Downloaded ${metadata.name}.png (${pngResolution}px)`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PNG export failed';
      setDownloadError(msg);
      showToast(msg, 'error');
    } finally {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      setIsDownloadingPng(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden shadow-xs">
      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Export format selection"
        className="flex items-center gap-1 p-2 border-b border-[var(--color-border)] bg-[var(--color-bg-main)] overflow-x-auto no-scrollbar"
      >
        {(['svg', 'react', 'html', 'css', 'png'] as ExportFormat[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            id={`tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`min-h-[40px] flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-heading)] hover:bg-[var(--color-bg-secondary)]'
            }`}
          >
            {tab === 'react' ? 'React JSX' : tab.toUpperCase()}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {activeTab !== 'png' ? (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)] hover:bg-[var(--color-bg-main)] transition-colors cursor-pointer"
              >
                {copied ? (
                  <span className="text-emerald-600 font-bold">✓ Copied</span>
                ) : (
                  <span>Copy Code</span>
                )}
              </button>
              {activeTab === 'svg' && (
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="px-3 py-1.5 min-h-[40px] flex items-center justify-center text-xs font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
                >
                  Download .svg
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="p-4 sm:p-5">
        {activeTab === 'png' ? (
          <div
            role="tabpanel"
            id="panel-png"
            aria-labelledby="tab-png"
            className="flex flex-col gap-4 max-w-md"
          >
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-heading)] mb-1">
                PNG Raster Export
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Render crisp raster PNGs at standard resolutions with transparency preserved.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[var(--color-heading)]">Resolution</label>
              <div className="grid grid-cols-4 gap-2">
                {PNG_RESOLUTIONS.map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setPngResolution(res)}
                    aria-pressed={pngResolution === res}
                    className={`py-2 text-xs font-mono rounded-lg border transition-colors ${
                      pngResolution === res
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                    }`}
                  >
                    {res}px
                  </button>
                ))}
              </div>
            </div>

            {downloadError && (
              <p className="text-xs text-rose-600 font-medium">{downloadError}</p>
            )}

            <button
              type="button"
              disabled={isDownloadingPng}
              onClick={handleDownloadPng}
              className="mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-xs hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors shadow-xs"
            >
              {isDownloadingPng ? 'Rasterizing PNG...' : `Download ${pngResolution} × ${pngResolution} PNG`}
            </button>
          </div>
        ) : (
          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="relative"
          >
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-2xs sm:text-xs overflow-x-auto max-h-[320px] leading-relaxed border border-slate-800">
              <code>{activeSnippet}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

