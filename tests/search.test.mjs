// ==============================================================================
// IconHub Search, Taxonomy, Filtering & Pagination Test Suite
// Built on Node.js native test runner (node:test & node:assert).
// Tests category constraints, variant-level style filtering, blank query semantics,
// partial error preservation, abort propagation, token-safe collision prevention,
// and accurate, non-overlapping filtered pagination.
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import { TaxonomyService } from '../src/modules/taxonomy';
import {
  SearchService,
  classifyIconStyle,
  isStyleSupportedByPrefix,
  computeSearchKey,
  isContinuationValid,
} from '../src/modules/search';
import { GET as searchRouteHandler } from '../src/app/api/search/route';
import { ProviderError } from '../src/modules/provider/errors';

// ==============================================================================
// 1. Taxonomy & Semantic Category Constraints (Token-Safe Matching)
// ==============================================================================

test('TaxonomyService: validates all 19 defined categories and their semantic tokens', () => {
  const allCategories = TaxonomyService.getAllCategories();
  assert.equal(allCategories.length, 19, 'Must define exactly 19 taxonomy categories');

  for (const cat of allCategories) {
    assert.ok(cat.id, 'Category must have an id');
    assert.ok(cat.label, 'Category must have a label');
    assert.ok(cat.description, 'Category must have a description');

    if (cat.id !== 'all') {
      assert.ok(
        cat.providerCategory || cat.queryKeyword,
        `Category '${cat.id}' must have either providerCategory or queryKeyword`
      );
      assert.ok(
        cat.semanticTerms && cat.semanticTerms.length > 0,
        `Category '${cat.id}' must define semanticTerms for category constraint verification`
      );
    }
  }
});

test('TaxonomyService.matchesCategory: token-safe matching prevents accidental substring collisions', () => {
  // 1. Unrelated words containing substring of category terms must be strictly REJECTED
  assert.equal(
    TaxonomyService.matchesCategory('display', 'media'),
    false,
    'Term "play" in media category must NOT match inside unrelated word "display"'
  );
  assert.equal(
    TaxonomyService.matchesCategory('copyright', 'arrows'),
    false,
    'Term "right" in arrows category must NOT match inside unrelated word "copyright"'
  );
  assert.equal(
    TaxonomyService.matchesCategory('heart', 'editing'),
    false,
    'Term "art" must NOT match inside unrelated word "heart"'
  );
  assert.equal(
    TaxonomyService.matchesCategory('gear', 'education'),
    false,
    'Term "ear" must NOT match inside unrelated word "gear"'
  );

  // 2. Valid compound names matching token boundaries must be ACCEPTED
  assert.equal(TaxonomyService.matchesCategory('arrow-up', 'arrows'), true);
  assert.equal(TaxonomyService.matchesCategory('arrow-right', 'arrows'), true);
  assert.equal(TaxonomyService.matchesCategory('turn-right', 'arrows'), true);
  assert.equal(TaxonomyService.matchesCategory('move-right', 'arrows'), true);
  assert.equal(TaxonomyService.matchesCategory('chevron-right', 'arrows'), true);
  assert.equal(TaxonomyService.matchesCategory('caret-down', 'arrows'), true);
  assert.equal(TaxonomyService.matchesCategory('play-circle', 'media'), true);
  assert.equal(TaxonomyService.matchesCategory('video-camera', 'media'), true);
  assert.equal(TaxonomyService.matchesCategory('mail-open', 'communication'), true);

  // 3. 'all' category matches everything
  assert.equal(TaxonomyService.matchesCategory('anything-at-all', 'all'), true);
});

