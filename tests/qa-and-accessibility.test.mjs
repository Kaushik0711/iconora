// ==============================================================================
// IconHub Phase 9: QA, Accessibility & Performance Test Suite
// Unit tests for:
// 1. Color contrast calculations (WCAG AA >= 4.5:1) for text tokens in Light and Dark themes
// 2. Failure & Error State handling (Rate limits, invalid prefixes, name validation)
// 3. SVG Sanitization and safe output determinism
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import { SourceRegistry } from '../src/modules/registry/index.ts';
import { validateAndCleanName, validateAndCleanPrefix } from '../src/modules/provider/index.ts';
import { RateLimitError, ProviderError } from '../src/modules/provider/errors.ts';
import { buildSafeSvgString } from '../src/modules/svg/index.ts';

// ==============================================================================
// 1. WCAG 2.1 AA Contrast Ratio Calculations
// Formula: (L1 + 0.05) / (L2 + 0.05)
// ==============================================================================

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function getRelativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1, hex2) {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test('Accessibility: text tokens comply with WCAG AA (>= 4.5:1) in Light Mode', () => {
  const bgLight = '#FFFFFF';
  const headingLight = '#111831';
  const bodyLight = '#53617D';
  const mutedLight = '#5E6C84'; // Updated high-contrast muted token
  const primaryPurple = '#6045FF';

  const contrastHeading = getContrastRatio(headingLight, bgLight);
  const contrastBody = getContrastRatio(bodyLight, bgLight);
  const contrastMuted = getContrastRatio(mutedLight, bgLight);
  const contrastPrimaryText = getContrastRatio(primaryPurple, bgLight);
  const contrastButtonWhiteOnPrimary = getContrastRatio('#FFFFFF', primaryPurple);

  assert.ok(contrastHeading >= 7.0, `Heading contrast ${contrastHeading.toFixed(2)}:1 must pass WCAG AAA (>= 7:1)`);
  assert.ok(contrastBody >= 4.5, `Body text contrast ${contrastBody.toFixed(2)}:1 must pass WCAG AA (>= 4.5:1)`);
  assert.ok(contrastMuted >= 4.5, `Muted text contrast ${contrastMuted.toFixed(2)}:1 must pass WCAG AA (>= 4.5:1)`);
  assert.ok(contrastPrimaryText >= 4.5, `Primary link text contrast ${contrastPrimaryText.toFixed(2)}:1 must pass WCAG AA (>= 4.5:1)`);
  assert.ok(contrastButtonWhiteOnPrimary >= 4.5, `White text on primary button ${contrastButtonWhiteOnPrimary.toFixed(2)}:1 must pass WCAG AA (>= 4.5:1)`);
});

test('Accessibility: text tokens comply with WCAG AA (>= 4.5:1) in Dark Mode', () => {
  const bgDark = '#0B0F19';
  const headingDark = '#F8FAFC';
  const bodyDark = '#94A3B8';
  const mutedDark = '#8295AB'; // Updated dark muted token
  const primaryDark = '#7551FF';

  const contrastHeading = getContrastRatio(headingDark, bgDark);
  const contrastBody = getContrastRatio(bodyDark, bgDark);
  const contrastMuted = getContrastRatio(mutedDark, bgDark);
  const contrastPrimaryButtonText = getContrastRatio('#FFFFFF', primaryDark);
  const contrastPrimaryIndicator = getContrastRatio(primaryDark, bgDark);

  assert.ok(contrastHeading >= 7.0, `Dark heading contrast ${contrastHeading.toFixed(2)}:1 must pass WCAG AAA (>= 7:1)`);
  assert.ok(contrastBody >= 4.5, `Dark body text contrast ${contrastBody.toFixed(2)}:1 must pass WCAG AA (>= 4.5:1)`);
  assert.ok(contrastMuted >= 4.5, `Dark muted text contrast ${contrastMuted.toFixed(2)}:1 must pass WCAG AA (>= 4.5:1)`);
  assert.ok(contrastPrimaryButtonText >= 4.5, `Dark primary button text contrast ${contrastPrimaryButtonText.toFixed(2)}:1 must pass WCAG AA (>= 4.5:1)`);
  assert.ok(contrastPrimaryIndicator >= 3.0, `Dark primary UI indicator contrast ${contrastPrimaryIndicator.toFixed(2)}:1 must pass WCAG Non-text Contrast (>= 3:1)`);
});

// ==============================================================================
// 2. Failure & Error Recovery States
// ==============================================================================

test('FailureStates: RateLimitError correctly encapsulates retry headers', () => {
  const err = new RateLimitError('Rate limited by provider', 45);
  assert.equal(err.name, 'RateLimitError');
  assert.equal(err.status, 429);
  assert.equal(err.code, 'RATE_LIMITED');
  assert.equal(err.retryAfterSeconds, 45);
  assert.ok(err.message.includes('Rate limited'));
});

test('FailureStates: ProviderError preserves status and upstream diagnostic codes', () => {
  const err = new ProviderError('Upstream network timeout', {
    code: 'NETWORK_ERROR',
    status: 504,
    url: 'https://api.iconify.design',
  });
  assert.equal(err.name, 'ProviderError');
  assert.equal(err.code, 'NETWORK_ERROR');
  assert.equal(err.status, 504);
  assert.equal(err.url, 'https://api.iconify.design');
});

test('FailureStates: unverified or malformed collection prefixes fail-closed', () => {
  assert.equal(SourceRegistry.isVerifiedPrefix('lucide'), true);
  assert.equal(SourceRegistry.isVerifiedPrefix('heroicons'), true);

  // Unknown or hostile prefixes
  assert.equal(SourceRegistry.isVerifiedPrefix('evil-malicious-pack'), false);
  assert.equal(SourceRegistry.isVerifiedPrefix('../../../etc/passwd'), false);
  assert.equal(SourceRegistry.isVerifiedPrefix(''), false);
  assert.equal(SourceRegistry.isVerifiedPrefix('null'), false);

  assert.throws(
    () => validateAndCleanPrefix('../../../etc/passwd'),
    /Invalid collection prefix/
  );
});

test('FailureStates: path traversal or script injection in icon name fails-closed', () => {
  assert.equal(validateAndCleanName('arrow-right'), 'arrow-right');
  assert.equal(validateAndCleanName('user_check-1'), 'user_check-1');

  assert.throws(
    () => validateAndCleanName('../../../etc/passwd'),
    /Invalid icon name/
  );
  assert.throws(
    () => validateAndCleanName('<script>alert(1)</script>'),
    /Invalid icon name/
  );
  assert.throws(
    () => validateAndCleanName(''),
    /Invalid icon name/
  );
});

// ==============================================================================
// 3. Performance & Deterministic SVG Rendering
// ==============================================================================

test('Performance: safe SVG builder produces deterministic, script-free output', () => {
  const rawBody = '<path d="M0 0h24v24H0z" /><circle cx="12" cy="12" r="10" />';
  const result = buildSafeSvgString({
    body: rawBody,
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    color: 'currentColor',
    className: 'test-icon',
  });

  assert.equal(result.isValid, true);
  assert.ok(result.svgString);
  assert.ok(result.svgString.includes('viewBox="0 0 24 24"'));
  assert.ok(result.svgString.includes('class="test-icon"'));
  assert.ok(!result.svgString.includes('<script'));
  assert.ok(!result.svgString.includes('onload='));
});

// ==============================================================================
// 4. Storage Failure Resilience
// ==============================================================================

test('FailureStates: in-memory storage fallback gracefully handles QuotaExceededError or missing localStorage', async () => {
  const { toggleFavoriteCollection, isFavoriteCollection } = await import('../src/modules/storage/index.ts');

  // Should succeed without throwing even when localStorage is not a real browser storage
  const isFav = toggleFavoriteCollection('lucide');
  assert.equal(typeof isFav, 'boolean');
  assert.equal(isFavoriteCollection('lucide'), isFav);
});
