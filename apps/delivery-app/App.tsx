import "./global.css";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import FaceDetection from "@react-native-ml-kit/face-detection";
import { WebView } from "react-native-webview";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Vibration,
  View
} from "react-native";
import { z } from "zod";
import { api, refreshAccessToken, uploadDeliveryMedia, uploadDeliveryVerificationDocs } from "./src/api";
import { DeliveryProfileScreen } from "./src/components/DeliveryProfileScreen";
import { NotificationProvider } from "./src/components/NotificationProvider";
import { useRegisterPushNotifications } from "./src/hooks/useRegisterPushNotifications";
import { configureForegroundNotificationHandler } from "./src/notifications/handlers";
import { createRealtimeSocket, type ConnectionStatus } from "./src/realtime";
import { playAppSound } from "./src/services/soundService";
import { requestOtpSchema, verifyOtpSchema } from "./src/shared";
import { useAppStore } from "./src/store";
import type { NotificationDestination } from "./src/utils/deepLinking";

type AuthStep = "login" | "otp";
type AppStage = "auth" | "loading" | "onboarding" | "pending" | "main";
type OnboardingStep = "personal" | "identity" | "license" | "vehicle" | "bank" | "preferences" | "tutorial" | "review";
type Tab = "home" | "orders" | "earnings" | "notifications" | "profile";
type ActiveOrderScreen = "summary" | "route" | "confirmations";
type DialogState = {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actions?: Array<{ label: string; variant?: "primary" | "secondary"; onPress?: () => void }>;
};
type RequestOtpForm = z.input<typeof requestOtpSchema>;
type VerifyOtpForm = z.input<typeof verifyOtpSchema>;
type MediaDraft = { uri: string; name: string };
type IdentityType = "Aadhaar" | "PAN";

type DeliveryMedia = { url: string; publicId?: string; resourceType: "image" | "video"; bytes?: number; format?: string; originalName?: string };
type DeliveryRequest = {
  id: string;
  orderId: string;
  type: "customer_to_tailor" | "tailor_to_customer";
  taskStatus: "pending" | "accepted" | "picked_up" | "delivered" | "cancelled";
  shift: "morning" | "evening";
  assignedDeliveryPartnerId?: string;
  estimatedDistanceKm?: number;
  estimatedEarnings?: number;
  tailoringRequestId: string;
  leg: "CUSTOMER_TO_TAILOR" | "TAILOR_TO_CUSTOMER";
  status: "OPEN" | "ACCEPTED" | "CANCELLED" | "COMPLETED";
  pickupAddress: string;
  dropAddress: string;
  customerName?: string;
  customerPhone?: string;
  tailorName?: string;
  tailorPhone?: string;
  clothType?: string;
  workType?: string;
  sampleProvided?: boolean;
  sampleMedia?: DeliveryMedia[];
  clothPhotos?: DeliveryMedia[];
  samplePhotos?: DeliveryMedia[];
  pickupOtpVerifiedAt?: string;
  dropOtpVerifiedAt?: string;
  deadlineAt?: string;
  createdAt?: string;
};

type DeliveryTaskPayload = Omit<DeliveryRequest, "tailoringRequestId" | "leg" | "status"> & {
  tailoringRequestId?: string;
  leg?: DeliveryRequest["leg"];
  status?: DeliveryRequest["status"];
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
  settings?: {
    notifications?: boolean;
    soundAlerts?: boolean;
    vibrationAlerts?: boolean;
    darkMode?: boolean;
    instantDeliveries?: boolean;
    radius?: string;
    availability?: string;
  };
  verificationStatus?: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED";
  verificationSubmittedAt?: string;
  verificationRejectionReason?: string;
  verification?: Record<string, unknown>;
  verificationDraft?: Record<string, unknown>;
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

function normalizeDeliveryTask(task: DeliveryTaskPayload): DeliveryRequest {
  const taskStatus = task.taskStatus ?? (task.status === "OPEN" ? "pending" : task.status === "ACCEPTED" ? "accepted" : task.status === "COMPLETED" ? "delivered" : "cancelled");
  const type = task.type ?? (task.leg === "TAILOR_TO_CUSTOMER" ? "tailor_to_customer" : "customer_to_tailor");
  return {
    ...task,
    orderId: task.orderId ?? task.tailoringRequestId ?? "",
    tailoringRequestId: task.orderId ?? task.tailoringRequestId ?? "",
    type,
    leg: type === "customer_to_tailor" ? "CUSTOMER_TO_TAILOR" : "TAILOR_TO_CUSTOMER",
    taskStatus,
    status: taskStatus === "pending" ? "OPEN" : taskStatus === "accepted" || taskStatus === "picked_up" ? "ACCEPTED" : taskStatus === "delivered" ? "COMPLETED" : "CANCELLED",
    shift: task.shift ?? (type === "customer_to_tailor" ? "morning" : "evening")
  };
}

type OnboardingData = {
  fullName: string;
  dob: string;
  gender: string;
  email: string;
  emergencyContact: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  identityType: IdentityType;
  aadhaarNumber: string;
  panNumber: string;
  identityFront?: MediaDraft;
  identityBack?: MediaDraft;
  facePhoto?: MediaDraft;
  ocrStatus: string;
  faceStatus: string;
  licenseNumber: string;
  licenseExpiry: string;
  licenseFront?: MediaDraft;
  licenseBack?: MediaDraft;
  vehicleType: string;
  vehicleNumber: string;
  vehicleModel: string;
  rcPhoto?: MediaDraft;
  insurancePhoto?: MediaDraft;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  upi: string;
  availability: string;
  workingHours: string;
  radius: string;
  instantDeliveries: boolean;
};

const BRAND_ORANGE = "#f6a313";
const BRAND_DEEP = "#0b2241";
const SCREEN_BG = "#f7faff";
const SURFACE = "#ffffff";
const BORDER = "#dde4ee";
const MUTED = "#65748a";
const SUCCESS = "#15803d";
const STATUS_BAR_INSET = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

const onboardingSteps: { key: OnboardingStep; title: string; subtitle: string }[] = [
  { key: "personal", title: "Personal details", subtitle: "Basic identity and emergency contact" },
  { key: "identity", title: "Identity verification", subtitle: "Upload either Aadhaar or PAN" },
  { key: "license", title: "Driving license", subtitle: "License number, expiry, and photos" },
  { key: "vehicle", title: "Vehicle details", subtitle: "Vehicle, RC, and insurance proof" },
  { key: "bank", title: "Bank account", subtitle: "Payout account and UPI" },
  { key: "preferences", title: "Delivery preferences", subtitle: "Availability, hours, and radius" },
  { key: "tutorial", title: "Tutorial", subtitle: "Pickup, photos, packing, COD, delivery" },
  { key: "review", title: "Review", subtitle: "Submit for admin approval" }
];

const defaultOnboarding: OnboardingData = {
  fullName: "",
  dob: "",
  gender: "",
  email: "",
  emergencyContact: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  identityType: "Aadhaar",
  aadhaarNumber: "",
  panNumber: "",
  ocrStatus: "Waiting for document",
  faceStatus: "Waiting for selfie",
  licenseNumber: "",
  licenseExpiry: "",
  vehicleType: "Motorcycle",
  vehicleNumber: "",
  vehicleModel: "",
  accountHolder: "",
  accountNumber: "",
  ifsc: "",
  upi: "",
  availability: "Full time",
  workingHours: "9:00 AM - 8:00 PM",
  radius: "5 km",
  instantDeliveries: true
};

function getDraftMedia(value: unknown): MediaDraft | undefined {
  if (!value || typeof value !== "object") return undefined;
  const maybe = value as { uri?: unknown; name?: unknown };
  if (typeof maybe.uri !== "string" || !maybe.uri) return undefined;
  return { uri: maybe.uri, name: typeof maybe.name === "string" && maybe.name ? maybe.name : "document.jpg" };
}

function onboardingFromProfile(profile?: DeliveryProfile): OnboardingData {
  const verification = (profile?.verification ?? {}) as Record<string, any>;
  const draft = (profile?.verificationDraft ?? {}) as Record<string, any>;
  const personal = draft.personal ?? verification.personal ?? {};
  const identity = draft.identity ?? verification.identity ?? {};
  const license = draft.license ?? verification.license ?? {};
  const vehicle = draft.vehicle ?? verification.vehicle ?? {};
  const bank = draft.bank ?? verification.bank ?? {};
  const preferences = draft.preferences ?? verification.preferences ?? {};

  return {
    fullName: String(personal.fullName ?? draft.fullName ?? ""),
    dob: String(personal.dob ?? draft.dob ?? ""),
    gender: String(personal.gender ?? draft.gender ?? ""),
    email: String(personal.email ?? draft.email ?? ""),
    emergencyContact: String(personal.emergencyContact ?? draft.emergencyContact ?? ""),
    address: String(personal.address ?? draft.address ?? ""),
    city: String(personal.city ?? draft.city ?? ""),
    state: String(personal.state ?? draft.state ?? ""),
    pincode: String(personal.pincode ?? draft.pincode ?? ""),
    identityType: (identity.identityType ?? draft.identityType ?? "Aadhaar") === "PAN" ? "PAN" : "Aadhaar",
    aadhaarNumber: String(identity.aadhaarNumber ?? draft.aadhaarNumber ?? ""),
    panNumber: String(identity.panNumber ?? draft.panNumber ?? ""),
    identityFront: getDraftMedia(draft.identityFront) ?? (typeof identity.identityFrontUrl === "string" ? { uri: identity.identityFrontUrl, name: "identity-front.jpg" } : undefined),
    identityBack: getDraftMedia(draft.identityBack) ?? (typeof identity.identityBackUrl === "string" ? { uri: identity.identityBackUrl, name: "identity-back.jpg" } : undefined),
    facePhoto: getDraftMedia(draft.facePhoto) ?? (typeof identity.facePhotoUrl === "string" ? { uri: identity.facePhotoUrl, name: "selfie.jpg" } : undefined),
    ocrStatus: String(identity.ocrStatus ?? draft.ocrStatus ?? defaultOnboarding.ocrStatus),
    faceStatus: String(identity.faceStatus ?? draft.faceStatus ?? defaultOnboarding.faceStatus),
    licenseNumber: String(license.licenseNumber ?? draft.licenseNumber ?? ""),
    licenseExpiry: String(license.licenseExpiry ?? draft.licenseExpiry ?? ""),
    licenseFront: getDraftMedia(draft.licenseFront) ?? (typeof license.licenseFrontUrl === "string" ? { uri: license.licenseFrontUrl, name: "license-front.jpg" } : undefined),
    licenseBack: getDraftMedia(draft.licenseBack) ?? (typeof license.licenseBackUrl === "string" ? { uri: license.licenseBackUrl, name: "license-back.jpg" } : undefined),
    vehicleType: String(vehicle.vehicleType ?? draft.vehicleType ?? defaultOnboarding.vehicleType),
    vehicleNumber: String(vehicle.vehicleNumber ?? draft.vehicleNumber ?? profile?.vehicleNumber ?? ""),
    vehicleModel: String(vehicle.vehicleModel ?? draft.vehicleModel ?? ""),
    rcPhoto: getDraftMedia(draft.rcPhoto) ?? (typeof vehicle.rcPhotoUrl === "string" ? { uri: vehicle.rcPhotoUrl, name: "rc.jpg" } : undefined),
    insurancePhoto: getDraftMedia(draft.insurancePhoto) ?? (typeof vehicle.insurancePhotoUrl === "string" ? { uri: vehicle.insurancePhotoUrl, name: "insurance.jpg" } : undefined),
    accountHolder: String(bank.accountHolder ?? draft.accountHolder ?? ""),
    accountNumber: String(bank.accountNumber ?? draft.accountNumber ?? ""),
    ifsc: String(bank.ifsc ?? draft.ifsc ?? ""),
    upi: String(bank.upi ?? draft.upi ?? ""),
    availability: String(preferences.availability ?? draft.availability ?? profile?.settings?.availability ?? defaultOnboarding.availability),
    workingHours: String(preferences.workingHours ?? draft.workingHours ?? profile?.workingHours ?? defaultOnboarding.workingHours),
    radius: String(preferences.radius ?? draft.radius ?? profile?.settings?.radius ?? defaultOnboarding.radius),
    instantDeliveries: Boolean(preferences.instantDeliveries ?? draft.instantDeliveries ?? profile?.settings?.instantDeliveries ?? defaultOnboarding.instantDeliveries)
  };
}

const tutorialItems = [
  "Accept jobs before the timer ends.",
  "Customer-to-tailor and tailor-to-customer are separate delivery jobs.",
  "Open route after accepting and complete each job within 12 hours.",
  "Capture package photos before every handoff.",
  "Seal the package and verify the order reference.",
  "Collect COD only when the order requires it."
];

configureForegroundNotificationHandler();

function isSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /authentication required|invalid session|invalid or expired token|session expired/i.test(message);
}

