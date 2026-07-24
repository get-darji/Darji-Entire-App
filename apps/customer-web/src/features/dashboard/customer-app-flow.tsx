"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
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
  PackageCheck,
  Ruler,
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
import { couponDiscount, couponLabel, deliveryFeeForUrgency, HOME_MEASUREMENT_FEE, getPlatformFee, getSmallOrderFee, quoteEta } from "@/src/lib/pricing";
import type { Address, CheckoutResponse, Coupon, HandoffOtp, NotificationRow, TailoringRequest, TailoringRequestItem, TailorQuote, UploadedMedia, WalletSummary } from "@/src/lib/types";
import { useAuthStore } from "@/src/store/auth-store";

type CustomerScreen = "home" | "newRequest" | "clothIssue" | "summary" | "quotes" | "confirm" | "orders" | "orderDetails" | "profile" | "support" | "editProfile" | "savedAddresses" | "wallet" | "helpCenter" | "aboutDarji";
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
  measurements?: Record<string, string>;
  measurementNotes?: string;
  sampleProvided?: boolean;
  sampleMedia?: LocalMedia[];
  uploadedSampleMedia?: UploadedMedia;
  homeMeasurementBooked?: boolean;
  media: LocalMedia[];
  uploadedMedia: UploadedMedia[];
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
  sampleMedia?: LocalMedia[];
  uploadedSampleMedia?: UploadedMedia;
  homeMeasurementBooked?: boolean;
  pickup: string;
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
  { screen: "newRequest", label: "Book", icon: Plus },
  { screen: "orders", label: "Orders", icon: PackageCheck },
  { screen: "profile", label: "Profile", icon: UserRound }
] as const;

const genderOptions = ["Women", "Men", "Kids", "Unisex"];
const clothTypes = ["Kurta / Salwar", "Saree / Blouse", "Shirt / Pants", "Suit / Blazer", "Dress", "Lehenga", "Jeans", "School Uniform", "Others"];
const workTypes = ["Alteration", "Custom Stitching", "Repair", "Resize", "Blouse Stitching", "Zip / Button Fix", "Fall / Pico", "Embroidery"];
const urgencyOptions = ["Normal (3-5 days)", "Express (1-2 days)", "Instant Delivery"];
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

function makeEmptyDraft(pickup = ""): RequestDraft {
  return {
    description: "",
    pickup,
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
  return measurementGuides[clothType ?? ""] ?? measurementGuides.Others;
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

function clothingItemsForDraft(draft: RequestDraft): ClothingItemDraft[] {
  if (draft.items.length) return draft.items;
  if (!hasActiveItemDraftData(draft)) return [];
  return [draftToClothingItem(draft, "active-item")];
}

function clearActiveClothingItem(draft: RequestDraft): RequestDraft {
  return {
    ...makeEmptyDraft(draft.pickup),
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

function notesForClothingItem(item: Pick<ClothingItemDraft, "measurementNotes" | "sampleProvided" | "homeMeasurementBooked">) {
  return [
    item.measurementNotes?.trim(),
    item.sampleProvided ? "Customer will provide a sample garment as a reference." : undefined,
    item.homeMeasurementBooked ? `Customer requested an at-home measurement visit. Fee: ${formatMoney(HOME_MEASUREMENT_FEE)}.` : undefined
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

function homeMeasurementFeeForItems(items: Array<Pick<ClothingItemDraft | TailoringRequestItem, "homeMeasurementBooked">>) {
  return items.some((item) => item.homeMeasurementBooked) ? HOME_MEASUREMENT_FEE : 0;
}

function orderItemCount(request: TailoringRequest) {
  return Math.max(1, request.items?.length ?? request.itemCount ?? 1);
}

function statusLabel(request: TailoringRequest) {
  if (request.status === "CANCELLED") return "Cancelled";
  if (request.paymentStatus === "PAID" && request.status === "TAILOR_SELECTED") return "Confirmed";
  const value = request.orderStatus ?? request.status;
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function isCancelledOrder(request: TailoringRequest) {
  return request.status === "CANCELLED" || String(request.orderStatus ?? "").toLowerCase().includes("cancel");
}

function isCompletedOrder(request: TailoringRequest) {
  const value = String(request.orderStatus ?? request.status).toLowerCase();
  return value.includes("completed") || value.includes("delivered");
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
  if (status.includes("completed") || status.includes("delivered")) return orderTimeline.length - 1;
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
  onVerified: () => Promise<void>,
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
          await customerApi.verifyCheckout(requestId, payment);
          await onVerified();
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
  const setSession = useAuthStore((state) => state.setSession);
  const sessionNotice = useAuthStore((state) => state.sessionNotice);
  const clearSessionNotice = useAuthStore((state) => state.clearSessionNotice);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [notice, setNotice] = useState<string>();

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
    onSuccess: (data) => {
      setNotice(data.otp ? `Development OTP: ${data.otp}` : "OTP sent to your phone.");
      setStep("otp");
    }
  });

  const verifyOtp = useMutation({
    mutationFn: async () => {
      const parsed = otpSchema.safeParse(otp);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid OTP");
      return customerApi.verifyOtp(phone, parsed.data);
    },
    onSuccess: (session) => setSession(session)
  });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[480px] bg-white border border-[#e6edf5] rounded-[2.5rem] p-8 sm:p-10 shadow-[0_24px_64px_rgba(8,17,31,0.06)]">
        {/* Centered Logo */}
        <div className="flex justify-center mb-6">
          <img src="/darji-loader-transparent.png" alt="Darji Logo" className="h-24 w-auto object-contain" />
        </div>

        {/* Header Text */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-[#08111f] tracking-tight">
            Login to <span className="text-[var(--darji-orange)]">Darji</span>
          </h2>
          <p className="mt-2 text-sm font-semibold text-[var(--darji-muted)]">
            {step === "phone" ? "Enter your mobile number to continue" : "Enter the verification code sent to your phone"}
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
                maxLength={10}
                placeholder="Enter mobile number"
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
                  maxLength={6}
                  placeholder="0 0 0 0 0 0"
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
                disabled={requestOtp.isPending}
                onClick={() => requestOtp.mutate()}
                className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffae3c] to-[#ff8c23] hover:from-[#e59424] hover:to-[#e57710] text-[#08111f] font-black text-base shadow-[0_4px_16px_rgba(255,112,0,0.18)] transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {requestOtp.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  disabled={verifyOtp.isPending}
                  onClick={() => verifyOtp.mutate()}
                  className="h-14 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffae3c] to-[#ff8c23] hover:from-[#e59424] hover:to-[#e57710] text-[#08111f] font-black text-base shadow-[0_4px_16px_rgba(255,112,0,0.18)] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {verifyOtp.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify"}
                </button>
                <button
                  onClick={() => setStep("phone")}
                  className="h-14 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition-all duration-200 cursor-pointer"
                >
                  Change Phone
                </button>
              </div>
            )}
          </div>

          {/* Muted divider & secure indicators */}
          <div className="py-2 flex items-center justify-center gap-3">
            <span className="h-[1px] w-full bg-slate-100" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or</span>
            <span className="h-[1px] w-full bg-slate-100" />
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-500/90 text-[13px] font-semibold">
            <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>We never share your number with anyone.</span>
          </div>

          <div className="pt-4 text-center text-xs font-bold leading-relaxed text-slate-400">
            By continuing, you agree to our{" "}
            <a href="/dashboard?screen=helpCenter" className="text-[var(--darji-orange)] hover:underline">Terms & Conditions</a> and{" "}
            <a href="/dashboard?screen=helpCenter" className="text-[var(--darji-orange)] hover:underline">Privacy Policy</a>.
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
  syncing
}: {
  screen: CustomerScreen;
  setScreen: (screen: CustomerScreen) => void;
  signOut: () => void;
  syncing: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/86 backdrop-blur-xl">
      <div className="shell flex min-h-20 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 rounded-xl">
          <BrandLogo imageClassName="h-[58px] w-auto" />
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {appNav.map((item) => {
            const Icon = item.icon;
            const active = item.screen === screen || (item.screen === "newRequest" && ["clothIssue", "summary", "quotes", "confirm"].includes(screen));
            return (
              <button key={item.screen} onClick={() => setScreen(item.screen)} className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${active ? "bg-[var(--darji-ink)] text-white" : "text-[var(--darji-muted)] hover:bg-[#f8fafc] hover:text-[var(--darji-ink)]"}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {syncing ? (
            <span className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--darji-muted)] shadow-sm sm:inline-flex">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing
            </span>
          ) : null}
          <button onClick={() => setScreen("profile")} className="focus-ring overflow-hidden h-10 w-10 shrink-0 rounded-full bg-[#f8fafc] border border-[#e6edf5] transition hover:border-[var(--darji-orange)] flex items-center justify-center shadow-sm">
            {user ? (
              <img src={getUserAvatarUrl(user)} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-black text-[var(--darji-ink)]">U</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ screen, setScreen }: { screen: CustomerScreen; setScreen: (screen: CustomerScreen) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6edf5] bg-white/94 px-3 py-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {appNav.map((item) => {
          const Icon = item.icon;
          const active = item.screen === screen || (item.screen === "newRequest" && ["clothIssue", "summary", "quotes", "confirm"].includes(screen));
          return (
            <button key={item.screen} onClick={() => setScreen(item.screen)} className={`grid min-h-14 place-items-center rounded-2xl text-xs font-black ${active ? "bg-[var(--darji-ink)] text-white" : "text-[var(--darji-muted)]"}`}>
              <Icon className="h-5 w-5" />
              {item.label}
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
          <h1 className="mt-2 text-3xl font-black">{label}</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--darji-muted)]">Syncing orders, wallet, coupons, addresses, and delivery verification data.</p>
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
        <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Order placed</p>
        <h2 className="mt-2 text-3xl font-black">{success.code}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--darji-muted)]">Your order is confirmed. You can track pickup, delivery OTP, tailor status, and payment details from My Orders.</p>
        <div className="mt-5 grid gap-2">
          {success.total != null ? <SummaryLine label="Amount" value={formatMoney(success.total)} strong /> : null}
          {success.paymentMethod ? <SummaryLine label="Payment" value={success.paymentMethod} /> : null}
        </div>
        <Button className="mt-6 w-full" onClick={onOrders}>Go to My Orders</Button>
      </motion.div>
    </div>
  );
}

function HomeScreen({
  requests,
  wallet,
  draft,
  setScreen,
  openOrder
}: {
  requests: TailoringRequest[];
  wallet?: WalletSummary;
  draft: RequestDraft;
  setScreen: (screen: CustomerScreen) => void;
  openOrder: (request: TailoringRequest) => void;
}) {
  const activeOrders = requests.filter((request) => request.status !== "CANCELLED" && !String(request.orderStatus ?? "").toLowerCase().includes("completed"));
  const hasDraft = hasActiveItemDraftData(draft) || draft.items.length > 0 || Boolean(draft.backendRequestId);
  const nextScreen: CustomerScreen = draft.backendRequestId ? "quotes" : draft.items.length ? "summary" : hasActiveItemDraftData(draft) ? "clothIssue" : "newRequest";

  const bookingStepDescriptions: Record<string, string> = {
    Upload: "Upload photos of your clothing",
    Issue: "Describe the issue or alteration",
    Measurements: "Add measurements or book home visit",
    Quotes: "Get quotes from verified tailors",
    Delivery: "We pickup, stitch & deliver back"
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2.5rem] border border-[#efcf92] bg-gradient-to-br from-[#fffaf0] via-[#ffffff] to-[#fff3e1] p-8 shadow-sm flex flex-col justify-between md:flex-row relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-center max-w-lg">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#ffd5ad]/40 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-orange)]">
              <Sparkles className="h-3.5 w-3.5" /> Doorstep Tailoring
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.1] md:text-5xl text-[var(--darji-ink)]">
              Start with photos. <br />
              <span className="text-[var(--darji-orange)]">Finish with a confirmed tailor.</span>
            </h1>
            <p className="mt-4 text-sm font-semibold text-slate-500 leading-relaxed">
              Upload your clothes, tell us the issue and get quotes from trusted tailors near you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setScreen(nextScreen)} className="h-12 px-6 rounded-2xl text-sm font-black shadow-md bg-[var(--darji-orange)] hover:bg-[#e56500] text-white flex items-center gap-2">
                {hasDraft ? "Continue Booking" : "Book a Service"} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => setScreen("orders")} className="h-12 px-6 rounded-2xl text-sm font-black border border-[#e6edf5] bg-white hover:bg-slate-50 flex items-center gap-2">
                <PackageCheck className="h-4.5 w-4.5 text-[var(--darji-orange)]" /> View Orders
              </Button>
            </div>
          </div>
          <div className="relative mt-8 md:mt-0 flex justify-center items-center h-48 md:h-auto w-full md:w-56 shrink-0 z-0">
            <img src="/hero-tailor-visual.png" alt="Tailoring Visual" className="h-40 w-full object-contain md:absolute md:right-0 md:bottom-0 md:h-48 md:w-auto" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <MetricTile 
            label="Active Orders" 
            value={activeOrders.length} 
            description="Currently in progress" 
            icon={Clock} 
            sparklineColor="text-[#16a34a]"
            sparklinePath="M 0 32 Q 20 18 40 22 T 80 12 T 100 6"
          />
          <MetricTile 
            label="Total Orders" 
            value={requests.length} 
            description="All time orders" 
            icon={PackageCheck} 
            sparklineColor="text-[var(--darji-orange)]"
            sparklinePath="M 0 30 Q 25 35 50 18 T 80 25 T 100 12"
          />
          <MetricTile 
            label="Wallet Balance" 
            value={formatMoney(wallet?.balance)} 
            description="Available credits" 
            icon={Wallet} 
            sparklineColor="text-[var(--darji-blue)]"
            sparklinePath="M 0 20 Q 25 15 50 25 T 100 20"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {homeBookingSteps.map(({ label, icon: Icon }, index) => (
          <div key={label} className="rounded-2xl border border-[#e6edf5] bg-white p-5 transition-all duration-300 hover:shadow-md hover:border-[#ffd5ad]">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff2d8] text-[var(--darji-orange)]">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--darji-orange)]">Step {index + 1}</p>
            <p className="mt-0.5 font-black text-base text-[var(--darji-ink)]">{label}</p>
            <p className="mt-2 text-xs font-semibold text-[var(--darji-muted)] leading-relaxed">
              {bookingStepDescriptions[label]}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Live Orders &bull;</p>
            <h2 className="mt-1 text-3xl font-black">Track your current orders</h2>
          </div>
          <button onClick={() => setScreen("orders")} className="text-sm font-black text-[var(--darji-orange)] flex items-center gap-1 hover:underline">
            See all orders <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <OrdersList requests={requests.slice(0, 3)} openOrder={openOrder} compact />
      </section>
    </div>
  );
}

function MetricTile({ 
  label, 
  value, 
  description, 
  icon: Icon,
  sparklineColor,
  sparklinePath
}: { 
  label: string; 
  value: string | number; 
  description: string; 
  icon: LucideIcon;
  sparklineColor: string;
  sparklinePath: string;
}) {
  return (
    <div className="rounded-[2rem] border border-[#e6edf5] bg-white p-5 flex items-center justify-between shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[#ffb36f]/30">
      <div className="flex gap-4 items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff2d8] text-[var(--darji-orange)]">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">{label}</p>
          <p className="mt-0.5 text-3xl font-black text-[var(--darji-ink)] leading-none">{value}</p>
          <p className="mt-1 text-[10px] font-semibold text-slate-400">{description}</p>
        </div>
      </div>
      <div className="w-24 h-12 shrink-0 self-center">
        <svg className={`w-full h-full ${sparklineColor}`} viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={sparklinePath} />
        </svg>
      </div>
    </div>
  );
}

function MediaPreviewGrid({ local, uploaded }: { local?: LocalMedia[]; uploaded?: UploadedMedia[] }) {
  const items = [
    ...(local ?? []).map((media) => ({ id: media.id, type: media.type, url: media.url, label: media.name })),
    ...(uploaded ?? []).map((media) => ({ id: media.publicId, type: media.resourceType, url: media.url, label: media.originalName ?? "Uploaded media" }))
  ];
  if (!items.length) return null;
  return (
    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
      {items.slice(0, MAX_MEDIA_FILES).map((media) => (
        <div key={media.id} className="aspect-square overflow-hidden rounded-2xl border border-[#e6edf5] bg-[#f8fafc]">
          {media.type === "video" ? (
            <video className="h-full w-full object-cover" src={media.url} muted />
          ) : (
            <img className="h-full w-full object-cover" src={media.url} alt={media.label} />
          )}
        </div>
      ))}
    </div>
  );
}

function AppDownloadSidebarCard() {
  const handleStoreClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="premium-card rounded-[2rem] p-6 relative overflow-hidden bg-gradient-to-br from-[#ffffff] via-[#fffbf7] to-[#fff3e1] border border-[#fbd38d]/40 shadow-sm flex flex-col gap-6 text-left">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,112,0,0.1),transparent_70%)]" />

      <div>
        <h3 className="text-xl font-black text-[var(--darji-ink)] leading-snug">
          Book faster. <br />
          Track easier. <br />
          <span className="text-[var(--darji-orange)]">Experience better.</span>
        </h3>
        <p className="mt-2 text-xs font-semibold text-[var(--darji-muted)] leading-relaxed">
          Download the Darji app and manage your orders on the go.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 mt-2">
        <div className="relative h-44 w-24 shrink-0 overflow-hidden rounded-[20px] border-[3px] border-[#222222] bg-[#0c101a] shadow-[0_12px_28px_rgba(0,0,0,0.25)] flex flex-col">
          <div className="absolute left-1/2 top-0 h-2 w-10 -translate-x-1/2 rounded-b-md bg-[#222222] z-20" />
          <div className="flex h-full w-full flex-col bg-[#faf9f6] p-1.5 pt-3.5 text-[9px] font-bold text-[var(--darji-ink)] select-none">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="font-black text-[var(--darji-orange)] scale-90">Darji</span>
              <div className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
            </div>
            <div className="mt-2 rounded-md bg-white border border-slate-100 p-1 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
              <p className="text-[6px] font-black text-[var(--darji-orange)] tracking-wider uppercase">My Orders</p>
              <div className="mt-1 h-3 rounded bg-slate-100 flex items-center justify-between px-1">
                <span className="text-[5px] text-slate-500">REQ-A82F1</span>
                <span className="text-[5px] text-[#16a34a]">Active</span>
              </div>
            </div>
            <div className="mt-2 flex-1 rounded-md bg-[#fffcf8] border border-orange-50/50 overflow-hidden flex items-center justify-center p-1 relative">
              <svg className="w-full h-full text-[var(--darji-orange)]/40" viewBox="0 0 40 30" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M 5 25 Q 15 25 20 10 T 35 15" strokeDasharray="1 1" />
                <circle cx="5" cy="25" r="1.5" fill="var(--darji-orange)" />
                <circle cx="35" cy="15" r="1.5" fill="var(--darji-orange)" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 flex-1 text-center select-none">
          <svg className="w-16 h-16 border border-[#e6edf5] p-1.5 rounded-2xl bg-white shadow-sm text-[var(--darji-ink)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 3h6v6H3zM15 3h6v6H3zM3 15h6v6H3z" fill="currentColor" />
            <path d="M15 15h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z" fill="currentColor" />
            <path d="M7 7h.01M17 7h.01M7 17h.01" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1 scale-90">Or Scan To Get</span>
          <span className="text-[9px] font-black text-[var(--darji-orange)] uppercase tracking-wider leading-none">The Darji App</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <button 
          onClick={() => handleStoreClick("https://play.google.com/store")}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#08111f] text-white hover:bg-slate-900 transition-colors shadow-sm text-xs font-black"
        >
          Get it on Google Play
        </button>
        <button 
          onClick={() => handleStoreClick("https://apps.apple.com")}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#08111f] text-white hover:bg-slate-900 transition-colors shadow-sm text-xs font-black"
        >
          Download on App Store
        </button>
      </div>
    </div>
  );
}

