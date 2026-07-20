import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

export async function registerPushToken(token: string, app: string) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("darzi-high-priority", {
      name: "Darzi Tailor Alerts",
      description: "New requests, accepted quotes and delivery handoff alerts",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 350, 120, 350],
      lightColor: "#F98A04",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    });
  }
  await Notifications.setNotificationCategoryAsync("DARZI_ORDER", [
    { identifier: "VIEW_ORDER", buttonTitle: "View Order", options: { opensAppToForeground: true } }
  ]);

  const permission = await Notifications.getPermissionsAsync();
  const finalPermission = permission.status === Notifications.PermissionStatus.GRANTED ? permission : await Notifications.requestPermissionsAsync();
  if (finalPermission.status !== Notifications.PermissionStatus.GRANTED) return;

  const nativeToken = await Notifications.getDevicePushTokenAsync();
  await api("/notifications/fcm-token", {
    method: "POST",
    body: JSON.stringify({
      token: String(nativeToken.data),
      platform: Platform.OS,
      app: Constants.expoConfig?.slug ?? app
    })
  }, token);
}
