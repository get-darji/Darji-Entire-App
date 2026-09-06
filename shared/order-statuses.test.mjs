import assert from "node:assert/strict";
import { allowedOrderStatusTransitions, orderStatuses } from "./dist/order-statuses.js";
import { calculateCouponDiscount } from "./dist/index.js";

for (const status of orderStatuses) {
  const next = allowedOrderStatusTransitions(status);
  assert.ok(Array.isArray(next), `${status} must have a transition list`);
  for (const candidate of next) assert.ok(orderStatuses.includes(candidate), `${candidate} must be canonical`);
}

assert.deepEqual(allowedOrderStatusTransitions("ORDER_PLACED"), ["PICKUP_ASSIGNED", "CANCELLED"]);
assert.deepEqual(allowedOrderStatusTransitions("READY"), ["OUT_FOR_DELIVERY", "CANCELLED"]);
assert.deepEqual(allowedOrderStatusTransitions("DELIVERED"), []);
assert.deepEqual(allowedOrderStatusTransitions("UNKNOWN"), []);
assert.equal(calculateCouponDiscount({ discountType: "PERCENTAGE", discountValue: 12.5 }, 199), 24.88);
assert.equal(calculateCouponDiscount({ discountType: "PERCENTAGE", discountValue: 50, maxDiscount: 30 }, 100), 30);
assert.equal(calculateCouponDiscount({ discountType: "FLAT", discountValue: 500 }, 125), 125);

console.log("order-status transition tests passed");
