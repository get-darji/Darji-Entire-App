const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3002/dashboard?support=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  console.log(await page.locator('body').innerText());
  await browser.close();
})();
