import {
  getIncomingAlertPermissionState,
  openIncomingAlertFullScreenSettings,
  openIncomingAlertOverlaySettings
} from "@darzi/incoming-alert";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

type PermissionIssue = "overlay" | "fullscreen" | null;

const BRAND_ORANGE = "#f6a313";
const BRAND_DEEP = "#0b2241";
const SCREEN_DIM = "rgba(7, 13, 24, 0.58)";

export function useIncomingAlertPermissionGuide(enabled: boolean, app: "tailor" | "delivery") {
  const checkingRef = useRef(false);
  const dismissedIssueRef = useRef<PermissionIssue>(null);
  const [issue, setIssue] = useState<PermissionIssue>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== "android") {
      setIssue(null);
      return undefined;
    }

    let active = true;
    async function checkPermissions() {
      if (!active || checkingRef.current) return;
      checkingRef.current = true;
      try {
        const state = await getIncomingAlertPermissionState();
        if (!active || !state) return;

        const nextIssue: PermissionIssue = !state.canDrawOverlays
          ? "overlay"
          : state.androidApiLevel >= 34 && !state.canUseFullScreenIntent
            ? "fullscreen"
            : null;
        setIssue(dismissedIssueRef.current === nextIssue ? null : nextIssue);
      } finally {
        checkingRef.current = false;
      }
    }

    void checkPermissions();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        dismissedIssueRef.current = null;
        void checkPermissions();
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [enabled]);

  if (!enabled || Platform.OS !== "android" || !issue) return null;

  const isOverlay = issue === "overlay";
  const appName = app === "tailor" ? "Darji Tailor" : "Darji Delivery";

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={() => setIssue(null)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Ionicons name={isOverlay ? "albums-outline" : "phone-portrait-outline"} size={26} color={BRAND_ORANGE} />
          </View>
          <Text style={styles.title}>{isOverlay ? "Allow order popups" : "Allow locked-screen alerts"}</Text>
          <Text style={styles.copy}>
            {isOverlay
              ? `${appName} uses Display over other apps only while a live request is waiting, so Accept, Reject, and View details can appear over the home screen or another app.`
              : "Android 14 can limit full-screen alerts. This setting improves locked-screen request visibility while the overlay handles normal app and home-screen popups."}
          </Text>
          <View style={styles.steps}>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Tap the button below.</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                {isOverlay
                  ? "If the switch is disabled, go back to App info, tap the three-dot menu, and choose Allow restricted settings."
                  : `Allow full-screen alerts for ${appName}.`}
              </Text>
            </View>
            {isOverlay ? (
              <View style={styles.stepRow}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Return here and turn on the switch for {appName}.</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                dismissedIssueRef.current = issue;
                setIssue(null);
              }}
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                if (isOverlay) void openIncomingAlertOverlaySettings();
                else void openIncomingAlertFullScreenSettings();
              }}
            >
              <Text style={styles.primaryText}>{isOverlay ? "Open toggle" : "Review setting"}</Text>
              <Ionicons name="arrow-forward" size={18} color="#111111" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: SCREEN_DIM, justifyContent: "flex-end" },
  sheet: { backgroundColor: "#ffffff", borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18, borderTopWidth: 1, borderColor: "#efcf92" },
  iconWrap: { width: 48, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#fff4dc", marginBottom: 14 },
  title: { color: BRAND_DEEP, fontSize: 22, lineHeight: 28, fontWeight: "900" },
  copy: { color: "#526174", fontSize: 14, lineHeight: 20, fontWeight: "700", marginTop: 8 },
  steps: { marginTop: 16, gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#111111", color: BRAND_ORANGE, textAlign: "center", lineHeight: 24, fontSize: 12, fontWeight: "900" },
  stepText: { flex: 1, color: BRAND_DEEP, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  secondaryButton: { flex: 1, minHeight: 52, borderRadius: 8, borderWidth: 1, borderColor: "#dbe2ec", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900" },
  primaryButton: { flex: 1.2, minHeight: 52, borderRadius: 8, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryText: { color: "#111111", fontSize: 14, fontWeight: "900" }
});
