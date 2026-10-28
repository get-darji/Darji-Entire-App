import { useEffect, useRef, useState } from "react";
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

export function DiwaliHeaderDecor({ motion }: { motion: Motion }) {
  const rotate = motion.sway.interpolate({ inputRange: [-1, 1], outputRange: ["-3deg", "3deg"] });
  return (
    <View pointerEvents="none" style={styles.headerLayer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.Image source={headerLights} resizeMode="stretch" style={[styles.headerLights, { opacity: motion.lights }]} />
      <Animated.Image source={lantern} resizeMode="contain" style={[styles.lanternLeft, { transform: [{ rotate }] }]} />
      <Animated.Image source={lantern} resizeMode="contain" style={[styles.lanternRight, { transform: [{ rotate }] }]} />
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
  headerLayer: { position: "absolute", left: -20, right: -20, top: -18, height: 104, overflow: "visible", zIndex: 0 },
  headerLights: { position: "absolute", left: 0, right: 0, top: 0, width: "100%", height: 54 },
  lanternLeft: { position: "absolute", left: 12, top: 24, width: 31, height: 55 },
  lanternRight: { position: "absolute", right: 74, top: 19, width: 25, height: 48 },
  twinkle: { position: "absolute", width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFE8A3", shadowColor: "#F6A500", shadowOpacity: 0.9, shadowRadius: 5, elevation: 3 },
  twinkleOne: { left: "36%", top: 22 },
  twinkleTwo: { right: "28%", top: 32 },
  greetingDiya: { width: 58, height: 42, marginLeft: 7, marginTop: -4 },
  heroFabric: { position: "absolute", right: -18, top: -44, width: 150, height: 205, opacity: 0.8 },
  heroFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  heroDivider: { position: "absolute", left: 20, top: 66, width: 155, height: 35, opacity: 0.88 },
  heroDiyas: { position: "absolute", right: -6, bottom: -8, width: 143, height: 84, opacity: 0.95 },
  cardCorner: { position: "absolute", width: 68, height: 68, opacity: 0.16 },
  cardCornerImage: { width: "100%", height: "100%" },
  cardCornerRight: { right: -15, bottom: -17 },
  cardCornerLeft: { left: -16, top: -18, transform: [{ rotate: "180deg" }] }
});
