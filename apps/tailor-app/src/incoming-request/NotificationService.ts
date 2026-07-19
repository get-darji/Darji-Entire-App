import notifee, { AndroidCategory, AndroidImportance, AndroidVisibility } from "@notifee/react-native";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const INCOMING_REQUEST_CHANNEL_ID = "darji-incoming-requests-v1";

export async function configureIncomingRequestNotifications() {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: INCOMING_REQUEST_CHANNEL_ID,
    name: "Incoming Requests",
    sound: "requests",
    vibration: true,
    vibrationPattern: [0, 600, 250, 600, 250, 600],
    lights: true,
    lightColor: "#F98A04",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC
  });
  await Notifications.setNotificationChannelAsync(INCOMING_REQUEST_CHANNEL_ID, {
    name: "Incoming Requests",
    description: "Full-screen pickup and delivery assignment alerts",
    importance: Notifications.AndroidImportance.MAX,
    sound: "requests.mp3",
    enableVibrate: true,
    vibrationPattern: [0, 600, 250, 600, 250, 600],
    enableLights: true,
    lightColor: "#F98A04",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false
  });
}

export async function displayIncomingRequestNotification({
  title,
  body,
  data
}: {
  title: string;
  body: string;
  data: Record<string, string>;
}) {
  if (Platform.OS !== "android") return;
  await configureIncomingRequestNotifications();
  await notifee.displayNotification({
    title,
    body,
    data,
    android: {
      channelId: INCOMING_REQUEST_CHANNEL_ID,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: { id: "default", launchActivity: "default" },
      fullScreenAction: { id: "default", launchActivity: "default" },
      sound: "requests",
      vibrationPattern: [0, 600, 250, 600, 250, 600],
      autoCancel: false,
      ongoing: true,
      loopSound: true,
      actions: [
        { title: "Accept", pressAction: { id: "ACCEPT", launchActivity: "default" } },
        { title: "Reject", pressAction: { id: "DECLINE", launchActivity: "default" } }
      ]
    }
  });
}
