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
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { requestOtpSchema, verifyOtpSchema } from "./src/shared";
import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  Image,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView as RNScrollView,
  type ScrollViewProps,
  StyleSheet,
  Text,
  TextInput,
  StatusBar,
  useWindowDimensions,
  View,
  TouchableOpacity
} from "react-native";
import { z } from "zod";
import { api, getPlatformStatus, refreshAccessToken, uploadMedia, type UploadedMedia } from "./src/api";
import { NotificationProvider } from "./src/components/NotificationProvider";
import { useRegisterPushNotifications } from "./src/hooks/useRegisterPushNotifications";
import { configureForegroundNotificationHandler } from "./src/notifications/handlers";
import { createRealtimeSocket, type ConnectionStatus } from "./src/realtime";
import { playAppSound } from "./src/services/soundService";
import { useAppStore } from "./src/store";
import { getLanguageLabel, localize, t, type AppLanguage } from "../../shared/src/localization";
import { CompactLanguageToggle } from "../../shared/src/compact-language-toggle";
import { PlatformMaintenanceScreen } from "../../shared/src/platform-maintenance-screen";
import { usePlatformStatus } from "../../shared/src/use-platform-status";
import {
  GENDER_FIT_OPTIONS,
  SERVICE_CATEGORIES,
  getGarmentsForGender,
  getServiceCategory,
  type GenderFitType
} from "./src/config/clothDetails";

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
  status: "SUBMITTED" | "RESERVED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
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
  serviceCategory?: string;
  selectedWorkItems?: string[];
  otherWorkDescription?: string;
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
  smallOrderFee?: number;
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
  serviceCategory?: string;
  selectedWorkItems?: string[];
  otherWorkDescription?: string;
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
  serviceCategory?: string;
  selectedWorkItems?: string[];
  otherWorkDescription?: string;
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
  tailorRating?: number;
  deliveryRating?: number;
  tailorReview?: string;
  deliveryReview?: string;
  tailorRatingSubmittedAt?: string;
  deliveryRatingSubmittedAt?: string;
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
type ProfileGender = "Male" | "Female" | "Other" | "";
type ProfileData = { name: string; phone: string; gender?: ProfileGender; dateOfBirth?: string; avatarUri?: string; avatarPreset?: AvatarPreset; hasCompletedOnboarding?: boolean };
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
  serviceCategory?: string;
  selectedWorkItems?: string[];
  otherWorkDescription?: string;
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
const MIN_ANDROID_BOTTOM_INSET = Platform.OS === "android" ? 28 : 0;
const CARD_DARK = "#111111";
const customerAppIcon = require("./app-icon.png");
const measurementsImage = require("./measurements.png");
const ironingImage = require("./assets/icons/ironing.png");
const avatarImages = {
  youngMale: require("./assets/icons/young male.png"),
  youngFemale: require("./assets/icons/young female.png"),
  boy: require("./assets/icons/boy.png"),
  girl: require("./assets/icons/girl.png"),
  uncle: require("./assets/icons/uncle.png"),
  aunt: require("./assets/icons/aunt.png"),
  aunt2: require("./assets/icons/aunt_2.png"),
  blackFemale: require("./assets/icons/black_female.png"),
  blackMale: require("./assets/icons/black_male.png"),
  oldMale: require("./assets/icons/old_male.png"),
  tannedMale: require("./assets/icons/tanned_male.png"),
  tannedMale2: require("./assets/icons/tanned_male_2.png"),
  tannedUncle: require("./assets/icons/tanned_uncle.png")
} as const;

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
          onRefresh={pullToRefresh.onRefresh}
        />
      ) : refreshControl}
      {...props}
    />
  );
});

type AvatarPreset = keyof typeof avatarImages;
const avatarOptions: Array<{ key: AvatarPreset; label: string }> = [
  { key: "boy", label: "Boy" },
  { key: "girl", label: "Girl" },
  { key: "youngMale", label: "Young Male" },
  { key: "youngFemale", label: "Young Female" },
  { key: "uncle", label: "Uncle" },
  { key: "aunt", label: "Aunt" },
  { key: "aunt2", label: "Aunt 2" },
  { key: "blackFemale", label: "Female" },
  { key: "blackMale", label: "Male" },
  { key: "oldMale", label: "Old Male" },
  { key: "tannedMale", label: "Male 2" },
  { key: "tannedMale2", label: "Male 3" },
  { key: "tannedUncle", label: "Uncle 2" }
];
const MAX_MEDIA_FILES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const REQUEST_DESCRIPTION_MIN = 10;
const CUSTOMER_DATA_STORAGE_KEY = "darji.customerDataByPhone.v2";
const CUSTOMER_REQUEST_DRAFT_STORAGE_PREFIX = "darji.customerRequestDraft.v1";
const REQUEST_FLOW_SCREENS = new Set<Screen>(["newRequest", "clothIssue", "orderSummary", "quotes", "confirmOrder"]);
function getPlatformFee(orderValue: number) {
  if (orderValue <= 0) return 0;
  if (orderValue <= 199) return 5;
  if (orderValue <= 499) return 8;
  if (orderValue <= 999) return 10;
  if (orderValue <= 1999) return 15;
  return 20;
}
function getSmallOrderFee(orderValue: number) {
  if (orderValue <= 0) return 0;
  if (orderValue < 99) return 19;
  return 0;
}
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
  ["Cloth damaged by Darji or tailor", "Customer may receive a full refund or compensation according to company policy."],
  ["Delay beyond promised delivery date", "Darji may provide a partial refund, discount coupon, or free express delivery."]
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
    title: "Doorstep Ironing Service",
    text: "Professional ironing with pickup and doorstep delivery",
    tag: "Launching soon",
    image: ironingImage,
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
  { label: "Normal", helper: "Delivery Rs30", icon: "calendar-outline", deliveryFee: 30 },
  { label: "Express", helper: "Delivery Rs40", icon: "flash-outline", deliveryFee: 40 },
  { label: "Instant Delivery", helper: "Delivery Rs50", icon: "rocket-outline", deliveryFee: 50 }
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
  const aliases: Record<string, keyof typeof measurementGuides> = {
    Kurta: "Kurta / Salwar",
    "Kurta Pajama": "Kurta / Salwar",
    Kurti: "Kurta / Salwar",
    "Salwar Suit": "Kurta / Salwar",
    Anarkali: "Kurta / Salwar",
    Blouse: "Saree / Blouse",
    Lehenga: "Saree / Blouse",
    Shirt: "Shirt / Pants",
    Trousers: "Shirt / Pants",
    Pants: "Shirt / Pants",
    Shorts: "Shirt / Pants",
    Suit: "Suit / Blazer",
    Blazer: "Suit / Blazer",
    Waistcoat: "Suit / Blazer",
    Sherwani: "Suit / Blazer"
  };
  const key = clothType ? aliases[clothType] ?? clothType : "";
  return measurementGuides[key] ?? measurementGuides.Others;
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
  urgency: "Normal",
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
      draft.serviceCategory ||
      draft.selectedWorkItems?.length ||
      draft.otherWorkDescription?.trim() ||
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
    serviceCategory: draft.serviceCategory,
    selectedWorkItems: draft.selectedWorkItems,
    otherWorkDescription: draft.otherWorkDescription,
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
    serviceCategory: item.serviceCategory,
    selectedWorkItems: item.selectedWorkItems,
    otherWorkDescription: item.otherWorkDescription,
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

