"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  BookOpen,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Truck,
  Bug,
  Clock,
  CreditCard,
  Edit3,
  Filter,
  Headphones,
  HelpCircle,
  Home,
  Info,
  Loader2,
  LocateFixed,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Scissors,
  Banknote,
  Navigation,
  Plus,
  Phone,
  PackageCheck,
  Ruler,
  Search,
  RefreshCw,
  Send,
  Shirt,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  UploadCloud,
  UserRound,
  Wallet,
  X,
  XCircle,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState, useRef } from "react";
import { z } from "zod";
import { BrandLogo } from "@/src/components/brand-logo";
import { Button, EmptyState, FieldShell, inputClass } from "@/src/components/ui";
import { customerApi, errorMessage } from "@/src/lib/api";
import { couponDiscount, couponLabel, deliveryFeeForUrgency, getPlatformFee, getSmallOrderFee, quoteEta } from "@/src/lib/pricing";
import type { Address, CheckoutResponse, Coupon, CustomerTailor, HandoffOtp, NotificationRow, TailoringRequest, TailoringRequestItem, TailorQuote, UploadedMedia, WalletSummary } from "@/src/lib/types";
import { useAuthStore } from "@/src/store/auth-store";
import { CustomerExtraScreen, extraScreens, LanguageSwitcher, OrderActions, DeliveryTracking, TailorDirectory, TailorProfile, type ExtraScreen } from "./customer-extra-screens";
import { uiText, useCustomerPreferences } from "./customer-preferences";
import { CustomerDialogProvider, useCustomerDialog } from "./customer-dialog";
import { isFinishedOrder, orderStatusLabel, measurementSlots } from "./order-state";
import { measurementVisitFee } from "@darji/shared";
import { GENDER_FIT_OPTIONS, SERVICE_CATEGORIES, getGarmentsForGender, getServiceCategory } from "../../../../../shared/src/cloth-details";
import { VoiceNotes } from "./voice-notes";
import "./customer-order-web.css";

const DARJI_PRIVACY_URL = "https://www.getdarji.in/privacy";
const DARJI_TERMS_URL = "https://www.getdarji.in/terms";
const DARJI_ABOUT_URL = "https://www.getdarji.in/about";
const SUPPORT_PHONE_DISPLAY = "+91 96259 17902";
const SUPPORT_PHONE_URL = "tel:+919625917902";

type CustomerScreen = ExtraScreen | "home" | "newRequest" | "clothIssue" | "summary" | "quotes" | "confirm" | "orders" | "orderDetails" | "profile" | "support" | "editProfile" | "savedAddresses" | "wallet" | "helpCenter" | "aboutDarji";
type PaymentMethod = "ONLINE" | "UPI" | "COD";
type SaveAction = "another" | "summary";
type OrderFilter = "all" | "active" | "waiting" | "completed" | "cancelled";
type OrderSuccess = { code: string; total?: number; paymentMethod?: string };

type LocalMedia = {
  id: string;
  file: File;
  url: string;
  type: "image" | "video";
  name: string;
  size: number;
};

type ClothingItemDraft = {
  id: string;
  description: string;
  gender?: string;
  clothType?: string;
  workType?: string;
  selectedWorkItems?: string[];
  otherWorkDescription?: string;
  measurements?: Record<string, string>;
  measurementNotes?: string;
  sampleProvided?: boolean;
  sampleMedia?: LocalMedia[];
  uploadedSampleMedia?: UploadedMedia;
  homeMeasurementBooked?: boolean;
  preferredMeasurementSlot?: string;
  voiceNotes?: UploadedMedia[];
  media: LocalMedia[];
  uploadedMedia: UploadedMedia[];
};

type RequestDraft = {
  description: string;
  gender?: string;
  clothType?: string;
  workType?: string;
  selectedWorkItems?: string[];
  otherWorkDescription?: string;
  urgency?: string;
  measurements?: Record<string, string>;
  measurementNotes?: string;
  sampleProvided?: boolean;
  sampleMedia?: LocalMedia[];
  uploadedSampleMedia?: UploadedMedia;
  homeMeasurementBooked?: boolean;
  preferredMeasurementSlot?: string;
  voiceNotes?: UploadedMedia[];
  pickup: string;
  pickupLocation?: { lat: number; lng: number };
  media: LocalMedia[];
  uploadedMedia: UploadedMedia[];
  items: ClothingItemDraft[];
  editingItemId?: string;
  backendRequestId?: string;
};

type MeasurementGuide = {
  fields: string[];
  sizeChart: Array<{ size: string; values: Record<string, string> }>;
};

const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit phone number");
const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6 digit OTP");
const MAX_MEDIA_FILES = 6;

const flowSteps = [
  { id: "newRequest", label: "Details" },
  { id: "clothIssue", label: "Measurements" },
  { id: "summary", label: "Review" },
  { id: "quotes", label: "Quotes" },
  { id: "confirm", label: "Pay" }
] as const;

const appNav = [
  { screen: "home", label: "Home", icon: Home },
  { screen: "search", label: "Explore", icon: Search },
  { screen: "orders", label: "Orders", icon: PackageCheck },
  { screen: "support", label: "Support", icon: HelpCircle },
  { screen: "profile", label: "Profile", icon: UserRound }
] as const;

const genderOptions = GENDER_FIT_OPTIONS.map((option) => option.value);
const clothTypes = ["Kurta / Salwar", "Saree / Blouse", "Shirt / Pants", "Suit / Blazer", "Dress", "Lehenga", "Jeans", "School Uniform", "Others"];
const workTypes = SERVICE_CATEGORIES.map((category) => category.label);
const urgencyOptions = ["Normal (up to 7 days)", "Express (3-5 days)", "Instant Delivery"];
const homeBookingSteps: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Upload", icon: Camera },
  { label: "Issue", icon: Scissors },
  { label: "Measurements", icon: Ruler },
  { label: "Quotes", icon: Ticket },
  { label: "Delivery", icon: PackageCheck }
];

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

const orderTimeline = [
  "Pickup Scheduled",
  "Partner Assigned",
  "Picked Up",
  "Reached Tailor",
  "Accepted",
  "In Progress",
  "Quality Check",
  "Ready",
  "Out For Delivery",
  "Delivered"
];

function makeId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeEmptyDraft(pickup = "", pickupLocation?: RequestDraft["pickupLocation"]): RequestDraft {
  return {
    description: "",
    pickup,
    pickupLocation,
    media: [],
    uploadedMedia: [],
    items: []
  };
}

function addressText(address?: Address) {
  if (!address) return "";
  return address.address ?? [address.line1, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ");
}

function formatMoney(value: number | string | undefined) {
  return `Rs${Number(value ?? 0).toFixed(0)}`;
}

function requestCode(request: Pick<TailoringRequest, "id">) {
  return `REQ-${request.id.slice(0, 8).toUpperCase()}`;
}

function guideForClothType(clothType?: string) {
  const aliases: Record<string, string> = { Shirt: "Shirt / Pants", Trousers: "Shirt / Pants", Pants: "Shirt / Pants", Kurta: "Kurta / Salwar", Kurti: "Kurta / Salwar", "Salwar Suit": "Kurta / Salwar", Blouse: "Saree / Blouse", Suit: "Suit / Blazer", Blazer: "Suit / Blazer" };
  return measurementGuides[aliases[clothType ?? ""] ?? clothType ?? ""] ?? measurementGuides.Others;
}

function mediaFromFiles(files: FileList | null): LocalMedia[] {
  return Array.from(files ?? [])
    .slice(0, MAX_MEDIA_FILES)
    .map((file) => ({
      id: makeId("media"),
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video") ? "video" : "image",
      name: file.name,
      size: file.size
    }));
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
      draft.sampleMedia?.length ||
      draft.uploadedSampleMedia ||
      draft.homeMeasurementBooked
  );
}

function draftToClothingItem(draft: RequestDraft, itemId = draft.editingItemId ?? makeId("cloth")): ClothingItemDraft {
  return {
    id: itemId,
    description: draft.description.trim(),
    gender: draft.gender,
    clothType: draft.clothType,
    workType: draft.workType,
    selectedWorkItems: draft.selectedWorkItems,
    otherWorkDescription: draft.otherWorkDescription,
    measurements: draft.measurements,
    measurementNotes: draft.measurementNotes,
    sampleProvided: draft.sampleProvided,
    sampleMedia: draft.sampleMedia,
    uploadedSampleMedia: draft.uploadedSampleMedia,
    homeMeasurementBooked: draft.homeMeasurementBooked,
    preferredMeasurementSlot: draft.preferredMeasurementSlot,
    voiceNotes: draft.voiceNotes,
    media: draft.media,
    uploadedMedia: draft.uploadedMedia
  };
}

function clothingItemsForDraft(draft: RequestDraft): ClothingItemDraft[] {
  if (draft.items.length) return draft.items;
  if (!hasActiveItemDraftData(draft)) return [];
  return [draftToClothingItem(draft, "active-item")];
}

function clearActiveClothingItem(draft: RequestDraft): RequestDraft {
  return {
    ...makeEmptyDraft(draft.pickup, draft.pickupLocation),
    urgency: draft.urgency,
    items: draft.items,
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
    selectedWorkItems: item.selectedWorkItems,
    otherWorkDescription: item.otherWorkDescription,
    measurements: item.measurements,
    measurementNotes: item.measurementNotes,
    sampleProvided: item.sampleProvided,
    sampleMedia: item.sampleMedia,
    uploadedSampleMedia: item.uploadedSampleMedia,
    homeMeasurementBooked: item.homeMeasurementBooked,
    preferredMeasurementSlot: item.preferredMeasurementSlot,
    voiceNotes: item.voiceNotes,
    media: item.media ?? [],
    uploadedMedia: item.uploadedMedia ?? [],
    editingItemId: item.id
  };
}

function upsertClothingItem(draft: RequestDraft, item: ClothingItemDraft) {
  const matchId = draft.editingItemId ?? item.id;
  if (matchId && draft.items.some((entry) => entry.id === matchId)) {
    return draft.items.map((entry) => (entry.id === matchId ? { ...item, id: matchId } : entry));
  }
  return [...draft.items, item];
}

function clothingItemTitle(item: Pick<ClothingItemDraft | TailoringRequestItem, "gender" | "clothType">) {
  return [item.gender, item.clothType].filter(Boolean).join(" ") || "Clothing item";
}

function clothingItemSummary(item: Pick<ClothingItemDraft | TailoringRequestItem, "clothType" | "workType">) {
  return [item.clothType, item.workType].filter(Boolean).join(" - ") || "Tailoring";
}

function firstMediaUrl(item: ClothingItemDraft | TailoringRequestItem | TailoringRequest) {
  if ("media" in item) {
    const local = Array.isArray(item.media) && item.media[0] && "file" in item.media[0] ? (item.media[0] as LocalMedia).url : undefined;
    const uploaded = Array.isArray(item.media) && item.media[0] && "url" in item.media[0] ? (item.media[0] as UploadedMedia).url : undefined;
    return local ?? uploaded;
  }
  return undefined;
}

function measurementStatusForItem(item: {
  sampleProvided?: boolean;
  homeMeasurementBooked?: boolean;
  measurements?: Record<string, string>;
  measurement?: { fields?: Record<string, string | number> };
}) {
  if (item.sampleProvided) return "Sample";
  if (item.homeMeasurementBooked) return "Home Visit";
  if ("measurements" in item && Object.values(item.measurements ?? {}).some((value) => String(value).trim())) return "Custom";
  if ("measurement" in item && Object.keys(item.measurement?.fields ?? {}).length) return "Custom";
  return "Not added";
}

function notesForClothingItem(item: Pick<ClothingItemDraft, "measurementNotes" | "sampleProvided" | "homeMeasurementBooked" | "preferredMeasurementSlot">) {
  return [
    item.measurementNotes?.trim(),
    item.sampleProvided ? "Customer will provide a sample garment as a reference." : undefined,
    item.homeMeasurementBooked ? `Customer requested an at-home measurement visit. Preferred time: ${item.preferredMeasurementSlot ?? "not selected"}.` : undefined
  ]
    .filter(Boolean)
    .join("\n");
}

function payloadForClothingItem(item: ClothingItemDraft) {
  const measurementFields = Object.fromEntries(Object.entries(item.measurements ?? {}).filter(([, value]) => value.trim()));
  const measurementNotes = notesForClothingItem(item);
  return {
    description: item.description,
    gender: item.gender,
    clothType: item.clothType || "Custom Garment",
    workType: item.workType || "Customer Request",
    serviceCategory: item.workType || "Other",
    selectedWorkItems: item.selectedWorkItems ?? [],
    otherWorkDescription: item.otherWorkDescription,
    measurement: item.clothType
      ? {
          label: item.clothType,
          fields: measurementFields,
          imageUrl: item.uploadedSampleMedia?.url
        }
      : undefined,
    measurementNotes: measurementNotes || undefined,
    homeMeasurementBooked: item.homeMeasurementBooked === true,
    preferredMeasurementSlot: item.homeMeasurementBooked ? item.preferredMeasurementSlot : undefined,
    voiceNotes: item.voiceNotes ?? [],
    sampleProvided: item.sampleProvided === true,
    media: item.uploadedMedia,
    sampleMedia: item.uploadedSampleMedia ? [item.uploadedSampleMedia] : []
  };
}

function homeMeasurementFeeForItems(items: Array<Pick<ClothingItemDraft | TailoringRequestItem, "homeMeasurementBooked">>, distanceMeters?: number) {
  return items.some((item) => item.homeMeasurementBooked) ? measurementVisitFee(distanceMeters) : 0;
}

function orderItemCount(request: TailoringRequest) {
  return Math.max(1, request.items?.length ?? request.itemCount ?? 1);
}

function statusLabel(request: TailoringRequest) {
  return uiText(orderStatusLabel(request));
}

function isCancelledOrder(request: TailoringRequest) {
  return request.status === "CANCELLED" || String(request.orderStatus ?? "").toLowerCase().includes("cancel");
}

function isCompletedOrder(request: TailoringRequest) {
  return isFinishedOrder(request);
}

function isWaitingPickupOrder(request: TailoringRequest) {
  const value = String(request.orderStatus ?? request.status).toLowerCase();
  return !isCancelledOrder(request) && !isCompletedOrder(request) && (value.includes("pickup") || request.status === "TAILOR_SELECTED" || request.status === "PAYMENT_PENDING");
}

function isActiveOrder(request: TailoringRequest) {
  return !isCancelledOrder(request) && !isCompletedOrder(request);
}

function statusTone(request: TailoringRequest) {
  if (isCancelledOrder(request)) return "danger";
  if (isCompletedOrder(request)) return "success";
  if (isWaitingPickupOrder(request)) return "warning";
  return "active";
}

function statusPillClass(request: TailoringRequest) {
  const tone = statusTone(request);
  if (tone === "danger") return "bg-[#fff1f2] text-[#dc2626]";
  if (tone === "success") return "bg-[#ecfdf5] text-[#16a34a]";
  if (tone === "warning") return "bg-[#fff7e8] text-[#f59e0b]";
  return "bg-[#fff2d8] text-[var(--darji-orange)]";
}

function primaryOrderItem(request: TailoringRequest): TailoringRequestItem {
  return request.items?.[0] ?? {
    description: request.description,
    gender: request.gender,
    clothType: request.clothType,
    workType: request.workType,
    media: request.media
  };
}

function formatOrderDate(value?: string, includeTime = false) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString("en-IN", includeTime ? { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" } : { day: "2-digit", month: "short", year: "numeric" });
}

function estimatedDeliveryDate(request: TailoringRequest) {
  const created = new Date(request.createdAt);
  if (Number.isNaN(created.getTime())) return "Date pending";
  const days = request.selectedQuote?.estimatedDays ?? (/same day/i.test(request.urgency) ? 1 : /express|instant/i.test(request.urgency) ? 2 : 4);
  created.setDate(created.getDate() + days);
  return formatOrderDate(created.toISOString());
}

function orderAmount(request: TailoringRequest) {
  return request.totalAmount ?? request.quoteAmount ?? request.selectedQuote?.price;
}

function currentTimelineIndex(request: TailoringRequest) {
  const status = String(request.orderStatus ?? request.status).toLowerCase();
  if (isFinishedOrder(request)) return orderTimeline.length - 1;
  if (status === "stitching_completed") return 7;
  if (status.includes("out_for_delivery")) return 8;
  if (status.includes("ready")) return 7;
  if (status.includes("working") || status.includes("stitching")) return 5;
  if (status.includes("tailor")) return 4;
  if (status.includes("received")) return 3;
  if (status.includes("picked")) return 2;
  if (status.includes("pickup_started")) return 1;
  return 0;
}

function quoteInitials(quote: TailorQuote) {
  const name = quote.tailor?.shopName ?? "Verified Tailor";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isCheckoutOpen(request: TailoringRequest) {
  return request.status === "QUOTE_REQUESTED" || request.status === "PAYMENT_PENDING";
}

function loadRazorpay() {
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay failed to load"));
    document.body.appendChild(script);
  });
}

