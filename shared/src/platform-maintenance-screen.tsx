import { ActivityIndicator, Image, Pressable, StatusBar, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PlatformStatus } from "./platform-status";
import { translateStaticText } from "./static-translations";
import type { AppLanguage } from "./localization";

export function PlatformStatusLoadingScreen({ language = "en" }: { language?: AppLanguage }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safe.backgroundColor} translucent />
      <View style={styles.centered}>
        <View style={styles.loadingBrandMark}><Text style={styles.brandLetter}>D</Text></View>
        <ActivityIndicator color="#f28c00" size="large" />
        <Text style={styles.loadingTitle}>{translateStaticText(language, "Checking Darji")}</Text>
        <Text style={styles.loadingCopy}>{translateStaticText(language, "Confirming the latest platform status.")}</Text>
      </View>
    </SafeAreaView>
  );
}

export function PlatformMaintenanceScreen({
  status,
  audienceMessage,
  language,
  refreshing,
  error,
  onRefresh,
  logoSource
}: {
  status: PlatformStatus;
  audienceMessage: string;
  language: AppLanguage;
  refreshing: boolean;
  error?: string;
  onRefresh: () => void;
  logoSource?: ImageSourcePropType;
}) {
  const showEta = status.showEstimatedCompletion && Boolean(status.estimatedCompletion);
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safe.backgroundColor} translucent />
      <View style={styles.page}>
        <View style={styles.brandHalo}><View style={styles.brandTile}>{logoSource ? <Image source={logoSource} style={styles.brandLogo} resizeMode="contain" /> : <Text style={styles.brandLetter}>D</Text>}</View></View>
        <View style={styles.modePill}><View style={styles.modeDot} /><Text style={styles.modeText}>{translateStaticText(language, "MAINTENANCE MODE")}</Text></View>
        <Text style={styles.title}>{translateStaticText(language, status.title)}</Text>
        <Text style={styles.description}>{translateStaticText(language, status.description)}</Text>
        <View style={styles.noticeCard}>
          <View style={styles.noticeAccent} />
          <Text style={styles.noticeTitle}>{translateStaticText(language, "Darji is currently under maintenance")}</Text>
          <Text style={styles.noticeCopy}>{translateStaticText(language, audienceMessage)}</Text>
          {showEta ? (
            <View style={styles.etaRow}>
              <Text style={styles.etaLabel}>{translateStaticText(language, "Estimated completion")}</Text>
              <Text style={styles.etaValue}>{status.estimatedCompletion}</Text>
            </View>
          ) : null}
        </View>
        <Pressable accessibilityHint="Checks whether Darji is available again" accessibilityRole="button" disabled={refreshing} onPress={onRefresh} style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed, refreshing && styles.refreshButtonDisabled]}>
          {refreshing ? <ActivityIndicator color="#111827" /> : <Text style={styles.refreshIcon}>↻</Text>}
          <Text style={styles.refreshText}>{translateStaticText(language, refreshing ? "Checking status..." : "Refresh")}</Text>
        </Pressable>
        {error ? <Text style={styles.errorText}>{translateStaticText(language, "Could not reach Darji. Your last known maintenance status is still shown.")}</Text> : null}
        <Text style={styles.footer}>{translateStaticText(language, "Your account and data remain safe.")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  page: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 24 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  loadingBrandMark: { width: 62, height: 62, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#101c2f", marginBottom: 18 },
  brandHalo: { width: 126, height: 126, borderRadius: 63, alignItems: "center", justifyContent: "center", backgroundColor: "#fff4dc", borderWidth: 1, borderColor: "#f2cf86", marginBottom: 21, shadowColor: "#f59e0b", shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  brandTile: { width: 94, height: 94, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#f8dfac" },
  brandLogo: { width: 76, height: 58 },
  brandLetter: { color: "#f6a313", fontSize: 42, lineHeight: 48, fontWeight: "900", fontStyle: "italic" },
  modePill: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3", paddingHorizontal: 13, paddingVertical: 7 },
  modeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#dc2626" },
  modeText: { color: "#9f1239", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: "#10213a", fontSize: 31, lineHeight: 38, fontWeight: "900", textAlign: "center", marginTop: 18 },
  description: { color: "#62738b", fontSize: 15, lineHeight: 23, fontWeight: "600", textAlign: "center", marginTop: 10, maxWidth: 520 },
  noticeCard: { alignSelf: "stretch", overflow: "hidden", borderRadius: 24, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e1e8f0", padding: 20, marginTop: 25, shadowColor: "#0b2241", shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  noticeAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: "#f6a313" },
  noticeTitle: { color: "#0b2241", fontSize: 15, fontWeight: "900", textAlign: "center" },
  noticeCopy: { color: "#64748b", fontSize: 13, lineHeight: 20, fontWeight: "600", textAlign: "center", marginTop: 7 },
  etaRow: { borderTopWidth: 1, borderTopColor: "#e2e8f0", marginTop: 15, paddingTop: 14, alignItems: "center" },
  etaLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  etaValue: { color: "#f28c00", fontSize: 15, fontWeight: "900", marginTop: 5 },
  refreshButton: { minHeight: 56, alignSelf: "stretch", borderRadius: 18, backgroundColor: "#10213a", borderWidth: 1, borderColor: "#10213a", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24, marginTop: 20, shadowColor: "#10213a", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  refreshButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  refreshButtonDisabled: { opacity: 0.75 },
  refreshIcon: { color: "#ffffff", fontSize: 24, lineHeight: 26, fontWeight: "900" },
  refreshText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  errorText: { color: "#b45309", fontSize: 11, lineHeight: 17, fontWeight: "700", textAlign: "center", marginTop: 14 },
  footer: { color: "#94a3b8", fontSize: 11, fontWeight: "700", marginTop: 18 },
  loadingTitle: { color: "#0b2241", fontSize: 22, fontWeight: "900", marginTop: 18 },
  loadingCopy: { color: "#64748b", fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 7 }
});