function AppDownloadBanner() {
  const handleStoreClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0c101a] p-8 md:p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 mt-8 text-left">
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,112,0,0.15),transparent_70%)]" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,112,0,0.08),transparent_70%)]" />

      <div className="relative z-10 shrink-0 flex gap-5 items-center">
        <div className="relative h-48 w-28 shrink-0 overflow-hidden rounded-[22px] border-[4px] border-[#222222] bg-[#0c101a] shadow-2xl flex flex-col">
          <div className="absolute left-1/2 top-0 h-2.5 w-12 -translate-x-1/2 rounded-b-md bg-[#222222] z-20" />
          <div className="flex h-full w-full flex-col bg-[#faf9f6] p-2 pt-4 text-[9px] font-bold text-[var(--darji-ink)] select-none">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="font-black text-[var(--darji-orange)]">Darji</span>
              <div className="h-2 w-2 rounded-full bg-[#16a34a]" />
            </div>
            <div className="mt-2.5 rounded bg-white p-1 border border-slate-100 shadow-sm flex flex-col gap-1">
              <span className="text-[6px] text-slate-400">NEXT PICKUP</span>
              <span className="text-[7px] text-[#090d16] font-black leading-none">12 Jul, 1:00 PM</span>
            </div>
            <div className="mt-2 flex-1 rounded bg-[#fffaf5] border border-orange-50/50 flex items-center justify-center p-1.5">
              <svg className="w-full h-full text-[var(--darji-orange)]" viewBox="0 0 40 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M 5 22 C 15 22 25 5 35 12" strokeDasharray="1.5 1.5" />
                <circle cx="5" cy="22" r="2.2" fill="var(--darji-orange)" stroke="white" strokeWidth="1" />
                <circle cx="35" cy="12" r="2.2" fill="var(--darji-orange)" stroke="white" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <svg className="w-16 h-16 border border-slate-800 p-1.5 rounded-2xl bg-[#0c101a] text-white shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 3h6v6H3zM15 3h6v6H3zM3 15h6v6H3z" fill="currentColor" />
            <path d="M15 15h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z" fill="currentColor" />
            <path d="M7 7h.01M17 7h.01M7 17h.01" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Scan to Download</span>
        </div>
      </div>

      <div className="relative z-10 text-left flex-1 md:max-w-md">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--darji-orange)]">
          Darji Mobile Experience
        </span>
        <h2 className="mt-3 text-2xl font-black text-white leading-tight">
          Book faster. Track easier. Experience better.
        </h2>
        <p className="mt-2 text-xs font-semibold text-slate-400 leading-relaxed">
          Download the Darji app and manage every tailoring order from your doorstep. Check tailor quotes, track live progress, and manage measurements.
        </p>
      </div>

      <div className="relative z-10 shrink-0 flex flex-col gap-2 w-full md:w-48">
        <button 
          onClick={() => handleStoreClick("https://play.google.com/store")}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 text-white border border-slate-800 hover:bg-slate-800 transition-colors shadow-sm text-xs font-black"
        >
          Get it on Google Play
        </button>
        <button 
          onClick={() => handleStoreClick("https://apps.apple.com")}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 text-white border border-slate-800 hover:bg-slate-800 transition-colors shadow-sm text-xs font-black"
        >
          Download on App Store
        </button>
      </div>
    </div>
  );
}

