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
    <div className="flex flex-col gap-6 p-5 sm:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {/* 1. Size Control */}
      <section aria-labelledby="heading-size" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label id="heading-size" htmlFor="size-slider" className="text-xs font-semibold text-[var(--color-heading)]">
            Size
          </label>
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
              className="w-14 px-1.5 py-0.5 text-xs font-mono text-center rounded border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-heading)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <span className="text-2xs text-[var(--color-text-muted)]">px</span>
          </div>
        </div>

        <input
          id="size-slider"
          type="range"
          min={16}
          max={256}
          step={4}
          value={state.size}
          onChange={(e) => onChange({ size: parseInt(e.target.value, 10) })}
          className="w-full accent-[var(--color-primary)] cursor-pointer"
        />

        <div className="flex items-center gap-1.5 flex-wrap">
          {SIZE_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ size: s })}
              className={`px-2 py-0.5 text-2xs font-mono rounded border transition-colors ${
                state.size === s
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
              }`}
            >
              {s}px
            </button>
          ))}
        </div>
      </section>

      <hr className="border-[var(--color-border)]" />

      {/* 2. Color Control */}
      <section aria-labelledby="heading-color" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label id="heading-color" htmlFor="color-hex" className="text-xs font-semibold text-[var(--color-heading)]">
            Color
          </label>
          {analysis.isMulticolor && (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium border border-amber-500/20">
              Multicolor Artwork
            </span>
          )}
        </div>

        {analysis.isMulticolor ? (
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {analysis.colorDisabledReason || 'This icon uses multiple distinct colors. Global recoloring is disabled to preserve the designer’s original artwork palette.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.color.startsWith('#') ? state.color : '#000000'}
                onChange={(e) => onChange({ color: e.target.value })}
                aria-label="Color picker"
                className="w-8 h-8 rounded-lg cursor-pointer border border-[var(--color-border)] p-0.5 bg-[var(--color-bg-main)]"
              />
              <input
                id="color-hex"
                type="text"
                value={state.color}
                onChange={(e) => onChange({ color: e.target.value })}
                placeholder="#000000 or currentColor"
                aria-label="Hex color value"
                className="flex-1 px-2.5 py-1 text-xs font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-heading)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ color: c })}
                  title={c}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-md border transition-transform ${
                    state.color.toLowerCase() === c.toLowerCase()
                      ? 'scale-110 ring-2 ring-[var(--color-primary)] ring-offset-1 border-transparent'
                      : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                  }`}
                  aria-label={`Select color ${c}`}
                />
              ))}
              <button
                type="button"
                onClick={() => onChange({ color: 'currentColor' })}
                className={`px-2 py-1 text-2xs font-mono rounded border transition-colors ${
                  state.color === 'currentColor'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)]'
                }`}
              >
                currentColor
              </button>
            </div>
          </div>
        )}
      </section>

      <hr className="border-[var(--color-border)]" />

      {/* 3. Stroke Width Control */}
      <section aria-labelledby="heading-stroke" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label id="heading-stroke" htmlFor="stroke-slider" className="text-xs font-semibold text-[var(--color-heading)]">
            Stroke Width
          </label>
          {analysis.supportsStrokeWidth ? (
            <span className="text-xs font-mono font-semibold text-[var(--color-heading)]">
              {state.strokeWidth}px
            </span>
          ) : (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 font-medium border border-slate-500/20">
              {analysis.paintMode === 'fill' ? 'Fill-Based' : 'Solid / Fill'}
            </span>
          )}
        </div>

        {analysis.supportsStrokeWidth ? (
          <>
            <input
              id="stroke-slider"
              type="range"
              min={0.5}
              max={3.5}
              step={0.25}
              value={state.strokeWidth}
              onChange={(e) => onChange({ strokeWidth: parseFloat(e.target.value) })}
              className="w-full accent-[var(--color-primary)] cursor-pointer"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {STROKE_PRESETS.map((sw) => (
                <button
                  key={sw}
                  type="button"
                  onClick={() => onChange({ strokeWidth: sw })}
                  className={`px-2 py-0.5 text-2xs font-mono rounded border transition-colors ${
                    state.strokeWidth === sw
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                  }`}
                >
                  {sw}px
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {analysis.strokeDisabledReason || 'This glyph is rendered using filled vector paths rather than outline strokes. Stroke-width adjustments are disabled to avoid path distortion.'}
          </p>
        )}
      </section>

      <hr className="border-[var(--color-border)]" />

      {/* 4. Transformations */}
      <section aria-labelledby="heading-transforms" className="flex flex-col gap-2.5">
        <span id="heading-transforms" className="text-xs font-semibold text-[var(--color-heading)]">
          Orientation & Flip
        </span>

        <div className="grid grid-cols-2 gap-2">
          {/* Rotation buttons */}
          <div className="flex flex-col gap-1">
            <span className="text-2xs font-medium text-[var(--color-text-muted)]">Rotate</span>
            <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-main)] p-0.5">
              {([0, 90, 180, 270] as RotationAngle[]).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => onChange({ rotate: deg })}
                  aria-pressed={state.rotate === deg}
                  className={`flex-1 py-1 text-2xs font-medium rounded transition-colors text-center ${
                    state.rotate === deg
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Flip buttons */}
          <div className="flex flex-col gap-1">
            <span className="text-2xs font-medium text-[var(--color-text-muted)]">Flip</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ flipHorizontal: !state.flipHorizontal })}
                aria-pressed={state.flipHorizontal}
                className={`flex-1 py-1 text-2xs font-medium rounded border transition-colors text-center ${
                  state.flipHorizontal
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                }`}
              >
                Flip X
              </button>
              <button
                type="button"
                onClick={() => onChange({ flipVertical: !state.flipVertical })}
                aria-pressed={state.flipVertical}
                className={`flex-1 py-1 text-2xs font-medium rounded border transition-colors text-center ${
                  state.flipVertical
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
                }`}
              >
                Flip Y
              </button>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-[var(--color-border)]" />

      {/* 5. Container & Framing */}
      <section aria-labelledby="heading-container" className="flex flex-col gap-3">
        <span id="heading-container" className="text-xs font-semibold text-[var(--color-heading)]">
          Container Frame
        </span>

        {/* Shape selector */}
        <div className="grid grid-cols-4 gap-1.5">
          {(['none', 'square', 'rounded', 'circle'] as ContainerShape[]).map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => onChange({ containerShape: shape })}
              aria-pressed={state.containerShape === shape}
              className={`py-1.5 px-2 text-2xs font-medium rounded-lg border capitalize transition-colors text-center ${
                state.containerShape === shape
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]'
              }`}
            >
              {shape}
            </button>
          ))}
        </div>

        {/* Shape specific controls */}
        {state.containerShape !== 'none' && (
          <div className="flex flex-col gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-main)]">
            {/* Background Color */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-medium text-[var(--color-text-muted)]">Background Color</span>
                <label className="flex items-center gap-1.5 text-2xs text-[var(--color-text-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.hasBackground}
                    onChange={(e) => onChange({ hasBackground: e.target.checked })}
                    className="accent-[var(--color-primary)]"
                  />
                  <span>Fill Container</span>
                </label>
              </div>

              {state.hasBackground && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={state.backgroundColor}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    aria-label="Background color"
                    className="w-7 h-7 rounded cursor-pointer border border-[var(--color-border)] p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={state.backgroundColor}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    aria-label="Background hex color"
                    className="flex-1 px-2 py-0.5 text-xs font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)]"
                  />
                </div>
              )}
            </div>

            {/* Padding Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-2xs">
                <label htmlFor="padding-slider" className="font-medium text-[var(--color-text-muted)]">
                  Padding
                </label>
                <span className="font-mono text-[var(--color-heading)]">{state.padding}px</span>
              </div>
              <input
                id="padding-slider"
                type="range"
                min={0}
                max={48}
                step={2}
                value={state.padding}
                onChange={(e) => onChange({ padding: parseInt(e.target.value, 10) })}
                className="w-full accent-[var(--color-primary)] cursor-pointer"
              />
            </div>

            {/* Corner Radius (only for rounded) */}
            {state.containerShape === 'rounded' && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-2xs">
                  <label htmlFor="radius-slider" className="font-medium text-[var(--color-text-muted)]">
                    Corner Radius
                  </label>
                  <span className="font-mono text-[var(--color-heading)]">{state.borderRadius}px</span>
                </div>
                <input
                  id="radius-slider"
                  type="range"
                  min={0}
                  max={32}
                  step={2}
                  value={state.borderRadius}
                  onChange={(e) => onChange({ borderRadius: parseInt(e.target.value, 10) })}
                  className="w-full accent-[var(--color-primary)] cursor-pointer"
                />
              </div>
            )}

            {/* Border Width & Color */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-2xs">
                <label htmlFor="border-slider" className="font-medium text-[var(--color-text-muted)]">
                  Border Width
                </label>
                <span className="font-mono text-[var(--color-heading)]">{state.borderWidth}px</span>
              </div>
              <input
                id="border-slider"
                type="range"
                min={0}
                max={8}
                step={1}
                value={state.borderWidth}
                onChange={(e) => onChange({ borderWidth: parseInt(e.target.value, 10) })}
                className="w-full accent-[var(--color-primary)] cursor-pointer"
              />
              {state.borderWidth > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={state.borderColor}
                    onChange={(e) => onChange({ borderColor: e.target.value })}
                    aria-label="Border color"
                    className="w-6 h-6 rounded cursor-pointer border border-[var(--color-border)] p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={state.borderColor}
                    onChange={(e) => onChange({ borderColor: e.target.value })}
                    aria-label="Border hex color"
                    className="flex-1 px-2 py-0.5 text-xs font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-heading)]"
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

