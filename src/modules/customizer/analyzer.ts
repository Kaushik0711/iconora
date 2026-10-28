// ==============================================================================
// IconHub Icon Artwork Analyzer
// Inspects icon body markup and variant metadata to detect multicolor,
// stroke-width support, and dimensions.
// Strictly decouples visual variant labels from actual stroke-based geometry.
// ==============================================================================

import { DOMParser, type Element as XmlElement } from '@xmldom/xmldom';
import type { CuratedSource } from '../registry/types';
import type { IconArtworkAnalysis, PaintMode } from './types';
import { SVG_NAMESPACE } from '../svg/sanitizer';
import { classifyIconStyle } from '../search/style-classifier';

interface DimensionHints {
  readonly width?: number;
  readonly height?: number;
  readonly left?: number;
  readonly top?: number;
}

export interface IconIdentityHint {
  readonly prefix?: string;
  readonly name?: string;
}

/**
 * Normalizes color strings for equality comparison.
 */
function normalizeColorForComparison(color: string): string {
  const c = color.trim().toLowerCase();
  if (c === '#fff') return '#ffffff';
  if (c === '#000') return '#000000';
  return c;
}

const NEUTRAL_COLORS = new Set([
  'none',
  'transparent',
  'currentcolor',
  'inherit',
  'initial',
]);

interface GeometryCounters {
  strokes: number;
  strokeWidths: number;
  fills: number;
  explicitNoneFills: number;
  shapes: number;
  lineShapes: number;
}

/**
 * Traverses an XML tree and gathers color, fill, and stroke attributes.
 */
function inspectElements(
  root: XmlElement,
  colors: Set<string>,
  counters: GeometryCounters
): void {
  const tag = (root.localName || root.tagName || '').toLowerCase();
  if (!tag) return;

  if (['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse'].includes(tag)) {
    counters.shapes++;
  }

  if (['line', 'polyline'].includes(tag)) {
    counters.lineShapes++;
  }

  const fill = root.getAttribute('fill');
  if (fill) {
    const norm = normalizeColorForComparison(fill);
    if (norm === 'none') {
      counters.explicitNoneFills++;
    } else {
      if (!NEUTRAL_COLORS.has(norm) && !norm.startsWith('url(')) {
        colors.add(norm);
      }
      counters.fills++;
    }
  }

  const stroke = root.getAttribute('stroke');
  if (stroke) {
    const norm = normalizeColorForComparison(stroke);
    if (norm !== 'none') {
      if (!NEUTRAL_COLORS.has(norm) && !norm.startsWith('url(')) {
        colors.add(norm);
      }
      counters.strokes++;
    }
  }

  const strokeWidth = root.getAttribute('stroke-width');
  if (strokeWidth && strokeWidth !== '0') {
    counters.strokeWidths++;
  }

  // Inspect children
  const children = root.childNodes;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const child = children.item(i);
      if (child && child.nodeType === 1) {
        inspectElements(child as XmlElement, colors, counters);
      }
    }
  }
}

/**
 * Analyzes an icon's SVG markup body and source capabilities to infer customizer limits.
 * Determines stroke-width support strictly from actual stroke geometry in the SVG markup,
 * decoupling visual aesthetic variant labels (like "outline") from editable paint modes.
 */
