import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export const INCOMING_ALERT_CHANNEL_ID = "darji-incoming-orders-v3";

export type IncomingAlertData = Record<string, unknown> & {
  body?: string;
  categoryId?: string;
  event?: string;
  expiresAt?: string;
  id?: string;
  orderId?: string;
  pickupId?: string;
  requestId?: string;
  taskId?: string;
  title?: string;
  type?: string;
};

export type IncomingAlertPermissionState = {
  androidApiLevel: number;
  canDrawOverlays: boolean;
  canUseFullScreenIntent: boolean;
  notificationsEnabled: boolean;
};

export type IncomingAlertAction = {
  actionIdentifier: "ACCEPT" | "DECLINE" | "SEND_QUOTE" | "VIEW_DETAILS";
  data: IncomingAlertData;
};

type NativeIncomingAlertModule = {
  configureAsync(): Promise<void>;
  consumePendingActionAsync(): Promise<string | null>;
  dismissAsync(requestKey?: string | null): Promise<void>;
  getPermissionStateAsync(): Promise<IncomingAlertPermissionState>;
  openFullScreenIntentSettingsAsync(): Promise<void>;
  openOverlaySettingsAsync(): Promise<void>;
  showAsync(payloadJson: string): Promise<void>;
};

const nativeModule = Platform.OS === "android"
  ? requireOptionalNativeModule<NativeIncomingAlertModule>("DarjiIncomingAlert")
  : null;

export function isNativeIncomingAlertAvailable() {
  return Boolean(nativeModule);
}

export async function configureIncomingAlert() {
  await nativeModule?.configureAsync();
}

export async function showIncomingAlert(data: IncomingAlertData) {
  await nativeModule?.showAsync(JSON.stringify(data));
}

export async function dismissIncomingAlert(data?: IncomingAlertData) {
  const requestKey = data?.requestId ?? data?.taskId ?? data?.pickupId ?? data?.orderId ?? data?.id;
  await nativeModule?.dismissAsync(requestKey == null ? null : String(requestKey));
}

export async function getIncomingAlertPermissionState(): Promise<IncomingAlertPermissionState | null> {
  return nativeModule ? nativeModule.getPermissionStateAsync() : null;
}

export async function openIncomingAlertOverlaySettings() {
  await nativeModule?.openOverlaySettingsAsync();
}

export async function openIncomingAlertFullScreenSettings() {
  await nativeModule?.openFullScreenIntentSettingsAsync();
}

export async function consumePendingIncomingAlertAction(): Promise<IncomingAlertAction | null> {
  const serialized = await nativeModule?.consumePendingActionAsync();
  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as IncomingAlertAction;
  } catch {
    return null;
  }
}
