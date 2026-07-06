const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(6200);
  const state = await page.evaluate(() => ({
    bodyOverflow: document.body.style.overflow,
    titleOpacity: getComputedStyle(document.querySelector('.darji-hero-title') ?? document.body).opacity,
    navbarOpacity: getComputedStyle(document.querySelector('.darji-navbar') ?? document.body).opacity,
    loaderTransform: getComputedStyle(document.getElementById('loader') ?? document.body).transform
  }));
  console.log(JSON.stringify(state));
  await browser.close();
})();
