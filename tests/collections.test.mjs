// ==============================================================================
// IconHub Phase 7: Library Directory & Collections Test Suite
// Unit & integration tests for:
// 1. Registry metadata integrity & source verification
// 2. Collection route contracts & unknown prefix handling
// 3. Single-collection browsing in SearchService
// 4. Local storage favorites & recently viewed persistence
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import { SourceRegistry } from '../src/modules/registry/index.ts';
import { SearchService } from '../src/modules/search/index.ts';
import {
  getFavoriteCollections,
  toggleFavoriteCollection,
  isFavoriteCollection,
  getFavoriteIcons,
  toggleFavoriteIcon,
  isFavoriteIcon,
  getRecentlyViewedCollections,
  recordRecentlyViewedCollection,
  clearRecentlyViewedCollections,
  getRecentlyViewedIcons,
  recordRecentlyViewedIcon,
  clearRecentlyViewedIcons,
} from '../src/modules/storage/index.ts';

// ==============================================================================
// 1. Curated Library Registry Integrity
// ==============================================================================

test('SourceRegistry: verified collections catalogue contains 14 curated libraries', () => {
  const allSources = SourceRegistry.getAllSources();
  assert.equal(allSources.length, 14, 'Must catalog exactly 14 verified libraries');

  const prefixes = SourceRegistry.getVerifiedPrefixes();
  assert.equal(prefixes.length, 14);

  const expectedPrefixes = [
    'lucide',
    'heroicons',
    'tabler',
    'ph',
    'ri',
    'feather',
    'bi',
    'simple-icons',
    'material-symbols',
    'carbon',
    'octicon',
    'fluent',
    'ion',
    'fa6-solid',
  ];

  for (const exp of expectedPrefixes) {
    assert.ok(prefixes.includes(exp), `Expected prefix "${exp}" to be verified in registry`);
  }
});

test('SourceRegistry: every source possesses authoritative, verified metadata', () => {
  const allSources = SourceRegistry.getAllSources();

  for (const source of allSources) {
    assert.ok(source.id, 'Source must have id');
    assert.ok(source.canonicalPrefix, 'Source must have canonicalPrefix');
    assert.ok(source.displayName, 'Source must have displayName');
    assert.ok(source.description, 'Source must have description');
    assert.ok(source.visualTag, 'Source must have visualTag');
    assert.equal(source.verificationStatus, 'verified', 'Must be verified');
    assert.ok(source.verificationDate, 'Must have verificationDate');

    // License metadata
    assert.ok(source.license.id, 'License must have id');
    assert.ok(source.license.title, 'License must have title');
    assert.ok(source.license.spdxId, 'License must have spdxId');
    assert.ok(source.license.url, 'License must have URL');
    assert.ok(['allowed', 'restricted', 'unknown'].includes(source.license.commercialUse));
    assert.ok(['not_required', 'required'].includes(source.license.attributionTerms));

    // Styles & Canvas
    assert.ok(Array.isArray(source.supportedStyles) && source.supportedStyles.length > 0);
    assert.ok(source.defaultViewBox.width > 0);
    assert.ok(source.defaultViewBox.height > 0);

    // Verified Total
    if (source.verifiedTotal !== undefined) {
      assert.ok(Number.isInteger(source.verifiedTotal) && source.verifiedTotal > 0);
    }
  }
});

test('SourceRegistry: distinguishes verified prefixes from unverified or malicious ones', () => {
  assert.equal(SourceRegistry.isVerifiedPrefix('lucide'), true);
  assert.equal(SourceRegistry.isVerifiedPrefix('heroicons'), true);
  assert.equal(SourceRegistry.isVerifiedPrefix('unknown-pack'), false);
  assert.equal(SourceRegistry.isVerifiedPrefix('../malicious'), false);
  assert.equal(SourceRegistry.isVerifiedPrefix(''), false);

  assert.ok(SourceRegistry.getByPrefix('lucide'));
  assert.equal(SourceRegistry.getByPrefix('invalid-prefix'), undefined);
});

// ==============================================================================
// 2. Single Collection Browsing via SearchService
// ==============================================================================

