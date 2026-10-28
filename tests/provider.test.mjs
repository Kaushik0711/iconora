// ==============================================================================
// IconHub Provider, Sanitizer & Registry Test Suite
// Built on Node.js native test runner (node:test & node:assert).
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import { SourceRegistry } from '../src/modules/registry';
import {
  validateAndSanitizeSvgBody,
  buildSafeSvgString,
  sanitizeFullSvgDocument,
  isValidSvgColor,
  validateViewBox,
} from '../src/modules/svg';
import { BoundedCache } from '../src/modules/provider/cache';
import {
  IconifyProvider,
  NotFoundError,
  ProviderError,
  NetworkError,
} from '../src/modules/provider';

// ==============================================================================
// 1. Source Registry & License Semantics
// ==============================================================================

test('SourceRegistry: verifies all 14 curated candidates have authoritative metadata', () => {
  const sources = SourceRegistry.getAllSources();
  assert.equal(sources.length, 14, 'Must catalog all 14 evaluated candidate sources');

  for (const s of sources) {
    assert.ok(s.id, `Source ${s.id} must have an ID`);
    assert.ok(s.canonicalPrefix, `Source ${s.id} must have a canonical prefix`);
    assert.ok(s.displayName, `Source ${s.id} must have a display name`);
    assert.ok(s.upstreamUrl.startsWith('https://'), `Source ${s.id} must have https upstream URL`);
    assert.ok(s.repositoryUrl.startsWith('https://github.com/'), `Source ${s.id} must have authoritative GitHub URL`);
    assert.equal(s.verificationStatus, 'verified', `Source ${s.id} must be verified`);
    assert.equal(s.verificationDate, '2026-10-27', `Source ${s.id} verification date must be 2026-10-27`);
    assert.ok(['active', 'archived', 'legacy', 'unmaintained'].includes(s.maintenanceStatus));

    // Artwork license verification
    assert.ok(s.license.id, `Source ${s.id} license must have ID`);
    assert.ok(s.license.spdxId, `Source ${s.id} license must have SPDX ID`);
    assert.ok(s.license.url.startsWith('https://'), `Source ${s.id} license must have direct URL`);
    assert.equal(s.license.verificationDate, '2026-10-27');
    assert.ok(['required', 'not_required', 'unknown'].includes(s.license.attributionTerms));
    assert.ok(['allowed', 'restricted', 'unknown'].includes(s.license.commercialUse));

    // Verified total counts
    assert.ok(typeof s.verifiedTotal === 'number' && s.verifiedTotal > 0, `Source ${s.id} must have a verified total count`);
  }
});

test('SourceRegistry: separates artwork license permissions from trademark restrictions', () => {
  // Simple Icons: CC0 1.0 artwork allows commercial use, but brand trademarks are restricted
  const simpleIcons = SourceRegistry.getByPrefix('simple-icons');
  assert.ok(simpleIcons);
  assert.equal(simpleIcons.license.commercialUse, 'allowed', 'CC0-1.0 artwork allows commercial use');
  assert.equal(simpleIcons.license.attributionTerms, 'not_required');
  assert.equal(simpleIcons.trademarkPolicy?.hasRestrictions, true, 'Trademark policy flags brand restrictions');
  assert.ok(simpleIcons.trademarkPolicy?.notice.includes('trademark'), 'Contains trademark notice');

  // Octicons: MIT artwork allows commercial use, GitHub mark has trademark policy
  const octicons = SourceRegistry.getByPrefix('octicon');
  assert.ok(octicons);
  assert.equal(octicons.license.commercialUse, 'allowed', 'MIT artwork allows commercial use');
  assert.equal(octicons.license.attributionTerms, 'not_required');
  assert.equal(octicons.trademarkPolicy?.hasRestrictions, true, 'GitHub logo trademark policy flagged');

  // Font Awesome 6 Free: Artwork is CC-BY-4.0 which strictly requires attribution
  const faSolid = SourceRegistry.getByPrefix('fa6-solid');
  assert.ok(faSolid);
  assert.equal(faSolid.license.attributionTerms, 'required', 'CC-BY-4.0 strictly requires attribution');
  assert.equal(faSolid.license.commercialUse, 'allowed');

  // Feather Icons: MIT license but upstream project is archived/inactive
  const feather = SourceRegistry.getByPrefix('feather');
  assert.ok(feather);
  assert.equal(feather.maintenanceStatus, 'archived', 'Feather is marked as archived upstream');

  // Lucide: Active community fork
  const lucide = SourceRegistry.getByPrefix('lucide');
  assert.ok(lucide);
  assert.equal(lucide.maintenanceStatus, 'active');
  assert.equal(lucide.license.attributionTerms, 'not_required');
  assert.equal(lucide.license.commercialUse, 'allowed');
});

