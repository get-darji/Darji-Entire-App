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