test('SearchService: single collection browsing loads verified collection icons when query is blank', async () => {
  const mockProvider = {
    getCollection: async (prefix) => {
      assert.equal(prefix, 'lucide');
      return {
        prefix: 'lucide',
        title: 'Lucide',
        total: 2,
        categories: {},
        uncategorized: ['arrow-right', 'chevron-right'],
        aliases: {},
      };
    },
    getIconsData: async (prefix, names) => {
      const map = new Map();
      for (const name of names) {
        map.set(name, {
          body: '<path d="M5 12h14" stroke="currentColor"/>',
          width: 24,
          height: 24,
        });
      }
      return map;
    },
    searchIcons: async () => {
      throw new Error('searchIcons should not be called for blank-query collection browsing');
    },
  };

  const result = await SearchService.search(
    {
      query: '',
      category: 'all',
      sources: ['lucide'],
      style: 'all',
      license: 'all',
      page: 1,
      limit: 32,
    },
    { provider: mockProvider }
  );

  assert.equal(result.isInitialDiscovery, false);
  assert.equal(result.total, 2);
  assert.equal(result.icons.length, 2);
  assert.equal(result.icons[0].canonicalId, 'lucide:arrow-right');
  assert.equal(result.icons[0].prefix, 'lucide');
  assert.equal(result.icons[0].name, 'arrow-right');
  assert.ok(result.icons[0].body);
});

test('SearchService: single collection browsing rejects unknown collection prefix', async () => {
  const result = await SearchService.search({
    query: '',
    category: 'all',
    sources: ['non-existent-lib'],
    style: 'all',
    license: 'all',
    page: 1,
    limit: 32,
  });

  assert.equal(result.icons.length, 0);
  assert.equal(result.total, 0);
  assert.equal(result.isInitialDiscovery, false);
});

test('SearchService: single collection browsing enforces style compatibility', async () => {
  // Lucide only supports 'outline'. Asking for 'solid' should return 0 items cleanly.
  const result = await SearchService.search({
    query: '',
    category: 'all',
    sources: ['lucide'],
    style: 'solid',
    license: 'all',
    page: 1,
    limit: 32,
  });

  assert.equal(result.icons.length, 0);
  assert.equal(result.total, 0);
});

// ==============================================================================
// 3. Local Storage Favorites & Recently Viewed Store
// ==============================================================================

test('UserPreferences: toggles favorite collections with in-memory fallback', () => {
  // Clean initial state
  const initial = getFavoriteCollections();
  assert.ok(Array.isArray(initial));

  // Toggle 'lucide' on
  const added = toggleFavoriteCollection('lucide');
  assert.equal(added, true);
  assert.equal(isFavoriteCollection('lucide'), true);

  // Toggle 'lucide' off
  const removed = toggleFavoriteCollection('lucide');
  assert.equal(removed, false);
  assert.equal(isFavoriteCollection('lucide'), false);
});

test('UserPreferences: toggles favorite icons with in-memory fallback', () => {
  const testId = 'lucide:arrow-right';
  assert.equal(isFavoriteIcon(testId), false);

  const added = toggleFavoriteIcon(testId);
  assert.equal(added, true);
  assert.equal(isFavoriteIcon(testId), true);
  assert.ok(getFavoriteIcons().includes(testId));

  const removed = toggleFavoriteIcon(testId);
  assert.equal(removed, false);
  assert.equal(isFavoriteIcon(testId), false);
});

test('UserPreferences: records recently viewed collections with ordering and deduplication', () => {
  clearRecentlyViewedCollections();
  assert.deepEqual(getRecentlyViewedCollections(), []);

  recordRecentlyViewedCollection('lucide');
  recordRecentlyViewedCollection('heroicons');
  recordRecentlyViewedCollection('lucide'); // re-visit lucide: must move to front

  const recents = getRecentlyViewedCollections();
  assert.equal(recents.length, 2);
  assert.equal(recents[0].prefix, 'lucide', 'Most recently visited must be first');
  assert.equal(recents[1].prefix, 'heroicons');

  clearRecentlyViewedCollections();
  assert.deepEqual(getRecentlyViewedCollections(), []);
});

test('UserPreferences: records recently viewed icons with ordering and deduplication', () => {
  clearRecentlyViewedIcons();
  assert.deepEqual(getRecentlyViewedIcons(), []);

  recordRecentlyViewedIcon('lucide:arrow-right', 'lucide', 'arrow-right');
  recordRecentlyViewedIcon('heroicons:home', 'heroicons', 'home');

  const recents = getRecentlyViewedIcons();
  assert.equal(recents.length, 2);
  assert.equal(recents[0].canonicalId, 'heroicons:home');
  assert.equal(recents[1].canonicalId, 'lucide:arrow-right');

  clearRecentlyViewedIcons();
  assert.deepEqual(getRecentlyViewedIcons(), []);
});

