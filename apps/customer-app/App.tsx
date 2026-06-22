import "./global.css";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { zodResolver } from "@hookform/resolvers/zod";
import { WebView } from "react-native-webview";
import { requestOtpSchema, verifyOtpSchema } from "./src/shared";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  StatusBar,
  useWindowDimensions,
  View
} from "react-native";
import { z } from "zod";
import { api, refreshAccessToken, uploadMedia, type UploadedMedia } from "./src/api";
import { NotificationProvider } from "./src/components/NotificationProvider";
import { useRegisterPushNotifications } from "./src/hooks/useRegisterPushNotifications";
import { configureForegroundNotificationHandler } from "./src/notifications/handlers";
import { createRealtimeSocket, type ConnectionStatus } from "./src/realtime";
import { playAppSound } from "./src/services/soundService";
import { useAppStore } from "./src/store";

type Screen =
  | "home"
  | "search"
  | "orders"
  | "orderDetails"
  | "profile"
  | "editProfile"
  | "settings"
  | "services"
  | "savedAddresses"
  | "addAddress"
  | "walletPayments"
  | "coupons"
  | "helpCenter"
  | "contactSupport"
  | "cancellationPolicy"
  | "rateApp"
  | "privacyPolicy"
  | "termsService"
  | "appInfo"
  | "featureSoon"
  | "notifications"
  | "measurementGuide"
  | "newRequest"
  | "clothIssue"
  | "quotes"
  | "confirmOrder"
  | "trackOrder";
type RequestFlowScreen = "newRequest" | "clothIssue" | "quotes" | "confirmOrder";
type RequestOtpForm = z.input<typeof requestOtpSchema>;
type VerifyOtpForm = z.input<typeof verifyOtpSchema>;
type Quote = { id: string; initials: string; name: string; rating: string; reviews: number; eta: string; price: number; badge?: string; backendQuoteId?: string; backendRequestId?: string; tailorId?: string };
type BackendTailorQuote = {
  id: string;
  requestId: string;
  tailorId: string;
  price: number;
  estimatedDays: number;
  estimatedHours?: number;
  message?: string;
  pickupIncluded?: boolean;
  status: "SUBMITTED" | "ACCEPTED" | "REJECTED";
  tailor?: {
    id: string;
    shopName?: string;
    rating?: number;
    user?: { name?: string; phone?: string };
  } | null;
};
type LocalMedia = { uri: string; type: "image" | "video"; name: string; size?: number };
type OrderStatus =
  | "Awaiting Payment"
  | "Pending"
  | "Confirmed"
  | "Pickup Started"
  | "Order Placed"
  | "Picked Up"
  | "Package Handover to Tailor"
  | "Tailor Started"
  | "Tailor Completed"
  | "On the Way"
  | "Delivered"
  | "Cancelled";
type CustomerOrder = {
  id: string;
  backendOrderId?: string;
  orderNumber: string;
  tailor: Quote;
  draft: RequestDraft;
  total: number;
  status: OrderStatus;
  placedAt: string;
  pickupWindow: string;
  paymentMethod: string;
  paymentStatus?: string;
  backendRequestStatus?: string;
  cancellationFee?: number;
  tailorRating?: number;
  deliveryRating?: number;
  tailorReview?: string;
  deliveryReview?: string;
  tailorRatingSubmittedAt?: string;
  deliveryRatingSubmittedAt?: string;
  invoiceGeneratedAt?: string;
  deliveryFee?: number;
  platformFee?: number;
  homeMeasurementFee?: number;
};
type BackendRequestQuote = BackendTailorQuote & { estimatedHours?: number; tailor?: BackendTailorQuote["tailor"] };
type BackendTailoringRequest = {
  id: string;
  description: string;
  gender?: string;
  clothType: string;
  workType: string;
  urgency: string;
  pickupAddress: string;
  sampleProvided?: boolean;
  sampleMedia?: UploadedMedia[];
  status: "QUOTE_REQUESTED" | "PAYMENT_PENDING" | "TAILOR_SELECTED" | "CANCELLED";
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  quoteAmount?: number;
  deliveryFee?: number;
  platformFee?: number;
  homeMeasurementFee?: number;
  totalAmount?: number;
  cancellationFee?: number;
  cancelledAt?: string;
  confirmedAt?: string;
  createdAt: string;
  selectedQuote?: BackendRequestQuote | null;
};
type CheckoutStartResponse = {
  mode: "cod" | "online";
  request?: BackendTailoringRequest;
  quote?: BackendRequestQuote | null;
  deliveryRequest?: { id: string } | null;
  razorpay?: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill?: { name?: string; contact?: string };
  };
};
type CheckoutVerifyResponse = {
  request: BackendTailoringRequest;
  quote?: BackendRequestQuote | null;
  deliveryRequest?: { id: string } | null;
};
type PaymentSheetState = {
  requestId: string;
  quote: Quote;
  draft: RequestDraft;
  paymentMethod: string;
  config: NonNullable<CheckoutStartResponse["razorpay"]>;
};
type ProfileData = { name: string; phone: string; dateOfBirth?: string; avatarUri?: string; hasCompletedOnboarding?: boolean };
type AppSettings = { notifications: boolean; orderUpdates: boolean; darkMode: boolean; compactCards: boolean; locationAccess: boolean; saveMedia: boolean };
type SavedAddress = { id: string; label: string; address: string; isDefault: boolean; lat?: number; lng?: number };
type AppNotification = { id: string; icon: keyof typeof Ionicons.glyphMap; title: string; text: string; time: string; dark?: boolean; read: boolean };
type HandoffOtp = { taskId: string; type: "customer_to_tailor" | "tailor_to_customer"; stage: "pickup" | "drop"; otp: string; verified: boolean };
type SupportTicketDraft = { id: string; message: string; createdAt: string };
type AppReviewDraft = { id: string; rating: number; review: string; createdAt: string };
type DialogAction = { label: string; onPress?: () => void; destructive?: boolean };
type AppDialogState = { title: string; message: string; actions: DialogAction[] };
type CustomerData = {
  profile: ProfileData;
  settings: AppSettings;
  addresses: SavedAddress[];
  orders: CustomerOrder[];
  notifications: AppNotification[];
  supportTickets: SupportTicketDraft[];
  appReviews: AppReviewDraft[];
  hasCapturedCurrentAddress?: boolean;
};
type RequestDraft = {
  description: string;
  gender?: string;
  clothType?: string;
  workType?: string;
  urgency?: string;
  measurements?: Record<string, string>;
  measurementNotes?: string;
  sampleProvided?: boolean;
  sampleMedia?: LocalMedia;
  uploadedSampleMedia?: UploadedMedia;
  homeMeasurementBooked?: boolean;
  pickup: string;
  media: LocalMedia[];
  uploadedMedia: UploadedMedia[];
  backendRequestId?: string;
};

const BRAND_ORANGE = "#f6a313";
const BRAND_DEEP = "#0b2241";
const SCREEN_BG = "#f7faff";
const CARD_DARK = "#111111";
const darjiLogo = require("./darji transparent.png");
const measurementsImage = require("./measurements.png");
const MAX_MEDIA_FILES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const CUSTOMER_DATA_STORAGE_KEY = "darji.customerDataByPhone.v2";
const CUSTOMER_REQUEST_DRAFT_STORAGE_PREFIX = "darji.customerRequestDraft.v1";
const REQUEST_FLOW_SCREENS = new Set<Screen>(["newRequest", "clothIssue", "quotes", "confirmOrder"]);
const PLATFORM_FEE = 10;
const HOME_MEASUREMENT_FEE = 30;

configureForegroundNotificationHandler();

const cancellationPolicySections = [
  {
    title: "Before Pickup",
    status: "Awaiting payment, confirmed, or pickup not started",
    cancellation: "Allowed",
    refund: "100% refund",
    charges: "No cancellation charges",
    reason: "If the package has not been picked up from your home, cancellation is free."
  },
  {
    title: "After Pickup, Before Tailor Handover",
    status: "Pickup started or clothes collected from customer",
    cancellation: "Allowed",
    refund: "Order refund after deducting charges",
    charges: "Delivery charge + cancellation fee",
    reason: "Once the rider has picked up the package, transport and handling charges apply even if tailoring has not started."
  },
  {
    title: "After Tailor Handover",
    status: "Delivered to tailor, stitching started, ready, or out for delivery",
    cancellation: "Not allowed",
    refund: "No refund",
    charges: "Full order amount may be charged",
    reason: "Once the package is handed over to the tailor, the order is locked and cannot be cancelled."
  }
] as const;

const cancellationSpecialCases = [
  ["Tailor unable to complete the order", "Customer receives a full refund."],
  ["Cloth damaged by Darzi or tailor", "Customer may receive a full refund or compensation according to company policy."],
  ["Delay beyond promised delivery date", "Darzi may provide a partial refund, discount coupon, or free express delivery."]
] as const;

const defaultSettings: AppSettings = {
  notifications: true,
  orderUpdates: true,
  darkMode: false,
  compactCards: false,
  locationAccess: true,
  saveMedia: true
};

const services = [
  { icon: "cut-outline", title: "Stitching", count: "24 tailors" },
  { icon: "construct-outline", title: "Alterations", count: "18 tailors" },
  { icon: "color-palette-outline", title: "Embroidery", count: "12 tailors" },
  { icon: "shirt-outline", title: "Repairs", count: "31 tailors" },
  { icon: "ribbon-outline", title: "Blouse", count: "15 tailors" },
  { icon: "woman-outline", title: "Kurti", count: "22 tailors" }
] as const;

const quotes: Quote[] = [
  { id: "ravi", initials: "RS", name: "Ravi Sharma", rating: "4.8", reviews: 214, eta: "2 days", price: 350, badge: "Top Rated" },
  { id: "meena", initials: "MT", name: "Meena Tailors", rating: "4.6", reviews: 98, eta: "3 days", price: 280, badge: "Fast" },
  { id: "arjun", initials: "AW", name: "Arjun Works", rating: "4.5", reviews: 67, eta: "2 days", price: 320 }
];

const homeMediaFeatures = [
  {
    title: "Cloth Press Doorstep",
    text: "Steam press pickup and delivery at home",
    tag: "Launching soon",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80",
    soon: true
  },
  {
    title: "Video Fit Check",
    text: "Send a quick fit video before pickup",
    tag: "Coming soon",
    image: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Style Match",
    text: "Save measurements and repeat your best fit",
    tag: "Special",
    image: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Express Repairs",
    text: "Priority pickup for urgent alterations",
    tag: "Soon",
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80"
  }
];

const urgencyOptions = [
  { label: "Normal (3-5 days)", helper: "Delivery Rs20", icon: "calendar-outline", deliveryFee: 20 },
  { label: "Express (1-2 days)", helper: "Delivery Rs25", icon: "flash-outline", deliveryFee: 25 },
  { label: "Same Day", helper: "Delivery Rs30", icon: "today-outline", deliveryFee: 30 },
  { label: "Instant Delivery", helper: "Delivery Rs40", icon: "rocket-outline", deliveryFee: 40 }
] as const;

type MeasurementGuide = {
  fields: string[];
  sizeChart: { size: string; values: Record<string, string> }[];
};
type MeasurementIllustration = {
  title: string;
  helper: string;
  orientation: "horizontal" | "vertical" | "diagonal";
  icon: keyof typeof Ionicons.glyphMap;
};

const measurementGuides: Record<string, MeasurementGuide> = {
  "Kurta / Salwar": {
    fields: ["Chest", "Shoulder", "Kurta Length", "Sleeve Length", "Neck", "Waist", "Hip", "Salwar Length"],
    sizeChart: [
      { size: "S", values: { Chest: "91", Waist: "76", Hip: "97", Length: "102" } },
      { size: "M", values: { Chest: "97", Waist: "81", Hip: "102", Length: "107" } },
      { size: "L", values: { Chest: "102", Waist: "86", Hip: "107", Length: "112" } },
      { size: "XL", values: { Chest: "107", Waist: "91", Hip: "112", Length: "117" } }
    ]
  },
  "Saree / Blouse": {
    fields: ["Bust", "Under Bust", "Shoulder", "Blouse Length", "Sleeve Length", "Armhole", "Front Neck Depth", "Back Neck Depth"],
    sizeChart: [
      { size: "S", values: { Bust: "86", Waist: "71", Shoulder: "34", Length: "36" } },
      { size: "M", values: { Bust: "91", Waist: "76", Shoulder: "36", Length: "37" } },
      { size: "L", values: { Bust: "97", Waist: "81", Shoulder: "37", Length: "38" } },
      { size: "XL", values: { Bust: "102", Waist: "86", Shoulder: "38", Length: "39" } }
    ]
  },
  "Shirt / Pants": {
    fields: ["Chest", "Shoulder", "Shirt Length", "Sleeve Length", "Neck", "Waist", "Seat / Hip", "Pant Length", "Inseam"],
    sizeChart: [
      { size: "S", values: { Chest: "97", Waist: "76", Shoulder: "43", Pant: "99" } },
      { size: "M", values: { Chest: "102", Waist: "81", Shoulder: "46", Pant: "102" } },
      { size: "L", values: { Chest: "107", Waist: "86", Shoulder: "48", Pant: "104" } },
      { size: "XL", values: { Chest: "112", Waist: "91", Shoulder: "51", Pant: "107" } }
    ]
  },
  "Suit / Blazer": {
    fields: ["Chest", "Shoulder", "Sleeve Length", "Blazer Length", "Waist", "Seat / Hip", "Trouser Length", "Inseam"],
    sizeChart: [
      { size: "S", values: { Chest: "97", Waist: "76", Shoulder: "43", Blazer: "71" } },
      { size: "M", values: { Chest: "102", Waist: "81", Shoulder: "46", Blazer: "74" } },
      { size: "L", values: { Chest: "107", Waist: "86", Shoulder: "48", Blazer: "76" } },
      { size: "XL", values: { Chest: "112", Waist: "91", Shoulder: "51", Blazer: "79" } }
    ]
  },
  Dress: {
    fields: ["Bust", "Waist", "Hip", "Dress Length", "Shoulder", "Sleeve Length", "Armhole"],
    sizeChart: [
      { size: "S", values: { Bust: "86", Waist: "71", Hip: "97", Length: "97" } },
      { size: "M", values: { Bust: "91", Waist: "76", Hip: "102", Length: "102" } },
      { size: "L", values: { Bust: "97", Waist: "81", Hip: "107", Length: "107" } },
      { size: "XL", values: { Bust: "102", Waist: "86", Hip: "112", Length: "112" } }
    ]
  },
  Others: {
    fields: ["Chest / Bust", "Waist", "Hip", "Shoulder", "Length", "Sleeve Length"],
    sizeChart: [
      { size: "S", values: { Chest: "86-91", Waist: "71-76", Hip: "91-97", Length: "As needed" } },
      { size: "M", values: { Chest: "91-97", Waist: "76-81", Hip: "97-102", Length: "As needed" } },
      { size: "L", values: { Chest: "97-102", Waist: "81-86", Hip: "102-107", Length: "As needed" } },
      { size: "XL", values: { Chest: "102-107", Waist: "86-91", Hip: "107-112", Length: "As needed" } }
    ]
  }
};

function guideForClothType(clothType?: string) {
  return measurementGuides[clothType ?? ""] ?? measurementGuides.Others;
}

function formatCmValue(value: string) {
  return /^\d/.test(value) ? `${value} cm` : value;
}

function illustrationsForClothType(clothType?: string): MeasurementIllustration[] {
  if (clothType === "Saree / Blouse") {
    return [
      { title: "Bust", helper: "Measure around the fullest part of the chest.", orientation: "horizontal", icon: "resize-outline" },
      { title: "Under Bust", helper: "Measure the band area just below the bust.", orientation: "horizontal", icon: "resize-outline" },
      { title: "Neck Depth", helper: "Measure how deep the front or back neck should go.", orientation: "vertical", icon: "shirt-outline" },
      { title: "Armhole", helper: "Measure around the shoulder opening for sleeve comfort.", orientation: "diagonal", icon: "shirt-outline" }
    ];
  }
  if (clothType === "Suit / Blazer") {
    return [
      { title: "Blazer Length", helper: "Measure from shoulder top down to where the blazer should end.", orientation: "vertical", icon: "shirt-outline" },
      { title: "Shoulder", helper: "Measure shoulder edge to shoulder edge across the back.", orientation: "horizontal", icon: "resize-outline" },
      { title: "Seat / Hip", helper: "Measure around the widest hip area for trouser fit.", orientation: "horizontal", icon: "resize-outline" },
      { title: "Inseam", helper: "Measure inside leg from crotch to ankle.", orientation: "vertical", icon: "resize-outline" }
    ];
  }
  if (clothType === "Shirt / Pants") {
    return [
      { title: "Neck", helper: "Measure around the neck where the collar sits.", orientation: "horizontal", icon: "resize-outline" },
      { title: "Shirt Length", helper: "Measure from shoulder top to desired shirt end.", orientation: "vertical", icon: "shirt-outline" },
      { title: "Seat / Hip", helper: "Measure around the widest hip area.", orientation: "horizontal", icon: "resize-outline" },
      { title: "Inseam", helper: "Measure inside leg from crotch to ankle.", orientation: "vertical", icon: "resize-outline" }
    ];
  }
  if (clothType === "Dress") {
    return [
      { title: "Bust", helper: "Measure around the fullest part of the chest.", orientation: "horizontal", icon: "resize-outline" },
      { title: "Dress Length", helper: "Measure from shoulder top to the dress end.", orientation: "vertical", icon: "shirt-outline" },
      { title: "Hip", helper: "Measure around the widest hip area.", orientation: "horizontal", icon: "resize-outline" },
      { title: "Armhole", helper: "Measure around the shoulder opening.", orientation: "diagonal", icon: "shirt-outline" }
    ];
  }
  return [
    { title: "Chest / Bust", helper: "Measure around the fullest upper body area.", orientation: "horizontal", icon: "resize-outline" },
    { title: "Shoulder", helper: "Measure shoulder edge to shoulder edge.", orientation: "horizontal", icon: "resize-outline" },
    { title: "Length", helper: "Measure from shoulder top to desired garment end.", orientation: "vertical", icon: "shirt-outline" },
    { title: "Sleeve Length", helper: "Measure shoulder point to wrist or desired sleeve end.", orientation: "diagonal", icon: "shirt-outline" }
  ];
}

const sampleDraft: RequestDraft = {
  description: "Sleeve adjustment and fitting changes.",
  gender: "Women",
  clothType: "Kurta / Salwar",
  workType: "Kurta Alteration",
  urgency: "Normal (3-5 days)",
  pickup: "12, Rose Garden, Sector 5, Gurugram, Haryana 122001",
  media: [],
  uploadedMedia: []
};

function makeEmptyDraft(pickup = ""): RequestDraft {
  return {
    description: "",
    pickup,
    media: [],
    uploadedMedia: []
  };
}

function hasRequestDraftData(draft: RequestDraft) {
  const hasMeasurements = Object.values(draft.measurements ?? {}).some((value) => value.trim());
  return Boolean(
    draft.description.trim() ||
      draft.media.length ||
      draft.uploadedMedia.length ||
      draft.gender ||
      draft.clothType ||
      draft.workType ||
      draft.urgency ||
      hasMeasurements ||
      draft.measurementNotes?.trim() ||
      draft.sampleProvided ||
      draft.sampleMedia ||
      draft.homeMeasurementBooked
  );
}

function isSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /authentication required|invalid session|invalid or expired token|session expired/i.test(message);
}

function makeDefaultAddresses(): SavedAddress[] {
  return [];
}

function makeDefaultNotifications(): AppNotification[] {
  return [
    { id: "order-progress", icon: "cube-outline", title: "Order in progress", text: "Ravi Sharma started work on your kurta alteration.", time: "Now", dark: false, read: false },
    { id: "pickup-confirmed", icon: "notifications-outline", title: "Pickup confirmed", text: "Your pickup slot is confirmed for today between 2:00 - 4:00 PM.", time: "15 min", dark: false, read: false },
    { id: "quote-received", icon: "notifications-outline", title: "Quote received", text: "Meena Tailors sent a quote for blouse stitching.", time: "1 hr", dark: true, read: true },
    { id: "order-delivered", icon: "cube-outline", title: "Order delivered", text: "Blouse Stitching was delivered successfully. Rate your experience.", time: "Jun 7", dark: true, read: true }
  ];
}

function displayNameForPhone(phone: string, name?: string) {
  if (name?.trim()) return name.trim();
  return phone === "9876543210" ? "Priya Kapoor" : `Customer ${phone.slice(-4) || "User"}`;
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "DR";
}

function makeDefaultCustomerData(phone: string, name?: string): CustomerData {
  return {
    profile: { name: displayNameForPhone(phone, name), phone },
    settings: defaultSettings,
    addresses: makeDefaultAddresses(),
    orders: [],
    notifications: [],
    supportTickets: [],
    appReviews: []
  };
}

function normalizeCustomerDataByPhone(input: unknown): Record<string, CustomerData> {
  if (!input || typeof input !== "object") return {};
  const normalized: Record<string, CustomerData> = {};
  Object.entries(input as Record<string, Partial<CustomerData>>).forEach(([phone, data]) => {
    const defaults = makeDefaultCustomerData(phone);
    const orders = Array.isArray(data.orders) ? data.orders : defaults.orders;
    normalized[phone] = {
      ...defaults,
      ...data,
      profile: { ...defaults.profile, ...(data.profile ?? {}), phone },
      settings: { ...defaults.settings, ...(data.settings ?? {}) },
      addresses: Array.isArray(data.addresses) ? data.addresses : defaults.addresses,
      orders,
      notifications: Array.isArray(data.notifications) ? data.notifications : defaults.notifications,
      supportTickets: Array.isArray(data.supportTickets) ? data.supportTickets : defaults.supportTickets,
      appReviews: Array.isArray(data.appReviews) ? data.appReviews : defaults.appReviews
    };
  });
  return normalized;
}

function createOrderNumber(phone: string, orderCount: number) {
  const year = new Date().getFullYear();
  const phonePart = phone.replace(/\D/g, "").slice(-2).padStart(2, "0");
  const serial = String(848 + orderCount).padStart(4, "0");
  return `#DRJ-${year}-${phonePart}${serial}`;
}

function deliveryFeeForUrgency(urgency?: string) {
  return urgencyOptions.find((option) => option.label === urgency)?.deliveryFee ?? 0;
}

function homeMeasurementFeeForDraft(draft: RequestDraft) {
  return draft.homeMeasurementBooked ? HOME_MEASUREMENT_FEE : 0;
}

function totalForQuote(quote: Quote, draft: RequestDraft) {
  return quote.price + deliveryFeeForUrgency(draft.urgency) + PLATFORM_FEE + homeMeasurementFeeForDraft(draft);
}

function notesForTailoringRequest(draft: RequestDraft) {
  return [
    draft.measurementNotes?.trim(),
    draft.sampleProvided ? "Customer will provide a non-stretch sample garment as a reference." : undefined,
    draft.homeMeasurementBooked ? `Customer requested an at-home measurement visit. Fee: Rs${HOME_MEASUREMENT_FEE}.` : undefined
  ]
    .filter(Boolean)
    .join("\n");
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function formatInvoiceDate(date = new Date()) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value?: string) {
  if (!value) return new Date(2000, 0, 1);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(2000, 0, 1) : parsed;
}

function statusStyle(status: OrderStatus) {
  if (status === "Delivered") return { color: "#15803d", backgroundColor: "#dcfce7" };
  if (status === "Cancelled") return { color: "#b91c1c", backgroundColor: "#fee2e2" };
  if (status === "Pending" || status === "Awaiting Payment") return { color: "#a16207", backgroundColor: "#fef3c7" };
  if (status === "Confirmed" || status === "Order Placed" || status === "Pickup Started") return { color: "#2563eb", backgroundColor: "#dbeafe" };
  if (status === "Tailor Started") return { color: "#7c3aed", backgroundColor: "#ede9fe" };
  if (status === "On the Way" || status === "Tailor Completed") return { color: "#c76f00", backgroundColor: "#fff2d8" };
  return { color: "#c76f00", backgroundColor: "#fff2d8" };
}

