import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, StatusBar, Switch, Text, TextInput, View, Alert, Modal, KeyboardAvoidingView, BackHandler, TouchableOpacity, type ImageSourcePropType } from "react-native";
import { api, uploadTailorAvatar, uploadTailorVerificationMedia } from "../api";
import { useAppStore } from "../store";
import { getLanguageLabel, t, type AppLanguage } from "../../../../shared/src/localization";

function normalizedAvatarGender(gender?: string) {
  const value = gender?.trim().toLowerCase();
  if (!value) return undefined;
  if (["male", "man", "men", "boy"].includes(value)) return "boy";
  if (["female", "woman", "women", "girl"].includes(value)) return "girl";
  return undefined;
}

const avatarImages = {
  boy: require("../../assets/icons/boy.png"),
  girl: require("../../assets/icons/girl.png"),
  youngMale: require("../../assets/icons/young male.png"),
  youngFemale: require("../../assets/icons/young female.png"),
  uncle: require("../../assets/icons/uncle.png"),
  aunt: require("../../assets/icons/aunt.png"),
  aunt2: require("../../assets/icons/aunt_2.png"),
  blackMale: require("../../assets/icons/black_male.png"),
  blackFemale: require("../../assets/icons/black_female.png"),
  oldMale: require("../../assets/icons/old_male.png"),
  tannedMale: require("../../assets/icons/tanned_male.png"),
  tannedMale2: require("../../assets/icons/tanned_male_2.png"),
  tannedUncle: require("../../assets/icons/tanned_uncle.png")
} as const;
type AvatarPreset = keyof typeof avatarImages;
const avatarOptions: Array<{ key: AvatarPreset; label: string }> = [
  { key: "boy", label: "Boy" },
  { key: "girl", label: "Girl" },
  { key: "youngMale", label: "Young Male" },
  { key: "youngFemale", label: "Young Female" },
  { key: "uncle", label: "Uncle" },
  { key: "aunt", label: "Aunt" },
  { key: "blackMale", label: "Male" },
  { key: "blackFemale", label: "Female" },
  { key: "oldMale", label: "Old Male" },
  { key: "tannedMale", label: "Male 2" },
  { key: "tannedMale2", label: "Male 3" },
  { key: "tannedUncle", label: "Uncle 2" },
  { key: "aunt2", label: "Aunt 2" }
];

function hashSeed(value: string) {
  return Array.from(value || "User").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function getFallbackAvatar(name?: string, gender?: string, preset?: AvatarPreset): ImageSourcePropType {
  const str = name || "User";
  if (preset) return avatarImages[preset];
  const selectedGender = normalizedAvatarGender(gender);
  if (selectedGender === "boy") return avatarImages[["boy", "youngMale", "blackMale", "tannedMale", "uncle", "oldMale"][hashSeed(str) % 6] as AvatarPreset];
  if (selectedGender === "girl") return avatarImages[["girl", "youngFemale", "blackFemale", "aunt", "aunt2"][hashSeed(str) % 5] as AvatarPreset];
  return avatarImages[avatarOptions[hashSeed(str) % avatarOptions.length].key];
}

const BRAND_ORANGE = "#f6a313";
const BRAND_DEEP = "#0b2241";
const SCREEN_BG = "#f7faff";
const SURFACE = "#ffffff";
const BORDER = "#dde4ee";
const MUTED = "#65748a";
const SUCCESS = "#15803d";
const DANGER = "#dc2626";
const STATUS_BAR_INSET = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
const SCREEN_TOP_PADDING = STATUS_BAR_INSET + 24;

type IconName = keyof typeof Ionicons.glyphMap;
type DialogState = { title: string; message: string; icon?: IconName };
type TailorSettings = {
  notifications?: boolean;
  soundAlerts?: boolean;
  compactCards?: boolean;
  autoOpenNewRequests?: boolean;
  maxOrdersPerDay?: number;
  darkMode?: boolean;
};
type TailorProfile = {
  id: string;
  shopName: string;
  specialization: string[];
  rating: number;
  ratingCount?: number;
  isAvailable: boolean;
  earnings: number;
  workingHours?: { from?: string; to?: string };
  settings?: TailorSettings;
};
type MeResponse = {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role: string;
  tailorProfile?: TailorProfile;
};
type Order = { id: string; status: string; totalAmount: number | string; createdAt?: string; tailorRating?: number; rating?: number; review?: { rating?: number } };
type SupportScreen = "faqs" | "chat" | "call" | "email" | "complaint" | "bug" | "feature" | "privacy" | "terms" | "cancellation" | "version" | "about" | "support_center" | "requests";

type Props = {
  me?: MeResponse;
  token?: string;
  orders: Order[];
  refresh: () => void;
  showDialog: (dialog: DialogState) => void;
  onSessionExpired: () => void;
  onOpenTransactions: () => void;
  onOpenOrders?: () => void;
  socket?: any;
  initialSupportScreen?: string | null;
  clearInitialSupportScreen?: () => void;
};

function isSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /authentication required|invalid session|invalid or expired token|session expired/i.test(message);
}