test('SourceRegistry: parses and validates canonical identifiers', () => {
  assert.deepEqual(SourceRegistry.parseCanonicalId('lucide:arrow-right'), {
    prefix: 'lucide',
    name: 'arrow-right',
  });
  assert.deepEqual(SourceRegistry.parseCanonicalId('ph:heart-bold'), {
    prefix: 'ph',
    name: 'heart-bold',
  });
  assert.equal(SourceRegistry.parseCanonicalId('invalid-without-colon'), null);
  assert.equal(SourceRegistry.parseCanonicalId(':empty-prefix'), null);
  assert.equal(SourceRegistry.parseCanonicalId('empty-name:'), null);
});

// ==============================================================================
// 2. Parser-Based SVG Sanitization & Security Boundary
// ==============================================================================

test('SVG Safety: parses clean vector elements and returns newly serialized markup', () => {
  const cleanBody = '<path d="M5 12h14" stroke="currentColor"/><circle cx="12" cy="12" r="9"/>';
  const result = validateAndSanitizeSvgBody(cleanBody);
  assert.equal(result.isValid, true);
  assert.ok(result.sanitizedBody?.includes('path'));
  assert.ok(result.sanitizedBody?.includes('circle'));
  assert.ok(!result.sanitizedBody?.includes('<svg'), 'Body should not contain wrapper root');
});

test('SVG Safety: rejects unknown or disallowed SVG tags', () => {
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0"/><unknown-tag foo="bar"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<div class="xss"><path d="M0 0"/></div>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<script>alert(1)</script>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<foreignObject><span>xss</span></foreignObject>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<iframe></iframe>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<style>body { display: none; }</style>').isValid, false);
});

test('SVG Safety: rejects unknown attributes and inline style attributes', () => {
  // Unknown attribute
  const unknownAttr = '<circle cx="10" cy="10" r="5" badattr="evil"/>';
  assert.equal(validateAndSanitizeSvgBody(unknownAttr).isValid, false);

  // Inline style attribute
  const inlineStyle = '<path d="M0 0" style="fill: red; pointer-events: auto;"/>';
  assert.equal(validateAndSanitizeSvgBody(inlineStyle).isValid, false);
});

test('SVG Safety: rejects event handlers across case variations and spacing', () => {
  assert.equal(validateAndSanitizeSvgBody('<circle cx="10" cy="10" r="5" onload="evil()"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<circle cx="10" cy="10" r="5" ONLOAD="evil()"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<circle cx="10" cy="10" r="5" onmouseover="evil()"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" OnClick="evil()"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<rect x="0" y="0" onerror="evil()"/>').isValid, false);
});

// ==============================================================================
// 3. Resource References & Adversarial URL Regression Tests
// ==============================================================================

test('SVG Safety: rejects external url(...) in fill, stroke, and all vector attributes', () => {
  // External URLs in fill
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="url(https://example.test/icon.svg#x)"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="url(http://attacker.com/leak)"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="url(//cdn.example.com/art.svg)"/>').isValid, false);

  // External URLs in stroke
  assert.equal(validateAndSanitizeSvgBody('<circle cx="5" cy="5" r="5" stroke="url(file:///etc/passwd)"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<circle cx="5" cy="5" r="5" stroke="url(data:image/svg+xml,...)"/>').isValid, false);

  // Quoted, whitespace-padded, mixed-case, and XML entity encoded URL variants
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="uRl( \'https://evil.com\' )"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="URL( &quot;https://evil.com&quot; )"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="  url(   \'https://evil.com\'   )  "/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="url(&#40;https://evil.com&#41;)"/>').isValid, false);

  // url(...) on arbitrary attributes
  assert.equal(validateAndSanitizeSvgBody('<rect x="0" y="0" width="10" height="10" opacity="url(https://evil.com)"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<g transform="url(https://evil.com)"><path d="M0 0"/></g>').isValid, false);
});