function shortId(id?: string) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : "#REQUEST";
}

function requestTitle(request: DeliveryRequest) {
  return request.leg === "CUSTOMER_TO_TAILOR" ? "Pickup customer, deliver tailor" : "Pickup tailor, deliver customer";
}

function requestEarning(request: DeliveryRequest) {
  return request.estimatedEarnings ?? (request.leg === "CUSTOMER_TO_TAILOR" ? 80 : 90);
}

function deadlineLabel(value?: string) {
  if (!value) return "12 hours after accept";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

async function playDeliveryAlert(title: string, body: string) {
  if (Platform.OS !== "web") Vibration.vibrate([0, 380, 120, 380]);
  await playAppSound("request");
  void title;
  void body;
}

function openDirections(destination: string, origin?: string) {
  const url =
    Platform.OS === "android"
      ? `google.navigation:q=${encodeURIComponent(destination)}`
      : `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ""}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1${origin ? `&origin=${encodeURIComponent(origin)}` : ""}&destination=${encodeURIComponent(destination)}&travelmode=driving`).catch(() => undefined);
  });
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={SCREEN_BG} translucent={false} />
      {children}
    </SafeAreaView>
  );
}

function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable style={styles.roundIcon} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={BRAND_DEEP} />
        </Pressable>
      ) : null}
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const color = status === "Connected" ? SUCCESS : status === "Reconnecting" ? BRAND_ORANGE : "#b91c1c";
  return (
    <View style={styles.connectionBadge}>
      <View style={[styles.connectionDot, { backgroundColor: color }]} />
      <Text style={[styles.connectionText, { color }]}>{status}</Text>
    </View>
  );
}

function buildLeafletHtml(order: DeliveryRequest) {
  const pickup = JSON.stringify(order.pickupAddress);
  const drop = JSON.stringify(order.dropAddress);
  return `
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; background: #0b2241; font-family: Arial, sans-serif; }
  .panel { position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 999; background: #111; color: #fff; border: 1px solid #F98A04; border-radius: 14px; padding: 10px; }
  .title { color: #FEC104; font-weight: 800; font-size: 13px; }
  .meta { font-size: 12px; line-height: 17px; margin-top: 4px; }
</style>
</head>
<body>
<div id="map"></div>
<div class="panel"><div class="title" id="summary">Building route...</div><div class="meta" id="steps">Open Google Maps for live turn-by-turn navigation.</div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const pickupAddress = ${pickup};
const dropAddress = ${drop};
const map = L.map('map', { zoomControl: false }).setView([28.6139, 77.2090], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: 'OpenStreetMap' }).addTo(map);
const orangeIcon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:9px;background:#F98A04;border:3px solid #fff"></div>' });
const yellowIcon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:9px;background:#FEC104;border:3px solid #111"></div>' });
const blueIcon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:9px;background:#2563eb;border:3px solid #fff"></div>' });
let partnerMarker;
async function geocode(q) {
  const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q));
  const data = await res.json();
  if (!data.length) throw new Error('Address not found');
  return [Number(data[0].lat), Number(data[0].lon)];
}
async function route() {
  try {
    const pickup = await geocode(pickupAddress);
    const drop = await geocode(dropAddress);
    L.marker(pickup, { icon: orangeIcon }).addTo(map).bindPopup('Pickup');
    L.marker(drop, { icon: yellowIcon }).addTo(map).bindPopup('Drop');
    const res = await fetch('https://router.project-osrm.org/route/v1/driving/' + pickup[1] + ',' + pickup[0] + ';' + drop[1] + ',' + drop[0] + '?overview=full&geometries=geojson&steps=true');
    const data = await res.json();
    const best = data.routes && data.routes[0];
    if (!best) throw new Error('Route unavailable');
    const coords = best.geometry.coordinates.map(function(c){ return [c[1], c[0]]; });
    L.polyline(coords, { color: '#F98A04', weight: 5 }).addTo(map);
    map.fitBounds(coords, { padding: [24, 24] });
    document.getElementById('summary').innerText = (best.distance / 1000).toFixed(1) + ' km - ' + Math.round(best.duration / 60) + ' min';
    document.getElementById('steps').innerText = best.legs[0].steps.slice(0, 4).map(function(s){ return s.maneuver.instruction || s.name || 'Continue'; }).join(' • ');
  } catch (e) {
    document.getElementById('summary').innerText = 'Route preview unavailable';
    document.getElementById('steps').innerText = 'Use external navigation for exact turn-by-turn route.';
  }
}
document.addEventListener('message', function(event) {
  try {
    const msg = JSON.parse(event.data);
    if (msg.type === 'location' && msg.latitude && msg.longitude) {
      const latlng = [msg.latitude, msg.longitude];
      if (!partnerMarker) partnerMarker = L.marker(latlng, { icon: blueIcon }).addTo(map).bindPopup('You');
      else partnerMarker.setLatLng(latlng);
    }
  } catch {}
});
route();
</script>
</body>
</html>`;
}

function RouteMap({ order, location }: { order: DeliveryRequest; location?: { latitude: number; longitude: number } }) {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!location) return;
    const payload = JSON.stringify({ type: "location", ...location });
    webViewRef.current?.injectJavaScript(`document.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} })); true;`);
  }, [location?.latitude, location?.longitude]);

  return <WebView ref={webViewRef} originWhitelist={["*"]} source={{ html: buildLeafletHtml(order) }} style={styles.routeWebView} />;
}

