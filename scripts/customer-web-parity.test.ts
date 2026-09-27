import assert from "node:assert/strict";
import { test } from "node:test";
import { isFinishedOrder, orderStatusLabel, measurementSlots } from "../apps/customer-web/src/features/dashboard/order-state";
import { isLocalBookingHost } from "../apps/customer-web/src/lib/local-booking";
import { GENDER_FIT_OPTIONS, getGarmentsForGender, SERVICE_CATEGORIES } from "../shared/src/cloth-details";
import { webHindi } from "../apps/customer-web/src/features/dashboard/web-hindi";

test("completed paid orders are not mislabeled as confirmed", () => {
  assert.equal(orderStatusLabel({ status: "TAILOR_SELECTED", orderStatus: "completed", paymentStatus: "PAID" }), "Completed");
  assert.equal(isFinishedOrder({ status: "TAILOR_SELECTED", orderStatus: "delivered_to_tailor" }), false);
  assert.equal(isFinishedOrder({ status: "TAILOR_SELECTED", orderStatus: "STITCHING_COMPLETED" }), false);
  assert.equal(isFinishedOrder({ status: "TAILOR_SELECTED", orderStatus: "DELIVERED" }), true);
});

test("web booking uses the complete mobile garment and work catalogue", () => {
  for (const gender of GENDER_FIT_OPTIONS) assert.ok(getGarmentsForGender(gender.value).length > 5);
  assert.equal(SERVICE_CATEGORIES.length, 6);
  assert.ok(SERVICE_CATEGORIES.find((category) => category.label === "New Stitching")?.workItems.includes("Stitch from Fabric"));
  assert.equal(measurementSlots.length, 7);
  assert.equal(measurementSlots[0], "08:00 AM - 10:00 AM");
});

test("Hindi review labels use rate, not price", () => {
  assert.equal(webHindi["Rate your experience"], "अपने अनुभव को रेट करें");
  assert.ok(webHindi["Check payment status"]);
});

test("booking host restrictions remain in place", () => {
  assert.equal(isLocalBookingHost("localhost"), true);
  assert.equal(isLocalBookingHost("www.getdarji.in"), false);
  assert.equal(isLocalBookingHost("localhost.example.com"), false);
});