function clothingItemWorkDetails(item: Pick<ClothingItemDraft, "selectedWorkItems" | "otherWorkDescription">) {
  if (item.selectedWorkItems?.length) {
    return `${item.selectedWorkItems.length} work${item.selectedWorkItems.length === 1 ? "" : "s"} selected: ${item.selectedWorkItems.join(", ")}`;
  }
  return item.otherWorkDescription?.trim() || "";
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
  return /authentication required|invalid session|invalid or expired token|session expired|signed in on another device/i.test(message);
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

function normalizedAvatarGender(gender?: string) {
  const value = gender?.trim().toLowerCase();
  if (!value) return undefined;
  if (["male", "man", "men", "boy"].includes(value)) return "boy";
  if (["female", "woman", "women", "girl"].includes(value)) return "girl";
  return undefined;
}

function hashValue(seed?: string) {
  const str = seed || "User";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function ageFromDob(dateOfBirth?: string) {
  if (!dateOfBirth) return undefined;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const birthdayPassed = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 && age < 130 ? age : undefined;
}

type AvatarProfileInput = { name?: string; gender?: string; dateOfBirth?: string; avatarPreset?: AvatarPreset };

function defaultAvatarPreset(profile: AvatarProfileInput): AvatarPreset {
  if (profile.avatarPreset && avatarImages[profile.avatarPreset]) return profile.avatarPreset;
  const gender = normalizedAvatarGender(profile.gender);
  const isBoy = gender ? gender === "boy" : hashValue(profile.name) % 2 === 0;
  const age = ageFromDob(profile.dateOfBirth);
  if (typeof age === "number" && age < 13) return isBoy ? "boy" : "girl";
  if (typeof age === "number" && age >= 45) return isBoy ? "uncle" : "aunt";
  return isBoy ? "youngMale" : "youngFemale";
}

function getDefaultAvatarSource(profile: AvatarProfileInput): ImageSourcePropType {
  return avatarImages[defaultAvatarPreset(profile)];
}

export function getFallbackAvatar(name?: string, gender?: string) {
  const str = name || "User";
  const selectedGender = normalizedAvatarGender(gender);
  if (selectedGender) return `https://avatar.iran.liara.run/public/${selectedGender}?username=${encodeURIComponent(str)}`;
  const isBoy = hashValue(str) % 2 === 0;
  return isBoy 
    ? `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(str)}`
    : `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(str)}`;
}

export function FallbackAvatar({ name, gender, dateOfBirth, avatarPreset, size = 44, style }: { name?: string; gender?: string; dateOfBirth?: string; avatarPreset?: AvatarPreset; size?: number; style?: any }) {
  return <Image source={getDefaultAvatarSource({ name, gender: gender as ProfileGender, dateOfBirth, avatarPreset })} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#f1f5f9" }, style]} />;
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

  const userStories = [...appStories, ...orderStories].sort((a, b) => parseDateSafe(b.createdAt).getTime() - parseDateSafe(a.createdAt).getTime());
  const DEFAULT_STORIES = [
    {
      id: "default-1",
      name: "Priya Sharma",
      location: "Janakpuri, Delhi",
      rating: 5.0,
      review: "Amazing service! They stitched my jacket perfectly and delivered on time..",
      createdAt: "2026-06-29T12:00:00.000Z"
    },
    {
      id: "default-2",
      name: "Aman Gupta",
      location: "Indiranagar, Bangalore",
      rating: 4.8,
      review: "Super convenient home pickup and delivery. The tailor fit was absolute perfection on the first try.",
      createdAt: "2026-06-29T11:00:00.000Z"
    },
    {
      id: "default-3",
      name: "Sneha Patel",
      location: "Andheri West, Mumbai",
      rating: 5.0,
      review: "Loved the online tracking and multiple tailor quotes. Saved me a trip to local tailors.",
      createdAt: "2026-06-29T10:00:00.000Z"
    }
  ];
  return [...userStories, ...DEFAULT_STORIES];
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
  return quote.price + deliveryFeeForUrgency(draft.urgency) + getPlatformFee(quote.price) + homeMeasurementFeeForDraft(draft);
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
  return (
    <View style={styles.center}>
      <Image source={customerAppIcon} resizeMode="contain" style={styles.loginAppIcon} />
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
  const language = useAppStore((state) => state.language);
  const setLanguagePreference = useAppStore((state) => state.setLanguagePreference);
  const requestForm = useForm<RequestOtpForm>({ resolver: zodResolver(requestOtpSchema), defaultValues: { role: "CUSTOMER" } });
  const verifyForm = useForm<VerifyOtpForm>({ resolver: zodResolver(verifyOtpSchema), defaultValues: { role: "CUSTOMER" } });

  async function requestOtp(values: RequestOtpForm) {
    try {
      setIsRequestingOtp(true);
      const result = await api<{ otp?: string }>("/auth/request-otp", { method: "POST", body: JSON.stringify(values) });
      verifyForm.reset({ phone: values.phone, role: "CUSTOMER", otp: result.otp ?? "123456" });
      setOtpRequested(true);
    } catch (error) {
      Alert.alert(localize(language, "OTP failed", "ओटीपी भेजा नहीं जा सका"), error instanceof Error ? error.message : localize(language, "Check backend connection", "इंटरनेट कनेक्शन जाँचें"));
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
      Alert.alert(localize(language, "Login failed", "लॉगिन नहीं हो सका"), error instanceof Error ? error.message : localize(language, "Check OTP and try again", "ओटीपी जाँचकर दोबारा कोशिश करें"));
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.authLanguageCorner}>
        <CompactLanguageToggle language={language} onSelect={setLanguagePreference} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.authLayout}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <DarjiLogoMark />
          <View style={styles.trustRow}>
            <TrustItem icon="shield-outline" label={t(language, "safeSecure")} />
            <TrustItem icon="flash-outline" label={t(language, "fast")} />
            <TrustItem icon="star-outline" label={t(language, "bestServices")} />
          </View>

          <View style={styles.authForm}>
            <Text style={styles.sectionTitle}>{otpRequested ? t(language, "verifyOtp") : t(language, "login")}</Text>
            {!otpRequested ? (
              <>
                <Controller control={requestForm.control} name="phone" render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} />} />
                <AuthButton label={t(language, "sendOtp")} loading={isRequestingOtp} onPress={requestForm.handleSubmit(requestOtp, () => Alert.alert(t(language, "invalidMobileNumber")))} />
              </>
            ) : (
              <>
                <Controller control={verifyForm.control} name="otp" render={({ field }) => <OtpField value={field.value} onChange={field.onChange} />} />
                <AuthButton label={t(language, "verifyOtpButton")} loading={isVerifyingOtp} onPress={verifyForm.handleSubmit(verify, () => Alert.alert(t(language, "otpRequired")))} />
                <Pressable style={styles.editPhoneButton} onPress={() => setOtpRequested(false)}>
                  <Text style={styles.orangeSmall}>{t(language, "changeNumber")}</Text>
                </Pressable>
              </>
            )}
            <Text style={styles.termsText}>
              {localize(language, "By continuing, you agree to our ", "आगे बढ़कर आप हमारी ")}
              <Text style={styles.orangeText}>{localize(language, "Terms of Service", "सेवा की शर्तों")}</Text>
              {localize(language, " and ", " और ")}
              <Text style={styles.orangeText}>{localize(language, "Privacy Policy", "गोपनीयता नीति")}</Text>
              {localize(language, "", " से सहमत होते हैं।")}
            </Text>
          </View>
        </ScrollView>
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

function LanguageSelectorCard({ language, onSelect }: { language: AppLanguage; onSelect: (language: AppLanguage) => void }) {
  return (
    <View style={[styles.whiteCard, { marginBottom: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.addressTitle}>{t(language, "appLanguage")}</Text>
        <Text style={[styles.mutedSmall, { marginTop: 4 }]}>{t(language, "currentLanguage")}: {getLanguageLabel(language)}</Text>
      </View>
      <CompactLanguageToggle language={language} onSelect={onSelect} />
    </View>
  );
}

function RequestProgressBar({ step, total = 2 }: { step: number; total?: number }) {
  return (
    <View style={styles.requestProgressWrap}>
      {Array.from({ length: total }).map((_, index) => {
        const active = index + 1 <= step;
        return <View key={index} style={[styles.requestProgressSegment, active && styles.requestProgressSegmentActive]} />;
      })}
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
  const language = useAppStore((state) => state.language);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, MIN_ANDROID_BOTTOM_INSET);
  const items: { key: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "home", label: t(language, "home"), icon: "home-outline" },
    { key: "search", label: t(language, "search"), icon: "search-outline" },
    { key: "newRequest", label: t(language, "newRequest"), icon: "add" },
    { key: "orders", label: t(language, "orders"), icon: "cube-outline" },
    { key: "profile", label: t(language, "profile"), icon: "person-outline" }
  ];

  return (
    <View style={[styles.tabs, { height: 78 + bottomInset, paddingBottom: 8 + bottomInset }]}>
      {items.map((item) => {
        const selected = active === item.key;
        const isCreate = item.key === "newRequest";
        return (
          <Pressable key={item.key} style={[styles.tabItem, isCreate && styles.createTabItem]} onPress={() => setScreen(item.key)}>
            <View style={isCreate ? styles.createTabButton : undefined}>
              <Ionicons name={item.icon} size={isCreate ? 25 : 22} color={isCreate ? "#111111" : selected ? BRAND_ORANGE : "#151b27"} />
            </View>
            <Text style={[styles.tabText, isCreate && styles.createTabText, selected && styles.activeTabText]}>{item.label}</Text>
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
              {profile.avatarUri 
                ? <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} /> 
                : <FallbackAvatar name={profile.name} gender={profile.gender} dateOfBirth={profile.dateOfBirth} avatarPreset={profile.avatarPreset} size={44} style={styles.avatarImage} />}
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
          <Text style={styles.featureTitle}>Get Tailoring Done{"\n"}at Your Doorstep</Text>
          <Text style={styles.featureSub}>Upload photos, share your needs, and get started in minutes.</Text>
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
              <Image source={typeof item.image === "string" ? { uri: item.image } : item.image} style={styles.mediaFeatureImage} resizeMode="cover" />
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
  const [featuredStories, setFeaturedStories] = useState<CustomerStory[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const activeOrder = orders.find((order) => !["Delivered", "Cancelled"].includes(order.status));
  const incompleteOrders = orders.filter((order) => ["Pending", "Awaiting Payment"].includes(order.status));
  const activeCoupons = coupons.filter((coupon) => !couponUnavailableReason(coupon, 0)).slice(0, 2);
  const localStories = storiesFromCustomerData(profile, orders, appReviews, defaultAddress);
  const stories = featuredStories.length ? featuredStories : localStories;

  useEffect(() => {
    if (!token) return;
    void api<Coupon[]>("/coupons", {}, token).then(setCoupons).catch(() => setCoupons([]));
  }, [token]);

  useEffect(() => {
    void api<CustomerStory[]>("/reviews/featured").then(setFeaturedStories).catch(() => setFeaturedStories([]));
  }, []);

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
    { label: "Custom Stitching", icon: "shirt-outline" }
  ] as const;
  const howItWorks = [
    ["camera-outline", "Upload", "Add cloth photos"],
    ["chatbubbles-outline", "Get Quotes", "Tailors respond"],
    ["card-outline", "Choose & Pay", "Confirm quote"],
    ["cube-outline", "Pickup & Stitch", "We handle pickup"],
    ["checkmark-done-outline", "Delivered", "Get order delivered"]
  ] as const;
  const fabricCareTips = [
    { title: "Cotton Care", copy: "Wash inside-out in cold water and dry in shade to keep colors fresh.", icon: "shirt-outline" },
    { title: "Silk & Delicates", copy: "Use gentle wash or dry clean. Never wring silk, chiffon, or georgette.", icon: "sparkles-outline" },
    { title: "Denim Life", copy: "Wash jeans less often, turn them inside-out, and skip high heat drying.", icon: "water-outline" },
    { title: "White Clothes", copy: "Separate whites, treat stains early, and avoid mixing with bright fabrics.", icon: "sunny-outline" },
    { title: "Storage Tip", copy: "Hang structured garments and fold knits so shoulders do not stretch.", icon: "cube-outline" }
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
              <Image source={profile.avatarUri ? { uri: profile.avatarUri } : getDefaultAvatarSource(profile)} style={styles.avatarImage} />
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
          <Text style={styles.featureTitle}>Get Tailoring Done{"\n"}at Your Doorstep</Text>
          <Text style={styles.featureSub}>Upload photos, share your needs, and get started in minutes.</Text>
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
            <Text style={styles.launchBandTitle}>Ironing Service is Launching Soon!</Text>
            <Text style={styles.launchBandCopy}>Get your clothes picked up, professionally ironed, quality checked, and delivered to your doorstep.</Text>
            <Pressable style={styles.launchNotifyButton} onPress={() => setScreen("featureSoon")}>
              <Text style={styles.launchNotifyText}>Notify Me</Text>
            </Pressable>
          </View>
          <View style={styles.launchIconStack}>
            <Image source={ironingImage} style={styles.launchBandImage} resizeMode="contain" />
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fabricTipRow}>
          {fabricCareTips.map((tip) => (
            <Pressable key={tip.title} style={styles.fabricTipCard} onPress={() => setScreen("measurementGuide")}>
              <View style={styles.fabricTipIcon}>
                <Ionicons name={tip.icon} size={22} color={BRAND_ORANGE} />
              </View>
              <View style={styles.fabricTipText}>
                <Text style={styles.fabricTipTitle}>{tip.title}</Text>
                <Text style={styles.fabricTipCopy}>{tip.copy}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

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
          <Text style={styles.listTitle}>What Customers Say</Text>
          {stories.length ? (
            <Pressable onPress={() => setScreen("customerStories")}>
              <Text style={styles.seeAll}>More</Text>
            </Pressable>
          ) : null}
        </View>
        {stories.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
            {stories.slice(0, 6).map((story) => (
              <View key={story.id} style={styles.largeReviewCard}>
                <View style={styles.reviewHeader}>
                  <FallbackAvatar name={story.name} size={42} />
                  <View style={styles.profileRowText}>
                    <Text style={styles.storyName}>{story.name}</Text>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Ionicons key={starIndex} name={starIndex < Math.round(story.rating) ? "star" : "star-outline"} size={12} color={BRAND_ORANGE} />
                      ))}
                      <Text style={styles.storyRatingText}>{story.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewQuoteMark}>”</Text>
                </View>
                <Text style={styles.largeReviewText} numberOfLines={4}>"{story.review}"</Text>
                <View style={styles.largeReviewFooter}>
                  <View style={styles.storyServicePill}>
                    <Ionicons name="cut-outline" size={13} color={BRAND_ORANGE} />
                    <Text style={styles.storyServiceText}>Alteration</Text>
                  </View>
                  <Text style={styles.mutedSmall}>{story.location}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {false && stories.length ? (() => {
          const displayedStories = stories.slice(0, 3); // Max 3 items for the pagination dots
          const storyIndex = currentReviewIndex % displayedStories.length;
          const story = displayedStories[storyIndex];
          
          return (
            <View style={{
              backgroundColor: "#fff8ed",
              borderRadius: 24,
              padding: 20,
              marginHorizontal: 0,
              marginVertical: 12,
              borderWidth: 1,
              borderColor: "#ffedd5"
            }}>
              {/* Header row inside the light orange block */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: BRAND_DEEP }}>What Our Customers Say</Text>
              </View>
              
              {/* White card container */}
              <View style={{
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2
              }}>
                {/* Quote details */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 14 }}>
                  <Text style={{ color: "#f59e0b", fontSize: 22, fontWeight: "900", lineHeight: 22, marginTop: -4 }}>“</Text>
                  <Text style={{ flex: 1, color: "#334155", fontSize: 14, lineHeight: 20 }}>
                    {story.review}
                  </Text>
                </View>
                
                {/* Footer details inside the white card */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <FallbackAvatar name={story.name} size={44} />
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: "#1e293b" }}>{story.name}</Text>
                      <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{story.location}</Text>
                    </View>
                  </View>
                  
                  {/* Rating details */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="star" size={16} color="#f59e0b" />
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#475569" }}>{story.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
              
              {/* Pagination Dots */}
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 14 }}>
                {displayedStories.map((_, index) => (
                  <Pressable
                    key={index}
                    onPress={() => setCurrentReviewIndex(index)}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: index === storyIndex ? BRAND_ORANGE : "#cbd5e1",
                      marginHorizontal: 4
                    }}
                  />
                ))}
              </View>
            </View>
          );
        })() : null}

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
          <Pressable style={styles.supportRow} onPress={() => setScreen("helpCenter")}>
            <Ionicons name="help-circle-outline" size={21} color={BRAND_DEEP} />
            <View style={styles.profileRowText}>
              <Text style={styles.addressTitle}>FAQs</Text>
              <Text style={styles.mutedSmall}>Find answers to common questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7890" />
          </Pressable>
        </View>
        <Pressable style={styles.rateHomeCard} onPress={() => setScreen("rateApp")}>
          <View style={styles.rateHomeIcon}>
            <Ionicons name="star-outline" size={22} color={BRAND_ORANGE} />
          </View>
          <View style={styles.profileRowText}>
            <Text style={styles.addressTitle}>Rate Darji</Text>
            <Text style={styles.mutedSmall}>Share your experience and help improve Darji.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6b7890" />
        </Pressable>
      </ScrollView>
      <BottomTabs active="home" setScreen={setScreen} />
    </SafeAreaView>
  );
}

function ServicesScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <Header title={t(useAppStore.getState().language, "allServices")} onBack={() => setScreen("home")} />
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
        <Header title={t(useAppStore.getState().language, "launchingSoon")} onBack={() => setScreen("home")} />
        <Image source={typeof feature.image === "string" ? { uri: feature.image } : feature.image} style={styles.launchImage} resizeMode="contain" />
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>UPCOMING SERVICE</Text>
          <Text style={styles.launchTitle}>{feature.title}</Text>
          <Text style={styles.infoCopy}>
            Get your clothes picked up, professionally ironed, and delivered back to your doorstep. We are getting everything ready to bring this service to you soon.
          </Text>
          <View style={styles.launchPointRow}>
            <Ionicons name="shirt-outline" size={18} color={BRAND_ORANGE} />
            <Text style={styles.workflowText}>Doorstep pickup for ironing</Text>
          </View>
          <View style={styles.launchPointRow}>
            <Ionicons name="sparkles-outline" size={18} color={BRAND_ORANGE} />
            <Text style={styles.workflowText}>Professionally ironed and quality checked</Text>
          </View>
          <View style={styles.launchPointRow}>
            <Ionicons name="bicycle-outline" size={18} color={BRAND_ORANGE} />
            <Text style={styles.workflowText}>Delivered back to your doorstep</Text>
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
        <Header title={t(useAppStore.getState().language, "notifications")} onBack={() => setScreen("home")} />
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.listTitle}>Notification Center</Text>
            <Text style={styles.mutedSmall}>{unreadCount} unread updates</Text>
          </View>
          <Pressable style={styles.outlinePill} onPress={onMarkAllRead} disabled={!notifications.length}>
            <Text style={styles.orangeSmall}>Mark all read</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 20 }}>
          {notifications.length ? (
            notifications.map((item) => (
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
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={36} color={BRAND_ORANGE} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.mutedCenter}>You are all caught up.</Text>
            </View>
          )}
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
  const descriptionLength = draft.description.trim().length;
  const descriptionRemaining = Math.max(REQUEST_DESCRIPTION_MIN - descriptionLength, 0);
  const canContinueRequest = draft.media.length > 0 && descriptionLength >= REQUEST_DESCRIPTION_MIN && (!needsPickupAddress || draft.pickup.trim().length >= 8);
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
    if (draft.description.trim().length < REQUEST_DESCRIPTION_MIN) {
      Alert.alert("Description required", `Please describe the stitching, alteration, or issue in at least ${REQUEST_DESCRIPTION_MIN} characters.`);
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
      if (/access to this resource|authentication required|invalid session|session expired/i.test(message)) {
        Alert.alert("Session issue", "Please login again before uploading photos.");
        signOut();
        return;
      }
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  }

  async function pickFromGallery() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo library access to upload photos. Darji receives only the photos you choose, and your information stays safe.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsMultipleSelection: true
      });
      if (!result.canceled) appendMedia(result.assets.map(toLocalMedia));
    } catch (error) {
      Alert.alert(
        "Gallery unavailable",
        error instanceof Error && /access to this resource|permission/i.test(error.message)
          ? "Photo access is blocked. Open device settings and allow photo access for Darji."
          : "Could not open the gallery right now."
      );
    }
  }

  async function openCamera() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow camera access to capture photos. Your photos are safe with Darji and are used only for your tailoring request.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8
      });
      if (!result.canceled) appendMedia(result.assets.map(toLocalMedia));
    } catch (error) {
      Alert.alert(
        "Camera unavailable",
        error instanceof Error && /access to this resource|permission/i.test(error.message)
          ? "Camera access is blocked. Open device settings and allow camera access for Darji."
          : "Could not open the camera right now."
      );
    }
  }

  async function useCurrentLocation() {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow location access to select your current pickup address. Your location is safe with Darji and is used only for pickup and delivery.");
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
        <RequestProgressBar step={1} />
        <View style={styles.requestSafetyCard}>
          <View style={styles.requestSafetyIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#15803d" />
          </View>
          <View style={styles.profileRowText}>
            <Text style={styles.requestHintTitle}>We've Got You</Text>
            <Text style={styles.requestHintCopy}>Your details are safe with us and will only be used to process your request.</Text>
          </View>
        </View>
        {savedItemCount > 0 ? (
          <View style={styles.infoBanner}>
            <Ionicons name="albums-outline" size={17} color={BRAND_ORANGE} />
            <Text style={styles.infoBannerText}>{savedItemCount} {savedItemCount === 1 ? "Item" : "Items"} Added</Text>
          </View>
        ) : null}

        <Text style={styles.formLabel}>Add Photos or Video</Text>
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

        <Text style={styles.formLabel}>Tell Us What You Need</Text>
        <Text style={styles.requestSectionHelper}>The more details you share, the more accurate the price will be.</Text>
        <TextInput
          multiline
          style={styles.descriptionInput}
          placeholder="e.g. Need to shorten the sleeves of my shirt by 2 cm and take in the sides a little."
          placeholderTextColor="#98a4b6"
          value={draft.description}
          onChangeText={(description) => setDraft({ ...draft, description })}
        />
        <Text style={[styles.fieldDisclaimer, styles.descriptionCounter]}>
          {descriptionRemaining > 0 ? `${descriptionRemaining} more character${descriptionRemaining === 1 ? "" : "s"} required.` : "Description looks good."}
        </Text>

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
              <Pressable style={styles.addressInlineEdit} onPress={() => setEditingAddress((value) => !value)}>
                <Ionicons name={editingAddress ? "checkmark-outline" : "create-outline"} size={17} color={BRAND_ORANGE} />
              </Pressable>
            </View>
            <View style={styles.addressActions}>
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

        <View style={styles.requestRequirementBanner}>
          <Ionicons name="information-circle-outline" size={17} color="#b45309" />
          <Text style={styles.requestRequirementText}>Photos, work details and pickup address are needed to continue.</Text>
        </View>
        {isAddingAnotherItem ? (
          <Pressable style={styles.secondaryWideButton} onPress={leaveCurrentItem} disabled={uploading}>
            <Ionicons name="close-circle-outline" size={18} color={BRAND_DEEP} />
            <Text style={styles.secondaryWideButtonText}>Cancel This Item</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.primaryWideButton, (!canContinueRequest || uploading) && styles.disabledDarkButton]} onPress={uploadAndContinue} disabled={!canContinueRequest || uploading}>
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
      <Text numberOfLines={3} style={[styles.optionText, selected && styles.selectedOptionText]}>{label}</Text>
    </Pressable>
  );
}

