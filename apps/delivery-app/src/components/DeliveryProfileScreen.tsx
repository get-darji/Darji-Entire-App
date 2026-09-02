import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { createContext, forwardRef, useContext, useEffect, useMemo, useState, useRef, useCallback, type ReactNode } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, RefreshControl, ScrollView as RNScrollView, StatusBar, Switch, Text, TextInput, View, Alert, Modal, KeyboardAvoidingView, BackHandler, TouchableOpacity, StyleSheet, type ImageSourcePropType, type ScrollViewProps } from "react-native";
import { api, uploadDeliveryVerificationDocs } from "../api";
import { useAppStore } from "../store";
import { getLanguageLabel, t, type AppLanguage } from "../../../../shared/src/localization";
import { CompactLanguageToggle } from "../../../../shared/src/compact-language-toggle";

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

export function getFallbackAvatar(name?: string, gender?: string): ImageSourcePropType {
  const str = name || "User";
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
const SCREEN_TOP_PADDING = STATUS_BAR_INSET + 10;

type PullToRefreshState = {
  refreshing: boolean;
  onRefresh?: () => void;
};

const PullToRefreshContext = createContext<PullToRefreshState>({ refreshing: false });

const ScrollView = forwardRef<RNScrollView, ScrollViewProps>(function ProfileScrollView({ children, refreshControl, horizontal, ...props }, ref) {
  const pullToRefresh = useContext(PullToRefreshContext);
  const canRefresh = !horizontal && !refreshControl && pullToRefresh.onRefresh;
  return (
    <RNScrollView
      ref={ref}
      horizontal={horizontal}
      refreshControl={canRefresh ? (
        <RefreshControl
          colors={[BRAND_ORANGE]}
          progressBackgroundColor="#fffaf0"
          refreshing={pullToRefresh.refreshing}
          tintColor={BRAND_ORANGE}
          title="Refreshing Darji..."
          titleColor={BRAND_DEEP}
          onRefresh={pullToRefresh.onRefresh}
        />
      ) : refreshControl}
      {...props}
    >
      {children}
    </RNScrollView>
  );
});

type IconName = keyof typeof Ionicons.glyphMap;
type DeliverySettings = {
  notifications?: boolean;
  soundAlerts?: boolean;
  vibrationAlerts?: boolean;
  darkMode?: boolean;
  instantDeliveries?: boolean;
  radius?: string;
  availability?: string;
};
type DeliveryProfile = {
  id: string;
  darjiPartnerId?: string;
  vehicleNumber?: string;
  isAvailable?: boolean;
  rating?: number;
  dailyEarnings?: number;
  weeklyEarnings?: number;
  monthlyEarnings?: number;
  workingHours?: string;
  settings?: DeliverySettings;
  verification?: Record<string, unknown>;
  verificationDraft?: Record<string, unknown>;
  verificationStatus?: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED";
  deliveryType?: "PICKUP" | "DROP";
  assignedArea?: string;
};
type MeResponse = {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role: string;
  deliveryProfile?: DeliveryProfile;
};
type SupportScreen = "help" | "chat" | "call" | "email" | "faq" | "privacy" | "terms" | "safety" | "version" | "about" | "support_center" | "requests" | "bug";

type Props = {
  me?: MeResponse;
  token?: string;
  activeJobs: number;
  completedJobs: number;
  refresh: () => void;
  onSessionExpired: () => void;
  onSignOut: () => void;
  showDialog: (dialog: { title: string; message: string; icon?: IconName }) => void;
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

export function DeliveryProfileScreen({ me, token, activeJobs, completedJobs, refresh, onSessionExpired, onSignOut, showDialog, onOpenTransactions, onOpenOrders, socket, initialSupportScreen, clearInitialSupportScreen }: Props) {
  const signOut = useAppStore((state) => state.signOut);
  const language = useAppStore((state) => state.language);
  const setLanguagePreference = useAppStore((state) => state.setLanguagePreference);
  const profile = me?.deliveryProfile;
  const verificationGender = String(
    ((profile?.verificationDraft as { personal?: { gender?: string }; gender?: string } | undefined)?.personal?.gender) ??
    ((profile?.verificationDraft as { gender?: string } | undefined)?.gender) ??
    ((profile?.verification as { personal?: { gender?: string }; gender?: string } | undefined)?.personal?.gender) ??
    ((profile?.verification as { gender?: string } | undefined)?.gender) ??
    ""
  );
  const settings = useMemo(() => profile?.settings ?? {}, [profile?.settings]);
  const [editing, setEditing] = useState(false);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [vehicleChangeRequest, setVehicleChangeRequest] = useState("");
  const [submittingVehicleChange, setSubmittingVehicleChange] = useState(false);
  const [bankChangeRequest, setBankChangeRequest] = useState("");
  const [submittingBankChange, setSubmittingBankChange] = useState(false);

  const [supportScreen, setSupportScreen] = useState<SupportScreen>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showIdentityDetails, setShowIdentityDetails] = useState(false);
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [name, setName] = useState(me?.name ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicleNumber ?? "");
  const [available, setAvailable] = useState(Boolean(profile?.isAvailable ?? false));
  const [preferences, setPreferences] = useState({
    notifications: settings.notifications ?? true,
    sound: settings.soundAlerts ?? true,
    vibration: settings.vibrationAlerts ?? true,
    instantDeliveries: settings.instantDeliveries ?? true,
    darkMode: settings.darkMode ?? false,
    radius: settings.radius ?? "5 km",
    availability: settings.availability ?? "Full time"
  });

  const palette = preferences.darkMode ? darkPalette : lightPalette;
  const styles = useMemo(() => createStyles(palette), [palette]);
  const verificationAvatarUrl = (profile?.verification as { identity?: { facePhotoUrl?: string } } | undefined)?.identity?.facePhotoUrl;
  const avatarLocked = Boolean(verificationAvatarUrl) || profile?.verificationStatus === "VERIFIED";

  function handleLanguageChange(nextLanguage: AppLanguage) {
    setLanguagePreference(nextLanguage);
    showDialog({ title: t(nextLanguage, "languageUpdated"), message: t(nextLanguage, "languageUpdatedMessage"), icon: "checkmark-circle-outline" });
  }

  useEffect(() => {
    setName(me?.name ?? "");
    setEmail(me?.email ?? "");
    setVehicleNumber(profile?.vehicleNumber ?? "");
    setAvailable(Boolean(profile?.isAvailable ?? false));
    setPreferences({
      notifications: settings.notifications ?? true,
      sound: settings.soundAlerts ?? true,
      vibration: settings.vibrationAlerts ?? true,
      instantDeliveries: settings.instantDeliveries ?? true,
      darkMode: settings.darkMode ?? false,
      radius: settings.radius ?? "5 km",
      availability: settings.availability ?? "Full time"
    });
  }, [me?.name, me?.email, profile?.isAvailable, profile?.vehicleNumber, settings]);

  useEffect(() => {
    if (initialSupportScreen === "support_center") {
      setSupportScreen("support_center");
      clearInitialSupportScreen?.();
    }
  }, [initialSupportScreen]);

  async function updateAvailability(value: boolean) {
    setAvailable(value);
    if (!token) return;
    try {
      setSavingAvailability(true);
      await api("/delivery-partners/me/availability", { method: "PATCH", body: JSON.stringify({ isAvailable: value }) }, token);
      refresh();
    } catch (error) {
      setAvailable(!value);
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Availability failed", message: error instanceof Error ? error.message : "Could not update availability.", icon: "alert-circle-outline" });
    } finally {
      setSavingAvailability(false);
    }
  }

  async function saveProfile() {
    if (!token) return;
    try {
      setSavingProfile(true);
      await api(
        "/delivery-partners/me/profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            settings: {
              notifications: preferences.notifications,
              soundAlerts: preferences.sound,
              vibrationAlerts: preferences.vibration,
              darkMode: preferences.darkMode,
              instantDeliveries: preferences.instantDeliveries,
              radius: preferences.radius,
              availability: preferences.availability
            }
          })
        },
        token
      );
      setEditing(false);
      showDialog({ title: "Saved", message: "Profile and settings updated.", icon: "checkmark-circle-outline" });
      refresh();
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Save failed", message: error instanceof Error ? error.message : "Could not save profile.", icon: "alert-circle-outline" });
    } finally {
      setSavingProfile(false);
    }
  }

  function logout() {
    setShowLogoutModal(true);
  }

  async function submitVehicleChangeRequest() {
    if (vehicleChangeRequest.trim().length < 10) {
      Alert.alert("Request too short", "Please explain your vehicle details change request in at least 10 characters.");
      return;
    }
    if (!token) return;
    try {
      setSubmittingVehicleChange(true);
      await api("/support", {
        method: "POST",
        body: JSON.stringify({
          subject: "Vehicle Details Change Request",
          message: `[Vehicle: ${vehicleNumber}] Request: ${vehicleChangeRequest.trim()}`
        })
      }, token);
      setVehicleChangeRequest("");
      showDialog({ title: "Request Submitted", message: "Your vehicle details change request has been sent for admin approval.", icon: "checkmark-circle-outline" });
      setShowVehicleDetails(false);
    } catch (e) {
      showDialog({ title: "Failed", message: "Could not submit request. Please try again.", icon: "alert-circle-outline" });
    } finally {
      setSubmittingVehicleChange(false);
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

  async function submitAccountDeletionRequest() {
    if (!token || submittingDeletion) return;
    try {
      setSubmittingDeletion(true);
      await api("/support/change-requests", {
        method: "POST",
        body: JSON.stringify({
          type: "AccountDeletion",
          requestedValues: { reason: "Delivery partner requested account deletion from profile settings" }
        })
      }, token);
      setShowDeleteModal(false);
      showDialog({
        title: language === "hi" ? "अनुरोध जमा हो गया" : "Request submitted",
        message: language === "hi" ? "आपका अकाउंट हटाने का अनुरोध एडमिन सपोर्ट सेंटर को भेज दिया गया है।" : "Your account deletion request has been sent to the admin support center.",
        icon: "checkmark-circle-outline"
      });
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({
        title: language === "hi" ? "अनुरोध जमा नहीं हुआ" : "Request failed",
        message: error instanceof Error ? error.message : "Could not submit the account deletion request.",
        icon: "alert-circle-outline"
      });
    } finally {
      setSubmittingDeletion(false);
    }
  }

  async function refreshProfileScreen() {
    if (pullRefreshing) return;
    setPullRefreshing(true);
    try {
      await Promise.resolve(refresh());
    } finally {
      setPullRefreshing(false);
    }
  }

  function withProfileRefresh(node: ReactNode) {
    return (
      <PullToRefreshContext.Provider value={{ refreshing: pullRefreshing, onRefresh: () => void refreshProfileScreen() }}>
        {node}
      </PullToRefreshContext.Provider>
    );
  }

  return withProfileRefresh(
    <View style={styles.root}>
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: 10 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Image source={verificationAvatarUrl || me?.avatarUrl ? { uri: verificationAvatarUrl || me?.avatarUrl } : getFallbackAvatar(name, verificationGender)} style={styles.avatarImage} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View delivery partner details"
          style={styles.headerMain}
          onPress={() => setShowIdentityDetails(true)}
        >
          <View style={styles.profileNameRow}>
            <Text style={[styles.title, styles.profileNameText]} numberOfLines={1}>{name || "Darji Delivery"}</Text>
            <Ionicons name="chevron-forward" size={18} color={BRAND_ORANGE} />
          </View>
          <Text style={styles.profileTapHint}>Tap to view partner details</Text>
          <Text style={styles.meta}>+91 {me?.phone ?? "XXXXXXXXXX"}{avatarLocked ? " - verification photo locked" : ""}</Text>
          <Text style={styles.meta}>{email || "Email not added"}</Text>
          <Text style={styles.meta}>Role: {profile?.deliveryType || "PICKUP"} ({profile?.assignedArea || "unassigned"})</Text>
          <Text style={styles.completedText}>{completedJobs} completed jobs</Text>
        </Pressable>
      </View>

      <Modal transparent visible={showIdentityDetails} animationType="fade" onRequestClose={() => setShowIdentityDetails(false)}>
        <Pressable style={styles.identityBackdrop} onPress={() => setShowIdentityDetails(false)}>
          <Pressable style={styles.identityCardShell} onPress={(event) => event.stopPropagation()}>
            <BlurView
              intensity={58}
              tint={preferences.darkMode ? "dark" : "light"}
              experimentalBlurMethod="dimezisBlurView"
              style={styles.identityCard}
            >
              <View pointerEvents="none" style={styles.identityGlowPrimary} />
              <View pointerEvents="none" style={styles.identityGlowSecondary} />
              <View style={styles.identityHeader}>
                <View style={styles.identityHeaderIcon}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={BRAND_ORANGE} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.identityTitle}>Darji profile</Text>
                  <Text style={styles.identitySubtitle}>{profile?.verificationStatus === "VERIFIED" ? "Verified partner information" : "Registered partner information"}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close delivery partner details" style={styles.identityClose} onPress={() => setShowIdentityDetails(false)}>
                  <Ionicons name="close" size={20} color={palette.text} />
                </Pressable>
              </View>

              <View style={styles.identityHero}>
                <View style={styles.identityAvatarFrame}>
                  <Image
                    source={verificationAvatarUrl || me?.avatarUrl ? { uri: verificationAvatarUrl || me?.avatarUrl } : getFallbackAvatar(name, verificationGender)}
                    style={styles.identityAvatarImage}
                  />
                  {profile?.verificationStatus === "VERIFIED" ? (
                    <View style={styles.identityVerifiedBadge}>
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    </View>
                  ) : null}
                </View>
                <View style={styles.identityHeroCopy}>
                  <Text style={styles.identityName} numberOfLines={2}>{name || me?.name || "Delivery Partner"}</Text>
                  <Text style={styles.identityRole} numberOfLines={1}>{profile?.deliveryType === "DROP" ? "Drop partner" : "Pickup partner"}</Text>
                </View>
              </View>

              <View style={styles.identityEmailBand}>
                <View style={styles.identityRowIcon}>
                  <Ionicons name="mail-outline" size={17} color={BRAND_ORANGE} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.identityLabel}>Email address</Text>
                  <Text style={styles.identityEmailValue} selectable>{email.trim() || me?.email || "Email not added"}</Text>
                </View>
              </View>

              <View style={styles.identityIdBand}>
                <View style={styles.identityIdIcon}>
                  <Ionicons name="id-card-outline" size={18} color={BRAND_ORANGE} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.identityIdLabel}>DARJI PARTNER ID</Text>
                  <Text style={styles.identityIdValue} selectable>{profile?.darjiPartnerId || "ID pending"}</Text>
                </View>
              </View>

              <View style={styles.identityDetails}>
                {[
                  { icon: "call-outline" as const, label: "Phone number", value: me?.phone ? (me.phone.startsWith("+") ? me.phone : `+91 ${me.phone}`) : "Not available" },
                  { icon: "car-outline" as const, label: "Vehicle number", value: vehicleNumber || profile?.vehicleNumber || "Not added" },
                  { icon: "location-outline" as const, label: "Assigned area", value: profile?.assignedArea || "Not assigned" }
                ].map((item) => (
                  <View key={item.label} style={styles.identityRow}>
                    <View style={styles.identityRowIcon}><Ionicons name={item.icon} size={17} color={BRAND_ORANGE} /></View>
                    <View style={styles.rowMain}>
                      <Text style={styles.identityLabel}>{item.label}</Text>
                      <Text style={styles.identityValue} selectable>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

      <Section title={t(language, "account")} icon="person-outline" styles={styles}>
        <InfoRow icon="create-outline" title="Edit Profile" value="Update name and email" styles={styles} onPress={() => setEditing(true)} noBorder />
        <InfoRow icon="car-outline" title="Vehicle Details" value={vehicleNumber || "No vehicle details registered"} styles={styles} onPress={() => setShowVehicleDetails(true)} />

      </Section>

      <Modal visible={editing} onRequestClose={() => setEditing(false)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: palette.background }}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.detailHeader}>
              <Pressable style={styles.backButton} onPress={() => setEditing(false)}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Edit Profile</Text>
                <Text style={styles.meta}>Update name and email</Text>
              </View>
            </View>
            <View style={styles.section}>
              <Input label="Full Name" value={name} onChangeText={setName} styles={styles} />
              <Input label="Email" value={email} onChangeText={setEmail} styles={styles} />
              <Pressable style={styles.primaryButton} onPress={saveProfile} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Save Profile</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showVehicleDetails} onRequestClose={() => setShowVehicleDetails(false)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: palette.background }}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.detailHeader}>
              <Pressable style={styles.backButton} onPress={() => setShowVehicleDetails(false)}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Vehicle Details</Text>
                <Text style={styles.meta}>Registered delivery vehicle details</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>CURRENT CONFIGURATION</Text>
              </View>
              <InfoRow icon="car-outline" title="Vehicle Number" value={vehicleNumber || "Not registered"} styles={styles} />
              <InfoRow icon="shield-checkmark-outline" title="Verification Status" value={profile?.verificationStatus || "NOT_SUBMITTED"} styles={styles} />
              <InfoRow icon="location-outline" title="Assigned Area" value={profile?.assignedArea || "Not assigned"} styles={styles} />
              <InfoRow icon="options-outline" title="Delivery Type" value={profile?.deliveryType || "PICKUP"} styles={styles} />
            </View>

                        <View style={styles.requestCard}>
              <View style={styles.requestHero}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="car-sport-outline" size={20} color={BRAND_ORANGE} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.requestTitle}>Update Vehicle Details</Text>
                  <Text style={[styles.requestSubtitle, { color: BRAND_ORANGE }]}>Changes require admin approval</Text>
                </View>
              </View>
              <Text style={styles.requestCopy}>Need to change your vehicle details? Tell us what you'd like to update. Our team will review your request, and your current vehicle will remain active until it's approved.</Text>
              <View style={styles.inputBlock}>
                <TextInput
                  style={[styles.input, styles.requestInput, { minHeight: 90, textAlignVertical: "top" }]}
                  value={vehicleChangeRequest}
                  onChangeText={(val) => val.length <= 500 && setVehicleChangeRequest(val)}
                  placeholder="Describe the changes you'd like to make..."
                  placeholderTextColor="#9aa6b8"
                  multiline
                />
                <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "800", textAlign: "right", marginTop: 4 }}>{vehicleChangeRequest.length}/500</Text>
              </View>
              <Pressable style={[styles.primaryButton, { flexDirection: "row", gap: 8 }]} onPress={submitVehicleChangeRequest} disabled={submittingVehicleChange}>
                {submittingVehicleChange ? <ActivityIndicator color="#111111" /> : (
                  <>
                    <Ionicons name="paper-plane-outline" size={17} color="#111111" />
                    <Text style={styles.primaryButtonText}>Submit Request</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showBankDetails} onRequestClose={() => setShowBankDetails(false)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: palette.background }}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.detailHeader}>
              <Pressable style={styles.backButton} onPress={() => setShowBankDetails(false)}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Bank Account</Text>
                <Text style={styles.meta}>Payout banking configuration</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>CURRENT BANKING</Text>
              </View>
              <InfoRow icon="card-outline" title="Payout Option" value="Bank Transfer (Weekly Payout)" styles={styles} />
              <InfoRow icon="business-outline" title="Bank Name" value="Registered Partner Bank" styles={styles} />
              <InfoRow icon="person-circle-outline" title="Account Holder" value={name || "Delivery Partner"} styles={styles} />
              <InfoRow icon="wallet-outline" title="Payout Status" value="Active" styles={styles} />
            </View>

            <View style={styles.requestCard}>
              <View style={styles.requestHero}>
                <View style={styles.requestIcon}><Ionicons name="card-outline" size={22} color={BRAND_ORANGE} /></View>
                <View style={styles.rowMain}>
                  <Text style={styles.requestTitle}>Request payout update</Text>
                  <Text style={styles.requestSubtitle}>Finance verification required</Text>
                </View>
              </View>
              <Text style={styles.requestCopy}>Enter the new account holder name, bank name, account number and IFSC. The current payout account stays active until approval.</Text>
              <View style={styles.inputBlock}>
                <TextInput
                  style={[styles.input, styles.requestInput]}
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
        <InfoRow icon="cube-outline" title={t(language, "deliveryHistory")} value={language === "hi" ? `${completedJobs} डिलीवरी पूरी` : `${completedJobs} completed deliveries`} styles={styles} onPress={onOpenOrders} />
      </Section>

      <Section title={t(language, "preferences")} icon="options-outline" styles={styles}>
        <SwitchRow title={t(language, "pushNotifications")} copy={t(language, "headsUpAlertsForNewJobs")} value={preferences.notifications} onValueChange={(value) => setPreferences((current) => ({ ...current, notifications: value }))} styles={styles} noBorder />
        <SwitchRow title={t(language, "soundNotifications")} copy={t(language, "playDeliverySounds")} value={preferences.sound} onValueChange={(value) => setPreferences((current) => ({ ...current, sound: value }))} styles={styles} />
        <SwitchRow title={t(language, "vibration")} copy={t(language, "vibrateOnUrgentTasks")} value={preferences.vibration} onValueChange={(value) => setPreferences((current) => ({ ...current, vibration: value }))} styles={styles} />
      </Section>
      <Section title={t(language, "appLanguage")} icon="language-outline" styles={styles}>
        <LanguageChoiceRow language={language} onChange={handleLanguageChange} />
      </Section>

            <Section title={t(language, "support")} icon="help-circle-outline" styles={styles}>
        <InfoRow icon="help-buoy-outline" title={t(language, "helpCenter")} value={language === "hi" ? "डिलीवरी प्रक्रिया और जानकारी" : "Delivery workflows and details"} styles={styles} onPress={() => setSupportScreen("help")} noBorder />
        <InfoRow icon="chatbubble-outline" title={t(language, "supportCenter")} value={language === "hi" ? "चैट, कॉल या अकाउंट बदलाव के लिए सहायता लें" : "Chat, call, or request account updates"} styles={styles} onPress={() => setSupportScreen("support_center")} />
        <InfoRow icon="bug-outline" title="Report a Bug" value="Found something not working? Let us know and help us improve." styles={styles} onPress={() => setSupportScreen("bug")} />
      </Section>

      <Section title={t(language, "policiesInformation")} icon="document-text-outline" styles={styles}>
        <InfoRow icon="information-circle-outline" title={t(language, "aboutDarji")} value={language === "hi" ? "Darji Delivery Partner नेटवर्क के बारे में जानें" : "Learn about Darji Delivery Partner network"} styles={styles} onPress={() => setSupportScreen("about")} noBorder />
        <InfoRow icon="shield-checkmark-outline" title={t(language, "privacyPolicy")} value={language === "hi" ? "जानें आपकी निजी जानकारी कैसे सुरक्षित रखी जाती है" : "How your personal data is handled"} styles={styles} onPress={() => setSupportScreen("privacy")} />
        <InfoRow icon="reader-outline" title={t(language, "termsOfUse")} value={language === "hi" ? "सेवा उपयोग की शर्तें" : "Terms of service agreements"} styles={styles} onPress={() => setSupportScreen("terms")} />
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
        <InfoRow icon="trash-outline" title={t(language, "deleteAccount")} value={language === "hi" ? "एडमिन को अकाउंट हटाने का अनुरोध भेजें" : "Request account deletion from admin"} styles={styles} danger onPress={() => setShowDeleteModal(true)} noBorder />
        <InfoRow icon="log-out-outline" title={t(language, "logout")} value={t(language, "signOutOfAccount")} styles={styles} onPress={logout} />
      </Section>
    </ScrollView>
    <Modal visible={Boolean(supportScreen)} onRequestClose={() => setSupportScreen(undefined)} animationType="slide">
      {supportScreen === "support_center" ? (
        <DeliverySupportCenterScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} />
      ) : supportScreen === "chat" ? (
        <DeliverySupportChatScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} socket={socket} />
      ) : supportScreen === "requests" ? (
        <DeliveryAccountRequestsScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} showDialog={showDialog} />
      ) : supportScreen === "bug" ? (
        <DeliveryReportBugScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} showDialog={showDialog} />
      ) : supportScreen ? (
        <SupportDetailScreen screen={supportScreen as Exclude<SupportScreen, "support_center" | "requests" | "bug">} styles={styles} palette={palette} onBack={() => setSupportScreen(undefined)} setSupportScreen={setSupportScreen} />
      ) : null}
    </Modal>

        <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => !submittingDeletion && setShowDeleteModal(false)}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }} onPress={() => !submittingDeletion && setShowDeleteModal(false)}>
        <Pressable style={{ backgroundColor: "#ffffff", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340 }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Ionicons name="trash" size={28} color="#dc2626" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a", marginBottom: 8, textAlign: "center" }}>{language === "hi" ? "अकाउंट हटाने का अनुरोध?" : "Request account deletion?"}</Text>
            <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 18, paddingHorizontal: 4 }}>{language === "hi" ? "आपका अनुरोध एडमिन को भेजा जाएगा। मंजूरी मिलने तक अकाउंट चालू रहेगा।" : "Your request will be sent to our team for review. Your account will remain active until it is approved."}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff1f2", borderColor: "#ffe4e6", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 }}>
              <Ionicons name="shield-checkmark" size={18} color="#e11d48" />
              <Text style={{ color: "#9f1239", fontSize: 12, fontWeight: "600", lineHeight: 17, flex: 1 }}>{language === "hi" ? "यदि अनुमोदित किया जाता है, तो आपका सारा डेटा स्थायी रूप से हटा दिया जाएगा और इसे पुनर्प्राप्त नहीं किया जा सकता है।" : "If approved, all your data will be permanently deleted and cannot be recovered."}</Text>
            </View>
          </View>
          <Pressable style={{ backgroundColor: "#dc2626", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 10 }} onPress={submitAccountDeletionRequest} disabled={submittingDeletion}>
            {submittingDeletion ? <ActivityIndicator color="#ffffff" /> : <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>{language === "hi" ? "हाँ, अनुरोध भेजें" : "Yes, submit request"}</Text>}
          </Pressable>
          <Pressable style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, paddingVertical: 15, alignItems: "center" }} onPress={() => setShowDeleteModal(false)} disabled={submittingDeletion}>
            <Text style={{ color: "#475569", fontWeight: "800", fontSize: 15 }}>{t(language, "cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>

    {/* Custom Logout Confirmation Modal */}
        <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }} onPress={() => setShowLogoutModal(false)}>
        <Pressable style={{ backgroundColor: "#ffffff", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340 }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Ionicons name="log-out" size={28} color="#dc2626" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a", marginBottom: 8, textAlign: "center" }}>{t(language, "signOut")}</Text>
            <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 18, paddingHorizontal: 4 }}>{language === "hi" ? "आप अपने पंजीकृत मोबाइल नंबर का उपयोग करके किसी भी समय फिर से साइन इन कर सकते हैं।" : "You will be signed out of your Darji account on this device."}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff1f2", borderColor: "#ffe4e6", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 }}>
              <Ionicons name="shield-checkmark" size={18} color="#e11d48" />
              <Text style={{ color: "#9f1239", fontSize: 12, fontWeight: "600", lineHeight: 17, flex: 1 }}>{language === "hi" ? "आप अपने पंजीकृत मोबाइल नंबर का उपयोग करके किसी भी समय फिर से साइन इन कर सकते हैं।" : "You can sign in again anytime using your registered mobile number."}</Text>
            </View>
          </View>
          <Pressable
            style={{ backgroundColor: "#dc2626", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 10 }}
            onPress={() => { setShowLogoutModal(false); signOut(); }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>{t(language, "yesSignOut")}</Text>
          </Pressable>
          <Pressable
            style={{ backgroundColor: "#f1f5f9", borderRadius: 12, paddingVertical: 15, alignItems: "center" }}
            onPress={() => setShowLogoutModal(false)}
          >
            <Text style={{ color: "#475569", fontWeight: "800", fontSize: 15 }}>{t(language, "cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </View>
  );
}

function Section({ title, icon, styles, children }: { title: string; icon: IconName; styles: ReturnType<typeof createStyles>; children: ReactNode }) {
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

function Input({ label, value, onChangeText, styles, editable = true }: { label: string; value: string; onChangeText: (value: string) => void; styles: ReturnType<typeof createStyles>; editable?: boolean }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={[styles.input, !editable && styles.disabledInput]} value={value} onChangeText={onChangeText} editable={editable} placeholderTextColor="#9aa6b8" />
    </View>
  );
}

function LanguageChoiceRow({ language, onChange }: { language: AppLanguage; onChange: (language: AppLanguage) => void }) {
  return (
    <View style={{ borderTopWidth: 0, paddingVertical: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: MUTED, fontSize: 13, flex: 1 }}>{t(language, "currentLanguage")}: {getLanguageLabel(language)}</Text>
      <CompactLanguageToggle language={language} onSelect={onChange} />
    </View>
  );
}

function SwitchRow({ title, copy, value, onValueChange, styles, danger, noBorder }: { title: string; copy: string; value: boolean; onValueChange: (value: boolean) => void; styles: ReturnType<typeof createStyles>; danger?: boolean; noBorder?: boolean }) {
  return (
    <View style={[styles.row, noBorder ? { borderTopWidth: 0 } : null]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.rowCopy}>{copy}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} thumbColor="#ffffff" trackColor={{ true: danger ? DANGER : BRAND_ORANGE, false: "#dbe1e9" }} />
    </View>
  );
}

