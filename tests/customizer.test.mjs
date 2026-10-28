// ==============================================================================
// IconHub Icon Details & Customizer Test Suite
// Unit tests for artwork analysis, safe SVG building, export generators,
// and license/attribution metadata integrity.
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import { SourceRegistry } from '../src/modules/registry';
import { validateAndCleanName, validateAndCleanPrefix } from '../src/modules/provider';
import { analyzeIconArtwork } from '../src/modules/customizer/analyzer';
import { buildCustomizedSvg } from '../src/modules/customizer/svg-builder';
import {
  buildAttributionComment,
  convertSvgToJsx,
  generateReactJsx,
  generateCssSnippet,
  generateStandaloneSvg,
  generateCleanSvg,
  generateHtmlSnippet,
  encodeSvgForDataUri,
} from '../src/modules/customizer/exporter';

// ==============================================================================
// 1. Icon Artwork Analysis & Style Classification
// ==============================================================================

test('analyzeIconArtwork: correctly identifies outline stroke-based icons', () => {
  const lucideSource = SourceRegistry.getByPrefix('lucide');
  assert.ok(lucideSource, 'lucide source must exist');

  const outlineBody = '<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  const analysis = analyzeIconArtwork(
    outlineBody,
    lucideSource,
    { width: 24, height: 24 },
    { prefix: 'lucide', name: 'arrow-right' }
  );

  assert.equal(analysis.isMulticolor, false);
  assert.equal(analysis.supportsStrokeWidth, true);
  assert.equal(analysis.supportsColor, true);
  assert.equal(analysis.detectedStyle, 'outline');
  assert.equal(analysis.nativeWidth, 24);
  assert.equal(analysis.nativeHeight, 24);
  assert.equal(analysis.nativeViewBox, '0 0 24 24');
});

test('analyzeIconArtwork: correctly identifies solid icons and disables stroke-width', () => {
  const faSolidSource = SourceRegistry.getByPrefix('fa6-solid');
  assert.ok(faSolidSource, 'fa6-solid source must exist');

  const solidBody = '<path d="M100 200h200v200H100z" fill="currentColor"/>';
  const analysis = analyzeIconArtwork(
    solidBody,
    faSolidSource,
    { width: 512, height: 512 },
    { prefix: 'fa6-solid', name: 'user' }
  );

  assert.equal(analysis.isMulticolor, false);
  assert.equal(analysis.supportsStrokeWidth, false, 'Solid icons must disable stroke-width adjustments');
  assert.equal(analysis.supportsColor, true);
  assert.equal(analysis.detectedStyle, 'solid');
  assert.equal(analysis.nativeWidth, 512);
  assert.equal(analysis.nativeHeight, 512);
  assert.equal(analysis.nativeViewBox, '0 0 512 512');
});

test('analyzeIconArtwork: disables stroke-width for solid variant in mixed collection', () => {
  const heroiconsSource = SourceRegistry.getByPrefix('heroicons');
  assert.ok(heroiconsSource);
  assert.ok(heroiconsSource.supportedStyles.includes('outline'));
  assert.ok(heroiconsSource.supportedStyles.includes('solid'));

  // Solid variant in Heroicons
  const solidBody = '<path d="M12 2l10 10-10 10V2z" fill="currentColor"/>';
  const analysis = analyzeIconArtwork(
    solidBody,
    heroiconsSource,
    { width: 24, height: 24 },
    { prefix: 'heroicons', name: 'arrow-right-solid' }
  );

  assert.equal(analysis.supportsStrokeWidth, false, 'Solid variant must disable stroke-width');
  assert.equal(analysis.detectedStyle, 'solid');
  assert.equal(analysis.supportsColor, true);

  // Check that buildCustomizedSvg updates fill and does not add stroke/stroke-width
  const state = {
    size: 24,
    color: '#10b981',
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 3,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };
  const result = buildCustomizedSvg(solidBody, state, analysis);
  assert.ok(result.isValid);
  assert.ok(result.svgString.includes('fill="#10b981"'));
  assert.ok(!result.svgString.includes('stroke='), 'Solid icon must not gain stroke attribute');
  assert.ok(!result.svgString.includes('stroke-width='), 'Solid icon must not gain stroke-width attribute');
});

