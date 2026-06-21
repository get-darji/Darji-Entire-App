import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type DarjiApp = "customer" | "tailor" | "delivery";

export const CHANNEL_IDS = {
  customer: {
    orders: "customer-orders-v2",
    payments: "customer-payments-v2",
    offers: "customer-offers-v2"
  },
  tailor: {
    requests: "tailor-new-requests-v2",
    pickup: "tailor-pickup-updates-v2"
  },
  delivery: {
    pickup: "delivery-pickup-assigned-v2",
    updates: "delivery-updates-v2"
  }
} as const;

const channelNames: Record<string, string> = {
  "customer-orders-v2": "Orders",
  "customer-payments-v2": "Payments",
  "customer-offers-v2": "Offers",
  "tailor-new-requests-v2": "New Requests",
  "tailor-pickup-updates-v2": "Pickup Updates",
  "delivery-pickup-assigned-v2": "Pickup Assigned",
  "delivery-updates-v2": "Delivery Updates"
};

const appChannels: Record<DarjiApp, string[]> = {
  customer: Object.values(CHANNEL_IDS.customer),
  tailor: Object.values(CHANNEL_IDS.tailor),
  delivery: Object.values(CHANNEL_IDS.delivery)
};

export async function configureNotificationChannels(app: DarjiApp) {
  if (Platform.OS !== "android") return;

  await Promise.all(
    appChannels[app].map((channelId) =>
      Notifications.setNotificationChannelAsync(channelId, {
        name: channelNames[channelId],
        description: `Darji ${channelNames[channelId].toLowerCase()} notifications`,
        importance: Notifications.AndroidImportance.MAX,
        sound: "ding.mp3",
        enableVibrate: true,
        vibrationPattern: [0, 350, 120, 350],
        enableLights: true,
        lightColor: "#F98A04",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false
      })
    )
  );

  await Notifications.setNotificationChannelAsync("darji-alerts-v2", {
    name: "Darji Alerts",
    importance: Notifications.AndroidImportance.MAX,
    sound: "ding.mp3",
    enableVibrate: true,
    vibrationPattern: [0, 350, 120, 350],
    enableLights: true,
    lightColor: "#F98A04",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
  });
}
