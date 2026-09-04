import { AppError } from "../middleware/error.js";
import { DeliveryPartnerModel } from "../models.js";

export const DELIVERY_LOCATION_MAX_AGE_MS = 5 * 60 * 1000;

type PartnerLocationState = {
  currentLocation?: { coordinates?: unknown } | null;
  lastLocationUpdatedAt?: Date | string | null;
};

export function hasFreshDeliveryLocation(partner: PartnerLocationState | null | undefined, now = Date.now()) {
  const coordinates = partner?.currentLocation?.coordinates;
  const updatedAt = partner?.lastLocationUpdatedAt ? new Date(partner.lastLocationUpdatedAt).getTime() : Number.NaN;
  return Array.isArray(coordinates)
    && coordinates.length === 2
    && coordinates.every((value) => Number.isFinite(Number(value)))
    && Number.isFinite(updatedAt)
    && now - updatedAt <= DELIVERY_LOCATION_MAX_AGE_MS;
}

export function assertFreshDeliveryLocation(partner: PartnerLocationState | null | undefined) {
  if (!hasFreshDeliveryLocation(partner)) {
    throw new AppError(403, "Share your live location before going online or using delivery actions. Turn on precise location and allow background access, then try again.");
  }
}

export function markStaleDeliveryPartnersOffline(now = Date.now()) {
  return DeliveryPartnerModel.updateMany(
    {
      isAvailable: true,
      $or: [
        { lastLocationUpdatedAt: { $exists: false } },
        { lastLocationUpdatedAt: { $lt: new Date(now - DELIVERY_LOCATION_MAX_AGE_MS) } },
        { "currentLocation.coordinates.1": { $exists: false } }
      ]
    },
    { $set: { isAvailable: false } }
  );
}
