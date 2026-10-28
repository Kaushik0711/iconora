// ==============================================================================
// IconHub SVG Safety & Sanitization Boundary
// Parser-based, fail-closed validation and serialization for vector markup.
// Strictly enforces namespace integrity and rejects external resource references.
// ==============================================================================

import {
  DOMParser,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
  type Node as XmlNode,
} from '@xmldom/xmldom';

/**
 * Standard allowed namespaces.
 */
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

/**
 * Whitelisted SVG element tag names permitted in icon bodies and SVG documents.
 */
export const ALLOWED_SVG_ELEMENTS = new Set([
  'svg',
  'path',
  'circle',
  'rect',
  'polygon',
  'polyline',
  'line',
  'ellipse',
  'g',
  'defs',
  'clippath',
  'clipPath',
  'mask',
  'use',
]);

/**
 * Whitelisted SVG attribute names permitted on elements (strictly lowercase).
 */
export const ALLOWED_SVG_ATTRIBUTES = new Set([
  'd',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'viewbox',
  'width',
  'height',
  'transform',
  'opacity',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'id',
  'clip-path',
  'clip-rule',
  'mask',
  'xmlns',
  'xmlns:xlink',
  'version',
  'href',
  'xlink:href',
]);

export interface SvgValidationResult {
  readonly isValid: boolean;
  readonly sanitizedBody?: string;
  readonly error?: string;
}

export interface FullSvgValidationResult {
  readonly isValid: boolean;
  readonly svgString?: string;
  readonly error?: string;
}

interface ReferenceCheck {
  readonly sourceElement: XmlElement;
  readonly sourceAttr: string;
  readonly targetId: string;
  readonly expectedTag?: string;
}

/**
 * Checks for dangerous pseudo-protocols or executable URI schemes.
 */
function isDangerousUri(uri: string): boolean {
  const sanitized = uri.replace(/[\u0000-\u001F\u007F-\u009F\s]/g, '').toLowerCase();
  return (
    sanitized.includes('javascript:') ||
    sanitized.includes('vbscript:') ||
    sanitized.includes('data:') ||
    sanitized.includes('file:')
  );
}

/**
 * Validates a color value against safe CSS formats.
 * Accepts ONLY safe color values and keywords. Rejects url(...), expressions, and external resources.
 */
export function isValidSvgColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  const c = color.trim().toLowerCase();

  // Basic safe keywords
  if (c === 'currentcolor' || c === 'none' || c === 'transparent') {
    return true;
  }

  // Hex colors: #fff, #ffffff, #ffffff80
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(c)) {
    return true;
  }

  // rgb/rgba colors: rgb(255, 255, 255), rgba(0, 0, 0, 0.5)
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(c)) {
    return true;
  }

  // hsl/hsla colors
  if (/^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(c)) {
    return true;
  }

  // Strict standard CSS named colors (alphabetic only, 3-20 characters)
  if (/^[a-z]{3,20}$/.test(c)) {
    return true;
  }

  return false;
}

/**
 * Validates an individual element and all of its descendants recursively.
 * Enforces namespace verification, element/attribute allowlists, and references.
 */
