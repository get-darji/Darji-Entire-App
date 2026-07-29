import type messaging from "@react-native-firebase/messaging";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { displayIncomingRequestNotification } from "./NotificationService";

declare const require: (moduleName: string) => { default?: typeof messaging };

export function isIncomingRequestData(data: Record<string, unknown>) {
  if (String(data.darjiIncomingRequest).toLowerCase() === "true") return true;
  const type = String(data.type ?? data.event ?? data.notificationType ?? "");
  return /incoming|new_request|request_created|assignment|delivery_batch_ready|task_created|pickup_assigned/i.test(type);
}

function stringData(data?: FirebaseMessagingTypes.RemoteMessage["data"]) {
  return Object.fromEntries(Object.entries(data ?? {}).map(([key, value]) => [key, String(value)]));
}

async function displayForegroundMessage(message: FirebaseMessagingTypes.RemoteMessage) {
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
let firebaseMessaging: typeof messaging | null | undefined;

function getFirebaseMessaging() {
  if (firebaseMessaging !== undefined) return firebaseMessaging;
  try {
    firebaseMessaging = require("@react-native-firebase/messaging").default ?? null;
  } catch (error) {
    console.warn("Firebase messaging native module unavailable", error);
    firebaseMessaging = null;
  }
  return firebaseMessaging;
}

function registerBackgroundHandler() {
  if (backgroundHandlerRegistered) return;
  const messagingModule = getFirebaseMessaging();
  if (!messagingModule) return;
  backgroundHandlerRegistered = true;
  // Native Android owns background display; headless JS intentionally does not
  // create another alert when RNFirebase wakes the process.
  messagingModule().setBackgroundMessageHandler(async () => undefined);
}

registerBackgroundHandler();

export function registerIncomingRequestMessaging() {
  if (registered) return () => undefined;
  const messagingModule = getFirebaseMessaging();
  if (!messagingModule) return () => undefined;
  registered = true;
  return messagingModule().onMessage(displayForegroundMessage);
}
