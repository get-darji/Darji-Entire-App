import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { api, uploadDeliveryAvatar } from "../api";
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
  vehicleNumber?: string;
  isAvailable?: boolean;
  rating?: number;
  dailyEarnings?: number;
  weeklyEarnings?: number;
  monthlyEarnings?: number;
  workingHours?: string;
  settings?: DeliverySettings;
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
type SupportScreen = "help" | "chat" | "call" | "email" | "faq" | "privacy" | "terms" | "safety" | "version" | "about";

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
};

function isSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /authentication required|invalid session|invalid or expired token|session expired/i.test(message);
}

export function DeliveryProfileScreen({ me, token, activeJobs, completedJobs, refresh, onSessionExpired, onSignOut, showDialog, onOpenTransactions }: Props) {
  const signOut = useAppStore((state) => state.signOut);
  const profile = me?.deliveryProfile;
  const settings = profile?.settings ?? {};
  const [editing, setEditing] = useState(false);
  const [supportScreen, setSupportScreen] = useState<SupportScreen>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [name, setName] = useState(me?.name ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  const [workingHours, setWorkingHours] = useState(profile?.workingHours ?? "9:00 AM - 8:00 PM");
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

  useEffect(() => {
    setName(me?.name ?? "");
    setEmail(me?.email ?? "");
    setWorkingHours(profile?.workingHours ?? "9:00 AM - 8:00 PM");
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
  }, [me?.name, me?.email, profile?.isAvailable, profile?.vehicleNumber, profile?.workingHours, settings]);

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
            workingHours: workingHours.trim(),
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
      await uploadDeliveryAvatar({ uri: result.assets[0].uri, name: result.assets[0].fileName ?? `delivery-avatar-${Date.now()}.jpg` }, token);
      showDialog({ title: "Photo updated", message: "Your profile photo has been saved.", icon: "person-circle-outline" });
      refresh();
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not upload profile photo.", icon: "alert-circle-outline" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  function logout() {
    signOut();
    onSignOut();
  }

  if (supportScreen) {
    return <SupportDetailScreen screen={supportScreen} styles={styles} onBack={() => setSupportScreen(undefined)} />;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Pressable style={styles.avatar} onPress={pickAvatar} disabled={uploadingAvatar}>
          {me?.avatarUrl ? <Image source={{ uri: me.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(name || "DD").slice(0, 2).toUpperCase()}</Text>}
          <View style={styles.cameraBadge}>{uploadingAvatar ? <ActivityIndicator color="#111111" size="small" /> : <Ionicons name="camera-outline" size={14} color="#111111" />}</View>
        </Pressable>
        <View style={styles.headerMain}>
          <Text style={styles.title}>{name || "Darji Delivery"}</Text>
          <Text style={styles.meta}>+91 {me?.phone ?? "XXXXXXXXXX"}</Text>
          <Text style={styles.meta}>{email || "Email not added"}</Text>
          <Text style={styles.meta}>Role: {profile?.deliveryType || "PICKUP"} ({profile?.assignedArea || "unassigned"})</Text>
          <Text style={styles.completedText}>{completedJobs} completed jobs</Text>
        </View>
      </View>

      <Section title="Account" icon="person-outline" styles={styles}>
        <InfoRow icon="create-outline" title="Edit Profile" value={editing ? "Close Edit Mode" : "Update name, email, and hours"} styles={styles} onPress={() => setEditing((v) => !v)} />
        <InfoRow icon="car-outline" title="Vehicle Details" value={vehicleNumber || "No vehicle details registered"} styles={styles} onPress={() => showDialog({ title: "Vehicle Details", message: vehicleNumber ? `Your registered vehicle number: ${vehicleNumber}` : "Vehicle details not registered. Please contact administration.", icon: "car-outline" })} />
        <InfoRow icon="card-outline" title="Bank Account Details" value="Configure payment payouts" styles={styles} onPress={() => showDialog({ title: "Bank Account Details", message: "Payout bank account configuration is processed during onboarding. Contact admin to update bank details.", icon: "card-outline" })} />
      </Section>

      {editing ? (
        <Section title="Edit Profile Form" icon="create-outline" styles={styles}>
          <Input label="Full Name" value={name} onChangeText={setName} styles={styles} />
          <Input label="Email" value={email} onChangeText={setEmail} styles={styles} />
          <Input label="Working Hours" value={workingHours} onChangeText={setWorkingHours} styles={styles} />
          <Pressable style={styles.primaryButton} onPress={saveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Save Profile</Text>}
          </Pressable>
        </Section>
      ) : null}

      <Section title="Performance" icon="bar-chart-outline" styles={styles}>
        <InfoRow icon="wallet-outline" title="Earnings" value="Transaction history & payouts" styles={styles} onPress={onOpenTransactions} />
        <InfoRow icon="cube-outline" title="Delivery History" value={`${completedJobs} completed deliveries`} styles={styles} onPress={() => showDialog({ title: "Delivery History", message: `You have successfully completed ${completedJobs} deliveries. Thank you for your service!`, icon: "cube-outline" })} />
      </Section>

      <Section title="Preferences" icon="options-outline" styles={styles}>
        <SwitchRow title="Go Online" copy={savingAvailability ? "Updating..." : "Receive pickup and delivery requests."} value={available} onValueChange={updateAvailability} styles={styles} />
        <SwitchRow title="Push Notifications" copy="Heads-up alerts for new jobs." value={preferences.notifications} onValueChange={(value) => setPreferences((current) => ({ ...current, notifications: value }))} styles={styles} />
        <SwitchRow title="Sound Alerts" copy="Play the Darji delivery sounds." value={preferences.sound} onValueChange={(value) => setPreferences((current) => ({ ...current, sound: value }))} styles={styles} />
        <SwitchRow title="Vibration Alerts" copy="Vibrate on urgent tasks." value={preferences.vibration} onValueChange={(value) => setPreferences((current) => ({ ...current, vibration: value }))} styles={styles} />
      </Section>

      <Section title="Support" icon="help-circle-outline" styles={styles}>
        <InfoRow icon="help-buoy-outline" title="Help Center" value="Delivery workflows and details" styles={styles} onPress={() => setSupportScreen("help")} />
        <InfoRow icon="chatbubble-outline" title="Contact Support" value="Get help from our support team" styles={styles} onPress={() => setSupportScreen("chat")} />
      </Section>

      <Section title="Policies & Information" icon="document-text-outline" styles={styles}>
        <InfoRow icon="information-circle-outline" title="About Darji" value="Learn about Darji Delivery Partner network" styles={styles} onPress={() => setSupportScreen("about")} />
        <InfoRow icon="shield-checkmark-outline" title="Privacy Policy" value="How your personal data is handled" styles={styles} onPress={() => setSupportScreen("privacy")} />
        <InfoRow icon="reader-outline" title="Terms of Use" value="Terms of service agreements" styles={styles} onPress={() => setSupportScreen("terms")} />
      </Section>

      <Section title="App" icon="phone-portrait-outline" styles={styles}>
        <View style={styles.row}>
          <View style={styles.smallIcon}><Ionicons name="phone-portrait-outline" size={16} color={BRAND_ORANGE} /></View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>App Version</Text>
            <Text style={styles.rowCopy}>0.1.0 (Development)</Text>
          </View>
        </View>
      </Section>

      <Section title="Account Settings" icon="settings-outline" styles={styles}>
        <InfoRow icon="trash-outline" title="Delete Account" value="Permanently remove your account" styles={styles} danger onPress={() => showDialog({ title: "Delete account", message: "Account deletion request has been submitted to the admin team.", icon: "trash-outline" })} />
        <InfoRow icon="log-out-outline" title="Logout" value="Sign out of your account" styles={styles} onPress={logout} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, icon, styles, children }: { title: string; icon: IconName; styles: ReturnType<typeof createStyles>; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}><Ionicons name={icon} size={18} color={BRAND_ORANGE} /></View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
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

function SwitchRow({ title, copy, value, onValueChange, styles, danger }: { title: string; copy: string; value: boolean; onValueChange: (value: boolean) => void; styles: ReturnType<typeof createStyles>; danger?: boolean }) {
  return (
    <View style={styles.row}>
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

function InfoRow({ icon, title, value, styles, onPress, danger }: { icon: IconName; title: string; value: string; styles: ReturnType<typeof createStyles>; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.smallIcon}><Ionicons name={icon} size={16} color={danger ? DANGER : BRAND_ORANGE} /></View>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, danger && { color: DANGER }]}>{title}</Text>
        <Text style={styles.rowCopy}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? DANGER : MUTED} />
    </Pressable>
  );
}

