import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GENDER_FIT_OPTIONS,
  SERVICE_CATEGORIES,
  GenderFitType,
  ServiceCategory
} from "../../config/clothDetails";
import { VisualSelectionCard } from "./VisualSelectionCard";
import { ExplanationVideoModal } from "./ExplanationVideoModal";
import {
  getClothDetailsAsset,
  getExplanationData,
  ExplanationInfo
} from "./clothDetailsAssets";

export interface ClothDetailsSelectionViewProps {
  gender?: string;
  clothType?: string;
  otherClothType?: string;
  serviceCategory?: string;
  selectedWorkItems: string[];
  otherWorkDescription?: string;
  garmentSearch: string;
  filteredGarments: readonly string[];
  selectedService?: ServiceCategory;
  onSelectGender: (gender: GenderFitType) => void;
  onSelectClothType: (clothType: string) => void;
  onChangeOtherClothType: (text: string) => void;
  onSelectServiceCategory: (categoryLabel: string) => void;
  onToggleWorkItem: (workItem: string) => void;
  onChangeOtherWorkDescription: (text: string) => void;
  onGarmentSearchChange: (search: string) => void;
}

const BRAND_ORANGE = "#F5A400";
const NAVY_TEXT = "#08284A";
const MUTED_TEXT = "#64748B";
const BORDER_COLOR = "#E2E8F0";
const SURFACE_BG = "#FFFFFF";
const SURFACE_ALT = "#FFF8EB";

