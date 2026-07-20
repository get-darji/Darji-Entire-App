import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getIncomingAlertPermissionState,
  openIncomingAlertFullScreenSettings,
  openIncomingAlertOverlaySettings
} from "@darzi/incoming-alert";
import { useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";

export function useIncomingAlertPermissionGuide(enabled: boolean, app: "tailor" | "delivery") {
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!enabled || Platform.OS !== "android") return undefined;

    let active = true;
    async function checkPermissions() {
      if (!active || checkingRef.current) return;
      checkingRef.current = true;
      try {
        const state = await getIncomingAlertPermissionState();
        if (!active || !state) return;

        if (!state.canDrawOverlays) {
          const key = `darji.incoming-alert.overlay-guide.v1.${app}`;
          if (await AsyncStorage.getItem(key)) return;
          await AsyncStorage.setItem(key, "shown");
          Alert.alert(
            "Allow incoming order popups",
            "Darji uses Display over other apps only for active incoming order requests. This lets Accept and Reject appear while you are on the home screen or using another app. A notification remains available if you do not allow it.",
            [
              { text: "Not now", style: "cancel" },
              { text: "Open settings", onPress: () => void openIncomingAlertOverlaySettings() }
            ]
          );
          return;
        }

        // Android 14+ may deny FSI to non-call/non-alarm apps. The official
        // settings page is optional; heads-up notification and overlay remain.
        if (state.androidApiLevel >= 34 && !state.canUseFullScreenIntent) {
          const key = `darji.incoming-alert.full-screen-guide.v1.${app}`;
          if (await AsyncStorage.getItem(key)) return;
          await AsyncStorage.setItem(key, "shown");
          Alert.alert(
            "Locked-screen alerts",
            "Android 14 may restrict full-screen alerts for order apps. You can review Full-screen notifications in Special app access; Darji will still use a heads-up notification and the approved overlay when Android does not allow full screen.",
            [
              { text: "Keep fallback", style: "cancel" },
              { text: "Review settings", onPress: () => void openIncomingAlertFullScreenSettings() }
            ]
          );
        }
      } finally {
        checkingRef.current = false;
      }
    }

    void checkPermissions();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkPermissions();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [app, enabled]);
}
