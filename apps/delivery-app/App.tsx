import "./global.css";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import FaceDetection from "@react-native-ml-kit/face-detection";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView as RNScrollView,
  type ScrollViewProps,
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
import { registerIncomingRequestMessaging } from "./src/incoming-request/FirebaseMessaging";
import { IncomingRequestScreen } from "./src/incoming-request/IncomingRequestScreen";
import type { IncomingRequestPayload } from "./src/incoming-request/types";
import { useIncomingAlertPermissionGuide } from "./src/incoming-request/useIncomingAlertPermissionGuide";
import { NotificationProvider } from "./src/components/NotificationProvider";
import { useRegisterPushNotifications } from "./src/hooks/useRegisterPushNotifications";
import { configureForegroundNotificationHandler } from "./src/notifications/handlers";
import { createRealtimeSocket, type ConnectionStatus } from "./src/realtime";
import { playAppSound } from "./src/services/soundService";
import { requestOtpSchema, verifyOtpSchema } from "./src/shared";
import { useAppStore } from "./src/store";
import { getLanguageLabel, t, type AppLanguage } from "../../shared/src/localization";
import type { NotificationDestination } from "./src/utils/deepLinking";

type AuthStep = "login" | "otp";
type AppStage = "auth" | "loading" | "onboarding" | "pending" | "main";
type OnboardingStep = "personal" | "identity" | "license" | "vehicle" | "bank" | "preferences" | "tutorial" | "review";
type Tab = "home" | "orders" | "earnings" | "notifications" | "profile" | "transactions";
type ActiveOrderScreen = "summary" | "route" | "confirmations";
type DialogState = {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actions?: Array<{ label: string; variant?: "primary" | "secondary"; onPress?: () => void }>;
};
type DeliveryNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  taskId?: string;
  orderId?: string;
};
type CancellationAlert = { id: string; title: string; message: string };
type RequestOtpForm = z.input<typeof requestOtpSchema>;
type VerifyOtpForm = z.input<typeof verifyOtpSchema>;
type MediaDraft = { uri: string; name: string };
type IdentityType = "Aadhaar" | "PAN";

const DELIVERY_FAILURE_REASONS = [
  "Customer not available",
  "Customer requested later today",
  "Customer requested tomorrow",
  "Phone unreachable",
  "Wrong address",
  "Customer cancelled",
  "Other"
] as const;

type DeliveryMedia = { url: string; publicId?: string; resourceType: "image" | "video"; bytes?: number; format?: string; originalName?: string };
type DeliveryRequest = {
  id: string;
  orderId: string;
  type: "customer_to_tailor" | "tailor_to_customer";
  taskStatus: "pending" | "accepted" | "picked_up" | "delivered" | "cancelled";
  shift: "morning" | "evening";
  serviceLevel?: "STANDARD" | "EXPRESS" | "INSTANT";
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
  paymentMethod?: "UPI" | "COD" | "ONLINE";
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  totalAmount?: number;
  cashCollectionRequired?: boolean;
  cashCollected?: boolean;
  cashCollectedAt?: string;
  sampleProvided?: boolean;
  sampleMedia?: DeliveryMedia[];
  clothPhotos?: DeliveryMedia[];
  samplePhotos?: DeliveryMedia[];
  deliveryPhotos?: DeliveryMedia[];
  itemCount?: number;
  pickupOtpVerifiedAt?: string;
  dropOtpVerifiedAt?: string;
  deadlineAt?: string;
  deliveredAt?: string;
  acceptedAt?: string;
  createdAt?: string;
  notificationSentAt?: string;
  batchId?: string;
  deliveryType?: "PICKUP" | "DROP";
  deliveryRound?: string;
  roundAt?: string;
  assignedArea?: string;
  batchOrdersCount?: number;
  batchEstimatedEarnings?: number;
  batchArea?: string;
  retryStatus?: "ACTIVE" | "PENDING_RETRY" | "ACTION_REQUIRED" | "CANCELLED" | "RESOLVED";
  retryCount?: number;
  lastFailureReason?: string;
  nextScheduledBatch?: string;
  routePosition?: number;
  routeTotal?: number;
  etaWindowStart?: string;
  etaWindowEnd?: string;
};

type DeliveryTaskPayload = Omit<DeliveryRequest, "tailoringRequestId" | "leg" | "status"> & {
  tailoringRequestId?: string;
  leg?: DeliveryRequest["leg"];
  status?: DeliveryRequest["status"];
  batchTasks?: DeliveryTaskPayload[];
};

type DeliveryProfile = {
  id: string;
  vehicleNumber?: string;
  isAvailable?: boolean;
  rating?: number;
  dailyEarnings?: number;
  weeklyEarnings?: number;
  monthlyEarnings?: number;
  totalEarnings?: number;
  withdrawableBalance?: number;
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

function getKolkataHour(): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "numeric"
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    if (hourPart) {
      const h = Number(hourPart.value);
      return h === 24 ? 0 : h;
    }
  } catch (e) {
    // fallback
  }
  return new Date().getHours();
}

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

function normalizeDeliveryTaskPayloads(payload: DeliveryTaskPayload): DeliveryRequest[] {
  const tasks = Array.isArray(payload.batchTasks) && payload.batchTasks.length ? payload.batchTasks : [payload];
  return tasks.map((task) => normalizeDeliveryTask({
    ...task,
    batchId: task.batchId ?? payload.batchId,
    deliveryRound: task.deliveryRound ?? payload.deliveryRound,
    roundAt: task.roundAt ?? payload.roundAt,
    assignedArea: task.assignedArea ?? payload.assignedArea ?? payload.batchArea,
    batchOrdersCount: task.batchOrdersCount ?? payload.batchOrdersCount ?? tasks.length,
    batchEstimatedEarnings: task.batchEstimatedEarnings ?? payload.batchEstimatedEarnings,
    batchArea: task.batchArea ?? payload.batchArea ?? payload.assignedArea
  }));
}

function mergeDeliveryRequests(current: DeliveryRequest[], incoming: DeliveryRequest[]) {
  const incomingIds = new Set(incoming.map((request) => request.id));
  return [...incoming, ...current.filter((request) => !incomingIds.has(request.id))];
}

function isBatchOfferRequest(request?: DeliveryRequest) {
  return Boolean(request?.batchId && request.taskStatus === "pending" && request.serviceLevel !== "INSTANT");
}

function requestPresentationKey(request: DeliveryRequest) {
  return isBatchOfferRequest(request) ? `${request.batchId}:${request.notificationSentAt ?? request.createdAt ?? request.id}` : request.id;
}

function deliveryItemCount(request: DeliveryRequest) {
  const explicit = Number(request.itemCount ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(1, Math.round(explicit));
  const match = String(request.clothType ?? "").match(/^(\d+)\s+clothing items/i);
  if (match) return Math.max(1, Number(match[1]));
  return 1;
}

function routeSortTime(value?: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function formatTimestamp(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function TimestampBadge({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.timestampBadge}>
      <Ionicons name="time-outline" size={13} color="#b91c1c" />
      <Text style={styles.timestampBadgeText}>{label}: {formatTimestamp(value)}</Text>
    </View>
  );
}

function sortDeliveryTasksForRoute(list: DeliveryRequest[]) {
  return [...list].sort((a, b) => {
    const priorityA = a.routePosition ?? Number.MAX_SAFE_INTEGER;
    const priorityB = b.routePosition ?? Number.MAX_SAFE_INTEGER;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return routeSortTime(a.roundAt ?? a.createdAt) - routeSortTime(b.roundAt ?? b.createdAt);
  });
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
const MIN_ANDROID_BOTTOM_INSET = Platform.OS === "android" ? 28 : 0;

type PullToRefreshState = {
  refreshing: boolean;
  onRefresh?: () => void;
};

const PullToRefreshContext = createContext<PullToRefreshState>({ refreshing: false });

const ScrollView = forwardRef<RNScrollView, ScrollViewProps>(function AppScrollView({ refreshControl, horizontal, ...props }, ref) {
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
          onRefresh={pullToRefresh.onRefresh ?? (() => undefined)}
        />
      ) : refreshControl}
      {...props}
    />
  );
});

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
  return Number(request.estimatedEarnings ?? 0);
}

function incomingPayloadFromDeliveryRequest(request?: DeliveryRequest): IncomingRequestPayload | undefined {
  if (!request) return undefined;
  const isBatchOffer = isBatchOfferRequest(request);
  const requestType = request.type === "customer_to_tailor" ? "pickup" : "delivery";
  const roundLabel = request.deliveryRound === "ONE_PM" ? "1 PM" : request.deliveryRound === "SIX_PM" ? "6 PM" : request.deliveryRound ?? "Batch";
  const housesCount = Number(request.batchOrdersCount ?? request.routeTotal ?? request.itemCount ?? 1);
  const earningTotal = Number(request.batchEstimatedEarnings ?? request.estimatedEarnings ?? 0);
  const expiresAt = new Date(Date.now() + 30_000).toISOString();

  if (isBatchOffer) {
    return {
      id: requestPresentationKey(request),
      orderId: request.orderId,
      requestType,
      title: `Incoming ${requestType === "pickup" ? "Pickup" : "Delivery"} Request`,
      subtitle: `${roundLabel} batch offer`,
      expiresAt,
      rows: [
        { icon: "people-outline", label: "Customer", value: `${housesCount} ${housesCount === 1 ? "house" : "houses"}` },
        { icon: "location-outline", label: "Pickup", value: request.batchArea ?? request.assignedArea ?? "Assigned area" },
        { icon: "navigate-outline", label: "Drop", value: request.deliveryType === "DROP" ? "Customer route" : "Tailor route" },
        { icon: "map-outline", label: "Distance", value: request.estimatedDistanceKm ? `${request.estimatedDistanceKm.toFixed(1)} km` : "Route optimized" },
        { icon: "time-outline", label: "ETA", value: request.etaWindowStart && request.etaWindowEnd ? `${formatTimestamp(request.etaWindowStart)} - ${formatTimestamp(request.etaWindowEnd)}` : roundLabel },
        { icon: "cash-outline", label: "Earnings", value: `Rs ${earningTotal.toFixed(0)}` },
        { icon: "receipt-outline", label: "Value", value: request.totalAmount ? `Rs ${Number(request.totalAmount).toFixed(0)}` : paymentLabel(request) },
        { icon: "flash-outline", label: "Type", value: request.serviceLevel ?? "STANDARD" }
      ]
    };
  }

  return {
    id: request.id,
    orderId: request.orderId,
    requestType,
    title: `Incoming ${requestType === "pickup" ? "Pickup" : "Delivery"} Request`,
    subtitle: "You have a new order",
    expiresAt,
    rows: [
      { icon: "person-outline", label: "Customer", value: request.customerName ?? "Customer" },
      { icon: "location-outline", label: "Pickup", value: request.pickupAddress },
      { icon: "navigate-outline", label: "Drop", value: request.dropAddress },
      { icon: "map-outline", label: "Distance", value: request.estimatedDistanceKm ? `${request.estimatedDistanceKm.toFixed(1)} km` : "Calculated on route" },
      { icon: "time-outline", label: "ETA", value: request.deadlineAt ? formatTimestamp(request.deadlineAt) : "12 hours after accept" },
      { icon: "cash-outline", label: "Earnings", value: `Rs ${requestEarning(request).toFixed(0)}` },
      { icon: "receipt-outline", label: "Value", value: request.totalAmount ? `Rs ${Number(request.totalAmount).toFixed(0)}` : paymentLabel(request) },
      { icon: "flash-outline", label: "Type", value: request.serviceLevel ?? "STANDARD" }
    ]
  };
}