function trackStepsForStatus(status: OrderStatus) {
  const labels = ["Order Confirmed", "Pickup Started", "Picked Up From Customer", "Package Handover to Tailor", "Tailor Started", "Tailor Completed", "Out for Delivery", "Delivered"];
  const times = ["", "", "", "", "", "", "", ""];
  const completedMap: Record<OrderStatus, number> = {
    "Awaiting Payment": -1,
    Pending: -1,
    Confirmed: 0,
    "Pickup Started": 1,
    "Order Placed": 0,
    "Picked Up": 2,
    "Package Handover to Tailor": 3,
    "Tailor Started": 4,
    "Tailor Completed": 5,
    "On the Way": 6,
    Delivered: 7,
    Cancelled: 0
  };
  const completed = completedMap[status];
  return labels.map((label, index) => [label, times[index], index <= completed] as const);
}

function canCancelOrder(status: OrderStatus) {
  return ["Awaiting Payment", "Pending", "Confirmed", "Pickup Started", "Order Placed", "Picked Up"].includes(status);
}

function etaLabel(quote?: { estimatedDays?: number; estimatedHours?: number; eta?: string }) {
  if (!quote) return "1 day";
  if (typeof quote.eta === "string") return quote.eta;
  if (quote.estimatedHours && quote.estimatedHours > 0) return `${quote.estimatedHours} hour${quote.estimatedHours === 1 ? "" : "s"}`;
  const days = quote.estimatedDays ?? 1;
  return `${days} day${days === 1 ? "" : "s"}`;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function PhoneField({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.phoneField}>
      <Text style={styles.phonePrefix}>+91</Text>
      <View style={styles.phoneDivider} />
      <TextInput
        style={styles.phoneInput}
        keyboardType="phone-pad"
        maxLength={10}
        placeholder="Enter your number..."
        placeholderTextColor="#8fa0b8"
        value={value}
        onChangeText={(text) => onChange(normalizeDigits(text))}
      />
    </View>
  );
}

function OtpField({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  return (
    <TextInput
      style={styles.otpField}
      keyboardType="number-pad"
      maxLength={6}
      placeholder="Enter OTP"
      placeholderTextColor="#8fa0b8"
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
    />
  );
}

function DatePickerField({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = parseDateInput(value);

  return (
    <>
      <Pressable style={styles.profileInputButton} onPress={() => setShowPicker(true)}>
        <Text style={[styles.profileInputButtonText, !value && styles.placeholderText]}>{value || "Select date of birth"}</Text>
        <Ionicons name="calendar-outline" size={19} color={BRAND_ORANGE} />
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          maximumDate={new Date()}
          onChange={(_, selectedDate) => {
            if (Platform.OS !== "ios") setShowPicker(false);
            if (selectedDate) onChange(formatDateInput(selectedDate));
          }}
        />
      ) : null}
      {showPicker && Platform.OS === "ios" ? (
        <Pressable style={styles.dateDoneButton} onPress={() => setShowPicker(false)}>
          <Text style={styles.orangeSmall}>Done</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function AuthButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={loading} onPress={onPress} android_ripple={{ color: "#d88a05" }} style={[styles.authButton, loading && styles.buttonDisabled]}>
      {loading ? (
        <ActivityIndicator color="#111827" />
      ) : (
        <>
          <Text style={styles.authButtonText}>{label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#111827" style={{ marginLeft: 8 }} />
        </>
      )}
    </Pressable>
  );
}

function DarjiLogoMark() {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.38, 150);

  return (
    <View style={styles.center}>
      <Image source={darjiLogo} resizeMode="contain" style={[styles.logoImage, { width: logoWidth, height: logoWidth * 0.52 }]} />
      <Text style={styles.authTagline}>On-demand tailoring at your doorstep</Text>
    </View>
  );
}

function TrustItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.trustItem}>
      <Ionicons name={icon} size={26} color={BRAND_ORANGE} />
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

function AuthScreen() {
  const [otpRequested, setOtpRequested] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const setSession = useAppStore((state) => state.setSession);
  const requestForm = useForm<RequestOtpForm>({ resolver: zodResolver(requestOtpSchema), defaultValues: { role: "CUSTOMER" } });
  const verifyForm = useForm<VerifyOtpForm>({ resolver: zodResolver(verifyOtpSchema), defaultValues: { role: "CUSTOMER" } });

  async function requestOtp(values: RequestOtpForm) {
    try {
      setIsRequestingOtp(true);
      const result = await api<{ otp?: string }>("/auth/request-otp", { method: "POST", body: JSON.stringify(values) });
      verifyForm.reset({ phone: values.phone, role: "CUSTOMER", otp: result.otp ?? "123456" });
      setOtpRequested(true);
    } catch (error) {
      Alert.alert("OTP failed", error instanceof Error ? error.message : "Check backend connection");
    } finally {
      setIsRequestingOtp(false);
    }
  }

  async function verify(values: VerifyOtpForm) {
    try {
      setIsVerifyingOtp(true);
      const session = await api<{ accessToken: string; refreshToken: string; user: { id: string; phone: string; role: string } }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setSession(session.accessToken, session.user, session.refreshToken);
    } catch (error) {
      Alert.alert("Login failed", error instanceof Error ? error.message : "Check OTP and try again");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.authLayout}>
          <DarjiLogoMark />
          <View style={styles.trustRow}>
            <TrustItem icon="shield-outline" label="Safe & Secure" />
            <TrustItem icon="flash-outline" label="Fast" />
            <TrustItem icon="star-outline" label="Best Services" />
          </View>

          <View style={styles.authForm}>
            <Text style={styles.sectionTitle}>{otpRequested ? "VERIFY OTP" : "LOGIN"}</Text>
            {!otpRequested ? (
              <>
                <Controller control={requestForm.control} name="phone" render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} />} />
                <AuthButton label="Send OTP" loading={isRequestingOtp} onPress={requestForm.handleSubmit(requestOtp, () => Alert.alert("Enter a valid mobile number"))} />
              </>
            ) : (
              <>
                <Controller control={verifyForm.control} name="otp" render={({ field }) => <OtpField value={field.value} onChange={field.onChange} />} />
                <AuthButton label="Verify OTP" loading={isVerifyingOtp} onPress={verifyForm.handleSubmit(verify, () => Alert.alert("Enter the OTP"))} />
                <Pressable style={styles.editPhoneButton} onPress={() => setOtpRequested(false)}>
                  <Text style={styles.orangeSmall}>Edit phone number</Text>
                </Pressable>
              </>
            )}
            <Text style={styles.termsText}>
              By continuing, you agree to our <Text style={styles.orangeText}>Terms of Service</Text> and <Text style={styles.orangeText}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.roundIconButton}>
          <Ionicons name="arrow-back" size={20} color={BRAND_DEEP} />
        </Pressable>
      ) : (
        <View />
      )}
      {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const color = status === "Connected" ? "#15803d" : status === "Reconnecting" ? BRAND_ORANGE : "#b91c1c";
  return (
    <View style={styles.connectionBadge}>
      <View style={[styles.connectionDot, { backgroundColor: color }]} />
      <Text style={[styles.connectionText, { color }]}>{status}</Text>
    </View>
  );
}