function UploadBox({
  label,
  helper,
  multiple = true,
  onFiles,
  local,
  uploaded
}: {
  label: string;
  helper: string;
  multiple?: boolean;
  onFiles: (media: LocalMedia[]) => void;
  local?: LocalMedia[];
  uploaded?: UploadedMedia[];
}) {
  return (
    <div>
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ffd5ad] bg-[#fffaf5]/50 px-4 py-6 text-center text-sm font-black text-[var(--darji-muted)] hover:bg-[#fffaf0] transition-colors duration-200">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#fff2d8] text-[var(--darji-orange)] mb-3">
          <UploadCloud className="h-6 w-6" />
        </div>
        <span className="text-[var(--darji-ink)] text-base font-black">{label}</span>
        <span className="mt-1.5 text-xs font-semibold text-slate-500">{helper}</span>
        <input className="hidden" type="file" multiple={multiple} accept="image/*,video/*" onChange={(event) => onFiles(mediaFromFiles(event.target.files))} />
      </label>
      <MediaPreviewGrid local={local} uploaded={uploaded} />
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

  const upload = useMutation({
    mutationFn: () => customerApi.uploadMedia(draft.media.map((media) => media.file)),
    onSuccess: (uploaded) => {
      setDraft((current) => ({ ...current, uploadedMedia: uploaded }));
      setScreen("clothIssue");
    }
  });

  function continueToIssue() {
    setFormError(undefined);
    if (!draft.description.trim() || draft.description.trim().length < 10) {
      setFormError("Add at least 10 characters about the clothing issue.");
      return;
    }
    if (!draft.pickup.trim() || draft.pickup.trim().length < 8) {
      setFormError("Add a pickup address before continuing.");
      return;
    }
    if (!draft.media.length && !draft.uploadedMedia.length) {
      setFormError("Upload at least one clothing photo or video.");
      return;
    }
    if (draft.uploadedMedia.length || !draft.media.length) {
      setScreen("clothIssue");
      return;
    }
    upload.mutate();
  }

  function useCurrentLocation() {
    setLocationStatus("Locating...");
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          setLocationStatus("Fetching address...");
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
            headers: {
              "Accept-Language": "en"
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setDraft((current) => ({ ...current, pickup: data.display_name }));
              setLocationStatus("Location added.");
              return;
            }
          }
          throw new Error("Geocoding failed");
        } catch (err) {
          const fallbackAddress = `Sector 62, Noida, Uttar Pradesh, 201301 (based on Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)})`;
          setDraft((current) => ({ ...current, pickup: fallbackAddress }));
          setLocationStatus("Location added (estimated).");
        }
      },
      () => setLocationStatus("Could not read location.")
    );
  }

  return (
    <FlowLayout screen="newRequest" title="Start Booking" onBack={() => setScreen("home")} setScreen={setScreen}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] text-left">
        <section className="premium-card rounded-[2rem] p-6">
          <div className="grid gap-5">
            <div className="flex flex-col gap-1.5 text-left mb-2">
              <h3 className="text-lg font-black text-[var(--darji-ink)]">What's the issue with your clothing?</h3>
              <p className="text-sm font-semibold text-[var(--darji-muted)]">Describe the issue or alteration you need.</p>
            </div>
            
            <div className="relative">
              <textarea
                className={`${inputClass} min-h-32 py-4 pr-12`}
                value={draft.description}
                maxLength={300}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Example: sleeves are loose, waist needs fitting, zip repair, or custom stitching details."
              />
              <div className="text-right text-xs font-bold text-slate-400 mt-1.5">
                {draft.description.length}/300
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-left mt-2">
              <h3 className="text-lg font-black text-[var(--darji-ink)]">Pickup Address</h3>
              <p className="text-sm font-semibold text-[var(--darji-muted)]">Where should we pick up your clothes?</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                  <MapPin className="h-5 w-5 text-[var(--darji-orange)]" />
                </span>
                <input 
                  className={`${inputClass} pl-12 h-14 py-0`}
                  value={draft.pickup}
                  onChange={(event) => setDraft((current) => ({ ...current, pickup: event.target.value }))}
                  placeholder="House, street, landmark, city, pincode"
                />
              </div>
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <button 
                  type="button" 
                  onClick={useCurrentLocation} 
                  className="h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-[#e6edf5] bg-white px-4 text-xs font-black text-[var(--darji-ink)] hover:bg-slate-50 transition-colors"
                >
                  <LocateFixed className="h-4.5 w-4.5 text-[var(--darji-orange)]" />
                  Use Current Location
                </button>
                {locationStatus ? <p className="text-xs font-bold text-[var(--darji-muted)]">{locationStatus}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.slice(0, 4).map((address) => (
                <button key={address.id} onClick={() => setDraft((current) => ({ ...current, pickup: addressText(address) }))} className="rounded-2xl border border-[#e6edf5] bg-white p-4 text-left text-sm font-bold hover:border-[#ffb36f] transition-all">
                  <span className="block font-black">{address.label ?? "Saved address"}</span>
                  <span className="mt-1 line-clamp-2 block text-[var(--darji-muted)] font-semibold text-xs leading-normal">{addressText(address)}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 text-left mt-2">
              <h3 className="text-lg font-black text-[var(--darji-ink)]">Upload photos or videos</h3>
              <p className="text-sm font-semibold text-[var(--darji-muted)]">Help tailors understand the issue better.</p>
            </div>

            <UploadBox
              label={draft.uploadedMedia.length || draft.media.length ? "Replace clothing media" : "Upload photos or videos of the issue"}
              helper={`Up to ${MAX_MEDIA_FILES} files • JPG, PNG, MP4 • Max 20MB each`}
              local={draft.media}
              uploaded={draft.uploadedMedia}
              onFiles={(media) => setDraft((current) => ({ ...current, media, uploadedMedia: [] }))}
            />
            
            {formError || upload.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{formError ?? errorMessage(upload.error)}</p> : null}
            
            <div className="flex flex-col gap-3 sm:flex-row mt-4">
              <Button className="h-12 px-6 rounded-2xl text-sm font-black bg-[var(--darji-orange)] hover:bg-[#e56500] text-white flex items-center justify-center gap-2" loading={upload.isPending} onClick={continueToIssue}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
              {draft.items.length ? <Button className="h-12 px-6 rounded-2xl text-sm font-black border border-[#e6edf5] bg-white hover:bg-slate-50 text-[var(--darji-ink)]" variant="secondary" onClick={() => setScreen("summary")}>Back to Summary</Button> : null}
            </div>
          </div>
        </section>
        <aside className="grid content-start gap-4">
          <MiniSummary draft={draft} />
          <div className="rounded-[2rem] border border-[#e6edf5] bg-white p-5 text-left">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">Saved in this order</p>
            <p className="mt-2 text-3xl font-black text-[var(--darji-ink)]">{draft.items.length}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--darji-muted)]">clothing item{draft.items.length === 1 ? "" : "s"}</p>
          </div>
          <AppDownloadSidebarCard />
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
    if (!draft.gender || !draft.clothType || !draft.workType || !draft.urgency) {
      setFormError("Select gender, cloth type, work type, and urgency.");
      return;
    }
    const hasMeasurement = showManual || draft.sampleProvided || draft.homeMeasurementBooked;
    if (!hasMeasurement) {
      setFormError("Please select at least one measurement option: Enter manual measurements, Send a sample, or Book home measurement.");
      return;
    }
    if (!draft.description.trim() || (!draft.uploadedMedia.length && !draft.media.length)) {
      setFormError("The item needs description and uploaded clothing media.");
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
    <FlowLayout screen="clothIssue" title="Cloth Details" onBack={() => setScreen("newRequest")} setScreen={setScreen}>
      <div className="grid gap-6 xl:grid-cols-[1fr_370px] text-left">
        <section className="premium-card rounded-[2rem] p-6">
          <div className="grid gap-6">
            <ChipGroup label="Gender" options={genderOptions} value={draft.gender} onChange={(value) => setDraft((current) => ({ ...current, gender: value }))} />
            <ChipGroup label="Cloth Type" options={clothTypes} value={draft.clothType} onChange={(value) => setDraft((current) => ({ ...current, clothType: value, measurements: {} }))} />
            <ChipGroup label="Work Type" options={workTypes} value={draft.workType} onChange={(value) => setDraft((current) => ({ ...current, workType: value }))} />
            <ChipGroup label="Urgency" options={urgencyOptions} value={draft.urgency} onChange={(value) => setDraft((current) => ({ ...current, urgency: value }))} />

            {draft.workType === "Custom Stitching" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm font-semibold flex flex-col gap-2">
                <p>⚠️ If the cloth material provided is less than the required amount, the order will be cancelled and the full delivery fee is charged.</p>
                <button
                  type="button"
                  onClick={() => setShowSizingModal(true)}
                  className="text-[var(--darji-orange)] hover:underline text-left font-bold text-xs"
                >
                  View Cloth Requirement Guide
                </button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleTile
                checked={draft.sampleProvided === true}
                title="Sample Garment"
                copy="Our tailor will use an existing fit reference for accuracy."
                icon={Shirt}
                onChange={(checked) => setDraft((current) => ({ ...current, sampleProvided: checked, sampleMedia: checked ? current.sampleMedia : [], uploadedSampleMedia: checked ? current.uploadedSampleMedia : undefined }))}
              />
              <ToggleTile
                checked={draft.homeMeasurementBooked === true}
                title="Home Measurement"
                copy={`Our tailor will visit your home to take measurements. (${formatMoney(HOME_MEASUREMENT_FEE)} visit)`}
                icon={Home}
                onChange={(checked) => setDraft((current) => ({ ...current, homeMeasurementBooked: checked }))}
              />
            </div>

            {draft.sampleProvided ? (
              <UploadBox
                label={draft.uploadedSampleMedia || draft.sampleMedia?.length ? "Replace sample photo" : "Upload sample photo"}
                helper="One reference image is enough"
                multiple={false}
                local={draft.sampleMedia}
                uploaded={draft.uploadedSampleMedia ? [draft.uploadedSampleMedia] : []}
                onFiles={(media) => setDraft((current) => ({ ...current, sampleMedia: media.slice(0, 1), uploadedSampleMedia: undefined }))}
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
                  <span className="block font-black text-[#08111f]">Enter manually measurements?</span>
                  <span className="mt-0.5 block text-xs font-semibold text-[var(--darji-muted)]">You can enter your measurements manually if you already have them.</span>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 transition-all duration-200 ${showManual ? "text-[var(--darji-orange)] rotate-90" : "text-slate-400"}`} />
            </button>

            {showManual && (
              <div className="grid gap-5 border-t border-[#edf1f5] pt-5">
                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">Manual Measurements (cm)</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {guide.fields.map((field) => (
                      <FieldShell key={field} label={field}>
                        <input
                          className={inputClass}
                          inputMode="decimal"
                          placeholder="cm"
                          value={draft.measurements?.[field] ?? ""}
                          onChange={(event) => setDraft((current) => ({ ...current, measurements: { ...(current.measurements ?? {}), [field]: event.target.value } }))}
                        />
                      </FieldShell>
                    ))}
                  </div>
                </div>

                <FieldShell label="Measurement Notes">
                  <textarea
                    className={`${inputClass} min-h-24 py-4`}
                    value={draft.measurementNotes ?? ""}
                    onChange={(event) => setDraft((current) => ({ ...current, measurementNotes: event.target.value }))}
                    placeholder="Fit preference, loose/tight notes, old garment reference, or special instructions."
                  />
                </FieldShell>
              </div>
            )}

            {formError ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{formError}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row mt-4">
              <Button className="h-12 px-6 rounded-2xl text-sm font-black bg-[var(--darji-orange)] hover:bg-[#e56500] text-white flex items-center justify-center gap-2" loading={savingAction === "summary"} onClick={() => void saveItem("summary")}>
                Review Order <ChevronRight className="h-4 w-4" />
              </Button>
              <Button className="h-12 px-6 rounded-2xl text-sm font-black border border-[#e6edf5] bg-white hover:bg-slate-50 text-[var(--darji-ink)] flex items-center justify-center gap-2" variant="secondary" loading={savingAction === "another"} onClick={() => void saveItem("another")}>
                <Plus className="h-4 w-4 text-[var(--darji-orange)]" /> Add Another Cloth
              </Button>
            </div>
          </div>
        </section>
      </div>

      {showSizingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left border border-[var(--darji-line)]">
            <h3 className="text-xl font-black text-[var(--darji-ink)] mb-4">Cloth Requirement Guide</h3>
            <p className="text-sm font-semibold text-[var(--darji-muted)] mb-4">
              Refer to the guidelines below for minimum cloth length (in meters) required by sizing for stitching.
            </p>
            <div className="overflow-hidden rounded-2xl border border-[var(--darji-line)] mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f6f8fb] text-[var(--darji-ink)] font-black border-b border-[var(--darji-line)]">
                    <th className="px-4 py-3 text-left">Garment</th>
                    <th className="px-3 py-3 text-center">S</th>
                    <th className="px-3 py-3 text-center">M</th>
                    <th className="px-3 py-3 text-center">L</th>
                    <th className="px-3 py-3 text-center">XL</th>
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
                Close Guide
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
    <div className="grid gap-6">
      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[var(--darji-muted)] shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Book service</p>
            <h1 className="mt-1 text-4xl font-black">{title}</h1>
          </div>
        </div>
        <StepProgress screen={screen} setScreen={setScreen} />
      </div>
      {children}
    </div>
  );
}

function ChipGroup({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange: (value: string) => void }) {
  return (
    <div className="text-left">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">{label}</p>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => {
          const active = value === option;
          return (
            <button 
              key={option} 
              type="button"
              onClick={() => onChange(option)} 
              className={`rounded-full border px-4 py-2 text-xs font-black transition-all duration-200 ${
                active 
                  ? "border-[var(--darji-orange)] bg-[#fff7e8] text-[var(--darji-orange)] shadow-[0_2px_8px_rgba(255,112,0,0.12)] scale-105" 
                  : "border-[#e6edf5] bg-white text-slate-500 hover:border-[#ffd5ad] hover:text-[var(--darji-ink)] hover:bg-[#fffcf7]/50"
              }`}
            >
              {option}
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
      <p className="flex items-center gap-2 font-black"><Ruler className="h-5 w-5 text-[var(--darji-orange)]" /> {clothType ?? "Measurement"} guide</p>
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
      <p className="font-black">Order summary</p>
      <div className="mt-4 grid gap-2">
        <SummaryLine label="Clothing items" value={String(Math.max(items.length, draft.items.length))} />
        <SummaryLine label="Urgency" value={draft.urgency ?? "Not selected"} />
        <SummaryLine label="Home measurement" value={formatMoney(homeMeasurementFeeForItems(items))} />
        <SummaryLine label="Delivery starts" value={formatMoney(deliveryFeeForUrgency(draft.urgency ?? ""))} />
      </div>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm ${strong ? "font-black" : "font-bold"}`}>
      <span className="text-[var(--darji-muted)]">{label}</span>
      <span className="text-right text-[var(--darji-ink)]">{value}</span>
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
      const incomplete = items.find((item) => !item.description.trim() || !item.clothType || !item.workType || !item.uploadedMedia.length);
      if (incomplete) throw new Error(`${clothingItemTitle(incomplete)} needs photos, description, cloth type, and work type.`);
      const itemPayloads = items.map(payloadForClothingItem);
      const primary = itemPayloads[0];
      return customerApi.createTailoringRequest({
        ...primary,
        urgency: draft.urgency,
        pickupAddress: draft.pickup,
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
    <FlowLayout screen="summary" title="Order Summary" onBack={() => setScreen("clothIssue")} setScreen={setScreen}>
      <div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] text-left">
          <section className="grid gap-4">
            {items.length ? (
              items.map((item, index) => <DraftItemCard key={item.id} item={item} index={index} onEdit={() => editItem(item)} onDelete={() => deleteItem(item.id)} />)
            ) : (
              <EmptyState title="No clothing items" copy="Add one cloth before requesting quotes." />
            )}
            <div className="flex flex-col gap-3 sm:flex-row mt-4">
              <Button className="h-12 px-6 rounded-2xl text-sm font-black border border-[#e6edf5] bg-white hover:bg-slate-50 text-[var(--darji-ink)] flex items-center justify-center gap-2" variant="secondary" onClick={() => { setDraft((current) => clearActiveClothingItem({ ...current, items })); setScreen("newRequest"); }}>
                <Plus className="h-4 w-4 text-[var(--darji-orange)]" /> Add Another Cloth
              </Button>
              <Button className="h-12 px-6 rounded-2xl text-sm font-black bg-[var(--darji-orange)] hover:bg-[#e56500] text-white flex items-center justify-center gap-2" loading={createRequest.isPending} disabled={!items.length} onClick={() => createRequest.mutate()}>
                Get Quotes <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {createRequest.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(createRequest.error)}</p> : null}
          </section>
          <aside className="grid content-start gap-4">
            <div className="rounded-[2rem] border border-[#e6edf5] bg-white p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">Pickup</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--darji-ink)]">{draft.pickup || "Not selected"}</p>
            </div>
            <MiniSummary draft={draft} />
          </aside>
        </div>
        <AppDownloadBanner />
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
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-orange)]">Item {index + 1}</p>
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
                Sample
              </span>
            )}
            {item.homeMeasurementBooked && (
              <span className="inline-flex rounded-full bg-[#ecfdf5] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#10b981] border border-[#10b981]/15 shadow-sm">
                Home Visit
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
    enabled: Boolean(draft.backendRequestId)
  });
  const visibleQuotes = (quotes.data ?? []).filter((quote) => ["SUBMITTED", "RESERVED", "ACCEPTED"].includes(quote.status));

  return (
    <FlowLayout screen="quotes" title="Tailor Quotes" onBack={() => setScreen("summary")} setScreen={setScreen}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] text-left">
        <section className="grid gap-5">
          <div className="flex flex-col justify-between gap-4 rounded-[2rem] border border-[#e6edf5] bg-white p-5 sm:flex-row sm:items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-base text-[var(--darji-ink)]">{quotes.isLoading ? "Checking tailor quotes" : `${visibleQuotes.length} tailor quote${visibleQuotes.length === 1 ? "" : "s"}`}</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--darji-muted)]">{clothingItemsForDraft(draft).length} clothing item{clothingItemsForDraft(draft).length === 1 ? "" : "s"}</p>
              </div>
            </div>
            <Button variant="secondary" className="h-11 px-4 rounded-xl text-xs font-black border border-[#e6edf5] bg-white hover:bg-slate-50 flex items-center gap-2" loading={quotes.isFetching} onClick={() => void quotes.refetch()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {!visibleQuotes.length && !quotes.isLoading ? (
            <EmptyState title="Waiting for tailor quotes" copy="Your request is open. Quotes will appear here when verified tailors respond." />
          ) : null}

          <div className="grid gap-4">
            {visibleQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} selected={selectedQuote?.id === quote.id} onSelect={() => setSelectedQuote(quote)} />)}
          </div>

          {quotes.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(quotes.error)}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row mt-4">
            <Button className="h-12 px-6 rounded-2xl text-sm font-black bg-[var(--darji-orange)] hover:bg-[#e56500] text-white flex items-center justify-center gap-2" disabled={!selectedQuote} onClick={() => setScreen("confirm")}>
              Confirm This Tailor <ChevronRight className="h-4 w-4" />
            </Button>
            <Button className="h-12 px-6 rounded-2xl text-sm font-black border border-[#e6edf5] bg-white hover:bg-slate-50 text-[var(--darji-ink)] flex items-center justify-center gap-2" variant="secondary" onClick={() => setScreen("orders")}>View Orders</Button>
          </div>
        </section>
        <aside className="grid content-start gap-4">
          <MiniSummary draft={draft} />
          <div className="premium-card rounded-[2rem] p-5 flex items-start gap-3 text-left">
            <div className="h-10 w-10 rounded-xl bg-[#ecfdf5] text-[#10b981] flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[var(--darji-ink)]">Safe & Secure</h4>
              <p className="text-xs font-semibold text-[var(--darji-muted)] mt-0.5 leading-normal">Your payment is safe and secure with us.</p>
            </div>
          </div>
          <AppDownloadSidebarCard />
        </aside>
      </div>
    </FlowLayout>
  );
}

