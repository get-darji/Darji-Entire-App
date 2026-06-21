import * as Notifications from "expo-notifications";
import type { DarjiApp } from "./channels";

export const NOTIFICATION_CATEGORIES = {
  generic: "DARJI_ORDER",
  customerCompleted: "CUSTOMER_ORDER_COMPLETED",
  tailorRequest: "TAILOR_NEW_REQUEST",
  tailorQuoteAccepted: "TAILOR_QUOTE_ACCEPTED",
  deliveryPickup: "DELIVERY_PICKUP_REQUEST"
} as const;

export async function configureNotificationActions(app: DarjiApp) {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.generic, [
    { identifier: "VIEW", buttonTitle: "View", options: { opensAppToForeground: true } }
  ]);

  if (app === "customer") {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.customerCompleted, [
      { identifier: "VIEW_ORDER", buttonTitle: "View Order", options: { opensAppToForeground: true } }
    ]);
  }

  if (app === "tailor") {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.tailorRequest, [
      { identifier: "SEND_QUOTE", buttonTitle: "Send Quote", options: { opensAppToForeground: true } },
      { identifier: "VIEW_DETAILS", buttonTitle: "View Details", options: { opensAppToForeground: true } }
    ]);
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.tailorQuoteAccepted, [
      { identifier: "VIEW_QUOTE", buttonTitle: "View Quote", options: { opensAppToForeground: true } }
    ]);
  }

  if (app === "delivery") {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.deliveryPickup, [
      { identifier: "ACCEPT", buttonTitle: "Accept", options: { opensAppToForeground: true } },
      { identifier: "VIEW_DETAILS", buttonTitle: "View Details", options: { opensAppToForeground: true } }
    ]);
  }
}
