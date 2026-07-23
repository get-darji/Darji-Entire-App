import React from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export function ServiceAreaLoadingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>D</Text>
        </View>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingTitle}>Finding your Darji service area</Text>
        <Text style={styles.helper}>This should only take a moment.</Text>
      </View>
    </SafeAreaView>
  );
}

export function OutsideServiceAreaScreen({
  error,
  refreshing,
  notifying,
  notified,
  onRefresh,
  onNotify,
  onExplore
}: {
  error?: string;
  refreshing: boolean;
  notifying: boolean;
  notified: boolean;
  onRefresh: () => void;
  onNotify: () => void;
  onExplore?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.locationIcon}>
          <View style={styles.locationDot} />
          <View style={styles.locationRing} />
        </View>
        <Text style={styles.title}>{error ? "We need your location" : "Darji isn't available here yet"}</Text>
        <Text style={styles.copy}>
          {error ?? "We're expanding quickly. Tell us you're interested and we'll let you know as soon as Darji reaches your area."}
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={notifying || notified || Boolean(error)}
          onPress={onNotify}
          style={({ pressed }) => [styles.notifyButton, pressed && styles.pressed, (notifying || notified || Boolean(error)) && styles.disabled]}
        >
          {notifying ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.notifyText}>{notified ? "You're on the list" : "Notify me when Darji launches here"}</Text>
          )}
        </Pressable>

        {onExplore ? (
          <Pressable
            accessibilityRole="button"
            onPress={onExplore}
            style={({ pressed }) => [styles.exploreButton, pressed && styles.pressed]}
          >
            <Text style={styles.exploreText}>Explore the app</Text>
          </Pressable>
        ) : null}

        <Pressable accessibilityRole="button" disabled={refreshing} onPress={onRefresh} style={styles.refreshButton}>
          {refreshing ? <ActivityIndicator size="small" color="#d97706" /> : <Text style={styles.refreshText}>{error ? "Try location again" : "Refresh location"}</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 36, gap: 16 },
  logo: { width: 82, height: 82, borderRadius: 24, backgroundColor: "#10233f", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  logoText: { color: "#f59e0b", fontSize: 46, fontWeight: "900", fontStyle: "italic" },
  loadingTitle: { color: "#10233f", fontSize: 24, lineHeight: 31, fontWeight: "900", textAlign: "center", marginTop: 4 },
  helper: { color: "#64748b", fontSize: 15, lineHeight: 22, textAlign: "center" },
  locationIcon: { width: 92, height: 92, borderRadius: 46, backgroundColor: "#fff2d8", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  locationDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#f59e0b", position: "absolute" },
  locationRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 4, borderColor: "#f59e0b" },
  title: { color: "#10233f", fontSize: 28, lineHeight: 35, fontWeight: "900", textAlign: "center" },
  copy: { color: "#64748b", fontSize: 16, lineHeight: 24, textAlign: "center", maxWidth: 410, marginBottom: 10 },
  notifyButton: {
    minHeight: 56,
    width: "100%",
    maxWidth: 430,
    borderRadius: 18,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.28,
    shadowRadius: 11,
    elevation: 6
  },
  notifyText: { color: "#ffffff", fontWeight: "900", fontSize: 16, textAlign: "center" },
  exploreButton: {
    minHeight: 54,
    width: "100%",
    maxWidth: 430,
    borderRadius: 18,
    backgroundColor: "#10233f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: "#10233f",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4
  },
  exploreText: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
  refreshButton: { minHeight: 38, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginTop: 2 },
  refreshText: { color: "#d97706", fontSize: 14, fontWeight: "800" },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  disabled: { opacity: 0.58 }
});
