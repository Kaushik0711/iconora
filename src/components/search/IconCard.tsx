'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { SearchIconItem } from '@/modules/search/types';
import { buildSafeSvgString } from '@/modules/svg';
import { showToast } from '@/modules/toast/toast';

interface IconCardProps {
  readonly icon: SearchIconItem;
}

export function IconCard({ icon }: IconCardProps) {
  const [copied, setCopied] = useState(false);

  // Memoize safe SVG serialization to optimize rendering performance
  const safeSvgResult = useMemo(() => {
    return buildSafeSvgString({
      body: icon.body,
      width: 28,
      height: 28,
      viewBox: `0 0 ${icon.width} ${icon.height}`,
      color: 'currentColor',
      // Keep SVG class names within the sanitizer's conservative allowlist.
      // Color and transitions are inherited from the wrapper below.
      className: 'w-7 h-7',
    });
  }, [icon.body, icon.width, icon.height]);

  const handleCopySvg = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (safeSvgResult.svgString) {
      try {
        await navigator.clipboard.writeText(safeSvgResult.svgString);
        setCopied(true);
        showToast(`Copied ${icon.name} SVG to clipboard!`, 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        showToast('Failed to copy SVG to clipboard', 'error');
      }
    }
  };

  return (
    <div className="group relative flex flex-col items-center justify-between p-3 sm:p-4 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-150 focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
      <Link
        href={`/icon/${icon.prefix}/${icon.name}`}
        className="flex flex-col items-center w-full focus:outline-none"
        aria-label={`${icon.name} icon from ${icon.collectionName}`}
      >
        {/* Vector Glyph Canvas */}
        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]/60 mb-2 text-[var(--color-heading)] group-hover:text-[var(--color-primary)] group-hover:bg-[var(--color-primary-light)]/40 transition-colors">
          {safeSvgResult.svgString ? (
            <div
              className="flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: safeSvgResult.svgString }}
            />
          ) : (
            <div className="w-6 h-6 rounded bg-gray-200" />
          )}
        </div>

        {/* Icon Name */}
        <span
          className="text-xs font-medium text-[var(--color-heading)] w-full text-center truncate group-hover:text-[var(--color-primary)] transition-colors"
          title={icon.name}
        >
          {icon.name}
        </span>

        {/* Collection & License Badge */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
            {icon.prefix}
          </span>
          {icon.attributionRequired && (
            <span
              className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold"
              title="Attribution required under CC-BY-4.0"
            >
              BY
            </span>
          )}
        </div>
      </Link>

      {/* Copy SVG Action Button */}
      <button
        type="button"
        onClick={handleCopySvg}
        aria-label={`Copy SVG markup for ${icon.name}`}
        className="mt-2.5 w-full py-1.5 sm:py-1 min-h-[32px] sm:min-h-0 text-[11px] font-medium text-[var(--color-text-body)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-primary)] hover:text-white rounded-md transition-colors opacity-95 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
        title="Copy safe SVG markup to clipboard"
      >
        {copied ? 'Copied SVG!' : 'Copy SVG'}
      </button>
    </div>
  );
}