test('SearchService: combined category-plus-query excludes unrelated icons', async (t) => {
  // Query for 'user' under category 'arrows' must return 0 icons because users are not arrows
  let userUnderArrows;
  try {
    userUnderArrows = await SearchService.search({
      query: 'user',
      category: 'arrows',
      limit: 10,
    });
  } catch (err) {
    if (err.code === 'RATE_LIMITED' || err.code === 'NETWORK_ERROR') {
      t.skip(`Skipping test due to provider rate limit/network: ${err.message}`);
      return;
    }
    throw err;
  }

  assert.equal(
    userUnderArrows.icons.length,
    0,
    'Searching query "user" under category "arrows" must return 0 icons (unrelated matches excluded)'
  );
  assert.equal(userUnderArrows.activeCategory, 'arrows');

  // Query for 'right' under category 'arrows' should return directional icons like arrow-right, chevron-right
  let rightUnderArrows;
  try {
    rightUnderArrows = await SearchService.search({
      query: 'right',
      category: 'arrows',
      limit: 10,
    });
  } catch (err) {
    if (err.code === 'RATE_LIMITED' || err.code === 'NETWORK_ERROR') {
      t.skip(`Skipping test due to provider rate limit/network: ${err.message}`);
      return;
    }
    throw err;
  }

  assert.ok(rightUnderArrows.icons.length > 0, 'Should find directional arrows matching "right"');
  for (const icon of rightUnderArrows.icons) {
    assert.equal(
      TaxonomyService.matchesCategory(icon.name, 'arrows'),
      true,
      `Icon ${icon.prefix}:${icon.name} must satisfy arrows category constraint`
    );
  }
});

test('SearchService: category-only navigation searches using validated mapping', async (t) => {
  let arrowsResult;
  try {
    arrowsResult = await SearchService.search({
      category: 'arrows',
      limit: 12,
    });
  } catch (err) {
    if (err.code === 'RATE_LIMITED' || err.code === 'NETWORK_ERROR') {
      t.skip(`Skipping test due to provider rate limit/network: ${err.message}`);
      return;
    }
    throw err;
  }

  assert.ok(arrowsResult.icons.length > 0, 'Category-only navigation for arrows must yield icons');
  assert.equal(arrowsResult.activeCategory, 'arrows');
  for (const icon of arrowsResult.icons) {
    assert.equal(
      TaxonomyService.matchesCategory(icon.name, 'arrows'),
      true,
      `All icons must satisfy arrows category, got: ${icon.prefix}:${icon.name}`
    );
  }
});

// ==============================================================================
// 2. Style Variant Classification & Filtering
// ==============================================================================

test('classifyIconStyle: distinguishes variant styles across collections', () => {
  // Phosphor
  assert.equal(classifyIconStyle('ph', 'heart'), 'outline');
  assert.equal(classifyIconStyle('ph', 'heart-bold'), 'outline');
  assert.equal(classifyIconStyle('ph', 'heart-light'), 'outline');
  assert.equal(classifyIconStyle('ph', 'heart-thin'), 'outline');
  assert.equal(classifyIconStyle('ph', 'heart-fill'), 'solid');
  assert.equal(classifyIconStyle('ph', 'heart-duotone'), 'duotone');

  // Remix Icon
  assert.equal(classifyIconStyle('ri', 'heart-line'), 'outline');
  assert.equal(classifyIconStyle('ri', 'heart-fill'), 'solid');

  // Tabler
  assert.equal(classifyIconStyle('tabler', 'heart'), 'outline');
  assert.equal(classifyIconStyle('tabler', 'heart-filled'), 'solid');

  // Heroicons
  assert.equal(classifyIconStyle('heroicons', 'heart'), 'outline');
  assert.equal(classifyIconStyle('heroicons', 'heart-solid'), 'solid');
  assert.equal(classifyIconStyle('heroicons', 'heart-20-solid'), 'solid');

  // Bootstrap Icons
  assert.equal(classifyIconStyle('bi', 'heart'), 'outline');
  assert.equal(classifyIconStyle('bi', 'heart-fill'), 'solid');

  // Lucide & Feather (Outline only)
  assert.equal(classifyIconStyle('lucide', 'heart'), 'outline');
  assert.equal(classifyIconStyle('feather', 'heart'), 'outline');

  // Simple Icons (Brand marks are solid)
  assert.equal(classifyIconStyle('simple-icons', 'github'), 'solid');
});

