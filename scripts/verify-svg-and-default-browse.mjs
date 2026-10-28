import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3014;
const BASE_URL = `http://localhost:${PORT}`;

async function waitForServer(url, timeoutMs = 25000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // server starting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function run() {
  console.log(`Starting Next.js production server on port ${PORT}...`);
  const server = spawn('npm', ['run', 'start', '--', '-p', String(PORT)], {
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) },
  });

  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server err] ${d}`));

  let browser;

  try {
    await waitForServer(`${BASE_URL}/search`);
    console.log(`Server is ready at ${BASE_URL}`);

    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();

    // Grant clipboard permissions
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(BASE_URL, ['clipboard-read', 'clipboard-write']);

    // =========================================================================
    // 1. Verify Clean SVG Code Display and Copy on Icon Customizer
    // =========================================================================
    console.log('\n--- 1. Testing SVG Code Copy on /icon/lucide/arrow-right ---');
    await page.goto(`${BASE_URL}/icon/lucide/arrow-right`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#tab-svg', { timeout: 8000 });

    // Ensure SVG tab is active
    await page.click('#tab-svg');
    await new Promise((r) => setTimeout(r, 300));

    // Check displayed code text in <pre><code>
    const displayedSvgCode = await page.$eval('pre code', (el) => el.textContent?.trim() || '');
    console.log(`Displayed SVG code starts with: ${displayedSvgCode.slice(0, 30)}...`);
    console.log(`Displayed SVG code ends with: ...${displayedSvgCode.slice(-20)}`);

    assert.ok(displayedSvgCode.startsWith('<svg'), 'Displayed code must begin with <svg');
    assert.ok(displayedSvgCode.endsWith('</svg>'), 'Displayed code must end with </svg>');
    assert.equal(displayedSvgCode.includes('<?xml'), false, 'Displayed code must NOT include XML declaration');
    assert.equal(displayedSvgCode.includes('<!--'), false, 'Displayed code must NOT include attribution comment');
    assert.equal(displayedSvgCode.includes('```'), false, 'Displayed code must NOT include Markdown fences');

    // Click "Copy Code" button and read clipboard in page context
    const copyResult = await page.evaluate(async () => {
      let writtenText = '';
      const origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = async (text) => {
        writtenText = text;
        try {
          return await origWrite(text);
        } catch (e) {
          return Promise.resolve();
        }
      };

      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Copy Code')
      );
      if (!btn) return { found: false, writtenText: '', clip: '' };
      btn.click();
      await new Promise((r) => setTimeout(r, 400));
      let clip = '';
      try {
        clip = await navigator.clipboard.readText();
      } catch (e) {
        clip = 'ERR: ' + e.message;
      }
      return { found: true, writtenText, clip };
    });

    console.log(`Copy button found: ${copyResult.found}`);
    console.log(`Intercepted writeText text starts with: ${copyResult.writtenText.slice(0, 40)}...`);
    console.log(`Clipboard read text starts with: ${copyResult.clip.slice(0, 40)}...`);

    const clipboardText = copyResult.writtenText || copyResult.clip;

    assert.ok(clipboardText.startsWith('<svg'), 'Copied SVG must start with <svg');
    assert.ok(clipboardText.endsWith('</svg>'), 'Copied SVG must end with </svg>');
    assert.equal(clipboardText.includes('<?xml'), false, 'Copied SVG must NOT include XML declaration');
    assert.equal(clipboardText.includes('<!--'), false, 'Copied SVG must NOT include attribution comments');
    assert.equal(clipboardText.includes('```'), false, 'Copied SVG must NOT include Markdown fences');
    console.log('✔ Copied SVG code contains only clean <svg>...</svg> markup!');

    // =========================================================================
    // 1b. Verify Downloaded SVG File Content is Valid Standalone SVG
    // =========================================================================
    console.log('\n--- 1b. Testing Download .svg Action ---');
    const downloadedContent = await page.evaluate(async () => {
      let content = '';
      const origCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        blob.text().then((t) => { content = t; });
        return origCreateObjectURL(blob);
      };

      const downloadBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Download .svg')
      );
      if (downloadBtn) downloadBtn.click();

      await new Promise((r) => setTimeout(r, 400));
      return content;
    });

    console.log(`Downloaded file content starts with: ${downloadedContent.slice(0, 45)}...`);
    assert.ok(downloadedContent.includes('<svg'), 'Downloaded SVG must contain <svg tag');
    assert.ok(downloadedContent.includes('</svg>'), 'Downloaded SVG must contain </svg> closing tag');
    assert.ok(downloadedContent.includes('xmlns="http://www.w3.org/2000/svg"'), 'Downloaded SVG must have XMLNS');
    console.log('✔ Downloaded SVG is a valid standalone SVG file!');

    // =========================================================================
    // 2. Verify Default Browse on /search (No Query, No Filters)
    // =========================================================================
    console.log('\n--- 2. Testing Default Browse on Clean /search ---');
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('div[aria-label="Search results"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 800));

    // Assert icons are immediately displayed without entering a query
    const initialRenderedCards = await page.$$eval(
      'div[aria-label="Search results"] > div',
      (cards) => cards.length
    );
    console.log(`Default browse rendered icon cards: ${initialRenderedCards}`);
    assert.ok(initialRenderedCards > 0, `Expected default icons to appear immediately, got ${initialRenderedCards}`);

    // Verify icons represent multiple verified collections, not only one default collection
    const iconPrefixes = await page.$$eval(
      'div[aria-label="Search results"] a[href*="/icon/"]',
      (links) => {
        const prefixes = new Set();
        for (const link of links) {
          const match = link.getAttribute('href')?.match(/\/icon\/([^/]+)\//);
          if (match) prefixes.add(match[1]);
        }
        return Array.from(prefixes);
      }
    );
    console.log(`Collections represented in initial browse view:`, iconPrefixes);
    assert.ok(
      iconPrefixes.length >= 2,
      `Expected results from multiple verified collections, got ${iconPrefixes.length} (${iconPrefixes.join(', ')})`
    );

    // Verify result count badge
    const countBadge = await page.$eval(
      'span[aria-live="polite"]',
      (el) => el.textContent?.trim() || ''
    );
    console.log(`Browse count badge: "${countBadge}"`);
    assert.ok(countBadge.includes('icons'), 'Count badge should display total icons');
    assert.ok(!countBadge.includes('0 icons'), 'Count badge must not be 0 icons');

    // =========================================================================
    // 3. Verify Pagination on Default Browse (Page 2)
    // =========================================================================
    console.log('\n--- 3. Testing Pagination on Default Browse ---');
    const nextPageBtn = await page.$('button[aria-label="Go to next page"]');
    assert.ok(nextPageBtn, 'Next page button should exist in numbered pagination');

    // Get current icon canonical IDs on Page 1
    const page1Ids = await page.$$eval(
      'div[aria-label="Search results"] a[href*="/icon/"]',
      (links) => links.map((l) => l.getAttribute('href'))
    );

    await nextPageBtn.click();
    await new Promise((r) => setTimeout(r, 1200));

    const page2Ids = await page.$$eval(
      'div[aria-label="Search results"] a[href*="/icon/"]',
      (links) => links.map((l) => l.getAttribute('href'))
    );
    console.log(`Page 1 count: ${page1Ids.length}, Page 2 count: ${page2Ids.length}`);

    // Assert zero duplicates between page 1 and page 2
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    console.log(`Overlap between Page 1 and Page 2: ${overlap.length} items`);
    assert.equal(overlap.length, 0, 'Consecutive pages must contain zero duplicate icons');

    // =========================================================================
    // 4. Verify Active Search and Filtering Still Work
    // =========================================================================
    console.log('\n--- 4. Testing Active Search Query & Filters ---');
    await page.goto(`${BASE_URL}/search?q=arrow`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('div[aria-label="Search results"]', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 800));

    const arrowSearchCount = await page.$$eval(
      'div[aria-label="Search results"] > div',
      (cards) => cards.length
    );
    console.log(`Search for "arrow" rendered icons: ${arrowSearchCount}`);
    assert.ok(arrowSearchCount > 0, 'Search for "arrow" must return icons');

    // Apply "solid" style filter
    const solidBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim().toLowerCase() === 'solid'
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert.ok(solidBtn, 'Solid style filter button must exist');
    await new Promise((r) => setTimeout(r, 800));

    const filteredSolidCount = await page.$$eval(
      'div[aria-label="Search results"] > div',
      (cards) => cards.length
    );
    console.log(`Filtered "arrow" with style="solid" rendered icons: ${filteredSolidCount}`);
    assert.ok(filteredSolidCount > 0, 'Filtered solid icons must appear');

    console.log('\n🎉 ALL SVG CLEAN COPY AND DEFAULT BROWSE CHECKS PASSED SUCCESSFULLY!');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