export function TailorProfileScreen({ me, token, orders, refresh, showDialog, onSessionExpired, onOpenTransactions, onOpenOrders, socket, initialSupportScreen, clearInitialSupportScreen }: Props) {
  const { signOut } = useAppStore();
  const language = useAppStore((state) => state.language);
  const setLanguagePreference = useAppStore((state) => state.setLanguagePreference);
  const profile = me?.tailorProfile;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const settingsFromServer = useMemo(() => profile?.settings ?? {}, [profile?.settings]);
  const maxOrdersPerDay = settingsFromServer.maxOrdersPerDay ?? 8;
  const activeOrders = orders.filter((order) => !["READY", "DELIVERED", "CANCELLED"].includes(order.status)).length;
  const completedOrders = orders.filter((order) => ["READY", "DELIVERED", "STITCHING_COMPLETED"].includes(order.status)).length;
  const maxReached = activeOrders >= maxOrdersPerDay;
  const ratingValues = orders
    .map((order) => order.tailorRating ?? order.review?.rating ?? order.rating)
    .filter((rating): rating is number => typeof rating === "number" && rating > 0);
  const averageRating = ratingValues.length ? ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length : Number(profile?.rating ?? 0);
  const ratingCount = ratingValues.length || profile?.ratingCount || 0;

  const [editing, setEditing] = useState(false);
  const [showShopDetails, setShowShopDetails] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [shopChangeRequest, setShopChangeRequest] = useState("");
  const [submittingShopChange, setSubmittingShopChange] = useState(false);
  const [bankChangeRequest, setBankChangeRequest] = useState("");
  const [submittingBankChange, setSubmittingBankChange] = useState(false);

  const [supportScreen, setSupportScreen] = useState<SupportScreen>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreset, setAvatarPreset] = useState<AvatarPreset>();
  const [name, setName] = useState(me?.name ?? "");
  const [shopName, setShopName] = useState(profile?.shopName ?? "Darzi Tailor");
  const [email, setEmail] = useState(me?.email ?? "");
  const [workingFrom, setWorkingFrom] = useState(profile?.workingHours?.from ?? "10:00");
  const [workingTo, setWorkingTo] = useState(profile?.workingHours?.to ?? "20:00");
  const [available, setAvailable] = useState(Boolean(profile?.isAvailable ?? true));
  const [vacationMode, setVacationMode] = useState(false);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [emergencyPause, setEmergencyPause] = useState(false);
  const [notifications, setNotifications] = useState({
    newOrderAlerts: settingsFromServer.notifications ?? true,
    sound: settingsFromServer.soundAlerts ?? true,
    vibration: true
  });
  const [general, setGeneral] = useState({
    darkMode: settingsFromServer.darkMode ?? false
  });

  const palette = general.darkMode ? darkPalette : lightPalette;
  const styles = useMemo(() => createStyles(palette), [palette]);

  function handleLanguageChange(nextLanguage: AppLanguage) {
    setLanguagePreference(nextLanguage);
    showDialog({ title: t(nextLanguage, "languageUpdated"), message: t(nextLanguage, "languageUpdatedMessage"), icon: "checkmark-circle-outline" });
  }

  useEffect(() => {
    if (!me?.id) return;
    AsyncStorage.getItem(`darji.tailor.avatarPreset.${me.id}`)
      .then((stored) => {
        if (stored && stored in avatarImages) setAvatarPreset(stored as AvatarPreset);
      })
      .catch(() => undefined);
  }, [me?.id]);

  useEffect(() => {
    if (initialSupportScreen === "support_center") {
      setSupportScreen("support_center");
      clearInitialSupportScreen?.();
    }
  }, [initialSupportScreen]);

  useEffect(() => {
    setName(me?.name ?? "");
    setShopName(profile?.shopName ?? "Darzi Tailor");
    setEmail(me?.email ?? "");
    setWorkingFrom(profile?.workingHours?.from ?? "10:00");
    setWorkingTo(profile?.workingHours?.to ?? "20:00");
    setAvailable(Boolean(profile?.isAvailable ?? true));
    setNotifications((current) => ({ ...current, newOrderAlerts: settingsFromServer.notifications ?? true, sound: settingsFromServer.soundAlerts ?? true }));
    setGeneral((current) => ({ ...current, darkMode: settingsFromServer.darkMode ?? false }));
  }, [me?.name, me?.email, profile]);

  async function updateAvailability(value: boolean) {
    setAvailable(value);
    if (!token) return;
    try {
      setSavingAvailability(true);
      await api("/tailors/me/availability", { method: "PATCH", body: JSON.stringify({ isAvailable: value }) }, token);
      refresh();
    } catch (error) {
      setAvailable(!value);
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Availability failed", message: "Could not update availability.", icon: "alert-circle-outline" });
    } finally {
      setSavingAvailability(false);
    }
  }

  async function saveProfile() {
    if (!token) return;
    try {
      setSavingProfile(true);
      await api(
        "/tailors/me/profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            shopName: shopName.trim(),
            workingHours: { from: workingFrom.trim(), to: workingTo.trim() },
            settings: {
              notifications: notifications.newOrderAlerts,
              soundAlerts: notifications.sound,
              darkMode: general.darkMode,
              maxOrdersPerDay
            }
          })
        },
        token
      );
      setEditing(false);
      showDialog({ title: "Profile saved", message: "Your profile and settings were updated.", icon: "checkmark-circle-outline" });
      refresh();
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Save failed", message: error instanceof Error ? error.message : "Could not save profile.", icon: "alert-circle-outline" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function pickAvatar() {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({ title: "Permission needed", message: "Allow photo access to update your profile picture.", icon: "images-outline" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled || !result.assets.length) return;
    try {
      setUploadingAvatar(true);
      await uploadTailorAvatar({ uri: result.assets[0].uri, name: result.assets[0].fileName ?? `tailor-avatar-${Date.now()}.jpg` }, token);
      showDialog({ title: "Photo updated", message: "Your profile photo has been saved.", icon: "person-circle-outline" });
      refresh();
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not upload profile photo.", icon: "alert-circle-outline" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function chooseAvatarPreset(preset: AvatarPreset) {
    setAvatarPreset(preset);
    if (me?.id) await AsyncStorage.setItem(`darji.tailor.avatarPreset.${me.id}`, preset);
    showDialog({ title: "Avatar selected", message: "Your default avatar has been updated on this device.", icon: "person-circle-outline" });
  }

  async function submitShopChangeRequest() {
    if (shopChangeRequest.trim().length < 10) {
      Alert.alert("Request too short", "Please explain your shop details change request in at least 10 characters.");
      return;
    }
    if (!token) return;
    try {
      setSubmittingShopChange(true);
      await api("/support", {
        method: "POST",
        body: JSON.stringify({
          subject: "Shop Details Change Request",
          message: `[Shop: ${shopName}] Request: ${shopChangeRequest.trim()}`
        })
      }, token);
      setShopChangeRequest("");
      showDialog({ title: "Request Submitted", message: "Your shop details change request has been sent for admin approval.", icon: "checkmark-circle-outline" });
      setShowShopDetails(false);
    } catch (e) {
      showDialog({ title: "Failed", message: "Could not submit request. Please try again.", icon: "alert-circle-outline" });
    } finally {
      setSubmittingShopChange(false);
    }
  }

  async function submitBankChangeRequest() {
    if (bankChangeRequest.trim().length < 10) {
      Alert.alert("Request too short", "Please explain your bank details change request in at least 10 characters.");
      return;
    }
    if (!token) return;
    try {
      setSubmittingBankChange(true);
      await api("/support", {
        method: "POST",
        body: JSON.stringify({
          subject: "Bank Details Change Request",
          message: `Request: ${bankChangeRequest.trim()}`
        })
      }, token);
      setBankChangeRequest("");
      showDialog({ title: "Request Submitted", message: "Your bank account details change request has been sent for admin approval.", icon: "checkmark-circle-outline" });
      setShowBankDetails(false);
    } catch (e) {
      showDialog({ title: "Failed", message: "Could not submit request. Please try again.", icon: "alert-circle-outline" });
    } finally {
      setSubmittingBankChange(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Pressable style={styles.avatar} onPress={pickAvatar} disabled={uploadingAvatar}>
          <Image source={me?.avatarUrl ? { uri: me.avatarUrl } : getFallbackAvatar(name || shopName, undefined, avatarPreset)} style={styles.avatarImage} />
          <View style={styles.cameraBadge}>{uploadingAvatar ? <ActivityIndicator color="#111111" size="small" /> : <Ionicons name="camera-outline" size={14} color="#111111" />}</View>
        </Pressable>
        <View style={styles.headerMain}>
          <Text style={styles.title}>{shopName}</Text>
          <Text style={styles.meta}>{name || "Tailor Partner"}</Text>
          <Text style={styles.meta}>+91 {me?.phone ?? "XXXXXXXXXX"}</Text>
          <Text style={styles.meta}>{email || "Email not added"}</Text>
          <Text style={styles.completedText}>{completedOrders} completed orders</Text>
        </View>
      </View>

      <Section title={t(language, "account")} icon="person-outline" styles={styles}>
        <InfoRow icon="create-outline" title="Edit Profile" value="Update name, shop details, and hours" styles={styles} onPress={() => setEditing(true)} noBorder />
        <InfoRow icon="storefront-outline" title="Shop Details" value={`${shopName} (Open: ${workingFrom} - ${workingTo})`} styles={styles} onPress={() => setShowShopDetails(true)} />

      </Section>

      <Modal visible={editing} onRequestClose={() => setEditing(false)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.detailHeader}>
              <Pressable style={styles.backButton} onPress={() => setEditing(false)}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Edit Profile</Text>
                <Text style={styles.meta}>Update name, email and shop details</Text>
              </View>
            </View>
            <View style={styles.section}>
              <Input label="Tailor Name" value={name} onChangeText={setName} styles={styles} />
              <Input label="Shop Name" value={shopName} onChangeText={setShopName} styles={styles} />
              <Input label="Email" value={email} onChangeText={setEmail} styles={styles} />
              <View style={styles.inlineInputs}>
                <View style={styles.inlineInput}><Input label="Open From" value={workingFrom} onChangeText={setWorkingFrom} styles={styles} /></View>
                <View style={styles.inlineInput}><Input label="Open Until" value={workingTo} onChangeText={setWorkingTo} styles={styles} /></View>
              </View>
              <Text style={styles.inputLabel}>Choose Avatar</Text>
              <View style={styles.avatarPickerGrid}>
                {avatarOptions.map((option) => (
                  <Pressable key={option.key} style={[styles.avatarOption, avatarPreset === option.key && styles.avatarOptionSelected]} onPress={() => chooseAvatarPreset(option.key)}>
                    <Image source={avatarImages[option.key]} style={styles.avatarOptionImage} />
                    <Text style={styles.avatarOptionLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.primaryButton} onPress={saveProfile} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Save Profile</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showShopDetails} onRequestClose={() => setShowShopDetails(false)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.detailHeader}>
              <Pressable style={styles.backButton} onPress={() => setShowShopDetails(false)}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Shop Details</Text>
                <Text style={styles.meta}>Current shop registration & hours</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>SHOP CONFIGURATION</Text>
              </View>
              <InfoRow icon="storefront-outline" title="Shop Name" value={shopName} styles={styles} />
              <InfoRow icon="time-outline" title="Stitching Capacity" value={`${maxOrdersPerDay} orders limit per day`} styles={styles} />
              <InfoRow icon="calendar-outline" title="Working Hours" value={`${workingFrom} to ${workingTo}`} styles={styles} />
              <InfoRow icon="ribbon-outline" title="Specializations" value={profile?.specialization?.join(", ") || "Custom tailoring"} styles={styles} />
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>REQUEST DETAILS CHANGE</Text>
              </View>
              <Text style={styles.rowCopy}>To update your address, category, or capacity limits, please raise a change request ticket for admin verification.</Text>
              <View style={styles.inputBlock}>
                <TextInput
                  style={styles.input}
                  value={shopChangeRequest}
                  onChangeText={setShopChangeRequest}
                  placeholder="Describe your requested shop changes..."
                  placeholderTextColor="#9aa6b8"
                  multiline
                />
              </View>
              <Pressable style={styles.primaryButton} onPress={submitShopChangeRequest} disabled={submittingShopChange}>
                {submittingShopChange ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Submit Request</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showBankDetails} onRequestClose={() => setShowBankDetails(false)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.detailHeader}>
              <Pressable style={styles.backButton} onPress={() => setShowBankDetails(false)}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Bank Account</Text>
                <Text style={styles.meta}>Payout banking details</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>CURRENT DETAILS</Text>
              </View>
              <InfoRow icon="card-outline" title="Payout Option" value="Bank Transfer (NEFT/IMPS)" styles={styles} />
              <InfoRow icon="business-outline" title="Bank Name" value="Registered Partner Bank" styles={styles} />
              <InfoRow icon="person-circle-outline" title="Account Holder" value={name || "Tailor Partner"} styles={styles} />
              <InfoRow icon="wallet-outline" title="Status" value="Verified for weekly payouts" styles={styles} />
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>REQUEST BANK DETAILS CHANGE</Text>
              </View>
              <Text style={styles.rowCopy}>Submit your new bank account number, IFSC code, and holder name. Our finance team will update it after validation.</Text>
              <View style={styles.inputBlock}>
                <TextInput
                  style={styles.input}
                  value={bankChangeRequest}
                  onChangeText={setBankChangeRequest}
                  placeholder="New bank name, IFSC, account number..."
                  placeholderTextColor="#9aa6b8"
                  multiline
                />
              </View>
              <Pressable style={styles.primaryButton} onPress={submitBankChangeRequest} disabled={submittingBankChange}>
                {submittingBankChange ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Submit Request</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Section title={t(language, "performance")} icon="bar-chart-outline" styles={styles}>
        <InfoRow icon="wallet-outline" title={t(language, "earnings")} value={t(language, "transactionHistoryPayouts")} styles={styles} onPress={onOpenTransactions} noBorder />
        <InfoRow icon="cube-outline" title={t(language, "orderHistory")} value={language === "hi" ? `${completedOrders} ????, ${activeOrders} ?????? ???` : `${completedOrders} completed, ${activeOrders} in progress`} styles={styles} onPress={onOpenOrders} />
        <InfoRow icon="star-outline" title="Average Rating & Reviews" value={`${averageRating ? averageRating.toFixed(1) : "0.0"} rating (${ratingCount} reviews)`} styles={styles} onPress={() => showDialog({ title: "Average Rating & Reviews", message: `Your average customer rating is ${averageRating ? averageRating.toFixed(1) : "0.0"} based on ${ratingCount} customer reviews.`, icon: "star-outline" })} />
      </Section>

      <Section title={t(language, "preferences")} icon="options-outline" styles={styles}>
        <SwitchRow title={t(language, "newOrderAlerts")} copy={t(language, "showRequestPopups")} value={notifications.newOrderAlerts} onValueChange={(value) => setNotifications((s) => ({ ...s, newOrderAlerts: value }))} styles={styles} noBorder />
        <SwitchRow title={t(language, "soundNotifications")} copy={t(language, "playSoundForImportantAlerts")} value={notifications.sound} onValueChange={(value) => setNotifications((s) => ({ ...s, sound: value }))} styles={styles} />
        <SwitchRow title={t(language, "vibration")} copy={t(language, "vibrateOnUrgentAlerts")} value={notifications.vibration} onValueChange={(value) => setNotifications((s) => ({ ...s, vibration: value }))} styles={styles} />
      </Section>
      <Section title={t(language, "appLanguage")} icon="language-outline" styles={styles}>
        <LanguageChoiceRow language={language} onChange={handleLanguageChange} />
      </Section>

      <Section title={t(language, "support")} icon="help-circle-outline" styles={styles}>
        <InfoRow icon="help-buoy-outline" title={t(language, "helpCenter")} value={language === "hi" ? "????-???? ?? ?? ????" : "Faqs and app guides"} styles={styles} onPress={() => setSupportScreen("faqs")} noBorder />
        <InfoRow icon="chatbubble-outline" title={t(language, "supportCenter")} value={language === "hi" ? "??? ????, ??? ???? ?? ?????? ????? ?? ?????? ????" : "Chat, call, or request account updates"} styles={styles} onPress={() => setSupportScreen("support_center")} />
      </Section>

      <Section title={t(language, "policiesInformation")} icon="document-text-outline" styles={styles}>
        <InfoRow icon="information-circle-outline" title={t(language, "aboutDarji")} value={language === "hi" ? "Darji Tailor Partner ?? ?? ???? ??? ?????" : "Learn about Darji Tailor Partner app"} styles={styles} onPress={() => setSupportScreen("about")} noBorder />
        <InfoRow icon="shield-checkmark-outline" title={t(language, "privacyPolicy")} value={language === "hi" ? "???? ????????? ???? ???? ?????? ???? ??" : "How your personal data is handled"} styles={styles} onPress={() => setSupportScreen("privacy")} />
        <InfoRow icon="reader-outline" title={t(language, "termsOfUse")} value={language === "hi" ? "???? ????? ?? ??????" : "Terms of service agreements"} styles={styles} onPress={() => setSupportScreen("terms")} />
      </Section>

      <Section title={t(language, "app")} icon="phone-portrait-outline" styles={styles}>
        <View style={[styles.row, { borderTopWidth: 0 }]}>
          <View style={styles.smallIcon}><Ionicons name="phone-portrait-outline" size={16} color={BRAND_ORANGE} /></View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>{t(language, "appVersion")}</Text>
            <Text style={styles.rowCopy}>0.1.0 (Development)</Text>
          </View>
        </View>
      </Section>

      <Section title={t(language, "accountSettings")} icon="settings-outline" styles={styles}>
        <InfoRow icon="trash-outline" title={t(language, "deleteAccount")} value={t(language, "permanentlyRemoveAccount")} styles={styles} danger onPress={() => showDialog({ title: language === "hi" ? "?????? ????? ????" : "Delete account", message: language === "hi" ? "?????? ????? ?? ?????? ????? ??? ?? ??? ???? ??? ???" : "Account deletion request has been submitted to the admin team.", icon: "trash-outline" })} noBorder />
        <InfoRow
          icon="log-out-outline"
          title={t(language, "logout")}
          value={t(language, "signOutOfAccount")}
          styles={styles}
          onPress={() => setShowLogoutModal(true)}
        />
      </Section>
    </ScrollView>
    <Modal visible={Boolean(supportScreen)} onRequestClose={() => setSupportScreen(undefined)} animationType="slide">
      {supportScreen === "support_center" ? (
        <TailorSupportCenterScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} showDialog={showDialog} />
      ) : supportScreen === "chat" ? (
        <TailorSupportChatScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} socket={socket} />
      ) : supportScreen === "requests" ? (
        <TailorAccountRequestsScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} showDialog={showDialog} />
      ) : supportScreen ? (
        <SupportDetailScreen screen={supportScreen as Exclude<SupportScreen, "support_center" | "requests">} styles={styles} palette={palette} onBack={() => setSupportScreen(undefined)} showDialog={showDialog} />
      ) : null}
    </Modal>

    {/* Custom Logout Confirmation Modal */}
    <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setShowLogoutModal(false)}>
        <Pressable style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 }}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff1f0", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Ionicons name="log-out-outline" size={28} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0b2241", marginBottom: 8 }}>{t(language, "signOut")}</Text>
              <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 }}>{t(language, "logoutConfirm")}</Text>
          </View>
          <Pressable
            style={{ backgroundColor: "#ef4444", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 10 }}
            onPress={() => { setShowLogoutModal(false); signOut(); }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 16 }}>{t(language, "yesSignOut")}</Text>
          </Pressable>
          <Pressable
            style={{ backgroundColor: "#f1f5f9", borderRadius: 14, paddingVertical: 15, alignItems: "center" }}
            onPress={() => setShowLogoutModal(false)}
          >
            <Text style={{ color: "#0b2241", fontWeight: "700", fontSize: 16 }}>{t(language, "cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </View>
  );
}

