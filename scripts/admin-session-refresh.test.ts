import assert from "node:assert/strict";
import { test } from "node:test";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { api, restoreAdminSession } from "../apps/admin-panel/src/lib/api";
import { useAdminStore } from "../apps/admin-panel/src/store/admin-store";

function failure(config: InternalAxiosRequestConfig, status: number) {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, {
    status, statusText: "Error", headers: {}, config, data: { message: "Session expired" }
  });
}

test("concurrent restoration uses one refresh request", async () => {
  const original = axios.defaults.adapter;
  let calls = 0;
  useAdminStore.getState().setToken("old");
  axios.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, "/api/auth/refresh");
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { status: 200, statusText: "OK", config, headers: {}, data: { data: { accessToken: "renewed" } } };
  };
  try {
    const tokens = await Promise.all([restoreAdminSession(), restoreAdminSession(), restoreAdminSession()]);
    assert.deepEqual(tokens, ["renewed", "renewed", "renewed"]);
    assert.equal(calls, 1);
  } finally { axios.defaults.adapter = original; }
});

test("refresh outages retain session; revoked refresh clears it", async () => {
  const original = axios.defaults.adapter;
  const originalApi = api.defaults.adapter;
  api.defaults.adapter = async (config) => { throw failure(config, 401); };
  try {
    for (const status of [503, 429, 401]) {
      useAdminStore.getState().setToken("old");
      axios.defaults.adapter = async (config) => { throw failure(config, status); };
      await assert.rejects(api.get("/orders"));
      assert.equal(useAdminStore.getState().token, status === 401 ? null : "old");
    }
  } finally { axios.defaults.adapter = original; api.defaults.adapter = originalApi; }
});

test("OTP validation errors do not invalidate the current session", async () => {
  const original = api.defaults.adapter;
  useAdminStore.getState().setToken("current");
  api.defaults.adapter = async (config) => {
    assert.equal(config.baseURL, "/api");
    throw failure(config, 401);
  };
  try {
    await assert.rejects(api.post("/auth/verify-otp", {}));
    assert.equal(useAdminStore.getState().token, "current");
  } finally { api.defaults.adapter = original; }
});
