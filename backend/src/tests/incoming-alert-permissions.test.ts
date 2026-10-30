import assert from "node:assert/strict";
import { test } from "node:test";
import { requiredIncomingAlertPermission } from "../../../shared/src/incoming-alert-permissions.js";

test("reinstalled and existing partner accounts must satisfy current device permissions", () => {
  const granted = { androidApiLevel: 34, notificationsEnabled: true, canDrawOverlays: true, canUseFullScreenIntent: true };
  const check = (nativeState: typeof granted | null, notificationsGranted = true, platform = "android") => requiredIncomingAlertPermission({ platform, notificationsGranted, nativeState });
  assert.equal(check(null), "unavailable");
  assert.equal(check(granted, false), "notifications");
  assert.equal(check({ ...granted, notificationsEnabled: false }), "notifications");
  assert.equal(check({ ...granted, canDrawOverlays: false }), "overlay");
  assert.equal(check({ ...granted, canUseFullScreenIntent: false }), "fullscreen");
  assert.equal(check(granted), null);
  assert.equal(check({ ...granted, androidApiLevel: 33, canUseFullScreenIntent: false }), null);
  assert.equal(check(null, false, "ios"), "notifications");
  assert.equal(check(null, true, "ios"), null);
});
