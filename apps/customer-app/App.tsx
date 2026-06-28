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
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
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
  View,
  TouchableOpacity
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
  | "transactionHistory"
  | "coupons"
  | "helpCenter"
  | "contactSupport"
  | "reportBug"
  | "cancellationPolicy"
  | "rateApp"
  | "customerStories"
  | "privacyPolicy"
  | "termsService"
  | "appInfo"
  | "aboutDarji"
  | "featureSoon"
  | "notifications"
  | "measurementGuide"
  | "newRequest"
  | "clothIssue"
  | "orderSummary"
  | "quotes"
  | "confirmOrder"
  | "trackOrder";
type RequestFlowScreen = "newRequest" | "clothIssue" | "orderSummary" | "quotes" | "confirmOrder";
type RequestOtpForm = z.input<typeof requestOtpSchema>;
type VerifyOtpForm = z.input<typeof verifyOtpSchema>;
type Quote = { id: string; initials: string; name: string; rating: string; reviews: number; eta: string; price: number; badge?: string; message?: string; backendQuoteId?: string; backendRequestId?: string; tailorId?: string };
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
type ClothingItemDraft = {
  id: string;
  description: string;
  gender?: string;
  clothType?: string;
  workType?: string;
  measurements?: Record<string, string>;
  measurementNotes?: string;
  sampleProvided?: boolean;
  sampleMedia?: LocalMedia;
  uploadedSampleMedia?: UploadedMedia;
  homeMeasurementBooked?: boolean;
  media: LocalMedia[];
  uploadedMedia: UploadedMedia[];
};
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
  couponCode?: string;
  discountAmount?: number;
};
type CheckoutAdditionalItem = {
  gender?: string;
  clothType?: string;
  workType?: string;
  description?: string;
};
type Coupon = {
  code: string;
  description: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  expiresAt?: string | null;
  isActive: boolean;
};
type BackendRequestQuote = BackendTailorQuote & { estimatedHours?: number; tailor?: BackendTailorQuote["tailor"] };
type BackendTailoringRequestItem = {
  id?: string;
  description: string;
  gender?: string;
  clothType: string;
  workType: string;
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
  measurementNotes?: string;
  media?: UploadedMedia[];
  sampleProvided?: boolean;
  sampleMedia?: UploadedMedia[];
  homeMeasurementBooked?: boolean;
};
type BackendTailoringRequest = {
  id: string;
  description: string;
  gender?: string;
  clothType: string;
  workType: string;
  urgency: string;
  pickupAddress: string;
  media?: UploadedMedia[];
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
  measurementNotes?: string;
  sampleProvided?: boolean;
  sampleMedia?: UploadedMedia[];
  homeMeasurementBooked?: boolean;
  status: "QUOTE_REQUESTED" | "PAYMENT_PENDING" | "TAILOR_SELECTED" | "CANCELLED";
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  quoteAmount?: number;
  deliveryFee?: number;
  platformFee?: number;
  homeMeasurementFee?: number;
  couponCode?: string;
  discountAmount?: number;
  itemCount?: number;
  additionalItems?: CheckoutAdditionalItem[];
  items?: BackendTailoringRequestItem[];
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
type HandoffOtp = {
  taskId: string;
  type: "customer_to_tailor" | "tailor_to_customer";
  stage: "pickup" | "drop";
  otp: string;
  verified: boolean;
  taskStatus?: string;
  retryStatus?: string;
  retryCount?: number;
  lastFailureReason?: string;
  deliveryRound?: string;
  roundAt?: string;
  nextScheduledBatch?: string;
  etaWindowStart?: string;
  etaWindowEnd?: string;
  routePosition?: number;
  routeTotal?: number;
};
type SupportTicketDraft = { id: string; message: string; createdAt: string };
type AppReviewDraft = { id: string; rating: number; review: string; createdAt: string };
type CustomerStory = { id: string; name: string; location: string; rating: number; review: string; createdAt: string };
type DialogAction = { label: string; onPress?: () => void; destructive?: boolean };
type AppDialogState = { title: string; message: string; actions: DialogAction[] };
type RazorpayFailurePayload = {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};
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
  additionalItems?: CheckoutAdditionalItem[];
  items?: ClothingItemDraft[];
  editingItemId?: string;
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
const REQUEST_FLOW_SCREENS = new Set<Screen>(["newRequest", "clothIssue", "orderSummary", "quotes", "confirmOrder"]);
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
    uploadedMedia: [],
    items: []
  };
}

