// ==============================================================================
// IconHub Search Continuation & Invalidation Coordinator
// Guards asynchronous continuation/pagination against race conditions and stale responses.
// ==============================================================================

import type { StyleFilter, LicenseFilter } from './types';

export interface ContinuationContext {
  readonly generation: number;
  readonly searchKey: string;
}

/**
 * Computes a normalized canonical key identifying the query and active filter parameters.
 */
export function computeSearchKey(
  query: string,
  category: string,
  sources: readonly string[],
  style: StyleFilter,
  license: LicenseFilter
): string {
  const sortedSources = [...sources].slice().sort().join(',');
  return `${query.trim().toLowerCase()}|${category}|${sortedSources}|${style}|${license}`;
}

/**
 * Validates whether an incoming asynchronous continuation response is still valid
 * for the current UI search session, rejecting superseded generations, altered search keys,
 * or aborted signals.
 */
export function isContinuationValid(
  context: ContinuationContext,
  currentGeneration: number,
  currentSearchKey: string,
  signal?: AbortSignal
): boolean {
  if (signal?.aborted) {
    return false;
  }
  if (context.generation !== currentGeneration) {
    return false;
  }
  if (context.searchKey !== currentSearchKey) {
    return false;
  }
  return true;
}