test('analyzeIconArtwork: detects multicolor artwork and disables recoloring', () => {
  const lucideSource = SourceRegistry.getByPrefix('lucide');

  const multicolorBody = `
    <path d="M0 0h10v10H0z" fill="#ff0000"/>
    <path d="M10 10h10v10H10z" fill="#0000ff"/>
  `;
  const analysis = analyzeIconArtwork(
    multicolorBody,
    lucideSource,
    { width: 24, height: 24 },
    { prefix: 'lucide', name: 'palette' }
  );

  assert.equal(analysis.isMulticolor, true, 'Multiple distinct colors must trigger isMulticolor');
  assert.equal(analysis.supportsColor, false, 'Multicolor artwork must disable global single-color recoloring');
  assert.equal(analysis.supportsStrokeWidth, false);
  assert.equal(analysis.detectedStyle, 'multicolor');
});

test('analyzeIconArtwork: identifies fill-based visual outline icons (Material Symbols outline) as paintMode fill and disables stroke-width', () => {
  const msSource = SourceRegistry.getByPrefix('material-symbols');
  assert.ok(msSource, 'material-symbols source must exist');

  // Material Symbols outline: name contains outline, but geometry is purely filled path (currentColor)
  const outlineFilledBody = '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.5l7 6.3V18H5v-6.2l7-6.3z" fill="currentColor"/>';
  const analysis = analyzeIconArtwork(
    outlineFilledBody,
    msSource,
    { width: 24, height: 24 },
    { prefix: 'material-symbols', name: 'home-outline' }
  );

  assert.equal(analysis.isMulticolor, false);
  assert.equal(analysis.supportsColor, true);
  assert.equal(analysis.visualVariant, 'outline', 'Visual variant should reflect outline classification');
  assert.equal(analysis.paintMode, 'fill', 'Paint mode must be fill because body uses fill geometry with no stroke attributes');
  assert.equal(analysis.supportsStrokeWidth, false, 'Stroke controls must be disabled for fill-based outline');
  assert.equal(analysis.detectedStyle, 'solid', 'detectedStyle must be solid/fill');
  assert.ok(analysis.strokeDisabledReason?.includes('filled vector paths'), 'Must explain reason why stroke-width is disabled');

  // When customized, recolor via fill, do not inject stroke or stroke-width
  const state = {
    size: 24,
    color: '#ef4444',
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 3,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };
  const result = buildCustomizedSvg(outlineFilledBody, state, analysis);
  assert.ok(result.isValid);
  assert.ok(result.svgString.includes('fill="#ef4444"'), 'Must recolor fill attribute');
  assert.ok(!result.svgString.includes('stroke='), 'Must not add stroke attribute');
  assert.ok(!result.svgString.includes('stroke-width='), 'Must not add stroke-width attribute');
});

test('analyzeIconArtwork: identifies stroke-based icons (Lucide) as paintMode stroke and enables stroke-width', () => {
  const lucideSource = SourceRegistry.getByPrefix('lucide');
  assert.ok(lucideSource);

  const outlineBody = '<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  const analysis = analyzeIconArtwork(
    outlineBody,
    lucideSource,
    { width: 24, height: 24 },
    { prefix: 'lucide', name: 'arrow-right' }
  );

  assert.equal(analysis.paintMode, 'stroke');
  assert.equal(analysis.supportsStrokeWidth, true);
  assert.equal(analysis.detectedStyle, 'outline');
  assert.equal(analysis.strokeDisabledReason, undefined);
});

