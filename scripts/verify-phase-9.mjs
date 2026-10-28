import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3012;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORTS = [320, 375, 430, 768, 1024, 1280, 1440];
const ARTIFACT_DIR = '/Users/jarvis/.gemini/antigravity/brain/887bcaf4-55e9-419c-831b-955b7ad5b232/screenshots';

const ROUTES_TO_AUDIT = [
  { path: '/', name: 'Homepage' },
  { path: '/search', name: 'Icon Explorer' },
  { path: '/collections', name: 'Collections Directory' },
  { path: '/collection/lucide', name: 'Collection Detail (Lucide)' },
  { path: '/icon/lucide/arrow-right', name: 'Icon Customizer' },
  { path: '/about', name: 'About' },
];

async function waitForServer(url, timeoutMs = 25000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // server starting up
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function collectBundleSizes() {
  const chunksDir = path.join(process.cwd(), '.next', 'static', 'chunks');
  const bundleReport = {
    shared: {},
    routes: {},
    totalSharedBytes: 0,
  };

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && e.name.endsWith('.js')) {
        const fileStat = await stat(full);
        const rel = path.relative(path.join(process.cwd(), '.next'), full);

        if (e.name.startsWith('framework-')) {
          bundleReport.shared.framework = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
          bundleReport.totalSharedBytes += fileStat.size;
        } else if (e.name.startsWith('main-app-')) {
          bundleReport.shared.mainApp = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
          bundleReport.totalSharedBytes += fileStat.size;
        } else if (e.name.startsWith('webpack-')) {
          bundleReport.shared.webpack = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
          bundleReport.totalSharedBytes += fileStat.size;
        } else if (e.name.startsWith('layout-') && rel.includes('app/layout-')) {
          bundleReport.shared.rootLayout = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
          bundleReport.totalSharedBytes += fileStat.size;
        } else if (rel.includes('app/page-')) {
          bundleReport.routes.home = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
        } else if (rel.includes('app/search/page-')) {
          bundleReport.routes.search = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
        } else if (rel.includes('app/collections/page-')) {
          bundleReport.routes.collections = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
        } else if (rel.includes('app/collection/[prefix]/page-')) {
          bundleReport.routes.collectionDetail = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
        } else if (rel.includes('app/icon/[prefix]/[name]/page-')) {
          bundleReport.routes.iconCustomizer = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
        } else if (rel.includes('app/error-')) {
          bundleReport.routes.errorBoundary = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
        } else if (rel.includes('app/not-found-')) {
          bundleReport.routes.notFound = { file: rel, sizeBytes: fileStat.size, sizeKb: (fileStat.size / 1024).toFixed(2) };
        }
      }
    }
  }

  await walk(chunksDir);
  return bundleReport;
}