function QuoteCard({ quote, selected, onSelect }: { quote: TailorQuote; selected: boolean; onSelect: () => void }) {
  return (
    <button 
      onClick={onSelect} 
      className={`rounded-[2rem] border p-6 text-left transition-all duration-300 w-full flex flex-col gap-5 ${
        selected 
          ? "border-[var(--darji-orange)] bg-[#fff7e8] shadow-[0_18px_50px_rgba(255,112,0,0.14)] scale-[1.01]" 
          : "border-[#e6edf5] bg-white hover:border-[#ffb36f]"
      }`}
    >
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
                Verified
              </span>
            </div>
            <span className="mt-1 flex items-center gap-1 text-xs font-bold text-[var(--darji-muted)]">
              <Star className="h-4 w-4 fill-[var(--darji-orange)] text-[var(--darji-orange)]" />
              <strong className="text-[var(--darji-ink)]">5.0</strong> (120+ reviews)
            </span>
          </div>
        </div>
        <span className="text-3xl font-black text-[var(--darji-orange)] shrink-0">{formatMoney(quote.price)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#edf1f5] pt-5 w-full">
        <div className="rounded-xl bg-[#f8fafc] p-3 text-xs font-bold text-center flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ETA</p>
          <p className="mt-1 font-black text-[var(--darji-ink)]">{quoteEta(quote)}</p>
        </div>
        <div className="rounded-xl bg-[#f8fafc] p-3 text-xs font-bold text-center flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pickup</p>
          <p className="mt-1 font-black text-[var(--darji-ink)]">{quote.pickupIncluded === false ? "Extra" : "Included"}</p>
        </div>
        <div className="rounded-xl bg-[#f8fafc] p-3 text-xs font-bold text-center flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quality</p>
          <p className="mt-1 font-black text-[var(--darji-ink)]">Premium</p>
        </div>
        <div className="rounded-xl bg-[#f8fafc] p-3 text-xs font-bold text-center flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Communication</p>
          <p className="mt-1 font-black text-[var(--darji-ink)]">Excellent</p>
        </div>
      </div>
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

  const faresQuery = useQuery({ queryKey: ["customer", "delivery-fares"], queryFn: customerApi.getDeliveryFares });
  const fares = faresQuery.data;

  const getCustomerDeliveryFee = (urgency: string) => {
    const value = String(urgency ?? "").toLowerCase();
    if (value.includes("instant")) return fares?.instant?.customerCharge ?? 50;
    if (value.includes("express") || value.includes("urgent")) return fares?.express?.customerCharge ?? 40;
    return fares?.normal?.customerCharge ?? 30;
  };

  const items = clothingItemsForDraft(draft);
  const deliveryFee = getCustomerDeliveryFee(draft.urgency ?? "");
  const homeFee = homeMeasurementFeeForItems(items);
  const platformFee = getPlatformFee(Number(quote.price ?? 0));
  const smallOrderFee = getSmallOrderFee(Number(quote.price ?? 0));
  const subtotal = Number(quote.price ?? 0) + deliveryFee + platformFee + smallOrderFee + homeFee;
  const discount = couponDiscount(selectedCoupon, subtotal);
  const total = Math.max(subtotal - discount, 0);

  const checkout = useMutation({
    onMutate: () => {
      setVerifyingPayment(true);
    },
    mutationFn: () => {
      if (!draft.backendRequestId) throw new Error("Request ID missing.");
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
      alert(errorMessage(err));
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
          async () => {
            await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
            setDraft(makeEmptyDraft(defaultPickup));
            setVerifyingPayment(false);
            onOrderPlaced(response.request);
          },
          (err) => {
            setVerifyingPayment(false);
            alert(errorMessage(err));
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
    const amount = couponDiscount(coupon, subtotal);
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
    <FlowLayout screen="confirm" title="Confirm Order" onBack={() => setScreen("quotes")} setScreen={setScreen}>
      <div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] text-left">
          <section className="grid gap-5">
            <div className="premium-card rounded-[2rem] p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-orange)]">Selected tailor</p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--darji-ink)] text-sm font-black text-white">{quoteInitials(quote)}</span>
                  <div>
                    <h2 className="text-xl font-black text-[var(--darji-ink)]">{quote.tailor?.shopName ?? "Verified Tailor"}</h2>
                    <p className="text-xs font-bold text-[var(--darji-muted)] mt-0.5">ETA {quoteEta(quote)} &bull; Verified</p>
                  </div>
                </div>
                <p className="text-3xl font-black text-[var(--darji-orange)]">{formatMoney(quote.price)}</p>
              </div>
            </div>

            <div className="premium-card rounded-[2rem] p-6">
              <p className="text-sm font-black text-[var(--darji-ink)]">Payment Method</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                        <span className="block font-black text-base text-[var(--darji-ink)] leading-snug">{method}</span>
                        <span className="mt-1 block text-[10px] font-semibold text-[var(--darji-muted)] leading-normal">
                          {method === "ONLINE" ? "Cards, Netbanking, Wallets" : method === "UPI" ? "Pay using any UPI app" : "Pay on pickup"}
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

            <div className="premium-card rounded-[2rem] p-6">
              <p className="text-sm font-black text-[var(--darji-ink)]">Coupons & Offers</p>
              <div className="mt-4 flex gap-3 relative">
                <input className={`${inputClass} h-12 py-0`} value={couponInput} onChange={(event) => setCouponInput(event.target.value.toUpperCase())} placeholder="Enter coupon code" />
                <Button className="h-12 px-6 rounded-2xl text-xs font-black border border-[#e6edf5] bg-white text-[var(--darji-ink)] hover:bg-[#fff7e8]" variant="secondary" onClick={() => applyCoupon()}>Apply</Button>
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
                      <span className="block text-[10px] font-semibold text-[var(--darji-muted)] mt-1">{couponLabel(selectedCoupon)} applied</span>
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
            <div className="premium-card rounded-[2rem] p-6 text-left">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">Payment Summary</p>
              <div className="mt-4 grid gap-3">
                <SummaryLine label="Tailor quote" value={formatMoney(quote.price)} />
                <SummaryLine label="Delivery" value={formatMoney(deliveryFee)} />
                <SummaryLine label="Platform fee" value={formatMoney(platformFee)} />
                {smallOrderFee ? <SummaryLine label="Small order fee" value={formatMoney(smallOrderFee)} /> : null}
                {homeFee ? <SummaryLine label="Home measurement" value={formatMoney(homeFee)} /> : null}
                {discount ? <SummaryLine label="Discount" value={`-${formatMoney(discount)}`} /> : null}
                <SummaryLine label="Total (incl. taxes)" value={formatMoney(total)} strong />
                {checkout.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(checkout.error)}</p> : null}
                <Button className="h-14 rounded-2xl text-base w-full mt-4 bg-[var(--darji-orange)] hover:bg-[#e56500] text-white font-black" loading={checkout.isPending} onClick={() => checkout.mutate()}>
                  Pay {paymentMethod} {formatMoney(total)}
                </Button>
                <p className="mt-2 text-center text-[10px] font-black text-slate-400 flex items-center justify-center gap-1 uppercase tracking-wider select-none">
                  <CheckCircle2 className="h-4 w-4 text-[#16a34a]" /> 100% Secure Payments
                </p>
              </div>
            </div>

            <div className="premium-card rounded-[2rem] p-6 text-left">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">Items in this order</p>
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
                        <h4 className="text-sm font-black text-[var(--darji-ink)] leading-snug truncate">Item {index + 1}</h4>
                        <p className="text-[10px] font-semibold text-[var(--darji-muted)] mt-0.5 truncate">{item.clothType || "Clothing"} &bull; {item.workType || "Alteration"}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-400 shrink-0 uppercase tracking-wider bg-[#f8fafc] px-2 py-1 rounded-md">Qty: 1</span>
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
              <h4 className="text-xs font-black text-[var(--darji-ink)]">Verified Tailors</h4>
              <p className="text-[10px] font-semibold text-[var(--darji-muted)]">Background checked</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[var(--darji-ink)]">On-time Delivery</h4>
              <p className="text-[10px] font-semibold text-[var(--darji-muted)]">Always on schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[var(--darji-ink)]">Secure Payments</h4>
              <p className="text-[10px] font-semibold text-[var(--darji-muted)]">100% safe & secure</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#fff2d8] text-[var(--darji-orange)] flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[var(--darji-ink)]">Satisfaction Guarantee</h4>
              <p className="text-[10px] font-semibold text-[var(--darji-muted)]">Love it or we'll fix it</p>
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
            <h3 className="text-xl font-black text-[#08111f]">Verifying Payment</h3>
            <p className="text-xs font-semibold leading-relaxed text-[var(--darji-muted)]">
              We are fetching your payment status. Please do not refresh the page or click back.
            </p>
          </div>
        </div>
      )}
    </FlowLayout>
  );
}