test('SVG Safety: enforces safe color grammar and allows safe plain colors & currentColor', () => {
  // Safe colors allowed
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="#6045FF" stroke="currentColor"/>').isValid, true);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="none" stroke="#ffffff"/>').isValid, true);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="transparent" stroke="rgba(96, 69, 255, 0.5)"/>').isValid, true);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="rgb(255, 0, 0)"/>').isValid, true);

  // Arbitrary CSS expressions or injected expressions rejected
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" fill="expression(alert(1))"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" stroke="calc(10px + 2px)"/>').isValid, false);
});

test('SVG Safety: enforces strict clip-path and mask local fragment grammar', () => {
  // Valid local clip-path and mask pointing to matching element types
  const validClip = '<defs><clipPath id="my-clip"><circle cx="5" cy="5" r="3"/></clipPath></defs><rect x="0" y="0" width="10" height="10" clip-path="url(#my-clip)"/>';
  assert.equal(validateAndSanitizeSvgBody(validClip).isValid, true);

  const validMask = '<defs><mask id="my-mask"><rect width="10" height="10" fill="#fff"/></mask></defs><circle cx="5" cy="5" r="5" mask="url(#my-mask)"/>';
  assert.equal(validateAndSanitizeSvgBody(validMask).isValid, true);

  // 'none' keyword allowed
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" clip-path="none" mask="none"/>').isValid, true);

  // External or data URLs in clip-path / mask rejected
  assert.equal(validateAndSanitizeSvgBody('<rect x="0" y="0" clip-path="url(https://evil.com/clip.svg#c)"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<rect x="0" y="0" mask="url(data:image/svg+xml,...)"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<rect x="0" y="0" clip-path="url(//cdn.com/c#c)"/>').isValid, false);

  // Missing target ID in clip-path / mask rejected
  assert.equal(validateAndSanitizeSvgBody('<rect x="0" y="0" clip-path="url(#nonexistent-clip)"/>').isValid, false);

  // Type mismatch: clip-path referencing a <circle> instead of <clipPath> rejected
  const clipMismatch = '<circle id="not-a-clip" r="5"/><rect x="0" y="0" clip-path="url(#not-a-clip)"/>';
  assert.equal(validateAndSanitizeSvgBody(clipMismatch).isValid, false);
});

test('SVG Safety: rejects href and xlink:href on elements other than <use>', () => {
  // href on <path>, <circle>, <g> rejected
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" href="https://evil.com"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<circle cx="5" cy="5" r="5" xlink:href="#circle"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<g href="#some-group"><path d="M0 0"/></g>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<rect x="0" y="0" href="data:image/svg+xml,..."/>').isValid, false);

  // External href on <use> rejected
  assert.equal(validateAndSanitizeSvgBody('<use href="https://evil.com/icon.svg#symbol"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<use xlink:href="//attacker.com/test.svg#id"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<use href="local-file.svg#symbol"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<use href="javascript:alert(1)"/>').isValid, false);

  // Valid local <use> referencing an existing element
  const validUse = '<defs><circle id="dot" cx="5" cy="5" r="3"/></defs><use href="#dot"/>';
  assert.equal(validateAndSanitizeSvgBody(validUse).isValid, true);
});

test('SVG Safety: rejects missing, malformed, and duplicate fragment IDs', () => {
  // Duplicate ID detected
  const duplicateId = '<circle id="dup-id" cx="5" cy="5" r="3"/><rect id="dup-id" x="0" y="0" width="5" height="5"/>';
  assert.equal(validateAndSanitizeSvgBody(duplicateId).isValid, false);

  // Missing ID target for <use>
  assert.equal(validateAndSanitizeSvgBody('<use href="#missing-id"/>').isValid, false);

  // Malformed ID syntax
  assert.equal(validateAndSanitizeSvgBody('<circle id="bad id with spaces" r="5"/>').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('<circle id="bad&quot;id" r="5"/>').isValid, false);
});