test('analyzeIconArtwork: identifies Phosphor filled glyph as paintMode fill and disables stroke-width', () => {
  const phSource = SourceRegistry.getByPrefix('ph');
  assert.ok(phSource);

  const phBody = '<path d="M221.66 133.66l-72 72a8 8 0 0 1-11.32-11.32L196.69 136H40a8 8 0 0 1 0-16h156.69l-58.35-58.34a8 8 0 0 1 11.32-11.32l72 72a8 8 0 0 1 0 11.32z" fill="currentColor"/>';
  const analysis = analyzeIconArtwork(
    phBody,
    phSource,
    { width: 256, height: 256 },
    { prefix: 'ph', name: 'arrow-right' }
  );

  assert.equal(analysis.paintMode, 'fill');
  assert.equal(analysis.supportsStrokeWidth, false);
  assert.equal(analysis.detectedStyle, 'solid');
});

// ==============================================================================
// 2. Safe SVG Builder & Presentation Attribute Application
// ==============================================================================

test('buildCustomizedSvg: preserves exact path d geometry without modification', () => {
  const originalD = 'M5 12h14M12 5l7 7-7 7';
  const body = `<path d="${originalD}" stroke="currentColor" stroke-width="2"/>`;

  const state = {
    size: 48,
    color: '#2563eb',
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 2.5,
    rotate: 90,
    flipHorizontal: true,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };

  const analysis = {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'outline',
  };

  const result = buildCustomizedSvg(body, state, analysis);
  assert.ok(result.isValid);
  assert.ok(result.svgString);

  // Check path d is verbatim
  assert.ok(result.svgString.includes(`d="${originalD}"`), 'Exact d attribute must be preserved verbatim');

  // Check size attributes
  assert.ok(result.svgString.includes('width="48"'));
  assert.ok(result.svgString.includes('height="48"'));

  // Check color and stroke width applied directly to path
  assert.ok(result.svgString.includes('stroke="#2563eb"'));
  assert.ok(result.svgString.includes('stroke-width="2.5"'));

  // Check rotation and flip transforms applied
  assert.ok(result.svgString.includes('rotate(90'));
  assert.ok(result.svgString.includes('scale(-1 1)'));
});

test('buildCustomizedSvg: updates explicit stroke and stroke-width on child paths', () => {
  const body = '<path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  const state = {
    size: 32,
    color: '#2563eb',
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 3.5,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };
  const analysis = {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'outline',
  };
  const result = buildCustomizedSvg(body, state, analysis);
  assert.ok(result.isValid);
  assert.ok(result.svgString.includes('stroke="#2563eb"'));
  assert.ok(result.svgString.includes('stroke-width="3.5"'));
  assert.ok(!result.svgString.includes('stroke="currentColor"'), 'Explicit stroke="currentColor" must be replaced with selected color');
});

test('buildCustomizedSvg: updates explicit fill on monochrome solid icons', () => {
  const body = '<path d="M10 10h20v20H10z" fill="#000000"/>';
  const state = {
    size: 32,
    color: '#ef4444',
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 2,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };
  const analysis = {
    isMulticolor: false,
    supportsStrokeWidth: false,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'solid',
  };
  const result = buildCustomizedSvg(body, state, analysis);
  assert.ok(result.isValid);
  assert.ok(result.svgString.includes('fill="#ef4444"'));
  assert.ok(!result.svgString.includes('fill="#000000"'), 'Explicit fill="#000000" must be updated to new color');
});

test('buildCustomizedSvg: preserves multicolor path fills and strokes without recoloring', () => {
  const multicolorBody = '<path d="M0 0h10v10H0z" fill="#ff0000"/><path d="M10 10h10v10H10z" stroke="#00ff00"/>';
  const state = {
    size: 24,
    color: '#0000ff', // Attempt to recolor
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 3,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };
  const analysis = {
    isMulticolor: true,
    supportsStrokeWidth: false,
    supportsColor: false,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'multicolor',
  };
  const result = buildCustomizedSvg(multicolorBody, state, analysis);
  assert.ok(result.isValid);
  assert.ok(result.svgString.includes('fill="#ff0000"'), 'Red fill must be preserved');
  assert.ok(result.svgString.includes('stroke="#00ff00"'), 'Green stroke must be preserved');
  assert.ok(!result.svgString.includes('fill="#0000ff"'), 'Multicolor must not be recolored');
  assert.ok(!result.svgString.includes('stroke="#0000ff"'));
});

