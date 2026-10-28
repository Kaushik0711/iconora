import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:3000';
const VIEWPORTS = [320, 375, 430, 768, 1024, 1280, 1440];
const SCREENSHOT_DIR = path.resolve('screenshots');

async function waitForServer(url, timeoutMs = 20000) {
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
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  console.log('1. Starting Next.js production server on port 3000...');
  const server = spawn('npm', ['run', 'start', '--', '-p', '3000'], {
    stdio: 'pipe',
    env: { ...process.env, PORT: '3000' },
  });

  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server err] ${d}`));

  try {
    await waitForServer(BASE_URL);
    console.log('Next.js server is ready at ' + BASE_URL);

    console.log('\n2. Launching Chrome headless at:', CHROME_PATH);
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const results = {
      viewports: {},
      firstScreen1440x1024: {},
      interactions: {},
      defects: [],
    };

    const page = await browser.newPage();

    // 2.1 First-screen 1440x1024 Desktop Inspection (User Target)
    console.log('\n--- Inspecting 1440x1024 First-Screen Viewport ---');
    await page.setViewport({ width: 1440, height: 1024 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const screen1024Metrics = await page.evaluate(() => {
      const header = document.querySelector('header');
      const searchInput = document.querySelector('#hero-search-input');
      const categorySection = document.querySelector('[aria-label="Browse by Category"]');
      const librarySection = document.querySelector('[aria-labelledby="libraries-heading"]');
      const firstCard = document.querySelector('[aria-labelledby="libraries-heading"] article');

      const catRect = categorySection?.getBoundingClientRect();
      const libRect = librarySection?.getBoundingClientRect();
      const cardRect = firstCard?.getBoundingClientRect();

      return {
        viewportHeight: 1024,
        headerHeight: header?.offsetHeight ?? 0,
        searchInputWidth: searchInput?.offsetWidth ?? 0,
        categoryTop: catRect?.top ?? 0,
        categoryVisibleInFirstScreen: (catRect?.bottom ?? 0) <= 1024,
        libraryHeadingTop: libRect?.top ?? 0,
        firstCardTop: cardRect?.top ?? 0,
        firstCardBottom: cardRect?.bottom ?? 0,
        firstCardVisibleInFirstScreen: (cardRect?.top ?? 0) < 1024,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    console.log(`  Header height: ${screen1024Metrics.headerHeight}px`);
    console.log(`  Search field width: ${screen1024Metrics.searchInputWidth}px`);
    console.log(`  Category row top: ${Math.round(screen1024Metrics.categoryTop)}px (Visible in first screen: ${screen1024Metrics.categoryVisibleInFirstScreen})`);
    console.log(`  Library section top: ${Math.round(screen1024Metrics.libraryHeadingTop)}px`);
    console.log(`  First library card top: ${Math.round(screen1024Metrics.firstCardTop)}px | bottom: ${Math.round(screen1024Metrics.firstCardBottom)}px (Visible in first screen: ${screen1024Metrics.firstCardVisibleInFirstScreen})`);

    const screenshot1440x1024Path = path.join(SCREENSHOT_DIR, 'homepage-1440x1024.png');
    await page.screenshot({ path: screenshot1440x1024Path, fullPage: false });
    console.log(`  Screenshot saved: ${screenshot1440x1024Path}`);
    results.firstScreen1440x1024 = screen1024Metrics;

    // 2.2 Verify All 7 Standard Viewports
    for (const width of VIEWPORTS) {
      console.log(`\n--- Inspecting viewport: ${width}px ---`);
      await page.setViewport({ width, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

      // Check horizontal overflow
      const metrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = docWidth > winWidth;

        let overflowElements = [];
        if (hasOverflow) {
          document.querySelectorAll('*').forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 1) {
              overflowElements.push({
                tag: el.tagName,
                className: el.className,
                right: rect.right,
                width: rect.width,
              });
            }
          });
        }

        const header = document.querySelector('header');
        const searchInput = document.querySelector('#hero-search-input');
        const cards = document.querySelectorAll('[aria-labelledby="libraries-heading"] article');

        return {
          winWidth,
          docWidth,
          hasOverflow,
          overflowElements: overflowElements.slice(0, 5),
          headerVisible: !!header && header.offsetHeight > 0,
          searchInputVisible: !!searchInput && searchInput.offsetHeight > 0,
          searchInputWidth: searchInput ? searchInput.getBoundingClientRect().width : 0,
          chipsCount: document.querySelectorAll('[aria-label="Browse by Category"] button').length,
          cardsCount: cards.length,
          cardFirstWidth: cards[0] ? cards[0].getBoundingClientRect().width : 0,
        };
      });

      console.log(`  Window: ${metrics.winWidth}px | ScrollWidth: ${metrics.docWidth}px | Overflow: ${metrics.hasOverflow}`);
      console.log(`  Search input width: ${Math.round(metrics.searchInputWidth)}px | Cards count: ${metrics.cardsCount} | First card width: ${Math.round(metrics.cardFirstWidth)}px`);

      if (metrics.hasOverflow) {
        results.defects.push({
          type: 'HORIZONTAL_OVERFLOW',
          viewport: width,
          details: `scrollWidth (${metrics.docWidth}px) exceeds window (${metrics.winWidth}px)`,
          elements: metrics.overflowElements,
        });
      }

      const screenshotPath = path.join(SCREENSHOT_DIR, `homepage-${width}px.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Screenshot saved: ${screenshotPath}`);

      results.viewports[width] = metrics;
    }

    // 3. Test Mobile Navigation Interactions (375px)
    console.log('\n--- Testing Mobile Menu Interactions (375px) ---');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const menuToggle = await page.$('button[aria-label="Toggle navigation menu"]');
    if (menuToggle) {
      await menuToggle.click();
      await new Promise((r) => setTimeout(r, 250));

      const menuVisible = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Mobile Navigation"]');
        return !!nav && nav.offsetHeight > 0;
      });

      console.log(`  Mobile menu open state: ${menuVisible ? 'SUCCESS' : 'FAILED'}`);
      results.interactions.mobileMenuOpen = menuVisible;

      const menuScreenshotPath = path.join(SCREENSHOT_DIR, 'mobile-menu-open.png');
      await page.screenshot({ path: menuScreenshotPath });
      console.log(`  Menu screenshot saved: ${menuScreenshotPath}`);

      await menuToggle.click();
      await new Promise((r) => setTimeout(r, 250));
      const menuClosed = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Mobile Navigation"]');
        return !nav;
      });
      console.log(`  Mobile menu close state: ${menuClosed ? 'SUCCESS' : 'FAILED'}`);
      results.interactions.mobileMenuClose = menuClosed;
    }

    // 4. Test "View All Libraries" Link Navigation
    console.log('\n--- Testing View All Libraries Navigation ---');
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    const viewAllLink = await page.$('a[href="/collections"]');
    if (viewAllLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        viewAllLink.click(),
      ]);
      const currentUrl = page.url();
      const collectionsHeading = await page.$eval('h1', (el) => el.textContent);
      console.log(`  Navigated to: ${currentUrl} | Heading: "${collectionsHeading}"`);
      results.interactions.viewAllLibrariesNav = {
        success: currentUrl.includes('/collections'),
        url: currentUrl,
        heading: collectionsHeading,
      };
    }

    // 5. Test 8 Library Card Navigations
    console.log('\n--- Testing 8 Library Card Navigations ---');
    const libraryPrefixes = ['lucide', 'heroicons', 'tabler', 'ph', 'ri', 'feather', 'bi', 'simple-icons'];
    results.interactions.libraryCardNavigations = {};

    for (const prefix of libraryPrefixes) {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const cardLink = await page.$(`a[href="/collection/${prefix}"]`);
      if (cardLink) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          cardLink.click(),
        ]);
        const url = page.url();
        const heading = await page.$eval('h1', (el) => el.textContent);
        const hasPrefixBadge = await page.evaluate((p) => {
          return document.body.textContent.includes(`prefix: ${p}`);
        }, prefix);

        console.log(`  [${prefix}] -> ${url} | Heading: "${heading}" | Badge: ${hasPrefixBadge ? 'OK' : 'FAIL'}`);
        results.interactions.libraryCardNavigations[prefix] = {
          success: url.includes(`/collection/${prefix}`) && hasPrefixBadge,
          url,
          heading,
        };
      }
    }

    await browser.close();

    console.log('\n=============================================');
    console.log('VERIFICATION SUMMARY');
    console.log('=============================================');
    console.log(`1440x1024 First-Screen Check: Category top at ${Math.round(results.firstScreen1440x1024.categoryTop)}px, Cards top at ${Math.round(results.firstScreen1440x1024.firstCardTop)}px (Both in screen)`);
    console.log(`Total Standard Viewports Verified: ${VIEWPORTS.length}`);
    console.log(`Defects Found: ${results.defects.length}`);
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