function SelectedFlowChoice({
  icon,
  label,
  subtitle,
  onClear
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onClear: () => void;
}) {
  return (
    <View style={styles.selectedFlowChoice}>
      <View style={styles.selectedFlowChoiceIcon}>
        <Ionicons name={icon} size={19} color={BRAND_ORANGE} />
      </View>
      <View style={styles.selectedFlowChoiceText}>
        <Text style={styles.selectedFlowChoiceLabel}>{label}</Text>
        {subtitle ? <Text style={styles.selectedFlowChoiceSubtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Clear ${label}`}
        hitSlop={8}
        onPress={onClear}
        style={styles.selectedFlowChoiceClear}
      >
        <Ionicons name="close" size={18} color={BRAND_DEEP} />
      </Pressable>
    </View>
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

function ClothGuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"Men" | "Women" | "Kids">("Men");

  const menData = {
    halfShirt: [
      { size: "S (36)", plain: "1.8 m", pattern: "2.0 m" },
      { size: "M (38)", plain: "2.0 m", pattern: "2.2 m" },
      { size: "L (40)", plain: "2.1 m", pattern: "2.3 m" },
      { size: "XL (42)", plain: "2.2 m", pattern: "2.5 m" },
      { size: "XXL (44)", plain: "2.4 m", pattern: "2.7 m" }
    ],
    fullShirt: [
      { size: "S (36)", plain: "2.0 m", pattern: "2.2 m" },
      { size: "M (38)", plain: "2.2 m", pattern: "2.4 m" },
      { size: "L (40)", plain: "2.3 m", pattern: "2.5 m" },
      { size: "XL (42)", plain: "2.5 m", pattern: "2.7 m" },
      { size: "XXL (44)", plain: "2.7 m", pattern: "2.9 m" }
    ],
    kurta: [
      { size: "S", plain: "2.5 m", pattern: "2.7 m" },
      { size: "M", plain: "2.7 m", pattern: "2.9 m" },
      { size: "L", plain: "2.9 m", pattern: "3.1 m" },
      { size: "XL", plain: "3.1 m", pattern: "3.3 m" },
      { size: "XXL", plain: "3.3 m", pattern: "3.5 m" }
    ],
    pathani: [
      { size: "S", plain: "3.5 m", pattern: "3.7 m" },
      { size: "M", plain: "3.7 m", pattern: "3.9 m" },
      { size: "L", plain: "3.9 m", pattern: "4.1 m" },
      { size: "XL", plain: "4.1 m", pattern: "4.3 m" },
      { size: "XXL", plain: "4.3 m", pattern: "4.5 m" }
    ],
    trouser: [
      { size: "S", plain: "1.3 m", pattern: "1.4 m" },
      { size: "M", plain: "1.4 m", pattern: "1.5 m" },
      { size: "L", plain: "1.5 m", pattern: "1.6 m" },
      { size: "XL", plain: "1.6 m", pattern: "1.8 m" },
      { size: "XXL", plain: "1.8 m", pattern: "2.0 m" }
    ],
    churidar: [
      { size: "S", plain: "2.2 m", pattern: "2.4 m" },
      { size: "M", plain: "2.4 m", pattern: "2.6 m" },
      { size: "L", plain: "2.6 m", pattern: "2.8 m" },
      { size: "XL", plain: "2.8 m", pattern: "3.0 m" },
      { size: "XXL", plain: "3.0 m", pattern: "3.2 m" }
    ],
    waistcoat: [
      { size: "S", plain: "1.2 m", pattern: "1.3 m" },
      { size: "M", plain: "1.3 m", pattern: "1.4 m" },
      { size: "L", plain: "1.4 m", pattern: "1.5 m" },
      { size: "XL", plain: "1.5 m", pattern: "1.6 m" },
      { size: "XXL", plain: "1.6 m", pattern: "1.8 m" }
    ],
    blazer: [
      { size: "S", plain: "2.5 m", pattern: "2.7 m" },
      { size: "M", plain: "2.7 m", pattern: "2.9 m" },
      { size: "L", plain: "2.9 m", pattern: "3.1 m" },
      { size: "XL", plain: "3.1 m", pattern: "3.3 m" },
      { size: "XXL", plain: "3.3 m", pattern: "3.5 m" }
    ],
    sherwani: [
      { size: "S", plain: "3.0 m", pattern: "3.2 m" },
      { size: "M", plain: "3.2 m", pattern: "3.4 m" },
      { size: "L", plain: "3.4 m", pattern: "3.6 m" },
      { size: "XL", plain: "3.6 m", pattern: "3.8 m" },
      { size: "XXL", plain: "3.8 m", pattern: "4.0 m" }
    ]
  };

  const womenData = {
    shortKurti: [
      { size: "S", plain: "2.0 m", pattern: "2.2 m" },
      { size: "M", plain: "2.2 m", pattern: "2.4 m" },
      { size: "L", plain: "2.4 m", pattern: "2.6 m" },
      { size: "XL", plain: "2.6 m", pattern: "2.8 m" },
      { size: "XXL", plain: "2.8 m", pattern: "3.0 m" }
    ],
    longKurti: [
      { size: "S", plain: "2.5 m", pattern: "2.7 m" },
      { size: "M", plain: "2.7 m", pattern: "2.9 m" },
      { size: "L", plain: "2.9 m", pattern: "3.1 m" },
      { size: "XL", plain: "3.1 m", pattern: "3.3 m" },
      { size: "XXL", plain: "3.3 m", pattern: "3.5 m" }
    ],
    straightKurta: [
      { size: "S", plain: "2.5 m", pattern: "2.7 m" },
      { size: "M", plain: "2.7 m", pattern: "2.9 m" },
      { size: "L", plain: "2.9 m", pattern: "3.1 m" },
      { size: "XL", plain: "3.1 m", pattern: "3.3 m" },
      { size: "XXL", plain: "3.3 m", pattern: "3.5 m" }
    ],
    anarkali: [
      { size: "S", plain: "4.5 m", pattern: "5.0 m" },
      { size: "M", plain: "5.0 m", pattern: "5.5 m" },
      { size: "L", plain: "5.5 m", pattern: "6.0 m" },
      { size: "XL", plain: "6.0 m", pattern: "6.5 m" },
      { size: "XXL", plain: "6.5 m", pattern: "7.0 m" }
    ],
    palazzo: [
      { size: "S", plain: "2.5 m", pattern: "2.6 m" },
      { size: "M", plain: "2.6 m", pattern: "2.7 m" },
      { size: "L", plain: "2.7 m", pattern: "2.8 m" },
      { size: "XL", plain: "2.8 m", pattern: "3.0 m" },
      { size: "XXL", plain: "3.0 m", pattern: "3.2 m" }
    ],
    salwar: [
      { size: "S", plain: "2.2 m", pattern: "2.3 m" },
      { size: "M", plain: "2.3 m", pattern: "2.4 m" },
      { size: "L", plain: "2.4 m", pattern: "2.5 m" },
      { size: "XL", plain: "2.5 m", pattern: "2.7 m" },
      { size: "XXL", plain: "2.7 m", pattern: "2.9 m" }
    ],
    churidar: [
      { size: "S", plain: "2.5 m", pattern: "2.6 m" },
      { size: "M", plain: "2.6 m", pattern: "2.7 m" },
      { size: "L", plain: "2.7 m", pattern: "2.8 m" },
      { size: "XL", plain: "2.8 m", pattern: "3.0 m" },
      { size: "XXL", plain: "3.0 m", pattern: "3.2 m" }
    ],
    halfBlouse: [
      { size: "S", plain: "0.8 m", pattern: "0.9 m" },
      { size: "M", plain: "0.9 m", pattern: "1.0 m" },
      { size: "L", plain: "1.0 m", pattern: "1.1 m" },
      { size: "XL", plain: "1.1 m", pattern: "1.2 m" },
      { size: "XXL", plain: "1.2 m", pattern: "1.3 m" }
    ],
    fullBlouse: [
      { size: "S", plain: "1.2 m", pattern: "1.3 m" },
      { size: "M", plain: "1.3 m", pattern: "1.4 m" },
      { size: "L", plain: "1.4 m", pattern: "1.5 m" },
      { size: "XL", plain: "1.5 m", pattern: "1.6 m" },
      { size: "XXL", plain: "1.6 m", pattern: "1.8 m" }
    ],
    lehenga: [
      { size: "S", plain: "3.5 m", pattern: "4.0 m" },
      { size: "M", plain: "4.0 m", pattern: "4.5 m" },
      { size: "L", plain: "4.5 m", pattern: "5.0 m" },
      { size: "XL", plain: "5.0 m", pattern: "5.5 m" },
      { size: "XXL", plain: "5.5 m", pattern: "6.0 m" }
    ],
    dupatta: [
      { size: "S", plain: "2.25 m", pattern: "2.25 m" },
      { size: "M", plain: "2.25 m", pattern: "2.25 m" },
      { size: "L", plain: "2.25 m", pattern: "2.25 m" },
      { size: "XL", plain: "2.5 m", pattern: "2.5 m" },
      { size: "XXL", plain: "2.5 m", pattern: "2.5 m" }
    ],
    saree: [
      { size: "S", plain: "5.5 m", pattern: "5.5 m" },
      { size: "M", plain: "5.5 m", pattern: "5.5 m" },
      { size: "L", plain: "5.5 m", pattern: "5.5 m" },
      { size: "XL", plain: "6.0 m", pattern: "6.0 m" },
      { size: "XXL", plain: "6.0 m", pattern: "6.0 m" }
    ]
  };

  const kidsData = {
    shirt: [
      { age: "1–2 yrs", plain: "0.8 m", pattern: "0.9 m" },
      { age: "3–5 yrs", plain: "1.0 m", pattern: "1.1 m" },
      { age: "6–8 yrs", plain: "1.2 m", pattern: "1.3 m" },
      { age: "9–12 yrs", plain: "1.5 m", pattern: "1.6 m" }
    ],
    pant: [
      { age: "1–2 yrs", plain: "0.7 m", pattern: "0.8 m" },
      { age: "3–5 yrs", plain: "0.9 m", pattern: "1.0 m" },
      { age: "6–8 yrs", plain: "1.1 m", pattern: "1.2 m" },
      { age: "9–12 yrs", plain: "1.3 m", pattern: "1.4 m" }
    ],
    kurta: [
      { age: "1–2 yrs", plain: "1.2 m", pattern: "1.3 m" },
      { age: "3–5 yrs", plain: "1.5 m", pattern: "1.6 m" },
      { age: "6–8 yrs", plain: "1.8 m", pattern: "1.9 m" },
      { age: "9–12 yrs", plain: "2.2 m", pattern: "2.3 m" }
    ],
    frock: [
      { age: "1–2 yrs", plain: "1.2 m", pattern: "1.3 m" },
      { age: "3–5 yrs", plain: "1.8 m", pattern: "1.9 m" },
      { age: "6–8 yrs", plain: "2.3 m", pattern: "2.4 m" },
      { age: "9–12 yrs", plain: "2.8 m", pattern: "2.9 m" }
    ]
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        {/* Header */}
        <View style={styles.guideHeader}>
          <Pressable style={styles.guideBackButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </Pressable>
          <Text style={styles.guideHeaderTitle}>Cloth Guide</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Buttons */}
        <View style={styles.guideTabContainer}>
          {(["Men", "Women", "Kids"] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.guideTabButton, activeTab === tab && styles.guideActiveTabButton]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.guideTabButtonText, activeTab === tab && styles.guideActiveTabButtonText]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
          {/* Info Banner */}
          <View style={styles.guideInfoBanner}>
            <Ionicons name="calculator-outline" size={22} color="#d97706" />
            <Text style={styles.guideInfoBannerText}>
              The cloth required may vary depending on the design, fabric width and your body build.
            </Text>
          </View>

          {activeTab === "Men" && (
            <View>
              {/* Section Header */}
              <View style={styles.guideSectionHeader}>
                <Ionicons name="man" size={18} color="#111111" />
                <Text style={styles.guideSectionHeaderText}>MEN</Text>
              </View>

              {/* Half Sleeve Shirt */}
              <Text style={styles.guideTableTitle}>Half Sleeve Shirt</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.halfShirt.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Full Sleeve Shirt */}
              <Text style={styles.guideTableTitle}>Full Sleeve Shirt</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.fullShirt.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Kurta */}
              <Text style={styles.guideTableTitle}>Kurta (Knee Length)</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.kurta.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Pathani Suit */}
              <Text style={styles.guideTableTitle}>Pathani Suit</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.pathani.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Trouser */}
              <Text style={styles.guideTableTitle}>Trouser</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.trouser.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Churidar */}
              <Text style={styles.guideTableTitle}>Churidar</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.churidar.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Waistcoat */}
              <Text style={styles.guideTableTitle}>Waistcoat</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.waistcoat.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Blazer */}
              <Text style={styles.guideTableTitle}>Blazer</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.blazer.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Sherwani */}
              <Text style={styles.guideTableTitle}>Sherwani</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Checked / Printed</Text>
                </View>
                {menData.sherwani.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === "Women" && (
            <View>
              {/* Section Header */}
              <View style={styles.guideSectionHeader}>
                <Ionicons name="woman" size={18} color="#111111" />
                <Text style={styles.guideSectionHeaderText}>WOMEN</Text>
              </View>

              {/* Short Kurti */}
              <Text style={styles.guideTableTitle}>Short Kurti</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.shortKurti.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Long Kurti */}
              <Text style={styles.guideTableTitle}>Long Kurti</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.longKurti.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Straight Kurta */}
              <Text style={styles.guideTableTitle}>Straight Kurta</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.straightKurta.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Anarkali */}
              <Text style={styles.guideTableTitle}>Anarkali</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.anarkali.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Palazzo */}
              <Text style={styles.guideTableTitle}>Palazzo</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.palazzo.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Salwar */}
              <Text style={styles.guideTableTitle}>Salwar</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.salwar.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Churidar */}
              <Text style={styles.guideTableTitle}>Churidar</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.churidar.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Blouse (Half Sleeve) */}
              <Text style={styles.guideTableTitle}>Blouse (Half Sleeve)</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.halfBlouse.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Blouse (Full Sleeve) */}
              <Text style={styles.guideTableTitle}>Blouse (Full Sleeve)</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.fullBlouse.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Lehenga */}
              <Text style={styles.guideTableTitle}>Lehenga (Skirt Only)</Text>
              <Text style={styles.guideTableWidthText}>Fabric Width: 44–45 inch</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.lehenga.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Dupatta */}
              <Text style={styles.guideTableTitle}>Dupatta</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.5 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.dupatta.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.5 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>

              {/* Saree */}
              <Text style={styles.guideTableTitle}>Saree</Text>
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell, { flex: 1.2 }]}>Size</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                {womenData.saree.map((row) => (
                  <View key={row.size} style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { flex: 1.2 }]}>{row.size}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === "Kids" && (
            <View>
              {/* Section Header */}
              <View style={styles.guideSectionHeader}>
                <Ionicons name="happy" size={18} color="#111111" />
                <Text style={styles.guideSectionHeaderText}>KIDS</Text>
              </View>

              {/* Kids Table */}
              <View style={styles.guideTableContainer}>
                <View style={styles.guideTableHeaderRow}>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Outfit</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Age</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Plain Fabric</Text>
                  <Text style={[styles.guideTableCell, styles.guideTableHeaderCell]}>Printed / Pattern</Text>
                </View>
                
                {/* Shirt section */}
                {kidsData.shirt.map((row, idx) => (
                  <View key={`kid-shirt-${row.age}`} style={styles.guideTableRow}>
                    {idx === 0 ? <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { fontWeight: "900" }]}>Shirt</Text> : <Text style={styles.guideTableCell} />}
                    <Text style={styles.guideTableCell}>{row.age}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}

                {/* Pant section */}
                {kidsData.pant.map((row, idx) => (
                  <View key={`kid-pant-${row.age}`} style={styles.guideTableRow}>
                    {idx === 0 ? <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { fontWeight: "900" }]}>Pant</Text> : <Text style={styles.guideTableCell} />}
                    <Text style={styles.guideTableCell}>{row.age}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}

                {/* Kurta section */}
                {kidsData.kurta.map((row, idx) => (
                  <View key={`kid-kurta-${row.age}`} style={styles.guideTableRow}>
                    {idx === 0 ? <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { fontWeight: "900" }]}>Kurta</Text> : <Text style={styles.guideTableCell} />}
                    <Text style={styles.guideTableCell}>{row.age}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}

                {/* Frock section */}
                {kidsData.frock.map((row, idx) => (
                  <View key={`kid-frock-${row.age}`} style={styles.guideTableRow}>
                    {idx === 0 ? <Text style={[styles.guideTableCell, styles.guideTableLabelCell, { fontWeight: "900" }]}>Frock</Text> : <Text style={styles.guideTableCell} />}
                    <Text style={styles.guideTableCell}>{row.age}</Text>
                    <Text style={styles.guideTableCell}>{row.plain}</Text>
                    <Text style={styles.guideTableCell}>{row.pattern}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bottom Note */}
          <View style={styles.guideNoteCard}>
            <Ionicons name="bulb-outline" size={20} color="#b45309" />
            <Text style={styles.guideNoteText}>
              <Text style={{ fontWeight: "900", color: "#78350f" }}>Note: </Text>
              These are recommended minimum fabric requirements for standard designs using 44–45 inch wide fabric. If your design includes extra flare, embroidery, pleats, ruffles, lining, large collars, or if your height is above 5'10" (178 cm), please add <Text style={{ fontWeight: "900" }}>0.25–1.0 meter</Text> of extra fabric. Final fabric requirements may vary based on the tailor's cutting method and design.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
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
        <Header title={t(useAppStore.getState().language, "howToMeasure")} onBack={() => setScreen("home")} />
        <Text style={styles.helperText}>Use this guide before creating a request. Accurate measurements help tailors understand your fit and price the work correctly.</Text>
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
  const [savingAction, setSavingAction] = useState<"summary" | "another" | undefined>();
  const [garmentSearch, setGarmentSearch] = useState("");
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showHomeMeasurementModal, setShowHomeMeasurementModal] = useState(false);
  const [showClothGuideModal, setShowClothGuideModal] = useState(false);
  const [stitchingWarningDismissed, setStitchingWarningDismissed] = useState(Boolean(draft.editingItemId));
  const [clothWarningAccepted, setClothWarningAccepted] = useState(false);
  const [showAllWorkOptions, setShowAllWorkOptions] = useState((draft.selectedWorkItems?.length ?? 0) === 0);
  const token = useAppStore((state) => state.token);
  const measurementGuide = guideForClothType(draft.clothType);
  const measurements = draft.measurements ?? {};
  const hasManualMeasurements = Object.values(measurements).some((value) => value.trim()) || Boolean(draft.measurementNotes?.trim());
  const [showManualMeasurements, setShowManualMeasurements] = useState(hasManualMeasurements);
  const selectedService = getServiceCategory(draft.serviceCategory ?? draft.workType);
  const selectedWorkItems = draft.selectedWorkItems ?? [];
  const garments = getGarmentsForGender(draft.gender);
  const normalizedGarmentSearch = garmentSearch.trim().toLowerCase();
  const filteredGarments = normalizedGarmentSearch
    ? garments.filter((garment) => garment.toLowerCase().includes(normalizedGarmentSearch))
    : garments;
  const hasWorkSelection = selectedService?.label === "Other"
    ? Boolean(draft.otherWorkDescription?.trim())
    : selectedWorkItems.length > 0;
  const canContinue = Boolean(
    draft.gender &&
    draft.clothType &&
    selectedService &&
    hasWorkSelection &&
    draft.urgency &&
    (showManualMeasurements || draft.sampleProvided || draft.homeMeasurementBooked)
  );
  const savedItemCount = draft.items?.length ?? 0;
  const showUrgencyPicker = savedItemCount === 0 || !draft.urgency;

  function selectClothType(clothType: string) {
    setShowManualMeasurements(false);
    setShowAllWorkOptions(true);
    setDraft({
      ...draft,
      clothType,
      serviceCategory: undefined,
      workType: undefined,
      selectedWorkItems: [],
      otherWorkDescription: "",
      measurements: {},
      measurementNotes: ""
    });
  }

  function clearClothType() {
    setGarmentSearch("");
    setShowManualMeasurements(false);
    setShowAllWorkOptions(true);
    setDraft({
      ...draft,
      clothType: undefined,
      serviceCategory: undefined,
      workType: undefined,
      selectedWorkItems: [],
      otherWorkDescription: "",
      measurements: {},
      measurementNotes: ""
    });
  }

  function selectGender(gender: GenderFitType) {
    setGarmentSearch("");
    setShowManualMeasurements(false);
    setDraft({
      ...draft,
      gender,
      clothType: undefined,
      serviceCategory: undefined,
      workType: undefined,
      selectedWorkItems: [],
      otherWorkDescription: "",
      measurements: {},
      measurementNotes: ""
    });
    setShowAllWorkOptions(true);
  }

  function selectServiceCategory(serviceCategory: string) {
    setDraft({
      ...draft,
      serviceCategory,
      workType: serviceCategory,
      selectedWorkItems: [],
      otherWorkDescription: ""
    });
    setShowAllWorkOptions(true);
    setClothWarningAccepted(false);
    setStitchingWarningDismissed(serviceCategory !== "New Stitching");
  }

  function clearServiceCategory() {
    setShowAllWorkOptions(true);
    setClothWarningAccepted(false);
    setDraft({
      ...draft,
      serviceCategory: undefined,
      workType: undefined,
      selectedWorkItems: [],
      otherWorkDescription: ""
    });
  }

  function toggleWorkItem(workItem: string) {
    const nextItems = selectedWorkItems.includes(workItem)
      ? selectedWorkItems.filter((item) => item !== workItem)
      : [...selectedWorkItems, workItem];
    setDraft({ ...draft, selectedWorkItems: nextItems });
    setShowAllWorkOptions(nextItems.length === 0);
  }

  function setMeasurement(field: string, value: string) {
    setDraft({ ...draft, measurements: { ...measurements, [field]: value } });
  }

  async function pickSampleImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to upload a sample garment photo. Darji receives only the photo you choose, and your information stays safe.");
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
    const hasMeasurement = showManualMeasurements || draft.sampleProvided || draft.homeMeasurementBooked;
    if (!hasMeasurement) {
      Alert.alert("Measurement required", "Please choose at least one measurement option: Enter manual measurements, Send a sample, or Book home measurement.");
      return undefined;
    }
    if (draft.description.trim().length < REQUEST_DESCRIPTION_MIN) {
      Alert.alert("Add details", `Describe the issue in at least ${REQUEST_DESCRIPTION_MIN} characters.`);
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
      {selectedService?.label === "New Stitching" && !stitchingWarningDismissed ? (
        <ScrollView contentContainerStyle={styles.pageContent}>
          <Header
            title="New Stitching"
            onBack={() => {
              setDraft({
                ...draft,
                serviceCategory: undefined,
                workType: undefined,
                selectedWorkItems: [],
                otherWorkDescription: ""
              });
            }}
          />

          {/* Warning Card */}
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={54} color="#f97316" style={{ alignSelf: "center", marginBottom: 12 }} />
            <Text style={styles.warningTitle}>Important: Provide Enough Cloth</Text>
            <Text style={styles.warningParagraph}>
              Please make sure the cloth you provide is sufficient for the selected stitching type and size. Insufficient cloth may result in incomplete stitching or pattern adjustments.
            </Text>
            <Text style={styles.warningTipText}>
              <Text style={{ fontWeight: "900", color: "#b45309" }}>Tip: </Text>
              Tap on “Cloth Guide” to check how much cloth is needed for different outfits and sizes.
            </Text>
            
            <Pressable style={styles.warningClothGuideButton} onPress={() => setShowClothGuideModal(true)}>
              <Ionicons name="book-outline" size={20} color="#ffffff" />
              <Text style={styles.warningClothGuideButtonText}>Cloth Guide</Text>
            </Pressable>
          </View>

          {/* Why is this important section */}
          <Text style={styles.warningSectionHeader}>Why is this important?</Text>
          
          <View style={styles.warningBulletItem}>
            <View style={styles.warningBulletIconContainer}>
              <Ionicons name="resize-outline" size={20} color="#b45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningBulletText}>Not enough cloth may affect the fit and look.</Text>
            </View>
          </View>

          <View style={styles.warningBulletItem}>
            <View style={styles.warningBulletIconContainer}>
              <Ionicons name="cut-outline" size={20} color="#b45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningBulletText}>Extra design, sleeves or length may need more cloth.</Text>
            </View>
          </View>

          <View style={styles.warningBulletItem}>
            <View style={styles.warningBulletIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#b45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningBulletText}>Providing right amount saves time and avoids delays.</Text>
            </View>
          </View>

          <Pressable style={styles.warningAgreementRow} onPress={() => setClothWarningAccepted((current) => !current)}>
            <Ionicons name={clothWarningAccepted ? "checkbox" : "square-outline"} size={20} color={BRAND_ORANGE} />
            <Text style={styles.warningAgreementText}>I have checked my fabric and understand the information above.</Text>
          </Pressable>

          <Pressable
            disabled={!clothWarningAccepted}
            style={[styles.primaryWideButton, !clothWarningAccepted && styles.disabledDarkButton]}
            onPress={() => setStitchingWarningDismissed(true)}
          >
            <Text style={[styles.primaryWideButtonText, !clothWarningAccepted && styles.disabledText]}>Continue</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.pageContent}>
          <Header title="Cloth Details" onBack={() => setScreen(draft.editingItemId ? "orderSummary" : "newRequest")} right={<Text style={styles.stepBadge}>2/2</Text>} />
        <RequestProgressBar step={2} />
        {savedItemCount > 0 ? (
          <View style={styles.infoBanner}>
            <Ionicons name="albums-outline" size={17} color={BRAND_ORANGE} />
            <Text style={styles.infoBannerText}>{savedItemCount} {savedItemCount === 1 ? "Item" : "Items"} Added</Text>
          </View>
        ) : null}

        <Text style={styles.formLabel}>Gender / Fit Type</Text>
        <View style={styles.twoCol}>
          {GENDER_FIT_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              icon={option.icon}
              label={option.label}
              selected={draft.gender === option.value}
              onPress={() => selectGender(option.value)}
            />
          ))}
        </View>

        {draft.gender ? (
          <>
            <Text style={styles.formLabel}>Select Garment</Text>
            {draft.clothType ? (
              <SelectedFlowChoice icon="shirt-outline" label={draft.clothType} onClear={clearClothType} />
            ) : (
              <>
                <View style={styles.garmentSearchBox}>
                  <Ionicons name="search-outline" size={17} color="#6a788d" />
                  <TextInput
                    style={styles.garmentSearchInput}
                    value={garmentSearch}
                    onChangeText={setGarmentSearch}
                    placeholder="Search garment..."
                    placeholderTextColor="#98a4b6"
                  />
                  {garmentSearch ? (
                    <Pressable onPress={() => setGarmentSearch("")}>
                      <Ionicons name="close-circle" size={17} color="#98a4b6" />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.twoCol}>
                  {filteredGarments.map((garment) => (
                    <OptionButton
                      key={garment}
                      icon="shirt-outline"
                      label={garment}
                      selected={false}
                      onPress={() => selectClothType(garment)}
                    />
                  ))}
                </View>
                {!filteredGarments.length ? (
                  <View style={styles.infoBanner}>
                    <Ionicons name="search-outline" size={17} color={BRAND_ORANGE} />
                    <Text style={styles.infoBannerText}>No garments match “{garmentSearch.trim()}”.</Text>
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {draft.clothType ? (
          <>
            <Text style={styles.formLabel}>Select Service Category</Text>
            {selectedService ? (
              <SelectedFlowChoice
                icon={selectedService.icon}
                label={selectedService.label}
                subtitle={selectedService.subtitle}
                onClear={clearServiceCategory}
              />
            ) : (
              <View style={styles.serviceCategoryList}>
                {SERVICE_CATEGORIES.map((category) => (
                  <Pressable
                    key={category.id}
                    style={styles.serviceCategoryCard}
                    onPress={() => selectServiceCategory(category.label)}
                  >
                    <View style={styles.serviceCategoryIcon}>
                      <Ionicons name={category.icon} size={18} color="#7d8491" />
                    </View>
                    <View style={styles.serviceCategoryText}>
                      <Text style={[styles.optionText, styles.serviceCategoryTitle]}>{category.label}</Text>
                      <Text style={styles.serviceCategorySubtitle}>{category.subtitle}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : null}

        {selectedService ? (
          <>
            <Text style={styles.formLabel}>Select Work</Text>
            <Text style={styles.workSelectionHelper}>
              {selectedWorkItems.length ? `${selectedWorkItems.length} selected` : "You can select multiple"}
            </Text>
            {selectedService.label === "Other" ? (
              <TextInput
                multiline
                style={styles.otherWorkInput}
                value={draft.otherWorkDescription ?? ""}
                onChangeText={(otherWorkDescription) => setDraft({ ...draft, otherWorkDescription })}
                placeholder="Describe the work needed..."
                placeholderTextColor="#98a4b6"
              />
            ) : (
              <>
                <View style={styles.workSelectionList}>
                  {(showAllWorkOptions ? selectedService.workItems : selectedWorkItems).map((workItem) => {
                    const selected = selectedWorkItems.includes(workItem);
                    return (
                      <Pressable
                        key={workItem}
                        style={[styles.workSelectionChip, selected && styles.workSelectionChipSelected]}
                        onPress={() => toggleWorkItem(workItem)}
                      >
                        <Ionicons name={selected ? "checkbox" : "square-outline"} size={19} color={selected ? BRAND_ORANGE : "#98a4b6"} />
                        <Text style={[styles.workSelectionText, selected && styles.selectedOptionText]}>{workItem}</Text>
                        {selected && !showAllWorkOptions ? <Ionicons name="close" size={17} color={BRAND_DEEP} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
                {!showAllWorkOptions && selectedWorkItems.length < selectedService.workItems.length ? (
                  <Pressable style={styles.addWorkButton} onPress={() => setShowAllWorkOptions(true)}>
                    <Ionicons name="add-circle-outline" size={17} color={BRAND_ORANGE} />
                    <Text style={styles.addWorkButtonText}>Add another work</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </>
        ) : null}

        <View style={styles.measurementChoiceHeader}>
          <View style={styles.measurementChoiceAccent} />
          <Text style={styles.measurementChoiceHeading}>How would you like to provide measurements?</Text>
        </View>
        {!showManualMeasurements ? (
          <Pressable style={styles.manualMeasureLink} onPress={() => setShowManualMeasurements(true)}>
            <Text style={styles.manualMeasureText}>Enter measurement manually?</Text>
            <Ionicons name="create-outline" size={16} color={BRAND_ORANGE} />
          </Pressable>
        ) : null}

        <View style={[styles.sampleReferenceCard, draft.sampleProvided && styles.sampleReferenceCardSelected]}>
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
              <Text style={styles.sampleBulletDot}>-</Text>
              <Text style={styles.sampleBulletText}>Best for matching your preferred fit.</Text>
            </View>
            <View style={styles.sampleBulletRow}>
              <Text style={styles.sampleBulletDot}>-</Text>
              <Text style={styles.sampleBulletText}>Do not send stretchable samples like rayon.</Text>
            </View>
            <View style={styles.sampleBulletRow}>
              <Text style={styles.sampleBulletDot}>-</Text>
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

        {showManualMeasurements ? (
          <View style={styles.measurementCard}>
            <View style={styles.rowBetween}>
              <View style={styles.measurementTitleBlock}>
                <Text style={styles.cardLabel}>MEASUREMENTS</Text>
                <Text style={styles.addressTitle}>{draft.clothType || "Cloth measurements"}</Text>
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
            {false ? (
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
            ) : null}
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
            <Ionicons name="help-circle-outline" size={21} color={draft.homeMeasurementBooked ? BRAND_ORANGE : "#7d8491"} />
          </View>
          <View style={styles.homeMeasurementTextBlock}>
            <Text style={styles.homeMeasurementTitle}>Not sure about your measurement?</Text>
            <Text style={styles.homeMeasurementCopy}>{draft.homeMeasurementBooked ? `Tailor visit added: Rs${HOME_MEASUREMENT_FEE}` : "Book a tailor to get measured at home"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={draft.homeMeasurementBooked ? BRAND_ORANGE : "#7d8491"} />
        </Pressable>

        {showUrgencyPicker ? (
          <>
            <Text style={styles.formLabel}>When Do You Need It?</Text>
            <View style={styles.urgencyRow}>
              {urgencyOptions.map((option) => (
                <Pressable key={option.label} style={[styles.urgencyButton, draft.urgency === option.label && styles.selectedUrgency]} onPress={() => setDraft({ ...draft, urgency: option.label })}>
                  <Ionicons name={option.icon} size={20} color={draft.urgency === option.label ? BRAND_ORANGE : "#7d8491"} />
                  <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={[styles.urgencyText, draft.urgency === option.label && styles.selectedUrgencyText]}>{option.label}</Text>
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.urgencyHelper, draft.urgency === option.label && styles.selectedUrgencyText]}>{option.helper}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.infoBanner}>
            <Ionicons name="flash-outline" size={17} color={BRAND_ORANGE} />
            <Text style={styles.infoBannerText}>Shared delivery timing: {draft.urgency}</Text>
          </View>
        )}

        <Pressable disabled={!canContinue || Boolean(savingAction)} style={[styles.primaryWideButton, (!canContinue || Boolean(savingAction)) && styles.disabledDarkButton]} onPress={continueToSummary}>
          {savingAction === "summary" ? (
            <ActivityIndicator color="#777777" />
          ) : (
            <>
              <Text style={[styles.primaryWideButtonText, !canContinue && styles.disabledText]}>Continue to Pricing</Text>
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
      )}
      <SizeChartModal visible={showSizeChart} clothType={draft.clothType} guide={measurementGuide} onClose={() => setShowSizeChart(false)} />
      <ClothGuideModal visible={showClothGuideModal} onClose={() => setShowClothGuideModal(false)} />
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
      serviceCategory: item.serviceCategory ?? getServiceCategory(item.workType)?.label,
      selectedWorkItems: item.selectedWorkItems,
      otherWorkDescription: item.otherWorkDescription,
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
      serviceCategory: request.serviceCategory ?? getServiceCategory(request.workType)?.label,
      selectedWorkItems: request.selectedWorkItems,
      otherWorkDescription: request.otherWorkDescription,
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
    serviceCategory: primaryItem?.serviceCategory ?? getServiceCategory(primaryItem?.workType ?? request.workType)?.label,
    selectedWorkItems: primaryItem?.selectedWorkItems,
    otherWorkDescription: primaryItem?.otherWorkDescription,
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
    tailorRating: request.tailorRating ?? existingOrder?.tailorRating,
    deliveryRating: request.deliveryRating ?? existingOrder?.deliveryRating,
    tailorReview: request.tailorReview ?? existingOrder?.tailorReview,
    deliveryReview: request.deliveryReview ?? existingOrder?.deliveryReview,
    tailorRatingSubmittedAt: request.tailorRatingSubmittedAt ?? existingOrder?.tailorRatingSubmittedAt,
    deliveryRatingSubmittedAt: request.deliveryRatingSubmittedAt ?? existingOrder?.deliveryRatingSubmittedAt,
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
    workType: item.serviceCategory ?? item.workType,
    serviceCategory: item.serviceCategory ?? item.workType,
    selectedWorkItems: item.selectedWorkItems ?? [],
    otherWorkDescription: item.otherWorkDescription?.trim() || undefined,
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
  showDialog,
  onCancelRequest
}: {
  draft: RequestDraft;
  setDraft: (draft: RequestDraft) => void;
  setScreen: (screen: Screen) => void;
  showDialog: (dialog: AppDialogState) => void;
  onCancelRequest: () => void;
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
    if (items.length === 1) {
      showDialog({
        title: "Cancel request?",
        message: "Deleting the only item will cancel your request. Do you want to cancel the request and return to the home screen?",
        actions: [
          { label: "Keep Editing" },
          {
            label: "Yes, Cancel",
            destructive: true,
            onPress: onCancelRequest
          }
        ]
      });
      return;
    }
    const nextItems = items.filter((item) => item.id !== itemId);
    setDraft({ ...clearActiveClothingItem({ ...draft, items: nextItems }), items: nextItems });
  }

  async function requestQuotes() {
    if (!token) return;
    if (items.length === 0) {
      showDialog({ title: "Add a cloth", message: "Add at least one clothing item before requesting quotes.", actions: [{ label: "OK" }] });
      return;
    }
    if (!draft.urgency || draft.pickup.trim().length < 8) {
      showDialog({ title: "Shared details missing", message: "Pickup address and delivery timing are required for the order.", actions: [{ label: "OK" }] });
      return;
    }
    const incomplete = items.find((item) => !item.description.trim() || !item.clothType || !item.workType || !item.uploadedMedia.length);
    if (incomplete) {
      showDialog({ title: "Item incomplete", message: `${clothingItemTitle(incomplete)} needs photos, description, a garment, and service/work selection.`, actions: [{ label: "OK" }] });
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
        serviceCategory: items[0].serviceCategory,
        selectedWorkItems: items[0].selectedWorkItems,
        otherWorkDescription: items[0].otherWorkDescription,
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
        <Header title={t(useAppStore.getState().language, "orderSummary")} onBack={() => setScreen("newRequest")} />
        <View style={styles.whiteCard}>
          <Text style={styles.cardLabel}>ORDER CART</Text>
          <SummaryRow label="Clothing items" value={`${items.length}`} strong />
          <SummaryRow label="Delivery Timing" value={draft.urgency ?? "Not selected"} />
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
                  {clothingItemWorkDetails(item) ? <Text style={styles.mutedSmall} numberOfLines={2}>{clothingItemWorkDetails(item)}</Text> : null}
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
          {submitting ? <ActivityIndicator color="#111111" /> : <Text style={[styles.primaryWideButtonText, items.length === 0 && styles.disabledText]}>Continue to Pricing</Text>}
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
          <View style={styles.quotesSummaryTop}>
            <View style={styles.quoteClockIcon}>
              <Ionicons name="time-outline" size={30} color={BRAND_ORANGE} />
            </View>
            <View style={styles.profileRowText}>
              <Text style={styles.quotesSummaryTitle}>{loading ? "Checking quotes..." : `${visibleQuotes.length} tailors responded`}{` - ${itemCount} ${itemCount === 1 ? "item" : "items"}`}</Text>
              <Text style={styles.mutedSmall}>Your request was sent just now</Text>
            </View>
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
            {clothingItemsForDraft(draft).map((item, index) => {
              const previews = [
                ...item.media.map((media) => ({ uri: media.uri, type: media.type })),
                ...item.uploadedMedia.map((media) => ({ uri: media.url, type: media.resourceType === "video" ? "video" as const : "image" as const }))
              ].slice(0, 6);
              return (
                <View key={item.id} style={styles.requestDetailItem}>
                  <Text style={styles.cardLabel}>ITEM {index + 1}</Text>
                  <Text style={styles.addressTitle}>{clothingItemTitle(item)}</Text>
                  <Text style={styles.mutedSmall}>{clothingItemSummary(item)}</Text>
                  {clothingItemWorkDetails(item) ? <Text style={styles.mutedSmall}>{clothingItemWorkDetails(item)}</Text> : null}
                  <Text style={styles.infoCopy}>{item.description}</Text>
                  {previews.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.requestDetailPreviewRow}>
                      {previews.map((media, mediaIndex) => (
                        <View key={`${media.uri}-${mediaIndex}`} style={styles.requestDetailPreviewBox}>
                          <Image source={{ uri: media.uri }} style={styles.requestDetailPreviewImage} />
                          {media.type === "video" ? (
                            <View style={styles.videoBadge}>
                              <Ionicons name="play" size={10} color="#ffffff" />
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              );
            })}
            <SummaryRow label="Delivery Timing" value={draft.urgency ?? "Not selected"} />
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
  onPlaceOrder: (paymentMethod: string, checkout: { couponCode?: string; totalAmount: number; deliveryFee: number; platformFee: number; smallOrderFee: number; homeMeasurementFee: number }) => void;
  isPlacingOrder?: boolean;
  onDeleteRequest?: () => Promise<void> | void;
}) {
  const token = useAppStore((state) => state.token);
  const [payment, setPayment] = useState("ONLINE");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | undefined>();
  const [deliveryFares, setDeliveryFares] = useState<any>(null);

  useEffect(() => {
    if (token) {
      api<any>("/settings/delivery-fares", {}, token)
        .then((res) => {
          if (res) setDeliveryFares(res);
        })
        .catch(() => {});
    }
  }, [token]);

  const getCustomerDeliveryFee = (urgency?: string) => {
    const value = String(urgency ?? "").toLowerCase();
    if (value.includes("instant")) return deliveryFares?.instant?.customerCharge ?? 50;
    if (value.includes("express") || value.includes("urgent")) return deliveryFares?.express?.customerCharge ?? 40;
    return deliveryFares?.normal?.customerCharge ?? 30;
  };

  const orderItems = clothingItemsForDraft(draft);
  const deliveryFee = getCustomerDeliveryFee(draft.urgency);
  const homeMeasurementFee = homeMeasurementFeeForDraft(draft);
  const itemCount = checkoutItemCount(draft);
  const tailoringTotal = quote.price;

  const platformFee = getPlatformFee(tailoringTotal);
  const smallOrderFee = getSmallOrderFee(tailoringTotal);

  const subtotal = tailoringTotal + deliveryFee + platformFee + smallOrderFee + homeMeasurementFee;
  const discount = calculateCouponDiscount(appliedCoupon, subtotal);
  const total = Math.max(subtotal - discount, 0);
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
              <Text style={styles.checkoutSummaryStatLabel}>Delivery Timing</Text>
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
            <SummaryRow label="Platform fee" value={`Rs${platformFee}`} tone="positive" />
            {smallOrderFee > 0 ? <SummaryRow label="Small order fee" value={`Rs${smallOrderFee}`} tone="positive" /> : null}
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

        <Pressable style={[styles.primaryWideButton, isPlacingOrder && styles.buttonDisabled]} onPress={() => onPlaceOrder(payment, { couponCode: appliedCoupon?.code, totalAmount: total, deliveryFee, platformFee, smallOrderFee, homeMeasurementFee })} disabled={isPlacingOrder}>
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
        <Header title={t(useAppStore.getState().language, "orders")} />
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
          <SummaryRow label="Delivery Timing" value={order.draft.urgency ?? "Normal"} />
          <SummaryRow label="Pickup" value={order.pickupWindow} />
          <SummaryRow label="Payment" value={order.paymentMethod.toUpperCase()} />
          <SummaryRow label="Payment Status" value={order.paymentStatus ?? (order.paymentMethod.toUpperCase() === "COD" ? "PENDING" : "PAID")} />
          <SummaryRow label="Delivery" value={`Rs${order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)}`} tone="positive" />
          <SummaryRow label="Platform fee" value={`Rs${order.platformFee ?? getPlatformFee(order.tailor?.price ?? 0)}`} tone="positive" />
          {Number(order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)) > 0 ? (
            <SummaryRow label="Small order fee" value={`Rs${order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)}`} tone="positive" />
          ) : null}
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
        <Header title={t(useAppStore.getState().language, "search")} />
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

function OnboardingScreen({ profile, setProfile, language }: { profile: ProfileData; setProfile: (profile: ProfileData) => void; language: AppLanguage }) {
  const [name, setName] = useState(profile.name.startsWith("Customer ") ? "" : profile.name);
  const [gender, setGender] = useState<ProfileGender>(profile.gender ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");

  function save() {
    if (name.trim().length < 2) {
      Alert.alert(language === "hi" ? "नाम आवश्यक है" : "Name required", language === "hi" ? "आगे बढ़ने के लिए अपना नाम दर्ज करें।" : "Enter your name to continue.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      Alert.alert(language === "hi" ? "जन्म तिथि आवश्यक है" : "Date of birth required", language === "hi" ? "जन्म तिथि YYYY-MM-DD प्रारूप में दर्ज करें।" : "Enter date of birth in YYYY-MM-DD format.");
      return;
    }
    setProfile({ ...profile, name: name.trim(), gender, dateOfBirth: dateOfBirth.trim(), hasCompletedOnboarding: true });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.onboardingContent}>
          <DarjiLogoMark />
          <Text style={styles.onboardingTitle}>{t(language, "completeProfile")}</Text>
          <Text style={styles.helperText}>{t(language, "onboardingCopy")}</Text>
          <Text style={styles.formLabel}>{t(language, "fullName")}</Text>
          <TextInput style={styles.profileInput} value={name} onChangeText={setName} placeholder={t(language, "enterYourName")} placeholderTextColor="#98a4b6" />
          <Text style={styles.formLabel}>{t(language, "gender")}</Text>
          <View style={styles.twoCol}>
            {[
              { value: "Male" as const, label: t(language, "male") },
              { value: "Female" as const, label: t(language, "female") },
              { value: "Other" as const, label: t(language, "other") }
            ].map((item) => (
              <OptionButton key={item.value} label={item.label} selected={gender === item.value} onPress={() => setGender(item.value)} />
            ))}
          </View>
          <Text style={styles.formLabel}>{t(language, "dateOfBirth")}</Text>
          <DatePickerField value={dateOfBirth} onChange={setDateOfBirth} />
          <Pressable style={styles.primaryWideButton} onPress={save}>
            <Text style={styles.primaryWideButtonText}>{t(language, "continue")}</Text>
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
  settings,
  language
}: {
  setScreen: (screen: Screen) => void;
  orders: CustomerOrder[];
  profile: ProfileData;
  addresses: SavedAddress[];
  onDeleteAccount: () => void;
  settings: AppSettings;
  language: AppLanguage;
}) {
  const { user, signOut } = useAppStore();
  const profileStyles = createStyles(settings.darkMode);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <SafeAreaView style={profileStyles.safe}>
      <ScrollView contentContainerStyle={profileStyles.pageContent}>
        <Header title={t(language, "profile")} />
        <View style={profileStyles.profileHero}>
          <Image source={profile.avatarUri ? { uri: profile.avatarUri } : getDefaultAvatarSource(profile)} style={profileStyles.profileAvatarImage} />
          <View style={profileStyles.profileInfo}>
            <Text style={profileStyles.profileName}>{profile.name}</Text>
            <Text style={profileStyles.profilePhone}>+91 {user?.phone ?? profile.phone}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>{t(language, "account")}</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="person-outline" label={t(language, "editProfile")} value={t(language, "nameGenderDob")} onPress={() => setScreen("editProfile")} styles={profileStyles} noBorder />
          <ProfileRow icon="location-outline" label={t(language, "savedAddresses")} value={`${addresses.length} ${t(language, "savedCount")}`} onPress={() => setScreen("savedAddresses")} styles={profileStyles} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>{t(language, "orders")}</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="cube-outline" label={t(language, "orderHistory")} value={t(language, "viewActiveAndPastOrders")} onPress={() => setScreen("orders")} styles={profileStyles} noBorder />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>{t(language, "preferences")}</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="language-outline" label={t(language, "appLanguage")} value={getLanguageLabel(language)} onPress={() => setScreen("settings")} styles={profileStyles} noBorder />
          <ProfileRow icon="notifications-outline" label={t(language, "notifications")} value={language === "hi" ? "ऑर्डर अलर्ट और ऑफर सेट करें" : "Configure order alerts & promos"} onPress={() => setScreen("settings")} styles={profileStyles} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>{t(language, "support")}</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="help-circle-outline" label={t(language, "helpCenter")} value={t(language, "faqWorkflows")} onPress={() => setScreen("helpCenter")} styles={profileStyles} noBorder />
          <ProfileRow icon="chatbubble-ellipses-outline" label={t(language, "contactSupport")} value={t(language, "chatWithSupportTeam")} onPress={() => setScreen("contactSupport")} styles={profileStyles} />
          <ProfileRow icon="bug-outline" label={t(language, "reportBug")} value={t(language, "submitBugReport")} onPress={() => setScreen("reportBug")} styles={profileStyles} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>POLICIES & INFORMATION</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="close-circle-outline" label="Cancellation Policy" value={t(language, "refundAndCancellationRules")} onPress={() => setScreen("cancellationPolicy")} styles={profileStyles} noBorder />
          <ProfileRow icon="information-circle-outline" label={t(language, "aboutDarji")} value={t(language, "whoWeAreHowItWorks")} onPress={() => setScreen("aboutDarji")} styles={profileStyles} />
          <ProfileRow icon="shield-checkmark-outline" label={t(language, "privacyPolicy")} value={t(language, "readPrivacyPolicy")} onPress={() => setScreen("privacyPolicy")} styles={profileStyles} />
          <ProfileRow icon="document-text-outline" label={t(language, "termsOfUse")} value={t(language, "readTermsOfService")} onPress={() => setScreen("termsService")} styles={profileStyles} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>{t(language, "app")}</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <View style={[profileStyles.profileRow, { borderTopWidth: 0 }]}>
            <View style={profileStyles.profileRowIcon}>
              <Ionicons name="phone-portrait-outline" size={18} color={BRAND_ORANGE} />
            </View>
            <View style={profileStyles.profileRowText}>
              <Text style={profileStyles.addressTitle}>{t(language, "appVersion")}</Text>
              <Text style={profileStyles.mutedSmall}>0.1.0 (Development)</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 14, marginLeft: 4 }}>
          <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
          <Text style={{ color: BRAND_ORANGE, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 }}>{t(language, "accountSettings")}</Text>
        </View>
        <View style={profileStyles.whiteCard}>
          <ProfileRow icon="trash-outline" label={t(language, "deleteAccount")} value={t(language, "permanentlyRemoveAccount")} onPress={onDeleteAccount} danger styles={profileStyles} noBorder />
          <ProfileRow
            icon="log-out-outline"
            label={t(language, "logout")}
            value={t(language, "signOutOfAccount")}
            onPress={() => setShowLogoutModal(true)}
            styles={profileStyles}
          />
        </View>
      </ScrollView>

      {/* Custom Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setShowLogoutModal(false)}>
          <Pressable style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 }}>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff1f0", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Ionicons name="log-out-outline" size={28} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: BRAND_DEEP, marginBottom: 8 }}>{t(language, "signOut")}</Text>
              <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 }}>{t(language, "logoutConfirm")}</Text>
            </View>
            <Pressable
              style={{ backgroundColor: "#ef4444", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 10 }}
              onPress={() => { setShowLogoutModal(false); signOut(); }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 16 }}>{t(language, "yesSignOut")}</Text>
            </Pressable>
            <Pressable
              style={{ backgroundColor: "#f1f5f9", borderRadius: 14, paddingVertical: 15, alignItems: "center" }}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={{ color: BRAND_DEEP, fontWeight: "700", fontSize: 16 }}>{t(language, "cancel")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  const [gender, setGender] = useState<ProfileGender>(profile.gender ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri);
  const [avatarPreset, setAvatarPreset] = useState<AvatarPreset | undefined>(profile.avatarPreset);

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to choose a profile picture. Darji receives only the photo you choose, and your information stays safe.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0]?.uri);
      setAvatarPreset(undefined);
    }
  }

  function save() {
    if (name.trim().length < 2) {
      Alert.alert("Name required", "Enter your full name.");
      return;
    }
    setProfile({ ...profile, name: name.trim(), gender, dateOfBirth: dateOfBirth.trim(), avatarUri, avatarPreset, hasCompletedOnboarding: true });
    setScreen("profile");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title={t(useAppStore.getState().language, "editProfile")} onBack={() => setScreen("profile")} />
        <View style={styles.editAvatarWrap}>
          <Pressable onPress={pickAvatar}>
            <Image source={avatarUri ? { uri: avatarUri } : getDefaultAvatarSource({ ...profile, name, gender, avatarPreset })} style={styles.editAvatarImage} />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#111111" />
            </View>
          </Pressable>
          <Text style={styles.mutedSmall}>Tap photo to change</Text>
        </View>
        <Text style={styles.formLabel}>Full Name</Text>
        <TextInput style={styles.profileInput} value={name} onChangeText={setName} placeholder="Enter full name" placeholderTextColor="#98a4b6" />
        <Text style={styles.formLabel}>Gender</Text>
        <View style={styles.twoCol}>
          {(["Male", "Female", "Other"] as const).map((item) => (
            <OptionButton key={item} label={item} selected={gender === item} onPress={() => setGender(item)} />
          ))}
        </View>
        <Text style={styles.formLabel}>Date of Birth</Text>
        <DatePickerField value={dateOfBirth} onChange={setDateOfBirth} />
        <Text style={styles.formLabel}>Choose Avatar</Text>
        <View style={styles.avatarPickerGrid}>
          {avatarOptions.map((option) => (
            <Pressable
              key={option.key}
              style={[styles.avatarOption, avatarPreset === option.key && styles.avatarOptionActive]}
              onPress={() => {
                setAvatarPreset(option.key);
                setAvatarUri(undefined);
              }}
            >
              <Image source={avatarImages[option.key]} style={styles.avatarOptionImage} />
              <Text style={styles.avatarOptionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
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
  setScreen,
  language,
  setLanguagePreference
}: {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  setScreen: (screen: Screen) => void;
  language: AppLanguage;
  setLanguagePreference: (language: AppLanguage) => void;
}) {
  function toggle(key: keyof AppSettings) {
    setSettings({ ...settings, [key]: !settings[key] });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Header title={t(language, "notifications")} onBack={() => setScreen("profile")} />
        <View style={styles.whiteCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
            <Text style={[styles.cardLabel, { color: BRAND_ORANGE, marginBottom: 0, fontWeight: "900", letterSpacing: 0.5 }]}>NOTIFICATIONS</Text>
          </View>
          <SettingRow icon="notifications-outline" label={t(language, "pushNotifications")} value={t(language, "orderAlertsAndOffers")} enabled={settings.notifications} onPress={() => toggle("notifications")} />
          <SettingRow icon="cube-outline" label={t(language, "orderUpdates")} value={t(language, "pickupQuoteDeliveryAlerts")} enabled={settings.orderUpdates} onPress={() => toggle("orderUpdates")} />
        </View>
        <View style={styles.whiteCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <View style={{ width: 4, height: 16, backgroundColor: BRAND_ORANGE, borderRadius: 2, marginRight: 8 }} />
            <Text style={[styles.cardLabel, { color: BRAND_ORANGE, marginBottom: 0, fontWeight: "900", letterSpacing: 0.5 }]}>{t(language, "appLanguage").toUpperCase()}</Text>
          </View>
          <LanguageSelectorCard language={language} onSelect={(nextLanguage) => { setLanguagePreference(nextLanguage); Alert.alert(t(nextLanguage, "languageUpdated"), t(nextLanguage, "languageUpdatedMessage")); }} />
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
    <ProfileSubPage title={t(useAppStore.getState().language, "savedAddresses")} setScreen={setScreen}>
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
      Alert.alert("Permission needed", "Allow location access to save your current address. Your location is safe with Darji and is used only for pickup and delivery.");
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
    <ProfileSubPage title={t(useAppStore.getState().language, "addAddress")} setScreen={setScreen} backScreen="savedAddresses">
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
    <ProfileSubPage title={t(useAppStore.getState().language, "walletPayments")} setScreen={setScreen}>
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
    <ProfileSubPage title={t(useAppStore.getState().language, "transactionHistory")} setScreen={setScreen}>
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
    <ProfileSubPage title={t(useAppStore.getState().language, "coupons")} setScreen={setScreen}>
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
    <ProfileSubPage title={t(useAppStore.getState().language, "helpCenter")} setScreen={setScreen}>
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
            <Text style={styles.addressTitle}>Darji Cancellation Policy</Text>
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

  const scrollViewRef = useRef<RNScrollView>(null);

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
      Alert.alert("Permission needed", "Allow photo library access to upload photos. Darji receives only the photo you choose, and your information stays safe.");
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

  async function handleStartChat() {
    if (!selectedCategory) {
      Alert.alert("Select Category", "Please select the help category related to your issue.");
      return;
    }
    if (!token) return;
    try {
      setSending(true);
      const res = await api<any>("/support", {
        method: "POST",
        body: JSON.stringify({
          subject: selectedCategory,
          message: `I need support regarding: ${selectedCategory}`,
          orderId: selectedOrder?._id || selectedOrder?.id || undefined,
          category: selectedCategory,
          attachments: attachments
        })
      }, token);

      setAttachments([]);
      await loadTickets();
      const createdTicket = res.data || res;
      setActiveTicket(createdTicket);
      setView("chat");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to start support conversation.");
    } finally {
      setSending(false);
    }
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} style={{ flex: 1 }}>
        {view === "center" && (
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
            <Header title={t(useAppStore.getState().language, "supportCenter")} onBack={() => setScreen("profile")} />
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
            <Header title={t(useAppStore.getState().language, "reportBug")} onBack={() => setScreen("profile")} />
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
                  sending ? { opacity: 0.6 } : (pressed ? { opacity: 0.8 } : { opacity: 1.0 })
                ]}
                disabled={sending}
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
    <ProfileSubPage title={t(useAppStore.getState().language, "customerStories")} setScreen={setScreen} backScreen="home">
      {stories.length ? stories.map((story) => (
        <View key={story.id} style={styles.storyListCard}>
          <View style={styles.storyFooter}>
            <FallbackAvatar name={story.name} size={36} />
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

function RateAppScreen({ onSave, setScreen }: { onSave: (rating: number, review: string) => void; setScreen: (screen: Screen) => void }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [photos, setPhotos] = useState<LocalMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function pickReviewPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add review photos. Darji receives only the photos you choose, and your information stays safe.");
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
      await api("/reviews", {
        method: "POST",
        body: JSON.stringify({ orderId: "darji-app", kind: "app", rating, comment: review.trim() })
      }).catch((error) => {
        if (!/review already submitted/i.test(error instanceof Error ? error.message : "")) throw error;
      });
      onSave(rating, review.trim());
      Alert.alert("Saved", "Thanks for rating Darji.");
      setScreen("home");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProfileSubPage title={t(useAppStore.getState().language, "rateReview")} setScreen={setScreen} backScreen="home">
      <View style={styles.rateHero}>
        <Ionicons name="thumbs-up-outline" size={34} color={BRAND_ORANGE} />
        <Text style={styles.profileName}>How was your experience?</Text>
        <Text style={styles.mutedSmall}>Your feedback helps us improve our service.</Text>
      </View>
      <View style={styles.ratingCard}>
        <Text style={styles.profileName}>Rate Darji app</Text>
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
    <ProfileSubPage title={t(useAppStore.getState().language, "appInfo")} setScreen={setScreen}>
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
    <ProfileSubPage title={t(useAppStore.getState().language, "aboutDarji")} setScreen={setScreen} styles={profileStyles}>
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

const LOGO_BASE64 = "data:image/png;base64,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";

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
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${LOGO_BASE64}" style="height:50px; width:auto;" />
              <div>
                <h1 style="margin:0; color:#f6a313; font-size:28px; line-height:30px;">Darji</h1>
                <p style="margin:2px 0 0; color:#65748a; font-size:12px;">On-demand tailoring at your doorstep</p>
              </div>
            </div>
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
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Platform fee</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">Rs${order.platformFee ?? getPlatformFee(order.tailor?.price ?? 0)}</td></tr>
          ${
            Number(order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)) > 0
              ? `<tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Small order fee</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">Rs${order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)}</td></tr>`
              : ""
          }
          ${
            order.homeMeasurementFee || order.draft.homeMeasurementBooked
              ? `<tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Tailor measurement visit</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">Rs${order.homeMeasurementFee ?? HOME_MEASUREMENT_FEE}</td></tr>`
              : ""
          }
          <tr><td style="padding:10px; border-bottom:1px solid #e5e7eb;">Payment Method</td><td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">${escapeHtml(order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod === "UPI" ? "UPI (Online)" : "Online Payment")}</td></tr>
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

function RatingButtons({ disabled, value, onRate }: { disabled?: boolean; value?: number; onRate: (rating: number) => void }) {
  return (
    <View style={styles.inlineStars}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Pressable key={item} disabled={disabled} onPress={() => !disabled && onRate(item)}>
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
          <Text style={{ fontSize: 11, color: BRAND_ORANGE, marginTop: 4, fontWeight: "700" }}>
            Confirmed: {new Date(order.placedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
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
              kind,
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
          <SummaryRow label="Delivery Timing" value={order.draft.urgency ?? "Normal"} />
          <SummaryRow label="Payment" value={order.paymentMethod.toUpperCase()} />
          <SummaryRow label="Delivery" value={`Rs${order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)}`} tone="positive" />
          <SummaryRow label="Platform fee" value={`Rs${order.platformFee ?? getPlatformFee(order.tailor?.price ?? 0)}`} tone="positive" />
          {Number(order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)) > 0 ? (
            <SummaryRow label="Small order fee" value={`Rs${order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)}`} tone="positive" />
          ) : null}
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
              <RatingButtons disabled={Boolean(order.tailorRatingSubmittedAt)} value={order.tailorRating} onRate={(rating) => onUpdateOrder({ ...order, tailorRating: rating })} />
            </View>
            <TextInput
              editable={!order.tailorRatingSubmittedAt}
              style={[styles.reviewInput, order.tailorRatingSubmittedAt && styles.reviewInputLocked]}
              value={order.tailorReview ?? ""}
              onChangeText={(text) => !order.tailorRatingSubmittedAt && onUpdateOrder({ ...order, tailorReview: text })}
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
              <RatingButtons disabled={Boolean(order.deliveryRatingSubmittedAt)} value={order.deliveryRating} onRate={(rating) => onUpdateOrder({ ...order, deliveryRating: rating })} />
            </View>
            <TextInput
              editable={!order.deliveryRatingSubmittedAt}
              style={[styles.reviewInput, order.deliveryRatingSubmittedAt && styles.reviewInputLocked]}
              value={order.deliveryReview ?? ""}
              onChangeText={(text) => !order.deliveryRatingSubmittedAt && onUpdateOrder({ ...order, deliveryReview: text })}
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
  const token = useAppStore((state) => state.token);
  const [savingRating, setSavingRating] = useState<"tailor" | "delivery" | undefined>();
  const pickupSchedule = pickupScheduleForOrder(order);
  const estimatedTime = estimatedTimeForOrder(order);
  const orderItems = clothingItemsForDraft(order.draft);
  const itemTotal = Math.max(
    order.total -
      (order.deliveryFee ?? deliveryFeeForUrgency(order.draft.urgency)) -
      (order.platformFee ?? getPlatformFee(order.tailor?.price ?? 0)) -
      (order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)) -
      (order.homeMeasurementFee ?? (order.draft.homeMeasurementBooked ? HOME_MEASUREMENT_FEE : 0)) +
      (order.discountAmount ?? 0),
    0
  );

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
              kind,
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
          <SummaryRow label="Convenience Fee" value={`Rs${order.platformFee ?? getPlatformFee(order.tailor?.price ?? 0)}`} />
          {Number(order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)) > 0 ? (
            <SummaryRow label="Small Order Fee" value={`Rs${order.smallOrderFee ?? getSmallOrderFee(order.tailor?.price ?? 0)}`} />
          ) : null}
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
                <Text style={styles.addressTitle}>Rate this order</Text>
                <Text style={styles.mutedSmall}>Review the tailor and delivery partner separately.</Text>
              </View>
            </View>
            <View style={styles.ratingActionRow}>
              <View style={styles.ratingActionText}>
                <View style={styles.feedbackTitleRow}>
                  <Ionicons name="star" size={17} color={BRAND_ORANGE} />
                  <Text style={styles.addressTitle}>Rate your tailor</Text>
                </View>
                <Text style={[styles.mutedSmall, styles.feedbackPrompt]}>How satisfied are you with the stitching, fitting, and overall craftsmanship?</Text>
              </View>
              <RatingButtons disabled={Boolean(order.tailorRatingSubmittedAt)} value={order.tailorRating} onRate={(rating) => onUpdateOrder({ ...order, tailorRating: rating })} />
            </View>
            <TextInput
              editable={!order.tailorRatingSubmittedAt}
              style={[styles.reviewInput, order.tailorRatingSubmittedAt && styles.reviewInputLocked]}
              value={order.tailorReview ?? ""}
              onChangeText={(text) => !order.tailorRatingSubmittedAt && onUpdateOrder({ ...order, tailorReview: text })}
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
              <RatingButtons disabled={Boolean(order.deliveryRatingSubmittedAt)} value={order.deliveryRating} onRate={(rating) => onUpdateOrder({ ...order, deliveryRating: rating })} />
            </View>
            <TextInput
              editable={!order.deliveryRatingSubmittedAt}
              style={[styles.reviewInput, order.deliveryRatingSubmittedAt && styles.reviewInputLocked]}
              value={order.deliveryReview ?? ""}
              onChangeText={(text) => !order.deliveryRatingSubmittedAt && onUpdateOrder({ ...order, deliveryReview: text })}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<HandoffOtp[]>(`/delivery-requests/order/${orderId}/otps`, {}, token)
      .then((res) => {
        setOtps(res);
        setLoading(false);
      })
      .catch(() => {
        setOtps([]);
        setLoading(false);
      });
  }, [orderId, status, token]);

  if (loading) {
    return (
      <View style={[styles.whiteCard, { alignItems: "center", paddingVertical: 20 }]}>
        <ActivityIndicator color={BRAND_ORANGE} style={{ marginBottom: 8 }} />
        <Text style={styles.mutedSmall}>Loading delivery OTP...</Text>
      </View>
    );
  }

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
  const sessionNotice = useAppStore((state) => state.sessionNotice);
  const clearSessionNotice = useAppStore((state) => state.clearSessionNotice);
  const language = useAppStore((state) => state.language);
  const setLanguagePreference = useAppStore((state) => state.setLanguagePreference);
  const platform = usePlatformStatus(getPlatformStatus, token);
  const [screen, setScreenState] = useState<Screen>("home");
  const [screenStack, setScreenStack] = useState<Screen[]>([]);
  const [customerDataByPhone, setCustomerDataByPhone] = useState<Record<string, CustomerData>>({});
  const [hasLoadedCustomerData, setHasLoadedCustomerData] = useState(false);
  const [activeOrder, setActiveOrder] = useState<CustomerOrder | undefined>();
  const [pendingCancellationOrder, setPendingCancellationOrder] = useState<CustomerOrder | undefined>();
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
  const [isFetchingOrders, setIsFetchingOrders] = useState(true);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const paymentMessageHandledRef = useRef(false);
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  useRegisterPushNotifications({ authToken: token, app: "customer", userId: user?.id });

  useEffect(() => {
    if (!sessionNotice) return;
    Alert.alert("Signed out", sessionNotice, [{ text: "OK", onPress: clearSessionNotice }]);
  }, [clearSessionNotice, sessionNotice]);

  const customerPhone = user?.phone ?? (user?.id ? `user-${user.id}` : "guest");
  const customerData = customerDataByPhone[customerPhone] ?? makeDefaultCustomerData(user?.phone ?? customerPhone, user?.name);
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
      if (orders.length === 0) setIsFetchingOrders(true);
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
    } finally {
      setIsFetchingOrders(false);
    }
  }

  async function refreshVisibleCustomerScreen() {
    if (pullRefreshing) return;
    setPullRefreshing(true);
    try {
      await refreshCustomerOrders();
    } finally {
      setPullRefreshing(false);
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
    setCustomerNotifications([]);
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

  function cancelRequest() {
    resetRequestDraft();
    setScreen("home");
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

  function withAppChrome(node: ReactNode) {
    styles = createStyles(settings.darkMode);

    return (
      <SafeAreaProvider>
      <PullToRefreshContext.Provider value={{ refreshing: pullRefreshing, onRefresh: () => void refreshVisibleCustomerScreen() }}>
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
        <Modal
          visible={Boolean(paymentSheet)}
          animationType="slide"
          onRequestClose={() => {
            if (verifyingPayment) return;
            Alert.alert(
              "Cancel Payment?",
              "Do you really want to cancel the payment for this order?",
              [
                { text: "No, continue", style: "cancel" },
                { text: "Yes, cancel", style: "destructive", onPress: () => setPaymentSheet(undefined) }
              ]
            );
          }}
        >
          <SafeAreaView style={styles.safe}>
            <View style={[styles.rowBetween, { paddingHorizontal: 20, paddingTop: 12 }]}>
              <Text style={styles.sectionTitle}>{verifyingPayment ? "Confirming payment" : "Complete Payment"}</Text>
              <View style={{ width: 22 }} />
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
      </PullToRefreshContext.Provider>
      </SafeAreaProvider>
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

  async function placeOrder(paymentMethod: string, checkout?: { couponCode?: string; totalAmount?: number; deliveryFee?: number; platformFee?: number; smallOrderFee?: number; homeMeasurementFee?: number }) {
    if (!selectedQuote?.backendRequestId || !selectedQuote.backendQuoteId || !token) return;
    if (checkoutPaymentMethod) return;
    const orderDraft = { ...draft, pickup: defaultAddress?.address ?? draft.pickup };
    const deliveryFee = checkout?.deliveryFee ?? deliveryFeeForUrgency(orderDraft.urgency);
    const platformFee = checkout?.platformFee ?? getPlatformFee(selectedQuote.price);
    const smallOrderFee = checkout?.smallOrderFee ?? getSmallOrderFee(selectedQuote.price);
    const homeMeasurementFee = checkout?.homeMeasurementFee ?? homeMeasurementFeeForDraft(orderDraft);
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
            platformFee,
            smallOrderFee,
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

  if (platform.status.maintenanceMode) {
    return (
      <PlatformMaintenanceScreen
        status={platform.status}
        audienceMessage="Creating orders, active-order access, and payments are temporarily unavailable."
        refreshing={platform.refreshing}
        error={platform.error}
        onRefresh={() => void platform.refresh(true)}
      />
    );
  }
  if (!token) return <AuthScreen />;
  if (!hasLoadedCustomerData) return withAppChrome(<LocationFetchingScreen title="Loading your profile" message="Fetching your saved Darji profile for this phone number." />);
  if (!profile.hasCompletedOnboarding) return withAppChrome(<OnboardingScreen profile={profile} setProfile={setCustomerProfile} language={language} />);

  if (screen === "home") return withAppChrome(<HomeScreen setScreen={setScreen} profile={profile} unreadCount={unreadCount} defaultAddress={defaultAddress} orders={orders} appReviews={appReviews} />);
  if (screen === "services") return withAppChrome(<ServicesScreen setScreen={setScreen} />);
  if (screen === "featureSoon") return withAppChrome(<FeatureSoonScreen setScreen={setScreen} onNotify={notifyForPressLaunch} />);
  if (screen === "notifications") return withAppChrome(<NotificationsScreen notifications={notifications} onMarkAllRead={markNotificationsRead} setScreen={setScreen} />);
  if (screen === "measurementGuide") return withAppChrome(<MeasurementGuideScreen setScreen={setScreen} />);
  if (screen === "newRequest") return withAppChrome(<NewRequestScreen draft={draft} setDraft={setDraft} setScreen={setScreen} addresses={addresses} onExitRequest={exitRequestFlow} />);
  if (screen === "clothIssue") return withAppChrome(<ClothIssueScreen draft={draft} setDraft={setDraft} setScreen={setScreen} />);
  if (screen === "orderSummary") return withAppChrome(<OrderSummaryScreen draft={draft} setDraft={setDraft} setScreen={setScreen} showDialog={setDialog} onCancelRequest={cancelRequest} />);
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
        <ProfileScreen setScreen={setScreen} orders={orders} profile={profile} addresses={addresses} onDeleteAccount={requestDeleteCustomerAccount} settings={settings} language={language} />
        
        <Modal visible={screen === "editProfile"} onRequestClose={goBack} animationType="slide">
          <EditProfileScreen profile={profile} setProfile={setCustomerProfile} setScreen={setScreen} />
        </Modal>
        
        <Modal visible={screen === "settings"} onRequestClose={goBack} animationType="slide">
          <SettingsScreen settings={settings} setSettings={setCustomerSettings} setScreen={setScreen} language={language} setLanguagePreference={setLanguagePreference} />
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
          <RateAppScreen onSave={saveAppReview} setScreen={setScreen} />
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
  if (screen === "orders") {
    if (isFetchingOrders && orders.length === 0) {
      return withAppChrome(
        <LocationFetchingScreen
          title="Fetching your orders"
          message="Loading your active and past orders from the Darji servers."
        />
      );
    }
    return withAppChrome(<OrdersScreenV2 orders={orders} onOpenOrder={openOrderFromList} setScreen={setScreen} />);
  }
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
  authLayout: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingBottom: 32, paddingTop: 72 },
  authLanguageCorner: { position: "absolute", right: 18, top: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 12, zIndex: 20 },
  loginAppIcon: {
    width: 86,
    height: 86,
    borderRadius: 24,
    shadowColor: BRAND_ORANGE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 3
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
  pageContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 118 },
  homeContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 118 },
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
  launchBand: { minHeight: 186, borderRadius: 22, borderWidth: 1, borderColor: "#d8c8ff", backgroundColor: isDark ? "#171326" : "#f5f0ff", flexDirection: "row", alignItems: "center", padding: 18, marginBottom: 22, overflow: "hidden" },
  launchTextBlock: { flex: 1, minWidth: 0 },
  launchBadge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 12, backgroundColor: "#ede7ff", color: "#6d28d9", paddingHorizontal: 10, paddingVertical: 5, fontSize: 10, fontWeight: "900" },
  launchBandTitle: { color: text, fontSize: 18, fontWeight: "900", lineHeight: 24, marginTop: 12 },
  launchBandCopy: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 8 },
  launchNotifyButton: { alignSelf: "flex-start", minHeight: 40, borderRadius: 20, backgroundColor: BRAND_DEEP, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, marginTop: 14 },
  launchNotifyText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  launchIconStack: { width: 118, height: 118, borderRadius: 30, backgroundColor: "#1f1307", alignItems: "center", justifyContent: "center", marginLeft: 12, overflow: "hidden", shadowColor: "#c9b5ff", shadowOpacity: 0.2, shadowRadius: 16, elevation: 2 },
  launchBandImage: { width: 178, height: 178 },
  launchSparkIcon: { position: "absolute", right: 16, top: 14 },
  needList: { gap: 10, marginBottom: 22 },
  needCard: { minHeight: 70, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", padding: 12 },
  needIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" },
  fabricTipRow: { gap: 12, paddingBottom: 18 },
  fabricTipCard: { width: 244, minHeight: 132, borderRadius: 18, borderWidth: 1, borderColor: "#d8efbd", backgroundColor: isDark ? "#101a12" : "#f4fde8", flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
  fabricTipIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: surface, borderWidth: 1, borderColor: "#d8efbd", alignItems: "center", justifyContent: "center" },
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
  whyGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 22 },
  whyCard: { width: "48%", minHeight: 116, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: surface, alignItems: "flex-start", justifyContent: "center", padding: 12, marginBottom: 12 },
  whyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  whyTitle: { color: text, fontSize: 13, fontWeight: "900", lineHeight: 17 },
  whyCopy: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 16, marginTop: 4 },
  homeStepsRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 22 },
  homeStepItem: { flex: 1, alignItems: "center", minWidth: 0 },
  stepNumber: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 10, backgroundColor: BRAND_ORANGE, color: "#111111", width: 20, height: 20, lineHeight: 20, textAlign: "center", fontSize: 10, fontWeight: "900", marginBottom: -8, zIndex: 1 },
  stepIconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  stepTitle: { color: text, fontSize: 10, fontWeight: "900", textAlign: "center", minHeight: 28 },
  stepCopy: { color: muted, fontSize: 9, fontWeight: "700", lineHeight: 13, textAlign: "center", marginTop: 3 },
  storyRow: { gap: 14, paddingBottom: 16 },
  largeReviewCard: { width: 264, minHeight: 206, borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 12, shadowColor: "#0b2241", shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 48 },
  reviewStars: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  reviewQuoteMark: { color: BRAND_ORANGE, fontSize: 34, lineHeight: 34, fontWeight: "900", marginLeft: 4 },
  largeReviewText: { color: text, fontSize: 14, fontWeight: "800", lineHeight: 21, minHeight: 84, marginTop: 14 },
  reviewImageWrap: { height: 142, borderRadius: 14, overflow: "hidden", backgroundColor: iconBg, marginTop: 10 },
  reviewImage: { width: "100%", height: "100%" },
  beforePill: { position: "absolute", left: 9, bottom: 9, borderRadius: 8, backgroundColor: surface, paddingHorizontal: 8, paddingVertical: 5 },
  afterPill: { position: "absolute", right: 9, bottom: 9, borderRadius: 8, backgroundColor: surface, paddingHorizontal: 8, paddingVertical: 5 },
  beforePillText: { color: BRAND_DEEP, fontSize: 10, fontWeight: "900" },
  largeReviewFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 },
  storyServicePill: { flexDirection: "row", alignItems: "center", gap: 5 },
  storyServiceText: { color: text, fontSize: 11, fontWeight: "900" },
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
  rateHomeCard: { minHeight: 72, borderRadius: 18, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12, marginBottom: 16 },
  rateHomeIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" },
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
  launchImage: { width: "100%", height: 210, borderRadius: 22, marginBottom: 16, backgroundColor: surface },
  launchTitle: { color: text, fontSize: 28, fontWeight: "900", lineHeight: 34, marginBottom: 10 },
  launchPointRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  howItWorksCard: { borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 16, marginBottom: 86 },
  workflowItem: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 10 },
  workflowText: { color: text, fontSize: 13, fontWeight: "900" },
  tabs: { height: 78, borderTopWidth: 1, borderTopColor: border, backgroundColor: tabBg, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 8, paddingHorizontal: 4 },
  tabItem: { alignItems: "center", justifyContent: "center", flex: 1 },
  tabText: { marginTop: 4, fontSize: 10, color: isDark ? "#e5edf7" : "#151b27", fontWeight: "700" },
  activeTabText: { color: BRAND_ORANGE },
  createTabItem: { marginTop: -22 },
  createTabButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: tabBg, shadowColor: "#c47a00", shadowOpacity: 0.24, shadowRadius: 10, elevation: 5 },
  createTabText: { marginTop: 2, fontSize: 9 },
  header: { height: 52, flexDirection: "row", alignItems: "center", marginBottom: 14 },
  headerTitle: { color: text, fontSize: 22, fontWeight: "900", marginLeft: 12 },
  headerSpacer: { width: 40 },
  roundIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: surface, alignItems: "center", justifyContent: "center" },
  requestProgressWrap: { flexDirection: "row", gap: 6, marginBottom: 16 },
  requestProgressSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "#d9dee7" },
  requestProgressSegmentActive: { backgroundColor: BRAND_ORANGE },
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
  requestSafetyCard: { minHeight: 68, borderRadius: 14, borderWidth: 1, borderColor: isDark ? "#14532d" : "#bbf7d0", backgroundColor: isDark ? "#0d2416" : "#f0fdf4", flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginBottom: 14 },
  requestSafetyIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#86efac", backgroundColor: isDark ? "#12351f" : "#dcfce7", alignItems: "center", justifyContent: "center" },
  requestHintTitle: { color: text, fontSize: 13, fontWeight: "900" },
  requestHintCopy: { color: muted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 2 },
  helperText: { color: muted, fontSize: 14, lineHeight: 22, marginBottom: 18 },
  formLabel: { color: muted, fontSize: 13, fontWeight: "900", marginTop: 20, marginBottom: 10 },
  fieldDisclaimer: { color: "#8a5600", fontSize: 12, fontWeight: "800", lineHeight: 18, marginTop: 8 },
  requestSectionHelper: { color: muted, fontSize: 11, fontWeight: "700", lineHeight: 17, marginTop: -6, marginBottom: 8 },
  descriptionCounter: { textAlign: "right", marginTop: 6 },
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
  addressInlineEdit: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  addressInput: { minHeight: 46, color: text, fontSize: 13, lineHeight: 19, padding: 0, textAlignVertical: "top" },
  addressActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  addressActionButton: { flex: 1, minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: "#efbd65", backgroundColor: inputSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  savedAddressList: { gap: 10 },
  savedAddressChoice: { minHeight: 58, borderRadius: 15, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  savedAddressChoiceSelected: { borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt },
  savedAddressChoiceText: { flex: 1, minWidth: 0 },
  savedAddressChoiceTitle: { color: text, fontSize: 13, fontWeight: "900" },
  addressTitle: { color: text, fontSize: 15, fontWeight: "900" },
  requestRequirementBanner: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: "#fde3b0", backgroundColor: isDark ? "#2a1d0a" : "#fff8e8", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, marginTop: 14 },
  requestRequirementText: { flex: 1, minWidth: 0, color: "#8a5600", fontSize: 11, fontWeight: "800", lineHeight: 17 },
  primaryWideButton: { height: 54, borderRadius: 14, backgroundColor: BRAND_ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 24 },
  primaryWideButtonText: { color: "#111111", fontSize: 16, fontWeight: "900" },
  emptyActionButton: { alignSelf: "stretch", paddingHorizontal: 18 },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  optionButton: { width: "47.8%", minHeight: 54, borderRadius: 13, borderWidth: 1.2, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 9 },
  selectedOptionButton: { borderWidth: 1.5, borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt },
  optionText: { flexShrink: 1, minWidth: 0, color: muted, fontSize: 12, fontWeight: "900", textAlign: "center" },
  selectedOptionText: { color: text },
  garmentSearchBox: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, marginBottom: 12 },
  garmentSearchInput: { flex: 1, minWidth: 0, color: text, fontSize: 13, fontWeight: "700", paddingVertical: 0 },
  selectedFlowChoice: { minHeight: 64, borderRadius: 14, borderWidth: 1.5, borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 11, paddingVertical: 9 },
  selectedFlowChoiceIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: inputSurface, alignItems: "center", justifyContent: "center" },
  selectedFlowChoiceText: { flex: 1, minWidth: 0 },
  selectedFlowChoiceLabel: { color: text, fontSize: 13, fontWeight: "900", lineHeight: 18 },
  selectedFlowChoiceSubtitle: { color: muted, fontSize: 10, fontWeight: "700", lineHeight: 15, marginTop: 2 },
  selectedFlowChoiceClear: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, alignItems: "center", justifyContent: "center" },
  serviceCategoryList: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCategoryCard: { width: "47.8%", minHeight: 94, borderRadius: 13, borderWidth: 1.2, borderColor: border, backgroundColor: surface, alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8, paddingVertical: 10 },
  serviceCategoryIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: inputSurface, alignItems: "center", justifyContent: "center" },
  serviceCategoryText: { minWidth: 0, alignItems: "center" },
  serviceCategoryTitle: { textAlign: "center" },
  serviceCategorySubtitle: { color: muted, fontSize: 10, fontWeight: "700", lineHeight: 15, marginTop: 3 },
  workSelectionHelper: { color: muted, fontSize: 11, fontWeight: "700", marginTop: -6, marginBottom: 10 },
  workSelectionList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  workSelectionChip: { width: "47.8%", minHeight: 54, borderRadius: 13, borderWidth: 1.2, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9, paddingVertical: 9 },
  workSelectionChipSelected: { borderWidth: 1.5, borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt },
  workSelectionText: { flex: 1, minWidth: 0, color: muted, fontSize: 11, fontWeight: "900", lineHeight: 16 },
  addWorkButton: { minHeight: 40, alignSelf: "flex-start", borderRadius: 13, borderWidth: 1, borderColor: "#efbd65", backgroundColor: inputSurface, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, marginTop: 10 },
  addWorkButtonText: { color: BRAND_ORANGE, fontSize: 11, fontWeight: "900" },
  otherWorkInput: { minHeight: 96, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: inputSurface, padding: 13, color: text, textAlignVertical: "top", fontSize: 13, lineHeight: 19 },
  measurementChoiceHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 24, marginBottom: 4 },
  measurementChoiceAccent: { width: 4, minHeight: 36, borderRadius: 2, backgroundColor: BRAND_ORANGE },
  measurementChoiceHeading: { flex: 1, minWidth: 0, color: text, fontSize: 17, fontWeight: "900", lineHeight: 22 },
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
  sampleReferenceCard: { borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 12, marginTop: 14 },
  sampleReferenceCardSelected: { borderWidth: 1.5, borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt },
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
    borderWidth: 1,
    borderColor: border,
    backgroundColor: surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 18,
  },
  homeMeasurementButtonSelected: { borderWidth: 1.5, borderColor: BRAND_ORANGE, backgroundColor: surfaceAlt },
  homeMeasurementGlowIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: inputSurface, alignItems: "center", justifyContent: "center" },
  homeMeasurementTextBlock: { flex: 1, minWidth: 0 },
  homeMeasurementTitle: { color: text, fontSize: 14, fontWeight: "900", lineHeight: 19 },
  homeMeasurementCopy: { color: muted, fontSize: 12, fontWeight: "800", lineHeight: 17, marginTop: 3 },
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
  urgencyRow: { flexDirection: "row", flexWrap: "nowrap", gap: 8 },
  urgencyButton: { flex: 1, minWidth: 0, minHeight: 88, borderRadius: 14, borderWidth: 1.2, borderColor: border, backgroundColor: surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, paddingVertical: 9 },
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
  quotesSummaryCard: { minHeight: 126, borderRadius: 20, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, padding: 14, marginBottom: 26 },
  quotesSummaryTop: { flexDirection: "row", alignItems: "center", gap: 14, width: "100%" },
  quoteClockIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#efcf92" },
  quotesSummaryTitle: { color: text, fontSize: 18, fontWeight: "900", lineHeight: 24 },
  quoteDetailsButton: { minHeight: 46, alignSelf: "flex-end", borderRadius: 23, borderWidth: 1, borderColor: border, backgroundColor: surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 14, marginTop: 14 },
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
  requestDetailPreviewRow: { gap: 8, paddingTop: 10 },
  requestDetailPreviewBox: { width: 58, height: 58, borderRadius: 13, overflow: "hidden", borderWidth: 1, borderColor: border, backgroundColor: surfaceAlt },
  requestDetailPreviewImage: { width: "100%", height: "100%" },
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
  mutedCenter: { color: muted, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center" },
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
  avatarPickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  avatarOption: { width: "30.8%", minHeight: 104, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: surface, alignItems: "center", justifyContent: "center", padding: 8 },
  avatarOptionActive: { borderColor: BRAND_ORANGE, backgroundColor: "#fff4dc" },
  avatarOptionImage: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#f1f5f9" },
  avatarOptionText: { color: muted, fontSize: 10, fontWeight: "900", textAlign: "center", marginTop: 7 },
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
  reviewInputLocked: { backgroundColor: "#f1f5f9", color: "#65748a" },
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
  liveMapCard: { minHeight: 138, borderRadius: 18, borderWidth: 1, borderColor: "#efcf92", backgroundColor: surfaceAlt, alignItems: "center", justifyContent: "center", padding: 16, gap: 8 },

  // Warning screen styles
  warningStepsBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 20, paddingHorizontal: 10 },
  warningStepItem: { alignItems: "center", flex: 1 },
  warningStepIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? "#222222" : "#e2e8f0", alignItems: "center", justifyContent: "center" },
  warningActiveStepIconCircle: { backgroundColor: BRAND_ORANGE },
  warningStepText: { fontSize: 10, color: muted, fontWeight: "700", marginTop: 4 },
  warningActiveStepText: { fontSize: 10, color: text, fontWeight: "900", marginTop: 4 },
  warningStepConnector: { flex: 1, height: 2, backgroundColor: isDark ? "#222222" : "#e2e8f0", marginHorizontal: 4 },
  warningCard: { backgroundColor: isDark ? "#1c140d" : "#fff7ed", borderColor: isDark ? "#452a15" : "#ffedd5", borderWidth: 1, borderRadius: 20, padding: 20, gap: 12, elevation: 1 },
  warningTitle: { fontSize: 18, fontWeight: "900", color: isDark ? "#ffedd5" : "#9a3412", textAlign: "center" },
  warningParagraph: { fontSize: 13, lineHeight: 20, color: isDark ? "#fdba74" : "#c2410c", textAlign: "center", fontWeight: "600" },
  warningTipText: { fontSize: 13, lineHeight: 18, color: isDark ? "#fed7aa" : "#9a3412", textAlign: "center", fontWeight: "700", marginTop: 4 },
  warningClothGuideButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: BRAND_ORANGE, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  warningClothGuideButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  warningSectionHeader: { fontSize: 15, fontWeight: "900", color: text, marginTop: 24, marginBottom: 16 },
  warningBulletItem: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  warningBulletIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#2a1e12" : "#ffedd5", alignItems: "center", justifyContent: "center" },
  warningBulletText: { fontSize: 13, color: isDark ? "#e2e8f0" : "#334155", fontWeight: "700" },
  warningAgreementRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 16, paddingHorizontal: 2 },
  warningAgreementText: { flex: 1, minWidth: 0, color: muted, fontSize: 11, fontWeight: "800", lineHeight: 16 },

  // Guide styles
  guideHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56, borderBottomWidth: 1, borderBottomColor: border, paddingHorizontal: 16 },
  guideBackButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  guideHeaderTitle: { fontSize: 18, fontWeight: "900", color: text },
  guideTabContainer: { flexDirection: "row", paddingHorizontal: 20, marginVertical: 16, gap: 8 },
  guideTabButton: { flex: 1, height: 40, borderRadius: 20, backgroundColor: isDark ? "#111111" : "#f1f5f9", alignItems: "center", justifyContent: "center" },
  guideActiveTabButton: { backgroundColor: "#111111" },
  guideTabButtonText: { fontSize: 13, fontWeight: "900", color: isDark ? "#94a3b8" : "#64748b" },
  guideActiveTabButtonText: { color: "#ffffff" },
  guideInfoBanner: { flexDirection: "row", gap: 10, backgroundColor: isDark ? "#1f180c" : "#fffbeb", borderColor: isDark ? "#452c0f" : "#fef3c7", borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 20, alignItems: "center" },
  guideInfoBannerText: { flex: 1, fontSize: 12, color: isDark ? "#fcd34d" : "#b45309", fontWeight: "800", lineHeight: 18 },
  guideSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 14, borderBottomWidth: 1.5, borderBottomColor: border, paddingBottom: 6 },
  guideSectionHeaderText: { fontSize: 14, fontWeight: "900", color: text, letterSpacing: 0.5 },
  guideTableTitle: { fontSize: 14, fontWeight: "900", color: text, marginTop: 8 },
  guideTableWidthText: { fontSize: 11, color: muted, fontWeight: "700", marginBottom: 8 },
  guideTableContainer: { borderWidth: 1, borderColor: border, borderRadius: 14, overflow: "hidden", backgroundColor: surface, marginBottom: 24 },
  guideTableHeaderRow: { flexDirection: "row", backgroundColor: isDark ? "#111111" : "#f8fafc", borderBottomWidth: 1, borderBottomColor: border, height: 38, alignItems: "center" },
  guideTableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: border, height: 38, alignItems: "center" },
  guideTableCell: { flex: 1, fontSize: 12, color: text, textAlign: "center", fontWeight: "700" },
  guideTableHeaderCell: { color: muted, fontWeight: "800", fontSize: 11 },
  guideTableLabelCell: { color: isDark ? "#e2e8f0" : "#475569", fontWeight: "800" },
  guideNoteCard: { flexDirection: "row", gap: 10, backgroundColor: isDark ? "#1f180c" : "#fff7ed", borderColor: isDark ? "#452c0f" : "#ffedd5", borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10, marginBottom: 20 },
  guideNoteText: { flex: 1, fontSize: 11, color: isDark ? "#fdba74" : "#b45309", fontWeight: "700", lineHeight: 16 }
  });
}

let styles = createStyles(false);
