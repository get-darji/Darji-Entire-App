import messaging, { type FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { displayIncomingRequestNotification } from "./NotificationService";

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

function registerBackgroundHandler() {
  if (backgroundHandlerRegistered) return;
  backgroundHandlerRegistered = true;
  // The shared Android receiver has already rendered the alert before headless
  // React starts. Keeping this handler registered preserves RNFirebase delivery
  // semantics without producing a second notification.
  messaging().setBackgroundMessageHandler(async () => undefined);
}

registerBackgroundHandler();

export function registerIncomingRequestMessaging() {
  if (registered) return () => undefined;
  registered = true;
  return messaging().onMessage(displayForegroundMessage);
}