function Section({ title, icon, styles, children }: { title: string; icon: IconName; styles: ReturnType<typeof createStyles>; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginLeft: 4 }}>
        <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
        <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</Text>
      </View>
      <View style={styles.section}>
        {children}
      </View>
    </View>
  );
}

function Input({ label, value, onChangeText, styles }: { label: string; value: string; onChangeText: (value: string) => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholderTextColor="#9aa6b8" />
    </View>
  );
}

function LanguageChoiceRow({ language, onChange }: { language: AppLanguage; onChange: (language: AppLanguage) => void }) {
  return (
    <View style={{ borderTopWidth: 0, paddingVertical: 4 }}>
      <Text style={{ color: MUTED, fontSize: 13, marginBottom: 12 }}>{t(language, "currentLanguage")}: {getLanguageLabel(language)}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(["en", "hi"] as const).map((option) => (
          <Pressable
            key={option}
            style={{
              flex: 1,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: language === option ? BRAND_ORANGE : BORDER,
              backgroundColor: language === option ? "#fff4db" : SURFACE,
              paddingVertical: 12,
              alignItems: "center"
            }}
            onPress={() => onChange(option)}
          >
            <Text style={{ color: language === option ? BRAND_DEEP : MUTED, fontWeight: "800" }}>{getLanguageLabel(option)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SwitchRow({ title, copy, value, onValueChange, styles, danger, disabled, noBorder }: { title: string; copy: string; value: boolean; onValueChange: (value: boolean) => void; styles: ReturnType<typeof createStyles>; danger?: boolean; disabled?: boolean; noBorder?: boolean }) {
  return (
    <View style={[styles.row, disabled ? styles.disabledRow : null, noBorder ? { borderTopWidth: 0 } : null]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.rowCopy}>{copy}</Text>
      </View>
      <Switch disabled={disabled} value={value} onValueChange={onValueChange} thumbColor="#ffffff" trackColor={{ true: danger ? DANGER : BRAND_ORANGE, false: "#dbe1e9" }} />
    </View>
  );
}

function ReadonlyMetric({ title, value, copy, styles, danger }: { title: string; value: string; copy: string; styles: ReturnType<typeof createStyles>; danger?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.rowCopy}>{copy}</Text>
      </View>
      <Text style={[styles.metricValue, danger && styles.dangerText]}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, title, value, styles, onPress, danger, noBorder }: { icon: IconName; title: string; value: string; styles: ReturnType<typeof createStyles>; onPress?: () => void; danger?: boolean; noBorder?: boolean }) {
  return (
    <Pressable style={[styles.row, noBorder ? { borderTopWidth: 0 } : null]} onPress={onPress} disabled={!onPress}>
      <View style={styles.smallIcon}><Ionicons name={icon} size={16} color={danger ? DANGER : BRAND_ORANGE} /></View>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, danger ? { color: DANGER } : null]}>{title}</Text>
        <Text style={styles.rowCopy}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? DANGER : MUTED} />
    </Pressable>
  );
}

function SupportDetailScreen({ screen, styles, palette, onBack, showDialog }: { screen: Exclude<SupportScreen, "support_center" | "requests">; styles: ReturnType<typeof createStyles>; palette: any; onBack: () => void; showDialog: (dialog: DialogState) => void }) {
  const detail = supportDetails[screen];
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.meta}>{detail.subtitle}</Text>
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.detailIcon}><Ionicons name={detail.icon} size={24} color={BRAND_ORANGE} /></View>
        <Text style={styles.detailCopy}>{detail.copy}</Text>
        {detail.points.map((point) => (
          <View key={point} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{point}</Text>
          </View>
        ))}
        {detail.action ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              if (detail.action?.url) {
                void Linking.openURL(detail.action.url);
              } else {
                showDialog({ title: detail.action?.label ?? detail.title, message: "This support action will be connected to live support later.", icon: detail.icon });
              }
            }}
          >
            <Text style={styles.primaryButtonText}>{detail.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function hasUnreadMessages(ticketOrBug: any): boolean {
  if (!ticketOrBug) return false;
  if (ticketOrBug.messages && ticketOrBug.messages.length > 0) {
    return ticketOrBug.messages.some((msg: any) => (msg.sender === "admin" || msg.sender === "system") && !msg.read);
  }
  return false;
}

function TailorSupportChatScreen({ setScreen, palette, styles, token, socket }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string; socket?: any }) {
  const [view, setView] = useState<"center" | "chat" | "new_chat">("center");
  const [tickets, setTickets] = useState<any[]>([]);
  const [bugReports, setBugReports] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New ticket form
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Active chat
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const loadTickets = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api<{ data?: any[] }>("/support", { method: "GET" }, token);
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const filtered = sorted.filter((t) => t.subject !== "Bug Report");
      setTickets(filtered);
    } catch (e) {
      console.log("Failed to load tickets", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadBugReports = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<{ data?: any[] }>("/support/bug-reports", { method: "GET" }, token);
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setBugReports(sorted);
    } catch (e) {
      console.log("Failed to load bug reports", e);
    }
  }, [token]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<{ data?: any[] }>("/orders", { method: "GET" }, token);
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setOrders(list);
    } catch (e) {
      console.log("Failed to load orders", e);
    }
  }, [token]);

  useEffect(() => {
    loadTickets();
    loadBugReports();
    loadOrders();
  }, [loadTickets, loadBugReports, loadOrders]);

  // Socket event listener for real-time ticket/bug updates
  useEffect(() => {
    if (!socket) return;

    const handleTicketUpdated = ({ ticket }: { ticket: any }) => {
      setTickets((prev) => {
        const idx = prev.findIndex((t) => (t._id || t.id) === (ticket._id || ticket.id));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = ticket;
          return next;
        }
        return [...prev, ticket];
      });
      setActiveTicket((current: any) => {
        if (current && (current._id || current.id) === (ticket._id || ticket.id)) {
          return ticket;
        }
        return current;
      });
    };

    const handleBugUpdated = ({ bug }: { bug: any }) => {
      setBugReports((prev) => {
        const idx = prev.findIndex((b) => (b._id || b.id) === (bug._id || bug.id));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = bug;
          return next;
        }
        return [...prev, bug];
      });
      setActiveTicket((current: any) => {
        if (current && (current._id || current.id) === (bug._id || bug.id)) {
          return bug;
        }
        return current;
      });
    };

    socket.on("support:ticket_updated", handleTicketUpdated);
    socket.on("support:bug_updated", handleBugUpdated);

    return () => {
      socket.off("support:ticket_updated", handleTicketUpdated);
      socket.off("support:bug_updated", handleBugUpdated);
    };
  }, [socket]);

  // Mark open chat messages as read
  useEffect(() => {
    if (view === "chat" && activeTicket && !activeTicket.isDraft) {
      if (activeTicket.messages) {
        activeTicket.messages.forEach((msg: any) => {
          if (msg.sender === "admin" || msg.sender === "system") {
            msg.read = true;
          }
        });
      }
      if (socket) {
        socket.emit("support:mark_read", {
          type: activeTicket.deviceInfo ? "bug" : "ticket",
          id: activeTicket._id || activeTicket.id,
          recipientId: "admin"
        });
      }
    }
  }, [view, activeTicket?.id, activeTicket?.messages?.length, socket]);

  useEffect(() => {
    if (view === "chat") {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [view, tickets, activeTicket]);

  useEffect(() => {
    const onBackPress = () => {
      if (view !== "center") {
        setView("center");
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [view]);

  async function pickAttachmentImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8
    });
    if (result.canceled || !result.assets.length) return;
    try {
      setUploading(true);
      const asset = result.assets[0];
      const uploaded = await uploadTailorVerificationMedia([{ uri: asset.uri, name: asset.fileName || "attachment.jpg" }], token);
      if (uploaded.length) {
        setAttachments((prev) => [...prev, uploaded[0].url]);
      }
    } catch (e) {
      Alert.alert("Upload failed", "Could not upload the attachment.");
    } finally {
      setUploading(false);
    }
  }

  function handleStartChat() {
    if (!selectedCategory) {
      Alert.alert("Select Category", "Please select the help category related to your issue.");
      return;
    }
    setActiveTicket({
      isDraft: true,
      subject: selectedCategory,
      category: selectedCategory,
      orderId: selectedOrder?._id || selectedOrder?.id || null,
      status: "OPEN",
      messages: []
    });
    setView("chat");
  }

  async function handleSendReply() {
    if (chatMessage.trim().length < 2) return;
    if (!token || !activeTicket) return;
    try {
      setSending(true);
      if (activeTicket.isDraft) {
        // Create new ticket using the message typed as first message
        const res = await api<any>("/support", {
          method: "POST",
          body: JSON.stringify({
            subject: activeTicket.subject,
            message: chatMessage.trim(),
            orderId: activeTicket.orderId,
            category: activeTicket.category,
            attachments: attachments
          })
        }, token);

        setChatMessage("");
        setAttachments([]);
        await loadTickets();
        const createdTicket = res.data || res;
        setActiveTicket(createdTicket);
      } else {
        const isBug = !!activeTicket.deviceInfo;
        const endpoint = isBug 
          ? `/support/bug-reports/${activeTicket._id || activeTicket.id}/messages`
          : `/support/${activeTicket._id || activeTicket.id}/messages`;

        // Append message to the current ticket
        await api<any>(endpoint, {
          method: "POST",
          body: JSON.stringify({
            text: chatMessage.trim(),
            attachments: attachments
          })
        }, token);

        setChatMessage("");
        setAttachments([]);
        
        if (isBug) {
          await loadBugReports();
          const bugId = activeTicket._id || activeTicket.id;
          const listRes = await api<{ data?: any[] }>("/support/bug-reports", { method: "GET" }, token);
          const list = Array.isArray(listRes) ? listRes : (listRes as any)?.data || [];
          const updated = list.find((t: any) => (t._id || t.id) === bugId);
          if (updated) {
            setActiveTicket(updated);
          }
        } else {
          await loadTickets();
          const ticketId = activeTicket._id || activeTicket.id;
          // Fetch updated ticket to get latest messages array
          const listRes = await api<{ data?: any[] }>("/support", { method: "GET" }, token);
          const list = Array.isArray(listRes) ? listRes : (listRes as any)?.data || [];
          const updated = list.find((t: any) => (t._id || t.id) === ticketId);
          if (updated) {
            setActiveTicket(updated);
          }
        }
      }
    } catch (e) {
      Alert.alert("Failed", "Could not send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleCloseChat(ticketId: string) {
    if (!token) return;
    Alert.alert(
      "Close Conversation?",
      "Are you sure you want to close this chat? This will mark your support request as resolved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Close",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api<any>(`/support/${ticketId}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "CLOSED" })
              }, token);
              Alert.alert("Chat Closed", "This conversation has been closed.");
              await loadTickets();
              setActiveTicket(null);
              setView("center");
            } catch (e) {
              Alert.alert("Failed", "Could not close the chat.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  async function handleReopenTicket() {
    if (!token || !activeTicket) return;
    try {
      setLoading(true);
      const res = await api<any>(`/support/${activeTicket._id || activeTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "OPEN" })
      }, token);
      await loadTickets();
      const updated = res.data || res;
      setActiveTicket(updated);
    } catch (e) {
      Alert.alert("Failed", "Could not reopen ticket.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 4 : SCREEN_TOP_PADDING }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {view === "center" && (
          <View style={{ flex: 1, paddingHorizontal: 18 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <Pressable style={styles.backButton} onPress={() => setScreen("support_center")}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Support Chat</Text>
                <Text style={styles.meta}>Get help from our support team</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              {/* Start New Conversation button */}
              <TouchableOpacity 
                style={{ backgroundColor: BRAND_ORANGE, height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 }}
                onPress={() => setView("new_chat")}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#111111" />
                <Text style={{ color: "#111111", fontSize: 15, fontWeight: "900" }}>Start New Conversation</Text>
              </TouchableOpacity>

              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2 }} />
                  <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>Previous Chats</Text>
                </View>

                {tickets.length === 0 ? (
                  <View style={{ backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 24, alignItems: "center" }}>
                    <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "600" }}>No support chats found</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {[...tickets].reverse().map((t) => (
                      <Pressable 
                        key={t._id || t.id}
                        style={{ backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                        onPress={() => {
                          setActiveTicket(t);
                          setView("chat");
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ color: palette.text, fontSize: 14, fontWeight: "800" }}>#{t._id?.slice(-6).toUpperCase() || t.id.slice(-6).toUpperCase()}</Text>
                            <View style={{ backgroundColor: t.status === "CLOSED" ? "#e2e8f0" : t.status === "RESOLVED" ? "#dcfce7" : "#fff9db", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: t.status === "CLOSED" ? "#64748b" : t.status === "RESOLVED" ? "#166534" : "#b58700", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>{t.status}</Text>
                            </View>
                            {hasUnreadMessages(t) && (
                              <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900", textTransform: "uppercase" }}>New</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "700", marginTop: 4 }}>Issue: {t.subject}</Text>
                          <Text style={{ color: palette.text, fontSize: 13, fontWeight: "600", marginTop: 6 }} numberOfLines={1}>{t.message}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2 }} />
                  <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>Bug Reports</Text>
                </View>

                {bugReports.length === 0 ? (
                  <View style={{ backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 24, alignItems: "center" }}>
                    <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "600" }}>No bug reports found</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {[...bugReports].reverse().map((b) => (
                      <Pressable 
                        key={b._id || b.id}
                        style={{ backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                        onPress={() => {
                          setActiveTicket(b);
                          setView("chat");
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ color: palette.text, fontSize: 14, fontWeight: "800" }}>Bug: {b.title}</Text>
                            <View style={{ backgroundColor: b.status === "CLOSED" || b.status === "FIXED" ? "#e2e8f0" : "#fee2e2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: b.status === "CLOSED" || b.status === "FIXED" ? "#64748b" : "#dc2626", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>{b.status}</Text>
                            </View>
                            {hasUnreadMessages(b) && (
                              <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900", textTransform: "uppercase" }}>New</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "700", marginTop: 4 }}>Device: {b.deviceInfo}</Text>
                          <Text style={{ color: palette.text, fontSize: 13, fontWeight: "600", marginTop: 6 }} numberOfLines={1}>{b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1].text : b.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {view === "new_chat" && (
          <View style={{ flex: 1, paddingHorizontal: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <Pressable style={styles.backButton} onPress={() => setView("center")}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Start Conversation</Text>
                <Text style={styles.meta}>Fill out details for support</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              <View>
                <Text style={{ color: palette.text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Select Related Order (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  <Pressable 
                    style={{ minWidth: 100, height: 64, borderRadius: 14, borderWidth: 1, borderColor: !selectedOrder ? BRAND_ORANGE : palette.border, backgroundColor: !selectedOrder ? ((palette.surface === "#0a1322") ? "#2c2010" : "#fff5df") : palette.surface, padding: 10, justifyContent: "center" }}
                    onPress={() => setSelectedOrder(null)}
                  >
                    <Text style={{ color: !selectedOrder ? BRAND_ORANGE : palette.text, fontSize: 12, fontWeight: "800", textAlign: "center" }}>No Linked Order</Text>
                  </Pressable>
                  {orders.map((o) => {
                    const isDark = palette.surface === "#0a1322";
                    const isSelected = selectedOrder && (selectedOrder._id || selectedOrder.id) === (o._id || o.id);
                    return (
                      <Pressable 
                        key={o._id || o.id}
                        style={{ minWidth: 120, height: 64, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? BRAND_ORANGE : palette.border, backgroundColor: isSelected ? (isDark ? "#2c2010" : "#fff5df") : palette.surface, padding: 10, justifyContent: "center" }}
                        onPress={() => setSelectedOrder(o)}
                      >
                        <Text style={{ color: isSelected ? BRAND_ORANGE : palette.text, fontSize: 12, fontWeight: "800" }}>#{o.orderNumber || o.id.slice(-6).toUpperCase()}</Text>
                        <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "700", marginTop: 2 }}>{o.status.replace(/_/g, " ")}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View>
                <Text style={{ color: palette.text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Select Help Category</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { label: "Quote Issue", icon: "create-outline" },
                    { label: "Order Delay", icon: "time-outline" },
                    { label: "Material Issue", icon: "shirt-outline" },
                    { label: "Payment Issue", icon: "card-outline" },
                    { label: "Customer Dispute", icon: "people-outline" },
                    { label: "Other Issue", icon: "help-circle-outline" }
                  ].map((cat) => {
                    const isSel = selectedCategory === cat.label;
                    return (
                      <Pressable 
                        key={cat.label}
                        style={{ width: "47%", height: 72, borderRadius: 14, borderWidth: 1, borderColor: isSel ? BRAND_ORANGE : palette.border, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center", gap: 6 }}
                        onPress={() => setSelectedCategory(cat.label)}
                      >
                        <Ionicons name={cat.icon as any} size={20} color={isSel ? BRAND_ORANGE : palette.muted} />
                        <Text style={{ color: isSel ? BRAND_ORANGE : palette.text, fontSize: 12, fontWeight: "800" }}>{cat.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Start Conversation button */}
              <TouchableOpacity 
                style={[{ backgroundColor: BRAND_ORANGE, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 }, (!selectedCategory || sending) && { opacity: 0.6 }]}
                disabled={!selectedCategory || sending}
                onPress={handleStartChat}
                activeOpacity={0.8}
              >
                {sending ? <ActivityIndicator color="#111111" /> : <Text style={{ color: "#111111", fontSize: 14, fontWeight: "900" }}>Start Conversation</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {view === "chat" && activeTicket && (
          <View style={{ flex: 1, paddingHorizontal: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: palette.border, paddingBottom: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <Pressable 
                  style={styles.backButton}
                  onPress={() => {
                    setActiveTicket(null);
                    setView("center");
                  }}
                >
                  <Ionicons name="chevron-back" size={20} color={palette.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontSize: 15, fontWeight: "800" }}>
                    {activeTicket.isDraft ? "Draft Conversation" : (activeTicket.deviceInfo ? `Bug: ${activeTicket.title}` : `#${(activeTicket._id || activeTicket.id || "").slice(-6).toUpperCase()}`)}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "700" }}>
                    {activeTicket.deviceInfo ? `Status: ${activeTicket.status}` : activeTicket.subject}
                  </Text>
                </View>
              </View>
              {!activeTicket.isDraft && !activeTicket.deviceInfo && activeTicket.status !== "CLOSED" && activeTicket.status !== "RESOLVED" && (
                <Pressable 
                  style={{ backgroundColor: "#fee2e2", borderColor: "#fecaca", paddingHorizontal: 12, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
                  onPress={() => handleCloseChat(activeTicket._id || activeTicket.id)}
                >
                  <Text style={{ color: "#dc2626", fontSize: 11, fontWeight: "900" }}>Close Chat</Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1, marginBottom: 8 }}
              contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {activeTicket.isDraft && (
                <View style={{ alignSelf: "center", backgroundColor: palette.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginVertical: 8 }}>
                  <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "800", textAlign: "center" }}>
                    No messages yet. Type your first message below to open this support ticket.
                  </Text>
                </View>
              )}

              {/* Render legacy single message if no messages array is present (compatibility) */}
              {!activeTicket.messages || activeTicket.messages.length === 0 ? (
                !activeTicket.isDraft && (
                  <View style={{ gap: 6 }}>
                    <View style={{ alignSelf: "flex-end", maxWidth: "80%", backgroundColor: BRAND_ORANGE, borderRadius: 16, borderBottomRightRadius: 2, padding: 12 }}>
                      <Text style={{ color: "#000000", fontWeight: "800", fontSize: 10, textTransform: "uppercase", marginBottom: 2, opacity: 0.6 }}>You</Text>
                      <Text style={{ color: "#000000", fontSize: 14, fontWeight: "700" }}>{activeTicket.message}</Text>
                      {activeTicket.attachments && activeTicket.attachments.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {activeTicket.attachments.map((url: string) => (
                            <Image key={url} source={{ uri: url }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                          ))}
                        </View>
                      )}
                      <Text style={{ color: "#000000", fontSize: 9, textAlign: "right", marginTop: 4, opacity: 0.5 }}>
                        {new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {activeTicket.adminResponse && (
                      <View style={{ alignSelf: "flex-start", maxWidth: "80%", backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 16, borderBottomLeftRadius: 2, padding: 12 }}>
                        <Text style={{ color: BRAND_ORANGE, fontWeight: "800", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Darji Support</Text>
                        <Text style={{ color: palette.text, fontSize: 14, fontWeight: "700" }}>{activeTicket.adminResponse}</Text>
                        <Text style={{ color: palette.muted, fontSize: 9, marginTop: 4, opacity: 0.7 }}>
                          {new Date(activeTicket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}
                  </View>
                )
              ) : (
                activeTicket.messages.map((msg: any, idx: number) => {
                  const isClient = msg.sender === "client";
                  const isSystem = msg.sender === "system";

                  if (isSystem) {
                    return (
                      <View key={idx} style={{ alignSelf: "center", backgroundColor: palette.surface, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginVertical: 4 }}>
                        <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "800", textAlign: "center" }}>{msg.text}</Text>
                      </View>
                    );
                  }

                  return (
                    <View key={idx} style={{ alignSelf: isClient ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: isClient ? BRAND_ORANGE : palette.surface, borderWidth: isClient ? 0 : 1, borderColor: palette.border, borderRadius: 16, borderBottomRightRadius: isClient ? 2 : 16, borderBottomLeftRadius: isClient ? 16 : 2, padding: 12, marginVertical: 2 }}>
                      <Text style={{ color: isClient ? "#000000" : BRAND_ORANGE, fontWeight: "900", fontSize: 10, textTransform: "uppercase", marginBottom: 2, opacity: isClient ? 0.6 : 1 }}>
                        {isClient ? "You" : "Darji Support"}
                      </Text>
                      <Text style={{ color: isClient ? "#000000" : palette.text, fontSize: 14, fontWeight: "700" }}>{msg.text}</Text>
                      
                      {msg.attachments && msg.attachments.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {msg.attachments.map((url: string) => (
                            <Image key={url} source={{ uri: url }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                          ))}
                        </View>
                      )}

                      <Text style={{ color: isClient ? "rgba(0,0,0,0.5)" : palette.muted, fontSize: 9, textAlign: "right", marginTop: 4 }}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Composer/Input bar */}
            {activeTicket.status !== "CLOSED" && activeTicket.status !== "RESOLVED" && activeTicket.status !== "FIXED" ? (
              <View style={{ borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 12, paddingBottom: 16 }}>
                {attachments.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 8, paddingVertical: 8 }}>
                    {attachments.map((url, idx) => (
                      <View key={url} style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: palette.border }}>
                        <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} />
                        <Pressable 
                          style={{ position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 2 }}
                          onPress={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Ionicons name="close" size={10} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable onPress={pickAttachmentImage} style={{ padding: 8 }}>
                    <Ionicons name="attach-outline" size={24} color={BRAND_ORANGE} />
                  </Pressable>
                  <TextInput
                    style={{
                      flex: 1,
                      minHeight: 46,
                      maxHeight: 100,
                      backgroundColor: palette.surface,
                      borderWidth: 1,
                      borderColor: palette.border,
                      borderRadius: 23,
                      paddingHorizontal: 16,
                      color: palette.text,
                      fontSize: 14,
                      fontWeight: "700"
                    }}
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    placeholder="Type message..."
                    placeholderTextColor={palette.muted}
                    multiline
                  />
                  <Pressable 
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: BRAND_ORANGE,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: chatMessage.trim().length >= 2 && !sending ? 1 : 0.6
                    }}
                    onPress={handleSendReply}
                    disabled={chatMessage.trim().length < 2 || sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Ionicons name="send" size={18} color="#000000" />
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 16, gap: 10 }}>
                <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "800", textAlign: "center" }}>This ticket is resolved or closed.</Text>
                <Pressable 
                  style={{ backgroundColor: BRAND_ORANGE, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
                  onPress={handleReopenTicket}
                >
                  <Text style={{ color: "#111111", fontSize: 14, fontWeight: "900" }}>Reopen Ticket</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        {loading && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center", zIndex: 9999 }]}>
            <ActivityIndicator size="large" color={BRAND_ORANGE} />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function TailorSupportCenterScreen({ setScreen, palette, styles, token, showDialog }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string; showDialog: (dialog: DialogState) => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: SCREEN_TOP_PADDING }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, marginBottom: 14 }}>
        <Pressable style={styles.backButton} onPress={() => setScreen(undefined)}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>Support Center</Text>
          <Text style={styles.meta}>How can we help you today?</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 18, paddingBottom: 24 }}>
        {/* Chat Support Option */}
        <Pressable 
          style={{ backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
          onPress={() => setScreen("chat")}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="chatbubbles-outline" size={20} color={BRAND_ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: "800" }}>Chat Support</Text>
            <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600", marginTop: 2 }}>Chat with Darji support representatives</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </Pressable>

        {/* Call Support Option */}
        <Pressable 
          style={{ backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
          onPress={() => Linking.openURL("tel:+919876500000").catch(() => undefined)}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="call-outline" size={20} color={BRAND_ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: "800" }}>Call Support</Text>
            <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600", marginTop: 2 }}>Dial support line directly (+91 98765 00000)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </Pressable>

        {/* Account requests Option */}
        <Pressable 
          style={{ backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
          onPress={() => setScreen("requests")}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={BRAND_ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: "800" }}>Shop & Account Requests</Text>
            <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600", marginTop: 2 }}>Change shop name, bank details, address</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function TailorAccountRequestsScreen({ setScreen, palette, styles, token, showDialog }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string; showDialog: (dialog: DialogState) => void }) {
  const [type, setType] = useState<"ShopName" | "BankAccount" | "UPI" | "Address" | "ContactNumber">("ShopName");
  
  const [shopNameField, setShopNameField] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [addressField, setAddressField] = useState("");
  const [phoneField, setPhoneField] = useState("");

  const [documents, setDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function pickDocumentImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload documents.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8
    });
    if (result.canceled || !result.assets.length) return;
    try {
      setUploading(true);
      const asset = result.assets[0];
      const uploaded = await uploadTailorVerificationMedia([{ uri: asset.uri, name: asset.fileName || "document.jpg" }], token);
      if (uploaded.length) {
        setDocuments((prev) => [...prev, uploaded[0].url]);
      }
    } catch (e) {
      Alert.alert("Upload failed", "Could not upload document reference.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitRequest() {
    let requestedValues: Record<string, any> = {};
    if (type === "ShopName") {
      if (shopNameField.trim().length < 3) {
        Alert.alert("Invalid Input", "Please enter a valid shop name (min 3 characters).");
        return;
      }
      requestedValues = { shopName: shopNameField.trim() };
    } else if (type === "BankAccount") {
      if (accountHolder.trim().length < 2 || accountNumber.trim().length < 6 || ifsc.trim().length < 4) {
        Alert.alert("Invalid Input", "Please enter valid bank account details.");
        return;
      }
      requestedValues = { accountHolder: accountHolder.trim(), accountNumber: accountNumber.trim(), ifsc: ifsc.trim() };
    } else if (type === "UPI") {
      if (upiId.trim().length < 3 || !upiId.includes("@")) {
        Alert.alert("Invalid Input", "Please enter a valid UPI ID.");
        return;
      }
      requestedValues = { upi: upiId.trim() };
    } else if (type === "Address") {
      if (addressField.trim().length < 8) {
        Alert.alert("Invalid Input", "Please enter a valid shop address (min 8 characters).");
        return;
      }
      requestedValues = { shopAddress: addressField.trim() };
    } else if (type === "ContactNumber") {
      if (!/^[6-9]\d{9}$/.test(phoneField.trim())) {
        Alert.alert("Invalid Input", "Please enter a valid 10 digit contact number.");
        return;
      }
      requestedValues = { phone: phoneField.trim() };
    }

    if (!token) return;
    try {
      setSubmitting(true);
      await api("/support/change-requests", {
        method: "POST",
        body: JSON.stringify({
          type,
          requestedValues,
          documents
        })
      }, token);

      Alert.alert("Request Submitted", "Your change request has been submitted for admin verification.");
      setShopNameField("");
      setAccountHolder("");
      setAccountNumber("");
      setIfsc("");
      setUpiId("");
      setAddressField("");
      setPhoneField("");
      setDocuments([]);
      setScreen("support_center");
    } catch (e) {
      Alert.alert("Error", "Could not submit change request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: SCREEN_TOP_PADDING }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, marginBottom: 14 }}>
        <Pressable style={styles.backButton} onPress={() => setScreen("support_center")}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>Account Requests</Text>
          <Text style={styles.meta}>Submit changes for admin approval</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 18, paddingBottom: 24 }}>
          {/* Request Type Selector */}
          <View>
            <Text style={{ color: palette.text, fontSize: 13, fontWeight: "900", marginBottom: 8 }}>Select Field to Change</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                { id: "ShopName", label: "Shop Name" },
                { id: "BankAccount", label: "Bank Account" },
                { id: "UPI", label: "UPI ID" },
                { id: "Address", label: "Address" },
                { id: "ContactNumber", label: "Contact Number" }
              ].map((item) => (
                <Pressable
                  key={item.id}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: type === item.id ? BRAND_ORANGE : palette.border,
                    backgroundColor: type === item.id ? palette.surfaceAlt : palette.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 16
                  }}
                  onPress={() => setType(item.id as any)}
                >
                  <Text style={{ color: type === item.id ? BRAND_ORANGE : palette.text, fontSize: 12, fontWeight: "900" }}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Dynamic Forms */}
          <View style={{ backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.border, padding: 16, gap: 12 }}>
            {type === "ShopName" && (
              <View>
                <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>New Shop / Studio Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.bg }]}
                  value={shopNameField}
                  onChangeText={setShopNameField}
                  placeholder="Enter shop name..."
                  placeholderTextColor={palette.muted}
                />
              </View>
            )}

            {type === "BankAccount" && (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>Account Holder Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.bg }]}
                    value={accountHolder}
                    onChangeText={setAccountHolder}
                    placeholder="Holder name..."
                    placeholderTextColor={palette.muted}
                  />
                </View>
                <View>
                  <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>Account Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.bg }]}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Account number..."
                    placeholderTextColor={palette.muted}
                    keyboardType="number-pad"
                  />
                </View>
                <View>
                  <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>IFSC Code</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.bg }]}
                    value={ifsc}
                    onChangeText={setIfsc}
                    placeholder="IFSC code..."
                    placeholderTextColor={palette.muted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            )}

            {type === "UPI" && (
              <View>
                <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>New UPI ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.bg }]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="username@bank..."
                  placeholderTextColor={palette.muted}
                  autoCapitalize="none"
                />
              </View>
            )}

            {type === "Address" && (
              <View>
                <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>New Shop Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.bg, minHeight: 70 }]}
                  value={addressField}
                  onChangeText={setAddressField}
                  placeholder="Enter full address..."
                  placeholderTextColor={palette.muted}
                  multiline
                />
              </View>
            )}

            {type === "ContactNumber" && (
              <View>
                <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>New Contact Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.bg }]}
                  value={phoneField}
                  onChangeText={setPhoneField}
                  placeholder="10 digit phone number..."
                  placeholderTextColor={palette.muted}
                  keyboardType="phone-pad"
                />
              </View>
            )}
          </View>

          {/* Document Uploads */}
          <View>
            <Text style={{ color: palette.text, fontSize: 13, fontWeight: "900", marginBottom: 8 }}>Supporting Documents / Photo Reference</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <Pressable
                style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", backgroundColor: palette.surface }}
                onPress={pickDocumentImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={BRAND_ORANGE} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={20} color={BRAND_ORANGE} />
                    <Text style={{ color: BRAND_ORANGE, fontSize: 10, fontWeight: "800", marginTop: 4 }}>Add Doc</Text>
                  </>
                )}
              </Pressable>
              {documents.map((url, index) => (
                <View key={url} style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderColor: palette.border, overflow: "hidden" }}>
                  <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} />
                  <Pressable
                    style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}
                    onPress={() => setDocuments((prev) => prev.filter((_, idx) => idx !== index))}
                  >
                    <Ionicons name="close" size={14} color="#ffffff" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            style={[{ backgroundColor: BRAND_ORANGE, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 }, submitting ? { opacity: 0.6 } : null]}
            disabled={submitting}
            onPress={handleSubmitRequest}
          >
            {submitting ? <ActivityIndicator color="#111111" /> : <Text style={{ color: "#111111", fontSize: 14, fontWeight: "900" }}>Submit Request</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const supportDetails: Record<Exclude<SupportScreen, "support_center" | "requests">, { title: string; subtitle: string; icon: IconName; copy: string; points: string[]; action?: { label: string; url?: string } }> = {
  faqs: {
    title: "FAQs",
    subtitle: "Common tailor questions",
    icon: "help-buoy-outline",
    copy: "Quick answers for daily app use.",
    points: ["New customer requests appear in Requests.", "Accepted quotes appear in Orders.", "Mark work as Ready only after stitching and proof photos are uploaded."]
  },
  chat: {
    title: "Chat Support",
    subtitle: "Contact Darzi support",
    icon: "chatbubble-outline",
    copy: "Use this when an order, payment, or customer request needs help from Darzi support.",
    points: ["Share the order ID.", "Do not share customer personal details outside the app.", "Support replies will be connected in a future live chat flow."],
    action: { label: "Start Chat" }
  },
  call: {
    title: "Call Support",
    subtitle: "Support hours and callback",
    icon: "call-outline",
    copy: "Request phone support for urgent order issues.",
    points: ["Call support is for active order problems.", "Keep the order ID ready.", "If the line is busy, raise a complaint from this screen."],
    action: { label: "Request Callback" }
  },
  email: {
    title: "Email Support",
    subtitle: "Write to Darzi",
    icon: "mail-outline",
    copy: "Send a detailed message to the Darzi operations team.",
    points: ["Mention your registered mobile number.", "Add screenshots if needed.", "Expected reply time is 24-48 hours."],
    action: { label: "Open Email", url: "mailto:support@darzi.local?subject=Tailor%20Support" }
  },
  complaint: {
    title: "Raise Complaint",
    subtitle: "Report order problems",
    icon: "alert-circle-outline",
    copy: "Use complaints for delivery, proof photo, payment, or stitching dispute issues.",
    points: ["Select the correct order before raising a complaint.", "Upload proof photos where possible.", "Darzi team will check request history and media."]
  },
  bug: {
    title: "Report Bug",
    subtitle: "Share app issues",
    icon: "bug-outline",
    copy: "Tell us when something in the app is broken or confusing.",
    points: ["Write what screen had the issue.", "Mention what you tapped before the issue.", "Add a screenshot if possible."]
  },
  feature: {
    title: "Suggest Feature",
    subtitle: "Product ideas",
    icon: "bulb-outline",
    copy: "Share improvements that would make daily tailoring work easier.",
    points: ["Keep the idea practical.", "Mention how often you would use it.", "Useful ideas can be added to future releases."]
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How data is handled",
    icon: "document-text-outline",
    copy: "Darzi uses tailor profile, order, and proof photo data only to run the service and resolve order issues.",
    points: ["Customer personal details are hidden unless required for delivery.", "Proof photos are linked to orders for dispute checks.", "Do not save or share customer data outside Darzi."]
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Tailor partner terms",
    icon: "reader-outline",
    copy: "These terms explain expected app use and order handling.",
    points: ["Accept only work you can complete on time.", "Upload honest proof photos.", "Keep all customer communication inside Darzi channels."]
  },
  cancellation: {
    title: "Cancellation Policy",
    subtitle: "Order cancellation rules",
    icon: "close-circle-outline",
    copy: "Cancellation depends on order stage and whether stitching work has started.",
    points: ["Before work starts, cancellation can be reviewed normally.", "After work starts, charges may apply for completed work.", "Ready or delivered orders may need support review before cancellation."]
  },
  version: {
    title: "App Version",
    subtitle: "Darzi Tailor App",
    icon: "information-circle-outline",
    copy: "Version 0.1.0",
    points: ["Development build for local testing.", "Restart Metro after native or dependency changes.", "Keep backend running while testing customer and tailor flows."]
  },
  about: {
    title: "About Darji",
    subtitle: "Darji Tailor Partner ecosystem",
    icon: "information-circle-outline",
    copy: "Darji is a modern custom tailoring ecosystem connecting expert tailors with design-conscious customers.",
    points: [
      "Expand your local customer reach.",
      "Accept orders and provide price quotes digitally.",
      "Track materials collection and finished garment delivery via our delivery partners.",
      "Receive guaranteed, secure payouts for completed stitching jobs."
    ]
  }
};

const lightPalette = { bg: SCREEN_BG, surface: SURFACE, surfaceAlt: "#fff9ee", text: BRAND_DEEP, muted: MUTED, border: BORDER };
const darkPalette = { bg: "#050c18", surface: "#0a1322", surfaceAlt: "#0d1b30", text: "#ffffff", muted: "#8ca2c0", border: "#182a44" };

function createStyles(palette: typeof lightPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    content: { padding: 18, paddingTop: SCREEN_TOP_PADDING, paddingBottom: 110 },
    headerCard: { borderRadius: 22, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
    avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
    avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
    avatarText: { color: "#111111", fontSize: 21, fontWeight: "900" },
    avatarPickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    avatarOption: { width: "30%", minWidth: 96, borderRadius: 18, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, alignItems: "center", padding: 10 },
    avatarOptionSelected: { borderColor: BRAND_ORANGE, backgroundColor: palette.surfaceAlt },
    avatarOptionImage: { width: 64, height: 64, borderRadius: 20 },
    avatarOptionLabel: { color: palette.text, fontSize: 11, fontWeight: "900", textAlign: "center", marginTop: 8 },
    cameraBadge: { position: "absolute", right: -3, bottom: -3, width: 28, height: 28, borderRadius: 14, backgroundColor: BRAND_ORANGE, borderWidth: 2, borderColor: palette.surface, alignItems: "center", justifyContent: "center" },
    headerMain: { flex: 1, minWidth: 0 },
    title: { color: palette.text, fontSize: 20, fontWeight: "900" },
    meta: { color: palette.muted, fontSize: 12, fontWeight: "700", marginTop: 4 },
    completedText: { color: SUCCESS, fontSize: 12, fontWeight: "900", marginTop: 8 },
    editButton: { minHeight: 38, borderRadius: 14, backgroundColor: BRAND_ORANGE, justifyContent: "center", paddingHorizontal: 13 },
    editButtonText: { color: "#111111", fontSize: 12, fontWeight: "900" },
    section: { borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, padding: 15 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 },
    sectionIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
    sectionTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    inputBlock: { marginTop: 10 },
    inputLabel: { color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 7 },
    input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text, paddingHorizontal: 13, fontSize: 14, fontWeight: "700" },
    inlineInputs: { flexDirection: "row", gap: 10 },
    inlineInput: { flex: 1, minWidth: 0 },
    primaryButton: { minHeight: 50, borderRadius: 15, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", marginTop: 14 },
    primaryButtonText: { color: "#111111", fontSize: 14, fontWeight: "900" },
    row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: palette.border },
    disabledRow: { opacity: 0.58 },
    rowMain: { flex: 1, minWidth: 0 },
    rowTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    rowCopy: { color: palette.muted, fontSize: 12, fontWeight: "700", marginTop: 4, lineHeight: 17 },
    dangerText: { color: DANGER },
    metricValue: { color: BRAND_ORANGE, fontSize: 16, fontWeight: "900" },
    reviewSummary: { minHeight: 70, borderRadius: 16, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", gap: 14, padding: 13, marginTop: 6, marginBottom: 10 },
    rating: { color: BRAND_ORANGE, fontSize: 32, fontWeight: "900" },
    smallIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
    detailHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
    backButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
    detailIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    detailCopy: { color: palette.text, fontSize: 15, fontWeight: "800", lineHeight: 22, marginBottom: 8 },
    bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.border },
    bulletDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND_ORANGE, marginTop: 7 },
    bulletText: { flex: 1, color: palette.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 },
    choiceBlock: { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 13 },
    choiceRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    choicePill: { flex: 1, minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
    choicePillSelected: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc" },
    choiceText: { color: palette.muted, fontSize: 12, fontWeight: "900" },
    choiceTextSelected: { color: BRAND_ORANGE },
    logoutButton: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    logoutText: { color: palette.text, fontSize: 15, fontWeight: "900" },
    deleteButton: { minHeight: 52, borderRadius: 16, backgroundColor: DANGER, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 },
    deleteText: { color: "#ffffff", fontSize: 15, fontWeight: "900" }
  });
}