const supportDetails: Record<SupportScreen, { title: string; subtitle: string; icon: IconName; copy: string; action?: { label: string; run: () => void }; points: string[] }> = {
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

function SupportDetailScreen({ screen, styles, onBack }: { screen: SupportScreen; styles: ReturnType<typeof createStyles>; onBack: () => void }) {
  const detail = supportDetails[screen];
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
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

const lightPalette = {
  background: "#000000",
  card: "#121212",
  cardBorder: "#222222",
  text: "#ffffff",
  subtext: "#94a3b8",
  accentSurface: "#1a1a1a",
  accentBorder: "#222222",
  iconSurface: "#0d0d0d"
};

const darkPalette = {
  background: "#000000",
  card: "#121212",
  cardBorder: "#222222",
  text: "#ffffff",
  subtext: "#94a3b8",
  accentSurface: "#1a1a1a",
  accentBorder: "#222222",
  iconSurface: "#0d0d0d"
};

function createStyles(palette: typeof lightPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.background },
    content: { paddingTop: SCREEN_TOP_PADDING, paddingHorizontal: 18, paddingBottom: 36 },
    headerCard: { borderRadius: 24, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.cardBorder, padding: 18, marginBottom: 14, flexDirection: "row", gap: 14 },
    avatar: { width: 78, height: 78, borderRadius: 26, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImage: { width: "100%", height: "100%" },
    avatarText: { color: "#111111", fontSize: 22, fontWeight: "900" },
    cameraBadge: { position: "absolute", right: 4, bottom: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
    headerMain: { flex: 1, minWidth: 0 },
    title: { color: palette.text, fontSize: 24, fontWeight: "900" },
    meta: { color: palette.subtext, fontSize: 13, fontWeight: "700", marginTop: 4 },
    completedText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", marginTop: 8 },
    editButton: { alignSelf: "flex-start", minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.iconSurface, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    editButtonText: { color: palette.text, fontSize: 12, fontWeight: "900" },
    section: { borderRadius: 22, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.cardBorder, padding: 16, marginBottom: 14 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    sectionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.accentSurface, alignItems: "center", justifyContent: "center" },
    sectionTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    inputBlock: { marginBottom: 12 },
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
    dangerText: { color: DANGER }
  });
}
