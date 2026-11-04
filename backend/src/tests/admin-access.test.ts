import assert from "node:assert/strict";
import { test } from "node:test";
import { OWNER_ADMIN_EMAIL, PROTECTED_ADMIN_PHONE } from "../utils/admin-access.js";
import { normalizeAdminEmail, normalizeAdminPhone } from "../services/admin-access.service.js";

test("owner admin identifiers remain normalized and locked", () => {
  assert.equal(normalizeAdminPhone(`+91 ${PROTECTED_ADMIN_PHONE}`), PROTECTED_ADMIN_PHONE);
  assert.equal(normalizeAdminEmail(OWNER_ADMIN_EMAIL.toUpperCase()), OWNER_ADMIN_EMAIL);
});

test("admin identifiers can be independently normalized", () => {
  assert.equal(normalizeAdminPhone("88823 65282"), "8882365282");
  assert.equal(normalizeAdminPhone("not-a-phone"), "");
  assert.equal(normalizeAdminEmail(" Admin@Example.com "), "admin@example.com");
});
