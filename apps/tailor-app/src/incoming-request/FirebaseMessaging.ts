import messaging, { type FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { displayIncomingRequestNotification, INCOMING_REQUEST_CHANNEL_ID } from "./NotificationService";

export function isIncomingRequestData(data: Record<string, unknown>) {
  const type = String(data.type ?? data.event ?? data.notificationType ?? "");
  return /incoming|new_request|assignment|delivery_batch_ready|delivery:task_created|tailoring:request_created/i.test(type);
}

export async function showIncomingRequestNotification(title: string, body: string, data: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: "requests.mp3",
      priority: Notifications.AndroidNotificationPriority.MAX
    },
    trigger: { channelId: INCOMING_REQUEST_CHANNEL_ID, seconds: 1 }
  });
}

function stringData(data?: FirebaseMessagingTypes.RemoteMessage["data"]) {
  return Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [key, String(value)]));
}

async function displayRemoteMessage(message: FirebaseMessagingTypes.RemoteMessage) {
  const data = stringData(message.data);
  if (!isIncomingRequestData(data)) return;
  await displayIncomingRequestNotification({
    title: message.notification?.title ?? data.title ?? "Incoming Request",
    body: message.notification?.body ?? data.body ?? "You have a new order",
    data
  });
}

let registered = false;
let backgroundHandlerRegistered = false;

function registerBackgroundHandler() {
  if (backgroundHandlerRegistered) return;
  backgroundHandlerRegistered = true;
  messaging().setBackgroundMessageHandler(displayRemoteMessage);
}

registerBackgroundHandler();

export function registerIncomingRequestMessaging() {
  if (registered) return () => undefined;
  registered = true;
  return messaging().onMessage(displayRemoteMessage);
}