test('SVG Safety: rejects cyclic and self-referential references', () => {
  // Direct self-cycle: <use id="a" href="#a"/>
  const selfCycle = '<use id="loop" href="#loop"/>';
  assert.equal(validateAndSanitizeSvgBody(selfCycle).isValid, false);

  // Two-node cycle: a -> b -> a
  const twoNodeCycle = '<g id="node-a"><use href="#node-b"/></g><g id="node-b"><use href="#node-a"/></g>';
  assert.equal(validateAndSanitizeSvgBody(twoNodeCycle).isValid, false);

  // Three-node cycle: a -> b -> c -> a
  const threeNodeCycle = '<g id="a"><use href="#b"/></g><g id="b"><use href="#c"/></g><g id="c"><use href="#a"/></g>';
  assert.equal(validateAndSanitizeSvgBody(threeNodeCycle).isValid, false);

  // Valid non-cyclic diamond graph: a -> c, b -> c
  const diamond = '<defs><circle id="leaf" r="5"/></defs><g id="branch-1"><use href="#leaf"/></g><g id="branch-2"><use href="#leaf"/></g>';
  assert.equal(validateAndSanitizeSvgBody(diamond).isValid, true);
});

test('SVG Namespace Enforcement: requires SVG namespace on root and every child element', () => {
  // 1. Valid standalone SVG root and child elements in SVG namespace pass
  const validSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M5 12h14"/></svg>';
  assert.equal(sanitizeFullSvgDocument(validSvg).isValid, true);

  // 2. Standalone <svg> with missing/no xmlns namespace fails
  const missingXmlnsSvg = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M5 12h14"/></svg>';
  assert.equal(sanitizeFullSvgDocument(missingXmlnsSvg).isValid, false, 'Standalone SVG without xmlns must fail');

  // 3. Child element resetting namespace with xmlns="" fails in both body and full document paths
  const emptyNsBody = '<g xmlns=""><path d="M0 0"/></g>';
  assert.equal(validateAndSanitizeSvgBody(emptyNsBody).isValid, false, 'Child element with xmlns="" in body must fail');

  const emptyNsDoc = '<svg xmlns="http://www.w3.org/2000/svg"><g xmlns=""><path d="M0 0"/></g></svg>';
  assert.equal(sanitizeFullSvgDocument(emptyNsDoc).isValid, false, 'Child element with xmlns="" in document must fail');

  // 4. Child in foreign namespace fails in both body and full document paths
  const foreignNsBody = '<g xmlns="http://evil.com"><path d="M0 0"/></g>';
  assert.equal(validateAndSanitizeSvgBody(foreignNsBody).isValid, false, 'Child in foreign namespace in body must fail');

  const xhtmlBody = '<g xmlns="http://www.w3.org/1999/xhtml"><path d="M0 0"/></g>';
  assert.equal(validateAndSanitizeSvgBody(xhtmlBody).isValid, false, 'Child in XHTML namespace must fail');

  const foreignChildDoc = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5" xmlns="http://evil.com"/></svg>';
  assert.equal(sanitizeFullSvgDocument(foreignChildDoc).isValid, false, 'Child in foreign namespace in document must fail');

  // 5. Standalone document with foreign root namespace fails
  const xhtmlRoot = '<svg xmlns="http://www.w3.org/1999/xhtml"><path d="M0 0"/></svg>';
  assert.equal(sanitizeFullSvgDocument(xhtmlRoot).isValid, false, 'Root in XHTML namespace must fail');

  // 6. Disallowed foreign namespace declaration or namespaced attributes fail
  const foreignNsDecl = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:evil="http://evil.com"><path d="M0 0"/></svg>';
  assert.equal(sanitizeFullSvgDocument(foreignNsDecl).isValid, false);

  const xmlBase = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" xml:base="https://evil.com"/></svg>';
  assert.equal(sanitizeFullSvgDocument(xmlBase).isValid, false);

  const evEvent = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5" ev:event="onclick"/></svg>';
  assert.equal(sanitizeFullSvgDocument(evEvent).isValid, false);

  // 7. Correctly namespaced local references with xmlns:xlink pass
  const validXlink = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><circle id="d" r="2"/></defs><use xlink:href="#d"/></svg>';
  assert.equal(sanitizeFullSvgDocument(validXlink).isValid, true);
});

