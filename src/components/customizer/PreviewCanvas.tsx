'use client';

import React, { useState } from 'react';
import type { CustomizerState } from '@/modules/customizer/types';

interface PreviewCanvasProps {
  svgMarkup: string;
  state: CustomizerState;
  onReset: () => void;
}

export function PreviewCanvas({ svgMarkup, state, onReset }: PreviewCanvasProps) {
  const [bgMode, setBgMode] = useState<'checkerboard' | 'light' | 'dark'>('checkerboard');
  const [displayMode, setDisplayMode] = useState<'fit' | 'actual'>('fit');

  const totalDimension = state.containerShape !== 'none'
    ? state.size + state.padding * 2
    : state.size;

  // Presentation scale: In "fit/focus" mode, scale the icon to a comfortable on-screen inspection size (~160px)
  // while preserving exact SVG export attributes (width/height) on the SVG root.
  const targetVisualSize = 160;
  const fitScale = Math.min(8, Math.max(1, +(targetVisualSize / totalDimension).toFixed(2)));
  const activeScale = displayMode === 'fit' ? fitScale : 1;

  const bgClasses = {
    checkerboard: 'checkerboard-pattern border-[var(--color-border)]',
    light: 'bg-white border-slate-200 shadow-inner',
    dark: 'bg-slate-950 border-slate-800 shadow-inner',
  }[bgMode];

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] overflow-hidden shadow-xs">
      {/* Top Studio Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-main)] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-heading)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" aria-hidden="true" />
            <span>Interactive Stage</span>
          </div>

          <span
            className="text-2xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] whitespace-nowrap shrink-0 font-medium"
            title="Exported pixel bounding box"
          >
            Output: {totalDimension} × {totalDimension}px
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Display zoom mode: Focus / Large vs 1:1 Actual */}
          <div
            role="group"
            aria-label="Preview display scale"
            className="flex items-center p-0.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs"
          >
            <button
              type="button"
              onClick={() => setDisplayMode('fit')}
              aria-pressed={displayMode === 'fit'}
              title="Display icon at large inspection scale"
              className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                displayMode === 'fit'
                  ? 'bg-[var(--color-bg-main)] text-[var(--color-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
              }`}
            >
              Focus ({fitScale}×)
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('actual')}
              aria-pressed={displayMode === 'actual'}
              title="Display at 100% exact 1:1 exported pixel size"
              className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                displayMode === 'actual'
                  ? 'bg-[var(--color-bg-main)] text-[var(--color-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
              }`}
            >
              1:1 Actual
            </button>
          </div>

          {/* Background switcher */}
          <div
            role="group"
            aria-label="Canvas background preview style"
            className="flex items-center p-0.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs"
          >
            <button
              type="button"
              onClick={() => setBgMode('checkerboard')}
              aria-pressed={bgMode === 'checkerboard'}
              className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                bgMode === 'checkerboard'
                  ? 'bg-[var(--color-bg-main)] text-[var(--color-heading)] shadow-2xs font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setBgMode('light')}
              aria-pressed={bgMode === 'light'}
              className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                bgMode === 'light'
                  ? 'bg-[var(--color-bg-main)] text-[var(--color-heading)] shadow-2xs font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setBgMode('dark')}
              aria-pressed={bgMode === 'dark'}
              className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                bgMode === 'dark'
                  ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
              }`}
            >
              Dark
            </button>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={onReset}
            title="Reset customizations to default"
            className="flex items-center gap-1 px-2.5 py-1 text-2xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)] hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className={`relative flex items-center justify-center min-h-[300px] sm:min-h-[360px] p-8 sm:p-12 transition-colors overflow-hidden ${bgClasses}`}
      >
        {/* Subtle stage guideline frame */}
        <div
          className="absolute inset-4 rounded-xl border border-black/5 dark:border-white/5 pointer-events-none"
          aria-hidden="true"
        />

        {/* Scaled Presentation Wrapper */}
        <div
          className="flex items-center justify-center transition-transform duration-200 ease-out drop-shadow-sm select-none"
          style={{
            transform: `scale(${activeScale})`,
            transformOrigin: 'center center',
          }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>

      {/* Bottom Parameter Quick-Readout Strip */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 text-2xs text-[var(--color-text-muted)] gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-[var(--color-heading)]">Glyph:</span>
            <span>{state.size}px</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-[var(--color-heading)]">Color:</span>
            <span className="inline-flex items-center gap-1">
              {state.color.startsWith('#') && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 shrink-0"
                  style={{ backgroundColor: state.color }}
                  aria-hidden="true"
                />
              )}
              <span className="font-mono">{state.color}</span>
            </span>
          </span>

          {state.strokeWidth && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <span className="font-semibold text-[var(--color-heading)]">Stroke:</span>
              <span>{state.strokeWidth}px</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {state.rotate !== 0 && (
            <span className="inline-flex items-center gap-1 font-mono">
              <span>Rotate:</span>
              <span className="font-semibold text-[var(--color-heading)]">{state.rotate}°</span>
            </span>
          )}
          {state.containerShape !== 'none' && (
            <span className="inline-flex items-center gap-1 capitalize">
              <span>Frame:</span>
              <span className="font-semibold text-[var(--color-heading)]">{state.containerShape}</span>
            </span>
          )}
          <span className="text-[var(--color-text-muted)]">
            {displayMode === 'fit' ? `Display: ${fitScale}× Zoom` : 'Display: 1:1 Scale'}
          </span>
        </div>
      </div>
    </div>
  );
}
