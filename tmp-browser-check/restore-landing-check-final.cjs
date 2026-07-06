const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3200);
  const state = await page.evaluate(() => ({
    percent: document.getElementById('percent')?.textContent ?? null,
    titleOpacity: getComputedStyle(document.querySelector('.darji-hero-title') ?? document.body).opacity,
    hasVideo: !!document.querySelector('video'),
    hasHeroCanvas: !!document.querySelector('canvas'),
    hasFaq: !!document.getElementById('faq')
  }));
  console.log(JSON.stringify(state));
  await browser.close();
})();
