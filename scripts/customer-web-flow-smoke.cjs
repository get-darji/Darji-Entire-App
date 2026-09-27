const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const base = process.env.CUSTOMER_WEB_TEST_URL || "http://localhost:3000";
const output = path.join(process.env.TEMP || ".", "darji-web-flow-screenshots");
fs.mkdirSync(output, { recursive: true });
const user = { id: "fixture-customer", name: "Test Customer", phone: "9000000000", role: "CUSTOMER" };
const tailor = { id: "fixture-tailor", shopName: "Test Tailor", rating: 4.7, ratingCount: 8, isAvailable: true, specialization: ["Alteration"], verification: { shop: { shopCity: "Delhi" } } };
const quote = { id: "fixture-quote", requestId: "fixture-order", tailorId: tailor.id, price: 250, estimatedDays: 3, status: "SUBMITTED", tailor, deliveryEstimate: { deliveryFee: 62, oneWayDistanceMeters: 3200 } };
const order = { id: "fixture-order", description: "Test garment needs sleeve adjustment", clothType: "Shirt", workType: "Alteration & Fitting", urgency: "Normal", pickupAddress: "Test address, Delhi 110001", status: "TAILOR_SELECTED", orderStatus: "completed", paymentStatus: "PAID", paymentMethod: "ONLINE", totalAmount: 320, createdAt: "2026-09-27T08:00:00Z", selectedQuote: quote };
const requests = [];
const errors = [];
let mediaUploads = 0;