test('SVG Safety: rejects malformed XML and closing tag edge cases', () => {
  // Unclosed tag
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0"><circle cx="10">').isValid, false);
  // Mismatched closing tag
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0"></circle>').isValid, false);
  // Garbage syntax
  assert.equal(validateAndSanitizeSvgBody('<path d="M0 0" <<<>>>').isValid, false);
  // Empty or non-string
  assert.equal(validateAndSanitizeSvgBody('').isValid, false);
  assert.equal(validateAndSanitizeSvgBody('   ').isValid, false);
});

test('SVG Safety: validates colors and viewBox formats against injection attempts', () => {
  // Valid colors
  assert.equal(isValidSvgColor('currentColor'), true);
  assert.equal(isValidSvgColor('none'), true);
  assert.equal(isValidSvgColor('transparent'), true);
  assert.equal(isValidSvgColor('#6045FF'), true);
  assert.equal(isValidSvgColor('#fff'), true);
  assert.equal(isValidSvgColor('rgb(96, 69, 255)'), true);
  assert.equal(isValidSvgColor('rgba(96, 69, 255, 0.5)'), true);

  // Injected or malformed colors
  assert.equal(isValidSvgColor('red" onload="alert(1)'), false);
  assert.equal(isValidSvgColor('javascript:alert(1)'), false);
  assert.equal(isValidSvgColor('url(evil.png)'), false);
  assert.equal(isValidSvgColor('<script>'), false);

  // Valid viewBox
  assert.equal(validateViewBox('0 0 24 24').isValid, true);
  assert.equal(validateViewBox('0, 0, 100, 100').isValid, true);

  // Invalid viewBox
  assert.equal(validateViewBox('0 0 24').isValid, false);
  assert.equal(validateViewBox('0 0 24 24" onload="alert(1)').isValid, false);
  assert.equal(validateViewBox('0 0 -24 24').isValid, false);
  assert.equal(validateViewBox('0 0 abc def').isValid, false);
});

test('buildSafeSvgString: rejects attribute injection and invalid options', () => {
  const cleanBody = '<path d="M5 12h14"/>';

  // Attribute injection through color
  const injectedColor = buildSafeSvgString({
    body: cleanBody,
    color: 'red" onload="alert(1)"',
  });
  assert.equal(injectedColor.isValid, false);

  // Attribute injection through viewBox
  const injectedViewBox = buildSafeSvgString({
    body: cleanBody,
    viewBox: '0 0 24 24" onmouseover="alert(1)',
  });
  assert.equal(injectedViewBox.isValid, false);

  // Attribute injection through className
  const injectedClass = buildSafeSvgString({
    body: cleanBody,
    className: 'safe-class" onclick="alert(1)',
  });
  assert.equal(injectedClass.isValid, false);

  // Invalid dimension values
  assert.equal(buildSafeSvgString({ body: cleanBody, width: -10 }).isValid, false);
  assert.equal(buildSafeSvgString({ body: cleanBody, width: NaN }).isValid, false);
  assert.equal(buildSafeSvgString({ body: cleanBody, width: 5000 }).isValid, false);

  // Valid options output properly wrapped SVG
  const valid = buildSafeSvgString({
    body: cleanBody,
    width: 32,
    height: 32,
    viewBox: '0 0 32 32',
    color: '#6045FF',
    strokeWidth: 2,
    className: 'icon-primary',
  });
  assert.equal(valid.isValid, true);
  assert.ok(valid.svgString?.includes('width="32"'));
  assert.ok(valid.svgString?.includes('viewBox="0 0 32 32"'));
  assert.ok(valid.svgString?.includes('stroke="#6045FF"'));
  assert.ok(valid.svgString?.includes('stroke-width="2"'));
  assert.ok(valid.svgString?.includes('class="icon-primary"'));
});

// ==============================================================================
// 4. BoundedCache & Reference-Counted Cancellation
// ==============================================================================

