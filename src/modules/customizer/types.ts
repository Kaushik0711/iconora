// ==============================================================================
// IconHub Customizer Domain Types & Contracts
// Strict contracts for icon analysis, customization state, and code exports.
// Separates visual aesthetic classifications from actual editable paint modes.
// ==============================================================================

import type { CuratedSource } from '../registry/types';
import type { IconItemData } from '../provider/types';

export type ContainerShape = 'none' | 'square' | 'rounded' | 'circle';

export type RotationAngle = 0 | 90 | 180 | 270;

export type PaintMode = 'stroke' | 'fill' | 'mixed' | 'none';

export interface IconArtworkAnalysis {
  /** Whether the icon uses multiple distinct colors (excluding none/currentColor) */
  readonly isMulticolor: boolean;
  /** Whether stroke-width adjustments are supported based on actual stroke geometry */
  readonly supportsStrokeWidth: boolean;
  /** Whether foreground color customization is supported */
  readonly supportsColor: boolean;
  /** Actual geometry paint mode (stroke, fill, mixed, none) */
  readonly paintMode: PaintMode;
  /** Visual variant classification (outline, solid, duotone, color) */
  readonly visualVariant: 'outline' | 'solid' | 'duotone' | 'color';
  /** Detected style (backwards-compatible with detectedStyle) */
  readonly detectedStyle: 'outline' | 'solid' | 'multicolor';
  /** Contextual explanation when stroke-width controls are disabled */
  readonly strokeDisabledReason?: string;
  /** Contextual explanation when color controls are disabled */
  readonly colorDisabledReason?: string;
  /** Inferred native width */
  readonly nativeWidth: number;
  /** Inferred native height */
  readonly nativeHeight: number;
  /** Inferred native viewBox */
  readonly nativeViewBox: string;
}

export interface CustomizerState {
  /** Rendered display size in pixels (16 to 256) */
  size: number;
  /** Foreground color (hex or currentColor) */
  color: string;
  /** Whether container background is enabled */
  hasBackground: boolean;
  /** Container background fill color */
  backgroundColor: string;
  /** Stroke width in pixels (0.5 to 3.5) */
  strokeWidth: number;
  /** Rotation angle in 90-degree increments */
  rotate: RotationAngle;
  /** Horizontal reflection */
  flipHorizontal: boolean;
  /** Vertical reflection */
  flipVertical: boolean;
  /** Container framing shape */
  containerShape: ContainerShape;
  /** Container inner padding in pixels (0 to 48) */
  padding: number;
  /** Container border radius in pixels (0 to 32) */
  borderRadius: number;
  /** Container border width in pixels (0 to 8) */
  borderWidth: number;
  /** Container border color */
  borderColor: string;
}

export type ExportFormat = 'svg' | 'react' | 'html' | 'css' | 'png';

export type PngResolution = 64 | 128 | 256 | 512;

export interface SiblingVariant {
  readonly name: string;
  readonly label: string;
  readonly style: 'outline' | 'solid' | 'duotone' | 'color';
  readonly isCurrent: boolean;
}

export interface CustomizerPageData {
  readonly iconData: IconItemData;
  readonly source: CuratedSource;
  readonly analysis: IconArtworkAnalysis;
  readonly siblingVariants: readonly SiblingVariant[];
}
