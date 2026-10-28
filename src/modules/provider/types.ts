// ==============================================================================
// IconHub Provider Interfaces & Models
// Contracts decoupling external icon APIs from internal application components.
// ==============================================================================

import type { CollectionSummary, CollectionDetail } from '../registry/types';

export interface IconItemData {
  readonly canonicalId: `${string}:${string}`;
  readonly prefix: string;
  readonly name: string;
  readonly body: string; // Validated, sanitized SVG elements
  readonly width: number;
  readonly height: number;
  readonly left?: number;
  readonly top?: number;
  readonly isAlias?: boolean;
  readonly parentName?: string;
}

export interface SearchQuery {
  readonly query: string;
  readonly limit?: number;
  readonly start?: number;
  readonly prefixes?: readonly string[];
  readonly category?: string;
}

export interface SearchResult {
  readonly icons: readonly `${string}:${string}`[];
  readonly total: number;
  readonly limit: number;
  readonly start: number;
}

export interface IconSourceProvider {
  /**
   * Fetches global collection index and metadata.
   */
  getCollections(signal?: AbortSignal): Promise<Map<string, CollectionSummary>>;

  /**
   * Fetches full collection detail, categories, and icon listing for a prefix.
   */
  getCollection(prefix: string, signal?: AbortSignal): Promise<CollectionDetail>;

  /**
   * Fetches batch icon SVG body data for multiple glyphs within a collection.
   */
  getIconsData(
    prefix: string,
    iconNames: readonly string[],
    signal?: AbortSignal
  ): Promise<Map<string, IconItemData>>;

  /**
   * Searches for icons matching a query across collections.
   */
  searchIcons(query: SearchQuery, signal?: AbortSignal): Promise<SearchResult>;

  /**
   * Fetches standalone raw SVG string for an individual icon glyph.
   */
  getIconSvg(prefix: string, name: string, signal?: AbortSignal): Promise<string>;
}
