import React from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ImageSourcePropType,
  GestureResponderEvent
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface VisualSelectionCardProps {
  title: string;
  subtitle?: string;
  image: ImageSourcePropType;
  selected: boolean;
  multiSelect?: boolean;
  onPress: () => void;
  showExplanation?: boolean;
  onWatchExplanation?: () => void;
  cardWidth?: string | number;
  layout?: "grid" | "horizontal";
}

const BRAND_ORANGE = "#F5A400";
const NAVY_TEXT = "#08284A";
const MUTED_TEXT = "#64748B";
const BORDER_COLOR = "#E2E8F0";
const CARD_BG = "#FFFFFF";
const SELECTED_BG = "#FFF8EB";

export function VisualSelectionCard({
  title,
  subtitle,
  image,
  selected,
  multiSelect = false,
  onPress,
  showExplanation = true,
  onWatchExplanation,
  cardWidth = "48%",
  layout = "grid"
}: VisualSelectionCardProps) {
  const handleExplanationPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (onWatchExplanation) {
      onWatchExplanation();
    }
  };

  if (layout === "horizontal") {
    return (
      <Pressable
        style={[
          styles.horizontalCard,
          selected ? styles.cardSelected : styles.cardUnselected
        ]}
        onPress={onPress}
      >
        <View style={styles.horizontalImageContainer}>
          <Image source={image} style={styles.horizontalImage} resizeMode="cover" />
        </View>

        <View style={styles.horizontalContent}>
          <Text numberOfLines={2} style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={2} style={styles.cardSubtitle}>
              {subtitle}
            </Text>
          ) : null}

          {showExplanation && onWatchExplanation ? (
            <Pressable
              style={styles.watchExplanationRow}
              onPress={handleExplanationPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="play-circle" size={14} color={BRAND_ORANGE} />
              <Text style={styles.watchExplanationText}>Watch explanation</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.indicatorContainer}>
          {multiSelect ? (
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
              {selected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
            </View>
          ) : (
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioInner} /> : null}
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[
        styles.gridCard,
        { width: cardWidth as any },
        selected ? styles.cardSelected : styles.cardUnselected
      ]}
      onPress={onPress}
    >
      {/* Top Corner Selection Indicator */}
      <View style={styles.topIndicatorContainer}>
        {multiSelect ? (
          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
            {selected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
          </View>
        ) : (
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected ? <View style={styles.radioInner} /> : null}
          </View>
        )}
      </View>

      {/* Visual Image Area taking ~58% of card */}
      <View style={styles.gridImageContainer}>
        <Image source={image} style={styles.gridImage} resizeMode="cover" />
      </View>

      {/* Card Body */}
      <View style={styles.gridContent}>
        <Text numberOfLines={2} style={[styles.gridTitle, selected && styles.cardTitleSelected]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.gridSubtitle}>
            {subtitle}
          </Text>
        ) : null}

        {/* Watch Explanation Action */}
        {showExplanation && onWatchExplanation ? (
          <Pressable
            style={styles.gridWatchAction}
            onPress={handleExplanationPress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="play-circle-outline" size={13} color={BRAND_ORANGE} />
            <Text style={styles.gridWatchText}>Watch explanation</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    minHeight: 180,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: BORDER_COLOR,
    overflow: "hidden",
    marginBottom: 10,
    position: "relative",
    justifyContent: "space-between"
  },
  horizontalCard: {
    width: "100%",
    minHeight: 84,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: BORDER_COLOR,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
    overflow: "hidden"
  },
  cardSelected: {
    borderColor: BRAND_ORANGE,
    borderWidth: 1.6,
    backgroundColor: SELECTED_BG
  },
  cardUnselected: {
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BG
  },
  topIndicatorContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10
  },
  indicatorContainer: {
    paddingLeft: 8
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    borderWidth: 1.8,
    borderColor: "#94A3B8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  radioSelected: {
    borderColor: BRAND_ORANGE,
    backgroundColor: "#FFFFFF"
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_ORANGE
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: "#94A3B8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxSelected: {
    borderColor: BRAND_ORANGE,
    backgroundColor: BRAND_ORANGE
  },
  gridImageContainer: {
    width: "100%",
    height: 108,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  gridImage: {
    width: "100%",
    height: "100%"
  },
  horizontalImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  horizontalImage: {
    width: "100%",
    height: "100%"
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: "flex-start",
    width: "100%"
  },
  horizontalContent: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: NAVY_TEXT,
    lineHeight: 17,
    letterSpacing: -0.2
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: NAVY_TEXT,
    lineHeight: 18
  },
  cardTitleSelected: {
    color: NAVY_TEXT
  },
  gridSubtitle: {
    fontSize: 10.5,
    fontWeight: "600",
    color: MUTED_TEXT,
    lineHeight: 14,
    marginTop: 2
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: MUTED_TEXT,
    lineHeight: 15,
    marginTop: 2
  },
  gridWatchAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingVertical: 2
  },
  gridWatchText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: BRAND_ORANGE
  },
  watchExplanationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5
  },
  watchExplanationText: {
    fontSize: 11,
    fontWeight: "800",
    color: BRAND_ORANGE
  }
});
