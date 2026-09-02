import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { createContext, forwardRef, useContext, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, RefreshControl, ScrollView as RNScrollView, StyleSheet, StatusBar, Switch, Text, TextInput, View, Alert, Modal, KeyboardAvoidingView, BackHandler, TouchableOpacity, type ImageSourcePropType, type ScrollViewProps } from "react-native";
import { api, deleteTailorSample, uploadTailorSamples, uploadTailorVerificationMedia } from "../api";
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
const tailorAppLogo = require("../../app-icon.png");
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
const SCREEN_TOP_PADDING = STATUS_BAR_INSET + 24;
const CHAT_BOTTOM_INSET = Platform.OS === "android" ? 42 : 22;

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
type DialogState = { title: string; message: string; icon?: IconName; actions?: Array<{ label: string; variant?: "primary" | "secondary"; onPress?: () => void }>; variant?: "requestSuccess" };
type TailorSettings = {
  notifications?: boolean;
  soundAlerts?: boolean;
  compactCards?: boolean;
  autoOpenNewRequests?: boolean;
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
  verificationStatus?: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED";
  verification?: { personal?: { email?: string }; idVerification?: { facePhotoUrl?: string } };
  sampleGallery?: Array<{ id?: string; _id?: string; url: string; status?: "PENDING" | "APPROVED" | "REJECTED"; originalName?: string; uploadedAt?: string; rejectionReason?: string }>;
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
type SupportScreen = "faqs" | "reviews" | "chat" | "call" | "email" | "complaint" | "bug" | "feature" | "privacy" | "terms" | "cancellation" | "version" | "about" | "support_center" | "requests";

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
  return /authentication required|invalid session|invalid or expired token|invalid refresh token|session expired|signed in on another device/i.test(message);
}

function getDeviceOsLabel() {
  if (Platform.OS === "android") {
    const constants = Platform.constants as { Release?: string; Version?: number | string };
    const release = constants.Release;
    const apiLevel = Platform.Version ?? constants.Version;
    return release ? `Android ${release} (API ${apiLevel})` : `Android ${apiLevel}`;
  }
  if (Platform.OS === "ios") return `iOS ${Platform.Version}`;
  return `${Platform.OS} ${Platform.Version}`;
}

