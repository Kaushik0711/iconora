// ==============================================================================
// IconHub Popular Library Cards Data
// Sourced directly from the unified SourceRegistry. Zero data duplication.
// ==============================================================================

import { SourceRegistry } from '@/modules/registry';

export interface LibraryCardItem {
  readonly id: string;
  readonly name: string;
  readonly prefix: string;
  readonly description: string;
  readonly license: string;
  readonly licenseSpdx: string;
  readonly attributionRequired: boolean;
  readonly trademarkNotice?: string;
  readonly upstreamUrl: string;
  readonly collectionPath: string;
  readonly visualTag: string;
  readonly iconType: 'stroke' | 'fill' | 'dual' | 'brand';
  readonly verifiedTotal?: number;
}

function resolveIconType(
  id: string,
  styles: readonly ('outline' | 'solid' | 'duotone' | 'color')[]
): 'stroke' | 'fill' | 'dual' | 'brand' {
  if (id === 'simple-icons') return 'brand';
  if (styles.includes('outline') && styles.includes('solid')) return 'dual';
  if (styles.includes('solid')) return 'fill';
  return 'stroke';
}

export const POPULAR_LIBRARIES: readonly LibraryCardItem[] =
  SourceRegistry.getFeaturedSources().map((s) => ({
    id: s.id,
    name: s.displayName,
    prefix: s.canonicalPrefix,
    description: s.description,
    license: s.license.title,
    licenseSpdx: s.license.spdxId,
    attributionRequired: s.license.attributionTerms === 'required',
    trademarkNotice: s.trademarkNotice,
    upstreamUrl: s.upstreamUrl,
    collectionPath: `/collection/${s.canonicalPrefix}`,
    visualTag: s.visualTag,
    iconType: resolveIconType(s.id, s.supportedStyles),
    verifiedTotal: s.verifiedTotal,
  }));
