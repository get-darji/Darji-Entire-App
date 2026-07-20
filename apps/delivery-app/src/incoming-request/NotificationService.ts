import {
  configureIncomingAlert,
  dismissIncomingAlert,
  INCOMING_ALERT_CHANNEL_ID,
  showIncomingAlert,
  type IncomingAlertData
} from "@darzi/incoming-alert";
import { Platform } from "react-native";

export const INCOMING_REQUEST_CHANNEL_ID = INCOMING_ALERT_CHANNEL_ID;

type IncomingNotificationIdentity = IncomingAlertData & Record<string, unknown>;

export function incomingRequestNotificationId(data?: IncomingNotificationIdentity) {
  const id = data?.requestId ?? data?.taskId ?? data?.pickupId ?? data?.orderId ?? data?.id ?? "current";
  return `darji-incoming-request-${String(id)}`;
}

export async function cancelIncomingRequestNotifications(data?: IncomingNotificationIdentity) {
  if (Platform.OS !== "android") return;
  await dismissIncomingAlert(data);
}

export async function configureIncomingRequestNotifications() {
  if (Platform.OS !== "android") return;
  await configureIncomingAlert();
}

export async function displayIncomingRequestNotification({
  title,
  body,
  data
}: {
  title: string;
  body: string;
  data: Record<string, unknown>;
}) {
  if (Platform.OS !== "android") return;
  await showIncomingAlert({ ...data, title, body });
}