test('isStyleSupportedByPrefix: enforces variant availability', () => {
  // Lucide and Feather do NOT support solid or duotone
  assert.equal(isStyleSupportedByPrefix('lucide', 'outline'), true);
  assert.equal(isStyleSupportedByPrefix('lucide', 'solid'), false);
  assert.equal(isStyleSupportedByPrefix('lucide', 'duotone'), false);

  assert.equal(isStyleSupportedByPrefix('feather', 'outline'), true);
  assert.equal(isStyleSupportedByPrefix('feather', 'solid'), false);

  // Simple Icons only supports solid
  assert.equal(isStyleSupportedByPrefix('simple-icons', 'solid'), true);
  assert.equal(isStyleSupportedByPrefix('simple-icons', 'outline'), false);

  // Phosphor supports outline, solid, duotone
  assert.equal(isStyleSupportedByPrefix('ph', 'outline'), true);
  assert.equal(isStyleSupportedByPrefix('ph', 'solid'), true);
  assert.equal(isStyleSupportedByPrefix('ph', 'duotone'), true);
});

test('SearchService: style filter returns only the requested concrete variant', async (t) => {
  let solidResult;
  let outlineResult;
  try {
    solidResult = await SearchService.search({
      query: 'heart',
      style: 'solid',
      limit: 10,
    });
    outlineResult = await SearchService.search({
      query: 'heart',
      style: 'outline',
      limit: 10,
    });
  } catch (err) {
    if (err.code === 'RATE_LIMITED' || err.code === 'NETWORK_ERROR') {
      t.skip(`Skipping test due to provider rate limit/network: ${err.message}`);
      return;
    }
    throw err;
  }

  assert.ok(solidResult.icons.length > 0, 'Should find solid heart icons');
  for (const item of solidResult.icons) {
    assert.equal(
      item.styleVariant,
      'solid',
      `Solid filter must only return solid variants, got: ${item.prefix}:${item.name} (${item.styleVariant})`
    );
    assert.notEqual(item.prefix, 'lucide', 'Lucide must never appear in solid results');
  }

  assert.ok(outlineResult.icons.length > 0, 'Should find outline heart icons');
  for (const item of outlineResult.icons) {
    assert.equal(
      item.styleVariant,
      'outline',
      `Outline filter must only return outline variants, got: ${item.prefix}:${item.name} (${item.styleVariant})`
    );
  }

  // Ensure returned variant sets are mutually disjoint
  const solidSet = new Set(solidResult.icons.map((i) => i.canonicalId));
  for (const item of outlineResult.icons) {
    assert.ok(
      !solidSet.has(item.canonicalId),
      `Solid and outline variant sets must not overlap: ${item.canonicalId}`
    );
  }
});

// ==============================================================================
// 3. Filtered Pagination Stability & Accuracy
// ==============================================================================

test('SearchService: post-filtered pagination produces zero duplicate IDs across pages', async (t) => {
  let page1;
  let page2;
  try {
    page1 = await SearchService.search({
      category: 'arrows',
      limit: 16,
      page: 1,
    });
    page2 = await SearchService.search({
      category: 'arrows',
      limit: 16,
      page: 2,
    });
  } catch (err) {
    if (err.code === 'RATE_LIMITED' || err.code === 'NETWORK_ERROR') {
      t.skip(`Skipping test due to provider rate limit/network: ${err.message}`);
      return;
    }
    throw err;
  }

  assert.ok(page1.icons.length > 0, 'Page 1 must contain filtered arrow icons');
  assert.ok(page2.icons.length > 0, 'Page 2 must contain filtered arrow icons');

  // Verify that unfiltered upstream totals are NOT exposed as filtered total
  assert.equal(page1.total, undefined, 'Filtered search must not claim exact unfiltered upstream total');
  assert.equal(page1.totalPages, undefined, 'Filtered search must not claim exact unfiltered totalPages');
  assert.equal(typeof page1.hasMore, 'boolean', 'Filtered search must provide authoritative hasMore boolean');

  // Verify that Page 1 and Page 2 have ZERO duplicate canonical IDs
  const page1Ids = new Set(page1.icons.map((i) => i.canonicalId));
  for (const icon of page2.icons) {
    assert.ok(
      !page1Ids.has(icon.canonicalId),
      `Duplicate icon found across pages: ${icon.canonicalId}`
    );
  }
});

