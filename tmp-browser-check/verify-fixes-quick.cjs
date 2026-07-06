const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.setDefaultTimeout(10000);
  await desktop.goto('http://localhost:3002', { waitUntil: 'domcontentloaded', timeout: 10000 });
  const loaderVisible = await desktop.locator('#loader').isVisible().catch(() => false);
  await desktop.waitForTimeout(2800);
  const loaderVisibleAfter = await desktop.locator('#loader').isVisible().catch(() => false);
  results.push(`desktop_loader_visible_initial=${loaderVisible}`);
  results.push(`desktop_loader_visible_after=${loaderVisibleAfter}`);

  const mobile = await browser.newPage(devices['iPhone 14']);
  mobile.setDefaultTimeout(7000);
  await mobile.goto('http://localhost:3002/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await mobile.waitForTimeout(1500);
  const menuButton = mobile.getByRole('button', { name: /open navigation menu|close navigation menu/i });
  const menuCount = await menuButton.count();
  results.push(`mobile_menu_count=${menuCount}`);
  if (menuCount > 0) {
    await menuButton.first().click();
    await mobile.waitForTimeout(900);
    const panel = mobile.locator('#staggered-menu-panel');
    const box = await panel.boundingBox();
    const viewport = mobile.viewportSize();
    results.push(`mobile_panel_box=${box ? `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}` : 'null'}`);
    results.push(`mobile_viewport=${viewport ? `${viewport.width},${viewport.height}` : 'null'}`);
  }

  console.log(results.join('\n'));
  await browser.close();
})();