test('buildCustomizedSvg: generates valid circle container shape with padding & border', () => {
  const body = '<path d="M12 2v20M2 12h20" stroke="currentColor"/>';

  const state = {
    size: 32,
    color: '#ffffff',
    hasBackground: true,
    backgroundColor: '#2563eb',
    strokeWidth: 2,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'circle',
    padding: 16,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#1d4ed8',
  };

  const analysis = {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'outline',
  };

  const result = buildCustomizedSvg(body, state, analysis);
  assert.ok(result.isValid);
  assert.ok(result.svgString);

  // Total dimension = size(32) + padding(16) * 2 = 64
  assert.ok(result.svgString.includes('width="64"'));
  assert.ok(result.svgString.includes('height="64"'));
  assert.ok(result.svgString.includes('viewBox="0 0 64 64"'));

  // Must contain circle container
  assert.ok(result.svgString.includes('<circle'));
  assert.ok(result.svgString.includes('fill="#2563eb"'));
  assert.ok(result.svgString.includes('stroke="#1d4ed8"'));
  assert.ok(result.svgString.includes('stroke-width="2"'));
});

test('buildCustomizedSvg: generates valid rounded container shape', () => {
  const body = '<path d="M12 2v20" stroke="currentColor"/>';

  const state = {
    size: 24,
    color: '#000000',
    hasBackground: true,
    backgroundColor: '#f1f5f9',
    strokeWidth: 2,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'rounded',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  };

  const analysis = {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'outline',
  };

  const result = buildCustomizedSvg(body, state, analysis);
  assert.ok(result.isValid);
  assert.ok(result.svgString);

  // Total dimension = 24 + 12*2 = 48
  assert.ok(result.svgString.includes('width="48"'));
  assert.ok(result.svgString.includes('rx="8"'));
  assert.ok(result.svgString.includes('ry="8"'));
});

test('buildCustomizedSvg: rejects invalid or malicious viewBox and dimensions metadata', () => {
  const body = '<path d="M5 12h14" stroke="currentColor"/>';
  const state = {
    size: 24,
    color: '#000000',
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 2,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };

  // 1. Invalid viewBox syntax
  const invalidViewBoxAnalysis = {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24; alert(1)',
    detectedStyle: 'outline',
  };
  const res1 = buildCustomizedSvg(body, state, invalidViewBoxAnalysis);
  assert.equal(res1.isValid, false, 'Invalid viewBox must be rejected');

  // 2. Negative dimension viewBox
  const negViewBoxAnalysis = {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 -10 -10',
    detectedStyle: 'outline',
  };
  const res2 = buildCustomizedSvg(body, state, negViewBoxAnalysis);
  assert.equal(res2.isValid, false, 'Negative dimension viewBox must be rejected');

  // 3. Out-of-bounds size
  const invalidState = { ...state, size: 9999 };
  const res3 = buildCustomizedSvg(body, invalidState, {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'outline',
  });
  assert.equal(res3.isValid, false, 'Size > 512 must be rejected');
});

test('buildCustomizedSvg: fail-closed rejects script injection or illegal tags', () => {
  const maliciousBody = '<path d="M0 0h10v10H0z"/><script>alert("xss")</script>';

  const state = {
    size: 24,
    color: '#000000',
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 2,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };

  const analysis = {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'outline',
  };

  const result = buildCustomizedSvg(maliciousBody, state, analysis);
  assert.equal(result.isValid, false, 'Malicious SVG markup must fail closed');
  assert.equal(result.svgString, undefined);
});