test('SearchService: post-filtering applies constraints BEFORE selecting page items in mock provider', async () => {
  // Mock provider returning a mix of arrow and non-arrow icons
  // Out of 10 items, only 4 are arrows: arrow-1, arrow-2, arrow-3, arrow-4
  const mockIcons = [
    'lucide:user-1',
    'lucide:arrow-1',
    'lucide:file-1',
    'lucide:arrow-2',
    'lucide:settings-1',
    'lucide:arrow-3',
    'lucide:shopping-1',
    'lucide:arrow-4',
    'lucide:help-1',
    'lucide:arrow-5',
  ];

  const mockProvider = {
    searchIcons: async ({ start, limit }) => ({
      icons: mockIcons.slice(start, start + limit),
      total: mockIcons.length,
      limit,
      start,
    }),
    getIconsData: async (prefix, names) => {
      const map = new Map();
      for (const name of names) {
        map.set(name, { body: '<path d="M0 0"/>', width: 24, height: 24 });
      }
      return map;
    },
  };

  // Request page 1 with limit 2
  const page1 = await SearchService.search(
    { category: 'arrows', limit: 2, page: 1 },
    { provider: mockProvider }
  );

  assert.equal(page1.icons.length, 2);
  assert.equal(page1.icons[0].name, 'arrow-1');
  assert.equal(page1.icons[1].name, 'arrow-2');
  assert.equal(page1.hasMore, true);
  assert.equal(typeof page1.nextCursor, 'number');

  // Request page 2 using cursor continuation
  const page2 = await SearchService.search(
    { category: 'arrows', limit: 2, cursor: page1.nextCursor },
    { provider: mockProvider }
  );

  assert.equal(page2.icons.length, 2);
  assert.equal(page2.icons[0].name, 'arrow-3');
  assert.equal(page2.icons[1].name, 'arrow-4');
  assert.equal(page2.hasMore, true);
  assert.equal(typeof page2.nextCursor, 'number');

  // Request page 3 using cursor continuation (only arrow-5 remains)
  const page3 = await SearchService.search(
    { category: 'arrows', limit: 2, cursor: page2.nextCursor },
    { provider: mockProvider }
  );

  assert.equal(page3.icons.length, 1);
  assert.equal(page3.icons[0].name, 'arrow-5');
  assert.equal(page3.hasMore, false, 'hasMore must be false when candidates exhausted');

  // Verify complete disjointness across all 3 pages
  const allIds = [
    ...page1.icons.map((i) => i.canonicalId),
    ...page2.icons.map((i) => i.canonicalId),
    ...page3.icons.map((i) => i.canonicalId),
  ];
  const uniqueIds = new Set(allIds);
  assert.equal(allIds.length, uniqueIds.size, 'No duplicates permitted across any pages');
});

// ==============================================================================
// 4. Blank Query Fallback Removal & Search Start State
// ==============================================================================

test('SearchService: empty query with category "all" returns default browse results', async () => {
  const result = await SearchService.search({
    query: '',
    category: 'all',
  });

  // Must NOT fall back to arbitrary 'interface' query; returns verified collections browse results
  assert.equal(result.query, '');
  assert.equal(result.activeCategory, 'all');
  assert.ok(result.total > 0, 'Total should reflect eligible collection icons');
  assert.ok(result.icons.length > 0, 'Should return icon items by default');
  assert.equal(result.isInitialDiscovery, false);
});

test('SearchService: whitespace-only query is treated as blank query and returns browse results', async () => {
  const result = await SearchService.search({
    query: '   ',
    category: 'all',
  });

  assert.equal(result.isInitialDiscovery, false);
  assert.ok(result.icons.length > 0);
});

