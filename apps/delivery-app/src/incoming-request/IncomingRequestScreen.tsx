import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useIncomingRequest } from "./useIncomingRequest";
import type { IncomingRequestPayload } from "./types";
import { cancelIncomingRequestNotifications, displayIncomingRequestNotification } from "./NotificationService";

const BRAND_ORANGE = "#f6a313";
const BRAND_DEEP = "#0b2241";
const SURFACE = "#ffffff";
const BORDER = "#dde4ee";
const MUTED = "#65748a";

function formatTimer(seconds: number) {
  return `00:${String(seconds).padStart(2, "0")}`;
}

export function IncomingRequestScreen({
  visible,
  request,
  loading,
  acceptLabel = "Accept",
  rejectLabel = "Reject",
  soundEnabled,
  vibrationEnabled,
  onAccept,
  onReject,
  onTimeout
}: {
  visible: boolean;
  request?: IncomingRequestPayload;
  loading?: boolean;
  acceptLabel?: string;
  rejectLabel?: string;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onTimeout: () => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(42)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const { secondsLeft, progress, stopAlerts } = useIncomingRequest({
    active: visible && Boolean(request),
    expiresAt: request?.expiresAt,
    soundEnabled,
    vibrationEnabled,
    onTimeout: () => {
      void cancelIncomingRequestNotifications(request);
      onTimeout();
    }
  });

  function stopCurrentRequestAlerts() {
    stopAlerts();
    void cancelIncomingRequestNotifications(request);
  }

  useEffect(() => {
    if (visible && request) {
      const detail = request.rows?.slice(0, 3).map((row) => `${row.label}: ${row.value ?? "Not available"}`).join(" | ");
      void displayIncomingRequestNotification({
        title: request.title || "Incoming delivery request",
        body: detail || request.subtitle || "A new delivery order is waiting for your response.",
        data: {
          darjiIncomingRequest: "true",
          type: "INCOMING_DELIVERY_REQUEST",
          categoryId: "DELIVERY_PICKUP_REQUEST",
          id: request.id,
          taskId: request.id,
          orderId: request.orderId ?? request.id,
          expiresAt: request.expiresAt ?? ""
        }
      });
    }
  }, [request?.id, visible]);

  useEffect(() => {
    if (!visible && request) void cancelIncomingRequestNotifications(request);
  }, [request, visible]);

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    slide.setValue(42);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, damping: 18, stiffness: 180, mass: 0.8, useNativeDriver: true })
    ]).start();
  }, [fade, slide, visible, request?.id]);

  useEffect(() => {
    if (!visible) return undefined;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 760, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 760, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, visible]);

  if (!request) return null;
  const rows = request.rows ?? [];
  const title = request.title || (request.requestType === "pickup" ? "Incoming Pickup Request" : "Incoming Delivery Request");
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.02] });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#070d18" translucent />
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.card, { transform: [{ translateY: slide }] }]}>
              <View style={styles.header}>
                <View style={styles.iconWrap}>
                  <Ionicons name={request.requestType === "pickup" ? "cube-outline" : "bicycle-outline"} size={28} color={BRAND_ORANGE} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{request.subtitle ?? "You have a new order"}</Text>
                </View>
                <View style={styles.timerPill}>
                  <Text style={styles.timerText}>{formatTimer(secondsLeft)}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>

              <View style={styles.rows}>
                {rows.map((row) => (
                  <View key={row.label} style={styles.row}>
                    <View style={styles.rowIcon}>
                      <Ionicons name={row.icon} size={17} color={BRAND_ORANGE} />
                    </View>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={styles.rowValue} numberOfLines={2}>{row.value ?? "Not available"}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.rejectButton, loading && styles.disabled]}
                  disabled={loading}
                  onPress={() => {
                    stopCurrentRequestAlerts();
                    onReject();
                  }}
                >
                  <Ionicons name="close" size={21} color="#ffffff" />
                  <Text style={styles.rejectText}>{rejectLabel}</Text>
                </Pressable>
                <View style={styles.acceptWrap}>
                  <Animated.View style={[styles.acceptPulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                  <Pressable
                    style={[styles.acceptButton, loading && styles.disabled]}
                    disabled={loading}
                    onPress={() => {
                      stopCurrentRequestAlerts();
                      onAccept();
                    }}
                  >
                    {loading ? <ActivityIndicator color="#111111" /> : <Ionicons name="checkmark" size={23} color="#111111" />}
                    {!loading ? <Text style={styles.acceptText}>{acceptLabel}</Text> : null}
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(7, 13, 24, 0.94)" },
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 18 },
  card: { width: "100%", maxWidth: 430, alignSelf: "center", borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", padding: 20, shadowColor: "#000000", shadowOpacity: 0.28, shadowRadius: 26, elevation: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 54, height: 54, borderRadius: 20, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: BRAND_DEEP, fontSize: 23, lineHeight: 29, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, lineHeight: 18, fontWeight: "800", marginTop: 3 },
  timerPill: { minWidth: 64, minHeight: 42, borderRadius: 16, backgroundColor: "#111111", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  timerText: { color: BRAND_ORANGE, fontSize: 16, fontWeight: "900" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "#eef2f7", overflow: "hidden", marginTop: 16 },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: BRAND_ORANGE },
  rows: { marginTop: 12 },
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#eef2f7", paddingVertical: 8 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  rowLabel: { width: 92, color: MUTED, fontSize: 12, fontWeight: "900" },
  rowValue: { flex: 1, color: BRAND_DEEP, fontSize: 13, lineHeight: 18, fontWeight: "900", textAlign: "right" },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  rejectButton: { flex: 1, minHeight: 58, borderRadius: 18, backgroundColor: "#252a33", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  rejectText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  acceptWrap: { flex: 1 },
  acceptPulse: { ...StyleSheet.absoluteFill, borderRadius: 18, backgroundColor: BRAND_ORANGE },
  acceptButton: { minHeight: 58, borderRadius: 18, backgroundColor: BRAND_ORANGE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  acceptText: { color: "#111111", fontSize: 15, fontWeight: "900" },
  disabled: { opacity: 0.62 },
});
