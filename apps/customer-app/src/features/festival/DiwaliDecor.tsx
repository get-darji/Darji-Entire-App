import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, AppState, Image, StyleSheet, View } from "react-native";

const headerLights = require("../../../assets/Darji_Diwali_Assets/header_marigold_lights.png");
const lantern = require("../../../assets/Darji_Diwali_Assets/hanging_lantern.png");
const greetingDiya = require("../../../assets/Darji_Diwali_Assets/greeting_diya.png");
const heroFabric = require("../../../assets/Darji_Diwali_Assets/hero_maroon_fabric_corner.png");
const heroDiyas = require("../../../assets/Darji_Diwali_Assets/hero_diyas_marigolds.png");
const heroSparkles = require("../../../assets/Darji_Diwali_Assets/hero_sparkle_overlay.png");
const rangoli = require("../../../assets/Darji_Diwali_Assets/gold_rangoli_corner.png");
const goldDivider = require("../../../assets/Darji_Diwali_Assets/hero_gold_divider.png");

export function useDiwaliMotion(enabled: boolean) {
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [reduceMotion, setReduceMotion] = useState(false);
  const flicker = useRef(new Animated.Value(1)).current;
  const sparkle = useRef(new Animated.Value(0.28)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const lights = useRef(new Animated.Value(0.76)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const motionSubscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const appSubscription = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    return () => { motionSubscription.remove(); appSubscription.remove(); };
  }, []);

  useEffect(() => {
    const values = [flicker, sparkle, sway, lights];
    if (!enabled || !appActive || reduceMotion) {
      values.forEach((value) => value.stopAnimation());
      flicker.setValue(1);
      sparkle.setValue(0.32);
      sway.setValue(0);
      lights.setValue(0.84);
      return undefined;
    }
    const animations = [
      Animated.loop(Animated.sequence([
        Animated.timing(flicker, { toValue: 0.92, duration: 850, useNativeDriver: true, isInteraction: false }),
        Animated.timing(flicker, { toValue: 1, duration: 1050, useNativeDriver: true, isInteraction: false })
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(sparkle, { toValue: 0.43, duration: 2200, useNativeDriver: true, isInteraction: false }),
        Animated.timing(sparkle, { toValue: 0.25, duration: 2800, useNativeDriver: true, isInteraction: false })
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2600, useNativeDriver: true, isInteraction: false }),
        Animated.timing(sway, { toValue: -1, duration: 3000, useNativeDriver: true, isInteraction: false }),
        Animated.timing(sway, { toValue: 0, duration: 2400, useNativeDriver: true, isInteraction: false })
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(lights, { toValue: 1, duration: 1900, useNativeDriver: true, isInteraction: false }),
        Animated.timing(lights, { toValue: 0.72, duration: 2500, useNativeDriver: true, isInteraction: false })
      ]))
    ];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [appActive, enabled, flicker, lights, reduceMotion, sparkle, sway]);

  return { flicker, sparkle, sway, lights, reduceMotion };
}

type Motion = ReturnType<typeof useDiwaliMotion>;

export function DiwaliAppSurface({
  enabled,
  pageColor,
  showGarland = false,
  children
}: {
  enabled: boolean;
  pageColor: string;
  showGarland?: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <View style={[styles.appSurface, { backgroundColor: pageColor }]}>
      <DiwaliPatternLayer />
      {showGarland ? <Image accessible={false} source={headerLights} resizeMode="stretch" style={styles.globalGarland} /> : null}
      <View style={styles.appContent}>{children}</View>
    </View>
  );
}

export function DiwaliPatternLayer() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={rangoli} resizeMode="contain" style={[styles.appPattern, styles.appPatternTop]} />
      <Image source={rangoli} resizeMode="contain" style={[styles.appPattern, styles.appPatternMiddle]} />
      <Image source={rangoli} resizeMode="contain" style={[styles.appPattern, styles.appPatternBottom]} />
      <Image source={heroSparkles} resizeMode="cover" style={styles.appSparkles} />
    </View>
  );
}