// ==============================================================================
// 5. Error Preservation, Partial Failures & Abort Signal
// ==============================================================================

test('SearchService: surfaces upstream batch failures instead of silently swallowing', async () => {
  const mockProvider = {
    searchIcons: async () => ({
      icons: ['lucide:arrow-up', 'tabler:arrow-up'],
      total: 2,
      limit: 32,
      start: 0,
    }),
    getIconsData: async () => {
      throw new Error('Simulated upstream failure');
    },
  };

  await assert.rejects(
    async () => {
      await SearchService.search(
        { query: 'arrow' },
        { provider: mockProvider }
      );
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.code, 'UPSTREAM_BATCH_FAILURE');
      return true;
    }
  );
});

test('SearchService: handles partial upstream collection failures with warning', async () => {
  const mockProvider = {
    searchIcons: async () => ({
      icons: ['lucide:arrow-up', 'tabler:arrow-up'],
      total: 2,
      limit: 32,
      start: 0,
    }),
    getIconsData: async (prefix) => {
      if (prefix === 'tabler') {
        throw new Error('Tabler service unavailable');
      }
      return new Map([
        [
          'arrow-up',
          { body: '<path d="M12 19V5M5 12l7-7 7 7"/>', width: 24, height: 24 },
        ],
      ]);
    },
  };

  const result = await SearchService.search(
    { query: 'arrow' },
    { provider: mockProvider }
  );

  assert.equal(result.icons.length, 1);
  assert.equal(result.icons[0].prefix, 'lucide');
  assert.ok(result.partialFailures, 'Must report partialFailures array');
  assert.deepEqual(result.partialFailures, ['tabler']);
});

test('SearchService: respects AbortSignal cancellation', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    async () => {
      await SearchService.search({ query: 'search' }, controller.signal);
    },
    (err) => {
      return err.name === 'AbortError' || err.message?.includes('aborted');
    }
  );
});

test('SearchService: cursor calculation preserves withheld matches in a single chunk', async () => {
  // Provider returning 5 matching arrow icons in one chunk
  const mockIcons = [
    'lucide:arrow-1',
    'lucide:arrow-2',
    'lucide:arrow-3',
    'lucide:arrow-4',
    'lucide:arrow-5',
  ];

  const mockProvider = {
    searchIcons: async ({ start, limit }) => ({
      icons: mockIcons.slice(start, start + limit),
      total: mockIcons.length,
      limit,
      start,
    }),
    getIconsData: async (prefix, names) => {
      const map = new Map();
      for (const name of names) {
        map.set(name, { body: '<path d="M0 0"/>', width: 24, height: 24 });
      }
      return map;
    },
  };

  // Request batch 1 with limit 2
  const batch1 = await SearchService.search(
    { category: 'arrows', limit: 2, cursor: 0 },
    { provider: mockProvider }
  );

  assert.equal(batch1.icons.length, 2);
  assert.equal(batch1.icons[0].name, 'arrow-1');
  assert.equal(batch1.icons[1].name, 'arrow-2');
  assert.equal(batch1.hasMore, true);
  // nextCursor MUST point to index 2 (the first withheld match arrow-3), NOT chunk end
  assert.equal(batch1.nextCursor, 2);

  // Request batch 2 with cursor from batch 1
  const batch2 = await SearchService.search(
    { category: 'arrows', limit: 2, cursor: batch1.nextCursor },
    { provider: mockProvider }
  );

  assert.equal(batch2.icons.length, 2);
  assert.equal(batch2.icons[0].name, 'arrow-3');
  assert.equal(batch2.icons[1].name, 'arrow-4');
  assert.equal(batch2.hasMore, true);
  assert.equal(batch2.nextCursor, 4);

  // Request batch 3 with cursor from batch 2
  const batch3 = await SearchService.search(
    { category: 'arrows', limit: 2, cursor: batch2.nextCursor },
    { provider: mockProvider }
  );

  assert.equal(batch3.icons.length, 1);
  assert.equal(batch3.icons[0].name, 'arrow-5');
  assert.equal(batch3.hasMore, false);
});

