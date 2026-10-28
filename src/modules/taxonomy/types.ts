// ==============================================================================
// IconHub Centralized Taxonomy Types
// Typed category definitions with verified provider mappings.
// ==============================================================================

export interface CategoryDefinition {
  readonly id: string; // Unique slug (e.g. 'ui', 'arrows')
  readonly label: string; // Display label (e.g. 'Arrows')
  readonly description: string;
  readonly queryKeyword?: string; // Semantic keyword used for provider querying
  readonly semanticTerms?: readonly string[]; // Tokens used to strictly verify category membership
  readonly supportedPrefixes?: readonly string[]; // Specific verified collections if restricted
  readonly providerCategory?: string; // Iconify collection category if matched
  readonly isSupported: boolean;
  readonly unsupportedReason?: string;
}

export type CategoryId =
  | 'all'
  | 'ui'
  | 'arrows'
  | 'communication'
  | 'devices'
  | 'media'
  | 'files'
  | 'ecommerce'
  | 'social'
  | 'editing'
  | 'weather'
  | 'development'
  | 'navigation'
  | 'business'
  | 'security'
  | 'charts'
  | 'education'
  | 'nature'
  | 'gaming';

