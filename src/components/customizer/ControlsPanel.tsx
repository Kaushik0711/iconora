'use client';

import React from 'react';
import type {
  CustomizerState,
  IconArtworkAnalysis,
  ContainerShape,
  RotationAngle,
} from '@/modules/customizer/types';

interface ControlsPanelProps {
  state: CustomizerState;
  analysis: IconArtworkAnalysis;
  onChange: (patch: Partial<CustomizerState>) => void;
}

const COLOR_PRESETS = [
  '#000000',
  '#ffffff',
  '#2563eb', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

const SIZE_PRESETS = [16, 24, 32, 48, 64, 128];
const STROKE_PRESETS = [1, 1.5, 2, 2.5, 3];

export function ControlsPanel({ state, analysis, onChange }: ControlsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* 1. Size & Output Dimensions Card */}
      <section
        aria-labelledby="heading-size"
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-2xs flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v6h6" />
                <path d="M9 21v-6H3" />
              </svg>
            </div>
            <label id="heading-size" htmlFor="size-slider" className="text-xs font-bold text-[var(--color-heading)] tracking-tight">
              Export Dimensions
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={16}
              max={256}
              value={state.size}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onChange({ size: Math.max(16, Math.min(256, val)) });
              }}
              aria-label="Size in pixels"
              className="w-14 px-2 py-1 text-xs font-mono text-center font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            />
            <span className="text-2xs text-[var(--color-text-muted)] font-medium">px</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="size-slider"
            type="range"
            min={16}
            max={256}
            step={4}
            value={state.size}
            onChange={(e) => onChange({ size: parseInt(e.target.value, 10) })}
            className="flex-1 accent-[var(--color-primary)] cursor-pointer h-1.5 rounded-lg bg-[var(--color-bg-secondary)]"
          />
          <span className="text-2xs font-mono font-semibold text-[var(--color-heading)] w-10 text-right">
            {state.size}px
          </span>
        </div>

        {/* Quick Size Presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {SIZE_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ size: s })}
              className={`px-2.5 py-1 text-2xs font-mono rounded-lg border transition-all cursor-pointer ${
                state.size === s
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs font-bold'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:border-[var(--color-primary)]/40'
              }`}
            >
              {s}px
            </button>
          ))}
        </div>

        <div className="text-2xs text-[var(--color-text-muted)] flex items-center justify-between border-t border-[var(--color-border)] pt-2 mt-1">
          <span>Source Native Resolution</span>
          <span className="font-mono font-medium text-[var(--color-heading)]">
            {analysis.nativeWidth} × {analysis.nativeHeight} px
          </span>
        </div>
      </section>

      {/* 2. Color & Paint Card */}
      <section
        aria-labelledby="heading-color"
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-2xs flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 10 10 0 0 0 0-20" />
              </svg>
            </div>
            <label id="heading-color" htmlFor="color-hex" className="text-xs font-bold text-[var(--color-heading)] tracking-tight">
              Color & Palette
            </label>
          </div>

          {analysis.isMulticolor ? (
            <span className="text-2xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20">
              Multicolor Artwork
            </span>
          ) : (
            <span className="text-2xs font-mono font-medium text-[var(--color-text-muted)]">
              {state.color}
            </span>
          )}
        </div>

        {analysis.isMulticolor ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold block mb-0.5">Palette Protected</span>
            {analysis.colorDisabledReason || 'This icon contains multicolor artwork paths. Custom recoloring is disabled to preserve the original visual integrity.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Native picker + Hex Input */}
            <div className="flex items-center gap-2">
              <div className="relative w-9 h-9 rounded-xl border border-[var(--color-border)] overflow-hidden shadow-2xs p-0.5 bg-[var(--color-bg-secondary)] flex items-center justify-center shrink-0">
                <input
                  type="color"
                  value={state.color.startsWith('#') ? state.color : '#000000'}
                  onChange={(e) => onChange({ color: e.target.value })}
                  aria-label="Color picker"
                  className="w-full h-full rounded-lg cursor-pointer border-0 p-0"
                />
              </div>

              <input
                id="color-hex"
                type="text"
                value={state.color}
                onChange={(e) => onChange({ color: e.target.value })}
                placeholder="#000000 or currentColor"
                aria-label="Hex color value"
                className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              />
            </div>

            {/* Swatches & CurrentColor Preset */}
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ color: c })}
                  title={c}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer shadow-2xs ${
                    state.color.toLowerCase() === c.toLowerCase()
                      ? 'scale-110 ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-bg-main)] border-transparent'
                      : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                  }`}
                  aria-label={`Select color ${c}`}
                />
              ))}

              <button
                type="button"
                onClick={() => onChange({ color: 'currentColor' })}
                className={`px-3 py-1 text-2xs font-mono rounded-lg border transition-all cursor-pointer ${
                  state.color === 'currentColor'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white font-semibold shadow-xs'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)]'
                }`}
              >
                currentColor
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Stroke Width Control Card */}
      <section
        aria-labelledby="heading-stroke"
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-2xs flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12" strokeWidth="4" />
              </svg>
            </div>
            <label id="heading-stroke" htmlFor="stroke-slider" className="text-xs font-bold text-[var(--color-heading)] tracking-tight">
              Stroke Thickness
            </label>
          </div>

          {analysis.supportsStrokeWidth ? (
            <span className="text-xs font-mono font-bold text-[var(--color-heading)]">
              {state.strokeWidth}px
            </span>
          ) : (
            <span className="text-2xs px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 font-semibold border border-slate-500/20">
              {analysis.paintMode === 'fill' ? 'Fill-Based' : 'Solid / Fill'}
            </span>
          )}
        </div>

        {analysis.supportsStrokeWidth ? (
          <>
            <div className="flex items-center gap-3">
              <input
                id="stroke-slider"
                type="range"
                min={0.5}
                max={3.5}
                step={0.25}
                value={state.strokeWidth}
                onChange={(e) => onChange({ strokeWidth: parseFloat(e.target.value) })}
                className="flex-1 accent-[var(--color-primary)] cursor-pointer h-1.5 rounded-lg bg-[var(--color-bg-secondary)]"
              />
              <span className="text-2xs font-mono font-semibold text-[var(--color-heading)] w-10 text-right">
                {state.strokeWidth}px
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {STROKE_PRESETS.map((sw) => (
                <button
                  key={sw}
                  type="button"
                  onClick={() => onChange({ strokeWidth: sw })}
                  className={`px-2.5 py-1 text-2xs font-mono rounded-lg border transition-all cursor-pointer ${
                    state.strokeWidth === sw
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs font-bold'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  {sw}px
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="p-3 rounded-xl bg-slate-500/5 dark:bg-slate-800/40 border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] leading-relaxed">
            {analysis.strokeDisabledReason || 'This glyph is rendered using filled vector paths rather than outline strokes. Stroke-width adjustments are disabled to avoid path distortion.'}
          </div>
        )}
      </section>

      {/* 4. Orientation & Transforms Card */}
      <section
        aria-labelledby="heading-transforms"
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-2xs flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6" />
              <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </div>
          <span id="heading-transforms" className="text-xs font-bold text-[var(--color-heading)] tracking-tight">
            Orientation & Flip
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Rotation segmented buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold text-[var(--color-text-muted)]">Rotate</span>
            <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1">
              {([0, 90, 180, 270] as RotationAngle[]).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => onChange({ rotate: deg })}
                  aria-pressed={state.rotate === deg}
                  className={`flex-1 py-1 text-2xs font-mono font-medium rounded-lg transition-all text-center cursor-pointer ${
                    state.rotate === deg
                      ? 'bg-[var(--color-bg-main)] text-[var(--color-primary)] shadow-2xs font-bold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Flip buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold text-[var(--color-text-muted)]">Flip Axes</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ flipHorizontal: !state.flipHorizontal })}
                aria-pressed={state.flipHorizontal}
                className={`flex-1 py-1.5 text-2xs font-medium rounded-xl border transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  state.flipHorizontal
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)]'
                }`}
              >
                <span>Flip X</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ flipVertical: !state.flipVertical })}
                aria-pressed={state.flipVertical}
                className={`flex-1 py-1.5 text-2xs font-medium rounded-xl border transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  state.flipVertical
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)]'
                }`}
              >
                <span>Flip Y</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Container & Framing Card */}
      <section
        aria-labelledby="heading-container"
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-main)] shadow-2xs flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4" />
              </svg>
            </div>
            <span id="heading-container" className="text-xs font-bold text-[var(--color-heading)] tracking-tight">
              Container Frame & Background
            </span>
          </div>

          <span className="text-2xs font-mono capitalize font-medium text-[var(--color-text-muted)]">
            {state.containerShape}
          </span>
        </div>

        {/* Shape selector */}
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'square', 'rounded', 'circle'] as ContainerShape[]).map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => onChange({ containerShape: shape })}
              aria-pressed={state.containerShape === shape}
              className={`py-2 px-2 text-2xs font-medium rounded-xl border capitalize transition-all text-center cursor-pointer ${
                state.containerShape === shape
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs font-bold'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-body)] hover:text-[var(--color-heading)] hover:border-[var(--color-primary)]/40'
              }`}
            >
              {shape}
            </button>
          ))}
        </div>

        {/* Shape specific controls */}
        {state.containerShape !== 'none' && (
          <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 mt-1">
            {/* Background Color */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold text-[var(--color-heading)]">Fill Background</span>
                <label className="flex items-center gap-1.5 text-2xs text-[var(--color-text-muted)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={state.hasBackground}
                    onChange={(e) => onChange({ hasBackground: e.target.checked })}
                    className="accent-[var(--color-primary)] rounded cursor-pointer"
                  />
                  <span>Enable Fill</span>
                </label>
              </div>

              {state.hasBackground && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={state.backgroundColor}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    aria-label="Background color"
                    className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--color-border)] p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={state.backgroundColor}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    aria-label="Background hex color"
                    className="flex-1 px-2.5 py-1 text-xs font-mono rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-heading)]"
                  />
                </div>
              )}
            </div>

            {/* Padding Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-2xs">
                <label htmlFor="padding-slider" className="font-semibold text-[var(--color-heading)]">
                  Padding (Buffer)
                </label>
                <span className="font-mono text-[var(--color-heading)] font-semibold">{state.padding}px</span>
              </div>
              <input
                id="padding-slider"
                type="range"
                min={0}
                max={48}
                step={2}
                value={state.padding}
                onChange={(e) => onChange({ padding: parseInt(e.target.value, 10) })}
                className="w-full accent-[var(--color-primary)] cursor-pointer h-1.5 rounded-lg bg-[var(--color-bg-main)]"
              />
            </div>

            {/* Corner Radius (only for rounded) */}
            {state.containerShape === 'rounded' && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-2xs">
                  <label htmlFor="radius-slider" className="font-semibold text-[var(--color-heading)]">
                    Corner Radius
                  </label>
                  <span className="font-mono text-[var(--color-heading)] font-semibold">{state.borderRadius}px</span>
                </div>
                <input
                  id="radius-slider"
                  type="range"
                  min={0}
                  max={32}
                  step={2}
                  value={state.borderRadius}
                  onChange={(e) => onChange({ borderRadius: parseInt(e.target.value, 10) })}
                  className="w-full accent-[var(--color-primary)] cursor-pointer h-1.5 rounded-lg bg-[var(--color-bg-main)]"
                />
              </div>
            )}

            {/* Border Width & Color */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-2xs">
                <label htmlFor="border-slider" className="font-semibold text-[var(--color-heading)]">
                  Container Border
                </label>
                <span className="font-mono text-[var(--color-heading)] font-semibold">{state.borderWidth}px</span>
              </div>
              <input
                id="border-slider"
                type="range"
                min={0}
                max={8}
                step={1}
                value={state.borderWidth}
                onChange={(e) => onChange({ borderWidth: parseInt(e.target.value, 10) })}
                className="w-full accent-[var(--color-primary)] cursor-pointer h-1.5 rounded-lg bg-[var(--color-bg-main)]"
              />
              {state.borderWidth > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={state.borderColor}
                    onChange={(e) => onChange({ borderColor: e.target.value })}
                    aria-label="Border color"
                    className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--color-border)] p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={state.borderColor}
                    onChange={(e) => onChange({ borderColor: e.target.value })}
                    aria-label="Border hex color"
                    className="flex-1 px-2.5 py-1 text-xs font-mono rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-heading)]"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
