// ==============================================================================
// IconHub Source Registry Service
// Single source of truth for verified collections, artwork licenses, and metadata.
// ==============================================================================

import { VERIFIED_SOURCES } from './sources.config';
import type { CuratedSource } from './types';

export class SourceRegistry {
  private static readonly sourcesByPrefix: ReadonlyMap<string, CuratedSource> =
    new Map(VERIFIED_SOURCES.map((s) => [s.canonicalPrefix, s]));

  private static readonly sourcesById: ReadonlyMap<string, CuratedSource> =
    new Map(VERIFIED_SOURCES.map((s) => [s.id, s]));

  /**
   * Return all verified sources cataloged in the registry.
   */
  public static getAllSources(): readonly CuratedSource[] {
    return VERIFIED_SOURCES;
  }

  /**
   * Return sources curated for featured presentation on the homepage.
   */
  public static getFeaturedSources(): readonly CuratedSource[] {
    return VERIFIED_SOURCES.filter((s) => s.featured);
  }

  /**
   * Find a source by its canonical Iconify prefix.
   */
  public static getByPrefix(prefix: string): CuratedSource | undefined {
    return this.sourcesByPrefix.get(prefix);
  }

  /**
   * Find a source by its stable internal ID.
   */
  public static getById(id: string): CuratedSource | undefined {
    return this.sourcesById.get(id);
  }

  /**
   * Check whether a given prefix is cataloged and verified in the registry.
   */
  public static isVerifiedPrefix(prefix: string): boolean {
    return this.sourcesByPrefix.has(prefix);
  }

  /**
   * Return an array of all verified canonical collection prefixes.
   */
  public static getVerifiedPrefixes(): readonly string[] {
    return VERIFIED_SOURCES.map((s) => s.canonicalPrefix);
  }

  /**
   * Validate a canonical icon identifier (`prefix:name`) against the registry.
   */
  public static parseCanonicalId(
    canonicalId: string
  ): { prefix: string; name: string } | null {
    const colonIndex = canonicalId.indexOf(':');
    if (colonIndex <= 0 || colonIndex === canonicalId.length - 1) {
      return null;
    }
    const prefix = canonicalId.slice(0, colonIndex);
    const name = canonicalId.slice(colonIndex + 1);
    return { prefix, name };
  }
}
