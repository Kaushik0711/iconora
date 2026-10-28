// ==============================================================================
// IconHub Style Variant Classifier
// Strictly determines icon variant styles (outline, solid, duotone) based on verified
// per-collection naming conventions and variant metadata rather than inferring from
// collection-level capabilities.
// ==============================================================================

import type { StyleFilter } from './types';

export type ConcreteIconStyle = 'outline' | 'solid' | 'duotone' | 'color' | 'unknown';

/**
 * Classifies the concrete rendered style variant of an icon glyph based on
 * verified upstream naming patterns and collection conventions.
 */
export function classifyIconStyle(prefix: string, name: string): ConcreteIconStyle {
  const p = prefix.toLowerCase();
  const n = name.toLowerCase();

  // 1. Phosphor Icons
  if (p === 'ph') {
    if (n.endsWith('-duotone') || n.includes('-duotone-')) return 'duotone';
    if (n.endsWith('-fill') || n.includes('-fill-')) return 'solid';
    return 'outline'; // regular, bold, light, thin
  }

  // 2. Remix Icon
  if (p === 'ri') {
    if (n.endsWith('-fill') || n.includes('-fill-')) return 'solid';
    if (n.endsWith('-line') || n.includes('-line-')) return 'outline';
    return 'outline';
  }

  // 3. Tabler Icons
  if (p === 'tabler') {
    if (n.endsWith('-filled') || n.includes('-filled-')) return 'solid';
    return 'outline';
  }

  // 4. Heroicons
  if (p === 'heroicons') {
    if (n.includes('-solid') || n.endsWith('-solid')) return 'solid';
    return 'outline';
  }

  // 5. Bootstrap Icons
  if (p === 'bi') {
    if (n.endsWith('-fill') || n.includes('-fill-')) return 'solid';
    return 'outline';
  }

  // 6. Lucide & Feather (Outline stroke only)
  if (p === 'lucide' || p === 'feather') {
    return 'outline';
  }

  // 7. Material Symbols
  if (p === 'material-symbols') {
    if (n.includes('-outline')) return 'outline';
    return 'solid';
  }

  // 8. Carbon
  if (p === 'carbon') {
    if (n.endsWith('-filled') || n.includes('-filled-')) return 'solid';
    return 'outline';
  }

  // 9. Fluent
  if (p === 'fluent') {
    if (n.includes('-filled') || n.endsWith('-filled')) return 'solid';
    if (n.includes('-regular') || n.endsWith('-regular')) return 'outline';
    return 'outline';
  }

  // 10. Simple Icons (Brand glyphs)
  if (p === 'simple-icons') {
    return 'solid';
  }

  // 11. Octicons
  if (p === 'octicon') {
    if (n.includes('-fill')) return 'solid';
    return 'outline';
  }

  // 12. Ion
  if (p === 'ion') {
    if (n.includes('-outline')) return 'outline';
    return 'solid';
  }

  // 13. Font Awesome 6 Solid
  if (p === 'fa6-solid') {
    return 'solid';
  }

  // Generic heuristic fallback
  if (n.includes('duotone') || n.includes('twotone') || n.includes('two-tone')) return 'duotone';
  if (n.includes('-fill') || n.includes('-solid') || n.includes('-filled')) return 'solid';
  if (n.includes('-outline') || n.includes('-line') || n.includes('-stroke')) return 'outline';

  return 'unknown';
}

/**
 * Checks if a specific collection prefix can produce icons of the requested style.
 */
export function isStyleSupportedByPrefix(prefix: string, style: StyleFilter): boolean {
  if (style === 'all') return true;

  const p = prefix.toLowerCase();

  switch (style) {
    case 'outline':
      // Simple Icons and Font Awesome Solid do not have outline variants
      return p !== 'simple-icons' && p !== 'fa6-solid';

    case 'solid':
      // Lucide and Feather do NOT have solid variants
      return p !== 'lucide' && p !== 'feather';

    case 'duotone':
      // Only Phosphor has confirmed duotone variants among verified collections
      return p === 'ph';

    default:
      return true;
  }
}

/**
 * Verifies if an icon matches the requested style filter.
 */
export function matchesStyleFilter(prefix: string, name: string, targetStyle: StyleFilter): boolean {
  if (targetStyle === 'all') return true;
  const classified = classifyIconStyle(prefix, name);
  return classified === targetStyle;
}