test('BoundedCache: enforces TTL expiration and LRU eviction', async () => {
  const cache = new BoundedCache({ maxEntries: 2, defaultTtlMs: 50 });

  cache.set('a', 1);
  cache.set('b', 2);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('b'), 2);

  // Inserting 'c' should evict the least-recently-used entry ('a' was touched, 'b' is older)
  cache.get('a'); // touch 'a'
  cache.set('c', 3); // should evict 'b'
  assert.equal(cache.get('b'), undefined, 'Key b should be evicted');
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('c'), 3);

  // Test TTL
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(cache.get('a'), undefined, 'Entry should expire after TTL');
});

test('BoundedCache: deduplicates in-flight simultaneous requests', async () => {
  const cache = new BoundedCache({ maxEntries: 10, defaultTtlMs: 10000 });
  let invocationCount = 0;

  const slowFetcher = async () => {
    invocationCount++;
    await new Promise((r) => setTimeout(r, 20));
    return 'computed-value';
  };

  const [r1, r2, r3] = await Promise.all([
    cache.dedupe('test-key', slowFetcher),
    cache.dedupe('test-key', slowFetcher),
    cache.dedupe('test-key', slowFetcher),
  ]);

  assert.equal(r1, 'computed-value');
  assert.equal(r2, 'computed-value');
  assert.equal(r3, 'computed-value');
  assert.equal(invocationCount, 1, 'Fetcher must be invoked exactly once');
});

test('BoundedCache: reference-counted per-caller abort behavior', async () => {
  const cache = new BoundedCache({ maxEntries: 10, defaultTtlMs: 10000 });
  let underlyingExecuted = false;
  let underlyingAborted = false;

  const slowFetcher = async (signal) => {
    underlyingExecuted = true;
    signal.addEventListener('abort', () => {
      underlyingAborted = true;
    });

    await new Promise((r) => setTimeout(r, 50));
    return 'result-data';
  };

  const c1 = new AbortController();
  const c2 = new AbortController();

  // Two callers request the same key with distinct abort controllers
  const p1 = cache.dedupe('shared-key', slowFetcher, c1.signal);
  const p2 = cache.dedupe('shared-key', slowFetcher, c2.signal);

  // Caller 1 aborts early
  c1.abort();

  // Caller 1 promise must reject with ABORTED
  await assert.rejects(
    p1,
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.code, 'ABORTED');
      return true;
    },
    'Caller 1 must reject with ABORTED'
  );

  // The underlying request must NOT have been aborted because Caller 2 is still waiting
  assert.equal(underlyingAborted, false, 'Underlying request must not abort while Caller 2 is active');

  // Caller 2 must successfully receive the result
  const res2 = await p2;
  assert.equal(res2, 'result-data', 'Surviving caller 2 must receive the resolved data');
  assert.equal(underlyingExecuted, true);
});

test('BoundedCache: cancels underlying request only when ALL callers abort', async () => {
  const cache = new BoundedCache({ maxEntries: 10, defaultTtlMs: 10000 });
  let underlyingAborted = false;

  const slowFetcher = async (signal) => {
    signal.addEventListener('abort', () => {
      underlyingAborted = true;
    });

    await new Promise((r) => setTimeout(r, 100));
    return 'will-not-resolve';
  };

  const c1 = new AbortController();
  const c2 = new AbortController();

  const p1 = cache.dedupe('all-abort-key', slowFetcher, c1.signal);
  const p2 = cache.dedupe('all-abort-key', slowFetcher, c2.signal);

  // Both callers abort
  c1.abort();
  c2.abort();

  await assert.rejects(p1, (err) => err.code === 'ABORTED');
  await assert.rejects(p2, (err) => err.code === 'ABORTED');

  // Now that all active callers aborted, the underlying controller must have fired
  assert.equal(underlyingAborted, true, 'Underlying request must abort when all callers abort');
});

// ==============================================================================
// 5. Input Validation & Security Against Path Traversal
// ==============================================================================

