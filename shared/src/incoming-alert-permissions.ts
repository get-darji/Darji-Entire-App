export type IncomingAlertPermissionIssue = "notifications" | "overlay" | "fullscreen" | "unavailable" | null;

export function requiredIncomingAlertPermission(input: {
  platform: string;
  notificationsGranted: boolean;
  nativeState: { androidApiLevel: number; notificationsEnabled: boolean; canDrawOverlays: boolean; canUseFullScreenIntent: boolean } | null;
}): IncomingAlertPermissionIssue {
  if (input.platform === "web") return null;
  if (input.platform === "android" && !input.nativeState) return "unavailable";
  if (!input.notificationsGranted || (input.nativeState && !input.nativeState.notificationsEnabled)) return "notifications";
  if (input.platform !== "android") return null;
  if (!input.nativeState!.canDrawOverlays) return "overlay";
  if (input.nativeState!.androidApiLevel >= 34 && !input.nativeState!.canUseFullScreenIntent) return "fullscreen";
  return null;
}
