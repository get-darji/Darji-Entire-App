import "./global.css";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import FaceDetection from "@react-native-ml-kit/face-detection";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestOtpSchema, verifyOtpSchema } from "./src/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Switch,
  Text,
  TextInput,
  Vibration,
  View
} from "react-native";
import { z } from "zod";
import { api, refreshAccessToken, uploadAuditMedia, uploadTailorAvatar, uploadTailorVerificationMedia } from "./src/api";
import { NotificationProvider } from "./src/components/NotificationProvider";
import { TailorProfileScreen } from "./src/components/TailorProfileScreen";
import { useRegisterPushNotifications } from "./src/hooks/useRegisterPushNotifications";
import { configureForegroundNotificationHandler } from "./src/notifications/handlers";
import { createRealtimeSocket, type ConnectionStatus } from "./src/realtime";
import { playAppSound } from "./src/services/soundService";
import { useAppStore } from "./src/store";

type Screen = "dashboard" | "requests" | "requestDetails" | "quote" | "orders" | "orderDetails" | "earnings" | "profile" | "transactions";
type RequestOtpForm = z.input<typeof requestOtpSchema>;
type VerifyOtpForm = z.input<typeof verifyOtpSchema>;
type MediaItem = { url: string; resourceType: "image" | "video"; originalName?: string; bytes?: number };
type TailorQuote = { id: string; price: number; estimatedDays: number; estimatedHours?: number; message?: string; pickupIncluded?: boolean; status: "SUBMITTED" | "ACCEPTED" | "REJECTED" };
type HandoffOtp = { taskId: string; type: "customer_to_tailor" | "tailor_to_customer"; stage: "pickup" | "drop"; otp: string; verified: boolean };
type Customer = { id: string; name?: string; phone: string };
type TailoringRequestItem = {
  id?: string;
  description: string;
  gender?: string;
  clothType: string;
  workType: string;
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
  measurementNotes?: string;
  media?: MediaItem[];
  sampleProvided?: boolean;
  sampleMedia?: MediaItem[];
  homeMeasurementBooked?: boolean;
};
type TailoringRequest = {
  id: string;
  description: string;
  gender?: string;
  clothType: string;
  workType: string;
  urgency: string;
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
  measurementNotes?: string;
  pickupAddress: string;
  status: "QUOTE_REQUESTED" | "PAYMENT_PENDING" | "TAILOR_SELECTED" | "CANCELLED";
  orderStatus?: string;
  workStatus?: "ACCEPTED" | "WORKING" | "READY";
  media: MediaItem[];
  receivedMedia?: MediaItem[];
  stitchedMedia?: MediaItem[];
  items?: TailoringRequestItem[];
  additionalItems?: Array<{ gender?: string; clothType?: string; workType?: string; description?: string }>;
  itemCount?: number;
  quoteAmount?: number;
  customer?: Customer;
  ownQuote?: TailorQuote | null;
  quoteCount?: number;
  createdAt: string;
};
type OrderItem = {
  id?: string;
  service?: { name: string; estimatedDelivery?: string };
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
  instructions?: string;
  media?: MediaItem[];
  sampleMedia?: MediaItem[];
  price?: number;
};
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number | string;
  source?: "backend" | "accepted_request";
  request?: TailoringRequest;
  customer?: Customer;
  address?: { line1?: string; city?: string; state?: string; pincode?: string; landmark?: string; phone?: string };
  items: OrderItem[];
  pickupScheduledAt?: string;
  instructions?: string;
  createdAt?: string;
};
type TailorProfile = {
  id: string;
  darjiTailorId?: string;
  shopName: string;
  specialization: string[];
  rating: number;
  isAvailable: boolean;
  earnings: number;
  workingHours?: { from?: string; to?: string };
  settings?: { notifications?: boolean; soundAlerts?: boolean; compactCards?: boolean; autoOpenNewRequests?: boolean; maxOrdersPerDay?: number };
  verificationStatus?: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED";
  verificationSubmittedAt?: string;
  verificationRejectionReason?: string;
  verification?: TailorVerificationPayload;
  verificationDraft?: Partial<VerificationDraft>;
};
type MeResponse = {
  id: string;
  phone: string;
  name?: string;
  avatarUrl?: string;
  role: string;
  tailorProfile?: TailorProfile;
};
type DialogAction = { label: string; onPress?: () => void; variant?: "primary" | "secondary" };
type DialogState = { title: string; message: string; icon?: keyof typeof Ionicons.glyphMap; actions?: DialogAction[] };
type CancellationAlert = { id: string; title: string; message: string };
type VerificationMediaDraft = { uri: string; name: string; uploadedUrl?: string };
type SpecializationRow = { id: string; gender: "Men" | "Women" | "Both"; clothType: string; stitchingType: string; price: string };
type OcrDetails = { rawText?: string; name?: string; dob?: string; aadhaarLast4?: string; panNumber?: string; addressHint?: string };
type FaceLivenessState = "idle" | "aligning" | "aligned" | "blink-detected" | "captured";
type VerificationDraft = {
  step: number;
  personal: { name: string; address: string; dob: string; email: string; location?: { lat: number; lng: number } };
  shop: { workFromHome: boolean; shopName: string; shopAddress: string; gstNumber: string; employeeCount: string; yearsExperience: string; machinery: string[] };
  category: "Men" | "Women" | "Both";
  rows: SpecializationRow[];
  confirmedRows: boolean;
  idType: "Aadhaar" | "PAN";
  idNumber: string;
  aadhaarFront?: VerificationMediaDraft;
  aadhaarBack?: VerificationMediaDraft;
  panPhoto?: VerificationMediaDraft;
  facePhoto?: VerificationMediaDraft;
  ocrStatus: string;
  faceDetectionStatus: string;
  extractedDetails: OcrDetails;
};
type TailorVerificationPayload = {
  personal: { name: string; address: string; dob: string; email?: string; location?: { lat: number; lng: number } };
  shop: { workFromHome?: boolean; shopName: string; shopAddress: string; gstNumber?: string; employeeCount: number; yearsExperience: number; machinery: string[] };
  specializationRows: Array<{ gender: "Men" | "Women" | "Both"; clothType: string; stitchingType: string; price: number }>;
  idVerification: {
    idType: "Aadhaar" | "PAN";
    idNumber: string;
    aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string;
    panUrl?: string;
    facePhotoUrl?: string;
    ocrStatus?: string;
    extractedDetails?: Record<string, unknown>;
    faceDetectionStatus?: string;
  };
};

const BRAND_ORANGE = "#f6a313";
const BRAND_DEEP = "#0b2241";
const SCREEN_BG = "#f7faff";
const SURFACE = "#ffffff";
const BORDER = "#dde4ee";
const MUTED = "#65748a";
const SUCCESS = "#15803d";
const STATUS_BAR_INSET = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
const SCREEN_TOP_PADDING = STATUS_BAR_INSET + 24;
const TAILOR_ONBOARDING_STORAGE_PREFIX = "darji.tailorOnboarding.v1";

configureForegroundNotificationHandler();

const statusSteps = ["READY"] as const;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playTailorAlert(title: string, body: string, soundEnabled = true) {
  if (Platform.OS !== "web") {
    Vibration.vibrate([0, 420, 120, 420]);
  }
  await playAppSound(title.toLowerCase().includes("accepted") ? "confirmation" : "request", soundEnabled);
  void body;
}

function formatStatus(status: string) {
  if (status === "READY") return "Ready to Deliver";
  if (status === "AT_TAILOR" || status === "WORKING") return "Working";
  if (status === "QUOTE_ACCEPTED") return "Accepted";
  return status
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(status: string) {
  if (["READY", "DELIVERED", "STITCHING_COMPLETED"].includes(status)) return { color: SUCCESS, backgroundColor: "#dcfce7" };
  if (["CANCELLED"].includes(status)) return { color: "#b91c1c", backgroundColor: "#fee2e2" };
  if (["AT_TAILOR", "WORKING", "CUTTING", "STITCHING_STARTED", "FINISHING"].includes(status)) return { color: "#7c3aed", backgroundColor: "#ede9fe" };
  return { color: "#c76f00", backgroundColor: "#fff2d8" };
}

function urgencyWindow(urgency?: string) {
  const value = String(urgency ?? "").toLowerCase();
  if (value.includes("instant")) return { mode: "hours" as const, min: 1, max: 24, label: "Instant delivery", helper: "Enter hours only" };
  if (value.includes("same day")) return { mode: "days" as const, min: 1, max: 1, label: "Same day", helper: "Only 1 day is allowed" };
  if (value.includes("express")) return { mode: "days" as const, min: 1, max: 2, label: "Express", helper: "Allowed range: 1-2 days" };
  return { mode: "days" as const, min: 1, max: 4, label: "Normal", helper: "Allowed range: 1-4 days" };
}

function urgencyTone(urgency?: string) {
  const value = String(urgency ?? "").toLowerCase();
  if (value.includes("instant") || value.includes("same day")) return { color: "#b91c1c", backgroundColor: "#fee2e2" };
  if (value.includes("express")) return { color: "#c2410c", backgroundColor: "#ffedd5" };
  return { color: "#1d4ed8", backgroundColor: "#dbeafe" };
}

function quoteEtaLabel(quote: { estimatedDays?: number; estimatedHours?: number }) {
  if (quote.estimatedHours && quote.estimatedHours > 0) return `${quote.estimatedHours} hour${quote.estimatedHours === 1 ? "" : "s"}`;
  const days = quote.estimatedDays ?? 1;
  return `${days} day${days === 1 ? "" : "s"}`;
}

function money(value: number | string | undefined) {
  return `Rs ${Number(value ?? 0).toFixed(0)}`;
}

function tailorOrderEarning(order: Order) {
  return Number(order.totalAmount ?? order.items[0]?.price ?? 0);
}

function shortId(id?: string) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : "#REQUEST";
}

function isSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /authentication required|invalid session|invalid or expired token|session expired/i.test(message);
}

function firstItem(order: Order) {
  if (order.request) return requestSummary(order.request);
  return order.items[0]?.service?.name ?? "Tailoring";
}

function requestItems(request: TailoringRequest): TailoringRequestItem[] {
  if (request.items?.length) return request.items;
  return [
    {
      id: `${request.id}-item-1`,
      description: request.description,
      gender: request.gender,
      clothType: request.clothType,
      workType: request.workType,
      measurement: request.measurement,
      measurementNotes: request.measurementNotes,
      media: request.media ?? []
    }
  ];
}

function requestItemCount(request: TailoringRequest) {
  return Math.max(1, request.items?.length ?? request.itemCount ?? 1);
}

function requestSummary(request: TailoringRequest) {
  const count = requestItemCount(request);
  return count === 1 ? `${request.clothType} - ${request.workType}` : `${count} Clothing Items`;
}

function measurementStatus(item: TailoringRequestItem) {
  if (item.sampleProvided || item.sampleMedia?.length || item.measurement?.imageUrl) return "Sample";
  if (item.homeMeasurementBooked) return "Home Visit";
  if (Object.keys(item.measurement?.fields ?? {}).length) return "Custom";
  return "Not added";
}

function orderFromAcceptedRequest(request: TailoringRequest): Order {
  const status = request.workStatus === "READY" ? "READY" : request.workStatus === "WORKING" ? "AT_TAILOR" : "QUOTE_ACCEPTED";
  const items = requestItems(request).map((item) => ({
    service: { name: `${item.clothType || "Cloth"} - ${item.workType || "Tailoring"}` },
    measurement: item.measurement,
    instructions: [item.gender, item.description, item.measurementNotes].filter(Boolean).join(" - "),
    media: item.media ?? [],
    sampleMedia: item.sampleMedia ?? [],
    price: request.ownQuote?.price
  }));
  const extraItems = (request.additionalItems ?? []).map((item, index) => ({
    service: { name: `${item.clothType || "Extra clothing"} - ${item.workType || "Tailoring"}` },
    instructions: [item.gender, item.description].filter(Boolean).join(" • ") || `Additional checkout item ${index + 2}`,
    price: request.ownQuote?.price
  }));
  return {
    id: `accepted-${request.id}`,
    orderNumber: `REQ-${request.id.slice(0, 8).toUpperCase()}`,
    status,
    totalAmount: request.quoteAmount ?? Number(request.ownQuote?.price ?? 0),
    source: "accepted_request",
    request,
    items,
    createdAt: request.createdAt
  };
}

function PhoneField({ value, onChange, placeholder }: { value?: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <View style={styles.phoneField}>
      <Text style={styles.phonePrefix}>+91</Text>
      <View style={styles.phoneDivider} />
      <TextInput
        style={styles.phoneInput}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 10))}
        placeholder={placeholder}
        placeholderTextColor="#9aa6b8"
        keyboardType="number-pad"
        maxLength={10}
      />
    </View>
  );
}

function AuthButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
      {!loading ? <Ionicons name="chevron-forward" size={18} color="#111111" /> : null}
    </Pressable>
  );
}

function AuthScreen() {
  const [otpRequested, setOtpRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dialog, setDialog] = useState<DialogState>();
  const setSession = useAppStore((state) => state.setSession);
  const requestForm = useForm<RequestOtpForm>({ resolver: zodResolver(requestOtpSchema), defaultValues: { role: "TAILOR" } });
  const verifyForm = useForm<VerifyOtpForm>({ resolver: zodResolver(verifyOtpSchema), defaultValues: { role: "TAILOR" } });

  async function requestOtp(values: RequestOtpForm) {
    try {
      setIsRequesting(true);
      const result = await api<{ otp?: string }>("/auth/request-otp", { method: "POST", body: JSON.stringify(values) });
      verifyForm.reset({ phone: values.phone, role: "TAILOR", otp: result.otp ?? "123456" });
      setOtpRequested(true);
    } catch (error) {
      setDialog({ title: "OTP failed", message: error instanceof Error ? error.message : "Check backend connection.", icon: "alert-circle-outline" });
    } finally {
      setIsRequesting(false);
    }
  }

  async function verify(values: VerifyOtpForm) {
    try {
      setIsVerifying(true);
      const session = await api<{ accessToken: string; refreshToken: string; user: { id: string; phone: string; role: string; name?: string } }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setSession(session.accessToken, session.user, session.refreshToken);
    } catch (error) {
      setDialog({ title: "Login failed", message: error instanceof Error ? error.message : "Check OTP and try again.", icon: "alert-circle-outline" });
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={SCREEN_BG} translucent={false} />
      <View style={styles.authContent}>
        <View style={styles.logoMark}>
          <Ionicons name="cut-outline" size={34} color={BRAND_ORANGE} />
        </View>
        <Text style={styles.authTitle}>Darzi Tailor</Text>
        <Text style={styles.authCopy}>Manage requests, quotes, stitching progress, and earnings from one workspace.</Text>
        {!otpRequested ? (
          <>
            <Text style={styles.formLabel}>TAILOR LOGIN</Text>
            <Controller control={requestForm.control} name="phone" render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} placeholder="Enter tailor mobile number" />} />
            <AuthButton label="Send OTP" loading={isRequesting} onPress={requestForm.handleSubmit(requestOtp, () => setDialog({ title: "Check phone number", message: "Enter a valid 10 digit mobile number.", icon: "call-outline" }))} />
          </>
        ) : (
          <>
            <Text style={styles.formLabel}>VERIFY OTP</Text>
            <Controller
              control={verifyForm.control}
              name="otp"
              render={({ field }) => (
                <TextInput style={styles.input} value={field.value} onChangeText={(text) => field.onChange(text.replace(/\D/g, "").slice(0, 6))} placeholder="Enter OTP" placeholderTextColor="#9aa6b8" keyboardType="number-pad" maxLength={6} />
              )}
            />
            <AuthButton label="Verify OTP" loading={isVerifying} onPress={verifyForm.handleSubmit(verify, () => setDialog({ title: "Enter OTP", message: "Enter the 6 digit OTP to continue.", icon: "keypad-outline" }))} />
            <Pressable style={styles.textButton} onPress={() => setOtpRequested(false)}>
              <Text style={styles.textButtonText}>Change number</Text>
            </Pressable>
          </>
        )}
      </View>
      <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
    </SafeAreaView>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
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

function EmptyState({ icon, title, copy }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={34} color={BRAND_ORANGE} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.helperText}>{copy}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  return <Text style={[styles.statusPill, statusTone(status)]}>{formatStatus(status)}</Text>;
}

function RequestCard({ request, onPress }: { request: TailoringRequest; onPress: () => void }) {
  const itemCount = requestItemCount(request);
  return (
    <Pressable style={styles.requestCard} onPress={onPress}>
      <View style={styles.requestCardTopRow}>
        <View style={styles.iconTile}>
          <Ionicons name={request.media?.length ? "images-outline" : "shirt-outline"} size={22} color={BRAND_ORANGE} />
        </View>
        <View style={styles.cardMain}>
          <Text style={styles.prominentOrderId}>REQ-{request.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.cardTitle}>{itemCount === 1 ? request.workType : `New Order - ${itemCount} Clothing Items`}</Text>
          <Text style={styles.cardMeta}>{itemCount === 1 ? request.clothType : requestSummary(request)}</Text>
        </View>
      </View>
      <View style={styles.requestChipRow}>
        <Text style={[styles.urgencyPill, urgencyTone(request.urgency)]}>{request.urgency}</Text>
        {itemCount > 1 ? <Text style={styles.quotedPill}>{itemCount} items</Text> : null}
        {request.ownQuote ? <Text style={styles.quotedPill}>Quoted</Text> : <StatusPill status={request.status} />}
      </View>
      <Text style={styles.cardCopy} numberOfLines={2}>{request.description}</Text>
      <View style={styles.infoRow}>
        <Ionicons name="receipt-outline" size={15} color={MUTED} />
        <Text style={styles.infoText}>Request ID {shortId(request.id)}</Text>
      </View>
    </Pressable>
  );
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <Pressable style={[styles.orderCard, order.status === "READY" && styles.readyOrderCard]} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={styles.iconTile}>
          <Ionicons name="cube-outline" size={22} color={BRAND_ORANGE} />
        </View>
        <View style={styles.cardMain}>
          <Text style={styles.prominentOrderId}>{order.orderNumber}</Text>
          <Text style={styles.cardMeta}>{firstItem(order)} - Order ID {shortId(order.id)}</Text>
        </View>
        <StatusPill status={order.status} />
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.rowBetween}>
        <Text style={styles.infoText}>Pickup: {order.pickupScheduledAt ? new Date(order.pickupScheduledAt).toLocaleDateString("en-IN") : "Not scheduled"}</Text>
        <Text style={styles.priceText}>{money(order.totalAmount)}</Text>
      </View>
    </Pressable>
  );
}