test('Customizer pipeline: preview and exporters consume identical validated SVG', () => {
  const source = SourceRegistry.getByPrefix('lucide');
  assert.ok(source);
  const body = '<path d="M5 12h14" stroke="currentColor" stroke-width="2"/>';
  const state = {
    size: 32,
    color: '#8b5cf6',
    hasBackground: false,
    backgroundColor: '#ffffff',
    strokeWidth: 2.5,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    containerShape: 'none',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
  };
  const analysis = {
    isMulticolor: false,
    supportsStrokeWidth: true,
    supportsColor: true,
    nativeWidth: 24,
    nativeHeight: 24,
    nativeViewBox: '0 0 24 24',
    detectedStyle: 'outline',
  };

  const { isValid, svgString } = buildCustomizedSvg(body, state, analysis);
  assert.ok(isValid);
  assert.ok(svgString);

  const meta = { prefix: 'lucide', name: 'arrow-right', source };
  const standalone = generateStandaloneSvg(svgString, meta);
  const jsx = generateReactJsx(svgString, meta);
  const html = generateHtmlSnippet(svgString, meta);
  const css = generateCssSnippet(svgString, meta);

  // All exporters include the validated stroke color and width from the same svgString
  assert.ok(standalone.includes('stroke="#8b5cf6"'));
  assert.ok(standalone.includes('stroke-width="2.5"'));
  assert.ok(jsx.includes('stroke="#8b5cf6"'));
  assert.ok(jsx.includes('strokeWidth="2.5"'));
  assert.ok(html.includes('stroke="#8b5cf6"'));
  assert.ok(css.includes('%238b5cf6'));
});

// ==============================================================================
// 3. Code Exporters & Attribution Formatting
// ==============================================================================

test('buildAttributionComment: includes mandatory CC BY 4.0 notice for fa6-solid', () => {
  const faSolidSource = SourceRegistry.getByPrefix('fa6-solid');
  assert.ok(faSolidSource);

  const commentXml = buildAttributionComment(
    { prefix: 'fa6-solid', name: 'user', source: faSolidSource },
    'xml'
  );
  assert.ok(commentXml.includes('Icon: fa6-solid:user'));
  assert.ok(commentXml.includes('License: CC BY 4.0'));
  assert.ok(commentXml.includes('Attribution: Required under CC BY 4.0'));
  assert.ok(commentXml.startsWith('<!--'));
  assert.ok(commentXml.endsWith('-->\n'));

  const commentJs = buildAttributionComment(
    { prefix: 'fa6-solid', name: 'user', source: faSolidSource },
    'js'
  );
  assert.ok(commentJs.includes('* Attribution: Required under CC BY 4.0'));
  assert.ok(commentJs.startsWith('/**\n'));
});

test('buildAttributionComment: includes trademark note for simple-icons', () => {
  const simpleIconsSource = SourceRegistry.getByPrefix('simple-icons');
  assert.ok(simpleIconsSource);

  const comment = buildAttributionComment(
    { prefix: 'simple-icons', name: 'github', source: simpleIconsSource },
    'xml'
  );
  assert.ok(comment.includes('Trademark Note:'));
  assert.ok(comment.includes('Brand names and logos remain trademarks'));
});

test('convertSvgToJsx: converts kebab-case SVG attributes to React camelCase and self-closes tags', () => {
  const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd"></path></svg>';

  const jsx = convertSvgToJsx(rawSvg);
  assert.ok(jsx.includes('strokeWidth="2"'), 'stroke-width -> strokeWidth');
  assert.ok(jsx.includes('strokeLinecap="round"'), 'stroke-linecap -> strokeLinecap');
  assert.ok(jsx.includes('strokeLinejoin="round"'), 'stroke-linejoin -> strokeLinejoin');
  assert.ok(jsx.includes('fillRule="evenodd"'), 'fill-rule -> fillRule');
  assert.ok(jsx.includes('<path d="M0 0h24v24H0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillRule="evenodd" />'), 'Element must self-close');
});

test('generateReactJsx: produces functional component with props spreading and header comment', () => {
  const source = SourceRegistry.getByPrefix('lucide');
  const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M5 12h14" /></svg>';

  const component = generateReactJsx(rawSvg, { prefix: 'lucide', name: 'arrow-right', source });

  assert.ok(component.includes('export function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>)'));
  assert.ok(component.includes('<svg {...props}'));
  assert.ok(component.includes("import React from 'react';"));
  assert.ok(component.includes('Icon: lucide:arrow-right'));
});