async function openRazorpay(
  requestId: string,
  razorpay: Extract<CheckoutResponse, { mode: "online" }>["razorpay"],
  onStartVerification: () => void,
  onVerified: (request: TailoringRequest) => Promise<void>,
  onError: (err: unknown) => void
) {
  if (typeof window === "undefined") return;
  try {
    await loadRazorpay();
    const Razorpay = (window as unknown as { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
    if (!Razorpay) throw new Error("Razorpay could not load");
    const checkout = new Razorpay({
      key: razorpay.keyId,
      amount: razorpay.amount,
      currency: razorpay.currency,
      name: razorpay.name,
      description: razorpay.description,
      order_id: razorpay.orderId,
      prefill: razorpay.prefill,
      handler: async (payment: unknown) => {
        try {
          onStartVerification();
          const verifiedRequest = await customerApi.verifyCheckout(requestId, payment);
          await onVerified(verifiedRequest);
        } catch (err) {
          onError(err);
        }
      },
      theme: { color: "#ff7000" }
    });
    checkout.open();
  } catch (err) {
    onError(err);
  }
}

function AuthPanel() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const sessionNotice = useAuthStore((state) => state.sessionNotice);
  const clearSessionNotice = useAuthStore((state) => state.clearSessionNotice);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [notice, setNotice] = useState<string>();
  const [resendAt, setResendAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  useEffect(() => {
    if (!sessionNotice) return;
    setNotice(sessionNotice);
    clearSessionNotice();
  }, [clearSessionNotice, sessionNotice]);

  const requestOtp = useMutation({
    mutationFn: async () => {
      const parsed = phoneSchema.safeParse(phone);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid phone");
      return customerApi.requestOtp(parsed.data);
    },
    onSuccess: () => {
      setNotice("OTP requested. Please check your phone.");
      setOtp("");
      setResendAt(Date.now() + 60000);
      setStep("otp");
    }
  });

  const verifyOtp = useMutation({
    mutationFn: async () => {
      const parsed = otpSchema.safeParse(otp);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid OTP");
      return customerApi.verifyOtp(phone, parsed.data);
    },
    onSuccess: (session) => { queryClient.clear(); setSession(session); }
  });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[480px] bg-white border border-[#e6edf5] rounded-[2.5rem] p-8 sm:p-10 shadow-[0_24px_64px_rgba(8,17,31,0.06)]">
        <div className="mb-5 flex justify-end"><LanguageSwitcher /></div>
        {/* Centered Logo */}
        <div className="flex justify-center mb-6">
          <img src="/darji-loader-transparent.png" alt="Darji Logo" className="h-24 w-auto object-contain" />
        </div>

        {/* Header Text */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-[#08111f] tracking-tight">
            {uiText("Login to")} <span className="text-[var(--darji-orange)]">{uiText("Darji")}</span>
          </h2>
          <p className="mt-2 text-sm font-semibold text-[var(--darji-muted)]">
            {step === "phone" ? uiText("Enter your mobile number to continue") : uiText("Enter the verification code sent to your phone")}
          </p>
        </div>

        {/* Form Container */}
        <div className="space-y-5">
          {step === "phone" ? (
            /* Phone Input styled exactly like the screenshot */
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white transition-all duration-200 focus-within:border-[var(--darji-orange)] focus-within:ring-2 focus-within:ring-[var(--darji-orange)]/10 overflow-hidden shadow-[0_2px_12px_rgba(8,17,31,0.02)]">
              <div className="flex items-center gap-1.5 px-4 py-4 bg-slate-50 text-slate-700 font-extrabold text-sm border-r border-slate-200 select-none">
                <span>+91</span>
                <span className="text-slate-400 text-[10px]">▼</span>
              </div>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                aria-label={uiText("Mobile number")}
                maxLength={10}
                placeholder={uiText("Enter mobile number")}
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full border-none px-4 py-4 text-sm font-bold text-[#08111f] placeholder-slate-400/80 focus:outline-none focus:ring-0 animate-none bg-transparent"
              />
            </div>
          ) : (
            /* OTP Verification Input */
            <div className="space-y-4">
              <div className="flex items-center rounded-2xl border border-slate-200 bg-[#fbfcfd] transition-all duration-200 focus-within:border-[var(--darji-orange)] focus-within:ring-2 focus-within:ring-[var(--darji-orange)]/10 overflow-hidden shadow-[0_2px_12px_rgba(8,17,31,0.02)]">
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={uiText("Verification code")}
                  autoFocus
                  maxLength={6}
                  placeholder={uiText("0 0 0 0 0 0")}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full border-none px-4 py-4 text-center text-lg font-black tracking-[0.2em] text-[#08111f] placeholder-slate-300 focus:outline-none focus:ring-0 bg-transparent"
                />
              </div>
            </div>
          )}

          {/* Notices & Errors */}
          {notice ? (
            <p className="rounded-2xl bg-[#ecfdf5] px-4 py-3.5 text-xs font-bold text-[#047857] text-center shadow-sm">
              {notice}
            </p>
          ) : null}
          {requestOtp.error || verifyOtp.error ? (
            <p className="rounded-2xl bg-[#fff1f2] px-4 py-3.5 text-xs font-bold text-[#b91c1c] text-center shadow-sm">
              {errorMessage(requestOtp.error ?? verifyOtp.error)}
            </p>
          ) : null}

          {/* Action Buttons */}
          <div className="pt-2">
            {step === "phone" ? (
              <button
                disabled={requestOtp.isPending || secondsLeft > 0 || phone.length !== 10}
                onClick={() => requestOtp.mutate()}
                className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffae3c] to-[#ff8c23] hover:from-[#e59424] hover:to-[#e57710] text-[#08111f] font-black text-base shadow-[0_4px_16px_rgba(255,112,0,0.18)] transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {requestOtp.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{secondsLeft > 0 ? `Send OTP in ${secondsLeft}s` : uiText("Send OTP")}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  disabled={verifyOtp.isPending || requestOtp.isPending || otp.length !== 6}
                  onClick={() => verifyOtp.mutate()}
                  className="h-14 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffae3c] to-[#ff8c23] hover:from-[#e59424] hover:to-[#e57710] text-[#08111f] font-black text-base shadow-[0_4px_16px_rgba(255,112,0,0.18)] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {verifyOtp.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : uiText("Verify")}
                </button>
                <button
                  disabled={verifyOtp.isPending || requestOtp.isPending}
                  onClick={() => { setStep("phone"); setOtp(""); setNotice(undefined); verifyOtp.reset(); requestOtp.reset(); }}
                  className="h-14 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition-all duration-200 cursor-pointer"
                >
                  {uiText("Change Phone")}
                </button>
              </div>
            )}
          </div>

          {/* Muted divider & secure indicators */}
          {step === "otp" ? <button type="button" className="w-full text-sm font-bold text-[var(--darji-orange)] disabled:opacity-50" disabled={secondsLeft > 0 || requestOtp.isPending || verifyOtp.isPending} onClick={() => requestOtp.mutate()}>
            {requestOtp.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : secondsLeft > 0 ? `Resend OTP in ${secondsLeft}s` : "Resend OTP"}
          </button> : null}
          <div className="py-2 flex items-center justify-center gap-3">
            <span className="h-[1px] w-full bg-slate-100" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{uiText("or")}</span>
            <span className="h-[1px] w-full bg-slate-100" />
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-500/90 text-[13px] font-semibold">
            <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{uiText("We never share your number with anyone.")}</span>
          </div>

          <div className="pt-4 text-center text-xs font-bold leading-relaxed text-slate-400">
            {uiText("By continuing, you agree to our")}{" "}
            <a href={DARJI_TERMS_URL} target="_blank" rel="noreferrer" className="text-[var(--darji-orange)] hover:underline">{uiText("Terms & Conditions")}</a> {uiText("and")}{" "}
            <a href={DARJI_PRIVACY_URL} target="_blank" rel="noreferrer" className="text-[var(--darji-orange)] hover:underline">{uiText("Privacy Policy")}</a>.
          </div>
        </div>
      </div>
    </main>
  );
}

function StepProgress({ screen, setScreen }: { screen: CustomerScreen; setScreen?: (screen: CustomerScreen) => void }) {
  const activeIndex = flowSteps.findIndex((step) => step.id === screen);
  
  const stepDescriptions: Record<string, string> = {
    newRequest: "Tell us what's wrong",
    clothIssue: "Add measurements",
    summary: "Review your order",
    quotes: "Get tailor quotes",
    confirm: "Secure payment"
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#e6edf5] bg-white p-5 shadow-sm">
      {flowSteps.map((step, index) => {
        const active = activeIndex === index;
        const completed = activeIndex > index;
        const pending = activeIndex < index;
        const isClickable = setScreen && completed;
        
        const stepContent = (
          <div className="flex items-center gap-3">
            <div 
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-black text-sm transition-all duration-200 ${
                completed 
                  ? "bg-[#16a34a] text-white shadow-sm" 
                  : active 
                    ? "bg-[var(--darji-orange)] text-white shadow-sm scale-105" 
                    : "bg-[#f8fafc] border border-[#dce4ef] text-[var(--darji-muted)]"
              }`}
            >
              {completed ? <Check className="h-4.5 w-4.5 stroke-[3px]" /> : index + 1}
            </div>
            <div className="text-left">
              <p className={`text-sm font-black transition-colors duration-200 ${pending ? "text-[var(--darji-muted)] font-bold" : "text-[var(--darji-ink)]"}`}>
                {step.label}
              </p>
              <p className={`text-[10px] font-bold mt-0.5 leading-none transition-colors duration-200 ${pending ? "text-slate-400" : "text-[var(--darji-muted)]"}`}>
                {stepDescriptions[step.id]}
              </p>
            </div>
          </div>
        );

        return (
          <div key={step.id} className="flex flex-1 items-center justify-between">
            {isClickable ? (
              <button 
                type="button" 
                onClick={() => setScreen(step.id as CustomerScreen)} 
                className="focus:outline-none hover:opacity-80 transition-opacity"
              >
                {stepContent}
              </button>
            ) : (
              <div>{stepContent}</div>
            )}
            {index < flowSteps.length - 1 && (
              <div className="mx-4 hidden flex-1 border-t-2 border-dashed border-[#e2e8f0] md:block min-w-[20px]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AppHeader({
  screen,
  setScreen,
  signOut,
  syncing,
  pickup
}: {
  screen: CustomerScreen;
  setScreen: (screen: CustomerScreen) => void;
  signOut: () => void;
  syncing: boolean;
  pickup: string;
}) {
  const user = useAuthStore((state) => state.user);
  return (
    <header className="customer-site-header sticky top-0 z-40 border-b border-[#f0dec5] bg-white/95 backdrop-blur-xl">
      <div className="shell flex min-h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 rounded-xl">
          <img src="/darji-logo-cropped.png" alt="Darji" className="h-9 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {appNav.map((item) => {
            const Icon = item.icon;
            const active = item.screen === screen || (item.screen === "home" && ["newRequest", "clothIssue", "summary", "quotes", "confirm", "orderDetails"].includes(screen));
            return (
              <button key={item.screen} onClick={() => setScreen(item.screen)} className={`focus-ring inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${active ? "bg-[#fff2d7] text-[#ce8200]" : "text-[#2d201d] hover:bg-[#fff8eb]"}`}>
                <Icon className="h-4 w-4" strokeWidth={1.9} />
                {uiText(item.label)}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen("savedAddresses")} className="hidden max-w-56 items-center gap-2 rounded-xl border border-[#ecd9bb] px-3 py-2 text-left text-xs font-semibold text-[#30211d] xl:inline-flex"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{pickup || uiText("Choose location")}</span><ChevronDown className="h-3 w-3 shrink-0" /></button>
          <button onClick={() => setScreen("search")} className="hidden min-w-52 items-center gap-2 rounded-xl border border-[#ecd9bb] px-3 py-2 text-left text-xs text-[#685d56] xl:inline-flex"><Search className="h-4 w-4" />{uiText("Search services or tailors...")}</button>
          <div className="hidden sm:block"><LanguageSwitcher /></div>
          <button title={uiText("Notifications")} onClick={() => setScreen("notifications")} className="p-2"><Bell size={19} /></button>
          {syncing ? (
            <span className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--darji-muted)] shadow-sm sm:inline-flex">
              <Loader2 className="h-4 w-4 animate-spin" /> {uiText("Syncing")}
            </span>
          ) : null}
          <button onClick={() => setScreen("profile")} className="focus-ring overflow-hidden h-10 w-10 shrink-0 rounded-full bg-[#fff8eb] border border-[#ecd9bb] transition hover:border-[#e9a100] flex items-center justify-center shadow-sm">
            {user ? (
              <img src={getUserAvatarUrl(user)} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-black text-[var(--darji-ink)]">{uiText("U")}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ screen, setScreen }: { screen: CustomerScreen; setScreen: (screen: CustomerScreen) => void }) {
  const mobileNav = [
    { screen: "home", label: "Home", icon: Home },
    { screen: "search", label: "Explore", icon: Search },
    { screen: "newRequest", label: "New Request", icon: Plus },
    { screen: "orders", label: "Orders", icon: PackageCheck },
    { screen: "profile", label: "Profile", icon: UserRound }
  ] as const;
  return (
    <nav aria-label={uiText("Main navigation")} style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }} className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6edf5] bg-white/94 px-3 py-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = item.screen === screen;
          const isCreate = item.screen === "newRequest";
          return (
            <button key={item.screen} type="button" aria-label={uiText(item.label)} aria-current={active ? "page" : undefined} onClick={() => setScreen(item.screen)} className={`reference-mobile-tab ${isCreate ? "reference-mobile-create" : ""} ${active && !isCreate ? "is-active" : ""}`}>
              <span className={isCreate ? "reference-mobile-create-icon" : ""}><Icon className="h-5 w-5" strokeWidth={isCreate ? 2.7 : 2} /></span>
              <span>{uiText(item.label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function LoadingScreen({ label = "Loading your customer app" }: { label?: string }) {
  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="shell grid min-h-screen place-items-center py-10">
        <div className="premium-card grid w-full max-w-md place-items-center rounded-[2rem] p-8 text-center">
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-[#fff7e8]">
            <span className="absolute inset-0 rounded-full border-2 border-[#ffd5ad]" />
            <Loader2 className="h-8 w-8 animate-spin text-[var(--darji-orange)]" />
          </div>
          <BrandLogo className="mt-6" imageClassName="h-[72px] w-auto" />
          <h1 className="mt-2 text-3xl font-black">{uiText(label)}</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{uiText("Syncing orders, wallet, coupons, addresses, and delivery verification data.")}</p>
        </div>
      </div>
    </main>
  );
}

function OrderPlacedModal({ success, onClose, onOrders }: { success?: OrderSuccess; onClose: () => void; onOrders: () => void }) {
  if (!success) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,17,31,0.42)] px-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative w-full max-w-md rounded-[2rem] border border-[#e6edf5] bg-white p-7 text-center shadow-[0_30px_90px_rgba(8,17,31,0.24)]">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-[#f8fafc] text-[var(--darji-muted)]">
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#ecfdf5] text-[#16a34a]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">{uiText("Order placed")}</p>
        <h2 className="mt-2 text-3xl font-black">{success.code}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{uiText("Your order is confirmed. You can track pickup, delivery OTP, tailor status, and payment details from My Orders.")}</p>
        <div className="mt-5 grid gap-2">
          {success.total != null ? <SummaryLine label={uiText("Amount")} value={formatMoney(success.total)} strong /> : null}
          {success.paymentMethod ? <SummaryLine label={uiText("Payment")} value={success.paymentMethod} /> : null}
        </div>
        <Button className="mt-6 w-full" onClick={onOrders}>{uiText("Go to My Orders")}</Button>
      </motion.div>
    </div>
  );
}

const appAsset = (group: string, file: string) => `/customer-app-assets/${group}/${file}`;
const homeServiceCategories = [
  { label: "Alteration", detail: "Fit and size changes", image: appAsset("home-services", "alteration.jpg") },
  { label: "Repair", detail: "Tear, hole, zipper and more", image: appAsset("home-services", "repair.jpg") },
  { label: "Embroidery", detail: "Decorative and custom work", image: appAsset("home-services", "embroidery.jpg") },
  { label: "Custom Stitching", detail: "Stitch from scratch", image: appAsset("home-services", "custom_stitching.jpg") }
];
const exploreCategories = [
  { label: "Men Ethnic", detail: "Kurta, Sherwani & more", image: appAsset("search-categories", "men_ethnic.jpg") },
  { label: "Men Formal", detail: "Shirts, Pants & Blazers", image: appAsset("search-categories", "men_formal.jpg") },
  { label: "Women Ethnic", detail: "Saree, Suit & Lehenga", image: appAsset("search-categories", "women_ethnic.jpg") },
  { label: "Women Western", detail: "Dresses, Tops & more", image: appAsset("search-categories", "women_western.jpg") },
  { label: "Kids", detail: "Boys & Girls Wear", image: appAsset("search-categories", "kids.jpg") },
  { label: "Uniforms", detail: "School & College Wear", image: appAsset("search-categories", "uniforms.jpg") },
  { label: "Home & More", detail: "Curtains, Cushion & more", image: appAsset("search-categories", "home_more.jpg") },
  { label: "Alterations", detail: "Repairs & Alterations", image: appAsset("search-categories", "alterations.jpg") }
];
const customProjectCategories = [
  { label: "Home & Decor", detail: "Curtains, cushions and covers", image: appAsset("custom-requests", "home_decor.jpg") },
  { label: "Costumes", detail: "School, dance and event", image: appAsset("custom-requests", "costumes_special_projects.jpg") },
  { label: "Upcycling", detail: "Turn old fabric into something new", image: appAsset("custom-requests", "upcycling.jpg") },
  { label: "Bags & Accessories", detail: "Totes, potlis and pouches", image: appAsset("custom-requests", "bags_fabric_accessories.jpg") },
  { label: "Personalized Items", detail: "Patches, badges and labels", image: appAsset("custom-requests", "personalized_fabric_items.jpg") },
  { label: "Pet Clothing", detail: "Outfits, bandanas and covers", image: appAsset("custom-requests", "pet_clothing_accessories.jpg") }
];
const appHowItWorks = [
  { title: "Place a Request", description: "Tell us what you need", image: appAsset("home-sections", "how_share_request.jpg") },
  { title: "Compare Quotes", description: "Choose your tailor", image: appAsset("home-sections", "how_compare_quotes.jpg") },
  { title: "Confirm Securely", description: "Complete your booking", image: appAsset("home-sections", "how_confirm_securely.jpg") },
  { title: "Pickup from Home", description: "We collect your garment", image: appAsset("home-sections", "how_doorstep_pickup.jpg") },
  { title: "Receive & Rate", description: "Get it back at home", image: appAsset("home-sections", "how_receive_rate.jpg") }
];

function ReferenceExploreScreen({ setScreen, setDraft }: { setScreen: (screen: CustomerScreen) => void; setDraft: Dispatch<SetStateAction<RequestDraft>> }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"categories" | "tailors">("categories");
  const categories = exploreCategories.filter((category) => `${category.label} ${category.detail}`.toLowerCase().includes(search.trim().toLowerCase()));
  function chooseCategory(label: string) {
    const workType = label === "Alteration" || label === "Alterations" ? "Alteration & Fitting" : label === "Repair" ? "Repair & Mending" : label === "Custom Stitching" ? "New Stitching" : undefined;
    if (workType) setDraft((current) => ({ ...current, workType, homeMeasurementBooked: workType === "New Stitching" || current.homeMeasurementBooked }));
    setScreen("newRequest");
  }
  return <div className="grid gap-5"><section className="reference-hero reference-card min-h-[260px] p-7 sm:p-9"><div className="max-w-xl"><h1 className="text-4xl font-black tracking-[-.04em]">{uiText("Explore Services,")}<br />{uiText("Categories and Tailors")}</h1><p className="mt-3 max-w-md text-sm text-[#574b43]">{uiText("Find trusted tailors, discover services, and get your clothes stitched, altered or repaired with ease.")}</p><label className="mt-5 flex items-center gap-3 rounded-full border border-[#e5bd7f] bg-white/90 px-5 py-3 shadow-sm"><Search className="h-5 w-5" /><input aria-label={uiText("Search services and categories")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={uiText("Search services or categories...")} className="w-full border-0 bg-transparent text-sm outline-none" /></label><div className="mt-4 inline-flex rounded-full border border-[#eed9b9] bg-white p-1"><button className={`${tab === "categories" ? "reference-action" : "reference-outline"} !min-h-9 !rounded-full`} onClick={() => setTab("categories")}>{uiText("Categories")}</button><button className={`${tab === "tailors" ? "reference-action" : "reference-outline"} !min-h-9 !rounded-full`} onClick={() => setTab("tailors")}>{uiText("Tailors")}</button></div></div></section>{tab === "categories" ? <section><h2 className="reference-section-heading mb-3">{uiText("Browse by Category")}</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{categories.map((category) => <button key={category.label} onClick={() => chooseCategory(category.label)} className="reference-category reference-card overflow-hidden p-3 text-left transition"><img src={category.image} alt="" /><p className="mt-2 text-sm font-black">{uiText(category.label)}</p><p className="text-xs text-[#635852]">{uiText(category.detail)}</p></button>)}{!categories.length ? <p className="text-sm">{uiText("No category matches your search.")}</p> : null}</div></section> : null}<section><h2 className="reference-section-heading mb-3">{uiText("Top Tailors Near You")}</h2><div className="reference-tailor-directory reference-card p-5"><TailorDirectory savedOnly={false} onBook={() => setScreen("newRequest")} /></div></section><ReferenceTrustStrip /></div>;
}

function ReferenceHomeScreen({ requests, coupons, draft, setDraft, setScreen, openOrder }: { requests: TailoringRequest[]; coupons: Coupon[]; draft: RequestDraft; setDraft: Dispatch<SetStateAction<RequestDraft>>; setScreen: (screen: CustomerScreen) => void; openOrder: (request: TailoringRequest) => void }) {
  const activeOrder = requests.find(isActiveOrder);
  const offer = coupons.find((coupon) => coupon.isActive);
  const hasDraft = hasActiveItemDraftData(draft) || draft.items.length > 0 || Boolean(draft.backendRequestId);
  const nextScreen: CustomerScreen = draft.backendRequestId ? "quotes" : draft.items.length ? "summary" : "newRequest";
  function chooseCategory(label: string) {
    const workType = label === "Alteration" ? "Alteration & Fitting" : label === "Repair" ? "Repair & Mending" : label === "Custom Stitching" ? "New Stitching" : undefined;
    if (workType) setDraft((current) => ({ ...current, workType, homeMeasurementBooked: workType === "New Stitching" || current.homeMeasurementBooked }));
    setScreen("newRequest");
  }
  return <div className="grid gap-5">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4">
        <section className="reference-hero reference-card relative flex min-h-[310px] flex-col justify-center overflow-hidden p-7 sm:p-9">
          <div className="relative z-10 max-w-[450px]">
            <h1 className="text-4xl font-black leading-[1.08] tracking-[-.045em] sm:text-5xl">{uiText("Get Tailoring")}<br />{uiText("Done at Your Doorstep")}</h1>
            <p className="mt-4 max-w-[380px] text-sm leading-6 text-[#453a34]">{uiText("Alteration, repair, custom stitching and more — with trusted tailors, pickup and delivery at home.")}</p>
            <button onClick={() => setScreen(nextScreen)} className="reference-action reference-start-request mt-5">{uiText(hasDraft ? "Continue Request" : "Start Request")} <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="relative z-10 mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#3b2b21]"><span className="flex items-center gap-2"><Truck className="h-4 w-4 text-[#e79d00]" />Doorstep Pickup & Delivery</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e79d00]" />Verified Tailors</span><span className="flex items-center gap-2"><Shirt className="h-4 w-4 text-[#e79d00]" />Quality Service</span></div>
        </section>
        <div className="grid gap-3 sm:grid-cols-2"><div className="reference-card flex min-h-24 items-center gap-4 bg-[#fff1ce] p-5"><img src={appAsset("home-sections", "offers_benefits.jpg")} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /><div><p className="text-lg font-black">{offer ? couponLabel(offer) : uiText("Doorstep service")}</p><p className="text-sm">{offer ? `${uiText("Use code")}: ${offer.code}` : uiText("Pickup and delivery at home")}</p></div></div><button onClick={() => setScreen("newRequest")} className="reference-card reference-festive min-h-24 p-5 text-left"><span className="rounded-lg bg-[#8f2815] px-2 py-1 text-xs font-black text-white">{uiText("TAILORING")}</span><p className="mt-2 max-w-44 text-lg font-black">{uiText("Made for your occasion")}</p></button></div>
      </div>
      <aside className="grid content-start gap-4">
        <div className="reference-card p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-black">{uiText("Your Orders")}</h2><button onClick={() => setScreen("orders")} className="flex items-center gap-1 text-xs font-bold text-[#ce8200]">{uiText("View All")} <ArrowRight className="h-4 w-4" /></button></div>{activeOrder ? <button onClick={() => openOrder(activeOrder)} className="mt-4 w-full rounded-xl border border-[#eed9b9] bg-white p-4 text-left"><div className="flex items-center gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#fff2d7]">{firstMediaUrl(primaryOrderItem(activeOrder)) ? <img src={firstMediaUrl(primaryOrderItem(activeOrder))} alt="" className="h-full w-full object-cover" /> : <Shirt className="h-6 w-6 text-[#d99500]" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-black">{requestCode(activeOrder)}</p><p className="truncate text-xs text-[#655a52]">{clothingItemTitle(primaryOrderItem(activeOrder))}</p><span className="mt-1 inline-block rounded-full bg-[#e1efff] px-2 py-1 text-[10px] font-bold text-[#2462aa]">{statusLabel(activeOrder)}</span></div><ChevronRight className="h-4 w-4" /></div><div className="reference-status-line mt-5"><i className="is-done">✓</i><span className="is-done" /><i className="is-done">✓</i><span className="is-done" /><i className="is-current" /><span /><i /></div><div className="mt-2 flex justify-between text-[10px] font-semibold text-[#574c44]"><span>Requested</span><span>Tailor</span><span>In progress</span><span>Delivered</span></div></button> : <p className="mt-4 rounded-xl border border-dashed border-[#e9d2ae] p-4 text-sm text-[#655a52]">{uiText("Your current order will appear here.")}</p>}<button onClick={() => setScreen("orders")} className="reference-outline mt-3 w-full"><PackageCheck className="h-4 w-4 text-[#db9200]" />{uiText("Track All Orders")}<ChevronRight className="ml-auto h-4 w-4" /></button></div>
        <div className="reference-card p-5"><h2 className="text-lg font-black">{uiText("Need Help?")}</h2><button onClick={() => setScreen("support")} className="reference-outline mt-4 w-full justify-start"><MessageSquare className="h-5 w-5" />{uiText("Chat with Support")}<ChevronRight className="ml-auto h-4 w-4" /></button><button onClick={() => setScreen("helpCenter")} className="reference-outline mt-2 w-full justify-start"><HelpCircle className="h-5 w-5" />{uiText("Help Center")}<ChevronRight className="ml-auto h-4 w-4" /></button></div>
      </aside>
    </div>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="reference-section-heading">{uiText("What do you need?")}</h2><button onClick={() => setScreen("search")} className="flex items-center gap-1 text-sm font-bold text-[#ce8200]">{uiText("Explore Services")}<ArrowRight className="h-4 w-4" /></button></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{homeServiceCategories.map((category) => <button key={category.label} onClick={() => chooseCategory(category.label)} className="reference-category reference-card overflow-hidden p-3 text-left transition"><img src={category.image} alt="" /><p className="mt-2 text-sm font-black">{uiText(category.label)}</p><p className="text-xs text-[#635852]">{uiText(category.detail)}</p></button>)}</div></section>
    <section><h2 className="reference-section-heading mb-3">{uiText("Explore More Categories")}</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{customProjectCategories.map((category) => <button key={category.label} onClick={() => setScreen("newRequest")} className="reference-category reference-card overflow-hidden p-3 text-left transition"><img src={category.image} alt="" /><p className="mt-2 text-sm font-black">{uiText(category.label)}</p><p className="text-xs text-[#635852]">{uiText(category.detail)}</p></button>)}</div></section>
    <section><h2 className="reference-section-heading mb-3">{uiText("How Darji Works")}</h2><div className="grid gap-3 md:grid-cols-5">{appHowItWorks.map((step, index) => <div key={step.title} className="reference-card flex items-center gap-3 p-4"><img src={step.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /><div><p className="text-sm font-black">{index + 1}. {uiText(step.title)}</p><p className="text-xs text-[#635852]">{uiText(step.description)}</p></div></div>)}</div></section>
    <ReferenceTrustStrip />
  </div>;
}

function ReferenceTrustStrip() { return <div className="reference-trust-strip"><div><img src={appAsset("home-sections", "why_trusted_tailors.jpg")} alt="" />{uiText("Verified & Experienced Tailors")}</div><div><img src={appAsset("home-sections", "why_doorstep.jpg")} alt="" />{uiText("Doorstep Pickup & Delivery")}</div><div><img src={appAsset("home-sections", "why_secure.jpg")} alt="" />{uiText("Secure Handling")}</div></div>; }

function MediaPreviewGrid({ local, uploaded, onRemoveLocal, onRemoveUploaded }: { local?: LocalMedia[]; uploaded?: UploadedMedia[]; onRemoveLocal?: (id: string) => void; onRemoveUploaded?: (id: string) => void }) {
  const items = [
    ...(local ?? []).map((media) => ({ id: media.id, type: media.type, url: media.url, label: media.name, remove: onRemoveLocal })),
    ...(uploaded ?? []).map((media) => ({ id: media.publicId, type: media.resourceType, url: media.url, label: media.originalName ?? "Uploaded media", remove: onRemoveUploaded }))
  ];
  if (!items.length) return null;
  return (
    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
      {items.slice(0, MAX_MEDIA_FILES).map((media) => (
        <div key={media.id} className="relative aspect-square overflow-hidden rounded-2xl border border-[#e6edf5] bg-[#f8fafc]">
          {media.type === "video" ? (
            <video className="h-full w-full object-cover" src={media.url} muted />
          ) : (
            <img className="h-full w-full object-cover" src={media.url} alt={media.label} />
          )}
          {media.remove ? <button type="button" title={uiText("Remove media")} aria-label={`${uiText("Remove media")}: ${media.label}`} onClick={() => media.remove?.(media.id)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-white text-red-700 shadow"><X size={18} /></button> : null}
        </div>
      ))}
    </div>
  );
}



function UploadBox({
  label,
  helper,
  multiple = true,
  onFiles,
  local,
  uploaded,
  onRemoveLocal,
  onRemoveUploaded
}: {
  label: string;
  helper: string;
  multiple?: boolean;
  onFiles: (media: LocalMedia[]) => void;
  local?: LocalMedia[];
  uploaded?: UploadedMedia[];
  onRemoveLocal?: (id: string) => void;
  onRemoveUploaded?: (id: string) => void;
}) {
  return (
    <div>
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ffd5ad] bg-[#fffaf5]/50 px-4 py-6 text-center text-sm font-black text-[var(--darji-muted)] hover:bg-[#fffaf0] transition-colors duration-200">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#fff2d8] text-[var(--darji-orange)] mb-3">
          <UploadCloud className="h-6 w-6" />
        </div>
        <span className="text-[var(--darji-ink)] text-base font-black">{uiText(label)}</span>
        <span className="mt-1.5 text-xs font-semibold text-slate-500">{uiText(helper)}</span>
        <input className="hidden" type="file" multiple={multiple} accept="image/*,video/*" onChange={(event) => { onFiles(mediaFromFiles(event.target.files)); event.target.value = ""; }} />
      </label>
      <MediaPreviewGrid local={local} uploaded={uploaded} onRemoveLocal={onRemoveLocal} onRemoveUploaded={onRemoveUploaded} />
    </div>
  );
}

function NewRequestStep({
  draft,
  setDraft,
  setScreen,
  addresses
}: {
  draft: RequestDraft;
  setDraft: Dispatch<SetStateAction<RequestDraft>>;
  setScreen: (screen: CustomerScreen) => void;
  addresses: Address[];
}) {
  const [formError, setFormError] = useState<string>();
  const [locationStatus, setLocationStatus] = useState<string>();
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "ready">("idle");
  const [uploadError, setUploadError] = useState<string>();
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const uploadVersion = useRef(0);
  const uploadController = useRef<AbortController | null>(null);
  const advanceAfterUpload = useRef(false);

  useEffect(() => () => {
    uploadVersion.current += 1;
    uploadController.current?.abort();
  }, []);

  function stopUpload() {
    uploadVersion.current += 1;
    uploadController.current?.abort();
    uploadController.current = null;
    advanceAfterUpload.current = false;
    setUploadState("idle");
  }

  function startUpload(media: LocalMedia[]) {
    stopUpload();
    if (!media.length) return;
    const version = uploadVersion.current;
    const controller = new AbortController();
    uploadController.current = controller;
    setUploadError(undefined);
    setUploadState("uploading");
    void customerApi.uploadMedia(media.map((item) => item.file), controller.signal).then((uploaded) => {
      if (version !== uploadVersion.current) return;
      uploadController.current = null;
      setDraft((current) => current.media.map((item) => item.id).join() === media.map((item) => item.id).join()
        ? { ...current, media: [], uploadedMedia: uploaded }
        : current);
      media.forEach((item) => URL.revokeObjectURL(item.url));
      setUploadState("ready");
      if (advanceAfterUpload.current) {
        advanceAfterUpload.current = false;
        setScreen("clothIssue");
      }
    }).catch((error) => {
      if (version !== uploadVersion.current) return;
      uploadController.current = null;
      advanceAfterUpload.current = false;
      setUploadState("idle");
      setUploadError(errorMessage(error));
    });
  }

  function selectMedia(media: LocalMedia[]) {
    if (!media.length) return;
    const tooLarge = media.find((item) => item.size > (item.type === "image" ? 5 : 20) * 1024 * 1024);
    if (tooLarge) {
      media.forEach((item) => URL.revokeObjectURL(item.url));
      setUploadError(tooLarge.type === "image" ? "Photos must be 5 MB or smaller." : "Videos must be 20 MB or smaller.");
      return;
    }
    draft.media.forEach((item) => URL.revokeObjectURL(item.url));
    setDraft((current) => ({ ...current, media, uploadedMedia: [] }));
    setFormError(undefined);
    startUpload(media);
  }

  function removeLocalMedia(id: string) {
    const removed = draft.media.find((item) => item.id === id);
    const remaining = draft.media.filter((item) => item.id !== id);
    if (removed) URL.revokeObjectURL(removed.url);
    setDraft((current) => ({ ...current, media: remaining }));
    startUpload(remaining);
  }

  async function continueToIssue() {
    setFormError(undefined);
    if (!draft.gender) {
      setFormError("Select who this request is for.");
      return;
    }
    if (draft.description.trim().length < 10 && !draft.voiceNotes?.length) {
      setFormError("Add at least 10 characters of instructions or a voice note.");
      return;
    }
    if (!draft.pickup.trim() || draft.pickup.trim().length < 8) {
      setFormError("Add a pickup address before continuing.");
      return;
    }
    try {
      setAvailabilityChecking(true);
      const point = draft.pickupLocation ?? await customerApi.geocodeAddress(draft.pickup).then((result) => ({ lat: result.latitude, lng: result.longitude }));
      if (!point) throw new Error("Could not locate the pickup address. Add the city or state and try again.");
      const availability = await customerApi.serviceAvailability(point.lat, point.lng);
      if (!availability.serviceable) {
        setFormError("Pickup is outside our current service area. Choose another address.");
        return;
      }
      if (!draft.pickupLocation) setDraft((current) => ({ ...current, pickupLocation: point }));
    } catch (error) {
      setFormError(errorMessage(error));
      return;
    } finally {
      setAvailabilityChecking(false);
    }
    if (!draft.media.length) {
      setScreen("clothIssue");
      return;
    }
    if (uploadState === "uploading") {
      advanceAfterUpload.current = true;
      return;
    }
    advanceAfterUpload.current = true;
    startUpload(draft.media);
    advanceAfterUpload.current = true;
  }

  async function useCurrentLocation() {
    setLocationStatus("Locating...");
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        void customerApi.saveCurrentLocation(lat, lng, position.coords.accuracy).catch(() => undefined);
        try {
          setLocationStatus("Fetching address...");
          let addressText: string;
          try {
            const result = await customerApi.reverseGeocode(lat, lng);
            addressText = result.formattedAddress;
          } catch {
            // Client-side Nominatim fallback
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
              headers: { "User-Agent": "Darji-Web/1.0" }
            });
            if (response.ok) {
              const osmData = await response.json();
              if (osmData && osmData.display_name) {
                addressText = osmData.display_name;
              } else {
                throw new Error("No name");
              }
            } else {
              throw new Error("Nominatim failed");
            }
          }
          setDraft((current) => ({ ...current, pickup: addressText, pickupLocation: { lat, lng } }));
          setLocationStatus("Location added.");
        } catch {
          const fallbackAddress = `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
          setDraft((current) => ({ ...current, pickup: fallbackAddress, pickupLocation: { lat, lng } }));
          setLocationStatus("Location added (estimated).");
        }
      },
      () => setLocationStatus("Could not read location."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <FlowLayout screen="newRequest" title={uiText("New Request")} onBack={() => setScreen("home")} setScreen={setScreen}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] text-left">
        <section>
          <div className="flex flex-col gap-3">
            <div className="reference-card order-1 p-5"><h2 className="reference-form-title">{uiText("1. Gender / Fit Type")}</h2><p className="reference-form-note mb-4">{uiText("Choose who this request is for.")}</p>
            <ChipGroup label={uiText("Fit Type")} options={genderOptions} value={draft.gender} onChange={(value) => setDraft((current) => ({ ...current, gender: value, clothType: undefined, measurements: {} }))} />
            </div>
            <div className="reference-card order-2 p-5">
            <div className="flex flex-col gap-1.5 text-left mb-3">
              <h3 className="reference-form-title">{uiText("2. Describe What You Need")}</h3>
              <p className="reference-form-note">{uiText("Tell us about the garment, style, fabric and any specific instructions.")}</p>
            </div>
            
            <div className="relative">
              <textarea
                className={`${inputClass} min-h-32 py-4 pr-12`}
                value={draft.description}
                maxLength={1000}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder={uiText("Example: sleeves are loose, waist needs fitting, zip repair, or custom stitching details.")}
              />
              <div className="text-right text-xs font-bold text-slate-400 mt-1.5">
                {draft.description.length}/1000
              </div>
            </div>
            {draft.description.trim().length >= 10 ? <p className="mt-2 rounded-lg bg-[#eaf7e8] px-3 py-2 text-xs font-semibold text-[#287540]">✓ {uiText("Looks good — you've added clear instructions.")}</p> : null}
            </div>
            <div className="reference-card order-3 p-5"><h3 className="reference-form-title">{uiText("3. Voice Instructions (Optional)")}</h3><p className="reference-form-note mb-3">{uiText("Record a note or upload one if speaking is easier.")}</p><VoiceNotes value={draft.voiceNotes ?? []} onChange={(voiceNotes) => setDraft((current) => ({ ...current, voiceNotes }))} /></div>
            <div className="reference-card order-5 p-5">
            <div className="flex flex-col gap-1.5 text-left mt-2">
              <h3 className="reference-form-title">{uiText("5. Pickup Address")}</h3>
              <p className="reference-form-note">{uiText("Where should we pick up your clothing or fabric?")}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                  <MapPin className="h-5 w-5 text-[var(--darji-orange)]" />
                </span>
                <input 
                  className={`${inputClass} pl-12 h-14 py-0`}
                  value={draft.pickup}
                  onChange={(event) => setDraft((current) => ({ ...current, pickup: event.target.value, pickupLocation: undefined }))}
                  placeholder={uiText("House, street, landmark, city, pincode")}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <button 
                  type="button" 
                  onClick={useCurrentLocation} 
                  className="h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-[#e6edf5] bg-white px-4 text-xs font-black text-[var(--darji-ink)] hover:bg-slate-50 transition-colors"
                >
                  <LocateFixed className="h-4.5 w-4.5 text-[var(--darji-orange)]" />
                  {uiText("Use Current Location")}
                </button>
                {locationStatus ? <p className="text-xs font-bold text-[var(--darji-muted)]">{locationStatus}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.slice(0, 4).map((address) => (
                <button key={address.id} onClick={() => setDraft((current) => ({ ...current, pickup: addressText(address), pickupLocation: address.latitude != null && address.longitude != null ? { lat: address.latitude, lng: address.longitude } : undefined }))} className="rounded-2xl border border-[#e6edf5] bg-white p-4 text-left text-sm font-bold hover:border-[#ffb36f] transition-all">
                  <span className="block font-black">{address.label ?? "Saved address"}</span>
                  <span className="mt-1 line-clamp-2 block text-[var(--darji-muted)] font-semibold text-xs leading-normal">{addressText(address)}</span>
                </button>
              ))}
            </div>
            </div>
            <div className="reference-card order-4 p-5">
            <div className="flex flex-col gap-1.5 text-left mt-2">
              <h3 className="reference-form-title">{uiText("4. Add Photos or Video (Optional)")}</h3>
              <p className="reference-form-note">{uiText("Share the cloth, issue or design reference.")}</p>
            </div>

            <UploadBox
              label={draft.uploadedMedia.length || draft.media.length ? "Replace clothing media" : "Upload photos or videos of the issue"}
              helper={`Up to ${MAX_MEDIA_FILES} files • Photos 5 MB • Videos 20 MB`}
              local={draft.media}
              uploaded={draft.uploadedMedia}
              onFiles={selectMedia}
              onRemoveLocal={removeLocalMedia}
              onRemoveUploaded={(id) => setDraft((current) => ({ ...current, uploadedMedia: current.uploadedMedia.filter((item) => item.publicId !== id) }))}
            />
            {uploadState === "uploading" ? <p role="status" className="flex items-center gap-2 text-sm text-[var(--darji-muted)]"><Loader2 className="h-4 w-4 animate-spin" />{uiText(advanceAfterUpload.current ? "Uploading media, then continuing..." : "Uploading media...")}</p> : null}
            </div>
            {formError || uploadError ? <p role="alert" className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{uiText(formError ?? uploadError ?? "")}</p> : null}
            
            <div className="order-7 flex flex-col gap-3 sm:flex-row sm:justify-end mt-4">
              <button className="reference-outline" onClick={() => setScreen("home")}>{uiText("Save as Draft")}</button>
              <Button className="reference-action" disabled={availabilityChecking} onClick={() => void continueToIssue()}>
                {uiText(availabilityChecking ? "Checking area..." : "Continue to Measurements")} <ChevronRight className="h-4 w-4" />
              </Button>
              {draft.items.length ? <Button className="h-12 px-6 rounded-2xl text-sm font-black border border-[#e6edf5] bg-white hover:bg-slate-50 text-[var(--darji-ink)]" variant="secondary" onClick={() => setScreen("summary")}>{uiText("Back to Summary")}</Button> : null}
            </div>
          </div>
        </section>
        <aside className="grid content-start gap-4">
          <div className="reference-card overflow-hidden"><div className="reference-festive p-5"><span className="rounded-md bg-[#8e2d1c] px-2 py-1 text-xs font-black text-white">{uiText("STEP 1 OF 2")}</span><h2 className="mt-3 text-xl font-black">{uiText("Get Accurate Quotes")}</h2><p className="mt-1 max-w-56 text-xs">{uiText("Share the right details so tailors can give you a quick quote.")}</p></div></div>
          <div className="reference-card p-5"><h2 className="reference-form-title">{uiText("What Information Helps Tailors?")}</h2><div className="reference-info-list mt-2">{[[Shirt,"Garment & Style","Mention the garment and fit you want."],[Ruler,"Measurements or Fit","Share sizes if you have them."],[Scissors,"Fabric Details","Tell us what material you have."],[Camera,"Reference Photos / Videos","Add images for a clearer quote."]].map(([Icon,title,detail]) => { const InfoIcon=Icon as LucideIcon; return <div key={title as string}><InfoIcon className="h-5 w-5" /><div><p className="text-sm font-bold">{uiText(title as string)}</p><p className="text-xs text-[#695d52]">{uiText(detail as string)}</p></div></div>; })}</div></div>
          <div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Keep in Mind")}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-[#594d43]"><li>{uiText("Clear details help tailors quote faster.")}</li><li>{uiText("Photos, video and voice notes are optional.")}</li><li>{uiText("You'll choose measurements and timing next.")}</li></ul></div>
          <ReferenceTrustStrip />
        </aside>
      </div>
    </FlowLayout>
  );
}

function ClothIssueStep({
  draft,
  setDraft,
  setScreen
}: {
  draft: RequestDraft;
  setDraft: Dispatch<SetStateAction<RequestDraft>>;
  setScreen: (screen: CustomerScreen) => void;
}) {
  const [formError, setFormError] = useState<string>();
  const [savingAction, setSavingAction] = useState<SaveAction>();
  const [showManual, setShowManual] = useState(() => {
    return Object.values(draft.measurements ?? {}).some(val => val !== "");
  });
  const [showSizingModal, setShowSizingModal] = useState(false);
  const guide = guideForClothType(draft.clothType);

  async function saveItem(action: SaveAction) {
    setFormError(undefined);
    if (draft.homeMeasurementBooked && !draft.preferredMeasurementSlot) {
      setFormError("Select a measurement visit time slot");
      return;
    }
    if (!draft.gender || !draft.urgency) {
      setFormError("Select who the request is for and the delivery timing.");
      return;
    }
    const hasMeasurement = showManual || draft.sampleProvided || draft.homeMeasurementBooked;
    if (!hasMeasurement) {
      setFormError("Please select at least one measurement option: Enter manual measurements, Send a sample, or Book home measurement.");
      return;
    }
    if (draft.description.trim().length < 10 && !draft.voiceNotes?.length) {
      setFormError("The item needs at least 10 characters of instructions or a voice note.");
      return;
    }
    try {
      setSavingAction(action);
      let uploadedSampleMedia = draft.uploadedSampleMedia;
      if (draft.sampleProvided && draft.sampleMedia?.length && !uploadedSampleMedia) {
        const [uploaded] = await customerApi.uploadMedia(draft.sampleMedia.map((media) => media.file));
        uploadedSampleMedia = uploaded;
      }
      const nextDraft = { ...draft, uploadedSampleMedia };
      const item = draftToClothingItem(nextDraft);
      const items = upsertClothingItem(nextDraft, item);
      const cleared = clearActiveClothingItem({ ...nextDraft, items });
      setDraft(cleared);
      setScreen(action === "another" ? "newRequest" : "summary");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSavingAction(undefined);
    }
  }

  return (
    <FlowLayout screen="clothIssue" title={uiText("Measurements & Timing")} onBack={() => setScreen("newRequest")} setScreen={setScreen}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] text-left">
        <section className="grid content-start gap-4">
          <div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Request Overview")}</h2><div className="mt-3 flex flex-wrap items-center gap-5 text-sm"><span className="font-bold">{draft.gender || uiText("Fit not selected")}</span><span>{draft.description.trim() ? uiText("Instructions added") : uiText("Voice instructions added")}</span><span>{draft.media.length + draft.uploadedMedia.length} {uiText("media files")}</span><button onClick={() => setScreen("newRequest")} className="ml-auto text-sm font-bold text-[#ca8400]">{uiText("View Details")} →</button></div></div>
          <div className="reference-card grid gap-5 p-5"><h2 className="reference-form-title">{uiText("How would you like to provide measurements?")}</h2>
            <div className="grid gap-6">
            <details className="rounded-xl border border-[#eed9b9] bg-white p-4"><summary className="cursor-pointer text-sm font-bold">{uiText("Optional garment and work details")}</summary><div className="mt-5 grid gap-5">
            <ChipGroup label={uiText("Cloth Type")} options={[...getGarmentsForGender(draft.gender)]} value={draft.clothType} onChange={(value) => setDraft((current) => ({ ...current, clothType: value, measurements: {} }))} />
            <ChipGroup label={uiText("Work Type")} options={workTypes} value={draft.workType} onChange={(value) => setDraft((current) => ({ ...current, workType: value, selectedWorkItems: [], homeMeasurementBooked: value === "New Stitching" || current.homeMeasurementBooked }))} />
            {draft.workType === "Other" ? <textarea aria-label={uiText("Work details")} placeholder={uiText("Work details")} className={inputClass} value={draft.otherWorkDescription ?? ""} maxLength={1000} onChange={(event) => setDraft((current) => ({ ...current, otherWorkDescription: event.target.value }))} /> : <div className="grid gap-3 sm:grid-cols-2">{getServiceCategory(draft.workType)?.workItems.map((work) => <label key={work} className="flex items-center gap-3 rounded-lg border bg-white p-3"><input className="h-5 w-5 accent-amber-500" type="checkbox" checked={draft.selectedWorkItems?.includes(work) ?? false} onChange={(event) => setDraft((current) => ({ ...current, selectedWorkItems: event.target.checked ? [...current.selectedWorkItems ?? [], work] : current.selectedWorkItems?.filter((item) => item !== work) }))} />{uiText(work)}</label>)}</div>}

            {draft.workType === "New Stitching" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-black">{uiText("Important: Provide Enough Cloth")}</p>
                    <p className="mt-1 font-semibold leading-6">{uiText("Please provide enough fabric for the selected garment, size, sleeves, length, and design. Insufficient cloth can affect the fit or require design changes.")}</p>
                  </div>
                </div>
                <ul className="mt-4 grid gap-2 border-t border-amber-200 pt-4 font-semibold sm:grid-cols-3">
                  <li>{uiText("Not enough cloth can affect the final fit and look.")}</li>
                  <li>{uiText("Some designs, sleeves, and lengths need extra fabric.")}</li>
                  <li>{uiText("The right amount helps avoid delays and rework.")}</li>
                </ul>
                <button
                  type="button"
                  onClick={() => setShowSizingModal(true)}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 text-left text-xs font-black text-[var(--darji-orange)] hover:bg-amber-100"
                >
                  <Ruler className="h-4 w-4" /> {uiText("View Cloth Requirement Guide")}
                </button>
                <p className="mt-3 text-xs font-bold text-amber-800">{uiText("By continuing, you confirm that you will provide sufficient cloth for this order.")}</p>
              </div>
            )}
            </div></details>

            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleTile
                checked={draft.sampleProvided === true}
                title={uiText("Sample Garment")}
                copy={uiText("Our tailor will use an existing fit reference for accuracy.")}
                icon={Shirt}
                onChange={(checked) => setDraft((current) => ({ ...current, sampleProvided: checked, sampleMedia: checked ? current.sampleMedia : [], uploadedSampleMedia: checked ? current.uploadedSampleMedia : undefined }))}
              />
              <ToggleTile
                checked={draft.homeMeasurementBooked === true}
                title={uiText("Home Measurement")}
                copy={uiText("A tailor will visit your home to take measurements. A flat Rs99 fee is added once per order.")}
                icon={Home}
                onChange={(checked) => setDraft((current) => ({ ...current, homeMeasurementBooked: current.workType === "New Stitching" || checked }))}
              />
            </div>

            {draft.homeMeasurementBooked ? <label className="grid gap-2 text-sm font-bold">{uiText("Preferred visit time")}<select className={inputClass} value={draft.preferredMeasurementSlot ?? ""} onChange={(event) => setDraft((current) => ({ ...current, preferredMeasurementSlot: event.target.value }))}><option value="">{uiText("Select time slot")}</option>{measurementSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label> : null}
            {draft.sampleProvided ? (
              <UploadBox
                label={draft.uploadedSampleMedia || draft.sampleMedia?.length ? "Replace sample photo" : "Upload sample photo"}
                helper="One reference image is enough"
                multiple={false}
                local={draft.sampleMedia}
                uploaded={draft.uploadedSampleMedia ? [draft.uploadedSampleMedia] : []}
                onFiles={(media) => { draft.sampleMedia?.forEach((item) => URL.revokeObjectURL(item.url)); setDraft((current) => ({ ...current, sampleMedia: media.slice(0, 1), uploadedSampleMedia: undefined })); }}
                onRemoveLocal={(id) => { const removed = draft.sampleMedia?.find((item) => item.id === id); if (removed) URL.revokeObjectURL(removed.url); setDraft((current) => ({ ...current, sampleMedia: current.sampleMedia?.filter((item) => item.id !== id) })); }}
                onRemoveUploaded={(id) => setDraft((current) => ({ ...current, uploadedSampleMedia: current.uploadedSampleMedia?.publicId === id ? undefined : current.uploadedSampleMedia }))}
              />
            ) : null}

            <button 
              type="button" 
              onClick={() => setShowManual(!showManual)}
              className={`w-full flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition duration-200 shadow-sm ${
                showManual 
                  ? "border-[var(--darji-orange)] bg-[#fffbf7]/70" 
                  : "border-[#e6edf5] bg-white hover:border-[#ffd5ad]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl transition-colors duration-200 shadow-sm ${
                  showManual ? "bg-[#fff2d8] text-[var(--darji-orange)]" : "bg-[#f8fafc] text-slate-400"
                }`}>
                  <Ruler className="h-5 w-5" />
                </div>
                <div>
                  <span className="block font-black text-[#08111f]">{uiText("Enter manually measurements?")}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-[var(--darji-muted)]">{uiText("You can enter your measurements manually if you already have them.")}</span>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 transition-all duration-200 ${showManual ? "text-[var(--darji-orange)] rotate-90" : "text-slate-400"}`} />
            </button>

            {showManual && (
              <div className="grid gap-5 border-t border-[#edf1f5] pt-5">
                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">{uiText("Manual Measurements (cm)")}</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {guide.fields.map((field) => (
                      <FieldShell key={field} label={field}>
                        <input
                          className={inputClass}
                          inputMode="decimal"
                          placeholder={uiText("cm")}
                          value={draft.measurements?.[field] ?? ""}
                          onChange={(event) => setDraft((current) => ({ ...current, measurements: { ...(current.measurements ?? {}), [field]: event.target.value } }))}
                        />
                      </FieldShell>
                    ))}
                  </div>
                </div>

                <FieldShell label={uiText("Measurement Notes")}>
                  <textarea
                    className={`${inputClass} min-h-24 py-4`}
                    value={draft.measurementNotes ?? ""}
                    onChange={(event) => setDraft((current) => ({ ...current, measurementNotes: event.target.value }))}
                    placeholder={uiText("Fit preference, loose/tight notes, old garment reference, or special instructions.")}
                  />
                </FieldShell>
              </div>
            )}
            </div>
          </div>
          <div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Delivery Speed")}</h2><p className="reference-form-note mb-4">{uiText("Choose when you need your garment delivered.")}</p><ChipGroup label={uiText("Delivery Speed")} options={urgencyOptions} value={draft.urgency} onChange={(value) => setDraft((current) => ({ ...current, urgency: value }))} /></div>

            {formError ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{formError}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row mt-4">
              <Button className="reference-action flex-1" loading={savingAction === "summary"} onClick={() => void saveItem("summary")}>
                {uiText("Review Request")} <ChevronRight className="h-4 w-4" />
              </Button>
              <Button className="h-12 px-6 rounded-2xl text-sm font-black border border-[#e6edf5] bg-white hover:bg-slate-50 text-[var(--darji-ink)] flex items-center justify-center gap-2" variant="secondary" loading={savingAction === "another"} onClick={() => void saveItem("another")}>
                <Plus className="h-4 w-4 text-[var(--darji-orange)]" /> {uiText("Add Another Cloth")}
              </Button>
            </div>
        </section>
        <aside className="grid content-start gap-4"><div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Request Summary")}</h2><p className="mt-3 text-sm font-bold">{draft.clothType || uiText("Custom Garment")}</p><div className="reference-info-list mt-2"><div><UserRound className="h-5 w-5" /><p className="text-sm">{uiText("Fit Type")}: {draft.gender}</p></div><div><MessageSquare className="h-5 w-5" /><p className="text-sm">{uiText("Instructions")}: {draft.description ? uiText("Added") : uiText("Voice note")}</p></div><div><MapPin className="h-5 w-5" /><p className="text-sm">{draft.pickup}</p></div></div></div><div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Helpful Notes")}</h2><p className="reference-form-note mt-3">{uiText("Choose a sample, a home visit, or enter your own measurements. Double-check any sizes you enter.")}</p></div><ReferenceTrustStrip /></aside>
      </div>

      {showSizingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left border border-[var(--darji-line)]">
            <h3 className="text-xl font-black text-[var(--darji-ink)] mb-4">{uiText("Cloth Requirement Guide")}</h3>
            <p className="text-sm font-semibold text-[var(--darji-muted)] mb-4">
              {uiText("Refer to the guidelines below for minimum cloth length (in meters) required by sizing for stitching.")}
            </p>
            <div className="overflow-hidden rounded-2xl border border-[var(--darji-line)] mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f6f8fb] text-[var(--darji-ink)] font-black border-b border-[var(--darji-line)]">
                    <th className="px-4 py-3 text-left">{uiText("Garment")}</th>
                    <th className="px-3 py-3 text-center">{uiText("S")}</th>
                    <th className="px-3 py-3 text-center">{uiText("M")}</th>
                    <th className="px-3 py-3 text-center">{uiText("L")}</th>
                    <th className="px-3 py-3 text-center">{uiText("XL")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--darji-line)] font-semibold text-[var(--darji-ink)]">
                  {[
                    { type: "Shirt", s: "2.25m", m: "2.5m", l: "2.75m", xl: "3.0m" },
                    { type: "Pants", s: "1.2m", m: "1.3m", l: "1.4m", xl: "1.5m" },
                    { type: "Kurti", s: "2.5m", m: "2.75m", l: "3.0m", xl: "3.25m" },
                    { type: "Salwar Suit", s: "4.5m", m: "5.0m", l: "5.5m", xl: "6.0m" },
                    { type: "Blouse", s: "0.80m", m: "0.85m", l: "0.90m", xl: "1.0m" }
                  ].map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-left">{row.type}</td>
                      <td className="px-3 py-3 text-center text-[var(--darji-muted)]">{row.s}</td>
                      <td className="px-3 py-3 text-center text-[var(--darji-muted)]">{row.m}</td>
                      <td className="px-3 py-3 text-center text-[var(--darji-muted)]">{row.l}</td>
                      <td className="px-3 py-3 text-center text-[var(--darji-muted)]">{row.xl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setShowSizingModal(false)}
                className="px-6 h-11 bg-[var(--darji-ink)] text-white font-black rounded-xl hover:bg-[var(--darji-ink)]/90"
              >
                {uiText("Close Guide")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </FlowLayout>
  );
}

function FlowLayout({ screen, title, onBack, setScreen, children }: { screen: CustomerScreen; title: string; onBack: () => void; setScreen?: (screen: CustomerScreen) => void; children: React.ReactNode }) {
  return (
    <div className="grid gap-5">
      <div className="reference-flow-header border-b border-[#f0dfc5] pb-4">
        <div className="flex items-center gap-4"><button onClick={onBack} aria-label={uiText("Back")} className="reference-outline !h-11 !w-11 !min-h-11 !rounded-full !px-0"><ArrowLeft className="h-5 w-5" /></button><div><h1 className="text-3xl font-black tracking-[-.04em]">{title}</h1><p className="text-sm text-[#685d54]">{screen === "newRequest" ? uiText("Tell us what you need, and we'll connect you with the right tailors.") : screen === "clothIssue" ? uiText("Choose how to provide measurements and when you need delivery.") : screen === "quotes" ? uiText("Compare prices, timing and tailor profiles.") : screen === "confirm" ? uiText("Review your order and confirm your booking.") : ""}</p></div></div>
        {["newRequest", "clothIssue"].includes(screen) ? <div className="hidden items-center gap-4 sm:flex"><div className={`reference-flow-step ${screen === "newRequest" ? "is-active" : "is-done"}`}><strong>{screen === "newRequest" ? "1" : "✓"}</strong>{uiText("Request Details")}</div><span className="h-0.5 w-10 bg-[#e5bd70]" /><div className={`reference-flow-step ${screen === "clothIssue" ? "is-active" : ""}`}><strong>2</strong>{uiText("Measurements & Timing")}</div><span className="rounded-full bg-[#fff0ce] px-3 py-1 text-xs font-black text-[#bb7c00]">{screen === "newRequest" ? "1/2" : "2/2"}</span></div> : null}
      </div>
      {children}
    </div>
  );
}

function ChipGroup({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange: (value: string) => void }) {
  return (
    <div className="text-left">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">{uiText(label)}</p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const active = value === option;
          return (
            <button 
              key={option} 
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)} 
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-black transition-colors duration-200 ${
                active 
                  ? "border-[var(--darji-orange)] bg-[#fff7e8] text-[var(--darji-ink)]"
                  : "border-[#dfe6ee] bg-white text-slate-600 hover:border-[#ffc47e] hover:bg-[#fffcf7]"
              }`}
            >
              <span className="min-w-0 break-words">{uiText(option)}</span>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? "border-[var(--darji-orange)] bg-[var(--darji-orange)] text-white" : "border-slate-300"}`}>
                {active ? <Check className="h-3 w-3" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleTile({ checked, title, copy, icon: Icon, onChange }: { checked: boolean; title: string; copy: string; icon: LucideIcon; onChange: (checked: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!checked)} 
      className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 w-full ${
        checked 
          ? "border-[var(--darji-orange)] bg-[#fffbf7]/70 shadow-sm" 
          : "border-[#e6edf5] bg-white hover:border-[#ffd5ad]"
      }`}
    >
      <div 
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
          checked ? "bg-[#fff2d8] text-[var(--darji-orange)]" : "bg-[#f8fafc] text-slate-400"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <span className="block font-black text-base text-[var(--darji-ink)] leading-snug">{title}</span>
        <span className="mt-1 block text-xs font-semibold text-[var(--darji-muted)] leading-normal">{copy}</span>
      </div>
      <div 
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          checked ? "border-[var(--darji-orange)] bg-white" : "border-slate-300 bg-white"
        }`}
      >
        {checked && <div className="h-2.5 w-2.5 rounded-full bg-[var(--darji-orange)]" />}
      </div>
    </button>
  );
}

function MeasurementGuideCard({ guide, clothType }: { guide: MeasurementGuide; clothType?: string }) {
  return (
    <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
      <p className="flex items-center gap-2 font-black"><Ruler className="h-5 w-5 text-[var(--darji-orange)]" /> {clothType ?? "Measurement"} {uiText("guide")}</p>
      <div className="mt-4 overflow-hidden rounded-2xl bg-[#fffaf0]">
        <img src="/measurements.png" alt="Measurement guide" className="h-40 w-full object-contain p-3" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {guide.sizeChart.slice(0, 4).map((row) => (
          <div key={row.size} className="rounded-2xl bg-[#f8fafc] p-3 text-xs font-bold">
            <p className="text-base font-black">{row.size}</p>
            <p className="mt-1 text-[var(--darji-muted)]">{Object.entries(row.values).slice(0, 2).map(([key, value]) => `${key} ${value}`).join(" / ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniSummary({ draft }: { draft: RequestDraft }) {
  const items = clothingItemsForDraft(draft);
  return (
    <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
      <p className="font-black">{uiText("Order summary")}</p>
      <div className="mt-4 grid gap-2">
        <SummaryLine label={uiText("Clothing items")} value={String(Math.max(items.length, draft.items.length))} />
        <SummaryLine label={uiText("Urgency")} value={draft.urgency ?? "Not selected"} />
        <SummaryLine label={uiText("Home measurement")} value={formatMoney(homeMeasurementFeeForItems(items))} />
        <SummaryLine label={uiText("Delivery starts")} value={formatMoney(deliveryFeeForUrgency(draft.urgency ?? ""))} />
      </div>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm ${strong ? "font-black" : "font-bold"}`}>
      <span className="text-[var(--darji-muted)]">{uiText(label)}</span>
      <span className="text-right text-[var(--darji-ink)]">{value}</span>
    </div>
  );
}

function DeliverySummaryLine(props: {
  deliveryFee: number;
  urgency?: string;
  distanceMeters?: number;
  customerAddress?: string;
  tailorAddress?: string;
  tailorName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { deliveryFee, urgency, distanceMeters, customerAddress, tailorAddress, tailorName } = props;

  const urgencyStr = String(urgency ?? "").toLowerCase();
  const mode = urgencyStr.includes("instant")
    ? "Instant"
    : urgencyStr.includes("express") || urgencyStr.includes("urgent")
    ? "Express"
    : "Standard";

  let oneWayMeters = Math.round(Number(distanceMeters) || 0);
  const baseFare = deliveryFee;
  const hasRouteDistance = oneWayMeters > 0;
  const oneWayKm = hasRouteDistance ? (oneWayMeters / 1000).toFixed(1) : "—";
  const totalKm = hasRouteDistance ? ((oneWayMeters * 2) / 1000).toFixed(1) : "—";

  const customerLabel = customerAddress ? (customerAddress.length > 25 ? `${customerAddress.slice(0, 23)}...` : customerAddress) : "Your Location";
  const tailorLabel = tailorAddress ? (tailorAddress.length > 25 ? `${tailorAddress.slice(0, 23)}...` : tailorAddress) : (tailorName || "Tailor Shop");

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-left hover:bg-[#f1f5f9] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[var(--darji-muted)]">{uiText("Delivery")}</span>
          <span className="rounded-md bg-[#fff4dc] border border-[#fed7aa] px-1.5 py-0.5 text-[10px] font-black text-[var(--darji-orange)] uppercase tracking-wider">
            {uiText("2-Way Trip")}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-[var(--darji-orange)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
        <span className="text-right text-[var(--darji-ink)]">{formatMoney(deliveryFee)}</span>
      </button>

      {expanded && (
        <div className="border-t border-[#e2e8f0] bg-white p-3 space-y-3 text-xs">
          <div className="flex items-center gap-1.5 font-black text-[#08111f]">
            <Truck className="h-3.5 w-3.5 text-[var(--darji-orange)]" />
            <span>{uiText("Fixed delivery charge")}</span>
          </div>

          <div className="rounded-xl bg-[#f8fafc] p-2.5 space-y-2 border border-[#f1f5f9]">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {uiText("1. Pickup:")} {customerLabel} ➔ {tailorLabel}
              </span>
              <span className="font-black text-[var(--darji-orange)]">{oneWayKm} {uiText("km")}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-[var(--darji-orange)]" />
                {uiText("2. Delivery:")} {tailorLabel} ➔ {customerLabel}
              </span>
              <span className="font-black text-[var(--darji-orange)]">{oneWayKm} {uiText("km")}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2">
              <p className="text-[9px] font-black uppercase text-[var(--darji-muted)]">{uiText("Round Trip")}</p>
              <p className="mt-0.5 font-black text-[#08111f]">{totalKm} {uiText("km")}</p>
            </div>
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2">
              <p className="text-[9px] font-black uppercase text-[var(--darji-muted)]">{uiText("Flat Charge (")}{mode})</p>
              <p className="mt-0.5 font-black text-[#08111f]">{formatMoney(baseFare)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-2 text-[11px] font-bold">
            <span className="text-[var(--darji-muted)]">{uiText("Breakdown Total")}</span>
            <span className="font-black text-[var(--darji-orange)]">
              {formatMoney(baseFare)}
            </span>
          </div>

          <p className="text-[10px] font-semibold italic text-[var(--darji-muted)] leading-tight">
            {uiText(`The ${mode.toLowerCase()} charge is fixed and does not change with distance. Pickup and return delivery are included.`)}
          </p>
        </div>
      )}
    </div>
  );
}

function MeasurementSummaryLine({ fee }: { fee: number; distanceMeters?: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-bold">
      <span className="flex items-center gap-2 text-[var(--darji-muted)]">
        {uiText("Home measurement")}
        <span className="rounded-md border border-[#fed7aa] bg-[#fff4dc] px-1.5 py-0.5 text-[10px] font-black uppercase text-[var(--darji-orange)]">{uiText("Flat fee")}</span>
      </span>
      <span className="text-[var(--darji-ink)]">{formatMoney(fee)}</span>
    </div>
  );
}

function OrderSummaryStep({
  draft,
  setDraft,
  setScreen,
  setSelectedQuote
}: {
  draft: RequestDraft;
  setDraft: Dispatch<SetStateAction<RequestDraft>>;
  setScreen: (screen: CustomerScreen) => void;
  setSelectedQuote: (quote?: TailorQuote) => void;
}) {
  const queryClient = useQueryClient();
  const items = clothingItemsForDraft(draft);
  const createRequest = useMutation({
    mutationFn: async () => {
      if (!items.length) throw new Error("Add at least one clothing item.");
      if (!draft.urgency || draft.pickup.trim().length < 8) throw new Error("Pickup address and urgency are required.");
      const incomplete = items.find((item) => item.description.trim().length < 10 && !item.voiceNotes?.length);
      if (incomplete) throw new Error(`${clothingItemTitle(incomplete)} needs instructions or a voice note.`);
      const itemPayloads = items.map(payloadForClothingItem);
      const primary = itemPayloads[0];
      const preferredMeasurementSlot = items.find((item) => item.homeMeasurementBooked && item.preferredMeasurementSlot)?.preferredMeasurementSlot;
      return customerApi.createTailoringRequest({
        ...primary,
        urgency: draft.urgency,
        pickupAddress: draft.pickup,
        pickupLocation: draft.pickupLocation,
        preferredMeasurementSlot,
        items: itemPayloads
      });
    },
    onSuccess: async (request) => {
      setSelectedQuote(undefined);
      setDraft((current) => ({ ...current, backendRequestId: request.id }));
      await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
      setScreen("quotes");
    }
  });

  function editItem(item: ClothingItemDraft) {
    setDraft((current) => loadClothingItemIntoDraft(current, item));
    setScreen("newRequest");
  }

  function deleteItem(itemId: string) {
    const nextItems = items.filter((item) => item.id !== itemId);
    setDraft((current) => clearActiveClothingItem({ ...current, items: nextItems }));
    if (!nextItems.length) setScreen("newRequest");
  }

  return (
    <FlowLayout screen="summary" title={uiText("Order Summary")} onBack={() => setScreen("clothIssue")} setScreen={setScreen}>
      <div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] text-left">
          <section className="grid gap-4">
            {items.length ? (
              items.map((item, index) => <DraftItemCard key={item.id} item={item} index={index} onEdit={() => editItem(item)} onDelete={() => deleteItem(item.id)} />)
            ) : (
              <EmptyState title={uiText("No clothing items")} copy={uiText("Add one cloth before requesting quotes.")} />
            )}
            <div className="flex flex-col gap-3 sm:flex-row mt-4">
              <Button className="h-12 px-6 rounded-2xl text-sm font-black border border-[#e6edf5] bg-white hover:bg-slate-50 text-[var(--darji-ink)] flex items-center justify-center gap-2" variant="secondary" onClick={() => { setDraft((current) => clearActiveClothingItem({ ...current, items })); setScreen("newRequest"); }}>
                <Plus className="h-4 w-4 text-[var(--darji-orange)]" /> {uiText("Add Another Cloth")}
              </Button>
              <Button className="h-12 px-6 rounded-2xl text-sm font-black bg-[var(--darji-orange)] hover:bg-[#e56500] text-white flex items-center justify-center gap-2" loading={createRequest.isPending} disabled={!items.length} onClick={() => createRequest.mutate()}>
                {uiText("Get Quotes")} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {createRequest.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(createRequest.error)}</p> : null}
          </section>
          <aside className="grid content-start gap-4">
            <div className="rounded-[2rem] border border-[#e6edf5] bg-white p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">{uiText("Pickup")}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--darji-ink)]">{draft.pickup || "Not selected"}</p>
            </div>
            <MiniSummary draft={draft} />
          </aside>
        </div>

      </div>
    </FlowLayout>
  );
}

function DraftItemCard({ item, index, onEdit, onDelete }: { item: ClothingItemDraft; index: number; onEdit: () => void; onDelete: () => void }) {
  const thumbnail = firstMediaUrl(item);
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-[2rem] p-5 text-left transition hover:border-[#ffd5ad] duration-300">
      <div className="grid gap-4 sm:grid-cols-[116px_1fr_auto]">
        <div className="aspect-square overflow-hidden rounded-2xl border border-[#e6edf5] bg-[#fffaf0] flex items-center justify-center">
          {thumbnail ? <img src={thumbnail} alt={clothingItemTitle(item)} className="h-full w-full object-cover" /> : <Shirt className="h-9 w-9 text-[var(--darji-orange)]" />}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-orange)]">{uiText("Item")} {index + 1}</p>
          <h3 className="mt-1 text-lg font-black text-[var(--darji-ink)] leading-snug">{clothingItemTitle(item)}</h3>
          <p className="text-xs font-semibold text-[var(--darji-muted)] mt-0.5">{clothingItemSummary(item)}</p>
          
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-[#f8fafc] border border-[#e6edf5] p-3 text-xs text-slate-600 font-semibold max-w-xl text-left shadow-inner">
            <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <p className="leading-relaxed">{item.description}</p>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-[#fff2d8] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--darji-orange)] shadow-sm">
              {measurementStatusForItem(item)}
            </span>
            {item.sampleProvided && (
              <span className="inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--darji-orange)] border border-[var(--darji-orange)]/15 shadow-sm">
                {uiText("Sample")}
              </span>
            )}
            {item.homeMeasurementBooked && (
              <span className="inline-flex rounded-full bg-[#ecfdf5] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#10b981] border border-[#10b981]/15 shadow-sm">
                {uiText("Home Visit")}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col shrink-0 justify-start">
          <button onClick={onEdit} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e6edf5] bg-white text-[var(--darji-ink)] hover:bg-[#fff7e8] hover:border-[#ffd5ad] transition-all shadow-sm"><Edit3 className="h-4 w-4" /></button>
          <button onClick={onDelete} className="grid h-10 w-10 place-items-center rounded-xl border border-[#fee2e2] bg-[#fff1f2] text-[#b91c1c] hover:bg-[#fecaca] transition-all shadow-sm"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </motion.article>
  );
}

function QuotesStep({
  draft,
  selectedQuote,
  setSelectedQuote,
  setScreen
}: {
  draft: RequestDraft;
  selectedQuote?: TailorQuote;
  setSelectedQuote: (quote?: TailorQuote) => void;
  setScreen: (screen: CustomerScreen) => void;
}) {
  const quotes = useQuery({
    queryKey: ["customer", "quotes", draft.backendRequestId],
    queryFn: () => customerApi.quotes(draft.backendRequestId ?? ""),
    enabled: Boolean(draft.backendRequestId),
    refetchInterval: 15000
  });
  const visibleQuotes = (quotes.data ?? []).filter((quote) => ["SUBMITTED", "RESERVED", "ACCEPTED"].includes(quote.status));
  const [profile, setProfile] = useState<CustomerTailor>();
  const [sort, setSort] = useState<"recommended" | "lowest" | "fastest" | "rated">("recommended");
  const sortedQuotes = [...visibleQuotes].sort((a, b) => sort === "lowest" ? a.price - b.price : sort === "fastest" ? (a.estimatedDays ?? 999) - (b.estimatedDays ?? 999) : sort === "rated" ? (b.tailor?.rating ?? 0) - (a.tailor?.rating ?? 0) : 0);
  const lowestPrice = visibleQuotes.length ? Math.min(...visibleQuotes.map((quote) => quote.price)) : 0;

  return (
    <FlowLayout screen="quotes" title={uiText(visibleQuotes.length ? "Tailor Quotations" : "Searching for Tailors")} onBack={() => setScreen("orders")} setScreen={setScreen}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] text-left">
        <section className="grid gap-5">
          <div className="reference-card flex flex-col justify-between gap-4 reference-festive p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-lg text-[var(--darji-ink)]">{quotes.isLoading ? uiText("Checking tailor quotes") : visibleQuotes.length ? `${visibleQuotes.length} ${uiText(visibleQuotes.length === 1 ? "Quote Received" : "Quotes Received")}` : uiText("Your request has been sent")}</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--darji-muted)]">{uiText("Compare prices, delivery time and tailor experience.")}</p>
              </div>
            </div>
            <Button variant="secondary" className="h-11 px-4 rounded-xl text-xs font-black border border-[#e6edf5] bg-white hover:bg-slate-50 flex items-center gap-2" loading={quotes.isFetching} onClick={() => void quotes.refetch()}>
              <RefreshCw className="h-4 w-4" /> {uiText("Refresh")}
            </Button>
          </div>

          {visibleQuotes.length ? <div className="flex flex-wrap gap-2">{[["recommended","Recommended",Star],["lowest","Lowest Price",Ticket],["fastest","Fastest Delivery",Clock],["rated","Highest Rated",Star]].map(([id,label,Icon]) => { const SortIcon = Icon as LucideIcon; return <button key={id as string} onClick={() => setSort(id as typeof sort)} className={`${sort === id ? "reference-action" : "reference-outline"} !min-h-10 !rounded-full !px-4 text-sm`}><SortIcon className="h-4 w-4" />{uiText(label as string)}</button>; })}</div> : null}

          {!visibleQuotes.length && !quotes.isLoading ? (
            <div className="reference-card grid min-h-[360px] place-items-center p-8 text-center"><div><img src="/animations/cta-tailoring.png" alt="" className="mx-auto h-40 w-auto object-contain" /><h2 className="mt-3 text-2xl font-black">{uiText("Searching for tailors...")}</h2><p className="mx-auto mt-2 max-w-lg text-sm text-[#685b51]">{uiText("We're matching your request with trusted, verified tailors. Quotes will appear here as they respond.")}</p><div className="reference-status-line mx-auto mt-8 max-w-md"><i className="is-done">✓</i><span className="is-done" /><i className="is-current" /><span /><i /><span /><i /></div><button onClick={() => setScreen("orders")} className="reference-outline mt-8">{uiText("View Request Details")}<ArrowRight className="h-4 w-4" /></button></div></div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedQuotes.map((quote) => <div key={quote.id} className="flex flex-col gap-2"><QuoteCard quote={quote} selected={selectedQuote?.id === quote.id} onSelect={() => { setSelectedQuote(quote); setScreen("confirm"); }} />{quote.tailor ? <button className="reference-outline w-full" onClick={() => setProfile(quote.tailor)}>{uiText("View Profile")}</button> : null}</div>)}
          </div>
          {profile ? <TailorProfile tailor={profile} onClose={() => setProfile(undefined)} /> : null}

          {quotes.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(quotes.error)}</p> : null}

          <button className="reference-outline w-fit" onClick={() => setScreen("orders")}>{uiText("View Orders")}<ChevronRight className="h-4 w-4" /></button>
        </section>
        <aside className="grid content-start gap-4">
          <div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Request Summary")}</h2><p className="mt-3 text-sm font-black">{uiText("Request sent to tailors")}</p><p className="mt-2 text-xs text-[#64564d]">{clothingItemsForDraft(draft).length} {uiText("clothing item(s)")}</p><div className="reference-info-list mt-3"><div><MapPin className="h-5 w-5" /><p className="text-sm">{draft.pickup}</p></div><div><Truck className="h-5 w-5" /><p className="text-sm">{draft.urgency}</p></div><div><Ruler className="h-5 w-5" /><p className="text-sm">{draft.items.some((item) => item.homeMeasurementBooked) ? uiText("Home measurement visit") : uiText("Measurements or sample added")}</p></div></div></div>
          {visibleQuotes.length ? <div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Quote Stats")}</h2><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-[#fff2d8] p-3"><p className="text-xl font-black">{visibleQuotes.length}</p><p className="text-xs">{uiText("Quotes")}</p></div><div className="rounded-xl bg-[#fff2d8] p-3"><p className="text-xl font-black">{formatMoney(lowestPrice)}</p><p className="text-xs">{uiText("Lowest price")}</p></div></div></div> : null}
          <div className="reference-card p-5 flex items-start gap-3 text-left">
            <div className="h-10 w-10 rounded-xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[var(--darji-ink)]">{uiText("Safe & Secure")}</h4>
              <p className="text-xs font-semibold text-[var(--darji-muted)] mt-0.5 leading-normal">{uiText("Your payment is safe and secure with us.")}</p>
            </div>
          </div>

        </aside>
      </div>
    </FlowLayout>
  );
}

function QuoteCard({ quote, selected, onSelect }: { quote: TailorQuote; selected: boolean; onSelect: () => void }) {
  const unavailableReason = quote.deliveryEstimate?.unavailableReason;
  return (
    <button 
      onClick={onSelect} 
      disabled={Boolean(unavailableReason)}
      className={`reference-card !rounded-2xl p-4 text-left transition-all duration-300 w-full h-full flex flex-col gap-4 ${
        selected 
          ? "!border-[#eba000] bg-[#fff7e8] shadow-md"
          : unavailableReason ? "cursor-not-allowed opacity-75" : "hover:!border-[#eba000]"
      }`}
    >
      <span className="inline-flex w-fit rounded-full bg-[#fff0cb] px-3 py-1 text-xs font-bold text-[#a76c00]">{uiText("Verified Tailor")}</span>
      <div className="flex items-start justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--darji-ink)] text-sm font-black text-white">
            {quoteInitials(quote)}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="block text-lg font-black text-[var(--darji-ink)]">
                {quote.tailor?.shopName ?? "Verified Tailor"}
              </span>
              <span className="inline-flex rounded-md bg-[#ecfdf5] px-2 py-0.5 text-[9px] font-black uppercase text-[#10b981] border border-[#10b981]/15">
                {uiText("Verified")}
              </span>
            </div>
            <span className="mt-1 flex items-center gap-1 text-xs font-bold text-[var(--darji-muted)]">
              <Star className="h-4 w-4 fill-[var(--darji-orange)] text-[var(--darji-orange)]" />
              <strong className="text-[var(--darji-ink)]">{quote.tailor?.rating ? quote.tailor.rating.toFixed(1) : uiText("Not rated yet")}</strong>
            </span>
          </div>
        </div>
        <Star className="h-5 w-5 shrink-0 fill-[#e5a000] text-[#e5a000]" />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-[#f1dfc7] pt-4 w-full">
        <div className="rounded-xl bg-[#f8fafc] p-3 text-xs font-bold text-center flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{uiText("ETA")}</p>
          <p className="mt-1 font-black text-[var(--darji-ink)]">{quoteEta(quote)}</p>
        </div>
        <div className="rounded-xl bg-[#f8fafc] p-3 text-xs font-bold text-center flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{uiText("Pickup")}</p>
          <p className="mt-1 font-black text-[var(--darji-ink)]">{quote.pickupIncluded === false ? uiText("Extra") : uiText("Included")}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between rounded-xl bg-[#fff1d0] p-3"><span className="text-sm font-black">{uiText("Tailor Quote")}</span><strong className="text-xl text-[#ce8500]">{formatMoney(quote.price)}</strong></div>
      {unavailableReason ? <span className="rounded-xl bg-[#fff1f2] p-3 text-xs font-semibold text-[#9f1239]">{uiText(unavailableReason)}</span> : <span className="reference-action w-full text-sm">{uiText("Select Quote")} <ArrowRight className="h-4 w-4" /></span>}
    </button>
  );
}

function ConfirmOrderStep({
  draft,
  quote,
  coupons,
  setDraft,
  setScreen,
  onOrderPlaced
}: {
  draft: RequestDraft;
  quote: TailorQuote;
  coupons: Coupon[];
  setDraft: Dispatch<SetStateAction<RequestDraft>>;
  setScreen: (screen: CustomerScreen) => void;
  onOrderPlaced: (request: TailoringRequest) => void;
}) {
  const queryClient = useQueryClient();
  const defaultPickup = draft.pickup;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [couponInput, setCouponInput] = useState("");
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon>();
  const [couponMessage, setCouponMessage] = useState<string>();
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const items = clothingItemsForDraft(draft);
  const deliveryFee = quote.deliveryEstimate?.deliveryFee ?? deliveryFeeForUrgency(draft.urgency ?? "");
  const homeFee = homeMeasurementFeeForItems(items, quote.deliveryEstimate?.oneWayDistanceMeters);
  const platformFee = getPlatformFee(Number(quote.price ?? 0));
  const smallOrderFee = getSmallOrderFee(Number(quote.price ?? 0));
  const subtotal = Number(quote.price ?? 0) + deliveryFee + platformFee + smallOrderFee + homeFee;
  const discount = couponDiscount(selectedCoupon, { orderSubtotal: Number(quote.price ?? 0), deliveryFee, platformFee, smallOrderFee, homeMeasurementFee: homeFee });
  const total = Math.max(subtotal - discount, 0);

  const checkout = useMutation({
    onMutate: () => {
      setVerifyingPayment(true);
    },
    mutationFn: () => {
      if (!draft.backendRequestId) throw new Error("Request ID missing.");
      if (quote.deliveryEstimate?.unavailableReason) throw new Error(quote.deliveryEstimate.unavailableReason);
      return customerApi.checkout(draft.backendRequestId, {
        quoteId: quote.id,
        paymentMethod,
        deliveryFee,
        platformFee,
        smallOrderFee,
        homeMeasurementFee: homeFee,
        couponCode: selectedCoupon?.code,
        additionalItems: items.slice(1).map((item) => ({ gender: item.gender, clothType: item.clothType, workType: item.workType, description: item.description })),
        totalAmount: total
      });
    },
    onError: (err) => {
      setVerifyingPayment(false);
      void prompt("Something went wrong", errorMessage(err));
    },
    onSuccess: async (response) => {
      if (response.mode === "online") {
        setVerifyingPayment(false);
        await openRazorpay(
          response.request.id,
          response.razorpay,
          () => {
            setVerifyingPayment(true);
          },
          async (verifiedRequest) => {
            await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
            setDraft(makeEmptyDraft(defaultPickup));
            setVerifyingPayment(false);
            onOrderPlaced(verifiedRequest);
          },
          async (err) => {
            try {
              const recovered = await customerApi.recoverCheckout(response.request.id);
              if (recovered.status === "paid" && recovered.request) {
                await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
                setDraft(makeEmptyDraft(defaultPickup));
                onOrderPlaced(recovered.request);
                return;
              }
            } catch { /* Keep the request available for retry. */ }
            finally { setVerifyingPayment(false); }
            void prompt("Payment not confirmed", errorMessage(err));
          }
        );
      } else {
        try {
          await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
          setDraft(makeEmptyDraft(defaultPickup));
          onOrderPlaced(response.request);
        } finally {
          setVerifyingPayment(false);
        }
      }
    }
  });

  function applyCoupon(codeValue = couponInput) {
    const code = codeValue.trim().toUpperCase();
    const coupon = coupons.find((item) => item.code.toUpperCase() === code);
    if (!coupon) {
      setCouponMessage("Coupon not found.");
      setSelectedCoupon(undefined);
      return;
    }
    const amount = couponDiscount(coupon, { orderSubtotal: Number(quote.price ?? 0), deliveryFee, platformFee, smallOrderFee, homeMeasurementFee: homeFee });
    if (!amount) {
      setCouponMessage("Coupon is not applicable.");
      setSelectedCoupon(undefined);
      return;
    }
    setSelectedCoupon(coupon);
    setCouponInput(code);
    setCouponMessage(`${coupon.code} applied.`);
  }

  return (
    <FlowLayout screen="confirm" title={uiText("Confirm Order / Checkout")} onBack={() => setScreen("quotes")} setScreen={setScreen}>
      <div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] text-left">
          <section className="grid gap-5">
            <div className="reference-card p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-orange)]">{uiText("Selected tailor")}</p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--darji-ink)] text-sm font-black text-white">{quoteInitials(quote)}</span>
                  <div>
                    <h2 className="text-xl font-black text-[var(--darji-ink)]">{quote.tailor?.shopName ?? "Verified Tailor"}</h2>
                    <p className="text-xs font-bold text-[var(--darji-muted)] mt-0.5">{uiText("ETA")} {quoteEta(quote)} {uiText("\u2022 Verified")}</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#fff2d8] px-3 py-1 text-xs font-bold text-[#aa7000]">✓ {uiText("Verified & Experienced Tailor")}</span>
              </div>
            </div>

            <div><h2 className="reference-section-heading mb-3">{uiText("Order Details")}</h2><div className="reference-card grid gap-4 p-5 md:grid-cols-3"><div className="flex items-center gap-3 md:border-r md:border-[#ead8bd]"><span className="grid h-14 w-14 place-items-center rounded-xl bg-[#fff1d0]"><Shirt className="h-6 w-6 text-[#d99300]" /></span><div><p className="text-sm font-black">{items.length} {uiText("Clothing Item(s)")}</p><p className="text-xs text-[#685b52]">{items[0]?.clothType || uiText("Custom Garment")}</p></div></div><div className="md:border-r md:border-[#ead8bd]"><p className="text-xs text-[#685b52]">{uiText("Selected Delivery Timing")}</p><p className="mt-1 font-black">{draft.urgency}</p><p className="mt-2 text-xs text-[#685b52]">{uiText("Estimated completion")}: {quoteEta(quote)}</p></div><div><p className="text-xs text-[#685b52]">{uiText("Measurement Method")}</p><p className="mt-1 font-black">{items.some((item) => item.homeMeasurementBooked) ? uiText("Home Visit") : items.some((item) => item.sampleProvided) ? uiText("Sample Garment") : uiText("Manual Measurements")}</p>{items.some((item) => item.preferredMeasurementSlot) ? <p className="mt-2 text-xs text-[#685b52]">{items.find((item) => item.preferredMeasurementSlot)?.preferredMeasurementSlot}</p> : null}</div></div></div>

            <div className="reference-card order-3 p-6">
              <p className="text-sm font-black text-[var(--darji-ink)]">{uiText("Payment Method")}</p>
              <div className="mt-4 grid gap-3">
                {(["ONLINE", "UPI", "COD"] as const).map((method) => {
                  const active = paymentMethod === method;
                  return (
                    <button 
                      key={method} 
                      type="button"
                      onClick={() => setPaymentMethod(method)} 
                      className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 w-full ${
                        active 
                          ? "border-[var(--darji-orange)] bg-[#fffbf7]/70 shadow-sm" 
                          : "border-[#e6edf5] bg-white hover:border-[#ffd5ad]"
                      }`}
                    >
                      <div 
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                          active ? "bg-[#fff2d8] text-[var(--darji-orange)]" : "bg-[#f8fafc] text-slate-400"
                        }`}
                      >
                        {method === "ONLINE" ? <CreditCard className="h-6 w-6" /> : method === "UPI" ? <Wallet className="h-6 w-6" /> : <Banknote className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block font-black text-base text-[var(--darji-ink)] leading-snug">{method === "ONLINE" ? uiText("Online Payment") : method === "COD" ? uiText("Cash on Delivery") : "UPI"}</span>
                        <span className="mt-1 block text-[10px] font-semibold text-[var(--darji-muted)] leading-normal">
                          {method === "ONLINE" ? uiText("Cards, Netbanking, Wallets") : method === "UPI" ? "Pay using any UPI app" : "Pay on pickup"}
                        </span>
                      </div>
                      <div 
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                          active ? "border-[var(--darji-orange)] bg-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {active && <div className="h-2.5 w-2.5 rounded-full bg-[var(--darji-orange)]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="reference-card order-2 p-6">
              <p className="text-sm font-black text-[var(--darji-ink)]">{uiText("Coupon Code")}</p>
              <div className="mt-4 flex gap-3 relative">
                <input className={`${inputClass} h-12 py-0`} value={couponInput} onChange={(event) => setCouponInput(event.target.value.toUpperCase())} placeholder={uiText("Enter coupon code")} />
                <Button className="h-12 px-6 rounded-2xl text-xs font-black border border-[#e6edf5] bg-white text-[var(--darji-ink)] hover:bg-[#fff7e8]" variant="secondary" onClick={() => applyCoupon()}>{uiText("Apply")}</Button>
              </div>
              {couponMessage ? <p className="mt-2 text-xs font-bold text-[var(--darji-muted)]">{couponMessage}</p> : null}
              
              {selectedCoupon && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#ecfdf5] border border-[#10b981]/15 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#10b981]/10 text-[#10b981] flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 stroke-[3px]" />
                    </div>
                    <div>
                      <span className="block font-black text-sm text-[var(--darji-ink)] leading-none">{selectedCoupon.code}</span>
                      <span className="block text-[10px] font-semibold text-[var(--darji-muted)] mt-1">{couponLabel(selectedCoupon)} {uiText("applied")}</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setSelectedCoupon(undefined); setCouponMessage(undefined); }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {coupons.filter((coupon) => coupon.isActive).slice(0, 4).map((coupon) => (
                  <button key={coupon.code} onClick={() => applyCoupon(coupon.code)} className={`rounded-2xl border p-4 text-left text-sm font-bold transition-all ${selectedCoupon?.code === coupon.code ? "border-[#16a34a] bg-[#ecfdf5]" : "border-[#e6edf5] bg-white hover:border-[#ffd5ad]"}`}>
                    <span className="block font-black text-[#08111f]">{coupon.code}</span>
                    <span className="mt-1 block text-xs font-semibold text-[var(--darji-muted)] leading-normal">{couponLabel(coupon)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="grid content-start gap-4">
            <div className="reference-card p-6 text-left">
              <p className="reference-form-title">{uiText("Order Recap")}</p><div className="reference-info-list mt-3"><div><UserRound className="h-5 w-5" /><p className="text-sm">{quote.tailor?.shopName || uiText("Verified Tailor")}</p></div><div><Shirt className="h-5 w-5" /><p className="text-sm">{items.length} {uiText("item(s)")}</p></div><div><Truck className="h-5 w-5" /><p className="text-sm">{draft.urgency}</p></div></div><p className="mt-5 text-sm font-black">{uiText("Payable Amount")}</p>
              <div className="mt-4 grid gap-3">
                <SummaryLine label={uiText("Tailor quote")} value={formatMoney(quote.price)} />
                <DeliverySummaryLine
                  deliveryFee={deliveryFee}
                  urgency={draft.urgency}
                  distanceMeters={quote.deliveryEstimate?.oneWayDistanceMeters}
                  customerAddress={draft.pickup}
                  tailorAddress={quote.tailor?.verification?.shop?.shopAddress || quote.tailor?.verification?.shop?.shopArea || quote.tailor?.shopName}
                  tailorName={quote.tailor?.shopName || quote.tailor?.user?.name || "Tailor Shop"}
                />
                <SummaryLine label={uiText("Platform fee")} value={formatMoney(platformFee)} />
                {smallOrderFee ? <SummaryLine label={uiText("Small order fee")} value={formatMoney(smallOrderFee)} /> : null}
                {homeFee ? <SummaryLine label={uiText("Home measurement")} value={formatMoney(homeFee)} /> : null}
                {discount ? <SummaryLine label={uiText("Discount")} value={`-${formatMoney(discount)}`} /> : null}
                <SummaryLine label={uiText("Total (incl. taxes)")} value={formatMoney(total)} strong />
                {checkout.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(checkout.error)}</p> : null}
                {quote.deliveryEstimate?.unavailableReason ? <p className="mt-4 rounded-xl bg-[#fff1f2] p-3 text-sm font-semibold text-[#9f1239]">{uiText(quote.deliveryEstimate.unavailableReason)}</p> : null}
                <Button className="reference-action !h-14 w-full text-base mt-4" disabled={Boolean(quote.deliveryEstimate?.unavailableReason)} loading={checkout.isPending} onClick={() => checkout.mutate()}>
                  {paymentMethod === "COD" ? uiText("Confirm Order") : uiText("Confirm Order & Pay")} {paymentMethod === "COD" ? "" : formatMoney(total)}
                </Button>
                <p className="mt-2 text-center text-[10px] font-black text-slate-400 flex items-center justify-center gap-1 uppercase tracking-wider select-none">
                  <CheckCircle2 className="h-4 w-4 text-[#16a34a]" /> {uiText("100% Secure Payments")}
                </p>
              </div>
            </div>

            <div className="premium-card rounded-[2rem] p-6 text-left">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">{uiText("Items in this order")}</p>
              <div className="mt-4 grid gap-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-4 items-center justify-between w-full border-b border-[#f8fafc] pb-2 last:border-b-0 last:pb-0">
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded-xl border border-[#e6edf5] bg-[#fffaf0] flex items-center justify-center">
                        {item.uploadedMedia?.[0]?.url ? (
                          <img src={item.uploadedMedia[0].url} alt={clothingItemTitle(item)} className="h-full w-full object-cover" />
                        ) : (
                          <Shirt className="h-5 w-5 text-[var(--darji-orange)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-[var(--darji-ink)] leading-snug truncate">{uiText("Item")} {index + 1}</h4>
                        <p className="text-[10px] font-semibold text-[var(--darji-muted)] mt-0.5 truncate">{item.clothType || "Clothing"} {uiText("\u2022")} {item.workType || "Alteration"}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-400 shrink-0 uppercase tracking-wider bg-[#f8fafc] px-2 py-1 rounded-md">{uiText("Qty: 1")}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Footer features row */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#edf1f5] pt-6 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[var(--darji-ink)]">{uiText("Verified Tailors")}</h4>
              <p className="text-[10px] font-semibold text-[var(--darji-muted)]">{uiText("Background checked")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[var(--darji-ink)]">{uiText("On-time Delivery")}</h4>
              <p className="text-[10px] font-semibold text-[var(--darji-muted)]">{uiText("Always on schedule")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[var(--darji-ink)]">{uiText("Secure Payments")}</h4>
              <p className="text-[10px] font-semibold text-[var(--darji-muted)]">{uiText("100% safe & secure")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[var(--darji-ink)]">{uiText("Satisfaction Guarantee")}</h4>
              <p className="text-[10px] font-semibold text-[var(--darji-muted)]">{uiText("Love it or we'll fix it")}</p>
            </div>
          </div>
        </div>
      </div>

      {verifyingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="premium-card max-w-sm rounded-[2rem] p-8 text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="relative grid h-16 w-16 place-items-center rounded-full bg-[#fff7e8]">
              <span className="absolute inset-0 rounded-full border-2 border-[#ffd5ad] animate-ping" />
              <Loader2 className="h-6 w-6 animate-spin text-[var(--darji-orange)]" />
            </div>
            <h3 className="text-xl font-black text-[#08111f]">{uiText("Verifying Payment")}</h3>
            <p className="text-xs font-semibold leading-relaxed text-[var(--darji-muted)]">
              {uiText("We are fetching your payment status. Please do not refresh the page or click back.")}
            </p>
          </div>
        </div>
      )}
    </FlowLayout>
  );
}

function ReferenceOrdersScreen({ requests, openOrder, setScreen }: { requests: TailoringRequest[]; openOrder: (request: TailoringRequest) => void; setScreen: (screen: CustomerScreen) => void }) {
  const [filter, setFilter] = useState<"open" | "active" | "history" | "cancelled">("active");
  const [search, setSearch] = useState("");
  const [latestFirst, setLatestFirst] = useState(true);
  const open = requests.filter((request) => isCheckoutOpen(request));
  const active = requests.filter((request) => isActiveOrder(request) && !isCheckoutOpen(request));
  const history = requests.filter(isCompletedOrder);
  const cancelled = requests.filter(isCancelledOrder);
  const groups = { open, active, history, cancelled };
  const rows = [...groups[filter]].filter((request) => [requestCode(request), request.description, request.clothType, request.workType, request.selectedQuote?.tailor?.shopName].join(" ").toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * (latestFirst ? 1 : -1));
  return <div className="grid gap-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-4xl font-black tracking-[-.04em]">{uiText("My Orders")}</h1><p className="mt-1 text-sm text-[#695b51]">{uiText("Track, manage and view all your tailoring orders in one place.")}</p></div><button className="reference-action" onClick={() => setScreen("newRequest")}><Plus className="h-4 w-4" />{uiText("New Request")}</button></div>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[["open", "Open", open.length, Ticket], ["active", "Active", active.length, Scissors], ["history", "History", history.length, Clock], ["cancelled", "Cancelled", cancelled.length, XCircle]].map(([id, label, count, Icon]) => { const TabIcon = Icon as LucideIcon; return <button key={id as string} onClick={() => setFilter(id as typeof filter)} className={`${filter === id ? "reference-action" : "reference-outline"} !h-14 !justify-center text-sm`}><TabIcon className="h-5 w-5" />{uiText(label as string)} ({count as number})</button>; })}</div>
    <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="reference-card h-fit p-4"><label className="text-sm font-black" htmlFor="customer-order-search">{uiText("Search Orders")}</label><div className="relative mt-2"><Search className="absolute left-3 top-3 h-4 w-4 text-[#8a7767]" /><input id="customer-order-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={uiText("ID, item or tailor...")} className="w-full rounded-xl border border-[#ead5b7] bg-white py-2 pl-9 pr-3 text-sm" /></div><div className="mt-5 border-t border-[#eddcc5] pt-4"><p className="text-sm font-black">{uiText("Order Status")}</p><div className="mt-3 grid gap-2">{[["open", "Open", open.length], ["active", "Active", active.length], ["history", "History", history.length], ["cancelled", "Cancelled", cancelled.length]].map(([id, label, count]) => <label key={id as string} className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={filter === id} onChange={() => setFilter(id as typeof filter)} />{uiText(label as string)} ({count as number})</label>)}</div></div><button onClick={() => { setSearch(""); setFilter("active"); }} className="reference-outline mt-5 w-full text-sm">{uiText("Clear All")}</button></aside>
      <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="reference-section-heading">{uiText(filter === "open" ? "Open Requests" : filter === "active" ? "Active Orders" : filter === "history" ? "Order History" : "Cancelled Orders")} ({rows.length})</h2><p className="text-xs text-[#665b52]">{uiText("Your requests and orders, updated as they progress.")}</p></div><button className="reference-outline text-sm" onClick={() => setLatestFirst((value) => !value)}><ArrowUpDown className="h-4 w-4" />{uiText(latestFirst ? "Latest First" : "Oldest First")}</button></div><div className="grid gap-2">{rows.length ? rows.map((request) => <ReferenceOrderRow key={request.id} request={request} openOrder={() => openOrder(request)} />) : <EmptyState title={uiText("No orders found")} copy={uiText(search ? "Try another search." : "Orders in this category will appear here.")} />}</div><p className="mt-4 text-center text-xs text-[#706358]">{uiText("Showing")} {rows.length} {uiText("of")} {groups[filter].length} {uiText("orders")}</p></section>
    </div>
  </div>;
}

function ReferenceOrderRow({ request, openOrder }: { request: TailoringRequest; openOrder: () => void }) {
  const item = primaryOrderItem(request);
  const thumbnail = firstMediaUrl(item);
  const amount = orderAmount(request);
  const progress = currentTimelineIndex(request);
  return <article className="reference-card reference-order-row p-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#fff0d2]">{thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover" /> : <Shirt className="h-8 w-8 text-[#d99500]" />}</div><div className="min-w-0"><p className="text-xs font-black text-[#b56d21]">{requestCode(request)}</p><h3 className="truncate text-sm font-black">{clothingItemTitle(item)}</h3><p className="truncate text-xs text-[#645a52]">{item.workType || uiText("Tailoring")}</p><p className="mt-1 text-xs text-[#645a52]">{uiText("Order Date")}: {formatOrderDate(request.createdAt)}</p></div></div><div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusPillClass(request)}`}>{statusLabel(request)}</span><div className="reference-status-line mt-4"><i className="is-done">✓</i><span className={progress > 0 ? "is-done" : ""} /><i className={progress > 0 ? "is-done" : ""}>{progress > 0 ? "✓" : ""}</i><span className={progress > 4 ? "is-done" : ""} /><i className={progress > 4 ? "is-current" : ""} /><span className={progress > 7 ? "is-done" : ""} /><i className={progress > 7 ? "is-done" : ""}>{progress > 7 ? "✓" : ""}</i></div><div className="mt-1 flex justify-between text-[10px] text-[#6d6054]"><span>Requested</span><span>Tailor</span><span>In Progress</span><span>Delivered</span></div></div><div className="flex items-center justify-between gap-3 lg:justify-end"><div><p className="text-xs text-[#6d6054]">{uiText("Total Amount")}</p><p className="text-lg font-black">{amount != null ? formatMoney(amount) : uiText("Pending quote")}</p></div><button onClick={openOrder} className="reference-outline !min-h-9 text-xs">{uiText("View Details")}<ChevronRight className="h-4 w-4" /></button></div></article>;
}

function OrderDetailsScreen({ request, coupons, setScreen, onOrderPlaced }: { request: TailoringRequest; coupons: Coupon[]; setScreen: (screen: CustomerScreen) => void; onOrderPlaced: (request: TailoringRequest) => void }) {
  const queryClient = useQueryClient();
  const items = request.items?.length ? request.items : [{ description: request.description, gender: request.gender, clothType: request.clothType, workType: request.workType, media: request.media }] as TailoringRequestItem[];
  const quoteAmount = Number(request.quoteAmount ?? request.selectedQuote?.price ?? 0);
  const deliveryFee = Number(request.deliveryFee ?? request.selectedQuote?.deliveryEstimate?.deliveryFee ?? 0);
  const deliveryDistance = Number(request.customerToTailorDistanceMeters ?? request.selectedQuote?.deliveryEstimate?.oneWayDistanceMeters ?? 0);
  const platformFee = Number(request.platformFee ?? 0);
  const smallOrderFee = Number(request.smallOrderFee ?? 0);
  const measurementFee = Number(request.homeMeasurementFee ?? 0);
  const discount = Number(request.discountAmount ?? 0);
  const tailor = request.selectedQuote?.tailor;
  const tailorAddress = tailor?.verification?.shop?.shopAddress || tailor?.verification?.shop?.shopAddressLine || tailor?.verification?.shop?.shopArea;
  return (
    <div className="grid gap-5">
      <button onClick={() => setScreen("orders")} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[#4c3b30]"><ArrowLeft className="h-4 w-4" /> {uiText("Back to Orders")}</button>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-4xl font-black tracking-[-.04em]">{uiText("Order Details")}</h1><p className="text-sm text-[#685b52]">{uiText("View details of your order, measurements and delivery.")}</p></div><div className="flex flex-wrap gap-2"><button className="reference-action" onClick={() => setScreen("trackOrder")}><Truck className="h-4 w-4" />{uiText("Track Order")}</button><button className="reference-outline" onClick={() => setScreen("support")}><Headphones className="h-4 w-4" />{uiText("Get Help")}</button></div></div>
      <div className="reference-card p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-xs text-[#685b52]">{uiText("Order ID")}</p><p className="mt-1 text-xl font-black text-[#ac251c]">{requestCode(request)}</p><p className="mt-2 text-xs text-[#685b52]">{uiText("Placed on")} {new Date(request.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <span className={`inline-flex rounded-xl px-5 py-3 text-sm font-black ${statusPillClass(request)}`}>{statusLabel(request)}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="grid content-start gap-4">
      <div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Order Progress")}</h2><OrderTimeline request={request} /></div>

      <CustomerHandoffOtpCard orderId={request.id} status={statusLabel(request)} />
      {isCompletedOrder(request) ? <Button onClick={() => setScreen("rateApp")}>{uiText("Rate your experience")}</Button> : null}
      <OrderActions order={request} refresh={() => { void queryClient.invalidateQueries({ queryKey: ["customer", "requests"] }); }} />

      {request.status !== "QUOTE_REQUESTED" ? (
        <section className="reference-card p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff4dc] text-[var(--darji-orange)]"><Banknote className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-black">{uiText("Price details")}</h2><p className="text-sm font-semibold text-[var(--darji-muted)]">{uiText("Your saved order charges and travel calculation")}</p></div>
          </div>
          <div className="mt-5 grid gap-3">
            {quoteAmount > 0 ? <SummaryLine label={uiText("Tailor quote")} value={formatMoney(quoteAmount)} /> : null}
            {deliveryFee > 0 ? <DeliverySummaryLine deliveryFee={deliveryFee} urgency={request.urgency} distanceMeters={deliveryDistance} customerAddress={request.pickupAddress} tailorAddress={tailorAddress} tailorName={tailor?.shopName} /> : null}
            {measurementFee > 0 ? <MeasurementSummaryLine fee={measurementFee} distanceMeters={deliveryDistance} /> : null}
            {platformFee > 0 ? <SummaryLine label={uiText("Platform fee")} value={formatMoney(platformFee)} /> : null}
            {smallOrderFee > 0 ? <SummaryLine label={uiText("Small order fee")} value={formatMoney(smallOrderFee)} /> : null}
            {discount > 0 ? <SummaryLine label={uiText("Discount")} value={`- ${formatMoney(discount)}`} /> : null}
            {request.cancellationFee ? <SummaryLine label={uiText("Cancellation fee")} value={formatMoney(request.cancellationFee)} /> : null}
            {request.totalAmount != null ? <SummaryLine label={uiText("Total paid / payable")} value={formatMoney(request.totalAmount)} strong /> : null}
          </div>
        </section>
      ) : null}

      <section className="reference-card grid gap-4 p-5"><h2 className="reference-form-title">{uiText("Order Items")}</h2>
        {items.map((item, index) => (
          <article key={item.id ?? `${item.clothType}-${index}`} className="rounded-2xl border border-[#e6edf5] bg-white p-5">
            <div className="flex gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#fffaf0]">
                {firstMediaUrl(item) ? <img src={firstMediaUrl(item)} alt={clothingItemTitle(item)} className="h-full w-full object-cover" /> : <Shirt className="h-7 w-7 text-[var(--darji-orange)]" />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-orange)]">{uiText("Item")} {index + 1}</p>
                <h3 className="mt-1 text-lg font-black">{clothingItemTitle(item)}</h3>
                <p className="mt-1 text-sm font-bold text-[var(--darji-muted)]">{clothingItemSummary(item)}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{item.description}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
      </div><aside className="grid content-start gap-3"><div className="reference-card p-5"><h2 className="reference-form-title">{uiText("Order Summary")}</h2><div className="mt-4 grid gap-2"><SummaryLine label={uiText("Item Total")} value={quoteAmount ? formatMoney(quoteAmount) : uiText("Quote pending")} /><SummaryLine label={uiText("Delivery") } value={formatMoney(deliveryFee)} />{measurementFee ? <SummaryLine label={uiText("Measurement Visit")} value={formatMoney(measurementFee)} /> : null}{discount ? <SummaryLine label={uiText("Discount")} value={`-${formatMoney(discount)}`} /> : null}<SummaryLine label={uiText("Total Amount")} value={request.totalAmount != null ? formatMoney(request.totalAmount) : uiText("Pending")} strong /></div></div><div className="reference-card p-5"><div className="reference-info-list"><div><MapPin className="h-5 w-5" /><div><p className="text-sm font-bold">{uiText("Pickup Address")}</p><p className="text-xs">{request.pickupAddress}</p></div></div><div><CalendarCheck className="h-5 w-5" /><div><p className="text-sm font-bold">{uiText("Estimated Delivery")}</p><p className="text-xs">{estimatedDeliveryDate(request)}</p></div></div><div><CreditCard className="h-5 w-5" /><div><p className="text-sm font-bold">{uiText("Payment Method")}</p><p className="text-xs">{request.paymentMethod || uiText("Not selected")}</p></div></div></div></div></aside></div>

      {isCheckoutOpen(request) ? <PendingOrderCheckout request={request} coupons={coupons} onOrderPlaced={onOrderPlaced} /> : null}
    </div>
  );
}

function OrderTimeline({ request }: { request: TailoringRequest }) {
  const active = currentTimelineIndex(request);
  return (
    <div className="mt-6 overflow-x-auto pb-2">
      <div className="grid min-w-[820px] grid-cols-10 gap-2">
        {orderTimeline.map((step, index) => (
          <div key={step} className={`rounded-2xl border px-3 py-3 text-xs font-black ${index <= active ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]" : "border-[#e6edf5] bg-[#f8fafc] text-[var(--darji-muted)]"}`}>
            {index <= active ? <CheckCircle2 className="mb-2 h-4 w-4" /> : <span className="mb-2 block h-4 w-4 rounded-full border border-current" />}
            {uiText(step)}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerHandoffOtpCard({ orderId, status }: { orderId: string; status: string }) {
  const otps = useQuery({
    queryKey: ["customer", "handoff-otps", orderId, status],
    queryFn: () => customerApi.handoffOtps(orderId),
    enabled: Boolean(orderId)
  });
  const rows = otps.data ?? [];
  if (otps.isLoading) {
    return (
      <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
        <p className="flex items-center gap-2 font-black"><Loader2 className="h-4 w-4 animate-spin text-[var(--darji-orange)]" /> {uiText("Loading delivery OTP")}</p>
      </div>
    );
  }
  if (!rows.length) return null;
  return (
    <section className="premium-card rounded-[2rem] p-6">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">{uiText("Delivery OTP")}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((item) => (
          <HandoffOtpTile key={`${item.taskId}-${item.stage}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function HandoffOtpTile({ item }: { item: HandoffOtp }) {
  const title = item.type === "customer_to_tailor" ? "Pickup OTP" : "Final delivery OTP";
  return (
    <div className={`rounded-2xl border p-5 ${item.verified ? "border-[#bbf7d0] bg-[#ecfdf5]" : "border-[#efcf92] bg-[#fffaf0]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{item.verified ? uiText("Verified by delivery partner.") : uiText("Share this only when the delivery partner reaches you.")}</p>
        </div>
        <span className={`rounded-xl px-4 py-2 text-2xl font-black tracking-[0.16em] ${item.verified ? "bg-white text-[#16a34a]" : "bg-white text-[var(--darji-orange)]"}`}>{item.otp}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[var(--darji-muted)]">
        <span className="rounded-full bg-white px-3 py-1">{item.stage === "pickup" ? uiText("Pickup verification") : uiText("Drop verification")}</span>
        {item.taskStatus ? <span className="rounded-full bg-white px-3 py-1">{item.taskStatus.replace(/_/g, " ")}</span> : null}
        {item.routePosition && item.routeTotal ? <span className="rounded-full bg-white px-3 py-1">{uiText("Stop")} {item.routePosition}/{item.routeTotal}</span> : null}
      </div>
    </div>
  );
}

function PendingOrderCheckout({ request, coupons, onOrderPlaced }: { request: TailoringRequest; coupons: Coupon[]; onOrderPlaced: (request: TailoringRequest) => void }) {
  const prompt = useCustomerDialog();
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<TailorQuote>();
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const quotes = useQuery({ queryKey: ["customer", "quotes", request.id], queryFn: () => customerApi.quotes(request.id) });
  const visibleQuotes = (quotes.data ?? []).filter((quote) => ["SUBMITTED", "RESERVED", "ACCEPTED"].includes(quote.status));

  const deliveryFee = selectedQuote?.deliveryEstimate?.deliveryFee ?? request.deliveryFee ?? deliveryFeeForUrgency(request.urgency ?? "");
  const homeFee = request.homeMeasurementFee ?? homeMeasurementFeeForItems(request.items ?? [], selectedQuote?.deliveryEstimate?.oneWayDistanceMeters);
  const platformFee = getPlatformFee(Number(selectedQuote?.price ?? 0));
  const smallOrderFee = getSmallOrderFee(Number(selectedQuote?.price ?? 0));
  const subtotal = Number(selectedQuote?.price ?? 0) + deliveryFee + platformFee + smallOrderFee + homeFee;
  const discount = couponDiscount(selectedCoupon, { orderSubtotal: Number(selectedQuote?.price ?? 0), deliveryFee, platformFee, smallOrderFee, homeMeasurementFee: homeFee });
  const total = Math.max(subtotal - discount, 0);

  const checkout = useMutation({
    onMutate: () => {
      setVerifyingPayment(true);
    },
    mutationFn: () => {
      if (!selectedQuote) throw new Error("Select a tailor quote first.");
      if (selectedQuote.deliveryEstimate?.unavailableReason) throw new Error(selectedQuote.deliveryEstimate.unavailableReason);
      return customerApi.checkout(request.id, {
        quoteId: selectedQuote.id,
        paymentMethod,
        deliveryFee,
        platformFee,
        smallOrderFee,
        homeMeasurementFee: homeFee,
        couponCode: selectedCoupon?.code,
        additionalItems: request.items?.slice(1).map((item) => ({ gender: item.gender, clothType: item.clothType, workType: item.workType, description: item.description })) ?? [],
        totalAmount: total
      });
    },
    onError: (err) => {
      setVerifyingPayment(false);
      void prompt("Something went wrong", errorMessage(err));
    },
    onSuccess: async (response) => {
      if (response.mode === "online") {
        setVerifyingPayment(false);
        await openRazorpay(
          response.request.id,
          response.razorpay,
          () => {
            setVerifyingPayment(true);
          },
          async (verifiedRequest) => {
            await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
            setVerifyingPayment(false);
            onOrderPlaced(verifiedRequest);
          },
          (err) => {
            setVerifyingPayment(false);
            void prompt("Something went wrong", errorMessage(err));
          }
        );
      } else {
        try {
          await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
          onOrderPlaced(response.request);
        } finally {
          setVerifyingPayment(false);
        }
      }
    }
  });

  return (
    <section className="premium-card rounded-[2rem] p-6 relative">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">{uiText("Checkout")}</p>
          <h2 className="mt-1 text-2xl font-black">{uiText("Continue this order")}</h2>
        </div>
        <Button variant="secondary" loading={quotes.isFetching} onClick={() => void quotes.refetch()}><RefreshCw className="h-4 w-4" /> {uiText("Refresh")}</Button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {visibleQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} selected={selectedQuote?.id === quote.id} onSelect={() => setSelectedQuote(quote)} />)}
      </div>
      {!visibleQuotes.length && !quotes.isLoading ? <EmptyState title={uiText("Waiting for quotes")} copy={uiText("Quotes for this request will appear here.")} /> : null}
      {visibleQuotes.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["ONLINE", "UPI", "COD"] as const).map((method) => (
                <button key={method} onClick={() => setPaymentMethod(method)} className={`rounded-2xl border px-4 py-3 text-sm font-black ${paymentMethod === method ? "border-[var(--darji-orange)] bg-[#fff7e8]" : "border-[#e6edf5] bg-white"}`}>{method}</button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {coupons.filter((coupon) => coupon.isActive).slice(0, 4).map((coupon) => (
                <button key={coupon.code} onClick={() => setSelectedCoupon(selectedCoupon?.code === coupon.code ? undefined : coupon)} className={`rounded-2xl border p-3 text-left text-sm font-bold ${selectedCoupon?.code === coupon.code ? "border-[#16a34a] bg-[#ecfdf5]" : "border-[#e6edf5] bg-white"}`}>
                  {coupon.code} - {couponLabel(coupon)}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#e6edf5] bg-white p-5 space-y-2">
            {selectedQuote ? <SummaryLine label={uiText("Tailor quote")} value={formatMoney(selectedQuote.price)} /> : null}
            <DeliverySummaryLine
              deliveryFee={deliveryFee}
              urgency={request.urgency}
              distanceMeters={selectedQuote?.deliveryEstimate?.oneWayDistanceMeters}
              customerAddress={request.pickupAddress}
              tailorAddress={selectedQuote?.tailor?.verification?.shop?.shopAddress || selectedQuote?.tailor?.verification?.shop?.shopArea || selectedQuote?.tailor?.shopName}
              tailorName={selectedQuote?.tailor?.shopName || selectedQuote?.tailor?.user?.name || "Tailor Shop"}
            />
            <SummaryLine label={uiText("Platform fee")} value={formatMoney(platformFee)} />
            {smallOrderFee ? <SummaryLine label={uiText("Small order fee")} value={formatMoney(smallOrderFee)} /> : null}
            {homeFee ? <SummaryLine label={uiText("Home measurement")} value={formatMoney(homeFee)} /> : null}
            {discount ? <SummaryLine label={uiText("Coupon discount")} value={`-${formatMoney(discount)}`} /> : null}
            <SummaryLine label={uiText("Payable")} value={formatMoney(total)} strong />
            {checkout.error ? <p className="mt-4 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(checkout.error)}</p> : null}
            {selectedQuote?.deliveryEstimate?.unavailableReason ? <p className="mt-4 rounded-xl bg-[#fff1f2] p-3 text-sm font-semibold text-[#9f1239]">{uiText(selectedQuote.deliveryEstimate.unavailableReason)}</p> : null}
            <Button className="mt-5 w-full" disabled={Boolean(selectedQuote?.deliveryEstimate?.unavailableReason)} loading={checkout.isPending} onClick={() => checkout.mutate()}>{uiText("Confirm Order")}</Button>
          </div>
        </div>
      ) : null}

      {verifyingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="premium-card max-w-sm rounded-[2rem] p-8 text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="relative grid h-16 w-16 place-items-center rounded-full bg-[#fff7e8]">
              <span className="absolute inset-0 rounded-full border-2 border-[#ffd5ad] animate-ping" />
              <Loader2 className="h-6 w-6 animate-spin text-[var(--darji-orange)]" />
            </div>
            <h3 className="text-xl font-black text-[#08111f]">{uiText("Verifying Payment")}</h3>
            <p className="text-xs font-semibold leading-relaxed text-[var(--darji-muted)]">
              {uiText("We are fetching your payment status. Please do not refresh the page or click back.")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ProfileRow({ icon: Icon, label, value, onClick, noBorder }: { icon: LucideIcon, label: string, value?: string, onClick?: () => void, noBorder?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-4 py-4 px-4 hover:bg-[#f8fafc] transition ${noBorder ? "" : "border-b border-[#e6edf5]"}`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f6f8fb] text-[var(--darji-ink)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-black text-sm">{uiText(label)}</p>
        {value ? <p className="mt-0.5 text-xs font-semibold text-[var(--darji-muted)]">{value}</p> : null}
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--darji-muted)]" />
    </button>
  );
}

const avatarOptions = [
  { key: "boy", label: "Boy", src: "/avatars/boy.png" },
  { key: "girl", label: "Girl", src: "/avatars/girl.png" },
  { key: "youngMale", label: "Young Male", src: "/avatars/young male.png" },
  { key: "youngFemale", label: "Young Female", src: "/avatars/young female.png" },
  { key: "uncle", label: "Uncle", src: "/avatars/uncle.png" },
  { key: "aunt", label: "Aunt", src: "/avatars/aunt.png" },
  { key: "aunt2", label: "Aunt 2", src: "/avatars/aunt_2.png" },
  { key: "blackFemale", label: "Black Female", src: "/avatars/black_female.png" },
  { key: "blackMale", label: "Black Male", src: "/avatars/black_male.png" },
  { key: "oldMale", label: "Old Male", src: "/avatars/old_male.png" },
  { key: "tannedMale", label: "Tanned Male", src: "/avatars/tanned_male.png" },
  { key: "tannedMale2", label: "Tanned Male 2", src: "/avatars/tanned_male_2.png" },
  { key: "tannedUncle", label: "Tanned Uncle", src: "/avatars/tanned_uncle.png" },
];

function getUserAvatarUrl(user: any) {
  if (user?.profileUrl || user?.avatarUri) return user.profileUrl || user.avatarUri;
  const preset = avatarOptions.find((o) => o.key === user?.avatarPreset);
  return preset?.src || "/avatars/boy.png";
}

function EditProfileScreen({ setScreen }: { setScreen: (s: CustomerScreen) => void }) {
  const prompt = useCustomerDialog();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [dob, setDob] = useState(user?.dateOfBirth ?? "");
  const [avatarPreset, setAvatarPreset] = useState(user?.avatarPreset ?? "boy");
  const [avatarUri, setAvatarUri] = useState(user?.profileUrl ?? user?.avatarUri ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useMutation({
    mutationFn: (data: any) => customerApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser({ ...user!, ...updatedUser, profileUrl: updatedUser.profileUrl || updatedUser.avatarUri || user?.profileUrl });
      setScreen("profile");
    }
  });

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const [uploaded] = await customerApi.uploadMedia([file]);
      if (uploaded?.url) {
        setAvatarUri(uploaded.url);
        setAvatarPreset(""); // Clear preset if using custom file
      }
    } catch (err) {
      void prompt("Something went wrong", errorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const selectedAvatar = avatarUri || avatarOptions.find(o => o.key === avatarPreset)?.src || avatarOptions[0].src;

  return (
    <div className="grid gap-6 bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 py-2">
        <button onClick={() => setScreen("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">{uiText("Edit Profile")}</h1>
      </div>

      <div className="flex flex-col items-center pt-2 pb-6">
        <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
          <input type="file" ref={fileInputRef} onChange={handleAvatarFileChange} accept="image/*" className="hidden" />
          <img src={selectedAvatar} alt="Avatar" className="h-28 w-28 rounded-full border-4 border-white bg-[#f1f5f9] object-cover shadow-sm transition group-hover:opacity-90 animate-none" />
          <div className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-[var(--darji-orange)] border-2 border-white shadow-sm text-white">
            {uploadingAvatar ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-[var(--darji-muted)]">{uiText("Tap photo to change")}</p>
      </div>

      <div className="grid gap-5">
        <FieldShell label={uiText("Full Name")}>
          <input className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]" placeholder={uiText("Your name")} value={name} onChange={e => setName(e.target.value)} />
        </FieldShell>
        
        <div>
          <label className="mb-2 block text-sm font-bold text-[var(--darji-muted)]">{uiText("Gender")}</label>
          <div className="flex flex-wrap gap-3">
             <button onClick={() => setGender("Male")} className={`flex-1 min-w-[45%] h-14 rounded-2xl border ${gender === "Male" ? "border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-ink)]" : "border-[var(--darji-line)] bg-white text-[var(--darji-muted)]"} font-bold transition shadow-[0_2px_12px_rgba(8,17,31,0.03)]`}>{uiText("Male")}</button>
             <button onClick={() => setGender("Female")} className={`flex-1 min-w-[45%] h-14 rounded-2xl border ${gender === "Female" ? "border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-ink)]" : "border-[var(--darji-line)] bg-white text-[var(--darji-muted)]"} font-bold transition shadow-[0_2px_12px_rgba(8,17,31,0.03)]`}>{uiText("Female")}</button>
             <button onClick={() => setGender("Other")} className={`flex-1 min-w-[45%] h-14 rounded-2xl border ${gender === "Other" ? "border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-ink)]" : "border-[var(--darji-line)] bg-white text-[var(--darji-muted)]"} font-bold transition shadow-[0_2px_12px_rgba(8,17,31,0.03)] max-w-[calc(50%-0.375rem)]`}>{uiText("Other")}</button>
          </div>
        </div>

        <FieldShell label={uiText("Date of Birth")}>
          <div className="relative">
            <input type="date" className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]" value={dob} onChange={e => setDob(e.target.value)} />
            <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-[var(--darji-orange)]">
              {/* Note: Native date inputs usually have their own calendar icon on web, but we can style it or leave the native one. We'll rely on the native one but color it if possible via CSS, or just let it be. */}
            </div>
          </div>
        </FieldShell>

        <div>
          <label className="mb-2 block text-sm font-bold text-[var(--darji-muted)]">{uiText("Choose Avatar")}</label>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar -mx-4 px-4">
             {avatarOptions.map(option => (
                <button 
                  key={option.key} 
                  onClick={() => { setAvatarPreset(option.key); setAvatarUri(""); }} 
                  className={`flex shrink-0 flex-col items-center justify-center gap-2 rounded-3xl border-2 p-3 pb-4 transition snap-center ${avatarPreset === option.key ? "border-[var(--darji-orange)] bg-white shadow-md" : "border-transparent bg-white shadow-[0_2px_12px_rgba(8,17,31,0.03)]"}`}
                  style={{ width: "100px" }}
                >
                 <img src={option.src} alt={option.label} className="h-16 w-16 rounded-full bg-[#f1f5f9] object-cover" />
                 <span className="text-[11px] font-bold text-[var(--darji-muted)]">{option.label}</span>
                </button>
             ))}
          </div>
        </div>
        
        {updateProfile.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(updateProfile.error)}</p> : null}
        <Button className="mt-2 h-14 rounded-2xl text-lg w-full" loading={updateProfile.isPending} onClick={() => updateProfile.mutate({ name, email, gender, dateOfBirth: dob, avatarPreset, avatarUri })}>
          {uiText("Save Changes")}
        </Button>
      </div>
    </div>
  );
}

function SavedAddressesScreen({ setScreen }: { setScreen: (s: CustomerScreen) => void }) {
  const user = useAuthStore((state) => state.user);
  const [recipientName, setRecipientName] = useState(user?.name ?? "");
  const [recipientPhone, setRecipientPhone] = useState(user?.phone ?? "");
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: ["customer", "addresses"], queryFn: customerApi.addresses });
  const [view, setView] = useState<"list" | "add">("list");
  
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [locationStatus, setLocationStatus] = useState<string>();
  
  const createAddress = useMutation({
    mutationFn: () => customerApi.createAddress({
      name: recipientName.trim(),
      phone: recipientPhone,
      label,
      line1,
      city,
      state,
      pincode,
      landmark
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "addresses"] });
      setView("list");
      setLine1("");
      setCity("");
      setState("");
      setPincode("");
      setLandmark("");
      setLabel("Home");
    }
  });

  const useCurrentLocation = () => {
    setLocationStatus("Locating...");
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        void customerApi.saveCurrentLocation(lat, lng, position.coords.accuracy).catch(() => undefined);
        try {
          setLocationStatus("Fetching address...");
          let res: {
            formattedAddress: string;
            houseNumber?: string;
            route?: string;
            area?: string;
            city?: string;
            state?: string;
            postalCode?: string;
          };
          try {
            res = await customerApi.reverseGeocode(lat, lng);
          } catch {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
              headers: { "User-Agent": "Darji-Web/1.0" }
            });
            if (response.ok) {
              const osmData = await response.json();
              const addr = osmData.address || {};
              res = {
                formattedAddress: osmData.display_name || "",
                houseNumber: addr.house_number ?? "",
                route: addr.road ?? "",
                area: addr.suburb ?? addr.neighbourhood ?? "",
                city: addr.city ?? addr.town ?? addr.village ?? addr.county ?? "",
                state: addr.state ?? "",
                postalCode: addr.postcode ?? ""
              };
            } else {
              throw new Error("Nominatim failed");
            }
          }
          setLine1(res.formattedAddress);
          setCity(res.city ?? "");
          setState(res.state ?? "");
          setPincode(res.postalCode ?? "");
          setLocationStatus("Location details added.");
        } catch {
          const value = `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
          setLine1(value);
          setLocationStatus("Location coordinates added.");
        }
      },
      () => setLocationStatus("Could not read location."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const list = addresses.data ?? [];

  if (view === "add") {
    return (
      <div className="grid gap-6 bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
        <div className="flex items-center gap-4 py-2">
          <button onClick={() => setView("list")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-black text-[var(--darji-ink)]">{uiText("Add New Address")}</h1>
        </div>

        <div className="grid gap-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-muted)]">{uiText("Address Label")}</label>
            <div className="flex gap-2">
              {["Home", "Office", "Other"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLabel(item)}
                  className={`flex-1 h-12 rounded-xl border font-bold text-sm transition ${label === item ? "border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-orange)]" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <FieldShell label={uiText("Name")}><input className={inputClass} value={recipientName} onChange={(event) => setRecipientName(event.target.value)} autoComplete="name" /></FieldShell>
          <FieldShell label={uiText("Mobile number")}><input className={inputClass} value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="tel" autoComplete="tel-national" /></FieldShell>
          <FieldShell label={uiText("Address Line 1")}>
            <input
              className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
              placeholder={uiText("Building, street, house number")}
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
            />
          </FieldShell>

          <button type="button" onClick={useCurrentLocation} className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e6edf5] bg-white px-4 py-2.5 text-sm font-black text-[var(--darji-ink)] hover:border-[var(--darji-orange)] transition">
            <LocateFixed className="h-4 w-4 text-[var(--darji-orange)]" />
            {uiText("Use Current Location")}
          </button>
          {locationStatus ? <p className="text-xs font-bold text-[var(--darji-muted)]">{locationStatus}</p> : null}

          <FieldShell label={uiText("Landmark (Optional)")}>
            <input
              className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
              placeholder={uiText("Nearby popular place")}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </FieldShell>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldShell label={uiText("City")}>
              <input
                className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
                placeholder={uiText("City")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </FieldShell>

            <FieldShell label={uiText("State")}>
              <input
                className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
                placeholder={uiText("State")}
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </FieldShell>

            <FieldShell label={uiText("Pincode")}>
              <input
                className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
                placeholder={uiText("6 digit PIN")}
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              />
            </FieldShell>
          </div>

          {createAddress.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(createAddress.error)}</p> : null}
          <Button
            className="mt-2 h-14 rounded-2xl text-lg w-full"
            loading={createAddress.isPending}
            disabled={!line1.trim() || !city.trim() || !state.trim() || !pincode.trim()}
            onClick={() => createAddress.mutate()}
          >
            {uiText("Save Address")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 py-2 mb-6">
        <button onClick={() => setScreen("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">{uiText("Saved Addresses")}</h1>
      </div>

      <button
        onClick={() => setView("add")}
        className="w-full h-14 rounded-2xl bg-[var(--darji-orange)] text-white font-bold text-lg shadow-md flex items-center justify-center gap-2 mb-8 hover:bg-[var(--darji-orange)]/90 transition"
      >
        <Plus className="h-5 w-5" /> {uiText("Add New Address")}
      </button>

      {addresses.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--darji-orange)]" />
        </div>
      ) : !list.length ? (
        <EmptyState title={uiText("No saved addresses")} copy={uiText("Add an address to make your doorstep booking seamless.")} />
      ) : (
        <div className="grid gap-3">
          {list.map((address) => (
            <div
              key={address.id}
              className="flex items-start justify-between rounded-2xl border border-[var(--darji-line)] bg-white p-5 shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
            >
              <div className="flex gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-[var(--darji-orange)]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[var(--darji-ink)]">{address.label ?? "Address"}</h3>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--darji-muted)]">
                    {addressText(address)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WalletScreen({ setScreen }: { setScreen: (s: CustomerScreen) => void }) {
  const walletQuery = useQuery({ queryKey: ["customer", "wallet"], queryFn: customerApi.wallet });
  const summary = walletQuery.data;
  const balance = summary?.balance ?? 0;
  const transactions = summary?.transactions ?? [];

  return (
    <div className="bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 py-2 mb-6">
        <button onClick={() => setScreen("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">{uiText("Darji Wallet")}</h1>
      </div>

      {walletQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--darji-orange)]" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Wallet Balance Card */}
          <div className="rounded-[2rem] bg-gradient-to-br from-[#ffae3c] to-[#ff7000] p-6 text-white shadow-[0_12px_36px_rgba(255,112,0,0.22)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/80">{uiText("Available Balance")}</p>
            <h2 className="mt-2 text-4xl font-black">{formatMoney(balance)}</h2>
            <p className="mt-4 text-xs font-bold text-white/70">{uiText("Use this balance for quick checkout on your tailoring requests.")}</p>
          </div>

          {/* Transactions List */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-[var(--darji-orange)]" />
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--darji-orange)]">{uiText("Transaction History")}</p>
            </div>

            {!transactions.length ? (
              <EmptyState title={uiText("No transactions yet")} copy={uiText("Your wallet transactions will be listed here.")} />
            ) : (
              <div className="grid gap-3">
                {transactions.map((tx) => {
                  const isCredit = tx.type === "CREDIT" || tx.amount > 0;
                  const amtSign = isCredit ? "+" : "-";
                  const amtColor = isCredit ? "text-[#16a34a]" : "text-[#dc2626]";
                  const title = tx.remarks || (isCredit ? "Refund/Credit" : "Order Payment");
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-2xl border border-[var(--darji-line)] bg-white p-4 shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`grid h-10 w-10 place-items-center rounded-xl ${isCredit ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[var(--darji-ink)]">{title}</p>
                          <p className="text-xs font-semibold text-[var(--darji-muted)] mt-0.5">
                            {formatOrderDate(tx.createdAt, true)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-base font-black ${amtColor}`}>
                        {amtSign}{formatMoney(Math.abs(tx.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}


function AboutDarjiScreen({ setScreen }: { setScreen: (s: CustomerScreen) => void }) {
  return (
    <div className="bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 py-2 mb-6">
        <button onClick={() => setScreen("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">{uiText("About Darji")}</h1>
      </div>

      <div className="rounded-[2.5rem] border border-[var(--darji-line)] bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(8,17,31,0.03)] text-center">
        <img src="/darji-loader-transparent.png" alt="Darji Logo" className="mx-auto h-28 w-auto object-contain mb-6" />
        <h2 className="text-xl font-black text-[var(--darji-ink)] mb-2">{uiText("Darji Customer Web Dashboard")}</h2>
        <p className="text-sm font-bold text-[var(--darji-orange)] mb-6">{uiText("Version 1.0.0 (Stable)")}</p>
        
        <div className="text-left text-sm leading-relaxed text-[var(--darji-muted)] space-y-4 max-w-xl mx-auto border-t border-slate-100 pt-6">
          <p>{uiText("Darji is a premium doorstep tailoring and alterations service. We connect customers with highly skilled, verified local tailors to handle custom stitching, repairs, resizing, and alterations directly from the comfort of their homes.")}</p>
          <p>{uiText("Our app coordinates pickup, delivery tracking, secure payouts, and communication with tailors, giving you a completely hands-off premium custom tailoring experience.")}</p>
        </div>
        <a href={DARJI_ABOUT_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--darji-orange)] px-5 text-sm font-black text-[#111111] transition hover:brightness-95">
          {uiText("See more info")}
        </a>
      </div>
    </div>
  );
}

function ReferenceProfileScreen({ requests, wallet, addresses, setScreen, signOut }: { requests: TailoringRequest[]; wallet?: WalletSummary; addresses: Address[]; setScreen: (s: CustomerScreen) => void; signOut: () => void }) {
  const user = useAuthStore((state) => state.user);
  const recent = [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const avatar = getUserAvatarUrl(user);
  return <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]"><aside className="grid content-start gap-4"><div className="reference-card overflow-hidden text-center"><div className="reference-festive h-24" /><img src={avatar} alt="" className="relative mx-auto -mt-10 h-20 w-20 rounded-full border-4 border-white object-cover" /><h1 className="mt-2 text-2xl font-black">{user?.name || uiText("My Account")}</h1><p className="text-sm text-[#665950]">{user?.phone ? `+91 ${user.phone}` : ""}</p><button className="reference-action my-4 w-[calc(100%-2rem)]" onClick={() => setScreen("editProfile")}>{uiText("Edit Profile")}</button></div><nav className="reference-card grid p-2" aria-label={uiText("Account menu")}>{[["profile","My Account",UserRound],["orders","Orders & Activity",PackageCheck],["savedAddresses","Addresses",MapPin],["favoriteTailors","Favorite Tailors",Star],["wallet","Payments & Refunds",Wallet],["helpCenter","Help Center",HelpCircle],["notifications","Notifications",Bell],["settings","App Preferences",Ruler]].map(([id,label,Icon]) => { const MenuIcon = Icon as LucideIcon; return <button key={id as string} onClick={() => setScreen(id as CustomerScreen)} className={`${id === "profile" ? "bg-[#fff0cb]" : "hover:bg-[#fff7e9]"} flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold`}><MenuIcon className="h-4 w-4" />{uiText(label as string)}<ChevronRight className="ml-auto h-4 w-4" /></button>; })}<button onClick={signOut} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-red-700"><LogOut className="h-4 w-4" />{uiText("Logout")}</button></nav></aside><div className="grid content-start gap-4"><div><h2 className="text-4xl font-black tracking-[-.04em]">{uiText("My Account")}</h2><p className="text-sm text-[#665950]">{uiText("Manage your profile, orders, preferences and account settings.")}</p></div><div className="grid gap-4 md:grid-cols-2"><div className="reference-card p-5"><div className="flex items-center justify-between"><h3 className="reference-form-title">{uiText("Favorite Tailors")}</h3><button onClick={() => setScreen("favoriteTailors")} className="text-xs font-bold text-[#cb8200]">{uiText("View All")} →</button></div><p className="reference-form-note mt-2">{uiText("Your saved tailors and their profiles.")}</p><button className="reference-outline mt-5 w-full" onClick={() => setScreen("favoriteTailors")}>{uiText("Browse Favorites")}<ArrowRight className="h-4 w-4" /></button></div><div className="reference-card p-5"><div className="flex items-center justify-between"><h3 className="reference-form-title">{uiText("Saved Addresses")}</h3><button onClick={() => setScreen("savedAddresses")} className="text-xs font-bold text-[#cb8200]">{uiText("View All")} →</button></div><div className="mt-3 grid gap-2">{addresses.slice(0,2).map((address) => <div key={address.id} className="rounded-xl border border-[#ead9c2] bg-white p-3"><p className="text-sm font-bold">{address.label || uiText("Address")}</p><p className="line-clamp-2 text-xs text-[#675b52]">{addressText(address)}</p></div>)}{!addresses.length ? <p className="reference-form-note">{uiText("No saved addresses yet.")}</p> : null}</div><button onClick={() => setScreen("savedAddresses")} className="reference-outline mt-3 w-full">{uiText("Add New Address")}</button></div></div><div className="grid gap-4 md:grid-cols-2"><div className="reference-card p-5"><div className="flex items-center justify-between"><h3 className="reference-form-title">{uiText("Order History")}</h3><button onClick={() => setScreen("orders")} className="text-xs font-bold text-[#cb8200]">{uiText("View All Orders")} →</button></div>{recent ? <div className="mt-3 rounded-xl border border-[#ead9c2] bg-white p-3"><p className="text-sm font-black">{requestCode(recent)}</p><p className="text-xs text-[#675b52]">{clothingItemTitle(primaryOrderItem(recent))} · {statusLabel(recent)}</p></div> : <p className="reference-form-note mt-3">{uiText("Your orders will appear here.")}</p>}</div><div className="grid gap-3"><button onClick={() => setScreen("settings")} className="reference-card flex items-center gap-3 p-5 text-left"><Ruler className="h-6 w-6 text-[#d99100]" /><div><p className="font-black">{uiText("App Preferences")}</p><p className="text-xs text-[#675b52]">{uiText("Language and notifications")}</p></div><ChevronRight className="ml-auto h-4 w-4" /></button><button onClick={() => setScreen("wallet")} className="reference-card flex items-center gap-3 p-5 text-left"><Wallet className="h-6 w-6 text-[#d99100]" /><div><p className="font-black">{uiText("Wallet & Payments")}</p><p className="text-xs text-[#675b52]">{formatMoney(wallet?.balance)} {uiText("available")}</p></div><ChevronRight className="ml-auto h-4 w-4" /></button></div></div><div className="reference-card p-5"><h3 className="reference-form-title">{uiText("Help & Support")}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><button className="reference-outline" onClick={() => setScreen("helpCenter")}>{uiText("Help Center")}<ChevronRight className="h-4 w-4" /></button><button className="reference-outline" onClick={() => setScreen("support")}>{uiText("Chat with Support")}<ChevronRight className="h-4 w-4" /></button></div></div><ReferenceTrustStrip /></div></div>;
}

function ContactSupportScreen({ setScreen, orders }: { setScreen: (s: CustomerScreen) => void; orders: TailoringRequest[] }) {
  const prompt = useCustomerDialog();
  const [view, setView] = useState<"center" | "chat" | "new_chat" | "new_bug">("center");
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedOrder, setSelectedOrder] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bug Report Form State
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugScreenshot, setBugScreenshot] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const bugFileRef = useRef<HTMLInputElement>(null);
  
  const ticketsQuery = useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => customerApi.supportTickets(),
    refetchInterval: view === "chat" ? 3000 : false,
  });

  const bugsQuery = useQuery({
    queryKey: ["bugReports"],
    queryFn: () => customerApi.bugReports(),
    refetchInterval: view === "chat" ? 3000 : false,
  });

  const createTicket = useMutation({
    mutationFn: (data: { subject: string; message: string; orderId?: string; attachments?: string[] }) => customerApi.createSupportTicket(data),
    onSuccess: (ticket) => {
       setActiveTicket(ticket);
       setView("chat");
       setSubject("");
       setNewMessage("");
       setSelectedOrder("");
       setAttachmentUrl("");
       ticketsQuery.refetch();
    }
  });

  const createBug = useMutation({
    mutationFn: (data: { title: string; description: string; screenshot?: string; deviceInfo: string }) => customerApi.createBugReport(data),
    onSuccess: (bug) => {
       setActiveTicket({ ...bug, isBugReport: true });
       setView("chat");
       setBugTitle("");
       setBugDescription("");
       setBugScreenshot("");
       bugsQuery.refetch();
    }
  });

  const handleBugScreenshotChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingScreenshot(true);
      const [uploaded] = await customerApi.uploadMedia([file]);
      if (uploaded?.url) {
        setBugScreenshot(uploaded.url);
      }
    } catch (err) {
      void prompt("Something went wrong", errorMessage(err));
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const sendMessage = useMutation({
    mutationFn: (data: { text: string }) => {
      if (activeTicket && activeTicket.isBugReport) {
        return customerApi.sendBugMessage(activeTicket._id || activeTicket.id, data);
      }
      return customerApi.sendTicketMessage(activeTicket._id || activeTicket.id, data);
    },
    onSuccess: () => {
       setNewMessage("");
       ticketsQuery.refetch();
       bugsQuery.refetch();
    }
  });

  const closeTicket = useMutation({
    mutationFn: () => customerApi.updateTicketStatus(activeTicket._id || activeTicket.id, "RESOLVED"),
    onSuccess: () => {
       setActiveTicket(null);
       setView("center");
       ticketsQuery.refetch();
    }
  });

  const handleAttachmentFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAttachment(true);
      const [uploaded] = await customerApi.uploadMedia([file]);
      if (uploaded?.url) {
        setAttachmentUrl(uploaded.url);
      }
    } catch (err) {
      void prompt("Something went wrong", errorMessage(err));
    } finally {
      setUploadingAttachment(false);
    }
  };

  const tickets = (ticketsQuery.data as any[]) || [];
  const activeTickets = tickets.filter(t => t.status !== "RESOLVED" && t.status !== "CLOSED");
  const resolvedTickets = tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED");
  const bugReports = (bugsQuery.data as any[]) || [];

  const helpCategories = [
    { id: "Order Delay", icon: Clock },
    { id: "Pickup Issue", icon: Package },
    { id: "Tailor Issue", icon: Scissors },
    { id: "Payment Issue", icon: CreditCard },
    { id: "Refund Request", icon: Banknote },
    { id: "Other Issue", icon: HelpCircle },
  ];

  // Keep activeTicket updated with the latest messages
  const currentTicket = activeTicket?.isBugReport
    ? bugReports.find(b => (b._id || b.id) === (activeTicket?._id || activeTicket?.id)) || activeTicket
    : tickets.find(t => (t._id || t.id) === (activeTicket?._id || activeTicket?.id)) || activeTicket;
  const messages = currentTicket?.messages || [];

  if (view === "chat" && currentTicket) {
    return (
      <div className="flex h-[calc(100vh-160px)] flex-col rounded-[2rem] border border-[#e6edf5] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e6edf5] p-5">
          <div className="flex items-center gap-4">
            <button onClick={() => setView("center")} className="grid h-10 w-10 place-items-center rounded-full bg-[#f6f8fb] text-[var(--darji-ink)] hover:bg-[#e6edf5] transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="font-black text-lg text-[var(--darji-ink)]">{currentTicket.subject || currentTicket.title || "Support Ticket"}</p>
              <p className="text-xs font-semibold text-[var(--darji-muted)] uppercase tracking-wider mt-0.5">#{currentTicket.id?.slice(0, 8) || currentTicket._id?.slice(0, 8)}</p>
            </div>
          </div>
          {currentTicket.status !== "RESOLVED" && currentTicket.status !== "CLOSED" && !currentTicket.isBugReport && (
            <Button variant="secondary" className="h-9 px-4 text-xs" onClick={() => closeTicket.mutate()}>
              {uiText("Resolve")}
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#fcfcfd]">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <MessageSquare className="mx-auto h-12 w-12 text-[#dce2ea] mb-3" />
                <p className="font-bold text-[var(--darji-muted)]">{uiText("No messages yet.")}</p>
                <p className="text-sm font-medium text-[#94a3b8] mt-1 max-w-xs">{uiText("Type your first message below to open this support ticket.")}</p>
              </div>
            </div>
          ) : (
            messages.map((msg: any, i: number) => {
              const isUser = msg.sender === "client" || msg.sender === "CUSTOMER" || msg.senderType === "CUSTOMER";
              return (
                <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-[var(--darji-muted)]">
                    {isUser ? uiText("You") : uiText("Darji Support")}
                  </p>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${isUser ? "bg-[var(--darji-ink)] text-white rounded-br-sm" : "bg-white border border-[#e6edf5] text-[var(--darji-ink)] rounded-bl-sm"}`}>
                    <p className="text-[15px] font-semibold leading-relaxed">{msg.text || msg.message}</p>
                    {msg.attachments?.map((url: string, index: number) => (
                      <img key={index} src={url} alt="Attachment" className="mt-2 max-h-48 rounded-xl object-contain" />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {currentTicket.status !== "RESOLVED" && currentTicket.status !== "CLOSED" && (
          <div className="border-t border-[#e6edf5] p-4 bg-white">
            <div className="flex items-center gap-3">
              <input
                className="h-14 flex-1 rounded-2xl border border-[#e6edf5] bg-[#f6f8fb] px-5 font-semibold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none"
                placeholder={uiText("Type a message...")}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMessage.trim() && !sendMessage.isPending) {
                    sendMessage.mutate({ text: newMessage });
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (newMessage.trim() && !sendMessage.isPending) {
                    sendMessage.mutate({ text: newMessage });
                  }
                }}
                disabled={!newMessage.trim() || sendMessage.isPending}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--darji-orange)] text-white disabled:opacity-50 transition hover:bg-[var(--darji-orange)]/90"
              >
                <Send className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "new_chat") {
    const activeSelectedOrderData = orders.find(o => o.id === selectedOrder);
    return (
      <div className="bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
        <div className="flex items-center gap-4 py-2 mb-6">
          <button onClick={() => setView("center")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-black text-[var(--darji-ink)]">{uiText("Start Conversation")}</h1>
        </div>

        <div className="grid gap-6">
          <div className="relative w-fit">
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">{uiText("Select Related Order (Optional)")}</label>
            <div className="relative">
              <button type="button" className="h-14 w-auto px-6 rounded-2xl border border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-orange)] font-bold shadow-sm pointer-events-none flex items-center gap-2">
                {selectedOrder && activeSelectedOrderData ? (
                  <span>
                    {requestCode(activeSelectedOrderData)} - {primaryOrderItem(activeSelectedOrderData).clothType || "Order"}
                  </span>
                ) : (
                  <span>{uiText("No Linked Order")}</span>
                )}
                <span className="text-xs">▼</span>
              </button>
              <select
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
              >
                <option value="">{uiText("General Query (No Order)")}</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {requestCode(order)} - {primaryOrderItem(order).clothType || "Order"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">{uiText("Select Help Category")}</label>
            <div className="grid grid-cols-2 gap-3">
              {helpCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = subject === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSubject(cat.id)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border ${isSelected ? "border-[var(--darji-orange)] bg-[#fffcf5]" : "border-[var(--darji-line)] bg-white"} p-4 shadow-[0_2px_12px_rgba(8,17,31,0.03)] transition`}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? "text-[var(--darji-orange)]" : "text-[var(--darji-muted)]"}`} />
                    <span className={`text-sm font-bold ${isSelected ? "text-[var(--darji-ink)]" : "text-[var(--darji-ink)]"}`}>{cat.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">{uiText("Attach Image Reference (Optional)")}</label>
            <input type="file" ref={fileInputRef} onChange={handleAttachmentFileChange} accept="image/*" className="hidden" />
            {attachmentUrl ? (
              <div className="relative h-24 w-24 rounded-2xl border border-[var(--darji-line)] overflow-hidden group">
                <img src={attachmentUrl} alt="Attached image" className="h-full w-full object-cover" />
                <button 
                  type="button"
                  onClick={() => setAttachmentUrl("")} 
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                  style={{ padding: '2px' }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment}
                className="flex flex-col items-center justify-center gap-2 h-24 w-24 rounded-2xl border-2 border-dashed border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-orange)] hover:bg-[#fff7e8] transition disabled:opacity-50"
              >
                {uploadingAttachment ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-6 w-6" />
                    <span className="text-xs font-bold">{uiText("Add Photo")}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <Button 
            className="w-full h-14 text-lg mt-4 rounded-2xl" 
            loading={createTicket.isPending} 
            disabled={!subject}
            onClick={() => createTicket.mutate({ 
              subject, 
              message: `I need support regarding: ${subject}`, 
              orderId: selectedOrder || undefined,
              attachments: attachmentUrl ? [attachmentUrl] : []
            })}
          >
            {uiText("Start Conversation")}
          </Button>
        </div>
      </div>
    );
  }

  if (view === "new_bug") {
    return (
      <div className="bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
        <div className="flex items-center gap-4 py-2 mb-6">
          <button onClick={() => setView("center")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-black text-[var(--darji-ink)]">{uiText("Report a Bug")}</h1>
        </div>

        <div className="grid gap-6 text-left">
          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">{uiText("Bug Title")}</label>
            <input
              type="text"
              placeholder={uiText("e.g. App crashes when selecting payment")}
              className={inputClass}
              value={bugTitle}
              onChange={(e) => setBugTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">{uiText("Steps to Reproduce / Description")}</label>
            <textarea
              placeholder={uiText("Describe the issue you encountered and the steps to reproduce it.")}
              className={`${inputClass} min-h-32 py-3`}
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">{uiText("Attach Screenshot reference (Optional)")}</label>
            <input type="file" ref={bugFileRef} onChange={handleBugScreenshotChange} accept="image/*" className="hidden" />
            {bugScreenshot ? (
              <div className="relative h-24 w-24 rounded-2xl border border-[var(--darji-line)] overflow-hidden group">
                <img src={bugScreenshot} alt="Attached screenshot" className="h-full w-full object-cover" />
                <button 
                  type="button"
                  onClick={() => setBugScreenshot("")} 
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                  style={{ padding: '2px' }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => bugFileRef.current?.click()}
                disabled={uploadingScreenshot}
                className="flex flex-col items-center justify-center gap-2 h-24 w-24 rounded-2xl border-2 border-dashed border-red-500 bg-red-50/50 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
              >
                {uploadingScreenshot ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-6 w-6" />
                    <span className="text-xs font-bold">{uiText("Add Photo")}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <Button 
            className="w-full h-14 text-lg mt-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black" 
            loading={createBug.isPending} 
            disabled={bugTitle.trim().length < 3 || bugDescription.trim().length < 10}
            onClick={() => createBug.mutate({ 
              title: bugTitle.trim(), 
              description: bugDescription.trim(), 
              screenshot: bugScreenshot || undefined,
              deviceInfo: "Web Browser"
            })}
          >
            {uiText("Submit Bug Report")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 py-2 mb-6">
        <button onClick={() => setScreen("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">{uiText("Support Center")}</h1>
      </div>

      <div className="grid gap-4 mb-8 sm:grid-cols-3">
        <button onClick={() => setView("new_chat")} className="h-14 rounded-2xl bg-[var(--darji-orange)] text-white font-bold text-base shadow-md flex items-center justify-center gap-2 hover:bg-[var(--darji-orange)]/90 transition">
          <MessageSquare className="h-5 w-5" /> {uiText("Start Conversation")}
        </button>
        <button onClick={() => setView("new_bug")} className="h-14 rounded-2xl border-2 border-red-500 text-red-500 font-bold text-base shadow-md flex items-center justify-center gap-2 hover:bg-red-50 transition">
          <Bug className="h-5 w-5" /> {uiText("Report a Bug")}
        </button>
        <a href={SUPPORT_PHONE_URL} className="h-14 rounded-2xl border-2 border-[var(--darji-orange)] bg-white text-[var(--darji-orange)] font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#fff8f0] transition">
          <Phone className="h-5 w-5" /> {uiText("Call Support")} · {SUPPORT_PHONE_DISPLAY}
        </a>
      </div>

      <div className="grid gap-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[var(--darji-orange)]" />
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--darji-orange)]">{uiText("OPEN TICKETS (")}{activeTickets.length})</p>
          </div>
          
          {activeTickets.length === 0 ? (
            <div className="rounded-2xl border border-[var(--darji-line)] bg-white py-5 text-center shadow-[0_2px_12px_rgba(8,17,31,0.03)]">
               <p className="text-sm font-bold text-[var(--darji-muted)]">{uiText("No active support requests")}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeTickets.map(ticket => (
                <button 
                  key={ticket.id || ticket._id} 
                  onClick={() => { setActiveTicket(ticket); setView("chat"); }}
                  className="flex items-center justify-between rounded-2xl border border-[var(--darji-line)] bg-white p-4 shadow-[0_2px_12px_rgba(8,17,31,0.03)] text-left"
                >
                  <div>
                    <p className="font-bold text-base text-[var(--darji-ink)]">{ticket.subject || "Support Request"}</p>
                    <p className="text-xs font-semibold text-[var(--darji-muted)] mt-1 truncate max-w-[200px]">
                      {ticket.messages?.length ? (ticket.messages[ticket.messages.length - 1].text || ticket.messages[ticket.messages.length - 1].message) : uiText("No messages yet")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--darji-muted)]" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[var(--darji-muted)]" />
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--darji-muted)]">{uiText("RESOLVED TICKETS (")}{resolvedTickets.length})</p>
          </div>
          
          {resolvedTickets.length === 0 ? (
            <div className="rounded-2xl border border-[var(--darji-line)] bg-white py-5 text-center shadow-[0_2px_12px_rgba(8,17,31,0.03)]">
               <p className="text-sm font-bold text-[var(--darji-muted)]">{uiText("No resolved support requests")}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {resolvedTickets.map(ticket => (
                <button 
                  key={ticket.id || ticket._id} 
                  onClick={() => { setActiveTicket(ticket); setView("chat"); }}
                  className="flex items-center justify-between rounded-2xl border border-[var(--darji-line)] bg-white p-4 shadow-[0_2px_12px_rgba(8,17,31,0.03)] text-left opacity-75"
                >
                  <div>
                    <p className="font-bold text-base text-[var(--darji-ink)]">{ticket.subject || "Support Request"}</p>
                    <p className="text-xs font-semibold text-[var(--darji-muted)] mt-1 truncate max-w-[200px]">
                      {uiText("Resolved")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--darji-muted)]" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#ef4444]" />
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[#ef4444]">{uiText("BUG REPORTS (")}{bugReports.length})</p>
          </div>
          
          {bugReports.length === 0 ? (
            <div className="rounded-2xl border border-[var(--darji-line)] bg-white py-5 text-center shadow-[0_2px_12px_rgba(8,17,31,0.03)]">
               <p className="text-sm font-bold text-[var(--darji-muted)]">{uiText("No bug reports submitted")}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {bugReports.map(bug => (
                <button 
                  key={bug.id || bug._id} 
                  onClick={() => { setActiveTicket({ ...bug, isBugReport: true }); setView("chat"); }}
                  className="flex items-center justify-between rounded-2xl border border-[var(--darji-line)] bg-white p-4 shadow-[0_2px_12px_rgba(8,17,31,0.03)] text-left"
                >
                  <div>
                    <p className="font-bold text-base text-[var(--darji-ink)]">{bug.title || "Bug Report"}</p>
                    <p className="text-xs font-semibold text-[var(--darji-muted)] mt-1 truncate max-w-[200px]">
                      {bug.messages?.length ? (bug.messages[bug.messages.length - 1].text || bug.messages[bug.messages.length - 1].message) : uiText("No messages yet")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--darji-muted)]" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}






export function CustomerDashboard() {
  return <CustomerDialogProvider><CustomerDashboardContent /></CustomerDialogProvider>;
}

function CustomerDashboardContent() {
  const language = useCustomerPreferences((state) => state.language);
  const prompt = useCustomerDialog();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const userId = useAuthStore((state) => state.user?.id);
  const [draftOwner, setDraftOwner] = useState<string>();
  useEffect(() => setMounted(true), []);
  const { accessToken, signOut, setUser } = useAuthStore();
  const [screen, setScreen] = useState<CustomerScreen>("home");
  const [draft, setDraft] = useState<RequestDraft>(() => makeEmptyDraft());
  const [selectedQuote, setSelectedQuote] = useState<TailorQuote>();
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccess>();
  const requests = useQuery({ queryKey: ["customer", "requests"], queryFn: customerApi.tailoringRequests, enabled: Boolean(accessToken), refetchInterval: 15000 });
  const coupons = useQuery({ queryKey: ["customer", "coupons"], queryFn: customerApi.coupons, enabled: Boolean(accessToken) });
  const wallet = useQuery({ queryKey: ["customer", "wallet"], queryFn: customerApi.wallet, enabled: Boolean(accessToken) });
  const notifications = useQuery({ queryKey: ["customer", "notifications"], queryFn: customerApi.notifications, enabled: Boolean(accessToken) });
  const addresses = useQuery({ queryKey: ["customer", "addresses"], queryFn: customerApi.addresses, enabled: Boolean(accessToken) });
  const meQuery = useQuery({ queryKey: ["customer", "me"], queryFn: customerApi.me, enabled: Boolean(accessToken) });

  const requestRows = requests.data ?? [];
  const couponRows = coupons.data ?? [];
  const addressRows = addresses.data ?? [];
  const notificationRows = notifications.data ?? [];
  const syncing = requests.isLoading || coupons.isLoading || wallet.isLoading || notifications.isLoading || addresses.isLoading || meQuery.isLoading;
  const selectedOrder = useMemo(() => requestRows.find((request) => request.id === selectedOrderId), [requestRows, selectedOrderId]);

  useEffect(() => {
    if (!userId) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(`darji.web.draft.${userId}`) ?? "null");
      if (saved?.draft && typeof saved.draft.pickup === "string" && Array.isArray(saved.draft.items)) {
        setDraft({ ...makeEmptyDraft(), ...saved.draft, media: [], sampleMedia: [] });
        setSelectedQuote(saved.quote);
      } else setDraft(makeEmptyDraft());
    } catch { setDraft(makeEmptyDraft()); }
    setDraftOwner(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || draftOwner !== userId) return;
    const safeDraft = { ...draft, media: [], sampleMedia: [], items: draft.items.map((item) => ({ ...item, media: [], sampleMedia: [] })) };
    try { sessionStorage.setItem(`darji.web.draft.${userId}`, JSON.stringify({ draft: safeDraft, quote: selectedQuote })); } catch { /* Private browsing may disable storage. */ }
  }, [draft, selectedQuote, userId, draftOwner]);

  async function handleSignOut() {
    if (!await prompt("Log out", "Are you sure you want to log out?", true)) return;
    signOut();
    queryClient.clear();
    setDraft(makeEmptyDraft());
    setSelectedQuote(undefined);
    setSelectedOrderId(undefined);
    setScreen("home");
    window.location.hash = "";
  }

  useEffect(() => {
    if (meQuery.data) {
      setUser({ ...meQuery.data, profileUrl: meQuery.data.profileUrl || meQuery.data.avatarUri });
    }
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (!draft.pickup && addressRows[0]) {
      setDraft((current) => (current.pickup ? current : { ...current, pickup: addressText(addressRows[0]) }));
    }
  }, [addressRows, draft.pickup]);

  useEffect(() => {
    if (typeof window === "undefined" || !accessToken) return;

    const params = new URLSearchParams(window.location.search);
    const targetScreen = params.get("screen") as CustomerScreen;
    if (targetScreen) {
      params.delete("screen");
      const remainingQuery = params.toString();
      window.location.hash = targetScreen;
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}${window.location.hash}`
      );
    }

    const handleHashChange = () => {
      const [route, query] = window.location.hash.slice(1).split("?");
      const hash = route as CustomerScreen;
      const orderId = new URLSearchParams(query).get("order");
      if (orderId) setSelectedOrderId(orderId);
      const validScreens: CustomerScreen[] = [
        "home", "newRequest", "clothIssue", "summary", "quotes", "confirm",
        "orders", "orderDetails", "profile", "support", "editProfile",
        "savedAddresses", "wallet", "helpCenter", "aboutDarji", ...extraScreens
      ];
      if (hash && validScreens.includes(hash)) {
        setScreen(hash);
      } else {
        setScreen("home");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [accessToken]);

  function openOrder(request: TailoringRequest) {
    setSelectedOrderId(request.id);
    window.location.hash = `orderDetails?order=${encodeURIComponent(request.id)}`;
  }

  function handleOrderPlaced(request: TailoringRequest) {
    setSelectedOrderId(request.id);
    setOrderSuccess({ code: requestCode(request), total: request.totalAmount, paymentMethod: request.paymentMethod });
    window.location.hash = "orders";
  }

  function setAppScreen(nextScreen: CustomerScreen) {
    if (nextScreen === "newRequest" && draft.backendRequestId) {
      window.location.hash = "quotes";
      return;
    }
    const orderSuffix = ["orderDetails", "trackOrder"].includes(nextScreen) && selectedOrderId ? `?order=${encodeURIComponent(selectedOrderId)}` : "";
    window.location.hash = nextScreen === "home" ? "" : `${nextScreen}${orderSuffix}`;
  }

  function navigateBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = "home";
    }
  }

  if (!mounted) return <LoadingScreen />;
  if (!accessToken) return <AuthPanel />;

  const sharedError = requests.error ?? coupons.error ?? wallet.error ?? notifications.error ?? addresses.error;
  const initialLoading = syncing && !requests.data && !coupons.data && !wallet.data && !notifications.data && !addresses.data && !sharedError;

  if (initialLoading) return <LoadingScreen label={uiText("Loading your orders")} />;

  return (
    <main lang={language} className="customer-order-web min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <AppHeader screen={screen} setScreen={setAppScreen} signOut={() => { void handleSignOut(); }} syncing={syncing} pickup={draft.pickup} />
      <div className="shell py-6">
        {extraScreens.includes(screen as ExtraScreen) && screen !== "search" ? <CustomerExtraScreen screen={screen as ExtraScreen} go={(target) => setAppScreen(target as CustomerScreen)} orders={requestRows} coupons={couponRows} selectedOrder={selectedOrder} openOrder={openOrder} /> : null}
        {sharedError ? <p className="mb-5 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(sharedError)}</p> : null}
        {screen === "home" ? <ReferenceHomeScreen requests={requestRows} coupons={couponRows} draft={draft} setDraft={setDraft} setScreen={setAppScreen} openOrder={openOrder} /> : null}
        {screen === "search" ? <ReferenceExploreScreen setScreen={setAppScreen} setDraft={setDraft} /> : null}
        {screen === "newRequest" ? <NewRequestStep draft={draft} setDraft={setDraft} setScreen={setAppScreen} addresses={addressRows} /> : null}
        {screen === "clothIssue" ? <ClothIssueStep draft={draft} setDraft={setDraft} setScreen={setAppScreen} /> : null}
        {screen === "summary" ? <OrderSummaryStep draft={draft} setDraft={setDraft} setScreen={setAppScreen} setSelectedQuote={setSelectedQuote} /> : null}
        {screen === "quotes" ? <QuotesStep draft={draft} selectedQuote={selectedQuote} setSelectedQuote={setSelectedQuote} setScreen={setAppScreen} /> : null}
        {screen === "confirm" && selectedQuote ? <ConfirmOrderStep draft={draft} quote={selectedQuote} coupons={couponRows} setDraft={setDraft} setScreen={setAppScreen} onOrderPlaced={handleOrderPlaced} /> : null}
        {screen === "confirm" && !selectedQuote ? <QuotesStep draft={draft} selectedQuote={selectedQuote} setSelectedQuote={setSelectedQuote} setScreen={setAppScreen} /> : null}
        {screen === "orders" ? <ReferenceOrdersScreen requests={requestRows} openOrder={openOrder} setScreen={setAppScreen} /> : null}
        {screen === "orderDetails" && selectedOrder ? <OrderDetailsScreen request={selectedOrder} coupons={couponRows} setScreen={setAppScreen} onOrderPlaced={handleOrderPlaced} /> : null}
        {screen === "orderDetails" && !selectedOrder ? <ReferenceOrdersScreen requests={requestRows} openOrder={openOrder} setScreen={setAppScreen} /> : null}
        {screen === "profile" ? <ReferenceProfileScreen requests={requestRows} wallet={wallet.data} addresses={addressRows} setScreen={setAppScreen} signOut={() => { void handleSignOut(); }} /> : null}
        {screen === "editProfile" ? <EditProfileScreen setScreen={setAppScreen} /> : null}
        {screen === "support" ? <ContactSupportScreen setScreen={setAppScreen} orders={requestRows} /> : null}
        {screen === "savedAddresses" ? <SavedAddressesScreen setScreen={setAppScreen} /> : null}
        {screen === "wallet" ? <WalletScreen setScreen={setAppScreen} /> : null}
        {screen === "helpCenter" ? <CustomerExtraScreen screen="faq" go={(target) => setAppScreen(target as CustomerScreen)} orders={requestRows} coupons={couponRows} openOrder={openOrder} /> : null}
        {screen === "aboutDarji" ? <AboutDarjiScreen setScreen={setAppScreen} /> : null}
      </div>
      <OrderPlacedModal success={orderSuccess} onClose={() => setOrderSuccess(undefined)} onOrders={() => { setOrderSuccess(undefined); setAppScreen("orders"); }} />
      <BottomNav screen={screen} setScreen={setAppScreen} />
    </main>
  );
}