function BottomTabs({ active, setScreen }: { active: Screen; setScreen: (screen: Screen) => void }) {
  const items: { key: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "home", label: "Home", icon: "home-outline" },
    { key: "search", label: "Search", icon: "search-outline" },
    { key: "orders", label: "Orders", icon: "cube-outline" },
    { key: "profile", label: "Profile", icon: "person-outline" }
  ];

  return (
    <View style={styles.tabs}>
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable key={item.key} style={styles.tabItem} onPress={() => setScreen(item.key)}>
            <Ionicons name={item.icon} size={22} color={selected ? BRAND_ORANGE : "#151b27"} />
            <Text style={[styles.tabText, selected && styles.activeTabText]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AnimatedSearchPrompt() {
  const words = ["alterations", "blouse work", "kurta stitching", "repairs", "embroidery"];
  const [wordIndex, setWordIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const word = words[wordIndex];

  useEffect(() => {
    const delay = deleting ? 55 : visibleChars === word.length ? 900 : 90;
    const timer = setTimeout(() => {
      if (!deleting && visibleChars < word.length) {
        setVisibleChars((value) => value + 1);
      } else if (!deleting) {
        setDeleting(true);
      } else if (visibleChars > 0) {
        setVisibleChars((value) => value - 1);
      } else {
        setDeleting(false);
        setWordIndex((value) => (value + 1) % words.length);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [deleting, visibleChars, word.length]);

  return (
    <Text style={styles.searchPlaceholder}>
      Search for <Text style={styles.animatedSearchWord}>{word.slice(0, visibleChars)}</Text>
      <Text style={styles.searchCursor}>|</Text>
    </Text>
  );
}

function HomeScreen({
  setScreen,
  profile,
  unreadCount,
  defaultAddress,
  orders
}: {
  setScreen: (screen: Screen) => void;
  profile: ProfileData;
  unreadCount: number;
  defaultAddress?: SavedAddress;
  orders: CustomerOrder[];
}) {
  const { width } = useWindowDimensions();
  const serviceCardWidth = (width - 52) / 2;
  const activeOrder = orders.find((order) => !["Delivered", "Cancelled"].includes(order.status));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <View style={styles.homeTop}>
          <View>
            <Text style={styles.mutedSmall}>{greetingForNow()} 👋</Text>
            <Text style={styles.userName}>{profile.name}</Text>
          </View>
          <View style={styles.homeActions}>
            <Pressable style={styles.notificationButton} onPress={() => setScreen("notifications")}>
              <Ionicons name="notifications-outline" size={19} color={BRAND_ORANGE} />
              {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
            </Pressable>
            {profile.avatarUri ? <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} /> : <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(profile.name)}</Text>
            </View>}
          </View>
        </View>

        <Pressable style={styles.searchBar} onPress={() => setScreen("search")}>
          <Ionicons name="search-outline" size={18} color="#6a788d" />
          <AnimatedSearchPrompt />
        </Pressable>

        <Pressable style={styles.homeAddressCard} onPress={() => setScreen("savedAddresses")}>
          <View style={styles.profileRowIcon}>
            <Ionicons name="location-outline" size={18} color={BRAND_ORANGE} />
          </View>
          <View style={styles.profileRowText}>
            <Text style={styles.addressTitle}>{defaultAddress ? defaultAddress.label : "Pickup address"}</Text>
            <Text style={styles.mutedSmall} numberOfLines={1}>{defaultAddress?.address ?? "Current location will be saved after login"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6b7890" />
        </Pressable>

        <View style={styles.featureCard}>
          <View style={styles.featureOrb} />
          <Text style={styles.featureLabel}>TAILORING REQUEST</Text>
          <Text style={styles.featureTitle}>Get Tailor Quotes{"\n"}at Your Door</Text>
          <Text style={styles.featureSub}>Upload photos & get quotes in minutes</Text>
          <Pressable style={styles.featureButton} onPress={() => setScreen("newRequest")}>
            <Ionicons name="cut-outline" size={16} color="#111111" />
            <Text style={styles.featureButtonText}>Stitch It Now</Text>
          </Pressable>
        </View>

        <Pressable style={styles.homeOrderPreview} onPress={() => setScreen(activeOrder ? "orders" : "newRequest")}>
          <View>
            <Text style={styles.cardLabel}>{activeOrder ? "ACTIVE ORDER" : "START HERE"}</Text>
            <Text style={styles.addressTitle}>{activeOrder ? activeOrder.orderNumber : "No active orders"}</Text>
            <Text style={styles.mutedSmall}>{activeOrder ? `${activeOrder.status} - ${activeOrder.tailor.name}` : "Create a request and get tailor quotes."}</Text>
          </View>
          <Ionicons name={activeOrder ? "cube-outline" : "add-circle-outline"} size={24} color={BRAND_ORANGE} />
        </Pressable>

        <Pressable style={styles.measureHomeCard} onPress={() => setScreen("measurementGuide")}>
          <Image source={measurementsImage} style={styles.measureHomeThumb} resizeMode="cover" />
          <View style={styles.measureHomeText}>
            <Text style={styles.cardLabel}>FIT GUIDE</Text>
            <Text style={styles.addressTitle}>How to measure correctly</Text>
            <Text style={styles.mutedSmall}>See collar, bust, waist, hips, inseam, sleeve and length guides.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6b7890" />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Services</Text>
          <Pressable onPress={() => setScreen("services")}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.serviceGrid}>
          {services.map((service) => (
            <Pressable key={service.title} style={[styles.serviceCard, { width: serviceCardWidth }]} onPress={() => setScreen("newRequest")}>
              <Ionicons name={service.icon} size={29} color={BRAND_ORANGE} />
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceCount}>{service.count}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.homeInsightGrid}>
          <Pressable style={styles.homeInsightCard} onPress={() => setScreen("orders")}>
            <Ionicons name="cube-outline" size={22} color={BRAND_ORANGE} />
            <Text style={styles.homeInsightValue}>Live orders</Text>
            <Text style={styles.mutedSmall}>Track pickup to delivery</Text>
          </Pressable>
          <Pressable style={styles.homeInsightCard} onPress={() => setScreen("coupons")}>
            <Ionicons name="ticket-outline" size={22} color={BRAND_ORANGE} />
            <Text style={styles.homeInsightValue}>Offers</Text>
            <Text style={styles.mutedSmall}>Use DARZI100 today</Text>
          </Pressable>
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Special Features</Text>
          <Text style={styles.seeAll}>Preview</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaFeatureRow}>
          {homeMediaFeatures.map((item) => (
            <Pressable key={item.title} style={styles.mediaFeatureCard} onPress={() => setScreen(item.soon ? "featureSoon" : "newRequest")}>
              <Image source={{ uri: item.image }} style={styles.mediaFeatureImage} resizeMode="cover" />
              <View style={styles.mediaFeatureOverlay} />
              <Text style={styles.mediaFeatureTag}>{item.tag}</Text>
              <View style={styles.mediaFeatureText}>
                <Text style={styles.mediaFeatureTitle}>{item.title}</Text>
                <Text style={styles.mediaFeatureCopy}>{item.text}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.howItWorksCard}>
          <Text style={styles.cardLabel}>HOW DARJI WORKS</Text>
          {[
            ["camera-outline", "Upload"],
            ["chatbubbles-outline", "Get quotes"],
            ["shirt-outline", "Stitching"],
            ["bicycle-outline", "Delivery"]
          ].map(([icon, label]) => (
            <View key={label} style={styles.workflowItem}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={BRAND_ORANGE} />
              <Text style={styles.workflowText}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomTabs active="home" setScreen={setScreen} />
    </SafeAreaView>
  );
}

function ServicesScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <Header title="All Services" onBack={() => setScreen("home")} />
        <View style={styles.infoBanner}>
          <Ionicons name="sparkles-outline" size={16} color={BRAND_ORANGE} />
          <Text style={styles.infoBannerText}>Choose a service and upload photos to get quotes.</Text>
        </View>
        {services.map((service) => (
          <Pressable key={service.title} style={styles.searchResultCard} onPress={() => setScreen("newRequest")}>
            <View style={styles.searchResultIcon}>
              <Ionicons name={service.icon} size={24} color={BRAND_ORANGE} />
            </View>
            <View style={styles.searchResultBody}>
              <Text style={styles.addressTitle}>{service.title}</Text>
              <Text style={styles.mutedSmall}>{service.count} available near you</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7890" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureSoonScreen({ setScreen, onNotify }: { setScreen: (screen: Screen) => void; onNotify: () => void }) {
  const feature = homeMediaFeatures[0];
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <Header title="Launching Soon" onBack={() => setScreen("home")} />
        <Image source={{ uri: feature.image }} style={styles.launchImage} resizeMode="cover" />
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>UPCOMING FEATURE</Text>
          <Text style={styles.launchTitle}>{feature.title}</Text>
          <Text style={styles.infoCopy}>
            Book doorstep cloth pressing with pickup and delivery. We are preparing routing, pricing, and service partner availability before launch.
          </Text>
          <View style={styles.launchPointRow}>
            <Ionicons name="shirt-outline" size={18} color={BRAND_ORANGE} />
            <Text style={styles.workflowText}>Doorstep pickup for pressing</Text>
          </View>
          <View style={styles.launchPointRow}>
            <Ionicons name="bicycle-outline" size={18} color={BRAND_ORANGE} />
            <Text style={styles.workflowText}>Delivery after quality check</Text>
          </View>
          <View style={styles.launchPointRow}>
            <Ionicons name="notifications-outline" size={18} color={BRAND_ORANGE} />
            <Text style={styles.workflowText}>Launch notification for your area</Text>
          </View>
        </View>
        <Pressable style={styles.primaryWideButton} onPress={onNotify}>
          <Ionicons name="notifications-outline" size={18} color="#111111" />
          <Text style={styles.primaryWideButtonText}>Notify Me</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LocationFetchingScreen({
  title = "Fetching your location",
  message = "We are setting your current address as the default pickup address for your orders."
}: {
  title?: string;
  message?: string;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.locationLoadingContent}>
        <View style={styles.locationLoadingIcon}>
          <Ionicons name="navigate-outline" size={32} color={BRAND_ORANGE} />
        </View>
        <Text style={styles.onboardingTitle}>{title}</Text>
        <Text style={styles.helperText}>{message}</Text>
        <ActivityIndicator color={BRAND_ORANGE} size="large" />
      </View>
    </SafeAreaView>
  );
}

function AppDialog({
  dialog,
  onClose
}: {
  dialog?: AppDialogState;
  onClose: () => void;
}) {
  return (
    <Modal transparent visible={Boolean(dialog)} animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCard}>
          <View style={styles.dialogIcon}>
            <Ionicons name="alert-circle-outline" size={26} color={BRAND_ORANGE} />
          </View>
          <Text style={styles.dialogTitle}>{dialog?.title}</Text>
          <Text style={styles.dialogMessage}>{dialog?.message}</Text>
          <View style={styles.dialogActions}>
            {(dialog?.actions ?? []).map((action) => (
              <Pressable
                key={action.label}
                style={[styles.dialogButton, action.destructive && styles.dialogDestructiveButton]}
                onPress={() => {
                  onClose();
                  action.onPress?.();
                }}
              >
                <Text style={[styles.dialogButtonText, action.destructive && styles.dialogDestructiveText]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NotificationsScreen({
  notifications,
  onMarkAllRead,
  setScreen
}: {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  setScreen: (screen: Screen) => void;
}) {
  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Notifications" onBack={() => setScreen("home")} />
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.listTitle}>Notification Center</Text>
            <Text style={styles.mutedSmall}>{unreadCount} unread updates</Text>
          </View>
          <Pressable style={styles.outlinePill} onPress={onMarkAllRead}>
            <Text style={styles.orangeSmall}>Mark all read</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 20 }}>
          {notifications.map((item) => (
            <View key={item.id} style={[styles.notificationCard, item.dark && styles.darkNotificationCard]}>
              <View style={[styles.notificationIcon, item.dark && styles.darkNotificationIcon]}>
                <Ionicons name={item.icon} size={18} color={item.dark ? "#8793ff" : BRAND_ORANGE} />
              </View>
              <View style={styles.notificationBody}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.notificationTitle, item.dark && styles.darkText]}>{item.title}</Text>
                  <Text style={[styles.notificationTime, item.dark && styles.darkMuted]}>{item.time}</Text>
                </View>
                <Text style={[styles.notificationCopy, item.dark && styles.darkMuted]}>{item.text}</Text>
              </View>
              {!item.read ? <View style={styles.smallDot} /> : null}
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomTabs active="home" setScreen={setScreen} />
    </SafeAreaView>
  );
}

function NewRequestScreen({
  draft,
  setDraft,
  setScreen,
  addresses,
  onExitRequest
}: {
  draft: RequestDraft;
  setDraft: (draft: RequestDraft) => void;
  setScreen: (screen: Screen) => void;
  addresses: SavedAddress[];
  onExitRequest: () => void;
}) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const token = useAppStore((state) => state.token);
  const signOut = useAppStore((state) => state.signOut);
  const canContinueRequest = draft.media.length > 0 && draft.description.trim().length >= 10 && draft.pickup.trim().length >= 8;

  function toLocalMedia(asset: ImagePicker.ImagePickerAsset, fallbackIndex: number): LocalMedia {
    const type = asset.type === "video" ? "video" : "image";
    const extension = type === "video" ? "mp4" : "jpg";
    return {
      uri: asset.uri,
      type,
      name: asset.fileName ?? `tailoring-${Date.now()}-${fallbackIndex}.${extension}`,
      size: asset.fileSize
    };
  }

  function appendMedia(items: LocalMedia[]) {
    const next = [...draft.media, ...items].slice(0, MAX_MEDIA_FILES);
    const tooMany = draft.media.length + items.length > MAX_MEDIA_FILES;
    const tooLarge = items.find((item) => item.size && item.size > (item.type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES));

    if (tooLarge) {
      Alert.alert("File too large", tooLarge.type === "image" ? "Photos must be 5 MB or smaller." : "Videos must be 50 MB or smaller.");
      return;
    }
    if (tooMany) Alert.alert("Upload limit", `You can attach up to ${MAX_MEDIA_FILES} photos or videos.`);

    setDraft({ ...draft, media: next, uploadedMedia: [] });
  }

  async function uploadAndContinue() {
    if (!token) {
      Alert.alert("Login required", "Please login again.");
      return;
    }
    if (draft.media.length === 0) {
      Alert.alert("Photo required", "Please add at least one photo or video so the tailor can understand the cloth and work.");
      return;
    }
    if (draft.description.trim().length < 10) {
      Alert.alert("Description required", "Please describe the stitching, alteration, or issue before continuing.");
      return;
    }
    if (draft.pickup.trim().length < 8) {
      Alert.alert("Pickup address required", "Please add a pickup address or choose a saved address.");
      return;
    }
    try {
      setUploading(true);
      const uploaded = await uploadMedia(draft.media, token);
      setDraft({ ...draft, uploadedMedia: uploaded });
      setScreen("clothIssue");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try uploading smaller files.";
      Alert.alert("Upload failed", message);
      if (message.includes("Session expired")) signOut();
    } finally {
      setUploading(false);
    }
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsMultipleSelection: true
    });
    if (!result.canceled) appendMedia(result.assets.map(toLocalMedia));
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow camera access to capture photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8
    });
    if (!result.canceled) appendMedia(result.assets.map(toLocalMedia));
  }

  async function useCurrentLocation() {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow location access to select your current pickup address.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const places = await Location.reverseGeocodeAsync(position.coords);
      const place = places[0];
      const address = place
        ? [place.name, place.street, place.district, place.city, place.region, place.postalCode].filter(Boolean).join(", ")
        : `Current location: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
      setDraft({ ...draft, pickup: address });
    } catch (error) {
      Alert.alert("Location failed", error instanceof Error ? error.message : "Unable to fetch current location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="New Request" onBack={onExitRequest} />
        <Text style={styles.helperText}>Describe your tailoring needs clearly so tailors can give accurate quotes.</Text>

        <Text style={styles.formLabel}>Upload Photos / Video</Text>
        <View style={styles.uploadRow}>
          {[
            ["camera-outline", "Camera", openCamera],
            ["image-outline", "Gallery", pickFromGallery],
            ["videocam-outline", "Video", pickFromGallery]
          ].map(([icon, label, action]) => (
            <Pressable key={label as string} style={styles.uploadBox} onPress={action as () => void}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={BRAND_ORANGE} />
              <Text style={styles.uploadText}>{label as string}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.addPhotoButton} onPress={pickFromGallery}>
          <Ionicons name="share-outline" size={16} color={BRAND_ORANGE} />
          <Text style={styles.addPhotoText}>{draft.media.length ? `${draft.media.length} selected - Add More` : "Add More Photos"}</Text>
        </Pressable>
        {draft.media.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
            {draft.media.map((item, index) => (
              <View key={`${item.uri}-${index}`} style={styles.previewBox}>
                <Image source={{ uri: item.uri }} resizeMode="cover" style={styles.previewImage} />
                {item.type === "video" ? (
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={10} color="#ffffff" />
                  </View>
                ) : null}
                <Pressable style={styles.removePreview} onPress={() => setDraft({ ...draft, media: draft.media.filter((_, itemIndex) => itemIndex !== index), uploadedMedia: [] })}>
                  <Ionicons name="close" size={12} color="#ffffff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.formLabel}>Describe the Issue</Text>
        <Text style={styles.fieldDisclaimer}>Required. Add clear details so tailors can quote correctly.</Text>
        <TextInput
          multiline
          style={styles.descriptionInput}
          placeholder="e.g. My kurta needs the sleeve length reduced by 5 cm and side seams taken in..."
          placeholderTextColor="#98a4b6"
          value={draft.description}
          onChangeText={(description) => setDraft({ ...draft, description })}
        />

        <Text style={styles.formLabel}>Pickup Address</Text>
        <View style={styles.addressCard}>
          <Ionicons name="location-outline" size={20} color={BRAND_ORANGE} />
          <View style={styles.addressTextWrap}>
            {editingAddress ? (
              <TextInput
                multiline
                style={styles.addressInput}
                value={draft.pickup}
                onChangeText={(pickup) => setDraft({ ...draft, pickup })}
                placeholder="Enter pickup address"
                placeholderTextColor="#98a4b6"
              />
            ) : (
              <>
                <Text style={styles.addressTitle}>{draft.pickup.split(",")[0]}</Text>
                <Text style={styles.mutedSmall}>{draft.pickup.split(",").slice(1).join(",").trim() || "Tap edit to update address"}</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.addressActions}>
          <Pressable style={styles.addressActionButton} onPress={() => setEditingAddress((value) => !value)}>
            <Ionicons name={editingAddress ? "checkmark-outline" : "create-outline"} size={15} color={BRAND_ORANGE} />
            <Text style={styles.addPhotoText}>{editingAddress ? "Done" : "Edit address"}</Text>
          </Pressable>
          <Pressable style={styles.addressActionButton} onPress={useCurrentLocation} disabled={locating}>
            {locating ? <ActivityIndicator size="small" color={BRAND_ORANGE} /> : <Ionicons name="navigate-outline" size={15} color={BRAND_ORANGE} />}
            <Text style={styles.addPhotoText}>Use current location</Text>
          </Pressable>
        </View>
        {addresses.length ? (
          <>
            <Text style={styles.formLabel}>Use Saved Address</Text>
            <View style={styles.savedAddressList}>
              {addresses.map((address) => (
                <Pressable key={address.id} style={[styles.savedAddressChoice, draft.pickup === address.address && styles.savedAddressChoiceSelected]} onPress={() => setDraft({ ...draft, pickup: address.address })}>
                  <Ionicons name="home-outline" size={15} color={draft.pickup === address.address ? BRAND_ORANGE : "#6b7890"} />
                  <View style={styles.savedAddressChoiceText}>
                    <Text style={styles.savedAddressChoiceTitle}>{address.label}</Text>
                    <Text style={styles.mutedSmall} numberOfLines={1}>{address.address}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.fieldDisclaimer}>Photos, description, and pickup address are required before continuing.</Text>
        <Pressable style={[styles.primaryWideButton, (!canContinueRequest || uploading) && styles.disabledDarkButton]} onPress={uploadAndContinue} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <>
              <Text style={[styles.primaryWideButtonText, !canContinueRequest && styles.disabledText]}>Continue</Text>
              <Ionicons name="chevron-forward" size={18} color={canContinueRequest ? "#111111" : "#777777"} />
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function OptionButton({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable style={[styles.optionButton, selected && styles.selectedOptionButton]} onPress={onPress}>
      {icon ? <Ionicons name={icon} size={18} color={selected ? BRAND_ORANGE : "#7d8491"} /> : null}
      <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{label}</Text>
    </Pressable>
  );
}

function SizeChartModal({ visible, clothType, guide, onClose }: { visible: boolean; clothType?: string; guide: MeasurementGuide; onClose: () => void }) {
  const columns = Object.keys(guide.sizeChart[0]?.values ?? {});

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sizeChartModal}>
          <View style={styles.sizeChartModalHeader}>
            <View style={styles.sizeChartTitleBlock}>
              <Text style={styles.cardLabel}>SIZE CHART</Text>
              <Text style={styles.addressTitle}>{clothType ?? "Selected cloth"}</Text>
            </View>
            <Pressable style={styles.chartCloseButton} onPress={onClose}>
              <Ionicons name="close" size={18} color={BRAND_DEEP} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sizeChartModalScroll}>
            <Text style={styles.sizeChartHelp}>Use this as a quick cm guide. Exact fit depends on your body shape and preferred comfort. All size chart values are in cm.</Text>
            <MeasurementOverviewGuide compact />
            <Text style={styles.sizeChartSectionTitle}>Common size chart</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.sizeChartRow}>
                  <Text style={[styles.sizeChartCell, styles.sizeChartHeaderCell]}>Size</Text>
                  {columns.map((column) => (
                    <Text key={column} style={[styles.sizeChartCell, styles.sizeChartHeaderCell]}>{column}</Text>
                  ))}
                </View>
                {guide.sizeChart.map((row) => (
                  <View key={row.size} style={styles.sizeChartRow}>
                    <Text style={[styles.sizeChartCell, styles.sizeChartSizeCell]}>{row.size}</Text>
                    {columns.map((column) => (
                      <Text key={`${row.size}-${column}`} style={styles.sizeChartCell}>{formatCmValue(row.values[column])}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MeasurementOverviewGuide({ compact = false }: { compact?: boolean }) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  return (
    <>
      <Pressable style={[styles.measurementImageCard, compact && styles.measurementImageCardCompact]} onPress={() => setZoomOpen(true)}>
        <Image source={measurementsImage} style={[styles.measurementGuideImage, compact && styles.measurementGuideImageCompact]} resizeMode="contain" />
        <Text style={styles.measurementImageNote}>Tap image to zoom. Use it to understand where to measure. Enter all measurements in this app in cm.</Text>
      </Pressable>
      <Modal visible={zoomOpen} animationType="fade" onRequestClose={() => setZoomOpen(false)}>
        <SafeAreaView style={styles.imageZoomSafe}>
          <View style={styles.imageZoomHeader}>
            <Text style={styles.imageZoomTitle}>Measurement Guide</Text>
            <Pressable style={styles.chartCloseButton} onPress={() => setZoomOpen(false)}>
              <Ionicons name="close" size={18} color={BRAND_DEEP} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.imageZoomHorizontalContent}>
            <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.imageZoomVerticalContent}>
              <Image source={measurementsImage} resizeMode="contain" style={[styles.zoomedMeasurementImage, { width: 320 * zoom, height: 356 * zoom }]} />
            </ScrollView>
          </ScrollView>
          <View style={styles.imageZoomControls}>
            <Pressable style={styles.zoomButton} onPress={() => setZoom((value) => Math.max(1, value - 0.25))}>
              <Ionicons name="remove" size={18} color={BRAND_DEEP} />
            </Pressable>
            <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
            <Pressable style={styles.zoomButton} onPress={() => setZoom((value) => Math.min(2.5, value + 0.25))}>
              <Ionicons name="add" size={18} color={BRAND_DEEP} />
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function MeasurementBodyPanel({ title, accent }: { title: string; accent: string }) {
  return (
    <View style={styles.measurementBodyPanel}>
      <Text style={[styles.measurementBodyPanelTitle, { backgroundColor: accent }]}>{title}</Text>
      <View style={styles.measurementBodyFigure}>
        <Ionicons name="person-outline" size={102} color={BRAND_DEEP} />
        <MeasurementMarker number="1" style={styles.markerNeck} color={accent} />
        <MeasurementLine style={styles.lineNeck} color={accent} />
        <MeasurementMarker number="2" style={styles.markerChest} color={accent} />
        <MeasurementLine style={styles.lineChest} color={accent} />
        <MeasurementMarker number="3" style={styles.markerWaist} color={accent} />
        <MeasurementLine style={styles.lineWaist} color={accent} />
        <MeasurementMarker number="4" style={styles.markerHip} color={accent} />
        <MeasurementLine style={styles.lineHip} color={accent} />
        <MeasurementMarker number="5" style={styles.markerInseam} color={accent} />
        <MeasurementLine style={styles.lineInseam} color={accent} vertical />
      </View>
    </View>
  );
}

function MeasurementMarker({ number, color, style }: { number: string; color: string; style: object }) {
  return <Text style={[styles.measurementMarker, { backgroundColor: color }, style]}>{number}</Text>;
}

function MeasurementLine({ color, style, vertical }: { color: string; style: object; vertical?: boolean }) {
  return <View style={[styles.measurementBodyLine, vertical && styles.measurementBodyLineVertical, { backgroundColor: color }, style]} />;
}

function MeasurementGuideScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <Header title="How to Measure" onBack={() => setScreen("home")} />
        <Text style={styles.helperText}>Use this guide before creating a request. Accurate measurements help tailors quote faster and stitch closer to your preferred fit.</Text>
        <MeasurementOverviewGuide />
        <Text style={styles.formLabel}>Cloth-wise measurement checklist</Text>
        {Object.entries(measurementGuides).map(([clothType, guide]) => (
          <View key={clothType} style={styles.whiteCard}>
            <Text style={styles.addressTitle}>{clothType}</Text>
            <Text style={styles.sizeChartIntro}>Ask your tailor for help if you are unsure. Measurements are entered in cm.</Text>
            <View style={styles.measurementGuideChipPanel}>
              <View style={styles.measurementGuideChipRow}>
                {guide.fields.map((field) => (
                  <Text key={field} style={styles.measurementGuideChip}>{field}</Text>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ClothIssueScreen({ draft, setDraft, setScreen }: { draft: RequestDraft; setDraft: (draft: RequestDraft) => void; setScreen: (screen: Screen) => void }) {
  const canContinue = Boolean(draft.gender && draft.clothType && draft.workType && draft.urgency);
  const [saving, setSaving] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showHomeMeasurementModal, setShowHomeMeasurementModal] = useState(false);
  const token = useAppStore((state) => state.token);
  const measurementGuide = guideForClothType(draft.clothType);
  const measurements = draft.measurements ?? {};

  function selectClothType(clothType: string) {
    setDraft({ ...draft, clothType, measurements: {}, measurementNotes: "", sampleMedia: undefined, uploadedSampleMedia: undefined });
  }

  function setMeasurement(field: string, value: string) {
    setDraft({ ...draft, measurements: { ...measurements, [field]: value } });
  }

  async function pickSampleImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload a sample garment photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      Alert.alert("File too large", "Sample photos must be 5 MB or smaller.");
      return;
    }
    setDraft({
      ...draft,
      sampleProvided: true,
      sampleMedia: {
        uri: asset.uri,
        type: "image",
        name: asset.fileName ?? `sample-${Date.now()}.jpg`,
        size: asset.fileSize
      },
      uploadedSampleMedia: undefined
    });
  }

  function toggleSampleProvided() {
    const next = !draft.sampleProvided;
    setDraft({
      ...draft,
      sampleProvided: next,
      sampleMedia: next ? draft.sampleMedia : undefined,
      uploadedSampleMedia: next ? draft.uploadedSampleMedia : undefined
    });
  }

  async function saveRequestAndGetQuotes() {
    if (!canContinue || !token) return;
    if (draft.description.trim().length < 10) {
      Alert.alert("Add details", "Describe the issue in at least 10 characters.");
      setScreen("newRequest");
      return;
    }
    if (draft.sampleProvided && !draft.sampleMedia && !draft.uploadedSampleMedia) {
      Alert.alert("Sample photo needed", "Upload one photo of the sample garment or turn off the sample option.");
      return;
    }

    try {
      setSaving(true);
      const uploadedSampleMedia = draft.sampleProvided && draft.sampleMedia && !draft.uploadedSampleMedia ? (await uploadMedia([draft.sampleMedia], token))[0] : draft.uploadedSampleMedia;
      const measurementNotes = notesForTailoringRequest(draft);
      const request = await api<{ id: string }>(
        "/tailoring-requests",
        {
          method: "POST",
          body: JSON.stringify({
            description: draft.description,
            gender: draft.gender,
            clothType: draft.clothType,
            workType: draft.workType,
            urgency: draft.urgency,
            measurement: draft.clothType
              ? {
                  label: draft.clothType,
                  fields: Object.fromEntries(Object.entries(draft.measurements ?? {}).filter(([, value]) => value.trim())),
                  imageUrl: uploadedSampleMedia?.url
                }
              : undefined,
            measurementNotes: measurementNotes || undefined,
            pickupAddress: draft.pickup,
            sampleProvided: draft.sampleProvided === true,
            media: draft.uploadedMedia,
            sampleMedia: uploadedSampleMedia ? [uploadedSampleMedia] : []
          })
        },
        token
      );
      setDraft({ ...draft, uploadedSampleMedia, backendRequestId: request.id });
      setScreen("quotes");
    } catch (error) {
      Alert.alert("Request failed", error instanceof Error ? error.message : "Could not save your request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Cloth & Issue" onBack={() => setScreen("newRequest")} />

        <Text style={styles.formLabel}>Gender / Fit Type</Text>
        <View style={styles.twoCol}>
          {["Men", "Women", "Kids", "Unisex"].map((label) => (
            <OptionButton key={label} icon={label === "Women" ? "woman-outline" : label === "Men" ? "man-outline" : "person-outline"} label={label} selected={draft.gender === label} onPress={() => setDraft({ ...draft, gender: label })} />
          ))}
        </View>

        <Text style={styles.formLabel}>Cloth Type</Text>
        <View style={styles.twoCol}>
          {["Kurta / Salwar", "Saree / Blouse", "Shirt / Pants", "Suit / Blazer", "Dress", "Others"].map((label) => (
            <OptionButton key={label} icon="shirt-outline" label={label} selected={draft.clothType === label} onPress={() => selectClothType(label)} />
          ))}
        </View>

        {draft.clothType ? (
          <View style={styles.measurementCard}>
            <View style={styles.rowBetween}>
              <View style={styles.measurementTitleBlock}>
                <Text style={styles.cardLabel}>MEASUREMENTS</Text>
                <Text style={styles.addressTitle}>{draft.clothType}</Text>
              </View>
              <Pressable style={styles.sizeChartButton} onPress={() => setShowSizeChart(true)}>
                <Ionicons name="resize-outline" size={15} color={BRAND_ORANGE} />
                <Text style={styles.sizeChartButtonText}>Size chart</Text>
              </Pressable>
            </View>
            <View style={styles.sampleReferenceCard}>
              <Pressable style={styles.sampleReferenceHeader} onPress={toggleSampleProvided}>
                <View style={styles.sampleReferenceIcon}>
                  <Ionicons name={draft.sampleProvided ? "checkbox" : "square-outline"} size={21} color={BRAND_ORANGE} />
                </View>
                <View style={styles.sampleReferenceText}>
                  <Text style={styles.addressTitle}>I will send a sample with my clothes</Text>
                  <Text style={styles.sampleReferenceCopy}>
                    {draft.sampleProvided ? "Sample selected. Upload a photo so the tailor can check the reference." : "Safer than only typing measurements: one wrong number can affect the fit."}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.sampleBulletList}>
                <View style={styles.sampleBulletRow}>
                  <Text style={styles.sampleBulletDot}>•</Text>
                  <Text style={styles.sampleBulletText}>Best for matching your preferred fit.</Text>
                </View>
                <View style={styles.sampleBulletRow}>
                  <Text style={styles.sampleBulletDot}>•</Text>
                  <Text style={styles.sampleBulletText}>Do not send stretchable samples like rayon.</Text>
                </View>
                <View style={styles.sampleBulletRow}>
                  <Text style={styles.sampleBulletDot}>•</Text>
                  <Text style={styles.sampleBulletText}>Readymade S/M/L/XL samples are stitched to that garment size only.</Text>
                </View>
              </View>
              {draft.sampleProvided ? (
                <>
                  <Pressable style={styles.sampleUploadButton} onPress={pickSampleImage}>
                    <Ionicons name={draft.sampleMedia || draft.uploadedSampleMedia ? "image" : "cloud-upload-outline"} size={17} color={BRAND_ORANGE} />
                    <Text style={styles.sampleUploadText}>{draft.sampleMedia || draft.uploadedSampleMedia ? "Change Sample Photo" : "Upload Sample Photo"}</Text>
                  </Pressable>
                  {draft.sampleMedia || draft.uploadedSampleMedia ? (
                    <View style={styles.samplePreviewRow}>
                      <Image source={{ uri: draft.sampleMedia?.uri ?? draft.uploadedSampleMedia?.url ?? "" }} resizeMode="cover" style={styles.samplePreviewImage} />
                      <View style={styles.samplePreviewText}>
                        <Text style={styles.addressTitle}>Sample photo added</Text>
                        <Text style={styles.mutedSmall}>Tailor can use this with your measurements.</Text>
                      </View>
                      <Pressable style={styles.sampleRemoveButton} onPress={() => setDraft({ ...draft, sampleMedia: undefined, uploadedSampleMedia: undefined })}>
                        <Ionicons name="close" size={15} color="#ffffff" />
                      </Pressable>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
            <View style={styles.measurementRiskBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#b91c1c" />
              <Text style={styles.measurementRiskText}>Clothes are stitched from your measurements. Wrong measurements can cause fit issues and are not Darji's responsibility.</Text>
            </View>
            <Text style={styles.sizeChartIntro}>Enter measurements in cm. Tap size chart if you need a quick reference.</Text>
            <View style={styles.measurementGrid}>
              {measurementGuide.fields.map((field) => (
                <View key={field} style={styles.measurementField}>
                  <Text style={styles.measurementLabel}>{field} (cm)</Text>
                  <TextInput
                    style={styles.measurementInput}
                    value={measurements[field] ?? ""}
                    onChangeText={(value) => setMeasurement(field, value)}
                    keyboardType="decimal-pad"
                    placeholder="cm"
                    placeholderTextColor="#98a4b6"
                  />
                </View>
              ))}
            </View>
            <Text style={styles.formLabel}>Extra Measurement Details</Text>
            <TextInput
              multiline
              style={styles.measurementNotesInput}
              value={draft.measurementNotes ?? ""}
              onChangeText={(measurementNotes) => setDraft({ ...draft, measurementNotes })}
              placeholder="Add fit preference, loose/tight notes, old garment reference, or special instructions..."
              placeholderTextColor="#98a4b6"
            />
          </View>
        ) : null}

        <Pressable style={[styles.homeMeasurementButton, draft.homeMeasurementBooked && styles.homeMeasurementButtonSelected]} onPress={() => setShowHomeMeasurementModal(true)}>
          <View style={styles.homeMeasurementGlowIcon}>
            <Ionicons name="help-circle-outline" size={21} color="#111111" />
          </View>
          <View style={styles.homeMeasurementTextBlock}>
            <Text style={styles.homeMeasurementTitle}>Not sure about your measurement?</Text>
            <Text style={styles.homeMeasurementCopy}>{draft.homeMeasurementBooked ? `Tailor visit added: Rs${HOME_MEASUREMENT_FEE}` : "Book a tailor to get measured at home"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#111111" />
        </Pressable>

        <Text style={styles.formLabel}>Type of Work</Text>
        <View style={styles.twoCol}>
          {["Stitching New", "Alteration", "Repair / Mending", "Embroidery", "Blouse Work", "Hemming"].map((label) => (
            <OptionButton key={label} label={label} selected={draft.workType === label} onPress={() => setDraft({ ...draft, workType: label })} />
          ))}
        </View>

        <Text style={styles.formLabel}>Urgency</Text>
        <View style={styles.urgencyRow}>
          {urgencyOptions.map((option) => (
            <Pressable key={option.label} style={[styles.urgencyButton, draft.urgency === option.label && styles.selectedUrgency]} onPress={() => setDraft({ ...draft, urgency: option.label })}>
              <Ionicons name={option.icon} size={20} color={draft.urgency === option.label ? BRAND_ORANGE : "#7d8491"} />
              <Text style={[styles.urgencyText, draft.urgency === option.label && styles.selectedUrgencyText]}>{option.label}</Text>
              <Text style={[styles.urgencyHelper, draft.urgency === option.label && styles.selectedUrgencyText]}>{option.helper}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable disabled={!canContinue || saving} style={[styles.primaryWideButton, (!canContinue || saving) && styles.disabledDarkButton]} onPress={saveRequestAndGetQuotes}>
          {saving ? (
            <ActivityIndicator color="#777777" />
          ) : (
            <>
              <Text style={[styles.primaryWideButtonText, !canContinue && styles.disabledText]}>Get Quotes</Text>
              <Ionicons name="chevron-forward" size={18} color={canContinue ? "#111111" : "#777777"} />
            </>
          )}
        </Pressable>
      </ScrollView>
      <SizeChartModal visible={showSizeChart} clothType={draft.clothType} guide={measurementGuide} onClose={() => setShowSizeChart(false)} />
      <Modal visible={showHomeMeasurementModal} transparent animationType="fade" onRequestClose={() => setShowHomeMeasurementModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.homeMeasurementModal}>
            <View style={styles.homeMeasurementModalIcon}>
              <Ionicons name="home-outline" size={28} color={BRAND_ORANGE} />
            </View>
            <Text style={styles.homeMeasurementModalTitle}>Book at-home measurement</Text>
            <Text style={styles.homeMeasurementModalCopy}>A tailor will visit your address and take measurements before stitching. This placeholder visit fee will be added to your order total.</Text>
            <View style={styles.homeMeasurementFeeBox}>
              <Text style={styles.summaryLabel}>Measurement visit fee</Text>
              <Text style={styles.summaryStrong}>Rs{HOME_MEASUREMENT_FEE}</Text>
            </View>
            <View style={styles.homeMeasurementModalActions}>
              <Pressable
                style={[styles.secondaryWideButton, styles.homeMeasurementModalButton]}
                onPress={() => {
                  setDraft({ ...draft, homeMeasurementBooked: false });
                  setShowHomeMeasurementModal(false);
                }}
              >
                <Text style={styles.secondaryWideButtonText}>Remove</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryWideButton, styles.homeMeasurementModalButton]}
                onPress={() => {
                  setDraft({ ...draft, homeMeasurementBooked: true });
                  setShowHomeMeasurementModal(false);
                }}
              >
                <Text style={styles.primaryWideButtonText}>Add Rs{HOME_MEASUREMENT_FEE}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function quoteFromBackend(quote: BackendRequestQuote): Quote {
  const name = quote.tailor?.shopName || quote.tailor?.user?.name || "Darji Tailor";
  return {
    id: quote.id,
    backendQuoteId: quote.id,
    backendRequestId: quote.requestId,
    tailorId: quote.tailorId,
    initials: initialsFor(name),
    name,
    rating: String(quote.tailor?.rating ?? "4.5"),
    reviews: 0,
    eta: etaLabel(quote),
    price: quote.price
  };
}

function statusFromBackendRequest(request: BackendTailoringRequest): OrderStatus {
  if (request.status === "CANCELLED" || request.orderStatus === "cancelled") return "Cancelled";
  if (request.status === "PAYMENT_PENDING" || request.orderStatus === "payment_pending") return "Awaiting Payment";
  if (request.orderStatus === "pickup_started") return "Pickup Started";
  if (request.orderStatus === "picked_up_from_customer") return "Picked Up";
  if (request.orderStatus === "received_by_tailor") return "Package Handover to Tailor";
  if (request.orderStatus === "ready_for_delivery") return "Tailor Completed";
  if (request.orderStatus === "out_for_delivery") return "On the Way";
  if (request.orderStatus === "completed") return "Delivered";
  if (request.status === "TAILOR_SELECTED") return "Confirmed";
  return "Pending";
}

function orderFromBackendRequest(request: BackendTailoringRequest, existingOrder?: CustomerOrder): CustomerOrder | undefined {
  const selectedQuote = request.selectedQuote ? quoteFromBackend(request.selectedQuote) : existingOrder?.tailor ?? {
    id: `pending-${request.id}`,
    backendRequestId: request.id,
    initials: "DQ",
    name: request.status === "CANCELLED" ? "No tailor assigned" : "Waiting for tailor quotes",
    rating: "New",
    reviews: 0,
    eta: "Pending",
    price: 0
  };

  const fallbackDraft = existingOrder?.draft ?? makeEmptyDraft(request.pickupAddress);
  const draft: RequestDraft = {
    ...fallbackDraft,
    description: request.description,
    gender: request.gender,
    clothType: request.clothType,
    workType: request.workType,
    urgency: request.urgency,
    pickup: request.pickupAddress,
    sampleProvided: request.sampleProvided,
    backendRequestId: request.id
  };

  return {
    ...(existingOrder ?? {}),
    id: existingOrder?.id ?? request.id,
    backendOrderId: request.id,
    orderNumber: `REQ-${request.id.slice(0, 8).toUpperCase()}`,
    tailor: { ...selectedQuote, eta: etaLabel(request.selectedQuote ?? selectedQuote) },
    draft,
    total: request.totalAmount ?? existingOrder?.total ?? selectedQuote.price,
    status: statusFromBackendRequest(request),
    placedAt: request.confirmedAt ?? request.createdAt,
    pickupWindow: existingOrder?.pickupWindow ?? "Today, 2:00 - 4:00 PM",
    paymentMethod: (request.paymentMethod ?? existingOrder?.paymentMethod ?? "COD").toUpperCase(),
    paymentStatus: request.paymentStatus ?? existingOrder?.paymentStatus,
    backendRequestStatus: request.status,
    cancellationFee: request.cancellationFee,
    deliveryFee: request.deliveryFee ?? existingOrder?.deliveryFee,
    platformFee: request.platformFee ?? existingOrder?.platformFee,
    homeMeasurementFee: request.homeMeasurementFee ?? existingOrder?.homeMeasurementFee,
    tailorRating: existingOrder?.tailorRating,
    deliveryRating: existingOrder?.deliveryRating,
    tailorReview: existingOrder?.tailorReview,
    deliveryReview: existingOrder?.deliveryReview,
    tailorRatingSubmittedAt: existingOrder?.tailorRatingSubmittedAt,
    deliveryRatingSubmittedAt: existingOrder?.deliveryRatingSubmittedAt,
    invoiceGeneratedAt: existingOrder?.invoiceGeneratedAt
  };
}

function QuotesScreen({
  draft,
  selectedQuote,
  setSelectedQuote,
  setScreen
}: {
  draft: RequestDraft;
  selectedQuote?: Quote;
  setSelectedQuote: (quote: Quote) => void;
  setScreen: (screen: Screen) => void;
}) {
  const token = useAppStore((state) => state.token);
  const signOut = useAppStore((state) => state.signOut);
  const [backendQuotes, setBackendQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function loadQuotes() {
    if (!token || !draft.backendRequestId) return;
    try {
      setLoading(true);
      const data = await api<BackendTailorQuote[]>(`/tailoring-requests/${draft.backendRequestId}/quotes`, {}, token);
      setBackendQuotes(data.filter((quote) => quote.status === "SUBMITTED").map(quoteFromBackend));
    } catch (error) {
      Alert.alert("Quotes failed", error instanceof Error ? error.message : "Could not load tailor quotes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuotes();
  }, [draft.backendRequestId, token]);

  const visibleQuotes = draft.backendRequestId ? backendQuotes : quotes;

  async function confirmTailor() {
    if (!selectedQuote) return;
    if (!selectedQuote.backendRequestId || !selectedQuote.backendQuoteId || !token) {
      setScreen("confirmOrder");
      return;
    }
    setConfirming(true);
    setScreen("confirmOrder");
    setConfirming(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Tailor Quotes" onBack={() => setScreen("clothIssue")} />
        <View style={styles.infoBanner}>
          <Ionicons name="time-outline" size={17} color={BRAND_ORANGE} />
          <Text style={styles.infoBannerText}>{loading ? "Checking tailor quotes..." : `${visibleQuotes.length} tailors responded to your request`}</Text>
        </View>

        {visibleQuotes.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={34} color={BRAND_ORANGE} />
            <Text style={styles.emptyTitle}>Waiting for tailor quotes</Text>
            <Text style={styles.helperText}>Your request is open. Tailors will see it in their app and send quote amount with completion time.</Text>
            <Pressable style={styles.secondaryWideButton} onPress={loadQuotes}>
              <Ionicons name="refresh-outline" size={18} color={BRAND_ORANGE} />
              <Text style={styles.secondaryWideButtonText}>Refresh Quotes</Text>
            </Pressable>
          </View>
        ) : null}

        {visibleQuotes.map((quote) => {
          const selected = selectedQuote?.id === quote.id;
          return (
            <Pressable key={quote.id} style={[styles.quoteCard, selected && styles.selectedQuoteCard]} onPress={() => setSelectedQuote(quote)}>
              <View style={styles.quoteTopRow}>
                <View style={styles.quoteAvatar}>
                  <Text style={styles.avatarText}>{quote.initials}</Text>
                </View>
                <View style={styles.quoteDetails}>
                  <Text style={styles.quoteName} numberOfLines={1}>
                    {quote.name}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color={BRAND_ORANGE} />
                    <Text style={styles.quoteMeta} numberOfLines={1}>
                      {quote.rating} ({quote.reviews} reviews)
                    </Text>
                  </View>
                  <Text style={styles.quoteMeta}>Est. {quote.eta}</Text>
                </View>
                <View style={styles.quotePriceWrap}>
                  <Text style={styles.quotePrice}>Rs{quote.price}</Text>
                  {quote.badge ? <Text style={styles.badge}>{quote.badge}</Text> : null}
                </View>
              </View>
              <View style={styles.chipRow}>
                <Text style={styles.quoteChip}>Kurta Alteration</Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable disabled={!selectedQuote || confirming} style={[styles.primaryWideButton, (!selectedQuote || confirming) && styles.disabledDarkButton]} onPress={confirmTailor}>
          {confirming ? <ActivityIndicator color="#777777" /> : <Text style={[styles.primaryWideButtonText, !selectedQuote && styles.disabledText]}>Confirm This Tailor</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ConfirmOrderScreen({
  quote,
  draft,
  setScreen,
  onPlaceOrder,
  isPlacingOrder
}: {
  quote: Quote;
  draft: RequestDraft;
  setScreen: (screen: Screen) => void;
  onPlaceOrder: (paymentMethod: string) => void;
  isPlacingOrder?: boolean;
}) {
  const [payment, setPayment] = useState("ONLINE");
  const deliveryFee = deliveryFeeForUrgency(draft.urgency);
  const homeMeasurementFee = homeMeasurementFeeForDraft(draft);
  const total = totalForQuote(quote, draft);
  const buttonLabel = payment === "COD" ? `Confirm COD Rs${total}` : payment === "UPI" ? `Pay UPI Rs${total}` : `Pay Online Rs${total}`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Confirm Order" onBack={() => setScreen("quotes")} />
        <View style={styles.whiteCard}>
          <View style={styles.quoteMain}>
            <View style={styles.quoteAvatar}>
              <Text style={styles.avatarText}>{quote.initials}</Text>
            </View>
            <View>
              <Text style={styles.addressTitle}>{quote.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={BRAND_ORANGE} />
                <Text style={styles.quoteMeta}>{quote.rating}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>ORDER SUMMARY</Text>
          <SummaryRow label="Service" value={draft.workType ?? "Kurta Alteration"} />
          <SummaryRow label="Gender" value={draft.gender ?? "Not selected"} />
          <SummaryRow label="Cloth Type" value={draft.clothType ?? "Dress"} />
          <SummaryRow label="Urgency" value={draft.urgency ?? "Normal"} />
          <SummaryRow label="Estimated Time" value={quote.eta} />
          <SummaryRow label="Pickup" value="Today, 2:00 - 4:00 PM" />
          <SummaryRow label="Tailoring" value={`Rs${quote.price}`} />
          <SummaryRow label="Delivery" value={`Rs${deliveryFee}`} />
          <SummaryRow label="Platform fee" value={`Rs${PLATFORM_FEE}`} />
          {draft.sampleProvided ? <SummaryRow label="Sample reference" value={draft.sampleMedia || draft.uploadedSampleMedia ? "Photo added" : "With pickup"} /> : null}
          {homeMeasurementFee ? <SummaryRow label="Tailor measurement visit" value={`Rs${homeMeasurementFee}`} /> : null}
          <View style={styles.summaryDivider} />
          <SummaryRow label="Total" value={`Rs${total}`} strong />
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>PAYMENT METHOD</Text>
          {[
            ["ONLINE", "Online Payment"],
            ["UPI", "UPI Payment"],
            ["COD", "Cash on Delivery"]
          ].map(([key, label]) => (
            <Pressable key={key} style={styles.paymentRow} onPress={() => !isPlacingOrder && setPayment(key)} disabled={isPlacingOrder}>
              <Ionicons name={payment === key ? "radio-button-on" : "radio-button-off"} size={21} color={payment === key ? BRAND_ORANGE : "#111111"} />
              <Text style={styles.paymentText}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.primaryWideButton, isPlacingOrder && styles.buttonDisabled]} onPress={() => onPlaceOrder(payment)} disabled={isPlacingOrder}>
          {isPlacingOrder ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <Text style={styles.primaryWideButtonText}>{buttonLabel}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

function OrdersScreen({
  orders,
  setActiveOrder,
  setScreen
}: {
  orders: CustomerOrder[];
  setActiveOrder: (order: CustomerOrder) => void;
  setScreen: (screen: Screen) => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Orders" />
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={34} color={BRAND_ORANGE} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.helperText}>Your confirmed tailoring orders will appear here.</Text>
            <Pressable style={[styles.primaryWideButton, styles.emptyActionButton]} onPress={() => setScreen("newRequest")}>
              <Text style={styles.primaryWideButtonText}>Start a Request</Text>
            </Pressable>
          </View>
        ) : (
          orders.map((order) => (
            <Pressable
              key={order.id}
              style={styles.orderCard}
              onPress={() => {
                setActiveOrder(order);
                setScreen("orderDetails");
              }}
            >
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.orderService}>{order.draft.workType ?? "Tailoring"} • {order.draft.clothType ?? "Cloth"}</Text>
                </View>
                <Text style={styles.statusPill}>{order.status}</Text>
              </View>
              <View style={styles.orderCardDivider} />
              <View style={styles.rowBetween}>
                <View style={styles.quoteMain}>
                  <View style={styles.smallQuoteAvatar}>
                    <Text style={styles.smallAvatarText}>{order.tailor.initials}</Text>
                  </View>
                  <View>
                    <Text style={styles.addressTitle}>{order.tailor.name}</Text>
                    <Text style={styles.mutedSmall}>Pickup: {order.pickupWindow}</Text>
                  </View>
                </View>
                <Text style={styles.orderPrice}>Rs{order.total}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <BottomTabs active="orders" setScreen={setScreen} />
    </SafeAreaView>
  );
}

function OrderDetailsScreen({ order, setScreen }: { order: CustomerOrder; setScreen: (screen: Screen) => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Order Details" onBack={() => setScreen("orders")} />
        <View style={styles.whiteCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardLabel}>ORDER ID</Text>
              <Text style={styles.orderId}>{order.orderNumber}</Text>
            </View>
            <Text style={styles.statusPill}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>TAILOR</Text>
          <View style={styles.quoteMain}>
            <View style={styles.quoteAvatar}>
              <Text style={styles.avatarText}>{order.tailor.initials}</Text>
            </View>
            <View style={styles.quoteDetails}>
              <Text style={styles.addressTitle}>{order.tailor.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={BRAND_ORANGE} />
                <Text style={styles.quoteMeta}>{order.tailor.rating} ({order.tailor.reviews} reviews)</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>REQUEST SUMMARY</Text>
          <SummaryRow label="Service" value={order.draft.workType ?? "Tailoring"} />
          <SummaryRow label="Gender" value={order.draft.gender ?? "Not selected"} />
          <SummaryRow label="Cloth Type" value={order.draft.clothType ?? "Cloth"} />
          <SummaryRow label="Urgency" value={order.draft.urgency ?? "Normal"} />
          <SummaryRow label="Pickup" value={order.pickupWindow} />
          <SummaryRow label="Payment" value={order.paymentMethod.toUpperCase()} />
          <SummaryRow label="Payment Status" value={order.paymentStatus ?? (order.paymentMethod.toUpperCase() === "COD" ? "PENDING" : "PAID")} />
          <SummaryRow label="Delivery" value={`Rs${order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)}`} />
          <SummaryRow label="Platform fee" value={`Rs${order.platformFee ?? PLATFORM_FEE}`} />
          {order.cancellationFee ? <SummaryRow label="Cancellation fee" value={`Rs${order.cancellationFee}`} /> : null}
          {order.draft.sampleProvided ? <SummaryRow label="Sample reference" value={order.draft.sampleMedia || order.draft.uploadedSampleMedia ? "Photo added" : "With pickup"} /> : null}
          {order.homeMeasurementFee || order.draft.homeMeasurementBooked ? <SummaryRow label="Tailor measurement visit" value={`Rs${order.homeMeasurementFee ?? HOME_MEASUREMENT_FEE}`} /> : null}
          <View style={styles.summaryDivider} />
          <SummaryRow label="Total" value={`Rs${order.total}`} strong />
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>PICKUP ADDRESS</Text>
          <Text style={styles.addressTitle}>{order.draft.pickup}</Text>
        </View>

        <Pressable style={styles.primaryWideButton} onPress={() => setScreen("trackOrder")}>
          <Text style={styles.primaryWideButtonText}>Track Order</Text>
          <Ionicons name="chevron-forward" size={18} color="#111111" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TrackOrderScreen({ order, setScreen }: { order: CustomerOrder; setScreen: (screen: Screen) => void }) {
  const steps = [
    ["Order Placed", "10:30 AM", true],
    ["Tailor Assigned", "10:45 AM", true],
    ["Picked Up", "11:20 AM", true],
    ["In Progress", "12:00 PM", true],
    ["Ready for Delivery", "", false],
    ["Out for Delivery", "", false],
    ["Delivered", "", false]
  ] as const;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Track Order" onBack={() => setScreen("orderDetails")} />
        <View style={styles.orderIdCard}>
          <View>
            <Text style={styles.mutedSmall}>Order ID</Text>
            <Text style={styles.orderId}>{order.orderNumber}</Text>
          </View>
          <Text style={styles.statusPill}>{order.status}</Text>
        </View>

        <View style={styles.timeline}>
          {steps.map(([label, time, done], index) => (
            <View key={label} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View style={[styles.timelineDot, done ? styles.doneDot : styles.pendingDot]}>
                  <Ionicons name={done ? "checkmark" : "ellipse"} size={done ? 14 : 7} color={done ? "#111111" : "#ffffff"} />
                </View>
                {index < steps.length - 1 ? <View style={[styles.timelineLine, done ? styles.doneLine : styles.pendingLine]} /> : null}
              </View>
              <View style={styles.timelineTextWrap}>
                <Text style={[styles.timelineTitle, !done && styles.pendingTimelineTitle]}>{label}</Text>
                {time ? <Text style={styles.timelineTime}>{time}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>YOUR TAILOR</Text>
          <Text style={styles.addressTitle}>{order.tailor.name}</Text>
          <Text style={styles.mutedSmall}>Estimated completion: {order.tailor.eta}.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SearchScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const serviceResults = services.filter((service) => service.title.toLowerCase().includes(normalizedQuery));
  const tailorResults = quotes.filter((tailor) => tailor.name.toLowerCase().includes(normalizedQuery));
  const hasQuery = Boolean(normalizedQuery);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <Header title="Search" />
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={21} color="#6a788d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stitching, blouse, repairs..."
            placeholderTextColor="#8fa0b8"
            value={query}
            onChangeText={setQuery}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9aa6b6" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.quickRequestCard}>
          <View style={styles.quickRequestTextBlock}>
            <Text style={styles.quickRequestTitle}>Need custom tailoring?</Text>
            <Text style={styles.quickRequestCopy}>Upload photos and get quotes from nearby tailors.</Text>
          </View>
          <Pressable style={styles.quickRequestButton} onPress={() => setScreen("newRequest")}>
            <Ionicons name="add" size={18} color="#111111" />
          </Pressable>
        </View>

        <Text style={styles.listTitle}>Popular Services</Text>
        <View style={styles.searchChips}>
          {services.map((service) => (
            <Pressable key={service.title} style={styles.searchChip} onPress={() => setQuery(service.title)}>
              <Ionicons name={service.icon} size={16} color={BRAND_ORANGE} />
              <Text style={styles.searchChipText}>{service.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>{hasQuery ? "Services" : "Recommended"}</Text>
          <Text style={styles.mutedSmall}>{hasQuery ? serviceResults.length : services.length} found</Text>
        </View>

        {(hasQuery ? serviceResults : services).map((service) => (
          <Pressable key={service.title} style={styles.searchResultCard} onPress={() => setScreen("newRequest")}>
            <View style={styles.searchResultIcon}>
              <Ionicons name={service.icon} size={24} color={BRAND_ORANGE} />
            </View>
            <View style={styles.searchResultBody}>
              <Text style={styles.addressTitle}>{service.title}</Text>
              <Text style={styles.mutedSmall}>{service.count} available near you</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7890" />
          </Pressable>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Tailors</Text>
          <Text style={styles.mutedSmall}>{hasQuery ? tailorResults.length : quotes.length} found</Text>
        </View>
        {(hasQuery ? tailorResults : quotes).map((tailor) => (
          <Pressable key={tailor.id} style={styles.searchResultCard} onPress={() => setScreen("newRequest")}>
            <View style={styles.smallQuoteAvatar}>
              <Text style={styles.smallAvatarText}>{tailor.initials}</Text>
            </View>
            <View style={styles.searchResultBody}>
              <Text style={styles.addressTitle}>{tailor.name}</Text>
              <Text style={styles.mutedSmall}>{tailor.rating} rating - Est. {tailor.eta}</Text>
            </View>
            <Text style={styles.orderPrice}>Rs{tailor.price}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <BottomTabs active="search" setScreen={setScreen} />
    </SafeAreaView>
  );
}

function OnboardingScreen({ profile, setProfile }: { profile: ProfileData; setProfile: (profile: ProfileData) => void }) {
  const [name, setName] = useState(profile.name.startsWith("Customer ") ? "" : profile.name);
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");

  function save() {
    if (name.trim().length < 2) {
      Alert.alert("Name required", "Enter your name to continue.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      Alert.alert("Date of birth required", "Enter date of birth in YYYY-MM-DD format.");
      return;
    }
    setProfile({ ...profile, name: name.trim(), dateOfBirth: dateOfBirth.trim(), hasCompletedOnboarding: true });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.onboardingContent}>
          <DarjiLogoMark />
          <Text style={styles.onboardingTitle}>Complete your profile</Text>
          <Text style={styles.helperText}>This helps us personalize orders, invoices, tailor assignment, and future delivery updates.</Text>
          <Text style={styles.formLabel}>Full Name</Text>
          <TextInput style={styles.profileInput} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#98a4b6" />
          <Text style={styles.formLabel}>Date of Birth</Text>
          <DatePickerField value={dateOfBirth} onChange={setDateOfBirth} />
          <Pressable style={styles.primaryWideButton} onPress={save}>
            <Text style={styles.primaryWideButtonText}>Continue</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileScreen({
  setScreen,
  orders,
  profile,
  addresses,
  onDeleteAccount
}: {
  setScreen: (screen: Screen) => void;
  orders: CustomerOrder[];
  profile: ProfileData;
  addresses: SavedAddress[];
  onDeleteAccount: () => void;
}) {
  const { user, signOut } = useAppStore();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Profile" />
        <View style={styles.profileHero}>
          {profile.avatarUri ? <Image source={{ uri: profile.avatarUri }} style={styles.profileAvatarImage} /> : <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initialsFor(profile.name)}</Text>
          </View>}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profilePhone}>+91 {user?.phone ?? profile.phone}</Text>
          </View>
          <Pressable style={styles.profileEditButton} onPress={() => setScreen("editProfile")}>
            <Ionicons name="create-outline" size={18} color={BRAND_ORANGE} />
          </Pressable>
          <Pressable style={styles.profileEditButton} onPress={() => setScreen("settings")}>
            <Ionicons name="settings-outline" size={18} color={BRAND_ORANGE} />
          </Pressable>
        </View>

        <View style={styles.profileStatsRow}>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>{orders.length}</Text>
            <Text style={styles.profileStatLabel}>Orders</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>{addresses.length}</Text>
            <Text style={styles.profileStatLabel}>Addresses</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>₹0</Text>
            <Text style={styles.profileStatLabel}>Wallet</Text>
          </View>
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>ACCOUNT</Text>
          <ProfileRow icon="location-outline" label="Saved Addresses" value={`${addresses.length} saved`} onPress={() => setScreen("savedAddresses")} />
          <ProfileRow icon="wallet-outline" label="Wallet & Payments" value="UPI enabled" onPress={() => setScreen("walletPayments")} />
          <ProfileRow icon="ticket-outline" label="Coupons" value="DARZI100" onPress={() => setScreen("coupons")} />
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>SUPPORT</Text>
          <ProfileRow icon="help-circle-outline" label="Help Center" value="Chat & FAQs" onPress={() => setScreen("helpCenter")} />
          <ProfileRow icon="call-outline" label="Contact Support" value="1800-000-000" onPress={() => setScreen("contactSupport")} />
          <ProfileRow icon="star-outline" label="Rate Darji" value="Share feedback" onPress={() => setScreen("rateApp")} />
        </View>

        <Pressable style={styles.secondaryWideButton} onPress={() => setScreen("orders")}>
          <Ionicons name="cube-outline" size={18} color={BRAND_DEEP} />
          <Text style={styles.secondaryWideButtonText}>View My Orders</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Pressable
          style={styles.deleteAccountButton}
          onPress={onDeleteAccount}
        >
          <Ionicons name="trash-outline" size={18} color="#c24141" />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.profileRow} onPress={onPress}>
      <View style={styles.profileRowIcon}>
        <Ionicons name={icon} size={18} color={BRAND_ORANGE} />
      </View>
      <View style={styles.profileRowText}>
        <Text style={styles.addressTitle}>{label}</Text>
        <Text style={styles.mutedSmall}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6b7890" />
    </Pressable>
  );
}

function EditProfileScreen({
  profile,
  setProfile,
  setScreen
}: {
  profile: ProfileData;
  setProfile: (profile: ProfileData) => void;
  setScreen: (screen: Screen) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri);

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to choose a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.canceled) setAvatarUri(result.assets[0]?.uri);
  }

  function save() {
    if (name.trim().length < 2) {
      Alert.alert("Name required", "Enter your full name.");
      return;
    }
    setProfile({ ...profile, name: name.trim(), dateOfBirth: dateOfBirth.trim(), avatarUri, hasCompletedOnboarding: true });
    setScreen("profile");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Edit Profile" onBack={() => setScreen("profile")} />
        <View style={styles.editAvatarWrap}>
          <Pressable onPress={pickAvatar}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.editAvatarImage} /> : <View style={styles.editAvatar}>
              <Text style={styles.profileAvatarText}>{initialsFor(name)}</Text>
            </View>}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#111111" />
            </View>
          </Pressable>
          <Text style={styles.mutedSmall}>Tap photo to change</Text>
        </View>
        <Text style={styles.formLabel}>Full Name</Text>
        <TextInput style={styles.profileInput} value={name} onChangeText={setName} placeholder="Enter full name" placeholderTextColor="#98a4b6" />
        <Text style={styles.formLabel}>Date of Birth</Text>
        <DatePickerField value={dateOfBirth} onChange={setDateOfBirth} />
        <Text style={styles.formLabel}>Phone Number</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.addressTitle}>+91 {profile.phone}</Text>
          <Text style={styles.mutedSmall}>Phone number is used for OTP login</Text>
        </View>
        <Pressable style={styles.primaryWideButton} onPress={save}>
          <Text style={styles.primaryWideButtonText}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsScreen({
  settings,
  setSettings,
  setScreen
}: {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  setScreen: (screen: Screen) => void;
}) {
  function toggle(key: keyof AppSettings) {
    setSettings({ ...settings, [key]: !settings[key] });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Settings" onBack={() => setScreen("profile")} />
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>NOTIFICATIONS</Text>
          <SettingRow icon="notifications-outline" label="Push notifications" value="Order alerts and offers" enabled={settings.notifications} onPress={() => toggle("notifications")} />
          <SettingRow icon="cube-outline" label="Order updates" value="Pickup, quote and delivery alerts" enabled={settings.orderUpdates} onPress={() => toggle("orderUpdates")} />
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>APPEARANCE</Text>
          <SettingRow icon="moon-outline" label="Dark appearance" value="Use dark themed surfaces" enabled={settings.darkMode} onPress={() => toggle("darkMode")} />
          <SettingRow icon="albums-outline" label="Compact cards" value="Show denser service and order cards" enabled={settings.compactCards} onPress={() => toggle("compactCards")} />
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>PRIVACY & DATA</Text>
          <SettingRow icon="navigate-outline" label="Location access" value="Use GPS for pickup address" enabled={settings.locationAccess} onPress={() => toggle("locationAccess")} />
          <SettingRow icon="image-outline" label="Save uploaded media" value="Keep request photos in your order history" enabled={settings.saveMedia} onPress={() => toggle("saveMedia")} />
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>APP</Text>
          <ProfileRow icon="shield-checkmark-outline" label="Privacy Policy" value="How your data is handled" onPress={() => setScreen("privacyPolicy")} />
          <ProfileRow icon="document-text-outline" label="Terms of Service" value="App usage terms" onPress={() => setScreen("termsService")} />
          <ProfileRow icon="information-circle-outline" label="App Version" value="0.1.0" onPress={() => setScreen("appInfo")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  enabled,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.profileRow} onPress={onPress}>
      <View style={styles.profileRowIcon}>
        <Ionicons name={icon} size={18} color={BRAND_ORANGE} />
      </View>
      <View style={styles.profileRowText}>
        <Text style={styles.addressTitle}>{label}</Text>
        <Text style={styles.mutedSmall}>{value}</Text>
      </View>
      <View style={[styles.toggleTrack, enabled && styles.toggleTrackOn]}>
        <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
      </View>
    </Pressable>
  );
}

function SavedAddressesScreen({
  addresses,
  setAddresses,
  setScreen
}: {
  addresses: SavedAddress[];
  setAddresses: (addresses: SavedAddress[]) => void;
  setScreen: (screen: Screen) => void;
}) {
  function deleteAddress(addressId: string) {
    if (addresses.length <= 1) {
      Alert.alert("Address required", "Keep at least one pickup address saved.");
      return;
    }
    const next = addresses.filter((item) => item.id !== addressId);
    if (!next.some((item) => item.isDefault)) next[0] = { ...next[0], isDefault: true };
    setAddresses(next);
  }

  return (
    <ProfileSubPage title="Saved Addresses" setScreen={setScreen}>
      {addresses.map((item) => (
        <View key={item.id} style={styles.infoCard}>
          <View style={styles.rowBetween}>
            <View style={styles.quoteMain}>
              <View style={styles.profileRowIcon}>
                <Ionicons name="location-outline" size={18} color={BRAND_ORANGE} />
              </View>
              <View style={styles.profileRowText}>
                <Text style={styles.addressTitle}>{item.label}</Text>
                <Text style={styles.infoCopy}>{item.address}</Text>
              </View>
            </View>
            {item.isDefault ? <Text style={styles.statusPill}>Default</Text> : null}
          </View>
          <Pressable style={styles.deleteAddressButton} onPress={() => deleteAddress(item.id)}>
            <Ionicons name="trash-outline" size={16} color="#c24141" />
            <Text style={styles.deleteAddressText}>Delete address</Text>
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.primaryWideButton} onPress={() => setScreen("addAddress")}>
        <Ionicons name="add" size={18} color="#111111" />
        <Text style={styles.primaryWideButtonText}>Add New Address</Text>
      </Pressable>
    </ProfileSubPage>
  );
}

function AddAddressScreen({
  addresses,
  setAddresses,
  setScreen
}: {
  addresses: SavedAddress[];
  setAddresses: (addresses: SavedAddress[]) => void;
  setScreen: (screen: Screen) => void;
}) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat?: number; lng?: number }>({});
  const [locating, setLocating] = useState(false);

  async function useCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow location access to save your current address.");
      return;
    }
    setLocating(true);
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(current.coords);
      const resolved = place
        ? [place.name, place.street, place.district, place.city, place.region, place.postalCode].filter(Boolean).join(", ")
        : `Lat ${current.coords.latitude.toFixed(5)}, Lng ${current.coords.longitude.toFixed(5)}`;
      setAddress(resolved);
      setLocation({ lat: current.coords.latitude, lng: current.coords.longitude });
    } catch {
      Alert.alert("Location failed", "Could not read your current location. You can enter the address manually.");
    } finally {
      setLocating(false);
    }
  }

  function saveAddress() {
    if (label.trim().length < 2 || address.trim().length < 8) {
      Alert.alert("Address required", "Enter a label and complete pickup address.");
      return;
    }
    const newAddress: SavedAddress = {
      id: `${Date.now()}`,
      label: label.trim(),
      address: address.trim(),
      isDefault: addresses.length === 0,
      lat: location.lat,
      lng: location.lng
    };
    setAddresses([...addresses, newAddress]);
    setScreen("savedAddresses");
  }

  return (
    <ProfileSubPage title="Add Address" setScreen={setScreen} backScreen="savedAddresses">
      <Text style={styles.formLabel}>Address Label</Text>
      <TextInput style={styles.profileInput} value={label} onChangeText={setLabel} placeholder="Home, Work, Studio..." placeholderTextColor="#98a4b6" />
      <Text style={styles.formLabel}>Full Address</Text>
      <TextInput
        style={styles.descriptionInput}
        value={address}
        onChangeText={setAddress}
        multiline
        placeholder="House / flat number, street, city, pincode"
        placeholderTextColor="#98a4b6"
      />
      <View style={styles.addressActions}>
        <Pressable style={styles.addressActionButton} onPress={useCurrentLocation} disabled={locating}>
          {locating ? <ActivityIndicator color={BRAND_ORANGE} /> : <Ionicons name="navigate-outline" size={17} color={BRAND_ORANGE} />}
          <Text style={styles.addPhotoText}>{locating ? "Finding..." : "Use Current Location"}</Text>
        </Pressable>
      </View>
      <Pressable style={styles.primaryWideButton} onPress={saveAddress}>
        <Text style={styles.primaryWideButtonText}>Save Address</Text>
      </Pressable>
    </ProfileSubPage>
  );
}

function WalletPaymentsScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <ProfileSubPage title="Wallet & Payments" setScreen={setScreen}>
      <View style={styles.walletCard}>
        <Text style={styles.cardLabel}>DARJI WALLET</Text>
        <Text style={styles.walletBalance}>Rs0</Text>
        <Text style={styles.infoCopy}>Refunds and rewards will appear here.</Text>
      </View>
      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>PAYMENT METHODS</Text>
        <ProfileRow icon="phone-portrait-outline" label="UPI" value="Primary payment method" />
        <ProfileRow icon="card-outline" label="Credit / Debit Card" value="No saved cards" />
        <ProfileRow icon="cash-outline" label="Cash on Delivery" value="Available for eligible orders" />
      </View>
      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>RECENT TRANSACTIONS</Text>
        <InfoRow label="No transactions yet" value="Your payment activity will show here." />
      </View>
    </ProfileSubPage>
  );
}

function CouponsScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const coupons = [
    { code: "DARZI100", text: "Rs100 off on your first tailoring order", active: true },
    { code: "FAST50", text: "Rs50 off express pickup", active: true },
    { code: "WELCOME", text: "Expired welcome offer", active: false }
  ];
  return (
    <ProfileSubPage title="Coupons" setScreen={setScreen}>
      {coupons.map((coupon) => (
        <View key={coupon.code} style={[styles.couponCard, !coupon.active && styles.inactiveCoupon]}>
          <View>
            <Text style={styles.couponCode}>{coupon.code}</Text>
            <Text style={styles.infoCopy}>{coupon.text}</Text>
          </View>
          <Text style={[styles.statusPill, !coupon.active && styles.inactivePill]}>{coupon.active ? "Apply" : "Expired"}</Text>
        </View>
      ))}
    </ProfileSubPage>
  );
}

function HelpCenterScreen({ setScreen, onOpenCancellationPolicy }: { setScreen: (screen: Screen) => void; onOpenCancellationPolicy: () => void }) {
  const topics = [
    ["How pickup works", "Schedule a slot and our partner collects your garment."],
    ["How quotes work", "Tailors respond after reviewing your uploaded photos."],
    ["Payments and refunds", "UPI, cards and cash on delivery are supported."],
    ["Order cancellation", "Read refund rules and cancellation charges."]
  ];
  return (
    <ProfileSubPage title="Help Center" setScreen={setScreen}>
      {topics.map(([title, text]) => (
        <Pressable key={title} style={styles.infoCard} onPress={() => title === "Order cancellation" ? onOpenCancellationPolicy() : undefined}>
          <Text style={styles.addressTitle}>{title}</Text>
          <Text style={styles.infoCopy}>{text}</Text>
          {title === "Order cancellation" ? <Text style={styles.orangeSmall}>View policy</Text> : null}
        </Pressable>
      ))}
    </ProfileSubPage>
  );
}

function CancellationPolicyScreen({
  order,
  setScreen,
  onConfirmCancel,
  isCancelling
}: {
  order?: CustomerOrder;
  setScreen: (screen: Screen) => void;
  onConfirmCancel?: (order: CustomerOrder) => void;
  isCancelling?: boolean;
}) {
  const canConfirm = Boolean(order && canCancelOrder(order.status));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <Header title="Cancellation Policy" onBack={() => setScreen(order ? "orderDetails" : "helpCenter")} />
        <View style={styles.policyHero}>
          <Ionicons name="document-text-outline" size={26} color={BRAND_ORANGE} />
          <View style={styles.policyHeroText}>
            <Text style={styles.addressTitle}>Darzi Cancellation Policy</Text>
            <Text style={styles.infoCopy}>Cancellation is free before pickup. After pickup, delivery charges and a cancellation fee apply until the package reaches the tailor.</Text>
          </View>
        </View>
        {order ? (
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>SELECTED ORDER</Text>
            <SummaryRow label="Order" value={order.orderNumber} />
            <SummaryRow label="Status" value={order.status} />
            <SummaryRow label="Amount" value={`Rs${order.total}`} />
          </View>
        ) : null}
        {cancellationPolicySections.map((section) => (
          <View key={section.title} style={styles.policyCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.policyTitle}>{section.title}</Text>
              <Text style={[styles.statusPill, section.cancellation === "Allowed" ? styles.policyAllowed : styles.policyBlocked]}>{section.cancellation}</Text>
            </View>
            <SummaryRow label="Order Status" value={section.status} />
            <SummaryRow label="Refund" value={section.refund} />
            <SummaryRow label="Charges" value={section.charges} />
            <Text style={styles.infoCopy}>{section.reason}</Text>
          </View>
        ))}
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>SPECIAL CASES</Text>
          {cancellationSpecialCases.map(([title, copy]) => (
            <View key={title} style={styles.policyCaseRow}>
              <Ionicons name="information-circle-outline" size={18} color={BRAND_ORANGE} />
              <View style={styles.policyCaseText}>
                <Text style={styles.addressTitle}>{title}</Text>
                <Text style={styles.infoCopy}>{copy}</Text>
              </View>
            </View>
          ))}
        </View>
        {order ? (
          <>
            <Pressable style={styles.secondaryWideButton} onPress={() => setScreen("orderDetails")}>
              <Text style={styles.secondaryWideButtonText}>Keep Order</Text>
            </Pressable>
            <Pressable
              style={[styles.cancelOrderButton, (!canConfirm || isCancelling) && styles.buttonDisabled]}
              disabled={!canConfirm || isCancelling}
              onPress={() => {
                if (!order || !onConfirmCancel) return;
                onConfirmCancel(order);
              }}
            >
              {isCancelling ? <ActivityIndicator color="#c24141" /> : <Ionicons name="close-circle-outline" size={18} color="#c24141" />}
              <Text style={styles.cancelOrderText}>{isCancelling ? "Cancelling Order..." : canConfirm ? "I Understand, Cancel Order" : "Cancellation Not Allowed"}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactSupportScreen({ onSave, setScreen }: { onSave: (message: string) => void; setScreen: (screen: Screen) => void }) {
  const [message, setMessage] = useState("");

  function submit() {
    if (message.trim().length < 10) {
      Alert.alert("Describe issue", "Write at least 10 characters so support can understand the issue.");
      return;
    }
    onSave(message.trim());
    Alert.alert("Saved", "Your issue has been saved for support.");
    setScreen("profile");
  }

  return (
    <ProfileSubPage title="Contact Support" setScreen={setScreen}>
      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>SUPPORT CHANNELS</Text>
        <ProfileRow icon="call-outline" label="Phone" value="1800-000-000" />
        <ProfileRow icon="mail-outline" label="Email" value="support@darji.local" />
        <ProfileRow icon="chatbubble-outline" label="Chat" value="Usually replies in 5 minutes" />
      </View>
      <Text style={styles.formLabel}>Describe your issue</Text>
      <TextInput style={styles.descriptionInput} value={message} onChangeText={setMessage} multiline placeholder="Tell us what happened..." placeholderTextColor="#98a4b6" />
      <Pressable style={styles.primaryWideButton} onPress={submit}>
        <Text style={styles.primaryWideButtonText}>Submit Ticket</Text>
      </Pressable>
    </ProfileSubPage>
  );
}

function RateAppScreen({ onSave, setScreen }: { onSave: (rating: number, review: string) => void; setScreen: (screen: Screen) => void }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  function submit() {
    onSave(rating, review.trim());
    Alert.alert("Saved", "Thanks for rating Darji.");
    setScreen("profile");
  }

  return (
    <ProfileSubPage title="Rate Darji" setScreen={setScreen}>
      <View style={styles.ratingCard}>
        <Text style={styles.profileName}>How was your experience?</Text>
        <View style={styles.starPicker}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Pressable key={item} onPress={() => setRating(item)}>
              <Ionicons name={item <= rating ? "star" : "star-outline"} size={34} color={BRAND_ORANGE} />
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.descriptionInput} value={review} onChangeText={setReview} multiline placeholder="Share feedback..." placeholderTextColor="#98a4b6" />
      </View>
      <Pressable style={styles.primaryWideButton} onPress={submit}>
        <Text style={styles.primaryWideButtonText}>Submit Rating</Text>
      </Pressable>
    </ProfileSubPage>
  );
}

function PolicyScreen({ title, setScreen }: { title: string; setScreen: (screen: Screen) => void }) {
  const isPrivacy = title === "Privacy Policy";
  return (
    <ProfileSubPage title={title} setScreen={setScreen}>
      <View style={styles.whiteCard}>
        <Text style={styles.cardLabel}>{isPrivacy ? "PRIVACY & DATA" : "TERMS"}</Text>
        <Text style={styles.infoCopy}>
          {isPrivacy
            ? "Darji uses your phone number for login, uploaded media to prepare tailoring quotes, and location/address details for pickup and delivery. You can edit profile details and control app permissions from Settings."
            : "By using Darji, you agree to provide accurate request details, confirm pickup addresses, and pay for confirmed orders. Tailor quotes and delivery timelines may vary based on garment condition and service availability."}
        </Text>
      </View>
    </ProfileSubPage>
  );
}

function AppInfoScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <ProfileSubPage title="App Info" setScreen={setScreen}>
      <View style={styles.whiteCard}>
        <InfoRow label="App" value="Darji Customer" />
        <InfoRow label="Version" value="0.1.0" />
        <InfoRow label="Build" value="Development" />
        <InfoRow label="API" value="Connected to local backend" />
      </View>
    </ProfileSubPage>
  );
}

function ProfileSubPage({ title, setScreen, children, backScreen = "profile" }: { title: string; setScreen: (screen: Screen) => void; children: React.ReactNode; backScreen?: Screen }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title={title} onBack={() => setScreen(backScreen)} />
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: CustomerOrder["status"] }) {
  return <Text style={[styles.statusPill, statusStyle(status)]}>{status}</Text>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function invoiceHtml(order: CustomerOrder) {
  const generatedAt = formatInvoiceDate(order.invoiceGeneratedAt ? new Date(order.invoiceGeneratedAt) : new Date());
  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #0b2241; padding: 32px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #f6a313; padding-bottom:18px;">
          <div>
            <h1 style="margin:0; color:#f6a313; font-size:34px;">Darji</h1>
            <p style="margin:6px 0 0; color:#65748a;">On-demand tailoring at your doorstep</p>
          </div>
          <div style="text-align:right;">
            <h2 style="margin:0;">Invoice</h2>
            <p style="margin:6px 0;">${escapeHtml(order.orderNumber)}</p>
            <p style="margin:6px 0;">${generatedAt}</p>
          </div>
        </div>
        <h3 style="margin-top:28px;">Order Summary</h3>
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Service</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">${escapeHtml(order.draft.workType ?? "Tailoring")}</td></tr>
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Cloth Type</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">${escapeHtml(order.draft.clothType ?? "Cloth")}</td></tr>
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Tailor</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">${escapeHtml(order.tailor.name)}</td></tr>
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Pickup</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">${escapeHtml(order.pickupWindow)}</td></tr>
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Address</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">${escapeHtml(order.draft.pickup)}</td></tr>
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Delivery</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">Rs${order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)}</td></tr>
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Platform fee</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">Rs${order.platformFee ?? PLATFORM_FEE}</td></tr>
          ${
            order.homeMeasurementFee || order.draft.homeMeasurementBooked
              ? `<tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Tailor measurement visit</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">Rs${order.homeMeasurementFee ?? HOME_MEASUREMENT_FEE}</td></tr>`
              : ""
          }
          <tr><td style="padding:12px; font-weight:bold;">Total</td><td style="padding:12px; text-align:right; color:#f6a313; font-size:22px; font-weight:bold;">Rs${order.total}</td></tr>
        </table>
        <p style="margin-top:28px; color:#65748a;">Thank you for choosing Darji. This invoice was automatically generated after delivery.</p>
      </body>
    </html>
  `;
}

async function downloadInvoice(order: CustomerOrder) {
  try {
    const { uri } = await Print.printToFileAsync({ html: invoiceHtml(order), base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Darji Invoice ${order.orderNumber}` });
    } else {
      Alert.alert("Invoice generated", `Invoice PDF created at ${uri}`);
    }
  } catch (error) {
    Alert.alert("Invoice failed", error instanceof Error ? error.message : "Could not generate invoice.");
  }
}

function RatingButtons({ value, onRate }: { value?: number; onRate: (rating: number) => void }) {
  return (
    <View style={styles.inlineStars}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Pressable key={item} onPress={() => onRate(item)}>
          <Ionicons name={item <= (value ?? 0) ? "star" : "star-outline"} size={23} color={BRAND_ORANGE} />
        </Pressable>
      ))}
    </View>
  );
}

function CouponsScreenV2({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [expanded, setExpanded] = useState<string | undefined>();
  const coupons = [
    { code: "DARZI100", text: "Rs100 off on your first tailoring order", active: true, details: "Valid on orders above Rs499. Can be used once per customer. Not valid with other offers." },
    { code: "FAST50", text: "Rs50 off express pickup", active: true, details: "Valid on express pickup orders. Discount applies to pickup/service fee only." },
    { code: "WELCOME", text: "Expired welcome offer", active: false, details: "This welcome coupon has expired and cannot be applied to new orders." }
  ];

  async function copyCoupon(code: string) {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied", `${code} copied to clipboard.`);
  }

  return (
    <ProfileSubPage title="Coupons" setScreen={setScreen}>
      {coupons.map((coupon) => {
        const open = expanded === coupon.code;
        return (
          <Pressable key={coupon.code} style={[styles.couponCardV2, !coupon.active && styles.inactiveCoupon]} onPress={() => setExpanded(open ? undefined : coupon.code)}>
            <View style={styles.couponTopRow}>
              <View style={styles.couponTextBlock}>
                <Text style={styles.couponCode}>{coupon.code}</Text>
                <Text style={styles.infoCopy}>{coupon.text}</Text>
              </View>
              <View style={styles.couponActionRow}>
                {coupon.active ? (
                  <Pressable
                    style={styles.couponCopyButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      copyCoupon(coupon.code);
                    }}
                  >
                    <Ionicons name="copy-outline" size={14} color={BRAND_ORANGE} />
                    <Text style={styles.couponCopyText}>Copy</Text>
                  </Pressable>
                ) : null}
                <Text style={[styles.couponActionPill, !coupon.active && styles.inactivePill]}>{coupon.active ? "Apply" : "Expired"}</Text>
              </View>
            </View>
            {open ? (
              <View style={styles.couponDetails}>
                <Text style={styles.cardLabel}>DETAILS</Text>
                <Text style={styles.infoCopy}>{coupon.details}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ProfileSubPage>
  );
}

function OrdersScreenV2({
  orders,
  setActiveOrder,
  setScreen
}: {
  orders: CustomerOrder[];
  setActiveOrder: (order: CustomerOrder) => void;
  setScreen: (screen: Screen) => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Orders" />
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={34} color={BRAND_ORANGE} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.helperText}>Your confirmed tailoring orders will appear here.</Text>
            <Pressable style={[styles.primaryWideButton, styles.emptyActionButton]} onPress={() => setScreen("newRequest")}>
              <Text style={styles.primaryWideButtonText}>Start a Request</Text>
            </Pressable>
          </View>
        ) : (
          orders.map((order) => (
            <Pressable
              key={order.id}
              style={styles.orderCardV2}
              onPress={() => {
                setActiveOrder(order);
                setScreen("orderDetails");
              }}
            >
              <View style={styles.orderTopRow}>
                <View style={styles.orderTitleBlock}>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.orderService} numberOfLines={2}>
                    {order.draft.workType ?? "Tailoring"} - {order.draft.clothType ?? "Cloth"}
                  </Text>
                </View>
                <StatusPill status={order.status} />
              </View>
              <View style={styles.orderCardDivider} />
              <View style={styles.orderBottomRow}>
                <View style={styles.orderTailorBlock}>
                  <View style={styles.smallQuoteAvatar}>
                    <Text style={styles.smallAvatarText}>{order.tailor.initials}</Text>
                  </View>
                  <View style={styles.orderTailorText}>
                    <Text style={styles.addressTitle} numberOfLines={1}>{order.tailor.name}</Text>
                    <Text style={styles.mutedSmall} numberOfLines={2}>Pickup: {order.pickupWindow}</Text>
                  </View>
                </View>
                <Text style={styles.orderPrice}>Rs{order.total}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <BottomTabs active="orders" setScreen={setScreen} />
    </SafeAreaView>
  );
}

function OrderDetailsScreenV2({
  order,
  onUpdateOrder,
  onRequestCancel,
  setScreen
}: {
  order: CustomerOrder;
  onUpdateOrder: (order: CustomerOrder) => void;
  onRequestCancel: (order: CustomerOrder) => void;
  setScreen: (screen: Screen) => void;
}) {
  const token = useAppStore((state) => state.token);
  const [savingRating, setSavingRating] = useState<"tailor" | "delivery" | undefined>();

  async function submitRating(kind: "tailor" | "delivery") {
    const rating = kind === "tailor" ? order.tailorRating : order.deliveryRating;
    const review = kind === "tailor" ? order.tailorReview : order.deliveryReview;
    if (!rating) {
      Alert.alert("Select rating", `Choose a star rating for the ${kind === "tailor" ? "tailor" : "delivery partner"} first.`);
      return;
    }

    try {
      setSavingRating(kind);
      if (token) {
        await api(
          "/reviews",
          {
            method: "POST",
            body: JSON.stringify({
              orderId: order.backendOrderId ?? order.id,
              rating,
              comment: `${kind === "tailor" ? "Tailor" : "Delivery"}: ${review?.trim() || "No written review"}`
            })
          },
          token
        ).catch(() => undefined);
      }
      onUpdateOrder({
        ...order,
        ...(kind === "tailor" ? { tailorRatingSubmittedAt: new Date().toISOString() } : { deliveryRatingSubmittedAt: new Date().toISOString() })
      });
      Alert.alert("Rating submitted", `Thanks for rating the ${kind === "tailor" ? "tailor" : "delivery partner"}.`);
    } finally {
      setSavingRating(undefined);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Order Details" onBack={() => setScreen("orders")} />
        <View style={styles.whiteCard}>
          <View style={styles.rowBetween}>
            <View style={styles.orderTitleBlock}>
              <Text style={styles.cardLabel}>ORDER ID</Text>
              <Text style={styles.orderId}>{order.orderNumber}</Text>
            </View>
            <StatusPill status={order.status} />
          </View>
        </View>
        {order.status === "Cancelled" ? (
          <View style={styles.cancelledNoticeCard}>
            <Ionicons name="close-circle-outline" size={22} color="#b91c1c" />
            <View style={styles.noticeTextBlock}>
              <Text style={styles.cancelledNoticeTitle}>This order has been cancelled</Text>
              <Text style={styles.cancelledNoticeCopy}>
                {order.cancellationFee ? `Cancellation fee: Rs${order.cancellationFee}.` : "No cancellation charge applies before pickup."}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>TAILOR</Text>
          <View style={styles.orderTailorBlock}>
            <View style={styles.quoteAvatar}>
              <Text style={styles.avatarText}>{order.tailor.initials}</Text>
            </View>
            <View style={styles.orderTailorText}>
              <Text style={styles.addressTitle}>{order.tailor.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={BRAND_ORANGE} />
                <Text style={styles.quoteMeta}>{order.tailor.rating} ({order.tailor.reviews} reviews)</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>REQUEST SUMMARY</Text>
          <SummaryRow label="Service" value={order.draft.workType ?? "Tailoring"} />
          <SummaryRow label="Gender" value={order.draft.gender ?? "Not selected"} />
          <SummaryRow label="Cloth Type" value={order.draft.clothType ?? "Cloth"} />
          <SummaryRow label="Urgency" value={order.draft.urgency ?? "Normal"} />
          <SummaryRow label="Pickup" value={order.pickupWindow} />
          <SummaryRow label="Payment" value={order.paymentMethod.toUpperCase()} />
          <SummaryRow label="Delivery" value={`Rs${order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)}`} />
          <SummaryRow label="Platform fee" value={`Rs${order.platformFee ?? PLATFORM_FEE}`} />
          {order.draft.sampleProvided ? <SummaryRow label="Sample reference" value={order.draft.sampleMedia || order.draft.uploadedSampleMedia ? "Photo added" : "With pickup"} /> : null}
          {order.homeMeasurementFee || order.draft.homeMeasurementBooked ? <SummaryRow label="Tailor measurement visit" value={`Rs${order.homeMeasurementFee ?? HOME_MEASUREMENT_FEE}`} /> : null}
          <View style={styles.summaryDivider} />
          <SummaryRow label="Total" value={`Rs${order.total}`} strong />
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>PICKUP ADDRESS</Text>
          <Text style={styles.addressTitle}>{order.draft.pickup}</Text>
        </View>
        {order.status === "Delivered" ? (
          <View style={styles.whiteCard}>
            <Text style={styles.cardLabel}>AFTER DELIVERY</Text>
            <View style={styles.ratingActionRow}>
              <View style={styles.ratingActionText}>
                <View style={styles.feedbackTitleRow}>
                  <Ionicons name="star" size={17} color={BRAND_ORANGE} />
                  <Text style={styles.addressTitle}>Rate your tailor</Text>
                </View>
                <Text style={[styles.mutedSmall, styles.feedbackPrompt]}>How satisfied are you with the stitching, fitting, and overall craftsmanship?</Text>
              </View>
              <RatingButtons value={order.tailorRating} onRate={(rating) => onUpdateOrder({ ...order, tailorRating: rating })} />
            </View>
            <TextInput
              style={styles.reviewInput}
              value={order.tailorReview ?? ""}
              onChangeText={(text) => onUpdateOrder({ ...order, tailorReview: text })}
              multiline
              placeholder="Write a tailor review..."
              placeholderTextColor="#98a4b6"
            />
            {order.tailorRatingSubmittedAt ? (
              <Text style={styles.ratingSubmittedText}>Tailor rating submitted</Text>
            ) : (
              <Pressable style={[styles.ratingSubmitButton, !order.tailorRating && styles.ratingSubmitDisabled]} onPress={() => submitRating("tailor")} disabled={!order.tailorRating || Boolean(savingRating)}>
                {savingRating === "tailor" ? <ActivityIndicator size="small" color="#111111" /> : <Text style={styles.ratingSubmitText}>Submit Tailor Rating</Text>}
              </Pressable>
            )}
            <View style={styles.ratingActionRow}>
              <View style={styles.ratingActionText}>
                <View style={styles.feedbackTitleRow}>
                  <Ionicons name="bicycle-outline" size={17} color={BRAND_ORANGE} />
                  <Text style={styles.addressTitle}>Rate your delivery partner</Text>
                </View>
                <Text style={[styles.mutedSmall, styles.feedbackPrompt]}>How was your pickup and delivery experience? Your feedback helps us serve you better.</Text>
              </View>
              <RatingButtons value={order.deliveryRating} onRate={(rating) => onUpdateOrder({ ...order, deliveryRating: rating })} />
            </View>
            <TextInput
              style={styles.reviewInput}
              value={order.deliveryReview ?? ""}
              onChangeText={(text) => onUpdateOrder({ ...order, deliveryReview: text })}
              multiline
              placeholder="Write a delivery review..."
              placeholderTextColor="#98a4b6"
            />
            {order.deliveryRatingSubmittedAt ? (
              <Text style={styles.ratingSubmittedText}>Delivery rating submitted</Text>
            ) : (
              <Pressable style={[styles.ratingSubmitButton, !order.deliveryRating && styles.ratingSubmitDisabled]} onPress={() => submitRating("delivery")} disabled={!order.deliveryRating || Boolean(savingRating)}>
                {savingRating === "delivery" ? <ActivityIndicator size="small" color="#111111" /> : <Text style={styles.ratingSubmitText}>Submit Delivery Rating</Text>}
              </Pressable>
            )}
            <Pressable
              style={styles.secondaryWideButton}
              onPress={() => {
                onUpdateOrder({ ...order, invoiceGeneratedAt: order.invoiceGeneratedAt ?? new Date().toISOString() });
                downloadInvoice({ ...order, invoiceGeneratedAt: order.invoiceGeneratedAt ?? new Date().toISOString() });
              }}
            >
              <Ionicons name="download-outline" size={18} color={BRAND_DEEP} />
              <Text style={styles.secondaryWideButtonText}>Download Invoice</Text>
            </Pressable>
          </View>
        ) : null}
        {canCancelOrder(order.status) ? (
          <Pressable
            style={styles.cancelOrderButton}
            onPress={() => onRequestCancel(order)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#c24141" />
            <Text style={styles.cancelOrderText}>Cancel Order</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.primaryWideButton} onPress={() => setScreen("trackOrder")}>
          <Text style={styles.primaryWideButtonText}>Track Order</Text>
          <Ionicons name="chevron-forward" size={18} color="#111111" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomerHandoffOtpCard({ orderId, status }: { orderId?: string; status: string }) {
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
            <Text style={styles.addressTitle}>{item.type === "customer_to_tailor" ? "Pickup OTP" : "Final delivery OTP"}</Text>
            <Text style={styles.mutedSmall}>{item.verified ? "Verified by delivery partner" : "Share only when the delivery partner reaches you."}</Text>
          </View>
          <Text style={[styles.handoffOtpCode, item.verified && styles.handoffOtpVerified]}>{item.otp}</Text>
        </View>
      ))}
    </View>
  );
}

function TrackOrderScreenV2({
  order,
  setScreen,
  deliveryLocation
}: {
  order: CustomerOrder;
  setScreen: (screen: Screen) => void;
  deliveryLocation?: { latitude: number; longitude: number; updatedAt?: string };
}) {
  const steps = order.status === "Cancelled" ? [["Order Placed", "10:30 AM", true], ["Cancelled", "", true]] as const : trackStepsForStatus(order.status);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Track Order" onBack={() => setScreen("orderDetails")} />
        <View style={styles.orderIdCard}>
          <View>
            <Text style={styles.mutedSmall}>Order ID</Text>
            <Text style={styles.orderId}>{order.orderNumber}</Text>
          </View>
          <StatusPill status={order.status} />
        </View>
        <CustomerHandoffOtpCard orderId={order.backendOrderId ?? order.tailor.backendRequestId} status={order.status} />
        <View style={styles.timeline}>
          {steps.map(([label, time, done], index) => (
            <View key={label} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View style={[styles.timelineDot, done ? styles.doneDot : styles.pendingDot]}>
                  <Ionicons name={done ? "checkmark" : "ellipse"} size={done ? 14 : 7} color={done ? "#111111" : "#ffffff"} />
                </View>
                {index < steps.length - 1 ? <View style={[styles.timelineLine, done ? styles.doneLine : styles.pendingLine]} /> : null}
              </View>
              <View style={styles.timelineTextWrap}>
                <Text style={[styles.timelineTitle, !done && styles.pendingTimelineTitle]}>{label}</Text>
                {time ? <Text style={styles.timelineTime}>{time}</Text> : null}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>YOUR TAILOR</Text>
          <Text style={styles.addressTitle}>{order.tailor.name}</Text>
          <Text style={styles.mutedSmall}>Estimated completion: {order.tailor.eta}.</Text>
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>LIVE DELIVERY MAP</Text>
          <View style={styles.liveMapCard}>
            <Ionicons name="navigate-outline" size={28} color={BRAND_ORANGE} />
            <Text style={styles.addressTitle}>{deliveryLocation ? "Delivery partner moving" : "Waiting for delivery partner"}</Text>
            <Text style={styles.mutedSmall}>
              {deliveryLocation
                ? `Lat ${deliveryLocation.latitude.toFixed(5)}, Lng ${deliveryLocation.longitude.toFixed(5)}`
                : "Live location appears here when pickup or delivery starts."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const signOut = useAppStore((state) => state.signOut);
  const [screen, setScreenState] = useState<Screen>("home");
  const [customerDataByPhone, setCustomerDataByPhone] = useState<Record<string, CustomerData>>({});
  const [hasLoadedCustomerData, setHasLoadedCustomerData] = useState(false);
  const [activeOrder, setActiveOrder] = useState<CustomerOrder | undefined>();
  const [pendingCancellationOrder, setPendingCancellationOrder] = useState<CustomerOrder | undefined>();
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [dialog, setDialog] = useState<AppDialogState | undefined>();
  const [draft, setDraft] = useState<RequestDraft>(() => makeEmptyDraft());
  const [selectedQuote, setSelectedQuote] = useState<Quote | undefined>();
  const [hasLoadedRequestDraft, setHasLoadedRequestDraft] = useState(false);
  const [requestProgressScreen, setRequestProgressScreen] = useState<RequestFlowScreen>("newRequest");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("Offline");
  const [deliveryLocations, setDeliveryLocations] = useState<Record<string, { latitude: number; longitude: number; updatedAt?: string }>>({});
  const [paymentSheet, setPaymentSheet] = useState<PaymentSheetState | undefined>();
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<string | undefined>();
  const [cancellingOrderId, setCancellingOrderId] = useState<string | undefined>();
  const paymentMessageHandledRef = useRef(false);
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  useRegisterPushNotifications({ authToken: token, app: "customer", userId: user?.id });

  const customerPhone = user?.phone ?? "9876543210";
  const customerData = customerDataByPhone[customerPhone] ?? makeDefaultCustomerData(customerPhone, user?.name);
  const { orders, profile, settings, addresses, notifications } = customerData;
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const unreadCount = notifications.filter((item) => !item.read).length;
  const activeOrderForCustomer = activeOrder && orders.some((order) => order.id === activeOrder.id) ? activeOrder : undefined;

  function setScreen(nextScreen: Screen) {
    if (nextScreen === "newRequest" && !REQUEST_FLOW_SCREENS.has(screen) && (hasRequestDraftData(draft) || draft.backendRequestId || selectedQuote)) {
      setScreenState(requestProgressScreen);
      return;
    }
    setScreenState(nextScreen);
  }

  function updateCustomerData(updater: (data: CustomerData) => CustomerData) {
    setCustomerDataByPhone((current) => {
      const existing = current[customerPhone] ?? makeDefaultCustomerData(customerPhone, user?.name);
      return { ...current, [customerPhone]: updater(existing) };
    });
  }

  function setCustomerOrders(next: CustomerOrder[] | ((orders: CustomerOrder[]) => CustomerOrder[])) {
    updateCustomerData((data) => ({ ...data, orders: typeof next === "function" ? next(data.orders) : next }));
  }

  function setCustomerProfile(nextProfile: ProfileData) {
    updateCustomerData((data) => ({ ...data, profile: nextProfile }));
  }

  function setCustomerSettings(nextSettings: AppSettings) {
    updateCustomerData((data) => ({ ...data, settings: nextSettings }));
  }

  function setCustomerAddresses(nextAddresses: SavedAddress[]) {
    updateCustomerData((data) => ({ ...data, addresses: nextAddresses }));
  }

  function setCustomerNotifications(nextNotifications: AppNotification[]) {
    updateCustomerData((data) => ({ ...data, notifications: nextNotifications }));
  }

  function updateOrder(nextOrder: CustomerOrder) {
    setCustomerOrders((current) => current.map((order) => (order.id === nextOrder.id ? nextOrder : order)));
    setActiveOrder(nextOrder);
  }

  async function refreshCustomerOrders() {
    if (!token) return;
    try {
      const requestData = await api<BackendTailoringRequest[]>("/tailoring-requests", {}, token);
      let nextOrders: CustomerOrder[] = [];
      setCustomerOrders((current) => {
        nextOrders = requestData
          .map((request) => orderFromBackendRequest(request, current.find((order) => order.backendOrderId === request.id || order.id === request.id)))
          .filter((order): order is CustomerOrder => Boolean(order))
          .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
        return nextOrders;
      });
      setActiveOrder((current) => current ? nextOrders.find((order) => order.backendOrderId === current.backendOrderId || order.id === current.id) : current);
    } catch (error) {
      if (isSessionError(error)) signOut();
    }
  }

  function statusFromRealtime(status: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      PAYMENT_PENDING: "Awaiting Payment",
      TAILOR_ACCEPTED: "Confirmed",
      PICKUP_STARTED: "Pickup Started",
      PICKED_UP: "Picked Up",
      ORDER_REACHED_TAILOR: "Package Handover to Tailor",
      STITCHING_STARTED: "Tailor Started",
      READY_FOR_DELIVERY: "Tailor Completed",
      OUT_FOR_DELIVERY: "On the Way",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
      payment_pending: "Awaiting Payment",
      pickup_started: "Pickup Started",
      picked_up_from_customer: "Picked Up",
      received_by_tailor: "Package Handover to Tailor",
      ready_for_delivery: "Tailor Completed",
      out_for_delivery: "On the Way",
      completed: "Delivered",
      cancelled: "Cancelled"
    };
    return map[status] ?? "Pending";
  }

  function applyRealtimeOrderStatus(requestId: string, status: string) {
    const nextStatus = statusFromRealtime(status);
    setCustomerOrders((current) =>
      current.map((order) => (order.backendOrderId === requestId || order.tailor.backendRequestId === requestId ? { ...order, status: nextStatus } : order))
    );
    setActiveOrder((current) => current && (current.backendOrderId === requestId || current.tailor.backendRequestId === requestId) ? { ...current, status: nextStatus } : current);
    if (nextStatus === "Cancelled") {
      setDialog({
        title: "Order cancelled",
        message: `Order REQ-${requestId.slice(0, 8).toUpperCase()} has been cancelled.`,
        actions: [{ label: "OK" }]
      });
    }
    updateCustomerData((data) => ({
      ...data,
      notifications: [
        { id: `rt-${requestId}-${status}-${Date.now()}`, icon: "notifications-outline", title: "Order update", text: nextStatus, time: "Now", read: false },
        ...data.notifications
      ]
    }));
  }

  function markNotificationsRead() {
    setCustomerNotifications(notifications.map((item) => ({ ...item, read: true })));
  }

  function resetRequestDraft() {
    setDraft(makeEmptyDraft(defaultAddress?.address ?? ""));
    setSelectedQuote(undefined);
    setRequestProgressScreen("newRequest");
  }

  function exitRequestFlow() {
    if (!hasRequestDraftData(draft)) {
      resetRequestDraft();
      setScreen("home");
      return;
    }
    setDialog({
      title: "Discard request?",
      message: "Your photos and request details will be cleared.",
      actions: [
        { label: "Keep Editing" },
        {
          label: "Discard",
          destructive: true,
          onPress: () => {
            resetRequestDraft();
            setScreen("home");
          }
        }
      ]
    });
  }

  function saveSupportTicket(message: string) {
    updateCustomerData((data) => ({
      ...data,
      supportTickets: [{ id: `${Date.now()}`, message, createdAt: new Date().toISOString() }, ...data.supportTickets]
    }));
  }

  function saveAppReview(rating: number, review: string) {
    updateCustomerData((data) => ({
      ...data,
      appReviews: [{ id: `${Date.now()}`, rating, review, createdAt: new Date().toISOString() }, ...data.appReviews]
    }));
  }

  function deleteCustomerAccount() {
    setCustomerDataByPhone((current) => {
      const next = { ...current };
      delete next[customerPhone];
      return next;
    });
    setActiveOrder(undefined);
    setSelectedQuote(undefined);
    setScreen("home");
    signOut();
  }

  function requestDeleteCustomerAccount() {
    setDialog({
      title: "Delete account?",
      message: "This removes this customer's local profile, addresses, orders, reviews, and saved app data from this phone.",
      actions: [
        { label: "Keep Account" },
        { label: "Delete Account", destructive: true, onPress: deleteCustomerAccount }
      ]
    });
  }

  function requestCancelOrder(order: CustomerOrder) {
    setPendingCancellationOrder(order);
    setScreen("cancellationPolicy");
  }

  async function confirmCancelOrder(order: CustomerOrder) {
    if (!token || !order.backendOrderId) return;
    if (cancellingOrderId) return;
    try {
      setCancellingOrderId(order.backendOrderId);
      const cancelled = await api<BackendTailoringRequest>(`/tailoring-requests/${order.backendOrderId}/cancel`, { method: "POST" }, token);
      const nextOrder = orderFromBackendRequest(cancelled, order) ?? { ...order, status: "Cancelled" as const };
      updateOrder(nextOrder);
      setPendingCancellationOrder(undefined);
      setScreen("orderDetails");
      setDialog({
        title: "Order cancelled",
        message: `Order ${nextOrder.orderNumber} is cancelled.`,
        actions: [{ label: "Done" }]
      });
    } catch (error) {
      Alert.alert("Cancellation failed", error instanceof Error ? error.message : "Could not cancel this order.");
    } finally {
      setCancellingOrderId(undefined);
    }
  }

  function notifyForPressLaunch() {
    setDialog({
      title: "You are on the list",
      message: "We will notify this customer when cloth press doorstep delivery launches in their area.",
      actions: [{ label: "Done" }]
    });
  }

  function withAppChrome(node: React.ReactNode) {
    styles = createStyles(settings.darkMode);

    return (
      <NotificationProvider
        app="customer"
        onNavigate={(destination) => {
          const matchingOrder = destination.entityId
            ? orders.find((order) => order.id === destination.entityId || order.backendOrderId === destination.entityId || order.tailor.backendRequestId === destination.entityId)
            : undefined;
          if (matchingOrder) setActiveOrder(matchingOrder);
          if (destination.screen === "trackOrder") setScreen("trackOrder");
          else if (destination.screen === "notifications") setScreen("notifications");
          else setScreen("orderDetails");
        }}
      >
        {node}
        <AppDialog dialog={dialog} onClose={() => setDialog(undefined)} />
        <Modal visible={Boolean(paymentSheet)} animationType="slide" onRequestClose={() => !verifyingPayment && setPaymentSheet(undefined)}>
          <SafeAreaView style={styles.safe}>
            <View style={[styles.rowBetween, { paddingHorizontal: 20, paddingTop: 12 }]}>
              <Text style={styles.sectionTitle}>{verifyingPayment ? "Verifying payment" : "Complete Payment"}</Text>
              <Pressable onPress={() => !verifyingPayment && setPaymentSheet(undefined)} disabled={verifyingPayment}>
                <Ionicons name="close" size={22} color={BRAND_DEEP} />
              </Pressable>
            </View>
            {paymentSheet ? (
              <WebView
                source={{
                  html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body style="margin:0;background:#f7faff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
    <script>
      function send(data){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(data)); }
      var options = {
        key: ${JSON.stringify(paymentSheet.config.keyId)},
        amount: ${JSON.stringify(paymentSheet.config.amount)},
        currency: ${JSON.stringify(paymentSheet.config.currency)},
        name: ${JSON.stringify(paymentSheet.config.name)},
        description: ${JSON.stringify(paymentSheet.config.description)},
        order_id: ${JSON.stringify(paymentSheet.config.orderId)},
        prefill: ${JSON.stringify(paymentSheet.config.prefill ?? {})},
        method: ${JSON.stringify(paymentSheet.paymentMethod === "UPI" ? { upi: true } : { upi: true, card: true, netbanking: true, wallet: true })},
        config: ${JSON.stringify(paymentSheet.paymentMethod === "UPI" ? {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [{ method: "upi" }]
              }
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true }
          }
        } : {
          display: {
            preferences: { show_default_blocks: true }
          }
        })},
        theme: { color: "#F6A313" },
        handler: function (response) { send({ type: "success", ...response }); }
      };
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function (response) { send({ type: "failure", error: response.error || null }); });
      rzp.on("modal.closed", function () { send({ type: "cancel" }); });
      rzp.open();
    </script>
  </body>
</html>`
                }}
                onMessage={(event) => {
                  void handlePaymentSheetMessage(event.nativeEvent.data);
                }}
                startInLoadingState
              />
            ) : null}
          </SafeAreaView>
        </Modal>
      </NotificationProvider>
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function loadCustomerData() {
      try {
        await AsyncStorage.removeItem("darji.customerDataByPhone.v1");
        const saved = await AsyncStorage.getItem(CUSTOMER_DATA_STORAGE_KEY);
        if (!cancelled && saved) setCustomerDataByPhone(normalizeCustomerDataByPhone(JSON.parse(saved)));
      } catch {
        // Ignore corrupt local profile cache and start clean.
      } finally {
        if (!cancelled) setHasLoadedCustomerData(true);
      }
    }
    loadCustomerData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedCustomerData) return;
    AsyncStorage.setItem(CUSTOMER_DATA_STORAGE_KEY, JSON.stringify(customerDataByPhone)).catch(() => undefined);
  }, [customerDataByPhone, hasLoadedCustomerData]);

  useEffect(() => {
    let cancelled = false;
    const storageKey = `${CUSTOMER_REQUEST_DRAFT_STORAGE_PREFIX}.${customerPhone}`;
    setHasLoadedRequestDraft(false);
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (cancelled || !saved) return;
        const parsed = JSON.parse(saved) as { draft?: RequestDraft; selectedQuote?: Quote; progressScreen?: RequestFlowScreen };
        if (parsed.draft) {
          setDraft({ ...makeEmptyDraft(), ...parsed.draft, media: parsed.draft.media ?? [], uploadedMedia: parsed.draft.uploadedMedia ?? [] });
        }
        setSelectedQuote(parsed.selectedQuote);
        if (parsed.progressScreen && REQUEST_FLOW_SCREENS.has(parsed.progressScreen)) setRequestProgressScreen(parsed.progressScreen);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHasLoadedRequestDraft(true);
      });
    return () => {
      cancelled = true;
    };
  }, [customerPhone]);

  useEffect(() => {
    if (!hasLoadedRequestDraft) return;
    const storageKey = `${CUSTOMER_REQUEST_DRAFT_STORAGE_PREFIX}.${customerPhone}`;
    if (!hasRequestDraftData(draft) && !draft.backendRequestId && !selectedQuote) {
      AsyncStorage.removeItem(storageKey).catch(() => undefined);
      return;
    }
    AsyncStorage.setItem(storageKey, JSON.stringify({ draft, selectedQuote, progressScreen: requestProgressScreen })).catch(() => undefined);
  }, [customerPhone, draft, hasLoadedRequestDraft, requestProgressScreen, selectedQuote]);

  useEffect(() => {
    if (REQUEST_FLOW_SCREENS.has(screen)) setRequestProgressScreen(screen as RequestFlowScreen);
  }, [screen]);

  useEffect(() => {
    if (!token || !hasLoadedCustomerData) return;
    void refreshCustomerOrders();
  }, [token, hasLoadedCustomerData]);

  useEffect(() => {
    if (!token || !hasLoadedCustomerData) return undefined;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshCustomerOrders();
    });
    return () => subscription.remove();
  }, [token, hasLoadedCustomerData]);

  useEffect(() => {
    if (!token) return undefined;
    void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    const socket = createRealtimeSocket(token, setConnectionStatus, refreshAccessToken);
    socketRef.current = socket;

    socket.on("customer:order_status_updated", ({ requestId, status }: { requestId?: string; status?: string }) => {
      if (requestId && status) applyRealtimeOrderStatus(requestId, status);
    });
    socket.on("customer:delivery_status_updated", ({ tailoringRequestId, status }: { tailoringRequestId?: string; status?: string }) => {
      if (tailoringRequestId && status) applyRealtimeOrderStatus(tailoringRequestId, status);
    });
    socket.on("delivery:location_updated", ({ requestId, location, updatedAt }: { requestId?: string; location?: { latitude?: number; longitude?: number }; updatedAt?: string }) => {
      if (!requestId || !location?.latitude || !location?.longitude) return;
      setDeliveryLocations((current) => ({ ...current, [requestId]: { latitude: location.latitude!, longitude: location.longitude!, updatedAt } }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectionStatus("Offline");
    };
  }, [token]);

  useEffect(() => {
    if (!token || customerData.hasCapturedCurrentAddress) return;
    let cancelled = false;

    async function captureCurrentAddress() {
      setIsCapturingLocation(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          updateCustomerData((data) => ({ ...data, hasCapturedCurrentAddress: true }));
          return;
        }

        const current = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Location request timed out")), 10000))
        ]);
        const [place] = await Location.reverseGeocodeAsync(current.coords);
        const resolvedAddress = place
          ? [place.name, place.street, place.district, place.city, place.region, place.postalCode].filter(Boolean).join(", ")
          : `Lat ${current.coords.latitude.toFixed(5)}, Lng ${current.coords.longitude.toFixed(5)}`;

        if (cancelled) return;

        const currentAddress: SavedAddress = {
          id: "current-location",
          label: "Current Location",
          address: resolvedAddress,
          isDefault: true,
          lat: current.coords.latitude,
          lng: current.coords.longitude
        };

        updateCustomerData((data) => ({
          ...data,
          hasCapturedCurrentAddress: true,
          addresses: [currentAddress, ...data.addresses.filter((item) => item.id !== "current-location").map((item) => ({ ...item, isDefault: false }))]
        }));
        setDraft((currentDraft) => (hasRequestDraftData(currentDraft) ? currentDraft : { ...currentDraft, pickup: resolvedAddress }));
      } catch {
        updateCustomerData((data) => ({ ...data, hasCapturedCurrentAddress: true }));
      } finally {
        if (!cancelled) setIsCapturingLocation(false);
      }
    }

    captureCurrentAddress();
    return () => {
      cancelled = true;
    };
  }, [token, customerPhone, customerData.hasCapturedCurrentAddress]);

  function storeConfirmedOrder(request: BackendTailoringRequest, quoteOverride?: Quote, draftOverride?: RequestDraft) {
    const existing = orders.find((order) => order.backendOrderId === request.id || order.id === request.id);
    const nextOrder =
      orderFromBackendRequest(request, existing ? { ...existing, ...(quoteOverride ? { tailor: quoteOverride } : {}), ...(draftOverride ? { draft: draftOverride } : {}) } : undefined) ??
      (quoteOverride
        ? {
            id: request.id,
            backendOrderId: request.id,
            orderNumber: `REQ-${request.id.slice(0, 8).toUpperCase()}`,
            tailor: quoteOverride,
            draft: draftOverride ?? draft,
            total: request.totalAmount ?? totalForQuote(quoteOverride, draftOverride ?? draft),
            status: statusFromBackendRequest(request),
            placedAt: request.confirmedAt ?? request.createdAt,
            pickupWindow: "Today, 2:00 - 4:00 PM",
            paymentMethod: request.paymentMethod ?? "COD",
            paymentStatus: request.paymentStatus,
            backendRequestStatus: request.status,
            deliveryFee: request.deliveryFee,
            platformFee: request.platformFee,
            homeMeasurementFee: request.homeMeasurementFee
          } satisfies CustomerOrder
        : undefined);
    if (!nextOrder) return;

    setCustomerOrders((current) => {
      const filtered = current.filter((order) => order.backendOrderId !== request.id && order.id !== request.id);
      return [nextOrder, ...filtered];
    });
    setCustomerNotifications([
      {
        id: `order-${request.id}-${Date.now()}`,
        icon: "cube-outline",
        title: nextOrder.status === "Awaiting Payment" ? "Payment pending" : "Order confirmed",
        text: `${nextOrder.orderNumber} is now ${nextOrder.status.toLowerCase()}.`,
        time: "Now",
        read: false
      },
      ...notifications
    ]);
    setActiveOrder(nextOrder);
    void playAppSound("confirmation");
  }

  async function placeOrder(paymentMethod: string) {
    if (!selectedQuote?.backendRequestId || !selectedQuote.backendQuoteId || !token) return;
    if (checkoutPaymentMethod) return;
    const orderDraft = { ...draft, pickup: defaultAddress?.address ?? draft.pickup };
    const deliveryFee = deliveryFeeForUrgency(orderDraft.urgency);
    const homeMeasurementFee = homeMeasurementFeeForDraft(orderDraft);
    const totalAmount = totalForQuote(selectedQuote, orderDraft);

    try {
      setCheckoutPaymentMethod(paymentMethod);
      const response = await api<CheckoutStartResponse>(
        `/tailoring-requests/${selectedQuote.backendRequestId}/checkout`,
        {
          method: "POST",
          body: JSON.stringify({
            quoteId: selectedQuote.backendQuoteId,
            paymentMethod,
            deliveryFee,
            platformFee: PLATFORM_FEE,
            homeMeasurementFee,
            totalAmount
          })
        },
        token
      );

      if (response.mode === "cod" && response.request) {
        storeConfirmedOrder(response.request, selectedQuote, orderDraft);
        setDraft(makeEmptyDraft(defaultAddress?.address ?? ""));
        setSelectedQuote(undefined);
        setScreen("orderDetails");
        setDialog({
          title: "Order confirmed",
          message: `Order REQ-${response.request.id.slice(0, 8).toUpperCase()} is confirmed with COD.`,
          actions: [{ label: "View Order" }]
        });
        return;
      }

      if (response.razorpay) {
        paymentMessageHandledRef.current = false;
        setPaymentSheet({
          requestId: selectedQuote.backendRequestId,
          quote: selectedQuote,
          draft: orderDraft,
          paymentMethod,
          config: response.razorpay
        });
      }
    } catch (error) {
      Alert.alert("Checkout failed", error instanceof Error ? error.message : "Could not start checkout.");
    } finally {
      setCheckoutPaymentMethod(undefined);
    }
  }

  async function handlePaymentSheetMessage(raw: string) {
    if (!paymentSheet || !token) return;
    if (paymentMessageHandledRef.current) return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (payload.type === "cancel") {
      paymentMessageHandledRef.current = true;
      setPaymentSheet(undefined);
      Alert.alert("Payment cancelled", "You can retry online payment or switch to COD.");
      return;
    }
    if (payload.type === "failure") {
      paymentMessageHandledRef.current = true;
      setPaymentSheet(undefined);
      Alert.alert("Payment failed", "Razorpay could not complete the payment. Please try again.");
      return;
    }
    if (payload.type !== "success") return;
    try {
      paymentMessageHandledRef.current = true;
      setVerifyingPayment(true);
      const result = await api<CheckoutVerifyResponse>(
        `/tailoring-requests/${paymentSheet.requestId}/checkout/verify`,
        {
          method: "POST",
          body: JSON.stringify({
            razorpay_payment_id: payload.razorpay_payment_id,
            razorpay_order_id: payload.razorpay_order_id,
            razorpay_signature: payload.razorpay_signature
          })
        },
        token
      );
      if (result.request) {
        storeConfirmedOrder(result.request, paymentSheet.quote, paymentSheet.draft);
        setDraft(makeEmptyDraft(defaultAddress?.address ?? ""));
        setSelectedQuote(undefined);
        setScreen("orderDetails");
        setDialog({
          title: "Payment successful",
          message: `Order REQ-${result.request.id.slice(0, 8).toUpperCase()} is confirmed and the tailor has been notified.`,
          actions: [{ label: "View Order" }]
        });
        void refreshCustomerOrders();
      }
    } catch (error) {
      Alert.alert("Payment verification failed", error instanceof Error ? error.message : "Could not verify payment.");
    } finally {
      setVerifyingPayment(false);
      setPaymentSheet(undefined);
    }
  }

  if (!token) return <AuthScreen />;
  if (!hasLoadedCustomerData) return withAppChrome(<LocationFetchingScreen title="Loading your profile" message="Fetching your saved Darji profile for this phone number." />);
  if (!profile.hasCompletedOnboarding) return withAppChrome(<OnboardingScreen profile={profile} setProfile={setCustomerProfile} />);

  if (screen === "home") return withAppChrome(<HomeScreen setScreen={setScreen} profile={profile} unreadCount={unreadCount} defaultAddress={defaultAddress} orders={orders} />);
  if (screen === "services") return withAppChrome(<ServicesScreen setScreen={setScreen} />);
  if (screen === "featureSoon") return withAppChrome(<FeatureSoonScreen setScreen={setScreen} onNotify={notifyForPressLaunch} />);
  if (screen === "notifications") return withAppChrome(<NotificationsScreen notifications={notifications} onMarkAllRead={markNotificationsRead} setScreen={setScreen} />);
  if (screen === "measurementGuide") return withAppChrome(<MeasurementGuideScreen setScreen={setScreen} />);
  if (screen === "newRequest") return withAppChrome(<NewRequestScreen draft={draft} setDraft={setDraft} setScreen={setScreen} addresses={addresses} onExitRequest={exitRequestFlow} />);
  if (screen === "clothIssue") return withAppChrome(<ClothIssueScreen draft={draft} setDraft={setDraft} setScreen={setScreen} />);
  if (screen === "quotes") return withAppChrome(<QuotesScreen draft={draft} selectedQuote={selectedQuote} setSelectedQuote={setSelectedQuote} setScreen={setScreen} />);
  if (screen === "confirmOrder" && selectedQuote) return withAppChrome(<ConfirmOrderScreen quote={selectedQuote} draft={draft} setScreen={setScreen} onPlaceOrder={placeOrder} isPlacingOrder={Boolean(checkoutPaymentMethod)} />);
  if (screen === "orderDetails" && activeOrderForCustomer) return withAppChrome(<OrderDetailsScreenV2 order={activeOrderForCustomer} onUpdateOrder={updateOrder} onRequestCancel={requestCancelOrder} setScreen={setScreen} />);
  if (screen === "trackOrder" && activeOrderForCustomer) {
    const locationKey = activeOrderForCustomer.backendOrderId ?? activeOrderForCustomer.tailor.backendRequestId ?? activeOrderForCustomer.id;
    return withAppChrome(<TrackOrderScreenV2 deliveryLocation={deliveryLocations[locationKey]} order={activeOrderForCustomer} setScreen={setScreen} />);
  }
  if (screen === "orderDetails" || screen === "trackOrder") return withAppChrome(<OrdersScreenV2 orders={orders} setActiveOrder={setActiveOrder} setScreen={setScreen} />);
  if (screen === "profile") {
    return withAppChrome(
      <>
        <ProfileScreen setScreen={setScreen} orders={orders} profile={profile} addresses={addresses} onDeleteAccount={requestDeleteCustomerAccount} />
        <BottomTabs active="profile" setScreen={setScreen} />
      </>
    );
  }
  if (screen === "editProfile") return withAppChrome(<EditProfileScreen profile={profile} setProfile={setCustomerProfile} setScreen={setScreen} />);
  if (screen === "settings") return withAppChrome(<SettingsScreen settings={settings} setSettings={setCustomerSettings} setScreen={setScreen} />);
  if (screen === "savedAddresses") return withAppChrome(<SavedAddressesScreen addresses={addresses} setAddresses={setCustomerAddresses} setScreen={setScreen} />);
  if (screen === "addAddress") return withAppChrome(<AddAddressScreen addresses={addresses} setAddresses={setCustomerAddresses} setScreen={setScreen} />);
  if (screen === "walletPayments") return withAppChrome(<WalletPaymentsScreen setScreen={setScreen} />);
  if (screen === "coupons") return withAppChrome(<CouponsScreenV2 setScreen={setScreen} />);
  if (screen === "helpCenter") return withAppChrome(<HelpCenterScreen setScreen={setScreen} onOpenCancellationPolicy={() => { setPendingCancellationOrder(undefined); setScreen("cancellationPolicy"); }} />);
  if (screen === "cancellationPolicy") return withAppChrome(<CancellationPolicyScreen order={pendingCancellationOrder} setScreen={setScreen} onConfirmCancel={confirmCancelOrder} isCancelling={Boolean(cancellingOrderId)} />);
  if (screen === "contactSupport") return withAppChrome(<ContactSupportScreen onSave={saveSupportTicket} setScreen={setScreen} />);
  if (screen === "rateApp") return withAppChrome(<RateAppScreen onSave={saveAppReview} setScreen={setScreen} />);
  if (screen === "privacyPolicy") return withAppChrome(<PolicyScreen title="Privacy Policy" setScreen={setScreen} />);
  if (screen === "termsService") return withAppChrome(<PolicyScreen title="Terms of Service" setScreen={setScreen} />);
  if (screen === "appInfo") return withAppChrome(<AppInfoScreen setScreen={setScreen} />);
  if (screen === "orders") return withAppChrome(<OrdersScreenV2 orders={orders} setActiveOrder={setActiveOrder} setScreen={setScreen} />);
  return withAppChrome(<SearchScreen setScreen={setScreen} />);
}

function createStyles(isDark = false) {
  const pageBg = isDark ? "#070d18" : SCREEN_BG;
  const surface = isDark ? "#101827" : "#ffffff";
  const surfaceAlt = isDark ? "#151f2f" : "#fffaf0";
  const inputSurface = isDark ? "#0f1724" : "#ffffff";
  const text = isDark ? "#f8fafc" : BRAND_DEEP;
  const muted = isDark ? "#9aa8bd" : "#65748a";
  const subtle = isDark ? "#7d8ca3" : "#637086";
  const border = isDark ? "#263348" : "#dce2ea";
  const iconBg = isDark ? "#2a1d0a" : "#fff4dc";
  const tabBg = isDark ? "#0b1320" : "#ffffff";
  const darkCard = isDark ? "#0d1421" : "#2b1503";

  return StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: pageBg, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0 },
  center: { alignItems: "center" },
  authLayout: { flex: 1, justifyContent: "center", paddingHorizontal: 28, paddingBottom: 32, paddingTop: 32 },
  logoImage: {
    shadowColor: BRAND_ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24
  },
  authTagline: { marginTop: 18, color: text, fontSize: 14, textAlign: "center", fontWeight: "500" },
  trustRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 34, paddingHorizontal: 30 },
  trustItem: { alignItems: "center", width: 76 },
  trustLabel: { marginTop: 8, color: muted, fontSize: 11, textAlign: "center" },
  authForm: { marginTop: 34 },
  sectionTitle: { color: text, fontSize: 13, fontWeight: "900", letterSpacing: 0.2, marginBottom: 14 },
  phoneField: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#efbd65",
    backgroundColor: inputSurface,
    borderRadius: 13,
    paddingHorizontal: 14
  },
  phonePrefix: { color: BRAND_ORANGE, fontSize: 16, fontWeight: "800", marginRight: 14 },
  phoneDivider: { width: 1, height: 24, backgroundColor: border, marginRight: 14 },
  phoneInput: { flex: 1, height: 46, color: text, fontSize: 14 },
  otpField: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#efbd65",
    backgroundColor: inputSurface,
    paddingHorizontal: 18,
    textAlign: "center",
    color: text,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 4
  },
  authButton: {
    width: "100%",
    height: 48,
    marginTop: 14,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#d88904",
    backgroundColor: BRAND_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#b86b00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6
  },
  authButtonText: { color: "#050505", fontSize: 14, fontWeight: "900" },
  buttonDisabled: { opacity: 0.72 },
  editPhoneButton: { marginTop: 16, alignItems: "center" },
  orangeText: { color: BRAND_ORANGE },
  orangeSmall: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "800" },
  termsText: { marginHorizontal: 8, marginTop: 30, color: muted, fontSize: 12, lineHeight: 20, textAlign: "center" },
  onboardingContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingBottom: 36, paddingTop: 36 },
  onboardingTitle: { color: text, fontSize: 24, fontWeight: "900", marginTop: 34, marginBottom: 8 },
  locationLoadingContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  locationLoadingIcon: { width: 74, height: 74, borderRadius: 24, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  dialogOverlay: { flex: 1, backgroundColor: "rgba(8, 17, 31, 0.48)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  dialogCard: { width: "100%", maxWidth: 360, borderRadius: 22, backgroundColor: surface, borderWidth: 1, borderColor: "#efcf92", padding: 20, alignItems: "center" },
  dialogIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#fff4dc", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  dialogTitle: { color: text, fontSize: 20, fontWeight: "900", textAlign: "center" },
  dialogMessage: { color: muted, fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center", marginTop: 10 },
  dialogActions: { width: "100%", gap: 10, marginTop: 20 },
  dialogButton: { minHeight: 48, borderRadius: 14, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  dialogDestructiveButton: { backgroundColor: "#fff1f1", borderWidth: 1, borderColor: "#ffd1d1" },
  dialogButtonText: { color: "#111111", fontSize: 15, fontWeight: "900" },
  dialogDestructiveText: { color: "#c24141" },
  pageContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  homeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  mutedSmall: { color: subtle, fontSize: 12 },
  userName: { color: text, fontSize: 20, fontWeight: "900", marginTop: 6 },
  homeActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  notificationButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "#142033" : "#eef3f8", alignItems: "center", justifyContent: "center" },
  notificationDot: { position: "absolute", right: 8, top: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: "#ff5d4d" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 42, height: 42, borderRadius: 21, backgroundColor: surface },
  avatarText: { color: "#111111", fontSize: 13, fontWeight: "900" },
  searchBar: { height: 48, borderRadius: 16, backgroundColor: surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  searchPlaceholder: { color: muted, fontSize: 14, fontWeight: "700" },
  animatedSearchWord: { color: text, fontWeight: "900" },
  searchCursor: { color: BRAND_ORANGE, fontWeight: "900" },
  homeAddressCard: { minHeight: 62, borderRadius: 17, backgroundColor: surface, borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 16 },
  featureCard: { minHeight: 176, borderRadius: 22, backgroundColor: darkCard, padding: 22, overflow: "hidden", marginBottom: 24 },
  featureOrb: { position: "absolute", right: -12, top: -24, width: 98, height: 98, borderRadius: 49, backgroundColor: "#5b3608" },
  featureLabel: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", letterSpacing: 0.7 },
  featureTitle: { color: "#f2f6ff", fontSize: 22, lineHeight: 27, fontWeight: "900", marginTop: 8 },
  featureSub: { color: "#6d7b8d", fontSize: 11, marginTop: 8 },
  featureButton: { marginTop: 18, height: 46, minWidth: 150, alignSelf: "flex-start", borderRadius: 23, backgroundColor: BRAND_ORANGE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  featureButtonText: { color: "#111111", fontWeight: "900", fontSize: 15 },
  homeOrderPreview: { minHeight: 78, borderRadius: 18, backgroundColor: surfaceAlt, borderWidth: 1, borderColor: "#efcf92", flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, marginBottom: 20 },
  measureHomeCard: { minHeight: 88, borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center", padding: 14, gap: 12, marginBottom: 20 },
  measureHomeIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" },
  measureHomeThumb: { width: 56, height: 56, borderRadius: 15, backgroundColor: iconBg },
  measureHomeText: { flex: 1, minWidth: 0 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  listTitle: { color: text, fontSize: 18, fontWeight: "900" },
  seeAll: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "700" },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  serviceCard: { minHeight: 134, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, alignItems: "center", justifyContent: "center", padding: 10 },
  serviceTitle: { color: text, fontSize: 15, fontWeight: "900", marginTop: 10, textAlign: "center" },
  serviceCount: { color: muted, fontSize: 13, fontWeight: "800", marginTop: 6 },
  homeInsightGrid: { flexDirection: "row", gap: 12, marginTop: 18, marginBottom: 12 },
  homeInsightCard: { flex: 1, minHeight: 104, borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 16, justifyContent: "center" },
  homeInsightValue: { color: text, fontSize: 15, fontWeight: "900", marginTop: 10, marginBottom: 5 },
  mediaFeatureRow: { gap: 12, paddingBottom: 4, marginBottom: 18 },
  mediaFeatureCard: { width: 214, height: 138, borderRadius: 18, overflow: "hidden", backgroundColor: surface, borderWidth: 1, borderColor: border },
  mediaFeatureImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  mediaFeatureOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(5, 12, 24, 0.48)" },
  mediaFeatureTag: { position: "absolute", left: 12, top: 12, color: "#111111", backgroundColor: BRAND_ORANGE, overflow: "hidden", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "900" },
  mediaFeatureText: { position: "absolute", left: 12, right: 12, bottom: 12 },
  mediaFeatureTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  mediaFeatureCopy: { color: "#d6deea", fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 4 },
  launchImage: { width: "100%", height: 210, borderRadius: 22, marginBottom: 16 },
  launchTitle: { color: text, fontSize: 28, fontWeight: "900", lineHeight: 34, marginBottom: 10 },
  launchPointRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  howItWorksCard: { borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 16, marginBottom: 86 },
  workflowItem: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 10 },
  workflowText: { color: text, fontSize: 13, fontWeight: "900" },
  tabs: { height: 70, borderTopWidth: 1, borderTopColor: border, backgroundColor: tabBg, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 6 },
  tabItem: { alignItems: "center", justifyContent: "center", flex: 1 },
  tabText: { marginTop: 4, fontSize: 10, color: isDark ? "#e5edf7" : "#151b27", fontWeight: "700" },
  activeTabText: { color: BRAND_ORANGE },
  header: { height: 52, flexDirection: "row", alignItems: "center", marginBottom: 14 },
  headerTitle: { color: text, fontSize: 22, fontWeight: "900", marginLeft: 12 },
  headerSpacer: { width: 40 },
  roundIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: surface, alignItems: "center", justifyContent: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  outlinePill: { height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#efbd65", paddingHorizontal: 16, justifyContent: "center" },
  notificationCard: { minHeight: 90, borderRadius: 22, borderWidth: 1, borderColor: "#efc87d", backgroundColor: "#fff9f0", flexDirection: "row", alignItems: "flex-start", padding: 16, marginBottom: 12 },
  darkNotificationCard: { backgroundColor: "#101010", borderColor: "#101010" },
  notificationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff2d8", alignItems: "center", justifyContent: "center" },
  darkNotificationIcon: { backgroundColor: "#171b35" },
  notificationBody: { flex: 1, marginLeft: 14 },
  notificationTitle: { color: BRAND_DEEP, fontSize: 14, fontWeight: "900" },
  notificationTime: { color: "#5f6b7d", fontSize: 10, fontWeight: "800" },
  notificationCopy: { color: "#506075", fontSize: 13, lineHeight: 19, marginTop: 7, fontWeight: "700" },
  darkText: { color: "#f6f7fa" },
  darkMuted: { color: "#7f8796" },
  smallDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND_ORANGE, marginTop: 10, marginLeft: 8 },
  helperText: { color: muted, fontSize: 14, lineHeight: 22, marginBottom: 18 },
  formLabel: { color: muted, fontSize: 13, fontWeight: "900", marginTop: 20, marginBottom: 10 },
  fieldDisclaimer: { color: "#8a5600", fontSize: 12, fontWeight: "800", lineHeight: 18, marginTop: 8 },
  uploadRow: { flexDirection: "row", gap: 10 },
  uploadBox: { flex: 1, height: 98, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "#efbd65", alignItems: "center", justifyContent: "center", backgroundColor: inputSurface },
  uploadText: { color: muted, fontSize: 11, marginTop: 10 },
  addPhotoButton: { height: 42, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "#efbd65", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 14 },
  addPhotoText: { color: BRAND_ORANGE, fontSize: 13, fontWeight: "900" },
  previewRow: { gap: 10, paddingTop: 12, paddingBottom: 2 },
  previewBox: { width: 76, height: 58, borderRadius: 12, borderWidth: 1, borderColor: "#efbd65", overflow: "hidden", backgroundColor: "#ffffff" },
  previewImage: { width: "100%", height: "100%" },
  videoBadge: { position: "absolute", left: 5, bottom: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.58)", alignItems: "center", justifyContent: "center" },
  removePreview: { position: "absolute", right: 4, top: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.58)", alignItems: "center", justifyContent: "center" },
  descriptionInput: { minHeight: 92, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, padding: 16, color: text, textAlignVertical: "top", fontSize: 14, lineHeight: 20 },
  addressCard: { minHeight: 74, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  addressTextWrap: { flex: 1, marginLeft: 14 },
  addressInput: { minHeight: 46, color: text, fontSize: 13, lineHeight: 19, padding: 0, textAlignVertical: "top" },
  addressActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  addressActionButton: { flex: 1, minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: "#efbd65", backgroundColor: inputSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  savedAddressList: { gap: 10 },
  savedAddressChoice: { minHeight: 58, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  savedAddressChoiceSelected: { borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt },
  savedAddressChoiceText: { flex: 1, minWidth: 0 },
  savedAddressChoiceTitle: { color: text, fontSize: 13, fontWeight: "900" },
  addressTitle: { color: text, fontSize: 15, fontWeight: "900" },
  primaryWideButton: { height: 54, borderRadius: 14, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 24 },
  primaryWideButtonText: { color: "#111111", fontSize: 16, fontWeight: "900" },
  emptyActionButton: { alignSelf: "stretch", paddingHorizontal: 18 },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  optionButton: { width: "47.8%", height: 54, borderRadius: 13, borderWidth: 1.2, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 8 },
  selectedOptionButton: { borderWidth: 1.5, borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt },
  optionText: { color: muted, fontSize: 12, fontWeight: "900", textAlign: "center" },
  selectedOptionText: { color: text },
  measurementCard: { borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 16, marginTop: 16 },
  measurementTitleBlock: { flex: 1, minWidth: 0 },
  sizeChartButton: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: "#efbd65", backgroundColor: inputSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12 },
  sizeChartButtonText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" },
  sizeChartIntro: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 10, marginBottom: 12 },
  measurementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  measurementField: { width: "47.8%" },
  measurementLabel: { color: muted, fontSize: 11, fontWeight: "900", marginBottom: 6 },
  measurementInput: { height: 44, borderRadius: 13, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, paddingHorizontal: 12, color: text, fontSize: 14, fontWeight: "800" },
  measurementNotesInput: { minHeight: 86, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, padding: 12, color: text, textAlignVertical: "top", fontSize: 13, lineHeight: 19 },
  sampleReferenceCard: { borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, padding: 12, marginTop: 14 },
  sampleReferenceHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sampleReferenceIcon: { width: 28, alignItems: "center", paddingTop: 1 },
  sampleReferenceText: { flex: 1, minWidth: 0 },
  sampleReferenceCopy: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 3 },
  sampleBulletList: { gap: 5, marginTop: 10 },
  sampleBulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  sampleBulletDot: { color: BRAND_ORANGE, fontSize: 11, fontWeight: "900", lineHeight: 16 },
  sampleBulletText: { flex: 1, minWidth: 0, color: muted, fontSize: 10, fontWeight: "800", lineHeight: 16 },
  measurementRiskBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 13, backgroundColor: isDark ? "#2b1111" : "#fff1f1", borderWidth: 1, borderColor: "#fecaca", padding: 10, marginTop: 14 },
  measurementRiskText: { flex: 1, minWidth: 0, color: "#b91c1c", fontSize: 11, fontWeight: "900", lineHeight: 16 },
  measurementDisclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 14, backgroundColor: isDark ? "#2a1d0a" : "#fff4dc", borderWidth: 1, borderColor: "#efcf92", padding: 11, marginTop: 12 },
  measurementDisclaimerText: { flex: 1, minWidth: 0, color: "#8a5600", fontSize: 11, fontWeight: "800", lineHeight: 17 },
  sampleUploadButton: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "#efbd65", backgroundColor: inputSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, paddingHorizontal: 12 },
  sampleUploadText: { color: BRAND_ORANGE, fontSize: 13, fontWeight: "900" },
  samplePreviewRow: { minHeight: 70, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 11, padding: 10, marginTop: 12 },
  samplePreviewImage: { width: 52, height: 52, borderRadius: 13, backgroundColor: iconBg },
  samplePreviewText: { flex: 1, minWidth: 0 },
  sampleRemoveButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#c24141", alignItems: "center", justifyContent: "center" },
  homeMeasurementButton: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#f4b338",
    backgroundColor: BRAND_ORANGE,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 18,
    shadowColor: "#d88904",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 7
  },
  homeMeasurementButtonSelected: { borderColor: "#0b2241", backgroundColor: "#ffc85a" },
  homeMeasurementGlowIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff7e6", alignItems: "center", justifyContent: "center" },
  homeMeasurementTextBlock: { flex: 1, minWidth: 0 },
  homeMeasurementTitle: { color: "#111111", fontSize: 14, fontWeight: "900", lineHeight: 19 },
  homeMeasurementCopy: { color: "#0f766e", fontSize: 12, fontWeight: "900", lineHeight: 17, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(11, 34, 65, 0.42)", alignItems: "center", justifyContent: "center", padding: 20 },
  sizeChartModal: { width: "100%", maxWidth: 420, maxHeight: "76%", borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, overflow: "hidden" },
  sizeChartModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  sizeChartModalScroll: { paddingHorizontal: 18, paddingBottom: 18 },
  sizeChartTitleBlock: { flex: 1, minWidth: 0 },
  chartCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: inputSurface, alignItems: "center", justifyContent: "center" },
  sizeChartHelp: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 12, marginBottom: 14 },
  sizeChartSectionTitle: { color: text, fontSize: 13, fontWeight: "900", marginTop: 4, marginBottom: 10 },
  measurementImageCard: { borderRadius: 18, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", padding: 8, marginBottom: 16, overflow: "hidden" },
  measurementImageCardCompact: { marginBottom: 12 },
  measurementGuideImage: { width: "100%", height: 360 },
  measurementGuideImageCompact: { height: 240 },
  measurementImageNote: { color: "#8a5600", fontSize: 11, fontWeight: "900", lineHeight: 16, textAlign: "center", marginTop: 6 },
  imageZoomSafe: { flex: 1, backgroundColor: "#f7faff", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0 },
  imageZoomHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: surface },
  imageZoomTitle: { color: text, fontSize: 18, fontWeight: "900" },
  imageZoomHorizontalContent: { flexGrow: 1 },
  imageZoomVerticalContent: { flexGrow: 1, alignItems: "center", justifyContent: "flex-start", paddingVertical: 16 },
  zoomedMeasurementImage: { backgroundColor: "#fffaf0" },
  imageZoomControls: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: surface },
  zoomButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, alignItems: "center", justifyContent: "center" },
  zoomValue: { color: text, fontSize: 14, fontWeight: "900", minWidth: 52, textAlign: "center" },
  measurementOverviewCard: { borderRadius: 18, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, padding: 14, marginBottom: 16 },
  measurementOverviewTitle: { color: BRAND_DEEP, fontSize: 18, fontWeight: "900", textTransform: "uppercase", textAlign: "center" },
  measurementOverviewSubtitle: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 18, textAlign: "center", marginTop: 5, marginBottom: 12 },
  measurementOverviewColumns: { flexDirection: "row", gap: 10 },
  measurementBodyPanel: { flex: 1, minWidth: 0 },
  measurementBodyPanelTitle: { color: "#ffffff", overflow: "hidden", borderRadius: 10, paddingVertical: 7, paddingHorizontal: 6, textAlign: "center", fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  measurementBodyFigure: { height: 172, borderRadius: 14, backgroundColor: surface, borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center", marginTop: 8, overflow: "hidden" },
  measurementBodyLine: { position: "absolute", left: 34, right: 34, height: 3, borderRadius: 2 },
  measurementBodyLineVertical: { left: "50%", right: undefined, width: 3, height: 58 },
  lineNeck: { top: 43 },
  lineChest: { top: 73 },
  lineWaist: { top: 99 },
  lineHip: { top: 121 },
  lineInseam: { top: 105 },
  measurementMarker: { position: "absolute", width: 22, height: 22, borderRadius: 11, color: "#ffffff", fontSize: 11, fontWeight: "900", textAlign: "center", lineHeight: 22, overflow: "hidden" },
  markerNeck: { right: 27, top: 32 },
  markerChest: { right: 23, top: 62 },
  markerWaist: { right: 21, top: 88 },
  markerHip: { right: 18, top: 110 },
  markerInseam: { left: "50%", marginLeft: 7, top: 116 },
  measurementDefinitionList: { marginTop: 12, gap: 8 },
  measurementDefinitionRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#efd7ac" },
  measurementNumberBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND_DEEP, color: "#ffffff", fontSize: 11, fontWeight: "900", textAlign: "center", lineHeight: 22, overflow: "hidden" },
  measurementDefinitionText: { flex: 1, minWidth: 0 },
  measurementDefinitionTitle: { color: text, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  measurementDefinitionCopy: { color: muted, fontSize: 11, fontWeight: "700", lineHeight: 16, marginTop: 3 },
  measurementTipsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  measurementTip: { width: "47.8%", minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 7, padding: 9 },
  measurementTipText: { flex: 1, color: muted, fontSize: 10, fontWeight: "800", lineHeight: 14 },
  measurementGuideChipPanel: { borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, padding: 10, marginTop: 10 },
  measurementGuideChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  measurementGuideChip: { color: muted, backgroundColor: surface, overflow: "hidden", borderRadius: 13, borderWidth: 1, borderColor: border, paddingHorizontal: 10, paddingVertical: 7, minHeight: 34, fontSize: 11, lineHeight: 16, fontWeight: "900" },
  illustrationRow: { gap: 12, paddingBottom: 14 },
  measurementIllustrationCard: { width: 154, minHeight: 194, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, padding: 12 },
  measurementIllustrationFigure: { height: 82, borderRadius: 14, backgroundColor: surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10 },
  measurementGuideLine: { position: "absolute", left: 34, right: 34, top: 39, height: 3, borderRadius: 2, backgroundColor: BRAND_ORANGE },
  measurementGuideLineVertical: { left: 76, right: undefined, top: 17, width: 3, height: 50 },
  measurementGuideLineDiagonal: { left: 44, right: undefined, top: 22, width: 3, height: 50, transform: [{ rotate: "35deg" }] },
  measurementGuideDotStart: { position: "absolute", left: 31, top: 35, width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_ORANGE },
  measurementGuideDotEnd: { position: "absolute", right: 31, top: 35, width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_ORANGE },
  measurementGuideDotEndVertical: { right: undefined, left: 72, top: 64 },
  measurementGuideDotEndDiagonal: { right: undefined, left: 91, top: 63 },
  measurementIllustrationTitle: { color: text, fontSize: 13, fontWeight: "900" },
  measurementIllustrationCopy: { color: muted, fontSize: 11, fontWeight: "700", lineHeight: 16, marginTop: 5 },
  sizeChartRow: { flexDirection: "row", minHeight: 38 },
  sizeChartCell: { width: 96, borderWidth: 1, borderColor: border, paddingHorizontal: 10, paddingVertical: 9, color: muted, fontSize: 12, fontWeight: "800", textAlign: "center" },
  sizeChartHeaderCell: { color: text, backgroundColor: surfaceAlt, fontWeight: "900" },
  sizeChartSizeCell: { color: BRAND_ORANGE, fontWeight: "900" },
  urgencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  urgencyButton: { width: "47.8%", minHeight: 64, borderRadius: 14, borderWidth: 1.2, borderColor: border, backgroundColor: surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, paddingVertical: 10 },
  selectedUrgency: { backgroundColor: surfaceAlt, borderWidth: 1.5, borderColor: BRAND_ORANGE },
  urgencyText: { color: muted, fontSize: 11, fontWeight: "900", textAlign: "center" },
  urgencyHelper: { color: subtle, fontSize: 10, fontWeight: "800", textAlign: "center", marginTop: 4 },
  selectedUrgencyText: { color: BRAND_ORANGE },
  homeMeasurementModal: { width: "100%", maxWidth: 380, borderRadius: 22, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surface, padding: 18, alignItems: "center" },
  homeMeasurementModalIcon: { width: 58, height: 58, borderRadius: 22, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  homeMeasurementModalTitle: { color: text, fontSize: 19, fontWeight: "900", textAlign: "center" },
  homeMeasurementModalCopy: { color: muted, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center", marginTop: 8 },
  homeMeasurementFeeBox: { width: "100%", minHeight: 54, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, marginTop: 16 },
  homeMeasurementModalActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 16 },
  homeMeasurementModalButton: { flex: 1, marginTop: 0 },
  disabledDarkButton: { backgroundColor: "#252525" },
  disabledText: { color: "#777777" },
  infoBanner: { height: 42, borderRadius: 13, borderWidth: 1, borderColor: "#efbd65", backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8, marginBottom: 14 },
  infoBannerText: { color: muted, fontSize: 13, fontWeight: "700" },
  quoteCard: { width: "100%", minHeight: 162, borderRadius: 20, backgroundColor: surfaceAlt, padding: 18, marginBottom: 16, borderWidth: 1.2, borderColor: "#efcf92" },
  selectedQuoteCard: { borderColor: BRAND_ORANGE, backgroundColor: isDark ? "#2a1d0a" : "#fff5df" },
  quoteTopRow: { flexDirection: "row", alignItems: "flex-start", width: "100%" },
  quoteMain: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  quoteAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", marginTop: 4 },
  quoteDetails: { flex: 1, minWidth: 0, paddingLeft: 14, paddingRight: 8 },
  quoteName: { color: text, fontSize: 16, fontWeight: "900", lineHeight: 21 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7, maxWidth: "100%" },
  quoteMeta: { color: muted, fontSize: 12, fontWeight: "800", flexShrink: 1, lineHeight: 17 },
  quotePriceWrap: { width: 76, alignItems: "flex-end", alignSelf: "flex-start", paddingTop: 3 },
  badge: { color: "#8a5600", backgroundColor: "#ffe7ae", overflow: "hidden", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: "900", marginTop: 8 },
  quotePrice: { color: BRAND_ORANGE, fontSize: 19, fontWeight: "900", lineHeight: 24 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22, paddingLeft: 72 },
  quoteChip: { color: muted, backgroundColor: surface, overflow: "hidden", borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 10, paddingVertical: 7, fontSize: 11, fontWeight: "900" },
  whiteCard: { borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 18, marginBottom: 14 },
  handoffOtpRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  handoffOtpCode: { minWidth: 82, borderRadius: 14, overflow: "hidden", backgroundColor: "#111111", color: BRAND_ORANGE, fontSize: 24, fontWeight: "900", letterSpacing: 4, textAlign: "center", paddingVertical: 12 },
  handoffOtpVerified: { color: "#15803d", backgroundColor: "#dcfce7" },
  cardLabel: { color: muted, fontSize: 12, fontWeight: "900", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  summaryLabel: { color: muted, fontSize: 13 },
  summaryValue: { color: text, fontSize: 13, fontWeight: "800", maxWidth: "58%", textAlign: "right" },
  summaryDivider: { height: 1, backgroundColor: border, marginVertical: 4 },
  summaryStrong: { color: BRAND_ORANGE, fontSize: 18, fontWeight: "900" },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 12, height: 34 },
  paymentText: { color: muted, fontSize: 13, fontWeight: "700" },
  orderIdCard: { height: 70, borderRadius: 14, backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 20 },
  orderId: { color: "#dc2626", fontSize: 22, fontWeight: "900", marginTop: 4, letterSpacing: 0.4 },
  orderCard: { borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 18, marginBottom: 14 },
  orderCardV2: { borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 18, marginBottom: 16 },
  orderTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  orderTitleBlock: { flex: 1, minWidth: 0 },
  orderBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  orderTailorBlock: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  orderTailorText: { flex: 1, minWidth: 0, marginLeft: 12 },
  orderNumber: { color: "#dc2626", fontSize: 22, fontWeight: "900", letterSpacing: 0.4 },
  orderService: { color: muted, fontSize: 12, fontWeight: "800", marginTop: 6 },
  cancelledNoticeCard: { borderRadius: 18, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff1f2", padding: 14, marginBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noticeTextBlock: { flex: 1, minWidth: 0 },
  cancelledNoticeTitle: { color: "#991b1b", fontSize: 15, fontWeight: "900" },
  cancelledNoticeCopy: { color: "#b91c1c", fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 3 },
  orderCardDivider: { height: 1, backgroundColor: border, marginVertical: 14 },
  smallQuoteAvatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  smallAvatarText: { color: "#111111", fontSize: 11, fontWeight: "900" },
  orderPrice: { color: BRAND_ORANGE, fontSize: 18, fontWeight: "900" },
  emptyState: { minHeight: 360, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  emptyTitle: { color: text, fontSize: 20, fontWeight: "900", marginTop: 12, marginBottom: 6 },
  searchInputWrap: { height: 54, borderRadius: 18, backgroundColor: surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, height: 52, color: text, fontSize: 15, fontWeight: "700" },
  quickRequestCard: { borderRadius: 20, backgroundColor: surfaceAlt, borderWidth: 1, borderColor: "#efcf92", padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22 },
  quickRequestTextBlock: { flex: 1, minWidth: 0 },
  quickRequestTitle: { color: text, fontSize: 17, fontWeight: "900" },
  quickRequestCopy: { color: muted, fontSize: 12, fontWeight: "700", marginTop: 6, lineHeight: 18 },
  quickRequestButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  searchChips: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12, marginBottom: 22 },
  searchChip: { height: 38, borderRadius: 19, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13 },
  searchChipText: { color: text, fontSize: 12, fontWeight: "900" },
  searchResultCard: { minHeight: 72, borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 12 },
  searchResultIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" },
  searchResultBody: { flex: 1, marginLeft: 14 },
  profileHero: { borderRadius: 22, backgroundColor: surfaceAlt, borderWidth: 1, borderColor: "#efcf92", padding: 18, flexDirection: "row", alignItems: "center", marginBottom: 14 },
  profileAvatar: { width: 62, height: 62, borderRadius: 22, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  profileAvatarImage: { width: 62, height: 62, borderRadius: 22, backgroundColor: iconBg },
  profileAvatarText: { color: "#111111", fontSize: 18, fontWeight: "900" },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { color: text, fontSize: 20, fontWeight: "900" },
  profilePhone: { color: muted, fontSize: 13, fontWeight: "800", marginTop: 6 },
  profileEditButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: surface, alignItems: "center", justifyContent: "center" },
  profileStatsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  profileStat: { flex: 1, minHeight: 78, borderRadius: 17, backgroundColor: surface, borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center" },
  profileStatValue: { color: text, fontSize: 18, fontWeight: "900" },
  profileStatLabel: { color: muted, fontSize: 11, fontWeight: "800", marginTop: 6 },
  profileRow: { minHeight: 62, flexDirection: "row", alignItems: "center" },
  profileRowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" },
  profileRowText: { flex: 1, marginLeft: 12 },
  secondaryWideButton: { height: 52, borderRadius: 15, backgroundColor: surface, borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, marginTop: 6 },
  secondaryWideButtonText: { color: text, fontSize: 15, fontWeight: "900" },
  signOutButton: { height: 52, borderRadius: 15, backgroundColor: "#fff1f1", borderWidth: 1, borderColor: "#ffd1d1", alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 82 },
  signOutText: { color: "#c24141", fontSize: 15, fontWeight: "900" },
  deleteAccountButton: { height: 52, borderRadius: 15, backgroundColor: surface, borderWidth: 1, borderColor: "#ffd1d1", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 82 },
  deleteAccountText: { color: "#c24141", fontSize: 15, fontWeight: "900" },
  editAvatarWrap: { alignItems: "center", marginTop: 10, marginBottom: 24 },
  editAvatar: { width: 92, height: 92, borderRadius: 30, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  editAvatarImage: { width: 92, height: 92, borderRadius: 30, backgroundColor: iconBg },
  cameraBadge: { position: "absolute", right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_ORANGE, borderWidth: 3, borderColor: SCREEN_BG, alignItems: "center", justifyContent: "center" },
  profileInput: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, paddingHorizontal: 16, color: text, fontSize: 15, fontWeight: "800" },
  profileInputButton: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileInputButtonText: { color: text, fontSize: 15, fontWeight: "800" },
  placeholderText: { color: "#98a4b6" },
  dateDoneButton: { alignSelf: "flex-end", height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#efbd65", justifyContent: "center", marginTop: 8 },
  readOnlyField: { minHeight: 62, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: surface, justifyContent: "center", paddingHorizontal: 16 },
  toggleTrack: { width: 46, height: 26, borderRadius: 13, backgroundColor: "#dbe1e9", padding: 3, justifyContent: "center" },
  toggleTrackOn: { backgroundColor: BRAND_ORANGE },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#ffffff" },
  toggleKnobOn: { transform: [{ translateX: 20 }] },
  infoCard: { borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 12 },
  infoCopy: { color: muted, fontSize: 13, fontWeight: "700", lineHeight: 20, marginTop: 6 },
  deleteAddressButton: { minHeight: 38, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, borderRadius: 13, backgroundColor: "#fff1f1", marginTop: 12 },
  deleteAddressText: { color: "#c24141", fontSize: 12, fontWeight: "900" },
  walletCard: { borderRadius: 22, backgroundColor: "#2b1503", padding: 20, marginBottom: 14 },
  walletBalance: { color: BRAND_ORANGE, fontSize: 34, fontWeight: "900", marginTop: 8 },
  couponCard: { borderRadius: 18, backgroundColor: surfaceAlt, borderWidth: 1, borderColor: "#efcf92", padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  couponCardV2: { borderRadius: 18, backgroundColor: surfaceAlt, borderWidth: 1, borderColor: "#efcf92", padding: 16, marginBottom: 14 },
  couponTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  couponTextBlock: { flex: 1, minWidth: 0 },
  couponActionRow: { alignItems: "flex-end", gap: 8 },
  couponCopyButton: { minHeight: 32, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  couponCopyText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" },
  couponActionPill: { minWidth: 74, color: BRAND_ORANGE, backgroundColor: "#fff2d8", overflow: "hidden", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, fontWeight: "900", textAlign: "center" },
  couponDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#efcf92" },
  inactiveCoupon: { opacity: 0.62, backgroundColor: "#ffffff" },
  couponCode: { color: text, fontSize: 17, fontWeight: "900" },
  inactivePill: { color: "#6b7280", backgroundColor: "#eef2f7" },
  policyHero: { borderRadius: 20, backgroundColor: surfaceAlt, borderWidth: 1, borderColor: "#efcf92", padding: 16, marginBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  policyHeroText: { flex: 1, minWidth: 0 },
  policyCard: { borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 12 },
  policyTitle: { color: text, fontSize: 16, fontWeight: "900", flex: 1, minWidth: 0 },
  policyAllowed: { color: "#15803d", backgroundColor: "#dcfce7" },
  policyBlocked: { color: "#b91c1c", backgroundColor: "#fee2e2" },
  policyCaseRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: border },
  policyCaseText: { flex: 1, minWidth: 0 },
  ratingCard: { borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 18, marginBottom: 14 },
  starPicker: { flexDirection: "row", gap: 12, marginTop: 18, marginBottom: 18 },
  ratingActionRow: { minHeight: 54, alignItems: "stretch", gap: 12, borderBottomWidth: 1, borderBottomColor: "#edf1f5", paddingVertical: 14 },
  ratingActionText: { flex: 1, minWidth: 0 },
  feedbackTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 },
  feedbackPrompt: { maxWidth: "96%", lineHeight: 21 },
  inlineStars: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start" },
  reviewInput: { minHeight: 70, borderRadius: 14, borderWidth: 1, borderColor: "#dce2ea", backgroundColor: "#fffdf9", padding: 12, color: BRAND_DEEP, textAlignVertical: "top", fontSize: 13, lineHeight: 18, marginTop: 10, marginBottom: 6 },
  ratingSubmitButton: { minHeight: 42, borderRadius: 14, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  ratingSubmitDisabled: { backgroundColor: "#e5e7eb" },
  ratingSubmitText: { color: "#111111", fontSize: 13, fontWeight: "900" },
  ratingSubmittedText: { color: "#15803d", backgroundColor: "#dcfce7", overflow: "hidden", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start", fontSize: 12, fontWeight: "900", marginBottom: 8 },
  cancelOrderButton: { height: 50, borderRadius: 15, backgroundColor: "#fff1f1", borderWidth: 1, borderColor: "#ffd1d1", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 12 },
  cancelOrderText: { color: "#c24141", fontSize: 15, fontWeight: "900" },
  infoRow: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: border },
  statusPill: { color: BRAND_ORANGE, backgroundColor: "#fff2d8", overflow: "hidden", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 7, fontSize: 12, fontWeight: "900" },
  timeline: { paddingLeft: 6, paddingVertical: 8 },
  timelineRow: { flexDirection: "row", minHeight: 74 },
  timelineRail: { width: 34, alignItems: "center" },
  timelineDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  doneDot: { backgroundColor: BRAND_ORANGE },
  pendingDot: { backgroundColor: "#252525" },
  timelineLine: { width: 2, flex: 1 },
  doneLine: { backgroundColor: BRAND_ORANGE },
  pendingLine: { backgroundColor: "#d7dee9" },
  timelineTextWrap: { marginLeft: 10, paddingTop: 5 },
  timelineTitle: { color: text, fontSize: 14, fontWeight: "900" },
  pendingTimelineTitle: { color: muted },
  timelineTime: { color: muted, fontSize: 12, marginTop: 4 },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }
  ,
  connectionBadge: { minHeight: 30, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: surface, paddingHorizontal: 12, marginTop: 8, marginBottom: 2 },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontSize: 11, fontWeight: "900" },
  liveMapCard: { minHeight: 138, borderRadius: 18, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, alignItems: "center", justifyContent: "center", padding: 16, gap: 8 }
  });
}

let styles = createStyles(false);
