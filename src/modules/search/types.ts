// ==============================================================================
// IconHub Search Service Contracts
// Contracts for search queries, active filters, paginated responses, and icon items.
// ==============================================================================

export type StyleFilter = 'all' | 'outline' | 'solid' | 'duotone';
export type LicenseFilter = 'all' | 'commercial' | 'no-attribution' | 'trademark-safe';
export type ColorTypeFilter = 'all' | 'monochrome';

export interface SearchFilters {
  readonly category?: string;
  readonly sources?: readonly string[]; // Bounded canonical collection prefixes
  readonly style?: StyleFilter;
  readonly license?: LicenseFilter;
  readonly colorType?: ColorTypeFilter;
}

export interface SearchParams extends SearchFilters {
  readonly query?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly cursor?: number; // Upstream scan continuation cursor
}

export interface SearchIconItem {
  readonly canonicalId: `${string}:${string}`;
  readonly prefix: string;
  readonly name: string;
  readonly body: string; // Sanitized SVG elements
  readonly width: number;
  readonly height: number;
  readonly viewBox: string;
  readonly collectionName: string;
  readonly licenseSpdx?: string;
  readonly attributionRequired: boolean;
  readonly hasTrademarkCaveat: boolean;
  readonly styleVariant?: 'outline' | 'solid' | 'duotone' | 'color' | 'unknown';
}

export interface SearchResponse {
  readonly icons: readonly SearchIconItem[];
  readonly total?: number; // Exact total when unfiltered or known; omitted when filtered to avoid misleading counts
  readonly page: number;
  readonly limit: number;
  readonly totalPages?: number; // Exact page count when total is known
  readonly query: string;
  readonly activeCategory: string;
  readonly isInitialDiscovery?: boolean;
  readonly partialFailures?: readonly string[];
  readonly activeStyle?: StyleFilter;
  readonly activeLicense?: LicenseFilter;
  readonly hasMore: boolean; // Authoritative continuation signal
  readonly nextCursor?: number; // Continuation offset for next batch
  readonly isFilteredContinuation?: boolean;
}
