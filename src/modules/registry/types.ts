// ==============================================================================
// IconHub Source & License Registry Types
// Strict typing for verified sources, artwork licensing, and collections.
// ==============================================================================

import type {
  VerificationStatus,
  AttributionRequirement,
  LicenseMetadata,
  IconStyle,
  ViewBoxDimensions,
} from '@/types/domain';

export type CommercialUseStatus = 'allowed' | 'restricted' | 'unknown';

export type MaintenanceStatus = 'active' | 'archived' | 'legacy' | 'unmaintained' | 'unknown';

export interface TrademarkPolicy {
  readonly hasRestrictions: boolean;
  readonly notice: string;
  readonly policyUrl?: string;
}

export type IntegrationMethod =
  | 'iconify_api'
  | 'official_package'
  | 'downloadable_asset';

export interface VerifiedLicense extends LicenseMetadata {
  readonly id: string;
  readonly title: string;
  readonly spdxId: string;
  readonly url: string;
  readonly verificationStatus: 'verified';
  readonly attributionTerms: AttributionRequirement;
  readonly commercialUse: CommercialUseStatus;
  readonly verificationDate: string; // ISO date 'YYYY-MM-DD'
  readonly notes?: string;
}

export interface CuratedSource {
  readonly id: string; // Unique source identifier (e.g., 'lucide', 'tabler')
  readonly canonicalPrefix: string; // Canonical Iconify prefix
  readonly displayName: string;
  readonly upstreamUrl: string; // Authoritative project site
  readonly repositoryUrl: string; // Authoritative version-control repository
  readonly verificationStatus: VerificationStatus;
  readonly verificationDate: string; // ISO date 'YYYY-MM-DD'
  readonly license: VerifiedLicense;
  readonly integrationMethod: IntegrationMethod;
  readonly supportedStyles: readonly IconStyle[];
  readonly defaultViewBox: ViewBoxDimensions;
  readonly verifiedTotal?: number; // Verified icon count from live provider
  readonly description: string;
  readonly visualTag: string;
  readonly maintenanceStatus: MaintenanceStatus;
  readonly trademarkNotice?: string;
  readonly trademarkPolicy?: TrademarkPolicy;
  readonly featured: boolean; // Flag for homepage presentation
}

export interface CollectionSummary {
  readonly prefix: string;
  readonly name: string;
  readonly total: number;
  readonly authorName?: string;
  readonly authorUrl?: string;
  readonly licenseTitle?: string;
  readonly licenseUrl?: string;
  readonly licenseSpdx?: string;
  readonly samples?: readonly string[];
  readonly category?: string;
  readonly height?: number | readonly number[];
  readonly palette?: boolean;
}

export interface CollectionDetail {
  readonly prefix: string;
  readonly title: string;
  readonly total: number;
  readonly categories: Record<string, readonly string[]>;
  readonly uncategorized: readonly string[];
  readonly aliases: Record<string, { parent: string }>;
}