test('IconifyProvider: rejects invalid or path-traversal inputs', async () => {
  const provider = new IconifyProvider();

  // Invalid collection prefixes
  await assert.rejects(
    async () => {
      await provider.getCollection('../escape');
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.code, 'INVALID_INPUT');
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await provider.getCollection('prefix/with/slash');
    },
    (err) => err.code === 'INVALID_INPUT'
  );

  // Invalid icon names
  await assert.rejects(
    async () => {
      await provider.getIconSvg('lucide', '../icon');
    },
    (err) => err.code === 'INVALID_INPUT'
  );

  await assert.rejects(
    async () => {
      await provider.getIconSvg('lucide', 'icon/with/slash');
    },
    (err) => err.code === 'INVALID_INPUT'
  );
});

test('IconifyProvider: handles typed HTTP errors and cancellation', async () => {
  const provider = new IconifyProvider();

  // Test 404 NotFoundError on non-existent collection
  await assert.rejects(
    async () => {
      await provider.getCollection('nonexistent-prefix-99999');
    },
    (err) => {
      if (
        err.code === 'RATE_LIMITED' ||
        err.status === 429 ||
        err.code === 'NETWORK_ERROR' ||
        err instanceof NetworkError
      ) {
        return true;
      }
      assert.ok(err instanceof NotFoundError, 'Must be instance of NotFoundError');
      assert.equal(err.status, 404);
      assert.equal(err.code, 'NOT_FOUND');
      return true;
    }
  );

  // Test AbortSignal cancellation
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    async () => {
      await provider.getCollection('lucide', controller.signal);
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.code, 'ABORTED');
      return true;
    }
  );
});

// ==============================================================================
// 6. Live Iconify API Smoke Tests
// ==============================================================================

test('IconifyProvider: live smoke test against api.iconify.design', async (t) => {
  const provider = new IconifyProvider();

  // 1. Smoke test collection listing
  let collections;
  try {
    collections = await provider.getCollections();
  } catch (err) {
    if (err.code === 'RATE_LIMITED' || err.code === 'NETWORK_ERROR') {
      t.skip(`Skipped live smoke test due to provider rate limit/offline: ${err.message}`);
      return;
    }
    throw err;
  }
  assert.ok(collections.size > 100, 'Must load collections catalog');
  const lucideSummary = collections.get('lucide');
  assert.ok(lucideSummary, 'Lucide summary must exist in catalog');
  assert.equal(lucideSummary.name, 'Lucide');
  assert.ok(lucideSummary.total >= 1900);

  // 2. Smoke test collection details
  try {
    const lucideDetail = await provider.getCollection('lucide');
    assert.equal(lucideDetail.prefix, 'lucide');
    assert.ok(lucideDetail.total >= 1900);
    assert.ok(lucideDetail.categories || lucideDetail.uncategorized);
  } catch (err) {
    if (err.code === 'RATE_LIMITED') {
      t.skip('Skipping remainder of live smoke test due to Cloudflare rate limit on /collection');
      return;
    }
    throw err;
  }

  // 3. Smoke test batch icon data & alias resolution ('home' -> 'house')
  const iconsData = await provider.getIconsData('lucide', ['home', 'arrow-right']);
  assert.equal(iconsData.size, 2);

  const homeIcon = iconsData.get('home');
  assert.ok(homeIcon);
  assert.equal(homeIcon.prefix, 'lucide');
  assert.equal(homeIcon.name, 'home');
  assert.equal(homeIcon.isAlias, true, 'Home is an alias in Lucide');
  assert.equal(homeIcon.parentName, 'house');
  assert.ok(homeIcon.body.includes('<g') || homeIcon.body.includes('<path'));

  const arrowIcon = iconsData.get('arrow-right');
  assert.ok(arrowIcon);
  assert.equal(arrowIcon.name, 'arrow-right');
  assert.ok(arrowIcon.body.length > 10);

  // 4. Smoke test search endpoint with client-side limit guarantee
  const searchResult = await provider.searchIcons({
    query: 'arrow-right',
    limit: 5,
    prefixes: ['lucide', 'tabler'],
  });
  assert.ok(searchResult.total > 0);
  assert.ok(searchResult.icons.length <= 5);
  assert.ok(searchResult.icons.some((i) => i.startsWith('lucide:') || i.startsWith('tabler:')));

  // 5. Smoke test raw SVG endpoint with full document sanitization
  const svg = await provider.getIconSvg('lucide', 'arrow-right');
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('viewBox="0 0 24 24"'));
});
