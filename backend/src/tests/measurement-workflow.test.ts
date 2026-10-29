import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasHomeMeasurementRequest,
  isExclusiveStitchingTailorOffer,
  isOriginalStitchingTailorPoolOffer,
  measurementPoolNotificationExclusions,
  mayStartTailoring,
  measurementOfferExpiresAt,
  measurementVisitAssignableStatuses,
  shouldNotifyMeasurementPoolTailor,
  MEASUREMENT_OFFER_WINDOW_MS
} from "../utils/measurement-workflow.js";

test("measurement offers reserve the first sixty seconds for the selected tailor", () => {
  const now = new Date("2026-10-26T10:00:00.000Z");
  assert.equal(measurementOfferExpiresAt(now).getTime() - now.getTime(), MEASUREMENT_OFFER_WINDOW_MS);
});

test("the selected stitching tailor can act on the exclusive offer without pooled-visit eligibility", () => {
  const visit = {
    status: "OFFERED_TO_STITCHING_TAILOR",
    stitchingTailorId: "tailor-a",
    offeredTailorId: "tailor-a",
    declinedTailorIds: []
  };
  assert.equal(isExclusiveStitchingTailorOffer(visit, ["tailor-a"]), true);
  assert.equal(isExclusiveStitchingTailorOffer({ ...visit, status: "POOL" }, ["tailor-a"]), false);
  assert.equal(isExclusiveStitchingTailorOffer({ ...visit, declinedTailorIds: ["tailor-a"] }, ["tailor-a"]), false);
  assert.equal(isExclusiveStitchingTailorOffer(visit, ["tailor-b"]), false);
});

test("the original stitching tailor keeps access after pool release without a second broadcast alert", () => {
  const pooledVisit = {
    status: "POOL",
    stitchingTailorId: "tailor-a",
    declinedTailorIds: ["tailor-b"]
  };
  assert.equal(isOriginalStitchingTailorPoolOffer(pooledVisit, ["tailor-a"]), true);
  assert.equal(isOriginalStitchingTailorPoolOffer(pooledVisit, ["tailor-b"]), false);
  assert.equal(isOriginalStitchingTailorPoolOffer({ ...pooledVisit, declinedTailorIds: ["tailor-a"] }, ["tailor-a"]), false);

  assert.deepEqual(measurementPoolNotificationExclusions(pooledVisit), ["tailor-a", "tailor-b"]);
  assert.equal(shouldNotifyMeasurementPoolTailor("tailor-a", pooledVisit), false);
  assert.equal(shouldNotifyMeasurementPoolTailor("tailor-b", pooledVisit), false);
  assert.equal(shouldNotifyMeasurementPoolTailor("tailor-c", pooledVisit), true);
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
