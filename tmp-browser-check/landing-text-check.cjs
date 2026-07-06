const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3002/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const body = await page.locator('body').innerText();
  console.log(JSON.stringify({
    hasMobileFirstFlow: body.includes('Mobile-first flow'),
    hasNoExtraSwipe: body.includes('No extra swipe needed')
  }, null, 2));
  await browser.close();
})();
