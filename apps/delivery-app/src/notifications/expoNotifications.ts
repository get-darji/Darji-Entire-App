import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getDevicePushTokenAsync as getDevicePushTokenAsyncUnsafe } from "expo-notifications/build/getDevicePushTokenAsync";
import type { DevicePushToken, ExpoPushToken, ExpoPushTokenOptions } from "expo-notifications/build/Tokens.types";

export const getDevicePushTokenAsync = getDevicePushTokenAsyncUnsafe;

export async function getExpoPushTokenAsync(options: ExpoPushTokenOptions = {}): Promise<ExpoPushToken> {
  const devicePushToken = options.devicePushToken || (await getDevicePushTokenAsyncUnsafe());
  const projectId = options.projectId || Constants.easConfig?.projectId || (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
  const applicationId = options.applicationId || Application.applicationId;
  if (!projectId) throw new Error('No "projectId" found for Expo push token registration.');
  if (!applicationId) throw new Error('No "applicationId" found for Expo push token registration.');

  const development = options.development ?? (Platform.OS === "ios" ? (await getIosDevelopmentPushEnvironment()) : false);
  const response = await fetch(options.url ?? `${options.baseUrl ?? "https://exp.host/--/api/v2/"}push/getExpoPushToken`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: options.type || getTypeOfToken(devicePushToken),
      deviceId: (options.deviceId || installationId()).toLowerCase(),
      development,
      appId: applicationId,
      deviceToken: typeof devicePushToken.data === "string" ? devicePushToken.data : JSON.stringify(devicePushToken.data),
      projectId
    })
  });
  const payload = await response.json();
  const token = payload?.data?.expoPushToken;
  if (!response.ok || typeof token !== "string") throw new Error("Expo push token registration failed.");
  return { type: "expo", data: token };
}

async function getIosDevelopmentPushEnvironment() {
  try {
    return (await Application.getIosPushNotificationServiceEnvironmentAsync()) === "development";
  } catch {
    return false;
  }
}

function installationId() {
  return Constants.installationId ?? Constants.sessionId ?? `${Application.applicationId ?? "darzi"}-${Platform.OS}`;
}

function getTypeOfToken(devicePushToken: DevicePushToken) {
  if (devicePushToken.type === "ios") return "apns";
  if (devicePushToken.type === "android") return "fcm";
  return devicePushToken.type;
}

export { getPermissionsAsync, requestPermissionsAsync } from "expo-notifications/build/NotificationPermissions";
export { setBadgeCountAsync } from "expo-notifications/build/setBadgeCountAsync";
export { setNotificationCategoryAsync } from "expo-notifications/build/setNotificationCategoryAsync";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
export {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync
} from "expo-notifications/build/NotificationsEmitter";
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications/build/NotificationChannelManager.types";
export { AndroidNotificationPriority, PermissionStatus } from "expo-notifications/build/Notifications.types";
export type { DevicePushToken } from "expo-notifications/build/Tokens.types";
export type { Notification, NotificationResponse } from "expo-notifications/build/Notifications.types";
