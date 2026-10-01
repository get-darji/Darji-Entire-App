import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ImageSourcePropType,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExplanationInfo } from "./clothDetailsAssets";

export interface ExplanationVideoModalProps {
  visible: boolean;
  onClose: () => void;
  info: ExplanationInfo | null;
  image?: ImageSourcePropType;
}

const BRAND_ORANGE = "#F5A400";
const NAVY_DARK = "#08284A";
const NAVY_LIGHT = "#0E3C6E";
const SLATE_MUTED = "#64748B";

export function ExplanationVideoModal({
  visible,
  onClose,
  info,
  image
}: ExplanationVideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0.35);

  useEffect(() => {
    if (visible) {
      setIsPlaying(true);
      setProgress(0.15);
    }
  }, [visible]);

  useEffect(() => {
    let interval: any;
    if (visible && isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) return 0;
          return prev + 0.04;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [visible, isPlaying]);

  if (!info) return null;

  const totalDuration = info.durationSeconds || 24;
  const currentSec = Math.floor(progress * totalDuration);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Top Drag Indicator */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextBlock}>
              <View style={styles.videoBadge}>
                <Ionicons name="videocam-outline" size={13} color={BRAND_ORANGE} />
                <Text style={styles.videoBadgeText}>Explanation Video</Text>
              </View>
              <Text style={styles.modalTitle}>{info.title}</Text>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* One line explanation */}
          <Text style={styles.explanationText}>{info.shortExplanation}</Text>

          {/* Video Player Visual Frame */}
          <View style={styles.videoPlayerFrame}>
            {image ? (
              <Image source={image} style={styles.videoPoster} resizeMode="cover" />
            ) : null}

            {/* Video Overlay & Controls */}
            <View style={styles.videoOverlay}>
              <Pressable
                style={styles.playButtonCircle}
                onPress={() => setIsPlaying(!isPlaying)}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={26}
                  color="#FFFFFF"
                  style={{ marginLeft: isPlaying ? 0 : 3 }}
                />
              </Pressable>

              {/* Bottom Scrubber & Time */}
              <View style={styles.playerControlsBar}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.max(0, progress * 100))}%` }
                    ]}
                  />
                  <View
                    style={[
                      styles.progressThumb,
                      { left: `${Math.min(97, Math.max(0, progress * 100))}%` }
                    ]}
                  />
                </View>

                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(currentSec)}</Text>
                  <Text style={styles.timeText}>{formatTime(totalDuration)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Key Bullet Highlights if available */}
          {info.detailedPoints && info.detailedPoints.length > 0 ? (
            <View style={styles.bulletSection}>
              {info.detailedPoints.map((point, index) => (
                <View key={index} style={styles.bulletItem}>
                  <Ionicons name="checkmark-circle" size={16} color={BRAND_ORANGE} />
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Got it CTA */}
          <Pressable style={styles.gotItButton} onPress={onClose}>
            <Text style={styles.gotItButtonText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 40, 74, 0.65)",
    justifyContent: "flex-end"
  },
  backdropDismiss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12
  },
  videoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF8EB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6
  },
  videoBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: BRAND_ORANGE
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: NAVY_DARK,
    lineHeight: 23
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center"
  },
  explanationText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: SLATE_MUTED,
    lineHeight: 20,
    marginBottom: 16
  },
  videoPlayerFrame: {
    width: "100%",
    height: 195,
    borderRadius: 16,
    backgroundColor: NAVY_DARK,
    overflow: "hidden",
    position: "relative",
    marginBottom: 16
  },
  videoPoster: {
    width: "100%",
    height: "100%",
    opacity: 0.85
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8, 40, 74, 0.35)",
    alignItems: "center",
    justifyContent: "center"
  },
  playButtonCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(245, 164, 0, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6
  },
  playerControlsBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "rgba(8, 40, 74, 0.65)"
  },
  progressBarBackground: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    position: "relative",
    marginBottom: 6
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: BRAND_ORANGE,
    borderRadius: 2
  },
  progressThumb: {
    position: "absolute",
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: BRAND_ORANGE
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  timeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  bulletSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  bulletText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: NAVY_DARK,
    flex: 1
  },
  gotItButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: NAVY_DARK,
    alignItems: "center",
    justifyContent: "center"
  },
  gotItButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF"
  }
});