function ChoiceRow({ title, options, value, onChange, styles }: { title: string; options: string[]; value: string; onChange: (value: string) => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.choiceSection}>
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => (
          <Pressable key={option} style={[styles.choiceChip, value === option && styles.choiceChipActive]} onPress={() => onChange(option)}>
            <Text style={[styles.choiceText, value === option && styles.choiceTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ReadonlyMetric({ title, value, copy, styles }: { title: string; value: string; copy: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowCopy}>{copy}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
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

const supportDetails: Record<Exclude<SupportScreen, "support_center" | "requests" | "bug">, { title: string; subtitle: string; icon: IconName; copy: string; action?: { label: string; run: () => void }; points: string[] }> = {
  help: {
    title: "Help Center",
    subtitle: "Delivery workflow support",
    icon: "help-buoy-outline",
    copy: "Use this section to review how Darji delivery works from job assignment to final handoff.",
    points: ["Go online only when you are ready to accept live jobs.", "Verify pickup and drop OTPs before closing a handoff.", "Use route mode while a task is active so tracking stays accurate."]
  },
  chat: {
    title: "Chat Support",
    subtitle: "Fastest way to reach the team",
    icon: "chatbubble-outline",
    copy: "Live support chat can be connected here. For now, email or call support for urgent order issues.",
    points: ["Order ID", "Pickup or drop issue", "Contact number"]
  },
  call: {
    title: "Call Support",
    subtitle: "Talk to Darji support",
    icon: "call-outline",
    copy: "Support hours: 9 AM to 9 PM. Use call support for blocked pickups, payment issues, or handoff disputes.",
    action: { label: "Call +91 98765 00000", run: () => Linking.openURL("tel:+919876500000").catch(() => undefined) },
    points: ["Blocked pickup", "Customer unreachable", "Tailor unreachable"]
  },
  email: {
    title: "Email Support",
    subtitle: "Send details and screenshots",
    icon: "mail-outline",
    copy: "Share your job ID, screenshots, and a short summary so the support team can track the issue quickly.",
    action: { label: "Email support@darji.app", run: () => Linking.openURL("mailto:support@darji.app?subject=Darji%20Delivery%20Support").catch(() => undefined) },
    points: ["Attach task screenshots", "Mention pickup and drop address", "Include your phone number"]
  },
  faq: {
    title: "FAQs",
    subtitle: "Common delivery questions",
    icon: "information-circle-outline",
    copy: "These are the most common questions delivery partners ask during onboarding and active jobs.",
    points: ["Accepted tasks stay locked to you for 12 hours.", "Use route mode to send live location updates.", "If sample photos are missing, the app should show only the data attached by the customer."]
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How data is handled",
    icon: "document-text-outline",
    copy: "Darji stores your verification details, profile, and delivery activity to complete orders and support admin review.",
    points: ["Verification photos are used for account approval.", "Location is shared only during active delivery tracking.", "Support logs may be retained for dispute handling."]
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Delivery partner terms",
    icon: "reader-outline",
    copy: "Use accurate account details, follow OTP handoff checks, and keep route updates running during accepted tasks.",
    points: ["Do not mark tasks complete without OTP confirmation.", "Only accept jobs you can finish on time.", "Repeated service issues can lead to account pause."]
  },
  safety: {
    title: "Safety Guidelines",
    subtitle: "Pickup and drop rules",
    icon: "shield-outline",
    copy: "Use the app’s photo, OTP, and route steps on every handoff to reduce disputes and failed deliveries.",
    points: ["Check garment packet condition before pickup.", "Take proof photos before moving to picked up.", "Do not hand over clothes without OTP at the destination."]
  },
  version: {
    title: "App Version",
    subtitle: "Installed build details",
    icon: "phone-portrait-outline",
    copy: "Darji Delivery version 0.1.0",
    points: ["Expo React Native build", "Socket.IO live requests enabled", "FCM push notifications configured"]
  },
  about: {
    title: "About Darji",
    subtitle: "Darji Delivery Partner network",
    icon: "information-circle-outline",
    copy: "Darji Delivery is an automated, area-based logistics assignment platform that connects tailors and customers.",
    points: [
      "View automated area batches dynamically scheduled for 1 PM and 6 PM rounds.",
      "Track live navigation and stops in sequence.",
      "Secure pickups and drop-offs using OTP verification codes.",
      "Get transparent calculations of daily, weekly, and monthly delivery earnings."
    ]
  }
};

function SupportDetailScreen({ screen, styles, palette, onBack, setSupportScreen }: { screen: Exclude<SupportScreen, "support_center" | "requests" | "bug">; styles: ReturnType<typeof createStyles>; palette: any; onBack: () => void; setSupportScreen?: (screen: SupportScreen | undefined) => void }) {
  if (screen === "help") {
    return <HelpCenterFAQScreen styles={styles} palette={palette} onBack={onBack} onContactSupport={() => setSupportScreen?.("chat")} />;
  }

  const detail = supportDetails[screen];
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: 10 }]} showsVerticalScrollIndicator={false}>
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
          <Pressable style={styles.primaryButton} onPress={detail.action.run}>
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

function DeliverySupportChatScreen({ setScreen, palette, styles, token, socket }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string; socket?: any }) {
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

  const scrollViewRef = useRef<RNScrollView>(null);

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
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed", "Allow camera access to take a live attachment photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (result.canceled || !result.assets.length) return;
    try {
      setUploading(true);
      const asset = result.assets[0];
      const uploaded = await uploadDeliveryVerificationDocs([{ uri: asset.uri, name: asset.fileName || "attachment.jpg" }], token);
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
    <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: 10 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {view === "center" && (
          <View style={{ flex: 1, paddingHorizontal: 18 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <Pressable style={styles.backButton} onPress={() => setScreen("support_center")}>
                  <Ionicons name="chevron-back" size={22} color={palette.text} />
                </Pressable>
                <View style={styles.rowMain}>
                  <Text style={styles.title}>Support Chat</Text>
                  <Text style={styles.meta}>Get help from our support team</Text>
                </View>
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
                  <View style={{ backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, padding: 24, alignItems: "center" }}>
                    <Text style={{ color: palette.subtext, fontSize: 13, fontWeight: "600" }}>No support chats found</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {[...tickets].reverse().map((t) => (
                      <Pressable 
                        key={t._id || t.id}
                        style={{ backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
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
                          <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "700", marginTop: 4 }}>Issue: {t.subject}</Text>
                          <Text style={{ color: palette.text, fontSize: 13, fontWeight: "600", marginTop: 6 }} numberOfLines={1}>{t.message}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={palette.subtext} />
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
                  <View style={{ backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, padding: 24, alignItems: "center" }}>
                    <Text style={{ color: palette.subtext, fontSize: 13, fontWeight: "600" }}>No bug reports found</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {[...bugReports].reverse().map((b) => (
                      <Pressable 
                        key={b._id || b.id}
                        style={{ backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
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
                          <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "700", marginTop: 4 }}>Device: {b.deviceInfo}</Text>
                          <Text style={{ color: palette.text, fontSize: 13, fontWeight: "600", marginTop: 6 }} numberOfLines={1}>{b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1].text : b.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={palette.subtext} />
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <Pressable style={styles.backButton} onPress={() => setView("center")}>
                  <Ionicons name="chevron-back" size={22} color={palette.text} />
                </Pressable>
                <View style={styles.rowMain}>
                  <Text style={styles.title}>Start Conversation</Text>
                  <Text style={styles.meta}>Fill out details for support</Text>
                </View>
              </View>

            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              <View>
                <Text style={{ color: palette.text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Select Related Order (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  <Pressable 
                    style={{ minWidth: 100, height: 64, borderRadius: 14, borderWidth: 1, borderColor: !selectedOrder ? BRAND_ORANGE : palette.cardBorder, backgroundColor: !selectedOrder ? ((palette.card === "#0a1322") ? "#2c2010" : "#fff5df") : palette.card, padding: 10, justifyContent: "center" }}
                    onPress={() => setSelectedOrder(null)}
                  >
                    <Text style={{ color: !selectedOrder ? BRAND_ORANGE : palette.text, fontSize: 12, fontWeight: "800", textAlign: "center" }}>No Linked Order</Text>
                  </Pressable>
                  {orders.map((o) => {
                    const isDark = palette.card === "#0a1322";
                    const isSelected = selectedOrder && (selectedOrder._id || selectedOrder.id) === (o._id || o.id);
                    return (
                      <Pressable 
                        key={o._id || o.id}
                        style={{ minWidth: 120, height: 64, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? BRAND_ORANGE : palette.cardBorder, backgroundColor: isSelected ? (isDark ? "#2c2010" : "#fff5df") : palette.card, padding: 10, justifyContent: "center" }}
                        onPress={() => setSelectedOrder(o)}
                      >
                        <Text style={{ color: isSelected ? BRAND_ORANGE : palette.text, fontSize: 12, fontWeight: "800" }}>#{o.orderNumber || o.id.slice(-6).toUpperCase()}</Text>
                        <Text style={{ color: palette.subtext, fontSize: 10, fontWeight: "700", marginTop: 2 }}>{o.status.replace(/_/g, " ")}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View>
                <Text style={{ color: palette.text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Select Help Category</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { label: "Pickup Issue", icon: "cube-outline" },
                    { label: "Drop Issue", icon: "location-outline" },
                    { label: "Vehicle Problem", icon: "car-outline" },
                    { label: "Payout Issue", icon: "card-outline" },
                    { label: "Customer Dispute", icon: "people-outline" },
                    { label: "Other Issue", icon: "help-circle-outline" }
                  ].map((cat) => {
                    const isSel = selectedCategory === cat.label;
                    return (
                      <Pressable 
                        key={cat.label}
                        style={{ width: "47%", height: 72, borderRadius: 14, borderWidth: 1, borderColor: isSel ? BRAND_ORANGE : palette.cardBorder, backgroundColor: palette.card, alignItems: "center", justifyContent: "center", gap: 6 }}
                        onPress={() => setSelectedCategory(cat.label)}
                      >
                        <Ionicons name={cat.icon as any} size={20} color={isSel ? BRAND_ORANGE : palette.subtext} />
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: palette.cardBorder, paddingBottom: 12, marginBottom: 8 }}>
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
                  <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "700" }}>
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
                <View style={{ alignSelf: "center", backgroundColor: palette.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginVertical: 8 }}>
                  <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: "800", textAlign: "center" }}>
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
                      <View style={{ alignSelf: "flex-start", maxWidth: "80%", backgroundColor: palette.card, borderWidth: 1, borderColor: palette.cardBorder, borderRadius: 16, borderBottomLeftRadius: 2, padding: 12 }}>
                        <Text style={{ color: BRAND_ORANGE, fontWeight: "800", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Darji Support</Text>
                        <Text style={{ color: palette.text, fontSize: 14, fontWeight: "700" }}>{activeTicket.adminResponse}</Text>
                        <Text style={{ color: palette.subtext, fontSize: 9, marginTop: 4, opacity: 0.7 }}>
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
                      <View key={idx} style={{ alignSelf: "center", backgroundColor: palette.card, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginVertical: 4 }}>
                        <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "800", textAlign: "center" }}>{msg.text}</Text>
                      </View>
                    );
                  }

                  return (
                    <View key={idx} style={{ alignSelf: isClient ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: isClient ? BRAND_ORANGE : palette.card, borderWidth: isClient ? 0 : 1, borderColor: palette.cardBorder, borderRadius: 16, borderBottomRightRadius: isClient ? 2 : 16, borderBottomLeftRadius: isClient ? 16 : 2, padding: 12, marginVertical: 2 }}>
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

                      <Text style={{ color: isClient ? "rgba(0,0,0,0.5)" : palette.subtext, fontSize: 9, textAlign: "right", marginTop: 4 }}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Composer/Input bar */}
            {activeTicket.status !== "CLOSED" && activeTicket.status !== "RESOLVED" && activeTicket.status !== "FIXED" ? (
              <View style={{ borderTopWidth: 1, borderTopColor: palette.cardBorder, paddingTop: 12, paddingBottom: 16 }}>
                {attachments.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 8, paddingVertical: 8 }}>
                    {attachments.map((url, idx) => (
                      <View key={url} style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: palette.cardBorder }}>
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
                      backgroundColor: palette.card,
                      borderWidth: 1,
                      borderColor: palette.cardBorder,
                      borderRadius: 23,
                      paddingHorizontal: 16,
                      color: palette.text,
                      fontSize: 14,
                      fontWeight: "700"
                    }}
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    placeholder="Type message..."
                    placeholderTextColor={palette.subtext}
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
                <Text style={{ color: palette.subtext, fontSize: 13, fontWeight: "800", textAlign: "center" }}>This ticket is resolved or closed.</Text>
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


function DeliverySupportCenterScreen({ setScreen, palette, styles, token }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: SCREEN_TOP_PADDING }}>
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
          style={{ backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
          onPress={() => setScreen("chat")}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="chatbubbles-outline" size={20} color={BRAND_ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: "800" }}>Chat Support</Text>
            <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: "600", marginTop: 2 }}>Chat with Darji support representatives</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.subtext} />
        </Pressable>

        {/* Call Support Option */}
        <Pressable 
          style={{ backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
          onPress={() => Linking.openURL("tel:+919876500000").catch(() => undefined)}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="call-outline" size={20} color={BRAND_ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: "800" }}>Call Support</Text>
            <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: "600", marginTop: 2 }}>Dial support line directly (+91 98765 00000)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.subtext} />
        </Pressable>

        {/* Account requests Option */}
        <Pressable 
          style={{ backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
          onPress={() => setScreen("requests")}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={BRAND_ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: "800" }}>Account Requests</Text>
            <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: "600", marginTop: 2 }}>Change vehicle, documents, bank details</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.subtext} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DeliveryAccountRequestsScreen({ setScreen, palette, styles, token, showDialog }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string; showDialog: (dialog: { title: string; message: string; icon?: IconName }) => void }) {
  const [type, setType] = useState<"Vehicle" | "RC" | "DrivingLicense" | "BankAccount" | "UPI" | "ContactNumber" >("Vehicle");
  
  const [vehicleNumberField, setVehicleNumberField] = useState("");
  const [vehicleModelField, setVehicleModelField] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [phoneField, setPhoneField] = useState("");

  const [documents, setDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function pickDocumentImage() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed", "Allow camera access to take a live document photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (result.canceled || !result.assets.length) return;
    try {
      setUploading(true);
      const asset = result.assets[0];
      const uploaded = await uploadDeliveryVerificationDocs([{ uri: asset.uri, name: asset.fileName || "document.jpg" }], token);
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
    if (type === "Vehicle") {
      if (vehicleNumberField.trim().length < 4 || vehicleModelField.trim().length < 2) {
        Alert.alert("Invalid Input", "Please enter valid vehicle number and model.");
        return;
      }
      requestedValues = { vehicleNumber: vehicleNumberField.trim(), vehicleModel: vehicleModelField.trim() };
    } else if (type === "RC") {
      if (documents.length === 0) {
        Alert.alert("Document Needed", "Please upload a photo of your vehicle RC card.");
        return;
      }
      requestedValues = { rcPhotoUrl: documents[0] };
    } else if (type === "DrivingLicense") {
      if (documents.length === 0) {
        Alert.alert("Document Needed", "Please upload a photo of your Driving License.");
        return;
      }
      requestedValues = { licensePhotoUrl: documents[0] };
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
      setVehicleNumberField("");
      setVehicleModelField("");
      setAccountHolder("");
      setAccountNumber("");
      setIfsc("");
      setUpiId("");
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
    <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: SCREEN_TOP_PADDING }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, marginBottom: 14 }}>
        <Pressable style={styles.backButton} onPress={() => setScreen("support_center")}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>Account Requests</Text>
          <Text style={styles.meta}>Submit updates for admin approval</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 18, paddingBottom: 24 }}>
          {/* Request Type Selector */}
          <View>
            <Text style={{ color: palette.text, fontSize: 13, fontWeight: "900", marginBottom: 8 }}>Select Field to Update</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                { id: "Vehicle", label: "Vehicle Number" },
                { id: "RC", label: "RC Update" },
                { id: "DrivingLicense", label: "License Update" },
                { id: "BankAccount", label: "Bank Account" },
                { id: "UPI", label: "UPI ID" },
                { id: "ContactNumber", label: "Contact Number" }
              ].map((item) => (
                <Pressable
                  key={item.id}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: type === item.id ? BRAND_ORANGE : palette.cardBorder,
                    backgroundColor: type === item.id ? palette.accentSurface : palette.card,
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
          <View style={{ backgroundColor: palette.card, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, padding: 16, gap: 12 }}>
            {type === "Vehicle" && (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>New Vehicle Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.background }]}
                    value={vehicleNumberField}
                    onChangeText={setVehicleNumberField}
                    placeholder="e.g. DL 1S AB 1234..."
                    placeholderTextColor={palette.subtext}
                    autoCapitalize="characters"
                  />
                </View>
                <View>
                  <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>Vehicle Model</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.background }]}
                    value={vehicleModelField}
                    onChangeText={setVehicleModelField}
                    placeholder="e.g. Honda Activa..."
                    placeholderTextColor={palette.subtext}
                  />
                </View>
              </View>
            )}

            {type === "RC" && (
              <View>
                <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>Vehicle Registration Card (RC) Upload</Text>
                <Text style={{ color: palette.subtext, fontSize: 12, marginBottom: 12 }}>Please upload a clear photograph of your vehicle RC card below.</Text>
              </View>
            )}

            {type === "DrivingLicense" && (
              <View>
                <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>Driving License Card Upload</Text>
                <Text style={{ color: palette.subtext, fontSize: 12, marginBottom: 12 }}>Please upload a clear photograph of your physical Driving License below.</Text>
              </View>
            )}

            {type === "BankAccount" && (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>Account Holder Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.background }]}
                    value={accountHolder}
                    onChangeText={setAccountHolder}
                    placeholder="Holder name..."
                    placeholderTextColor={palette.subtext}
                  />
                </View>
                <View>
                  <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>Account Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.background }]}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Account number..."
                    placeholderTextColor={palette.subtext}
                    keyboardType="number-pad"
                  />
                </View>
                <View>
                  <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>IFSC Code</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.background }]}
                    value={ifsc}
                    onChangeText={setIfsc}
                    placeholder="IFSC code..."
                    placeholderTextColor={palette.subtext}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            )}

            {type === "UPI" && (
              <View>
                <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>New UPI ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.background }]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="username@bank..."
                  placeholderTextColor={palette.subtext}
                  autoCapitalize="none"
                />
              </View>
            )}

            {type === "ContactNumber" && (
              <View>
                <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "900", marginBottom: 6 }}>New Contact Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.background }]}
                  value={phoneField}
                  onChangeText={setPhoneField}
                  placeholder="10 digit phone number..."
                  placeholderTextColor={palette.subtext}
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
                style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", backgroundColor: palette.card }}
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
                <View key={url} style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderColor: palette.cardBorder, overflow: "hidden" }}>
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

