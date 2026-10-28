// ==============================================================================
// IconHub Category Navigation Data
// Sourced from TaxonomyService to guarantee single source of truth.
// ==============================================================================

import { TaxonomyService, type CategoryDefinition } from '@/modules/taxonomy';

export type CategoryItem = CategoryDefinition;

export const HOMEPAGE_CATEGORIES: readonly CategoryItem[] = TaxonomyService.getAllCategories();