test('SearchService: bounded scan yielding 0 matches returns hasMore: true and nextCursor', async () => {
  // Upstream has 300 non-matching items followed by matching items
  const nonMatching = Array.from({ length: 300 }, (_, i) => `lucide:user-${i}`);
  const matching = ['lucide:arrow-final'];
  const allUpstream = [...nonMatching, ...matching];

  const mockProvider = {
    searchIcons: async ({ start, limit }) => ({
      icons: allUpstream.slice(start, start + limit),
      total: allUpstream.length,
      limit,
      start,
    }),
    getIconsData: async (prefix, names) => {
      const map = new Map();
      for (const name of names) {
        map.set(name, { body: '<path d="M0 0"/>', width: 24, height: 24 });
      }
      return map;
    },
  };

  // First request scans 4 chunks of 64 = 256 items. None match.
  const step1 = await SearchService.search(
    { category: 'arrows', limit: 32, cursor: 0 },
    { provider: mockProvider }
  );

  assert.equal(step1.icons.length, 0);
  assert.equal(step1.hasMore, true, 'hasMore must be true because upstream candidates remain');
  assert.equal(step1.nextCursor, 256, 'nextCursor must reflect the bounded scan progress');

  // Next continuation request picks up at cursor 256
  const step2 = await SearchService.search(
    { category: 'arrows', limit: 32, cursor: step1.nextCursor },
    { provider: mockProvider }
  );

  assert.equal(step2.icons.length, 1);
  assert.equal(step2.icons[0].name, 'arrow-final');
  assert.equal(step2.hasMore, false);
});

// ==============================================================================
// 6. API Route Handler (GET /api/search)
// ==============================================================================

test('API Route Handler: parses parameters and forwards request signal', async (t) => {
  const req = new Request('https://iconhub.dev/api/search?q=search&limit=10&page=1');
  const response = await searchRouteHandler(req);

  const data = await response.json();
  if (data.error && (data.code === 'RATE_LIMITED' || data.code === 'UPSTREAM_ERROR' || response.status === 500)) {
    t.skip('Skipping API test due to rate limiting/offline upstream');
    return;
  }

  assert.equal(response.status, 200);
  assert.equal(data.query, 'search');
  assert.equal(data.limit, 10);
  assert.equal(data.page, 1);
  assert.ok(Array.isArray(data.icons));
  assert.ok(data.icons.length > 0);
  assert.equal(typeof data.hasMore, 'boolean');
});

test('API Route Handler: parses cursor parameter and forwards to search service', async () => {
  const req = new Request('https://iconhub.dev/api/search?cursor=128&limit=16');
  const response = await searchRouteHandler(req);

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(typeof data.hasMore, 'boolean');
  assert.ok(Array.isArray(data.icons));
});

test('API Route Handler: returns browse results on blank query with all categories', async () => {
  const req = new Request('https://iconhub.dev/api/search');
  const response = await searchRouteHandler(req);

  assert.equal(response.status, 200);
  const data = await response.json();

  assert.equal(data.isInitialDiscovery, false);
  assert.ok(data.icons.length > 0);
  assert.ok(data.total > 0);
});

// ==============================================================================
// 7. Search Continuation & Stale Response Invalidation Protection
// ==============================================================================

test('computeSearchKey: normalizes query casing, whitespace, and source ordering', () => {
  const key1 = computeSearchKey('  Arrow  ', 'arrows', ['tabler', 'lucide'], 'all', 'all');
  const key2 = computeSearchKey('arrow', 'arrows', ['lucide', 'tabler'], 'all', 'all');
  assert.equal(key1, key2, 'Search keys must match regardless of source array order or query whitespace');

  const key3 = computeSearchKey('arrow', 'arrows', ['lucide'], 'all', 'all');
  assert.notEqual(key1, key3, 'Different sources must produce different search keys');

  const key4 = computeSearchKey('arrow', 'media', ['lucide', 'tabler'], 'all', 'all');
  assert.notEqual(key1, key4, 'Different categories must produce different search keys');
});

