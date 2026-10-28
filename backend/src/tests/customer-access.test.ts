import assert from "node:assert/strict";
import { test } from "node:test";
import { tailoringRequestCustomerFilter } from "../utils/customer-access.js";

test("customer sessions use their authenticated identity even when the stored primary role differs", () => {
  assert.deepEqual(tailoringRequestCustomerFilter("CUSTOMER", "user-1"), {
    _id: "user-1"
  });
});

test("administrative create-on-behalf requests still require a persisted customer role", () => {
  assert.deepEqual(tailoringRequestCustomerFilter("ADMIN", "user-2"), {
    _id: "user-2",
    role: "CUSTOMER"
  });
  assert.deepEqual(tailoringRequestCustomerFilter("SUPER_ADMIN", "user-3"), {
    _id: "user-3",
    role: "CUSTOMER"
  });
});
