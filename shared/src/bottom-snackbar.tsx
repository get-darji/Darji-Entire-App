import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function BottomSnackbar({
  visible,
  title,
  message,
  actionLabel = "OK",
  onAction,
  onDismiss,
  durationMs = 3500
}: {
  visible: boolean;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  durationMs?: number;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : 120,
        duration: visible ? 220 : 170,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 180 : 120,
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, translateY, visible]);

  useEffect(() => {
    if (!visible || !onDismiss || durationMs <= 0) return undefined;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss, visible]);

  if (!visible) return null;

  const bottom = insets.bottom > 0 ? insets.bottom + 8 : 8;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
        <Pressable style={styles.textBlock} onPress={onDismiss ?? onAction}>
          {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
          {message ? <Text style={styles.message} numberOfLines={2}>{message}</Text> : null}
        </Pressable>
        <Pressable style={styles.action} onPress={onAction ?? onDismiss}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 9999
  },
  card: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18
  },
  textBlock: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  message: {
    color: "#dbe4f0",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2
  },
  action: {
    minHeight: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  actionText: {
    color: "#f6a313",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  }
});