function OrdersScreen({ requests, openOrder, setScreen }: { requests: TailoringRequest[]; openOrder: (request: TailoringRequest) => void; setScreen: (screen: CustomerScreen) => void }) {
  const user = useAuthStore((state) => state.user);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [latestFirst, setLatestFirst] = useState(true);
  const active = requests.filter(isActiveOrder);
  const waiting = requests.filter(isWaitingPickupOrder);
  const completed = requests.filter(isCompletedOrder);
  const cancelled = requests.filter(isCancelledOrder);
  const filtered = requests.filter((request) => {
    if (filter === "active") return isActiveOrder(request);
    if (filter === "waiting") return isWaitingPickupOrder(request);
    if (filter === "completed") return isCompletedOrder(request);
    if (filter === "cancelled") return isCancelledOrder(request);
    return true;
  });
  const visibleOrders = [...filtered].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return latestFirst ? -diff : diff;
  });

  return (
    <div className="grid gap-5">
      <section className="rounded-[2rem] border border-[#e6edf5] bg-white p-5 shadow-[0_18px_60px_rgba(8,17,31,0.06)]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-3xl font-black">My Orders</h1>
            <p className="mt-1 text-sm font-semibold text-[var(--darji-muted)]">Track and manage all your tailoring orders in one place.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative grid h-11 w-11 place-items-center rounded-full border border-[#e6edf5] bg-white text-[var(--darji-muted)]">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--darji-orange)]" />
            </button>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#fff2d8] text-sm font-black text-[var(--darji-orange)]">{(user?.name ?? "Aman Kumar").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
              <div className="hidden sm:block">
                <p className="text-sm font-black">{user?.name ?? "Aman Kumar"}</p>
                <p className="text-xs font-bold text-[var(--darji-muted)]">+91 {user?.phone ?? "98765 43210"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OrderStatCard title="Active Orders" value={active.length} helper="In progress" icon={PackageCheck} tone="orange" />
          <OrderStatCard title="Waiting for Pickup" value={waiting.length} helper="Scheduled" icon={CalendarCheck} tone="amber" />
          <OrderStatCard title="Completed Orders" value={completed.length} helper="All time" icon={CheckCircle2} tone="green" />
          <OrderStatCard title="Canceled Orders" value={cancelled.length} helper="Canceled" icon={XCircle} tone="red" />
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap rounded-2xl border border-[#e6edf5] bg-white p-1">
            {[
              ["all", "All Orders"],
              ["active", "Active"],
              ["waiting", "Waiting for Pickup"],
              ["completed", "Completed"],
              ["cancelled", "Canceled"]
            ].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id as OrderFilter)} className={`rounded-xl px-4 py-2 text-sm font-black transition ${filter === id ? "bg-[#fff7e8] text-[var(--darji-orange)] shadow-sm" : "text-[var(--darji-muted)] hover:text-[var(--darji-ink)]"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e6edf5] bg-white px-4 text-sm font-black text-[var(--darji-muted)]">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button onClick={() => setLatestFirst((current) => !current)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e6edf5] bg-white px-4 text-sm font-black text-[var(--darji-muted)]">
              <ArrowUpDown className="h-4 w-4" /> {latestFirst ? "Sort Latest" : "Sort Oldest"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {visibleOrders.length ? visibleOrders.map((request) => <OrderTableRow key={request.id} request={request} openOrder={() => openOrder(request)} />) : <EmptyState title="No orders found" copy="Try another filter or create a new booking." />}
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl bg-[#fffaf0] px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-[var(--darji-orange)]">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black">Need Help with your order?</p>
              <p className="text-sm font-semibold text-[var(--darji-muted)]">Our support team is here to help you.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="min-h-11">Chat with us</Button>
            <Button variant="secondary" className="min-h-11">Call Support</Button>
          </div>
        </div>
      </section>
      <Button className="w-fit" onClick={() => setScreen("newRequest")}><Plus className="h-4 w-4" /> New Order</Button>
    </div>
  );
}

function OrderStatCard({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: LucideIcon; tone: "orange" | "amber" | "green" | "red" }) {
  const toneClass = {
    orange: "bg-[#fff7e8] text-[var(--darji-orange)]",
    amber: "bg-[#fffbeb] text-[#f59e0b]",
    green: "bg-[#ecfdf5] text-[#16a34a]",
    red: "bg-[#fff1f2] text-[#dc2626]"
  }[tone];
  return (
    <div className={`rounded-2xl border border-[#f1e4d6] p-5 ${tone === "red" ? "bg-[#fff8f8]" : tone === "green" ? "bg-[#fbfffc]" : "bg-[#fffaf5]"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--darji-muted)]" />
      </div>
      <p className="mt-5 text-xs font-black text-[var(--darji-muted)]">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-[var(--darji-muted)]">{helper}</p>
    </div>
  );
}

function OrdersList({ requests, openOrder, compact = false }: { requests: TailoringRequest[]; openOrder: (request: TailoringRequest) => void; compact?: boolean }) {
  if (!requests.length) return <EmptyState title="No orders yet" copy="Book your first pickup and confirmed tailoring orders will appear here." />;
  return (
    <div className="grid gap-4">
      {requests.map((request) => <OrderCard key={request.id} request={request} openOrder={() => openOrder(request)} compact={compact} />)}
    </div>
  );
}

function OrderCard({ request, openOrder, compact }: { request: TailoringRequest; openOrder: () => void; compact?: boolean }) {
  if (!compact) return <OrderTableRow request={request} openOrder={openOrder} />;
  
  const item = primaryOrderItem(request);
  const thumbnail = firstMediaUrl(item);
  
  return (
    <motion.article 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="premium-card rounded-[2rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition hover:border-[#ffd5ad] duration-300"
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#e6edf5] bg-[#fffaf0] flex items-center justify-center">
          {thumbnail ? (
            <img src={thumbnail} alt={clothingItemTitle(item)} className="h-full w-full object-cover" />
          ) : (
            <Shirt className="h-8 w-8 text-[var(--darji-orange)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--darji-orange)]">
            {requestCode(request)}
          </p>
          <h3 className="text-lg font-black text-[var(--darji-ink)] leading-snug mt-0.5 truncate">
            {orderItemCount(request)} Clothing Item{orderItemCount(request) > 1 ? "s" : ""}
          </h3>
          <p className="text-xs font-semibold text-[var(--darji-muted)] mt-0.5 truncate">
            {request.items?.[0] ? clothingItemSummary(request.items[0]) : `${request.workType} - ${request.clothType}`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto shrink-0 border-t border-[#edf1f5] pt-4 sm:border-t-0 sm:pt-0">
        <div className="text-left sm:text-right">
          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black leading-none ${statusPillClass(request)}`}>
            {statusLabel(request)}
          </span>
          <div className="mt-2 text-[10px] font-bold text-[var(--darji-muted)] leading-tight space-y-0.5">
            <p>Pickup: {formatOrderDate(request.createdAt)}</p>
            <p>ETA: {estimatedDeliveryDate(request)}</p>
          </div>
        </div>
        <button 
          onClick={openOrder} 
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f8fafc] border border-[#e6edf5] hover:bg-[#fff7e8] hover:border-[#ffd5ad] text-[var(--darji-ink)] hover:text-[var(--darji-orange)] transition-colors duration-200"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </motion.article>
  );
}

function OrderTableRow({ request, openOrder }: { request: TailoringRequest; openOrder: () => void }) {
  const item = primaryOrderItem(request);
  const thumbnail = firstMediaUrl(item);
  const amount = orderAmount(request);
  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#edf1f5] bg-white p-4 transition hover:border-[#ffd5ad]">
      <div className="grid gap-4 lg:grid-cols-[92px_1.55fr_1.15fr_0.82fr_auto] lg:items-center">
        <div className="grid grid-cols-[82px_1fr] gap-4 lg:block">
          <div className="h-24 w-20 overflow-hidden rounded-2xl border border-[#e6edf5] bg-[#fffaf0]">
            {thumbnail ? <img src={thumbnail} alt={clothingItemTitle(item)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Shirt className="h-8 w-8 text-[var(--darji-orange)]" /></div>}
          </div>
          <div className="lg:hidden">
            <p className="inline-flex rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-black text-[var(--darji-orange)]">{requestCode(request)}</p>
            <h3 className="mt-2 font-black">{clothingItemTitle(item)} - {item.workType}</h3>
            <p className="mt-1 text-xs font-bold text-[var(--darji-muted)]">{formatOrderDate(request.createdAt, true)}</p>
          </div>
        </div>

        <div className="hidden lg:block">
          <p className="inline-flex rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-black text-[var(--darji-orange)]">{requestCode(request)}</p>
          <p className="mt-2 text-xs font-bold text-[var(--darji-muted)]">{formatOrderDate(request.createdAt, true)}</p>
        </div>

        <div>
          <h3 className="font-black">{clothingItemTitle(item)} - {item.workType}</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--darji-muted)]">{item.gender ?? "Clothing"} Wear - {item.workType}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-[var(--darji-muted)]">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[var(--darji-orange)]" /> Pickup: {formatOrderDate(request.createdAt)}</span>
            <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5 text-[var(--darji-orange)]" /> Delivery: {estimatedDeliveryDate(request)}</span>
          </div>
        </div>

        <div className="border-[#edf1f5] lg:border-l lg:pl-6">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusPillClass(request)}`}>{statusLabel(request)}</span>
          <p className="mt-3 text-xs font-bold text-[var(--darji-muted)]">{isWaitingPickupOrder(request) ? "Pickup Partner Assigned" : isCompletedOrder(request) ? "Delivered on" : isCancelledOrder(request) ? "Canceled on" : "Tailor status"}</p>
          <p className="mt-1 text-sm font-black">{isCompletedOrder(request) || isCancelledOrder(request) ? formatOrderDate(request.createdAt) : request.selectedQuote?.tailor?.shopName ?? "Darji Tailor"}</p>
        </div>

        <div className="flex items-center justify-between gap-4 border-[#edf1f5] lg:block lg:border-l lg:pl-6">
          <p className="text-xl font-black">{amount != null ? formatMoney(amount) : "Quote"}</p>
          <button onClick={openOrder} className="mt-0 inline-flex items-center gap-2 text-sm font-black text-[var(--darji-orange)] lg:mt-3">
            View Details <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function OrderDetailsScreen({ request, coupons, setScreen, onOrderPlaced }: { request: TailoringRequest; coupons: Coupon[]; setScreen: (screen: CustomerScreen) => void; onOrderPlaced: (request: TailoringRequest) => void }) {
  const items = request.items?.length ? request.items : [{ description: request.description, gender: request.gender, clothType: request.clothType, workType: request.workType, media: request.media }] as TailoringRequestItem[];
  return (
    <div className="grid gap-6">
      <button onClick={() => setScreen("orders")} className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[var(--darji-muted)] shadow-sm">
        <ArrowLeft className="h-4 w-4" /> Orders
      </button>
      <div className="premium-card rounded-[2rem] p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">{requestCode(request)}</p>
            <h1 className="mt-2 text-4xl font-black">{statusLabel(request)}</h1>
            <p className="mt-3 text-sm font-semibold text-[var(--darji-muted)]">{new Date(request.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <div className="rounded-2xl bg-[#f8fafc] px-5 py-4 text-right">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-muted)]">Total</p>
            <p className="mt-1 text-3xl font-black">{request.totalAmount ? formatMoney(request.totalAmount) : "Quote pending"}</p>
          </div>
        </div>
        <OrderTimeline request={request} />
      </div>

      <CustomerHandoffOtpCard orderId={request.id} status={statusLabel(request)} />

      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <article key={item.id ?? `${item.clothType}-${index}`} className="rounded-2xl border border-[#e6edf5] bg-white p-5">
            <div className="flex gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#fffaf0]">
                {firstMediaUrl(item) ? <img src={firstMediaUrl(item)} alt={clothingItemTitle(item)} className="h-full w-full object-cover" /> : <Shirt className="h-7 w-7 text-[var(--darji-orange)]" />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-orange)]">Item {index + 1}</p>
                <h3 className="mt-1 text-lg font-black">{clothingItemTitle(item)}</h3>
                <p className="mt-1 text-sm font-bold text-[var(--darji-muted)]">{clothingItemSummary(item)}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{item.description}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

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
            {step}
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
        <p className="flex items-center gap-2 font-black"><Loader2 className="h-4 w-4 animate-spin text-[var(--darji-orange)]" /> Loading delivery OTP</p>
      </div>
    );
  }
  if (!rows.length) return null;
  return (
    <section className="premium-card rounded-[2rem] p-6">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Delivery OTP</p>
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
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{item.verified ? "Verified by delivery partner." : "Share this only when the delivery partner reaches you."}</p>
        </div>
        <span className={`rounded-xl px-4 py-2 text-2xl font-black tracking-[0.16em] ${item.verified ? "bg-white text-[#16a34a]" : "bg-white text-[var(--darji-orange)]"}`}>{item.otp}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[var(--darji-muted)]">
        <span className="rounded-full bg-white px-3 py-1">{item.stage === "pickup" ? "Pickup verification" : "Drop verification"}</span>
        {item.taskStatus ? <span className="rounded-full bg-white px-3 py-1">{item.taskStatus.replace(/_/g, " ")}</span> : null}
        {item.routePosition && item.routeTotal ? <span className="rounded-full bg-white px-3 py-1">Stop {item.routePosition}/{item.routeTotal}</span> : null}
      </div>
    </div>
  );
}

function PendingOrderCheckout({ request, coupons, onOrderPlaced }: { request: TailoringRequest; coupons: Coupon[]; onOrderPlaced: (request: TailoringRequest) => void }) {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<TailorQuote>();
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const quotes = useQuery({ queryKey: ["customer", "quotes", request.id], queryFn: () => customerApi.quotes(request.id) });
  const visibleQuotes = (quotes.data ?? []).filter((quote) => ["SUBMITTED", "RESERVED", "ACCEPTED"].includes(quote.status));

  const faresQuery = useQuery({ queryKey: ["customer", "delivery-fares"], queryFn: customerApi.getDeliveryFares });
  const fares = faresQuery.data;

  const getCustomerDeliveryFee = (urgency: string) => {
    const value = String(urgency ?? "").toLowerCase();
    if (value.includes("instant")) return fares?.instant?.customerCharge ?? 50;
    if (value.includes("express") || value.includes("urgent")) return fares?.express?.customerCharge ?? 40;
    return fares?.normal?.customerCharge ?? 30;
  };

  const deliveryFee = getCustomerDeliveryFee(request.urgency ?? "");
  const homeFee = homeMeasurementFeeForItems(request.items ?? []);
  const platformFee = getPlatformFee(Number(selectedQuote?.price ?? 0));
  const smallOrderFee = getSmallOrderFee(Number(selectedQuote?.price ?? 0));
  const subtotal = Number(selectedQuote?.price ?? 0) + deliveryFee + platformFee + smallOrderFee + homeFee;
  const discount = couponDiscount(selectedCoupon, subtotal);
  const total = Math.max(subtotal - discount, 0);

  const checkout = useMutation({
    onMutate: () => {
      setVerifyingPayment(true);
    },
    mutationFn: () => {
      if (!selectedQuote) throw new Error("Select a tailor quote first.");
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
      alert(errorMessage(err));
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
          async () => {
            await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
            setVerifyingPayment(false);
            onOrderPlaced(response.request);
          },
          (err) => {
            setVerifyingPayment(false);
            alert(errorMessage(err));
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
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Checkout</p>
          <h2 className="mt-1 text-2xl font-black">Continue this order</h2>
        </div>
        <Button variant="secondary" loading={quotes.isFetching} onClick={() => void quotes.refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {visibleQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} selected={selectedQuote?.id === quote.id} onSelect={() => setSelectedQuote(quote)} />)}
      </div>
      {!visibleQuotes.length && !quotes.isLoading ? <EmptyState title="Waiting for quotes" copy="Quotes for this request will appear here." /> : null}
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
            {selectedQuote ? <SummaryLine label="Tailor quote" value={formatMoney(selectedQuote.price)} /> : null}
            <SummaryLine label="Delivery" value={formatMoney(deliveryFee)} />
            <SummaryLine label="Platform fee" value={formatMoney(platformFee)} />
            {smallOrderFee ? <SummaryLine label="Small order fee" value={formatMoney(smallOrderFee)} /> : null}
            {homeFee ? <SummaryLine label="Home measurement" value={formatMoney(homeFee)} /> : null}
            {discount ? <SummaryLine label="Coupon discount" value={`-${formatMoney(discount)}`} /> : null}
            <SummaryLine label="Payable" value={formatMoney(total)} strong />
            {checkout.error ? <p className="mt-4 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(checkout.error)}</p> : null}
            <Button className="mt-5 w-full" loading={checkout.isPending} onClick={() => checkout.mutate()}>Confirm Order</Button>
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
            <h3 className="text-xl font-black text-[#08111f]">Verifying Payment</h3>
            <p className="text-xs font-semibold leading-relaxed text-[var(--darji-muted)]">
              We are fetching your payment status. Please do not refresh the page or click back.
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
        <p className="font-black text-sm">{label}</p>
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
  if (user?.avatarUri) return user.avatarUri;
  const preset = avatarOptions.find((o) => o.key === user?.avatarPreset);
  return preset?.src || "/avatars/boy.png";
}

function EditProfileScreen({ setScreen }: { setScreen: (s: CustomerScreen) => void }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [dob, setDob] = useState(user?.dateOfBirth ?? "");
  const [avatarPreset, setAvatarPreset] = useState(user?.avatarPreset ?? "boy");
  const [avatarUri, setAvatarUri] = useState(user?.avatarUri ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useMutation({
    mutationFn: (data: any) => customerApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser({ ...user!, ...updatedUser });
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
      alert(errorMessage(err));
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
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">Edit Profile</h1>
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
        <p className="mt-3 text-sm font-semibold text-[var(--darji-muted)]">Tap photo to change</p>
      </div>

      <div className="grid gap-5">
        <FieldShell label="Full Name">
          <input className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        </FieldShell>
        
        <div>
          <label className="mb-2 block text-sm font-bold text-[var(--darji-muted)]">Gender</label>
          <div className="flex flex-wrap gap-3">
             <button onClick={() => setGender("Male")} className={`flex-1 min-w-[45%] h-14 rounded-2xl border ${gender === "Male" ? "border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-ink)]" : "border-[var(--darji-line)] bg-white text-[var(--darji-muted)]"} font-bold transition shadow-[0_2px_12px_rgba(8,17,31,0.03)]`}>Male</button>
             <button onClick={() => setGender("Female")} className={`flex-1 min-w-[45%] h-14 rounded-2xl border ${gender === "Female" ? "border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-ink)]" : "border-[var(--darji-line)] bg-white text-[var(--darji-muted)]"} font-bold transition shadow-[0_2px_12px_rgba(8,17,31,0.03)]`}>Female</button>
             <button onClick={() => setGender("Other")} className={`flex-1 min-w-[45%] h-14 rounded-2xl border ${gender === "Other" ? "border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-ink)]" : "border-[var(--darji-line)] bg-white text-[var(--darji-muted)]"} font-bold transition shadow-[0_2px_12px_rgba(8,17,31,0.03)] max-w-[calc(50%-0.375rem)]`}>Other</button>
          </div>
        </div>

        <FieldShell label="Date of Birth">
          <div className="relative">
            <input type="date" className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]" value={dob} onChange={e => setDob(e.target.value)} />
            <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-[var(--darji-orange)]">
              {/* Note: Native date inputs usually have their own calendar icon on web, but we can style it or leave the native one. We'll rely on the native one but color it if possible via CSS, or just let it be. */}
            </div>
          </div>
        </FieldShell>

        <div>
          <label className="mb-2 block text-sm font-bold text-[var(--darji-muted)]">Choose Avatar</label>
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
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function SavedAddressesScreen({ setScreen }: { setScreen: (s: CustomerScreen) => void }) {
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
      (position) => {
        const value = `Lat ${position.coords.latitude.toFixed(5)}, Lng ${position.coords.longitude.toFixed(5)}`;
        setLine1(value);
        setLocationStatus("Location coordinates added.");
      },
      () => setLocationStatus("Could not read location.")
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
          <h1 className="text-2xl font-black text-[var(--darji-ink)]">Add New Address</h1>
        </div>

        <div className="grid gap-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-muted)]">Address Label</label>
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

          <FieldShell label="Address Line 1">
            <input
              className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
              placeholder="Building, street, house number"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
            />
          </FieldShell>

          <button type="button" onClick={useCurrentLocation} className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e6edf5] bg-white px-4 py-2.5 text-sm font-black text-[var(--darji-ink)] hover:border-[var(--darji-orange)] transition">
            <LocateFixed className="h-4 w-4 text-[var(--darji-orange)]" />
            Use Current Location
          </button>
          {locationStatus ? <p className="text-xs font-bold text-[var(--darji-muted)]">{locationStatus}</p> : null}

          <FieldShell label="Landmark (Optional)">
            <input
              className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
              placeholder="Nearby popular place"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </FieldShell>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldShell label="City">
              <input
                className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </FieldShell>

            <FieldShell label="State">
              <input
                className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </FieldShell>

            <FieldShell label="Pincode">
              <input
                className="h-14 w-full rounded-2xl border border-[var(--darji-line)] bg-white px-5 font-bold text-[var(--darji-ink)] focus:border-[var(--darji-orange)] focus:outline-none shadow-[0_2px_12px_rgba(8,17,31,0.03)]"
                placeholder="6 digit PIN"
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
            Save Address
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
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">Saved Addresses</h1>
      </div>

      <button
        onClick={() => setView("add")}
        className="w-full h-14 rounded-2xl bg-[var(--darji-orange)] text-white font-bold text-lg shadow-md flex items-center justify-center gap-2 mb-8 hover:bg-[var(--darji-orange)]/90 transition"
      >
        <Plus className="h-5 w-5" /> Add New Address
      </button>

      {addresses.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--darji-orange)]" />
        </div>
      ) : !list.length ? (
        <EmptyState title="No saved addresses" copy="Add an address to make your doorstep booking seamless." />
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
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">Darji Wallet</h1>
      </div>

      {walletQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--darji-orange)]" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Wallet Balance Card */}
          <div className="rounded-[2rem] bg-gradient-to-br from-[#ffae3c] to-[#ff7000] p-6 text-white shadow-[0_12px_36px_rgba(255,112,0,0.22)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/80">Available Balance</p>
            <h2 className="mt-2 text-4xl font-black">{formatMoney(balance)}</h2>
            <p className="mt-4 text-xs font-bold text-white/70">Use this balance for quick checkout on your tailoring requests.</p>
          </div>

          {/* Transactions List */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-[var(--darji-orange)]" />
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--darji-orange)]">Transaction History</p>
            </div>

            {!transactions.length ? (
              <EmptyState title="No transactions yet" copy="Your wallet transactions will be listed here." />
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

function HelpCenterScreen({ setScreen }: { setScreen: (s: CustomerScreen) => void }) {
  const [tab, setTab] = useState<"faq" | "terms" | "privacy">("faq");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "How do I book a tailoring service?", a: "Go to the Book tab, select gender, cloth type, work type, urgency, upload photos of the cloth/style, and add your address. Once submitted, you'll receive quotes from verified tailors." },
    { q: "How does pickup and delivery work?", a: "Once you accept a quote and pay, a delivery partner is assigned to pick up the fabric from your doorstep. After stitching, it is delivered back to you. You can track this in real-time." },
    { q: "What is Darji Wallet?", a: "Darji Wallet is a secure digital wallet where you can receive refunds or add credits for quick checkout on your orders." },
    { q: "Can I cancel my request?", a: "Yes, you can cancel your request anytime before you accept a quote and make the payment. Once paid, the order goes into progress." },
    { q: "Do you support Cash on Delivery (COD)?", a: "Yes, COD is supported in select PIN codes. You can select COD as your payment method during checkout." }
  ];

  return (
    <div className="bg-[#f7faff] -mx-4 -mt-4 p-4 min-h-[calc(100vh-80px)]">
      <div className="flex items-center gap-4 py-2 mb-6">
        <button onClick={() => setScreen("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--darji-ink)] shadow-sm">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">Help Center</h1>
      </div>

      {/* Tab Buttons */}
      <div className="flex rounded-2xl border border-[#e6edf5] bg-white p-1 mb-6">
        {(["faq", "terms", "privacy"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setOpenFaq(null); }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition ${tab === t ? "bg-[#fff7e8] text-[var(--darji-orange)]" : "text-[var(--darji-muted)] hover:text-[var(--darji-ink)]"}`}
          >
            {t === "faq" ? "FAQs" : t === "terms" ? "Terms & Conditions" : "Privacy Policy"}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="grid gap-4">
        {tab === "faq" && (
          <div className="grid gap-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="rounded-2xl border border-[var(--darji-line)] bg-white p-4 shadow-[0_2px_12px_rgba(8,17,31,0.03)]">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between text-left font-bold text-sm text-[var(--darji-ink)]"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-[var(--darji-muted)] transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[var(--darji-muted)] border-t border-dashed border-[#ffd6b9] pt-3">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "terms" && (
          <div className="rounded-[2.5rem] border border-[var(--darji-line)] bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(8,17,31,0.03)] text-xs sm:text-sm leading-relaxed text-[var(--darji-muted)] space-y-4">
            <h2 className="text-lg font-black text-[var(--darji-ink)]">Terms of Service</h2>
            <p>Welcome to Darji. By utilizing our premium doorstep tailoring, alterations, repairs, and booking application, you consent to these terms and conditions.</p>
            <p className="font-bold text-[var(--darji-ink)]">1. Booking & Fabrication</p>
            <p>Customers are responsible for providing precise descriptions and fabric materials. Tailors perform alterations and custom stitching based on the details submitted in the app.</p>
            <p className="font-bold text-[var(--darji-ink)]">2. Payments & Payouts</p>
            <p>Payments are processed securely via Razorpay or COD. In case of issues, refunds are credited back to your original payment method or your secure Darji Wallet.</p>
          </div>
        )}

        {tab === "privacy" && (
          <div className="rounded-[2.5rem] border border-[var(--darji-line)] bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(8,17,31,0.03)] text-xs sm:text-sm leading-relaxed text-[var(--darji-muted)] space-y-4">
            <h2 className="text-lg font-black text-[var(--darji-ink)]">Privacy Policy</h2>
            <p>At Darji, we value your privacy. We never share your personal information or mobile numbers with third parties without your explicit authorization.</p>
            <p className="font-bold text-[var(--darji-ink)]">1. Information Collection</p>
            <p>We collect your phone number for OTP authentication, location coordinates for doorstep pickups, and photos/videos of garments to provide tailors with fitting references.</p>
          </div>
        )}
      </div>
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
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">About Darji</h1>
      </div>

      <div className="rounded-[2.5rem] border border-[var(--darji-line)] bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(8,17,31,0.03)] text-center">
        <img src="/darji-loader-transparent.png" alt="Darji Logo" className="mx-auto h-28 w-auto object-contain mb-6" />
        <h2 className="text-xl font-black text-[var(--darji-ink)] mb-2">Darji Customer Web Dashboard</h2>
        <p className="text-sm font-bold text-[var(--darji-orange)] mb-6">Version 1.0.0 (Stable)</p>
        
        <div className="text-left text-sm leading-relaxed text-[var(--darji-muted)] space-y-4 max-w-xl mx-auto border-t border-slate-100 pt-6">
          <p>Darji is a premium doorstep tailoring and alterations service. We connect customers with highly skilled, verified local tailors to handle custom stitching, repairs, resizing, and alterations directly from the comfort of their homes.</p>
          <p>Our app coordinates pickup, delivery tracking, secure payouts, and communication with tailors, giving you a completely hands-off premium custom tailoring experience.</p>
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({ wallet, coupons, notifications, addresses, setScreen, signOut }: { wallet?: WalletSummary; coupons: Coupon[]; notifications: NotificationRow[]; addresses: Address[]; setScreen: (s: CustomerScreen) => void; signOut: () => void; }) {
  const user = useAuthStore((state) => state.user);
  const selectedAvatar = getUserAvatarUrl(user);

  return (
    <div className="grid gap-6 pb-20">
      <div className="flex items-center gap-5 rounded-[2rem] border border-[#efcf92] bg-[#fffaf0] p-6 shadow-sm">
         <img src={selectedAvatar} alt="Profile" className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-md bg-[#f1f5f9]" />
         <div>
           <h1 className="text-2xl font-black text-[var(--darji-ink)]">{user?.name ?? "Darji Customer"}</h1>
           <p className="font-bold text-[var(--darji-muted)] mt-1">+91 {user?.phone}</p>
         </div>
      </div>
      
      <section>
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="h-4 w-1 rounded-full bg-[var(--darji-orange)]" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Account</p>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--darji-line)] bg-white overflow-hidden shadow-[0_12px_24px_rgba(8,17,31,0.03)]">
          <ProfileRow icon={UserRound} label="Edit Profile" value="Name, Gender, DOB" onClick={() => setScreen("editProfile")} />
          <ProfileRow icon={MapPin} label="Saved Addresses" value={`${addresses.length} Saved`} noBorder onClick={() => setScreen("savedAddresses")} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="h-4 w-1 rounded-full bg-[var(--darji-orange)]" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Orders & Wallet</p>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--darji-line)] bg-white overflow-hidden shadow-[0_12px_24px_rgba(8,17,31,0.03)]">
          <ProfileRow icon={PackageCheck} label="Order History" value="View active and past orders" onClick={() => setScreen("orders")} />
          <ProfileRow icon={Wallet} label="Darji Wallet" value={formatMoney(wallet?.balance)} noBorder onClick={() => setScreen("wallet")} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="h-4 w-1 rounded-full bg-[var(--darji-orange)]" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Support</p>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--darji-line)] bg-white overflow-hidden shadow-[0_12px_24px_rgba(8,17,31,0.03)]">
          <ProfileRow icon={Headphones} label="Chat with Support" value="Contact our support team" onClick={() => setScreen("support")} />
          <ProfileRow icon={HelpCircle} label="Help Center" value="Payments, Refunds & more" noBorder onClick={() => setScreen("helpCenter")} />
        </div>
      </section>
      
      <section>
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="h-4 w-1 rounded-full bg-[var(--darji-orange)]" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Legal & App</p>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--darji-line)] bg-white overflow-hidden shadow-[0_12px_24px_rgba(8,17,31,0.03)]">
          <ProfileRow icon={Info} label="About Darji" onClick={() => setScreen("aboutDarji")} />
          <ProfileRow icon={LogOut} label="Log out" onClick={signOut} noBorder />
        </div>
      </section>
    </div>
  );
}function ContactSupportScreen({ setScreen, orders }: { setScreen: (s: CustomerScreen) => void; orders: TailoringRequest[] }) {
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
      alert(errorMessage(err));
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
      alert(errorMessage(err));
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
              Resolve
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#fcfcfd]">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <MessageSquare className="mx-auto h-12 w-12 text-[#dce2ea] mb-3" />
                <p className="font-bold text-[var(--darji-muted)]">No messages yet.</p>
                <p className="text-sm font-medium text-[#94a3b8] mt-1 max-w-xs">Type your first message below to open this support ticket.</p>
              </div>
            </div>
          ) : (
            messages.map((msg: any, i: number) => {
              const isUser = msg.sender === "client" || msg.sender === "CUSTOMER" || msg.senderType === "CUSTOMER";
              return (
                <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-[var(--darji-muted)]">
                    {isUser ? "You" : "Darji Support"}
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
                placeholder="Type a message..."
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
          <h1 className="text-2xl font-black text-[var(--darji-ink)]">Start Conversation</h1>
        </div>

        <div className="grid gap-6">
          <div className="relative w-fit">
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">Select Related Order (Optional)</label>
            <div className="relative">
              <button type="button" className="h-14 w-auto px-6 rounded-2xl border border-[var(--darji-orange)] bg-[#fffcf5] text-[var(--darji-orange)] font-bold shadow-sm pointer-events-none flex items-center gap-2">
                {selectedOrder && activeSelectedOrderData ? (
                  <span>
                    {requestCode(activeSelectedOrderData)} - {primaryOrderItem(activeSelectedOrderData).clothType || "Order"}
                  </span>
                ) : (
                  <span>No Linked Order</span>
                )}
                <span className="text-xs">▼</span>
              </button>
              <select
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
              >
                <option value="">General Query (No Order)</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {requestCode(order)} - {primaryOrderItem(order).clothType || "Order"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">Select Help Category</label>
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
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">Attach Image Reference (Optional)</label>
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
                    <span className="text-xs font-bold">Add Photo</span>
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
            Start Conversation
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
          <h1 className="text-2xl font-black text-[var(--darji-ink)]">Report a Bug</h1>
        </div>

        <div className="grid gap-6 text-left">
          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">Bug Title</label>
            <input
              type="text"
              placeholder="e.g. App crashes when selecting payment"
              className={inputClass}
              value={bugTitle}
              onChange={(e) => setBugTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">Steps to Reproduce / Description</label>
            <textarea
              placeholder="Describe the issue you encountered and the steps to reproduce it."
              className={`${inputClass} min-h-32 py-3`}
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--darji-ink)]">Attach Screenshot reference (Optional)</label>
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
                    <span className="text-xs font-bold">Add Photo</span>
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
            Submit Bug Report
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
        <h1 className="text-2xl font-black text-[var(--darji-ink)]">Support Center</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={() => setView("new_chat")} className="h-14 rounded-2xl bg-[var(--darji-orange)] text-white font-bold text-base shadow-md flex items-center justify-center gap-2 hover:bg-[var(--darji-orange)]/90 transition">
          <MessageSquare className="h-5 w-5" /> Start Conversation
        </button>
        <button onClick={() => setView("new_bug")} className="h-14 rounded-2xl border-2 border-red-500 text-red-500 font-bold text-base shadow-md flex items-center justify-center gap-2 hover:bg-red-50 transition">
          <Bug className="h-5 w-5" /> Report a Bug
        </button>
      </div>

      <div className="grid gap-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[var(--darji-orange)]" />
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--darji-orange)]">OPEN TICKETS ({activeTickets.length})</p>
          </div>
          
          {activeTickets.length === 0 ? (
            <div className="rounded-2xl border border-[var(--darji-line)] bg-white py-5 text-center shadow-[0_2px_12px_rgba(8,17,31,0.03)]">
               <p className="text-sm font-bold text-[var(--darji-muted)]">No active support requests</p>
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
                      {ticket.messages?.length ? (ticket.messages[ticket.messages.length - 1].text || ticket.messages[ticket.messages.length - 1].message) : "No messages yet"}
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
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--darji-muted)]">RESOLVED TICKETS ({resolvedTickets.length})</p>
          </div>
          
          {resolvedTickets.length === 0 ? (
            <div className="rounded-2xl border border-[var(--darji-line)] bg-white py-5 text-center shadow-[0_2px_12px_rgba(8,17,31,0.03)]">
               <p className="text-sm font-bold text-[var(--darji-muted)]">No resolved support requests</p>
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
                      Resolved
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
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[#ef4444]">BUG REPORTS ({bugReports.length})</p>
          </div>
          
          {bugReports.length === 0 ? (
            <div className="rounded-2xl border border-[var(--darji-line)] bg-white py-5 text-center shadow-[0_2px_12px_rgba(8,17,31,0.03)]">
               <p className="text-sm font-bold text-[var(--darji-muted)]">No bug reports submitted</p>
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
                      {bug.messages?.length ? (bug.messages[bug.messages.length - 1].text || bug.messages[bug.messages.length - 1].message) : "No messages yet"}
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

function AddressManager({ addresses }: { addresses: Address[] }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const createAddress = useMutation({
    mutationFn: () => customerApi.createAddress({ label, line1, city, pincode, address: [line1, city, pincode].filter(Boolean).join(", ") }),
    onSuccess: async () => {
      setLabel("");
      setLine1("");
      setCity("");
      setPincode("");
      await queryClient.invalidateQueries({ queryKey: ["customer", "addresses"] });
    }
  });

  return (
    <div className="premium-card rounded-[2rem] p-6">
      <p className="font-black">Saved addresses</p>
      <div className="mt-4 grid gap-3">
        {addresses.length ? addresses.map((address) => (
          <div key={address.id} className="rounded-2xl border border-[#e6edf5] bg-[#f8fafc] p-4">
            <p className="font-black">{address.label ?? "Address"}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{addressText(address)}</p>
          </div>
        )) : <p className="text-sm font-semibold text-[var(--darji-muted)]">No saved addresses yet.</p>}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input className={inputClass} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label" />
        <input className={inputClass} value={pincode} onChange={(event) => setPincode(event.target.value)} placeholder="Pincode" />
        <input className={`${inputClass} sm:col-span-2`} value={line1} onChange={(event) => setLine1(event.target.value)} placeholder="House, street, landmark" />
        <input className={inputClass} value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
        <Button loading={createAddress.isPending} disabled={line1.trim().length < 5} onClick={() => createAddress.mutate()}>Save Address</Button>
      </div>
      {createAddress.error ? <p className="mt-4 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(createAddress.error)}</p> : null}
    </div>
  );
}

function CouponsBox({ coupons }: { coupons: Coupon[] }) {
  return (
    <div className="premium-card rounded-[2rem] p-6">
      <p className="flex items-center gap-2 font-black"><Ticket className="h-5 w-5 text-[var(--darji-orange)]" /> Coupons</p>
      <div className="mt-4 grid gap-3">
        {coupons.filter((coupon) => coupon.isActive).slice(0, 5).map((coupon) => (
          <div key={coupon.code} className="rounded-2xl border border-[#efcf92] bg-[#fffaf0] p-4">
            <p className="font-black">{coupon.code}</p>
            <p className="mt-1 text-sm font-bold text-[var(--darji-orange)]">{couponLabel(coupon)}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{coupon.description}</p>
          </div>
        ))}
        {!coupons.length ? <p className="text-sm font-semibold text-[var(--darji-muted)]">No coupons available.</p> : null}
      </div>
    </div>
  );
}

function NotificationsBox({ notifications }: { notifications: NotificationRow[] }) {
  return (
    <div className="premium-card rounded-[2rem] p-6">
      <p className="flex items-center gap-2 font-black"><Bell className="h-5 w-5 text-[var(--darji-orange)]" /> Notifications</p>
      <div className="mt-4 grid gap-3">
        {notifications.slice(0, 5).map((row) => (
          <div key={row.id} className="rounded-2xl border border-[#e6edf5] bg-[#f8fafc] p-4">
            <p className="font-black">{row.title ?? "Order update"}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{row.body ?? row.message ?? "Darji notification"}</p>
          </div>
        ))}
        {!notifications.length ? <p className="text-sm font-semibold text-[var(--darji-muted)]">No notifications yet.</p> : null}
      </div>
    </div>
  );
}

function WalletActivity({ wallet }: { wallet?: WalletSummary }) {
  return (
    <div className="premium-card rounded-[2rem] p-6">
      <p className="font-black">Wallet activity</p>
      <div className="mt-4 grid gap-3">
        {wallet?.transactions?.length ? wallet.transactions.map((row) => <SummaryLine key={row.id} label={row.remarks ?? row.type ?? "Wallet transaction"} value={formatMoney(row.amount)} />) : <p className="text-sm font-semibold text-[var(--darji-muted)]">No wallet transactions yet.</p>}
      </div>
    </div>
  );
}

function SupportBox() {
  const [message, setMessage] = useState("");
  const support = useMutation({ mutationFn: () => customerApi.createSupportTicket({ subject: "Customer web support", message }) });
  return (
    <div className="premium-card rounded-[2rem] p-6">
      <p className="font-black">Support</p>
      <textarea className={`${inputClass} mt-4 min-h-32 py-4`} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Order ID, issue, or request" />
      {support.isSuccess ? <p className="mt-4 rounded-2xl bg-[#ecfdf5] px-4 py-3 text-sm font-bold text-[#047857]">Support request sent.</p> : null}
      {support.error ? <p className="mt-4 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(support.error)}</p> : null}
      <Button className="mt-5" loading={support.isPending} disabled={message.trim().length < 10} onClick={() => support.mutate()}>Send Support Request</Button>
    </div>
  );
}

export function CustomerDashboard() {
  const { accessToken, signOut, setUser } = useAuthStore();
  const [screen, setScreen] = useState<CustomerScreen>("home");
  const [draft, setDraft] = useState<RequestDraft>(() => makeEmptyDraft());
  const [selectedQuote, setSelectedQuote] = useState<TailorQuote>();
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccess>();
  const requests = useQuery({ queryKey: ["customer", "requests"], queryFn: customerApi.tailoringRequests, enabled: Boolean(accessToken) });
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
    if (meQuery.data) {
      setUser(meQuery.data);
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
      window.location.hash = targetScreen;
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") as CustomerScreen;
      const validScreens: CustomerScreen[] = [
        "home", "newRequest", "clothIssue", "summary", "quotes", "confirm",
        "orders", "orderDetails", "profile", "support", "editProfile",
        "savedAddresses", "wallet", "helpCenter", "aboutDarji"
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
    window.location.hash = "orderDetails";
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
    window.location.hash = nextScreen === "home" ? "" : nextScreen;
  }

  function navigateBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = "home";
    }
  }

  if (!accessToken) return <AuthPanel />;

  const sharedError = requests.error ?? coupons.error ?? wallet.error ?? notifications.error ?? addresses.error;
  const initialLoading = syncing && !requests.data && !coupons.data && !wallet.data && !notifications.data && !addresses.data && !sharedError;

  if (initialLoading) return <LoadingScreen label="Loading your orders" />;

  return (
    <main className="min-h-screen bg-[#f6f8fb] pb-24 md:pb-0">
      <AppHeader screen={screen} setScreen={setAppScreen} signOut={signOut} syncing={syncing} />
      <div className="shell py-7">
        {sharedError ? <p className="mb-5 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(sharedError)}</p> : null}
        {screen === "home" ? <HomeScreen requests={requestRows} wallet={wallet.data} draft={draft} setScreen={setAppScreen} openOrder={openOrder} /> : null}
        {screen === "newRequest" ? <NewRequestStep draft={draft} setDraft={setDraft} setScreen={setAppScreen} addresses={addressRows} /> : null}
        {screen === "clothIssue" ? <ClothIssueStep draft={draft} setDraft={setDraft} setScreen={setAppScreen} /> : null}
        {screen === "summary" ? <OrderSummaryStep draft={draft} setDraft={setDraft} setScreen={setAppScreen} setSelectedQuote={setSelectedQuote} /> : null}
        {screen === "quotes" ? <QuotesStep draft={draft} selectedQuote={selectedQuote} setSelectedQuote={setSelectedQuote} setScreen={setAppScreen} /> : null}
        {screen === "confirm" && selectedQuote ? <ConfirmOrderStep draft={draft} quote={selectedQuote} coupons={couponRows} setDraft={setDraft} setScreen={setAppScreen} onOrderPlaced={handleOrderPlaced} /> : null}
        {screen === "confirm" && !selectedQuote ? <QuotesStep draft={draft} selectedQuote={selectedQuote} setSelectedQuote={setSelectedQuote} setScreen={setAppScreen} /> : null}
        {screen === "orders" ? <OrdersScreen requests={requestRows} openOrder={openOrder} setScreen={setAppScreen} /> : null}
        {screen === "orderDetails" && selectedOrder ? <OrderDetailsScreen request={selectedOrder} coupons={couponRows} setScreen={setAppScreen} onOrderPlaced={handleOrderPlaced} /> : null}
        {screen === "orderDetails" && !selectedOrder ? <OrdersScreen requests={requestRows} openOrder={openOrder} setScreen={setAppScreen} /> : null}
        {screen === "profile" ? <ProfileScreen wallet={wallet.data} coupons={couponRows} notifications={notificationRows} addresses={addressRows} setScreen={setAppScreen} signOut={signOut} /> : null}
        {screen === "editProfile" ? <EditProfileScreen setScreen={setAppScreen} /> : null}
        {screen === "support" ? <ContactSupportScreen setScreen={setAppScreen} orders={requestRows} /> : null}
        {screen === "savedAddresses" ? <SavedAddressesScreen setScreen={setAppScreen} /> : null}
        {screen === "wallet" ? <WalletScreen setScreen={setAppScreen} /> : null}
        {screen === "helpCenter" ? <HelpCenterScreen setScreen={setAppScreen} /> : null}
        {screen === "aboutDarji" ? <AboutDarjiScreen setScreen={setAppScreen} /> : null}
      </div>
      <OrderPlacedModal success={orderSuccess} onClose={() => setOrderSuccess(undefined)} onOrders={() => { setOrderSuccess(undefined); setAppScreen("orders"); }} />
      <BottomNav screen={screen} setScreen={setAppScreen} />
    </main>
  );
}
