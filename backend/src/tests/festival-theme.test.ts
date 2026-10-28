import assert from "node:assert/strict";
import { test } from "node:test";
import { festivalGreeting, festivalThemeSchema, festivalThemeState } from "@darji/shared";

const base = {
  themeId: "diwali",
  enabled: true,
  title: "Diwali Darji Edition",
  greetingTemplate: "Happy Diwali, {firstName}!",
  timezone: "Asia/Kolkata" as const,
  assetVersion: "diwali-v1",
  palette: { page: "#FFF9EE", hero: "#2C1708", accent: "#F6A500", fabric: "#6B1016" }
};

test("festival theme resolves inactive, scheduled, active, and expired states at schedule boundaries", () => {
  const now = new Date("2026-11-08T12:00:00.000Z");
  assert.equal(festivalThemeState({ ...base, enabled: false }, now).status, "Inactive");
  assert.equal(festivalThemeState({ ...base, startAt: "2026-11-09T00:00:00.000Z" }, now).status, "Scheduled");
  assert.equal(festivalThemeState({ ...base, startAt: "2026-11-08T11:59:59.000Z", endAt: "2026-11-08T12:00:01.000Z" }, now).status, "Active");
  assert.equal(festivalThemeState({ ...base, endAt: "2026-11-08T12:00:00.000Z" }, now).status, "Expired");
});

test("festival schedule rejects an end time that is not after its start time", () => {
  const result = festivalThemeSchema.safeParse({ ...base, startAt: "2026-11-08T12:00:00.000Z", endAt: "2026-11-08T12:00:00.000Z" });
  assert.equal(result.success, false);
});

test("festival greeting keeps the live customer's first name", () => {
  const config = festivalThemeSchema.parse(base);
  assert.equal(festivalGreeting(config, "Aman Kumar"), "Happy Diwali, Aman!");
});
