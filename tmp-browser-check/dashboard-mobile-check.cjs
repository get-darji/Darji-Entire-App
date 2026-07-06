const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await context.newPage();

  const results = {};

  await page.goto('http://127.0.0.1:3002/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  results.heroPromoRemoved = !(await page.getByText('Mobile-first flow', { exact: false }).count());
  results.heroNoExtraSwipeRemoved = !(await page.getByText('No extra swipe needed', { exact: false }).count());

  await page.goto('http://127.0.0.1:3002/dashboard?support=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  results.dashboardShellWidth = await page.evaluate(() => {
    const shell = document.querySelector('.dashboard-shell');
    return shell ? Math.round(shell.getBoundingClientRect().width) : null;
  });
  results.viewportWidth = await page.evaluate(() => window.innerWidth);
  results.supportVisible = await page.getByText('Contact Support', { exact: false }).count();

  const menuButton = page.getByRole('button', { name: /open navigation menu|open menu/i });
  results.menuButtonVisible = await menuButton.isVisible();
  await menuButton.click();
  await page.waitForTimeout(700);

  results.menuOpened = await page.getByText('Customer Menu', { exact: false }).count();
  results.menuHasOrders = await page.getByRole('button', { name: /open your orders/i }).count();
  await page.getByRole('button', { name: /open your orders/i }).click();
  await page.waitForTimeout(700);
  results.ordersViewVisible = await page.getByText('My Orders', { exact: false }).count();

  await menuButton.click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /open account details/i }).click();
  await page.waitForTimeout(700);
  results.accountVisible = await page.getByText('Account', { exact: false }).count();

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