function taskCompletedAt(request: DeliveryRequest) {
  const value = request.deliveredAt ?? request.createdAt;
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isAfterDate(value: Date | undefined, threshold: Date) {
  return Boolean(value && value >= threshold);
}

function paymentLabel(request: DeliveryRequest) {
  if (request.paymentMethod === "COD") {
    if (request.cashCollectionRequired) return request.cashCollected ? "COD cash collected" : `COD cash collect Rs ${Number(request.totalAmount ?? 0).toFixed(0)}`;
    return "COD on final delivery";
  }
  if (request.paymentStatus === "PAID") return "Online paid";
  if (request.paymentMethod) return `${request.paymentMethod} payment pending`;
  return "Payment not specified";
}

function paymentTone(request: DeliveryRequest) {
  if (request.paymentMethod === "COD" && request.cashCollectionRequired && !request.cashCollected) return { color: "#b91c1c", backgroundColor: "#fee2e2" };
  if (request.paymentMethod === "COD") return { color: "#c2410c", backgroundColor: "#ffedd5" };
  if (request.paymentStatus === "PAID") return { color: SUCCESS, backgroundColor: "#dcfce7" };
  return { color: "#1d4ed8", backgroundColor: "#dbeafe" };
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
      <StatusBar barStyle="dark-content" backgroundColor={SCREEN_BG} translucent />
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

function Card({ children, accent = false, style }: { children: ReactNode; accent?: boolean; style?: any }) {
  return <View style={[styles.card, accent && styles.accentCard, style]}>{children}</View>;
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
  multiline = false,
  readOnly = false
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  multiline?: boolean;
  readOnly?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea, readOnly && styles.inputReadOnly]}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor="#9aa6b8"
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
        editable={!readOnly}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fallback = maximumDate ? new Date(1995, 0, 1) : new Date();
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.formLabel}>{label}</Text>
      <Pressable style={[styles.inputButton, disabled && styles.inputReadOnly]} onPress={() => !disabled && setOpen(true)}>
        <Text style={[styles.inputButtonText, !value && styles.placeholderText]}>{value || "Select date"}</Text>
        <Ionicons name="calendar-outline" size={18} color={disabled ? "#9aa6b8" : BRAND_ORANGE} />
      </Pressable>
      {open && !disabled ? (
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
      {open && !disabled && Platform.OS === "ios" ? (
        <Pressable style={styles.dateDoneButton} onPress={() => setOpen(false)}>
          <Text style={styles.linkText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ChoiceGroup({ options, value, onChange, disabled = false }: { options: string[]; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <View style={styles.choiceRow}>
      {options.map((option) => (
        <Pressable style={[styles.choiceChip, value === option && styles.choiceChipActive, disabled && styles.choiceChipDisabled]} key={option} onPress={() => !disabled && onChange(option)} disabled={disabled}>
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
  const language = useAppStore((state) => state.language);
  const hasSelectedLanguage = useAppStore((state) => state.hasSelectedLanguage);
  const setLanguagePreference = useAppStore((state) => state.setLanguagePreference);
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
        {!hasSelectedLanguage ? <LanguageSelectorCard language={language} onSelect={setLanguagePreference} /> : null}
        <Card>
          {step === "login" ? (
            <>
              <Text style={styles.formLabel}>{t(language, "login")}</Text>
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
                      placeholder={t(language, "enterMobileNumber")}
                      placeholderTextColor="#9aa6b8"
                      value={field.value}
                    />
                  </View>
                )}
              />
              <PrimaryButton icon="chevron-forward" label={t(language, "sendOtp")} loading={loading} onPress={requestForm.handleSubmit(requestOtp, () => showDialog({ title: "Invalid number", message: t(language, "invalidMobileNumber"), icon: "call-outline" }))} />
            </>
          ) : (
            <>
              <Text style={styles.formLabel}>{t(language, "verifyOtp")}</Text>
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
              <PrimaryButton icon="shield-checkmark-outline" label={t(language, "verifyOtpButton")} loading={loading} onPress={verifyForm.handleSubmit(verify, () => showDialog({ title: "OTP required", message: t(language, "otpRequired"), icon: "shield-checkmark-outline" }))} />
              <Pressable style={styles.textButton} disabled={timer > 0} onPress={() => requestForm.handleSubmit(requestOtp)()}>
                <Text style={[styles.linkText, timer > 0 && styles.mutedText]}>{timer > 0 ? `Resend OTP in ${timer}s` : t(language, "sendOtp")}</Text>
              </Pressable>
            </>
          )}
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function LanguageSelectorCard({ language, onSelect }: { language: AppLanguage; onSelect: (language: AppLanguage) => void }) {
  return (
    <Card>
      <Text style={styles.formLabel}>{t(language, "chooseLanguage")}</Text>
      <Text style={[styles.mutedText, { marginBottom: 14 }]}>{t(language, "chooseLanguageCopy")}</Text>
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
            onPress={() => onSelect(option)}
          >
            <Text style={{ color: language === option ? BRAND_DEEP : MUTED, fontWeight: "800" }}>{getLanguageLabel(option)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.mutedText, { marginTop: 10 }]}>{t(language, "languagePreferenceSaved")}</Text>
    </Card>
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
  const verificationStatus = me?.deliveryProfile?.verificationStatus;
  const isLocked = verificationStatus === "PENDING" || verificationStatus === "VERIFIED";
  const profile = me?.deliveryProfile;
  const rejectionReason = profile?.verificationRejectionReason;
  const initialData = useMemo(() => onboardingFromProfile(profile), [profile]);
  const reuploadRequired = profile?.verificationStatus === "REJECTED" || profile?.verificationStatus === "REUPLOAD_REQUIRED";
  const initialStep = reuploadRequired ? 1 : Math.min(Math.max(Number((profile?.verificationDraft as { step?: number } | undefined)?.step ?? 1) - 1, 0), onboardingSteps.length - 1);
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

  function confirmFaceProfilePhoto(action: () => void) {
    Alert.alert(
      "Profile photo notice",
      "This face verification photo will become your permanent Darji profile photo. Make sure your face is clear and well lit.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: action }
      ]
    );
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
        {isLocked ? (
          <View style={styles.lockedBanner}>
            <Ionicons name="lock-closed-outline" size={16} color="#92400e" />
            <Text style={styles.lockedBannerText}>Submitted – awaiting admin review. Details are read-only.</Text>
          </View>
        ) : null}
        {!isLocked && (profile?.verificationStatus === "REJECTED" || profile?.verificationStatus === "REUPLOAD_REQUIRED") ? (
          <Text style={styles.noticeText}>
            Document reupload required. {rejectionReason ?? "Darji admin requested clearer documents. Please review your details and submit again."}
          </Text>
        ) : null}
        {!isLocked && currentStepError && step.key !== "review" ? <Text style={styles.helperWarning}>Complete this step to continue.</Text> : null}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((stepIndex + 1) / onboardingSteps.length) * 100}%` }]} />
        </View>

        {step.key === "personal" ? (
          <Card>
            <Field label="Full name" onChange={(value) => update("fullName", value)} value={data.fullName} readOnly={isLocked} />
            <DateField label="Date of birth" maximumDate={new Date()} onChange={(value) => update("dob", value)} value={data.dob} disabled={isLocked} />
            <Text style={styles.formLabel}>Gender</Text>
            <ChoiceGroup onChange={(value) => update("gender", value)} options={["Male", "Female", "Other"]} value={data.gender} disabled={isLocked} />
            <Field label="Email" keyboardType="email-address" onChange={(value) => update("email", value)} value={data.email} readOnly={isLocked} />
            <Field label="Emergency contact" keyboardType="phone-pad" onChange={(value) => update("emergencyContact", value.replace(/\D/g, "").slice(0, 10))} value={data.emergencyContact} readOnly={isLocked} />
            <Field label="Address" multiline onChange={(value) => update("address", value)} value={data.address} readOnly={isLocked} />
            {!isLocked ? <PrimaryButton icon="location-outline" label="Use Current Location" loading={locatingAddress} disabled={locatingAddress} onPress={() => void fillCurrentLocation()} variant="secondary" /> : null}
            <View style={styles.twoCol}>
              <View style={styles.flexOne}><Field label="City" onChange={(value) => update("city", value)} value={data.city} readOnly={isLocked} /></View>
              <View style={styles.flexOne}><Field label="State" onChange={(value) => update("state", value)} value={data.state} readOnly={isLocked} /></View>
            </View>
            <Field label="Pincode" keyboardType="number-pad" onChange={(value) => update("pincode", value.replace(/\D/g, "").slice(0, 6))} value={data.pincode} readOnly={isLocked} />
          </Card>
        ) : null}

        {step.key === "identity" ? (
          <Card>
            <Text style={styles.formLabel}>Choose one ID</Text>
            <ChoiceGroup
              onChange={(value) => setData((current) => ({ ...current, identityType: value as IdentityType, identityFront: undefined, identityBack: undefined, ocrStatus: "Waiting for document" }))}
              options={["Aadhaar", "PAN"]}
              value={data.identityType}
              disabled={isLocked}
            />
            {data.identityType === "Aadhaar" ? (
              <>
                <DocumentBox label="Aadhaar front" media={data.identityFront} loading={uploadingMediaKey === "identityFront"} onCamera={() => void pickMedia("identityFront", "camera", "identity")} onGallery={() => void pickMedia("identityFront", "gallery", "identity")} disabled={isLocked} />
                <DocumentBox label="Aadhaar back" media={data.identityBack} loading={uploadingMediaKey === "identityBack"} onCamera={() => void pickMedia("identityBack", "camera", "identity")} onGallery={() => void pickMedia("identityBack", "gallery", "identity")} disabled={isLocked} />
                <Field label="Aadhaar number" keyboardType="number-pad" onChange={(value) => update("aadhaarNumber", value.replace(/\D/g, "").slice(0, 12))} value={data.aadhaarNumber} readOnly={isLocked} />
              </>
            ) : (
              <>
                <DocumentBox label="PAN card" media={data.identityFront} loading={uploadingMediaKey === "identityFront"} onCamera={() => void pickMedia("identityFront", "camera", "identity")} onGallery={() => void pickMedia("identityFront", "gallery", "identity")} disabled={isLocked} />
                <Field label="PAN number" onChange={(value) => update("panNumber", value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} value={data.panNumber} readOnly={isLocked} />
              </>
            )}
            <DocumentBox label="Selfie" media={data.facePhoto} loading={uploadingMediaKey === "facePhoto"} onCamera={() => confirmFaceProfilePhoto(() => void pickMedia("facePhoto", "camera", "face"))} onGallery={() => confirmFaceProfilePhoto(() => void pickMedia("facePhoto", "gallery", "face"))} disabled={isLocked} />
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
            <DocumentBox label="License front" media={data.licenseFront} loading={uploadingMediaKey === "licenseFront"} onCamera={() => void pickMedia("licenseFront", "camera", "license")} onGallery={() => void pickMedia("licenseFront", "gallery", "license")} disabled={isLocked} />
            <DocumentBox label="License back" media={data.licenseBack} loading={uploadingMediaKey === "licenseBack"} onCamera={() => void pickMedia("licenseBack", "camera", "license")} onGallery={() => void pickMedia("licenseBack", "gallery", "license")} disabled={isLocked} />
            <Field label="License number" onChange={(value) => update("licenseNumber", value.toUpperCase())} value={data.licenseNumber} readOnly={isLocked} />
            <DateField label="Expiry date" minimumDate={new Date()} onChange={(value) => update("licenseExpiry", value)} value={data.licenseExpiry} disabled={isLocked} />
          </Card>
        ) : null}

        {step.key === "vehicle" ? (
          <Card>
            <Text style={styles.formLabel}>Vehicle type</Text>
            <ChoiceGroup onChange={(value) => update("vehicleType", value)} options={["Bicycle", "Scooter", "Motorcycle", "Car"]} value={data.vehicleType} disabled={isLocked} />
            <Field label="Vehicle number" onChange={(value) => update("vehicleNumber", value.toUpperCase())} value={data.vehicleNumber} readOnly={isLocked} />
            <Field label="Vehicle model" onChange={(value) => update("vehicleModel", value)} value={data.vehicleModel} readOnly={isLocked} />
            <DocumentBox label="RC image" media={data.rcPhoto} loading={uploadingMediaKey === "rcPhoto"} onCamera={() => void pickMedia("rcPhoto", "camera")} onGallery={() => void pickMedia("rcPhoto", "gallery")} disabled={isLocked} />
            <DocumentBox label="Insurance image" media={data.insurancePhoto} loading={uploadingMediaKey === "insurancePhoto"} onCamera={() => void pickMedia("insurancePhoto", "camera")} onGallery={() => void pickMedia("insurancePhoto", "gallery")} disabled={isLocked} />
          </Card>
        ) : null}

        {step.key === "bank" ? (
          <Card>
            <Field label="Account holder name" onChange={(value) => update("accountHolder", value)} value={data.accountHolder} readOnly={isLocked} />
            <Field label="Account number" keyboardType="number-pad" onChange={(value) => update("accountNumber", value.replace(/\D/g, ""))} value={data.accountNumber} readOnly={isLocked} />
            <Field label="IFSC code" onChange={(value) => update("ifsc", value.toUpperCase())} value={data.ifsc} readOnly={isLocked} />
            <Field label="UPI ID" onChange={(value) => update("upi", value)} value={data.upi} readOnly={isLocked} />
          </Card>
        ) : null}

        {step.key === "preferences" ? (
          <Card>
            <Text style={styles.formLabel}>Availability</Text>
            <ChoiceGroup onChange={(value) => update("availability", value)} options={["Full time", "Part time"]} value={data.availability} disabled={isLocked} />
            <Field label="Working hours" onChange={(value) => update("workingHours", value)} value={data.workingHours} readOnly={isLocked} />
            <Text style={styles.formLabel}>Preferred radius</Text>
            <ChoiceGroup onChange={(value) => update("radius", value)} options={["2 km", "5 km", "10 km"]} value={data.radius} disabled={isLocked} />
            <View style={styles.switchRow}>
              <Text style={styles.cardTitle}>Instant deliveries</Text>
              <Switch value={data.instantDeliveries} onValueChange={(value) => { if (!isLocked) update("instantDeliveries", value); }} disabled={isLocked} />
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
          {!isLocked ? (
            <View style={styles.flexOne}>
              <PrimaryButton label={step.key === "review" ? "Submit Verification" : "Next"} disabled={nextDisabled} loading={submitting} onPress={next} />
            </View>
          ) : null}
        </View>
        <Pressable
          style={{ alignItems: "center", marginTop: 20, paddingVertical: 10 }}
          onPress={() => {
            Alert.alert(
              "Login Confirmation",
              "Do you want to sign out and log in with another mobile number?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Yes, Logout", style: "destructive", onPress: onSessionExpired }
              ]
            );
          }}
        >
          <Text style={{ color: "#64748b", fontSize: 13, fontWeight: "800", textDecorationLine: "underline" }}>
            Login with another number
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function DocumentBox({ label, media, onGallery, onCamera, loading = false, disabled = false }: { label: string; media?: MediaDraft; onGallery: () => void; onCamera: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <View style={styles.documentBox}>
      <View style={styles.documentPreview}>
        {media ? <Image resizeMode="cover" source={{ uri: media.uri }} style={styles.documentImage} /> : <Ionicons name="image-outline" size={26} color={BRAND_ORANGE} />}
      </View>
      <View style={styles.documentBody}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text numberOfLines={1} style={styles.cardMeta}>{loading ? "Uploading..." : media ? media.name : "No photo selected"}</Text>
        {!disabled ? (
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
        ) : (
          <Text style={styles.docLockedText}>Read-only</Text>
        )}
      </View>
    </View>
  );
}

function HomeScreen({
  activeBatch,
  completedJobs,
  todayEarnings,
  totalEarnings,
  rating,
  online,
  onToggleOnline,
  onOpenBatch
}: {
  activeBatch?: {
    batchId: string;
    deliveryRound: string;
    roundAt: string;
    deliveryType: string;
    area: string;
    estimatedEarnings: number;
    status: string;
    requests: DeliveryRequest[];
  };
  completedJobs: number;
  todayEarnings: number;
  totalEarnings: number;
  rating: string;
  online: boolean;
  onToggleOnline: (value: boolean) => void;
  onOpenBatch: (batchId: string) => void;
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
        subtitle="Automatic batch routes assigned to your operational area"
        title="Delivery Hub"
      />
      <View style={styles.heroCard}>
        <View style={styles.flexOne}>
          <Text style={styles.heroLabel}>LIVE ROUTING</Text>
          <Text style={styles.heroTitle}>{activeBatch ? "Batch route active" : "Waiting for batch"}</Text>
          <Text style={styles.heroCopy}>Batches are assigned automatically based on scheduling rounds.</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="navigate-outline" size={32} color="#111111" />
        </View>
      </View>
      <View style={styles.statsRow}>
        <Stat label="Today" value={`Rs ${todayEarnings.toFixed(0)}`} />
        <Stat label="Completed" value={String(completedJobs)} tone="green" />
      </View>
      <View style={styles.statsRow}>
        <Stat label="Rating" value={rating} tone="blue" />
        <Stat label="Wallet" value={`Rs ${totalEarnings.toFixed(0)}`} />
      </View>
      {activeBatch ? (() => {
        const activeRequestsCount = activeBatch.requests.filter(r => r.taskStatus !== "delivered" && r.taskStatus !== "cancelled").length;
        return (
          <Card style={{ borderColor: "#10b981", borderWidth: 2 }}>
            <View style={styles.batchCountHero}>
              <Text style={styles.batchCountNumber}>{activeRequestsCount}</Text>
              <Text style={styles.batchCountLabel}>{activeRequestsCount === 1 ? "active request in this delivery" : "active requests in this delivery"}</Text>
            </View>
            <View style={styles.cardTopRow}>
              <View style={styles.iconTile}>
                <Ionicons name="cube-outline" size={22} color={BRAND_ORANGE} />
              </View>
              <View style={styles.cardMain}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <Text style={styles.cardTitle}>Active Batch</Text>
                  <View style={{
                    backgroundColor: activeBatch.deliveryRound === "ONE_PM" ? "#ecfdf5" : "#fff7ed",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: activeBatch.deliveryRound === "ONE_PM" ? "#a7f3d0" : "#ffedd5",
                  }}>
                    <Text style={{
                      color: activeBatch.deliveryRound === "ONE_PM" ? "#047857" : "#c2410c",
                      fontSize: 11,
                      fontWeight: "900",
                    }}>
                      {activeBatch.deliveryRound === "ONE_PM" ? "1 PM Batch" : "6 PM Batch"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>{activeRequestsCount} active {activeRequestsCount === 1 ? "request" : "requests"} remaining • Area: {activeBatch.area}</Text>
              </View>
              <StatusPill status="ACCEPTED" />
            </View>
            <View style={styles.cardDivider} />
            <StatusRow label="Logistics Type" value={activeBatch.deliveryType} />
            <StatusRow label="Operational Area" value={activeBatch.area} />
            <TimestampBadge label="Batch assigned" value={activeBatch.requests[0]?.acceptedAt ?? activeBatch.roundAt} />
            <PrimaryButton icon="navigate-outline" label="Open active batch" onPress={() => onOpenBatch(activeBatch.batchId)} />
          </Card>
        );
      })() : (
        <Card>
          <Text style={styles.cardTitle}>No active batch</Text>
          <Text style={styles.helperText}>Any rounds assigned to you will automatically appear here as active batches for your area.</Text>
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
  onViewDetails,
  onClose
}: {
  visible: boolean;
  request?: DeliveryRequest;
  accepting: boolean;
  onAccept: () => void;
  onViewDetails: () => void;
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
  const isBatchOffer = Boolean(request.batchId && request.taskStatus === "pending");
  const isInstant = request.serviceLevel === "INSTANT";
  const roundLabel = request.deliveryRound === "ONE_PM" ? "1 PM" : request.deliveryRound === "SIX_PM" ? "6 PM" : request.deliveryRound ?? "Batch";
  const housesCount = Number(request.batchOrdersCount ?? request.routeTotal ?? request.itemCount ?? 1);
  const earningTotal = Number(request.batchEstimatedEarnings ?? request.estimatedEarnings ?? 0);
  const areaLabel = request.batchArea ?? request.assignedArea ?? "All Areas";

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.popupBackdrop}>
        <View style={[styles.requestPopupCard, isInstant && styles.instantRequestPopupCard]}>
          <View style={styles.cardTopRow}>
            <View style={[styles.popupIconSmall, isInstant && styles.instantPopupIcon]}>
              <Ionicons name={isInstant ? "flash-outline" : "bicycle-outline"} size={24} color={isInstant ? "#dc2626" : BRAND_ORANGE} />
            </View>
            <View style={styles.cardMain}>
              <Text style={[styles.popupEyebrow, isInstant && styles.instantEyebrow]}>{isBatchOffer ? "BATCH OFFER" : isInstant ? "INSTANT DELIVERY" : "NEW DELIVERY"}</Text>
              <Text style={styles.popupTitle}>{isBatchOffer ? `${roundLabel} ${request.deliveryType === "DROP" ? "drop" : "pickup"} batch` : requestTitle(request)}</Text>
            </View>
            <View style={[styles.countCircle, isInstant && styles.instantCountCircle]}>
              <Text style={[styles.countText, isInstant && styles.instantCountText]}>{countdown}</Text>
            </View>
          </View>
          <View style={[styles.countdownPanel, isInstant && styles.instantCountdownPanel]}>
            <Ionicons name={isInstant ? "flash-outline" : "time-outline"} size={20} color={isInstant ? "#dc2626" : BRAND_ORANGE} />
            <View style={styles.flexOne}>
              <Text style={styles.countdownTitle}>{isBatchOffer ? `${housesCount} ${housesCount === 1 ? "house" : "houses"} in ${areaLabel}` : isInstant ? "Accept only if you can start now" : "12 hour deadline after accept"}</Text>
              <Text style={styles.countdownCopy}>{isBatchOffer ? `Estimated earning Rs ${earningTotal.toFixed(0)}` : `${request.clothType ?? "Clothes"} - ${request.workType ?? "Tailoring job"}`}</Text>
            </View>
          </View>
          {isBatchOffer ? (
            <>
              <StatusRow label="Round" value={roundLabel} />
              <StatusRow label="Area" value={areaLabel} />
              <StatusRow label="Houses" value={String(housesCount)} />
              <StatusRow label="Total earning" value={`Rs ${earningTotal.toFixed(0)}`} />
            </>
          ) : (
            <>
              <StatusRow label="Customer" value={request.customerName ?? "Customer"} />
              <StatusRow label="Tailor" value={request.tailorName ?? "Tailor"} />
              <StatusRow label="Pickup" value={request.pickupAddress} />
              <StatusRow label="Drop" value={request.dropAddress} />
              <StatusRow label="Distance" value={request.estimatedDistanceKm ? `${request.estimatedDistanceKm.toFixed(1)} km` : "Calculated when route opens"} />
              <StatusRow label="Expected earning" value={`Rs ${requestEarning(request)}`} />
            </>
          )}
          <Text style={[styles.paymentPill, paymentTone(request)]}>{paymentLabel(request)}</Text>
          <View style={styles.navRow}>
            <View style={styles.flexOne}><PrimaryButton icon="eye-outline" label="View details" onPress={onViewDetails} variant="danger" /></View>
            <View style={styles.flexOne}><PrimaryButton icon="checkmark-outline" label="Accept" loading={accepting} onPress={onAccept} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function BatchOfferModal({
  visible,
  request,
  accepting,
  onAccept,
  onViewDetails,
  onClose
}: {
  visible: boolean;
  request?: DeliveryRequest;
  accepting: boolean;
  onAccept: () => void;
  onViewDetails: () => void;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!visible) return undefined;
    setCountdown(30);
    const id = setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [visible, request?.batchId]);

  useEffect(() => {
    if (visible && countdown === 0) onClose();
  }, [countdown, onClose, visible]);

  if (!request) return null;

  const roundLabel = request.deliveryRound === "ONE_PM" ? "1 PM" : request.deliveryRound === "SIX_PM" ? "6 PM" : request.deliveryRound ?? "Batch";
  const housesCount = Number(request.batchOrdersCount ?? request.routeTotal ?? request.itemCount ?? 1);
  const earningTotal = Number(request.batchEstimatedEarnings ?? request.estimatedEarnings ?? 0);
  const areaLabel = request.batchArea ?? request.assignedArea ?? "All Areas";

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.popupBackdrop}>
        <View style={styles.requestPopupCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.popupIconSmall}>
              <Ionicons name="cube-outline" size={24} color={BRAND_ORANGE} />
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.popupEyebrow}>BATCH OFFER</Text>
              <Text style={styles.popupTitle}>{roundLabel} {request.deliveryType === "DROP" ? "drop" : "pickup"} batch</Text>
            </View>
            <View style={styles.countCircle}>
              <Text style={styles.countText}>{countdown}</Text>
            </View>
          </View>
          <View style={styles.countdownPanel}>
            <Ionicons name="map-outline" size={20} color={BRAND_ORANGE} />
            <View style={styles.flexOne}>
              <Text style={styles.countdownTitle}>{housesCount} {housesCount === 1 ? "house" : "houses"} in {areaLabel}</Text>
              <Text style={styles.countdownCopy}>Estimated earning Rs {earningTotal.toFixed(0)}</Text>
            </View>
          </View>
          <StatusRow label="Round" value={roundLabel} />
          <StatusRow label="Area" value={areaLabel} />
          <StatusRow label="Houses" value={String(housesCount)} />
          <StatusRow label="Total earning" value={`Rs ${earningTotal.toFixed(0)}`} />
          <View style={styles.navRow}>
            <View style={styles.flexOne}><PrimaryButton icon="eye-outline" label="View details" onPress={onViewDetails} variant="secondary" /></View>
            <View style={styles.flexOne}><PrimaryButton icon="checkmark-outline" label="Accept" loading={accepting} onPress={onAccept} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function BatchDetailsView({
  batch,
  accepting,
  onBack,
  onAcceptBatch,
  onOpenOrder
}: {
  batch: {
    batchId: string;
    deliveryRound: string;
    roundAt: string;
    deliveryType: string;
    area: string;
    estimatedEarnings: number;
    status: string;
    requests: DeliveryRequest[];
  };
  accepting: boolean;
  onBack: () => void;
  onAcceptBatch: (batch: { requests: DeliveryRequest[] }) => void;
  onOpenOrder: (order: DeliveryRequest) => void;
}) {
  const roundLabel = batch.deliveryRound === "ONE_PM" ? "1 PM Round" : "6 PM Round";
  const dateStr = new Date(batch.roundAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });

  const activeRequests = batch.requests.filter(r => r.taskStatus !== "delivered" && r.taskStatus !== "cancelled");
  const completedRequests = batch.requests.filter(r => r.taskStatus === "delivered");
  const cancelledRequests = batch.requests.filter(r => r.taskStatus === "cancelled");
  const isOffered = batch.requests.some((r) => r.taskStatus === "pending") && !batch.requests.some((r) => r.taskStatus === "accepted" || r.taskStatus === "picked_up");

  const renderStopCard = (request: DeliveryRequest, index: number) => {
    const priority = request.routePosition ?? index + 1;
    return (
      <Pressable key={request.id} style={styles.orderCard} onPress={() => onOpenOrder(request)}>
        <View style={styles.cardTopRow}>
          <View style={styles.roundIcon}>
            <Text style={styles.stopNumber}>{priority}</Text>
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.prominentOrderId}>REQ-{request.orderId.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.cardTitle}>{request.customerName || "Customer"}</Text>
            <Text style={styles.cardMeta}>Priority {priority}</Text>
            <Text style={styles.cardMeta}>{request.clothType} • {request.workType}</Text>
            <TimestampBadge label={request.acceptedAt ? "Assigned" : "Request created"} value={request.acceptedAt ?? request.createdAt} />
          </View>
          <StatusPill status={request.status} />
        </View>
        <View style={styles.cardDivider} />
        <Text style={styles.cardCopy} numberOfLines={2}>
          {batch.deliveryType === "PICKUP" 
            ? `Pickup: ${request.pickupAddress}` 
            : `Delivery: ${request.dropAddress}`}
        </Text>
        <View style={styles.rowBetween}>
          <Text style={styles.priceText}>Rs {requestEarning(request)}</Text>
          <Text style={[styles.paymentPill, paymentTone(request)]}>{paymentLabel(request)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header
        title="Batch Route"
        subtitle={`${roundLabel} • ${dateStr}`}
        onBack={onBack}
      />

      <View style={styles.heroCard}>
        <View style={styles.flexOne}>
          <Text style={styles.heroLabel}>BATCH ID: {batch.batchId.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.heroTitle}>{batch.deliveryRound === "ONE_PM" ? "1 PM Batch" : "6 PM Batch"}</Text>
          <Text style={styles.heroCopy}>{batch.requests.filter(r => r.taskStatus === "delivered" || r.taskStatus === "cancelled").length}/{batch.requests.length} orders completed • Route in {batch.area} ({batch.deliveryType === "PICKUP" ? "Pickup round" : "Drop round"})</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="map-outline" size={32} color="#111111" />
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Estimated Earnings" value={`Rs ${batch.estimatedEarnings.toFixed(0)}`} tone="green" />
        <Stat label="Type" value={batch.deliveryType} tone="blue" />
      </View>

      {isOffered ? (
        <PrimaryButton
          disabled={accepting}
          icon="checkmark-outline"
          label="Accept offer"
          loading={accepting}
          onPress={() => onAcceptBatch(batch)}
        />
      ) : null}

      {activeRequests.length > 0 ? (
        <>
          <Text style={[styles.cardTitle, { marginTop: 18, marginBottom: 8, color: BRAND_ORANGE }]}>Active Stops ({activeRequests.length})</Text>
          {activeRequests.map((r, i) => renderStopCard(r, i))}
        </>
      ) : null}

      {completedRequests.length > 0 ? (
        <>
          <Text style={[styles.cardTitle, { marginTop: 18, marginBottom: 8, color: "#10b981" }]}>Completed Stops ({completedRequests.length})</Text>
          {completedRequests.map((r, i) => renderStopCard(r, i))}
        </>
      ) : null}

      {cancelledRequests.length > 0 ? (
        <>
          <Text style={[styles.cardTitle, { marginTop: 18, marginBottom: 8, color: "#ef4444" }]}>Cancelled Stops ({cancelledRequests.length})</Text>
          {cancelledRequests.map((r, i) => renderStopCard(r, i))}
        </>
      ) : null}
    </ScrollView>
  );
}

function OrdersScreen({
  batches,
  onOpenBatch,
  onAcceptBatch,
  accepting,
  deliveryType
}: {
  batches: Array<{
    batchId: string;
    deliveryRound: string;
    roundAt: string;
    deliveryType: string;
    area: string;
    estimatedEarnings: number;
    status: string;
    isInstant?: boolean;
    requests: DeliveryRequest[];
  }>;
  onOpenBatch: (batchId: string) => void;
  onAcceptBatch: (batch: { requests: DeliveryRequest[] }) => void;
  accepting: boolean;
  deliveryType?: string;
}) {
  const [queue, setQueue] = useState<"active" | "history" | "cancelled">("active");
  const pullToRefresh = useContext(PullToRefreshContext);

  const visibleBatches = useMemo(() => {
    return batches.filter((b) => {
      if (queue === "active") return b.status === "active" || b.status === "offered";
      if (queue === "history") return b.status === "completed";
      return b.status === "cancelled";
    });
  }, [batches, queue]);

  return (
    <FlatList
      contentContainerStyle={styles.pageContent}
      data={visibleBatches}
      keyExtractor={(item) => item.batchId}
      refreshControl={
        <RefreshControl
          colors={[BRAND_ORANGE]}
          progressBackgroundColor="#fffaf0"
          refreshing={pullToRefresh.refreshing}
          tintColor={BRAND_ORANGE}
          title="Refreshing Darji..."
          titleColor={BRAND_DEEP}
          onRefresh={pullToRefresh.onRefresh}
        />
      }
      ListHeaderComponent={<>
        <Header subtitle={`${deliveryType || "PICKUP"} batch pickup and delivery workflow`} title="Delivery Batches" />
        <View style={styles.segmentRow}>
          {(["active", "history", "cancelled"] as const).map((item) => (
            <Pressable key={item} style={[styles.segment, queue === item && styles.segmentActive, item === "cancelled" && queue === item && styles.cancelledSegmentActive]} onPress={() => setQueue(item)}>
              <Text style={[styles.segmentText, queue === item && styles.segmentTextActive, item === "cancelled" && queue === item && styles.cancelledSegmentText]}>
                {item === "active" ? "Active Batches" : item === "history" ? "History" : "Cancelled"}
              </Text>
            </Pressable>
          ))}
        </View>
      </>}
      ListEmptyComponent={<EmptyState title={`No ${queue} batches`} copy="Batches are automatically assigned to your area during scheduling rounds." />}
      renderItem={({ item }) => {
        const currentHour = getKolkataHour();
        let expectedRound = "ONE_PM";
        if (currentHour >= 13 && currentHour < 18) {
          expectedRound = "SIX_PM";
        }
        
        const isInstant = item.isInstant || item.requests.some((request) => request.serviceLevel === "INSTANT");
        const isActiveTime = queue === "active" && !isInstant && item.deliveryRound === expectedRound;

        return (
        <Pressable 
          style={[
            styles.orderCard, 
            isInstant && styles.instantOrderCard,
            isActiveTime && { borderColor: "#10b981", borderWidth: 2 }
          ]} 
          onPress={() => onOpenBatch(item.batchId)}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.iconTile, isInstant && styles.instantIconTile]}>
              <Ionicons name={isInstant ? "flash-outline" : item.deliveryType === "PICKUP" ? "arrow-up-circle-outline" : "arrow-down-circle-outline"} size={22} color={isInstant ? "#dc2626" : isActiveTime ? "#10b981" : BRAND_ORANGE} />
            </View>
            <View style={styles.cardMain}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <Text style={styles.prominentOrderId}>{isInstant ? "INSTANT" : `BATCH-${item.batchId.slice(0, 8).toUpperCase()}`}</Text>
                <View style={{
                  backgroundColor: isInstant ? "#fee2e2" : item.deliveryRound === "ONE_PM" ? "#ecfdf5" : "#fff7ed",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isInstant ? "#fecaca" : item.deliveryRound === "ONE_PM" ? "#a7f3d0" : "#ffedd5",
                }}>
                  <Text style={{
                    color: isInstant ? "#b91c1c" : item.deliveryRound === "ONE_PM" ? "#047857" : "#c2410c",
                    fontSize: 11,
                    fontWeight: "900",
                  }}>
                    {isInstant ? "Instant" : item.deliveryRound === "ONE_PM" ? "1 PM Batch" : "6 PM Batch"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{item.requests.filter(r => r.taskStatus === "delivered" || r.taskStatus === "cancelled").length}/{item.requests.length} orders completed • Area: {item.area}</Text>
            </View>
            <StatusPill status={item.status === "active" ? "ACCEPTED" : item.status === "completed" ? "COMPLETED" : item.status === "offered" ? "OPEN" : "CANCELLED"} />
          </View>
          <View style={styles.cardDivider} />
          <TimestampBadge label={isInstant ? item.status === "active" ? "Instant assigned" : "Instant offered" : item.status === "active" ? "Batch assigned" : "Batch offered"} value={item.requests[0]?.acceptedAt ?? item.requests[0]?.notificationSentAt ?? item.roundAt} />
          <Text style={styles.cardCopy} numberOfLines={2}>
            {isInstant ? "Direct instant delivery request." : `Route contains ${item.requests.length} stop${item.requests.length !== 1 ? "s" : ""}.`}
          </Text>
          {item.status === "offered" ? (
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                disabled={accepting}
                icon="checkmark-outline"
                label="Accept offer"
                loading={accepting}
                onPress={() => onAcceptBatch(item)}
              />
            </View>
          ) : null}
          <View style={styles.rowBetween}>
            <Text style={styles.priceText}>Rs {item.estimatedEarnings.toFixed(0)}</Text>
            <Text style={styles.paymentPill}>Earnings</Text>
          </View>
        </Pressable>
        );
      }}
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
  const [deliveryProofs, setDeliveryProofs] = useState<MediaDraft[]>([]);
  const [otp, setOtp] = useState("");
  const [updating, setUpdating] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [failureReason, setFailureReason] = useState<(typeof DELIVERY_FAILURE_REASONS)[number] | "">("");
  const pickupOtpVerified = Boolean(order.pickupOtpVerifiedAt);
  const dropOtpVerified = Boolean(order.dropOtpVerifiedAt);
  const requiredPhotoCount = deliveryItemCount(order);
  const clothPhotoCount = order.clothPhotos?.length ?? 0;
  const deliveryPhotoCount = order.deliveryPhotos?.length ?? 0;
  const clothPhotosUploaded = clothPhotoCount >= requiredPhotoCount;
  const deliveryPhotosUploaded = order.type !== "tailor_to_customer" || deliveryPhotoCount >= requiredPhotoCount;
  const sampleRequired = order.sampleProvided === true;
  const samplePhotosUploaded = !sampleRequired || Boolean(order.samplePhotos?.length);
  const pickupChecklistComplete = pickupOtpVerified && (order.type === "tailor_to_customer" || (clothPhotosUploaded && samplePhotosUploaded));
  const needsCashCollection = order.type === "tailor_to_customer" && order.paymentMethod === "COD" && order.cashCollectionRequired === true && !order.cashCollected;
  const deliveryChecklistComplete = dropOtpVerified && !needsCashCollection && deliveryPhotosUploaded;

  async function addProof(kind: "cloth" | "sample" | "delivery", source: "camera" | "gallery") {
    if (kind === "delivery" ? !dropOtpVerified : !pickupOtpVerified) {
      showDialog({ title: "OTP required", message: kind === "delivery" ? "Verify the delivery OTP first." : "Verify the pickup OTP first.", icon: "shield-checkmark-outline" });
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
    const update = kind === "cloth" ? setClothProofs : kind === "sample" ? setSampleProofs : setDeliveryProofs;
    const maxPhotos = kind === "sample" ? 6 : requiredPhotoCount;
    update((current) => [...current, { uri: asset.uri, name: asset.fileName ?? `${kind}-${Date.now()}.jpg` }].slice(-maxPhotos));
  }

  async function verifyOtp() {
    if (updating) return;
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

  async function savePhotos(kind: "cloth" | "sample" | "delivery") {
    if (uploadingPhotos) return;
    const drafts = kind === "cloth" ? clothProofs : kind === "sample" ? sampleProofs : deliveryProofs;
    if (!drafts.length) {
      showDialog({ title: "Photos required", message: `Upload at least one ${kind} photo.`, icon: "images-outline" });
      return;
    }
    if ((kind === "cloth" || kind === "delivery") && drafts.length < requiredPhotoCount) {
      showDialog({ title: "More photos required", message: `Upload photo for item ${drafts.length + 1} of ${requiredPhotoCount}.`, icon: "images-outline" });
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
      else if (kind === "sample") setSampleProofs([]);
      else setDeliveryProofs([]);
      if (kind === "sample" || !sampleRequired) setScreen("confirmations");
    } catch (error) {
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not save photos.", icon: "cloud-upload-outline" });
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function advanceTask() {
    if (updating) return;
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

  async function confirmCashCollection() {
    if (updating) return;
    try {
      setUpdating(true);
      const updated = await api<DeliveryTaskPayload>(`/delivery-requests/${order.id}/cash-collection`, {
        method: "PATCH",
        body: JSON.stringify({ collected: true })
      }, token);
      onTaskUpdated(normalizeDeliveryTask(updated));
    } catch (error) {
      showDialog({ title: "Cash update failed", message: error instanceof Error ? error.message : "Could not confirm cash collection.", icon: "cash-outline" });
    } finally {
      setUpdating(false);
    }
  }

  async function markFailed() {
    if (!failureReason || updating) return;
    try {
      setUpdating(true);
      const updated = await api<DeliveryTaskPayload>(`/delivery-requests/${order.id}/fail`, {
        method: "POST",
        body: JSON.stringify({ reason: failureReason })
      }, token);
      setFailureModalOpen(false);
      setFailureReason("");
      onTaskUpdated(normalizeDeliveryTask(updated));
      showDialog({ title: "Delivery failure saved", message: "The order has been moved to the correct retry or admin queue.", icon: "refresh-circle-outline" });
    } catch (error) {
      showDialog({ title: "Failure update failed", message: error instanceof Error ? error.message : "Could not mark delivery failed.", icon: "alert-circle-outline" });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Screen>
      <Modal animationType="slide" transparent visible={failureModalOpen} onRequestClose={() => setFailureModalOpen(false)}>
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            <View style={styles.popupIcon}><Ionicons name="alert-circle-outline" size={28} color={BRAND_ORANGE} /></View>
            <Text style={styles.popupTitle}>Why did this delivery fail?</Text>
            <Text style={styles.popupCopy}>Select one reason. Darji will schedule the next attempt or send it to admin review.</Text>
            <View style={styles.reasonList}>
              {DELIVERY_FAILURE_REASONS.map((reason) => (
                <Pressable key={reason} style={[styles.reasonOption, failureReason === reason && styles.reasonOptionActive]} onPress={() => setFailureReason(reason)}>
                  <Ionicons name={failureReason === reason ? "radio-button-on" : "radio-button-off"} size={18} color={failureReason === reason ? BRAND_ORANGE : MUTED} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.dialogActions}>
              <Pressable style={[styles.dialogButton, styles.dialogSecondary]} onPress={() => setFailureModalOpen(false)}>
                <Text style={[styles.dialogButtonText, styles.dialogSecondaryText]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.dialogButton, !failureReason && styles.disabledButton]} disabled={!failureReason || updating} onPress={markFailed}>
                <Text style={styles.dialogButtonText}>{updating ? "Saving..." : "Save Failure"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Active job" subtitle={`${shortId(order.id)} - ${order.status}`} onBack={onBack} />
        <Text style={styles.activeOrderId}>REQ-{order.orderId.slice(0, 8).toUpperCase()}</Text>
        {order.taskStatus === "cancelled" || order.status === "CANCELLED" ? (
          <Card>
            <View style={styles.cancelledNoticeRow}>
              <Ionicons name="close-circle-outline" size={22} color="#b91c1c" />
              <View style={styles.flexOne}>
                <Text style={styles.cancelledNoticeTitle}>This delivery has been cancelled</Text>
                <Text style={styles.cancelledNoticeCopy}>Do not pick up, collect cash, or deliver this package.</Text>
              </View>
            </View>
          </Card>
        ) : null}
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
            <StatusRow label="Clothing items" value={`${requiredPhotoCount}`} />
            <StatusRow label="Payment" value={paymentLabel(order)} />
            <StatusRow label="Deadline" value={deadlineLabel(order.deadlineAt)} />
            {order.etaWindowStart && order.etaWindowEnd ? <StatusRow label="ETA" value={`${deadlineLabel(order.etaWindowStart)} - ${deadlineLabel(order.etaWindowEnd)}`} /> : null}
            {order.routePosition && order.routeTotal ? <StatusRow label="Priority" value={`${order.routePosition} of ${order.routeTotal}`} /> : null}
            <View style={styles.navRow}>
              <View style={styles.flexOne}><PrimaryButton icon="call-outline" label="Call pickup" onPress={() => Linking.openURL(`tel:${order.leg === "CUSTOMER_TO_TAILOR" ? order.customerPhone ?? "" : order.tailorPhone ?? ""}`)} variant="secondary" /></View>
              <View style={styles.flexOne}><PrimaryButton icon="navigate-outline" label="Route" onPress={() => openDirections(order.pickupAddress)} /></View>
            </View>
            {order.taskStatus === "accepted" || order.taskStatus === "picked_up" ? (
              <PrimaryButton icon="alert-circle-outline" label="Mark Failed" variant="danger" loading={updating} onPress={() => setFailureModalOpen(true)} />
            ) : null}
          </Card>
        ) : null}

        {screen === "route" ? (
          <Card accent>
            <Text style={styles.cardTitle}>Best route</Text>
            <Text style={styles.helperText}>Use Google Maps for live navigation. The in-app OpenStreetMap preview has been removed to avoid broken route loading.</Text>
            <StatusRow label="Customer Address" value={order.type === "customer_to_tailor" ? order.pickupAddress : order.dropAddress} />
            <StatusRow label="Tailor Address" value={order.type === "customer_to_tailor" ? order.dropAddress : order.pickupAddress} />
            <View style={styles.navRow}>
              <View style={styles.flexOne}><PrimaryButton icon="navigate-outline" label="Go to Customer" onPress={() => openDirections(order.type === "customer_to_tailor" ? order.pickupAddress : order.dropAddress)} variant="secondary" /></View>
              <View style={styles.flexOne}><PrimaryButton icon="flag-outline" label="Go to Tailor" onPress={() => openDirections(order.type === "customer_to_tailor" ? order.dropAddress : order.pickupAddress)} /></View>
            </View>
          </Card>
        ) : null}

        {screen === "confirmations" && order.taskStatus === "accepted" && order.type === "customer_to_tailor" && pickupOtpVerified && !pickupChecklistComplete ? (
          <Card>
            <Text style={styles.cardTitle}>Cloth photos</Text>
            <Text style={styles.helperText}>Upload one clear pickup photo per clothing item: {Math.min(clothProofs.length, requiredPhotoCount)}/{requiredPhotoCount} ready.</Text>
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
            {!clothPhotosUploaded ? <PrimaryButton icon="cloud-upload-outline" label={`Upload Pickup Photos (${clothProofs.length}/${requiredPhotoCount})`} loading={uploadingPhotos} disabled={clothProofs.length < requiredPhotoCount} onPress={() => savePhotos("cloth")} /> : <ChecklistRow label={`Pickup photos uploaded (${clothPhotoCount}/${requiredPhotoCount})`} complete />}
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

        {screen === "confirmations" && order.taskStatus === "picked_up" && order.type === "tailor_to_customer" && dropOtpVerified && !deliveryPhotosUploaded ? (
          <Card>
            <Text style={styles.cardTitle}>Final delivery photos</Text>
            <Text style={styles.helperText}>Upload one final handover photo per clothing item: {Math.min(deliveryProofs.length, requiredPhotoCount)}/{requiredPhotoCount} ready.</Text>
            <View style={styles.docActions}>
              <Pressable style={styles.docButton} onPress={() => addProof("delivery", "gallery")}>
                <Ionicons name="images-outline" size={15} color={BRAND_ORANGE} />
                <Text style={styles.docButtonText}>Gallery</Text>
              </Pressable>
              <Pressable style={styles.docButton} onPress={() => addProof("delivery", "camera")}>
                <Ionicons name="camera-outline" size={15} color={BRAND_ORANGE} />
                <Text style={styles.docButtonText}>Camera</Text>
              </Pressable>
            </View>
            <View style={styles.mediaGrid}>
              {deliveryProofs.map((proof) => <Image key={proof.uri} source={{ uri: proof.uri }} style={styles.proofImage} />)}
            </View>
            <PrimaryButton icon="cloud-upload-outline" label={`Upload Delivery Photos (${deliveryProofs.length}/${requiredPhotoCount})`} loading={uploadingPhotos} disabled={deliveryProofs.length < requiredPhotoCount} onPress={() => savePhotos("delivery")} />
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
                    <ChecklistRow label={`Upload Pickup Photos (${clothPhotoCount}/${requiredPhotoCount})`} complete={clothPhotosUploaded} current={pickupOtpVerified && !clothPhotosUploaded} locked={!pickupOtpVerified} />
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
                {order.type === "tailor_to_customer" && order.paymentMethod === "COD" ? (
                  <>
                    <ChecklistRow label="Collect COD Cash" complete={order.cashCollected === true} current={dropOtpVerified && needsCashCollection} locked={!dropOtpVerified} />
                    {needsCashCollection ? <PrimaryButton icon="cash-outline" label={`Confirm Cash Collected Rs ${Number(order.totalAmount ?? 0).toFixed(0)}`} loading={updating} onPress={confirmCashCollection} disabled={!dropOtpVerified} /> : null}
                  </>
                ) : null}
                {order.type === "tailor_to_customer" ? <ChecklistRow label={`Upload Delivery Photos (${deliveryPhotoCount}/${requiredPhotoCount})`} complete={deliveryPhotosUploaded} current={dropOtpVerified && !needsCashCollection && !deliveryPhotosUploaded} locked={!dropOtpVerified || needsCashCollection} /> : null}
                <ChecklistRow label={order.type === "customer_to_tailor" ? "Mark Delivered To Tailor" : "Mark Delivered"} complete={false} current={deliveryChecklistComplete} locked={!deliveryChecklistComplete} />
                <PrimaryButton icon="checkmark-done-outline" label={order.type === "customer_to_tailor" ? "Mark Delivered To Tailor" : "Mark Delivered"} loading={updating} onPress={advanceTask} disabled={!deliveryChecklistComplete} />
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

function EarningsScreen({ requests, me }: { requests: DeliveryRequest[]; me?: MeResponse }) {
  const [wallet, setWallet] = useState<any>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const delivered = useMemo(() => requests.filter((request) => request.taskStatus === "delivered"), [requests]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const week = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    return start;
  }, []);
  const month = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const todayEarnings = useMemo(
    () => delivered.reduce((sum, request) => sum + (isAfterDate(taskCompletedAt(request), today) ? requestEarning(request) : 0), 0),
    [delivered, today]
  );
  const weeklyEarnings = useMemo(
    () => delivered.reduce((sum, request) => sum + (isAfterDate(taskCompletedAt(request), week) ? requestEarning(request) : 0), 0),
    [delivered, week]
  );
  const monthlyEarnings = useMemo(
    () => delivered.reduce((sum, request) => sum + (isAfterDate(taskCompletedAt(request), month) ? requestEarning(request) : 0), 0),
    [delivered, month]
  );
  const totalEarnings = useMemo(() => delivered.reduce((sum, request) => sum + requestEarning(request), 0), [delivered]);
  const pickupJobs = delivered.filter((request) => request.type === "customer_to_tailor");
  const dropJobs = delivered.filter((request) => request.type === "tailor_to_customer");
  const averagePerJob = delivered.length ? totalEarnings / delivered.length : 0;
  const withdrawableBalance = Number(me?.deliveryProfile?.withdrawableBalance ?? totalEarnings);

  useEffect(() => {
    let mounted = true;
    setLoadingWallet(true);
    api<any>("/wallet")
      .then((data) => {
        if (mounted) setWallet(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoadingWallet(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header subtitle="Completed delivery payouts" title="Earnings" />
      <View style={styles.statsRow}>
        <Stat label="Wallet" value={`Rs ${Number(wallet?.balance ?? withdrawableBalance).toFixed(0)}`} />
        <Stat label="Weekly" value={`Rs ${Number(wallet?.currentWeekEarnings ?? weeklyEarnings).toFixed(0)}`} tone="green" />
      </View>
      <Card>
        <Text style={styles.cardTitle}>Weekly Settlement</Text>
        <StatusRow label="Pending amount" value={`Rs ${Number(wallet?.pendingAmount ?? wallet?.balance ?? withdrawableBalance).toFixed(0)}`} />
        <StatusRow label="Last payment" value={wallet?.lastPayment?.paidAt ? new Date(wallet.lastPayment.paidAt).toLocaleString("en-IN") : "Not paid yet"} />
        <StatusRow label="Monthly earned" value={`Rs ${monthlyEarnings.toFixed(0)}`} />
        <StatusRow label="Pickup jobs" value={String(pickupJobs.length)} />
        <StatusRow label="Drop jobs" value={String(dropJobs.length)} />
        <StatusRow label="Average per job" value={`Rs ${averagePerJob.toFixed(0)}`} />
        <StatusRow label="Completed jobs" value={String(delivered.length)} />
      </Card>
      <Card accent>
        <Text style={styles.cardMeta}>Wallet balance</Text>
        <Text style={styles.walletValue}>Rs {Number(wallet?.balance ?? withdrawableBalance).toFixed(0)}</Text>
        <Text style={styles.cardMeta}>Payments are settled weekly.</Text>
      </Card>
      {loadingWallet ? <ActivityIndicator color={BRAND_ORANGE} /> : null}
      <Card>
        <Text style={styles.cardTitle}>Wallet History</Text>
        {(wallet?.transactions ?? []).length === 0 ? <Text style={styles.cardMeta}>No wallet transactions yet.</Text> : null}
        {(wallet?.transactions ?? []).map((transaction: any) => (
          <StatusRow
            key={transaction.id}
            label={`${transaction.transactionType === "DEBIT" ? "-" : "+"} Rs ${Number(transaction.amount ?? 0).toFixed(0)}`}
            value={transaction.remarks ?? transaction.category}
          />
        ))}
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Previous Payments</Text>
        {(wallet?.payments ?? []).length === 0 ? <Text style={styles.cardMeta}>No weekly payments recorded yet.</Text> : null}
        {(wallet?.payments ?? []).map((payment: any) => (
          <View key={payment.id} style={styles.paymentProofRow}>
            <StatusRow
              label={`Rs ${Number(payment.amount ?? 0).toFixed(0)}`}
              value={payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-IN") : "Paid"}
            />
            {payment.receiptUrl ? (
              <PrimaryButton icon="image-outline" label="View Payment Proof" variant="secondary" onPress={() => Linking.openURL(payment.receiptUrl)} />
            ) : null}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function TransactionHistoryScreen({ requests }: { requests: DeliveryRequest[] }) {
  const entries = [...requests]
    .filter((request) => request.taskStatus === "delivered" || request.taskStatus === "cancelled")
    .sort((a, b) => new Date(taskCompletedAt(b) ?? b.createdAt ?? 0).getTime() - new Date(taskCompletedAt(a) ?? a.createdAt ?? 0).getTime());

  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header subtitle="Completed and cancelled delivery activity" title="Transactions" />
      {entries.length === 0 ? <EmptyState title="No transactions yet" copy="Delivered jobs and payout entries will appear here." /> : null}
      {entries.map((request) => (
        <Card key={request.id}>
          <View style={styles.cardTopRow}>
            <View style={styles.iconTile}>
              <Ionicons name={request.taskStatus === "cancelled" ? "close-circle-outline" : "receipt-outline"} size={21} color={BRAND_ORANGE} />
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle}>{shortId(request.id)} - {requestTitle(request)}</Text>
              <Text style={styles.cardMeta}>{request.clothType ?? "Cloth"} / {request.workType ?? "Delivery"}</Text>
              {request.createdAt ? (
                <Text style={{ fontSize: 11, color: BRAND_ORANGE, marginTop: 4, fontWeight: "700" }}>
                  Confirmed: {new Date(request.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
              ) : null}
            </View>
            <Text style={styles.priceText}>Rs {request.taskStatus === "cancelled" ? "0" : requestEarning(request).toFixed(0)}</Text>
          </View>
          <StatusRow label="Status" value={request.taskStatus.replace("_", " ").toUpperCase()} />
          <StatusRow label="Order" value={shortId(request.orderId)} />
          <StatusRow label="Completed" value={taskCompletedAt(request)?.toLocaleString("en-IN") ?? "Pending"} />
        </Card>
      ))}
    </ScrollView>
  );
}

function NotificationsScreen({ notifications, onOpen }: { notifications: DeliveryNotification[]; onOpen: (notification: DeliveryNotification) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header subtitle="Tap an alert to open the related delivery" title="Notification Center" />
      {notifications.map((notification) => (
        <Pressable key={notification.id} onPress={() => onOpen(notification)}>
          <Card>
            <View style={styles.cardTopRow}>
              <View style={styles.iconTile}>
                <Ionicons name="notifications-outline" size={21} color={BRAND_ORANGE} />
              </View>
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>{notification.title}</Text>
                <Text style={styles.cardMeta}>{notification.body}</Text>
                <Text style={styles.cardCopy}>{new Date(notification.createdAt).toLocaleString("en-IN")}</Text>
              </View>
            </View>
          </Card>
        </Pressable>
      ))}
      {!notifications.length ? <EmptyState title="No alerts yet" copy="New delivery requests and job updates will appear here." /> : null}
    </ScrollView>
  );
}

function TabBar({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  const language = useAppStore((state) => state.language);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, MIN_ANDROID_BOTTOM_INSET);
  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "home", label: t(language, "home"), icon: "home-outline" },
    { key: "orders", label: t(language, "queues"), icon: "cube-outline" },
    { key: "earnings", label: t(language, "earnings"), icon: "wallet-outline" },
    { key: "notifications", label: t(language, "alerts"), icon: "notifications-outline" },
    { key: "profile", label: t(language, "profile"), icon: "person-outline" }
  ];
  return (
    <View style={[styles.tabs, { height: 74 + bottomInset, paddingBottom: 6 + bottomInset }]}>
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
  onRefreshProfile: () => void | Promise<void>;
  onSessionExpired: () => void;
  onSignOut: () => void;
  showDialog: (dialog: DialogState) => void;
}) {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  useRegisterPushNotifications({ authToken: token, app: "delivery", userId: user?.id });
  const [tab, setTabState] = useState<Tab>("home");
  const [tabStack, setTabStack] = useState<Tab[]>([]);
  const [online, setOnline] = useState(Boolean(me?.deliveryProfile?.isAvailable ?? false));
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>();
  const [requestVisible, setRequestVisible] = useState(false);
  const [popupRequest, setPopupRequest] = useState<DeliveryRequest>();
  const [activeOrder, setActiveOrder] = useState<DeliveryRequest | undefined>();
  const [activeOrderScreen, setActiveOrderScreen] = useState<ActiveOrderScreen>("summary");
  const [accepting, setAccepting] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [notificationCenterItems, setNotificationCenterItems] = useState<DeliveryNotification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("Offline");
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number }>();
  const [cancellationAlert, setCancellationAlert] = useState<CancellationAlert>();
  const dismissedRequestIdsRef = useRef<Set<string>>(new Set());
  const presentedRequestIdsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const [initialSupportScreen, setInitialSupportScreen] = useState<string | null>(null);

  useEffect(() => registerIncomingRequestMessaging(), []);

  const filteredRequests = useMemo(() => {
    const visibleRequests = requests.filter((request) => {
      const assignedToMe = request.assignedDeliveryPartnerId && request.assignedDeliveryPartnerId === me?.deliveryProfile?.id;
      if (request.taskStatus === "pending" && request.serviceLevel !== "INSTANT" && !request.notificationSentAt && !assignedToMe) {
        return false;
      }
      return true;
    });
    if (!me?.deliveryProfile) return visibleRequests;
    const dt = me.deliveryProfile.deliveryType;
    if (dt === "PICKUP") {
      return visibleRequests.filter((r) => r.type === "customer_to_tailor");
    } else if (dt === "DROP") {
      return visibleRequests.filter((r) => r.type === "tailor_to_customer");
    }
    return visibleRequests;
  }, [requests, me?.deliveryProfile]);

  const batches = useMemo(() => {
    const groups: Record<string, DeliveryRequest[]> = {};
    for (const req of filteredRequests) {
      const bid = req.serviceLevel === "INSTANT" ? req.id : req.batchId || req.deliveryRound || "ONE_PM";
      if (!groups[bid]) groups[bid] = [];
      groups[bid].push(req);
    }
    return Object.entries(groups).map(([batchId, list]) => {
      const sortedList = sortDeliveryTasksForRoute(list);
      const first = sortedList[0];
      const estimatedEarnings = sortedList.reduce((sum, r) => sum + (r.estimatedEarnings ?? 0), 0);
      const isCompleted = list.length > 0 && list.every((r) => r.taskStatus === "delivered");
      const isCancelled = list.length > 0 && list.every((r) => r.taskStatus === "cancelled");
      const isAssigned = list.some((r) => r.taskStatus === "accepted" || r.taskStatus === "picked_up");
      const status = isCompleted ? "completed" : isCancelled ? "cancelled" : isAssigned ? "active" : "offered";
      return {
        batchId,
        deliveryRound: first?.deliveryRound || batchId,
        roundAt: first?.roundAt || first?.createdAt || new Date().toISOString(),
        deliveryType: first ? (first.type === "customer_to_tailor" ? "PICKUP" : "DROP") : (me?.deliveryProfile?.deliveryType || "PICKUP"),
        area: first?.assignedArea || me?.deliveryProfile?.assignedArea || "All Areas",
        estimatedEarnings,
        status,
        isInstant: sortedList.some((request) => request.serviceLevel === "INSTANT"),
        requests: sortedList
      };
    });
  }, [filteredRequests]);

  const activeBatch = useMemo(() => {
    const activeBatches = batches.filter((b) => !b.isInstant && b.status === "active" && b.requests.length > 0);
    if (activeBatches.length === 0) return undefined;
    
    const currentHour = getKolkataHour();
    let expectedRound = "ONE_PM";
    if (currentHour >= 13 && currentHour < 18) {
      expectedRound = "SIX_PM";
    } else {
      expectedRound = "ONE_PM";
    }

    const assignedBatches = activeBatches.filter((batch) =>
      batch.requests.some((request) => request.taskStatus === "accepted" || request.taskStatus === "picked_up")
    );
    return (
      assignedBatches.find((b) => b.deliveryRound === expectedRound) ||
      assignedBatches[0] ||
      activeBatches.find((b) => b.deliveryRound === expectedRound) ||
      activeBatches[0]
    );
  }, [batches]);

  const openRequests = useMemo(() => filteredRequests.filter((request) => request.taskStatus === "pending"), [filteredRequests]);
  const acceptedRequests = useMemo(() => filteredRequests.filter((request) => request.taskStatus === "accepted" || request.taskStatus === "picked_up"), [filteredRequests]);
  const currentActiveOrder = activeOrder ?? acceptedRequests[0];
  const completedJobs = useMemo(() => filteredRequests.filter((request) => request.taskStatus === "delivered").length, [filteredRequests]);
  const totalEarnings = useMemo(() => filteredRequests.filter((request) => request.taskStatus === "delivered").reduce((sum, request) => sum + requestEarning(request), 0), [filteredRequests]);
  const todayEarnings = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return filteredRequests
      .filter((request) => request.taskStatus === "delivered")
      .reduce((sum, request) => sum + (isAfterDate(taskCompletedAt(request), start) ? requestEarning(request) : 0), 0);
  }, [filteredRequests]);
  const deliveryRating = useMemo(() => {
    const rating = Number(me?.deliveryProfile?.rating ?? 0);
    return rating > 0 ? rating.toFixed(1) : "0.0";
  }, [me?.deliveryProfile?.rating]);

  const notificationsFromRequests = useMemo(() => {
    const items: DeliveryNotification[] = requests.map((req) => {
      let title = "New delivery request";
      if (req.taskStatus === "accepted") title = "Delivery assigned";
      else if (req.taskStatus === "picked_up") title = "Package picked up";
      else if (req.taskStatus === "delivered") title = "Delivery completed";
      else if (req.taskStatus === "cancelled") title = "Delivery cancelled";

      const direction = req.type === "customer_to_tailor" ? "Customer to Tailor" : "Tailor to Customer";
      return {
        id: `req-notif-${req.id}-${req.taskStatus}`,
        title,
        body: `Order REQ-${req.orderId.slice(0, 8).toUpperCase()} (${direction}) - ${req.clothType || "Clothes"} - ${req.workType || "Tailoring"}`,
        createdAt: req.createdAt || new Date().toISOString(),
        taskId: req.id,
        orderId: req.orderId
      };
    });

    const combined: DeliveryNotification[] = [...items];
    for (const item of notificationCenterItems) {
      if (!combined.some((c) => c.orderId === item.orderId && c.title === item.title)) {
        combined.push(item);
      }
    }
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, notificationCenterItems]);

  function setTab(nextTab: Tab, options?: { resetStack?: boolean; replace?: boolean }) {
    if (nextTab === tab) return;
    if (options?.resetStack || nextTab === "home") {
      setTabStack([]);
    } else if (!options?.replace) {
      setTabStack((current) => [...current, tab].slice(-12));
    }
    setTabState(nextTab);
  }

  const goBack = useCallback(() => {
    if (requestVisible) {
      setRequestVisible(false);
      return true;
    }
    if (activeOrder) {
      if (activeOrderScreen !== "summary") {
        setActiveOrderScreen("summary");
        return true;
      }
      setActiveOrder(undefined);
      setActiveOrderScreen("summary");
      return true;
    }
    if (activeBatchId) {
      setActiveBatchId(undefined);
      return true;
    }
    if (tabStack.length > 0) {
      setTabState(tabStack[tabStack.length - 1]);
      setTabStack((currentStack) => currentStack.slice(0, -1));
      return true;
    }
    if (tab !== "home") {
      setTabState("home");
      setTabStack([]);
      return true;
    }
    return false;
  }, [activeOrder, activeOrderScreen, activeBatchId, requestVisible, tab, tabStack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [goBack]);

  useEffect(() => {
    setOnline(Boolean(me?.deliveryProfile?.isAvailable ?? false));
  }, [me?.deliveryProfile?.isAvailable]);

  function addDeliveryNotification(input: Omit<DeliveryNotification, "id" | "createdAt">) {
    setNotificationCenterItems((current) => [
      {
        id: `${input.taskId ?? input.orderId ?? "delivery"}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...input
      },
      ...current
    ].slice(0, 80));
  }

  function openCancelledDelivery(taskId: string) {
    const request = requests.find((item) => item.id === taskId || item.orderId === taskId);
    setCancellationAlert(undefined);
    setTab("orders");
    if (!request) return;
    setActiveOrder(request);
    setActiveOrderScreen("summary");
  }

  function openNotification(notification: DeliveryNotification) {
    const request = requests.find((item) => item.id === notification.taskId || item.orderId === notification.orderId);
    if (request) {
      if (request.taskStatus === "pending") {
        setPopupRequest(request);
        setRequestVisible(true);
        setTab("orders");
        return;
      }
      setActiveOrder(request);
      setActiveOrderScreen("route");
      setTab("orders");
      return;
    }
    showDialog({ title: "Delivery not found", message: "This delivery is no longer available in your current queue.", icon: "alert-circle-outline" });
  }

  const showOpenRequestPopup = useCallback((requestList: DeliveryRequest[]) => {
    if (!online || requestVisible || activeOrder) return;
    const newest = requestList.find(
      (request) => {
        const key = requestPresentationKey(request);
        return request.status === "OPEN" && !dismissedRequestIdsRef.current.has(key) && !presentedRequestIdsRef.current.has(key);
      }
    );
    if (!newest) return;
    presentedRequestIdsRef.current.add(requestPresentationKey(newest));
    setPopupRequest(newest);
    setRequestVisible(true);
    void playDeliveryAlert(isBatchOfferRequest(newest) ? "Batch offer" : "New delivery request", isBatchOfferRequest(newest) ? `${newest.batchOrdersCount ?? 1} orders in ${newest.batchArea ?? newest.assignedArea ?? "your area"}` : requestTitle(newest));
  }, [activeOrder, online, requestVisible]);
  const showOpenRequestPopupRef = useRef(showOpenRequestPopup);

  useEffect(() => {
    showOpenRequestPopupRef.current = showOpenRequestPopup;
  }, [showOpenRequestPopup]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      const taskId = typeof data.taskId === "string" ? data.taskId : typeof data.requestId === "string" ? data.requestId : undefined;
      const orderId = typeof data.orderId === "string" ? data.orderId : undefined;
      addDeliveryNotification({
        title: notification.request.content.title ?? "Delivery alert",
        body: notification.request.content.body ?? "Open delivery details",
        taskId,
        orderId
      });
    });
    return () => subscription.remove();
  }, []);

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

  const refreshVisibleDeliveryScreen = useCallback(async () => {
    if (pullRefreshing) return;
    setPullRefreshing(true);
    try {
      await Promise.all([
        loadRequests(false),
        Promise.resolve(onRefreshProfile())
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [loadRequests, onRefreshProfile, pullRefreshing]);

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
      const incoming = normalizeDeliveryTaskPayloads(payload);
      const request = incoming[0];
      setRequests((current) => mergeDeliveryRequests(current, incoming));
      addDeliveryNotification({
        title: isBatchOfferRequest(request) ? "Batch offer" : "New delivery request",
        body: isBatchOfferRequest(request)
          ? `${request.deliveryRound === "ONE_PM" ? "1 PM" : "6 PM"} batch | ${request.batchOrdersCount ?? incoming.length} orders | Rs ${Number(request.batchEstimatedEarnings ?? 0).toFixed(0)}`
          : requestTitle(request),
        taskId: request.id,
        orderId: request.orderId
      });
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
      const incoming = normalizeDeliveryTaskPayloads(payload);
      const request = incoming[0];
      setRequests((current) => mergeDeliveryRequests(current, incoming));
      setActiveOrder(request);
      setActiveOrderScreen("route");
      addDeliveryNotification({
        title: "Delivery assigned",
        body: requestTitle(request),
        taskId: request.id,
        orderId: request.orderId
      });
    });
    socket.on("delivery:task_updated", (payload: DeliveryTaskPayload) => {
      if (!payload?.id) return;
      const request = normalizeDeliveryTask(payload);
      setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
      setActiveOrder((current) => current?.id === request.id ? request : current);
      addDeliveryNotification({
        title: "Delivery updated",
        body: `${requestTitle(request)} is ${request.taskStatus.replace(/_/g, " ")}.`,
        taskId: request.id,
        orderId: request.orderId
      });
    });
    socket.on("delivery:task_cancelled", ({ orderId, taskIds }: { orderId?: string; taskIds?: string[] }) => {
      const ids = new Set(taskIds ?? []);
      setRequestVisible(false);
      setPopupRequest((current) => current && (ids.has(current.id) || current.orderId === orderId) ? undefined : current);
      setRequests((current) =>
        current.map((request) =>
          ids.has(request.id) || request.orderId === orderId
            ? { ...request, taskStatus: "cancelled", status: "CANCELLED" }
            : request
        )
      );
      setActiveOrder((current) =>
        current && (ids.has(current.id) || current.orderId === orderId)
          ? { ...current, taskStatus: "cancelled", status: "CANCELLED" }
          : current
      );
      if (orderId || ids.size) {
        addDeliveryNotification({
          title: "Delivery cancelled",
          body: `Order ${orderId ? orderId.slice(0, 8).toUpperCase() : "request"} has been cancelled.`,
          taskId: taskIds?.[0],
          orderId
        });
        setCancellationAlert({
          id: taskIds?.[0] ?? orderId ?? "",
          title: "Order cancelled",
          message: `Delivery ${orderId ? orderId.slice(0, 8).toUpperCase() : "request"} has been cancelled.`
        });
      }
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

  async function acceptDeliveryTask(taskId: string) {
    if (!token) return;
    if (accepting) return;
    setAccepting(true);
    const acceptedPayload = await api<DeliveryTaskPayload>(`/delivery-requests/${taskId}/accept`, { method: "POST" }, token);
    const acceptedTasks = normalizeDeliveryTaskPayloads(acceptedPayload);
    const accepted = acceptedTasks[0];
    setRequests((current) => mergeDeliveryRequests(current, acceptedTasks));
    setRequestVisible(false);
    setActiveOrder(accepted);
    setActiveOrderScreen("route");
    void playAppSound("confirmation");
  }

  async function acceptPopupRequest() {
    if (!popupRequest) return;
    try {
      await acceptDeliveryTask(popupRequest.id);
      dismissedRequestIdsRef.current.add(requestPresentationKey(popupRequest));
    } catch (error) {
      showDialog({ title: "Accept failed", message: error instanceof Error ? error.message : "Could not accept request.", icon: "alert-circle-outline" });
      void loadRequests();
    } finally {
      setAccepting(false);
    }
  }

  function rejectPopupRequest(reason: "partner_rejected" | "timeout" = "partner_rejected") {
    if (!popupRequest) return;
    dismissedRequestIdsRef.current.add(requestPresentationKey(popupRequest));
    setRequestVisible(false);
    const taskId = popupRequest.id;
    if (token) {
      void api(`/delivery-requests/${taskId}/reject`, { method: "POST", body: JSON.stringify({ reason }) }, token).catch(() => undefined);
    }
  }

  const handleNotificationNavigation = useCallback((destination: NotificationDestination) => {
    if (destination.screen === "support_center" || destination.screen === "contactSupport") {
      setInitialSupportScreen("support_center");
      setTab("profile");
      return;
    }
    const taskId = destination.entityId;
    const request = taskId ? requests.find((item) => item.id === taskId || item.orderId === taskId) : undefined;

    if (destination.actionIdentifier === "DECLINE" && taskId) {
      const deliveryTaskId = request?.id ?? taskId;
      dismissedRequestIdsRef.current.add(deliveryTaskId);
      setPopupRequest((current) => current?.id === deliveryTaskId ? undefined : current);
      setRequestVisible(false);
      if (token) {
        void api(`/delivery-requests/${deliveryTaskId}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: "partner_rejected" })
        }, token).catch(() => undefined);
      }
      setTab("orders");
      return;
    }

    if (destination.actionIdentifier === "ACCEPT" && taskId && token) {
      if (accepting) return;
      setAccepting(true);
      void api<DeliveryTaskPayload>(`/delivery-requests/${taskId}/accept`, { method: "POST" }, token)
        .then((payload) => {
          const acceptedTasks = normalizeDeliveryTaskPayloads(payload);
          const accepted = acceptedTasks[0];
          setRequests((current) => mergeDeliveryRequests(current, acceptedTasks));
          setPopupRequest(undefined);
          setRequestVisible(false);
          setActiveOrder(accepted);
          setActiveOrderScreen("route");
          void playAppSound("confirmation");
        })
        .catch((error) => showDialog({ title: "Accept failed", message: error instanceof Error ? error.message : "Could not accept request.", icon: "alert-circle-outline" }))
        .finally(() => setAccepting(false));
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

  const selectedBatch = useMemo(() => batches.find((b) => b.batchId === activeBatchId), [batches, activeBatchId]);

  if (activeOrder) {
    return (
      <PullToRefreshContext.Provider value={{ refreshing: pullRefreshing, onRefresh: () => void refreshVisibleDeliveryScreen() }}>
      <NotificationProvider app="delivery" onNavigate={handleNotificationNavigation}>
        <>
          {cancellationAlert ? (
            <Pressable style={styles.topDisclaimer} onPress={() => openCancelledDelivery(cancellationAlert.id)}>
              <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
              <View style={styles.topDisclaimerText}>
                <Text style={styles.topDisclaimerTitle}>{cancellationAlert.title}</Text>
                <Text style={styles.topDisclaimerCopy} numberOfLines={1}>{cancellationAlert.message}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#b91c1c" />
            </Pressable>
          ) : null}
          <ActiveOrderScreenView
            onBack={() => {
              setActiveOrder(undefined);
              setActiveOrderScreen("summary");
            }}
            order={activeOrder}
            screen={activeOrderScreen}
            setScreen={setActiveOrderScreen}
            currentLocation={currentLocation}
            token={token!}
            onTaskUpdated={(updated) => {
              setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
              if (updated.taskStatus === "delivered") {
                setActiveOrder(undefined);
                setActiveOrderScreen("summary");
              } else {
                setActiveOrder(updated);
              }
            }}
            showDialog={showDialog}
          />
        </>
      </NotificationProvider>
      </PullToRefreshContext.Provider>
    );
  }

  if (selectedBatch) {
    return (
      <PullToRefreshContext.Provider value={{ refreshing: pullRefreshing, onRefresh: () => void refreshVisibleDeliveryScreen() }}>
      <NotificationProvider app="delivery" onNavigate={handleNotificationNavigation}>
        <Screen>
          <BatchDetailsView
            accepting={accepting}
            batch={selectedBatch}
            onAcceptBatch={(batch) => {
              const task = batch.requests.find((request) => request.taskStatus === "pending") ?? batch.requests[0];
              if (!task) return;
              void acceptDeliveryTask(task.id)
                .catch((error) => {
                  showDialog({ title: "Accept failed", message: error instanceof Error ? error.message : "Could not accept batch.", icon: "alert-circle-outline" });
                  void loadRequests();
                })
                .finally(() => setAccepting(false));
            }}
            onBack={() => setActiveBatchId(undefined)}
            onOpenOrder={(order) => {
              setActiveOrder(order);
              setActiveOrderScreen("summary");
            }}
          />
        </Screen>
      </NotificationProvider>
      </PullToRefreshContext.Provider>
    );
  }

  return (
    <PullToRefreshContext.Provider value={{ refreshing: pullRefreshing, onRefresh: () => void refreshVisibleDeliveryScreen() }}>
    <NotificationProvider app="delivery" onNavigate={handleNotificationNavigation}>
      <Screen>
        {cancellationAlert ? (
          <Pressable style={styles.topDisclaimer} onPress={() => openCancelledDelivery(cancellationAlert.id)}>
            <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
            <View style={styles.topDisclaimerText}>
              <Text style={styles.topDisclaimerTitle}>{cancellationAlert.title}</Text>
              <Text style={styles.topDisclaimerCopy} numberOfLines={1}>{cancellationAlert.message}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#b91c1c" />
          </Pressable>
        ) : null}
        <View style={styles.mainArea}>
        {tab === "home" ? (
          <HomeScreen
            activeBatch={activeBatch}
            completedJobs={completedJobs}
            onOpenBatch={(batchId) => setActiveBatchId(batchId)}
            onToggleOnline={toggleOnline}
            online={online}
            rating={deliveryRating}
            todayEarnings={todayEarnings}
            totalEarnings={Number(me?.deliveryProfile?.totalEarnings ?? totalEarnings)}
          />
        ) : null}
        {tab === "orders" ? <OrdersScreen
          accepting={accepting}
          batches={batches}
          onOpenBatch={(batchId) => setActiveBatchId(batchId)}
          onAcceptBatch={(batch) => {
            const task = batch.requests.find((request) => request.taskStatus === "pending") ?? batch.requests[0];
            if (!task) return;
            void acceptDeliveryTask(task.id)
              .catch((error) => {
                showDialog({ title: "Accept failed", message: error instanceof Error ? error.message : "Could not accept batch.", icon: "alert-circle-outline" });
                void loadRequests();
              })
              .finally(() => setAccepting(false));
          }}
          deliveryType={me?.deliveryProfile?.deliveryType}
        /> : null}
        {tab === "earnings" ? <EarningsScreen me={me} requests={requests} /> : null}
        {tab === "transactions" ? <TransactionHistoryScreen requests={requests} /> : null}
        {tab === "notifications" ? <NotificationsScreen notifications={notificationsFromRequests} onOpen={openNotification} /> : null}
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
            onOpenTransactions={() => setTab("transactions")}
            onOpenOrders={() => setTab("orders")}
            socket={socketRef.current}
            initialSupportScreen={initialSupportScreen}
            clearInitialSupportScreen={() => setInitialSupportScreen(null)}
          />
        ) : null}
        </View>
        <TabBar current={tab} onChange={setTab} />
        <IncomingRequestScreen
          loading={accepting}
          onAccept={acceptPopupRequest}
          onReject={() => rejectPopupRequest("partner_rejected")}
          onTimeout={() => rejectPopupRequest("timeout")}
          request={incomingPayloadFromDeliveryRequest(popupRequest)}
          soundEnabled={me?.deliveryProfile?.settings?.soundAlerts !== false}
          vibrationEnabled={me?.deliveryProfile?.settings?.vibrationAlerts !== false}
          visible={requestVisible}
        />
      </Screen>
    </NotificationProvider>
    </PullToRefreshContext.Provider>
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
          {needsUpdate ? (
            <View style={styles.reuploadChecklist}>
              {["Identity front photo", "Identity back photo if Aadhaar", "Selfie/face photo", "Driving license front", "Driving license back", "RC photo", "Insurance photo"].map((item) => (
                <View key={item} style={styles.reuploadChecklistRow}>
                  <Ionicons name="cloud-upload-outline" size={16} color={BRAND_ORANGE} />
                  <Text style={styles.cardMeta}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
        <PrimaryButton
          icon="refresh-outline"
          label={needsUpdate ? "Reupload Documents" : "Refresh Status"}
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
  useIncomingAlertPermissionGuide(Boolean(token), "delivery");
  const [stage, setStage] = useState<AppStage>(token ? "loading" : "auth");
  const [me, setMe] = useState<MeResponse>();
  const [dialog, setDialog] = useState<DialogState>();
  const skipLoadingScreenRef = useRef(false);

  const handleSessionExpired = useCallback(() => {
    signOut();
    setMe(undefined);
    setStage("auth");
  }, [signOut]);

  const handleSignOut = useCallback(() => {
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
            setMe(undefined);
            setStage("auth");
          }
        }
      ]
    );
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
        <AuthScreen onAuthenticated={() => { skipLoadingScreenRef.current = false; setStage("loading"); }} showDialog={setDialog} />
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
          onSignOut={handleSignOut}
        />
        <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
      </>
    );
  }
  return (
    <>
      <SafeAreaProvider>
        <MainApp me={me} onRefreshProfile={() => void refreshProfile()} onSessionExpired={handleSessionExpired} onSignOut={handleSignOut} showDialog={setDialog} />
      </SafeAreaProvider>
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
  pageContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 118 },
  centeredState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  centeredTitle: { color: BRAND_DEEP, fontSize: 24, fontWeight: "900", marginTop: 18 },
  centeredCopy: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 8 },
  pendingHero: { borderRadius: 24, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", padding: 22, alignItems: "center", marginBottom: 14 },
  pendingBadge: { width: 74, height: 74, borderRadius: 37, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  pendingTitle: { color: BRAND_DEEP, fontSize: 24, fontWeight: "900", textAlign: "center", marginTop: 16 },
  pendingCopy: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 10 },
  topDisclaimer: { minHeight: 54, marginHorizontal: 18, marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff1f2", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  topDisclaimerText: { flex: 1, minWidth: 0 },
  topDisclaimerTitle: { color: "#991b1b", fontSize: 13, fontWeight: "900" },
  topDisclaimerCopy: { color: "#b91c1c", fontSize: 12, fontWeight: "700", marginTop: 2 },
  reuploadChecklist: { gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  reuploadChecklistRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  choiceChipDisabled: { opacity: 0.55 },
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
  inputReadOnly: { backgroundColor: "#f1f5f9", opacity: 0.75 },
  lockedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef3c7", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, borderWidth: 1, borderColor: "#fcd34d" },
  lockedBannerText: { color: "#92400e", fontSize: 12, fontWeight: "900", flex: 1 },
  noticeText: { color: "#8a5600", backgroundColor: "#fff4dc", overflow: "hidden", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12, lineHeight: 18, fontWeight: "900", marginTop: 12 },
  cancelledNoticeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cancelledNoticeTitle: { color: "#991b1b", fontSize: 15, fontWeight: "900" },
  cancelledNoticeCopy: { color: "#b91c1c", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 3 },
  navRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  documentBox: { minHeight: 104, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", flexDirection: "row", alignItems: "center", gap: 12, padding: 10, marginTop: 10, overflow: "hidden" },
  documentPreview: { width: 76, height: 76, flexShrink: 0, borderRadius: 14, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  documentImage: { width: "100%", height: "100%" },
  documentBody: { flex: 1, minWidth: 0 },
  docActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  docButton: { flex: 1, minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: "#efbd65", backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  docButtonText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" },
  docLockedText: { color: "#9aa6b8", fontSize: 11, fontWeight: "700", marginTop: 8 },
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
  batchCountHero: { minHeight: 92, borderRadius: 20, backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  batchCountNumber: { color: "#dc2626", fontSize: 44, lineHeight: 50, fontWeight: "900" },
  batchCountLabel: { color: "#9a3412", fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },
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
  timestampBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 10, paddingVertical: 7, marginTop: 9 },
  timestampBadgeText: { color: "#b91c1c", fontSize: 11, fontWeight: "900" },
  cardCopy: { color: "#526276", fontSize: 13, lineHeight: 20, fontWeight: "700", marginTop: 4 },
  helperText: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", marginTop: 8 },
  cardDivider: { height: 1, backgroundColor: BORDER, marginVertical: 13 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  statusPill: { overflow: "hidden", borderRadius: 14, backgroundColor: "#fff2d8", color: BRAND_ORANGE, paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: "900", textAlign: "center" },
  statusAccepted: { color: "#2563eb", backgroundColor: "#dbeafe" },
  statusCompleted: { color: SUCCESS, backgroundColor: "#dcfce7" },
  paymentPill: { overflow: "hidden", borderRadius: 13, paddingHorizontal: 9, paddingVertical: 7, fontSize: 11, lineHeight: 15, fontWeight: "900", textAlign: "center", maxWidth: 190, marginTop: 10 },
  paymentProofRow: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: 10 },
  popupBackdrop: { flex: 1, backgroundColor: "rgba(7, 13, 24, 0.48)", alignItems: "center", justifyContent: "center", padding: 20 },
  popupCard: { width: "100%", maxWidth: 390, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", padding: 22, alignItems: "center" },
  popupIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  requestPopupCard: { width: "100%", maxWidth: 410, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", padding: 20 },
  instantRequestPopupCard: { backgroundColor: "#fff7f7", borderColor: "#fecaca", borderWidth: 2 },
  popupIconSmall: { width: 48, height: 48, borderRadius: 18, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  instantPopupIcon: { backgroundColor: "#fee2e2" },
  popupEyebrow: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  instantEyebrow: { color: "#dc2626" },
  popupTitle: { color: BRAND_DEEP, fontSize: 20, lineHeight: 26, fontWeight: "900", marginTop: 4 },
  popupCopy: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 10 },
  popupActions: { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
  popupActionButton: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  popupActionText: { color: "#111111", fontSize: 13, fontWeight: "900", textAlign: "center" },
  popupSecondaryButton: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  popupSecondaryText: { color: BRAND_DEEP },
  reasonList: { width: "100%", gap: 9, marginTop: 14 },
  reasonOption: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: "#ffffff", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12 },
  reasonOptionActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff7e8" },
  reasonText: { flex: 1, color: BRAND_DEEP, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  dialogActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 16 },
  dialogButton: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  dialogSecondary: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  dialogButtonText: { color: "#111111", fontSize: 13, fontWeight: "900", textAlign: "center" },
  dialogSecondaryText: { color: BRAND_DEEP },
  countCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  instantCountCircle: { backgroundColor: "#ef4444" },
  countText: { color: "#111111", fontSize: 16, fontWeight: "900" },
  instantCountText: { color: "#ffffff" },
  countdownPanel: { minHeight: 68, borderRadius: 18, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#efcf92", flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginTop: 16 },
  instantCountdownPanel: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  countdownTitle: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900" },
  countdownCopy: { color: MUTED, fontSize: 11, lineHeight: 16, fontWeight: "700", marginTop: 3 },
  helperWarning: { color: "#8a5600", backgroundColor: "#fff4dc", overflow: "hidden", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12, lineHeight: 18, fontWeight: "900", marginTop: 10, marginBottom: 4 },
  orderCard: { borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 13 },
  instantOrderCard: { backgroundColor: "#fff7f7", borderColor: "#fecaca", borderWidth: 2 },
  instantIconTile: { backgroundColor: "#fee2e2" },
  priceText: { color: BRAND_ORANGE, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyState: { minHeight: 220, alignItems: "center", justifyContent: "center", padding: 22 },
  emptyTitle: { color: BRAND_DEEP, fontSize: 18, fontWeight: "900", marginTop: 12 },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  segment: { minHeight: 36, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", paddingHorizontal: 11 },
  segmentActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc" },
  segmentText: { color: MUTED, fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  segmentTextActive: { color: BRAND_ORANGE },
  cancelledSegmentActive: { borderColor: "#fecaca", backgroundColor: "#fff1f2" },
  cancelledSegmentText: { color: "#b91c1c" },
  checklistRow: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: "#ffffff", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13, marginTop: 10 },
  checklistCurrent: { borderColor: BRAND_ORANGE, backgroundColor: "#fff7e8" },
  checklistLocked: { opacity: 0.45, backgroundColor: "#eef1f5" },
  checklistLabel: { flex: 1, fontSize: 14, fontWeight: "900" },
  mapPreview: { minHeight: 150, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", alignItems: "center", justifyContent: "center", marginTop: 12 },
  mapPreviewText: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900", marginTop: 8 },
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
  activeTabText: { color: BRAND_ORANGE },
  stopNumber: { fontSize: 14, fontWeight: "900", color: BRAND_DEEP }
});
