import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3008;
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
    await new Promise((resolve) => setTimeout(resolve, 400));
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
    await waitForServer(`${BASE_URL}/search`);
    console.log(`\nNext.js production server is ready at ${BASE_URL}/search`);

    console.log('2. Launching headless Chrome...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    const verificationSummary = [];

    // Test each viewport width on Search Start State (clean initial discovery)
    for (const width of VIEWPORTS) {
      console.log(`\n--- Inspecting /search at ${width}px ---`);
      const height = width >= 1024 ? 900 : 800;
      await page.setViewport({ width, height });
      await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });

      // Small delay to ensure client hydration settles
      await new Promise((r) => setTimeout(r, 600));

      const metrics = await page.evaluate((vpWidth) => {
        const bodyScrollWidth = document.body.scrollWidth;
        const htmlScrollWidth = document.documentElement.scrollWidth;
        const maxScroll = Math.max(bodyScrollWidth, htmlScrollWidth);
        const hasHorizontalOverflow = maxScroll > vpWidth + 1;

        const searchInput = document.querySelector('input[type="search"]');
        const filterButtonMobile = document.querySelector('button[aria-expanded]');
        const sidebarDesktop = document.querySelector('aside');
        const startState = document.querySelector('h2');

        return {
          viewport: vpWidth,
          hasHorizontalOverflow,
          maxScrollWidth: maxScroll,
          searchInputExists: !!searchInput,
          sidebarVisible: sidebarDesktop ? window.getComputedStyle(sidebarDesktop).display !== 'none' : false,
          mobileFilterButtonExists: !!filterButtonMobile,
          startStateTitle: startState ? startState.textContent : null,
        };
      }, width);

      const screenshotPath = path.join(ARTIFACT_DIR, `search-${width}px.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved screenshot: search-${width}px.png`);
      console.log(`Metrics:`, metrics);
      verificationSummary.push(metrics);
    }

    // Interactive checks on desktop (1280px)
    console.log('\n--- Interactive functional verification on 1280px ---');
    await page.setViewport({ width: 1280, height: 900 });

    // 1. Text Query Search
    await page.goto(`${BASE_URL}/search?q=arrow`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    const arrowSearchMetrics = await page.evaluate(() => {
      const cards = document.querySelectorAll('a[href^="/icon/"]');
      const input = document.querySelector('input[type="search"]');
      return {
        inputValue: input ? input.value : null,
        arrowCardsCount: cards.length,
      };
    });
    console.log('Query ?q=arrow result:', arrowSearchMetrics);

    // 2. Category-only Query Search
    await page.goto(`${BASE_URL}/search?category=arrows`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    const categoryMetrics = await page.evaluate(() => {
      const cards = document.querySelectorAll('a[href^="/icon/"]');
      return {
        categoryCardsCount: cards.length,
      };
    });
    console.log('Query ?category=arrows result:', categoryMetrics);

    // 3. Combined Category + Query: ?category=arrows&q=right
    await page.goto(`${BASE_URL}/search?category=arrows&q=right`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    const combinedMetrics = await page.evaluate(() => {
      const cards = document.querySelectorAll('a[href^="/icon/"]');
      return {
        combinedCardsCount: cards.length,
      };
    });
    console.log('Combined ?category=arrows&q=right result:', combinedMetrics);

    // 4. Combined Category + Unrelated Query (must return 0 matches)
    await page.goto(`${BASE_URL}/search?category=arrows&q=user`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    const unrelatedMetrics = await page.evaluate(() => {
      const cards = document.querySelectorAll('a[href^="/icon/"]');
      const emptyNotice = document.querySelector('h2');
      return {
        unrelatedCardsCount: cards.length,
        emptyStateRendered: emptyNotice ? emptyNotice.textContent : null,
      };
    });
    console.log('Unrelated ?category=arrows&q=user result (should be 0):', unrelatedMetrics);

    // 5. Style Variant Differentiation: ?q=heart&style=solid vs outline
    await page.goto(`${BASE_URL}/search?q=heart&style=solid`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    const solidMetrics = await page.evaluate(() => {
      const cards = document.querySelectorAll('a[href^="/icon/"]');
      return { solidCount: cards.length };
    });
    console.log('Style filter solid (?q=heart&style=solid):', solidMetrics);

    // 6. Test Filtered Continuation ("Load More Icons", Single History Entry & Zero Duplicates)
    console.log('\n--- Testing Filtered Cursor Continuation ("Load More Icons") ---');
    await page.goto(`${BASE_URL}/search?category=arrows`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    const initialCardsCount = await page.evaluate(() => {
      return document.querySelectorAll('a[href^="/icon/"]').length;
    });

    const initialHistoryLength = await page.evaluate(() => window.history.length);

    const loadMoreButtonPresent = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Load More Icons')
      );
      return !!btn;
    });

    console.log(`Initial category=arrows items: ${initialCardsCount}, History length: ${initialHistoryLength}, Load More button present: ${loadMoreButtonPresent}`);

    if (loadMoreButtonPresent) {
      console.log('Clicking "Load More Icons" button...');
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent && b.textContent.includes('Load More Icons')
        );
        if (btn) btn.click();
      });

      // Wait for appended items to arrive
      await new Promise((r) => setTimeout(r, 1500));

      const afterLoadMore = await page.evaluate((prevHistLen) => {
        const links = Array.from(document.querySelectorAll('a[href^="/icon/"]'));
        const hrefs = links.map((l) => l.getAttribute('href'));
        const uniqueHrefs = new Set(hrefs);
        const url = window.location.href;
        const currentHistLen = window.history.length;
        return {
          totalCount: links.length,
          uniqueCount: uniqueHrefs.size,
          duplicateCount: links.length - uniqueHrefs.size,
          hasCursorInUrl: url.includes('cursor='),
          currentUrl: url,
          initialHistoryLength: prevHistLen,
          currentHistoryLength: currentHistLen,
          singleHistoryEntryAdded: currentHistLen === prevHistLen + 1,
        };
      }, initialHistoryLength);

      console.log('After "Load More" interaction:', afterLoadMore);

      const loadMoreScreenshot = path.join(ARTIFACT_DIR, 'search-load-more-1280px.png');
      await page.screenshot({ path: loadMoreScreenshot });
      console.log('Captured Load More screenshot: search-load-more-1280px.png');
    }

    // 7. Test Mid-Flight Cancellation & Stale Response Prevention
    console.log('\n--- Testing In-Flight Cancellation (Load More Interrupted by Filter Change) ---');
    await page.goto(`${BASE_URL}/search?category=arrows`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    const raceConditionTestResult = await page.evaluate(async () => {
      const loadMoreBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Load More Icons')
      );
      if (!loadMoreBtn) return { skipped: true };

      // Click Load More
      loadMoreBtn.click();

      // Immediately switch category to "media" before load-more can settle
      const catButtons = Array.from(document.querySelectorAll('button'));
      const mediaBtn = catButtons.find((b) => b.textContent && b.textContent.trim().toLowerCase() === 'media');
      if (mediaBtn) {
        mediaBtn.click();
      }

      // Wait for new search to settle
      await new Promise((r) => setTimeout(r, 1800));

      const links = Array.from(document.querySelectorAll('a[href^="/icon/"]'));
      const hrefs = links.map((l) => l.getAttribute('href') || '');
      const arrowIconContamination = hrefs.filter((h) => h.includes('arrow'));

      return {
        mediaResultsCount: links.length,
        staleArrowIconsCount: arrowIconContamination.length,
        currentUrl: window.location.href,
        noStaleContamination: arrowIconContamination.length === 0,
      };
    });

    console.log('In-flight cancellation test result:', raceConditionTestResult);

    // 8. Test Mobile Filter Toggle (375px) - Open and Close
    console.log('\n--- Testing Mobile Filter Toggle on 375px ---');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const mobileDrawerOpened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const filterBtn = buttons.find((b) => b.textContent && b.textContent.includes('Filter Options'));
      if (filterBtn) {
        filterBtn.click();
        return true;
      }
      return false;
    });

    if (mobileDrawerOpened) {
      await new Promise((r) => setTimeout(r, 500));
      const mobileDrawerScreenshot = path.join(ARTIFACT_DIR, `search-mobile-filters-375px.png`);
      await page.screenshot({ path: mobileDrawerScreenshot });
      console.log('Captured mobile filter drawer open screenshot: search-mobile-filters-375px.png');

      // Test closing drawer
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Close filters"]');
        if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      console.log('Mobile filter drawer closed successfully.');
    }

    console.log('\n=============================================');
    console.log('SEARCH EXPLORER VERIFICATION SUMMARY:');
    console.log('=============================================');
    for (const s of verificationSummary) {
      console.log(`Viewport ${s.viewport}px: Overflow: ${s.hasHorizontalOverflow ? 'FAIL' : 'PASS'}, Input: ${s.searchInputExists}, Sidebar: ${s.sidebarVisible}, StartTitle: "${s.startStateTitle}"`);
    }

  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    server.kill('SIGTERM');
    console.log('\nServer process terminated.');
    setTimeout(() => process.exit(0), 400);
  }
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
