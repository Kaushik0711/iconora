'use client';

import React, { useState } from 'react';
import type { CustomizerState } from '@/modules/customizer/types';

interface PreviewCanvasProps {
  svgMarkup: string;
  state: CustomizerState;
  onReset: () => void;
}

export function PreviewCanvas({ svgMarkup, state, onReset }: PreviewCanvasProps) {
  const [bgMode, setBgMode] = useState<'light' | 'dark' | 'checkerboard'>('checkerboard');

  const totalDimension = state.containerShape !== 'none'
    ? state.size + state.padding * 2
    : state.size;

  const bgClasses = {
    light: 'bg-white border-slate-200',
    dark: 'bg-slate-950 border-slate-800',
    checkerboard: 'checkerboard-pattern border-slate-200',
  }[bgMode];

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden shadow-xs">
      {/* Header bar with controls */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-main)] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[var(--color-heading)] hidden sm:inline">Preview Canvas</span>
          <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] whitespace-nowrap shrink-0">
            {totalDimension} × {totalDimension}px
          </span>
        </div>

        <div className="flex items-center gap-2">
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
            className="px-2.5 py-1 text-2xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className={`relative flex items-center justify-center min-h-[300px] sm:min-h-[380px] p-8 transition-colors ${bgClasses}`}
      >
        <div
          className="flex items-center justify-center transition-transform duration-150"
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>
    </div>
  );
}