test('isContinuationValid: accepts matching generation, search key, and active signal', () => {
  const controller = new AbortController();
  const context = { generation: 4, searchKey: 'arrow|arrows|lucide|all|all' };

  assert.equal(
    isContinuationValid(context, 4, 'arrow|arrows|lucide|all|all', controller.signal),
    true,
    'Continuation matching exact generation and key with active signal must be valid'
  );
});

test('isContinuationValid: rejects aborted signal', () => {
  const controller = new AbortController();
  controller.abort();
  const context = { generation: 2, searchKey: 'arrow|arrows|lucide|all|all' };

  assert.equal(
    isContinuationValid(context, 2, 'arrow|arrows|lucide|all|all', controller.signal),
    false,
    'Aborted continuation must be immediately rejected'
  );
});

test('isContinuationValid: rejects superseded request generation', () => {
  const controller = new AbortController();
  const context = { generation: 1, searchKey: 'arrow|arrows|lucide|all|all' };

  assert.equal(
    isContinuationValid(context, 2, 'arrow|arrows|lucide|all|all', controller.signal),
    false,
    'Continuation from older generation must be rejected when generation advanced'
  );
});

test('isContinuationValid: rejects mismatched search key when filter changes', () => {
  const controller = new AbortController();
  const context = { generation: 3, searchKey: 'arrow|arrows|lucide|all|all' };

  assert.equal(
    isContinuationValid(context, 3, 'arrow|media|lucide|all|all', controller.signal),
    false,
    'Continuation from previous category must be rejected when category changed'
  );
});

test('Continuation race condition: mid-request filter change invalidates pending load-more', async () => {
  // Simulate active search state in SearchExplorer
  let currentGeneration = 1;
  let currentSearchKey = computeSearchKey('arrow', 'arrows', ['lucide'], 'all', 'all');
  let accumulatedIcons = [{ canonicalId: 'lucide:arrow-1', name: 'arrow-1' }];
  let cursor = 32;
  let isLoadingMore = false;
  let activeError = null;

  // 1. User clicks "Load More" for category "arrows"
  isLoadingMore = true;
  const continuationController = new AbortController();
  const continuationContext = {
    generation: currentGeneration,
    searchKey: currentSearchKey,
  };

  // Simulate in-flight promise for continuation
  let resolveContinuation;
  const inFlightPromise = new Promise((resolve) => {
    resolveContinuation = resolve;
  });

  // 2. User changes filter to category "media" while continuation is in-flight!
  // Action handler triggers:
  continuationController.abort();
  currentGeneration++;
  currentSearchKey = computeSearchKey('', 'media', ['lucide'], 'all', 'all');
  accumulatedIcons = []; // Reset for new category
  cursor = undefined;
  isLoadingMore = false;

  // 3. The old continuation fetch now resolves with arrow icons from previous query
  resolveContinuation({
    icons: [
      { canonicalId: 'lucide:arrow-2', name: 'arrow-2' },
      { canonicalId: 'lucide:arrow-3', name: 'arrow-3' },
    ],
    nextCursor: 64,
  });

  const staleResult = await inFlightPromise;

  // Apply continuation guard
  const isValid = isContinuationValid(
    continuationContext,
    currentGeneration,
    currentSearchKey,
    continuationController.signal
  );

  // Assert guard rejects stale continuation
  assert.equal(isValid, false, 'Continuation guard must reject stale continuation response');

  // If valid (which it is NOT), stale icons would have been added:
  if (isValid) {
    accumulatedIcons = [...accumulatedIcons, ...staleResult.icons];
    cursor = staleResult.nextCursor;
  }

  // 4. Verify state was NOT contaminated by stale continuation
  assert.equal(accumulatedIcons.length, 0, 'Accumulated icons must remain empty for new category');
  assert.equal(cursor, undefined, 'Cursor must remain undefined for new category');
  assert.equal(isLoadingMore, false, 'Loading state must not be overwritten by old continuation');
  assert.equal(activeError, null, 'Error must not be set by stale continuation');
});