export function ClothDetailsSelectionView({
  gender,
  clothType,
  otherClothType,
  serviceCategory,
  selectedWorkItems,
  otherWorkDescription,
  garmentSearch,
  filteredGarments,
  selectedService,
  onSelectGender,
  onSelectClothType,
  onChangeOtherClothType,
  onSelectServiceCategory,
  onToggleWorkItem,
  onChangeOtherWorkDescription,
  onGarmentSearchChange
}: ClothDetailsSelectionViewProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<ExplanationInfo | null>(null);
  const [activeImage, setActiveImage] = useState<any>(null);

  const handleOpenExplanation = (
    key: string,
    type: "fit" | "category" | "garment" | "service",
    fallbackTitle?: string,
    fitType?: string
  ) => {
    const data = getExplanationData(key, fallbackTitle);
    const img = getClothDetailsAsset(type, key, fitType);
    setActiveExplanation(data);
    setActiveImage(img);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* 1. GENDER / FIT TYPE */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNumberCircle}>
          <Text style={styles.sectionNumberText}>1</Text>
        </View>
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>Gender / Fit Type</Text>
          <Text style={styles.sectionSubtitle}>Choose fit and sizing silhouette</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        {GENDER_FIT_OPTIONS.map((option) => {
          const isSelected = gender === option.value;
          const imageSource = getClothDetailsAsset("fit", option.value);

          return (
            <VisualSelectionCard
              key={option.value}
              title={option.label}
              image={imageSource}
              selected={isSelected}
              multiSelect={false}
              onPress={() => onSelectGender(option.value)}
              showExplanation={true}
              onWatchExplanation={() =>
                handleOpenExplanation(option.value, "fit", option.label)
              }
            />
          );
        })}
      </View>

      {/* 2. SELECT GARMENT */}
      {gender ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>2</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Select Garment</Text>
              <Text style={styles.sectionSubtitle}>Pick the outfit or tailoring piece</Text>
            </View>
          </View>

          {/* Garment Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              value={garmentSearch}
              onChangeText={onGarmentSearchChange}
              placeholder="Search garment (e.g. Kurta, Suit, Blouse)..."
              placeholderTextColor="#94A3B8"
            />
            {garmentSearch ? (
              <Pressable onPress={() => onGarmentSearchChange("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>

          {/* 2-Column Visual Garment Cards */}
          <View style={styles.gridRow}>
            {filteredGarments.map((garment) => {
              const isSelected = clothType === garment;
              const imageSource = getClothDetailsAsset("garment", garment, gender);

              return (
                <VisualSelectionCard
                  key={garment}
                  title={garment}
                  image={imageSource}
                  selected={isSelected}
                  multiSelect={false}
                  onPress={() => onSelectClothType(garment)}
                  showExplanation={true}
                  onWatchExplanation={() =>
                    handleOpenExplanation(garment, "garment", garment, gender)
                  }
                />
              );
            })}
          </View>

          {/* Custom / Other Garment Input */}
          {clothType === "Other" ? (
            <View style={styles.otherInputCard}>
              <Text style={styles.otherInputLabel}>Specify garment type</Text>
              <TextInput
                style={styles.otherInput}
                value={otherClothType ?? ""}
                onChangeText={onChangeOtherClothType}
                placeholder="e.g. Tablecloth, Cushion Cover, Apron, Chef Cap..."
                placeholderTextColor="#94A3B8"
              />
            </View>
          ) : null}

          {!filteredGarments.length ? (
            <View style={styles.emptyNotice}>
              <Ionicons name="search-outline" size={20} color={BRAND_ORANGE} />
              <Text style={styles.emptyNoticeText}>
                No garments match “{garmentSearch.trim()}”.
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.pendingStepCard}>
          <View style={styles.pendingStepNumber}>
            <Text style={styles.pendingStepNumberText}>2</Text>
          </View>
          <View style={styles.pendingStepTextBlock}>
            <Text style={styles.pendingStepTitle}>Select Garment</Text>
            <Text style={styles.pendingStepHelper}>
              Choose gender / fit type first to unlock garment options.
            </Text>
          </View>
          <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
        </View>
      )}

      {/* 3. SELECT SERVICE CATEGORY */}
      {gender && clothType ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>3</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Select Service Category</Text>
              <Text style={styles.sectionSubtitle}>
                What type of tailoring work is required?
              </Text>
            </View>
          </View>

          {/* Service Category Cards */}
          <View style={styles.categoryList}>
            {SERVICE_CATEGORIES.map((category) => {
              const isSelected = selectedService?.id === category.id;
              const imageSource = getClothDetailsAsset("category", category.label);

              return (
                <VisualSelectionCard
                  key={category.id}
                  title={category.label}
                  subtitle={category.subtitle}
                  image={imageSource}
                  selected={isSelected}
                  layout="horizontal"
                  multiSelect={false}
                  onPress={() => onSelectServiceCategory(category.label)}
                  showExplanation={true}
                  onWatchExplanation={() =>
                    handleOpenExplanation(category.label, "category", category.label)
                  }
                />
              );
            })}
          </View>
        </View>
      ) : gender ? (
        <View style={styles.pendingStepCard}>
          <View style={styles.pendingStepNumber}>
            <Text style={styles.pendingStepNumberText}>3</Text>
          </View>
          <View style={styles.pendingStepTextBlock}>
            <Text style={styles.pendingStepTitle}>Select Service Category</Text>
            <Text style={styles.pendingStepHelper}>
              Choose a garment first to continue.
            </Text>
          </View>
          <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
        </View>
      ) : null}

      {/* 4. SELECT WORK */}
      {gender && clothType && selectedService ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNumberCircle}>
              <Text style={styles.sectionNumberText}>4</Text>
            </View>
            <View style={styles.sectionTitleBlock}>
              <View style={styles.workTitleRow}>
                <Text style={styles.sectionTitle}>Select Work</Text>
                <View style={styles.multiSelectBadge}>
                  <Text style={styles.multiSelectBadgeText}>Select Multiple</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Choose all specific tailoring tasks needed
              </Text>
            </View>
          </View>

          {selectedService.label === "Other" ? (
            <TextInput
              multiline
              style={styles.otherWorkInput}
              value={otherWorkDescription ?? ""}
              onChangeText={onChangeOtherWorkDescription}
              placeholder="Describe the specific tailoring or alteration work you need..."
              placeholderTextColor="#94A3B8"
            />
          ) : (
            <View style={styles.gridRow}>
              {selectedService.workItems.map((workItem) => {
                const isSelected = selectedWorkItems.includes(workItem);
                const imageSource = getClothDetailsAsset("service", workItem);

                return (
                  <VisualSelectionCard
                    key={workItem}
                    title={workItem}
                    image={imageSource}
                    selected={isSelected}
                    multiSelect={true}
                    onPress={() => onToggleWorkItem(workItem)}
                    showExplanation={true}
                    onWatchExplanation={() =>
                      handleOpenExplanation(workItem, "service", workItem)
                    }
                  />
                );
              })}
            </View>
          )}

          <View style={styles.clothTipBanner}>
            <Ionicons name="bulb-outline" size={20} color={BRAND_ORANGE} />
            <Text style={styles.clothTipCopy}>
              You can select multiple specific works under {selectedService.label}.
            </Text>
          </View>
        </View>
      ) : gender && clothType ? (
        <View style={styles.pendingStepCard}>
          <View style={styles.pendingStepNumber}>
            <Text style={styles.pendingStepNumberText}>4</Text>
          </View>
          <View style={styles.pendingStepTextBlock}>
            <Text style={styles.pendingStepTitle}>Select Work</Text>
            <Text style={styles.pendingStepHelper}>
              Choose a service category to see work options.
            </Text>
          </View>
          <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
        </View>
      ) : null}

      {/* Reusable Explanation Video Modal */}
      <ExplanationVideoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        info={activeExplanation}
        image={activeImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: 8
  },
  sectionBlock: {
    marginTop: 18
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12
  },
  sectionNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: NAVY_TEXT,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  sectionTitleBlock: {
    flex: 1
  },
  workTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: NAVY_TEXT,
    lineHeight: 20
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: "600",
    color: MUTED_TEXT,
    marginTop: 2
  },
  multiSelectBadge: {
    backgroundColor: "#FFF8EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A"
  },
  multiSelectBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: BRAND_ORANGE
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10
  },
  categoryList: {
    gap: 8
  },
  searchBox: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1.2,
    borderColor: BORDER_COLOR,
    backgroundColor: SURFACE_BG,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 14
  },
  searchInput: {
    flex: 1,
    color: NAVY_TEXT,
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 0
  },
  otherInputCard: {
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: SURFACE_ALT,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.2,
    borderColor: "#FDE68A"
  },
  otherInputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: NAVY_TEXT,
    marginBottom: 6
  },
  otherInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: SURFACE_BG,
    paddingHorizontal: 12,
    color: NAVY_TEXT,
    fontSize: 13,
    fontWeight: "700"
  },
  otherWorkInput: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: BORDER_COLOR,
    backgroundColor: SURFACE_BG,
    padding: 13,
    color: NAVY_TEXT,
    textAlignVertical: "top",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    marginBottom: 10
  },
  emptyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SURFACE_ALT,
    borderRadius: 12,
    padding: 14,
    marginTop: 8
  },
  emptyNoticeText: {
    color: NAVY_TEXT,
    fontSize: 13,
    fontWeight: "700"
  },
  clothTipBanner: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SURFACE_ALT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12
  },
  clothTipCopy: {
    flex: 1,
    color: MUTED_TEXT,
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 16
  },
  pendingStepCard: {
    minHeight: 58,
    borderRadius: 13,
    borderWidth: 1.2,
    borderColor: BORDER_COLOR,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    opacity: 0.85
  },
  pendingStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center"
  },
  pendingStepNumberText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900"
  },
  pendingStepTextBlock: {
    flex: 1
  },
  pendingStepTitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800"
  },
  pendingStepHelper: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1
  }
});
