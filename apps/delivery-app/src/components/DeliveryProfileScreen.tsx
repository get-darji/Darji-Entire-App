import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState, useRef, useCallback, type ReactNode } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StatusBar, Switch, Text, TextInput, View, Alert, Modal, KeyboardAvoidingView, BackHandler, TouchableOpacity, StyleSheet } from "react-native";
import { api, uploadDeliveryAvatar, uploadDeliveryVerificationDocs } from "../api";
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
type SupportScreen = "help" | "chat" | "call" | "email" | "faq" | "privacy" | "terms" | "safety" | "version" | "about" | "support_center" | "requests";

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
  const profile = me?.deliveryProfile;
  const settings = profile?.settings ?? {};
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
    Alert.alert(
      "Logout Confirmation",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Logout",
          style: "destructive",
          onPress: () => {
            signOut();
            onSignOut();
          }
        }
      ]
    );
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

  return (
    <View style={styles.root}>
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
        <InfoRow icon="create-outline" title="Edit Profile" value="Update name, email, and hours" styles={styles} onPress={() => setEditing(true)} noBorder />
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
                <Text style={styles.meta}>Update name, email and working hours</Text>
              </View>
            </View>
            <View style={styles.section}>
              <Input label="Full Name" value={name} onChangeText={setName} styles={styles} />
              <Input label="Email" value={email} onChangeText={setEmail} styles={styles} />
              <Input label="Working Hours" value={workingHours} onChangeText={setWorkingHours} styles={styles} />
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

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>REQUEST VEHICLE CHANGE</Text>
              </View>
              <Text style={styles.rowCopy}>To change your registered vehicle number or update registration papers, please describe your changes below to submit a request for admin approval.</Text>
              <View style={styles.inputBlock}>
                <TextInput
                  style={styles.input}
                  value={vehicleChangeRequest}
                  onChangeText={setVehicleChangeRequest}
                  placeholder="New vehicle details, registration request..."
                  placeholderTextColor="#9aa6b8"
                  multiline
                />
              </View>
              <Pressable style={styles.primaryButton} onPress={submitVehicleChangeRequest} disabled={submittingVehicleChange}>
                {submittingVehicleChange ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Submit Request</Text>}
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

            <View style={styles.section}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text style={{ color: BRAND_ORANGE, fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>REQUEST BANK DETAILS CHANGE</Text>
              </View>
              <Text style={styles.rowCopy}>Submit your new bank account holder name, account number, and bank IFSC code. Our verification team will validate and apply updates.</Text>
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
        <InfoRow icon="cube-outline" title="Delivery History" value={`${completedJobs} completed deliveries`} styles={styles} onPress={onOpenOrders} />
      </Section>

      <Section title="Preferences" icon="options-outline" styles={styles}>
        <SwitchRow title="Go Online" copy={savingAvailability ? "Updating..." : "Receive pickup and delivery requests."} value={available} onValueChange={updateAvailability} styles={styles} noBorder />
        <SwitchRow title="Push Notifications" copy="Heads-up alerts for new jobs." value={preferences.notifications} onValueChange={(value) => setPreferences((current) => ({ ...current, notifications: value }))} styles={styles} />
        <SwitchRow title="Sound Alerts" copy="Play the Darji delivery sounds." value={preferences.sound} onValueChange={(value) => setPreferences((current) => ({ ...current, sound: value }))} styles={styles} />
        <SwitchRow title="Vibration Alerts" copy="Vibrate on urgent tasks." value={preferences.vibration} onValueChange={(value) => setPreferences((current) => ({ ...current, vibration: value }))} styles={styles} />
      </Section>

      <Section title="Support" icon="help-circle-outline" styles={styles}>
        <InfoRow icon="help-buoy-outline" title="Help Center" value="Delivery workflows and details" styles={styles} onPress={() => setSupportScreen("help")} noBorder />
        <InfoRow icon="chatbubble-outline" title="Support Center" value="Chat, call, or request account updates" styles={styles} onPress={() => setSupportScreen("support_center")} />
      </Section>

      <Section title="Policies & Information" icon="document-text-outline" styles={styles}>
        <InfoRow icon="information-circle-outline" title="About Darji" value="Learn about Darji Delivery Partner network" styles={styles} onPress={() => setSupportScreen("about")} noBorder />
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
        <InfoRow icon="log-out-outline" title="Logout" value="Sign out of your account" styles={styles} onPress={logout} />
      </Section>
    </ScrollView>
    <Modal visible={Boolean(supportScreen)} onRequestClose={() => setSupportScreen(undefined)} animationType="slide">
      {supportScreen === "support_center" ? (
        <DeliverySupportCenterScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} />
      ) : supportScreen === "chat" ? (
        <DeliverySupportChatScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} socket={socket} />
      ) : supportScreen === "requests" ? (
        <DeliveryAccountRequestsScreen setScreen={setSupportScreen} palette={palette} styles={styles} token={token} showDialog={showDialog} />
      ) : supportScreen ? (
        <SupportDetailScreen screen={supportScreen as Exclude<SupportScreen, "support_center" | "requests">} styles={styles} palette={palette} onBack={() => setSupportScreen(undefined)} />
      ) : null}
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

const supportDetails: Record<Exclude<SupportScreen, "support_center" | "requests">, { title: string; subtitle: string; icon: IconName; copy: string; action?: { label: string; run: () => void }; points: string[] }> = {
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

function SupportDetailScreen({ screen, styles, palette, onBack }: { screen: Exclude<SupportScreen, "support_center" | "requests">; styles: ReturnType<typeof createStyles>; palette: any; onBack: () => void }) {
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
    <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 4 : SCREEN_TOP_PADDING }}>
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
              <Pressable 
                style={styles.backButton} 
                onPress={() => Linking.openURL("tel:+919876500000").catch(() => undefined)}
              >
                <Ionicons name="call-outline" size={20} color={BRAND_ORANGE} />
              </Pressable>
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
              <Pressable 
                style={styles.backButton} 
                onPress={() => Linking.openURL("tel:+919876500000").catch(() => undefined)}
              >
                <Ionicons name="call-outline" size={20} color={BRAND_ORANGE} />
              </Pressable>
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
  iconSurface: "#fff4dc"
};

const darkPalette = {
  background: "#050c18",
  card: "#0a1322",
  cardBorder: "#182a44",
  text: "#ffffff",
  subtext: "#8ca2c0",
  accentSurface: "#0d1b30",
  accentBorder: "#182a44",
  iconSurface: "#142033"
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
    section: { borderRadius: 22, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.cardBorder, padding: 16 },
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
