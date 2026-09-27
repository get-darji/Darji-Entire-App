import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../apps/admin-panel/app/api/auth/[action]/route";
import { isLocalBookingHost } from "../apps/customer-web/src/lib/local-booking";

test("booking host guard accepts loopback only", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]", "::1"]) assert.equal(isLocalBookingHost(host), true);
  for (const host of ["getdarji.in", "localhost.evil.com", "192.168.1.2", ""]) assert.equal(isLocalBookingHost(host), false);
});

test("admin proxy forwards refresh cookie without unrelated cookies", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/auth\/refresh$/);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("cookie")?.trim(), "darzi_admin_refresh=test-refresh");
    assert.equal(init?.cache, "no-store");
    return new Response(JSON.stringify({ data: { accessToken: "test-access" } }), {
      headers: { "Set-Cookie": "darzi_admin_refresh=renewed; Path=/api/auth; HttpOnly; Secure; SameSite=None" }
    });
  };
  try {
    const response = await POST(new NextRequest("https://admin.example/api/auth/refresh", {
      method: "POST", headers: { origin: "https://admin.example", cookie: "unrelated=private; darzi_admin_refresh=test-refresh" }, body: "{}"
    }), { params: Promise.resolve({ action: "refresh" }) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).data.accessToken, "test-access");
  } finally { globalThis.fetch = original; }
});

test("admin proxy rejects foreign origins and unknown actions", async () => {
  const response = await POST(new NextRequest("https://admin.example/api/auth/refresh", {
    method: "POST", headers: { origin: "https://other.example" }, body: "{}"
  }), { params: Promise.resolve({ action: "refresh" }) });
  assert.equal(response.status, 403);
  const missing = await POST(new NextRequest("https://admin.example/api/auth/delete", { method: "POST" }), { params: Promise.resolve({ action: "delete" }) });
  assert.equal(missing.status, 404);
});

test("admin proxy reports outages as temporary, not unauthorized", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const response = await POST(new NextRequest("https://admin.example/api/auth/refresh", { method: "POST", body: "{}" }), { params: Promise.resolve({ action: "refresh" }) });
    assert.equal(response.status, 503);
  } finally { globalThis.fetch = original; }
});
