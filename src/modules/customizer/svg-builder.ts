// ==============================================================================
// IconHub Safe SVG Builder
// Applies size, color, stroke-width, rotation, flipping, and container styling
// directly to XML elements while strictly preserving path d geometry and
// validating the final document with sanitizeFullSvgDocument.
// ==============================================================================

import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from '@xmldom/xmldom';
import {
  SVG_NAMESPACE,
  validateAndSanitizeSvgBody,
  sanitizeFullSvgDocument,
  validateViewBox,
  isValidSvgColor,
} from '../svg/sanitizer';
import type { CustomizerState, IconArtworkAnalysis } from './types';

/**
 * Escapes attribute values for safe XML inclusion.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const SHAPE_TAGS = new Set([
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'use',
]);

/**
 * Recursively applies color and stroke-width updates directly to relevant XML elements
 * in the parsed icon tree. Never touches path `d` geometry.
 */
function applyElementPresentations(
  element: XmlElement,
  color: string | undefined,
  strokeWidth: number | undefined,
  analysis: IconArtworkAnalysis
): void {
  const tag = (element.localName || element.tagName || '').toLowerCase();

  // If not a container root svg, update presentation attributes
  if (tag !== 'svg') {
    // 1. Color updates for recolorable artwork
    if (color && !analysis.isMulticolor) {
      if (analysis.paintMode === 'stroke' || analysis.detectedStyle === 'outline') {
        // Outline stroke-based icon: update stroke attribute if present and not none
        if (element.hasAttribute('stroke')) {
          const currentStroke = element.getAttribute('stroke');
          if (currentStroke && currentStroke.toLowerCase() !== 'none') {
            element.setAttribute('stroke', color);
          }
        } else if (SHAPE_TAGS.has(tag) && !element.hasAttribute('fill')) {
          // If shape has no fill and no stroke, outline convention uses stroke
          element.setAttribute('stroke', color);
        }

        // If child explicitly specifies fill="currentColor", update fill to selected color
        if (element.getAttribute('fill') === 'currentColor') {
          element.setAttribute('fill', color);
        }
      } else if (analysis.paintMode === 'mixed') {
        if (element.hasAttribute('stroke')) {
          const currentStroke = element.getAttribute('stroke');
          if (currentStroke && currentStroke.toLowerCase() !== 'none') {
            element.setAttribute('stroke', color);
          }
        }
        if (element.hasAttribute('fill')) {
          const currentFill = element.getAttribute('fill');
          if (currentFill && currentFill.toLowerCase() !== 'none') {
            element.setAttribute('fill', color);
          }
        }
      } else {
        // Solid / fill icon: update fill attribute
        if (element.hasAttribute('fill')) {
          const currentFill = element.getAttribute('fill');
          if (currentFill && currentFill.toLowerCase() !== 'none') {
            element.setAttribute('fill', color);
          }
        } else if (SHAPE_TAGS.has(tag) && !element.hasAttribute('stroke')) {
          // Default SVG fill is black if neither fill nor stroke is declared
          element.setAttribute('fill', color);
        }

        // If child explicitly specifies stroke="currentColor", update stroke
        if (element.getAttribute('stroke') === 'currentColor') {
          element.setAttribute('stroke', color);
        }
      }
    }

    // 2. Stroke-width updates for stroke-based icons
    if (analysis.supportsStrokeWidth && strokeWidth !== undefined) {
      if (element.hasAttribute('stroke-width')) {
        element.setAttribute('stroke-width', String(strokeWidth));
      } else if (element.hasAttribute('stroke')) {
        const strokeVal = element.getAttribute('stroke');
        if (strokeVal && strokeVal.toLowerCase() !== 'none') {
          element.setAttribute('stroke-width', String(strokeWidth));
        }
      } else if (SHAPE_TAGS.has(tag)) {
        element.setAttribute('stroke-width', String(strokeWidth));
      }
    }
  }

  // Recurse through all child elements
  const children = element.childNodes;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const child = children.item(i);
      if (child && child.nodeType === 1) {
        applyElementPresentations(child as XmlElement, color, strokeWidth, analysis);
      }
    }
  }
}

/**
 * Generates safe, customized SVG markup based on customizer state and artwork analysis.
 * Validates native viewBox and dimensions, applies modifications safely to element nodes,
 * and validates the final composite document with sanitizeFullSvgDocument.
 */
