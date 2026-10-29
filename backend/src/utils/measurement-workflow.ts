export const MEASUREMENT_OFFER_WINDOW_MS = 60_000;

type MeasurementItem = { homeMeasurementBooked?: boolean | null } | null | undefined;

export type MeasurementControlledRequest = {
  homeMeasurementBooked?: boolean | null;
  items?: MeasurementItem[] | null;
  allowTailoringWithoutMeasurementVisit?: boolean | null;
};

export function hasHomeMeasurementRequest(request: MeasurementControlledRequest) {
  return Boolean(
    request.homeMeasurementBooked
      || request.items?.some((item) => item?.homeMeasurementBooked)
  );
}

export function mayStartTailoring(
  request: MeasurementControlledRequest,
  measurementVisitStatus?: string | null
) {
  return !hasHomeMeasurementRequest(request)
    || Boolean(request.allowTailoringWithoutMeasurementVisit)
    || measurementVisitStatus === "SUBMITTED";
}

export function measurementOfferExpiresAt(now = new Date()) {
  return new Date(now.getTime() + MEASUREMENT_OFFER_WINDOW_MS);
}

export function measurementVisitAssignableStatuses(allowReassignment = false) {
  return allowReassignment
    ? ["OFFERED_TO_STITCHING_TAILOR", "POOL", "ACCEPTED", "IN_PROGRESS"] as const
    : ["OFFERED_TO_STITCHING_TAILOR", "POOL"] as const;
}

export function isExclusiveStitchingTailorOffer(
  visit: { status?: string | null; stitchingTailorId?: unknown; offeredTailorId?: unknown; declinedTailorIds?: unknown[] | null },
  tailorReferences: string[]
) {
  const declinedTailorIds = (visit.declinedTailorIds ?? []).map(String);
  return visit.status === "OFFERED_TO_STITCHING_TAILOR"
    && tailorReferences.includes(String(visit.stitchingTailorId ?? ""))
    && tailorReferences.includes(String(visit.offeredTailorId ?? ""))
    && !tailorReferences.some((id) => declinedTailorIds.includes(id));
}

export function isOriginalStitchingTailorPoolOffer(
  visit: { status?: string | null; stitchingTailorId?: unknown; declinedTailorIds?: unknown[] | null },
  tailorReferences: string[]
) {
  const declinedTailorIds = (visit.declinedTailorIds ?? []).map(String);
  return visit.status === "POOL"
    && tailorReferences.includes(String(visit.stitchingTailorId ?? ""))
    && !tailorReferences.some((id) => declinedTailorIds.includes(id));
}

export function measurementPoolNotificationExclusions(visit: { stitchingTailorId?: unknown; declinedTailorIds?: unknown[] | null }) {
  return [...new Set([visit.stitchingTailorId, ...(visit.declinedTailorIds ?? [])]
    .filter((id) => id !== undefined && id !== null && String(id).length > 0)
    .map(String))];
}

export function shouldNotifyMeasurementPoolTailor(
  tailorId: string,
  visit: { stitchingTailorId?: unknown; declinedTailorIds?: unknown[] | null }
) {
  return !measurementPoolNotificationExclusions(visit).includes(String(tailorId));
}