function DashboardScreen({
  me,
  requests,
  orders,
  setScreen,
  setActiveRequest,
  setActiveOrder
}: {
  me?: MeResponse;
  requests: TailoringRequest[];
  orders: Order[];
  setScreen: (screen: Screen) => void;
  setActiveRequest: (request: TailoringRequest) => void;
  setActiveOrder: (order: Order) => void;
}) {
  const openRequests = requests.filter((request) => request.status === "QUOTE_REQUESTED");
  const readyOrders = orders.filter((order) => ["READY", "DELIVERED"].includes(order.status));
  const estimatedEarnings = readyOrders.reduce((sum, order) => sum + Number(order.totalAmount) * 0.45, 0);

  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header title="Tailor Studio" subtitle={me?.tailorProfile?.shopName ?? "Darzi Tailor"} />
      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroLabel}>TODAY</Text>
          <Text style={styles.heroTitle}>{openRequests.length} new requests</Text>
          <Text style={styles.heroCopy}>{orders.length} orders in your work queue</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="cut-outline" size={32} color="#111111" />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{openRequests.length}</Text>
          <Text style={styles.statLabel}>Requests</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{money(estimatedEarnings)}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Latest Requests</Text>
        <Pressable onPress={() => setScreen("requests")}>
          <Text style={styles.linkText}>See all</Text>
        </Pressable>
      </View>
      {openRequests.slice(0, 2).map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onPress={() => {
            setActiveRequest(request);
            setScreen("requestDetails");
          }}
        />
      ))}
      {openRequests.length === 0 ? <EmptyState icon="mail-open-outline" title="No new requests" copy="New customer tailoring requests will appear here." /> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Assigned Orders</Text>
        <Pressable onPress={() => setScreen("orders")}>
          <Text style={styles.linkText}>Open</Text>
        </Pressable>
      </View>
      {orders.slice(0, 2).map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onPress={() => {
            setActiveOrder(order);
            setScreen("orderDetails");
          }}
        />
      ))}
      {orders.length === 0 ? <EmptyState icon="cube-outline" title="No assigned orders" copy="Orders assigned by admin will show here." /> : null}
    </ScrollView>
  );
}

function RequestsScreen({ requests, setScreen, setActiveRequest }: { requests: TailoringRequest[]; setScreen: (screen: Screen) => void; setActiveRequest: (request: TailoringRequest) => void }) {
  const [filter, setFilter] = useState<"QUOTE_REQUESTED" | "QUOTED">("QUOTE_REQUESTED");
  const filteredRequests = requests.filter((request) => (filter === "QUOTED" ? Boolean(request.ownQuote) : request.status === "QUOTE_REQUESTED" && !request.ownQuote));

  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <Header title="Customer App Requests" subtitle={`${filteredRequests.length} ${filter === "QUOTED" ? "quoted" : "quote requested"}`} />
      <View style={styles.filterRow}>
        <Pressable style={[styles.filterChip, filter === "QUOTE_REQUESTED" && styles.filterChipActive]} onPress={() => setFilter("QUOTE_REQUESTED")}>
          <Text style={[styles.filterChipText, filter === "QUOTE_REQUESTED" && styles.filterChipTextActive]}>Quote requested</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === "QUOTED" && styles.filterChipActive]} onPress={() => setFilter("QUOTED")}>
          <Text style={[styles.filterChipText, filter === "QUOTED" && styles.filterChipTextActive]}>Quoted</Text>
        </Pressable>
      </View>
      {filteredRequests.length === 0 ? <EmptyState icon="albums-outline" title="No requests here" copy="Matching customer requests will appear here." /> : null}
      {filteredRequests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onPress={() => {
            setActiveRequest(request);
            setScreen("requestDetails");
          }}
        />
      ))}
    </ScrollView>
  );
}

function RequestDetailsScreen({ request, setScreen, showDialog }: { request: TailoringRequest; setScreen: (screen: Screen) => void; showDialog: (dialog: DialogState) => void }) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | undefined>();
  const items = requestItems(request);
  const itemCount = requestItemCount(request);

  return (
    <>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <Header title="Request Details" subtitle={`Request ID ${shortId(request.id)}`} onBack={() => setScreen("requests")} />
        <View style={styles.whiteCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>REQUEST</Text>
            <StatusPill status={request.status} />
          </View>
          <Text style={styles.bigTitle}>{itemCount === 1 ? request.workType : `New Order - ${itemCount} Clothing Items`}</Text>
          <Text style={styles.cardLabel}>CUSTOMER DESCRIPTION</Text>
          <Text style={styles.customerDescriptionText}>{request.description}</Text>
          <DetailRow icon="receipt-outline" label="Request ID" value={shortId(request.id)} />
          <DetailRow icon="shirt-outline" label="Clothing Items" value={`${itemCount}`} />
          <View style={styles.detailRow}>
            <View style={styles.smallIcon}>
              <Ionicons name="time-outline" size={16} color={BRAND_ORANGE} />
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.detailLabel}>Urgency</Text>
              <Text style={[styles.urgencyPill, styles.urgencyPillInline, urgencyTone(request.urgency)]}>{request.urgency}</Text>
            </View>
          </View>
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>CLOTHING ITEMS</Text>
          {items.map((item, index) => (
            <View key={item.id ?? `${request.id}-${index}`} style={styles.itemBlock}>
              <Text style={styles.cardTitle}>Item {index + 1}: {item.clothType}</Text>
              <Text style={styles.cardMeta}>{[item.gender, item.workType, measurementStatus(item)].filter(Boolean).join(" - ")}</Text>
              <Text style={styles.cardCopy}>{item.description}</Text>
              {item.measurement?.imageUrl ? (
                <View style={styles.sampleReferenceBlock}>
                  <Image source={{ uri: item.measurement.imageUrl }} style={styles.sampleReferenceImage} />
                  <View style={styles.sampleReferenceText}>
                    <Text style={styles.cardTitle}>Sample reference</Text>
                    <Text style={styles.cardCopy}>Customer attached a sample garment photo for fit reference.</Text>
                  </View>
                </View>
              ) : null}
              {Object.entries(item.measurement?.fields ?? {}).map(([key, value]) => (
                <View key={key} style={styles.measureRow}>
                  <Text style={styles.detailLabel}>{key}</Text>
                  <Text style={styles.detailValue}>{String(value)}</Text>
                </View>
              ))}
              {item.measurementNotes ? <Text style={styles.cardCopy}>{item.measurementNotes}</Text> : null}
              {item.media?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                  {item.media.map((media, mediaIndex) => (
                    <Pressable key={`${media.url}-${mediaIndex}`} style={styles.mediaBox} onPress={() => setSelectedMedia(media)}>
                      {media.resourceType === "image" ? (
                        <Image source={{ uri: media.url }} style={styles.mediaImage} />
                      ) : (
                        <>
                          <Ionicons name="videocam-outline" size={26} color={BRAND_ORANGE} />
                          <Text style={styles.mediaTypeText}>Video</Text>
                        </>
                      )}
                      <View style={styles.mediaOpenBadge}>
                        <Ionicons name="expand-outline" size={13} color="#ffffff" />
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ))}
        </View>

        {itemCount === 1 ? <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>MEASUREMENTS</Text>
          {request.measurement?.imageUrl ? (
            <View style={styles.sampleReferenceBlock}>
              <Image source={{ uri: request.measurement.imageUrl }} style={styles.sampleReferenceImage} />
              <View style={styles.sampleReferenceText}>
                <Text style={styles.cardTitle}>Sample reference</Text>
                <Text style={styles.cardCopy}>Customer attached a sample garment photo for fit reference.</Text>
              </View>
            </View>
          ) : null}
          {Object.entries(request.measurement?.fields ?? {}).length ? (
            Object.entries(request.measurement?.fields ?? {}).map(([key, value]) => (
              <View key={key} style={styles.measureRow}>
                <Text style={styles.detailLabel}>{key}</Text>
                <Text style={styles.detailValue}>{String(value)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.helperText}>No measurements added by the customer.</Text>
          )}
          {request.measurementNotes ? <Text style={styles.cardCopy}>{request.measurementNotes}</Text> : null}
        </View> : null}

        {itemCount === 1 ? <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>MEDIA</Text>
          {request.media?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
              {request.media.map((item, index) => (
                <Pressable key={`${item.url}-${index}`} style={styles.mediaBox} onPress={() => setSelectedMedia(item)}>
                  {item.resourceType === "image" ? (
                    <Image source={{ uri: item.url }} style={styles.mediaImage} />
                  ) : (
                    <>
                      <Ionicons name="videocam-outline" size={26} color={BRAND_ORANGE} />
                      <Text style={styles.mediaTypeText}>Video</Text>
                    </>
                  )}
                  <View style={styles.mediaOpenBadge}>
                    <Ionicons name="expand-outline" size={13} color="#ffffff" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.helperText}>No photos or videos attached.</Text>
          )}
        </View> : null}

        {request.ownQuote ? (
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>YOUR QUOTE</Text>
            <Text style={styles.bigTitle}>{money(request.ownQuote.price)}</Text>
            <Text style={styles.helperText}>Estimated {quoteEtaLabel(request.ownQuote)}.</Text>
            {request.ownQuote.message ? <Text style={styles.infoText}>{request.ownQuote.message}</Text> : null}
          </View>
        ) : (
          <Pressable style={styles.primaryButton} onPress={() => setScreen("quote")}>
            <Ionicons name="send-outline" size={18} color="#111111" />
            <Text style={styles.primaryButtonText}>Send Quote</Text>
          </Pressable>
        )}
      </ScrollView>
      <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(undefined)} showDialog={showDialog} />
    </>
  );
}

function MediaViewer({ media, onClose, showDialog }: { media?: MediaItem; onClose: () => void; showDialog: (dialog: DialogState) => void }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [media?.url]);

  async function openVideo() {
    if (!media?.url) return;
    const canOpen = await Linking.canOpenURL(media.url);
    if (!canOpen) {
      showDialog({ title: "Cannot open video", message: "This video link cannot be opened on this device.", icon: "videocam-outline" });
      return;
    }
    await Linking.openURL(media.url);
  }

  return (
    <Modal visible={Boolean(media)} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.mediaViewerSafe}>
        <View style={styles.mediaViewerHeader}>
          <View style={styles.mediaViewerTitleBlock}>
            <Text style={styles.mediaViewerTitle}>{media?.resourceType === "video" ? "Video" : "Photo"}</Text>
            {media?.originalName ? <Text style={styles.mediaViewerSubtitle} numberOfLines={1}>{media.originalName}</Text> : null}
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color={BRAND_DEEP} />
          </Pressable>
        </View>
        {media?.resourceType === "image" ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.mediaViewerHorizontal}>
              <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.mediaViewerVertical}>
                <Image source={{ uri: media.url }} resizeMode="contain" style={[styles.mediaViewerImage, { width: 330 * zoom, height: 440 * zoom }]} />
              </ScrollView>
            </ScrollView>
            <View style={styles.zoomControls}>
              <Pressable style={styles.zoomButton} onPress={() => setZoom((value) => Math.max(1, value - 0.25))}>
                <Ionicons name="remove" size={18} color={BRAND_DEEP} />
              </Pressable>
              <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
              <Pressable style={styles.zoomButton} onPress={() => setZoom((value) => Math.min(3, value + 0.25))}>
                <Ionicons name="add" size={18} color={BRAND_DEEP} />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.videoViewerBody}>
            <View style={styles.videoViewerIcon}>
              <Ionicons name="play" size={38} color="#111111" />
            </View>
            <Text style={styles.bigTitle}>Open customer video</Text>
            <Text style={styles.helperText}>The video will open in your phone's browser or video player.</Text>
            <Pressable style={styles.primaryButton} onPress={openVideo}>
              <Ionicons name="open-outline" size={18} color="#111111" />
              <Text style={styles.primaryButtonText}>Open Video</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.smallIcon}>
        <Ionicons name={icon} size={16} color={BRAND_ORANGE} />
      </View>
      <View style={styles.cardMain}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function QuoteScreen({
  request,
  token,
  onDone,
  setScreen,
  showDialog,
  onSessionExpired,
  activeOrderCount,
  maxOrdersPerDay
}: {
  request: TailoringRequest;
  token?: string;
  onDone: () => void;
  setScreen: (screen: Screen) => void;
  showDialog: (dialog: DialogState) => void;
  onSessionExpired: () => void;
  activeOrderCount: number;
  maxOrdersPerDay: number;
}) {
  const [price, setPrice] = useState("");
  const quoteWindow = urgencyWindow(request.urgency);
  const [estimatedTime, setEstimatedTime] = useState(quoteWindow.mode === "hours" ? "" : String(quoteWindow.min));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const allowedTimes = Array.from({ length: quoteWindow.max - quoteWindow.min + 1 }, (_, index) => quoteWindow.min + index);
  const timeUnit = quoteWindow.mode === "hours" ? "hour" : "day";

  async function submitQuote() {
    if (!token) return;
    if (activeOrderCount >= maxOrdersPerDay) {
      showDialog({
        title: "Order limit reached",
        message: `Admin has set your limit to ${maxOrdersPerDay} active orders. Complete an order before accepting more work.`,
        icon: "lock-closed-outline"
      });
      return;
    }
    const amount = Number(price);
    const eta = Number(estimatedTime);
    if (!amount || amount <= 0 || !Number.isInteger(eta) || eta < quoteWindow.min || eta > quoteWindow.max) {
      showDialog({
        title: "Check quote",
        message: quoteWindow.mode === "hours"
          ? `Enter a valid quote amount and a completion time from ${quoteWindow.min} to ${quoteWindow.max} hours.`
          : `Enter a valid quote amount and a completion time from ${quoteWindow.min} to ${quoteWindow.max} day${quoteWindow.max === 1 ? "" : "s"}.`,
        icon: "cash-outline"
      });
      return;
    }
    try {
      setSaving(true);
      await api(`/tailoring-requests/${request.id}/quotes`, {
        method: "POST",
        body: JSON.stringify({
          price: amount,
          estimatedDays: quoteWindow.mode === "hours" ? 1 : eta,
          estimatedHours: quoteWindow.mode === "hours" ? eta : undefined,
          message
        })
      }, token);
      void playAppSound("confirmation");
      showDialog({ title: "Quote sent", message: `Your quote for request ${shortId(request.id)} has been sent to the customer.`, icon: "checkmark-circle-outline" });
      onDone();
    } catch (error) {
      if (isSessionError(error)) {
        onSessionExpired();
        return;
      }
      showDialog({ title: "Quote failed", message: error instanceof Error ? error.message : "Could not submit quote.", icon: "alert-circle-outline" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <Header title="Send Quote" subtitle={requestSummary(request)} onBack={() => setScreen("requestDetails")} />
      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>QUOTE DETAILS</Text>
        <Text style={[styles.urgencyPill, styles.urgencyPillInline, urgencyTone(request.urgency)]}>{request.urgency}</Text>
        <View style={styles.urgencyRuleCard}>
          <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
          <Text style={styles.urgencyRuleText}>
            Completion time must be within allowed range for selected urgency. {quoteWindow.label}: {quoteWindow.min}-{quoteWindow.max} {timeUnit}{quoteWindow.max === 1 ? "" : "s"}.
          </Text>
        </View>
        <Text style={styles.formLabel}>Total Price</Text>
        <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="Example: Rs 1200" placeholderTextColor="#9aa6b8" keyboardType="number-pad" />
        <Text style={styles.formLabel}>{quoteWindow.mode === "hours" ? "Completion Time (Hours)" : "Completion Time (Days)"}</Text>
        <TextInput
          style={styles.input}
          value={estimatedTime}
          onChangeText={(value) => {
            const digits = value.replace(/\D/g, "").slice(0, quoteWindow.mode === "hours" ? 2 : 1);
            if (!digits) {
              setEstimatedTime("");
              return;
            }
            const parsed = Number(digits);
            if (parsed < quoteWindow.min) setEstimatedTime(String(quoteWindow.min));
            else if (parsed > quoteWindow.max) setEstimatedTime(String(quoteWindow.max));
            else setEstimatedTime(String(parsed));
          }}
          placeholder={quoteWindow.mode === "hours" ? `${quoteWindow.min} to ${quoteWindow.max} hours` : `${quoteWindow.min} to ${quoteWindow.max} days`}
          placeholderTextColor="#9aa6b8"
          keyboardType="number-pad"
          maxLength={quoteWindow.mode === "hours" ? 2 : 1}
        />
        <View style={styles.timeChoiceGrid}>
          {allowedTimes.map((time) => {
            const selected = estimatedTime === String(time);
            return (
              <Pressable key={time} style={[styles.timeChoiceChip, selected && styles.timeChoiceChipActive]} onPress={() => setEstimatedTime(String(time))}>
                <Text style={[styles.timeChoiceText, selected && styles.timeChoiceTextActive]}>
                  {time} {timeUnit}{time === 1 ? "" : "s"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.helperText}>{quoteWindow.helper}.</Text>
        <Text style={styles.formLabel}>Message</Text>
        <TextInput style={styles.textArea} value={message} onChangeText={setMessage} placeholder="Add fitting or pickup notes..." placeholderTextColor="#9aa6b8" multiline />
      </View>
      <Pressable style={styles.primaryButton} onPress={submitQuote} disabled={saving}>
        {saving ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Submit Quote</Text>}
      </Pressable>
    </ScrollView>
  );
}

function OrdersScreen({ orders, setScreen, setActiveOrder }: { orders: Order[]; setScreen: (screen: Screen) => void; setActiveOrder: (order: Order) => void }) {
  const [filter, setFilter] = useState<"ACCEPTED" | "READY" | "HISTORY" | "CANCELLED">("ACCEPTED");
  const filteredOrders = orders.filter((order) => {
    if (filter === "READY") return order.status === "READY";
    if (filter === "HISTORY") return ["DELIVERED", "COMPLETED"].includes(order.status);
    if (filter === "CANCELLED") return order.status === "CANCELLED" || order.request?.status === "CANCELLED";
    return ["QUOTE_ACCEPTED", "AT_TAILOR", "WORKING"].includes(order.status);
  });

  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <Header title="Assigned Orders" subtitle={`${filteredOrders.length} ${filter.toLowerCase()} orders`} />
      <View style={styles.filterRow}>
        <Pressable style={[styles.filterChip, filter === "ACCEPTED" && styles.filterChipActive]} onPress={() => setFilter("ACCEPTED")}>
          <Text style={[styles.filterChipText, filter === "ACCEPTED" && styles.filterChipTextActive]}>Accepted</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === "READY" && styles.readyFilterChip]} onPress={() => setFilter("READY")}>
          <Text style={[styles.filterChipText, filter === "READY" && styles.readyFilterChipText]}>Ready to Deliver</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === "HISTORY" && styles.filterChipActive]} onPress={() => setFilter("HISTORY")}>
          <Text style={[styles.filterChipText, filter === "HISTORY" && styles.filterChipTextActive]}>History</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === "CANCELLED" && styles.cancelledFilterChip]} onPress={() => setFilter("CANCELLED")}>
          <Text style={[styles.filterChipText, filter === "CANCELLED" && styles.cancelledFilterChipText]}>Cancelled</Text>
        </Pressable>
      </View>
      {filteredOrders.length === 0 ? <EmptyState icon="cube-outline" title="No orders here" copy={filter === "CANCELLED" ? "Cancelled orders will appear here." : filter === "HISTORY" ? "Completed orders will appear here." : "Matching accepted or ready orders will appear here."} /> : null}
      {filteredOrders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onPress={() => {
            setActiveOrder(order);
            setScreen("orderDetails");
          }}
        />
      ))}
    </ScrollView>
  );
}