const lightPalette = {
  background: SCREEN_BG,
  card: SURFACE,
  cardBorder: BORDER,
  text: BRAND_DEEP,
  subtext: MUTED,
  accentSurface: "#fff9ee",
  accentBorder: BORDER,
  iconSurface: "#fff4dc",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.92)",
  glassSurface: "rgba(255,255,255,0.54)",
  glassDivider: "rgba(11,34,65,0.11)"
};

const darkPalette = {
  background: "#050c18",
  card: "#0a1322",
  cardBorder: "#182a44",
  text: "#ffffff",
  subtext: "#8ca2c0",
  accentSurface: "#0d1b30",
  accentBorder: "#182a44",
  iconSurface: "#142033",
  glass: "rgba(8,18,34,0.74)",
  glassBorder: "rgba(255,255,255,0.15)",
  glassSurface: "rgba(255,255,255,0.08)",
  glassDivider: "rgba(255,255,255,0.13)"
};

function createStyles(palette: typeof lightPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.background },
    content: { paddingTop: SCREEN_TOP_PADDING, paddingHorizontal: 18, paddingBottom: 36 },
    headerCard: { borderRadius: 24, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.cardBorder, padding: 18, marginBottom: 14, flexDirection: "row", gap: 14 },
    avatar: { width: 78, height: 78, borderRadius: 26, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImage: { width: "100%", height: "100%" },
    avatarText: { color: "#111111", fontSize: 22, fontWeight: "900" },
    avatarPickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    avatarOption: { width: "30%", minWidth: 96, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.card, alignItems: "center", padding: 10 },
    avatarOptionSelected: { borderColor: BRAND_ORANGE, backgroundColor: palette.accentSurface },
    avatarOptionDisabled: { opacity: 0.45 },
    avatarOptionImage: { width: 64, height: 64, borderRadius: 20 },
    avatarOptionLabel: { color: palette.text, fontSize: 11, fontWeight: "900", textAlign: "center", marginTop: 8 },
    cameraBadge: { position: "absolute", right: 4, bottom: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
    headerMain: { flex: 1, minWidth: 0 },
    profileNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    profileNameText: { flexShrink: 1 },
    profileTapHint: { color: BRAND_ORANGE, fontSize: 10, lineHeight: 14, fontWeight: "800", marginTop: 2 },
    title: { color: palette.text, fontSize: 24, fontWeight: "900" },
    meta: { color: palette.subtext, fontSize: 13, fontWeight: "700", marginTop: 4 },
    completedText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", marginTop: 8 },
    editButton: { alignSelf: "flex-start", minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.iconSurface, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    editButtonText: { color: palette.text, fontSize: 12, fontWeight: "900" },
    section: { borderRadius: 22, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.cardBorder, padding: 16 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    sectionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.accentSurface, alignItems: "center", justifyContent: "center" },
    sectionTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    inputBlock: { marginBottom: 12 },
    requestCard: { borderRadius: 22, borderWidth: 1, borderColor: "#fed7aa", backgroundColor: palette.card, padding: 16, marginBottom: 16 },
    requestHero: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    requestIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: palette.accentSurface, alignItems: "center", justifyContent: "center" },
    requestTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    requestSubtitle: { color: BRAND_ORANGE, fontSize: 11, fontWeight: "900", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 },
    requestCopy: { color: palette.subtext, fontSize: 13, lineHeight: 20, fontWeight: "600" },
    requestInput: { minHeight: 118, textAlignVertical: "top", paddingTop: 14 },
    inputLabel: { color: palette.subtext, fontSize: 12, fontWeight: "900", marginBottom: 7 },
    input: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.iconSurface, paddingHorizontal: 14, color: palette.text, fontSize: 15, fontWeight: "800" },
    disabledInput: { opacity: 0.7 },
    primaryButton: { minHeight: 50, borderRadius: 15, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", marginTop: 8 },
    primaryButtonText: { color: "#111111", fontSize: 14, fontWeight: "900" },
    row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: palette.cardBorder },
    rowMain: { flex: 1, minWidth: 0 },
    rowTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    rowCopy: { color: palette.subtext, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 4 },
    metricValue: { color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", maxWidth: "40%", textAlign: "right" },
    choiceSection: { paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.cardBorder },
    choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    choiceChip: { minHeight: 38, borderRadius: 14, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.iconSurface, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    choiceChipActive: { borderColor: BRAND_ORANGE, backgroundColor: palette.accentSurface },
    choiceText: { color: palette.subtext, fontSize: 12, fontWeight: "900" },
    choiceTextActive: { color: BRAND_ORANGE },
    smallIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.accentSurface, alignItems: "center", justifyContent: "center" },
    logoutButton: { minHeight: 52, borderRadius: 18, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.cardBorder, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 },
    logoutText: { color: palette.text, fontSize: 14, fontWeight: "900" },
    deleteButton: { minHeight: 52, borderRadius: 18, backgroundColor: DANGER, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 12 },
    deleteText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
    detailHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
    backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.cardBorder, alignItems: "center", justifyContent: "center" },
    detailIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: palette.accentSurface, alignItems: "center", justifyContent: "center", marginBottom: 14 },
    detailCopy: { color: palette.text, fontSize: 14, lineHeight: 22, fontWeight: "700" },
    bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 12 },
    bulletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_ORANGE, marginTop: 6 },
    bulletText: { flex: 1, color: palette.subtext, fontSize: 13, lineHeight: 20, fontWeight: "700" },
    dangerText: { color: DANGER },
    identityBackdrop: { flex: 1, backgroundColor: "rgba(4,11,23,0.42)", justifyContent: "center", alignItems: "center", padding: 22 },
    identityCardShell: { width: "100%", maxWidth: 370, borderRadius: 16, shadowColor: "#020817", shadowOpacity: 0.26, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 10 },
    identityCard: { borderRadius: 16, overflow: "hidden", backgroundColor: palette.glass, borderWidth: 1, borderColor: palette.glassBorder, padding: 18 },
    identityGlowPrimary: { position: "absolute", width: 150, height: 150, borderRadius: 75, top: -78, right: -52, backgroundColor: "rgba(246,163,19,0.20)" },
    identityGlowSecondary: { position: "absolute", width: 128, height: 128, borderRadius: 64, bottom: -76, left: -48, backgroundColor: "rgba(37,99,235,0.11)" },
    identityHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 18 },
    identityHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: palette.glassSurface, alignItems: "center", justifyContent: "center" },
    identityTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: "900" },
    identitySubtitle: { color: palette.subtext, fontSize: 11, lineHeight: 16, fontWeight: "700", marginTop: 1 },
    identityClose: { width: 48, height: 48, borderRadius: 14, backgroundColor: palette.glassSurface, alignItems: "center", justifyContent: "center" },
    identityHero: { flexDirection: "row", alignItems: "center", gap: 15, paddingBottom: 17 },
    identityAvatarFrame: { width: 86, height: 86, borderRadius: 26, padding: 3, backgroundColor: "rgba(255,255,255,0.58)", borderWidth: 1, borderColor: "rgba(255,255,255,0.82)" },
    identityAvatarImage: { width: "100%", height: "100%", borderRadius: 22 },
    identityVerifiedBadge: { position: "absolute", right: -3, bottom: -3, width: 25, height: 25, borderRadius: 13, backgroundColor: "#2563eb", borderWidth: 3, borderColor: palette.glassBorder, alignItems: "center", justifyContent: "center" },
    identityHeroCopy: { flex: 1, minWidth: 0 },
    identityName: { color: palette.text, fontSize: 21, lineHeight: 26, fontWeight: "900" },
    identityRole: { color: BRAND_ORANGE, fontSize: 12, lineHeight: 17, fontWeight: "900", marginTop: 2 },
    identityEmailBand: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 11, borderTopWidth: 1, borderTopColor: palette.glassDivider, paddingVertical: 10 },
    identityEmailValue: { flexShrink: 1, color: palette.text, fontSize: 13, lineHeight: 19, fontWeight: "800", marginTop: 2 },
    identityIdBand: { minHeight: 62, borderRadius: 14, backgroundColor: palette.glassSurface, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 13, marginBottom: 6 },
    identityIdIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "rgba(246,163,19,0.14)", alignItems: "center", justifyContent: "center" },
    identityIdLabel: { color: palette.subtext, fontSize: 10, lineHeight: 14, fontWeight: "900", letterSpacing: 0.45 },
    identityIdValue: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: "900", marginTop: 1 },
    identityDetails: { marginTop: 4 },
    identityRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11, borderTopWidth: 1, borderTopColor: palette.glassDivider, paddingVertical: 10 },
    identityRowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: palette.glassSurface, alignItems: "center", justifyContent: "center" },
    identityLabel: { color: palette.subtext, fontSize: 10, lineHeight: 14, fontWeight: "800" },
    identityValue: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: "900", marginTop: 2 }
  });
}

