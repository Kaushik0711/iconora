import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3009;
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
    const testIconUrl = `${BASE_URL}/icon/lucide/arrow-right`;
    await waitForServer(testIconUrl);
    console.log(`\nNext.js production server is ready at ${testIconUrl}`);

    console.log('2. Launching headless Chrome...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    const verificationResults = [];

    // 3. Test responsive layout & horizontal overflow across all 7 viewports
    for (const width of VIEWPORTS) {
      console.log(`\n--- Inspecting /icon/lucide/arrow-right at ${width}px ---`);
      const height = width >= 1024 ? 900 : 800;
      await page.setViewport({ width, height });
      await page.goto(testIconUrl, { waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 600));

      const metrics = await page.evaluate((vpWidth) => {
        const bodyScrollWidth = document.body.scrollWidth;
        const htmlScrollWidth = document.documentElement.scrollWidth;
        const maxScroll = Math.max(bodyScrollWidth, htmlScrollWidth);
        const hasHorizontalOverflow = maxScroll > vpWidth + 1;

        const heading = document.querySelector('h1')?.textContent || '';
        const previewSvg = document.querySelector('.checkerboard-pattern svg, .bg-white svg');
        const sizeInput = document.querySelector('input[aria-label="Size in pixels"]');
        const exportTabs = Array.from(document.querySelectorAll('[role="tab"]')).map(
          (t) => t.textContent?.trim()
        );

        return {
          viewport: vpWidth,
          hasHorizontalOverflow,
          maxScrollWidth: maxScroll,
          heading,
          hasPreviewSvg: Boolean(previewSvg),
          hasSizeInput: Boolean(sizeInput),
          exportTabs,
        };
      }, width);

      console.log(`Viewport ${width}px results:`, metrics);
      verificationResults.push(metrics);

      const shotPath = path.join(ARTIFACT_DIR, `customizer-${width}px.png`);
      await page.screenshot({ path: shotPath });
      console.log(`Captured screenshot: customizer-${width}px.png`);
    }

    // 4. Test interactive controls (Size, Color, Stroke Width, Rotation, Container)
    console.log('\n--- Testing Interactive Customizer Controls at 1280px ---');
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(testIconUrl, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const interactionResult = await page.evaluate(async () => {
      // 1. Click 48px size preset
      const sizePresets = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent && b.textContent.includes('px')
      );
      const btn48 = sizePresets.find((b) => b.textContent?.trim() === '48px');
      if (btn48) btn48.click();

      // 2. Click 90° rotation
      const rotateButtons = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent && b.textContent.includes('°')
      );
      const btn90 = rotateButtons.find((b) => b.textContent?.trim() === '90°');
      if (btn90) btn90.click();

      // 3. Click 3px stroke-width preset
      const strokePresets = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent && ['1px', '1.5px', '2px', '2.5px', '3px'].includes(b.textContent.trim())
      );
      const btn3px = strokePresets.find((b) => b.textContent?.trim() === '3px');
      if (btn3px) btn3px.click();

      // 4. Click blue color swatch (#2563eb)
      const colorBtn = document.querySelector('button[aria-label="Select color #2563eb"]');
      if (colorBtn) colorBtn.click();

      // 5. Click 'circle' container shape
      const shapeButtons = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent && ['none', 'square', 'rounded', 'circle'].includes(b.textContent.trim().toLowerCase())
      );
      const circleBtn = shapeButtons.find((b) => b.textContent?.trim().toLowerCase() === 'circle');
      if (circleBtn) circleBtn.click();

      await new Promise((r) => setTimeout(r, 400));

      // Inspect updated SVG in preview
      const previewSvg = document.querySelector('.checkerboard-pattern svg') || document.querySelector('div[class*="checkerboard"] svg');
      const circleElement = previewSvg?.querySelector('circle');
      const rotateG = previewSvg?.querySelector('g[transform*="rotate(90"]') || previewSvg?.querySelector('g[transform*="rotate"]');
      const innerPath = previewSvg?.querySelector('path');

      return {
        clickedCircle: Boolean(circleBtn),
        clickedRotate: Boolean(btn90),
        svgWidth: previewSvg?.getAttribute('width'),
        svgHeight: previewSvg?.getAttribute('height'),
        hasCircleContainer: Boolean(circleElement),
        hasRotationTransform: Boolean(rotateG),
        pathStroke: innerPath?.getAttribute('stroke'),
        pathStrokeWidth: innerPath?.getAttribute('stroke-width'),
        actualColorApplied: innerPath?.getAttribute('stroke') === '#2563eb',
        actualStrokeWidthApplied: innerPath?.getAttribute('stroke-width') === '3',
      };
    });

    console.log('Interaction test results (size 48, 90deg, circle, 3px stroke, #2563eb):', interactionResult);

    const customizedShot = path.join(ARTIFACT_DIR, 'customizer-interactive-styled-1280px.png');
    await page.screenshot({ path: customizedShot });
    console.log('Captured screenshot: customizer-interactive-styled-1280px.png');

    // 5. Test Code Exporter Tabs (React JSX tab & Copy button)
    console.log('\n--- Testing Code Exporter Tabs ---');
    const exporterResult = await page.evaluate(async () => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const reactTab = tabs.find((t) => t.textContent?.includes('React'));
      if (reactTab) {
        reactTab.click();
      }

      await new Promise((r) => setTimeout(r, 300));

      const codeBox = document.querySelector('pre code');
      const codeText = codeBox?.textContent || '';

      const hasComponent = codeText.includes('export function ArrowRightIcon');
      const hasProps = codeText.includes('{...props}');
      const hasJsxAttributes = codeText.includes('strokeWidth="3"') && codeText.includes('stroke="#2563eb"');

      return {
        hasComponent,
        hasProps,
        hasJsxAttributes,
        snippetLength: codeText.length,
      };
    });

    console.log('React JSX tab results:', exporterResult);

    // 6. Test Solid Icon (/icon/heroicons/arrow-right-solid) in mixed collection
    console.log('\n--- Testing Solid Variant in Mixed Collection (/icon/heroicons/arrow-right-solid) ---');
    await page.goto(`${BASE_URL}/icon/heroicons/arrow-right-solid`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const solidVariantResult = await page.evaluate(async () => {
      const badges = Array.from(document.querySelectorAll('span'));
      const solidBadge = badges.find((b) => b.textContent?.includes('Solid / Fill'));
      const strokeSlider = document.querySelector('#stroke-slider');

      // Change color to green (#10b981)
      const colorBtn = document.querySelector('button[aria-label="Select color #10b981"]');
      if (colorBtn) colorBtn.click();
      await new Promise((r) => setTimeout(r, 400));

      const previewSvg = document.querySelector('.checkerboard-pattern svg') || document.querySelector('div[class*="checkerboard"] svg');
      const pathEl = previewSvg?.querySelector('path');

      return {
        hasSolidBadge: Boolean(solidBadge),
        strokeSliderDisabledOrAbsent: !strokeSlider,
        pathFill: pathEl?.getAttribute('fill'),
        pathHasNoStroke: !pathEl?.hasAttribute('stroke'),
        colorAppliedToFill: pathEl?.getAttribute('fill') === '#10b981',
      };
    });

    console.log('Heroicons solid variant test results:', solidVariantResult);

    // 7. Test Solid Icon with Attribution Banner (/icon/fa6-solid/user)
    console.log('\n--- Testing Solid Icon with Attribution Banner (/icon/fa6-solid/user) ---');
    await page.goto(`${BASE_URL}/icon/fa6-solid/user`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const faSolidResult = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('span'));
      const solidBadge = badges.find((b) => b.textContent?.includes('Solid / Fill'));
      const attributionBanner = document.body.textContent?.includes('Attribution Required');
      const strokeSlider = document.querySelector('#stroke-slider');

      return {
        hasSolidBadge: Boolean(solidBadge),
        hasAttributionBanner: Boolean(attributionBanner),
        strokeSliderPresent: Boolean(strokeSlider),
      };
    });

    console.log('Font Awesome solid (fa6-solid:user) results:', faSolidResult);

    const solidShot = path.join(ARTIFACT_DIR, 'customizer-solid-fa6-1280px.png');
    await page.screenshot({ path: solidShot });
    console.log('Captured screenshot: customizer-solid-fa6-1280px.png');

    // 8. Test Fill-Based Visual Outline (/icon/material-symbols/home-outline)
    console.log('\n--- Testing Fill-Based Visual Outline (/icon/material-symbols/home-outline) ---');
    await page.goto(`${BASE_URL}/icon/material-symbols/home-outline`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));

    const materialSymbolsResult = await page.evaluate(async () => {
      const badges = Array.from(document.querySelectorAll('span'));
      const fillBasedBadge = badges.find((b) => b.textContent?.includes('Fill-Based') || b.textContent?.includes('Solid / Fill'));
      const strokeSlider = document.querySelector('#stroke-slider');
      const disabledReason = document.body.textContent?.includes('filled vector paths');

      // Click red color swatch (#ef4444)
      const colorBtn = document.querySelector('button[aria-label="Select color #ef4444"]');
      if (colorBtn) colorBtn.click();
      await new Promise((r) => setTimeout(r, 400));

      const previewSvg = document.querySelector('.checkerboard-pattern svg') || document.querySelector('div[class*="checkerboard"] svg');
      const pathEl = previewSvg?.querySelector('path');

      return {
        hasFillBasedBadge: Boolean(fillBasedBadge),
        badgeText: fillBasedBadge?.textContent?.trim(),
        strokeSliderAbsent: !strokeSlider,
        hasDisabledReason: Boolean(disabledReason),
        pathFill: pathEl?.getAttribute('fill'),
        pathHasNoStroke: !pathEl?.hasAttribute('stroke'),
        pathHasNoStrokeWidth: !pathEl?.hasAttribute('stroke-width'),
        colorAppliedToFill: pathEl?.getAttribute('fill') === '#ef4444',
      };
    });

    console.log('Material Symbols outline (material-symbols:home-outline) results:', materialSymbolsResult);

    const msShot = path.join(ARTIFACT_DIR, 'customizer-fill-outline-ms-1280px.png');
    await page.screenshot({ path: msShot });
    console.log('Captured screenshot: customizer-fill-outline-ms-1280px.png');

    console.log('\n=============================================');
    console.log('CUSTOMIZER VERIFICATION SUMMARY:');
    console.log('=============================================');
    for (const res of verificationResults) {
      console.log(`Viewport ${res.viewport}px: Overflow: ${res.hasHorizontalOverflow ? 'FAIL' : 'PASS'}, Preview: ${res.hasPreviewSvg}, Controls: ${res.hasSizeInput}`);
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