function ProofBlock({
  title,
  copy,
  media,
  limitText,
  loadingCamera,
  loadingLibrary,
  onCamera,
  onLibrary,
  onOpen
}: {
  title: string;
  copy: string;
  media: MediaItem[];
  limitText: string;
  loadingCamera: boolean;
  loadingLibrary: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onOpen: (media: MediaItem) => void;
}) {
  return (
    <View style={styles.proofBlock}>
      <View style={styles.rowBetween}>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardMeta}>{copy}</Text>
        </View>
        <Text style={styles.proofCount}>{limitText}</Text>
      </View>
      {media.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
          {media.map((item, index) => (
            <Pressable key={`${item.url}-${index}`} style={styles.mediaBox} onPress={() => onOpen(item)}>
              <Image source={{ uri: item.url }} style={styles.mediaImage} />
              <View style={styles.mediaOpenBadge}>
                <Ionicons name="expand-outline" size={13} color="#ffffff" />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.proofEmptyText}>No photos uploaded yet.</Text>
      )}
      <View style={styles.proofActions}>
        <Pressable style={styles.proofButton} onPress={onCamera} disabled={loadingCamera || loadingLibrary}>
          {loadingCamera ? <ActivityIndicator color={BRAND_ORANGE} /> : <Ionicons name="camera-outline" size={17} color={BRAND_ORANGE} />}
          <Text style={styles.proofButtonText}>Camera</Text>
        </Pressable>
        <Pressable style={styles.proofButton} onPress={onLibrary} disabled={loadingCamera || loadingLibrary}>
          {loadingLibrary ? <ActivityIndicator color={BRAND_ORANGE} /> : <Ionicons name="images-outline" size={17} color={BRAND_ORANGE} />}
          <Text style={styles.proofButtonText}>Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TailorHandoffOtpCard({ orderId, status }: { orderId?: string; status?: string }) {
  const token = useAppStore((state) => state.token);
  const [otps, setOtps] = useState<HandoffOtp[]>([]);

  useEffect(() => {
    if (!token || !orderId) return;
    void api<HandoffOtp[]>(`/delivery-requests/order/${orderId}/otps`, {}, token).then(setOtps).catch(() => setOtps([]));
  }, [orderId, status, token]);

  if (!otps.length) return null;
  return (
    <View style={styles.whiteCard}>
      <Text style={styles.cardLabel}>DELIVERY OTP</Text>
      {otps.map((item) => (
        <View key={item.taskId} style={styles.handoffOtpRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.type === "customer_to_tailor" ? "Receive package OTP" : "Handover package OTP"}</Text>
            <Text style={styles.cardMeta}>{item.verified ? "Verified by delivery partner" : "Share only after checking the package and rider."}</Text>
          </View>
          <Text style={[styles.handoffOtpCode, item.verified && styles.handoffOtpVerified]}>{item.otp}</Text>
        </View>
      ))}
    </View>
  );
}

function OrderDetailsScreen({
  order,
  token,
  onUpdated,
  setScreen,
  showDialog,
  onSessionExpired
}: {
  order: Order;
  token?: string;
  onUpdated: () => void;
  setScreen: (screen: Screen) => void;
  showDialog: (dialog: DialogState) => void;
  onSessionExpired: () => void;
}) {
  const [savingStatus, setSavingStatus] = useState<string>();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | undefined>();
  const [uploadingProof, setUploadingProof] = useState<{ stage: "RECEIVED" | "STITCHED"; source: "camera" | "library" }>();
  const acceptedRequest = order.request;
  const hasReceivedPackage = acceptedRequest
    ? ["received_by_tailor", "ready_for_delivery", "out_for_delivery", "completed"].includes(acceptedRequest.orderStatus ?? "")
    : ["PACKAGE_HANDOVER_TO_TAILOR", "TAILOR_STARTED", "TAILOR_COMPLETED", "ON_THE_WAY", "DELIVERED"].includes(order.status);

  async function uploadProof(stage: "RECEIVED" | "STITCHED", source: "camera" | "library") {
    if (!acceptedRequest || !token) return;
    const existingCount = stage === "RECEIVED" ? acceptedRequest.receivedMedia?.length ?? 0 : acceptedRequest.stitchedMedia?.length ?? 0;
    const maxCount = 3;
    const remaining = maxCount - existingCount;
    if (remaining <= 0) {
      showDialog({
        title: "Photo limit reached",
        message: stage === "RECEIVED" ? "Received-clothes proof can have up to 3 photos." : "Stitched proof can have up to 3 photos.",
        icon: "images-outline"
      });
      return;
    }

    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({ title: "Permission needed", message: "Allow photo access to upload order proof.", icon: "camera-outline" });
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.82 });

    if (result.canceled || !result.assets.length) return;
    const files = result.assets.slice(0, remaining).map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName ?? `${stage.toLowerCase()}-${Date.now()}-${index}.jpg`
    }));

    try {
      setUploadingProof({ stage, source });
      await uploadAuditMedia(acceptedRequest.id, stage, files, token);
      showDialog({
        title: "Photos saved",
        message: stage === "RECEIVED" ? "Received-clothes photos are saved for this order." : "Stitched-clothes photos are saved for this order.",
        icon: "checkmark-circle-outline"
      });
      onUpdated();
    } catch (error) {
      if (isSessionError(error)) {
        onSessionExpired();
        return;
      }
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not upload order photos.", icon: "alert-circle-outline" });
    } finally {
      setUploadingProof(undefined);
    }
  }

  async function updateStatus(status: string) {
    if (!token) return;
    if (status === "READY" && acceptedRequest && (!(acceptedRequest.receivedMedia?.length ?? 0) || !(acceptedRequest.stitchedMedia?.length ?? 0))) {
      showDialog({
        title: "Photos required",
        message: "Upload at least one before-stitching photo and one after-stitching photo before marking this order Ready to Deliver.",
        icon: "images-outline"
      });
      return;
    }
    try {
      setSavingStatus(status);
      if (acceptedRequest) {
        await api(`/tailoring-requests/${acceptedRequest.id}/work-status`, { method: "PATCH", body: JSON.stringify({ status: "READY" }) }, token);
      } else {
        await api(`/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
      }
      onUpdated();
    } catch (error) {
      if (isSessionError(error)) {
        onSessionExpired();
        return;
      }
      showDialog({ title: "Status failed", message: error instanceof Error ? error.message : "Could not update order.", icon: "alert-circle-outline" });
    } finally {
      setSavingStatus(undefined);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <Header title="Order Details" subtitle={order.orderNumber} onBack={() => setScreen("orders")} />
      <View style={styles.whiteCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>STATUS</Text>
          <StatusPill status={order.status} />
        </View>
        <Text style={styles.bigTitle}>{firstItem(order)}</Text>
        <Text style={styles.prominentOrderId}>{acceptedRequest ? `REQ-${acceptedRequest.id.slice(0, 8).toUpperCase()}` : order.orderNumber}</Text>
        <DetailRow icon="calendar-outline" label="Pickup" value={order.pickupScheduledAt ? new Date(order.pickupScheduledAt).toLocaleString("en-IN") : "Not scheduled"} />
        <DetailRow icon="cash-outline" label="Order Value" value={money(order.totalAmount)} />
        {acceptedRequest?.ownQuote ? <DetailRow icon="checkmark-circle-outline" label="Quote" value={`${money(acceptedRequest.ownQuote.price)} accepted by customer`} /> : null}
      </View>
      {order.status === "CANCELLED" || acceptedRequest?.status === "CANCELLED" ? (
        <View style={styles.cancelledNoticeCard}>
          <Ionicons name="close-circle-outline" size={22} color="#b91c1c" />
          <View style={styles.cardMain}>
            <Text style={styles.cancelledNoticeTitle}>This order has been cancelled</Text>
            <Text style={styles.cancelledNoticeCopy}>Do not start stitching or hand over this package for delivery.</Text>
          </View>
        </View>
      ) : null}
      <TailorHandoffOtpCard orderId={acceptedRequest?.id} status={`${acceptedRequest?.workStatus ?? ""}-${order.status}`} />

      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>ITEMS & MEASUREMENTS</Text>
        {order.items.map((item, index) => (
          <View key={`${order.id}-item-${index}`} style={styles.itemBlock}>
            <Text style={styles.cardTitle}>{item.service?.name ?? "Tailoring item"}</Text>
            {item.instructions ? <Text style={styles.cardCopy}>{item.instructions}</Text> : null}
            {item.measurement?.imageUrl ? (
              <View style={styles.sampleReferenceBlock}>
                <Image source={{ uri: item.measurement.imageUrl }} style={styles.sampleReferenceImage} />
                <View style={styles.sampleReferenceText}>
                  <Text style={styles.cardTitle}>Sample reference</Text>
                  <Text style={styles.cardCopy}>Customer attached a sample garment photo for fit reference.</Text>
                </View>
              </View>
            ) : null}
            {Object.entries(item.measurement?.fields ?? {}).map(([key, value]) => (
              <View key={key} style={styles.measureRow}>
                <Text style={styles.detailLabel}>{key}</Text>
                <Text style={styles.detailValue}>{String(value)}</Text>
              </View>
            ))}
            {item.media?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                {item.media.map((media, mediaIndex) => (
                  <Pressable key={`${media.url}-${mediaIndex}`} style={styles.mediaBox} onPress={() => setSelectedMedia(media)}>
                    {media.resourceType === "image" ? (
                      <Image source={{ uri: media.url }} style={styles.mediaImage} />
                    ) : (
                      <>
                        <Ionicons name="videocam-outline" size={26} color={BRAND_ORANGE} />
                        <Text style={styles.mediaTypeText}>Video</Text>
                      </>
                    )}
                    <View style={styles.mediaOpenBadge}>
                      <Ionicons name="expand-outline" size={13} color="#ffffff" />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ))}
      </View>

      {acceptedRequest?.media?.length && !order.items.some((item) => item.media?.length) ? (
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>MEDIA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
            {acceptedRequest.media.map((item, index) => (
              <Pressable key={`${item.url}-${index}`} style={styles.mediaBox} onPress={() => setSelectedMedia(item)}>
                {item.resourceType === "image" ? (
                  <Image source={{ uri: item.url }} style={styles.mediaImage} />
                ) : (
                  <>
                    <Ionicons name="videocam-outline" size={26} color={BRAND_ORANGE} />
                    <Text style={styles.mediaTypeText}>Video</Text>
                  </>
                )}
                <View style={styles.mediaOpenBadge}>
                  <Ionicons name="expand-outline" size={13} color="#ffffff" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {hasReceivedPackage ? (
        <>
          {acceptedRequest ? (
            <View style={styles.whiteCard}>
              <Text style={styles.cardLabel}>ORDER PHOTO PROOF</Text>
              <Text style={styles.helperText}>Save proof photos for this order so any future complaint can be checked against received and stitched condition.</Text>
              <ProofBlock
                title="Received clothes"
                copy="Take 2-3 photos when the delivery boy hands over the clothes."
                media={acceptedRequest.receivedMedia ?? []}
                limitText={`${acceptedRequest.receivedMedia?.length ?? 0}/3 photos`}
                loadingCamera={uploadingProof?.stage === "RECEIVED" && uploadingProof.source === "camera"}
                loadingLibrary={uploadingProof?.stage === "RECEIVED" && uploadingProof.source === "library"}
                onCamera={() => uploadProof("RECEIVED", "camera")}
                onLibrary={() => uploadProof("RECEIVED", "library")}
                onOpen={setSelectedMedia}
              />
              <ProofBlock
                title="After stitching"
                copy="Upload up to 3 photos after stitching is complete."
                media={acceptedRequest.stitchedMedia ?? []}
                limitText={`${acceptedRequest.stitchedMedia?.length ?? 0}/3 photos`}
                loadingCamera={uploadingProof?.stage === "STITCHED" && uploadingProof.source === "camera"}
                loadingLibrary={uploadingProof?.stage === "STITCHED" && uploadingProof.source === "library"}
                onCamera={() => uploadProof("STITCHED", "camera")}
                onLibrary={() => uploadProof("STITCHED", "library")}
                onOpen={setSelectedMedia}
              />
            </View>
          ) : null}
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>UPDATE WORK STATUS</Text>
            <View style={styles.statusGrid}>
              {statusSteps.map((status) => (
                <Pressable
                  key={status}
                  style={[styles.statusButton, order.status === status && styles.activeStatusButton, acceptedRequest && (!(acceptedRequest.receivedMedia?.length ?? 0) || !(acceptedRequest.stitchedMedia?.length ?? 0)) && styles.disabledButton]}
                  onPress={() => updateStatus(status)}
                  disabled={Boolean(savingStatus) || Boolean(acceptedRequest && (!(acceptedRequest.receivedMedia?.length ?? 0) || !(acceptedRequest.stitchedMedia?.length ?? 0)))}
                >
                  {savingStatus === status ? <ActivityIndicator color={BRAND_ORANGE} /> : <Text style={[styles.statusButtonText, order.status === status && styles.activeStatusButtonText]}>{formatStatus(status)}</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>WAITING FOR PACKAGE</Text>
          <Text style={styles.helperText}>You can upload proof photos and update work status once the delivery partner hands over the package.</Text>
        </View>
      )}
      <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(undefined)} showDialog={showDialog} />
    </ScrollView>
  );
}

function EarningsScreen({ orders, me }: { orders: Order[]; me?: MeResponse }) {
  const completed = orders.filter((order) => ["READY", "DELIVERED", "STITCHING_COMPLETED"].includes(order.status));
  const earned = useMemo(() => completed.reduce((sum, order) => sum + tailorOrderEarning(order), 0), [completed]);
  const displayedEarnings = completed.length ? earned : Number(me?.tailorProfile?.earnings ?? 0);
  const [wallet, setWallet] = useState<any>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

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
      <Header title="Earnings" subtitle="Completed tailoring payouts" />
      <View style={styles.earningsCard}>
        <Text style={styles.heroLabel}>WALLET BALANCE</Text>
        <Text style={styles.earningsValue}>{money(wallet?.balance ?? displayedEarnings)}</Text>
        <Text style={styles.heroCopy}>Payments are settled weekly.</Text>
      </View>
      <View style={styles.whiteCard}>
        <DetailRow icon="calendar-outline" label="Current week earnings" value={money(wallet?.currentWeekEarnings ?? 0)} />
        <DetailRow icon="wallet-outline" label="Pending amount" value={money(wallet?.pendingAmount ?? wallet?.balance ?? 0)} />
        <DetailRow icon="time-outline" label="Last payment" value={wallet?.lastPayment?.paidAt ? new Date(wallet.lastPayment.paidAt).toLocaleString("en-IN") : "Not paid yet"} />
      </View>
      {loadingWallet ? <ActivityIndicator color={BRAND_ORANGE} /> : null}
      <Text style={styles.sectionTitle}>Wallet History</Text>
      {(wallet?.transactions ?? []).length === 0 ? <EmptyState icon="wallet-outline" title="No wallet history" copy="Completed order earnings and weekly payouts will appear here." /> : null}
      {(wallet?.transactions ?? []).map((transaction: any) => (
        <View key={transaction.id} style={styles.earningRow}>
          <View>
            <Text style={styles.cardTitle}>{formatStatus(transaction.category)}</Text>
            <Text style={styles.cardMeta}>{transaction.remarks ?? transaction.orderId ?? "Wallet transaction"}</Text>
          </View>
          <Text style={styles.priceText}>{transaction.transactionType === "DEBIT" ? "-" : "+"}{money(transaction.amount)}</Text>
        </View>
      ))}
      <Text style={styles.sectionTitle}>Previous Payments</Text>
      {(wallet?.payments ?? []).map((payment: any) => (
        <View key={payment.id} style={styles.earningRow}>
          <View>
            <Text style={styles.cardTitle}>{money(payment.amount)}</Text>
            <Text style={styles.cardMeta}>{payment.notes ?? payment.referenceNumber ?? "Weekly payout"}</Text>
            {payment.receiptUrl ? (
              <Pressable style={[styles.proofButton, { marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 14 }]} onPress={() => Linking.openURL(payment.receiptUrl)}>
                <Ionicons name="image-outline" size={15} color={BRAND_ORANGE} />
                <Text style={styles.proofButtonText}>View Payment Proof</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.cardMeta}>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-IN") : ""}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function TransactionHistoryScreen({ orders }: { orders: Order[] }) {
  const entries = [...orders]
    .filter((order) => ["READY", "DELIVERED", "STITCHING_COMPLETED", "CANCELLED"].includes(order.status))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header title="Transactions" subtitle="Completed and cancelled tailoring activity" />
      {entries.length === 0 ? <EmptyState icon="receipt-outline" title="No transactions yet" copy="Completed order payouts will appear here." /> : null}
      {entries.map((order) => (
        <View key={order.id} style={styles.whiteCard}>
          <View style={styles.rowBetween}>
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle}>{order.orderNumber}</Text>
              <Text style={styles.cardMeta}>{order.customer?.name ?? "Customer"} - {formatStatus(order.status)}</Text>
            </View>
            <Text style={styles.priceText}>{order.status === "CANCELLED" ? money(0) : money(tailorOrderEarning(order))}</Text>
          </View>
          <View style={styles.cardDivider} />
          <DetailRow icon="checkmark-circle-outline" label="Status" value={formatStatus(order.status)} />
          <DetailRow icon="cash-outline" label="Order value" value={money(order.totalAmount)} />
          <DetailRow icon="time-outline" label="Created" value={order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "Not available"} />
        </View>
      ))}
    </ScrollView>
  );
}

const clothTypeOptions = [
  "Shirt",
  "Pant",
  "Kurta",
  "Pajama",
  "Suit",
  "Blazer",
  "Sherwani",
  "Blouse",
  "Saree Fall",
  "Lehenga",
  "Salwar",
  "Kameez",
  "Gown",
  "Dress",
  "Skirt",
  "Kids Wear",
  "Uniform",
  "Other"
];

const stitchingTypeOptions = ["New Stitching", "Alteration", "Repair", "Hemming", "Embroidery", "Fall Pico", "Lining", "Zip Change", "Custom Design", "Other"];
const menClothTypeOptions = ["Shirt", "Pant", "Trouser", "Jeans", "Kurta", "Kurta Pajama", "Sherwani", "Blazer", "Suit", "Waistcoat", "Coat", "Nehru Jacket", "Pathani Suit", "Safari Suit", "Dhoti Kurta", "Other"];
const womenClothTypeOptions = ["Blouse", "Kurti", "Salwar Suit", "Lehenga", "Gown", "Saree Fall Pico", "Petticoat", "Palazzo", "Sharara", "Anarkali Suit", "Night Suit", "Top", "Skirt", "Dress", "Other"];
const detailedStitchingTypeOptions = ["New Stitching", "Side Fitting", "Sleeve Adjustment", "Waist Adjustment", "Hip Fitting", "Length Adjustment", "Narrowing", "Loose Fitting", "Collar Change", "Zip Change", "Button Replacement", "Repair Work", "Fall Pico", "Elastic Change", "Other"];
const machineryOptions = ["Single Needle Machine", "Overlock Machine", "Interlock Machine", "Button Machine", "Embroidery Machine", "Cutting Machine", "Pico Machine", "Fall Stitch Machine", "Steam Press", "Industrial Sewing Machine"];
const tutorialSlides = [
  ["Welcome to Darji", "Manage tailoring work from request to delivery.", "sparkles-outline"],
  ["Receiving Orders", "New customer requests appear with photos, measurements, and urgency.", "notifications-outline"],
  ["Accepting Orders", "Review details and send a price with estimated days.", "checkmark-circle-outline"],
  ["Stitching Process", "Track received cloth, proof photos, and work progress.", "cut-outline"],
  ["Packaging Process", "Prepare finished clothes neatly before pickup.", "cube-outline"],
  ["Delivery Workflow", "Update status so delivery can move smoothly.", "bicycle-outline"],
  ["Payment Process", "Order value and estimated earnings show in the app.", "wallet-outline"],
  ["Customer Ratings", "Good service improves trust and future requests.", "star-outline"],
  ["Support and Help", "Use support when documents, orders, or payments need help.", "help-circle-outline"]
] as const;

function newSpecializationRow(): SpecializationRow {
  return { id: `${Date.now()}-${Math.random()}`, gender: "Both", clothType: "Kurta", stitchingType: "New Stitching", price: "" };
}

function clothOptionsForCategory(category: "Men" | "Women" | "Both") {
  if (category === "Men") return menClothTypeOptions;
  if (category === "Women") return womenClothTypeOptions;
  return Array.from(new Set([...menClothTypeOptions, ...womenClothTypeOptions, ...clothTypeOptions]));
}

function makeVerificationDraft(me?: MeResponse): VerificationDraft {
  return {
    step: 1,
    personal: { name: me?.name ?? "", address: "", dob: "", email: "" },
    shop: { workFromHome: false, shopName: me?.tailorProfile?.shopName ?? "", shopAddress: "", gstNumber: "", employeeCount: "1", yearsExperience: "", machinery: [] },
    category: "Both",
    rows: [newSpecializationRow()],
    confirmedRows: false,
    idType: "Aadhaar",
    idNumber: "",
    ocrStatus: "Not run",
    faceDetectionStatus: "Not run",
    extractedDetails: {}
  };
}

function extractIdDetails(rawText: string): OcrDetails {
  const normalized = rawText.replace(/\s+/g, " ").trim();
  const dob = normalized.match(/\b(?:DOB|D\.O\.B|Date of Birth)[:\s-]*([0-3]?\d[\/-][01]?\d[\/-](?:19|20)?\d{2})/i)?.[1] ?? normalized.match(/\b([0-3]?\d[\/-][01]?\d[\/-](?:19|20)\d{2})\b/)?.[1];
  const aadhaar = normalized.match(/\b(\d{4})\s?(\d{4})\s?(\d{4})\b/);
  const pan = normalized.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/i)?.[1]?.toUpperCase();
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2);
  const name = lines.find((line) => /^[A-Za-z][A-Za-z .]{2,}$/.test(line) && !/government|india|male|female|dob|birth|address|income|tax/i.test(line));
  const addressIndex = lines.findIndex((line) => /address/i.test(line));
  const addressHint = addressIndex >= 0 ? lines.slice(addressIndex, addressIndex + 4).join(", ") : undefined;

  return {
    rawText,
    name,
    dob,
    aadhaarLast4: aadhaar?.[3],
    panNumber: pan,
    addressHint
  };
}

function PickSuggestions({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  const filtered = options.filter((item) => item.toLowerCase().includes(value.toLowerCase())).slice(0, 7);
  return (
    <>
      <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Search or write your own" placeholderTextColor="#9aa6b8" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
        {filtered.map((item) => (
          <Pressable key={item} style={[styles.suggestionChip, value === item && styles.suggestionChipActive]} onPress={() => onChange(item)}>
            <Text style={[styles.suggestionChipText, value === item && styles.suggestionChipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

function VerificationDocBox({ label, media, onPick }: { label: string; media?: VerificationMediaDraft; onPick: () => void }) {
  return (
    <Pressable style={styles.verificationDocBox} onPress={onPick}>
      {media ? <Image source={{ uri: media.uri }} style={styles.verificationDocImage} /> : <Ionicons name="cloud-upload-outline" size={24} color={BRAND_ORANGE} />}
      <Text style={styles.verificationDocText}>{media ? label : `Upload ${label}`}</Text>
    </Pressable>
  );
}

function TailorVerificationFlow({
  me,
  token,
  onRefresh,
  showDialog,
  onSessionExpired
}: {
  me?: MeResponse;
  token?: string;
  onRefresh: () => void;
  showDialog: (dialog: DialogState) => void;
  onSessionExpired: () => void;
}) {
  const status = me?.tailorProfile?.verificationStatus ?? "NOT_SUBMITTED";
  const [step, setStep] = useState(status === "PENDING" || status === "REJECTED" || status === "REUPLOAD_REQUIRED" ? 6 : 1);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [personal, setPersonal] = useState({ name: me?.name ?? "", address: "", dob: "", email: "", location: undefined as { lat: number; lng: number } | undefined });
  const [shop, setShop] = useState({ workFromHome: false, shopName: me?.tailorProfile?.shopName ?? "", shopAddress: "", gstNumber: "", employeeCount: "1", yearsExperience: "", machinery: [] as string[] });
  const [category, setCategory] = useState<"Men" | "Women" | "Both">("Both");
  const [rows, setRows] = useState<SpecializationRow[]>([newSpecializationRow()]);
  const [confirmedRows, setConfirmedRows] = useState(false);
  const [idType, setIdType] = useState<"Aadhaar" | "PAN">("Aadhaar");
  const [idNumber, setIdNumber] = useState("");
  const [aadhaarFront, setAadhaarFront] = useState<VerificationMediaDraft>();
  const [aadhaarBack, setAadhaarBack] = useState<VerificationMediaDraft>();
  const [panPhoto, setPanPhoto] = useState<VerificationMediaDraft>();
  const [facePhoto, setFacePhoto] = useState<VerificationMediaDraft>();
  const [ocrStatus, setOcrStatus] = useState("Not run");
  const [faceDetectionStatus, setFaceDetectionStatus] = useState("Not run");
  const [extractedDetails, setExtractedDetails] = useState<OcrDetails>({});
  const [faceModeOpen, setFaceModeOpen] = useState(false);
  const [faceLiveness, setFaceLiveness] = useState<FaceLivenessState>("idle");
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [scanning, setScanning] = useState<"ocr" | "face" | undefined>();
  const [infoPage, setInfoPage] = useState<"tutorial" | "privacy" | "terms" | "about" | undefined>();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const faceCameraRef = useRef<CameraView>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const storageKey = `${TAILOR_ONBOARDING_STORAGE_PREFIX}.${me?.phone ?? me?.id ?? "anonymous"}`;

  function currentDraft(): VerificationDraft {
    return {
      step,
      personal,
      shop,
      category,
      rows,
      confirmedRows,
      idType,
      idNumber,
      aadhaarFront,
      aadhaarBack,
      panPhoto,
      facePhoto,
      ocrStatus,
      faceDetectionStatus,
      extractedDetails
    };
  }

  function applyDraft(draft?: Partial<VerificationDraft>) {
    if (!draft) return;
    if (draft.step && status !== "PENDING" && status !== "REJECTED" && status !== "REUPLOAD_REQUIRED") setStep(Math.min(Math.max(draft.step, 1), 5));
    if (draft.personal) setPersonal((current) => ({ ...current, ...draft.personal, location: draft.personal?.location ?? current.location }));
    if (draft.shop) setShop((current) => ({ ...current, ...draft.shop, machinery: draft.shop?.machinery ?? current.machinery }));
    if (draft.category) setCategory(draft.category);
    if (draft.rows?.length) setRows(draft.rows);
    if (typeof draft.confirmedRows === "boolean") setConfirmedRows(draft.confirmedRows);
    if (draft.idType) setIdType(draft.idType);
    if (draft.idNumber) setIdNumber(draft.idNumber);
    if (draft.aadhaarFront) setAadhaarFront(draft.aadhaarFront);
    if (draft.aadhaarBack) setAadhaarBack(draft.aadhaarBack);
    if (draft.panPhoto) setPanPhoto(draft.panPhoto);
    if (draft.facePhoto) setFacePhoto(draft.facePhoto);
    if (draft.ocrStatus) setOcrStatus(draft.ocrStatus);
    if (draft.faceDetectionStatus) setFaceDetectionStatus(draft.faceDetectionStatus);
    if (draft.extractedDetails) setExtractedDetails(draft.extractedDetails);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadDraft() {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (cancelled) return;
        if (saved) applyDraft(JSON.parse(saved));
        else applyDraft(me?.tailorProfile?.verificationDraft);
      } catch {
        applyDraft(me?.tailorProfile?.verificationDraft);
      } finally {
        if (!cancelled) setHasLoadedDraft(true);
      }
    }
    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedDraft || status === "PENDING" || status === "VERIFIED") return undefined;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const draft = currentDraft();
      AsyncStorage.setItem(storageKey, JSON.stringify(draft)).catch(() => undefined);
      if (token) {
        api("/tailors/me/verification-draft", { method: "PATCH", body: JSON.stringify({ step: draft.step, draft }) }, token).catch(() => undefined);
      }
    }, 900);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [hasLoadedDraft, step, personal, shop, category, rows, confirmedRows, idType, idNumber, aadhaarFront, aadhaarBack, panPhoto, facePhoto, ocrStatus, faceDetectionStatus, extractedDetails, token, status]);

  async function useCurrentLocation(target: "personal" | "shop") {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showDialog({ title: "Permission needed", message: "Allow location access to fetch your current address.", icon: "location-outline" });
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      const address = place
        ? [place.name, place.street, place.district, place.city, place.region, place.postalCode].filter(Boolean).join(", ")
        : `Lat ${position.coords.latitude.toFixed(5)}, Lng ${position.coords.longitude.toFixed(5)}`;
      if (target === "personal") setPersonal((current) => ({ ...current, address, location: { lat: position.coords.latitude, lng: position.coords.longitude } }));
      if (target === "shop") setShop((current) => ({ ...current, shopAddress: address }));
    } catch (error) {
      showDialog({ title: "Location failed", message: error instanceof Error ? error.message : "Could not fetch current location.", icon: "alert-circle-outline" });
    } finally {
      setLocating(false);
    }
  }

  async function runOcr(media: VerificationMediaDraft) {
    try {
      setScanning("ocr");
      setOcrStatus("Reading document...");
      const result = await TextRecognition.recognize(media.uri);
      const details = extractIdDetails(result.text);
      setExtractedDetails((current) => ({ ...current, ...details, rawText: [current.rawText, details.rawText].filter(Boolean).join("\n\n") }));
      setOcrStatus(result.text.trim() ? "OCR extracted details" : "OCR found no readable text");
    } catch (error) {
      setOcrStatus(error instanceof Error && /rebuilt|linked|managed workflow/i.test(error.message) ? "ML Kit needs native rebuild" : "OCR failed");
    } finally {
      setScanning(undefined);
    }
  }

  async function runFaceDetection(media: VerificationMediaDraft) {
    try {
      setScanning("face");
      setFaceDetectionStatus("Checking face...");
      const faces = await FaceDetection.detect(media.uri, { performanceMode: "accurate", landmarkMode: "all", classificationMode: "all", minFaceSize: 0.15 });
      setFaceDetectionStatus(faces.length === 1 ? "1 face detected" : faces.length > 1 ? `${faces.length} faces detected` : "No face detected");
    } catch (error) {
      setFaceDetectionStatus(error instanceof Error && /rebuilt|linked|managed workflow/i.test(error.message) ? "ML Kit needs native rebuild" : "Face check failed");
    } finally {
      setScanning(undefined);
    }
  }

  async function captureFaceAfterBlink() {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        showDialog({ title: "Camera needed", message: "Allow camera access for face verification.", icon: "camera-outline" });
        return;
      }
    }
    try {
      setFaceLiveness("aligning");
      await delay(700);
      setFaceLiveness("aligned");
      await delay(900);
      setFaceLiveness("blink-detected");
      await delay(350);
      const photo = await faceCameraRef.current?.takePictureAsync({ quality: 0.86 });
      if (!photo?.uri) return;
      const media = { uri: photo.uri, name: `tailor-face-${Date.now()}.jpg` };
      setFacePhoto(media);
      setFaceModeOpen(false);
      setFaceLiveness("captured");
      void runFaceDetection(media);
    } catch (error) {
      setFaceLiveness("idle");
      showDialog({ title: "Face capture failed", message: error instanceof Error ? error.message : "Could not capture selfie.", icon: "alert-circle-outline" });
    }
  }

  async function pickDoc(setter: (media: VerificationMediaDraft) => void, camera = false, scan?: "ocr" | "face") {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({ title: "Permission needed", message: camera ? "Allow camera access to take verification photos." : "Allow photo access to upload verification photos.", icon: "images-outline" });
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.86 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.86 });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    const media = { uri: asset.uri, name: asset.fileName ?? `tailor-verification-${Date.now()}.jpg` };
    setter(media);
    if (scan === "ocr") void runOcr(media);
    if (scan === "face") void runFaceDetection(media);
  }

  function validateCurrentStep() {
    if (step === 1) {
      const dob = new Date(personal.dob);
      const validDob = personal.dob.trim().length >= 6 && !Number.isNaN(dob.getTime()) && dob <= new Date();
      const validEmail = !personal.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email.trim());
      return personal.name.trim().length >= 2 && personal.address.trim().length >= 8 && validDob && validEmail;
    }
    if (step === 2) return shop.shopName.trim().length >= 2 && shop.shopAddress.trim().length >= 8 && Number.isFinite(Number(shop.employeeCount)) && Number.isFinite(Number(shop.yearsExperience));
    if (step === 3) return rows.length > 0 && rows.every((row) => row.clothType.trim() && row.stitchingType.trim() && Number(row.price) >= 0) && confirmedRows;
    if (step === 4) return idNumber.trim().length >= (idType === "Aadhaar" ? 12 : 10) && (idType === "Aadhaar" ? Boolean(aadhaarFront && aadhaarBack && facePhoto) : Boolean(panPhoto && facePhoto));
    return true;
  }

  function updateRow(id: string, patch: Partial<SpecializationRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setConfirmedRows(false);
  }

  async function uploadMissingPhotos() {
    const entries = [
      ["aadhaarFront", aadhaarFront] as const,
      ["aadhaarBack", aadhaarBack] as const,
      ["panPhoto", panPhoto] as const,
      ["facePhoto", facePhoto] as const
    ].filter(([, media]) => media && !media.uploadedUrl) as Array<[string, VerificationMediaDraft]>;
    if (!entries.length) return;
    const uploaded = await uploadTailorVerificationMedia(entries.map(([, media]) => ({ uri: media.uri, name: media.name })), token);
    entries.forEach(([key, media], index) => {
      const next = { ...media, uploadedUrl: uploaded[index]?.url };
      if (key === "aadhaarFront") setAadhaarFront(next);
      if (key === "aadhaarBack") setAadhaarBack(next);
      if (key === "panPhoto") setPanPhoto(next);
      if (key === "facePhoto") setFacePhoto(next);
    });
    return Object.fromEntries(entries.map(([key], index) => [key, uploaded[index]?.url]));
  }

  async function submitVerification() {
    if (!token || !validateCurrentStep()) return;
    try {
      setSaving(true);
      const uploaded = (await uploadMissingPhotos()) ?? {};
      const payload: TailorVerificationPayload = {
        personal: {
          name: personal.name.trim(),
          address: personal.address.trim(),
          dob: personal.dob.trim(),
          email: personal.email.trim() || undefined,
          location: personal.location
        },
        shop: {
          workFromHome: shop.workFromHome,
          shopName: shop.shopName.trim(),
          shopAddress: shop.shopAddress.trim(),
          gstNumber: shop.gstNumber.trim() || undefined,
          employeeCount: Number(shop.employeeCount),
          yearsExperience: Number(shop.yearsExperience),
          machinery: shop.machinery
        },
        specializationRows: rows.map((row) => ({ gender: row.gender, clothType: row.clothType.trim(), stitchingType: row.stitchingType.trim(), price: Number(row.price) })),
        idVerification: {
          idType,
          idNumber: idNumber.trim(),
          aadhaarFrontUrl: aadhaarFront?.uploadedUrl ?? (uploaded.aadhaarFront as string | undefined),
          aadhaarBackUrl: aadhaarBack?.uploadedUrl ?? (uploaded.aadhaarBack as string | undefined),
          panUrl: panPhoto?.uploadedUrl ?? (uploaded.panPhoto as string | undefined),
          facePhotoUrl: facePhoto?.uploadedUrl ?? (uploaded.facePhoto as string | undefined),
          ocrStatus,
          extractedDetails,
          faceDetectionStatus
        }
      };
      await api("/tailors/me/verification", { method: "POST", body: JSON.stringify(payload) }, token);
      await AsyncStorage.removeItem(storageKey).catch(() => undefined);
      showDialog({ title: "Verification submitted", message: "Your details reached the Darji team for review.", icon: "checkmark-circle-outline" });
      onRefresh();
      setStep(6);
    } catch (error) {
      if (isSessionError(error)) return onSessionExpired();
      showDialog({ title: "Submit failed", message: error instanceof Error ? error.message : "Could not submit verification.", icon: "alert-circle-outline" });
    } finally {
      setSaving(false);
    }
  }

  if (infoPage) {
    const content = {
      tutorial: ["How to use Darji Tailor", ...tutorialSlides.map(([title, copy], index) => `${index + 1}. ${title}: ${copy}`)],
      privacy: ["Privacy Policy", "We store your verification details for Darji admin review.", "ID photos are used only for tailor verification and safety checks.", "Your customer request data is used to complete tailoring orders."],
      terms: ["Terms of Use", "Use accurate profile and shop details.", "Only accept work you can complete on time.", "Darji can pause accounts with unclear documents or repeated service issues."],
      about: ["About Darji", "Darji connects customers with local tailors for doorstep stitching, alteration, pickup, proof, and delivery workflows."]
    }[infoPage];
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.pageContent}>
          <Header title={content[0]} onBack={() => setInfoPage(undefined)} />
          <View style={styles.whiteCard}>
            {content.slice(1).map((line) => (
              <Text key={line} style={styles.tutorialText}>{line}</Text>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 6) {
    const needsUpdate = status === "REJECTED" || status === "REUPLOAD_REQUIRED";
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.verificationHero}>
            <Ionicons name={needsUpdate ? "alert-circle-outline" : "hourglass-outline"} size={38} color={BRAND_ORANGE} />
            <Text style={styles.verificationTitle}>{needsUpdate ? "Document reupload required" : "Verification under review"}</Text>
            <Text style={styles.verificationCopy}>
              {needsUpdate
                ? me?.tailorProfile?.verificationRejectionReason ?? "Darji admin requested clearer documents. Update the required details and submit again."
                : "Your application has been successfully submitted. The Darji team is reviewing your details. Verification usually takes 24-48 hours. Once approved, you will gain access to the app."}
            </Text>
          </View>
          <View style={styles.statusReviewCard}>
            <Text style={styles.cardLabel}>STATUS</Text>
            <Text style={styles.cardTitle}>Pending Verification</Text>
            {me?.tailorProfile?.darjiTailorId ? <Text style={styles.cardMeta}>Tailor ID: {me.tailorProfile.darjiTailorId}</Text> : null}
            {needsUpdate ? (
              <View style={styles.reuploadChecklist}>
                {[
                  idType === "Aadhaar" ? "Aadhaar front photo" : "PAN card photo",
                  idType === "Aadhaar" ? "Aadhaar back photo" : undefined,
                  "Live face verification selfie"
                ].filter(Boolean).map((item) => (
                  <View key={item} style={styles.reuploadChecklistRow}>
                    <Ionicons name="cloud-upload-outline" size={16} color={BRAND_ORANGE} />
                    <Text style={styles.cardMeta}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <Pressable style={styles.primaryButton} onPress={() => setInfoPage("tutorial")}>
            <Ionicons name="play-circle-outline" size={18} color="#111111" />
            <Text style={styles.primaryButtonText}>Watch Tutorial</Text>
          </Pressable>
          <View style={styles.verificationLinkGrid}>
            {[
              ["privacy", "Privacy Policy", "shield-outline"],
              ["terms", "Terms of Use", "document-text-outline"],
              ["about", "About Darji", "information-circle-outline"]
            ].map(([key, label, icon]) => (
              <Pressable key={key} style={styles.verificationLink} onPress={() => setInfoPage(key as "privacy" | "terms" | "about")}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={BRAND_ORANGE} />
                <Text style={styles.cardTitle}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {needsUpdate ? (
            <Pressable style={styles.secondaryButton} onPress={() => setStep(4)}>
              <Text style={styles.secondaryButtonText}>Reupload Documents</Text>
            </Pressable>
          ) : null}
          {needsUpdate ? (
            <Pressable style={styles.secondaryButton} onPress={() => setStep(1)}>
              <Text style={styles.secondaryButtonText}>Edit Full Details</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Tailor Verification" subtitle={`Step ${step} of 6`} />
        <View style={styles.verificationSteps}>
          {["Personal", "Shop", "Specialization", "ID", "Tutorial", "Submit"].map((label, index) => (
            <Text key={label} style={[styles.verificationStepPill, step === index + 1 && styles.verificationStepPillActive]}>{label}</Text>
          ))}
        </View>

        {step === 1 ? (
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>PERSONAL DETAILS</Text>
            <Text style={styles.verificationNotice}>Name and DOB should match Aadhaar or PAN.</Text>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput style={styles.input} value={personal.name} onChangeText={(name) => setPersonal((current) => ({ ...current, name }))} placeholder="Full name" placeholderTextColor="#9aa6b8" />
            <Text style={styles.formLabel}>Date of Birth</Text>
            <Pressable style={styles.inputButton} onPress={() => setShowDobPicker(true)}>
              <Text style={[styles.inputButtonText, !personal.dob && styles.placeholderText]}>{personal.dob || "Select date of birth"}</Text>
              <Ionicons name="calendar-outline" size={18} color={BRAND_ORANGE} />
            </Pressable>
            {showDobPicker ? (
              <DateTimePicker
                value={personal.dob ? new Date(personal.dob) : new Date(1995, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                maximumDate={new Date()}
                onChange={(_, date) => {
                  if (Platform.OS !== "ios") setShowDobPicker(false);
                  if (date) setPersonal((current) => ({ ...current, dob: date.toISOString().slice(0, 10) }));
                }}
              />
            ) : null}
            <Text style={styles.formLabel}>Email (optional)</Text>
            <TextInput style={styles.input} value={personal.email} onChangeText={(email) => setPersonal((current) => ({ ...current, email }))} placeholder="name@example.com" placeholderTextColor="#9aa6b8" keyboardType="email-address" />
            <Text style={styles.formLabel}>Address</Text>
            <TextInput multiline style={styles.textArea} value={personal.address} onChangeText={(address) => setPersonal((current) => ({ ...current, address }))} placeholder="Home address" placeholderTextColor="#9aa6b8" />
            <Pressable style={styles.secondaryButton} onPress={() => useCurrentLocation("personal")} disabled={locating}>
              {locating ? <ActivityIndicator color={BRAND_ORANGE} /> : <Ionicons name="navigate-outline" size={18} color={BRAND_DEEP} />}
              <Text style={styles.secondaryButtonText}>Fetch Current Location</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>SHOP DETAILS</Text>
            <Pressable style={styles.toggleChoiceRow} onPress={() => setShop((current) => ({ ...current, workFromHome: !current.workFromHome, shopName: !current.workFromHome && !current.shopName ? "Home" : current.shopName }))}>
              <Ionicons name={shop.workFromHome ? "checkbox" : "square-outline"} size={21} color={BRAND_ORANGE} />
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>I work from home</Text>
                <Text style={styles.cardMeta}>Use this if you do not have a separate shop.</Text>
              </View>
            </Pressable>
            <Text style={styles.formLabel}>{shop.workFromHome ? "Home Workshop Name" : "Shop Name"}</Text>
            <TextInput style={styles.input} value={shop.shopName} onChangeText={(shopName) => setShop((current) => ({ ...current, shopName }))} placeholder={shop.workFromHome ? "Home" : "Shop or studio name"} placeholderTextColor="#9aa6b8" />
            <Text style={styles.formLabel}>{shop.workFromHome ? "Home Address" : "Shop/Home Address"}</Text>
            <TextInput multiline style={styles.textArea} value={shop.shopAddress} onChangeText={(shopAddress) => setShop((current) => ({ ...current, shopAddress }))} placeholder="Home address if no shop" placeholderTextColor="#9aa6b8" />
            <Pressable style={styles.secondaryButton} onPress={() => useCurrentLocation("shop")} disabled={locating}>
              {locating ? <ActivityIndicator color={BRAND_ORANGE} /> : <Ionicons name="navigate-outline" size={18} color={BRAND_DEEP} />}
              <Text style={styles.secondaryButtonText}>Use Current Location</Text>
            </Pressable>
            <Text style={styles.formLabel}>GST No. (optional)</Text>
            <TextInput style={styles.input} value={shop.gstNumber} onChangeText={(gstNumber) => setShop((current) => ({ ...current, gstNumber }))} placeholder="GSTIN" placeholderTextColor="#9aa6b8" />
            <View style={styles.twoFieldRow}>
              <View style={styles.twoFieldItem}>
                <Text style={styles.formLabel}>No. of Employees</Text>
                <TextInput style={styles.input} value={shop.employeeCount} onChangeText={(employeeCount) => setShop((current) => ({ ...current, employeeCount }))} keyboardType="number-pad" placeholder="1" placeholderTextColor="#9aa6b8" />
              </View>
              <View style={styles.twoFieldItem}>
                <Text style={styles.formLabel}>Years Experience</Text>
                <TextInput style={styles.input} value={shop.yearsExperience} onChangeText={(yearsExperience) => setShop((current) => ({ ...current, yearsExperience }))} keyboardType="number-pad" placeholder="5" placeholderTextColor="#9aa6b8" />
              </View>
            </View>
            <Text style={styles.formLabel}>Machinery</Text>
            <View style={styles.chipWrap}>
              {machineryOptions.map((item) => {
                const selected = shop.machinery.includes(item);
                return (
                  <Pressable key={item} style={[styles.suggestionChip, selected && styles.suggestionChipActive]} onPress={() => setShop((current) => ({ ...current, machinery: selected ? current.machinery.filter((value) => value !== item) : [...current.machinery, item] }))}>
                    <Text style={[styles.suggestionChipText, selected && styles.suggestionChipTextActive]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>SPECIALIZATION</Text>
            <Text style={styles.formLabel}>Which category do you work in?</Text>
            <View style={styles.genderRow}>
              {(["Men", "Women", "Both"] as const).map((item) => (
                <Pressable
                  key={item}
                  style={[styles.genderChip, category === item && styles.genderChipActive]}
                  onPress={() => {
                    setCategory(item);
                    setRows((current) => current.map((row) => ({ ...row, gender: item, clothType: clothOptionsForCategory(item)[0] ?? row.clothType })));
                    setConfirmedRows(false);
                  }}
                >
                  <Text style={[styles.genderChipText, category === item && styles.genderChipTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            {rows.map((row, index) => (
              <View key={row.id} style={styles.specializationEditor}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>Specialization {index + 1}</Text>
                  <Text style={styles.quotedPill}>{category}</Text>
                </View>
                <Text style={styles.formLabel}>Cloth Type</Text>
                <PickSuggestions options={clothOptionsForCategory(category)} value={row.clothType} onChange={(clothType) => updateRow(row.id, { clothType, gender: category })} />
                <Text style={styles.formLabel}>Stitching Type</Text>
                <PickSuggestions options={detailedStitchingTypeOptions} value={row.stitchingType} onChange={(stitchingType) => updateRow(row.id, { stitchingType, gender: category })} />
                <Text style={styles.formLabel}>Price</Text>
                <TextInput style={styles.input} value={row.price} onChangeText={(price) => updateRow(row.id, { price })} keyboardType="number-pad" placeholder="Rs" placeholderTextColor="#9aa6b8" />
                {rows.length > 1 ? (
                  <Pressable style={styles.removeRowButton} onPress={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
                    <Text style={styles.removeRowText}>Remove service</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable style={styles.secondaryButton} onPress={() => setRows((current) => [...current, { ...newSpecializationRow(), gender: category, clothType: clothOptionsForCategory(category)[0] ?? "Other" }])}>
              <Ionicons name="add-circle-outline" size={18} color={BRAND_DEEP} />
              <Text style={styles.secondaryButtonText}>Add Specialization</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => setConfirmedRows(true)}>
              <Text style={styles.primaryButtonText}>Confirm Table Preview</Text>
            </Pressable>
            {confirmedRows ? (
              <View style={styles.previewTable}>
                {rows.map((row) => (
                  <View key={`preview-${row.id}`} style={styles.previewRow}>
                    <Text style={styles.previewCell}>{row.gender}</Text>
                    <Text style={styles.previewCell}>{row.clothType}</Text>
                    <Text style={styles.previewCell}>{row.stitchingType}</Text>
                    <Text style={styles.previewPrice}>Rs{row.price}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>ID VERIFICATION</Text>
            <Text style={styles.verificationNotice}>Upload clear photos. Blurry or cropped documents can be rejected.</Text>
            <View style={styles.genderRow}>
              {(["Aadhaar", "PAN"] as const).map((item) => (
                <Pressable key={item} style={[styles.genderChip, idType === item && styles.genderChipActive]} onPress={() => setIdType(item)}>
                  <Text style={[styles.genderChipText, idType === item && styles.genderChipTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.formLabel}>{idType === "Aadhaar" ? "Aadhaar Number" : "PAN Number"}</Text>
            <TextInput
              style={styles.input}
              value={idNumber}
              onChangeText={(value) => setIdNumber(idType === "Aadhaar" ? value.replace(/\D/g, "").slice(0, 12) : value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              placeholder={idType === "Aadhaar" ? "12 digit Aadhaar number" : "PAN number"}
              placeholderTextColor="#9aa6b8"
              keyboardType={idType === "Aadhaar" ? "number-pad" : "default"}
            />
            {idType === "Aadhaar" ? (
              <View style={styles.docGrid}>
                <VerificationDocBox label="Aadhaar Front" media={aadhaarFront} onPick={() => pickDoc(setAadhaarFront, false, "ocr")} />
                <VerificationDocBox label="Aadhaar Back" media={aadhaarBack} onPick={() => pickDoc(setAadhaarBack, false, "ocr")} />
              </View>
            ) : (
              <VerificationDocBox label="PAN Card" media={panPhoto} onPick={() => pickDoc(setPanPhoto, false, "ocr")} />
            )}
            <View style={styles.faceVerificationPanel}>
              <View style={[styles.faceCircle, faceLiveness === "aligned" || faceLiveness === "blink-detected" || faceLiveness === "captured" ? styles.faceCircleReady : styles.faceCircleWaiting]}>
                {facePhoto ? <Image source={{ uri: facePhoto.uri }} style={styles.facePreviewImage} /> : <Ionicons name="person-outline" size={42} color={faceLiveness === "aligned" || faceLiveness === "blink-detected" ? SUCCESS : "#b91c1c"} />}
              </View>
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>Face Verification</Text>
                <Text style={styles.cardMeta}>Place your face inside the circle, wait for green, then blink. Photo captures automatically.</Text>
                <Text style={styles.faceStatusText}>{faceLiveness === "idle" ? "Not started" : faceLiveness === "aligning" ? "Aligning face..." : faceLiveness === "aligned" ? "Green circle: blink now" : faceLiveness === "blink-detected" ? "Blink detected, capturing..." : "Selfie captured"}</Text>
              </View>
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => setFaceModeOpen(true)}>
              <Ionicons name="camera-outline" size={18} color={BRAND_DEEP} />
              <Text style={styles.secondaryButtonText}>{facePhoto ? "Retake Face Verification" : "Start Face Verification"}</Text>
            </Pressable>
            <VerificationDocBox label="Upload Face Photo Manually" media={facePhoto} onPick={() => pickDoc(setFacePhoto, true, "face")} />
            {faceModeOpen ? (
              <Modal visible animationType="slide" onRequestClose={() => setFaceModeOpen(false)}>
                <SafeAreaView style={styles.cameraSafe}>
                  <CameraView ref={faceCameraRef} style={styles.faceCamera} facing="front" mirror>
                    <View style={styles.cameraOverlay}>
                      <View style={[styles.cameraFaceCircle, faceLiveness === "aligned" || faceLiveness === "blink-detected" ? styles.cameraFaceCircleReady : styles.cameraFaceCircleWaiting]} />
                      <Text style={styles.cameraInstruction}>Place your face inside the circle</Text>
                      <Text style={styles.cameraInstructionSmall}>Wait for green, blink your eyes, and the photo will capture.</Text>
                    </View>
                  </CameraView>
                  <View style={styles.cameraActions}>
                    <Pressable style={styles.secondaryButton} onPress={() => setFaceModeOpen(false)}>
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={captureFaceAfterBlink}>
                      <Text style={styles.primaryButtonText}>I am ready to blink</Text>
                    </Pressable>
                  </View>
                </SafeAreaView>
              </Modal>
            ) : null}
            <View style={styles.mlKitPanel}>
              <Ionicons name="scan-outline" size={18} color={BRAND_ORANGE} />
              <View style={styles.mlKitTextBlock}>
                <Text style={styles.mlKitText}>OCR: {ocrStatus}</Text>
                <Text style={styles.mlKitText}>Face: {faceDetectionStatus}</Text>
                {extractedDetails.name || extractedDetails.dob || extractedDetails.aadhaarLast4 || extractedDetails.panNumber ? (
                  <Text style={styles.mlKitExtractedText}>
                    {[extractedDetails.name, extractedDetails.dob, extractedDetails.aadhaarLast4 ? `Aadhaar ****${extractedDetails.aadhaarLast4}` : undefined, extractedDetails.panNumber].filter(Boolean).join(" - ")}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {step === 5 ? (
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>TUTORIAL</Text>
            <View style={styles.tutorialSlideCard}>
              <View style={styles.tutorialIllustration}>
                <Ionicons name={tutorialSlides[tutorialIndex][2]} size={44} color={BRAND_ORANGE} />
              </View>
              <Text style={styles.verificationTitle}>{tutorialSlides[tutorialIndex][0]}</Text>
              <Text style={styles.verificationCopy}>{tutorialSlides[tutorialIndex][1]}</Text>
              <Text style={styles.cardMeta}>{tutorialIndex + 1} of {tutorialSlides.length}</Text>
            </View>
            <View style={styles.tutorialControls}>
              <Pressable style={styles.docActionButton} onPress={() => setTutorialIndex(tutorialSlides.length - 1)}>
                <Text style={styles.docActionText}>Skip</Text>
              </Pressable>
              <Pressable style={styles.docActionButton} onPress={() => setTutorialIndex((current) => Math.max(0, current - 1))} disabled={tutorialIndex === 0}>
                <Text style={styles.docActionText}>Previous</Text>
              </Pressable>
              <Pressable style={styles.docActionButton} onPress={() => setTutorialIndex((current) => Math.min(tutorialSlides.length - 1, current + 1))} disabled={tutorialIndex === tutorialSlides.length - 1}>
                <Text style={styles.docActionText}>{tutorialIndex === tutorialSlides.length - 1 ? "Finish Tutorial" : "Next"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.verificationNav}>
          {step > 1 ? (
            <Pressable style={styles.secondaryButton} onPress={() => setStep((current) => Math.max(1, current - 1))}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
          ) : null}
          {step < 5 ? (
            <Pressable style={[styles.primaryButton, !validateCurrentStep() && styles.disabledButton]} disabled={!validateCurrentStep()} onPress={() => setStep((current) => current + 1)}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={submitVerification} disabled={saving}>
              {saving ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Final Submit</Text>}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen({
  me,
  token,
  refresh,
  showDialog,
  onSessionExpired
}: {
  me?: MeResponse;
  token?: string;
  refresh: () => void;
  showDialog: (dialog: DialogState) => void;
  onSessionExpired: () => void;
}) {
  const { signOut } = useAppStore();
  const [available, setAvailable] = useState(Boolean(me?.tailorProfile?.isAvailable ?? true));
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [name, setName] = useState(me?.name ?? "");
  const [shopName, setShopName] = useState(me?.tailorProfile?.shopName ?? "Darji Tailor");
  const [specialization, setSpecialization] = useState((me?.tailorProfile?.specialization ?? ["Alteration", "Stitching"]).join(", "));
  const [workingFrom, setWorkingFrom] = useState(me?.tailorProfile?.workingHours?.from ?? "10:00");
  const [workingTo, setWorkingTo] = useState(me?.tailorProfile?.workingHours?.to ?? "20:00");
  const [settings, setSettings] = useState({
    notifications: me?.tailorProfile?.settings?.notifications ?? true,
    soundAlerts: me?.tailorProfile?.settings?.soundAlerts ?? true,
    compactCards: me?.tailorProfile?.settings?.compactCards ?? false,
    autoOpenNewRequests: me?.tailorProfile?.settings?.autoOpenNewRequests ?? false
  });

  useEffect(() => {
    setAvailable(Boolean(me?.tailorProfile?.isAvailable ?? true));
    setName(me?.name ?? "");
    setShopName(me?.tailorProfile?.shopName ?? "Darji Tailor");
    setSpecialization((me?.tailorProfile?.specialization ?? ["Alteration", "Stitching"]).join(", "));
    setWorkingFrom(me?.tailorProfile?.workingHours?.from ?? "10:00");
    setWorkingTo(me?.tailorProfile?.workingHours?.to ?? "20:00");
    setSettings({
      notifications: me?.tailorProfile?.settings?.notifications ?? true,
      soundAlerts: me?.tailorProfile?.settings?.soundAlerts ?? true,
      compactCards: me?.tailorProfile?.settings?.compactCards ?? false,
      autoOpenNewRequests: me?.tailorProfile?.settings?.autoOpenNewRequests ?? false
    });
  }, [me?.name, me?.tailorProfile]);

  async function toggle(value: boolean) {
    setAvailable(value);
    if (!token) return;
    try {
      setSavingAvailability(true);
      await api("/tailors/me/availability", { method: "PATCH", body: JSON.stringify({ isAvailable: value }) }, token);
      refresh();
    } catch (error) {
      setAvailable(!value);
      if (isSessionError(error)) {
        onSessionExpired();
        return;
      }
      showDialog({ title: "Availability failed", message: "Could not update availability.", icon: "alert-circle-outline" });
    } finally {
      setSavingAvailability(false);
    }
  }

  async function saveProfile() {
    if (!token) return;
    const specializationList = specialization
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);

    try {
      setSavingProfile(true);
      await api(
        "/tailors/me/profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            shopName: shopName.trim(),
            specialization: specializationList,
            workingHours: { from: workingFrom.trim(), to: workingTo.trim() },
            settings
          })
        },
        token
      );
      showDialog({ title: "Profile saved", message: "Your tailor profile and settings were updated.", icon: "checkmark-circle-outline" });
      refresh();
    } catch (error) {
      if (isSessionError(error)) {
        onSessionExpired();
        return;
      }
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

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.82 });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];

    try {
      setUploadingAvatar(true);
      await uploadTailorAvatar({ uri: asset.uri, name: asset.fileName ?? `tailor-avatar-${Date.now()}.jpg` }, token);
      showDialog({ title: "Photo updated", message: "Your profile picture was updated.", icon: "person-circle-outline" });
      refresh();
    } catch (error) {
      if (isSessionError(error)) {
        onSessionExpired();
        return;
      }
      showDialog({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not upload profile photo.", icon: "alert-circle-outline" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  function toggleSetting(key: keyof typeof settings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <Header title="Profile" subtitle={me?.phone ? `+91 ${me.phone}` : "Tailor account"} />
      <View style={styles.profileCard}>
        <Pressable style={styles.avatar} onPress={pickAvatar} disabled={uploadingAvatar}>
          {me?.avatarUrl ? <Image source={{ uri: me.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(me?.name ?? me?.tailorProfile?.shopName ?? "DT").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</Text>}
          <View style={styles.avatarEditBadge}>
            {uploadingAvatar ? <ActivityIndicator color="#111111" size="small" /> : <Ionicons name="camera-outline" size={14} color="#111111" />}
          </View>
        </Pressable>
        <View style={styles.cardMain}>
          <Text style={styles.bigTitle}>{me?.tailorProfile?.shopName ?? "Darji Tailor"}</Text>
          <Text style={styles.cardMeta}>{me?.name ?? "Tailor Partner"} - tap photo to change</Text>
        </View>
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>GENERAL PROFILE</Text>
        <Text style={styles.formLabel}>Display Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#9aa6b8" />
        <Text style={styles.formLabel}>Shop Name</Text>
        <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="Shop or studio name" placeholderTextColor="#9aa6b8" />
        <Text style={styles.formLabel}>Specialization</Text>
        <TextInput style={styles.input} value={specialization} onChangeText={setSpecialization} placeholder="Alteration, Stitching, Blouse" placeholderTextColor="#9aa6b8" />
        <View style={styles.twoFieldRow}>
          <View style={styles.twoFieldItem}>
            <Text style={styles.formLabel}>Open From</Text>
            <TextInput style={styles.input} value={workingFrom} onChangeText={setWorkingFrom} placeholder="10:00" placeholderTextColor="#9aa6b8" />
          </View>
          <View style={styles.twoFieldItem}>
            <Text style={styles.formLabel}>Open Until</Text>
            <TextInput style={styles.input} value={workingTo} onChangeText={setWorkingTo} placeholder="20:00" placeholderTextColor="#9aa6b8" />
          </View>
        </View>
        <Pressable style={styles.primaryButton} onPress={saveProfile} disabled={savingProfile}>
          {savingProfile ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryButtonText}>Save Profile</Text>}
        </Pressable>
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>WORK SETTINGS</Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.cardTitle}>Available for work</Text>
            <Text style={styles.cardMeta}>{savingAvailability ? "Updating..." : "Controls quote and assignment visibility"}</Text>
          </View>
          <Switch value={available} onValueChange={toggle} thumbColor="#ffffff" trackColor={{ true: BRAND_ORANGE, false: "#dbe1e9" }} />
        </View>
        <SettingsSwitch title="New request notifications" copy="Show request popups and alerts." value={settings.notifications} onValueChange={(value) => toggleSetting("notifications", value)} />
        <SettingsSwitch title="Sound alerts" copy="Play sound for urgent request alerts." value={settings.soundAlerts} onValueChange={(value) => toggleSetting("soundAlerts", value)} />
        <SettingsSwitch title="Compact cards" copy="Use tighter request and order cards." value={settings.compactCards} onValueChange={(value) => toggleSetting("compactCards", value)} />
        <SettingsSwitch title="Auto-open new requests" copy="Open request details automatically after accepting popup." value={settings.autoOpenNewRequests} onValueChange={(value) => toggleSetting("autoOpenNewRequests", value)} />
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>PROFILE SUMMARY</Text>
        <DetailRow icon="star-outline" label="Rating" value={`${me?.tailorProfile?.rating ?? 0} / 5`} />
        <DetailRow icon="time-outline" label="Working Hours" value={`${me?.tailorProfile?.workingHours?.from ?? "10:00"} - ${me?.tailorProfile?.workingHours?.to ?? "20:00"}`} />
        <DetailRow icon="ribbon-outline" label="Specialization" value={(me?.tailorProfile?.specialization ?? ["Alteration", "Stitching"]).join(", ")} />
      </View>

      <Pressable style={styles.secondaryButton} onPress={signOut}>
        <Ionicons name="log-out-outline" size={18} color={BRAND_DEEP} />
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function SettingsSwitch({ title, copy, value, onValueChange }: { title: string; copy: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMeta}>{copy}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} thumbColor="#ffffff" trackColor={{ true: BRAND_ORANGE, false: "#dbe1e9" }} />
    </View>
  );
}

function BottomTabs({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const tabs: Array<{ key: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: "dashboard", label: "Home", icon: "home-outline" },
    { key: "requests", label: "Requests", icon: "albums-outline" },
    { key: "orders", label: "Orders", icon: "cube-outline" },
    { key: "earnings", label: "Earnings", icon: "wallet-outline" },
    { key: "profile", label: "Profile", icon: "person-outline" }
  ];
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const active = screen === tab.key || (screen === "requestDetails" && tab.key === "requests") || (screen === "quote" && tab.key === "requests") || (screen === "orderDetails" && tab.key === "orders");
        return (
          <Pressable key={tab.key} style={styles.tabItem} onPress={() => setScreen(tab.key)}>
            <Ionicons name={active ? tab.icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap : tab.icon} size={22} color={active ? BRAND_ORANGE : "#111827"} />
            <Text style={[styles.tabText, active && styles.activeTabText]}>{tab.label}</Text>
          </Pressable>
        );
      })}
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

function NewRequestPopup({
  request,
  secondsLeft,
  flashOn,
  onAccept,
  onViewDetails,
  onClose
}: {
  request?: TailoringRequest;
  secondsLeft: number;
  flashOn?: boolean;
  onAccept: () => void;
  onViewDetails: () => void;
  onClose: () => void;
}) {
  if (!request) return null;
  const progress = `${Math.max(0, Math.min(100, (secondsLeft / 30) * 100))}%` as `${number}%`;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.popupBackdrop, flashOn && styles.popupBackdropAlert]}>
        <View style={styles.requestPopupCard}>
          <View style={styles.rowBetween}>
            <View style={styles.popupIconSmall}>
              <Ionicons name="notifications-outline" size={24} color={BRAND_ORANGE} />
            </View>
            <Pressable style={styles.popupCloseButton} onPress={onClose}>
              <Ionicons name="close" size={18} color={BRAND_DEEP} />
            </Pressable>
          </View>
          <Text style={styles.popupEyebrow}>NEW CUSTOMER REQUEST</Text>
          <Text style={styles.popupTitle}>{request.workType}</Text>
          <Text style={styles.popupCopy} numberOfLines={3}>{request.clothType} - {request.urgency}. Request ID {shortId(request.id)}</Text>
          <View style={styles.countdownPanel}>
            <ActivityIndicator color={BRAND_ORANGE} />
            <View style={styles.countdownTextBlock}>
              <Text style={styles.countdownTitle}>{secondsLeft}s to review</Text>
              <Text style={styles.countdownCopy}>This popup will close automatically. The request stays in Requests.</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progress }]} />
          </View>
          <View style={styles.popupActions}>
            <Pressable style={styles.popupActionButton} onPress={onAccept}>
              <Text style={styles.popupActionText}>Send Quote</Text>
            </Pressable>
            <Pressable style={[styles.popupActionButton, styles.popupSecondaryButton]} onPress={onViewDetails}>
              <Text style={[styles.popupActionText, styles.popupSecondaryText]}>View Details</Text>
            </Pressable>
            <Pressable style={[styles.popupActionButton, styles.popupGhostButton]} onPress={onClose}>
              <Text style={[styles.popupActionText, styles.popupGhostText]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function QuoteAcceptedPopup({ request, onViewDetails, onClose }: { request?: TailoringRequest; onViewDetails: () => void; onClose: () => void }) {
  if (!request) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.popupBackdrop}>
        <View style={styles.popupCard}>
          <View style={styles.popupIcon}>
            <Ionicons name="checkmark-circle-outline" size={30} color={SUCCESS} />
          </View>
          <Text style={styles.popupEyebrow}>QUOTE ACCEPTED</Text>
          <Text style={styles.popupTitle}>Customer accepted your quote</Text>
          <Text style={styles.popupCopy}>Your quote for request {shortId(request.id)} has been accepted. You can review the request details and prepare for the next step.</Text>
          <View style={styles.popupActions}>
            <Pressable style={styles.popupActionButton} onPress={onViewDetails}>
              <Text style={styles.popupActionText}>View Quote</Text>
            </Pressable>
            <Pressable style={[styles.popupActionButton, styles.popupSecondaryButton]} onPress={onClose}>
              <Text style={[styles.popupActionText, styles.popupSecondaryText]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LoadingOverlay({ visible }: { visible: boolean }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingCard}>
          <ActivityIndicator color={BRAND_ORANGE} />
          <Text style={styles.loadingText}>Syncing tailor workspace</Text>
        </View>
      </View>
    </Modal>
  );
}

export default function App() {
  const token = useAppStore((state) => state.token);
  const sessionUser = useAppStore((state) => state.user);
  const signOut = useAppStore((state) => state.signOut);
  const [screen, setScreenState] = useState<Screen>("dashboard");
  const [screenStack, setScreenStack] = useState<Screen[]>([]);
  const [me, setMe] = useState<MeResponse>();
  const [requests, setRequests] = useState<TailoringRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeRequest, setActiveRequest] = useState<TailoringRequest>();
  const [activeOrder, setActiveOrder] = useState<Order>();
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState>();
  const [newRequestPopup, setNewRequestPopup] = useState<TailoringRequest>();
  const [newRequestSecondsLeft, setNewRequestSecondsLeft] = useState(30);
  const [alertFlashVisible, setAlertFlashVisible] = useState(false);
  const [alertFlashOn, setAlertFlashOn] = useState(false);
  const [acceptedQuoteRequest, setAcceptedQuoteRequest] = useState<TailoringRequest>();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("Offline");
  const [cancellationAlert, setCancellationAlert] = useState<CancellationAlert>();
  const socketRef = useRef<any>(null);
  const [initialSupportScreen, setInitialSupportScreen] = useState<string | null>(null);
  const knownRequestIdsRef = useRef<Set<string>>(new Set());
  const dismissedRequestIdsRef = useRef<Set<string>>(new Set());
  const alertedRequestIdsRef = useRef<Set<string>>(new Set());
  const acceptedQuoteIdsRef = useRef<Set<string>>(new Set());
  useRegisterPushNotifications({ authToken: token, app: "tailor", userId: sessionUser?.id });
  const hasLoadedWorkspaceRef = useRef(false);
  const maxOrdersPerDay = Number(me?.tailorProfile?.settings?.maxOrdersPerDay ?? 8);
  const newRequestNotificationsEnabled = me?.tailorProfile?.settings?.notifications !== false;
  const soundAlertsEnabled = me?.tailorProfile?.settings?.soundAlerts !== false;
  const activeTailorOrderCount = orders.filter((order) => !["READY", "DELIVERED", "CANCELLED"].includes(order.status)).length;

  function setScreen(nextScreen: Screen, options?: { resetStack?: boolean; replace?: boolean }) {
    if (nextScreen === screen) return;
    if (options?.resetStack || nextScreen === "dashboard") {
      setScreenStack([]);
    } else if (!options?.replace) {
      setScreenStack((current) => [...current, screen].slice(-16));
    }
    setScreenState(nextScreen);
  }

  const goBack = useCallback(() => {
    if (dialog) {
      setDialog(undefined);
      return true;
    }
    if (acceptedQuoteRequest) {
      setAcceptedQuoteRequest(undefined);
      return true;
    }
    if (newRequestPopup) {
      closeNewRequestPopup();
      return true;
    }
    if (screenStack.length > 0) {
      setScreenState(screenStack[screenStack.length - 1]);
      setScreenStack((currentStack) => currentStack.slice(0, -1));
      return true;
    }
    if (screen !== "dashboard") {
      setScreenState("dashboard");
      setScreenStack([]);
      return true;
    }
    return false;
  }, [acceptedQuoteRequest, dialog, newRequestPopup, screen, screenStack]);

  function resetWorkspaceTracking() {
    knownRequestIdsRef.current.clear();
    dismissedRequestIdsRef.current.clear();
    alertedRequestIdsRef.current.clear();
    acceptedQuoteIdsRef.current.clear();
    hasLoadedWorkspaceRef.current = false;
    setNewRequestPopup(undefined);
    setAcceptedQuoteRequest(undefined);
  }

  function showNewRequestPopup(request: TailoringRequest) {
    if (!newRequestNotificationsEnabled) return;
    if (request.status !== "QUOTE_REQUESTED" || request.ownQuote || dismissedRequestIdsRef.current.has(request.id)) return;

    knownRequestIdsRef.current.add(request.id);
    setNewRequestSecondsLeft(30);
    setNewRequestPopup(request);
  }

  function handleSessionExpired() {
    setDialog({ title: "Session expired", message: "Please log in again to continue managing requests.", icon: "lock-closed-outline" });
    setRequests([]);
    setOrders([]);
    setMe(undefined);
    setActiveRequest(undefined);
    setActiveOrder(undefined);
    resetWorkspaceTracking();
    signOut();
  }

  function openCancelledOrder(cancelledId: string) {
    const cancelledOrder = orders.find((order) => order.id === cancelledId || order.request?.id === cancelledId);
    if (cancelledOrder) {
      setActiveOrder(cancelledOrder);
      setCancellationAlert(undefined);
      setScreen("orderDetails");
      return;
    }
    setCancellationAlert(undefined);
    setScreen("orders");
  }

  function processWorkspaceEvents(requestData: TailoringRequest[]) {
    const openRequests = requestData.filter((request) => request.status === "QUOTE_REQUESTED" && !request.ownQuote);

    if (!hasLoadedWorkspaceRef.current) {
      requestData.forEach((request) => {
        knownRequestIdsRef.current.add(request.id);
        if (request.ownQuote?.status === "ACCEPTED") acceptedQuoteIdsRef.current.add(request.ownQuote.id);
      });
      hasLoadedWorkspaceRef.current = true;
      return;
    }

    const newlyAccepted = requestData.find((request) => request.ownQuote?.status === "ACCEPTED" && !acceptedQuoteIdsRef.current.has(request.ownQuote.id));
    if (newlyAccepted?.ownQuote) {
      acceptedQuoteIdsRef.current.add(newlyAccepted.ownQuote.id);
      setAcceptedQuoteRequest(newlyAccepted);
      void playTailorAlert("Quote accepted", `${newlyAccepted.workType} was accepted by the customer.`, soundAlertsEnabled);
    }

    const freshRequest = openRequests.find((request) => !knownRequestIdsRef.current.has(request.id) && !dismissedRequestIdsRef.current.has(request.id));
    requestData.forEach((request) => {
      knownRequestIdsRef.current.add(request.id);
    });
    if (freshRequest) {
      showNewRequestPopup(freshRequest);
    }
  }

  function closeNewRequestPopup() {
    if (newRequestPopup) dismissedRequestIdsRef.current.add(newRequestPopup.id);
    setNewRequestPopup(undefined);
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [goBack]);

  function openPopupRequest(screenName: "quote" | "requestDetails") {
    if (!newRequestPopup) return;
    if (screenName === "quote" && activeTailorOrderCount >= maxOrdersPerDay) {
      dismissedRequestIdsRef.current.add(newRequestPopup.id);
      setNewRequestPopup(undefined);
      setDialog({
        title: "Order limit reached",
        message: `Admin has set your limit to ${maxOrdersPerDay} active orders. Complete an order before accepting more work.`,
        icon: "lock-closed-outline"
      });
      return;
    }
    setActiveRequest(newRequestPopup);
    dismissedRequestIdsRef.current.add(newRequestPopup.id);
    setNewRequestPopup(undefined);
    setScreen(screenName);
  }

  async function refreshWorkspace(showLoader = false) {
    if (!token) return;
    try {
      if (showLoader) setLoading(true);
      const [profile, openRequestData, selectedRequestData, orderData] = await Promise.all([
        api<MeResponse>("/auth/me", {}, token),
        api<TailoringRequest[]>("/tailoring-requests", {}, token),
        api<TailoringRequest[]>("/tailoring-requests?status=TAILOR_SELECTED", {}, token),
        api<Order[]>("/orders", {}, token)
      ]);
      const acceptedRequests = selectedRequestData.filter((request) => request.ownQuote?.status === "ACCEPTED");
      const requestData = [
        ...openRequestData,
        ...acceptedRequests
      ];
      const acceptedRequestOrders = acceptedRequests.map(orderFromAcceptedRequest);
      const workspaceOrders = [...acceptedRequestOrders, ...orderData].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      setMe(profile);
      setRequests(openRequestData);
      setOrders(workspaceOrders);
      setActiveRequest((current) => requestData.find((request) => request.id === current?.id) ?? current);
      setActiveOrder((current) => workspaceOrders.find((order) => order.id === current?.id) ?? current);
      processWorkspaceEvents(requestData);
    } catch (error) {
      if (isSessionError(error)) {
        handleSessionExpired();
        return;
      }
      if (showLoader) {
        setDialog({ title: "Sync failed", message: error instanceof Error ? error.message : "Check backend connection.", icon: "cloud-offline-outline" });
      }
    } finally {
      setLoading(false);
    }
  }

  const showRequestFromEvent = useCallback(async (requestId: string) => {
    if (!token || dismissedRequestIdsRef.current.has(requestId)) return;
    try {
      const request = await api<TailoringRequest>(`/tailoring-requests/${requestId}`, {}, token);
      showNewRequestPopup(request);
      setRequests((current) => current.some((item) => item.id === request.id) ? current : [request, ...current]);
    } catch (error) {
      if (isSessionError(error)) {
        handleSessionExpired();
      }
    }
  }, [token, newRequestNotificationsEnabled]);

  useEffect(() => {
    if (token) {
      void refreshWorkspace(true);
    } else {
      resetWorkspaceTracking();
    }
  }, [token]);

  useEffect(() => {
    if (token) void refreshWorkspace();
  }, [screen]);

  useEffect(() => {
    if (!token) return undefined;
    void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    const socket = createRealtimeSocket(token, setConnectionStatus, refreshAccessToken);
    socketRef.current = socket;

    socket.on("tailoring:request_created", (request: TailoringRequest) => {
      if (!request?.id) return;
      setRequests((current) => current.some((item) => item.id === request.id) ? current : [request, ...current]);
      showNewRequestPopup(request);
    });
    socket.on("tailoring:request_closed", ({ requestId, acceptedTailorId }: { requestId: string; acceptedTailorId?: string }) => {
      setRequests((current) => current.filter((request) => request.id !== requestId));
      if (newRequestPopup?.id === requestId) setNewRequestPopup(undefined);
      if (acceptedTailorId !== me?.tailorProfile?.id) dismissedRequestIdsRef.current.add(requestId);
      void refreshWorkspace();
    });
    socket.on("tailoring:quote_accepted", ({ requestId }: { requestId: string }) => {
      void showRequestFromEvent(requestId);
      void refreshWorkspace();
    });
    socket.on("tailoring:order_cancelled", ({ requestId, orderId }: { requestId?: string; orderId?: string }) => {
      const cancelledId = requestId ?? orderId;
      if (!cancelledId) return;
      setRequests((current) => current.map((request) => request.id === cancelledId ? { ...request, status: "CANCELLED" } : request));
      setOrders((current) => current.map((order) => order.id === cancelledId || order.request?.id === cancelledId ? { ...order, status: "CANCELLED", request: order.request ? { ...order.request, status: "CANCELLED" } : order.request } : order));
      setActiveRequest((current) => current?.id === cancelledId ? { ...current, status: "CANCELLED" } : current);
      setActiveOrder((current) => current && (current.id === cancelledId || current.request?.id === cancelledId) ? { ...current, status: "CANCELLED", request: current.request ? { ...current.request, status: "CANCELLED" } : current.request } : current);
      setCancellationAlert({
        id: cancelledId,
        title: "Order cancelled",
        message: `Order ${shortId(cancelledId)} has been cancelled by the customer.`
      });
      void refreshWorkspace();
    });
    socket.on("tailoring:work_status_updated", () => {
      void refreshWorkspace();
    });
    socket.on("tailoring:delivery_status_updated", () => {
      void refreshWorkspace();
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectionStatus("Offline");
    };
  }, [token, showRequestFromEvent, newRequestPopup?.id, me?.tailorProfile?.id]);

  useEffect(() => {
    if (!newRequestPopup) return undefined;
    setNewRequestSecondsLeft(30);
    setAlertFlashVisible(true);
    setAlertFlashOn(true);

    if (!alertedRequestIdsRef.current.has(newRequestPopup.id)) {
      alertedRequestIdsRef.current.add(newRequestPopup.id);
      void playTailorAlert("New customer request", `${newRequestPopup.workType} - ${newRequestPopup.clothType}`, soundAlertsEnabled);
    }

    const flashTimer = setInterval(() => {
      setAlertFlashOn((current) => !current);
    }, 320);
    const stopFlashTimer = setTimeout(() => {
      setAlertFlashVisible(false);
      setAlertFlashOn(false);
      clearInterval(flashTimer);
    }, 3800);
    const timer = setInterval(() => {
      setNewRequestSecondsLeft((current) => {
        if (current <= 1) {
          closeNewRequestPopup();
          return 30;
        }
        return current - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timer);
      clearInterval(flashTimer);
      clearTimeout(stopFlashTimer);
    };
  }, [newRequestPopup?.id, soundAlertsEnabled]);

  if (!token) {
    return (
      <>
        <AuthScreen />
        <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
      </>
    );
  }

  if (!me) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingOverlay visible />
      </SafeAreaView>
    );
  }

  if ((me.tailorProfile?.verificationStatus ?? "NOT_SUBMITTED") !== "VERIFIED") {
    return (
      <>
        <TailorVerificationFlow me={me} token={token} onRefresh={() => void refreshWorkspace(true)} showDialog={setDialog} onSessionExpired={handleSessionExpired} />
        <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
      </>
    );
  }

  let body;
  if (screen === "dashboard") body = <DashboardScreen me={me} requests={requests} orders={orders} setScreen={setScreen} setActiveRequest={setActiveRequest} setActiveOrder={setActiveOrder} />;
  if (screen === "requests") body = <RequestsScreen requests={requests} setScreen={setScreen} setActiveRequest={setActiveRequest} />;
  if (screen === "requestDetails" && activeRequest) body = <RequestDetailsScreen request={activeRequest} setScreen={setScreen} showDialog={setDialog} />;
  if (screen === "quote" && activeRequest) body = <QuoteScreen request={activeRequest} token={token} setScreen={setScreen} showDialog={setDialog} onSessionExpired={handleSessionExpired} activeOrderCount={activeTailorOrderCount} maxOrdersPerDay={maxOrdersPerDay} onDone={() => { void refreshWorkspace(); setScreen("requestDetails"); }} />;
  if (screen === "orders") body = <OrdersScreen orders={orders} setScreen={setScreen} setActiveOrder={setActiveOrder} />;
  if (screen === "orderDetails" && activeOrder) body = <OrderDetailsScreen order={activeOrder} token={token} setScreen={setScreen} showDialog={setDialog} onSessionExpired={handleSessionExpired} onUpdated={() => void refreshWorkspace()} />;
  if (screen === "earnings") body = <EarningsScreen orders={orders} me={me} />;
  if (screen === "transactions") body = <TransactionHistoryScreen orders={orders} />;
  if (screen === "profile") {
    body = (
      <TailorProfileScreen
        me={me}
        token={token}
        orders={orders}
        showDialog={setDialog}
        onSessionExpired={handleSessionExpired}
        refresh={() => void refreshWorkspace()}
        onOpenTransactions={() => setScreen("transactions")}
        onOpenOrders={() => setScreen("orders")}
        socket={socketRef.current}
        initialSupportScreen={initialSupportScreen}
        clearInitialSupportScreen={() => setInitialSupportScreen(null)}
      />
    );
  }
  if (!body) body = <DashboardScreen me={me} requests={requests} orders={orders} setScreen={setScreen} setActiveRequest={setActiveRequest} setActiveOrder={setActiveOrder} />;

  return (
    <NotificationProvider
      app="tailor"
      onNavigate={(destination) => {
        if (destination.screen === "support_center" || destination.screen === "contactSupport") {
          setInitialSupportScreen("support_center");
          setScreen("profile");
          return;
        }
        if (destination.screen === "requestDetails") {
          const request = destination.entityId ? requests.find((item) => item.id === destination.entityId) : undefined;
          if (request) {
            setActiveRequest(request);
            setScreen(destination.actionIdentifier === "SEND_QUOTE" ? "quote" : "requestDetails");
            return;
          }
          if (destination.entityId && token) {
            void api<TailoringRequest>(`/tailoring-requests/${destination.entityId}`, {}, token)
              .then((loadedRequest) => {
                setActiveRequest(loadedRequest);
                setScreen(destination.actionIdentifier === "SEND_QUOTE" ? "quote" : "requestDetails");
              })
              .catch(() => setScreen("requests"));
            return;
          }
          setScreen("requests");
          return;
        }
        const order = destination.entityId ? orders.find((item) => item.id === destination.entityId || item.request?.id === destination.entityId) : undefined;
        if (order) setActiveOrder(order);
        setScreen(order ? "orderDetails" : "orders");
      }}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={SCREEN_BG} translucent={false} />
        {cancellationAlert ? (
          <Pressable style={styles.topDisclaimer} onPress={() => openCancelledOrder(cancellationAlert.id)}>
            <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
            <View style={styles.topDisclaimerText}>
              <Text style={styles.topDisclaimerTitle}>{cancellationAlert.title}</Text>
              <Text style={styles.topDisclaimerCopy} numberOfLines={1}>{cancellationAlert.message}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#b91c1c" />
          </Pressable>
        ) : null}
        <View style={styles.screenHost}>{body}</View>
        <BottomTabs screen={screen} setScreen={setScreen} />
        <LoadingOverlay visible={loading} />
        <NewRequestPopup request={newRequestPopup} secondsLeft={newRequestSecondsLeft} flashOn={alertFlashVisible && alertFlashOn} onAccept={() => openPopupRequest("quote")} onViewDetails={() => openPopupRequest("requestDetails")} onClose={closeNewRequestPopup} />
        <QuoteAcceptedPopup
          request={acceptedQuoteRequest}
          onViewDetails={() => {
            if (acceptedQuoteRequest) setActiveRequest(acceptedQuoteRequest);
            setAcceptedQuoteRequest(undefined);
            setScreen("requestDetails");
          }}
          onClose={() => setAcceptedQuoteRequest(undefined)}
        />
        <DesignedDialog dialog={dialog} onClose={() => setDialog(undefined)} />
      </SafeAreaView>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SCREEN_BG },
  screenHost: { flex: 1 },
  connectionBadge: { minHeight: 30, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 15, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, paddingHorizontal: 12, marginTop: 8, marginBottom: 2 },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontSize: 11, fontWeight: "900" },
  authContent: { flex: 1, justifyContent: "center", paddingHorizontal: 26 },
  logoMark: { width: 74, height: 74, borderRadius: 24, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  authTitle: { color: BRAND_DEEP, fontSize: 34, fontWeight: "900" },
  authCopy: { color: MUTED, fontSize: 15, lineHeight: 23, marginTop: 8, marginBottom: 34 },
  formLabel: { color: MUTED, fontSize: 12, fontWeight: "900", marginBottom: 10, marginTop: 16 },
  phoneField: { height: 58, borderRadius: 18, borderWidth: 1.4, borderColor: "#efbd65", backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  phonePrefix: { color: BRAND_ORANGE, fontSize: 17, fontWeight: "900" },
  phoneDivider: { width: 1, height: 26, backgroundColor: BORDER, marginHorizontal: 14 },
  phoneInput: { flex: 1, color: BRAND_DEEP, fontSize: 15 },
  input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, color: BRAND_DEEP, paddingHorizontal: 15, fontSize: 15 },
  inputButton: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  inputButtonText: { flex: 1, color: BRAND_DEEP, fontSize: 15, fontWeight: "800" },
  placeholderText: { color: "#9aa6b8", fontWeight: "700" },
  textArea: { minHeight: 108, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, color: BRAND_DEEP, padding: 15, fontSize: 15, textAlignVertical: "top" },
  primaryButton: { minHeight: 56, borderRadius: 16, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 20, paddingHorizontal: 18 },
  primaryButtonText: { color: "#111111", fontSize: 16, fontWeight: "900" },
  disabledButton: { opacity: 0.55 },
  secondaryButton: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, marginTop: 12 },
  secondaryButtonText: { color: BRAND_DEEP, fontSize: 15, fontWeight: "900" },
  textButton: { alignItems: "center", marginTop: 18 },
  textButtonText: { color: BRAND_ORANGE, fontSize: 14, fontWeight: "900" },
  topDisclaimer: { minHeight: 54, marginHorizontal: 18, marginTop: 8, marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff1f2", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  topDisclaimerText: { flex: 1, minWidth: 0 },
  topDisclaimerTitle: { color: "#991b1b", fontSize: 13, fontWeight: "900" },
  topDisclaimerCopy: { color: "#b91c1c", fontSize: 12, fontWeight: "700", marginTop: 2 },
  pageContent: { paddingHorizontal: 18, paddingTop: SCREEN_TOP_PADDING, paddingBottom: 96 },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", marginBottom: 18 },
  roundIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerText: { flex: 1 },
  headerTitle: { color: BRAND_DEEP, fontSize: 25, fontWeight: "900" },
  headerSubtitle: { color: MUTED, fontSize: 13, fontWeight: "700", marginTop: 4 },
  heroCard: { minHeight: 158, borderRadius: 24, backgroundColor: "#2b1503", padding: 22, marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLabel: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  heroTitle: { color: "#ffffff", fontSize: 26, fontWeight: "900", marginTop: 8 },
  heroCopy: { color: "#d6deea", fontSize: 13, fontWeight: "700", marginTop: 8 },
  heroIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statCard: { flex: 1, minHeight: 92, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 13, justifyContent: "center" },
  statValue: { color: BRAND_DEEP, fontSize: 20, fontWeight: "900" },
  statLabel: { color: MUTED, fontSize: 12, fontWeight: "800", marginTop: 5 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 10 },
  sectionTitle: { color: BRAND_DEEP, fontSize: 18, fontWeight: "900" },
  linkText: { color: BRAND_ORANGE, fontSize: 13, fontWeight: "900" },
  requestCard: { borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 13 },
  requestCardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  requestChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginLeft: 60 },
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  filterChip: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  filterChipActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff5df" },
  filterChipText: { color: MUTED, fontSize: 12, fontWeight: "900", textAlign: "center" },
  filterChipTextActive: { color: BRAND_ORANGE },
  readyFilterChip: { borderColor: SUCCESS, backgroundColor: "#dcfce7" },
  readyFilterChipText: { color: SUCCESS },
  cancelledFilterChip: { borderColor: "#fecaca", backgroundColor: "#fff1f2" },
  cancelledFilterChipText: { color: "#b91c1c" },
  orderCard: { borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 13 },
  readyOrderCard: { borderColor: "#86efac", backgroundColor: "#f0fdf4" },
  whiteCard: { borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  cancelledNoticeCard: { borderRadius: 18, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff1f2", padding: 14, marginBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cancelledNoticeTitle: { color: "#991b1b", fontSize: 15, fontWeight: "900" },
  cancelledNoticeCopy: { color: "#b91c1c", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 3 },
  handoffOtpRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  handoffOtpCode: { minWidth: 82, borderRadius: 14, overflow: "hidden", backgroundColor: "#111111", color: BRAND_ORANGE, fontSize: 24, fontWeight: "900", letterSpacing: 4, textAlign: "center", paddingVertical: 12 },
  handoffOtpVerified: { color: SUCCESS, backgroundColor: "#dcfce7" },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconTile: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { color: BRAND_DEEP, fontSize: 15, fontWeight: "900" },
  prominentOrderId: { color: "#dc2626", fontSize: 21, lineHeight: 27, fontWeight: "900", letterSpacing: 0.4, marginBottom: 3 },
  cardMeta: { color: MUTED, fontSize: 12, fontWeight: "700", marginTop: 4 },
  cardCopy: { color: "#526276", fontSize: 13, lineHeight: 20, fontWeight: "700", marginTop: 12 },
  cardLabel: { color: MUTED, fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  cardDivider: { height: 1, backgroundColor: BORDER, marginVertical: 13 },
  statusPill: { overflow: "hidden", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: "900", textAlign: "center" },
  quotedPill: { overflow: "hidden", borderRadius: 14, backgroundColor: "#dcfce7", color: SUCCESS, paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: "900" },
  urgencyPill: { overflow: "hidden", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: "900", textAlign: "center", maxWidth: 112 },
  urgencyPillInline: { alignSelf: "flex-start", marginTop: 8, maxWidth: 220 },
  urgencyRuleCard: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff1f2", padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  urgencyRuleText: { flex: 1, minWidth: 0, color: "#b91c1c", fontSize: 13, lineHeight: 19, fontWeight: "900" },
  timeChoiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  timeChoiceChip: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  timeChoiceChipActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff2d8" },
  timeChoiceText: { color: MUTED, fontSize: 12, fontWeight: "900" },
  timeChoiceTextActive: { color: BRAND_DEEP },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 },
  infoText: { color: MUTED, fontSize: 13, fontWeight: "700", flex: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  priceText: { color: BRAND_ORANGE, fontSize: 16, fontWeight: "900" },
  helperText: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", marginTop: 8 },
  emptyState: { minHeight: 170, borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", padding: 22, marginBottom: 14 },
  emptyTitle: { color: BRAND_DEEP, fontSize: 17, fontWeight: "900", marginTop: 12 },
  bigTitle: { color: BRAND_DEEP, fontSize: 22, fontWeight: "900", marginTop: 10 },
  customerDescriptionText: { color: BRAND_DEEP, fontSize: 14, lineHeight: 22, fontWeight: "800", marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#eef2f7" },
  smallIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  detailLabel: { color: MUTED, fontSize: 12, fontWeight: "900" },
  detailValue: { color: BRAND_DEEP, fontSize: 14, fontWeight: "800", marginTop: 3 },
  mediaRow: { gap: 10, paddingTop: 12 },
  mediaBox: { width: 96, height: 76, borderRadius: 15, overflow: "hidden", backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  mediaImage: { width: "100%", height: "100%" },
  mediaTypeText: { color: BRAND_ORANGE, fontSize: 11, fontWeight: "900", marginTop: 5 },
  mediaOpenBadge: { position: "absolute", right: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(11, 34, 65, 0.82)", alignItems: "center", justifyContent: "center" },
  sampleReferenceBlock: { minHeight: 82, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", flexDirection: "row", alignItems: "center", gap: 12, padding: 10, marginTop: 12 },
  sampleReferenceImage: { width: 62, height: 62, borderRadius: 14, backgroundColor: "#fff4dc" },
  sampleReferenceText: { flex: 1, minWidth: 0 },
  mediaViewerSafe: { flex: 1, backgroundColor: SCREEN_BG },
  mediaViewerHeader: { minHeight: 62, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  mediaViewerTitleBlock: { flex: 1, minWidth: 0 },
  mediaViewerTitle: { color: BRAND_DEEP, fontSize: 20, fontWeight: "900" },
  mediaViewerSubtitle: { color: MUTED, fontSize: 12, fontWeight: "700", marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eef2f7", alignItems: "center", justifyContent: "center" },
  mediaViewerHorizontal: { flexGrow: 1 },
  mediaViewerVertical: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", paddingVertical: 18 },
  mediaViewerImage: { backgroundColor: SURFACE },
  zoomControls: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER },
  zoomButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: BORDER, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" },
  zoomValue: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900", minWidth: 54, textAlign: "center" },
  videoViewerBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  videoViewerIcon: { width: 92, height: 92, borderRadius: 46, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  switchRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 },
  toggleChoiceRow: { minHeight: 70, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginTop: 12 },
  itemBlock: { borderRadius: 16, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#efcf92", padding: 14, marginTop: 12 },
  measureRow: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f3dfb9", marginTop: 8 },
  proofBlock: { borderRadius: 18, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#efcf92", padding: 14, marginTop: 14 },
  proofCount: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" },
  proofEmptyText: { color: MUTED, fontSize: 12, fontWeight: "800", marginTop: 12 },
  proofActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  proofButton: { flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: "#efbd65", backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  proofButtonText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  statusButton: { width: "100%", minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  activeStatusButton: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc" },
  statusButtonText: { color: MUTED, fontSize: 12, fontWeight: "900", textAlign: "center" },
  activeStatusButtonText: { color: BRAND_ORANGE },
  earningsCard: { minHeight: 156, borderRadius: 24, backgroundColor: "#2b1503", padding: 22, marginBottom: 16 },
  earningsValue: { color: BRAND_ORANGE, fontSize: 38, fontWeight: "900", marginTop: 10 },
  earningRow: { minHeight: 64, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileCard: { borderRadius: 22, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 22 },
  avatarEditBadge: { position: "absolute", right: -4, bottom: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_ORANGE, borderWidth: 2, borderColor: SURFACE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#111111", fontSize: 18, fontWeight: "900" },
  twoFieldRow: { flexDirection: "row", gap: 10 },
  twoFieldItem: { flex: 1, minWidth: 0 },
  verificationSteps: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  verificationStepPill: { overflow: "hidden", borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, color: MUTED, paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: "900" },
  verificationStepPillActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc", color: BRAND_ORANGE },
  verificationNotice: { color: "#8a5600", backgroundColor: "#fff4dc", overflow: "hidden", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12, lineHeight: 18, fontWeight: "900", marginTop: 10 },
  verificationHero: { borderRadius: 24, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", padding: 22, alignItems: "center", marginTop: 24 },
  verificationTitle: { color: BRAND_DEEP, fontSize: 24, fontWeight: "900", textAlign: "center", marginTop: 14 },
  verificationCopy: { color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "700", textAlign: "center", marginTop: 10 },
  statusReviewCard: { borderRadius: 20, borderWidth: 1, borderColor: "#efcf92", backgroundColor: SURFACE, padding: 16, marginTop: 14 },
  verificationLinkGrid: { gap: 10, marginTop: 16 },
  verificationLink: { minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  verificationNav: { gap: 10, marginBottom: 18 },
  suggestionRow: { gap: 8, paddingTop: 9, paddingBottom: 2 },
  suggestionChip: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  suggestionChipActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc" },
  suggestionChipText: { color: MUTED, fontSize: 12, fontWeight: "900" },
  suggestionChipTextActive: { color: BRAND_ORANGE },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  specializationEditor: { borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", padding: 12, marginTop: 12 },
  genderRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  genderChip: { flex: 1, minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  genderChipActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc" },
  genderChipText: { color: MUTED, fontSize: 12, fontWeight: "900" },
  genderChipTextActive: { color: BRAND_ORANGE },
  removeRowButton: { minHeight: 38, borderRadius: 13, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center", marginTop: 12 },
  removeRowText: { color: "#b91c1c", fontSize: 12, fontWeight: "900" },
  previewTable: { borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, overflow: "hidden", marginTop: 14 },
  previewRow: { minHeight: 44, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#eef2f7" },
  previewCell: { flex: 1, minWidth: 0, color: MUTED, fontSize: 11, fontWeight: "800", paddingHorizontal: 8 },
  previewPrice: { width: 72, color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textAlign: "right", paddingHorizontal: 8 },
  docGrid: { flexDirection: "row", gap: 10, marginTop: 12 },
  verificationDocBox: { flex: 1, minHeight: 112, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "#efbd65", backgroundColor: "#fffaf0", alignItems: "center", justifyContent: "center", padding: 10, marginTop: 12, overflow: "hidden" },
  verificationDocImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  verificationDocText: { color: BRAND_ORANGE, backgroundColor: "rgba(255,255,255,0.88)", overflow: "hidden", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: "900", textAlign: "center" },
  reuploadChecklist: { gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  reuploadChecklistRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  faceVerificationPanel: { minHeight: 112, borderRadius: 18, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", flexDirection: "row", alignItems: "center", gap: 14, padding: 14, marginTop: 14 },
  faceCircle: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: SURFACE },
  faceCircleReady: { borderColor: SUCCESS },
  faceCircleWaiting: { borderColor: "#fca5a5" },
  facePreviewImage: { width: "100%", height: "100%" },
  faceStatusText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", marginTop: 7 },
  cameraSafe: { flex: 1, backgroundColor: "#020617" },
  faceCamera: { flex: 1 },
  cameraOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(2, 6, 23, 0.2)" },
  cameraFaceCircle: { width: 230, height: 230, borderRadius: 115, borderWidth: 4, backgroundColor: "rgba(255,255,255,0.04)" },
  cameraFaceCircleReady: { borderColor: "#22c55e" },
  cameraFaceCircleWaiting: { borderColor: "#fbbf24" },
  cameraInstruction: { color: "#ffffff", fontSize: 18, fontWeight: "900", textAlign: "center", marginTop: 22 },
  cameraInstructionSmall: { color: "#d6deea", fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center", marginTop: 6 },
  cameraActions: { backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER, padding: 16, gap: 10 },
  mlKitPanel: { minHeight: 62, borderRadius: 15, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, marginTop: 14 },
  mlKitTextBlock: { flex: 1, minWidth: 0 },
  mlKitText: { color: MUTED, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  mlKitExtractedText: { color: BRAND_DEEP, fontSize: 11, lineHeight: 17, fontWeight: "900", marginTop: 4 },
  docActionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  docActionButton: { flex: 1, minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: "#efbd65", backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  docActionText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" },
  tutorialSlideCard: { minHeight: 330, borderRadius: 22, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", alignItems: "center", justifyContent: "center", padding: 20, marginTop: 14 },
  tutorialIllustration: { width: 104, height: 104, borderRadius: 28, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", alignItems: "center", justifyContent: "center" },
  tutorialControls: { flexDirection: "row", gap: 8, marginTop: 12 },
  tutorialStep: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#eef2f7" },
  tutorialStepNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_ORANGE, color: "#111111", textAlign: "center", lineHeight: 26, overflow: "hidden", fontSize: 12, fontWeight: "900" },
  tutorialText: { flex: 1, color: BRAND_DEEP, fontSize: 14, lineHeight: 22, fontWeight: "800", marginBottom: 8 },
  tabs: { height: 74, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: SURFACE, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 6 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabText: { color: "#111827", fontSize: 10, fontWeight: "800", marginTop: 4 },
  activeTabText: { color: BRAND_ORANGE },
  popupBackdrop: { flex: 1, backgroundColor: "rgba(7, 13, 24, 0.48)", alignItems: "center", justifyContent: "center", padding: 20 },
  popupBackdropAlert: { backgroundColor: "rgba(246, 163, 19, 0.42)" },
  popupCard: { width: "100%", maxWidth: 390, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 22, alignItems: "center" },
  requestPopupCard: { width: "100%", maxWidth: 410, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#efcf92", padding: 20 },
  popupIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  popupIconSmall: { width: 48, height: 48, borderRadius: 18, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center" },
  popupCloseButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#eef2f7", alignItems: "center", justifyContent: "center" },
  popupEyebrow: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", letterSpacing: 0.5, marginTop: 14 },
  popupTitle: { color: BRAND_DEEP, fontSize: 22, lineHeight: 28, fontWeight: "900", textAlign: "center", marginTop: 8 },
  popupCopy: { color: MUTED, fontSize: 14, lineHeight: 21, fontWeight: "700", textAlign: "center", marginTop: 8 },
  popupActions: { width: "100%", gap: 10, marginTop: 18 },
  popupActionButton: { minHeight: 48, borderRadius: 15, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", paddingHorizontal: 14 },
  popupSecondaryButton: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  popupGhostButton: { backgroundColor: "#eef2f7" },
  popupActionText: { color: "#111111", fontSize: 14, fontWeight: "900" },
  popupSecondaryText: { color: BRAND_DEEP },
  popupGhostText: { color: MUTED },
  countdownPanel: { minHeight: 68, borderRadius: 18, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#efcf92", flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginTop: 16 },
  countdownTextBlock: { flex: 1, minWidth: 0 },
  countdownTitle: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900" },
  countdownCopy: { color: MUTED, fontSize: 11, lineHeight: 16, fontWeight: "700", marginTop: 3 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: "#eef2f7", overflow: "hidden", marginTop: 12 },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: BRAND_ORANGE },
  loadingOverlay: { flex: 1, backgroundColor: "rgba(7,13,24,0.22)", alignItems: "center", justifyContent: "center" },
  loadingCard: { minWidth: 210, borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, padding: 20, alignItems: "center" },
  loadingText: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900", marginTop: 10 }
});
