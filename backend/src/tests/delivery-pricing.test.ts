import assert from "node:assert/strict";
import { test } from "node:test";
import { extractTailorShopPoint } from "../services/delivery-pricing.service.js";

test("home-based tailor uses the saved personal location for delivery distance", () => {
  const location = { lat: 28.6139, lng: 77.209 };
  assert.deepEqual(extractTailorShopPoint({
    verification: { shop: { workFromHome: true, shopAddress: "Delhi 110001" }, personal: { location } }
  }), location);
});

test("shop location takes precedence and personal location is not used for a separate shop", () => {
  const home = { lat: 28.6139, lng: 77.209 };
  const shop = { lat: 28.7041, lng: 77.1025 };
  assert.deepEqual(extractTailorShopPoint({
    verification: { shop: { workFromHome: true, location: shop }, personal: { location: home } }
  }), shop);
  assert.equal(extractTailorShopPoint({
    verification: { shop: { workFromHome: false }, personal: { location: home } }
  }), undefined);
});
