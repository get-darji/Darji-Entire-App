import assert from "node:assert/strict";
import { test } from "node:test";
import { PROTECTED_ADMIN_PHONE, adminInviteRole, nonAdminLoginUpdate } from "../utils/admin-access.js";

test("mobile logins cannot demote the owner or self-grant admin on insert", () => {
  for (const role of ["CUSTOMER", "TAILOR", "DELIVERY_PARTNER"]) {
    const update = nonAdminLoginUpdate(PROTECTED_ADMIN_PHONE, role);
    assert.equal(update.$set, undefined);
    assert.equal(update.$setOnInsert.role, role);
  }
  assert.deepEqual(nonAdminLoginUpdate("9876543210", "CUSTOMER"), {
    $set: { role: "CUSTOMER" }, $setOnInsert: { phone: "9876543210" }
  });
});

test("invites preserve owner and existing super-admin roles", () => {
  assert.equal(adminInviteRole(PROTECTED_ADMIN_PHONE, "CUSTOMER"), "SUPER_ADMIN");
  assert.equal(adminInviteRole("9876543210", "SUPER_ADMIN"), "SUPER_ADMIN");
  assert.equal(adminInviteRole("9876543210"), "ADMIN");
});