function validateElementTree(
  element: XmlElement,
  idMap: Map<string, XmlElement>,
  referencesToCheck: ReferenceCheck[]
): { isValid: boolean; error?: string } {
  const tagName = element.tagName.toLowerCase().replace(/^svg:/, '');

  if (!ALLOWED_SVG_ELEMENTS.has(tagName)) {
    return {
      isValid: false,
      error: `Disallowed SVG element: <${tagName}>`,
    };
  }

  // Validate namespace of the element: every element must belong strictly to the SVG namespace
  if (element.namespaceURI !== SVG_NAMESPACE) {
    return {
      isValid: false,
      error: `Disallowed or missing element namespace: "${element.namespaceURI ?? ''}" on <${tagName}>, expected "${SVG_NAMESPACE}"`,
    };
  }

  // Record element ID and enforce uniqueness
  const rawId = element.getAttribute('id');
  if (rawId !== null) {
    const trimmedId = rawId.trim();
    if (!trimmedId || !/^[a-zA-Z0-9_\-]+$/.test(trimmedId)) {
      return {
        isValid: false,
        error: `Invalid element ID syntax: "${rawId}"`,
      };
    }
    if (idMap.has(trimmedId)) {
      return {
        isValid: false,
        error: `Duplicate element ID detected: "${trimmedId}"`,
      };
    }
    idMap.set(trimmedId, element);
  }

  // Validate attributes
  const attrs = element.attributes;
  if (attrs) {
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs.item(i);
      if (!attr) continue;

      const rawAttrName = attr.name;
      const attrName = rawAttrName.toLowerCase();
      const attrValue = attr.value;

      // 1. Namespace declarations and colon-namespaced attributes
      if (attrName.startsWith('xmlns:')) {
        if (attrName !== 'xmlns:xlink') {
          return {
            isValid: false,
            error: `Disallowed namespace declaration: ${rawAttrName}`,
          };
        }
        if (attrValue.trim() !== XLINK_NAMESPACE) {
          return {
            isValid: false,
            error: `Invalid xmlns:xlink namespace URI: ${attrValue}`,
          };
        }
      } else if (attrName === 'xmlns') {
        if (attrValue.trim() !== SVG_NAMESPACE) {
          return {
            isValid: false,
            error: `Disallowed xmlns namespace URI: ${attrValue}`,
          };
        }
      } else if (rawAttrName.includes(':')) {
        // Only xlink:href is permitted as a colon-namespaced attribute
        if (attrName !== 'xlink:href') {
          return {
            isValid: false,
            error: `Disallowed namespaced attribute: ${rawAttrName}`,
          };
        }
      }

      // 2. Reject all inline event handlers (onload, onclick, ONERROR, onmouseover, etc.)
      if (attrName.startsWith('on')) {
        return {
          isValid: false,
          error: `Forbidden event handler attribute: ${rawAttrName}`,
        };
      }

      // 3. Reject style attribute
      if (attrName === 'style') {
        return {
          isValid: false,
          error: 'Inline style attributes are forbidden on icon vector elements',
        };
      }

      // 4. Attribute allowlist check
      if (!ALLOWED_SVG_ATTRIBUTES.has(attrName)) {
        return {
          isValid: false,
          error: `Disallowed attribute: ${rawAttrName} on <${tagName}>`,
        };
      }

      // 5. Scriptable pseudo-protocol check anywhere in attribute value
      if (isDangerousUri(attrValue)) {
        return {
          isValid: false,
          error: `Forbidden scriptable URI in attribute ${rawAttrName}: ${attrValue}`,
        };
      }

      // 6. Strict resource-reference grammar per attribute type:
      // a. fill and stroke: MUST be safe color values. NO url(...) or external resources allowed.
      if (attrName === 'fill' || attrName === 'stroke') {
        if (!isValidSvgColor(attrValue)) {
          return {
            isValid: false,
            error: `Disallowed resource reference or invalid color in ${rawAttrName}: ${attrValue}`,
          };
        }
      }

      // b. clip-path and mask: only 'none' or local fragment url(#id)
      else if (attrName === 'clip-path' || attrName === 'mask') {
        const trimmed = attrValue.trim();
        if (trimmed.toLowerCase() !== 'none') {
          // Reject any quoted/padded/external/data URL that does not match local #id
          const match = trimmed.match(/^url\(\s*['"]?#([a-zA-Z0-9_\-]+)['"]?\s*\)$/i);
          if (!match) {
            return {
              isValid: false,
              error: `Disallowed external or malformed resource reference in ${rawAttrName}: ${attrValue}`,
            };
          }
          referencesToCheck.push({
            sourceElement: element,
            sourceAttr: attrName,
            targetId: match[1],
            expectedTag: attrName === 'clip-path' ? 'clippath' : 'mask',
          });
        }
      }

      // c. href and xlink:href: ONLY permitted on <use>, and must be local fragment #id
      else if (attrName === 'href' || attrName === 'xlink:href') {
        if (tagName !== 'use') {
          return {
            isValid: false,
            error: `Attribute ${rawAttrName} is only permitted on <use> elements, not <${tagName}>`,
          };
        }
        const trimmed = attrValue.trim();
        const match = trimmed.match(/^#([a-zA-Z0-9_\-]+)$/);
        if (!match) {
          return {
            isValid: false,
            error: `Disallowed external or malformed reference in ${rawAttrName}: ${attrValue}`,
          };
        }
        referencesToCheck.push({
          sourceElement: element,
          sourceAttr: attrName,
          targetId: match[1],
        });
      }

      // d. For ALL other attributes, reject any url(...) reference
      else {
        if (/url\s*\(/i.test(attrValue)) {
          return {
            isValid: false,
            error: `Disallowed url(...) resource reference in ${rawAttrName}: ${attrValue}`,
          };
        }
      }
    }
  }

  // Validate child elements recursively
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes.item(i);
    if (!child) continue;

    if (child.nodeType === 1) { // Node.ELEMENT_NODE
      const childResult = validateElementTree(child as XmlElement, idMap, referencesToCheck);
      if (!childResult.isValid) {
        return childResult;
      }
    } else if (child.nodeType === 8) { // Node.COMMENT_NODE
      element.removeChild(child);
      i--;
    } else if (child.nodeType === 7) { // PROCESSING_INSTRUCTION_NODE
      return { isValid: false, error: 'Processing instructions are not permitted in SVG' };
    }
  }

  return { isValid: true };
}

/**
 * Validates local fragment references and ensures no cyclic/recursive references exist.
 */
function validateReferencesAndCycles(
  rootElement: XmlElement,
  idMap: Map<string, XmlElement>,
  referencesToCheck: ReferenceCheck[]
): { isValid: boolean; error?: string } {
  // 1. Verify that all referenced IDs exist and match expected tag types
  for (const ref of referencesToCheck) {
    const targetElement = idMap.get(ref.targetId);
    if (!targetElement) {
      return {
        isValid: false,
        error: `Reference in ${ref.sourceAttr} points to non-existent local ID: #${ref.targetId}`,
      };
    }

    if (ref.expectedTag) {
      const targetTag = targetElement.tagName.toLowerCase().replace(/^svg:/, '');
      if (targetTag !== ref.expectedTag) {
        return {
          isValid: false,
          error: `Attribute ${ref.sourceAttr} must reference a <${ref.expectedTag}> element, got <${targetTag}> (#${ref.targetId})`,
        };
      }
    }
  }

  // 2. Build dependency graph for cycle detection
  const depGraph = new Map<string, Set<string>>();
  for (const id of idMap.keys()) {
    depGraph.set(id, new Set<string>());
  }

  for (const ref of referencesToCheck) {
    // Determine the enclosing ID of the reference source
    let current: XmlElement | null = ref.sourceElement;
    while (current && current !== rootElement) {
      const currentId = current.getAttribute('id');
      if (currentId && idMap.has(currentId)) {
        depGraph.get(currentId)?.add(ref.targetId);
        break;
      }
      current = current.parentNode as XmlElement | null;
    }
  }

  // 3. Detect cycles using DFS
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function findCycle(node: string, trail: string[]): string | null {
    visiting.add(node);
    trail.push(node);

    const neighbors = depGraph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (visiting.has(neighbor)) {
          return [...trail, neighbor].join(' -> ');
        }
        if (!visited.has(neighbor)) {
          const cycle = findCycle(neighbor, trail);
          if (cycle) return cycle;
        }
      }
    }

    visiting.delete(node);
    visited.add(node);
    trail.pop();
    return null;
  }

  for (const id of depGraph.keys()) {
    if (!visited.has(id)) {
      const cycle = findCycle(id, []);
      if (cycle) {
        return {
          isValid: false,
          error: `Cyclic reference detected: ${cycle}`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Validates untrusted SVG body markup from an external provider using a real XML DOM parser.
 * Rejects malformed markup, unknown tags/attributes, and external or cyclic references.
 * Returns newly serialized sanitized markup.
 */
export function validateAndSanitizeSvgBody(rawBody: string): SvgValidationResult {
  if (typeof rawBody !== 'string' || !rawBody.trim()) {
    return { isValid: false, error: 'SVG body must be a non-empty string' };
  }

  let parserErrorMessage: string | null = null;
  const parser = new DOMParser({
    onError: (level: string, msg: string) => {
      if (level === 'error' || level === 'fatalError') {
        parserErrorMessage = msg;
      }
    },
  });

  // Wrap body in synthetic root for parsing
  const wrapped = `<svg xmlns="${SVG_NAMESPACE}">${rawBody}</svg>`;
  let doc: XmlDocument;

  try {
    doc = parser.parseFromString(wrapped, 'image/svg+xml');
  } catch (err) {
    return {
      isValid: false,
      error: `Failed to parse SVG markup: ${(err as Error)?.message || 'XML parsing exception'}`,
    };
  }

  if (parserErrorMessage) {
    return {
      isValid: false,
      error: `Malformed XML markup: ${parserErrorMessage}`,
    };
  }

  const rootElement = doc.documentElement;
  if (!rootElement || rootElement.tagName.toLowerCase() !== 'svg') {
    return {
      isValid: false,
      error: 'Invalid SVG root structure',
    };
  }

  if (rootElement.namespaceURI !== SVG_NAMESPACE) {
    return {
      isValid: false,
      error: `Invalid synthetic root namespace: "${rootElement.namespaceURI ?? ''}"`,
    };
  }

  const parserErrors = doc.getElementsByTagName('parsererror');
  if (parserErrors.length > 0) {
    return {
      isValid: false,
      error: `Malformed XML syntax: ${parserErrors.item(0)?.textContent || 'parser error'}`,
    };
  }

  const idMap = new Map<string, XmlElement>();
  const referencesToCheck: ReferenceCheck[] = [];

  // Validate all child elements inside the synthetic root
  for (let i = 0; i < rootElement.childNodes.length; i++) {
    const child = rootElement.childNodes.item(i);
    if (!child) continue;

    if (child.nodeType === 1) { // ELEMENT_NODE
      const validation = validateElementTree(child as XmlElement, idMap, referencesToCheck);
      if (!validation.isValid) {
        return validation;
      }
    } else if (child.nodeType === 8) { // COMMENT_NODE
      rootElement.removeChild(child);
      i--;
    } else if (child.nodeType === 3) { // TEXT_NODE
      if (child.textContent && child.textContent.trim().length > 0) {
        return { isValid: false, error: 'Raw uncontained text nodes are not permitted in icon body' };
      }
    }
  }

  // Verify fragment targets and cycle absence
  const refValidation = validateReferencesAndCycles(rootElement, idMap, referencesToCheck);
  if (!refValidation.isValid) {
    return refValidation;
  }

  // Serialize newly sanitized children (never return the original raw string)
  const serializer = new XMLSerializer();
  const serializedParts: string[] = [];

  for (let i = 0; i < rootElement.childNodes.length; i++) {
    const child = rootElement.childNodes.item(i);
    if (child && child.nodeType === 1) {
      serializedParts.push(serializer.serializeToString(child as XmlNode));
    }
  }

  const sanitizedBody = serializedParts.join('');
  if (!sanitizedBody) {
    return { isValid: false, error: 'SVG body contains no valid vector elements' };
  }

  return {
    isValid: true,
    sanitizedBody,
  };
}

/**
 * Validates and sanitizes a complete standalone SVG document.
 * Enforces that the root is `<svg>`, validates namespaces, attributes, and child elements,
 * and returns newly serialized safe SVG markup.
 */
export function sanitizeFullSvgDocument(rawSvg: string): FullSvgValidationResult {
  if (typeof rawSvg !== 'string' || !rawSvg.trim()) {
    return { isValid: false, error: 'SVG document must be a non-empty string' };
  }

  let parserErrorMessage: string | null = null;
  const parser = new DOMParser({
    onError: (level: string, msg: string) => {
      if (level === 'error' || level === 'fatalError') {
        parserErrorMessage = msg;
      }
    },
  });

  let doc: XmlDocument;
  try {
    doc = parser.parseFromString(rawSvg, 'image/svg+xml');
  } catch (err) {
    return {
      isValid: false,
      error: `Failed to parse SVG document: ${(err as Error)?.message || 'XML parsing exception'}`,
    };
  }

  if (parserErrorMessage) {
    return {
      isValid: false,
      error: `Malformed XML in SVG document: ${parserErrorMessage}`,
    };
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    return {
      isValid: false,
      error: 'Document root is not an <svg> element',
    };
  }

  // Require standard SVG namespace on root
  if (root.namespaceURI !== SVG_NAMESPACE) {
    return {
      isValid: false,
      error: `Disallowed root element namespace: "${root.namespaceURI ?? ''}", expected "${SVG_NAMESPACE}"`,
    };
  }

  const rootXmlns = root.getAttribute('xmlns');
  if (!rootXmlns || rootXmlns.trim() !== SVG_NAMESPACE) {
    return {
      isValid: false,
      error: `Document root must declare xmlns="${SVG_NAMESPACE}", got "${rootXmlns ?? 'missing'}"`,
    };
  }

  const idMap = new Map<string, XmlElement>();
  const referencesToCheck: ReferenceCheck[] = [];

  const validation = validateElementTree(root, idMap, referencesToCheck);
  if (!validation.isValid) {
    return { isValid: false, error: validation.error };
  }

  const refValidation = validateReferencesAndCycles(root, idMap, referencesToCheck);
  if (!refValidation.isValid) {
    return { isValid: false, error: refValidation.error };
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(root as XmlNode);

  return {
    isValid: true,
    svgString,
  };
}

/**
 * Validates a viewBox string into 4 safe numeric tokens.
 */
export function validateViewBox(viewBox: string): { isValid: boolean; normalized?: string; error?: string } {
  if (typeof viewBox !== 'string') {
    return { isValid: false, error: 'viewBox must be a string' };
  }

  const tokens = viewBox.trim().split(/[\s,]+/);
  if (tokens.length !== 4) {
    return { isValid: false, error: 'viewBox must contain exactly 4 numeric values: minX minY width height' };
  }

  const [minX, minY, width, height] = tokens.map(Number);

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return { isValid: false, error: 'All viewBox values must be finite numbers' };
  }

  if (width <= 0 || height <= 0) {
    return { isValid: false, error: 'viewBox width and height must be positive numbers' };
  }

  return {
    isValid: true,
    normalized: `${minX} ${minY} ${width} ${height}`,
  };
}

/**
 * Escapes characters for safe inclusion in XML attribute values.
 */
function escapeXmlAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Builds a clean, safe SVG markup string wrapping the validated body with standard attributes.
 * Validates dimensions, viewBox, colors, stroke-width, and className to prevent attribute injection.
 */
export function buildSafeSvgString(options: {
  body: string;
  width?: number;
  height?: number;
  viewBox?: string;
  className?: string;
  color?: string;
  strokeWidth?: number;
}): SvgValidationResult & { svgString?: string } {
  // 1. Validate body first
  const bodyValidation = validateAndSanitizeSvgBody(options.body);
  if (!bodyValidation.isValid || !bodyValidation.sanitizedBody) {
    return bodyValidation;
  }

  // 2. Validate dimensions
  const width = options.width ?? 24;
  const height = options.height ?? 24;

  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    width <= 0 ||
    width > 4096 ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height <= 0 ||
    height > 4096
  ) {
    return {
      isValid: false,
      error: 'Dimensions must be finite positive numbers between 1 and 4096',
    };
  }

  // 3. Validate viewBox
  const rawViewBox = options.viewBox ?? `0 0 ${width} ${height}`;
  const viewBoxResult = validateViewBox(rawViewBox);
  if (!viewBoxResult.isValid || !viewBoxResult.normalized) {
    return {
      isValid: false,
      error: viewBoxResult.error || 'Invalid viewBox specification',
    };
  }

  // 4. Validate color
  const color = options.color ?? 'currentColor';
  if (!isValidSvgColor(color)) {
    return {
      isValid: false,
      error: `Invalid color format: ${color}`,
    };
  }

  // 5. Validate stroke-width if specified
  let strokeWidthAttr = '';
  if (options.strokeWidth !== undefined) {
    if (
      typeof options.strokeWidth !== 'number' ||
      !Number.isFinite(options.strokeWidth) ||
      options.strokeWidth < 0 ||
      options.strokeWidth > 100
    ) {
      return {
        isValid: false,
        error: 'strokeWidth must be a finite non-negative number between 0 and 100',
      };
    }
    strokeWidthAttr = ` stroke-width="${options.strokeWidth}"`;
  }

  // 6. Validate className if specified
  let classAttr = '';
  if (options.className !== undefined) {
    if (typeof options.className !== 'string' || !/^[a-zA-Z0-9_\-\s]*$/.test(options.className)) {
      return {
        isValid: false,
        error: 'className contains disallowed characters',
      };
    }
    if (options.className.trim()) {
      classAttr = ` class="${escapeXmlAttribute(options.className.trim())}"`;
    }
  }

  const svgString = `<svg xmlns="${SVG_NAMESPACE}" viewBox="${viewBoxResult.normalized}" width="${width}" height="${height}" fill="none" stroke="${escapeXmlAttribute(
    color
  )}"${strokeWidthAttr}${classAttr}>${bodyValidation.sanitizedBody}</svg>`;

  return {
    isValid: true,
    sanitizedBody: bodyValidation.sanitizedBody,
    svgString,
  };
}