export function analyzeIconArtwork(
  body: string,
  source?: CuratedSource,
  dimensions?: DimensionHints,
  iconIdentity?: IconIdentityHint
): IconArtworkAnalysis {
  const nativeWidth = dimensions?.width && dimensions.width > 0
    ? dimensions.width
    : source?.defaultViewBox?.width ?? 24;

  const nativeHeight = dimensions?.height && dimensions.height > 0
    ? dimensions.height
    : source?.defaultViewBox?.height ?? 24;

  const minX = dimensions?.left ?? 0;
  const minY = dimensions?.top ?? 0;
  const nativeViewBox = `${minX} ${minY} ${nativeWidth} ${nativeHeight}`;

  const colors = new Set<string>();
  const counters: GeometryCounters = {
    strokes: 0,
    strokeWidths: 0,
    fills: 0,
    explicitNoneFills: 0,
    shapes: 0,
    lineShapes: 0,
  };

  try {
    const parser = new DOMParser({
      onError: () => {},
    });

    const doc = parser.parseFromString(
      `<svg xmlns="${SVG_NAMESPACE}">${body}</svg>`,
      'image/svg+xml'
    );

    if (doc.documentElement) {
      inspectElements(doc.documentElement, colors, counters);
    }
  } catch {
    // If parse fails, proceed with conservative defaults
  }

  const isMulticolor = colors.size >= 2;

  // Determine visual variant label based on naming or source conventions
  const prefix = iconIdentity?.prefix ?? source?.canonicalPrefix ?? '';
  const name = iconIdentity?.name ?? '';
  const classifiedVariant = prefix && name ? classifyIconStyle(prefix, name) : 'unknown';

  let visualVariant: 'outline' | 'solid' | 'duotone' | 'color';
  if (isMulticolor) {
    visualVariant = 'color';
  } else if (classifiedVariant === 'duotone') {
    visualVariant = 'duotone';
  } else if (classifiedVariant === 'solid') {
    visualVariant = 'solid';
  } else if (classifiedVariant === 'outline') {
    visualVariant = 'outline';
  } else if (source?.supportedStyles && source.supportedStyles.length === 1) {
    visualVariant = source.supportedStyles[0] === 'outline' ? 'outline' : 'solid';
  } else {
    visualVariant = counters.strokes > 0 ? 'outline' : 'solid';
  }

  // Determine whether the icon has actual stroke-based geometry
  // An icon is stroke-based ONLY if it contains non-none stroke attributes, stroke-width,
  // or line/polyline shapes with fill="none".
  const hasStrokeGeometry =
    counters.strokes > 0 ||
    counters.strokeWidths > 0 ||
    (counters.lineShapes > 0 && counters.explicitNoneFills > 0);

  // Determine actual paint mode
  let paintMode: PaintMode;
  if (hasStrokeGeometry && counters.fills > 0 && counters.explicitNoneFills === 0) {
    paintMode = 'mixed';
  } else if (hasStrokeGeometry) {
    paintMode = 'stroke';
  } else if (counters.fills > 0 || counters.shapes > 0) {
    paintMode = 'fill';
  } else {
    paintMode = 'none';
  }

  // Stroke-width controls are supported ONLY when actual stroke geometry exists AND artwork is not multicolor
  const supportsStrokeWidth = hasStrokeGeometry && !isMulticolor;

  // Detected style for backwards-compatible consumers (e.g. buildCustomizedSvg)
  let detectedStyle: 'outline' | 'solid' | 'multicolor';
  if (isMulticolor) {
    detectedStyle = 'multicolor';
  } else if (hasStrokeGeometry) {
    detectedStyle = 'outline';
  } else {
    detectedStyle = 'solid';
  }

  const supportsColor = !isMulticolor;

  // Contextual explanations for disabled controls
  let strokeDisabledReason: string | undefined;
  if (!supportsStrokeWidth) {
    if (isMulticolor) {
      strokeDisabledReason = 'Stroke-width adjustments are disabled for multicolor artwork to preserve original geometry.';
    } else if (visualVariant === 'outline') {
      strokeDisabledReason = 'This visual outline icon is drawn using filled vector paths rather than stroke geometry. Stroke-width adjustment requires vector stroke geometry.';
    } else {
      strokeDisabledReason = 'This glyph is rendered using filled vector paths rather than outline strokes. Stroke-width adjustments are disabled to avoid path distortion.';
    }
  }

  const colorDisabledReason = isMulticolor
    ? 'Multicolor artwork: original palette preserved.'
    : undefined;

  return {
    isMulticolor,
    supportsStrokeWidth,
    supportsColor,
    paintMode,
    visualVariant,
    detectedStyle,
    strokeDisabledReason,
    colorDisabledReason,
    nativeWidth,
    nativeHeight,
    nativeViewBox,
  };
}