async function fixture(route) {
  const req = route.request(), url = new URL(req.url());
  if (url.origin === new URL(base).origin && !url.pathname.startsWith("/api/")) return route.continue();
  if (!url.pathname.includes("/api/")) return route.abort();
  const pathname = url.pathname.replace(/^.*\/api/, "");
  requests.push(`${req.method()} ${pathname}`);
  let data = [];
  if (pathname === "/auth/me") data = user;
  else if (pathname === "/auth/request-otp") data = { expiresIn: 300 };
  else if (pathname === "/auth/verify-otp") data = { accessToken: "fixture-access", refreshToken: "fixture-refresh", user };
  else if (pathname === "/tailoring-requests") {
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      assert.ok(body.items[0].selectedWorkItems.includes("Stitch from Fabric"));
      assert.equal(body.items[0].preferredMeasurementSlot, "10:00 AM - 12:00 PM");
      data = { ...order, ...body, id: "fixture-new", status: "QUOTE_REQUESTED", orderStatus: "quote_requested" };
    } else data = [order];
  }
  else if (pathname.endsWith("/quotes")) data = [quote];
  else if (pathname === "/tailors") data = [tailor];
  else if (pathname === "/wallet") data = { balance: 100, transactions: [] };
  else if (pathname === "/addresses") data = [{ id: "fixture-address", label: "Home", address: "Test address, Delhi 110001", city: "Delhi", pincode: "110001", isDefault: true }];
  else if (pathname === "/notifications") data = [{ id: "fixture-notice", title: "Order completed", body: "Your order is complete", createdAt: order.createdAt, data: { orderId: order.id } }];
  else if (pathname === "/reviews/featured") data = [{ id: "fixture-review", name: "Test Customer", rating: 5, review: "Good fit" }];
  else if (pathname === "/notifications/preferences") data = req.postDataJSON();
  else if (pathname === "/reviews") data = { id: "fixture-review", ...req.postDataJSON() };
  else if (pathname.endsWith("/measurement-visit/otp")) data = null;
  else if (pathname.endsWith("/checkout/status")) data = { status: "paid", request: order };
  else if (pathname === "/settings/delivery-fares") data = { normal: { customerCharge: 30 }, express: { customerCharge: 40 }, instant: { customerCharge: 50 } };
  else if (pathname.endsWith("/media")) {
    mediaUploads += 1;
    if (mediaUploads > 1) await new Promise((resolve) => setTimeout(resolve, 650));
    data = [{ url: `${base}/darji-loader-transparent.png`, publicId: `fixture-photo-${mediaUploads}`, resourceType: "image", bytes: 100, originalName: "test.png" }];
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      await context.route("**/*", fixture);
      await context.addInitScript(({ user }) => localStorage.setItem("darji.customer-web.auth.v1", JSON.stringify({ state: { accessToken: "fixture-access", refreshToken: "fixture-refresh", user }, version: 0 })), { user });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}/dashboard`);
      await page.getByRole("button", { name: "Book a Service", exact: true }).waitFor();
      const screens = ["profile", "search", "favoriteTailors", "settings", "appLanguage", "notificationPreferences", "notifications", "coupons", "customerStories", "rateApp", "measurementGuide", "fabricCare", "cancellationPolicy", "faq", "appInfo", "savedAddresses", "editProfile", "wallet", "support", "orders", "orderDetails?order=fixture-order", "trackOrder?order=fixture-order", "newRequest"];
      for (const screen of screens) {
        await page.evaluate((hash) => { location.hash = hash; }, screen);
        await page.waitForTimeout(150);
        assert.ok(await page.locator("main").innerText(), `Blank screen: ${screen}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(overflow <= 2, `Horizontal overflow ${overflow}px: ${screen} at ${viewport.width}`);
      }
      await page.screenshot({ path: path.join(output, `booking-${viewport.width}.png`), fullPage: true });
      await page.locator("textarea").first().fill("Please stitch a shirt from the fabric in this photo.");
      await page.locator('input[type="file"][accept*="image"]').first().setInputFiles({ name: "test.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=", "base64") });
      await page.locator('img[alt="test.png"][src*="darji-loader-transparent"]').waitFor();
      await page.getByRole("button", { name: "Remove media: test.png" }).waitFor();
      await page.getByRole("button", { name: "Remove media: test.png" }).click();
      assert.equal(await page.getByRole("button", { name: "Remove media: test.png" }).count(), 0, "Uploaded media was not removable");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByText("Upload at least one clothing photo or video.", { exact: true }).waitFor();
      await page.locator('input[type="file"][accept*="image"]').first().setInputFiles({ name: "test.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=", "base64") });
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("button", { name: "Men", exact: true }).click();
      await page.getByRole("button", { name: "Shirt", exact: true }).click();
      await page.getByRole("button", { name: "New Stitching", exact: true }).click();
      await page.getByRole("checkbox", { name: "Stitch from Fabric", exact: true }).check();
      await page.getByRole("button", { name: "Normal (up to 7 days)", exact: true }).click();
      await page.getByRole("combobox", { name: "Preferred visit time", exact: true }).selectOption("10:00 AM - 12:00 PM");
      await page.getByRole("button", { name: "Review Order", exact: true }).click();
      await page.getByRole("button", { name: "Get Quotes", exact: true }).click();
      await page.getByRole("button", { name: /Test Tailor/ }).first().click();
      await page.getByRole("button", { name: "Confirm This Tailor", exact: true }).click();
      await page.getByText("Payment Summary", { exact: true }).waitFor();
      await page.screenshot({ path: path.join(output, `checkout-${viewport.width}.png`), fullPage: true });
      await page.reload();
      await page.getByText("Payment Summary", { exact: true }).waitFor();
      await page.evaluate(() => { location.hash = "search"; });
      await page.getByRole("button", { name: "Save tailor", exact: true }).click();
      await page.evaluate(() => { location.hash = "favoriteTailors"; });
      await page.getByRole("heading", { name: "Test Tailor", exact: true }).waitFor();
      await page.evaluate(() => { location.hash = "rateApp"; });
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByRole("textbox", { name: "Your review", exact: true }).fill("Test review");
      await page.getByRole("button", { name: "Submit review", exact: true }).click();
      await page.getByText("Thank you for your review", { exact: true }).waitFor();
      await page.evaluate(() => { location.hash = "appLanguage"; });
      await page.getByRole("button", { name: "हिं", exact: true }).last().click();
      await page.getByRole("heading", { name: "ऐप की भाषा", exact: true }).waitFor();
      await page.evaluate(() => { location.hash = "profile"; });
      await page.screenshot({ path: path.join(output, `profile-hindi-${viewport.width}.png`), fullPage: true });
      assert.equal(requests.some((request) => request.includes("/translation/")), false, "Static labels called translation API");
      await context.close();
    }
    assert.deepEqual(errors, [], "Browser runtime errors");
    console.log(JSON.stringify({ passed: true, viewports: [1440, 390], screens: 23, bookingThroughCheckout: true, draftRestored: true, screenshots: output, fixtureRequests: requests.length }));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
