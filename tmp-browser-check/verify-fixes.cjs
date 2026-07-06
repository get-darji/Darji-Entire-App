const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const results = [];

  await desktop.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
  const loaderVisible = await desktop.locator('#loader').isVisible().catch(() => false);
  results.push(`desktop_loader_visible=${loaderVisible}`);
  await desktop.waitForTimeout(2600);
  const loaderGone = !(await desktop.locator('#loader').isVisible().catch(() => false));
  results.push(`desktop_loader_hides=${loaderGone}`);

  const mobile = await browser.newPage(devices['iPhone 14']);
  await mobile.goto('http://localhost:3002/dashboard', { waitUntil: 'networkidle' });
  const menuButton = mobile.getByRole('button', { name: /open navigation menu|close navigation menu/i });
  const hasMenu = await menuButton.count().then((n) => n > 0).catch(() => false);
  results.push(`mobile_menu_present=${hasMenu}`);

  if (hasMenu) {
    await menuButton.click();
    await mobile.waitForTimeout(800);
    const panel = mobile.locator('#staggered-menu-panel');
    const box = await panel.boundingBox();
    results.push(`mobile_menu_box=${box ? `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}` : 'null'}`);
    const closeButton = mobile.getByRole('button', { name: /close navigation menu/i }).last();
    if (await closeButton.count()) {
      await closeButton.click();
      await mobile.waitForTimeout(400);
    }
  }

  const bodyText = await mobile.locator('body').innerText();
  results.push(`dashboard_body_has_auth=${/Enter your phone number/i.test(bodyText)}`);

  console.log(results.join('\n'));
  await browser.close();
})();
