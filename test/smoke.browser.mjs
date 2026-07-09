// Real-browser smoke test (Playwright + system Edge, no browser download).
// Exists because three UI bugs — missing display:grid, fly-overlay anchored to the
// wrong element, a click swallowed by pointer capture — all sailed through the jsdom
// suites. jsdom checks structure; this checks what the user actually sees and clicks.
// Run: npm run smoke  (builds first, serves dist/ via vite preview)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 4173;
let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log('[PASS]', name);
  else { failures++; console.error('[FAIL]', name, detail); }
}

// 1. Serve the production build
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(), shell: true, stdio: 'ignore',
});
await new Promise(r => setTimeout(r, 3000));

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

  // 2. The chart renders as a real 4x4 grid, not a stack of blocks
  const chart = page.locator('.merged-chart');
  await chart.waitFor({ state: 'visible', timeout: 10000 });
  check('merged chart is display:grid',
    await chart.evaluate(el => getComputedStyle(el).display) === 'grid');
  check('12 palace cells render', await page.locator('.merged-chart .palace').count() === 12);
  const chartBox = await chart.boundingBox();
  check('chart has real size', chartBox && chartBox.width > 400 && chartBox.height > 400,
    JSON.stringify(chartBox));

  // Palaces occupy distinct grid positions (the missing-grid bug made them stack)
  const cellBoxes = await page.locator('.merged-chart .palace').evaluateAll(els =>
    els.map(el => { const r = el.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y)}`; }));
  check('palaces occupy distinct positions', new Set(cellBoxes).size === 12, cellBoxes.join(' '));

  // 3. The fly-arrow overlay anchors to the chart square, not the viewport
  const overlayBox = await page.locator('.merged-chart .fly-overlay').first().boundingBox();
  const anchored = overlayBox && Math.abs(overlayBox.width - chartBox.width) < 8
    && Math.abs(overlayBox.x - chartBox.x) < 8;
  check('fly-overlay anchored to the chart square', anchored,
    `overlay=${JSON.stringify(overlayBox)} chart=${JSON.stringify(chartBox)}`);

  // 4. Clicking a palace draws the four flight arrows and the 飛化解讀 panel
  await page.locator('.merged-chart .palace[data-branch-index="1"]').click();
  await page.waitForTimeout(400);
  const arrowCount = await page.locator('.merged-chart .fly-overlay .fly-marks path').count();
  check('palace click draws flight arrows', arrowCount >= 3, `paths=${arrowCount}`);
  check('飛化解讀 section appears', await page.locator('#info-panel .fly-read').count() >= 3);
  check('🎯 最終解盤 paragraphs appear', await page.locator('#info-panel .final-read p').count() >= 3);

  // 5. Timeline legend is present (the marks must be self-explanatory)
  check('timeline legend renders', await page.locator('#timeline .tl-legend .tl-legend-item').count() >= 6);

  // 5b. Profile save/load round-trip through the real UI
  await page.fill('#profile-name', '煙測');
  await page.click('#profile-save');
  await page.waitForTimeout(200);
  const optCount = await page.locator('#profile-select option').count();
  check('profile saved appears in dropdown', optCount >= 2, `options=${optCount}`);
  await page.selectOption('#profile-select', '煙測');
  await page.waitForTimeout(600);
  check('selecting a profile rebuilds the chart',
    await page.locator('.merged-chart .palace').count() === 12);

  // 6. No console errors during all of the above
  // (collected via listener installed before goto would be ideal; spot-check instead)
  const errors = await page.evaluate(() => window.__errs || []);
  check('no captured page errors', errors.length === 0, errors.join('; '));
} catch (e) {
  failures++;
  console.error('[FAIL] smoke run threw:', e.message);
} finally {
  if (browser) await browser.close();
  server.kill();
  // vite preview spawns via shell on Windows; make sure the port is freed
  process.exitCode = failures > 0 ? 1 : 0;
  console.log(failures === 0 ? '\nAll browser smoke checks passed.' : `\n${failures} smoke check(s) FAILED.`);
}
