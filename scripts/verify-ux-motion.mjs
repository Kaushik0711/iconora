import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3011;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORTS = [320, 375, 430, 768, 1024, 1280, 1440];
const ARTIFACT_DIR = '/Users/jarvis/.gemini/antigravity/brain/887bcaf4-55e9-419c-831b-955b7ad5b232/screenshots';

async function waitForServer(url, timeoutMs = 25000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
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

    console.log('2. Launching headless Chrome...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();

    // =========================================================================
    // Check 1: Responsive Layout & Horizontal Overflow across all 7 Viewports
    // =========================================================================
    console.log('\n=== CHECK 1: Viewport Layout & Zero Horizontal Overflow (7 Viewports) ===');
    for (const width of VIEWPORTS) {
      const height = width >= 1024 ? 900 : 800;
      await page.setViewport({ width, height });
      await page.goto(testUrl, { waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 300));

      const metrics = await page.evaluate((vpWidth) => {
        const bodyScroll = document.body.scrollWidth;
        const htmlScroll = document.documentElement.scrollWidth;
        const maxScroll = Math.max(bodyScroll, htmlScroll);
        const hasOverflow = maxScroll > vpWidth + 1;
        const heading = document.querySelector('h1')?.textContent?.trim() || '';
        const hasThemeBtn = Boolean(document.querySelector('button[aria-label*="Theme:" i]'));

        return {
          viewport: vpWidth,
          maxScroll,
          hasOverflow,
          heading: heading.slice(0, 35),
          hasThemeBtn,
        };
      }, width);

      console.log(`Viewport ${width}px:`, metrics);
      assert.equal(
        metrics.hasOverflow,
        false,
        `Horizontal overflow detected at ${width}px! Max scroll width: ${metrics.maxScroll}px`
      );
      assert.ok(metrics.hasThemeBtn, `Theme toggle button must be rendered at ${width}px`);
    }

    // =========================================================================
    // Check 2: Theme Persistence, System Preference Sync & Explicit Override
    // =========================================================================
    console.log('\n=== CHECK 2: Theme Persistence & System Preference Synchronization ===');
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 400));

    const themeToggleSelector = 'button[aria-label*="Theme:" i]';
    await page.waitForSelector(themeToggleSelector);

    // 2a. Cycle to explicit Dark mode
    for (let i = 0; i < 4; i++) {
      const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
      if (isDark) break;
      await page.click(themeToggleSelector);
      await new Promise((r) => setTimeout(r, 200));
    }

    // Allow the 200ms body background transition to settle
    await new Promise((r) => setTimeout(r, 400));

    const darkState = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        dataTheme: root.getAttribute('data-theme'),
        hasDarkClass: root.classList.contains('dark'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        storedTheme: window.localStorage.getItem('iconhub:theme'),
      };
    });
    console.log('Explicit Dark mode state:', darkState);
    assert.equal(darkState.dataTheme, 'dark', 'data-theme must be "dark"');
    assert.equal(darkState.hasDarkClass, true, '<html> must have "dark" class');
    assert.equal(darkState.storedTheme, 'dark', 'localStorage must persist "dark"');
    assert.equal(darkState.bodyBg, 'rgb(11, 15, 25)', 'Body background must use dark token #0B0F19');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'theme-dark-1280px.png') });
    console.log('Captured screenshot: theme-dark-1280px.png');

    // 2b. Test Persistence across Reload
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 300));
    const reloadedState = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        dataTheme: root.getAttribute('data-theme'),
        hasDarkClass: root.classList.contains('dark'),
        storedTheme: window.localStorage.getItem('iconhub:theme'),
      };
    });
    console.log('State after reload:', reloadedState);
    assert.equal(reloadedState.dataTheme, 'dark', 'Persistence: data-theme must remain "dark" after reload');
    assert.equal(reloadedState.hasDarkClass, true, 'Persistence: <html> must retain "dark" class after reload');

    // 2c. Cycle to System theme
    for (let i = 0; i < 4; i++) {
      const isSystem = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'system');
      if (isSystem) break;
      await page.click(themeToggleSelector);
      await new Promise((r) => setTimeout(r, 200));
    }

    const systemThemeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert.equal(systemThemeAttr, 'system', 'Theme must be set to "system"');

    // 2d. In System theme, emulate OS Dark mode change
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await new Promise((r) => setTimeout(r, 300));
    const systemDarkState = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    assert.equal(systemDarkState, true, 'System theme must resolve to dark when OS prefers dark');

    // 2e. In System theme, emulate OS Light mode change
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await new Promise((r) => setTimeout(r, 300));
    const systemLightState = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    assert.equal(systemLightState, false, 'System theme must resolve to light when OS prefers light');

    // 2f. Explicit Light choice overrides OS dark preference
    for (let i = 0; i < 4; i++) {
      const isLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light');
      if (isLight) break;
      await page.click(themeToggleSelector);
      await new Promise((r) => setTimeout(r, 200));
    }
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await new Promise((r) => setTimeout(r, 300));
    const overrideState = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        dataTheme: root.getAttribute('data-theme'),
        hasDarkClass: root.classList.contains('dark'),
      };
    });
    console.log('Explicit Light override vs OS Dark:', overrideState);
    assert.equal(overrideState.dataTheme, 'light', 'Explicit light choice must remain');
    assert.equal(overrideState.hasDarkClass, false, 'Explicit light must NOT have dark class despite OS dark preference');

    // Reset media emulation
    await page.emulateMediaFeatures([]);

    // =========================================================================
    // Check 3: Keyboard Shortcuts ('/', Ctrl+K, Escape) on /search
    // =========================================================================
    console.log('\n=== CHECK 3: Keyboard Shortcuts on /search ===');
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 500));

    // Focus body first
    await page.evaluate(() => document.body.focus());
    const initialActive = await page.evaluate(() => document.activeElement?.tagName);
    console.log('Active element before "/":', initialActive);

    // 3a. Press '/' outside editable elements -> focuses search
    await page.keyboard.press('Slash');
    await new Promise((r) => setTimeout(r, 200));

    const slashActive = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        isSearchInput: el?.getAttribute('placeholder')?.includes('Search icons'),
      };
    });
    console.log('Active element after "/":', slashActive);
    assert.equal(slashActive.tagName, 'INPUT', 'Active element must be INPUT');
    assert.equal(slashActive.isSearchInput, true, 'Active element must be the search input');

    // 3b. Typing '/' while inside input must NOT steal focus or clear input
    await page.keyboard.type('test/query');
    await new Promise((r) => setTimeout(r, 200));
    const inputContent = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.value;
    });
    console.log('Input value after typing "test/query":', inputContent);
    assert.equal(inputContent, 'test/query', 'Typing "/" inside search input must type "/" naturally without stealing focus');

    // 3c. Press Escape while inside search input with value -> clears input
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 200));
    const clearedValue = await page.evaluate(() => document.activeElement?.value);
    console.log('Input value after Escape:', clearedValue);
    assert.equal(clearedValue, '', 'Escape must clear the search input value');

    // 3d. Press Cmd+K / Ctrl+K from body -> focuses search
    await page.evaluate(() => document.body.focus());
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Meta');
    await new Promise((r) => setTimeout(r, 200));

    const cmdKActive = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.getAttribute('placeholder')?.includes('Search icons');
    });
    assert.equal(cmdKActive, true, 'Cmd+K / Ctrl+K must focus search input');

    // =========================================================================
    // Check 4: Escape Key & Focus Restoration (Mobile Navigation & Filter Drawer)
    // =========================================================================
    console.log('\n=== CHECK 4: Escape Key & Focus Restoration (375px) ===');
    await page.setViewport({ width: 375, height: 812 });

    // 4a. Header Mobile Navigation Menu
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 400));

    const menuToggle = 'button[aria-label="Toggle navigation menu"]';
    await page.waitForSelector(menuToggle);
    await page.click(menuToggle);
    await new Promise((r) => setTimeout(r, 300));

    const menuIsOpen = await page.evaluate(() => Boolean(document.querySelector('nav[aria-label*="Mobile" i]')));
    assert.equal(menuIsOpen, true, 'Mobile navigation drawer must open');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'theme-dark-375px.png') });
    console.log('Captured screenshot: theme-dark-375px.png');

    // Press Escape to close mobile menu
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 300));

    const menuClosed = await page.evaluate(() => !document.querySelector('nav[aria-label*="Mobile" i]'));
    const menuFocusRestored = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute('aria-label') === 'Toggle navigation menu';
    });
    console.log('Mobile menu closed:', menuClosed, '| Focus restored to toggle:', menuFocusRestored);
    assert.equal(menuClosed, true, 'Mobile menu must close on Escape');
    assert.equal(menuFocusRestored, true, 'Focus must be restored to mobile menu toggle button');

    // 4b. Search Mobile Filter Drawer
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 400));

    const filterToggleBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('Filter Options'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert.equal(filterToggleBtn, true, 'Filter Options button must exist and be clicked');
    await new Promise((r) => setTimeout(r, 300));

    const filterDrawerOpen = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
    assert.equal(filterDrawerOpen, true, 'Mobile filter drawer dialog must be open');

    // Press Escape to close filter drawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 300));

    const filterDrawerClosed = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
    const filterFocusRestored = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.textContent?.includes('Filter Options');
    });
    console.log('Filter drawer closed:', filterDrawerClosed, '| Focus restored to Filter Options button:', filterFocusRestored);
    assert.equal(filterDrawerClosed, true, 'Filter drawer must close on Escape');
    assert.equal(filterFocusRestored, true, 'Focus must be restored to Filter Options button');

    // =========================================================================
    // Check 5: Accessible Toast Notification Feedback
    // =========================================================================
    console.log('\n=== CHECK 5: Accessible Toast Notification Feedback ===');
    await page.setViewport({ width: 1280, height: 900 });

    try {
      const context = browser.defaultBrowserContext();
      await context.overridePermissions(BASE_URL, ['clipboard-read', 'clipboard-write']);
    } catch {
      // ignore
    }

    await page.goto(`${BASE_URL}/icon/lucide/arrow-right`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));

    // Stub clipboard in headless browser
    await page.evaluate(() => {
      if (!navigator.clipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: () => Promise.resolve() },
          configurable: true,
        });
      } else {
        navigator.clipboard.writeText = () => Promise.resolve();
      }
    });

    const clickedCopy = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent?.includes('Copy Code') || b.textContent?.includes('Copy SVG'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert.equal(clickedCopy, true, 'Copy button must exist on export panel');

    await new Promise((r) => setTimeout(r, 400));
    const toast = await page.evaluate(() => {
      const el = document.querySelector('[role="status"]');
      return {
        exists: Boolean(el),
        text: el?.textContent?.trim() || '',
        ariaLive: el?.getAttribute('aria-live'),
      };
    });
    console.log('Toast element:', toast);
    assert.equal(toast.exists, true, 'Toast element with role="status" must appear');
    assert.equal(toast.ariaLive, 'polite', 'Toast must declare aria-live="polite"');
    assert.ok(toast.text.includes('Copied'), `Toast message must confirm copy, got: "${toast.text}"`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'toast-feedback-1280px.png') });
    console.log('Captured screenshot: toast-feedback-1280px.png');

    // =========================================================================
    // Check 6: Reduced-Motion Behavior Verification
    // =========================================================================
    console.log('\n=== CHECK 6: Prefers-Reduced-Motion Rendered Behavior ===');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 400));

    const motionMetrics = await page.evaluate(() => {
      const parseDurationSeconds = (str) => {
        if (!str || str === 'none') return 0;
        const val = parseFloat(str);
        if (str.endsWith('ms')) return val / 1000;
        return val;
      };

      // Check transition durations on interactive elements
      const elementsToCheck = [
        document.body,
        document.querySelector('header'),
        document.querySelector('a'),
        document.querySelector('button'),
      ].filter(Boolean);

      return elementsToCheck.map((el) => {
        const style = window.getComputedStyle(el);
        const transDur = parseDurationSeconds(style.transitionDuration);
        const animDur = parseDurationSeconds(style.animationDuration);
        return {
          tag: el.tagName,
          transitionDuration: style.transitionDuration,
          animationDuration: style.animationDuration,
          transitionMinimized: transDur <= 0.02,
          animationMinimized: animDur <= 0.02,
        };
      });
    });

    console.log('Reduced motion element metrics:', motionMetrics);
    for (const metric of motionMetrics) {
      assert.equal(
        metric.transitionMinimized,
        true,
        `Expected transition duration <= 0.02s for ${metric.tag}, got ${metric.transitionDuration}`
      );
      assert.equal(
        metric.animationMinimized,
        true,
        `Expected animation duration <= 0.02s for ${metric.tag}, got ${metric.animationDuration}`
      );
    }

    console.log('\n🎉 ALL PHASE 8 VERIFICATION CHECKS PASSED WITH STRICT ASSERTIONS!');
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
    console.error('\n❌ Verification failed with assertion error:', err);
    process.exit(1);
  });
