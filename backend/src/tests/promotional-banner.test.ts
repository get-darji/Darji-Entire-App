import assert from "node:assert/strict";
import test from "node:test";
import { validatePromotionalBannerImage } from "../controllers/promotional-banner.controller.js";

function png(width: number, height: number, size = 24) {
  const buffer = Buffer.alloc(size);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

test("accepts PNG banners with the recommended landscape ratio", () => {
  assert.deepEqual(validatePromotionalBannerImage(png(1500, 600), "image/png"), { format: "png", width: 1500, height: 600 });
});

test("rejects files larger than 2 MB", () => {
  assert.throws(() => validatePromotionalBannerImage(png(1500, 600, 2 * 1024 * 1024 + 1), "image/png"), /2 MB or smaller/);
});

test("rejects unsupported or mismatched image types", () => {
  assert.throws(() => validatePromotionalBannerImage(png(1500, 600), "image/gif"), /PNG, JPG, JPEG, or WebP/);
  assert.throws(() => validatePromotionalBannerImage(Buffer.from("not an image"), "image/png"), /valid image/);
});

test("rejects undersized and incorrectly proportioned images", () => {
  assert.throws(() => validatePromotionalBannerImage(png(900, 360), "image/png"), /Minimum image size/);
  assert.throws(() => validatePromotionalBannerImage(png(1200, 800), "image/png"), /ratio must be close/);
});