export function DiwaliHeaderDecor({ motion }: { motion: Motion }) {
  const rotate = motion.sway.interpolate({ inputRange: [-1, 1], outputRange: ["-3deg", "3deg"] });
  return (
    <View pointerEvents="none" style={styles.headerLayer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.Image source={lantern} resizeMode="contain" style={[styles.lanternLeft, { transform: [{ rotate }] }]} />
      <Animated.Image source={lantern} resizeMode="contain" style={[styles.lanternRight, { transform: [{ rotate }] }]} />
      <Image source={rangoli} resizeMode="contain" style={styles.headerWatermark} />
      <Animated.View style={[styles.twinkle, styles.twinkleOne, { opacity: motion.lights }]} />
      <Animated.View style={[styles.twinkle, styles.twinkleTwo, { opacity: motion.sparkle }]} />
    </View>
  );
}

export function DiwaliGreetingDiya({ motion }: { motion: Motion }) {
  return (
    <Animated.Image
      accessible={false}
      source={greetingDiya}
      resizeMode="contain"
      style={[styles.greetingDiya, { opacity: motion.flicker, transform: [{ scale: motion.flicker }] }]}
    />
  );
}

export function DiwaliHeroDecor({ motion }: { motion: Motion }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={heroFabric} resizeMode="cover" style={styles.heroFabric} />
      <Animated.Image source={heroSparkles} resizeMode="cover" style={[styles.heroFill, { opacity: motion.sparkle }]} />
      <Image source={goldDivider} resizeMode="contain" style={styles.heroDivider} />
      <Image source={heroDiyas} resizeMode="contain" style={styles.heroDiyas} />
    </View>
  );
}

export function DiwaliCardCorner({ placement = "right" }: { placement?: "left" | "right" }) {
  return (
    <View pointerEvents="none" style={[styles.cardCorner, placement === "left" ? styles.cardCornerLeft : styles.cardCornerRight]}>
      <Image accessible={false} source={rangoli} resizeMode="contain" style={styles.cardCornerImage} />
    </View>
  );
}

const styles = StyleSheet.create({
  appSurface: { flex: 1, overflow: "hidden" },
  appContent: { flex: 1, zIndex: 3 },
  globalGarland: { position: "absolute", left: 0, right: 0, top: 14, width: "100%", height: 46, zIndex: 2 },
  appPattern: { position: "absolute", width: 230, height: 230, opacity: 0.055, tintColor: "#C98400" },
  appPatternTop: { top: 88, right: -92, transform: [{ rotate: "-18deg" }] },
  appPatternMiddle: { top: "42%", left: -118, transform: [{ rotate: "155deg" }] },
  appPatternBottom: { bottom: 54, right: -100, transform: [{ rotate: "22deg" }] },
  appSparkles: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: 0.035 },
  headerLayer: { position: "absolute", left: -20, right: -20, top: -33, height: 136, overflow: "visible", zIndex: 0 },
  lanternLeft: { position: "absolute", left: 24, top: -8, width: 24, height: 50 },
  lanternRight: { position: "absolute", right: 70, top: 25, width: 31, height: 60 },
  headerWatermark: { position: "absolute", left: "32%", top: 50, width: 142, height: 96, opacity: 0.1, tintColor: "#D99A18" },
  twinkle: { position: "absolute", width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFE8A3", shadowColor: "#F6A500", shadowOpacity: 0.9, shadowRadius: 5, elevation: 3 },
  twinkleOne: { left: "36%", top: 22 },
  twinkleTwo: { right: "28%", top: 32 },
  greetingDiya: { position: "absolute", left: 106, bottom: 0, width: 62, height: 48 },
  heroFabric: { position: "absolute", right: -14, top: -12, width: 460, height: 228, opacity: 0.92 },
  heroFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  heroDivider: { position: "absolute", left: 14, top: 80, width: 164, height: 50, opacity: 0.9 },
  heroDiyas: { position: "absolute", right: 2, bottom: -7, width: 151, height: 94, opacity: 0.98 },
  cardCorner: { position: "absolute", width: 68, height: 68, opacity: 0.16 },
  cardCornerImage: { width: "100%", height: "100%" },
  cardCornerRight: { right: -15, bottom: -17 },
  cardCornerLeft: { left: -16, top: -18, transform: [{ rotate: "180deg" }] }
});