function Card({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <View style={[styles.card, accent && styles.accentCard]}>{children}</View>;
}

function PrimaryButton({
  label,
  icon,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[styles.button, variant === "secondary" && styles.secondaryButton, variant === "danger" && styles.dangerButton, disabled && styles.disabledButton]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? "#111111" : BRAND_ORANGE} /> : icon ? <Ionicons color={variant === "primary" ? "#111111" : variant === "danger" ? "#b91c1c" : BRAND_DEEP} name={icon} size={18} /> : null}
      {!loading ? <Text style={[styles.buttonText, variant !== "primary" && styles.secondaryButtonText, variant === "danger" && styles.dangerButtonText]}>{label}</Text> : null}
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
  multiline = false
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor="#9aa6b8"
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const fallback = maximumDate ? new Date(1995, 0, 1) : new Date();
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.formLabel}>{label}</Text>
      <Pressable style={styles.inputButton} onPress={() => setOpen(true)}>
        <Text style={[styles.inputButtonText, !value && styles.placeholderText]}>{value || "Select date"}</Text>
        <Ionicons name="calendar-outline" size={18} color={BRAND_ORANGE} />
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value ? new Date(value) : fallback}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(_, date) => {
            if (Platform.OS !== "ios") setOpen(false);
            if (date) onChange(date.toISOString().slice(0, 10));
          }}
        />
      ) : null}
      {open && Platform.OS === "ios" ? (
        <Pressable style={styles.dateDoneButton} onPress={() => setOpen(false)}>
          <Text style={styles.linkText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ChoiceGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.choiceRow}>
      {options.map((option) => (
        <Pressable style={[styles.choiceChip, value === option && styles.choiceChipActive]} key={option} onPress={() => onChange(option)}>
          <Text style={[styles.choiceText, value === option && styles.choiceTextActive]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

function DesignedDialog({ dialog, onClose }: { dialog?: DialogState; onClose: () => void }) {
  if (!dialog) return null;
  const actions = dialog.actions?.length ? dialog.actions : [{ label: "OK", variant: "primary" as const }];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.popupBackdrop}>
        <View style={styles.popupCard}>
          <View style={styles.popupIcon}>
            <Ionicons name={dialog.icon ?? "information-circle-outline"} size={28} color={BRAND_ORANGE} />
          </View>
          <Text style={styles.popupTitle}>{dialog.title}</Text>
          <Text style={styles.popupCopy}>{dialog.message}</Text>
          <View style={styles.popupActions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                style={[styles.popupActionButton, action.variant === "secondary" && styles.popupSecondaryButton]}
                onPress={() => {
                  onClose();
                  action.onPress?.();
                }}
              >
                <Text style={[styles.popupActionText, action.variant === "secondary" && styles.popupSecondaryText]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value, tone = "orange" }: { label: string; value: string; tone?: "orange" | "green" | "blue" }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === "green" && styles.greenText, tone === "blue" && styles.blueText]}>{value}</Text>
    </View>
  );
}

function AuthScreen({ onAuthenticated, showDialog }: { onAuthenticated: () => void; showDialog: (dialog: DialogState) => void }) {
  const [step, setStep] = useState<AuthStep>("login");
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const setSession = useAppStore((state) => state.setSession);
  const requestForm = useForm<RequestOtpForm>({ resolver: zodResolver(requestOtpSchema), defaultValues: { role: "DELIVERY_PARTNER" } });
  const verifyForm = useForm<VerifyOtpForm>({ resolver: zodResolver(verifyOtpSchema), defaultValues: { role: "DELIVERY_PARTNER" } });

  useEffect(() => {
    if (step !== "otp" || timer <= 0) return undefined;
    const id = setInterval(() => setTimer((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  async function requestOtp(values: RequestOtpForm) {
    try {
      setLoading(true);
      const result = await api<{ otp?: string }>("/auth/request-otp", { method: "POST", body: JSON.stringify(values) });
      verifyForm.reset({ phone: values.phone, role: "DELIVERY_PARTNER", otp: result.otp ?? "123456" });
      setTimer(30);
      setStep("otp");
    } catch (error) {
      showDialog({ title: "OTP failed", message: error instanceof Error ? error.message : "Could not send OTP.", icon: "alert-circle-outline" });
    } finally {
      setLoading(false);
    }
  }

  async function verify(values: VerifyOtpForm) {
    try {
      setLoading(true);
      const session = await api<{ accessToken: string; refreshToken: string; user: { id: string; phone: string; role: string; name?: string } }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setSession(session.accessToken, session.user, session.refreshToken);
      onAuthenticated();
    } catch (error) {
      showDialog({ title: "Login failed", message: error instanceof Error ? error.message : "Could not verify login.", icon: "alert-circle-outline" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.authContent}>
        <View style={styles.logoMark}>
          <Ionicons name="bicycle-outline" size={34} color={BRAND_ORANGE} />
        </View>
        <Text style={styles.authTitle}>Darzi Delivery</Text>
        <Text style={styles.authCopy}>Accept pickup jobs, open Google Maps routes, and complete verified handoffs.</Text>
        <Card>
          {step === "login" ? (
            <>
              <Text style={styles.formLabel}>DELIVERY LOGIN</Text>
              <Controller
                control={requestForm.control}
                name="phone"
                render={({ field }) => (
                  <View style={styles.phoneField}>
                    <Text style={styles.phonePrefix}>+91</Text>
                    <View style={styles.phoneDivider} />
                    <TextInput
                      style={styles.phoneInput}
                      keyboardType="phone-pad"
                      maxLength={10}
                      onChangeText={(text) => field.onChange(text.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter mobile number"
                      placeholderTextColor="#9aa6b8"
                      value={field.value}
                    />
                  </View>
                )}
              />
              <PrimaryButton icon="chevron-forward" label="Send OTP" loading={loading} onPress={requestForm.handleSubmit(requestOtp, () => showDialog({ title: "Invalid number", message: "Enter a valid 10 digit mobile number.", icon: "call-outline" }))} />
            </>
          ) : (
            <>
              <Text style={styles.formLabel}>VERIFY OTP</Text>
              <Controller
                control={verifyForm.control}
                name="otp"
                render={({ field }) => (
                  <TextInput
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(text) => field.onChange(text.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor="#9aa6b8"
                    value={field.value}
                  />
                )}
              />
              <PrimaryButton icon="shield-checkmark-outline" label="Verify OTP" loading={loading} onPress={verifyForm.handleSubmit(verify, () => showDialog({ title: "OTP required", message: "Enter the OTP to continue.", icon: "shield-checkmark-outline" }))} />
              <Pressable style={styles.textButton} disabled={timer > 0} onPress={() => requestForm.handleSubmit(requestOtp)()}>
                <Text style={[styles.linkText, timer > 0 && styles.mutedText]}>{timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}</Text>
              </Pressable>
            </>
          )}
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function OnboardingScreen({
  me,
  token,
  onSubmitted,
  onSessionExpired,
  showDialog
}: {
  me?: MeResponse;
  token?: string;
  onSubmitted: () => void;
  onSessionExpired: () => void;
  showDialog: (dialog: DialogState) => void;
}) {
  const profile = me?.deliveryProfile;
  const rejectionReason = profile?.verificationRejectionReason;
  const initialData = useMemo(() => onboardingFromProfile(profile), [profile]);
  const initialStep = Math.min(Math.max(Number((profile?.verificationDraft as { step?: number } | undefined)?.step ?? 1) - 1, 0), onboardingSteps.length - 1);
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [scanning, setScanning] = useState<"ocr" | "face" | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMediaKey, setUploadingMediaKey] = useState<string>();
  const [locatingAddress, setLocatingAddress] = useState(false);
  const step = onboardingSteps[stepIndex];
  const progress = `${stepIndex + 1}/${onboardingSteps.length}`;

  useEffect(() => {
    setData(initialData);
    setStepIndex(initialStep);
  }, [initialData, initialStep]);

  useEffect(() => {
    if (!token) return undefined;
    const id = setTimeout(() => {
      api("/delivery-partners/me/verification-draft", { method: "PATCH", body: JSON.stringify({ step: stepIndex + 1, draft: data }) }, token).catch((error) => {
        if (isSessionError(error)) onSessionExpired();
      });
    }, 600);
    return () => clearTimeout(id);
  }, [data, stepIndex, token, onSessionExpired]);

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  async function runOcr(media: MediaDraft, target: "identity" | "license") {
    try {
      setScanning("ocr");
      update("ocrStatus", "Reading document...");
      const result = await TextRecognition.recognize(media.uri);
      const text = result.text;
      if (target === "identity") {
        const pan = text.match(/[A-Z]{5}[0-9]{4}[A-Z]/)?.[0];
        const aadhaar = text.replace(/\s/g, "").match(/\d{12}/)?.[0];
        const dob = text.match(/\b\d{2}[/-]\d{2}[/-]\d{4}\b/)?.[0]?.replace(/\//g, "-");
        setData((current) => ({
          ...current,
          panNumber: pan ?? current.panNumber,
          aadhaarNumber: aadhaar ?? current.aadhaarNumber,
          dob: current.dob || dob || current.dob,
          ocrStatus: text.trim() ? "Document details captured" : "No readable text found"
        }));
      } else {
        const license = text.match(/[A-Z]{2}\d{2}\s?\d{4,13}/)?.[0]?.replace(/\s/g, "");
        setData((current) => ({ ...current, licenseNumber: license ?? current.licenseNumber, ocrStatus: text.trim() ? "License details captured" : "No readable text found" }));
      }
    } catch (error) {
      update("ocrStatus", error instanceof Error && /rebuilt|linked|managed workflow/i.test(error.message) ? "ML Kit needs native rebuild" : "OCR failed");
    } finally {
      setScanning(undefined);
    }
  }

  async function runFace(media: MediaDraft) {
    try {
      setScanning("face");
      update("faceStatus", "Checking selfie...");
      const faces = await FaceDetection.detect(media.uri, { performanceMode: "accurate", landmarkMode: "all", classificationMode: "all", minFaceSize: 0.15 });
      update("faceStatus", faces.length === 1 ? "1 face detected" : faces.length > 1 ? `${faces.length} faces detected` : "No face detected");
    } catch (error) {
      update("faceStatus", error instanceof Error && /rebuilt|linked|managed workflow/i.test(error.message) ? "ML Kit needs native rebuild" : "Face check failed");
    } finally {
      setScanning(undefined);
    }
  }

  async function uploadMedia(media: MediaDraft, target: keyof OnboardingData) {
    if (!token) return media;
    setUploadingMediaKey(String(target));
    try {
      const [uploaded] = await uploadDeliveryVerificationDocs([media], token);
      if (!uploaded?.url) return media;
      return { uri: uploaded.url, name: uploaded.originalName ?? media.name };
    } catch (error) {
      if (isSessionError(error)) {
        onSessionExpired();
        return media;
      }
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not upload document.", icon: "cloud-upload-outline" });
      return media;
    } finally {
      setUploadingMediaKey(undefined);
    }
  }

  async function pickMedia(target: keyof OnboardingData, source: "gallery" | "camera", scan?: "identity" | "license" | "face") {
    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({
        title: source === "camera" ? "Camera permission needed" : "Gallery permission needed",
        message: source === "camera" ? "Allow camera access to take this photo." : "Allow gallery access to upload this photo.",
        icon: source === "camera" ? "camera-outline" : "images-outline"
      });
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.86 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.86 });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    const media = { uri: asset.uri, name: asset.fileName ?? `delivery-${String(target)}-${Date.now()}.jpg` };
    update(target, media as OnboardingData[typeof target]);
    if (scan === "identity" || scan === "license") void runOcr(media, scan);
    if (scan === "face") void runFace(media);
    const uploaded = await uploadMedia(media, target);
    update(target, uploaded as OnboardingData[typeof target]);
  }

  async function fillCurrentLocation() {
    try {
      setLocatingAddress(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showDialog({
          title: "Location permission needed",
          message: "Allow location access to fill your current address automatically.",
          icon: "location-outline"
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      if (!place) {
        showDialog({
          title: "Address not found",
          message: "We could not read your current address. Enter it manually.",
          icon: "location-outline"
        });
        return;
      }

      const addressParts = [place.name, place.street, place.subregion].filter((value): value is string => Boolean(value && value.trim()));
      setData((current) => ({
        ...current,
        address: addressParts.join(", ") || current.address,
        city: place.city || place.district || current.city,
        state: place.region || current.state,
        pincode: place.postalCode || current.pincode
      }));
    } catch (error) {
      showDialog({
        title: "Location failed",
        message: error instanceof Error ? error.message : "Could not fetch your current location.",
        icon: "alert-circle-outline"
      });
    } finally {
      setLocatingAddress(false);
    }
  }

  function validateCurrentStep() {
    if (step.key === "personal") {
      if (!data.fullName.trim() || !data.dob || !data.gender || !data.emergencyContact.trim() || !data.address.trim() || !data.city.trim() || !data.state.trim() || !data.pincode.trim()) {
        return "Complete all personal details.";
      }
    }
    if (step.key === "identity") {
      if (!data.identityFront || !data.facePhoto) return "Upload your ID and selfie.";
      if (data.identityType === "Aadhaar" && (!data.identityBack || !data.aadhaarNumber.trim())) return "Upload both Aadhaar photos and enter Aadhaar number.";
      if (data.identityType === "PAN" && !data.panNumber.trim()) return "Upload PAN card and enter PAN number.";
    }
    if (step.key === "license") {
      if (!data.licenseFront || !data.licenseBack || !data.licenseNumber.trim() || !data.licenseExpiry) return "Complete driving license details.";
    }
    if (step.key === "vehicle") {
      if (!data.vehicleType || !data.vehicleNumber.trim() || !data.vehicleModel.trim() || !data.rcPhoto || !data.insurancePhoto) return "Complete vehicle details and uploads.";
    }
    if (step.key === "bank") {
      if (!data.accountHolder.trim() || !data.accountNumber.trim() || !data.ifsc.trim()) return "Complete bank details.";
    }
    if (step.key === "preferences") {
      if (!data.availability || !data.workingHours.trim() || !data.radius) return "Complete delivery preferences.";
    }
    return undefined;
  }

  async function ensureUploaded(media?: MediaDraft, label?: string) {
    if (!media) return undefined;
    if (/^https?:\/\//i.test(media.uri)) return media;
    const uploaded = await uploadMedia(media, label ? (label as keyof OnboardingData) : "identityFront");
    return uploaded;
  }

  async function submitVerification() {
    if (!token) return;
    const currentError = validateCurrentStep();
    if (currentError) {
      showDialog({ title: "Step incomplete", message: currentError, icon: "alert-circle-outline" });
      return;
    }

    try {
      setSubmitting(true);
      const identityFront = await ensureUploaded(data.identityFront, "identityFront");
      const identityBack = await ensureUploaded(data.identityBack, "identityBack");
      const facePhoto = await ensureUploaded(data.facePhoto, "facePhoto");
      const licenseFront = await ensureUploaded(data.licenseFront, "licenseFront");
      const licenseBack = await ensureUploaded(data.licenseBack, "licenseBack");
      const rcPhoto = await ensureUploaded(data.rcPhoto, "rcPhoto");
      const insurancePhoto = await ensureUploaded(data.insurancePhoto, "insurancePhoto");

      await api(
        "/delivery-partners/me/verification",
        {
          method: "POST",
          body: JSON.stringify({
            personal: {
              fullName: data.fullName.trim(),
              dob: data.dob,
              gender: data.gender,
              email: data.email.trim(),
              emergencyContact: data.emergencyContact.trim(),
              address: data.address.trim(),
              city: data.city.trim(),
              state: data.state.trim(),
              pincode: data.pincode.trim()
            },
            identity: {
              identityType: data.identityType,
              aadhaarNumber: data.identityType === "Aadhaar" ? data.aadhaarNumber.trim() : "",
              panNumber: data.identityType === "PAN" ? data.panNumber.trim() : "",
              identityFrontUrl: identityFront?.uri,
              identityBackUrl: data.identityType === "Aadhaar" ? identityBack?.uri : undefined,
              facePhotoUrl: facePhoto?.uri,
              ocrStatus: data.ocrStatus,
              faceStatus: data.faceStatus
            },
            license: {
              licenseNumber: data.licenseNumber.trim(),
              licenseExpiry: data.licenseExpiry,
              licenseFrontUrl: licenseFront?.uri,
              licenseBackUrl: licenseBack?.uri
            },
            vehicle: {
              vehicleType: data.vehicleType,
              vehicleNumber: data.vehicleNumber.trim(),
              vehicleModel: data.vehicleModel.trim(),
              rcPhotoUrl: rcPhoto?.uri,
              insurancePhotoUrl: insurancePhoto?.uri
            },
            bank: {
              accountHolder: data.accountHolder.trim(),
              accountNumber: data.accountNumber.trim(),
              ifsc: data.ifsc.trim(),
              upi: data.upi.trim()
            },
            preferences: {
              availability: data.availability,
              workingHours: data.workingHours.trim(),
              radius: data.radius,
              instantDeliveries: data.instantDeliveries
            }
          })
        },
        token
      );
      await onSubmitted();
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Submission failed", message: error instanceof Error ? error.message : "Could not submit verification.", icon: "alert-circle-outline" });
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (stepIndex === onboardingSteps.length - 1) {
      void submitVerification();
      return;
    }
    const error = validateCurrentStep();
    if (error) {
      showDialog({ title: "Step incomplete", message: error, icon: "alert-circle-outline" });
      return;
    }
    setStepIndex((value) => value + 1);
  }

  const currentStepError = validateCurrentStep();
  const nextDisabled = Boolean(currentStepError || submitting || uploadingMediaKey || scanning);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <Header title={step.title} subtitle={`${step.subtitle} - ${progress}`} />
        {profile?.verificationStatus === "REJECTED" || profile?.verificationStatus === "REUPLOAD_REQUIRED" ? (
          <Text style={styles.noticeText}>
            Document reupload required. {rejectionReason ?? "Darji admin requested clearer documents. Please review your details and submit again."}
          </Text>
        ) : null}
        {currentStepError && step.key !== "review" ? <Text style={styles.helperWarning}>Complete this step to continue.</Text> : null}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((stepIndex + 1) / onboardingSteps.length) * 100}%` }]} />
        </View>

        {step.key === "personal" ? (
          <Card>
            <Field label="Full name" onChange={(value) => update("fullName", value)} value={data.fullName} />
            <DateField label="Date of birth" maximumDate={new Date()} onChange={(value) => update("dob", value)} value={data.dob} />
            <Text style={styles.formLabel}>Gender</Text>
            <ChoiceGroup onChange={(value) => update("gender", value)} options={["Male", "Female", "Other"]} value={data.gender} />
            <Field label="Email" keyboardType="email-address" onChange={(value) => update("email", value)} value={data.email} />
            <Field label="Emergency contact" keyboardType="phone-pad" onChange={(value) => update("emergencyContact", value.replace(/\D/g, "").slice(0, 10))} value={data.emergencyContact} />
            <Field label="Address" multiline onChange={(value) => update("address", value)} value={data.address} />
            <PrimaryButton icon="location-outline" label="Use Current Location" loading={locatingAddress} disabled={locatingAddress} onPress={() => void fillCurrentLocation()} variant="secondary" />
            <View style={styles.twoCol}>
              <View style={styles.flexOne}><Field label="City" onChange={(value) => update("city", value)} value={data.city} /></View>
              <View style={styles.flexOne}><Field label="State" onChange={(value) => update("state", value)} value={data.state} /></View>
            </View>
            <Field label="Pincode" keyboardType="number-pad" onChange={(value) => update("pincode", value.replace(/\D/g, "").slice(0, 6))} value={data.pincode} />
          </Card>
        ) : null}

        {step.key === "identity" ? (
          <Card>
            <Text style={styles.formLabel}>Choose one ID</Text>
            <ChoiceGroup
              onChange={(value) => setData((current) => ({ ...current, identityType: value as IdentityType, identityFront: undefined, identityBack: undefined, ocrStatus: "Waiting for document" }))}
              options={["Aadhaar", "PAN"]}
              value={data.identityType}
            />
            {data.identityType === "Aadhaar" ? (
              <>
                <DocumentBox label="Aadhaar front" media={data.identityFront} loading={uploadingMediaKey === "identityFront"} onCamera={() => void pickMedia("identityFront", "camera", "identity")} onGallery={() => void pickMedia("identityFront", "gallery", "identity")} />
                <DocumentBox label="Aadhaar back" media={data.identityBack} loading={uploadingMediaKey === "identityBack"} onCamera={() => void pickMedia("identityBack", "camera", "identity")} onGallery={() => void pickMedia("identityBack", "gallery", "identity")} />
                <Field label="Aadhaar number" keyboardType="number-pad" onChange={(value) => update("aadhaarNumber", value.replace(/\D/g, "").slice(0, 12))} value={data.aadhaarNumber} />
              </>
            ) : (
              <>
                <DocumentBox label="PAN card" media={data.identityFront} loading={uploadingMediaKey === "identityFront"} onCamera={() => void pickMedia("identityFront", "camera", "identity")} onGallery={() => void pickMedia("identityFront", "gallery", "identity")} />
                <Field label="PAN number" onChange={(value) => update("panNumber", value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} value={data.panNumber} />
              </>
            )}
            <DocumentBox label="Selfie" media={data.facePhoto} loading={uploadingMediaKey === "facePhoto"} onCamera={() => void pickMedia("facePhoto", "camera", "face")} onGallery={() => void pickMedia("facePhoto", "gallery", "face")} />
            <View style={styles.mlKitPanel}>
              {scanning ? <ActivityIndicator color={BRAND_ORANGE} /> : <Ionicons name="scan-outline" size={18} color={BRAND_ORANGE} />}
              <View style={styles.flexOne}>
                <Text style={styles.mlKitText}>OCR: {data.ocrStatus}</Text>
                <Text style={styles.mlKitText}>Face: {data.faceStatus}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {step.key === "license" ? (
          <Card>
            <DocumentBox label="License front" media={data.licenseFront} loading={uploadingMediaKey === "licenseFront"} onCamera={() => void pickMedia("licenseFront", "camera", "license")} onGallery={() => void pickMedia("licenseFront", "gallery", "license")} />
            <DocumentBox label="License back" media={data.licenseBack} loading={uploadingMediaKey === "licenseBack"} onCamera={() => void pickMedia("licenseBack", "camera", "license")} onGallery={() => void pickMedia("licenseBack", "gallery", "license")} />
            <Field label="License number" onChange={(value) => update("licenseNumber", value.toUpperCase())} value={data.licenseNumber} />
            <DateField label="Expiry date" minimumDate={new Date()} onChange={(value) => update("licenseExpiry", value)} value={data.licenseExpiry} />
          </Card>
        ) : null}

        {step.key === "vehicle" ? (
          <Card>
            <Text style={styles.formLabel}>Vehicle type</Text>
            <ChoiceGroup onChange={(value) => update("vehicleType", value)} options={["Bicycle", "Scooter", "Motorcycle", "Car"]} value={data.vehicleType} />
            <Field label="Vehicle number" onChange={(value) => update("vehicleNumber", value.toUpperCase())} value={data.vehicleNumber} />
            <Field label="Vehicle model" onChange={(value) => update("vehicleModel", value)} value={data.vehicleModel} />
            <DocumentBox label="RC image" media={data.rcPhoto} loading={uploadingMediaKey === "rcPhoto"} onCamera={() => void pickMedia("rcPhoto", "camera")} onGallery={() => void pickMedia("rcPhoto", "gallery")} />
            <DocumentBox label="Insurance image" media={data.insurancePhoto} loading={uploadingMediaKey === "insurancePhoto"} onCamera={() => void pickMedia("insurancePhoto", "camera")} onGallery={() => void pickMedia("insurancePhoto", "gallery")} />
          </Card>
        ) : null}

        {step.key === "bank" ? (
          <Card>
            <Field label="Account holder name" onChange={(value) => update("accountHolder", value)} value={data.accountHolder} />
            <Field label="Account number" keyboardType="number-pad" onChange={(value) => update("accountNumber", value.replace(/\D/g, ""))} value={data.accountNumber} />
            <Field label="IFSC code" onChange={(value) => update("ifsc", value.toUpperCase())} value={data.ifsc} />
            <Field label="UPI ID" onChange={(value) => update("upi", value)} value={data.upi} />
          </Card>
        ) : null}

        {step.key === "preferences" ? (
          <Card>
            <Text style={styles.formLabel}>Availability</Text>
            <ChoiceGroup onChange={(value) => update("availability", value)} options={["Full time", "Part time"]} value={data.availability} />
            <Field label="Working hours" onChange={(value) => update("workingHours", value)} value={data.workingHours} />
            <Text style={styles.formLabel}>Preferred radius</Text>
            <ChoiceGroup onChange={(value) => update("radius", value)} options={["2 km", "5 km", "10 km"]} value={data.radius} />
            <View style={styles.switchRow}>
              <Text style={styles.cardTitle}>Instant deliveries</Text>
              <Switch value={data.instantDeliveries} onValueChange={(value) => update("instantDeliveries", value)} />
            </View>
          </Card>
        ) : null}

        {step.key === "tutorial" ? (
          <Card accent>
            {tutorialItems.map((item, index) => (
              <View style={styles.tutorialRow} key={item}>
                <Text style={styles.tutorialNumber}>{index + 1}</Text>
                <Text style={styles.tutorialText}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {step.key === "review" ? (
          <Card>
            <StatusRow label="Personal details" value={data.fullName ? "Ready" : "Missing"} />
            <StatusRow label={data.identityType} value={data.identityType === "Aadhaar" ? data.aadhaarNumber ? "Ready" : "Missing" : data.panNumber ? "Ready" : "Missing"} />
            <StatusRow label="OCR check" value={data.ocrStatus} />
            <StatusRow label="Face check" value={data.faceStatus} />
            <StatusRow label="Driving license" value={data.licenseNumber ? "Ready" : "Missing"} />
            <StatusRow label="Vehicle details" value={data.vehicleNumber ? "Ready" : "Missing"} />
            <StatusRow label="Bank details" value={data.accountNumber ? "Ready" : "Missing"} />
            <Text style={styles.noticeText}>After submission the app stays locked until Darji admins verify this partner account.</Text>
          </Card>
        ) : null}

        <View style={styles.navRow}>
          <View style={styles.flexOne}>
            <PrimaryButton disabled={stepIndex === 0 || submitting} label="Back" onPress={() => setStepIndex((value) => Math.max(0, value - 1))} variant="secondary" />
          </View>
          <View style={styles.flexOne}>
            <PrimaryButton label={step.key === "review" ? "Submit Verification" : "Next"} disabled={nextDisabled} loading={submitting} onPress={next} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function DocumentBox({ label, media, onGallery, onCamera, loading = false }: { label: string; media?: MediaDraft; onGallery: () => void; onCamera: () => void; loading?: boolean }) {
  return (
    <View style={styles.documentBox}>
      <View style={styles.documentPreview}>
        {media ? <Image resizeMode="cover" source={{ uri: media.uri }} style={styles.documentImage} /> : <Ionicons name="image-outline" size={26} color={BRAND_ORANGE} />}
      </View>
      <View style={styles.documentBody}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text numberOfLines={1} style={styles.cardMeta}>{loading ? "Uploading..." : media ? media.name : "No photo selected"}</Text>
        <View style={styles.docActions}>
          <Pressable style={styles.docButton} onPress={onGallery} disabled={loading}>
            <Ionicons name="images-outline" size={15} color={BRAND_ORANGE} />
            <Text style={styles.docButtonText}>Gallery</Text>
          </Pressable>
          <Pressable style={styles.docButton} onPress={onCamera} disabled={loading}>
            {loading ? <ActivityIndicator color={BRAND_ORANGE} size="small" /> : <Ionicons name="camera-outline" size={15} color={BRAND_ORANGE} />}
            <Text style={styles.docButtonText}>{loading ? "Uploading" : "Camera"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function HomeScreen({
  activeOrder,
  pendingCount,
  online,
  onToggleOnline,
  onOpenOrder,
  onShowLatestRequest
}: {
  activeOrder?: DeliveryRequest;
  pendingCount: number;
  online: boolean;
  onToggleOnline: (value: boolean) => void;
  onOpenOrder: () => void;
  onShowLatestRequest: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header
        right={
          <View style={styles.onlineBlock}>
            <Switch value={online} onValueChange={onToggleOnline} />
            <Text style={[styles.onlineText, online && styles.greenText]}>{online ? "Online" : "Offline"}</Text>
          </View>
        }
        subtitle="Nearest jobs appear as popups when you are online"
        title="Delivery Hub"
      />
      <View style={styles.heroCard}>
        <View style={styles.flexOne}>
          <Text style={styles.heroLabel}>LIVE ROUTING</Text>
          <Text style={styles.heroTitle}>{pendingCount} open requests</Text>
          <Text style={styles.heroCopy}>Accept a job to start the 12 hour delivery deadline.</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="navigate-outline" size={32} color="#111111" />
        </View>
      </View>
      <View style={styles.statsRow}>
        <Stat label="Today" value="Rs 1,240" />
        <Stat label="Completed" value="12" tone="green" />
      </View>
      <View style={styles.statsRow}>
        <Stat label="Rating" value="4.8" tone="blue" />
        <Stat label="Wallet" value="Rs 3,860" />
      </View>
      {activeOrder ? (
        <Card>
          <View style={styles.cardTopRow}>
            <View style={styles.iconTile}>
              <Ionicons name="cube-outline" size={22} color={BRAND_ORANGE} />
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle}>{requestTitle(activeOrder)}</Text>
              <Text style={styles.cardMeta}>{shortId(activeOrder.id)} - deadline {deadlineLabel(activeOrder.deadlineAt)}</Text>
            </View>
            <StatusPill status={activeOrder.status} />
          </View>
          <View style={styles.cardDivider} />
          <StatusRow label="Pickup" value={activeOrder.pickupAddress} />
          <StatusRow label="Drop" value={activeOrder.dropAddress} />
          <PrimaryButton icon="navigate-outline" label="Open active job" onPress={onOpenOrder} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>No active delivery</Text>
          <Text style={styles.helperText}>Stay online to receive nearby customer-to-tailor or tailor-to-customer jobs from the backend dispatch queue.</Text>
          <PrimaryButton disabled={!pendingCount} icon="flash-outline" label="Open latest request" onPress={onShowLatestRequest} variant="secondary" />
        </Card>
      )}
      <Card>
        <Text style={styles.cardTitle}>Device health</Text>
        <StatusRow label="Google Maps" value="Ready" />
        <StatusRow label="Background location" value={online ? "Active" : "Paused"} />
        <StatusRow label="Notifications" value="Enabled when allowed" />
      </Card>
    </ScrollView>
  );
}

function OrderRequestModal({
  visible,
  request,
  accepting,
  onAccept,
  onClose
}: {
  visible: boolean;
  request?: DeliveryRequest;
  accepting: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!visible) return undefined;
    setCountdown(30);
    const id = setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [visible, request?.id]);

  useEffect(() => {
    if (visible && countdown === 0) onClose();
  }, [countdown, onClose, visible]);

  if (!request) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.popupBackdrop}>
        <View style={styles.requestPopupCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.popupIconSmall}>
              <Ionicons name="bicycle-outline" size={24} color={BRAND_ORANGE} />
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.popupEyebrow}>NEW DELIVERY</Text>
              <Text style={styles.popupTitle}>{requestTitle(request)}</Text>
            </View>
            <View style={styles.countCircle}>
              <Text style={styles.countText}>{countdown}</Text>
            </View>
          </View>
          <View style={styles.countdownPanel}>
            <Ionicons name="time-outline" size={20} color={BRAND_ORANGE} />
            <View style={styles.flexOne}>
              <Text style={styles.countdownTitle}>12 hour deadline after accept</Text>
              <Text style={styles.countdownCopy}>{request.clothType ?? "Clothes"} - {request.workType ?? "Tailoring job"}</Text>
            </View>
          </View>
          <StatusRow label="Customer" value={request.customerName ?? "Customer"} />
          <StatusRow label="Tailor" value={request.tailorName ?? "Tailor"} />
          <StatusRow label="Pickup" value={request.pickupAddress} />
          <StatusRow label="Drop" value={request.dropAddress} />
          <StatusRow label="Distance" value={request.estimatedDistanceKm ? `${request.estimatedDistanceKm.toFixed(1)} km` : "Calculated when route opens"} />
          <StatusRow label="Expected earning" value={`Rs ${requestEarning(request)}`} />
          <View style={styles.navRow}>
            <View style={styles.flexOne}><PrimaryButton icon="close-outline" label="Close" onPress={onClose} variant="danger" /></View>
            <View style={styles.flexOne}><PrimaryButton icon="checkmark-outline" label="Accept" loading={accepting} onPress={onAccept} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OrdersScreen({ requests, onOpenOrder }: { requests: DeliveryRequest[]; onOpenOrder: (request: DeliveryRequest) => void }) {
  const [queue, setQueue] = useState<"new" | "pickup" | "drop" | "history">("new");
  const visibleRequests = requests.filter((request) => {
    if (queue === "new") return request.taskStatus === "pending";
    if (queue === "pickup") return request.taskStatus === "accepted";
    if (queue === "drop") return request.taskStatus === "picked_up";
    return request.taskStatus === "delivered" || request.taskStatus === "cancelled";
  });
  return (
    <FlatList
      contentContainerStyle={styles.pageContent}
      data={visibleRequests}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<>
        <Header subtitle="Batch pickup and delivery workflow" title="Delivery Queues" />
        <View style={styles.segmentRow}>
          {(["new", "pickup", "drop", "history"] as const).map((item) => (
            <Pressable key={item} style={[styles.segment, queue === item && styles.segmentActive]} onPress={() => setQueue(item)}>
              <Text style={[styles.segmentText, queue === item && styles.segmentTextActive]}>{item === "new" ? "New Requests" : item === "pickup" ? "Pickup Queue" : item === "drop" ? "Drop Queue" : "History"}</Text>
            </Pressable>
          ))}
        </View>
      </>}
      ListEmptyComponent={<EmptyState title={`No ${queue} tasks`} copy="Tasks move between queues automatically as handoffs are completed." />}
      renderItem={({ item }) => (
        <Pressable style={styles.orderCard} onPress={() => onOpenOrder(item)}>
          <View style={styles.cardTopRow}>
            <View style={styles.iconTile}>
              <Ionicons name={item.leg === "CUSTOMER_TO_TAILOR" ? "person-outline" : "storefront-outline"} size={22} color={BRAND_ORANGE} />
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.prominentOrderId}>REQ-{item.orderId.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.cardTitle}>{requestTitle(item)}</Text>
              <Text style={styles.cardMeta}>{shortId(item.orderId)} - {item.shift} shift - {item.clothType ?? "Clothes"}</Text>
            </View>
            <StatusPill status={item.status} />
          </View>
          <View style={styles.cardDivider} />
          <Text style={styles.cardCopy} numberOfLines={2}>{item.pickupAddress} to {item.dropAddress}</Text>
          <Text style={styles.priceText}>Rs {requestEarning(item)}</Text>
        </Pressable>
      )}
    />
  );
}

function ChecklistRow({ label, complete, current, locked }: { label: string; complete: boolean; current?: boolean; locked?: boolean }) {
  const color = complete ? SUCCESS : current ? BRAND_ORANGE : MUTED;
  return (
    <View style={[styles.checklistRow, current && styles.checklistCurrent, locked && styles.checklistLocked]}>
      <Ionicons name={complete ? "checkmark-circle" : locked ? "lock-closed" : "ellipse-outline"} size={22} color={color} />
      <Text style={[styles.checklistLabel, { color }]}>{label}</Text>
    </View>
  );
}

function ActiveOrderScreenView({
  order,
  screen,
  setScreen,
  onBack,
  currentLocation,
  token,
  onTaskUpdated,
  showDialog
}: {
  order: DeliveryRequest;
  screen: ActiveOrderScreen;
  setScreen: (screen: ActiveOrderScreen) => void;
  onBack: () => void;
  currentLocation?: { latitude: number; longitude: number };
  token: string;
  onTaskUpdated: (task: DeliveryRequest) => void;
  showDialog: (dialog: DialogState) => void;
}) {
  const [clothProofs, setClothProofs] = useState<MediaDraft[]>([]);
  const [sampleProofs, setSampleProofs] = useState<MediaDraft[]>([]);
  const [otp, setOtp] = useState("");
  const [updating, setUpdating] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const pickupOtpVerified = Boolean(order.pickupOtpVerifiedAt);
  const dropOtpVerified = Boolean(order.dropOtpVerifiedAt);
  const clothPhotosUploaded = Boolean(order.clothPhotos?.length);
  const sampleRequired = order.sampleProvided === true;
  const samplePhotosUploaded = !sampleRequired || Boolean(order.samplePhotos?.length);
  const pickupChecklistComplete = pickupOtpVerified && (order.type === "tailor_to_customer" || (clothPhotosUploaded && samplePhotosUploaded));

  async function addProof(kind: "cloth" | "sample", source: "camera" | "gallery") {
    if (!pickupOtpVerified) {
      showDialog({ title: "OTP required", message: "Verify the pickup OTP first.", icon: "shield-checkmark-outline" });
      return;
    }
    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({
        title: source === "camera" ? "Camera permission needed" : "Gallery permission needed",
        message: source === "camera" ? "Allow camera access to capture proof." : "Allow gallery access to upload proof.",
        icon: source === "camera" ? "camera-outline" : "images-outline"
      });
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82 });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    const update = kind === "cloth" ? setClothProofs : setSampleProofs;
    update((current) => [...current, { uri: asset.uri, name: asset.fileName ?? `${kind}-${Date.now()}.jpg` }].slice(-6));
  }

  async function verifyOtp() {
    if (otp.length !== 4) {
      showDialog({ title: "OTP required", message: "Enter the 4 digit OTP.", icon: "shield-checkmark-outline" });
      return;
    }
    const stage = order.taskStatus === "accepted" ? "pickup" : "drop";
    try {
      setUpdating(true);
      const updated = await api<DeliveryTaskPayload>(`/delivery-requests/${order.id}/verify-otp`, {
        method: "POST",
        body: JSON.stringify({ stage, otp })
      }, token);
      setOtp("");
      onTaskUpdated(normalizeDeliveryTask(updated));
    } catch (error) {
      showDialog({ title: "Update failed", message: error instanceof Error ? error.message : "Could not update task.", icon: "alert-circle-outline" });
    } finally {
      setUpdating(false);
    }
  }

  async function savePhotos(kind: "cloth" | "sample") {
    const drafts = kind === "cloth" ? clothProofs : sampleProofs;
    if (!drafts.length) {
      showDialog({ title: "Photos required", message: `Upload at least one ${kind} photo.`, icon: "images-outline" });
      return;
    }
    if (kind === "sample" && !clothPhotosUploaded) {
      showDialog({ title: "Complete previous step", message: "Complete cloth photo upload first.", icon: "alert-circle-outline" });
      return;
    }
    try {
      setUploadingPhotos(true);
      const photos = await uploadDeliveryMedia(drafts, token);
      const updated = await api<DeliveryTaskPayload>(`/delivery-requests/${order.id}/photos`, {
        method: "PATCH",
        body: JSON.stringify({ kind, photos })
      }, token);
      onTaskUpdated(normalizeDeliveryTask(updated));
      if (kind === "cloth") setClothProofs([]);
      else setSampleProofs([]);
      if (kind === "sample" || !sampleRequired) setScreen("confirmations");
    } catch (error) {
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not save photos.", icon: "cloud-upload-outline" });
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function advanceTask() {
    const nextStatus = order.taskStatus === "accepted" ? "picked_up" : "delivered";
    try {
      setUpdating(true);
      const updated = await api<DeliveryTaskPayload>(`/delivery-requests/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      }, token);
      onTaskUpdated(normalizeDeliveryTask(updated));
    } catch (error) {
      showDialog({ title: "Update failed", message: error instanceof Error ? error.message : "Could not update task.", icon: "alert-circle-outline" });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Active job" subtitle={`${shortId(order.id)} - ${order.status}`} onBack={onBack} />
        <Text style={styles.activeOrderId}>REQ-{order.orderId.slice(0, 8).toUpperCase()}</Text>
        <View style={styles.detailSectionNav}>
          {(["summary", "route", "confirmations"] as ActiveOrderScreen[]).map((item) => (
            <Pressable style={[styles.detailSectionButton, screen === item && styles.detailSectionButtonActive]} key={item} onPress={() => setScreen(item)}>
              <Ionicons name={item === "summary" ? "document-text-outline" : item === "route" ? "navigate-outline" : "checkbox-outline"} size={22} color={screen === item ? "#111111" : BRAND_DEEP} />
              <Text style={[styles.detailSectionText, screen === item && styles.detailSectionTextActive]}>{item === "confirmations" ? "Confirmations" : item[0].toUpperCase() + item.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        {screen === "summary" ? (
          <Card>
            <StatusPill status={order.status} />
            <StatusRow label="Job" value={requestTitle(order)} />
            <StatusRow label="Customer" value={order.customerName ?? "Customer"} />
            <StatusRow label="Tailor" value={order.tailorName ?? "Tailor"} />
            <StatusRow label="Clothes" value={`${order.clothType ?? "Clothes"} - ${order.workType ?? "Tailoring"}`} />
            <StatusRow label="Deadline" value={deadlineLabel(order.deadlineAt)} />
            <View style={styles.navRow}>
              <View style={styles.flexOne}><PrimaryButton icon="call-outline" label="Call pickup" onPress={() => Linking.openURL(`tel:${order.leg === "CUSTOMER_TO_TAILOR" ? order.customerPhone ?? "" : order.tailorPhone ?? ""}`)} variant="secondary" /></View>
              <View style={styles.flexOne}><PrimaryButton icon="navigate-outline" label="Route" onPress={() => openDirections(order.pickupAddress)} /></View>
            </View>
          </Card>
        ) : null}

        {screen === "route" ? (
          <Card accent>
            <Text style={styles.cardTitle}>Best route</Text>
            <Text style={styles.helperText}>Google Maps opens with driving directions for the exact pickup and drop addresses from the backend request.</Text>
            <StatusRow label="Pickup" value={order.pickupAddress} />
            <StatusRow label="Drop" value={order.dropAddress} />
            <RouteMap order={order} location={currentLocation} />
            <View style={styles.navRow}>
              <View style={styles.flexOne}><PrimaryButton icon="navigate-outline" label="Pickup route" onPress={() => openDirections(order.pickupAddress)} variant="secondary" /></View>
              <View style={styles.flexOne}><PrimaryButton icon="flag-outline" label="Full route" onPress={() => openDirections(order.dropAddress, order.pickupAddress)} /></View>
            </View>
          </Card>
        ) : null}

        {screen === "confirmations" && order.taskStatus === "accepted" && order.type === "customer_to_tailor" && pickupOtpVerified && !pickupChecklistComplete ? (
          <Card>
            <Text style={styles.cardTitle}>Cloth photos</Text>
            <Text style={styles.helperText}>Upload multiple clear photos before sealing the package.</Text>
            <View style={styles.docActions}>
              <Pressable style={styles.docButton} onPress={() => addProof("cloth", "gallery")}>
                <Ionicons name="images-outline" size={15} color={BRAND_ORANGE} />
                <Text style={styles.docButtonText}>Gallery</Text>
              </Pressable>
              <Pressable style={styles.docButton} onPress={() => addProof("cloth", "camera")}>
                <Ionicons name="camera-outline" size={15} color={BRAND_ORANGE} />
                <Text style={styles.docButtonText}>Camera</Text>
              </Pressable>
            </View>
            <View style={styles.mediaGrid}>
              {clothProofs.map((proof) => <Image key={proof.uri} source={{ uri: proof.uri }} style={styles.proofImage} />)}
            </View>
            {!clothPhotosUploaded ? <PrimaryButton icon="cloud-upload-outline" label="Complete Cloth Photo Upload" loading={uploadingPhotos} disabled={!clothProofs.length} onPress={() => savePhotos("cloth")} /> : <ChecklistRow label="Cloth photos uploaded" complete />}
            {order.sampleMedia?.length && clothPhotosUploaded ? (
              <View style={styles.sampleBlock}>
                <Text style={styles.cardTitle}>Sample photos required</Text>
                <Text style={styles.cardMeta}>{order.sampleMedia.length} customer sample reference file(s) exist.</Text>
                <View style={styles.docActions}>
                  <Pressable style={styles.docButton} onPress={() => addProof("sample", "gallery")}><Ionicons name="images-outline" size={15} color={BRAND_ORANGE} /><Text style={styles.docButtonText}>Gallery</Text></Pressable>
                  <Pressable style={styles.docButton} onPress={() => addProof("sample", "camera")}><Ionicons name="camera-outline" size={15} color={BRAND_ORANGE} /><Text style={styles.docButtonText}>Camera</Text></Pressable>
                </View>
                <View style={styles.mediaGrid}>{sampleProofs.map((proof) => <Image key={proof.uri} source={{ uri: proof.uri }} style={styles.proofImage} />)}</View>
                {!samplePhotosUploaded ? <PrimaryButton icon="cloud-upload-outline" label="Complete Sample Photo Upload" loading={uploadingPhotos} disabled={!sampleProofs.length} onPress={() => savePhotos("sample")} /> : <ChecklistRow label="Sample photos uploaded" complete />}
              </View>
            ) : null}
          </Card>
        ) : null}

        {screen === "confirmations" ? (
          <Card>
            <Text style={styles.cardTitle}>Sequential checklist</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: order.taskStatus === "picked_up" ? (dropOtpVerified ? "70%" : "50%") : pickupChecklistComplete ? "45%" : pickupOtpVerified ? "25%" : "8%" }]} /></View>
            {order.taskStatus === "accepted" ? (
              <>
                <ChecklistRow label={order.type === "customer_to_tailor" ? "Verify Pickup OTP" : "Verify Tailor Handover OTP"} complete={pickupOtpVerified} current={!pickupOtpVerified} />
                {!pickupOtpVerified ? <><Field label="4 digit OTP" keyboardType="number-pad" onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 4))} placeholder="Enter OTP" value={otp} /><PrimaryButton icon="shield-checkmark-outline" label="Verify OTP" loading={updating} disabled={otp.length !== 4} onPress={verifyOtp} /></> : null}
                {order.type === "customer_to_tailor" ? (
                  <>
                    <ChecklistRow label="Upload Cloth Photos" complete={clothPhotosUploaded} current={pickupOtpVerified && !clothPhotosUploaded} locked={!pickupOtpVerified} />
                    {sampleRequired ? <ChecklistRow label="Upload Sample Photos" complete={samplePhotosUploaded} current={clothPhotosUploaded && !samplePhotosUploaded} locked={!clothPhotosUploaded} /> : null}
                  </>
                ) : null}
                <ChecklistRow label={order.type === "customer_to_tailor" ? "Mark Picked Up" : "Mark Collected From Tailor"} complete={false} current={pickupChecklistComplete} locked={!pickupChecklistComplete} />
                <PrimaryButton icon="checkmark-done-outline" label={order.type === "customer_to_tailor" ? "Mark Picked Up" : "Mark Collected From Tailor"} loading={updating} onPress={advanceTask} disabled={!pickupChecklistComplete} />
              </>
            ) : order.taskStatus === "picked_up" ? (
              <>
                <ChecklistRow label={order.type === "customer_to_tailor" ? "Verify Tailor Receive OTP" : "Verify Delivery OTP"} complete={dropOtpVerified} current={!dropOtpVerified} />
                {!dropOtpVerified ? <><Field label="4 digit OTP" keyboardType="number-pad" onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 4))} placeholder="Enter OTP" value={otp} /><PrimaryButton icon="shield-checkmark-outline" label="Verify OTP" loading={updating} disabled={otp.length !== 4} onPress={verifyOtp} /></> : null}
                <ChecklistRow label={order.type === "customer_to_tailor" ? "Mark Delivered To Tailor" : "Mark Delivered"} complete={false} current={dropOtpVerified} locked={!dropOtpVerified} />
                <PrimaryButton icon="checkmark-done-outline" label={order.type === "customer_to_tailor" ? "Mark Delivered To Tailor" : "Mark Delivered"} loading={updating} onPress={advanceTask} disabled={!dropOtpVerified} />
              </>
            ) : <ChecklistRow label="Delivery completed" complete />}
          </Card>
        ) : null}

      </ScrollView>
    </Screen>
  );
}

function StatusPill({ status }: { status: string }) {
  const accepted = status === "ACCEPTED";
  const completed = status === "COMPLETED";
  return <Text style={[styles.statusPill, accepted && styles.statusAccepted, completed && styles.statusCompleted]}>{status.toLowerCase().replace(/^\w/, (char) => char.toUpperCase())}</Text>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={34} color={BRAND_ORANGE} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.helperText}>{copy}</Text>
    </View>
  );
}

function EarningsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header subtitle="Daily, weekly, monthly payout analytics" title="Earnings" />
      <View style={styles.statsRow}>
        <Stat label="Today" value="Rs 1,240" />
        <Stat label="Weekly" value="Rs 7,850" tone="green" />
      </View>
      <Card>
        <Text style={styles.cardTitle}>Breakdown</Text>
        {[
          ["Base earning", "Rs 820"],
          ["Instant bonus", "Rs 180"],
          ["Distance bonus", "Rs 140"],
          ["Tips", "Rs 100"],
          ["Penalties", "Rs 0"]
        ].map(([label, value]) => <StatusRow key={label} label={label} value={value} />)}
      </Card>
      <Card accent>
        <Text style={styles.cardMeta}>Withdrawable balance</Text>
        <Text style={styles.walletValue}>Rs 3,860</Text>
        <PrimaryButton icon="wallet-outline" label="Withdraw" onPress={() => undefined} />
      </Card>
    </ScrollView>
  );
}

function NotificationsScreen({ requests }: { requests: DeliveryRequest[] }) {
  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header subtitle="Push notifications, payments, and announcements" title="Notifications" />
      {requests.slice(0, 8).map((request) => (
        <Card key={request.id}>
          <Text style={styles.cardTitle}>{requestTitle(request)}</Text>
          <Text style={styles.cardMeta}>{request.pickupAddress} to {request.dropAddress}</Text>
        </Card>
      ))}
      {!requests.length ? <EmptyState title="No alerts yet" copy="New delivery requests and job updates will appear here." /> : null}
    </ScrollView>
  );
}

function TabBar({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "home", label: "Home", icon: "home-outline" },
    { key: "orders", label: "Queues", icon: "cube-outline" },
    { key: "earnings", label: "Earnings", icon: "wallet-outline" },
    { key: "notifications", label: "Alerts", icon: "notifications-outline" },
    { key: "profile", label: "Profile", icon: "person-outline" }
  ];
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const active = current === tab.key;
        return (
          <Pressable style={styles.tabItem} key={tab.key} onPress={() => onChange(tab.key)}>
            <Ionicons color={active ? BRAND_ORANGE : "#7b8796"} name={tab.icon} size={21} />
            <Text style={[styles.tabText, active && styles.activeTabText]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MainApp({
  me,
  onRefreshProfile,
  onSessionExpired,
  onSignOut,
  showDialog
}: {
  me?: MeResponse;
  onRefreshProfile: () => void;
  onSessionExpired: () => void;
  onSignOut: () => void;
  showDialog: (dialog: DialogState) => void;
}) {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  useRegisterPushNotifications({ authToken: token, app: "delivery", userId: user?.id });
  const [tab, setTab] = useState<Tab>("home");
  const [online, setOnline] = useState(Boolean(me?.deliveryProfile?.isAvailable ?? false));
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [requestVisible, setRequestVisible] = useState(false);
  const [popupRequest, setPopupRequest] = useState<DeliveryRequest>();
  const [activeOrder, setActiveOrder] = useState<DeliveryRequest | undefined>();
  const [activeOrderScreen, setActiveOrderScreen] = useState<ActiveOrderScreen>("summary");
  const [accepting, setAccepting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("Offline");
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number }>();
  const dismissedRequestIdsRef = useRef<Set<string>>(new Set());
  const presentedRequestIdsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const openRequests = useMemo(() => requests.filter((request) => request.taskStatus === "pending"), [requests]);
  const acceptedRequests = useMemo(() => requests.filter((request) => request.taskStatus === "accepted" || request.taskStatus === "picked_up"), [requests]);
  const currentActiveOrder = activeOrder ?? acceptedRequests[0];
  const completedJobs = useMemo(() => requests.filter((request) => request.taskStatus === "delivered").length, [requests]);

  useEffect(() => {
    setOnline(Boolean(me?.deliveryProfile?.isAvailable ?? false));
  }, [me?.deliveryProfile?.isAvailable]);

  const showOpenRequestPopup = useCallback((requestList: DeliveryRequest[]) => {
    if (!online || requestVisible || activeOrder) return;
    const newest = requestList.find(
      (request) => request.status === "OPEN" && !dismissedRequestIdsRef.current.has(request.id) && !presentedRequestIdsRef.current.has(request.id)
    );
    if (!newest) return;
    presentedRequestIdsRef.current.add(newest.id);
    setPopupRequest(newest);
    setRequestVisible(true);
    void playDeliveryAlert("New delivery request", requestTitle(newest));
  }, [activeOrder, online, requestVisible]);
  const showOpenRequestPopupRef = useRef(showOpenRequestPopup);

  useEffect(() => {
    showOpenRequestPopupRef.current = showOpenRequestPopup;
  }, [showOpenRequestPopup]);

  const loadRequests = useCallback(async (presentLatest = false) => {
    if (!token) return;
    try {
      const data = await api<DeliveryTaskPayload[]>("/delivery-requests", {}, token);
      const normalized = data.map(normalizeDeliveryTask);
      setRequests(normalized);
      if (presentLatest) showOpenRequestPopupRef.current(normalized);
    } catch {
      // The app still works locally if the backend is not running.
    }
  }, [token]);

  useEffect(() => {
    void loadRequests(true);
  }, [loadRequests]);

  useEffect(() => {
    if (!token) return;
    void api(
      "/delivery-partners/me/availability",
      { method: "PATCH", body: JSON.stringify({ isAvailable: online }) },
      token
    ).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    const socket = createRealtimeSocket(token, setConnectionStatus, refreshAccessToken);
    socketRef.current = socket;
    socket.on("connect", () => {
      void loadRequests(true);
    });

    socket.on("delivery:task_created", (payload: DeliveryTaskPayload) => {
      if (!payload?.id) return;
      const request = normalizeDeliveryTask(payload);
      setRequests((current) => current.some((item) => item.id === request.id) ? current : [request, ...current]);
      showOpenRequestPopupRef.current([request]);
    });
    socket.on("delivery:task_accepted", ({ taskId, deliveryPartnerId }: { taskId: string; deliveryPartnerId?: string }) => {
      setRequests((current) => current.filter((request) => request.id !== taskId || request.taskStatus !== "pending"));
      setPopupRequest((current) => {
        if (current?.id !== taskId) return current;
        setRequestVisible(false);
        return undefined;
      });
      if (!deliveryPartnerId) dismissedRequestIdsRef.current.add(taskId);
    });
    socket.on("delivery:task_assigned", (payload: DeliveryTaskPayload) => {
      if (!payload?.id) return;
      const request = normalizeDeliveryTask(payload);
      setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
      setActiveOrder(request);
      setActiveOrderScreen("route");
    });
    socket.on("delivery:task_updated", (payload: DeliveryTaskPayload) => {
      if (!payload?.id) return;
      const request = normalizeDeliveryTask(payload);
      setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
      setActiveOrder((current) => current?.id === request.id ? request : current);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectionStatus("Offline");
    };
  }, [token, loadRequests]);

  useEffect(() => {
    if (!activeOrder || activeOrderScreen !== "route") return undefined;
    const trackingOrder = activeOrder;
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    async function startLocationUpdates() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted || cancelled) return;
      socketRef.current?.emit("delivery:join_tracking", { requestId: trackingOrder.id });
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
        (position) => {
          const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setCurrentLocation(location);
          socketRef.current?.emit("delivery:location_update", {
            requestId: trackingOrder.id,
            ...location,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined
          });
        }
      );
    }

    void startLocationUpdates();
    return () => {
      cancelled = true;
      subscription?.remove();
      socketRef.current?.emit("delivery:leave_tracking", { requestId: trackingOrder.id });
    };
  }, [activeOrder?.id, activeOrderScreen]);

  async function toggleOnline(value: boolean) {
    setOnline(value);
    if (!token) return;
    try {
      if (value) {
        await Location.requestForegroundPermissionsAsync();
      }
      await api("/delivery-partners/me/availability", { method: "PATCH", body: JSON.stringify({ isAvailable: value }) }, token);
    } catch {
      // Keep the UI responsive; backend availability will sync on the next attempt.
    }
  }

  async function acceptPopupRequest() {
    if (!token || !popupRequest) return;
    try {
      setAccepting(true);
      const acceptedPayload = await api<DeliveryTaskPayload>(`/delivery-requests/${popupRequest.id}/accept`, { method: "POST" }, token);
      const accepted = normalizeDeliveryTask(acceptedPayload);
      dismissedRequestIdsRef.current.add(popupRequest.id);
      setRequests((current) => [accepted, ...current.filter((item) => item.id !== accepted.id)]);
      setRequestVisible(false);
      setActiveOrder(accepted);
      setActiveOrderScreen("route");
      void playAppSound("confirmation");
    } catch (error) {
      showDialog({ title: "Accept failed", message: error instanceof Error ? error.message : "Could not accept request.", icon: "alert-circle-outline" });
      void loadRequests();
    } finally {
      setAccepting(false);
    }
  }

  const handleNotificationNavigation = useCallback((destination: NotificationDestination) => {
    const taskId = destination.entityId;
    const request = taskId ? requests.find((item) => item.id === taskId || item.orderId === taskId) : undefined;

    if (destination.actionIdentifier === "DECLINE" && taskId) {
      dismissedRequestIdsRef.current.add(taskId);
      setPopupRequest((current) => current?.id === taskId ? undefined : current);
      setRequestVisible(false);
      setTab("orders");
      return;
    }

    if (destination.actionIdentifier === "ACCEPT" && taskId && token) {
      void api<DeliveryTaskPayload>(`/delivery-requests/${taskId}/accept`, { method: "POST" }, token)
        .then((payload) => {
          const accepted = normalizeDeliveryTask(payload);
          setRequests((current) => [accepted, ...current.filter((item) => item.id !== accepted.id)]);
          setPopupRequest(undefined);
          setRequestVisible(false);
          setActiveOrder(accepted);
          setActiveOrderScreen("route");
          void playAppSound("confirmation");
        })
        .catch((error) => showDialog({ title: "Accept failed", message: error instanceof Error ? error.message : "Could not accept request.", icon: "alert-circle-outline" }));
      return;
    }

    if (destination.actionIdentifier === "VIEW_DETAILS" && taskId && token && !request) {
      void api<DeliveryTaskPayload>(`/delivery-requests/${taskId}`, {}, token)
        .then((payload) => {
          const loadedRequest = normalizeDeliveryTask(payload);
          setRequests((current) => [loadedRequest, ...current.filter((item) => item.id !== loadedRequest.id)]);
          if (loadedRequest.taskStatus === "pending") {
            setPopupRequest(loadedRequest);
            setRequestVisible(true);
          } else {
            setActiveOrder(loadedRequest);
            setActiveOrderScreen("summary");
          }
          setTab("orders");
        })
        .catch((error) => showDialog({ title: "Open request failed", message: error instanceof Error ? error.message : "Could not open request.", icon: "alert-circle-outline" }));
      return;
    }

    setTab("orders");
    if (!request) return;
    if (request.taskStatus === "pending") {
      setPopupRequest(request);
      setRequestVisible(true);
    } else {
      setActiveOrder(request);
      setActiveOrderScreen("summary");
    }
  }, [requests, token]);

  if (currentActiveOrder && activeOrder) {
    return (
      <NotificationProvider app="delivery" onNavigate={handleNotificationNavigation}>
        <ActiveOrderScreenView
          onBack={() => {
            setActiveOrder(undefined);
            setActiveOrderScreen("summary");
          }}
          order={currentActiveOrder}
          screen={activeOrderScreen}
          setScreen={setActiveOrderScreen}
          currentLocation={currentLocation}
          token={token!}
          showDialog={showDialog}
          onTaskUpdated={(updated) => {
            setRequests((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
            if (updated.taskStatus === "delivered") {
              setActiveOrder(undefined);
              setActiveOrderScreen("summary");
            } else {
              setActiveOrder(updated);
            }
          }}
        />
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider app="delivery" onNavigate={handleNotificationNavigation}>
      <Screen>
        <View style={styles.mainArea}>
        {tab === "home" ? (
          <HomeScreen
            activeOrder={currentActiveOrder}
            onOpenOrder={() => {
              if (currentActiveOrder) {
                setActiveOrder(currentActiveOrder);
                setActiveOrderScreen("summary");
              }
            }}
            onShowLatestRequest={() => {
              const latest = openRequests[0];
              if (latest) {
                setPopupRequest(latest);
                setRequestVisible(true);
              }
            }}
            onToggleOnline={toggleOnline}
            online={online}
            pendingCount={openRequests.length}
          />
        ) : null}
        {tab === "orders" ? <OrdersScreen onOpenOrder={(request) => {
          if (request.taskStatus === "pending") {
            setPopupRequest(request);
            setRequestVisible(true);
          } else {
            setActiveOrder(request);
            setActiveOrderScreen("summary");
          }
        }} requests={requests} /> : null}
        {tab === "earnings" ? <EarningsScreen /> : null}
        {tab === "notifications" ? <NotificationsScreen requests={requests} /> : null}
        {tab === "profile" ? (
          <DeliveryProfileScreen
            me={me}
            token={token}
            activeJobs={acceptedRequests.length}
            completedJobs={completedJobs}
            refresh={onRefreshProfile}
            onSessionExpired={onSessionExpired}
            onSignOut={onSignOut}
            showDialog={showDialog}
          />
        ) : null}
        </View>
        <TabBar current={tab} onChange={setTab} />
        <OrderRequestModal
          accepting={accepting}
          onAccept={acceptPopupRequest}
          onClose={() => {
            if (popupRequest) dismissedRequestIdsRef.current.add(popupRequest.id);
            setRequestVisible(false);
          }}
          request={popupRequest}
          visible={requestVisible}
        />
      </Screen>
    </NotificationProvider>
  );
}

function VerificationPendingScreen({
  me,
  onOpenRegistration,
  onRefresh,
  onSignOut
}: {
  me?: MeResponse;
  onOpenRegistration: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  const submittedAt = me?.deliveryProfile?.verificationSubmittedAt;
  const rejectionReason = me?.deliveryProfile?.verificationRejectionReason;
  const status = me?.deliveryProfile?.verificationStatus ?? "NOT_SUBMITTED";
  const needsUpdate = status === "REJECTED" || status === "REUPLOAD_REQUIRED";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <View style={styles.pendingHero}>
          <View style={styles.pendingBadge}>
            <Ionicons name={needsUpdate ? "alert-circle-outline" : "hourglass-outline"} size={32} color={BRAND_ORANGE} />
          </View>
          <Text style={styles.pendingTitle}>{needsUpdate ? "Document reupload required" : "Verification under process"}</Text>
          <Text style={styles.pendingCopy}>
            {needsUpdate
              ? rejectionReason ?? "Darji admin requested clearer documents. Open registration again and resubmit the details."
              : "Your registration is complete. The app will stay locked until Darji admins verify this delivery partner account."}
          </Text>
        </View>
        <Card>
          <StatusRow label="Partner" value={me?.name || "Delivery Partner"} />
          <StatusRow label="Phone" value={me?.phone ? `+91 ${me.phone}` : "Pending"} />
          <StatusRow label="Status" value={me?.deliveryProfile?.verificationStatus ?? "PENDING"} />
          <StatusRow label="Submitted" value={submittedAt ? new Date(submittedAt).toLocaleString("en-IN") : "Just now"} />
          <Text style={styles.noticeText}>You cannot access live delivery jobs, orders, or profile settings until admin verification is complete.</Text>
        </Card>
        <PrimaryButton
          icon="refresh-outline"
          label={needsUpdate ? "Open Registration Again" : "Refresh Status"}
          onPress={needsUpdate ? onOpenRegistration : onRefresh}
        />
        <PrimaryButton icon="log-out-outline" label="Logout" onPress={onSignOut} variant="secondary" />
      </ScrollView>
    </Screen>
  );
}

export default function App() {
  const token = useAppStore((state) => state.token);
  const signOut = useAppStore((state) => state.signOut);
  const [stage, setStage] = useState<AppStage>(token ? "loading" : "auth");
  const [me, setMe] = useState<MeResponse>();
  const [dialog, setDialog] = useState<DialogState>();
  const skipLoadingScreenRef = useRef(false);

  const handleSessionExpired = useCallback(() => {
    signOut();
    setMe(undefined);
    setStage("auth");
  }, [signOut]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setMe(undefined);
      setStage("auth");
      return;
    }
    try {
      const profile = await api<MeResponse>("/auth/me", {}, token);
      setMe(profile);
      const verificationStatus = profile.deliveryProfile?.verificationStatus ?? "NOT_SUBMITTED";
      if (verificationStatus === "VERIFIED") setStage("main");
      else if (verificationStatus === "PENDING") setStage("pending");
      else if (verificationStatus === "REUPLOAD_REQUIRED" || verificationStatus === "REJECTED") setStage("pending");
      else setStage("onboarding");
    } catch (error) {
      if (isSessionError(error)) {
        handleSessionExpired();
        return;
      }
      setStage("onboarding");
    }
  }, [handleSessionExpired, token]);

  useEffect(() => {
    if (!token) {
      setMe(undefined);
      setStage("auth");
      return;
    }
    if (!skipLoadingScreenRef.current) {
      setStage("loading");
    }
    skipLoadingScreenRef.current = false;
    void refreshProfile();
  }, [token, refreshProfile]);

  if (stage === "auth") {
    return (
      <>
        <AuthScreen onAuthenticated={() => { skipLoadingScreenRef.current = true; setStage("onboarding"); }} showDialog={setDialog} />
        <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
      </>
    );
  }
  if (stage === "loading") {
    return (
      <>
        <Screen>
          <View style={styles.centeredState}>
            <ActivityIndicator color={BRAND_ORANGE} size="large" />
            <Text style={styles.centeredTitle}>Checking account</Text>
            <Text style={styles.centeredCopy}>Loading your delivery profile and verification status.</Text>
          </View>
        </Screen>
        <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
      </>
    );
  }
  if (stage === "onboarding") {
    return (
      <>
        <OnboardingScreen me={me} token={token} onSubmitted={refreshProfile} onSessionExpired={handleSessionExpired} showDialog={setDialog} />
        <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
      </>
    );
  }
  if (stage === "pending") {
    return (
      <>
        <VerificationPendingScreen
          me={me}
          onOpenRegistration={() => setStage("onboarding")}
          onRefresh={() => void refreshProfile()}
          onSignOut={() => { signOut(); setMe(undefined); setStage("auth"); }}
        />
        <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
      </>
    );
  }
  return (
    <>
      <MainApp me={me} onRefreshProfile={() => void refreshProfile()} onSessionExpired={handleSessionExpired} onSignOut={() => { signOut(); setMe(undefined); setStage("auth"); }} showDialog={setDialog} />
      <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG, paddingTop: STATUS_BAR_INSET + 10 },
  mainArea: { flex: 1 },
  connectionBadge: { minHeight: 30, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 15, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, paddingHorizontal: 12, marginBottom: 2 },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontSize: 11, fontWeight: "900" },
  authContent: { flex: 1, justifyContent: "center", paddingHorizontal: 20, paddingBottom: 20 },
  logoMark: { width: 68, height: 68, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  authTitle: { color: BRAND_DEEP, fontSize: 34, fontWeight: "900" },
  authCopy: { color: MUTED, fontSize: 15, lineHeight: 22, fontWeight: "700", marginTop: 8, marginBottom: 22 },
  pageContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 32 },
  centeredState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  centeredTitle: { color: BRAND_DEEP, fontSize: 24, fontWeight: "900", marginTop: 18 },
  centeredCopy: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 8 },
  pendingHero: { borderRadius: 24, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", padding: 22, alignItems: "center", marginBottom: 14 },
  pendingBadge: { width: 74, height: 74, borderRadius: 37, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  pendingTitle: { color: BRAND_DEEP, fontSize: 24, fontWeight: "900", textAlign: "center", marginTop: 16 },
  pendingCopy: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 10 },
  activeOrderId: { color: "#dc2626", fontSize: 25, lineHeight: 31, fontWeight: "900", letterSpacing: 0.6, marginBottom: 14 },
  detailSectionNav: { flexDirection: "row", gap: 10, marginBottom: 18 },
  detailSectionButton: { flex: 1, minHeight: 76, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  detailSectionButtonActive: { borderColor: BRAND_ORANGE, backgroundColor: "#FEC104" },
  detailSectionText: { color: BRAND_DEEP, fontSize: 11, fontWeight: "900", textAlign: "center" },
  detailSectionTextActive: { color: "#111111" },
  header: { minHeight: 58, flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  roundIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { color: BRAND_DEEP, fontSize: 24, fontWeight: "900" },
  headerSubtitle: { color: MUTED, fontSize: 13, fontWeight: "700", marginTop: 4, lineHeight: 19 },
  card: { borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  accentCard: { borderColor: "#efcf92", backgroundColor: "#fffaf0" },
  button: { minHeight: 50, borderRadius: 15, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 14, marginTop: 12 },
  secondaryButton: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  dangerButton: { backgroundColor: "#fff1f1", borderWidth: 1, borderColor: "#ffd1d1" },
  disabledButton: { opacity: 0.5 },
  buttonText: { color: "#111111", fontSize: 14, fontWeight: "900" },
  secondaryButtonText: { color: BRAND_DEEP },
  dangerButtonText: { color: "#b91c1c" },
  textButton: { alignItems: "center", marginTop: 16 },
  linkText: { color: BRAND_ORANGE, fontSize: 13, fontWeight: "900" },
  mutedText: { color: MUTED },
  formLabel: { color: MUTED, fontSize: 12, fontWeight: "900", letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  fieldBlock: { marginBottom: 4 },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: BORDER, backgroundColor: "#fbfdff", paddingHorizontal: 16, color: BRAND_DEEP, fontSize: 15, fontWeight: "800" },
  textArea: { minHeight: 92, paddingTop: 14, lineHeight: 20 },
  inputButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: BORDER, backgroundColor: "#fbfdff", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inputButtonText: { color: BRAND_DEEP, fontSize: 15, fontWeight: "800" },
  placeholderText: { color: "#98a4b6" },
  dateDoneButton: { alignSelf: "flex-end", height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#efbd65", justifyContent: "center", marginTop: 8 },
  phoneField: { height: 54, borderRadius: 17, borderWidth: 1, borderColor: BORDER, backgroundColor: "#fbfdff", flexDirection: "row", alignItems: "center", marginBottom: 12 },
  phonePrefix: { width: 58, textAlign: "center", color: BRAND_DEEP, fontSize: 15, fontWeight: "900" },
  phoneDivider: { width: 1, height: 28, backgroundColor: BORDER },
  phoneInput: { flex: 1, height: 52, color: BRAND_DEEP, fontSize: 15, fontWeight: "800", paddingHorizontal: 14 },
  otpInput: { height: 58, borderRadius: 17, borderWidth: 1, borderColor: BORDER, backgroundColor: "#fbfdff", color: BRAND_DEEP, fontSize: 24, fontWeight: "900", textAlign: "center", letterSpacing: 4, marginBottom: 4 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  choiceChip: { minHeight: 38, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  choiceChipActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc" },
  choiceText: { color: MUTED, fontSize: 12, fontWeight: "900" },
  choiceTextActive: { color: BRAND_ORANGE },
  statusRow: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, borderBottomWidth: 1, borderBottomColor: "#eef2f7" },
  statusLabel: { color: MUTED, fontSize: 13, fontWeight: "700", flex: 1 },
  statusValue: { color: BRAND_DEEP, fontSize: 13, fontWeight: "900", maxWidth: "58%", textAlign: "right" },
  twoCol: { flexDirection: "row", gap: 10 },
  flexOne: { flex: 1, minWidth: 0 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "#111111", overflow: "hidden", marginTop: 14, marginBottom: 4 },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: BRAND_ORANGE },
  switchRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 },
  noticeText: { color: "#8a5600", backgroundColor: "#fff4dc", overflow: "hidden", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12, lineHeight: 18, fontWeight: "900", marginTop: 12 },
  navRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  documentBox: { minHeight: 104, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", flexDirection: "row", alignItems: "center", gap: 12, padding: 10, marginTop: 10, overflow: "hidden" },
  documentPreview: { width: 76, height: 76, flexShrink: 0, borderRadius: 14, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  documentImage: { width: "100%", height: "100%" },
  documentBody: { flex: 1, minWidth: 0 },
  docActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  docButton: { flex: 1, minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: "#efbd65", backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  docButtonText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" },
  mlKitPanel: { minHeight: 62, borderRadius: 15, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, marginTop: 14 },
  mlKitText: { color: MUTED, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  tutorialRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f3dfb9" },
  tutorialNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_ORANGE, color: "#111111", textAlign: "center", lineHeight: 26, overflow: "hidden", fontSize: 12, fontWeight: "900" },
  tutorialText: { flex: 1, color: BRAND_DEEP, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  heroCard: { minHeight: 156, borderRadius: 24, backgroundColor: BRAND_DEEP, padding: 20, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  heroLabel: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  heroTitle: { color: "#ffffff", fontSize: 26, fontWeight: "900", marginTop: 8 },
  heroCopy: { color: "#d6deea", fontSize: 13, lineHeight: 20, fontWeight: "700", marginTop: 8 },
  heroIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: { flex: 1, minHeight: 88, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 13, justifyContent: "center" },
  statLabel: { color: MUTED, fontSize: 12, fontWeight: "800" },
  statValue: { color: BRAND_ORANGE, fontSize: 20, fontWeight: "900", marginTop: 6 },
  greenText: { color: SUCCESS },
  blueText: { color: "#2563eb" },
  onlineBlock: { alignItems: "flex-end" },
  onlineText: { color: MUTED, fontSize: 11, fontWeight: "900", marginTop: 2 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconTile: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { color: BRAND_DEEP, fontSize: 15, fontWeight: "900" },
  prominentOrderId: { color: "#dc2626", fontSize: 22, lineHeight: 28, fontWeight: "900", letterSpacing: 0.5, marginBottom: 3 },
  cardMeta: { color: MUTED, fontSize: 12, fontWeight: "700", marginTop: 4 },
  cardCopy: { color: "#526276", fontSize: 13, lineHeight: 20, fontWeight: "700", marginTop: 4 },
  helperText: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", marginTop: 8 },
  cardDivider: { height: 1, backgroundColor: BORDER, marginVertical: 13 },
  statusPill: { overflow: "hidden", borderRadius: 14, backgroundColor: "#fff2d8", color: BRAND_ORANGE, paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: "900", textAlign: "center" },
  statusAccepted: { color: "#2563eb", backgroundColor: "#dbeafe" },
  statusCompleted: { color: SUCCESS, backgroundColor: "#dcfce7" },
  popupBackdrop: { flex: 1, backgroundColor: "rgba(7, 13, 24, 0.48)", alignItems: "center", justifyContent: "center", padding: 20 },
  popupCard: { width: "100%", maxWidth: 390, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", padding: 22, alignItems: "center" },
  popupIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  requestPopupCard: { width: "100%", maxWidth: 410, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", padding: 20 },
  popupIconSmall: { width: 48, height: 48, borderRadius: 18, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  popupEyebrow: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  popupTitle: { color: BRAND_DEEP, fontSize: 20, lineHeight: 26, fontWeight: "900", marginTop: 4 },
  popupCopy: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 10 },
  popupActions: { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
  popupActionButton: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  popupActionText: { color: "#111111", fontSize: 13, fontWeight: "900", textAlign: "center" },
  popupSecondaryButton: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  popupSecondaryText: { color: BRAND_DEEP },
  countCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  countText: { color: "#111111", fontSize: 16, fontWeight: "900" },
  countdownPanel: { minHeight: 68, borderRadius: 18, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#efcf92", flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginTop: 16 },
  countdownTitle: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900" },
  countdownCopy: { color: MUTED, fontSize: 11, lineHeight: 16, fontWeight: "700", marginTop: 3 },
  helperWarning: { color: "#8a5600", backgroundColor: "#fff4dc", overflow: "hidden", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12, lineHeight: 18, fontWeight: "900", marginTop: 10, marginBottom: 4 },
  orderCard: { borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 13 },
  priceText: { color: BRAND_ORANGE, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyState: { minHeight: 220, alignItems: "center", justifyContent: "center", padding: 22 },
  emptyTitle: { color: BRAND_DEEP, fontSize: 18, fontWeight: "900", marginTop: 12 },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  segment: { minHeight: 36, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", paddingHorizontal: 11 },
  segmentActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc" },
  segmentText: { color: MUTED, fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  segmentTextActive: { color: BRAND_ORANGE },
  checklistRow: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: "#ffffff", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13, marginTop: 10 },
  checklistCurrent: { borderColor: BRAND_ORANGE, backgroundColor: "#fff7e8" },
  checklistLocked: { opacity: 0.45, backgroundColor: "#eef1f5" },
  checklistLabel: { flex: 1, fontSize: 14, fontWeight: "900" },
  mapPreview: { minHeight: 150, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", alignItems: "center", justifyContent: "center", marginTop: 12 },
  mapPreviewText: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900", marginTop: 8 },
  routeWebView: { height: 300, borderRadius: 18, overflow: "hidden", backgroundColor: BRAND_DEEP, marginTop: 12 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  proofImage: { width: 82, height: 82, borderRadius: 14, backgroundColor: "#fff4dc" },
  sampleBlock: { borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", padding: 12, marginTop: 14 },
  qrBox: { alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: "#ffffff", padding: 22, marginTop: 14 },
  timelineRow: { flexDirection: "row", gap: 12, minHeight: 58 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#252525", alignItems: "center", justifyContent: "center" },
  timelineDotDone: { backgroundColor: BRAND_ORANGE },
  timelineTitle: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900" },
  walletValue: { color: BRAND_ORANGE, fontSize: 34, fontWeight: "900", marginTop: 8 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  tabs: { height: 74, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 6 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabText: { color: "#111827", fontSize: 10, fontWeight: "800", marginTop: 4 },
  activeTabText: { color: BRAND_ORANGE }
});