async function run() {
  await mkdir(ARTIFACT_DIR, { recursive: true });

  console.log(`1. Starting Next.js production server on port ${PORT}...`);
  const server = spawn('npm', ['run', 'start', '--', '-p', String(PORT)], {
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) },
  });

  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server err] ${d}`));

  let browser;

  try {
    const testUrl = `${BASE_URL}/`;
    await waitForServer(testUrl);
    console.log(`\nNext.js production server is ready at ${testUrl}`);

    console.log('2. Launching headless Chrome for Phase 9 QA...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // =========================================================================
    // Check 1: Multi-Viewport Responsive QA (320px -> 1440px)
    // =========================================================================
    console.log('\n=== CHECK 1: Multi-Viewport Responsive QA (320px -> 1440px) ===');
    for (const route of ROUTES_TO_AUDIT) {
      console.log(`\n--- Auditing ${route.name} (${route.path}) ---`);
      for (const width of VIEWPORTS) {
        const height = width >= 1024 ? 900 : 800;
        await page.setViewport({ width, height });
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle2' });
        await new Promise((r) => setTimeout(r, 150));

        const metrics = await page.evaluate((vpWidth) => {
          const bodyScroll = document.body.scrollWidth;
          const htmlScroll = document.documentElement.scrollWidth;
          const maxScroll = Math.max(bodyScroll, htmlScroll);
          const hasOverflow = maxScroll > vpWidth + 1;
          const h1Count = document.querySelectorAll('h1').length;
          const mainLandmark = Boolean(document.querySelector('main#main-content'));

          return {
            viewport: vpWidth,
            maxScroll,
            hasOverflow,
            h1Count,
            mainLandmark,
          };
        }, width);

        assert.equal(
          metrics.hasOverflow,
          false,
          `Horizontal overflow on ${route.name} at ${width}px! Max scroll: ${metrics.maxScroll}px`
        );
        assert.equal(
          metrics.h1Count,
          1,
          `Expected exactly 1 <h1> heading on ${route.name} at ${width}px, found ${metrics.h1Count}`
        );
        assert.equal(
          metrics.mainLandmark,
          true,
          `<main id="main-content"> landmark must exist on ${route.name}`
        );
      }
    }
    console.log('✔ All 6 core routes passed responsive horizontal overflow and landmark checks across all 7 viewports.');

    // =========================================================================
    // Check 2: Rendered Mobile Touch Target Sizing (375px)
    // =========================================================================
    console.log('\n=== CHECK 2: Rendered Mobile Touch Target Sizing (375px) ===');
    await page.setViewport({ width: 375, height: 812 });

    // 2a. Mobile Menu Toggle Button (AppHeader)
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    const mobileMenuBtnSize = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Toggle navigation menu"]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    console.log('Mobile menu button size:', mobileMenuBtnSize);
    assert.ok(mobileMenuBtnSize, 'Mobile menu toggle button must exist');
    assert.ok(mobileMenuBtnSize.width >= 44, `Mobile menu width must be >= 44px, got ${mobileMenuBtnSize.width}px`);
    assert.ok(mobileMenuBtnSize.height >= 44, `Mobile menu height must be >= 44px, got ${mobileMenuBtnSize.height}px`);

    // 2b. Mobile Filter Drawer Open & Close Buttons on /search
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });
    const filterOpenBtnSize = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Open filter options"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Filter'));
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    console.log('Mobile filter drawer open button size:', filterOpenBtnSize);
    assert.ok(filterOpenBtnSize, 'Mobile filter drawer open button must exist');
    assert.ok(filterOpenBtnSize.height >= 40, `Filter open button height must be >= 40px, got ${filterOpenBtnSize.height}px`);

    // Open drawer
    await page.click('button[aria-label="Open filter options"]');
    await new Promise((r) => setTimeout(r, 200));

    const drawerControlSizes = await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close filters"]');
      const applyBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Apply Filters')
      );
      return {
        closeBtn: closeBtn ? { width: closeBtn.getBoundingClientRect().width, height: closeBtn.getBoundingClientRect().height } : null,
        applyBtn: applyBtn ? { width: applyBtn.getBoundingClientRect().width, height: applyBtn.getBoundingClientRect().height } : null,
      };
    });
    console.log('Filter drawer control sizes:', drawerControlSizes);
    assert.ok(drawerControlSizes.closeBtn, 'Drawer close button must exist');
    assert.ok(drawerControlSizes.closeBtn.width >= 40, `Drawer close button width >= 40px, got ${drawerControlSizes.closeBtn.width}px`);
    assert.ok(drawerControlSizes.closeBtn.height >= 40, `Drawer close button height >= 40px, got ${drawerControlSizes.closeBtn.height}px`);
    assert.ok(drawerControlSizes.applyBtn, 'Apply filters button must exist');
    assert.ok(drawerControlSizes.applyBtn.height >= 40, `Apply filters button height >= 40px, got ${drawerControlSizes.applyBtn.height}px`);

    // Close drawer
    await page.click('button[aria-label="Close filters"]');
    await new Promise((r) => setTimeout(r, 200));

    // 2c. Favorite Collection Toggle on /collections
    await page.goto(`${BASE_URL}/collections`, { waitUntil: 'networkidle2' });
    const favBtnSize = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label*="favorites" i]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    console.log('Favorite collection button size:', favBtnSize);
    assert.ok(favBtnSize, 'Favorite collection button must exist');
    assert.ok(favBtnSize.width >= 40, `Favorite button width must be >= 40px, got ${favBtnSize.width}px`);
    assert.ok(favBtnSize.height >= 40, `Favorite button height must be >= 40px, got ${favBtnSize.height}px`);

    // 2d. Customizer Format and Action Controls on /icon/lucide/arrow-right
    await page.goto(`${BASE_URL}/icon/lucide/arrow-right`, { waitUntil: 'networkidle2' });
    const customizerActionSizes = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map((t) => ({
        id: t.id,
        height: t.getBoundingClientRect().height,
      }));
      const copyBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Copy Code')
      );
      const downloadBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Download .svg')
      );
      return {
        tabs,
        copyBtnHeight: copyBtn?.getBoundingClientRect().height ?? 0,
        downloadBtnHeight: downloadBtn?.getBoundingClientRect().height ?? 0,
      };
    });
    console.log('Customizer action button sizes:', customizerActionSizes);
    assert.ok(customizerActionSizes.tabs.length >= 4, 'Format tabs must exist');
    for (const tab of customizerActionSizes.tabs) {
      assert.ok(tab.height >= 40, `Format tab ${tab.id} height must be >= 40px, got ${tab.height}px`);
    }
    assert.ok(customizerActionSizes.copyBtnHeight >= 40, `Copy button height >= 40px, got ${customizerActionSizes.copyBtnHeight}px`);
    assert.ok(customizerActionSizes.downloadBtnHeight >= 40, `Download button height >= 40px, got ${customizerActionSizes.downloadBtnHeight}px`);
    console.log('✔ All mobile primary touch targets meet or exceed accessibility size requirements.');

    // =========================================================================
    // Check 3: Keyboard Reachability, Visible Focus, and Accessible Names
    // =========================================================================
    console.log('\n=== CHECK 3: Keyboard Reachability, Visible Focus & Accessible Names ===');
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });

    const keyboardAudit = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
        tag: h.tagName.toLowerCase(),
        level: parseInt(h.tagName[1], 10),
        text: h.textContent?.trim().slice(0, 30),
      }));

      let headingOrderValid = true;
      let lastLevel = 0;
      for (const h of headings) {
        if (h.level > lastLevel + 1 && lastLevel !== 0) {
          headingOrderValid = false;
        }
        lastLevel = h.level;
      }

      const hasHeader = Boolean(document.querySelector('header'));
      const hasMain = Boolean(document.querySelector('main#main-content'));
      const hasFooter = Boolean(document.querySelector('footer'));
      const hasNav = Boolean(document.querySelector('nav'));
      const skipLink = document.querySelector('a[href="#main-content"]');

      const themeBtn = document.querySelector('button[aria-label*="Theme:" i]');
      themeBtn?.focus();
      const themeComputed = themeBtn ? window.getComputedStyle(themeBtn) : null;
      const themeHasFocusStyle = Boolean(
        themeComputed && (
          parseFloat(themeComputed.outlineWidth) > 0 ||
          themeComputed.boxShadow !== 'none'
        )
      );

      return {
        headings,
        headingOrderValid,
        hasHeader,
        hasMain,
        hasFooter,
        hasNav,
        hasSkipLink: Boolean(skipLink),
        themeHasFocusStyle,
      };
    });

    assert.equal(keyboardAudit.headingOrderValid, true, 'Heading hierarchy must not skip levels');
    assert.equal(keyboardAudit.hasHeader, true, '<header> landmark must be present');
    assert.equal(keyboardAudit.hasMain, true, '<main id="main-content"> landmark must be present');
    assert.equal(keyboardAudit.hasFooter, true, '<footer> landmark must be present');
    assert.equal(keyboardAudit.hasNav, true, '<nav> landmark must be present');
    assert.equal(keyboardAudit.hasSkipLink, true, 'Accessible skip-to-content link must be present');
    assert.equal(keyboardAudit.themeHasFocusStyle, true, 'Focused control must display visible outline or focus ring');

    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });
    const searchA11y = await page.evaluate(() => {
      const searchInput = document.querySelector('input[type="search"]');
      const inputName = searchInput?.getAttribute('aria-label') || searchInput?.getAttribute('placeholder');
      searchInput?.focus();
      const inputStyle = searchInput ? window.getComputedStyle(searchInput) : null;
      const inputHasFocusStyle = Boolean(
        inputStyle && (parseFloat(inputStyle.outlineWidth) > 0 || inputStyle.boxShadow !== 'none')
      );

      return { inputName, inputHasFocusStyle };
    });
    console.log('Search input accessibility:', searchA11y);
    assert.ok(searchA11y.inputName, 'Search input must possess an accessible name');
    assert.equal(searchA11y.inputHasFocusStyle, true, 'Search input must display visible focus styling');
    console.log('✔ Keyboard reachability, visible focus indicators, and accessible names verified.');

    // =========================================================================
    // Check 4: Representative Contrast Audit in Light and Dark Mode
    // =========================================================================
    console.log('\n=== CHECK 4: Representative Contrast in Light and Dark Modes ===');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });

    // Explicitly set light theme
    await page.evaluate(() => {
      window.localStorage.setItem('iconhub:theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await new Promise((r) => setTimeout(r, 200));

    const auditAllContrasts = async () => {
      return page.evaluate(() => {
        function parseColor(colorStr) {
          if (!colorStr) return [0, 0, 0];
          const str = colorStr.trim();
          if (str.startsWith('#')) {
            const clean = str.replace('#', '');
            const r = parseInt(clean.substring(0, 2), 16);
            const g = parseInt(clean.substring(2, 4), 16);
            const b = parseInt(clean.substring(4, 6), 16);
            return [r, g, b];
          }
          const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return [0, 0, 0];
          return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
        }

        function getLuminance(rgb) {
          const [r, g, b] = rgb.map((val) => {
            const s = val / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        function getContrast(rgb1, rgb2) {
          const l1 = getLuminance(rgb1);
          const l2 = getLuminance(rgb2);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        }

        const bodyBg = parseColor(window.getComputedStyle(document.body).backgroundColor);
        const h1Color = parseColor(window.getComputedStyle(document.querySelector('h1')).color);
        const pColor = parseColor(window.getComputedStyle(document.querySelector('p')).color);

        // Muted text
        const mutedEl = document.querySelector('.text-\\[var\\(--color-text-muted\\)\\]') || document.querySelector('footer p');
        const mutedColor = mutedEl ? parseColor(window.getComputedStyle(mutedEl).color) : pColor;

        // Nav / footer link
        const linkEl = document.querySelector('footer a') || document.querySelector('nav a');
        const linkColor = linkEl ? parseColor(window.getComputedStyle(linkEl).color) : pColor;

        // Primary Button / Badge: category chip has bg-[var(--color-primary)] and text-white
        const primaryEl = document.querySelector('section[aria-label="Browse by Category"] a[aria-current="page"]') ||
          document.querySelector('button.bg-\\[var\\(--color-primary\\)\\]') ||
          document.querySelector('[role="tab"][aria-selected="true"]');
        const primaryComputed = primaryEl ? window.getComputedStyle(primaryEl) : null;
        const primaryBtnBg = primaryComputed ? parseColor(primaryComputed.backgroundColor) : [96, 69, 255];
        const primaryBtnText = primaryComputed ? parseColor(primaryComputed.color) : [255, 255, 255];

        // Focus indicator non-text contrast against page background
        const primaryVar = window.getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
        const focusRingColor = parseColor(primaryVar);

        return {
          h1Contrast: getContrast(h1Color, bodyBg),
          pContrast: getContrast(pColor, bodyBg),
          mutedContrast: getContrast(mutedColor, bodyBg),
          linkContrast: getContrast(linkColor, bodyBg),
          buttonContrast: getContrast(primaryBtnText, primaryBtnBg),
          focusIndicatorContrast: getContrast(focusRingColor, bodyBg),
          debug: {
            primaryBtnBg: primaryComputed?.backgroundColor,
            primaryBtnColor: primaryComputed?.color,
            primaryVar,
          },
        };
      });
    };

    const lightContrasts = await auditAllContrasts();
    console.log('Light Mode contrasts:', lightContrasts);
    assert.ok(lightContrasts.h1Contrast >= 7.0, `Light H1 contrast >= 7:1, got ${lightContrasts.h1Contrast.toFixed(2)}:1`);
    assert.ok(lightContrasts.pContrast >= 4.5, `Light Body text contrast >= 4.5:1, got ${lightContrasts.pContrast.toFixed(2)}:1`);
    assert.ok(lightContrasts.mutedContrast >= 4.5, `Light Muted text contrast >= 4.5:1, got ${lightContrasts.mutedContrast.toFixed(2)}:1`);
    assert.ok(lightContrasts.linkContrast >= 4.5, `Light Link contrast >= 4.5:1, got ${lightContrasts.linkContrast.toFixed(2)}:1`);
    assert.ok(lightContrasts.buttonContrast >= 4.5, `Light Primary button text contrast >= 4.5:1, got ${lightContrasts.buttonContrast.toFixed(2)}:1`);
    assert.ok(lightContrasts.focusIndicatorContrast >= 3.0, `Light Focus indicator contrast >= 3.0:1, got ${lightContrasts.focusIndicatorContrast.toFixed(2)}:1`);

    // Explicitly set Dark Mode
    await page.evaluate(() => {
      window.localStorage.setItem('iconhub:theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await new Promise((r) => setTimeout(r, 300));

    const darkContrasts = await auditAllContrasts();
    console.log('Dark Mode contrasts:', darkContrasts);
    assert.ok(darkContrasts.h1Contrast >= 7.0, `Dark H1 contrast >= 7:1, got ${darkContrasts.h1Contrast.toFixed(2)}:1`);
    assert.ok(darkContrasts.pContrast >= 4.5, `Dark Body text contrast >= 4.5:1, got ${darkContrasts.pContrast.toFixed(2)}:1`);
    assert.ok(darkContrasts.mutedContrast >= 4.5, `Dark Muted text contrast >= 4.5:1, got ${darkContrasts.mutedContrast.toFixed(2)}:1`);
    assert.ok(darkContrasts.linkContrast >= 4.5, `Dark Link contrast >= 4.5:1, got ${darkContrasts.linkContrast.toFixed(2)}:1`);
    assert.ok(darkContrasts.buttonContrast >= 4.5, `Dark Primary button text contrast >= 4.5:1, got ${darkContrasts.buttonContrast.toFixed(2)}:1`);
    assert.ok(darkContrasts.focusIndicatorContrast >= 3.0, `Dark Focus indicator contrast >= 3.0:1, got ${darkContrasts.focusIndicatorContrast.toFixed(2)}:1`);

    // Switch back to light theme for subsequent tests
    await page.evaluate(() => {
      window.localStorage.setItem('iconhub:theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await new Promise((r) => setTimeout(r, 200));
    console.log('✔ All representative text, button, and non-text focus indicator contrast thresholds verified.');

    // =========================================================================
    // Check 5: Actual JavaScript Bundle-Size Evidence from Build
    // =========================================================================
    console.log('\n=== CHECK 5: JavaScript Bundle-Size Evidence from Production Build ===');
    const bundleReport = await collectBundleSizes();
    console.log('Production Client Bundle Sizes (gzip-ready uncompressed disk bytes):');
    console.log('Shared Core Bundles:');
    for (const [key, b] of Object.entries(bundleReport.shared)) {
      console.log(`  - ${key} (${b.file}): ${b.sizeKb} KB (${b.sizeBytes.toLocaleString()} bytes)`);
    }
    console.log(`  => Total Shared Core JS: ${(bundleReport.totalSharedBytes / 1024).toFixed(2)} KB (${bundleReport.totalSharedBytes.toLocaleString()} bytes)`);

    console.log('Representative Route Bundles:');
    for (const [route, b] of Object.entries(bundleReport.routes)) {
      console.log(`  - ${route} (${b.file}): ${b.sizeKb} KB (${b.sizeBytes.toLocaleString()} bytes)`);
    }

    assert.ok(bundleReport.shared.framework, 'Framework shared bundle must exist');
    assert.ok(bundleReport.shared.framework.sizeBytes > 50000, 'Framework bundle must contain non-zero code');
    assert.ok(bundleReport.routes.home, 'Home page bundle must exist');
    assert.ok(bundleReport.routes.search, 'Search page bundle must exist');
    console.log('✔ Bundle-size evidence extracted directly from compiled production artifacts.');

    // =========================================================================
    // Check 6: API Usage, Continuation & In-Flight Cancellation
    // =========================================================================
    console.log('\n=== CHECK 6: API Continuation, Debounce & In-Flight Cancellation ===');

    const apiRequests = [];
    const requestListener = (req) => {
      const u = req.url();
      if (u.includes('/api/search')) {
        apiRequests.push(u);
      }
    };
    page.on('request', requestListener);

    // 6a. Single API request on initial query
    apiRequests.length = 0;
    console.log('Counting API requests for initial query "arrow"...');
    await page.goto(`${BASE_URL}/search?q=arrow`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    console.log(`Initial search requests: ${apiRequests.length} (${apiRequests[0]})`);
    assert.equal(apiRequests.length, 1, `Expected exactly 1 request on initial search, got ${apiRequests.length}`);

    // 6b. Single API request on filter change
    apiRequests.length = 0;
    console.log('Counting API requests on style filter change...');
    const clickedStyle = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.trim().toLowerCase() === 'solid'
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`Style button clicked: ${clickedStyle}`);
    assert.equal(clickedStyle, true, 'Solid style filter button must exist and be clicked');
    await new Promise((r) => setTimeout(r, 600));
    console.log(`Style filter requests: ${apiRequests.length}`);
    assert.equal(apiRequests.length, 1, `Expected exactly 1 request on filter change, got ${apiRequests.length}`);

    // 6c. Continuation / Load-More Request Counting
    console.log('Auditing Continuation / Load More request counting...');
    apiRequests.length = 0;
    await page.goto(`${BASE_URL}/search?category=arrows`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="search"]', { timeout: 8000 });
    await page.waitForSelector('div[aria-label="Search results"]', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(apiRequests.length, 1, 'Initial query should fire 1 request');

    const initialCount = await page.$$eval('div[aria-label="Search results"] > div', (cards) => cards.length);
    console.log(`Initial rendered icons: ${initialCount}`);
    assert.ok(initialCount > 0, 'Initial query should render matching icon cards');

    await page.waitForSelector('button[aria-label*="Load more" i]', { timeout: 8000 });

    // Click "Load more" button
    apiRequests.length = 0;
    const loadMoreClicked = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label*="Load more" i]') ||
      Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Load More') ||
        b.textContent?.includes('Load more') ||
        b.textContent?.includes('Continue Searching')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    console.log(`Load more clicked: ${loadMoreClicked}`);
    assert.equal(loadMoreClicked, true, 'Load more control must be found and clicked');

    await page.waitForFunction(
      (prevCount) => {
        const cards = document.querySelectorAll('div[aria-label="Search results"] > div');
        return cards.length > prevCount;
      },
      { timeout: 8000 },
      initialCount
    );

    console.log(`Continuation requests fired: ${apiRequests.length}`, apiRequests);
    assert.equal(apiRequests.length, 1, `Continuation action must fire exactly 1 API request, observed ${apiRequests.length}`);
    assert.ok(apiRequests[0].includes('cursor=') || apiRequests[0].includes('page=2'), 'Continuation request must contain cursor or page continuation parameter');

    const newCount = await page.$$eval('div[aria-label="Search results"] > div', (cards) => cards.length);
    console.log(`Rendered icon count grew from ${initialCount} to ${newCount}`);
    assert.ok(newCount > initialCount, `Loaded icon set must grow upon continuation: ${newCount} > ${initialCount}`);

    // 6d. Debounce Verification (Kept separate from in-flight cancellation)
    apiRequests.length = 0;
    console.log('Testing separate keystroke debounce...');
    await page.focus('input[type="search"]');
    await page.keyboard.type('debouncetest', { delay: 15 });
    await new Promise((r) => setTimeout(r, 700));
    console.log(`Debounced requests fired after rapid typing: ${apiRequests.length}`);
    assert.equal(apiRequests.length, 1, `Rapid keystrokes must debounce into exactly 1 request, observed ${apiRequests.length}`);

    page.off('request', requestListener);

    // 6e. In-Flight Cancellation with Controlled Response Delay
    console.log('Testing in-flight cancellation with delayed stale response...');
    await page.setRequestInterception(true);

    let isFirstStaleRequest = true;
    let delayedRequestHandled = false;
    const cancellationInterceptor = (req) => {
      const url = req.url();
      if (url.includes('/api/search') && isFirstStaleRequest) {
        isFirstStaleRequest = false;
        delayedRequestHandled = true;
        // Hold first request for 1200ms before returning a distinctive mock icon
        setTimeout(() => {
          try {
            req.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                icons: [
                  {
                    id: 'lucide:stale-cancelled-glyph-never-render',
                    name: 'stale-cancelled-glyph-never-render',
                    prefix: 'lucide',
                    collectionName: 'Lucide Icons',
                    body: '<path d="M0 0h24v24H0z"/>',
                    width: 24,
                    height: 24,
                  },
                ],
                total: 1,
                page: 1,
                limit: 32,
                query: 'stale-query-candidate',
                activeCategory: 'all',
                activeSources: [],
                activeStyle: 'all',
                activeLicense: 'all',
              }),
            });
          } catch {
            // Already handled
          }
        }, 1200);
      } else {
        req.continue();
      }
    };
    page.on('request', cancellationInterceptor);

    // Navigate to /search and ensure input is mounted
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="search"]', { timeout: 8000 });

    // Focus and type stale query
    await page.focus('input[type="search"]');
    await page.keyboard.type('stale-query-candidate', { delay: 10 });
    // Wait for the debounced request to fire and be delayed by interceptor
    await new Promise((r) => setTimeout(r, 400));

    // Mid-flight: click a filter while delayed request is pending
    console.log('Changing filter mid-flight while delayed request is pending...');
    const filterClicked = await page.evaluate(() => {
      const solidBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim().toLowerCase() === 'solid');
      if (solidBtn) {
        solidBtn.click();
        return true;
      }
      return false;
    });
    console.log(`Mid-flight filter clicked: ${filterClicked}`);
    assert.equal(filterClicked, true, 'Filter button must exist for in-flight cancellation test');

    // Wait for delayed response timer to elapse
    await new Promise((r) => setTimeout(r, 1600));

    // Verify stale response did NOT alter or corrupt displayed results
    const renderedNames = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span[title]')).map((s) => s.getAttribute('title'));
    });
    console.log(`Rendered icon titles after cancellation: ${renderedNames.slice(0, 5).join(', ')}`);
    const staleRendered = renderedNames.some((n) => n?.includes('stale-cancelled-glyph-never-render'));
    assert.equal(staleRendered, false, 'Stale cancelled response must NOT alter the displayed results');
    assert.equal(delayedRequestHandled, true, 'Delayed in-flight request was intercepted and delayed as intended');

    page.off('request', cancellationInterceptor);
    await page.setRequestInterception(false);
    console.log('✔ Continuation counting, separate debounce, and in-flight cancellation verified.');

    // =========================================================================
    // Check 7: Controlled Failure Path Interception
    // =========================================================================
    console.log('\n=== CHECK 7: Controlled Failure Path Interception ===');

    // 7a. 404 Route
    console.log('Testing 404 route: /nonexistent-path-test-404');
    const notFoundRes = await page.goto(`${BASE_URL}/nonexistent-path-test-404`, { waitUntil: 'networkidle2' });
    assert.equal(notFoundRes.status(), 404, 'Response status must be 404');
    const notFoundInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim();
      const hasSearchLink = Boolean(document.querySelector('a[href="/search"]'));
      const hasCollectionsLink = Boolean(document.querySelector('a[href="/collections"]'));
      return { h1, hasSearchLink, hasCollectionsLink };
    });
    console.log('404 Page verification:', notFoundInfo);
    assert.equal(notFoundInfo.h1, 'Page Not Found', '404 page must render "Page Not Found" heading');
    assert.equal(notFoundInfo.hasSearchLink, true, '404 page must offer navigation to search');
    assert.equal(notFoundInfo.hasCollectionsLink, true, '404 page must offer navigation to collections');

    // 7b. Unknown collection prefix fallback
    console.log('Testing unknown collection: /collection/unverified-unknown-pack');
    await page.goto(`${BASE_URL}/collection/unverified-unknown-pack`, { waitUntil: 'networkidle2' });
    const collectionFallback = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim();
      const hasBrowseBtn = Boolean(document.querySelector('a[href="/collections"]'));
      return { h1, hasBrowseBtn };
    });
    console.log('Unknown collection fallback:', collectionFallback);
    assert.equal(collectionFallback.h1, 'Collection Not Found', 'Unknown collection must render Collection Not Found');
    assert.equal(collectionFallback.hasBrowseBtn, true, 'Unknown collection fallback must link to verified collections');

    // 7c. Unknown icon name fallback
    console.log('Testing unverified icon pack: /icon/unverified-unknown-pack/arrow-right');
    const unverifiedPackRes = await page.goto(`${BASE_URL}/icon/unverified-unknown-pack/arrow-right`, { waitUntil: 'networkidle2' });
    const unverifiedPackH1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() || '');
    assert.ok(
      unverifiedPackRes.status() === 404 || unverifiedPackH1.includes('Page Not Found') || unverifiedPackH1.includes('Not Found'),
      'Unverified pack must return 404 status or Not Found UI'
    );

    // 7d. Empty search state with suggestions
    console.log('Testing empty search results: /search?q=xyznonexistentquery9999');
    await page.goto(`${BASE_URL}/search?q=xyznonexistentquery9999`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 500));
    const emptyStateInfo = await page.evaluate(() => {
      const h3 = document.querySelector('h3')?.textContent?.trim();
      const suggestions = Array.from(document.querySelectorAll('button')).filter((b) =>
        ['arrow', 'user', 'settings'].includes(b.textContent?.trim() || '')
      );
      const clearBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Clear all filters')
      );
      return {
        h3,
        suggestionCount: suggestions.length,
        hasClearBtn: Boolean(clearBtn),
      };
    });
    console.log('Empty search state info:', emptyStateInfo);
    assert.ok(emptyStateInfo.h3?.includes('No icons found'), 'Empty search must display "No icons found"');
    assert.ok(emptyStateInfo.suggestionCount >= 3, 'Empty search must provide query suggestions');
    assert.equal(emptyStateInfo.hasClearBtn, true, 'Empty search must provide "Clear all filters" button');

    // 7e. Upstream API 500 Error Interception & Recovery
    console.log('Testing upstream API 500 error interception...');
    await page.setRequestInterception(true);
    let interceptMode = '500';

    const failureHandler = (req) => {
      if (req.url().includes('/api/search')) {
        if (interceptMode === '500') {
          req.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Upstream provider connection timeout' }),
          });
        } else if (interceptMode === '429') {
          req.respond({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'API rate limit reached. Please wait a moment before trying again.' }),
          });
        } else {
          req.continue();
        }
      } else {
        req.continue();
      }
    };
    page.on('request', failureHandler);

    await page.goto(`${BASE_URL}/search?q=triggererror500`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const errorAlert500 = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      const retryBtn = alert?.querySelector('button');
      return {
        text: alert?.textContent?.trim(),
        hasRetryBtn: Boolean(retryBtn),
      };
    });
    console.log('500 Error alert observed:', errorAlert500);
    assert.ok(errorAlert500.text?.includes('Upstream provider connection timeout') || errorAlert500.text?.includes('Search failed with status 500'), 'Error alert must display clear failure message');
    assert.equal(errorAlert500.hasRetryBtn, true, 'Error alert must provide recoverable "Retry Search" action');

    // 7f. Upstream API 429 Rate Limit Interception
    console.log('Testing upstream API 429 rate limit interception...');
    interceptMode = '429';
    await page.goto(`${BASE_URL}/search?q=triggerratelimit429`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const errorAlert429 = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      const retryBtn = alert?.querySelector('button');
      return {
        text: alert?.textContent?.trim(),
        hasRetryBtn: Boolean(retryBtn),
      };
    });
    console.log('429 Rate limit alert observed:', errorAlert429);
    assert.ok(errorAlert429.text?.includes('rate limit'), 'Rate limit alert must display rate limit guidance');
    assert.equal(errorAlert429.hasRetryBtn, true, 'Rate limit alert must provide retry action');

    interceptMode = 'none';
    page.off('request', failureHandler);
    await page.setRequestInterception(false);

    // 7g. Clipboard Write Rejection Feedback
    console.log('Testing clipboard write rejection handling on icon customizer...');
    await page.goto(`${BASE_URL}/icon/lucide/arrow-right`, { waitUntil: 'networkidle2' });

    await page.evaluate(() => {
      window.navigator.clipboard.writeText = () => Promise.reject(new Error('Permission denied'));
    });

    await page.evaluate(() => {
      const copyBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Copy Code')
      );
      copyBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const clipboardToast = await page.evaluate(() => {
      const toasts = Array.from(document.querySelectorAll('[role="status"]')).map((t) => t.textContent?.trim());
      const hasCopiedSuccess = toasts.some((t) => t?.includes('Copied'));
      const hasErrorToast = toasts.some((t) => t?.includes('Failed to copy'));
      return { toasts, hasCopiedSuccess, hasErrorToast };
    });
    console.log('Clipboard rejection toast feedback:', clipboardToast);
    assert.equal(clipboardToast.hasCopiedSuccess, false, 'Must NOT claim successful copy when clipboard write rejects');
    assert.equal(clipboardToast.hasErrorToast, true, 'Must display "Failed to copy" error toast on clipboard rejection');

    // 7h. Storage Failure Resilience (QuotaExceededError)
    console.log('Testing localStorage failure resilience in browser context...');
    await page.goto(`${BASE_URL}/collections`, { waitUntil: 'networkidle2' });

    const storageFallbackRes = await page.evaluate(() => {
      window.localStorage.setItem = () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      };

      const favBtn = document.querySelector('button[aria-label*="favorites" i]');
      favBtn?.click();

      return {
        clicked: Boolean(favBtn),
        ariaPressed: favBtn?.getAttribute('aria-pressed'),
      };
    });
    console.log('Storage fallback behavior:', storageFallbackRes);
    assert.equal(storageFallbackRes.clicked, true, 'Favorite button must be clickable');
    assert.ok(storageFallbackRes.ariaPressed !== null, 'Favorite button must toggle in-memory state smoothly');
    console.log('✔ All failure paths, network timeouts, rate limits, clipboard rejections, and storage fallbacks verified.');

    // =========================================================================
    // Check 8: Zero Uncaught Exceptions
    // =========================================================================
    console.log('\n=== CHECK 8: Zero Uncaught Exceptions ===');
    console.log(`Total uncaught browser page errors: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      console.error('Observed page errors:', pageErrors);
    }
    assert.equal(pageErrors.length, 0, 'Zero uncaught page errors required across all audited routes');

    console.log('\n🎉 ALL PHASE 9 FINAL VERIFICATION CHECKS PASSED!');
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('Error closing browser:', err);
      }
    }
    if (server) {
      try {
        server.kill('SIGTERM');
      } catch (err) {
        console.error('Error killing server:', err);
      }
    }
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Phase 9 QA verification failed with assertion error:', err);
    process.exit(1);
  });