test('generateCssSnippet: produces valid background-image data URI and CSS mask', () => {
  const source = SourceRegistry.getByPrefix('lucide');
  const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 12h14" stroke="#000" /></svg>';

  const css = generateCssSnippet(rawSvg, { prefix: 'lucide', name: 'arrow-right', source });

  assert.ok(css.includes('.icon-arrow-right {'));
  assert.ok(css.includes('background-image: url("data:image/svg+xml,%3Csvg'));
  assert.ok(css.includes('.icon-arrow-right-mask {'));
  assert.ok(css.includes('mask-image: url("data:image/svg+xml,%3Csvg'));
  assert.ok(css.includes('-webkit-mask-image: url("data:image/svg+xml,%3Csvg'));
});

test('generateStandaloneSvg: produces valid XML declaration and standalone root', () => {
  const source = SourceRegistry.getByPrefix('lucide');
  const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 12h14" /></svg>';

  const standalone = generateStandaloneSvg(rawSvg, { prefix: 'lucide', name: 'arrow-right', source });

  assert.ok(standalone.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(standalone.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
});

test('generateCleanSvg: extracts only <svg>...</svg> markup without XML declaration or comments', () => {
  const source = SourceRegistry.getByPrefix('lucide');
  const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 12h14" /></svg>';
  const standalone = generateStandaloneSvg(rawSvg, { prefix: 'lucide', name: 'arrow-right', source });

  const clean = generateCleanSvg(standalone);

  assert.ok(clean.startsWith('<svg'), 'Must begin strictly with <svg');
  assert.ok(clean.endsWith('</svg>'), 'Must end strictly with </svg>');
  assert.equal(clean.includes('<?xml'), false, 'Must not include XML declaration');
  assert.equal(clean.includes('<!--'), false, 'Must not include comments');
  assert.equal(clean.includes('```'), false, 'Must not include Markdown fences');
  assert.ok(clean.includes('<path d="M5 12h14" />'), 'Must preserve path geometry');
});

test('generateHtmlSnippet: produces clean inline HTML snippet with header comment', () => {
  const source = SourceRegistry.getByPrefix('lucide');
  const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 12h14" /></svg>';

  const html = generateHtmlSnippet(rawSvg, { prefix: 'lucide', name: 'arrow-right', source });

  assert.ok(html.includes('<!-- Icon: lucide:arrow-right'));
  assert.ok(html.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
});

test('encodeSvgForDataUri: safely escapes reserved URI characters', () => {
  const rawSvg = '<svg width="24" height="24"><path stroke="#ff0000" /></svg>';
  const encoded = encodeSvgForDataUri(rawSvg);

  assert.ok(encoded.includes('%23ff0000'), 'Hex hash # must be encoded as %23');
  assert.ok(encoded.includes('%3Csvg'), '< must be encoded as %3C');
  assert.ok(encoded.includes('%3E'), '> must be encoded as %3E');
});

// ==============================================================================
// 4. Prefix and Icon Name Validation Boundary
// ==============================================================================

test('validateAndCleanName: permits valid glyph identifiers and rejects path traversal', () => {
  assert.equal(validateAndCleanName('arrow-right'), 'arrow-right');
  assert.equal(validateAndCleanName('user_check'), 'user_check');
  assert.equal(validateAndCleanName('home.outline'), 'home.outline');

  assert.throws(() => validateAndCleanName('../etc/passwd'), /Invalid icon name/);
  assert.throws(() => validateAndCleanName('icon/sub'), /Invalid icon name/);
  assert.throws(() => validateAndCleanName('icon\\sub'), /Invalid icon name/);
  assert.throws(() => validateAndCleanName(''), /Invalid icon name/);
});

test('validateAndCleanPrefix: verifies curated prefixes and rejects traversal', () => {
  assert.equal(validateAndCleanPrefix('lucide'), 'lucide');
  assert.equal(validateAndCleanPrefix('fa6-solid'), 'fa6-solid');

  assert.throws(() => validateAndCleanPrefix('../evil'), /Invalid collection prefix/);
  assert.throws(() => validateAndCleanPrefix('evil/path'), /Invalid collection prefix/);
});
