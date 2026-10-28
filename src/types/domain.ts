// ==============================================================================
// IconHub Domain Boundary Contracts (Strict TypeScript Types)
// Explicit contracts for sources, licenses, collections, and customization.
// ==============================================================================

/**
 * Explicit verification lifecycle for any source, license, or collection metadata.
 */
export type VerificationStatus = 'verified' | 'unverified' | 'provisional';

/**
 * Attribution requirements governing downstream use of icon artwork.
 * Allows attribution terms to remain explicitly unknown until legally confirmed.
 */
export type AttributionRequirement = 'required' | 'not_required' | 'unknown';

/**
 * License metadata contract distinguishing software code licenses from icon artwork licenses.
 */
export interface LicenseMetadata {
  /** Canonical license identifier or SPDX code (e.g., 'MIT', 'CC-BY-4.0', 'Apache-2.0') */
  readonly id: string;
  /** Human-readable license title */
  readonly title: string;
  /** Official SPDX identifier if standardized */
  readonly spdxId?: string;
  /** Authoritative URL pointing directly to the license text */
  readonly url?: string;
  /** Verification state of this license definition */
  readonly verificationStatus: VerificationStatus;
  /** Explicit attribution requirement for distributed or embedded artwork */
  readonly attributionTerms: AttributionRequirement;
  /** Contextual legal notes (e.g., trademark considerations or brand restrictions) */
  readonly notes?: string;
}

/**
 * Supported visual aesthetic classifications for icons.
 */
export type IconStyle = 'outline' | 'solid' | 'duotone' | 'color';

/**
 * Standard ViewBox coordinate boundaries for rendered SVG artwork.
 */
export interface ViewBoxDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Icon source identity and authoritative provider contract.
 */
export interface IconSource {
  /** Unique stable source slug (e.g., 'lucide', 'tabler', 'material-symbols') */
  readonly id: string;
  /** User-facing display title */
  readonly displayName: string;
  /** Primary homepage or project portal */
  readonly upstreamUrl: string;
  /** Authoritative version control repository URL */
  readonly repositoryUrl?: string;
  /** Verification state of this source definition */
  readonly verificationStatus: VerificationStatus;
  /** Artwork license metadata governing the icons in this source */
  readonly license: LicenseMetadata;
  /** Visual styles offered by this source */
  readonly supportedStyles?: readonly IconStyle[];
  /** Default native coordinate dimensions if consistent */
  readonly defaultViewBox?: ViewBoxDimensions;
}

/**
 * Collection identity and association to an authoritative icon source.
 */
export interface CollectionIdentity {
  /** Iconify or canonical short prefix identifier (e.g., 'lucide', 'ph', 'bi') */
  readonly prefix: string;
  /** Corresponding IconSource identifier */
  readonly sourceId: string;
  /** Human-readable collection title */
  readonly displayName: string;
  /** Verification status of collection mapping */
  readonly verificationStatus: VerificationStatus;
  /** Total count if formally verified, or undefined if unverified */
  readonly verifiedTotal?: number;
}

/**
 * Icon identity contract using canonical source/collection prefix and glyph name.
 */
export interface IconIdentity {
  /** Collection prefix (e.g., 'lucide', 'tabler') */
  readonly prefix: string;
  /** Glyph identifier within the collection (e.g., 'arrow-right') */
  readonly name: string;
  /** Canonical combined identifier formatted as 'prefix:name' */
  readonly canonicalId: `${string}:${string}`;
  /** Source identifier associated with this icon */
  readonly sourceId: string;
}

/**
 * Interactive customization state for icon rendering and export.
 * Optional fields reflect varying collection capabilities (e.g., stroke vs fill).
 */
export interface IconCustomizationState {
  /** Rendered display size in pixels (e.g., 24, 32, 48) */
  size: number;
  /** Foreground fill or stroke color (hex, rgb, currentColor) */
  color: string;
  /** Optional container background fill color */
  backgroundColor?: string;
  /** Stroke width in pixels (only applicable to outline/stroke-based icons) */
  strokeWidth?: number;
  /** Rotation angle in 90-degree increments */
  rotate?: 0 | 90 | 180 | 270;
  /** Horizontal reflection flag */
  flipHorizontal?: boolean;
  /** Vertical reflection flag */
  flipVertical?: boolean;
  /** Inner container padding in pixels */
  padding?: number;
  /** Container border radius in pixels */
  borderRadius?: number;
  /** Container framing shape */
  containerShape?: 'none' | 'square' | 'circle' | 'rounded';
}

/**
 * Capabilities declared by a collection to indicate which customization parameters it supports.
 */
export interface CollectionCustomizationCapabilities {
  /** Whether the collection icons support stroke-width adjustments */
  readonly supportsStrokeWidth: boolean;
  /** Whether the collection icons support arbitrary single-color overrides */
  readonly supportsColor: boolean;
  /** Minimum sensible size in pixels */
  readonly minSize?: number;
  /** Maximum sensible size in pixels */
  readonly maxSize?: number;
  /** Recommended baseline size in pixels */
  readonly defaultSize: number;
  /** Default stroke width if supported */
  readonly defaultStrokeWidth?: number;
}

