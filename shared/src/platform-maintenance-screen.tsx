import { ActivityIndicator, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import type { PlatformStatus } from "./platform-status";

export function PlatformStatusLoadingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safe.backgroundColor} />
      <View style={styles.centered}>
        <View style={styles.brandMark}><Text style={styles.brandLetter}>D</Text></View>
        <ActivityIndicator color="#f28c00" size="large" />
        <Text style={styles.loadingTitle}>Checking Darji</Text>
        <Text style={styles.loadingCopy}>Confirming the latest platform status.</Text>
      </View>
    </SafeAreaView>
  );
}

export function PlatformMaintenanceScreen({
  status,
  audienceMessage,
  refreshing,
  error,
  onRefresh
}: {
  status: PlatformStatus;
  audienceMessage: string;
  refreshing: boolean;
  error?: string;
  onRefresh: () => void;
}) {
  const showEta = status.showEstimatedCompletion && Boolean(status.estimatedCompletion);
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safe.backgroundColor} />
      <View style={styles.page}>
        <View style={styles.illustration}>
          <View style={styles.brandMark}><Text style={styles.brandLetter}>D</Text></View>
          <View style={styles.toolLine} />
          <View style={styles.toolDot} />
        </View>
        <View style={styles.modePill}><View style={styles.modeDot} /><Text style={styles.modeText}>MAINTENANCE MODE</Text></View>
        <Text style={styles.title}>{status.title}</Text>
        <Text style={styles.description}>{status.description}</Text>
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Darji is currently under maintenance</Text>
          <Text style={styles.noticeCopy}>{audienceMessage}</Text>
          {showEta ? (
            <View style={styles.etaRow}>
              <Text style={styles.etaLabel}>Estimated completion</Text>
              <Text style={styles.etaValue}>{status.estimatedCompletion}</Text>
            </View>
          ) : null}
        </View>
        <Pressable disabled={refreshing} onPress={onRefresh} style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed, refreshing && styles.refreshButtonDisabled]}>
          {refreshing ? <ActivityIndicator color="#111827" /> : <Text style={styles.refreshIcon}>↻</Text>}
          <Text style={styles.refreshText}>{refreshing ? "Checking status..." : "Refresh"}</Text>
        </Pressable>
        {error ? <Text style={styles.errorText}>Could not reach Darji. Your last known maintenance status is still shown.</Text> : null}
        <Text style={styles.footer}>Your account and data remain safe.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  page: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 32 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  illustration: { width: 126, height: 126, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#fff7e8", borderWidth: 1, borderColor: "#f7d99e", marginBottom: 24 },
  brandMark: { width: 62, height: 62, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#101c2f", marginBottom: 18 },
  brandLetter: { color: "#f6a313", fontSize: 36, lineHeight: 42, fontWeight: "900", fontStyle: "italic" },
  toolLine: { position: "absolute", width: 50, height: 5, borderRadius: 3, backgroundColor: "#f6a313", transform: [{ rotate: "-35deg" }] },
  toolDot: { position: "absolute", width: 13, height: 13, borderRadius: 7, backgroundColor: "#ffffff", borderWidth: 3, borderColor: "#f6a313" },
  modePill: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3", paddingHorizontal: 13, paddingVertical: 7 },
  modeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#dc2626" },
  modeText: { color: "#9f1239", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: "#0b2241", fontSize: 30, lineHeight: 38, fontWeight: "900", textAlign: "center", marginTop: 20 },
  description: { color: "#64748b", fontSize: 15, lineHeight: 23, fontWeight: "600", textAlign: "center", marginTop: 10, maxWidth: 520 },
  noticeCard: { alignSelf: "stretch", borderRadius: 22, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0", padding: 18, marginTop: 24 },
  noticeTitle: { color: "#0b2241", fontSize: 15, fontWeight: "900", textAlign: "center" },
  noticeCopy: { color: "#64748b", fontSize: 13, lineHeight: 20, fontWeight: "600", textAlign: "center", marginTop: 7 },
  etaRow: { borderTopWidth: 1, borderTopColor: "#e2e8f0", marginTop: 15, paddingTop: 14, alignItems: "center" },
  etaLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  etaValue: { color: "#f28c00", fontSize: 15, fontWeight: "900", marginTop: 5 },
  refreshButton: { minHeight: 54, minWidth: 190, borderRadius: 17, backgroundColor: "#f6a313", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 24, marginTop: 22 },
  refreshButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  refreshButtonDisabled: { opacity: 0.75 },
  refreshIcon: { color: "#111827", fontSize: 24, lineHeight: 26, fontWeight: "900" },
  refreshText: { color: "#111827", fontSize: 15, fontWeight: "900" },
  errorText: { color: "#b45309", fontSize: 11, lineHeight: 17, fontWeight: "700", textAlign: "center", marginTop: 14 },
  footer: { color: "#94a3b8", fontSize: 11, fontWeight: "700", marginTop: 18 },
  loadingTitle: { color: "#0b2241", fontSize: 22, fontWeight: "900", marginTop: 18 },
  loadingCopy: { color: "#64748b", fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 7 }
});
