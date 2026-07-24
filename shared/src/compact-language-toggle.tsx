import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppLanguage } from "./localization";

export function CompactLanguageToggle({
  language,
  onSelect
}: {
  language: AppLanguage;
  onSelect: (language: AppLanguage) => void;
}) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {(["en", "hi"] as const).map((option) => {
        const selected = language === option;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option === "en" ? "Switch to English" : "हिंदी में बदलें"}
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option === "en" ? "EN" : "हिं"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dde4ee",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    padding: 3,
    shadowColor: "#0b2241",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  option: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 30,
    minWidth: 36,
    paddingHorizontal: 7
  },
  optionSelected: {
    backgroundColor: "#f6a313"
  },
  label: {
    color: "#65748a",
    fontSize: 11,
    fontWeight: "900"
  },
  labelSelected: {
    color: "#111111"
  }
});