export function buildCustomizedSvg(
  body: string,
  state: CustomizerState,
  analysis: IconArtworkAnalysis
): { isValid: boolean; svgString?: string; error?: string } {
  // 1. Validate native viewBox and dimensions
  const viewBoxResult = validateViewBox(analysis.nativeViewBox);
  if (!viewBoxResult.isValid || !viewBoxResult.normalized) {
    return {
      isValid: false,
      error: viewBoxResult.error || 'Invalid native viewBox specification',
    };
  }

  if (
    typeof analysis.nativeWidth !== 'number' ||
    !Number.isFinite(analysis.nativeWidth) ||
    analysis.nativeWidth <= 0 ||
    analysis.nativeWidth > 4096 ||
    typeof analysis.nativeHeight !== 'number' ||
    !Number.isFinite(analysis.nativeHeight) ||
    analysis.nativeHeight <= 0 ||
    analysis.nativeHeight > 4096
  ) {
    return {
      isValid: false,
      error: 'Native icon dimensions must be finite numbers between 1 and 4096',
    };
  }

  // 2. Validate state parameters
  if (
    typeof state.size !== 'number' ||
    !Number.isFinite(state.size) ||
    state.size < 16 ||
    state.size > 512
  ) {
    return {
      isValid: false,
      error: 'Size must be a finite number between 16 and 512',
    };
  }

  if (
    typeof state.strokeWidth !== 'number' ||
    !Number.isFinite(state.strokeWidth) ||
    state.strokeWidth < 0.25 ||
    state.strokeWidth > 10
  ) {
    return {
      isValid: false,
      error: 'strokeWidth must be a finite number between 0.25 and 10',
    };
  }

  if (
    typeof state.padding !== 'number' ||
    !Number.isFinite(state.padding) ||
    state.padding < 0 ||
    state.padding > 128
  ) {
    return {
      isValid: false,
      error: 'Padding must be a finite number between 0 and 128',
    };
  }

  if (
    typeof state.borderRadius !== 'number' ||
    !Number.isFinite(state.borderRadius) ||
    state.borderRadius < 0 ||
    state.borderRadius > 256
  ) {
    return {
      isValid: false,
      error: 'borderRadius must be a finite number between 0 and 256',
    };
  }

  if (
    typeof state.borderWidth !== 'number' ||
    !Number.isFinite(state.borderWidth) ||
    state.borderWidth < 0 ||
    state.borderWidth > 32
  ) {
    return {
      isValid: false,
      error: 'borderWidth must be a finite number between 0 and 32',
    };
  }

  if (state.rotate !== undefined && ![0, 90, 180, 270].includes(state.rotate)) {
    return {
      isValid: false,
      error: 'Rotation angle must be one of 0, 90, 180, or 270 degrees',
    };
  }

  if (state.color && !isValidSvgColor(state.color)) {
    return {
      isValid: false,
      error: `Invalid foreground color format: ${state.color}`,
    };
  }

  if (state.hasBackground && state.backgroundColor && !isValidSvgColor(state.backgroundColor)) {
    return {
      isValid: false,
      error: `Invalid background color format: ${state.backgroundColor}`,
    };
  }

  if (state.borderColor && !isValidSvgColor(state.borderColor)) {
    return {
      isValid: false,
      error: `Invalid border color format: ${state.borderColor}`,
    };
  }

  // 3. Sanitize original body
  const bodyValidation = validateAndSanitizeSvgBody(body);
  if (!bodyValidation.isValid || !bodyValidation.sanitizedBody) {
    return {
      isValid: false,
      error: bodyValidation.error || 'Invalid SVG icon body markup',
    };
  }

  // 4. Parse sanitized body and apply presentation attributes to child elements
  const size = state.size;
  const strokeWidth = analysis.supportsStrokeWidth ? state.strokeWidth : undefined;
  const color = analysis.isMulticolor
    ? undefined
    : state.color && isValidSvgColor(state.color)
    ? state.color
    : 'currentColor';

  const doc = new DOMParser({ onError: () => {} }).parseFromString(
    `<svg xmlns="${SVG_NAMESPACE}">${bodyValidation.sanitizedBody}</svg>`,
    'image/svg+xml'
  );

  if (!doc.documentElement) {
    return {
      isValid: false,
      error: 'Failed to parse icon body DOM structure',
    };
  }

  applyElementPresentations(doc.documentElement, color, strokeWidth, analysis);

  // Serialize modified child elements
  const serializer = new XMLSerializer();
  let modifiedChildrenMarkup = '';
  const rootChildren = doc.documentElement.childNodes;
  for (let i = 0; i < rootChildren.length; i++) {
    const child = rootChildren.item(i);
    if (child && child.nodeType === 1) {
      modifiedChildrenMarkup += serializer.serializeToString(child);
    }
  }

  const nativeW = analysis.nativeWidth;
  const nativeH = analysis.nativeHeight;
  const cx = nativeW / 2;
  const cy = nativeH / 2;

  // 5. Build transformation wrappers for rotation and flip
  const flipH = Boolean(state.flipHorizontal);
  const flipV = Boolean(state.flipVertical);
  const rotate = (state.rotate ?? 0) as 0 | 90 | 180 | 270;
  const hasTransform = rotate !== 0 || flipH || flipV;

  let wrappedBody = modifiedChildrenMarkup;
  if (hasTransform) {
    const sx = flipH ? -1 : 1;
    const sy = flipV ? -1 : 1;
    const tx = flipH ? nativeW : 0;
    const ty = flipV ? nativeH : 0;

    const flipTransform = (flipH || flipV)
      ? ` transform="translate(${tx} ${ty}) scale(${sx} ${sy})"`
      : '';
    const rotateTransform = rotate !== 0
      ? ` transform="rotate(${rotate} ${cx} ${cy})"`
      : '';

    wrappedBody = `<g${rotateTransform}><g${flipTransform}>${wrappedBody}</g></g>`;
  }

  const finalIconContent = `<g>${wrappedBody}</g>`;

  // 6. Container Framing
  const containerShape = state.containerShape ?? 'none';
  const hasContainer = containerShape !== 'none';
  const hasBg = state.hasBackground && isValidSvgColor(state.backgroundColor);
  const bgColor = hasBg ? state.backgroundColor : 'transparent';
  const borderWidth = state.borderWidth ?? 0;
  const borderColor = isValidSvgColor(state.borderColor) ? state.borderColor : '#000000';
  const borderRadius = state.borderRadius ?? 0;
  const padding = state.padding ?? 0;

  let rawGeneratedSvg = '';

  if (!hasContainer) {
    const bgElement = hasBg
      ? `<rect width="${nativeW}" height="${nativeH}" fill="${escapeXml(bgColor)}" rx="${borderRadius}" />`
      : '';

    rawGeneratedSvg = `<svg xmlns="${SVG_NAMESPACE}" viewBox="${viewBoxResult.normalized}" width="${size}" height="${size}">${bgElement}${finalIconContent}</svg>`;
  } else {
    const totalDim = size + padding * 2;
    const scale = size / Math.max(nativeW, nativeH);
    const offsetX = padding + (size - nativeW * scale) / 2;
    const offsetY = padding + (size - nativeH * scale) / 2;

    const halfBorder = borderWidth > 0 ? borderWidth / 2 : 0;
    const borderAttr = borderWidth > 0
      ? ` stroke="${escapeXml(borderColor)}" stroke-width="${borderWidth}"`
      : '';

    let shapeElement = '';
    if (containerShape === 'circle') {
      const r = totalDim / 2 - halfBorder;
      shapeElement = `<circle cx="${totalDim / 2}" cy="${totalDim / 2}" r="${r}" fill="${escapeXml(bgColor)}"${borderAttr} />`;
    } else {
      const rx = containerShape === 'rounded'
        ? Math.min(borderRadius, totalDim / 2)
        : 0;
      const rectSize = totalDim - borderWidth;
      shapeElement = `<rect x="${halfBorder}" y="${halfBorder}" width="${rectSize}" height="${rectSize}" rx="${rx}" ry="${rx}" fill="${escapeXml(bgColor)}"${borderAttr} />`;
    }

    rawGeneratedSvg = `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${totalDim} ${totalDim}" width="${totalDim}" height="${totalDim}">${shapeElement}<g transform="translate(${offsetX} ${offsetY}) scale(${scale})">${finalIconContent}</g></svg>`;
  }

  // 7. Validate complete generated document with full-document sanitizer
  const fullValidation = sanitizeFullSvgDocument(rawGeneratedSvg);
  if (!fullValidation.isValid || !fullValidation.svgString) {
    return {
      isValid: false,
      error: fullValidation.error || 'Failed full document SVG sanitization',
    };
  }

  return {
    isValid: true,
    svgString: fullValidation.svgString,
  };
}
