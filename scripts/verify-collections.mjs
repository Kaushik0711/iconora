import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3010;
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
      // server not ready
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
    const testUrl = `${BASE_URL}/collections`;
    await waitForServer(testUrl);
    console.log(`\nNext.js production server is ready at ${testUrl}`);

    console.log('2. Launching headless Chrome...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    const verificationResults = [];

    // 3. Inspect /collections responsive layout & horizontal overflow across all 7 viewports
    for (const width of VIEWPORTS) {
      console.log(`\n--- Inspecting /collections at ${width}px ---`);
      const height = width >= 1024 ? 900 : 800;
      await page.setViewport({ width, height });
      await page.goto(testUrl, { waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 500));

      const metrics = await page.evaluate((vpWidth) => {
        const bodyScrollWidth = document.body.scrollWidth;
        const htmlScrollWidth = document.documentElement.scrollWidth;
        const maxScroll = Math.max(bodyScrollWidth, htmlScrollWidth);
        const hasHorizontalOverflow = maxScroll > vpWidth + 1;

        const heading = document.querySelector('h1')?.textContent || '';
        const cards = document.querySelectorAll('h3');
        const searchInput = document.querySelector('input[type="search"]');

        return {
          viewport: vpWidth,
          hasHorizontalOverflow,
          maxScrollWidth: maxScroll,
          heading,
          cardCount: cards.length,
          hasSearchInput: Boolean(searchInput),
        };
      }, width);

      console.log(`Viewport ${width}px results:`, metrics);
      verificationResults.push(metrics);

      const shotPath = path.join(ARTIFACT_DIR, `collections-${width}px.png`);
      await page.screenshot({ path: shotPath });
      console.log(`Captured screenshot: collections-${width}px.png`);
    }

    // 4. Test Interactive Filtering & Favoriting on /collections at 1280px
    console.log('\n--- Testing Interactive Filtering & Favorites on /collections (1280px) ---');
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 500));

    const filterResult = await page.evaluate(async () => {
      // Test search filter: type "Tailwind"
      const searchInput = document.querySelector('input[type="search"]');
      if (searchInput) {
        searchInput.value = 'tailwind';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 300));

      const filteredCards = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent?.trim());

      // Clear search
      if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 200));

      // Test favorite star click on Lucide card
      const lucideCard = Array.from(document.querySelectorAll('.group')).find((el) =>
        el.textContent?.includes('Lucide')
      );
      const starBtn = lucideCard?.querySelector('button[aria-label*="favorite" i]');
      if (starBtn) {
        starBtn.click();
      }
      await new Promise((r) => setTimeout(r, 300));

      const isStarFavorited = starBtn?.getAttribute('aria-pressed') === 'true';

      return {
        typedTailwindMatches: filteredCards,
        starClicked: Boolean(starBtn),
        isStarFavorited,
      };
    });

    console.log('Collections filtering and favorites result:', filterResult);

    const filterShot = path.join(ARTIFACT_DIR, 'collections-filtered-favorite-1280px.png');
    await page.screenshot({ path: filterShot });
    console.log('Captured screenshot: collections-filtered-favorite-1280px.png');

    // 5. Inspect /collection/lucide at 1280px & 375px
    console.log('\n--- Inspecting /collection/lucide at 1280px ---');
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/collection/lucide`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 700));

    const lucidePageResult = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const verifiedBadge = document.body.textContent?.includes('Verified Source');
      const licenseSpdx = document.body.textContent?.includes('ISC');
      const favoriteBtn = document.querySelector('button[aria-label*="favorite" i]');
      const searchInput = document.querySelector('input[type="search"]');

      const bodyScrollWidth = document.body.scrollWidth;
      const htmlScrollWidth = document.documentElement.scrollWidth;
      const maxScroll = Math.max(bodyScrollWidth, htmlScrollWidth);
      const hasHorizontalOverflow = maxScroll > 1280 + 1;

      return {
        heading,
        verifiedBadge,
        licenseSpdx,
        hasFavoriteBtn: Boolean(favoriteBtn),
        hasSearchInput: Boolean(searchInput),
        hasHorizontalOverflow,
      };
    });

    console.log('/collection/lucide 1280px result:', lucidePageResult);

    const lucideShot = path.join(ARTIFACT_DIR, 'collection-detail-lucide-1280px.png');
    await page.screenshot({ path: lucideShot });
    console.log('Captured screenshot: collection-detail-lucide-1280px.png');

    // Mobile inspection of /collection/lucide at 375px
    console.log('\n--- Inspecting /collection/lucide at 375px ---');
    await page.setViewport({ width: 375, height: 800 });
    await page.goto(`${BASE_URL}/collection/lucide`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const lucideMobileResult = await page.evaluate(() => {
      const bodyScrollWidth = document.body.scrollWidth;
      const htmlScrollWidth = document.documentElement.scrollWidth;
      const maxScroll = Math.max(bodyScrollWidth, htmlScrollWidth);
      const hasHorizontalOverflow = maxScroll > 375 + 1;
      const heading = document.querySelector('h1')?.textContent || '';

      return {
        viewport: 375,
        hasHorizontalOverflow,
        maxScrollWidth: maxScroll,
        heading,
      };
    });

    console.log('/collection/lucide 375px result:', lucideMobileResult);

    const lucideMobileShot = path.join(ARTIFACT_DIR, 'collection-detail-lucide-375px.png');
    await page.screenshot({ path: lucideMobileShot });
    console.log('Captured screenshot: collection-detail-lucide-375px.png');

    // 6. Test Unknown Collection Fallback (/collection/non-existent-pack)
    console.log('\n--- Inspecting Unknown Collection Fallback (/collection/non-existent-pack) ---');
    await page.goto(`${BASE_URL}/collection/non-existent-pack`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 500));

    const notFoundResult = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const hasBackBtn = document.body.textContent?.includes('Browse Verified Libraries');
      const hasPrefixNotice = document.body.textContent?.includes('non-existent-pack');

      return {
        heading,
        hasBackBtn,
        hasPrefixNotice,
      };
    });

    console.log('Unknown collection fallback result:', notFoundResult);

    const notFoundShot = path.join(ARTIFACT_DIR, 'collection-not-found-1280px.png');
    await page.screenshot({ path: notFoundShot });
    console.log('Captured screenshot: collection-not-found-1280px.png');

    console.log('\n=============================================');
    console.log('PHASE 7 BROWSER VERIFICATION SUMMARY:');
    console.log('=============================================');
    for (const res of verificationResults) {
      console.log(`Viewport ${res.viewport}px: Overflow: ${res.hasHorizontalOverflow ? 'FAIL' : 'PASS'}, Cards: ${res.cardCount}`);
    }
    console.log(`Lucide Detail 1280px: Overflow: ${lucidePageResult.hasHorizontalOverflow ? 'FAIL' : 'PASS'}`);
    console.log(`Lucide Detail 375px: Overflow: ${lucideMobileResult.hasHorizontalOverflow ? 'FAIL' : 'PASS'}`);
    console.log(`Unknown Collection State: ${notFoundResult.heading === 'Collection Not Found' ? 'PASS' : 'FAIL'}`);

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

