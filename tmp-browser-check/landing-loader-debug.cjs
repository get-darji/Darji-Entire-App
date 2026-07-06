const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', msg => console.log('console:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('pageerror:', err.message));
  await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3500);
  const state = await page.evaluate(() => ({
    loaderExists: !!document.getElementById('loader'),
    loaderText: document.getElementById('percent')?.textContent ?? null,
    loaderTransform: getComputedStyle(document.getElementById('loader') ?? document.body).transform,
    bodyOverflow: document.body.style.overflow,
    titleOpacity: getComputedStyle(document.querySelector('.darji-hero-title') ?? document.body).opacity
  }));
  console.log(JSON.stringify(state));
  await browser.close();
})();
