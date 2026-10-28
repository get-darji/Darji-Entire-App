import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasHomeMeasurementRequest,
  mayStartTailoring,
  measurementOfferExpiresAt,
  measurementVisitAssignableStatuses,
  MEASUREMENT_OFFER_WINDOW_MS
} from "../utils/measurement-workflow.js";

test("measurement offers reserve the first sixty seconds for the selected tailor", () => {
  const now = new Date("2026-10-26T10:00:00.000Z");
  assert.equal(measurementOfferExpiresAt(now).getTime() - now.getTime(), MEASUREMENT_OFFER_WINDOW_MS);
});

test("home measurement is detected at request and item level", () => {
  assert.equal(hasHomeMeasurementRequest({ homeMeasurementBooked: true }), true);
  assert.equal(hasHomeMeasurementRequest({ items: [{ homeMeasurementBooked: true }] }), true);
  assert.equal(hasHomeMeasurementRequest({ items: [{ homeMeasurementBooked: false }] }), false);
});

test("tailoring requires submitted measurements unless admin bypass is active", () => {
  const request = { homeMeasurementBooked: true };
  assert.equal(mayStartTailoring(request, "ACCEPTED"), false);
  assert.equal(mayStartTailoring(request, "SUBMITTED"), true);
  assert.equal(mayStartTailoring({ ...request, allowTailoringWithoutMeasurementVisit: true }, "POOL"), true);
  assert.equal(mayStartTailoring({ homeMeasurementBooked: false }, undefined), true);
});

test("tailor acceptance cannot overwrite a visit already accepted by someone else", () => {
  assert.deepEqual(measurementVisitAssignableStatuses(), ["OFFERED_TO_STITCHING_TAILOR", "POOL"]);
  assert.deepEqual(measurementVisitAssignableStatuses(true), ["OFFERED_TO_STITCHING_TAILOR", "POOL", "ACCEPTED", "IN_PROGRESS"]);
});
