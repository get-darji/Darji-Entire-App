const { test, expect, devices } = require('playwright/test');
const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'tmp-playwright-output');
fs.mkdirSync(outDir, { recursive: true });
const results = { mobile: {}, desktop: {}, errors: [] };

async function waitForLanding(page) {
  await page.goto('http://127.0.0.1:3002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200);
}

test('customer web mobile and desktop checks', async ({ browser }) => {
  const mobileContext = await browser.newContext({ ...devices['iPhone 13'] });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on('pageerror', (error) => results.errors.push(`mobile pageerror: ${error.message}`));
  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') results.errors.push(`mobile console: ${msg.text()}`);
  });

  await waitForLanding(mobilePage);
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-home.png'), fullPage: true });
  results.mobile.initial = await mobilePage.evaluate(() => {
    const hero = document.querySelector('.hero-shell');
    const videoSection = Array.from(document.querySelectorAll('section')).find((section) => section.querySelector('video'));
    const videoFrame = videoSection?.querySelector('div[style*="scale"]');
    return {
      viewportHeight: window.innerHeight,
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
      videoSectionHeight: videoSection ? Math.round(videoSection.getBoundingClientRect().height) : null,
      videoFrameHeight: videoFrame ? Math.round(videoFrame.getBoundingClientRect().height) : null,
      scrollHeight: document.documentElement.scrollHeight
    };
  });

  await mobilePage.getByRole('link', { name: /View Services/i }).click();
  await mobilePage.waitForTimeout(700);
  results.mobile.servicesAnchor = await mobilePage.evaluate(() => {
    const section = document.getElementById('services');
    return section ? Math.round(section.getBoundingClientRect().top) : null;
  });

  await mobilePage.locator('video').scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-video.png'), fullPage: true });
  await mobilePage.getByRole('button', { name: /video sound|mute video/i }).click();
  results.mobile.videoUnmuted = await mobilePage.locator('video').evaluate((video) => !video.muted);

  const faqButton = mobilePage.locator('#faq button').first();
  await faqButton.scrollIntoViewIfNeeded();
  await faqButton.click();
  await mobilePage.waitForTimeout(400);
  results.mobile.faqExpanded = await mobilePage.locator('#faq').textContent();

  await mobilePage.getByRole('link', { name: /Contact Support/i }).click();
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(800);
  results.mobile.contactSupportUrl = mobilePage.url();
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-dashboard.png'), fullPage: true });

  await waitForLanding(mobilePage);
  await mobilePage.getByRole('link', { name: /Google Play/i }).click();
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(500);
  results.mobile.storeButtonUrl = mobilePage.url();

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const desktopPage = await desktopContext.newPage();
  desktopPage.on('pageerror', (error) => results.errors.push(`desktop pageerror: ${error.message}`));
  desktopPage.on('console', (msg) => {
    if (msg.type() === 'error') results.errors.push(`desktop console: ${msg.text()}`);
  });

  await waitForLanding(desktopPage);
  await desktopPage.screenshot({ path: path.join(outDir, 'desktop-home.png'), fullPage: true });
  await desktopPage.getByRole('link', { name: /How It Works/i }).click();
  await desktopPage.waitForTimeout(700);
  results.desktop.howAnchor = await desktopPage.evaluate(() => {
    const section = document.getElementById('how');
    return section ? Math.round(section.getBoundingClientRect().top) : null;
  });

  await desktopPage.getByRole('link', { name: /Book Pickup Now/i }).click();
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.waitForTimeout(500);
  results.desktop.bookPickupUrl = desktopPage.url();

  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log('PLAYWRIGHT_RESULTS ' + JSON.stringify(results));

  await mobileContext.close();
  await desktopContext.close();
  expect(results.mobile.videoUnmuted).toBeTruthy();
  expect(results.mobile.contactSupportUrl).toContain('/dashboard?support=1');
  expect(results.desktop.bookPickupUrl).toContain('/dashboard');
});
