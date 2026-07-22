import {
  getIncomingAlertPermissionState,
  openIncomingAlertFullScreenSettings,
  openIncomingAlertOverlaySettings
} from "@darzi/incoming-alert";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type PermissionIssue = "overlay" | "fullscreen" | null;

const BRAND_ORANGE = "#f6a313";
const BRAND_DEEP = "#0b2241";
const SCREEN_DIM = "rgba(7, 13, 24, 0.58)";

export function useIncomingAlertPermissionGuide(enabled: boolean, app: "tailor" | "delivery") {
  const checkingRef = useRef(false);
  const dismissedIssueRef = useRef<PermissionIssue>(null);
  const continueToOverlayRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const guideProgress = useRef(new Animated.Value(0)).current;
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
    let continueTimer: ReturnType<typeof setTimeout> | undefined;
    const subscription = AppState.addEventListener("change", (state) => {
      const previousState = appStateRef.current;
      appStateRef.current = state;
      if (state === "active") {
        dismissedIssueRef.current = null;
        if (continueToOverlayRef.current && previousState !== "active") {
          continueToOverlayRef.current = false;
          continueTimer = setTimeout(() => void openIncomingAlertOverlaySettings(), 450);
        }
        void checkPermissions();
      }
    });
    return () => {
      active = false;
      if (continueTimer) clearTimeout(continueTimer);
      subscription.remove();
    };
  }, [enabled]);

  useEffect(() => {
    if (issue !== "overlay") {
      guideProgress.stopAnimation();
      guideProgress.setValue(0);
      return undefined;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(guideProgress, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(850),
        Animated.timing(guideProgress, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(280)
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [guideProgress, issue]);

  if (!enabled || Platform.OS !== "android" || !issue) return null;

  const isOverlay = issue === "overlay";
  const appName = app === "tailor" ? "Darji Tailor" : "Darji Delivery";

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={() => setIssue(null)}>
      <View style={styles.backdrop}>
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} bounces={false}>
          <View style={styles.iconWrap}>
            <Ionicons name={isOverlay ? "albums-outline" : "phone-portrait-outline"} size={26} color={BRAND_ORANGE} />
          </View>
          <Text style={styles.title}>{isOverlay ? "Allow order popups" : "Allow locked-screen alerts"}</Text>
          <Text style={styles.copy}>
            {isOverlay
              ? `${appName} uses Display over other apps only while a live request is waiting, so Accept, Reject, and View details can appear over the home screen or another app.`
              : "Android 14 can limit full-screen alerts. This setting improves locked-screen request visibility while the overlay handles normal app and home-screen popups."}
          </Text>
          {isOverlay ? (
            <View style={styles.demo} accessibilityLabel="Animated guide showing the App info menu and Allow restricted settings option">
              <View style={styles.demoHeader}>
                <View style={styles.demoAppIcon}>
                  <Ionicons name="cube-outline" size={18} color={BRAND_ORANGE} />
                </View>
                <View style={styles.demoTitleWrap}>
                  <Text style={styles.demoEyebrow}>APP INFO</Text>
                  <Text style={styles.demoTitle}>{appName}</Text>
                </View>
                <Animated.View
                  style={[
                    styles.demoMenuButton,
                    {
                      transform: [{ scale: guideProgress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1.22, 1] }) }],
                      opacity: guideProgress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.65, 1, 1] })
                    }
                  ]}
                >
                  <Ionicons name="ellipsis-vertical" size={19} color={BRAND_DEEP} />
                </Animated.View>
              </View>
              <Animated.View
                style={[
                  styles.demoMenu,
                  {
                    opacity: guideProgress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }),
                    transform: [{ translateY: guideProgress.interpolate({ inputRange: [0, 1], outputRange: [-7, 0] }) }]
                  }
                ]}
              >
                <Ionicons name="lock-open-outline" size={17} color="#166534" />
                <Text style={styles.demoMenuText}>Allow restricted settings</Text>
              </Animated.View>
              <Text style={styles.demoHint}>Tap ⋮, allow restricted settings, then press Back.</Text>
            </View>
          ) : null}
          <View style={styles.steps}>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>{isOverlay ? "Tap Open App info below." : "Tap Review setting below."}</Text>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                {isOverlay
                  ? "Tap the three-dot menu and choose Allow restricted settings. If that option is absent, continue to the next step."
                  : `Allow full-screen alerts for ${appName}.`}
              </Text>
            </View>
            {isOverlay ? (
              <View style={styles.stepRow}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Press Back. Display over other apps opens automatically; turn on the switch for {appName}.</Text>
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
                if (isOverlay) {
                  continueToOverlayRef.current = true;
                  void Linking.openSettings().catch(() => {
                    continueToOverlayRef.current = false;
                    void openIncomingAlertOverlaySettings();
                  });
                } else {
                  void openIncomingAlertFullScreenSettings();
                }
              }}
            >
              <Text style={styles.primaryText}>{isOverlay ? "Open App info" : "Review setting"}</Text>
              <Ionicons name="arrow-forward" size={18} color="#111111" />
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: SCREEN_DIM, justifyContent: "flex-end" },
  sheet: { maxHeight: "94%", backgroundColor: "#ffffff", borderTopLeftRadius: 8, borderTopRightRadius: 8, borderTopWidth: 1, borderColor: "#efcf92" },
  sheetContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 },
  iconWrap: { width: 48, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#fff4dc", marginBottom: 14 },
  title: { color: BRAND_DEEP, fontSize: 22, lineHeight: 28, fontWeight: "900" },
  copy: { color: "#526174", fontSize: 14, lineHeight: 20, fontWeight: "700", marginTop: 8 },
  demo: { marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: "#dbe2ec", backgroundColor: "#f8fafc", padding: 12, overflow: "hidden" },
  demoHeader: { flexDirection: "row", alignItems: "center" },
  demoAppIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  demoTitleWrap: { flex: 1, marginLeft: 10 },
  demoEyebrow: { color: "#7b8796", fontSize: 9, lineHeight: 12, fontWeight: "900", letterSpacing: 0.8 },
  demoTitle: { color: BRAND_DEEP, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  demoMenuButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff0cc", alignItems: "center", justifyContent: "center" },
  demoMenu: { alignSelf: "flex-end", minHeight: 38, marginTop: 8, paddingHorizontal: 12, borderRadius: 9, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cfe2d3", flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#0b2241", shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  demoMenuText: { color: "#166534", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  demoHint: { color: "#64748b", fontSize: 11, lineHeight: 15, fontWeight: "700", marginTop: 8 },
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