export function TailorProfileScreen({ me, token, orders, refresh, showDialog, onSessionExpired, onOpenTransactions, onOpenOrders, socket, initialSupportScreen, clearInitialSupportScreen }: Props) {
  const { signOut } = useAppStore();
  const language = useAppStore((state) => state.language);
  const setLanguagePreference = useAppStore((state) => state.setLanguagePreference);
  const profile = me?.tailorProfile;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const settingsFromServer = useMemo(() => profile?.settings ?? {}, [profile?.settings]);
  const activeOrders = orders.filter((order) => !["READY", "DELIVERED", "CANCELLED"].includes(order.status)).length;
  const completedOrders = orders.filter((order) => ["READY", "DELIVERED", "STITCHING_COMPLETED"].includes(order.status)).length;
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
  const [showSampleWork, setShowSampleWork] = useState(false);
  const [sampleDrafts, setSampleDrafts] = useState<Array<{ uri: string; name: string }>>([]);

  const [supportScreen, setSupportScreen] = useState<SupportScreen>();
  const [selectedFaqIndex, setSelectedFaqIndex] = useState<number>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingSamples, setUploadingSamples] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [name, setName] = useState(me?.name ?? "");
  const [shopName, setShopName] = useState(profile?.shopName ?? "Darji Tailor");
  const [email, setEmail] = useState(me?.email ?? "");
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
  const verificationAvatarUrl = profile?.verification?.idVerification?.facePhotoUrl;
  const serverEmail = me?.email?.trim() || profile?.verification?.personal?.email?.trim() || "";
  const avatarLocked = Boolean(verificationAvatarUrl) || profile?.verificationStatus === "VERIFIED";

  function handleLanguageChange(nextLanguage: AppLanguage) {
    setLanguagePreference(nextLanguage);
    showDialog({ title: t(nextLanguage, "languageUpdated"), message: t(nextLanguage, "languageUpdatedMessage"), icon: "checkmark-circle-outline" });
  }

  function handleSupportBack() {
    if (supportScreen === "faqs" && selectedFaqIndex != null) {
      setSelectedFaqIndex(undefined);
      return;
    }
    setSupportScreen(undefined);
  }

  useEffect(() => {
    if (initialSupportScreen === "support_center") {
      setSupportScreen("support_center");
      clearInitialSupportScreen?.();
    }
  }, [initialSupportScreen]);

  useEffect(() => {
    setName(me?.name ?? "");
    setShopName(profile?.shopName ?? "Darji Tailor");
    setEmail(serverEmail);
    setAvailable(Boolean(profile?.isAvailable ?? true));
    setNotifications((current) => ({ ...current, newOrderAlerts: settingsFromServer.notifications ?? true, sound: settingsFromServer.soundAlerts ?? true }));
    setGeneral((current) => ({ ...current, darkMode: settingsFromServer.darkMode ?? false }));
  }, [me?.name, profile, serverEmail]);

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
      const saved = await api<MeResponse>(
        "/tailors/me/profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            shopName: shopName.trim(),
            email: email.trim() || undefined,
            settings: {
              notifications: notifications.newOrderAlerts,
              soundAlerts: notifications.sound,
              darkMode: general.darkMode
            }
          })
        },
        token
      );
      setEmail(saved.email?.trim() || saved.tailorProfile?.verification?.personal?.email?.trim() || email.trim());
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

  async function submitShopChangeRequest() {
    if (shopChangeRequest.trim().length < 10) {
      showDialog({
        title: "Request too short",
        message: "Please explain your shop details change request in at least 10 characters.",
        icon: "create-outline"
      });
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
      showDialog({
        title: "Request Submitted!",
        message: "Your shop details change request has been sent for approval.\n\nOur team will review it and get back to you soon.",
        icon: "paper-plane-outline",
        variant: "requestSuccess"
      });
      setShowShopDetails(false);
    } catch (e) {
      showDialog({ title: "Failed", message: "Could not submit request. Please try again.", icon: "alert-circle-outline" });
    } finally {
      setSubmittingShopChange(false);
    }
  }

  async function submitBankChangeRequest() {
    if (bankChangeRequest.trim().length < 10) {
      showDialog({
        title: "Request too short",
        message: "Please explain your bank details change request in at least 10 characters.",
        icon: "card-outline"
      });
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
      showDialog({ title: "Request Submitted", message: "Your bank account details change request has been sent for approval.", icon: "checkmark-circle-outline" });
      setShowBankDetails(false);
    } catch (e) {
      showDialog({ title: "Failed", message: "Could not submit request. Please try again.", icon: "alert-circle-outline" });
    } finally {
      setSubmittingBankChange(false);
    }
  }

  async function pickSamplePhotos() {
    const existing = (profile?.sampleGallery ?? []).filter((sample) => sample.status !== "REJECTED").length;
    const remaining = Math.max(0, 5 - existing - sampleDrafts.length);
    if (remaining <= 0) {
      showDialog({ title: "Sample limit reached", message: "You can keep up to 5 pending or approved sample photos.", icon: "images-outline" });
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({ title: "Permission needed", message: "Allow photo library access to upload sample work photos.", icon: "alert-circle-outline" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.82
    });
    if (result.canceled) return;
    setSampleDrafts((current) => [
      ...current,
      ...result.assets.slice(0, remaining).map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `tailor-sample-${Date.now()}-${index}.jpg`
      }))
    ]);
  }

  async function submitSamplePhotos() {
    if (!token || sampleDrafts.length === 0) return;
    try {
      setUploadingSamples(true);
      await uploadTailorSamples(sampleDrafts, token);
      setSampleDrafts([]);
      showDialog({ title: "Samples submitted", message: "Your sample photos were sent for verification.", icon: "checkmark-circle-outline" });
      refresh();
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not upload sample photos.", icon: "alert-circle-outline" });
    } finally {
      setUploadingSamples(false);
    }
  }

  async function removeUploadedSample(sampleId?: string) {
    if (!token || !sampleId) return;
    try {
      await deleteTailorSample(sampleId, token);
      refresh();
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Delete failed", message: error instanceof Error ? error.message : "Could not delete this sample photo.", icon: "alert-circle-outline" });
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
          requestedValues: { reason: "Tailor requested account deletion from profile settings" }
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

  function withProfileRefresh(node: React.ReactNode) {
    return (
      <PullToRefreshContext.Provider value={{ refreshing: pullRefreshing, onRefresh: () => void refreshProfileScreen() }}>
        {node}
      </PullToRefreshContext.Provider>
    );
  }

  return withProfileRefresh(
    <View style={styles.root}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Image source={verificationAvatarUrl || me?.avatarUrl ? { uri: verificationAvatarUrl || me?.avatarUrl } : getFallbackAvatar(name || shopName)} style={styles.avatarImage} />
          {avatarLocked ? (
            <View style={styles.avatarLockBadge}>
              <Ionicons name="lock-closed" size={10} color={palette.surface} />
            </View>
          ) : null}
        </View>
        <View style={styles.headerMain}>
          <Text style={styles.title}>{shopName}</Text>
          <ProfileMetaRow icon={avatarLocked ? "shield-checkmark-outline" : "person-outline"} text={avatarLocked ? `${name || "Tailor Partner"} - Verification photo locked` : name || "Tailor Partner"} color={avatarLocked ? "#2563eb" : MUTED} styles={styles} />
          <ProfileMetaRow icon="call-outline" text={`+91 ${me?.phone ?? "XXXXXXXXXX"}`} styles={styles} />
          <ProfileMetaRow icon="mail-outline" text={email.trim() || serverEmail || "Email not added"} muted={!(email.trim() || serverEmail)} styles={styles} />
          <View style={styles.completedPill}>
            <Ionicons name="checkmark-circle-outline" size={14} color={SUCCESS} />
            <Text style={styles.completedText}>{completedOrders} completed orders</Text>
          </View>
        </View>
      </View>

      <Section title={t(language, "account")} icon="person-outline" styles={styles}>
        <InfoRow icon="create-outline" title="Edit Profile" value="Update name and shop details" styles={styles} onPress={() => setEditing(true)} noBorder />
        <InfoRow icon="storefront-outline" title="Shop Details" value={shopName} styles={styles} onPress={() => setShowShopDetails(true)} />
        <InfoRow icon="images-outline" title="Sample Photos" value={`${(profile?.sampleGallery ?? []).length} uploaded, ${sampleDrafts.length} ready to submit`} styles={styles} onPress={() => setShowSampleWork(true)} />
      </Section>

      <Modal visible={showSampleWork} onRequestClose={() => setShowSampleWork(false)} animationType="slide">
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.detailHeader}>
              <Pressable style={styles.backButton} onPress={() => setShowSampleWork(false)}>
                <Ionicons name="chevron-back" size={22} color={palette.text} />
              </Pressable>
              <View style={styles.rowMain}>
                <Text style={styles.title}>Sample Photos</Text>
                <Text style={styles.meta}>Submit dress photos for admin verification</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHint}>Add up to 5 sample photos. Customers will only see photos after approval.</Text>
              <Pressable style={styles.sampleUploadButtonWide} onPress={pickSamplePhotos} disabled={uploadingSamples}>
                <Ionicons name="images-outline" size={18} color="#111111" />
                <Text style={styles.primaryButtonText}>Add Photos</Text>
              </Pressable>
              {sampleDrafts.length ? (
                <View style={styles.sampleGrid}>
                  {sampleDrafts.map((sample, index) => (
                    <View key={sample.uri} style={styles.sampleGalleryCard}>
                      <Image source={{ uri: sample.uri }} style={styles.sampleGalleryImage} />
                      <Pressable style={styles.sampleDeleteButton} onPress={() => setSampleDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <Ionicons name="trash-outline" size={15} color="#ffffff" />
                      </Pressable>
                      <Text style={styles.sampleGalleryName} numberOfLines={1}>Ready to submit</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyMiniCard}>
                  <Ionicons name="image-outline" size={22} color={MUTED} />
                  <Text style={styles.emptyMiniText}>No new photos selected</Text>
                </View>
              )}
              <Pressable style={[styles.primaryButton, (!sampleDrafts.length || uploadingSamples) && styles.disabledButton]} onPress={submitSamplePhotos} disabled={!sampleDrafts.length || uploadingSamples}>
                {uploadingSamples ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Submit Photos for Verification</Text>}
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Uploaded Photos</Text>
              {(profile?.sampleGallery ?? []).length ? (
                <View style={styles.sampleGrid}>
                  {(profile?.sampleGallery ?? []).map((sample, index) => {
                    const sampleId = sample.id ?? sample._id;
                    return (
                      <View key={sampleId ?? sample.url} style={styles.sampleGalleryCard}>
                        <Image source={{ uri: sample.url }} style={styles.sampleGalleryImage} />
                        <View style={styles.sampleStatusPill}>
                          <Text style={styles.sampleStatusText}>{sample.status ?? "PENDING"}</Text>
                        </View>
                        {sample.status !== "APPROVED" ? (
                          <Pressable style={styles.sampleDeleteButton} onPress={() => removeUploadedSample(sampleId)}>
                            <Ionicons name="trash-outline" size={15} color="#ffffff" />
                          </Pressable>
                        ) : null}
                        <Text style={styles.sampleGalleryName} numberOfLines={1}>{sample.originalName ?? `Sample ${index + 1}`}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyMiniCard}>
                  <Ionicons name="image-outline" size={22} color={MUTED} />
                  <Text style={styles.emptyMiniText}>No uploaded sample photos yet</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

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
              <Input icon="person-outline" label="Tailor Name" value={name} onChangeText={setName} placeholder="Enter tailor name" styles={styles} />
              <Input icon="storefront-outline" label="Shop Name" value={shopName} onChangeText={setShopName} placeholder="Enter shop name" styles={styles} />
              <Input icon="mail-outline" label="Email" value={email} onChangeText={setEmail} placeholder="Enter email address" keyboardType="email-address" styles={styles} />
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
                <Text style={styles.meta}>Your shop information & working hours</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>SHOP CONFIGURATION</Text>
              </View>
              <InfoRow icon="storefront-outline" title="Shop Name" value={shopName} styles={styles} />
              <InfoRow icon="time-outline" title="Active Work" value={`${activeOrders} orders in progress`} styles={styles} />
              <InfoRow icon="ribbon-outline" title="Specializations" value={profile?.specialization?.join(", ") || "Custom tailoring"} styles={styles} />
            </View>

            <View style={styles.requestCard}>
              <View style={styles.requestHero}>
                <View style={styles.requestIcon}><Ionicons name="create-outline" size={22} color={BRAND_ORANGE} /></View>
                <View style={styles.rowMain}>
                  <Text style={styles.requestTitle}>Request Changes</Text>
                  <Text style={styles.requestSubtitle}>We'll review and update it for you</Text>
                </View>
              </View>
              <Text style={styles.requestCopy}>Need to make any changes to your shop details? Let us know—address, category, capacity, or any other information.</Text>
              <Text style={styles.requestCopy}>You can track the request in Support Center.</Text>
              <View style={styles.inputBlock}>
                <TextInput
                  style={[styles.input, styles.requestInput]}
                  value={shopChangeRequest}
                  onChangeText={setShopChangeRequest}
                  placeholder="Write the changes you want to request..."
                  placeholderTextColor="#9aa6b8"
                  multiline
                />
              </View>
              <Pressable style={styles.primaryButton} onPress={submitShopChangeRequest} disabled={submittingShopChange}>
                {submittingShopChange ? <ActivityIndicator color="#111111" /> : (
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
        <InfoRow icon="cube-outline" title={t(language, "orderHistory")} value={language === "hi" ? `${completedOrders} पूरे, ${activeOrders} प्रगति पर` : `${completedOrders} completed, ${activeOrders} in progress`} styles={styles} onPress={onOpenOrders} />
        <InfoRow icon="star-outline" title="Customer Reviews" value={`${averageRating ? averageRating.toFixed(1) : "0.0"} rating (${ratingCount} reviews)`} styles={styles} onPress={() => setSupportScreen("reviews")} />
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
        <InfoRow icon="help-buoy-outline" title="FAQs" value={language === "hi" ? "आम सवालों के जवाब" : "Find quick answers to common questions"} styles={styles} onPress={() => { setSelectedFaqIndex(undefined); setSupportScreen("faqs"); }} noBorder />
        <InfoRow icon="chatbubble-outline" title={t(language, "supportCenter")} value={language === "hi" ? "चैट, कॉल या अकाउंट बदलाव के लिए सहायता लें" : "Chat, call, or request account updates"} styles={styles} onPress={() => setSupportScreen("support_center")} />
        <InfoRow icon="bug-outline" title="Report a Bug" value="Found an issue? Let us know" styles={styles} onPress={() => setSupportScreen("bug")} />
      </Section>

      <Section title={t(language, "policiesInformation")} icon="document-text-outline" styles={styles}>
        <InfoRow icon="information-circle-outline" title={t(language, "aboutDarji")} value={language === "hi" ? "Darji Tailor Partner ऐप के बारे में जानें" : "Learn about Darji Tailor Partner app"} styles={styles} onPress={() => setSupportScreen("about")} noBorder />
        <InfoRow icon="shield-checkmark-outline" title={t(language, "privacyPolicy")} value={language === "hi" ? "जानें आपकी निजी जानकारी कैसे सुरक्षित रखी जाती है" : "How your personal data is handled"} styles={styles} onPress={() => setSupportScreen("privacy")} />
        <InfoRow icon="reader-outline" title={t(language, "termsOfUse")} value={language === "hi" ? "सेवा उपयोग की शर्तें" : "Terms of use agreements"} styles={styles} onPress={() => setSupportScreen("terms")} />
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
        <InfoRow
          icon="log-out-outline"
          title={t(language, "logout")}
          value={t(language, "signOutOfAccount")}
          styles={styles}
          onPress={() => setShowLogoutModal(true)}
        />
      </Section>
    </ScrollView>
    <Modal visible={Boolean(supportScreen)} onRequestClose={handleSupportBack} animationType="slide">
      {supportScreen === "support_center" ? (
        <TailorSupportCenterScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} showDialog={showDialog} />
      ) : supportScreen === "chat" ? (
        <TailorSupportChatScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} socket={socket} />
      ) : supportScreen === "requests" ? (
        <TailorAccountRequestsScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} showDialog={showDialog} />
      ) : supportScreen === "bug" ? (
        <TailorBugReportScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} showDialog={showDialog} />
      ) : supportScreen === "reviews" ? (
        <TailorReviewsScreen token={token} styles={styles} palette={palette} onBack={() => setSupportScreen(undefined)} />
      ) : supportScreen === "faqs" ? (
        <TailorFaqScreen
          styles={styles}
          palette={palette}
          onBack={() => setSupportScreen(undefined)}
          openSupportCenter={() => setSupportScreen("support_center")}
          selectedFaqIndex={selectedFaqIndex}
          setSelectedFaqIndex={setSelectedFaqIndex}
        />
      ) : supportScreen ? (
        <SupportDetailScreen
          screen={supportScreen as Exclude<SupportScreen, "support_center" | "requests" | "reviews" | "faqs">}
          styles={styles}
          palette={palette}
          onBack={() => setSupportScreen(undefined)}
          showDialog={showDialog}
          openSupportCenter={() => setSupportScreen("support_center")}
        />
      ) : null}
    </Modal>

    <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => !submittingDeletion && setShowDeleteModal(false)}>
      <Pressable style={styles.dangerModalBackdrop} onPress={() => !submittingDeletion && setShowDeleteModal(false)}>
        <Pressable style={styles.dangerModalCard}>
          <View style={styles.dangerModalHeader}>
            <View style={styles.dangerModalIcon}>
              <Ionicons name="trash-outline" size={23} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0b2241", marginBottom: 8 }}>{language === "hi" ? "अकाउंट हटाने का अनुरोध?" : "Request account deletion?"}</Text>
            <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 }}>{language === "hi" ? "आपका अनुरोध एडमिन को भेजा जाएगा। मंजूरी मिलने तक अकाउंट चालू रहेगा।" : "Your request will be sent to admin. Your account remains active until it is approved."}</Text>
          </View>
          <View style={styles.dangerModalNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#ef4444" />
            <Text style={styles.dangerModalNoticeText}>If approved, all your data will be permanently deleted and cannot be recovered.</Text>
          </View>
          <Pressable style={styles.dangerModalPrimary} onPress={submitAccountDeletionRequest} disabled={submittingDeletion}>
            {submittingDeletion ? <ActivityIndicator color="#ffffff" /> : <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 16 }}>{language === "hi" ? "हाँ, अनुरोध भेजें" : "Yes, submit request"}</Text>}
          </Pressable>
          <Pressable style={styles.dangerModalSecondary} onPress={() => setShowDeleteModal(false)} disabled={submittingDeletion}>
            <Text style={styles.dangerModalSecondaryText}>{t(language, "cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>

    {/* Custom Logout Confirmation Modal */}
    <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
      <Pressable style={styles.dangerModalBackdrop} onPress={() => setShowLogoutModal(false)}>
        <Pressable style={styles.dangerModalCard}>
          <View style={styles.dangerModalHeader}>
            <View style={styles.dangerModalIcon}>
              <Ionicons name="log-out-outline" size={23} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0b2241", marginBottom: 8 }}>{t(language, "signOut")}</Text>
              <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 }}>{t(language, "logoutConfirm")}</Text>
          </View>
          <View style={styles.dangerModalNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#ef4444" />
            <Text style={styles.dangerModalNoticeText}>You can sign in again anytime using your registered mobile number.</Text>
          </View>
          <Pressable
            style={styles.dangerModalPrimary}
            onPress={() => { setShowLogoutModal(false); signOut(); }}
          >
            <Text style={styles.dangerModalPrimaryText}>{t(language, "yesSignOut")}</Text>
          </Pressable>
          <Pressable
            style={[styles.dangerModalSecondary, styles.dangerModalSecondaryFilled]}
            onPress={() => setShowLogoutModal(false)}
          >
            <Text style={styles.dangerModalSecondaryText}>{t(language, "cancel")}</Text>
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

function Input({ icon, label, value, onChangeText, placeholder, keyboardType, styles }: { icon?: IconName; label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: "default" | "email-address"; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.iconInputWrap}>
        {icon ? <Ionicons name={icon} size={18} color={BRAND_ORANGE} /> : null}
        <TextInput style={styles.iconInput} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9aa6b8" keyboardType={keyboardType} />
      </View>
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

function ProfileMetaRow({ icon, text, styles, color = MUTED, muted }: { icon: IconName; text: string; styles: ReturnType<typeof createStyles>; color?: string; muted?: boolean }) {
  return (
    <View style={styles.profileMetaRow}>
      <Ionicons name={icon} size={13} color={muted ? "#9aa6b8" : color} />
      <Text style={[styles.profileMetaText, { color: muted ? "#8a96a8" : color }]} numberOfLines={1}>{text}</Text>
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

function TailorReviewsScreen({ token, styles, palette, onBack }: { token?: string; styles: ReturnType<typeof createStyles>; palette: any; onBack: () => void }) {
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; comment?: string; createdAt?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return () => { active = false; };
    }
    api<Array<{ id: string; rating: number; comment?: string; createdAt?: string }>>("/tailors/me/reviews", {}, token)
      .then((items) => { if (active) setReviews(items); })
      .catch(() => { if (active) setReviews([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>Customer Reviews</Text>
          <Text style={styles.meta}>Anonymous feedback from your completed orders</Text>
        </View>
      </View>
      <View style={styles.reviewOverview}>
        <Text style={styles.reviewAverage}>{average ? average.toFixed(1) : "0.0"}</Text>
        <View style={styles.reviewOverviewCopy}>
          <View style={styles.reviewStarsRow}>
            {[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name={star <= Math.round(average) ? "star" : "star-outline"} size={18} color={BRAND_ORANGE} />)}
          </View>
          <Text style={styles.meta}>{reviews.length} customer review{reviews.length === 1 ? "" : "s"}</Text>
        </View>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 32 }} color={BRAND_ORANGE} /> : null}
      {!loading && reviews.length === 0 ? (
        <View style={styles.reviewsEmpty}>
          <Ionicons name="chatbubble-ellipses-outline" size={30} color={BRAND_ORANGE} />
          <Text style={styles.rowTitle}>No reviews yet</Text>
          <Text style={styles.rowCopy}>Customer feedback will appear here after completed orders.</Text>
        </View>
      ) : null}
      {reviews.map((review) => (
        <View key={review.id} style={styles.anonymousReview}>
          <View style={styles.anonymousReviewHeader}>
            <View style={styles.reviewStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name={star <= review.rating ? "star" : "star-outline"} size={15} color={BRAND_ORANGE} />)}
            </View>
            <Text style={styles.reviewDate}>{review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}</Text>
          </View>
          <Text style={styles.reviewComment}>{review.comment || "The customer left a star rating without a written review."}</Text>
          <Text style={styles.reviewPrivacy}>Customer identity is hidden</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function TailorAboutScreen({ styles, palette, onBack }: { styles: ReturnType<typeof createStyles>; palette: any; onBack: () => void }) {
  const promises: Array<[IconName, string]> = [
    ["people-outline", "Local customers"],
    ["resize-outline", "Measurement visits"],
    ["cube-outline", "Doorstep logistics"],
    ["wallet-outline", "Tracked payouts"]
  ];
  const journey: Array<[IconName, string, string]> = [
    ["notifications-outline", "Receive a request", "Review the garment, timeline, photos, and customer instructions."],
    ["pricetag-outline", "Send your price", "Offer a clear price and realistic completion time."],
    ["cut-outline", "Stitch with confidence", "Track pickup, proof photos, measurements, and work status in one place."],
    ["checkmark-circle-outline", "Complete and earn", "Mark the garment ready and follow the payout in your wallet."]
  ];
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>About Darji</Text>
          <Text style={styles.meta}>The Darji Tailor Partner ecosystem</Text>
        </View>
      </View>
      <View style={styles.aboutHero}>
        <Image source={tailorAppLogo} style={styles.aboutLogo} resizeMode="contain" />
        <Text style={styles.aboutTagline}>Great tailoring, connected to more customers.</Text>
        <Text style={styles.aboutHeroCopy}>Darji helps skilled local tailors manage requests, measurements, doorstep logistics, and earnings from one trusted workspace.</Text>
      </View>
      <View style={styles.section}>
        <View style={styles.aboutSectionHeader}>
          <View style={styles.detailIcon}><Ionicons name="locate-outline" size={24} color={BRAND_ORANGE} /></View>
          <Text style={styles.aboutSectionTitle}>Our mission</Text>
        </View>
        <Text style={styles.detailCopy}>Make custom clothing easier to access while giving independent tailors the tools and reach to grow a dependable business.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.aboutSectionTitle}>How partnership works</Text>
        <View style={styles.aboutJourney}>
          {journey.map(([icon, title, copy]) => (
            <View key={title} style={styles.aboutJourneyRow}>
              <View style={styles.aboutJourneyIcon}><Ionicons name={icon} size={18} color={BRAND_ORANGE} /></View>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowCopy}>{copy}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.aboutSectionTitle}>The Darji partner promise</Text>
        <View style={styles.aboutPromiseGrid}>
          {promises.map(([icon, label]) => (
            <View key={label} style={styles.aboutPromiseItem}>
              <Ionicons name={icon} size={22} color={BRAND_ORANGE} />
              <Text style={styles.aboutPromiseText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function SupportDetailScreen({ screen, styles, palette, onBack, showDialog, openSupportCenter }: { screen: Exclude<SupportScreen, "support_center" | "requests" | "reviews" | "faqs">; styles: ReturnType<typeof createStyles>; palette: any; onBack: () => void; showDialog: (dialog: DialogState) => void; openSupportCenter: () => void }) {
  if (screen === "about") return <TailorAboutScreen styles={styles} palette={palette} onBack={onBack} />;
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

function TailorFaqScreen({ styles, palette, onBack, openSupportCenter, selectedFaqIndex, setSelectedFaqIndex }: { styles: ReturnType<typeof createStyles>; palette: any; onBack: () => void; openSupportCenter: () => void; selectedFaqIndex?: number; setSelectedFaqIndex: (index?: number) => void }) {
  const selectedFaq = selectedFaqIndex == null ? undefined : tailorFaqs[selectedFaqIndex];

  if (selectedFaq) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeader}>
          <Pressable style={styles.backButton} onPress={() => setSelectedFaqIndex(undefined)}>
            <Ionicons name="chevron-back" size={22} color={palette.text} />
          </Pressable>
          <View style={styles.rowMain}>
            <Text style={styles.title}>{selectedFaq.title}</Text>
            <Text style={styles.meta}>Detailed answer</Text>
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.detailIcon}><Ionicons name={selectedFaq.icon} size={24} color={BRAND_ORANGE} /></View>
          <Text style={styles.detailCopy}>{selectedFaq.answer}</Text>
          {selectedFaq.points.map((point) => (
            <View key={point} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
          {selectedFaq.supportAction ? (
            <Pressable style={styles.primaryButton} onPress={openSupportCenter}>
              <Ionicons name="headset-outline" size={18} color="#111111" />
              <Text style={styles.primaryButtonText}>Open Support Center</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>FAQs</Text>
          <Text style={styles.meta}>Quick answers to common questions</Text>
        </View>
      </View>
      <View style={[styles.section, styles.faqSection]}>
        <View style={styles.faqHeroRow}>
          <View style={styles.detailIcon}><Ionicons name="help-circle-outline" size={24} color={BRAND_ORANGE} /></View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>Got a question?</Text>
            <Text style={styles.rowCopy}>Here are answers to the most common questions.</Text>
          </View>
        </View>
        {tailorFaqs.map((faq, index) => (
          <Pressable key={faq.title} style={[styles.faqRow, index === 0 ? styles.faqFirstRow : null]} onPress={() => setSelectedFaqIndex(index)}>
            <View style={styles.faqIcon}><Ionicons name={faq.icon} size={17} color={BRAND_ORANGE} /></View>
            <View style={styles.rowMain}>
              <Text style={styles.faqTitle}>{faq.title}</Text>
              <Text style={styles.faqPreview}>{faq.preview}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>
        ))}
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

  async function pickAttachmentFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery permission needed", "Allow gallery access to add an attachment.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 1
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

              {false ? <View style={{ marginTop: 16 }}>
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
              </View> : null}
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
                    { label: "Price Request Issue", icon: "create-outline" },
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
          <View style={styles.chatScreen}>
            <View style={styles.chatHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                <Pressable 
                  style={styles.backButton}
                  onPress={() => {
                    setActiveTicket(null);
                    setView("center");
                  }}
                >
                  <Ionicons name="chevron-back" size={20} color={palette.text} />
                </Pressable>
                <View style={styles.rowMain}>
                  <Text style={styles.chatTitle} numberOfLines={1}>
                    {activeTicket.isDraft ? "Draft Conversation" : (activeTicket.deviceInfo ? `Bug: ${activeTicket.title}` : `#${(activeTicket._id || activeTicket.id || "").slice(-6).toUpperCase()}`)}
                  </Text>
                  <Text style={styles.chatSubtitle} numberOfLines={1}>
                    {activeTicket.deviceInfo ? `Status: ${activeTicket.status}` : activeTicket.subject}
                  </Text>
                </View>
              </View>
              {!activeTicket.isDraft && !activeTicket.deviceInfo && activeTicket.status !== "CLOSED" && activeTicket.status !== "RESOLVED" && (
                <Pressable 
                  style={styles.chatCloseButton}
                  onPress={() => handleCloseChat(activeTicket._id || activeTicket.id)}
                >
                  <Text style={styles.chatCloseText}>Close</Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
            >
              {activeTicket.isDraft && (
                <View style={styles.chatNotice}>
                  <View style={styles.chatNoticeIcon}>
                    <Ionicons name="chatbubble-outline" size={16} color={BRAND_ORANGE} />
                  </View>
                  <Text style={styles.chatNoticeText}>
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

            {activeTicket.status !== "CLOSED" && activeTicket.status !== "RESOLVED" && activeTicket.status !== "FIXED" ? (
              <View style={styles.chatComposerWrap}>
                {attachments.length > 0 && (
                  <View style={styles.chatAttachmentPreviewRow}>
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
                <View style={styles.chatComposer}>
                  <Pressable onPress={pickAttachmentFromGallery} style={styles.chatMediaButton} disabled={uploading}>
                    {uploading ? <ActivityIndicator size="small" color={BRAND_ORANGE} /> : <Ionicons name="image-outline" size={20} color={BRAND_ORANGE} />}
                    <Text style={styles.chatMediaText}>Gallery</Text>
                  </Pressable>
                  <Pressable onPress={pickAttachmentImage} style={styles.chatMediaButton} disabled={uploading}>
                    <Ionicons name="camera-outline" size={20} color={BRAND_ORANGE} />
                    <Text style={styles.chatMediaText}>Camera</Text>
                  </Pressable>
                  <TextInput
                    style={styles.chatInput}
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    placeholder="Type message..."
                    placeholderTextColor={palette.muted}
                    multiline
                  />
                  <Pressable 
                    style={[styles.chatSendButton, chatMessage.trim().length < 2 || sending ? { opacity: 0.6 } : null]}
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
              <View style={styles.chatClosedWrap}>
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

function TailorBugReportScreen({ setScreen, palette, styles, token, showDialog }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string; showDialog: (dialog: DialogState) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<{ uri: string; name: string; uploadedUrl?: string }>();
  const [submitting, setSubmitting] = useState(false);
  const deviceOsLabel = getDeviceOsLabel();

  async function pickScreenshot() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery permission needed", "Allow gallery access to add a screenshot.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82, selectionLimit: 1 });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    setScreenshot({ uri: asset.uri, name: asset.fileName || `bug-screenshot-${Date.now()}.jpg` });
  }

  async function submitBugReport() {
    if (title.trim().length < 3 || description.trim().length < 10) {
      showDialog({
        title: "Add more detail",
        message: "Please add a bug title and describe what happened.",
        icon: "bug-outline"
      });
      return;
    }
    if (!token) {
      showDialog({
        title: "Sign in required",
        message: "Your session has expired. Please sign in again before submitting a bug report.",
        icon: "alert-circle-outline"
      });
      return;
    }
    try {
      setSubmitting(true);
      let screenshotUrl = screenshot?.uploadedUrl;
      if (screenshot && !screenshotUrl) {
        const uploaded = await uploadTailorVerificationMedia([{ uri: screenshot.uri, name: screenshot.name }], token);
        screenshotUrl = uploaded[0]?.url;
        setScreenshot({ ...screenshot, uploadedUrl: screenshotUrl });
      }
      await api("/support/bug-reports", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          screenshot: screenshotUrl,
          deviceInfo: deviceOsLabel,
          appVersion: "0.1.0 (Dev Build)"
        })
      }, token);
      showDialog({ title: "Bug report submitted", message: "Thanks. Our team will review the issue and fix it as soon as possible.", icon: "checkmark-circle-outline" });
      setScreen(undefined);
    } catch (error) {
      showDialog({ title: "Submit failed", message: error instanceof Error ? error.message : "Could not submit bug report.", icon: "alert-circle-outline" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={[styles.content, styles.bugReportContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeader}>
          <Pressable style={styles.backButton} onPress={() => setScreen(undefined)}>
            <Ionicons name="chevron-back" size={22} color={palette.text} />
          </Pressable>
          <View style={styles.rowMain}>
            <Text style={styles.title}>Report a Bug</Text>
            <Text style={styles.meta}>Found something that's not working right?</Text>
            <Text style={styles.meta}>Let us know and we'll fix it.</Text>
          </View>
        </View>
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>Bug title</Text>
          <Text style={styles.inputHint}>Give a short title for the issue</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Eg. App crashes on Orders page" placeholderTextColor="#9aa6b8" />
        </View>
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>What happened?</Text>
          <Text style={styles.inputHint}>Describe the issue in simple words</Text>
          <View>
            <TextInput style={[styles.input, styles.bugTextArea]} value={description} onChangeText={(value) => setDescription(value.slice(0, 500))} multiline placeholder="Tell us what went wrong and how we can see it" placeholderTextColor="#9aa6b8" />
            <Text style={styles.bugCounter}>{description.length}/500</Text>
          </View>
        </View>
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>Add screenshot (optional)</Text>
          <Text style={styles.inputHint}>You can add a screenshot to help us understand</Text>
          {screenshot ? (
            <View style={styles.bugScreenshotPreview}>
              <Image source={{ uri: screenshot.uri }} style={styles.bugScreenshotImage} resizeMode="cover" />
              <Pressable accessibilityRole="button" accessibilityLabel="Remove screenshot" style={styles.bugScreenshotRemove} onPress={() => setScreenshot(undefined)}>
                <Ionicons name="trash-outline" size={17} color="#ffffff" />
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.bugScreenshotReplace} onPress={pickScreenshot}>
                <Ionicons name="images-outline" size={16} color={BRAND_ORANGE} />
                <Text style={styles.bugScreenshotReplaceText}>Replace screenshot</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.bugUploadBox} onPress={pickScreenshot}>
              <Ionicons name="cloud-upload-outline" size={20} color={BRAND_ORANGE} />
              <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900" }}>Upload screenshot</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.bugDeviceCard}>
          <InfoRow icon="phone-portrait-outline" title="Your device" value={deviceOsLabel} styles={styles} noBorder />
          <InfoRow icon="information-circle-outline" title="App version" value="0.1.0 (Dev Build)" styles={styles} />
        </View>
        <View style={[styles.bugSubmitButton, submitting && styles.bugSubmitButtonDisabled]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Submit bug report"
            activeOpacity={0.72}
            style={styles.bugSubmitButtonTouchTarget}
            onPress={submitBugReport}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <>
                <Ionicons name="bug-outline" size={20} color="#111111" />
                <Text numberOfLines={1} style={styles.bugSubmitButtonText}>Submit Bug Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TailorSupportCenterScreen({ setScreen, palette, styles, token, showDialog }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string; showDialog: (dialog: DialogState) => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: SCREEN_TOP_PADDING }}>
      <View style={styles.supportHeader}>
        <Pressable style={styles.backButton} onPress={() => setScreen(undefined)}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <View style={styles.rowMain}>
          <Text style={styles.title}>Support Center</Text>
          <Text style={styles.meta}>How can we help you today?</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.supportContent}>
        <SupportCenterCard
          icon="chatbubble-ellipses-outline"
          title="Chat Support"
          copy="Chat with Darji support representatives"
          badgeIcon="ellipse"
          badgeText="We usually reply within a few minutes"
          badgeTone="green"
          styles={styles}
          onPress={() => setScreen("chat")}
        />
        <SupportCenterCard
          icon="call-outline"
          title="Call Support"
          copy="Talk to our support team directly"
          badgeIcon="call-outline"
          badgeText="+91 98765 00000"
          badgeTone="green"
          styles={styles}
          onPress={() => Linking.openURL("tel:+919876500000").catch(() => undefined)}
        />
        <SupportCenterCard
          icon="shield-checkmark-outline"
          title="Shop & Account Requests"
          copy="Update shop name, bank details, address and more"
          badgeIcon="time-outline"
          badgeText="We'll review and get back to you within 24-48 hours"
          badgeTone="orange"
          styles={styles}
          onPress={() => setScreen("requests")}
        />
      </ScrollView>
    </View>
  );
}

function SupportCenterCard({ icon, title, copy, badgeIcon, badgeText, badgeTone, styles, onPress }: { icon: IconName; title: string; copy: string; badgeIcon: IconName; badgeText: string; badgeTone: "green" | "orange"; styles: ReturnType<typeof createStyles>; onPress: () => void }) {
  const tone = badgeTone === "green" ? SUCCESS : BRAND_ORANGE;
  return (
    <Pressable style={styles.supportCard} onPress={onPress}>
      <View style={styles.supportCardIcon}>
        <Ionicons name={icon} size={22} color={BRAND_ORANGE} />
      </View>
      <View style={styles.supportCardBody}>
        <Text style={styles.supportCardTitle}>{title}</Text>
        <Text style={styles.supportCardCopy}>{copy}</Text>
        <View style={styles.supportBadge}>
          <Ionicons name={badgeIcon} size={badgeIcon === "ellipse" ? 8 : 13} color={tone} />
          <Text style={styles.supportBadgeText}>{badgeText}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={MUTED} />
    </Pressable>
  );
}

function TailorAccountRequestsScreen({ setScreen, palette, styles, token, showDialog }: { setScreen: (screen: SupportScreen | undefined) => void; palette: any; styles: any; token?: string; showDialog: (dialog: DialogState) => void }) {
  const maxDocuments = 5;
  const [type, setType] = useState<"ShopName" | "BankAccount" | "UPI" | "Address" | "ContactNumber">("ShopName");
  
  const [shopNameField, setShopNameField] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [addressField, setAddressField] = useState("");
  const [phoneField, setPhoneField] = useState("");

  const [documents, setDocuments] = useState<string[]>([]);
  const [uploadingSource, setUploadingSource] = useState<"camera" | "gallery" | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function uploadDocumentAssets(assets: ImagePicker.ImagePickerAsset[], source: "camera" | "gallery") {
    if (!token) {
      showDialog({ title: "Sign in required", message: "Please sign in again before uploading supporting photos.", icon: "log-in-outline" });
      return;
    }
    const remaining = maxDocuments - documents.length;
    if (remaining <= 0) {
      showDialog({ title: "Photo limit reached", message: `You can attach up to ${maxDocuments} supporting photos.`, icon: "images-outline" });
      return;
    }
    try {
      setUploadingSource(source);
      const files = assets.slice(0, remaining).map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `supporting-photo-${documents.length + index + 1}.jpg`
      }));
      const uploaded = await uploadTailorVerificationMedia(files, token);
      if (uploaded.length) {
        setDocuments((current) => [...current, ...uploaded.map((item) => item.url)].slice(0, maxDocuments));
      }
    } catch (error) {
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not upload the supporting photo.", icon: "alert-circle-outline" });
    } finally {
      setUploadingSource(undefined);
    }
  }

  async function pickDocumentImage() {
    if (documents.length >= maxDocuments) {
      showDialog({ title: "Photo limit reached", message: `You can attach up to ${maxDocuments} supporting photos.`, icon: "images-outline" });
      return;
    }
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
    await uploadDocumentAssets(result.assets, "camera");
  }

  async function pickDocumentsFromGallery() {
    const remaining = maxDocuments - documents.length;
    if (remaining <= 0) {
      showDialog({ title: "Photo limit reached", message: `You can attach up to ${maxDocuments} supporting photos.`, icon: "images-outline" });
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery permission needed", "Allow gallery access to select supporting photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining
    });
    if (result.canceled || !result.assets.length) return;
    await uploadDocumentAssets(result.assets, "gallery");
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

      Alert.alert("Request Submitted", "Your change request has been submitted for verification.");
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
          <Text style={styles.meta}>Submit changes for approval</Text>
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
            <Text style={{ color: palette.text, fontSize: 13, fontWeight: "900", marginBottom: 4 }}>Supporting Documents / Photo Reference</Text>
            <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "700", marginBottom: 10 }}>Take a photo or select up to {maxDocuments} photos from your gallery.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <Pressable
                style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", backgroundColor: palette.surface, opacity: uploadingSource ? 0.6 : 1 }}
                onPress={pickDocumentImage}
                disabled={Boolean(uploadingSource)}
              >
                {uploadingSource === "camera" ? (
                  <ActivityIndicator color={BRAND_ORANGE} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={20} color={BRAND_ORANGE} />
                    <Text style={{ color: BRAND_ORANGE, fontSize: 10, fontWeight: "800", marginTop: 4 }}>Camera</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", backgroundColor: palette.surface, opacity: uploadingSource ? 0.6 : 1 }}
                onPress={pickDocumentsFromGallery}
                disabled={Boolean(uploadingSource)}
              >
                {uploadingSource === "gallery" ? (
                  <ActivityIndicator color={BRAND_ORANGE} />
                ) : (
                  <>
                    <Ionicons name="images-outline" size={20} color={BRAND_ORANGE} />
                    <Text style={{ color: BRAND_ORANGE, fontSize: 10, fontWeight: "800", marginTop: 4 }}>Gallery</Text>
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
            style={[{ backgroundColor: BRAND_ORANGE, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 }, submitting || uploadingSource ? { opacity: 0.6 } : null]}
            disabled={submitting || Boolean(uploadingSource)}
            onPress={handleSubmitRequest}
          >
            {submitting ? <ActivityIndicator color="#111111" /> : <Text style={{ color: "#111111", fontSize: 14, fontWeight: "900" }}>Submit Request</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const tailorFaqs: Array<{ title: string; preview: string; answer: string; icon: IconName; points: string[]; supportAction?: boolean }> = [
  {
    title: "How do I receive new orders?",
    preview: "New customer requests will appear in the Requests tab.",
    answer: "Customer requests appear in the Requests tab when a customer asks for stitching, alteration, or tailoring work in your service area.",
    icon: "clipboard-outline",
    points: ["You will get an in-app alert when request notifications are enabled.", "Open the request to check clothing type, urgency, pickup details, and customer notes.", "Send a price only when you can complete the work on time."]
  },
  {
    title: "When does an order move to Orders?",
    preview: "Once the customer accepts your price, the order will move to the Orders tab.",
    answer: "A request becomes an assigned order only after the customer accepts your price. After that, it moves from Requests to Orders.",
    icon: "chatbox-ellipses-outline",
    points: ["Accepted orders appear under the Accepted tab first.", "Use Ready to Deliver only when stitching is finished and required photos are uploaded.", "Past and cancelled work can be checked from History and Cancelled."]
  },
  {
    title: "When can I mark work as Ready?",
    preview: "You can mark the work as Ready only after stitching is complete and proof photos are uploaded.",
    answer: "Mark an order as Ready when the garment is complete, checked, packed, and ready for pickup or delivery.",
    icon: "shirt-outline",
    points: ["Upload clear proof photos before changing the status.", "Do not mark partial or unfinished work as Ready.", "The delivery partner and customer may be notified after the status changes."]
  },
  {
    title: "How and when do I get paid?",
    preview: "Payments are transferred to your wallet after the customer confirms the order completion.",
    answer: "Your earnings are tracked in the Earnings screen. Eligible completed work is added to your wallet and paid out according to Darji payout rules.",
    icon: "wallet-outline",
    points: ["Pending amount means money expected from completed or reviewed work.", "Last payment shows your most recent payout status.", "For payout issues, open Support Center with the order or transaction details."]
  },
  {
    title: "Can I edit my shop details?",
    preview: "Yes, you can request changes to your shop details from the Shop Details section.",
    answer: "Verified shop details are protected, so changes are sent for review instead of changing instantly.",
    icon: "create-outline",
    points: ["Open Profile, then Shop Details.", "Write what should change, such as address, category, capacity, or shop name.", "Darji support will review the request and update approved details."]
  },
  {
    title: "Who can I contact for help?",
    preview: "You can reach us anytime through the Support Center.",
    answer: "Use Support Center when you need help with orders, account changes, payouts, bugs, or general app questions.",
    icon: "headset-outline",
    points: ["Use Chat Support for app or order help.", "Use Report a Bug when something is not working.", "Use Shop & Account Requests for profile, bank, and shop changes."],
    supportAction: true
  }
];

const supportDetails: Record<Exclude<SupportScreen, "support_center" | "requests" | "reviews">, { title: string; subtitle: string; icon: IconName; copy: string; points: string[]; action?: { label: string; url?: string } }> = {
  faqs: {
    title: "FAQs",
    subtitle: "Common tailor questions",
    icon: "help-buoy-outline",
    copy: "Quick answers for daily app use.",
    points: ["New customer requests appear in Requests.", "Accepted prices appear in Orders.", "Mark work as Ready only after stitching and proof photos are uploaded."]
  },
  chat: {
    title: "Chat Support",
    subtitle: "Contact Darji support",
    icon: "chatbubble-outline",
    copy: "Use this when an order, payment, or customer request needs help from Darji support.",
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
    subtitle: "Write to Darji",
    icon: "mail-outline",
    copy: "Send a detailed message to the Darji operations team.",
    points: ["Mention your registered mobile number.", "Add screenshots if needed.", "Expected reply time is 24-48 hours."],
    action: { label: "Open Email", url: "mailto:support@darzi.local?subject=Tailor%20Support" }
  },
  complaint: {
    title: "Raise Complaint",
    subtitle: "Report order problems",
    icon: "alert-circle-outline",
    copy: "Use complaints for delivery, proof photo, payment, or stitching dispute issues.",
    points: ["Select the correct order before raising a complaint.", "Upload proof photos where possible.", "Darji team will check request history and media."]
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
    copy: "Darji uses tailor profile, order, and proof photo data only to run the service and resolve order issues.",
    points: ["Customer personal details are hidden unless required for delivery.", "Proof photos are linked to orders for dispute checks.", "Do not save or share customer data outside Darji."]
  },
  terms: {
    title: "Terms of Use",
    subtitle: "Tailor partner terms",
    icon: "reader-outline",
    copy: "These terms explain expected app use and order handling.",
    points: ["Accept only work you can complete on time.", "Upload honest proof photos.", "Keep all customer communication inside Darji channels."]
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
    subtitle: "Darji Tailor App",
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
      "Accept orders and provide prices digitally.",
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
    bugReportContent: { paddingTop: STATUS_BAR_INSET + 10, paddingBottom: 40 },
    headerCard: { borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16, shadowColor: "#0b2241", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
    avatar: { width: 76, height: 76, borderRadius: 24, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
    avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
    avatarLockBadge: { position: "absolute", right: -3, bottom: -3, width: 24, height: 24, borderRadius: 12, backgroundColor: "#7b8492", borderWidth: 3, borderColor: palette.surface, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#111111", fontSize: 21, fontWeight: "900" },
    avatarPickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    avatarOption: { width: "30%", minWidth: 96, borderRadius: 18, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, alignItems: "center", padding: 10 },
    avatarOptionSelected: { borderColor: BRAND_ORANGE, backgroundColor: palette.surfaceAlt },
    avatarOptionDisabled: { opacity: 0.45 },
    avatarOptionImage: { width: 64, height: 64, borderRadius: 20 },
    avatarOptionLabel: { color: palette.text, fontSize: 11, fontWeight: "900", textAlign: "center", marginTop: 8 },
    cameraBadge: { position: "absolute", right: -3, bottom: -3, width: 28, height: 28, borderRadius: 14, backgroundColor: BRAND_ORANGE, borderWidth: 2, borderColor: palette.surface, alignItems: "center", justifyContent: "center" },
    headerMain: { flex: 1, minWidth: 0 },
    title: { color: palette.text, fontSize: 20, fontWeight: "900" },
    meta: { color: palette.muted, fontSize: 12, fontWeight: "700", marginTop: 4 },
    profileMetaRow: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 7 },
    profileMetaText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: "800", lineHeight: 16 },
    completedPill: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
    completedText: { color: SUCCESS, fontSize: 12, fontWeight: "900" },
    editButton: { minHeight: 38, borderRadius: 14, backgroundColor: BRAND_ORANGE, justifyContent: "center", paddingHorizontal: 13 },
    editButtonText: { color: "#111111", fontSize: 12, fontWeight: "900" },
    section: { borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#0b2241", shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 },
    sectionIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
    sectionTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    sectionHint: { color: palette.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
    sampleHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
    sampleUploadButton: { minHeight: 38, borderRadius: 14, backgroundColor: BRAND_ORANGE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 13 },
    sampleUploadButtonWide: { minHeight: 48, borderRadius: 16, backgroundColor: BRAND_ORANGE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, marginTop: 14 },
    sampleUploadButtonText: { color: "#111111", fontSize: 12, fontWeight: "900" },
    sampleGalleryRow: { gap: 10, paddingTop: 10, paddingBottom: 4 },
    sampleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 14, paddingBottom: 12 },
    sampleGalleryCard: { width: 116, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceAlt, overflow: "hidden" },
    sampleGalleryImage: { width: "100%", height: 126, backgroundColor: palette.border },
    sampleStatusPill: { position: "absolute", left: 7, top: 7, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 7, paddingVertical: 3 },
    sampleStatusText: { color: BRAND_DEEP, fontSize: 9, fontWeight: "900" },
    sampleDeleteButton: { position: "absolute", right: 7, top: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
    sampleGalleryName: { color: palette.muted, fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 8 },
    disabledButton: { opacity: 0.55 },
    emptyMiniCard: { minHeight: 58, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: palette.border, backgroundColor: palette.surfaceAlt, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
    emptyMiniText: { color: palette.muted, fontSize: 12, fontWeight: "800" },
    faqSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
    faqHeroRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 18, marginBottom: 2 },
    faqRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 13, borderTopWidth: 1, borderTopColor: palette.border, paddingVertical: 12 },
    faqFirstRow: { borderTopColor: "#eef2f7" },
    faqIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
    faqTitle: { color: palette.text, fontSize: 13, fontWeight: "900", lineHeight: 18 },
    faqPreview: { color: palette.muted, fontSize: 11, fontWeight: "700", lineHeight: 17, marginTop: 5 },
    inputBlock: { marginTop: 10 },
    requestCard: { borderRadius: 18, borderWidth: 1, borderColor: "#f8c978", backgroundColor: palette.surface, padding: 16, marginTop: 14, marginBottom: 16, shadowColor: "#0b2241", shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
    requestHero: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    requestIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
    requestTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    requestSubtitle: { color: BRAND_ORANGE, fontSize: 10, fontWeight: "900", marginTop: 3 },
    requestCopy: { color: palette.muted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginBottom: 3 },
    requestInput: { minHeight: 112, textAlignVertical: "top", paddingTop: 14, backgroundColor: "#fffaf0", borderColor: "#f4dfbc" },
    inputLabel: { color: palette.muted, fontSize: 11, fontWeight: "900", marginBottom: 7 },
    inputHint: { color: palette.muted, fontSize: 10, fontWeight: "700", marginTop: -3, marginBottom: 8 },
    input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text, paddingHorizontal: 13, fontSize: 14, fontWeight: "700" },
    iconInputWrap: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceAlt, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13 },
    iconInput: { flex: 1, color: palette.text, fontSize: 14, fontWeight: "700", paddingVertical: 0 },
    inlineInputs: { flexDirection: "row", gap: 10 },
    inlineInput: { flex: 1, minWidth: 0 },
    primaryButton: { minHeight: 50, borderRadius: 12, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 14 },
    primaryButtonText: { color: "#111111", fontSize: 14, fontWeight: "900" },
    bugSubmitButton: { width: "100%", height: 54, marginTop: 18, borderRadius: 14, overflow: "hidden", backgroundColor: BRAND_ORANGE },
    bugSubmitButtonDisabled: { opacity: 0.72 },
    bugSubmitButtonTouchTarget: { width: "100%", height: "100%", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
    bugSubmitButtonText: { marginLeft: 9, color: "#111111", fontSize: 14, lineHeight: 20, fontWeight: "900", textAlign: "center" },
    row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: palette.border },
    disabledRow: { opacity: 0.58 },
    rowMain: { flex: 1, minWidth: 0 },
    rowTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    rowCopy: { color: palette.muted, fontSize: 12, fontWeight: "700", marginTop: 4, lineHeight: 17 },
    dangerText: { color: DANGER },
    metricValue: { color: BRAND_ORANGE, fontSize: 16, fontWeight: "900" },
    reviewSummary: { minHeight: 70, borderRadius: 16, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", gap: 14, padding: 13, marginTop: 6, marginBottom: 10 },
    rating: { color: BRAND_ORANGE, fontSize: 32, fontWeight: "900" },
    reviewOverview: { minHeight: 92, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18, marginBottom: 14 },
    reviewAverage: { color: palette.text, fontSize: 36, lineHeight: 42, fontWeight: "900" },
    reviewOverviewCopy: { flex: 1, gap: 6 },
    reviewStarsRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    reviewsEmpty: { minHeight: 180, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: palette.border, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center", gap: 8, padding: 20 },
    anonymousReview: { borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, padding: 15, marginBottom: 10 },
    anonymousReviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    reviewDate: { color: palette.muted, fontSize: 10, lineHeight: 14, fontWeight: "800" },
    reviewComment: { color: palette.text, fontSize: 14, lineHeight: 21, fontWeight: "700", marginTop: 12 },
    reviewPrivacy: { color: palette.muted, fontSize: 10, lineHeight: 14, fontWeight: "800", marginTop: 12 },
    aboutHero: { alignItems: "center", borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 20, paddingVertical: 24, marginBottom: 14 },
    aboutLogo: { width: 84, height: 84, borderRadius: 18 },
    aboutTagline: { maxWidth: 300, color: palette.text, fontSize: 21, lineHeight: 27, fontWeight: "900", textAlign: "center", marginTop: 14 },
    aboutHeroCopy: { maxWidth: 330, color: palette.muted, fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center", marginTop: 10 },
    aboutSectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    aboutSectionTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: "900", marginBottom: 12 },
    aboutJourney: { gap: 2 },
    aboutJourneyRow: { minHeight: 74, flexDirection: "row", alignItems: "flex-start", gap: 12, borderTopWidth: 1, borderTopColor: palette.border, paddingVertical: 12 },
    aboutJourneyIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
    aboutPromiseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    aboutPromiseItem: { minWidth: 128, flexBasis: "46%", flexGrow: 1, minHeight: 72, borderRadius: 14, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center", gap: 7, padding: 10 },
    aboutPromiseText: { color: palette.text, fontSize: 11, lineHeight: 15, fontWeight: "900", textAlign: "center" },
    smallIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
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
    supportHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, marginBottom: 22 },
    supportContent: { gap: 16, paddingHorizontal: 18, paddingBottom: 34 },
    supportCard: { minHeight: 116, borderRadius: 18, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, flexDirection: "row", alignItems: "center", gap: 14, padding: 18, shadowColor: "#0b2241", shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
    supportCardIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
    supportCardBody: { flex: 1, minWidth: 0 },
    supportCardTitle: { color: palette.text, fontSize: 17, fontWeight: "900", lineHeight: 22 },
    supportCardCopy: { color: palette.muted, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 3 },
    supportBadge: { alignSelf: "flex-start", minHeight: 26, borderRadius: 8, backgroundColor: "#fff7e8", flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, marginTop: 14 },
    supportBadgeText: { color: palette.muted, fontSize: 10, fontWeight: "900" },
    chatScreen: { flex: 1 },
    chatHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: 18, paddingBottom: 14, marginBottom: 2 },
    chatTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: "900" },
    chatSubtitle: { color: palette.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
    chatCloseButton: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 12, minHeight: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    chatCloseText: { color: "#dc2626", fontSize: 11, fontWeight: "900" },
    chatMessages: { flex: 1, paddingHorizontal: 18 },
    chatMessagesContent: { flexGrow: 1, gap: 12, paddingTop: 18, paddingBottom: 16 },
    chatNotice: { alignSelf: "stretch", borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: "#eef2f7", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, marginTop: 6 },
    chatNoticeIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
    chatNoticeText: { flex: 1, color: palette.muted, fontSize: 12, lineHeight: 17, fontWeight: "800" },
    chatComposerWrap: { borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.bg, paddingHorizontal: 14, paddingTop: 10, paddingBottom: CHAT_BOTTOM_INSET },
    chatAttachmentPreviewRow: { flexDirection: "row", gap: 8, paddingBottom: 10 },
    chatComposer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    chatMediaButton: { width: 46, minHeight: 48, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center", paddingVertical: 5 },
    chatMediaText: { color: palette.muted, fontSize: 9, fontWeight: "900", marginTop: 3 },
    chatInput: { flex: 1, minHeight: 48, maxHeight: 104, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 24, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 10, color: palette.text, fontSize: 13, fontWeight: "700" },
    chatSendButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
    chatClosedWrap: { borderTopWidth: 1, borderTopColor: palette.border, paddingHorizontal: 18, paddingTop: 14, paddingBottom: CHAT_BOTTOM_INSET, gap: 10 },
    bugTextArea: { minHeight: 120, textAlignVertical: "top", paddingTop: 13, paddingBottom: 28, backgroundColor: palette.surface, borderColor: "#dfe6ef" },
    bugCounter: { position: "absolute", right: 12, bottom: 10, color: palette.muted, fontSize: 10, fontWeight: "800" },
    bugUploadBox: { minHeight: 58, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: palette.surface },
    bugScreenshotPreview: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    bugScreenshotImage: { width: "100%", height: 190, backgroundColor: palette.surfaceAlt },
    bugScreenshotRemove: { position: "absolute", top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(185,28,28,0.92)", alignItems: "center", justifyContent: "center" },
    bugScreenshotReplace: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: palette.surface },
    bugScreenshotReplaceText: { color: BRAND_ORANGE, fontSize: 12, lineHeight: 16, fontWeight: "900" },
    bugDeviceCard: { borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 14, paddingVertical: 6, marginTop: 14, shadowColor: "#0b2241", shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
    dangerModalBackdrop: { flex: 1, backgroundColor: "rgba(7,13,24,0.52)", justifyContent: "center", alignItems: "center", padding: 24 },
    dangerModalCard: { width: "100%", maxWidth: 330, backgroundColor: "#ffffff", borderRadius: 18, padding: 22, shadowColor: "#0b2241", shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
    dangerModalHeader: { alignItems: "center", marginBottom: 16 },
    dangerModalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff1f2", alignItems: "center", justifyContent: "center", marginBottom: 14 },
    dangerModalTitle: { color: BRAND_DEEP, fontSize: 18, lineHeight: 23, fontWeight: "900", textAlign: "center", marginBottom: 8 },
    dangerModalCopy: { color: "#64748b", fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center" },
    dangerModalNotice: { backgroundColor: "#fee2e2", borderRadius: 10, padding: 11, flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 14 },
    dangerModalNoticeText: { color: "#991b1b", flex: 1, fontSize: 11, fontWeight: "800", lineHeight: 16 },
    dangerModalPrimary: { minHeight: 44, backgroundColor: "#ef4444", borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    dangerModalPrimaryText: { color: "#ffffff", fontWeight: "900", fontSize: 13 },
    dangerModalSecondary: { minHeight: 42, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#dbe1e9", alignItems: "center", justifyContent: "center" },
    dangerModalSecondaryFilled: { backgroundColor: "#f1f5f9", borderWidth: 0 },
    dangerModalSecondaryText: { color: BRAND_DEEP, fontWeight: "800", fontSize: 13 },
    logoutButton: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    logoutText: { color: palette.text, fontSize: 15, fontWeight: "900" },
    deleteButton: { minHeight: 52, borderRadius: 16, backgroundColor: DANGER, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 },
    deleteText: { color: "#ffffff", fontSize: 15, fontWeight: "900" }
  });
}
