import React from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export function ServiceAreaLoadingScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" color="#f28c00" /><Text style={styles.helper}>Checking service availability…</Text></View></SafeAreaView>;
}

export function OutsideServiceAreaScreen({
  error,
  refreshing,
  notifying,
  notified,
  onRefresh,
  onNotify,
  onProfile,
  onSupport,
  onAbout
}: {
  error?: string;
  refreshing: boolean;
  notifying: boolean;
  notified: boolean;
  onRefresh: () => void;
  onNotify: () => void;
  onProfile?: () => void;
  onSupport?: () => void;
  onAbout?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.icon}><Text style={styles.iconText}>⌖</Text></View>
        <Text style={styles.title}>{error ? "Location access required" : "Darji isn't available here yet"}</Text>
        <Text style={styles.copy}>{error ?? "We're currently serving Janakpuri and Uttam Nagar. Your live GPS location is used only to check service availability."}</Text>
        <Pressable style={styles.primary} disabled={refreshing} onPress={onRefresh}>
          {refreshing ? <ActivityIndicator color="#111827" /> : <Text style={styles.primaryText}>Refresh location</Text>}
        </Pressable>
        <Pressable style={styles.secondary} disabled={notifying || notified || Boolean(error)} onPress={onNotify}>
          {notifying ? <ActivityIndicator color="#f28c00" /> : <Text style={styles.secondaryText}>{notified ? "We'll notify you" : "Notify me when Darji launches here"}</Text>}
        </Pressable>
        <View style={styles.links}>
          {onProfile ? <Pressable onPress={onProfile}><Text style={styles.link}>Profile</Text></Pressable> : null}
          {onSupport ? <Pressable onPress={onSupport}><Text style={styles.link}>Support</Text></Pressable> : null}
          {onAbout ? <Pressable onPress={onAbout}><Text style={styles.link}>About</Text></Pressable> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 16 },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#fff0d7", alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 38, color: "#f28c00", fontWeight: "800" },
  title: { color: "#10233f", fontSize: 26, fontWeight: "800", textAlign: "center" },
  copy: { color: "#64748b", fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 390 },
  helper: { color: "#64748b", fontSize: 15 },
  primary: { minHeight: 52, width: "100%", borderRadius: 16, backgroundColor: "#f6a313", alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryText: { color: "#111827", fontWeight: "800", fontSize: 16 },
  secondary: { minHeight: 52, width: "100%", borderRadius: 16, borderWidth: 1, borderColor: "#f6a313", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#c96e00", fontWeight: "700", fontSize: 15, textAlign: "center" },
  links: { flexDirection: "row", gap: 24, marginTop: 8 },
  link: { color: "#315d96", fontWeight: "700" }
});