function makeClothingItemId() {
  return `cloth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hasActiveItemDraftData(draft: RequestDraft) {
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

function hasRequestDraftData(draft: RequestDraft) {
  return Boolean(hasActiveItemDraftData(draft) || draft.items?.length || draft.urgency);
}

function draftToClothingItem(draft: RequestDraft, itemId = draft.editingItemId ?? makeClothingItemId()): ClothingItemDraft {
  return {
    id: itemId,
    description: draft.description.trim(),
    gender: draft.gender,
    clothType: draft.clothType,
    workType: draft.workType,
    measurements: draft.measurements,
    measurementNotes: draft.measurementNotes,
    sampleProvided: draft.sampleProvided,
    sampleMedia: draft.sampleMedia,
    uploadedSampleMedia: draft.uploadedSampleMedia,
    homeMeasurementBooked: draft.homeMeasurementBooked,
    media: draft.media,
    uploadedMedia: draft.uploadedMedia
  };
}

function clearActiveClothingItem(draft: RequestDraft): RequestDraft {
  return {
    ...makeEmptyDraft(draft.pickup),
    urgency: draft.urgency,
    items: draft.items ?? [],
    backendRequestId: draft.backendRequestId
  };
}

function loadClothingItemIntoDraft(draft: RequestDraft, item: ClothingItemDraft): RequestDraft {
  return {
    ...draft,
    description: item.description,
    gender: item.gender,
    clothType: item.clothType,
    workType: item.workType,
    measurements: item.measurements,
    measurementNotes: item.measurementNotes,
    sampleProvided: item.sampleProvided,
    sampleMedia: item.sampleMedia,
    uploadedSampleMedia: item.uploadedSampleMedia,
    homeMeasurementBooked: item.homeMeasurementBooked,
    media: item.media ?? [],
    uploadedMedia: item.uploadedMedia ?? [],
    editingItemId: item.id
  };
}

function upsertClothingItem(draft: RequestDraft, item: ClothingItemDraft): ClothingItemDraft[] {
  const items = draft.items ?? [];
  const matchId = draft.editingItemId ?? item.id;
  if (matchId && items.some((entry) => entry.id === matchId)) {
    return items.map((entry) => (entry.id === matchId ? { ...item, id: matchId } : entry));
  }
  return [...items, item];
}

function clothingItemsForDraft(draft: RequestDraft): ClothingItemDraft[] {
  if (draft.items?.length) return draft.items;
  if (!hasActiveItemDraftData(draft)) return [];
  return [draftToClothingItem(draft, "active-item")];
}

function clothingItemTitle(item: Pick<ClothingItemDraft, "gender" | "clothType">) {
  return [item.gender, item.clothType].filter(Boolean).join(" ") || "Clothing item";
}

function clothingItemSummary(item: Pick<ClothingItemDraft, "clothType" | "workType">) {
  return [item.clothType, item.workType].filter(Boolean).join(" - ") || "Tailoring";
}

function clothingItemThumbnail(item: ClothingItemDraft) {
  const firstLocalPhoto = item.media.find((media) => media.type === "image")?.uri;
  return firstLocalPhoto ?? item.uploadedMedia.find((media) => media.resourceType === "image")?.url;
}

function measurementStatusForItem(item: Pick<ClothingItemDraft, "sampleProvided" | "homeMeasurementBooked" | "measurements">) {
  if (item.sampleProvided) return "Sample";
  if (item.homeMeasurementBooked) return "Home Visit";
  if (Object.values(item.measurements ?? {}).some((value) => value.trim())) return "Custom";
  return "Not added";
}

function notesForClothingItem(item: Pick<ClothingItemDraft, "measurementNotes" | "sampleProvided" | "homeMeasurementBooked">) {
  return [
    item.measurementNotes?.trim(),
    item.sampleProvided ? "Customer will provide a non-stretch sample garment as a reference." : undefined,
    item.homeMeasurementBooked ? `Customer requested an at-home measurement visit. Fee: Rs${HOME_MEASUREMENT_FEE}.` : undefined
  ]
    .filter(Boolean)
    .join("\n");
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

function shortLocationFromAddress(address?: SavedAddress) {
  if (!address?.address) return "Darji customer";
  const parts = address.address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.slice(-2).join(", ") || address.label;
}

function storiesFromCustomerData(profile: ProfileData, orders: CustomerOrder[], appReviews: AppReviewDraft[], defaultAddress?: SavedAddress): CustomerStory[] {
  const location = shortLocationFromAddress(defaultAddress);
  const appStories = appReviews
    .filter((item) => item.review.trim())
    .map((item) => ({
      id: `app-${item.id}`,
      name: profile.name,
      location,
      rating: item.rating,
      review: item.review.trim(),
      createdAt: item.createdAt
    }));

  const orderStories = orders.flatMap((order) => {
    const base = {
      name: profile.name,
      location: shortLocationFromAddress({ id: "order", label: "Pickup", address: order.draft.pickup, isDefault: false }),
      createdAt: order.tailorRatingSubmittedAt ?? order.deliveryRatingSubmittedAt ?? order.placedAt
    };
    return [
      order.tailorReview?.trim()
        ? { ...base, id: `tailor-${order.id}`, rating: order.tailorRating ?? (Number(order.tailor.rating) || 5), review: order.tailorReview.trim() }
        : undefined,
      order.deliveryReview?.trim()
        ? { ...base, id: `delivery-${order.id}`, rating: order.deliveryRating ?? 5, review: order.deliveryReview.trim() }
        : undefined
    ].filter((item): item is CustomerStory => Boolean(item));
  });

  return [...appStories, ...orderStories].sort((a, b) => parseDateSafe(b.createdAt).getTime() - parseDateSafe(a.createdAt).getTime());
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
  return clothingItemsForDraft(draft).some((item) => item.homeMeasurementBooked) || draft.homeMeasurementBooked ? HOME_MEASUREMENT_FEE : 0;
}

function checkoutItemCount(draft: RequestDraft) {
  return Math.max(1, clothingItemsForDraft(draft).length);
}

function subtotalForQuote(quote: Quote, draft: RequestDraft) {
  return quote.price + deliveryFeeForUrgency(draft.urgency) + PLATFORM_FEE + homeMeasurementFeeForDraft(draft);
}

function calculateCouponDiscount(coupon: Coupon | undefined, subtotal: number) {
  if (!coupon || !coupon.isActive) return 0;
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return 0;
  if (subtotal < Number(coupon.minOrderValue ?? 0)) return 0;
  const raw = coupon.discountType === "PERCENTAGE" ? (subtotal * Number(coupon.discountValue ?? 0)) / 100 : Number(coupon.discountValue ?? 0);
  const capped = coupon.maxDiscount != null ? Math.min(raw, Number(coupon.maxDiscount)) : raw;
  return Math.min(Math.max(0, Math.round(capped)), subtotal);
}

function couponDiscountLabel(coupon: Coupon) {
  const value = Number(coupon.discountValue ?? 0);
  if (coupon.discountType === "PERCENTAGE") {
    const cap = coupon.maxDiscount != null ? ` up to Rs${Number(coupon.maxDiscount).toFixed(0)}` : "";
    return `${value.toFixed(0)}% off${cap}`;
  }
  return `Rs${value.toFixed(0)} off`;
}

function couponExpiryLabel(coupon: Coupon) {
  if (!coupon.expiresAt) return "No expiry listed";
  const date = new Date(coupon.expiresAt);
  if (Number.isNaN(date.getTime())) return "No expiry listed";
  return `Expires ${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function couponUnavailableReason(coupon: Coupon, subtotal: number) {
  if (!coupon.isActive) return "Unavailable";
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return "Expired";
  const minimum = Number(coupon.minOrderValue ?? 0);
  if (subtotal < minimum) return `Min order Rs${minimum.toFixed(0)}`;
  return "";
}

function totalForQuote(quote: Quote, draft: RequestDraft, coupon?: Coupon) {
  const subtotal = subtotalForQuote(quote, draft);
  return Math.max(subtotal - calculateCouponDiscount(coupon, subtotal), 0);
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

function parseDateSafe(value?: string) {
  if (!value) return new Date(0);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
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
      placeholder="Enter 6 digit OTP"
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
                <AuthButton label="Verify OTP" loading={isVerifyingOtp} onPress={verifyForm.handleSubmit(verify, () => Alert.alert("Enter the 6 digit OTP"))} />
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

function LegacyHomeScreen({
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
  const incompleteOrders = orders.filter((order) => ["Pending", "Awaiting Payment"].includes(order.status));

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
            <Pressable onPress={() => setScreen("profile")}>
              {profile.avatarUri ? <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} /> : <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFor(profile.name)}</Text>
              </View>}
            </Pressable>
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

        {incompleteOrders.length ? (
          <View style={styles.homeIncompleteBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.listTitle}>Incomplete Requests</Text>
              <Pressable onPress={() => setScreen("orders")}>
                <Text style={styles.seeAll}>View all</Text>
              </Pressable>
            </View>
            {incompleteOrders.slice(0, 2).map((order) => (
              <Pressable key={order.id} style={styles.incompleteRequestCard} onPress={() => setScreen("orders")}>
                <View style={styles.profileRowIcon}>
                  <Ionicons name="time-outline" size={18} color="#b91c1c" />
                </View>
                <View style={styles.profileRowText}>
                  <Text style={styles.addressTitle}>{order.orderNumber}</Text>
                  <Text style={styles.mutedSmall}>{order.status === "Awaiting Payment" ? "Payment pending before confirmation" : "Waiting for tailor quotes"}</Text>
                </View>
                <StatusPill status={order.status} />
              </Pressable>
            ))}
          </View>
        ) : null}

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
            <Text style={styles.mutedSmall}>Check active coupons</Text>
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

function HomeScreen({
  setScreen,
  profile,
  unreadCount,
  defaultAddress,
  orders,
  appReviews
}: {
  setScreen: (screen: Screen) => void;
  profile: ProfileData;
  unreadCount: number;
  defaultAddress?: SavedAddress;
  orders: CustomerOrder[];
  appReviews: AppReviewDraft[];
}) {
  const token = useAppStore((state) => state.token);
  const { width } = useWindowDimensions();
  const popularCardWidth = Math.max(86, (width - 76) / 4);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const activeOrder = orders.find((order) => !["Delivered", "Cancelled"].includes(order.status));
  const incompleteOrders = orders.filter((order) => ["Pending", "Awaiting Payment"].includes(order.status));
  const activeCoupons = coupons.filter((coupon) => !couponUnavailableReason(coupon, 0)).slice(0, 2);
  const stories = storiesFromCustomerData(profile, orders, appReviews, defaultAddress);

  useEffect(() => {
    if (!token) return;
    void api<Coupon[]>("/coupons", {}, token).then(setCoupons).catch(() => setCoupons([]));
  }, [token]);

  const needs = [
    { title: "Alteration", text: "Fit and size changes", icon: "cut-outline" },
    { title: "Repair", text: "Tear, hole, zipper and more", icon: "construct-outline" },
    { title: "Restyle", text: "Convert old clothes", icon: "sparkles-outline" },
    { title: "Custom Stitching", text: "Stitch from scratch", icon: "shirt-outline" }
  ] as const;
  const popularServices = [
    { label: "Alteration", icon: "cut-outline" },
    { label: "Repair", icon: "construct-outline" },
    { label: "Restyle", icon: "sparkles-outline" },
    { label: "Custom", icon: "shirt-outline" }
  ] as const;
  const howItWorks = [
    ["camera-outline", "Upload", "Add cloth photos"],
    ["chatbubbles-outline", "Get Quotes", "Tailors respond"],
    ["card-outline", "Choose & Pay", "Confirm quote"],
    ["cube-outline", "Pickup & Stitch", "We handle pickup"],
    ["checkmark-done-outline", "Delivered", "Get order delivered"]
  ] as const;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
        <View style={styles.homeTop}>
          <View>
            <Text style={styles.homeGreeting}>{greetingForNow()}</Text>
            <Text style={styles.userName}>{profile.name}</Text>
          </View>
          <View style={styles.homeActions}>
            <Pressable style={styles.notificationButton} onPress={() => setScreen("notifications")}>
              <Ionicons name="notifications-outline" size={19} color={BRAND_DEEP} />
              {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
            </Pressable>
            <Pressable onPress={() => setScreen("profile")}>
              {profile.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsFor(profile.name)}</Text>
                </View>
              )}
            </Pressable>
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
            <Text style={styles.addressTitle}>{defaultAddress ? "Current Location" : "Pickup address"}</Text>
            <Text style={styles.mutedSmall} numberOfLines={1}>{defaultAddress?.address ?? "Add or select your pickup address"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6b7890" />
        </Pressable>

        <View style={styles.featureCard}>
          <View style={styles.featureOrb} />
          <Text style={styles.featureLabel}>TAILORING REQUEST</Text>
          <Text style={styles.featureTitle}>Get Tailor Quotes{"\n"}at Your Door</Text>
          <Text style={styles.featureSub}>Upload photos and get quotes in minutes</Text>
          <Pressable style={styles.featureButton} onPress={() => setScreen("newRequest")}>
            <Ionicons name="cut-outline" size={16} color="#111111" />
            <Text style={styles.featureButtonText}>Stitch It Now</Text>
          </Pressable>
        </View>

        <Pressable style={styles.homeOrderPreview} onPress={() => setScreen(activeOrder ? "orders" : "newRequest")}>
          <View>
            <Text style={styles.cardLabel}>YOUR ORDERS</Text>
            <Text style={styles.addressTitle}>{activeOrder ? activeOrder.orderNumber : "No active orders"}</Text>
            <Text style={styles.mutedSmall}>{activeOrder ? `${activeOrder.status} - ${activeOrder.tailor.name}` : "Create a request and get tailor quotes."}</Text>
          </View>
          <Ionicons name={activeOrder ? "cube-outline" : "add-circle-outline"} size={25} color={BRAND_ORANGE} />
        </Pressable>

        {incompleteOrders.length ? (
          <View style={styles.homeIncompleteBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.listTitle}>Incomplete Requests</Text>
              <Pressable onPress={() => setScreen("orders")}>
                <Text style={styles.seeAll}>View all</Text>
              </Pressable>
            </View>
            {incompleteOrders.slice(0, 2).map((order) => (
              <Pressable key={order.id} style={styles.incompleteRequestCard} onPress={() => setScreen("orders")}>
                <View style={styles.profileRowIcon}>
                  <Ionicons name="time-outline" size={18} color="#b91c1c" />
                </View>
                <View style={styles.profileRowText}>
                  <Text style={styles.addressTitle}>{order.orderNumber}</Text>
                  <Text style={styles.mutedSmall}>{order.status === "Awaiting Payment" ? "Payment pending before confirmation" : "Waiting for tailor quotes"}</Text>
                </View>
                <StatusPill status={order.status} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Popular Services</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularServiceRow}>
          {popularServices.map((service) => (
            <Pressable key={service.label} style={[styles.popularServiceCard, { width: popularCardWidth }]} onPress={() => setScreen("newRequest")}>
              <Ionicons name={service.icon} size={28} color={BRAND_ORANGE} />
              <Text style={styles.popularServiceText}>{service.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.launchBand}>
          <View style={styles.launchTextBlock}>
            <Text style={styles.launchBadge}>COMING SOON</Text>
            <Text style={styles.launchBandTitle}>Press Clothes Service is Launching Soon!</Text>
            <Text style={styles.launchBandCopy}>Get your clothes perfectly pressed and delivered to your doorstep.</Text>
            <Pressable style={styles.launchNotifyButton} onPress={() => setScreen("featureSoon")}>
              <Text style={styles.launchNotifyText}>Notify Me</Text>
            </Pressable>
          </View>
          <View style={styles.launchIconStack}>
            <Ionicons name="shirt-outline" size={46} color={BRAND_DEEP} />
            <Ionicons name="flash-outline" size={20} color={BRAND_ORANGE} style={styles.launchSparkIcon} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>What do you need?</Text>
        </View>
        <View style={styles.needList}>
          {needs.map((item) => (
            <Pressable key={item.title} style={styles.needCard} onPress={() => setScreen("newRequest")}>
              <View style={styles.needIcon}>
                <Ionicons name={item.icon} size={22} color={BRAND_ORANGE} />
              </View>
              <View style={styles.profileRowText}>
                <Text style={styles.addressTitle}>{item.title}</Text>
                <Text style={styles.mutedSmall}>{item.text}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6b7890" />
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Fabric & Care Tips</Text>
          <Pressable onPress={() => setScreen("measurementGuide")}>
            <Text style={styles.seeAll}>View all</Text>
          </Pressable>
        </View>
        <Pressable style={styles.fabricTipCard} onPress={() => setScreen("measurementGuide")}>
          <Image source={measurementsImage} style={styles.fabricTipImage} resizeMode="cover" />
          <View style={styles.fabricTipText}>
            <Text style={styles.fabricTipTitle}>Measurement Care 101</Text>
            <Text style={styles.fabricTipCopy}>Use this guide before creating a request. Clear measurements help tailors quote faster.</Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Offers & Benefits</Text>
          <Pressable onPress={() => setScreen("coupons")}>
            <Text style={styles.seeAll}>View all</Text>
          </Pressable>
        </View>
        <View style={styles.offerRow}>
          {activeCoupons.length ? activeCoupons.map((coupon) => (
            <Pressable key={coupon.code} style={styles.offerCard} onPress={() => setScreen("coupons")}>
              <Ionicons name="ticket-outline" size={24} color={BRAND_ORANGE} />
              <Text style={styles.offerTitle}>{couponDiscountLabel(coupon)}</Text>
              <Text style={styles.offerCopy} numberOfLines={2}>{coupon.description || coupon.code}</Text>
              <Text style={styles.offerCode}>Use code: {coupon.code}</Text>
            </Pressable>
          )) : (
            <Pressable style={styles.offerCardWide} onPress={() => setScreen("coupons")}>
              <Ionicons name="ticket-outline" size={24} color={BRAND_ORANGE} />
              <View style={styles.profileRowText}>
                <Text style={styles.offerTitle}>No active coupons yet</Text>
                <Text style={styles.offerCopy}>Check the coupons section for new Darji offers.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6b7890" />
            </Pressable>
          )}
          <Pressable style={styles.offerCard} onPress={() => setScreen("orders")}>
            <Ionicons name="navigate-outline" size={24} color="#2563eb" />
            <Text style={styles.offerTitle}>Live Tracking</Text>
            <Text style={styles.offerCopy}>Track pickup, stitching and delivery updates.</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Why Choose Darji?</Text>
        </View>
        <View style={styles.whyGrid}>
          {[
            ["bicycle-outline", "Doorstep Service", "Pickup and delivery"],
            ["shield-checkmark-outline", "Trusted Tailors", "Verified partners"],
            ["pricetag-outline", "Best Prices", "Compare quotes"],
            ["lock-closed-outline", "Secure & Safe", "Protected orders"]
          ].map(([icon, title, copy]) => (
            <View key={title} style={styles.whyCard}>
              <View style={styles.whyIcon}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={BRAND_ORANGE} />
              </View>
              <View style={styles.profileRowText}>
                <Text style={styles.whyTitle}>{title}</Text>
                <Text style={styles.whyCopy}>{copy}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>How It Works</Text>
        </View>
        <View style={styles.homeStepsRow}>
          {howItWorks.map(([icon, title, copy], index) => (
            <View key={title} style={styles.homeStepItem}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <View style={styles.stepIconBox}>
                <Ionicons name={icon} size={22} color={BRAND_DEEP} />
              </View>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepCopy}>{copy}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Customer Stories</Text>
          {stories.length > 0 ? (
            <Pressable onPress={() => setScreen("customerStories")}>
              <Text style={styles.seeAll}>More</Text>
            </Pressable>
          ) : null}
        </View>
        {stories.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
            {stories.slice(0, 4).map((story) => (
              <View key={story.id} style={styles.storyCard}>
                <Ionicons name="chatbox-ellipses-outline" size={22} color={BRAND_ORANGE} />
                <Text style={styles.storyText} numberOfLines={4}>{story.review}</Text>
                <View style={styles.storyFooter}>
                  <View style={styles.storyAvatar}>
                    <Text style={styles.storyAvatarText}>{initialsFor(story.name)}</Text>
                  </View>
                  <View style={styles.profileRowText}>
                    <Text style={styles.storyName}>{story.name}</Text>
                    <Text style={styles.mutedSmall}>{story.location}</Text>
                  </View>
                  <View style={styles.storyRating}>
                    <Ionicons name="star" size={13} color={BRAND_ORANGE} />
                    <Text style={styles.storyRatingText}>{story.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Pressable style={styles.emptyStoryCard} onPress={() => setScreen("rateApp")}>
            <Ionicons name="star-outline" size={22} color={BRAND_ORANGE} />
            <View style={styles.profileRowText}>
              <Text style={styles.addressTitle}>No customer stories yet</Text>
              <Text style={styles.mutedSmall}>Rate Darji after your experience and it will appear here.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7890" />
          </Pressable>
        )}

        <View style={styles.safeDataBand}>
          <Ionicons name="shield-checkmark-outline" size={20} color={BRAND_ORANGE} />
          <Text style={styles.safeDataText}>Your data and clothes are completely safe with Darji.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.listTitle}>Need Help?</Text>
        </View>
        <View style={styles.supportList}>
          <Pressable style={styles.supportRow} onPress={() => setScreen("contactSupport")}>
            <Ionicons name="chatbubble-ellipses-outline" size={21} color={BRAND_DEEP} />
            <View style={styles.profileRowText}>
              <Text style={styles.addressTitle}>Chat with Support</Text>
              <Text style={styles.mutedSmall}>We are online to help you</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7890" />
          </Pressable>
          <Pressable style={styles.supportRow} onPress={() => setScreen("contactSupport")}>
            <Ionicons name="call-outline" size={21} color={BRAND_DEEP} />
            <View style={styles.profileRowText}>
              <Text style={styles.addressTitle}>Call Us</Text>
              <Text style={styles.mutedSmall}>+91 98765 43210</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7890" />
          </Pressable>
          <Pressable style={styles.supportRow} onPress={() => setScreen("helpCenter")}>
            <Ionicons name="help-circle-outline" size={21} color={BRAND_DEEP} />
            <View style={styles.profileRowText}>
              <Text style={styles.addressTitle}>FAQs</Text>
              <Text style={styles.mutedSmall}>Find answers to common questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7890" />
          </Pressable>
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
  const savedItemCount = draft.items?.length ?? 0;
  const needsPickupAddress = savedItemCount === 0;
  const currentItemNumber = draft.editingItemId ? (draft.items ?? []).findIndex((item) => item.id === draft.editingItemId) + 1 || savedItemCount + 1 : savedItemCount + 1;
  const canContinueRequest = draft.media.length > 0 && draft.description.trim().length >= 10 && (!needsPickupAddress || draft.pickup.trim().length >= 8);
  const isAddingAnotherItem = savedItemCount > 0 && !draft.editingItemId;

  function leaveCurrentItem() {
    if (draft.editingItemId || isAddingAnotherItem) {
      setDraft(clearActiveClothingItem(draft));
      setScreen("orderSummary");
      return;
    }
    onExitRequest();
  }

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
    if (needsPickupAddress && draft.pickup.trim().length < 8) {
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
        <Header
          title={draft.editingItemId ? `Edit Item ${currentItemNumber}` : currentItemNumber > 1 ? `Cloth Item ${currentItemNumber}` : "New Request"}
          onBack={leaveCurrentItem}
          right={<Text style={styles.stepBadge}>1/2</Text>}
        />
        <View style={styles.requestHintCard}>
          <Ionicons name="sparkles-outline" size={18} color={BRAND_ORANGE} />
          <View style={styles.profileRowText}>
            <Text style={styles.requestHintTitle}>Get accurate quotes</Text>
            <Text style={styles.requestHintCopy}>Provide clear details and photos of the issue.</Text>
          </View>
        </View>
        {savedItemCount > 0 ? (
          <View style={styles.infoBanner}>
            <Ionicons name="albums-outline" size={17} color={BRAND_ORANGE} />
            <Text style={styles.infoBannerText}>{savedItemCount} {savedItemCount === 1 ? "Item" : "Items"} Added</Text>
          </View>
        ) : null}

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

        {needsPickupAddress ? (
          <>
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
          </>
        ) : (
          <View style={styles.addressCard}>
            <Ionicons name="location-outline" size={20} color={BRAND_ORANGE} />
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressTitle}>Pickup address saved</Text>
              <Text style={styles.mutedSmall} numberOfLines={2}>{draft.pickup}</Text>
            </View>
          </View>
        )}

        <Text style={styles.fieldDisclaimer}>Photos and description are required before continuing{needsPickupAddress ? ", along with pickup address" : ""}.</Text>
        {isAddingAnotherItem ? (
          <Pressable style={styles.secondaryWideButton} onPress={leaveCurrentItem} disabled={uploading}>
            <Ionicons name="close-circle-outline" size={18} color={BRAND_DEEP} />
            <Text style={styles.secondaryWideButtonText}>Cancel This Item</Text>
          </Pressable>
        ) : null}
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
  const [savingAction, setSavingAction] = useState<"summary" | "another" | undefined>();
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showHomeMeasurementModal, setShowHomeMeasurementModal] = useState(false);
  const token = useAppStore((state) => state.token);
  const measurementGuide = guideForClothType(draft.clothType);
  const measurements = draft.measurements ?? {};
  const hasManualMeasurements = Object.values(measurements).some((value) => value.trim()) || Boolean(draft.measurementNotes?.trim());
  const [showManualMeasurements, setShowManualMeasurements] = useState(hasManualMeasurements);
  const savedItemCount = draft.items?.length ?? 0;
  const showUrgencyPicker = savedItemCount === 0 || !draft.urgency;

  function selectClothType(clothType: string) {
    setShowManualMeasurements(false);
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

  async function saveClothingItem() {
    if (!canContinue || !token) return;
    if (draft.description.trim().length < 10) {
      Alert.alert("Add details", "Describe the issue in at least 10 characters.");
      setScreen("newRequest");
      return undefined;
    }
    if (draft.sampleProvided && !draft.sampleMedia && !draft.uploadedSampleMedia) {
      Alert.alert("Sample photo needed", "Upload one photo of the sample garment or turn off the sample option.");
      return undefined;
    }

    try {
      const uploadedSampleMedia = draft.sampleProvided && draft.sampleMedia && !draft.uploadedSampleMedia ? (await uploadMedia([draft.sampleMedia], token))[0] : draft.uploadedSampleMedia;
      const item = draftToClothingItem({ ...draft, uploadedSampleMedia });
      return { item, uploadedSampleMedia, items: upsertClothingItem(draft, item) };
    } catch (error) {
      Alert.alert("Item failed", error instanceof Error ? error.message : "Could not save this clothing item.");
      return undefined;
    }
  }

  async function continueToSummary() {
    try {
      setSavingAction("summary");
      const saved = await saveClothingItem();
      if (!saved) return;
      setDraft(clearActiveClothingItem({ ...draft, uploadedSampleMedia: saved.uploadedSampleMedia, items: saved.items }));
      setScreen("orderSummary");
    } finally {
      setSavingAction(undefined);
    }
  }

  async function addAnotherCloth() {
    try {
      setSavingAction("another");
      const saved = await saveClothingItem();
      if (!saved) return;
      setDraft(clearActiveClothingItem({ ...draft, uploadedSampleMedia: saved.uploadedSampleMedia, items: saved.items }));
      setScreen("newRequest");
    } finally {
      setSavingAction(undefined);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Cloth Details" onBack={() => setScreen(draft.editingItemId ? "orderSummary" : "newRequest")} right={<Text style={styles.stepBadge}>2/2</Text>} />
        {savedItemCount > 0 ? (
          <View style={styles.infoBanner}>
            <Ionicons name="albums-outline" size={17} color={BRAND_ORANGE} />
            <Text style={styles.infoBannerText}>{savedItemCount} {savedItemCount === 1 ? "Item" : "Items"} Added</Text>
          </View>
        ) : null}

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

        {draft.clothType && !showManualMeasurements ? (
          <Pressable style={styles.manualMeasureLink} onPress={() => setShowManualMeasurements(true)}>
            <Text style={styles.manualMeasureText}>Enter measurement manually?</Text>
            <Ionicons name="create-outline" size={16} color={BRAND_ORANGE} />
          </Pressable>
        ) : null}

        {draft.clothType && showManualMeasurements ? (
          <View style={styles.measurementCard}>
            <View style={styles.rowBetween}>
              <View style={styles.measurementTitleBlock}>
                <Text style={styles.cardLabel}>MEASUREMENTS</Text>
                <Text style={styles.addressTitle}>{draft.clothType}</Text>
              </View>
              <View style={styles.measurementHeaderActions}>
                <Pressable style={styles.sizeChartButton} onPress={() => setShowSizeChart(true)}>
                  <Ionicons name="resize-outline" size={15} color={BRAND_ORANGE} />
                  <Text style={styles.sizeChartButtonText}>Size chart</Text>
                </Pressable>
                <Pressable style={styles.iconMiniButton} onPress={() => setShowManualMeasurements(false)}>
                  <Ionicons name="chevron-up" size={16} color={BRAND_ORANGE} />
                </Pressable>
              </View>
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

        {showUrgencyPicker ? (
          <>
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
          </>
        ) : (
          <View style={styles.infoBanner}>
            <Ionicons name="flash-outline" size={17} color={BRAND_ORANGE} />
            <Text style={styles.infoBannerText}>Shared urgency: {draft.urgency}</Text>
          </View>
        )}

        <Pressable disabled={!canContinue || Boolean(savingAction)} style={[styles.primaryWideButton, (!canContinue || Boolean(savingAction)) && styles.disabledDarkButton]} onPress={continueToSummary}>
          {savingAction === "summary" ? (
            <ActivityIndicator color="#777777" />
          ) : (
            <>
              <Text style={[styles.primaryWideButtonText, !canContinue && styles.disabledText]}>Get Quotes</Text>
              <Ionicons name="chevron-forward" size={18} color={canContinue ? "#111111" : "#777777"} />
            </>
          )}
        </Pressable>
        <Pressable disabled={!canContinue || Boolean(savingAction)} style={[styles.secondaryWideButton, (!canContinue || Boolean(savingAction)) && styles.buttonDisabled]} onPress={addAnotherCloth}>
          {savingAction === "another" ? (
            <ActivityIndicator color={BRAND_ORANGE} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={18} color={canContinue ? BRAND_ORANGE : "#777777"} />
              <Text style={[styles.secondaryWideButtonText, !canContinue && styles.disabledText]}>Add Another Cloth</Text>
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
    price: quote.price,
    message: quote.message
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

function clothingItemsFromBackendRequest(request: BackendTailoringRequest, fallbackDraft?: RequestDraft): ClothingItemDraft[] {
  if (request.items?.length) {
    return request.items.map((item, index) => ({
      id: item.id ?? `${request.id}-item-${index + 1}`,
      description: item.description,
      gender: item.gender,
      clothType: item.clothType,
      workType: item.workType,
      measurements: Object.fromEntries(Object.entries(item.measurement?.fields ?? {}).map(([key, value]) => [key, String(value)])),
      measurementNotes: item.measurementNotes,
      sampleProvided: item.sampleProvided,
      uploadedSampleMedia: item.sampleMedia?.[0],
      homeMeasurementBooked: item.homeMeasurementBooked,
      media: [],
      uploadedMedia: item.media ?? []
    }));
  }
  if (fallbackDraft?.items?.length) return fallbackDraft.items;
  return [
    {
      id: `${request.id}-item-1`,
      description: request.description,
      gender: request.gender,
      clothType: request.clothType,
      workType: request.workType,
      measurements: Object.fromEntries(Object.entries(request.measurement?.fields ?? {}).map(([key, value]) => [key, String(value)])),
      measurementNotes: request.measurementNotes,
      sampleProvided: request.sampleProvided,
      uploadedSampleMedia: request.sampleMedia?.[0],
      homeMeasurementBooked: request.homeMeasurementBooked,
      media: [],
      uploadedMedia: request.media ?? []
    }
  ];
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
  const items = clothingItemsFromBackendRequest(request, fallbackDraft);
  const primaryItem = items[0];
  const draft: RequestDraft = {
    ...fallbackDraft,
    description: primaryItem?.description ?? request.description,
    gender: primaryItem?.gender ?? request.gender,
    clothType: primaryItem?.clothType ?? request.clothType,
    workType: primaryItem?.workType ?? request.workType,
    urgency: request.urgency,
    pickup: request.pickupAddress,
    measurements: primaryItem?.measurements,
    measurementNotes: primaryItem?.measurementNotes,
    sampleProvided: primaryItem?.sampleProvided ?? request.sampleProvided,
    uploadedSampleMedia: primaryItem?.uploadedSampleMedia,
    homeMeasurementBooked: primaryItem?.homeMeasurementBooked,
    media: primaryItem?.media ?? [],
    uploadedMedia: primaryItem?.uploadedMedia ?? [],
    items,
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
    couponCode: request.couponCode ?? existingOrder?.couponCode,
    discountAmount: request.discountAmount ?? existingOrder?.discountAmount,
    tailorRating: existingOrder?.tailorRating,
    deliveryRating: existingOrder?.deliveryRating,
    tailorReview: existingOrder?.tailorReview,
    deliveryReview: existingOrder?.deliveryReview,
    tailorRatingSubmittedAt: existingOrder?.tailorRatingSubmittedAt,
    deliveryRatingSubmittedAt: existingOrder?.deliveryRatingSubmittedAt,
    invoiceGeneratedAt: existingOrder?.invoiceGeneratedAt
  };
}

function payloadForClothingItem(item: ClothingItemDraft) {
  const measurementFields = Object.fromEntries(Object.entries(item.measurements ?? {}).filter(([, value]) => value.trim()));
  const measurementNotes = notesForClothingItem(item);
  return {
    description: item.description,
    gender: item.gender,
    clothType: item.clothType,
    workType: item.workType,
    measurement: item.clothType
      ? {
          label: item.clothType,
          fields: measurementFields,
          imageUrl: item.uploadedSampleMedia?.url
        }
      : undefined,
    measurementNotes: measurementNotes || undefined,
    homeMeasurementBooked: item.homeMeasurementBooked === true,
    sampleProvided: item.sampleProvided === true,
    media: item.uploadedMedia,
    sampleMedia: item.uploadedSampleMedia ? [item.uploadedSampleMedia] : []
  };
}

function OrderSummaryScreen({
  draft,
  setDraft,
  setScreen,
  showDialog
}: {
  draft: RequestDraft;
  setDraft: (draft: RequestDraft) => void;
  setScreen: (screen: Screen) => void;
  showDialog: (dialog: AppDialogState) => void;
}) {
  const token = useAppStore((state) => state.token);
  const signOut = useAppStore((state) => state.signOut);
  const [submitting, setSubmitting] = useState(false);
  const items = clothingItemsForDraft(draft);

  function editItem(item: ClothingItemDraft) {
    setDraft(loadClothingItemIntoDraft(draft, item));
    setScreen("newRequest");
  }

  function deleteItem(itemId: string) {
    const nextItems = items.filter((item) => item.id !== itemId);
    setDraft({ ...clearActiveClothingItem({ ...draft, items: nextItems }), items: nextItems });
    if (nextItems.length === 0) setScreen("newRequest");
  }

  async function requestQuotes() {
    if (!token) return;
    if (items.length === 0) {
      showDialog({ title: "Add a cloth", message: "Add at least one clothing item before requesting quotes.", actions: [{ label: "OK" }] });
      return;
    }
    if (!draft.urgency || draft.pickup.trim().length < 8) {
      showDialog({ title: "Shared details missing", message: "Pickup address and urgency are required for the order.", actions: [{ label: "OK" }] });
      return;
    }
    const incomplete = items.find((item) => !item.description.trim() || !item.clothType || !item.workType || !item.uploadedMedia.length);
    if (incomplete) {
      showDialog({ title: "Item incomplete", message: `${clothingItemTitle(incomplete)} needs photos, description, cloth type, and work type.`, actions: [{ label: "OK" }] });
      return;
    }

    try {
      setSubmitting(true);
      const itemPayloads = items.map(payloadForClothingItem);
      const primary = itemPayloads[0];
      const request = await api<BackendTailoringRequest>(
        "/tailoring-requests",
        {
          method: "POST",
          body: JSON.stringify({
            ...primary,
            urgency: draft.urgency,
            pickupAddress: draft.pickup,
            items: itemPayloads
          })
        },
        token
      );
      setDraft({
        ...clearActiveClothingItem({ ...draft, items }),
        description: items[0].description,
        gender: items[0].gender,
        clothType: items[0].clothType,
        workType: items[0].workType,
        measurements: items[0].measurements,
        measurementNotes: items[0].measurementNotes,
        sampleProvided: items[0].sampleProvided,
        uploadedSampleMedia: items[0].uploadedSampleMedia,
        homeMeasurementBooked: items[0].homeMeasurementBooked,
        media: items[0].media,
        uploadedMedia: items[0].uploadedMedia,
        items,
        backendRequestId: request.id
      });
      setScreen("quotes");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not request quotes.";
      showDialog({ title: "Request failed", message, actions: [{ label: "OK" }] });
      if (message.includes("Session expired")) signOut();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title="Order Summary" onBack={() => setScreen("newRequest")} />
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>ORDER CART</Text>
          <SummaryRow label="Clothing items" value={`${items.length}`} strong />
          <SummaryRow label="Urgency" value={draft.urgency ?? "Not selected"} />
          <SummaryRow label="Pickup address" value={draft.pickup || "Not selected"} />
        </View>

        {items.map((item, index) => {
          const thumbnail = clothingItemThumbnail(item);
          return (
            <View key={item.id} style={styles.orderSummaryItemCard}>
              <View style={styles.orderSummaryItemTop}>
                <View style={styles.orderSummaryThumb}>
                  {thumbnail ? <Image source={{ uri: thumbnail }} style={styles.orderSummaryThumbImage} /> : <Ionicons name="shirt-outline" size={24} color={BRAND_ORANGE} />}
                </View>
                <View style={styles.orderSummaryItemText}>
                  <Text style={styles.cardLabel}>ITEM {index + 1}</Text>
                  <Text style={styles.addressTitle}>{clothingItemTitle(item)}</Text>
                  <Text style={styles.mutedSmall}>{clothingItemSummary(item)}</Text>
                  <Text style={styles.mutedSmall} numberOfLines={2}>{item.description}</Text>
                  <Text style={styles.orderSummaryStatus}>{measurementStatusForItem(item)}</Text>
                </View>
              </View>
              <View style={styles.orderSummaryActions}>
                <Pressable style={styles.orderSummaryActionButton} onPress={() => editItem(item)}>
                  <Ionicons name="create-outline" size={16} color={BRAND_DEEP} />
                  <Text style={styles.orderSummaryActionText}>Edit</Text>
                </Pressable>
                <Pressable style={[styles.orderSummaryActionButton, styles.orderSummaryDeleteButton]} onPress={() => deleteItem(item.id)}>
                  <Ionicons name="trash-outline" size={16} color="#c24141" />
                  <Text style={[styles.orderSummaryActionText, styles.orderSummaryDeleteText]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable style={styles.secondaryWideButton} onPress={() => { setDraft(clearActiveClothingItem({ ...draft, items })); setScreen("newRequest"); }} disabled={submitting}>
          <Ionicons name="add-circle-outline" size={18} color={BRAND_ORANGE} />
          <Text style={styles.secondaryWideButtonText}>Add Another Cloth</Text>
        </Pressable>
        <Pressable style={[styles.primaryWideButton, (items.length === 0 || submitting) && styles.disabledDarkButton]} onPress={requestQuotes} disabled={items.length === 0 || submitting}>
          {submitting ? <ActivityIndicator color="#111111" /> : <Text style={[styles.primaryWideButtonText, items.length === 0 && styles.disabledText]}>Get Quotes</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuotesScreen({
  draft,
  selectedQuote,
  setSelectedQuote,
  setScreen,
  showDialog,
  onDeleteRequest
}: {
  draft: RequestDraft;
  selectedQuote?: Quote;
  setSelectedQuote: (quote: Quote) => void;
  setScreen: (screen: Screen) => void;
  showDialog: (dialog: AppDialogState) => void;
  onDeleteRequest?: () => Promise<void> | void;
}) {
  const token = useAppStore((state) => state.token);
  const [backendQuotes, setBackendQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const itemCount = checkoutItemCount(draft);

  async function loadQuotes() {
    if (!token || !draft.backendRequestId) return;
    try {
      setLoading(true);
      const data = await api<BackendTailorQuote[]>(`/tailoring-requests/${draft.backendRequestId}/quotes`, {}, token);
      const allowedStatuses = new Set(["SUBMITTED", "RESERVED", "ACCEPTED"]);
      setBackendQuotes(data.filter((quote) => allowedStatuses.has(quote.status)).map(quoteFromBackend));
    } catch (error) {
      showDialog({
        title: "Quotes unavailable",
        message: error instanceof Error ? error.message : "Could not load tailor quotes.",
        actions: [{ label: "OK" }]
      });
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

  async function performDeleteRequest() {
    if (!onDeleteRequest || deleting) return;
    try {
      setDeleting(true);
      await onDeleteRequest();
    } finally {
      setDeleting(false);
    }
  }

  function requestDeleteRequest() {
    showDialog({
      title: "Delete request?",
      message: "This request will be cancelled and moved to cancelled orders. Tailors will stop seeing it.",
      actions: [
        { label: "Keep Request" },
        { label: "Delete Request", destructive: true, onPress: () => void performDeleteRequest() }
      ]
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header
          title="Tailor Quotes"
          onBack={() => setScreen(draft.backendRequestId ? "orders" : "clothIssue")}
          right={(
            <Pressable style={styles.roundIconButton} onPress={() => setScreen("notifications")}>
              <Ionicons name="notifications-outline" size={20} color={BRAND_DEEP} />
            </Pressable>
          )}
        />
        <View style={styles.quotesSummaryCard}>
          <View style={styles.quoteClockIcon}>
            <Ionicons name="time-outline" size={30} color={BRAND_ORANGE} />
          </View>
          <View style={styles.profileRowText}>
            <Text style={styles.quotesSummaryTitle}>{loading ? "Checking quotes..." : `${visibleQuotes.length} tailors responded`}{` - ${itemCount} ${itemCount === 1 ? "item" : "items"}`}</Text>
            <Text style={styles.mutedSmall}>Your request was sent just now</Text>
          </View>
          <Pressable style={styles.quoteDetailsButton} onPress={() => setDetailsOpen(true)}>
            <Ionicons name="list-outline" size={18} color={BRAND_DEEP} />
            <Text style={styles.quoteDetailsButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color={BRAND_DEEP} />
          </Pressable>
        </View>

        {visibleQuotes.length === 0 && !loading ? (
          <View style={styles.quotesWaitingState}>
            <View style={styles.quotesIllustration}>
              <Ionicons name="shirt-outline" size={88} color={BRAND_DEEP} />
              <Ionicons name="paper-plane-outline" size={44} color={BRAND_ORANGE} style={styles.quotesPlaneIcon} />
            </View>
            <Text style={styles.emptyTitle}>Waiting for tailor quotes</Text>
            <Text style={styles.helperText}>Your request is open. Tailors will see it in their app and send quote amount with completion time.</Text>
            <View style={styles.quotesTrustCard}>
              {[
                ["eye-outline", "Verified Tailors", "Only trusted tailors"],
                ["pricetag-outline", "Best Prices", "Compare quotes"],
                ["shield-checkmark-outline", "Secure & Safe", "Protected orders"]
              ].map(([icon, title, copy]) => (
                <View key={title} style={styles.quotesTrustItem}>
                  <View style={styles.quotesTrustIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={BRAND_ORANGE} /></View>
                  <Text style={styles.quotesTrustTitle}>{title}</Text>
                  <Text style={styles.quotesTrustCopy}>{copy}</Text>
                </View>
              ))}
            </View>
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
                <Text style={styles.quoteChip}>{itemCount === 1 ? clothingItemSummary(clothingItemsForDraft(draft)[0] ?? draftToClothingItem(draft, "active-item")) : `${itemCount} clothing items`}</Text>
              </View>
              {quote.message ? (
                <View style={styles.quoteMessageBox}>
                  <Text style={styles.cardLabel}>TAILOR NOTE</Text>
                  <Text style={styles.quoteMessageText}>{quote.message}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <Pressable style={styles.quoteActionRowButton} onPress={loadQuotes} disabled={loading || deleting}>
          {loading ? <ActivityIndicator color={BRAND_ORANGE} /> : <Ionicons name="refresh-outline" size={24} color={BRAND_ORANGE} />}
          <View style={styles.profileRowText}>
            <Text style={styles.quoteActionTitle}>Refresh Quotes</Text>
            <Text style={styles.mutedSmall}>Pull the latest quotes from tailors</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7890" />
        </Pressable>
        <Pressable disabled={!selectedQuote || confirming} style={[styles.primaryWideButton, (!selectedQuote || confirming) && styles.disabledDarkButton]} onPress={confirmTailor}>
          {confirming ? <ActivityIndicator color="#777777" /> : <Text style={[styles.primaryWideButtonText, !selectedQuote && styles.disabledText]}>Confirm This Tailor</Text>}
        </Pressable>
        {draft.backendRequestId && onDeleteRequest ? (
          <Pressable style={styles.cancelOrderButton} onPress={requestDeleteRequest} disabled={deleting}>
            <Ionicons name="trash-outline" size={18} color="#c24141" />
            <Text style={styles.cancelOrderText}>Delete Request</Text>
          </Pressable>
        ) : null}
        <View style={styles.requestExpireRow}>
          <Ionicons name="shield-checkmark-outline" size={17} color="#8a94a6" />
          <Text style={styles.mutedSmall}>Your request will expire in 24 hours if no quotes are received.</Text>
        </View>
      </ScrollView>
      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.requestDetailsModal}>
            <View style={styles.rowBetween}>
              <Text style={styles.profileName}>Request Details</Text>
              <Pressable style={styles.iconMiniButton} onPress={() => setDetailsOpen(false)}>
                <Ionicons name="close" size={18} color={BRAND_DEEP} />
              </Pressable>
            </View>
            <Text style={styles.infoCopy}>Request ID: {draft.backendRequestId ? `REQ-${draft.backendRequestId.slice(0, 8).toUpperCase()}` : "Draft request"}</Text>
            <View style={styles.summaryDivider} />
            {clothingItemsForDraft(draft).map((item, index) => (
              <View key={item.id} style={styles.requestDetailItem}>
                <Text style={styles.cardLabel}>ITEM {index + 1}</Text>
                <Text style={styles.addressTitle}>{clothingItemTitle(item)}</Text>
                <Text style={styles.mutedSmall}>{clothingItemSummary(item)}</Text>
                <Text style={styles.infoCopy}>{item.description}</Text>
              </View>
            ))}
            <SummaryRow label="Urgency" value={draft.urgency ?? "Not selected"} />
            <SummaryRow label="Pickup" value={draft.pickup || "Not selected"} />
          </View>
        </View>
      </Modal>
      <Modal visible={deleting} transparent animationType="fade" onRequestClose={() => undefined}>
        <View style={styles.checkoutBlockingOverlay}>
          <View style={styles.checkoutBlockingCard}>
            <ActivityIndicator color={BRAND_ORANGE} size="large" />
            <Text style={styles.checkoutBlockingTitle}>Deleting request...</Text>
            <Text style={styles.checkoutBlockingCopy}>Please wait while we cancel this request.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ConfirmOrderScreen({
  quote,
  draft,
  setDraft,
  setScreen,
  onPlaceOrder,
  isPlacingOrder,
  onDeleteRequest
}: {
  quote: Quote;
  draft: RequestDraft;
  setDraft: (draft: RequestDraft) => void;
  setScreen: (screen: Screen) => void;
  onPlaceOrder: (paymentMethod: string, checkout: { couponCode?: string; totalAmount: number }) => void;
  isPlacingOrder?: boolean;
  onDeleteRequest?: () => Promise<void> | void;
}) {
  const token = useAppStore((state) => state.token);
  const [payment, setPayment] = useState("ONLINE");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | undefined>();
  const orderItems = clothingItemsForDraft(draft);
  const deliveryFee = deliveryFeeForUrgency(draft.urgency);
  const homeMeasurementFee = homeMeasurementFeeForDraft(draft);
  const itemCount = checkoutItemCount(draft);
  const tailoringTotal = quote.price;
  const subtotal = subtotalForQuote(quote, draft);
  const discount = calculateCouponDiscount(appliedCoupon, subtotal);
  const total = totalForQuote(quote, draft, appliedCoupon);
  const buttonLabel = payment === "COD" ? `Confirm COD Rs${total}` : payment === "UPI" ? `Pay UPI Rs${total}` : `Pay Online Rs${total}`;

  useEffect(() => {
    if (!token) return;
    void api<Coupon[]>("/coupons", {}, token).then(setCoupons).catch(() => setCoupons([]));
  }, [token]);

  function applyCoupon(codeValue = couponInput) {
    const code = codeValue.trim().toUpperCase();
    const coupon = coupons.find((item) => item.code.toUpperCase() === code);
    if (!coupon) {
      Alert.alert("Coupon not found", "Enter a valid coupon from Darji offers.");
      return;
    }
    const unavailableReason = couponUnavailableReason(coupon, subtotal);
    if (unavailableReason) {
      Alert.alert("Coupon not applicable", unavailableReason);
      return;
    }
    setAppliedCoupon(coupon);
    setCouponInput(code);
  }

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

        <View style={[styles.whiteCard, styles.checkoutSummaryCard]}>
          <View style={styles.checkoutSummaryHeader}>
            <View style={styles.checkoutSummaryHeaderIcon}>
              <Ionicons name="receipt-outline" size={19} color={BRAND_ORANGE} />
            </View>
            <View style={styles.checkoutSummaryTitleBlock}>
              <Text style={styles.cardLabel}>ORDER SUMMARY</Text>
              <Text style={styles.checkoutSummarySubtitle} numberOfLines={2}>{clothingItemSummary(orderItems[0] ?? draftToClothingItem(draft, "active-item"))}</Text>
            </View>
          </View>
          <View style={styles.checkoutSummaryStats}>
            <View style={[styles.checkoutSummaryStat, styles.checkoutSummaryStatWarm]}>
              <Text style={styles.checkoutSummaryStatLabel}>Items</Text>
              <Text style={styles.checkoutSummaryStatValue}>{itemCount}</Text>
            </View>
            <View style={[styles.checkoutSummaryStat, styles.checkoutSummaryStatCool]}>
              <Text style={styles.checkoutSummaryStatLabel}>Urgency</Text>
              <Text style={styles.checkoutSummaryStatValue} numberOfLines={1}>{draft.urgency ?? "Normal"}</Text>
            </View>
          </View>
          <View style={[styles.checkoutInfoBand, styles.checkoutEtaBand]}>
            <View style={styles.checkoutBandIcon}>
              <Ionicons name="time-outline" size={18} color="#7c3aed" />
            </View>
            <View style={styles.checkoutBandText}>
              <Text style={styles.checkoutBandLabel}>Estimated Time</Text>
              <Text style={styles.checkoutEtaValue}>{quote.eta}</Text>
            </View>
          </View>
          <View style={[styles.checkoutInfoBand, styles.checkoutPickupBand]}>
            <View style={styles.checkoutBandIcon}>
              <Ionicons name="calendar-outline" size={18} color="#047857" />
            </View>
            <View style={styles.checkoutBandText}>
              <Text style={styles.checkoutBandLabel}>Pickup Slot</Text>
              <Text style={styles.checkoutPickupValue}>Today, 2:00 - 4:00 PM</Text>
            </View>
          </View>
          <View style={styles.checkoutPriceBox}>
            <SummaryRow label="Tailor quote" value={`Rs${tailoringTotal}`} tone="positive" />
            <SummaryRow label="Delivery" value={`Rs${deliveryFee}`} tone="positive" />
            <SummaryRow label="Platform fee" value={`Rs${PLATFORM_FEE}`} tone="positive" />
            {homeMeasurementFee ? <SummaryRow label="Tailor measurement visit" value={`Rs${homeMeasurementFee}`} tone="positive" /> : null}
            {discount > 0 ? <SummaryRow label={`Coupon ${appliedCoupon?.code}`} value={`-Rs${discount}`} tone="negative" /> : null}
            <View style={styles.summaryDivider} />
            <SummaryRow label="Total" value={`Rs${total}`} strong />
          </View>
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>CLOTHING ITEMS</Text>
          <Text style={styles.mutedSmall}>Review every garment included in this quote before accepting it.</Text>
          {orderItems.map((item, index) => (
            <View key={item.id} style={styles.checkoutItemCard}>
              <Text style={styles.addressTitle}>Item {index + 1}: {clothingItemTitle(item)}</Text>
              <Text style={styles.mutedSmall}>{[item.gender, item.workType, item.description].filter(Boolean).join(" • ")}</Text>
            </View>
          ))}
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>COUPONS</Text>
          {coupons.length ? (
            coupons.map((coupon) => {
              const unavailableReason = couponUnavailableReason(coupon, subtotal);
              const isApplied = appliedCoupon?.code.toUpperCase() === coupon.code.toUpperCase();
              return (
                <Pressable
                  key={coupon.code}
                  style={[styles.couponCardV2, unavailableReason && styles.inactiveCoupon, isApplied && styles.couponCardApplied]}
                  onPress={() => applyCoupon(coupon.code)}
                  disabled={Boolean(unavailableReason)}
                >
                  <View style={styles.couponTopRow}>
                    <View style={styles.couponTextBlock}>
                      <Text style={styles.couponCode}>{coupon.code}</Text>
                      <Text style={styles.couponValueText}>{couponDiscountLabel(coupon)}</Text>
                      <Text style={styles.couponDescriptionText}>{coupon.description || "Darji tailoring offer"}</Text>
                      <Text style={styles.infoCopy}>Minimum order Rs{Number(coupon.minOrderValue ?? 0).toFixed(0)} - {couponExpiryLabel(coupon)}</Text>
                    </View>
                    <Text style={[styles.couponActionPill, unavailableReason && styles.inactivePill, isApplied && styles.appliedCouponPill]}>
                      {isApplied ? "Applied" : unavailableReason || "Apply"}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.mutedSmall}>No coupon offers are available right now.</Text>
          )}
          <View style={styles.couponApplyRow}>
            <TextInput style={styles.couponInput} value={couponInput} autoCapitalize="characters" onChangeText={(value) => { setCouponInput(value); if (appliedCoupon) setAppliedCoupon(undefined); }} placeholder="Enter coupon code" placeholderTextColor="#667085" />
            <Pressable style={styles.couponApplyButton} onPress={() => applyCoupon()}>
              <Text style={styles.couponCopyText}>Apply</Text>
            </Pressable>
          </View>
          {appliedCoupon ? <Text style={styles.discountText}>Saved Rs{discount} with {appliedCoupon.code}</Text> : null}
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

        <Pressable style={[styles.primaryWideButton, isPlacingOrder && styles.buttonDisabled]} onPress={() => onPlaceOrder(payment, { couponCode: appliedCoupon?.code, totalAmount: total })} disabled={isPlacingOrder}>
          {isPlacingOrder ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <Text style={styles.primaryWideButtonText}>{buttonLabel}</Text>
          )}
        </Pressable>
      </ScrollView>
      {quote.backendRequestId && onDeleteRequest && !isPlacingOrder ? (
        <View style={styles.checkoutDeleteWrap}>
          <Pressable style={styles.cancelOrderButton} onPress={onDeleteRequest}>
            <Ionicons name="trash-outline" size={18} color="#c24141" />
            <Text style={styles.cancelOrderText}>Delete Request</Text>
          </Pressable>
        </View>
      ) : null}
      {isPlacingOrder ? (
        <View style={styles.checkoutBlockingOverlay}>
          <View style={styles.checkoutBlockingCard}>
            <ActivityIndicator color={BRAND_ORANGE} size="large" />
            <Text style={styles.checkoutBlockingTitle}>Processing checkout</Text>
            <Text style={styles.checkoutBlockingCopy}>Please wait. Do not close the app or tap again.</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "positive" | "negative" }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, tone === "positive" && styles.summaryPositive, tone === "negative" && styles.summaryNegative, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

function razorpayFailureMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Razorpay could not complete the payment. Please try again.";
  const failure = error as RazorpayFailurePayload;
  const details = [failure.description, failure.reason, failure.step].filter(Boolean);
  return details.length > 0 ? details.join("\n") : "Razorpay could not complete the payment. Please try again.";
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
          <SummaryRow label="Delivery" value={`Rs${order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)}`} tone="positive" />
          <SummaryRow label="Platform fee" value={`Rs${order.platformFee ?? PLATFORM_FEE}`} tone="positive" />
          {order.cancellationFee ? <SummaryRow label="Cancellation fee" value={`Rs${order.cancellationFee}`} tone="negative" /> : null}
          {order.draft.sampleProvided ? <SummaryRow label="Sample reference" value={order.draft.sampleMedia || order.draft.uploadedSampleMedia ? "Photo added" : "With pickup"} /> : null}
          {order.homeMeasurementFee || order.draft.homeMeasurementBooked ? <SummaryRow label="Tailor measurement visit" value={`Rs${order.homeMeasurementFee ?? HOME_MEASUREMENT_FEE}`} tone="positive" /> : null}
          {order.discountAmount ? <SummaryRow label={`Coupon ${order.couponCode ?? ""}`.trim()} value={`-Rs${order.discountAmount}`} tone="negative" /> : null}
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
  onDeleteAccount,
  settings
}: {
  setScreen: (screen: Screen) => void;
  orders: CustomerOrder[];
  profile: ProfileData;
  addresses: SavedAddress[];
  onDeleteAccount: () => void;
  settings: AppSettings;
}) {
  const { user, signOut } = useAppStore();
  const profileStyles = createStyles(settings.darkMode);

  return (
    <SafeAreaView style={profileStyles.safe}>
      <ScrollView contentContainerStyle={profileStyles.pageContent}>
        <Header title="Profile" />
        <View style={profileStyles.profileHero}>
          {profile.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={profileStyles.profileAvatarImage} />
          ) : (
            <View style={profileStyles.profileAvatar}>
              <Text style={profileStyles.profileAvatarText}>{initialsFor(profile.name)}</Text>
            </View>
          )}
          <View style={profileStyles.profileInfo}>
            <Text style={profileStyles.profileName}>{profile.name}</Text>
            <Text style={profileStyles.profilePhone}>+91 {user?.phone ?? profile.phone}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>ACCOUNT</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="person-outline" label="Edit Profile" value="Name, Date of Birth" onPress={() => setScreen("editProfile")} styles={profileStyles} noBorder />
          <ProfileRow icon="location-outline" label="Saved Addresses" value={`${addresses.length} saved`} onPress={() => setScreen("savedAddresses")} styles={profileStyles} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>ORDERS</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="cube-outline" label="Order History" value="View active and past orders" onPress={() => setScreen("orders")} styles={profileStyles} noBorder />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>PREFERENCES</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="notifications-outline" label="Notifications" value="Configure order alerts & promos" onPress={() => setScreen("settings")} styles={profileStyles} noBorder />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>SUPPORT</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="help-circle-outline" label="Help Center" value="FAQs & workflows" onPress={() => setScreen("helpCenter")} styles={profileStyles} noBorder />
          <ProfileRow icon="call-outline" label="Contact Support" value="Chat with support team" onPress={() => setScreen("contactSupport")} styles={profileStyles} />
          <ProfileRow icon="bug-outline" label="Report a Bug" value="Submit an application bug report" onPress={() => setScreen("reportBug")} styles={profileStyles} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>POLICIES & INFORMATION</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="close-circle-outline" label="Cancellation Policy" value="Refund and cancellation rules" onPress={() => setScreen("cancellationPolicy")} styles={profileStyles} noBorder />
          <ProfileRow icon="information-circle-outline" label="About Darji" value="Who we are & how it works" onPress={() => setScreen("aboutDarji")} styles={profileStyles} />
          <ProfileRow icon="shield-checkmark-outline" label="Privacy Policy" value="Read privacy policy" onPress={() => setScreen("privacyPolicy")} styles={profileStyles} />
          <ProfileRow icon="document-text-outline" label="Terms of Use" value="Read terms of service" onPress={() => setScreen("termsService")} styles={profileStyles} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>APP</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <View style={[profileStyles.profileRow, { borderTopWidth: 0 }]}>
            <View style={profileStyles.profileRowIcon}>
              <Ionicons name="phone-portrait-outline" size={18} color={BRAND_ORANGE} />
            </View>
            <View style={profileStyles.profileRowText}>
              <Text style={profileStyles.addressTitle}>App Version</Text>
              <Text style={profileStyles.mutedSmall}>0.1.0 (Development)</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>ACCOUNT SETTINGS</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="trash-outline" label="Delete Account" value="Permanently remove account" onPress={onDeleteAccount} danger styles={profileStyles} noBorder />
          <ProfileRow icon="log-out-outline" label="Logout" value="Sign out of your account" onPress={signOut} styles={profileStyles} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  onPress,
  danger,
  styles: propStyles,
  noBorder
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  danger?: boolean;
  styles?: any;
  noBorder?: boolean;
}) {
  const currentStyles = propStyles || styles;
  return (
    <Pressable style={[currentStyles.profileRow, noBorder ? { borderTopWidth: 0 } : null]} onPress={onPress}>
      <View style={currentStyles.profileRowIcon}>
        <Ionicons name={icon} size={18} color={danger ? "#dc2626" : BRAND_ORANGE} />
      </View>
      <View style={currentStyles.profileRowText}>
        <Text style={[currentStyles.addressTitle, danger ? { color: "#dc2626" } : null]}>{label}</Text>
        <Text style={currentStyles.mutedSmall}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? "#dc2626" : "#6b7890"} />
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
        <Header title="Notifications" onBack={() => setScreen("profile")} />
        <View style={styles.whiteCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
            <Text style={[styles.cardLabel, { color: BRAND_ORANGE, marginBottom: 0, fontWeight: "900", letterSpacing: 0.5 }]}>NOTIFICATIONS</Text>
          </View>
          <SettingRow icon="notifications-outline" label="Push notifications" value="Order alerts and offers" enabled={settings.notifications} onPress={() => toggle("notifications")} />
          <SettingRow icon="cube-outline" label="Order updates" value="Pickup, quote and delivery alerts" enabled={settings.orderUpdates} onPress={() => toggle("orderUpdates")} />
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

function TransactionHistoryScreen({ setScreen, orders }: { setScreen: (screen: Screen) => void; orders: CustomerOrder[] }) {
  const entries = [...orders]
    .filter((order) => Boolean(order.backendOrderId))
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  return (
    <ProfileSubPage title="Transaction History" setScreen={setScreen}>
      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={34} color={BRAND_ORANGE} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.helperText}>Completed, pending, and cancelled payment activity will show here.</Text>
        </View>
      ) : null}
      {entries.map((order) => (
        <View key={order.id} style={styles.whiteCard}>
          <View style={styles.rowBetween}>
            <View style={styles.orderTitleBlock}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <Text style={styles.orderService}>{order.draft.workType ?? "Tailoring"} - {order.draft.clothType ?? "Cloth"}</Text>
            </View>
            <Text style={styles.orderPrice}>Rs{order.total}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <InfoRow label="Payment Method" value={order.paymentMethod.toUpperCase()} />
          <InfoRow label="Payment Status" value={order.paymentStatus ?? (order.paymentMethod.toUpperCase() === "COD" ? "PENDING" : "PAID")} />
          <InfoRow label="Order Status" value={order.status} />
          <InfoRow label="Placed" value={new Date(order.placedAt).toLocaleString("en-IN")} />
        </View>
      ))}
    </ProfileSubPage>
  );
}

function CouponsScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const coupons = [
    { code: "ADMIN", text: "Open the active coupon section for current offers", active: true }
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

function hasUnreadMessages(ticketOrBug: any): boolean {
  if (!ticketOrBug) return false;
  if (ticketOrBug.messages && ticketOrBug.messages.length > 0) {
    return ticketOrBug.messages.some((msg: any) => (msg.sender === "admin" || msg.sender === "system") && !msg.read);
  }
  return false;
}

function ContactSupportScreen({ setScreen, isBugReport, isDark, orders, socket }: { setScreen: (screen: Screen) => void; isBugReport?: boolean; isDark?: boolean; orders: any[]; socket: any }) {
  const token = useAppStore((state) => state.token);
  const [view, setView] = useState<"center" | "chat" | "new_chat" | "bug">(isBugReport ? "bug" : "center");
  const [tickets, setTickets] = useState<any[]>([]);
  const [bugReports, setBugReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New ticket form
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Bug report form
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugScreenshot, setBugScreenshot] = useState<string | null>(null);

  // Active chat
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const bg = isDark ? "#000000" : "#f7faff";
  const cardBg = isDark ? "#121212" : "#ffffff";
  const border = isDark ? "#222222" : "#dce2ea";
  const text = isDark ? "#ffffff" : "#0b2241";
  const mutedText = isDark ? "#94a3b8" : "#65748a";

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

  useEffect(() => {
    loadTickets();
    loadBugReports();
  }, [loadTickets, loadBugReports]);

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

  function checkActiveTicketAndNavigate() {
    const active = tickets.find((t) => ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "WAITING_FOR_ADMIN", "IN_REVIEW"].includes(t.status));
    if (active) {
      setActiveTicket(active);
      setView("chat");
    } else {
      setView("new_chat");
    }
  }

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
      const uploaded = await uploadMedia([{ uri: asset.uri, type: "image", name: asset.fileName || "attachment.jpg" }], token);
      if (uploaded.length) {
        setAttachments((prev) => [...prev, uploaded[0].url]);
      }
    } catch (e) {
      Alert.alert("Upload failed", "Could not upload the attachment.");
    } finally {
      setUploading(false);
    }
  }

  async function pickBugScreenshot() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload screenshots.");
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
      const uploaded = await uploadMedia([{ uri: asset.uri, type: "image", name: asset.fileName || "screenshot.jpg" }], token);
      if (uploaded.length) {
        setBugScreenshot(uploaded[0].url);
      }
    } catch (e) {
      Alert.alert("Upload failed", "Could not upload the screenshot.");
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
      setView("center");
    } catch (e) {
      Alert.alert("Failed", "Could not submit bug report.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 12 : 12 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {view === "center" && (
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
            <Header title="Support Center" onBack={() => setScreen("profile")} />
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

              {/* Open Tickets Section */}
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2 }} />
                  <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Open Tickets ({tickets.filter(t => ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "WAITING_FOR_ADMIN", "IN_REVIEW"].includes(t.status)).length})
                  </Text>
                </View>
                {tickets.filter(t => ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "WAITING_FOR_ADMIN", "IN_REVIEW"].includes(t.status)).length === 0 ? (
                  <View style={{ backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: border, padding: 18, alignItems: "center" }}>
                    <Text style={{ color: mutedText, fontSize: 12, fontWeight: "600" }}>No active support requests</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {tickets.filter(t => ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "WAITING_FOR_ADMIN", "IN_REVIEW"].includes(t.status)).reverse().map((t) => (
                      <Pressable 
                        key={t._id || t.id}
                        style={{ backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: border, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                        onPress={() => {
                          setActiveTicket(t);
                          setView("chat");
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ color: text, fontSize: 14, fontWeight: "800" }}>#{t._id?.slice(-6).toUpperCase() || t.id.slice(-6).toUpperCase()}</Text>
                            <View style={{ backgroundColor: "#fff9db", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: "#b58700", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>{t.status}</Text>
                            </View>
                            {hasUnreadMessages(t) && (
                              <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900", textTransform: "uppercase" }}>New</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: mutedText, fontSize: 11, fontWeight: "700", marginTop: 4 }}>Category: {t.subject}</Text>
                          <Text style={{ color: text, fontSize: 13, fontWeight: "600", marginTop: 6 }} numberOfLines={1}>
                            {t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].text : t.message}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={mutedText} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Resolved Tickets Section */}
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 4, height: 16, backgroundColor: mutedText, borderRadius: 2 }} />
                  <Text style={{ color: mutedText, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Resolved Tickets ({tickets.filter(t => ["RESOLVED", "CLOSED"].includes(t.status)).length})
                  </Text>
                </View>
                {tickets.filter(t => ["RESOLVED", "CLOSED"].includes(t.status)).length === 0 ? (
                  <View style={{ backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: border, padding: 18, alignItems: "center" }}>
                    <Text style={{ color: mutedText, fontSize: 12, fontWeight: "600" }}>No resolved support requests</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {tickets.filter(t => ["RESOLVED", "CLOSED"].includes(t.status)).reverse().map((t) => (
                      <Pressable 
                        key={t._id || t.id}
                        style={{ backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: border, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: 0.8 }}
                        onPress={() => {
                          setActiveTicket(t);
                          setView("chat");
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ color: text, fontSize: 14, fontWeight: "800" }}>#{t._id?.slice(-6).toUpperCase() || t.id.slice(-6).toUpperCase()}</Text>
                            <View style={{ backgroundColor: t.status === "CLOSED" ? "#e2e8f0" : "#dcfce7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: t.status === "CLOSED" ? "#64748b" : "#166534", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>{t.status}</Text>
                            </View>
                          </View>
                          <Text style={{ color: mutedText, fontSize: 11, fontWeight: "700", marginTop: 4 }}>Category: {t.subject}</Text>
                          <Text style={{ color: text, fontSize: 13, fontWeight: "600", marginTop: 6 }} numberOfLines={1}>
                            {t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].text : t.message}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={mutedText} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Bug Reports Section */}
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 4, height: 16, backgroundColor: "#ef4444", borderRadius: 2 }} />
                  <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Bug Reports ({bugReports.length})
                  </Text>
                </View>
                {bugReports.length === 0 ? (
                  <View style={{ backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: border, padding: 18, alignItems: "center" }}>
                    <Text style={{ color: mutedText, fontSize: 12, fontWeight: "600" }}>No bug reports submitted</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {[...bugReports].reverse().map((b) => (
                      <Pressable 
                        key={b._id || b.id}
                        style={{ backgroundColor: cardBg, borderRadius: 18, borderWidth: 1, borderColor: border, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                        onPress={() => {
                          setActiveTicket(b);
                          setView("chat");
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ color: text, fontSize: 14, fontWeight: "800" }}>Bug: {b.title}</Text>
                            <View style={{ backgroundColor: b.status === "CLOSED" || b.status === "FIXED" ? "#e2e8f0" : "#fee2e2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: b.status === "CLOSED" || b.status === "FIXED" ? "#64748b" : "#dc2626", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>{b.status}</Text>
                            </View>
                            {hasUnreadMessages(b) && (
                              <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900", textTransform: "uppercase" }}>New</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: mutedText, fontSize: 11, fontWeight: "700", marginTop: 4 }}>Device: {b.deviceInfo}</Text>
                          <Text style={{ color: text, fontSize: 13, fontWeight: "600", marginTop: 6 }} numberOfLines={1}>
                            {b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1].text : b.description}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={mutedText} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

            </ScrollView>
          </View>
        )}

        {view === "new_chat" && (
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
            <Header title="Start Conversation" onBack={() => setView("center")} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              {/* Linked order selector */}
              <View>
                <Text style={{ color: text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Select Related Order (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  <Pressable 
                    style={{ minWidth: 100, height: 64, borderRadius: 14, borderWidth: 1, borderColor: !selectedOrder ? BRAND_ORANGE : border, backgroundColor: !selectedOrder ? (isDark ? "#2c2010" : "#fff5df") : cardBg, padding: 10, justifyContent: "center" }}
                    onPress={() => setSelectedOrder(null)}
                  >
                    <Text style={{ color: !selectedOrder ? BRAND_ORANGE : text, fontSize: 12, fontWeight: "800", textAlign: "center" }}>No Linked Order</Text>
                  </Pressable>
                  {orders.map((o) => {
                    const isSelected = selectedOrder && (selectedOrder._id || selectedOrder.id) === (o._id || o.id);
                    return (
                      <Pressable 
                        key={o._id || o.id}
                        style={{ minWidth: 120, height: 64, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? BRAND_ORANGE : border, backgroundColor: isSelected ? (isDark ? "#2c2010" : "#fff5df") : cardBg, padding: 10, justifyContent: "center" }}
                        onPress={() => setSelectedOrder(o)}
                      >
                        <Text style={{ color: isSelected ? BRAND_ORANGE : text, fontSize: 12, fontWeight: "800" }}>#{o.orderNumber || o.id.slice(-6).toUpperCase()}</Text>
                        <Text style={{ color: mutedText, fontSize: 10, fontWeight: "700", marginTop: 2 }}>{o.status.replace(/_/g, " ")}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              {/* Category Grid */}
              <View>
                <Text style={{ color: text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Select Help Category</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { label: "Order Delay", icon: "time-outline" },
                    { label: "Pickup Issue", icon: "cube-outline" },
                    { label: "Tailor Issue", icon: "cut-outline" },
                    { label: "Payment Issue", icon: "card-outline" },
                    { label: "Refund Request", icon: "cash-outline" },
                    { label: "Other Issue", icon: "help-circle-outline" }
                  ].map((cat) => {
                    const isSel = selectedCategory === cat.label;
                    return (
                      <Pressable 
                        key={cat.label}
                        style={{ width: "48%", height: 72, borderRadius: 14, borderWidth: 1, borderColor: isSel ? BRAND_ORANGE : border, backgroundColor: cardBg, alignItems: "center", justifyContent: "center", gap: 6 }}
                        onPress={() => setSelectedCategory(cat.label)}
                      >
                        <Ionicons name={cat.icon as any} size={20} color={isSel ? BRAND_ORANGE : mutedText} />
                        <Text style={{ color: isSel ? BRAND_ORANGE : text, fontSize: 12, fontWeight: "800" }}>{cat.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Attachments */}
              <View>
                <Text style={{ color: text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Attach Image Reference (Optional)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <Pressable 
                    style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", backgroundColor: cardBg }}
                    onPress={pickAttachmentImage}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color={BRAND_ORANGE} />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={20} color={BRAND_ORANGE} />
                        <Text style={{ color: BRAND_ORANGE, fontSize: 10, fontWeight: "800", marginTop: 4 }}>Add Photo</Text>
                      </>
                    )}
                  </Pressable>
                  {attachments.map((url, index) => (
                    <View key={url} style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: "hidden" }}>
                      <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} />
                      <Pressable 
                        style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}
                        onPress={() => setAttachments((prev) => prev.filter((_, idx) => idx !== index))}
                      >
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
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
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
            {/* Chat header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: border, paddingBottom: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <Pressable 
                  style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center" }}
                  onPress={() => {
                    setActiveTicket(null);
                    setView("center");
                  }}
                >
                  <Ionicons name="chevron-back" size={20} color={text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: text, fontSize: 15, fontWeight: "800" }}>
                    {activeTicket.isDraft ? "Draft Conversation" : (activeTicket.deviceInfo ? `Bug: ${activeTicket.title}` : `#${(activeTicket._id || activeTicket.id || "").slice(-6).toUpperCase()}`)}
                  </Text>
                  <Text style={{ color: mutedText, fontSize: 11, fontWeight: "700" }}>
                    {activeTicket.deviceInfo ? `Status: ${activeTicket.status}` : activeTicket.subject}
                  </Text>
                </View>
              </View>
              
              {/* Close Ticket action */}
              {!activeTicket.isDraft && !activeTicket.deviceInfo && activeTicket.status !== "CLOSED" && activeTicket.status !== "RESOLVED" && (
                <Pressable 
                  style={{ backgroundColor: "#fee2e2", borderColor: "#fecaca", paddingHorizontal: 12, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
                  onPress={() => handleCloseChat(activeTicket._id || activeTicket.id)}
                >
                  <Text style={{ color: "#dc2626", fontSize: 11, fontWeight: "900" }}>Close Chat</Text>
                </Pressable>
              )}
            </View>

            {/* Bubble thread */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1, marginBottom: 8 }}
              contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {activeTicket.isDraft && (
                <View style={{ alignSelf: "center", backgroundColor: isDark ? "#222" : "#e2e8f0", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginVertical: 8 }}>
                  <Text style={{ color: mutedText, fontSize: 12, fontWeight: "800", textAlign: "center" }}>
                    No messages yet. Type your first message below to open this support ticket.
                  </Text>
                </View>
              )}

              {/* Render legacy single message if no messages array is present (compatibility) */}
              {!activeTicket.messages || activeTicket.messages.length === 0 ? (
                !activeTicket.isDraft && (
                  <View style={{ gap: 6 }}>
                    <View style={{ alignSelf: "flex-end", maxWidth: "80%", backgroundColor: BRAND_ORANGE, borderRadius: 16, borderBottomRightRadius: 2, padding: 12 }}>
                      <Text style={{ color: "#000000", fontWeight: "900", fontSize: 10, textTransform: "uppercase", marginBottom: 2, opacity: 0.6 }}>You</Text>
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
                      <View style={{ alignSelf: "flex-start", maxWidth: "80%", backgroundColor: isDark ? "#1e293b" : "#f1f5f9", borderWidth: 1, borderColor: border, borderRadius: 16, borderBottomLeftRadius: 2, padding: 12 }}>
                        <Text style={{ color: BRAND_ORANGE, fontWeight: "900", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Darji Support</Text>
                        <Text style={{ color: text, fontSize: 14, fontWeight: "700" }}>{activeTicket.adminResponse}</Text>
                        <Text style={{ color: mutedText, fontSize: 9, marginTop: 4, opacity: 0.7 }}>
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
                      <View key={idx} style={{ alignSelf: "center", backgroundColor: isDark ? "#222" : "#e2e8f0", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginVertical: 4 }}>
                        <Text style={{ color: mutedText, fontSize: 11, fontWeight: "800", textAlign: "center" }}>{msg.text}</Text>
                      </View>
                    );
                  }

                  return (
                    <View key={idx} style={{ alignSelf: isClient ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: isClient ? BRAND_ORANGE : (isDark ? "#1e293b" : "#f1f5f9"), borderWidth: isClient ? 0 : 1, borderColor: border, borderRadius: 16, borderBottomRightRadius: isClient ? 2 : 16, borderBottomLeftRadius: isClient ? 16 : 2, padding: 12, marginVertical: 2 }}>
                      <Text style={{ color: isClient ? "#000000" : BRAND_ORANGE, fontWeight: "900", fontSize: 10, textTransform: "uppercase", marginBottom: 2, opacity: isClient ? 0.6 : 1 }}>
                        {isClient ? "You" : "Darji Support"}
                      </Text>
                      <Text style={{ color: isClient ? "#000000" : text, fontSize: 14, fontWeight: "700" }}>{msg.text}</Text>
                      
                      {msg.attachments && msg.attachments.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {msg.attachments.map((url: string) => (
                            <Image key={url} source={{ uri: url }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                          ))}
                        </View>
                      )}

                      <Text style={{ color: isClient ? "rgba(0,0,0,0.5)" : mutedText, fontSize: 9, textAlign: "right", marginTop: 4 }}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Composer/Input bar */}
            {activeTicket.status !== "CLOSED" && activeTicket.status !== "RESOLVED" && activeTicket.status !== "FIXED" ? (
              <View style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 10, paddingBottom: 16 }}>
                {attachments.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 8, paddingVertical: 8 }}>
                    {attachments.map((url, idx) => (
                      <View key={url} style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: border }}>
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pressable onPress={pickAttachmentImage} style={{ padding: 8 }}>
                    <Ionicons name="attach-outline" size={24} color={BRAND_ORANGE} />
                  </Pressable>
                  <TextInput
                    style={{ flex: 1, minHeight: 46, maxHeight: 100, backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 23, paddingHorizontal: 16, color: text, fontSize: 14, fontWeight: "700" }}
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    placeholder="Type a message..."
                    placeholderTextColor={mutedText}
                    multiline
                  />
                  <Pressable 
                    style={[{ width: 46, height: 46, borderRadius: 23, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" }, (chatMessage.trim().length < 2 || sending) ? { opacity: 0.6 } : null]}
                    disabled={chatMessage.trim().length < 2 || sending}
                    onPress={handleSendReply}
                  >
                    {sending ? <ActivityIndicator size="small" color="#111111" /> : <Ionicons name="send" size={18} color="#111111" />}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 16, gap: 10 }}>
                <Text style={{ color: mutedText, fontSize: 13, fontWeight: "800", textAlign: "center" }}>This ticket is resolved or closed.</Text>
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

        {view === "bug" && (
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
            <Header title="Report a Bug" onBack={() => setScreen("profile")} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              <Text style={{ color: mutedText, fontSize: 13, fontWeight: "600" }}>Describe any glitches, slow load times, or layout bugs directly to our dev team.</Text>
              
              {/* Bug Title */}
              <View>
                <Text style={{ color: text, fontSize: 14, fontWeight: "800", marginBottom: 6 }}>Bug Title</Text>
                <TextInput
                  style={{ height: 50, backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: border, paddingHorizontal: 14, color: text, fontSize: 14, fontWeight: "700" }}
                  value={bugTitle}
                  onChangeText={setBugTitle}
                  placeholder="Short summary (e.g. Orders page crash)..."
                  placeholderTextColor={mutedText}
                />
              </View>

              {/* Bug Description */}
              <View>
                <Text style={{ color: text, fontSize: 14, fontWeight: "800", marginBottom: 6 }}>Detailed Description</Text>
                <TextInput
                  style={{ minHeight: 90, backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 12, color: text, fontSize: 14, fontWeight: "600" }}
                  value={bugDescription}
                  onChangeText={setBugDescription}
                  placeholder="Explain exactly how to trigger the bug..."
                  placeholderTextColor={mutedText}
                  multiline
                />
              </View>

              {/* Bug screenshot */}
              <View>
                <Text style={{ color: text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Screenshot Reference</Text>
                {bugScreenshot ? (
                  <View style={{ width: 140, height: 140, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: "hidden" }}>
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
                    style={{ width: "100%", height: 60, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", backgroundColor: cardBg, flexDirection: "row", gap: 8 }}
                    onPress={pickBugScreenshot}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color={BRAND_ORANGE} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={20} color={BRAND_ORANGE} />
                        <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" }}>Upload Screenshot</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>

              {/* Readonly info */}
              <View style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: mutedText, fontSize: 11, fontWeight: "800" }}>Device Info</Text>
                  <Text style={{ color: text, fontSize: 11, fontWeight: "800" }}>{Platform.OS} {Platform.Version}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: border, paddingTop: 6, marginTop: 4 }}>
                  <Text style={{ color: mutedText, fontSize: 11, fontWeight: "800" }}>App Version</Text>
                  <Text style={{ color: text, fontSize: 11, fontWeight: "800" }}>0.1.0 (Dev Build)</Text>
                </View>
              </View>

              <Pressable 
                android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
                style={({ pressed }) => [
                  { backgroundColor: BRAND_ORANGE, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 },
                  (bugTitle.trim().length < 3 || bugDescription.trim().length < 10 || sending) ? { opacity: 0.6 } : (pressed ? { opacity: 0.8 } : { opacity: 1.0 })
                ]}
                disabled={bugTitle.trim().length < 3 || bugDescription.trim().length < 10 || sending}
                onPress={handleSubmitBug}
              >
                {sending ? <ActivityIndicator color="#111111" /> : <Text style={{ color: "#111111", fontSize: 14, fontWeight: "900" }}>Submit Bug Report</Text>}
              </Pressable>
            </ScrollView>
          </View>
        )}
        {loading && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center", zIndex: 9999 }]}>
            <ActivityIndicator size="large" color={BRAND_ORANGE} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CustomerStoriesScreen({ setScreen, stories }: { setScreen: (screen: Screen) => void; stories: CustomerStory[] }) {
  return (
    <ProfileSubPage title="Customer Stories" setScreen={setScreen} backScreen="home">
      {stories.length ? stories.map((story) => (
        <View key={story.id} style={styles.storyListCard}>
          <View style={styles.storyFooter}>
            <View style={styles.storyAvatar}>
              <Text style={styles.storyAvatarText}>{initialsFor(story.name)}</Text>
            </View>
            <View style={styles.profileRowText}>
              <Text style={styles.storyName}>{story.name}</Text>
              <Text style={styles.mutedSmall}>{story.location}</Text>
            </View>
            <View style={styles.storyRating}>
              <Ionicons name="star" size={13} color={BRAND_ORANGE} />
              <Text style={styles.storyRatingText}>{story.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.storyListText}>{story.review}</Text>
        </View>
      )) : (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={34} color={BRAND_ORANGE} />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.helperText}>Customer stories will appear here after ratings are submitted.</Text>
        </View>
      )}
    </ProfileSubPage>
  );
}

function RateAppScreen({ onSave, setScreen, orders }: { onSave: (rating: number, review: string) => void; setScreen: (screen: Screen) => void; orders: CustomerOrder[] }) {
  const token = useAppStore((state) => state.token);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [photos, setPhotos] = useState<LocalMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const latestOrder = [...orders]
    .filter((order) => order.status === "Delivered")
    .sort((a, b) => parseDateSafe(b.placedAt).getTime() - parseDateSafe(a.placedAt).getTime())[0] ?? orders[0];

  async function pickReviewPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add review photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
      allowsMultipleSelection: true
    });
    if (result.canceled) return;
    const nextPhotos = result.assets.slice(0, 4).map((asset, index) => ({
      uri: asset.uri,
      type: "image" as const,
      name: asset.fileName ?? `review-${Date.now()}-${index}.jpg`,
      size: asset.fileSize
    }));
    setPhotos((current) => [...current, ...nextPhotos].slice(0, 4));
  }

  async function submit() {
    if (!review.trim()) {
      Alert.alert("Write a review", "Please share a short review so it can appear in customer stories.");
      return;
    }
    try {
      setSubmitting(true);
      if (token && latestOrder?.backendOrderId) {
        await api(
          "/reviews",
          {
            method: "POST",
            body: JSON.stringify({
              orderId: latestOrder.backendOrderId,
              rating,
              comment: review.trim()
            })
          },
          token
        ).catch(() => undefined);
      }
      onSave(rating, review.trim());
      Alert.alert("Saved", "Thanks for rating Darji.");
      setScreen("home");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProfileSubPage title="Rate & Review" setScreen={setScreen} backScreen="home">
      <View style={styles.rateHero}>
        <Ionicons name="thumbs-up-outline" size={34} color={BRAND_ORANGE} />
        <Text style={styles.profileName}>How was your experience?</Text>
        <Text style={styles.mutedSmall}>Your feedback helps us improve our service.</Text>
      </View>
      {latestOrder ? (
        <View style={styles.ratingCard}>
          <Text style={styles.cardLabel}>ORDER ID</Text>
          <Text style={styles.orderId}>{latestOrder.orderNumber}</Text>
          <Text style={styles.infoCopy}>{latestOrder.draft.workType ?? "Tailoring"} - {latestOrder.draft.clothType ?? "Cloth"}</Text>
          <Text style={styles.mutedSmall}>{formatInvoiceDate(new Date(latestOrder.placedAt))}</Text>
        </View>
      ) : null}
      <View style={styles.ratingCard}>
        <Text style={styles.profileName}>Rate your experience</Text>
        <View style={styles.starPicker}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Pressable key={item} onPress={() => setRating(item)}>
              <Ionicons name={item <= rating ? "star" : "star-outline"} size={34} color={BRAND_ORANGE} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.mutedSmall}>{rating >= 4 ? "Excellent" : rating === 3 ? "Good" : "Needs improvement"}</Text>
        <TextInput
          style={[styles.descriptionInput, styles.rateReviewInput]}
          value={review}
          onChangeText={setReview}
          multiline
          maxLength={500}
          placeholder="Share your experience with Darji..."
          placeholderTextColor="#98a4b6"
        />
        <Text style={styles.reviewCounter}>{review.length}/500</Text>
        <Text style={styles.formLabel}>Add Photos (Optional)</Text>
        <View style={styles.reviewPhotoRow}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.reviewPhotoBox}>
              <Image source={{ uri: photo.uri }} style={styles.reviewPhoto} />
              <Pressable style={styles.removePreview} onPress={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                <Ionicons name="close" size={12} color="#ffffff" />
              </Pressable>
            </View>
          ))}
          {photos.length < 4 ? (
            <Pressable style={styles.reviewPhotoAdd} onPress={pickReviewPhotos}>
              <Ionicons name="add" size={24} color={BRAND_DEEP} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Pressable style={[styles.primaryWideButton, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryWideButtonText}>Submit Review</Text>}
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

function AboutDarjiScreen({ setScreen, isDark }: { setScreen: (screen: Screen) => void; isDark: boolean }) {
  const profileStyles = createStyles(isDark);
  return (
    <ProfileSubPage title="About Darji" setScreen={setScreen} styles={profileStyles}>
      <View style={profileStyles.whiteCard}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={[profileStyles.cardLabel, { color: BRAND_ORANGE, marginBottom: 0, fontWeight: "900", letterSpacing: 0.5 }]}>OUR MISSION</Text>
        </View>
        <Text style={profileStyles.infoCopy}>
          Darji is a modern tailoring ecosystem designed to bring custom clothing to your doorstep. We connect you with expert local tailors, facilitate live fabric and measurements collection, and ensure perfect-fit garments are delivered directly back to you.
        </Text>
      </View>
      <View style={profileStyles.whiteCard}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={[profileStyles.cardLabel, { color: BRAND_ORANGE, marginBottom: 0, fontWeight: "900", letterSpacing: 0.5 }]}>HOW IT WORKS</Text>
        </View>
        <Text style={profileStyles.infoCopy}>
          • Request a Quote: Share pictures and measurements.{"\n"}
          • Receive Quotes: Local tailors offer prices and timelines.{"\n"}
          • Pickup & Stitching: Delivery partners collect fabric, and tailors craft your garment.{"\n"}
          • Handoff: Receive your custom garment at your door.
        </Text>
      </View>
    </ProfileSubPage>
  );
}

function ProfileSubPage({ title, setScreen, children, backScreen = "profile", styles: propStyles }: { title: string; setScreen: (screen: Screen) => void; children: React.ReactNode; backScreen?: Screen; styles?: any }) {
  const currentStyles = propStyles || styles;
  return (
    <SafeAreaView style={currentStyles.safe}>
      <ScrollView contentContainerStyle={currentStyles.pageContent}>
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

function formatOrderTimestamp(value?: string) {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
}

function pickupScheduleForOrder(order: CustomerOrder) {
  const pickedUpStatuses: CustomerOrder["status"][] = ["Picked Up", "Package Handover to Tailor", "Tailor Started", "Tailor Completed", "On the Way", "Delivered"];
  return {
    date: formatInvoiceDate(new Date(order.placedAt)),
    timeSlot: order.pickupWindow,
    status: order.status === "Cancelled" ? "Cancelled" : pickedUpStatuses.includes(order.status) ? "Completed" : "Scheduled"
  };
}

function estimatedTimeForOrder(order: CustomerOrder) {
  return {
    pickup: order.pickupWindow,
    delivery: order.tailor.eta || "Awaiting tailor ETA",
    status: order.status,
    lastUpdated: formatOrderTimestamp(order.invoiceGeneratedAt ?? order.placedAt)
  };
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
  const token = useAppStore((state) => state.token);
  const [expanded, setExpanded] = useState<string | undefined>();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void api<Coupon[]>("/coupons", {}, token)
      .then(setCoupons)
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function copyCoupon(code: string) {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied", `${code} copied to clipboard.`);
  }

  return (
    <ProfileSubPage title="Coupons" setScreen={setScreen}>
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={BRAND_ORANGE} />
          <Text style={styles.helperText}>Loading active coupons...</Text>
        </View>
      ) : null}
      {!loading && coupons.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="ticket-outline" size={34} color={BRAND_ORANGE} />
          <Text style={styles.emptyTitle}>No coupons right now</Text>
          <Text style={styles.helperText}>Active offers from admin will appear here.</Text>
        </View>
      ) : null}
      {coupons.map((coupon) => {
        const open = expanded === coupon.code;
        const inactiveReason = couponUnavailableReason(coupon, 0);
        const inactive = Boolean(inactiveReason);
        return (
          <Pressable key={coupon.code} style={[styles.couponCardV2, inactive && styles.inactiveCoupon]} onPress={() => setExpanded(open ? undefined : coupon.code)}>
            <View style={styles.couponTopRow}>
              <View style={styles.couponTextBlock}>
                <Text style={styles.couponCode}>{coupon.code}</Text>
                <Text style={styles.couponValueText}>{couponDiscountLabel(coupon)}</Text>
                <Text style={styles.infoCopy}>{coupon.description || "Darji tailoring offer"}</Text>
              </View>
              <View style={styles.couponActionRow}>
                {!inactive ? (
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
                <Text style={[styles.couponActionPill, inactive && styles.inactivePill]}>{inactiveReason ?? "Active"}</Text>
              </View>
            </View>
            {open ? (
              <View style={styles.couponDetails}>
                <Text style={styles.cardLabel}>DETAILS</Text>
                <Text style={styles.infoCopy}>Minimum order Rs{Number(coupon.minOrderValue ?? 0).toFixed(0)}. {couponExpiryLabel(coupon)}.</Text>
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
  onOpenOrder,
  setScreen
}: {
  orders: CustomerOrder[];
  onOpenOrder: (order: CustomerOrder) => void;
  setScreen: (screen: Screen) => void;
}) {
  const [activeTab, setActiveTab] = useState<"incomplete" | "active" | "history" | "cancelled">("incomplete");
  const incompleteOrders = orders.filter((order) => ["Pending", "Awaiting Payment"].includes(order.status));
  const activeOrders = orders.filter((order) => !["Pending", "Awaiting Payment", "Delivered", "Cancelled"].includes(order.status));
  const historyOrders = orders.filter((order) => order.status === "Delivered");
  const cancelledOrders = orders.filter((order) => order.status === "Cancelled");
  const tabs = [
    { key: "incomplete" as const, label: "Incomplete", items: incompleteOrders },
    { key: "active" as const, label: "Active", items: activeOrders },
    { key: "history" as const, label: "History", items: historyOrders },
    { key: "cancelled" as const, label: "Cancelled", items: cancelledOrders }
  ];
  const activeItems = tabs.find((tab) => tab.key === activeTab)?.items ?? incompleteOrders;
  const renderOrderCard = (order: CustomerOrder) => (
    <Pressable
      key={order.id}
      style={styles.orderCardV2}
      onPress={() => onOpenOrder(order)}
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
            <Text style={styles.mutedSmall} numberOfLines={2}>{order.status === "Cancelled" ? "Cancelled order" : `Pickup: ${order.pickupWindow}`}</Text>
          </View>
        </View>
        <Text style={styles.orderPrice}>Rs{order.total}</Text>
      </View>
    </Pressable>
  );

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
          <>
            <View style={styles.orderTabRow}>
              {tabs.map((tab) => (
                <Pressable key={tab.key} style={[styles.orderTabButton, activeTab === tab.key && styles.orderTabButtonActive]} onPress={() => setActiveTab(tab.key)}>
                  <Text style={[styles.orderTabText, activeTab === tab.key && styles.orderTabTextActive]}>{tab.label}</Text>
                  <Text style={[styles.orderTabCount, activeTab === tab.key && styles.orderTabTextActive]}>{tab.items.length}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.helperText}>
              {activeTab === "incomplete"
                ? "Requests waiting for quotes or payment."
                : activeTab === "active"
                  ? "Confirmed orders currently moving through pickup, tailoring, or delivery."
                  : activeTab === "history"
                    ? "Delivered orders and invoices."
                    : "Cancelled requests and orders."}
            </Text>
            {activeItems.length ? activeItems.map(renderOrderCard) : (
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={32} color={BRAND_ORANGE} />
                <Text style={styles.emptyTitle}>Nothing here</Text>
                <Text style={styles.helperText}>No {tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase()} orders yet.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <BottomTabs active="orders" setScreen={setScreen} />
    </SafeAreaView>
  );
}

function LegacyOrderDetailsScreenV2({
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
  const pickupSchedule = pickupScheduleForOrder(order);
  const estimatedTime = estimatedTimeForOrder(order);

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
          <Text style={styles.cardLabel}>PICKUP SCHEDULE</Text>
          <SummaryRow label="Date" value={pickupSchedule.date} />
          <SummaryRow label="Time Slot" value={pickupSchedule.timeSlot} />
          <SummaryRow label="Status" value={pickupSchedule.status} />
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>ESTIMATED TIME</Text>
          <SummaryRow label="Estimated Pickup Time" value={estimatedTime.pickup} />
          <SummaryRow label="Estimated Delivery Time" value={estimatedTime.delivery} />
          <SummaryRow label="Current Status" value={estimatedTime.status} />
          <SummaryRow label="Last Updated" value={estimatedTime.lastUpdated} />
        </View>
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>REQUEST SUMMARY</Text>
          <SummaryRow label="Service" value={order.draft.workType ?? "Tailoring"} />
          <SummaryRow label="Gender" value={order.draft.gender ?? "Not selected"} />
          <SummaryRow label="Cloth Type" value={order.draft.clothType ?? "Cloth"} />
          <SummaryRow label="Urgency" value={order.draft.urgency ?? "Normal"} />
          <SummaryRow label="Payment" value={order.paymentMethod.toUpperCase()} />
          <SummaryRow label="Delivery" value={`Rs${order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)}`} tone="positive" />
          <SummaryRow label="Platform fee" value={`Rs${order.platformFee ?? PLATFORM_FEE}`} tone="positive" />
          {order.draft.sampleProvided ? <SummaryRow label="Sample reference" value={order.draft.sampleMedia || order.draft.uploadedSampleMedia ? "Photo added" : "With pickup"} /> : null}
          {order.homeMeasurementFee || order.draft.homeMeasurementBooked ? <SummaryRow label="Tailor measurement visit" value={`Rs${order.homeMeasurementFee ?? HOME_MEASUREMENT_FEE}`} tone="positive" /> : null}
          {order.discountAmount ? <SummaryRow label={`Coupon ${order.couponCode ?? ""}`.trim()} value={`-Rs${order.discountAmount}`} tone="negative" /> : null}
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

function OrderProgressStrip({ status }: { status: OrderStatus }) {
  const steps = [
    { label: "Requested", icon: "checkmark" },
    { label: "Tailor Accepted", icon: "receipt-outline" },
    { label: "Picked Up", icon: "cube-outline" },
    { label: "In Progress", icon: "shirt-outline" },
    { label: "Delivered", icon: "checkmark-done-outline" }
  ] as const;
  const activeIndexMap: Record<OrderStatus, number> = {
    "Awaiting Payment": 0,
    Pending: 0,
    Confirmed: 1,
    "Pickup Started": 1,
    "Order Placed": 1,
    "Picked Up": 2,
    "Package Handover to Tailor": 2,
    "Tailor Started": 3,
    "Tailor Completed": 3,
    "On the Way": 3,
    Delivered: 4,
    Cancelled: 0
  };
  const activeIndex = activeIndexMap[status];

  return (
    <View style={styles.orderProgressWrap}>
      {steps.map((step, index) => {
        const done = status !== "Cancelled" && index <= activeIndex;
        return (
          <View key={step.label} style={styles.orderProgressStep}>
            <View style={[styles.orderProgressDot, done && styles.orderProgressDotDone]}>
              <Ionicons name={done ? "checkmark" : step.icon} size={16} color={done ? "#111111" : "#8a94a6"} />
            </View>
            {index < steps.length - 1 ? <View style={[styles.orderProgressLine, done && styles.orderProgressLineDone]} /> : null}
            <Text style={[styles.orderProgressLabel, done && styles.orderProgressLabelDone]} numberOfLines={2}>{step.label}</Text>
          </View>
        );
      })}
    </View>
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
  const pickupSchedule = pickupScheduleForOrder(order);
  const estimatedTime = estimatedTimeForOrder(order);
  const orderItems = clothingItemsForDraft(order.draft);
  const itemTotal = Math.max(
    order.total -
      (order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)) -
      (order.platformFee ?? PLATFORM_FEE) -
      (order.homeMeasurementFee ?? (order.draft.homeMeasurementBooked ? HOME_MEASUREMENT_FEE : 0)) +
      (order.discountAmount ?? 0),
    0
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header
          title="Order Details"
          onBack={() => setScreen("orders")}
          right={(
            <Pressable onPress={() => setScreen("contactSupport")}>
              <Text style={styles.seeAll}>Help</Text>
            </Pressable>
          )}
        />

        <View style={styles.orderDetailHero}>
          <View>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.mutedSmall}>Placed on {formatInvoiceDate(new Date(order.placedAt))}</Text>
          </View>
          <StatusPill status={order.status} />
        </View>

        {order.status === "Cancelled" ? (
          <View style={styles.cancelledNoticeCard}>
            <Ionicons name="close-circle-outline" size={22} color="#b91c1c" />
            <View style={styles.noticeTextBlock}>
              <Text style={styles.cancelledNoticeTitle}>This order has been cancelled</Text>
              <Text style={styles.cancelledNoticeCopy}>{order.cancellationFee ? `Cancellation fee: Rs${order.cancellationFee}.` : "No cancellation charge applies before pickup."}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Order Progress</Text>
        <OrderProgressStrip status={order.status} />
        <CustomerHandoffOtpCard orderId={order.backendOrderId ?? order.tailor.backendRequestId} status={order.status} />
        <CustomerEtaCard orderId={order.backendOrderId ?? order.tailor.backendRequestId} status={order.status} />

        <Text style={styles.sectionTitle}>Order Items</Text>
        <View style={styles.orderDetailsCard}>
          {orderItems.map((item, index) => {
            const thumb = clothingItemThumbnail(item);
            return (
              <View key={item.id} style={[styles.orderItemLine, index > 0 && styles.orderItemLineBorder]}>
                <View style={styles.orderLineThumb}>
                  {thumb ? <Image source={{ uri: thumb }} style={styles.orderLineImage} /> : <Ionicons name="shirt-outline" size={24} color={BRAND_ORANGE} />}
                </View>
                <View style={styles.profileRowText}>
                  <Text style={styles.addressTitle}>{clothingItemSummary(item)}</Text>
                  <Text style={styles.mutedSmall}>{item.description || "Tailoring request"}</Text>
                  <Text style={styles.mutedSmall}>Qty: 1</Text>
                </View>
                <Text style={styles.orderPrice}>Rs{Math.round(itemTotal / Math.max(orderItems.length, 1))}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.orderDetailsCard}>
          <SummaryRow label="Item Total" value={`Rs${itemTotal}`} />
          <SummaryRow label="Pickup Fee" value={`Rs${order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)}`} />
          <SummaryRow label="Convenience Fee" value={`Rs${order.platformFee ?? PLATFORM_FEE}`} />
          {order.homeMeasurementFee || order.draft.homeMeasurementBooked ? <SummaryRow label="Measurement Visit" value={`Rs${order.homeMeasurementFee ?? HOME_MEASUREMENT_FEE}`} /> : null}
          {order.discountAmount ? <SummaryRow label={`Discount ${order.couponCode ?? ""}`.trim()} value={`-Rs${order.discountAmount}`} tone="negative" /> : null}
          <View style={styles.summaryDivider} />
          <SummaryRow label="Total Amount" value={`Rs${order.total}`} strong />
        </View>

        <Text style={styles.sectionTitle}>Order Details</Text>
        <View style={styles.orderDetailsCard}>
          <SummaryRow label="Pickup Address" value={order.draft.pickup || "Not selected"} />
          <SummaryRow label="Pickup Time" value={`${pickupSchedule.date}, ${pickupSchedule.timeSlot}`} />
          <SummaryRow label="Estimated Delivery" value={estimatedTime.delivery} />
          <SummaryRow label="Payment Method" value={order.paymentMethod.toUpperCase()} />
          <SummaryRow label="Tailor" value={order.tailor.name} />
        </View>

        {order.status === "Delivered" ? (
          <View style={styles.orderDetailsCard}>
            <View style={styles.orderIssueRow}>
              <Ionicons name="star-outline" size={22} color={BRAND_ORANGE} />
              <View style={styles.profileRowText}>
                <Text style={styles.addressTitle}>Rate Darji</Text>
                <Text style={styles.mutedSmall}>Share your experience and help other customers.</Text>
              </View>
              <Pressable style={styles.orderSmallAction} onPress={() => setScreen("rateApp")}>
                <Text style={styles.couponCopyText}>Rate</Text>
              </Pressable>
            </View>
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

        <Pressable style={styles.orderDetailsCard} onPress={() => setScreen("contactSupport")}>
          <View style={styles.orderIssueRow}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color={BRAND_DEEP} />
            <View style={styles.profileRowText}>
              <Text style={styles.addressTitle}>Have an issue with your order?</Text>
              <Text style={styles.mutedSmall}>Chat with our support team</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7890" />
          </View>
        </Pressable>

        {canCancelOrder(order.status) ? (
          <Pressable style={styles.cancelOrderButton} onPress={() => onRequestCancel(order)}>
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

function formatDeliveryTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
}

function CustomerEtaCard({ orderId, status }: { orderId?: string; status: string }) {
  const token = useAppStore((state) => state.token);
  const [tasks, setTasks] = useState<HandoffOtp[]>([]);

  useEffect(() => {
    if (!token || !orderId) return;
    void api<HandoffOtp[]>(`/delivery-requests/order/${orderId}/otps`, {}, token).then(setTasks).catch(() => setTasks([]));
  }, [orderId, status, token]);

  const visibleTasks = tasks.filter((task) => task.etaWindowStart || task.nextScheduledBatch || task.roundAt);
  if (!visibleTasks.length) return null;

  return (
    <View style={[styles.whiteCard, styles.etaAlertCard]}>
      <Text style={styles.etaAlertLabel}>EXPECTED DELIVERY TIME</Text>
      {visibleTasks.map((task) => {
        const start = formatDeliveryTime(task.etaWindowStart ?? task.nextScheduledBatch ?? task.roundAt);
        const end = formatDeliveryTime(task.etaWindowEnd);
        const label = task.type === "customer_to_tailor" ? "Pickup window" : "Delivery window";
        return (
          <View key={`${task.taskId}-eta`} style={styles.handoffOtpRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.etaAlertTitle}>{label}</Text>
              <Text style={styles.etaAlertTime}>
                {start}{end ? ` - ${end}` : ""}
                {task.retryStatus === "PENDING_RETRY" ? ` • Retry ${task.retryCount ?? 0}/3` : ""}
              </Text>
              {task.lastFailureReason ? <Text style={styles.etaAlertIssue}>Last issue: {task.lastFailureReason}</Text> : null}
            </View>
            {task.routePosition && task.routeTotal ? (
              <Text style={styles.etaQueueBadge}>{task.routePosition}/{task.routeTotal}</Text>
            ) : null}
          </View>
        );
      })}
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
        <CustomerEtaCard orderId={order.backendOrderId ?? order.tailor.backendRequestId} status={order.status} />
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
  const [screenStack, setScreenStack] = useState<Screen[]>([]);
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
  const { orders, profile, settings, addresses, notifications, appReviews } = customerData;
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const unreadCount = notifications.filter((item) => !item.read).length;
  const activeOrderForCustomer = activeOrder && orders.some((order) => order.id === activeOrder.id) ? activeOrder : undefined;

  const goBack = useCallback(() => {
    if (cancellingOrderId) {
      return true;
    }
    if (paymentSheet && !verifyingPayment) {
      setPaymentSheet(undefined);
      return true;
    }
    if (dialog) {
      setDialog(undefined);
      return true;
    }
    if (screenStack.length > 0) {
      setScreenState(screenStack[screenStack.length - 1]);
      setScreenStack((currentStack) => currentStack.slice(0, -1));
      return true;
    }
    if (screen !== "home") {
      setScreenState("home");
      setScreenStack([]);
      return true;
    }
    return false;
  }, [cancellingOrderId, dialog, paymentSheet, screen, screenStack, verifyingPayment]);

  function setScreen(nextScreen: Screen, options?: { replace?: boolean; resetStack?: boolean }) {
    let resolvedScreen = nextScreen;
    if (nextScreen === "newRequest" && !REQUEST_FLOW_SCREENS.has(screen) && (hasRequestDraftData(draft) || draft.backendRequestId || selectedQuote)) {
      resolvedScreen = requestProgressScreen;
    }
    if (resolvedScreen === screen) return;
    if (options?.resetStack || resolvedScreen === "home") {
      setScreenStack([]);
    } else if (!options?.replace) {
      setScreenStack((currentStack) => [...currentStack, screen].slice(-16));
    }
    setScreenState(resolvedScreen);
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [goBack]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data && data.type === "bug") {
        setScreen("reportBug");
      } else {
        setScreen("contactSupport");
      }
    });
    return () => subscription.remove();
  }, []);

  function openRequestResume(order: CustomerOrder) {
    setActiveOrder(order);
    setDraft(order.draft);
    if (order.status === "Awaiting Payment" || order.tailor.backendQuoteId) {
      setSelectedQuote(order.tailor);
      setRequestProgressScreen("confirmOrder");
      setScreen("confirmOrder");
      return;
    }
    setSelectedQuote(undefined);
    setRequestProgressScreen("quotes");
    setScreen("quotes");
  }

  function openOrderFromList(order: CustomerOrder) {
    if (["Pending", "Awaiting Payment"].includes(order.status)) {
      openRequestResume(order);
      return;
    }
    setActiveOrder(order);
    setScreen("orderDetails");
  }

  async function openRequestById(requestId: string, preferredScreen: "quotes" | "confirmOrder" = "quotes") {
    const matchingOrder = orders.find((order) => order.id === requestId || order.backendOrderId === requestId || order.tailor.backendRequestId === requestId);
    if (matchingOrder) {
      if (preferredScreen === "quotes" && matchingOrder.status === "Pending") {
        setActiveOrder(matchingOrder);
        setDraft(matchingOrder.draft);
        setSelectedQuote(undefined);
        setRequestProgressScreen("quotes");
        setScreen("quotes");
        return;
      }
      openRequestResume(matchingOrder);
      return;
    }
    if (!token) return;
    try {
      const request = await api<BackendTailoringRequest>(`/tailoring-requests/${requestId}`, {}, token);
      const nextOrder = orderFromBackendRequest(request);
      if (!nextOrder) return;
      setCustomerOrders((current) => [nextOrder, ...current.filter((order) => order.id !== nextOrder.id && order.backendOrderId !== nextOrder.backendOrderId)]);
      setActiveOrder(nextOrder);
      setDraft(nextOrder.draft);
      setSelectedQuote(preferredScreen === "confirmOrder" || nextOrder.status === "Awaiting Payment" ? nextOrder.tailor : undefined);
      setRequestProgressScreen(preferredScreen === "quotes" && nextOrder.status === "Pending" ? "quotes" : "confirmOrder");
      setScreen(preferredScreen === "quotes" && nextOrder.status === "Pending" ? "quotes" : "confirmOrder");
    } catch (error) {
      setDialog({
        title: "Request unavailable",
        message: error instanceof Error ? error.message : "Could not open this request.",
        actions: [{ label: "OK" }]
      });
    }
  }

  async function deleteIncompleteRequest(requestId?: string) {
    if (!requestId || !token) return;
    try {
      const cancelled = await api<BackendTailoringRequest>(`/tailoring-requests/${requestId}/cancel`, { method: "POST" }, token);
      const existing = orders.find((order) => order.backendOrderId === requestId || order.id === requestId);
      const cancelledOrder = orderFromBackendRequest(cancelled, existing);
      if (cancelledOrder) {
        setCustomerOrders((current) => [cancelledOrder, ...current.filter((order) => order.id !== cancelledOrder.id && order.backendOrderId !== cancelledOrder.backendOrderId)]);
      }
      if (activeOrder?.backendOrderId === requestId || activeOrder?.id === requestId) setActiveOrder(cancelledOrder);
      resetRequestDraft();
      setSelectedQuote(undefined);
      setScreen("orders");
      setDialog({
        title: "Request deleted",
        message: `Request REQ-${requestId.slice(0, 8).toUpperCase()} has been moved to cancelled orders.`,
        actions: [{ label: "OK" }]
      });
      void refreshCustomerOrders();
    } catch (error) {
      setDialog({
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Could not delete this request.",
        actions: [{ label: "OK" }]
      });
    }
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
          if (destination.screen === "support_center" || destination.screen === "contactSupport") {
            setScreen("contactSupport");
            return;
          }
          const matchingOrder = destination.entityId
            ? orders.find((order) => order.id === destination.entityId || order.backendOrderId === destination.entityId || order.tailor.backendRequestId === destination.entityId)
            : undefined;
          if (matchingOrder && ["Pending", "Awaiting Payment"].includes(matchingOrder.status)) {
            openRequestResume(matchingOrder);
            return;
          }
          if (matchingOrder) setActiveOrder(matchingOrder);
          if (destination.screen === "quotes" && matchingOrder) {
            openRequestResume(matchingOrder);
            return;
          }
          if (destination.screen === "quotes" && destination.entityId) {
            void openRequestById(destination.entityId, "quotes");
            return;
          }
          if (destination.screen === "trackOrder") setScreen("trackOrder");
          else if (destination.screen === "notifications") setScreen("notifications");
          else setScreen("orderDetails");
        }}
      >
        {node}
        <AppDialog dialog={dialog} onClose={() => setDialog(undefined)} />
        <Modal visible={Boolean(cancellingOrderId)} transparent animationType="fade" onRequestClose={() => undefined}>
          <View style={styles.checkoutBlockingOverlay}>
            <View style={styles.checkoutBlockingCard}>
              <ActivityIndicator color={BRAND_ORANGE} size="large" />
              <Text style={styles.checkoutBlockingTitle}>Canceling your request...</Text>
              <Text style={styles.checkoutBlockingCopy}>Please wait while we process your cancellation.</Text>
            </View>
          </View>
        </Modal>
        <Modal visible={Boolean(paymentSheet)} animationType="slide" onRequestClose={() => !verifyingPayment && setPaymentSheet(undefined)}>
          <SafeAreaView style={styles.safe}>
            <View style={[styles.rowBetween, { paddingHorizontal: 20, paddingTop: 12 }]}>
              <Text style={styles.sectionTitle}>{verifyingPayment ? "Confirming payment" : "Complete Payment"}</Text>
              <Pressable onPress={() => !verifyingPayment && setPaymentSheet(undefined)} disabled={verifyingPayment}>
                <Ionicons name="close" size={22} color={BRAND_DEEP} />
              </Pressable>
            </View>
            {paymentSheet ? (
              <View style={styles.paymentSheetWrap}>
                <WebView
                  source={{
                    html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body style="margin:0;background:#f7faff;font-family:sans-serif;">
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;">
      <div style="width:100%;max-width:360px;background:#ffffff;border:1px solid #efcf92;border-radius:24px;padding:24px;box-sizing:border-box;text-align:center;box-shadow:0 20px 50px rgba(11,34,65,0.08);">
        <div style="width:64px;height:64px;border-radius:22px;background:#fff4dc;margin:0 auto;display:flex;align-items:center;justify-content:center;color:#f6a313;font-size:30px;font-weight:700;">D</div>
        <div style="margin-top:16px;color:#0b2241;font-size:22px;font-weight:800;">Opening secure payment</div>
        <div style="margin-top:8px;color:#65748a;font-size:14px;line-height:22px;">Darji is connecting Razorpay for your order. Do not close this screen.</div>
        <div style="margin-top:18px;background:#fffaf0;border:1px solid #efcf92;border-radius:16px;padding:14px;text-align:left;">
          <div style="color:#65748a;font-size:12px;font-weight:700;">Order</div>
          <div style="margin-top:4px;color:#0b2241;font-size:16px;font-weight:800;">${String(paymentSheet.config.description).replace(/</g, "&lt;")}</div>
          <div style="margin-top:6px;color:#f6a313;font-size:20px;font-weight:800;">Rs${Math.round(Number(paymentSheet.config.amount) / 100)}</div>
        </div>
      </div>
    </div>
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
      window.setTimeout(function () { rzp.open(); }, 180);
    </script>
  </body>
</html>`
                  }}
                  onMessage={(event) => {
                    void handlePaymentSheetMessage(event.nativeEvent.data);
                  }}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.paymentSheetLoading}>
                      <ActivityIndicator color={BRAND_ORANGE} size="large" />
                      <Text style={styles.checkoutBlockingTitle}>Opening Razorpay</Text>
                      <Text style={styles.checkoutBlockingCopy}>Preparing your secure Darji payment page.</Text>
                    </View>
                  )}
                />
                {verifyingPayment ? (
                  <View style={styles.paymentVerificationOverlay}>
                    <ActivityIndicator color={BRAND_ORANGE} size="large" />
                    <Text style={styles.checkoutBlockingTitle}>We are confirming your payment</Text>
                    <Text style={styles.checkoutBlockingCopy}>Please wait while Darji verifies the Razorpay response.</Text>
                  </View>
                ) : null}
              </View>
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
          setDraft({ ...makeEmptyDraft(), ...parsed.draft, media: parsed.draft.media ?? [], uploadedMedia: parsed.draft.uploadedMedia ?? [], items: parsed.draft.items ?? [] });
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
            homeMeasurementFee: request.homeMeasurementFee,
            couponCode: request.couponCode,
            discountAmount: request.discountAmount
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

  async function placeOrder(paymentMethod: string, checkout?: { couponCode?: string; totalAmount?: number }) {
    if (!selectedQuote?.backendRequestId || !selectedQuote.backendQuoteId || !token) return;
    if (checkoutPaymentMethod) return;
    const orderDraft = { ...draft, pickup: defaultAddress?.address ?? draft.pickup };
    const deliveryFee = deliveryFeeForUrgency(orderDraft.urgency);
    const homeMeasurementFee = homeMeasurementFeeForDraft(orderDraft);
    const totalAmount = checkout?.totalAmount ?? totalForQuote(selectedQuote, orderDraft);

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
            couponCode: checkout?.couponCode,
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
        if (response.request) storeConfirmedOrder(response.request, selectedQuote, orderDraft);
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
      setDialog({
        title: "Checkout failed",
        message: error instanceof Error ? error.message : "Could not start checkout.",
        actions: [{ label: "OK" }]
      });
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
      setSelectedQuote(paymentSheet.quote);
      setDraft(paymentSheet.draft);
      setRequestProgressScreen("confirmOrder");
      setScreen("confirmOrder");
      void refreshCustomerOrders();
      setDialog({
        title: "Payment cancelled",
        message: "You can retry online payment or switch to COD.",
        actions: [{ label: "Retry Payment" }]
      });
      return;
    }
    if (payload.type === "failure") {
      paymentMessageHandledRef.current = true;
      setPaymentSheet(undefined);
      console.warn("Razorpay payment failed", payload.error);
      setSelectedQuote(paymentSheet.quote);
      setDraft(paymentSheet.draft);
      setRequestProgressScreen("confirmOrder");
      setScreen("confirmOrder");
      void refreshCustomerOrders();
      setDialog({
        title: "Payment failed",
        message: razorpayFailureMessage(payload.error),
        actions: [{ label: "Try Again" }]
      });
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
      setSelectedQuote(paymentSheet.quote);
      setDraft(paymentSheet.draft);
      setRequestProgressScreen("confirmOrder");
      setScreen("confirmOrder");
      void refreshCustomerOrders();
      setDialog({
        title: "Payment verification failed",
        message: error instanceof Error ? error.message : "Could not verify payment.",
        actions: [{ label: "OK" }]
      });
    } finally {
      setVerifyingPayment(false);
      setPaymentSheet(undefined);
    }
  }

  if (!token) return <AuthScreen />;
  if (!hasLoadedCustomerData) return withAppChrome(<LocationFetchingScreen title="Loading your profile" message="Fetching your saved Darji profile for this phone number." />);
  if (!profile.hasCompletedOnboarding) return withAppChrome(<OnboardingScreen profile={profile} setProfile={setCustomerProfile} />);

  if (screen === "home") return withAppChrome(<HomeScreen setScreen={setScreen} profile={profile} unreadCount={unreadCount} defaultAddress={defaultAddress} orders={orders} appReviews={appReviews} />);
  if (screen === "services") return withAppChrome(<ServicesScreen setScreen={setScreen} />);
  if (screen === "featureSoon") return withAppChrome(<FeatureSoonScreen setScreen={setScreen} onNotify={notifyForPressLaunch} />);
  if (screen === "notifications") return withAppChrome(<NotificationsScreen notifications={notifications} onMarkAllRead={markNotificationsRead} setScreen={setScreen} />);
  if (screen === "measurementGuide") return withAppChrome(<MeasurementGuideScreen setScreen={setScreen} />);
  if (screen === "newRequest") return withAppChrome(<NewRequestScreen draft={draft} setDraft={setDraft} setScreen={setScreen} addresses={addresses} onExitRequest={exitRequestFlow} />);
  if (screen === "clothIssue") return withAppChrome(<ClothIssueScreen draft={draft} setDraft={setDraft} setScreen={setScreen} />);
  if (screen === "orderSummary") return withAppChrome(<OrderSummaryScreen draft={draft} setDraft={setDraft} setScreen={setScreen} showDialog={setDialog} />);
  if (screen === "quotes") return withAppChrome(<QuotesScreen draft={draft} selectedQuote={selectedQuote} setSelectedQuote={setSelectedQuote} setScreen={setScreen} showDialog={setDialog} onDeleteRequest={() => deleteIncompleteRequest(draft.backendRequestId)} />);
  if (screen === "confirmOrder" && selectedQuote) return withAppChrome(<ConfirmOrderScreen quote={selectedQuote} draft={draft} setDraft={setDraft} setScreen={setScreen} onPlaceOrder={placeOrder} isPlacingOrder={Boolean(checkoutPaymentMethod)} onDeleteRequest={() => deleteIncompleteRequest(selectedQuote.backendRequestId ?? draft.backendRequestId)} />);
  if (screen === "orderDetails" && activeOrderForCustomer) return withAppChrome(<OrderDetailsScreenV2 order={activeOrderForCustomer} onUpdateOrder={updateOrder} onRequestCancel={requestCancelOrder} setScreen={setScreen} />);
  if (screen === "trackOrder" && activeOrderForCustomer) {
    const locationKey = activeOrderForCustomer.backendOrderId ?? activeOrderForCustomer.tailor.backendRequestId ?? activeOrderForCustomer.id;
    return withAppChrome(<TrackOrderScreenV2 deliveryLocation={deliveryLocations[locationKey]} order={activeOrderForCustomer} setScreen={setScreen} />);
  }
  if (screen === "orderDetails" || screen === "trackOrder") return withAppChrome(<OrdersScreenV2 orders={orders} onOpenOrder={openOrderFromList} setScreen={setScreen} />);
  const PROFILE_SUBSCREENS = new Set([
    "editProfile",
    "settings",
    "savedAddresses",
    "addAddress",
    "walletPayments",
    "transactionHistory",
    "coupons",
    "helpCenter",
    "cancellationPolicy",
    "contactSupport",
    "reportBug",
    "rateApp",
    "customerStories",
    "privacyPolicy",
    "termsService",
    "appInfo",
    "aboutDarji"
  ]);

  if (screen === "profile" || PROFILE_SUBSCREENS.has(screen)) {
    return withAppChrome(
      <>
        <ProfileScreen setScreen={setScreen} orders={orders} profile={profile} addresses={addresses} onDeleteAccount={requestDeleteCustomerAccount} settings={settings} />
        
        <Modal visible={screen === "editProfile"} onRequestClose={goBack} animationType="slide">
          <EditProfileScreen profile={profile} setProfile={setCustomerProfile} setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "settings"} onRequestClose={goBack} animationType="slide">
          <SettingsScreen settings={settings} setSettings={setCustomerSettings} setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "savedAddresses"} onRequestClose={goBack} animationType="slide">
          <SavedAddressesScreen addresses={addresses} setAddresses={setCustomerAddresses} setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "addAddress"} onRequestClose={goBack} animationType="slide">
          <AddAddressScreen addresses={addresses} setAddresses={setCustomerAddresses} setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "walletPayments"} onRequestClose={goBack} animationType="slide">
          <WalletPaymentsScreen setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "transactionHistory"} onRequestClose={goBack} animationType="slide">
          <TransactionHistoryScreen setScreen={setScreen} orders={orders} />
        </Modal>
        
        <Modal visible={screen === "coupons"} onRequestClose={goBack} animationType="slide">
          <CouponsScreenV2 setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "helpCenter"} onRequestClose={goBack} animationType="slide">
          <HelpCenterScreen setScreen={setScreen} onOpenCancellationPolicy={() => { setPendingCancellationOrder(undefined); setScreen("cancellationPolicy"); }} />
        </Modal>
        
        <Modal visible={screen === "cancellationPolicy"} onRequestClose={goBack} animationType="slide">
          <CancellationPolicyScreen order={pendingCancellationOrder} setScreen={setScreen} onConfirmCancel={confirmCancelOrder} isCancelling={Boolean(cancellingOrderId)} />
        </Modal>
        
        <Modal visible={screen === "contactSupport" || screen === "reportBug"} onRequestClose={goBack} animationType="slide">
          <ContactSupportScreen setScreen={setScreen} isBugReport={screen === "reportBug"} isDark={settings.darkMode} orders={orders} socket={socketRef.current} />
        </Modal>
        
        <Modal visible={screen === "rateApp"} onRequestClose={goBack} animationType="slide">
          <RateAppScreen onSave={saveAppReview} setScreen={setScreen} orders={orders} />
        </Modal>

        <Modal visible={screen === "customerStories"} onRequestClose={goBack} animationType="slide">
          <CustomerStoriesScreen setScreen={setScreen} stories={storiesFromCustomerData(profile, orders, appReviews, defaultAddress)} />
        </Modal>
        
        <Modal visible={screen === "privacyPolicy"} onRequestClose={goBack} animationType="slide">
          <PolicyScreen title="Privacy Policy" setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "termsService"} onRequestClose={goBack} animationType="slide">
          <PolicyScreen title="Terms of Service" setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "appInfo"} onRequestClose={goBack} animationType="slide">
          <AppInfoScreen setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "aboutDarji"} onRequestClose={goBack} animationType="slide">
          <AboutDarjiScreen setScreen={setScreen} isDark={settings.darkMode} />
        </Modal>
        
        <BottomTabs active="profile" setScreen={setScreen} />
      </>
    );
  }
  if (screen === "orders") return withAppChrome(<OrdersScreenV2 orders={orders} onOpenOrder={openOrderFromList} setScreen={setScreen} />);
  return withAppChrome(<SearchScreen setScreen={setScreen} />);
}

function createStyles(isDark = false) {
  const pageBg = isDark ? "#000000" : SCREEN_BG;
  const surface = isDark ? "#121212" : "#ffffff";
  const surfaceAlt = isDark ? "#1a1a1a" : "#fffaf0";
  const inputSurface = isDark ? "#0d0d0d" : "#ffffff";
  const text = isDark ? "#ffffff" : BRAND_DEEP;
  const muted = isDark ? "#94a3b8" : "#65748a";
  const subtle = isDark ? "#64748b" : "#637086";
  const border = isDark ? "#222222" : "#dce2ea";
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
  homeContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 96 },
  homeGreeting: { color: subtle, fontSize: 14, fontWeight: "700" },
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
  homeIncompleteBlock: { marginBottom: 20 },
  incompleteRequestCard: { minHeight: 68, borderRadius: 16, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff1f2", flexDirection: "row", alignItems: "center", gap: 12, padding: 12, marginBottom: 10 },
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
  popularServiceRow: { gap: 12, paddingBottom: 14 },
  popularServiceCard: { minHeight: 82, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  popularServiceText: { color: text, fontSize: 11, fontWeight: "900", textAlign: "center", marginTop: 7 },
  launchBand: { minHeight: 164, borderRadius: 18, borderWidth: 1, borderColor: "#d8c8ff", backgroundColor: isDark ? "#171326" : "#f5f0ff", flexDirection: "row", alignItems: "center", padding: 18, marginBottom: 22, overflow: "hidden" },
  launchTextBlock: { flex: 1, minWidth: 0 },
  launchBadge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 12, backgroundColor: "#ede7ff", color: "#6d28d9", paddingHorizontal: 10, paddingVertical: 5, fontSize: 10, fontWeight: "900" },
  launchBandTitle: { color: text, fontSize: 18, fontWeight: "900", lineHeight: 24, marginTop: 12 },
  launchBandCopy: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 8 },
  launchNotifyButton: { alignSelf: "flex-start", minHeight: 36, borderRadius: 18, backgroundColor: BRAND_DEEP, alignItems: "center", justifyContent: "center", paddingHorizontal: 17, marginTop: 12 },
  launchNotifyText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  launchIconStack: { width: 96, height: 96, borderRadius: 24, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginLeft: 12 },
  launchSparkIcon: { position: "absolute", right: 16, top: 14 },
  needList: { gap: 10, marginBottom: 22 },
  needCard: { minHeight: 70, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", padding: 12 },
  needIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" },
  fabricTipCard: { minHeight: 132, borderRadius: 18, borderWidth: 1, borderColor: "#d8efbd", backgroundColor: isDark ? "#101a12" : "#f4fde8", flexDirection: "row", alignItems: "center", padding: 14, gap: 14, marginBottom: 22 },
  fabricTipImage: { width: 116, height: 92, borderRadius: 15, backgroundColor: iconBg },
  fabricTipText: { flex: 1, minWidth: 0 },
  fabricTipTitle: { color: text, fontSize: 17, fontWeight: "900" },
  fabricTipCopy: { color: muted, fontSize: 13, fontWeight: "700", lineHeight: 20, marginTop: 8 },
  offerRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 22 },
  offerCard: { flex: 1, minWidth: "30%", minHeight: 118, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surfaceAlt, padding: 14 },
  offerCardWide: { width: "100%", minHeight: 78, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  offerTitle: { color: text, fontSize: 14, fontWeight: "900", marginTop: 10 },
  offerCopy: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 6 },
  offerCode: { color: "#8a5600", fontSize: 11, fontWeight: "900", marginTop: 8 },
  whyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 22 },
  whyCard: { width: "48.5%", minHeight: 88, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", padding: 12 },
  whyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" },
  whyTitle: { color: text, fontSize: 12, fontWeight: "900" },
  whyCopy: { color: muted, fontSize: 11, fontWeight: "700", lineHeight: 15, marginTop: 4 },
  homeStepsRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 22 },
  homeStepItem: { flex: 1, alignItems: "center", minWidth: 0 },
  stepNumber: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 10, backgroundColor: BRAND_ORANGE, color: "#111111", width: 20, height: 20, lineHeight: 20, textAlign: "center", fontSize: 10, fontWeight: "900", marginBottom: -8, zIndex: 1 },
  stepIconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  stepTitle: { color: text, fontSize: 10, fontWeight: "900", textAlign: "center", minHeight: 28 },
  stepCopy: { color: muted, fontSize: 9, fontWeight: "700", lineHeight: 13, textAlign: "center", marginTop: 3 },
  storyRow: { gap: 12, paddingBottom: 14 },
  storyCard: { width: 300, minHeight: 158, borderRadius: 18, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, padding: 16 },
  storyText: { color: text, fontSize: 13, fontWeight: "700", lineHeight: 20, marginTop: 10, minHeight: 78 },
  storyFooter: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  storyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center" },
  storyAvatarText: { color: "#111111", fontSize: 11, fontWeight: "900" },
  storyName: { color: text, fontSize: 13, fontWeight: "900" },
  storyRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  storyRatingText: { color: text, fontSize: 12, fontWeight: "900" },
  emptyStoryCard: { minHeight: 78, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 18 },
  storyListCard: { borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 16, marginBottom: 12 },
  storyListText: { color: text, fontSize: 14, fontWeight: "700", lineHeight: 21, marginTop: 12 },
  safeDataBand: { minHeight: 58, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, marginBottom: 22 },
  safeDataText: { flex: 1, minWidth: 0, color: text, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  supportList: { borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, marginBottom: 10, overflow: "hidden" },
  supportRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: border },
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
  stepBadge: { overflow: "hidden", borderRadius: 15, backgroundColor: "#fff2d8", color: BRAND_ORANGE, paddingHorizontal: 12, paddingVertical: 7, fontSize: 12, fontWeight: "900" },
  requestHintCard: { minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginBottom: 14 },
  requestHintTitle: { color: text, fontSize: 13, fontWeight: "900" },
  requestHintCopy: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 2 },
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
  manualMeasureLink: { alignSelf: "flex-start", minHeight: 36, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12, marginBottom: 2 },
  manualMeasureText: { color: BRAND_ORANGE, fontSize: 13, fontWeight: "900" },
  measurementCard: { borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 16, marginTop: 16 },
  measurementTitleBlock: { flex: 1, minWidth: 0 },
  measurementHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconMiniButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, alignItems: "center", justifyContent: "center" },
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
  checkoutBlockingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7, 13, 24, 0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  checkoutBlockingCard: { width: "100%", maxWidth: 320, borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: "#efcf92", padding: 20, alignItems: "center" },
  checkoutBlockingTitle: { color: text, fontSize: 17, fontWeight: "900", marginTop: 12 },
  checkoutBlockingCopy: { color: muted, fontSize: 13, lineHeight: 19, fontWeight: "700", textAlign: "center", marginTop: 6 },
  checkoutDeleteWrap: { paddingHorizontal: 18, paddingBottom: 18, backgroundColor: pageBg },
  paymentSheetWrap: { flex: 1, marginTop: 10 },
  paymentSheetLoading: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: surface },
  paymentVerificationOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(247, 250, 255, 0.96)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  infoBanner: { height: 42, borderRadius: 13, borderWidth: 1, borderColor: "#efbd65", backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8, marginBottom: 14 },
  infoBannerText: { color: muted, fontSize: 13, fontWeight: "700" },
  quotesSummaryCard: { minHeight: 110, borderRadius: 20, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, marginBottom: 26 },
  quoteClockIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#efcf92" },
  quotesSummaryTitle: { color: text, fontSize: 18, fontWeight: "900", lineHeight: 24 },
  quoteDetailsButton: { minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  quoteDetailsButtonText: { color: text, fontSize: 13, fontWeight: "900" },
  quotesWaitingState: { alignItems: "center", paddingHorizontal: 12, paddingBottom: 12 },
  quotesIllustration: { width: 220, height: 170, borderRadius: 85, backgroundColor: isDark ? "#181f2b" : "#fff4dc", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  quotesPlaneIcon: { position: "absolute", right: 34, top: 34 },
  quotesTrustCard: { width: "100%", minHeight: 96, borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "stretch", padding: 12, marginBottom: 16 },
  quotesTrustItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: border },
  quotesTrustIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quotesTrustTitle: { color: text, fontSize: 11, fontWeight: "900", textAlign: "center" },
  quotesTrustCopy: { color: muted, fontSize: 10, fontWeight: "700", lineHeight: 14, textAlign: "center", marginTop: 4 },
  quoteActionRowButton: { minHeight: 74, borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, marginTop: 4 },
  quoteActionTitle: { color: text, fontSize: 16, fontWeight: "900" },
  requestExpireRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, marginBottom: 20 },
  requestDetailsModal: { width: "100%", maxWidth: 390, borderRadius: 20, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surface, padding: 18 },
  requestDetailItem: { borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, padding: 12, marginVertical: 8 },
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
  quoteMessageBox: { borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 12, marginTop: 12 },
  quoteMessageText: { color: text, fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 5 },
  whiteCard: { borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 18, marginBottom: 14 },
  handoffOtpRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  handoffOtpCode: { minWidth: 82, borderRadius: 14, overflow: "hidden", backgroundColor: "#111111", color: BRAND_ORANGE, fontSize: 24, fontWeight: "900", letterSpacing: 4, textAlign: "center", paddingVertical: 12 },
  handoffOtpVerified: { color: "#15803d", backgroundColor: "#dcfce7" },
  etaAlertCard: { borderColor: "#ef4444", borderWidth: 2, backgroundColor: "#fff1f2" },
  etaAlertLabel: { color: "#b91c1c", fontSize: 12, fontWeight: "900", letterSpacing: 0.6, marginBottom: 10 },
  etaAlertTitle: { color: "#7f1d1d", fontSize: 16, fontWeight: "900" },
  etaAlertTime: { color: "#dc2626", fontSize: 17, lineHeight: 23, fontWeight: "900", marginTop: 4 },
  etaAlertIssue: { color: "#991b1b", fontSize: 12, lineHeight: 18, fontWeight: "800", marginTop: 4 },
  etaQueueBadge: { overflow: "hidden", borderRadius: 16, backgroundColor: "#dc2626", color: "#ffffff", paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: "900" },
  cardLabel: { color: muted, fontSize: 12, fontWeight: "900", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  summaryLabel: { color: muted, fontSize: 13 },
  summaryValue: { color: text, fontSize: 13, fontWeight: "800", maxWidth: "58%", textAlign: "right" },
  summaryPositive: { color: "#059669" },
  summaryNegative: { color: "#dc2626" },
  summaryDivider: { height: 1, backgroundColor: border, marginVertical: 4 },
  summaryStrong: { color: BRAND_ORANGE, fontSize: 18, fontWeight: "900" },
  checkoutSummaryCard: { borderColor: "#efcf92", borderWidth: 1.5, backgroundColor: isDark ? "#1c2028" : "#fffdf8" },
  checkoutSummaryHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  checkoutSummaryHeaderIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#fff2d8", borderWidth: 1, borderColor: "#efcf92", alignItems: "center", justifyContent: "center" },
  checkoutSummaryTitleBlock: { flex: 1, minWidth: 0 },
  checkoutSummarySubtitle: { color: text, fontSize: 14, lineHeight: 20, fontWeight: "900" },
  checkoutSummaryStats: { flexDirection: "row", gap: 10, marginBottom: 12 },
  checkoutSummaryStat: { flex: 1, minHeight: 70, borderRadius: 16, borderWidth: 1, padding: 12, justifyContent: "center" },
  checkoutSummaryStatWarm: { borderColor: "#fed7aa", backgroundColor: "#fff7ed" },
  checkoutSummaryStatCool: { borderColor: "#bfdbfe", backgroundColor: "#eff6ff" },
  checkoutSummaryStatLabel: { color: muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  checkoutSummaryStatValue: { color: text, fontSize: 18, fontWeight: "900", marginTop: 4 },
  checkoutInfoBand: { minHeight: 66, borderRadius: 16, borderWidth: 1.5, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 10 },
  checkoutEtaBand: { borderColor: "#c4b5fd", backgroundColor: "#f5f3ff" },
  checkoutPickupBand: { borderColor: "#a7f3d0", backgroundColor: "#ecfdf5" },
  checkoutBandIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  checkoutBandText: { flex: 1, minWidth: 0 },
  checkoutBandLabel: { color: muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  checkoutEtaValue: { color: "#6d28d9", fontSize: 17, fontWeight: "900", marginTop: 3 },
  checkoutPickupValue: { color: "#047857", fontSize: 15, fontWeight: "900", marginTop: 3 },
  checkoutPriceBox: { borderRadius: 16, borderWidth: 1, borderColor: "#e6edf5", backgroundColor: surface, padding: 14, marginTop: 4 },
  addMoreCheckoutButton: { minHeight: 62, borderRadius: 18, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 12, paddingHorizontal: 14 },
  checkoutGrid: { flexDirection: "row", gap: 10, marginTop: 12 },
  checkoutMiniInput: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: surfaceAlt, color: text, paddingHorizontal: 12, fontWeight: "700" },
  checkoutInput: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: surfaceAlt, color: text, paddingHorizontal: 12, paddingVertical: 10, fontWeight: "700", marginTop: 10 },
  checkoutItemCard: { borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fffaf0", padding: 12, marginTop: 10 },
  orderSummaryItemCard: { borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 14, marginBottom: 12 },
  orderSummaryItemTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  orderSummaryThumb: { width: 74, height: 74, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  orderSummaryThumbImage: { width: "100%", height: "100%" },
  orderSummaryItemText: { flex: 1, minWidth: 0 },
  orderSummaryStatus: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 12, backgroundColor: "#fff2d8", color: BRAND_ORANGE, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: "900", marginTop: 8 },
  orderSummaryActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  orderSummaryActionButton: { flex: 1, minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: border, backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  orderSummaryActionText: { color: text, fontSize: 12, fontWeight: "900" },
  orderSummaryDeleteButton: { borderColor: "#ffd1d1", backgroundColor: "#fff1f1" },
  orderSummaryDeleteText: { color: "#c24141" },
  couponApplyRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  couponInput: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1.3, borderColor: "#d1d9e6", backgroundColor: surface, color: text, paddingHorizontal: 12, fontWeight: "900" },
  couponApplyButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: "#efcf92", backgroundColor: "#fff7e8", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  discountText: { color: "#dc2626", fontSize: 13, fontWeight: "900", marginTop: 10 },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 12, height: 34 },
  paymentText: { color: muted, fontSize: 13, fontWeight: "700" },
  orderDetailHero: { minHeight: 74, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, marginBottom: 18 },
  orderProgressWrap: { minHeight: 86, borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 8, paddingVertical: 14, marginBottom: 16 },
  orderProgressStep: { flex: 1, alignItems: "center", minWidth: 0 },
  orderProgressDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#eef2f7", alignItems: "center", justifyContent: "center", zIndex: 2 },
  orderProgressDotDone: { backgroundColor: "#bbf7d0" },
  orderProgressLine: { position: "absolute", top: 16, left: "50%", right: "-50%", height: 2, backgroundColor: "#d7dee9", zIndex: 0 },
  orderProgressLineDone: { backgroundColor: BRAND_ORANGE },
  orderProgressLabel: { color: muted, fontSize: 9, fontWeight: "900", lineHeight: 13, textAlign: "center", marginTop: 7, paddingHorizontal: 2 },
  orderProgressLabelDone: { color: text },
  orderDetailsCard: { borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 14, marginBottom: 14 },
  orderItemLine: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  orderItemLineBorder: { borderTopWidth: 1, borderTopColor: border },
  orderLineThumb: { width: 56, height: 56, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  orderLineImage: { width: "100%", height: "100%" },
  orderIssueRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12 },
  orderSmallAction: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  orderIdCard: { height: 70, borderRadius: 14, backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 20 },
  orderId: { color: "#dc2626", fontSize: 22, fontWeight: "900", marginTop: 4, letterSpacing: 0.4 },
  orderCard: { borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 18, marginBottom: 14 },
  orderCardV2: { borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 18, marginBottom: 16 },
  orderSectionBlock: { marginBottom: 16 },
  orderTabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  orderTabButton: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 11 },
  orderTabButtonActive: { borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt },
  orderTabText: { color: muted, fontSize: 12, fontWeight: "900" },
  orderTabTextActive: { color: BRAND_ORANGE },
  orderTabCount: { color: subtle, fontSize: 11, fontWeight: "900" },
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
  couponCardApplied: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  couponTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  couponTextBlock: { flex: 1, minWidth: 0 },
  couponActionRow: { alignItems: "flex-end", gap: 8 },
  couponCopyButton: { minHeight: 32, borderRadius: 16, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  couponCopyText: { color: BRAND_ORANGE, fontSize: 12, fontWeight: "900" },
  couponActionPill: { minWidth: 74, color: BRAND_ORANGE, backgroundColor: "#fff2d8", overflow: "hidden", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, fontWeight: "900", textAlign: "center" },
  appliedCouponPill: { color: "#15803d", backgroundColor: "#dcfce7" },
  couponDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#efcf92" },
  inactiveCoupon: { opacity: 0.62, backgroundColor: "#ffffff" },
  couponCode: { color: text, fontSize: 17, fontWeight: "900" },
  couponValueText: { color: BRAND_ORANGE, fontSize: 14, fontWeight: "900", marginTop: 4 },
  couponDescriptionText: { color: text, fontSize: 13, fontWeight: "800", lineHeight: 19, marginTop: 6 },
  inactivePill: { color: "#6b7280", backgroundColor: "#eef2f7" },
  policyHero: { borderRadius: 20, backgroundColor: surfaceAlt, borderWidth: 1, borderColor: "#efcf92", padding: 16, marginBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  policyHeroText: { flex: 1, minWidth: 0 },
  policyCard: { borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 12 },
  policyTitle: { color: text, fontSize: 16, fontWeight: "900", flex: 1, minWidth: 0 },
  policyAllowed: { color: "#15803d", backgroundColor: "#dcfce7" },
  policyBlocked: { color: "#b91c1c", backgroundColor: "#fee2e2" },
  policyCaseRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: border },
  policyCaseText: { flex: 1, minWidth: 0 },
  rateHero: { alignItems: "center", justifyContent: "center", paddingVertical: 12, marginBottom: 12, gap: 8 },
  ratingCard: { borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, padding: 18, marginBottom: 14 },
  starPicker: { flexDirection: "row", gap: 12, marginTop: 18, marginBottom: 18 },
  rateReviewInput: { minHeight: 116, marginTop: 14 },
  reviewCounter: { color: muted, fontSize: 11, fontWeight: "800", alignSelf: "flex-end", marginTop: 7 },
  reviewPhotoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  reviewPhotoBox: { width: 62, height: 62, borderRadius: 14, overflow: "hidden", backgroundColor: surfaceAlt, borderWidth: 1, borderColor: border },
  reviewPhoto: { width: "100%", height: "100%" },
  reviewPhotoAdd: { width: 62, height: 62, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: border, backgroundColor: inputSurface, alignItems: "center", justifyContent: "center" },
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
