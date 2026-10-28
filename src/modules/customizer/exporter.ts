// ==============================================================================
// IconHub Code Exporters
// Generates clean SVG, React JSX, HTML snippets, and CSS data URIs with
// accurate attribution and trademark notices.
// ==============================================================================

import type { CuratedSource } from '../registry/types';

export interface ExportMetadataOptions {
  readonly prefix: string;
  readonly name: string;
  readonly source: CuratedSource;
}

/**
 * Builds comment text for licensing and attribution.
 */
export function buildAttributionComment(
  meta: ExportMetadataOptions,
  format: 'xml' | 'js' | 'css'
): string {
  const parts: string[] = [];
  const { prefix, name, source } = meta;

  parts.push(`Icon: ${prefix}:${name}`);
  parts.push(`Source: ${source.displayName} (${source.upstreamUrl})`);
  parts.push(`License: ${source.license.title}${source.license.url ? ` (${source.license.url})` : ''}`);

  if (source.license.attributionTerms === 'required') {
    parts.push('Attribution: Required under CC BY 4.0');
  }

  if (source.trademarkNotice) {
    parts.push(`Trademark Note: ${source.trademarkNotice}`);
  }

  const text = parts.join(' | ');

  switch (format) {
    case 'xml':
      return `<!-- ${text} -->\n`;
    case 'js':
      return `/**\n * ${parts.join('\n * ')}\n */\n`;
    case 'css':
      return `/*\n * ${parts.join('\n * ')}\n */\n`;
  }
}

/**
 * Converts SVG kebab-case attributes to React JSX camelCase attributes.
 */
export function convertSvgToJsx(svgString: string): string {
  const attrMap: Record<string, string> = {
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'stroke-miterlimit': 'strokeMiterlimit',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-opacity': 'strokeOpacity',
    'fill-rule': 'fillRule',
    'fill-opacity': 'fillOpacity',
    'clip-path': 'clipPath',
    'clip-rule': 'clipRule',
    'viewbox': 'viewBox',
    'xmlns:xlink': 'xmlnsXlink',
    'xlink:href': 'xlinkHref',
    'class': 'className',
  };

  let jsx = svgString;

  // Replace attribute names
  for (const [kebab, camel] of Object.entries(attrMap)) {
    const regex = new RegExp(`\\b${kebab}=`, 'gi');
    jsx = jsx.replace(regex, `${camel}=`);
  }

  // Ensure self-closing on void/empty elements
  const leafTags = ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'use'];
  for (const tag of leafTags) {
    const openTagRegex = new RegExp(`<${tag}\\b([^>]*?)><\\/${tag}>`, 'gi');
    jsx = jsx.replace(openTagRegex, `<${tag}$1 />`);

    const unclosedRegex = new RegExp(`<${tag}\\b([^>]*?[^\\/])>`, 'gi');
    jsx = jsx.replace(unclosedRegex, `<${tag}$1 />`);
  }

  return jsx;
}

/**
 * Generates an export-ready React component snippet.
 */
export function generateReactJsx(
  svgString: string,
  meta: ExportMetadataOptions
): string {
  const jsxSvg = convertSvgToJsx(svgString);

  // Injects {...props} into the root svg element
  const withProps = jsxSvg.replace(
    /^<svg\b/,
    '<svg {...props}'
  );

  const comment = buildAttributionComment(meta, 'js');
  const componentName = meta.name
    .split(/[-_]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('') + 'Icon';

  return `${comment}import React from 'react';

export function ${componentName}(props: React.SVGProps<SVGSVGElement>) {
  return (
    ${withProps}
  );
}
`;
}

/**
 * Encodes SVG markup safely for CSS data-URI usage.
 */
export function encodeSvgForDataUri(svgString: string): string {
  return svgString
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/{/g, '%7B')
    .replace(/}/g, '%7D')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ');
}

/**
 * Generates an export-ready CSS snippet.
 */
export function generateCssSnippet(
  svgString: string,
  meta: ExportMetadataOptions
): string {
  const comment = buildAttributionComment(meta, 'css');
  const encoded = encodeSvgForDataUri(svgString);
  const className = `icon-${meta.name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return `${comment}.${className} {
  display: inline-block;
  width: 1em;
  height: 1em;
  background-image: url("data:image/svg+xml,${encoded}");
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

/* CSS Mask alternative (allows dynamic color via background-color): */
.${className}-mask {
  display: inline-block;
  width: 1em;
  height: 1em;
  background-color: currentColor;
  -webkit-mask-image: url("data:image/svg+xml,${encoded}");
  mask-image: url("data:image/svg+xml,${encoded}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
`;
}

/**
 * Generates standalone SVG file content.
 */
export function generateStandaloneSvg(
  svgString: string,
  meta: ExportMetadataOptions
): string {
  const comment = buildAttributionComment(meta, 'xml');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${comment}${svgString}\n`;
}

/**
 * Generates inline HTML snippet.
 */
export function generateHtmlSnippet(
  svgString: string,
  meta: ExportMetadataOptions
): string {
  const comment = buildAttributionComment(meta, 'xml');
  return `${comment}${svgString}`;
}

