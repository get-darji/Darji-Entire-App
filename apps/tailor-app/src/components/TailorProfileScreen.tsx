import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, StatusBar, Switch, Text, TextInput, View, Alert, Modal } from "react-native";
import { api, uploadTailorAvatar } from "../api";
import { useAppStore } from "../store";

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
type SupportScreen = "faqs" | "chat" | "call" | "email" | "complaint" | "bug" | "feature" | "privacy" | "terms" | "cancellation" | "version" | "about";

type Props = {
  me?: MeResponse;
  token?: string;
  orders: Order[];
  refresh: () => void;
  showDialog: (dialog: DialogState) => void;
  onSessionExpired: () => void;
  onOpenTransactions: () => void;
  onOpenOrders?: () => void;
};

function isSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /authentication required|invalid session|invalid or expired token|session expired/i.test(message);
}

export function TailorProfileScreen({ me, token, orders, refresh, showDialog, onSessionExpired, onOpenTransactions, onOpenOrders }: Props) {
  const { signOut } = useAppStore();
  const profile = me?.tailorProfile;
  const settingsFromServer = profile?.settings ?? {};
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
          {me?.avatarUrl ? <Image source={{ uri: me.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(name || shopName || "DT").slice(0, 2).toUpperCase()}</Text>}
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

      <Section title="Account" icon="person-outline" styles={styles}>
        <InfoRow icon="create-outline" title="Edit Profile" value="Update name, shop details, and hours" styles={styles} onPress={() => setEditing(true)} noBorder />
        <InfoRow icon="storefront-outline" title="Shop Details" value={`${shopName} (Open: ${workingFrom} - ${workingTo})`} styles={styles} onPress={() => setShowShopDetails(true)} />
        <InfoRow icon="card-outline" title="Bank Account Details" value="Configure payment payouts" styles={styles} onPress={() => setShowBankDetails(true)} />
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

      <Section title="Performance" icon="bar-chart-outline" styles={styles}>
        <InfoRow icon="wallet-outline" title="Earnings" value="Transaction history & payouts" styles={styles} onPress={onOpenTransactions} noBorder />
        <InfoRow icon="cube-outline" title="Order History" value={`${completedOrders} completed, ${activeOrders} in progress`} styles={styles} onPress={onOpenOrders} />
        <InfoRow icon="star-outline" title="Average Rating & Reviews" value={`${averageRating ? averageRating.toFixed(1) : "0.0"} rating (${ratingCount} reviews)`} styles={styles} onPress={() => showDialog({ title: "Average Rating & Reviews", message: `Your average customer rating is ${averageRating ? averageRating.toFixed(1) : "0.0"} based on ${ratingCount} customer reviews.`, icon: "star-outline" })} />
      </Section>

      <Section title="Preferences" icon="options-outline" styles={styles}>
        <SwitchRow title="New Order Alerts" copy="Show request popups." value={notifications.newOrderAlerts} onValueChange={(value) => setNotifications((s) => ({ ...s, newOrderAlerts: value }))} styles={styles} noBorder />
        <SwitchRow title="Sound Notifications" copy="Play sound for important alerts." value={notifications.sound} onValueChange={(value) => setNotifications((s) => ({ ...s, sound: value }))} styles={styles} />
        <SwitchRow title="Vibration" copy="Vibrate on urgent alerts." value={notifications.vibration} onValueChange={(value) => setNotifications((s) => ({ ...s, vibration: value }))} styles={styles} />
      </Section>

      <Section title="Support" icon="help-circle-outline" styles={styles}>
        <InfoRow icon="help-buoy-outline" title="Help Center" value="Faqs and app guides" styles={styles} onPress={() => setSupportScreen("faqs")} noBorder />
        <InfoRow icon="chatbubble-outline" title="Contact Support" value="Chat or email the support team" styles={styles} onPress={() => setSupportScreen("chat")} />
      </Section>

      <Section title="Policies & Information" icon="document-text-outline" styles={styles}>
        <InfoRow icon="information-circle-outline" title="About Darji" value="Learn about Darji Tailor Partner app" styles={styles} onPress={() => setSupportScreen("about")} noBorder />
        <InfoRow icon="shield-checkmark-outline" title="Privacy Policy" value="How your personal data is handled" styles={styles} onPress={() => setSupportScreen("privacy")} />
        <InfoRow icon="reader-outline" title="Terms of Use" value="Terms of service agreements" styles={styles} onPress={() => setSupportScreen("terms")} />
      </Section>

      <Section title="App" icon="phone-portrait-outline" styles={styles}>
        <View style={[styles.row, { borderTopWidth: 0 }]}>
          <View style={styles.smallIcon}><Ionicons name="phone-portrait-outline" size={16} color={BRAND_ORANGE} /></View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>App Version</Text>
            <Text style={styles.rowCopy}>0.1.0 (Development)</Text>
          </View>
        </View>
      </Section>

      <Section title="Account Settings" icon="settings-outline" styles={styles}>
        <InfoRow icon="trash-outline" title="Delete Account" value="Permanently remove your account" styles={styles} danger onPress={() => showDialog({ title: "Delete account", message: "Account deletion request has been submitted to the admin team.", icon: "trash-outline" })} noBorder />
        <InfoRow icon="log-out-outline" title="Logout" value="Sign out of your account" styles={styles} onPress={signOut} />
      </Section>
    </ScrollView>
    <Modal visible={Boolean(supportScreen)} onRequestClose={() => setSupportScreen(undefined)} animationType="slide">
      {supportScreen ? (
        <SupportDetailScreen screen={supportScreen} styles={styles} palette={palette} onBack={() => setSupportScreen(undefined)} showDialog={showDialog} />
      ) : null}
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

function SwitchRow({ title, copy, value, onValueChange, styles, danger, disabled, noBorder }: { title: string; copy: string; value: boolean; onValueChange: (value: boolean) => void; styles: ReturnType<typeof createStyles>; danger?: boolean; disabled?: boolean; noBorder?: boolean }) {
  return (
    <View style={[styles.row, disabled && styles.disabledRow, noBorder && { borderTopWidth: 0 }]}>
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
    <Pressable style={[styles.row, noBorder && { borderTopWidth: 0 }]} onPress={onPress} disabled={!onPress}>
      <View style={styles.smallIcon}><Ionicons name={icon} size={16} color={danger ? DANGER : BRAND_ORANGE} /></View>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, danger && { color: DANGER }]}>{title}</Text>
        <Text style={styles.rowCopy}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? DANGER : MUTED} />
    </Pressable>
  );
}

function SupportDetailScreen({ screen, styles, palette, onBack, showDialog }: { screen: SupportScreen; styles: ReturnType<typeof createStyles>; palette: any; onBack: () => void; showDialog: (dialog: DialogState) => void }) {
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

const supportDetails: Record<SupportScreen, { title: string; subtitle: string; icon: IconName; copy: string; points: string[]; action?: { label: string; url?: string } }> = {
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
