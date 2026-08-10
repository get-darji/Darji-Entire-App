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

async function displayForegroundMessage(message: FirebaseMessagingTypes.RemoteMessage, shouldHandle?: () => boolean) {
  if (shouldHandle && !shouldHandle()) return;
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
let firebaseMessaging: typeof messaging | undefined;
let firebaseMessagingUnavailable = false;

function getFirebaseMessaging() {
  if (firebaseMessagingUnavailable) return undefined;
  try {
    if (!firebaseMessaging) firebaseMessaging = require("@react-native-firebase/messaging").default;
    return firebaseMessaging;
  } catch (error) {
    firebaseMessagingUnavailable = true;
    console.warn("RN Firebase messaging unavailable; incoming foreground FCM listener disabled.", error);
    return undefined;
  }
}

function registerBackgroundHandler() {
  if (backgroundHandlerRegistered) return;
  const messagingModule = getFirebaseMessaging();
  if (!messagingModule) return;
  backgroundHandlerRegistered = true;
  // The shared Android receiver has already rendered the alert before headless
  // React starts. Keeping this handler registered preserves RNFirebase delivery
  // semantics without producing a second notification.
  messagingModule().setBackgroundMessageHandler(async () => undefined);
}

registerBackgroundHandler();

export function registerIncomingRequestMessaging(shouldHandle?: () => boolean) {
  if (registered) return () => undefined;
  const messagingModule = getFirebaseMessaging();
  if (!messagingModule) return () => undefined;
  registered = true;
  const unsubscribe = messagingModule().onMessage((message) => displayForegroundMessage(message, shouldHandle));
  return () => {
    registered = false;
    unsubscribe();
  };
}