function HelpCenterFAQScreen({ styles, palette, onBack, onContactSupport }: { styles: any; palette: any; onBack: () => void; onContactSupport: () => void }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I accept a delivery job?",
      a: "Go online from the Home tab. When a batch or delivery request is offered, tap it to see the pickup location and estimated earnings. Tap 'Accept' before the timer expires to lock it."
    },
    {
      q: "What should I do before picking up an order?",
      a: "Reach the pickup location on time. Check the items against the checklist, confirm that package photos are uploaded, and obtain the pickup OTP from the sender before receiving the package."
    },
    {
      q: "How do I update my pickup or drop status?",
      a: "Use the active navigation routes shown in the app. Swipe the status bars or press the action buttons (e.g. 'Arrived at Pickup', 'OTP Verified', 'Picked Up', 'Delivered') to log your progress."
    },
    {
      q: "What if I face an issue during delivery?",
      a: "If you face any vehicle breakdown, customer dispute, or route blockage, call Call Support (+91 98765 00000) or open a support chat immediately for admin assistance."
    },
    {
      q: "How do I contact the customer?",
      a: "Go to the active delivery task details page. You will find a call icon next to the customer's or tailor's name. Tap it to dial their registered mobile number."
    },
    {
      q: "What is route mode and when should I use it?",
      a: "Route mode enables real-time GPS tracking of your location to assist tailor and customer notifications. Always keep route mode enabled during active pickups and deliveries."
    },
    {
      q: "How do I complete a delivery?",
      a: "Verify the order reference code. Ask the recipient for the delivery OTP and enter it in the app. If required, upload a clear handoff proof photo to finish."
    },
    {
      q: "What if OTP is not received?",
      a: "Ask the user to check their network connection. If it still doesn't arrive, wait for the timer and tap 'Resend OTP'. If needed, contact Call Support to verify the handoff manually."
    }
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>Help Center</Text>
          <Text style={styles.meta}>Delivery workflow support</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14 }}>
          <Ionicons name="earth-outline" size={32} color={BRAND_ORANGE} />
        </View>
        <Text style={[styles.detailCopy, { textAlign: "center", fontSize: 14, lineHeight: 22 }]}>
          This section helps you understand the entire delivery process on Darji — from accepting jobs to completing deliveries successfully.
        </Text>
        
        <View style={{ gap: 8, marginTop: 12 }}>
          {[
            "Learn the correct steps for smooth deliveries.",
            "Follow best practices to avoid mistakes.",
            "Get quick answers to your common questions."
          ].map((pt) => (
            <View key={pt} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND_ORANGE }} />
              <Text style={{ color: palette.text, fontSize: 13, fontWeight: "600" }}>{pt}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22, marginBottom: 12 }}>
        <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2 }} />
        <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>COMMON QUESTIONS</Text>
      </View>

      <View style={{ gap: 10 }}>
        {faqs.map((faq, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <View key={faq.q} style={{ backgroundColor: palette.card, borderRadius: 14, borderWidth: 1, borderColor: palette.cardBorder, overflow: "hidden" }}>
              <Pressable
                onPress={() => setExpandedIndex(isExpanded ? null : index)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="help-circle-outline" size={18} color={BRAND_ORANGE} />
                </View>
                <Text style={{ flex: 1, color: palette.text, fontSize: 13, fontWeight: "800", lineHeight: 18 }}>{faq.q}</Text>
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={palette.subtext} />
              </Pressable>
              {isExpanded && (
                <View style={{ borderTopWidth: 1, borderTopColor: palette.cardBorder, padding: 14, backgroundColor: palette.background }}>
                  <Text style={{ color: palette.text, fontSize: 13, fontWeight: "600", lineHeight: 20 }}>{faq.a}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={onContactSupport}
        style={{
          marginTop: 24,
          backgroundColor: palette.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: palette.cardBorder,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14
        }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chatbubbles-outline" size={20} color={BRAND_ORANGE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text, fontSize: 15, fontWeight: "800" }}>Still need help?</Text>
          <Text style={{ color: palette.subtext, fontSize: 12, fontWeight: "600", marginTop: 2 }}>Contact our support team anytime</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.subtext} />
      </Pressable>
    </ScrollView>
  );
}

function DeliveryReportBugScreen({
  setScreen,
  palette,
  styles,
  token,
  showDialog
}: {
  setScreen: (screen: SupportScreen | undefined) => void;
  palette: any;
  styles: any;
  token?: string;
  showDialog: (dialog: any) => void;
}) {
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugScreenshot, setBugScreenshot] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  async function pickBugScreenshot() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload screenshots. Darji receives only the screenshot you choose, and your information stays safe.");
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
      const uploaded = await uploadDeliveryVerificationDocs([{ uri: asset.uri, name: asset.fileName || "screenshot.jpg" }], token);
      if (uploaded.length) {
        setBugScreenshot(uploaded[0].url);
      }
    } catch (e) {
      Alert.alert("Upload failed", "Could not upload the screenshot.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitBug() {
    if (bugTitle.trim().length < 3) {
      Alert.alert("Title too short", "Please write a descriptive title.");
      return;
    }
    if (bugDescription.trim().length < 10) {
      Alert.alert("Description too short", "Please write a detailed description (min 10 characters).");
      return;
    }
    if (!token) return;
    try {
      setSending(true);
      const deviceInfo = `Device: ${Platform.OS} (Version ${Platform.Version}), TV: ${Platform.isTV}`;
      await api("/support/bug-reports", {
        method: "POST",
        body: JSON.stringify({
          title: bugTitle.trim(),
          description: bugDescription.trim(),
          screenshot: bugScreenshot,
          deviceInfo,
          appVersion: "0.1.0"
        })
      }, token);
      Alert.alert("Bug Reported", "Thank you! Our engineering team has received your bug report.");
      setBugTitle("");
      setBugDescription("");
      setBugScreenshot(null);
      setScreen(undefined);
    } catch (e) {
      Alert.alert("Failed", "Could not submit bug report.");
    } finally {
      setSending(false);
    }
  }

  const bugStyles = {
    supportPage: { flex: 1, backgroundColor: palette.background, paddingTop: SCREEN_TOP_PADDING },
    supportFormContent: { gap: 16, paddingHorizontal: 18, paddingBottom: 24 },
    supportIntro: { color: palette.subtext, fontSize: 13, fontWeight: "600", lineHeight: 20 },
    supportLabel: { color: palette.text, fontSize: 14, fontWeight: "800", marginBottom: 6 },
    supportFieldHint: { color: palette.subtext, fontSize: 12, fontWeight: "600", marginBottom: 8 },
    supportSingleInput: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.card, paddingHorizontal: 14, color: palette.text, fontSize: 13, fontWeight: "800" },
    supportDescriptionInput: { minHeight: 112, borderRadius: 13, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.card, paddingHorizontal: 14, paddingVertical: 13, color: palette.text, fontSize: 13, fontWeight: "800", lineHeight: 19, textAlignVertical: "top" },
    supportCounter: { color: palette.subtext, fontSize: 11, fontWeight: "800", textAlign: "right", marginTop: 6, marginRight: 12 },
    bugUploadButton: { width: "100%", minHeight: 56, borderRadius: 13, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", backgroundColor: palette.card, flexDirection: "row", gap: 8 },
    bugSubmitButton: { height: 50, borderRadius: 14, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
    bugSubmitButtonDisabled: { opacity: 0.6 },
    bugInfoCard: { borderRadius: 10, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.card, paddingHorizontal: 12 },
    bugInfoRow: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10 },
    bugInfoRowBorder: { borderTopWidth: 1, borderTopColor: palette.cardBorder },
    bugInfoIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: (palette.card === "#0a1322" ? "#0f172a" : "#f1f5f9"), alignItems: "center", justifyContent: "center" },
    bugInfoLabel: { flex: 1, minWidth: 0, color: palette.text, fontSize: 11, fontWeight: "900" },
    bugInfoValue: { color: palette.text, fontSize: 10, fontWeight: "900" }
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: SCREEN_TOP_PADDING }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, marginBottom: 14 }}>
        <Pressable style={styles.backButton} onPress={() => setScreen(undefined)}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>Report a Bug</Text>
          <Text style={styles.meta}>Let us know if something isn't working</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={bugStyles.supportFormContent}>
        <Text style={bugStyles.supportIntro}>Found something that's not working right? Let us know and we'll fix it.</Text>
        
        <View>
          <Text style={bugStyles.supportLabel}>Bug title</Text>
          <Text style={bugStyles.supportFieldHint}>Give a short title for the issue</Text>
          <TextInput
            style={bugStyles.supportSingleInput}
            value={bugTitle}
            onChangeText={setBugTitle}
            placeholder="Eg. App crashes on Orders page"
            placeholderTextColor={palette.subtext}
          />
        </View>

        <View>
          <Text style={bugStyles.supportLabel}>What happened?</Text>
          <Text style={bugStyles.supportFieldHint}>Describe the issue in simple words</Text>
          <TextInput
            style={bugStyles.supportDescriptionInput}
            value={bugDescription}
            onChangeText={(value) => value.length <= 500 && setBugDescription(value)}
            placeholder="Tell us what went wrong and how we can see it"
            placeholderTextColor={palette.subtext}
            multiline
          />
          <Text style={{ color: palette.subtext, fontSize: 11, fontWeight: "800", textAlign: "right", marginTop: 4 }}>{bugDescription.length}/500</Text>
        </View>

        <View>
          <Text style={bugStyles.supportLabel}>Add screenshot (optional)</Text>
          <Text style={bugStyles.supportFieldHint}>You can add a screenshot to help us understand</Text>
          {bugScreenshot ? (
            <View style={{ width: 140, height: 140, borderRadius: 14, borderWidth: 1, borderColor: palette.cardBorder, overflow: "hidden", position: "relative" }}>
              <Image source={{ uri: bugScreenshot }} style={{ width: "100%", height: "100%" }} />
              <Pressable 
                style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}
                onPress={() => setBugScreenshot(null)}
              >
                <Ionicons name="close" size={16} color="#ffffff" />
              </Pressable>
            </View>
          ) : (
            <Pressable 
              style={bugStyles.bugUploadButton}
              onPress={pickBugScreenshot}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={BRAND_ORANGE} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color={BRAND_ORANGE} />
                  <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" }}>Upload screenshot</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={bugStyles.bugInfoCard}>
          <View style={bugStyles.bugInfoRow}>
            <View style={bugStyles.bugInfoIcon}>
              <Ionicons name="phone-portrait-outline" size={14} color="#8fa0b8" />
            </View>
            <Text style={bugStyles.bugInfoLabel}>Your device</Text>
            <Text style={bugStyles.bugInfoValue}>{Platform.OS} {Platform.Version}</Text>
          </View>
          <View style={[bugStyles.bugInfoRow, bugStyles.bugInfoRowBorder]}>
            <View style={bugStyles.bugInfoIcon}>
              <Ionicons name="information-circle-outline" size={14} color="#8fa0b8" />
            </View>
            <Text style={bugStyles.bugInfoLabel}>App version</Text>
            <Text style={bugStyles.bugInfoValue}>0.1.0 (Dev Build)</Text>
          </View>
        </View>

        <Pressable
          style={[
            bugStyles.bugSubmitButton,
            (bugTitle.trim().length < 3 || bugDescription.trim().length < 10 || sending) && bugStyles.bugSubmitButtonDisabled
          ]}
          disabled={bugTitle.trim().length < 3 || bugDescription.trim().length < 10 || sending}
          onPress={handleSubmitBug}
        >
          {sending ? <ActivityIndicator color="#111111" /> : (
            <>
              <Ionicons name="bug-outline" size={17} color="#111111" />
              <Text numberOfLines={1} style={{ color: "#111111", fontSize: 14, fontWeight: "900" }}>Submit Bug Report</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
