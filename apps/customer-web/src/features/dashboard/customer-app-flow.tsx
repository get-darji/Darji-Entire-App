"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpDown,
  Bell,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Edit3,
  Filter,
  Headphones,
  Home,
  Loader2,
  LocateFixed,
  LogOut,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  Ruler,
  Scissors,
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
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { BrandLogo } from "@/src/components/brand-logo";
import { Button, EmptyState, FieldShell, inputClass } from "@/src/components/ui";
import { customerApi, errorMessage } from "@/src/lib/api";
import { couponDiscount, couponLabel, deliveryFeeForUrgency, HOME_MEASUREMENT_FEE, PLATFORM_FEE, quoteEta } from "@/src/lib/pricing";
import type { Address, CheckoutResponse, Coupon, HandoffOtp, NotificationRow, TailoringRequest, TailoringRequestItem, TailorQuote, UploadedMedia, WalletSummary } from "@/src/lib/types";
import { useAuthStore } from "@/src/store/auth-store";

type CustomerScreen = "home" | "newRequest" | "clothIssue" | "summary" | "quotes" | "confirm" | "orders" | "orderDetails" | "account";
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
  { screen: "account", label: "Account", icon: UserRound }
] as const;

const genderOptions = ["Women", "Men", "Kids", "Unisex"];
const clothTypes = ["Kurta / Salwar", "Saree / Blouse", "Shirt / Pants", "Suit / Blazer", "Dress", "Lehenga", "Jeans", "School Uniform", "Others"];
const workTypes = ["Alteration", "Custom Stitching", "Repair", "Resize", "Blouse Stitching", "Zip / Button Fix", "Fall / Pico", "Embroidery"];
const urgencyOptions = ["Normal (3-5 days)", "Express (1-2 days)", "Same Day", "Instant Delivery"];
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

async function openRazorpay(requestId: string, razorpay: Extract<CheckoutResponse, { mode: "online" }>["razorpay"], onVerified: () => Promise<void>) {
  if (typeof window === "undefined") return;
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
      await customerApi.verifyCheckout(requestId, payment);
      await onVerified();
    },
    theme: { color: "#ff7000" }
  });
  checkout.open();
}

function AuthPanel() {
  const setSession = useAuthStore((state) => state.setSession);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [notice, setNotice] = useState<string>();

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
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="shell grid min-h-screen items-center gap-8 py-8 lg:grid-cols-[1fr_420px]">
        <section className="overflow-hidden rounded-[2rem] border border-[#efcf92] bg-[#fffaf0] p-8 shadow-[0_24px_80px_rgba(246,163,19,0.13)]">
          <Link href="/" className="inline-flex rounded-xl">
            <BrandLogo imageClassName="h-[84px] w-auto" />
          </Link>
          <div className="mt-16 max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Customer app on web</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.02] text-[var(--darji-ink)] md:text-6xl">Book tailoring from your doorstep.</h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-[var(--darji-muted)]">Use the same phone number as the mobile app to continue orders, quotes, coupons, wallet, and delivery tracking.</p>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[
              ["Photos", "Upload cloth media"],
              ["Quotes", "Choose your tailor"],
              ["Tracking", "Follow every step"]
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl bg-white px-4 py-4">
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--darji-muted)]">{copy}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="premium-card rounded-[2rem] p-6">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Login</p>
          <h2 className="mt-3 text-3xl font-black">Enter your phone number</h2>
          <div className="mt-7 grid gap-4">
            <FieldShell label="Phone Number">
              <input className={inputClass} inputMode="tel" maxLength={10} placeholder="9876543210" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} />
            </FieldShell>
            {step === "otp" ? (
              <FieldShell label="OTP Verification">
                <input className={inputClass} inputMode="numeric" maxLength={6} placeholder="Enter 6 digit OTP" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} />
              </FieldShell>
            ) : null}
            {notice ? <p className="rounded-2xl bg-[#ecfdf5] px-4 py-3 text-sm font-bold text-[#047857]">{notice}</p> : null}
            {requestOtp.error || verifyOtp.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(requestOtp.error ?? verifyOtp.error)}</p> : null}
            {step === "phone" ? (
              <Button loading={requestOtp.isPending} onClick={() => requestOtp.mutate()}>Send OTP</Button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button loading={verifyOtp.isPending} onClick={() => verifyOtp.mutate()}>Verify</Button>
                <Button variant="secondary" onClick={() => setStep("phone")}>Change</Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StepProgress({ screen }: { screen: CustomerScreen }) {
  const activeIndex = flowSteps.findIndex((step) => step.id === screen);
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {flowSteps.map((step, index) => {
        const done = activeIndex >= index;
        return (
          <div key={step.id} className={`rounded-2xl border px-3 py-3 text-xs font-black ${done ? "border-[#ffb36f] bg-[#fff7e8] text-[var(--darji-orange)]" : "border-[#e6edf5] bg-white text-[var(--darji-muted)]"}`}>
            <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-white text-[var(--darji-ink)]">{index + 1}</span>
            {step.label}
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
        <div className="flex items-center gap-2">
          {syncing ? (
            <span className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--darji-muted)] shadow-sm sm:inline-flex">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing
            </span>
          ) : null}
          <Button variant="ghost" className="min-h-10 px-4" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
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

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-[#efcf92] bg-[#fffaf0] p-7">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Doorstep tailoring</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] md:text-5xl">Start with photos. Finish with a confirmed tailor.</h1>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setScreen(nextScreen)}>
              <Plus className="h-4 w-4" />
              {hasDraft ? "Continue Booking" : "Book Service"}
            </Button>
            <Button variant="secondary" onClick={() => setScreen("orders")}>
              <PackageCheck className="h-4 w-4" />
              View Orders
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <MetricTile label="Active" value={activeOrders.length} icon={Clock} />
          <MetricTile label="Orders" value={requests.length} icon={PackageCheck} />
          <MetricTile label="Wallet" value={formatMoney(wallet?.balance)} icon={Wallet} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {homeBookingSteps.map(({ label, icon: Icon }, index) => (
          <div key={label} className="rounded-2xl border border-[#e6edf5] bg-white p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff2d8] text-[var(--darji-orange)]">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-muted)]">Step {index + 1}</p>
            <p className="mt-1 font-black">{label}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Orders</p>
            <h2 className="mt-1 text-3xl font-black">Live orders</h2>
          </div>
          <button onClick={() => setScreen("orders")} className="text-sm font-black text-[var(--darji-orange)]">See all</button>
        </div>
        <OrdersList requests={requests.slice(0, 3)} openOrder={openOrder} compact />
      </section>
    </div>
  );
}

function MetricTile({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
      <Icon className="h-5 w-5 text-[var(--darji-orange)]" />
      <p className="mt-5 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-muted)]">{label}</p>
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
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#b7c5d8] bg-white px-4 py-5 text-center text-sm font-black text-[var(--darji-muted)]">
        <UploadCloud className="mb-2 h-6 w-6 text-[var(--darji-orange)]" />
        <span className="text-[var(--darji-ink)]">{label}</span>
        <span className="mt-1 text-xs font-bold text-[var(--darji-muted)]">{helper}</span>
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
      (position) => {
        const value = `Lat ${position.coords.latitude.toFixed(5)}, Lng ${position.coords.longitude.toFixed(5)}`;
        setDraft((current) => ({ ...current, pickup: value }));
        setLocationStatus("Location added.");
      },
      () => setLocationStatus("Could not read location.")
    );
  }

  return (
    <FlowLayout screen="newRequest" title="Start Booking" onBack={() => setScreen("home")}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="premium-card rounded-[2rem] p-6">
          <div className="grid gap-5">
            <FieldShell label="Clothing Issue">
              <textarea
                className={`${inputClass} min-h-32 py-4`}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Example: sleeves are loose, waist needs fitting, zip repair, or custom stitching details."
              />
            </FieldShell>
            <FieldShell label="Pickup Address">
              <textarea
                className={`${inputClass} min-h-28 py-4`}
                value={draft.pickup}
                onChange={(event) => setDraft((current) => ({ ...current, pickup: event.target.value }))}
                placeholder="House, street, landmark, city, pincode"
              />
            </FieldShell>
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.slice(0, 4).map((address) => (
                <button key={address.id} onClick={() => setDraft((current) => ({ ...current, pickup: addressText(address) }))} className="rounded-2xl border border-[#e6edf5] bg-white p-4 text-left text-sm font-bold hover:border-[#ffb36f]">
                  <span className="block font-black">{address.label ?? "Saved address"}</span>
                  <span className="mt-1 line-clamp-2 block text-[var(--darji-muted)]">{addressText(address)}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={useCurrentLocation} className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e6edf5] bg-white px-4 py-2 text-sm font-black text-[var(--darji-ink)]">
              <LocateFixed className="h-4 w-4 text-[var(--darji-orange)]" />
              Use Current Location
            </button>
            {locationStatus ? <p className="text-sm font-bold text-[var(--darji-muted)]">{locationStatus}</p> : null}
            <UploadBox
              label={draft.uploadedMedia.length || draft.media.length ? "Replace clothing media" : "Upload clothing photos or videos"}
              helper={`Up to ${MAX_MEDIA_FILES} files`}
              local={draft.media}
              uploaded={draft.uploadedMedia}
              onFiles={(media) => setDraft((current) => ({ ...current, media, uploadedMedia: [] }))}
            />
            {formError || upload.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{formError ?? errorMessage(upload.error)}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button loading={upload.isPending} onClick={continueToIssue}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
              {draft.items.length ? <Button variant="secondary" onClick={() => setScreen("summary")}>Back to Summary</Button> : null}
            </div>
          </div>
        </section>
        <aside className="grid content-start gap-4">
          <MiniSummary draft={draft} />
          <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
            <p className="font-black">Saved in this order</p>
            <p className="mt-3 text-3xl font-black">{draft.items.length}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--darji-muted)]">clothing item{draft.items.length === 1 ? "" : "s"}</p>
          </div>
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
  const guide = guideForClothType(draft.clothType);

  async function saveItem(action: SaveAction) {
    setFormError(undefined);
    if (!draft.gender || !draft.clothType || !draft.workType || !draft.urgency) {
      setFormError("Select gender, cloth type, work type, and urgency.");
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
    <FlowLayout screen="clothIssue" title="Cloth Details" onBack={() => setScreen("newRequest")}>
      <div className="grid gap-6 xl:grid-cols-[1fr_370px]">
        <section className="premium-card rounded-[2rem] p-6">
          <div className="grid gap-6">
            <ChipGroup label="Gender" options={genderOptions} value={draft.gender} onChange={(value) => setDraft((current) => ({ ...current, gender: value }))} />
            <ChipGroup label="Cloth Type" options={clothTypes} value={draft.clothType} onChange={(value) => setDraft((current) => ({ ...current, clothType: value, measurements: {} }))} />
            <ChipGroup label="Work Type" options={workTypes} value={draft.workType} onChange={(value) => setDraft((current) => ({ ...current, workType: value }))} />
            <ChipGroup label="Urgency" options={urgencyOptions} value={draft.urgency} onChange={(value) => setDraft((current) => ({ ...current, urgency: value }))} />

            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-muted)]">Measurements</p>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleTile
                checked={draft.sampleProvided === true}
                title="Sample garment"
                copy="Use an existing fit reference"
                onChange={(checked) => setDraft((current) => ({ ...current, sampleProvided: checked, sampleMedia: checked ? current.sampleMedia : [], uploadedSampleMedia: checked ? current.uploadedSampleMedia : undefined }))}
              />
              <ToggleTile
                checked={draft.homeMeasurementBooked === true}
                title="Home measurement"
                copy={`${formatMoney(HOME_MEASUREMENT_FEE)} visit fee`}
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

            {formError ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{formError}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button loading={savingAction === "summary"} onClick={() => void saveItem("summary")}>
                Review Order <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" loading={savingAction === "another"} onClick={() => void saveItem("another")}>
                <Plus className="h-4 w-4" /> Add Another Cloth
              </Button>
            </div>
          </div>
        </section>
        <aside className="grid content-start gap-4">
          <MeasurementGuideCard guide={guide} clothType={draft.clothType} />
          <MiniSummary draft={draft} />
        </aside>
      </div>
    </FlowLayout>
  );
}

function FlowLayout({ screen, title, onBack, children }: { screen: CustomerScreen; title: string; onBack: () => void; children: React.ReactNode }) {
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
        <StepProgress screen={screen} />
      </div>
      {children}
    </div>
  );
}

function ChipGroup({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} onClick={() => onChange(option)} className={`rounded-full border px-4 py-2 text-sm font-black transition ${value === option ? "border-[var(--darji-orange)] bg-[#fff7e8] text-[var(--darji-orange)]" : "border-[#e6edf5] bg-white text-[var(--darji-muted)] hover:text-[var(--darji-ink)]"}`}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleTile({ checked, title, copy, onChange }: { checked: boolean; title: string; copy: string; onChange: (checked: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left ${checked ? "border-[var(--darji-orange)] bg-[#fff7e8]" : "border-[#e6edf5] bg-white"}`}>
      <span>
        <span className="block font-black">{title}</span>
        <span className="mt-1 block text-sm font-semibold text-[var(--darji-muted)]">{copy}</span>
      </span>
      <span className={`grid h-8 w-8 place-items-center rounded-full border ${checked ? "border-[var(--darji-orange)] bg-[var(--darji-orange)] text-white" : "border-[#dce4ef] bg-white text-transparent"}`}>
        <Check className="h-4 w-4" />
      </span>
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
    <FlowLayout screen="summary" title="Order Summary" onBack={() => setScreen("clothIssue")}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-4">
          {items.length ? (
            items.map((item, index) => <DraftItemCard key={item.id} item={item} index={index} onEdit={() => editItem(item)} onDelete={() => deleteItem(item.id)} />)
          ) : (
            <EmptyState title="No clothing items" copy="Add one cloth before requesting quotes." />
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={() => { setDraft((current) => clearActiveClothingItem({ ...current, items })); setScreen("newRequest"); }}>
              <Plus className="h-4 w-4" /> Add Another Cloth
            </Button>
            <Button loading={createRequest.isPending} disabled={!items.length} onClick={() => createRequest.mutate()}>
              Get Quotes <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {createRequest.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(createRequest.error)}</p> : null}
        </section>
        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
            <p className="font-black">Pickup</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{draft.pickup || "Not selected"}</p>
          </div>
          <MiniSummary draft={draft} />
        </aside>
      </div>
    </FlowLayout>
  );
}

function DraftItemCard({ item, index, onEdit, onDelete }: { item: ClothingItemDraft; index: number; onEdit: () => void; onDelete: () => void }) {
  const thumbnail = firstMediaUrl(item);
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-[2rem] p-5">
      <div className="grid gap-4 sm:grid-cols-[116px_1fr_auto]">
        <div className="aspect-square overflow-hidden rounded-2xl border border-[#e6edf5] bg-[#fffaf0]">
          {thumbnail ? <img src={thumbnail} alt={clothingItemTitle(item)} className="h-full w-full object-cover" /> : <Shirt className="m-auto mt-10 h-9 w-9 text-[var(--darji-orange)]" />}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-orange)]">Item {index + 1}</p>
          <h3 className="mt-2 text-xl font-black">{clothingItemTitle(item)}</h3>
          <p className="mt-1 text-sm font-bold text-[var(--darji-muted)]">{clothingItemSummary(item)}</p>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--darji-muted)]">{item.description}</p>
          <span className="mt-3 inline-flex rounded-full bg-[#fff2d8] px-3 py-1 text-xs font-black text-[var(--darji-orange)]">{measurementStatusForItem(item)}</span>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <button onClick={onEdit} className="grid h-11 w-11 place-items-center rounded-2xl border border-[#e6edf5] bg-white text-[var(--darji-ink)]"><Edit3 className="h-4 w-4" /></button>
          <button onClick={onDelete} className="grid h-11 w-11 place-items-center rounded-2xl border border-[#fee2e2] bg-[#fff1f2] text-[#b91c1c]"><Trash2 className="h-4 w-4" /></button>
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
    <FlowLayout screen="quotes" title="Tailor Quotes" onBack={() => setScreen("summary")}>
      <div className="grid gap-5">
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#e6edf5] bg-white p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-black">{quotes.isLoading ? "Checking tailor quotes" : `${visibleQuotes.length} tailor quote${visibleQuotes.length === 1 ? "" : "s"}`}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--darji-muted)]">{clothingItemsForDraft(draft).length} clothing item{clothingItemsForDraft(draft).length === 1 ? "" : "s"}</p>
          </div>
          <Button variant="secondary" loading={quotes.isFetching} onClick={() => void quotes.refetch()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {!visibleQuotes.length && !quotes.isLoading ? (
          <EmptyState title="Waiting for tailor quotes" copy="Your request is open. Quotes will appear here when verified tailors respond." />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {visibleQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} selected={selectedQuote?.id === quote.id} onSelect={() => setSelectedQuote(quote)} />)}
        </div>

        {quotes.error ? <p className="rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(quotes.error)}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button disabled={!selectedQuote} onClick={() => setScreen("confirm")}>
            Confirm This Tailor <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => setScreen("orders")}>View Orders</Button>
        </div>
      </div>
    </FlowLayout>
  );
}

function QuoteCard({ quote, selected, onSelect }: { quote: TailorQuote; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`rounded-[2rem] border p-5 text-left transition ${selected ? "border-[var(--darji-orange)] bg-[#fff7e8] shadow-[0_18px_50px_rgba(255,112,0,0.14)]" : "border-[#e6edf5] bg-white hover:border-[#ffb36f]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--darji-ink)] text-sm font-black text-white">{quoteInitials(quote)}</span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-black">{quote.tailor?.shopName ?? "Verified Tailor"}</span>
            <span className="mt-1 flex items-center gap-1 text-sm font-bold text-[var(--darji-muted)]">
              <Star className="h-4 w-4 fill-[var(--darji-orange)] text-[var(--darji-orange)]" />
              {quote.tailor?.rating ?? "4.8"} rating
            </span>
          </span>
        </div>
        <span className="text-2xl font-black text-[var(--darji-orange)]">{formatMoney(quote.price)}</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <SummaryLine label="ETA" value={quoteEta(quote)} />
        <SummaryLine label="Pickup" value={quote.pickupIncluded === false ? "Extra" : "Included"} />
      </div>
      {quote.message ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{quote.message}</p> : null}
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE");
  const [couponInput, setCouponInput] = useState("");
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon>();
  const [couponMessage, setCouponMessage] = useState<string>();
  const items = clothingItemsForDraft(draft);
  const deliveryFee = deliveryFeeForUrgency(draft.urgency ?? "");
  const homeFee = homeMeasurementFeeForItems(items);
  const subtotal = Number(quote.price ?? 0) + deliveryFee + PLATFORM_FEE + homeFee;
  const discount = couponDiscount(selectedCoupon, subtotal);
  const total = Math.max(subtotal - discount, 0);

  const checkout = useMutation({
    mutationFn: () => {
      if (!draft.backendRequestId) throw new Error("Request ID missing.");
      return customerApi.checkout(draft.backendRequestId, {
        quoteId: quote.id,
        paymentMethod,
        deliveryFee,
        platformFee: PLATFORM_FEE,
        homeMeasurementFee: homeFee,
        couponCode: selectedCoupon?.code,
        additionalItems: items.slice(1).map((item) => ({ gender: item.gender, clothType: item.clothType, workType: item.workType, description: item.description })),
        totalAmount: total
      });
    },
    onSuccess: async (response) => {
      if (response.mode === "online") {
        await openRazorpay(response.request.id, response.razorpay, async () => {
          await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
          setDraft(makeEmptyDraft(defaultPickup));
          onOrderPlaced(response.request);
        });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
        setDraft(makeEmptyDraft(defaultPickup));
        onOrderPlaced(response.request);
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
    <FlowLayout screen="confirm" title="Confirm Order" onBack={() => setScreen("quotes")}>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="grid gap-5">
          <div className="premium-card rounded-[2rem] p-6">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--darji-orange)]">Selected tailor</p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--darji-ink)] text-sm font-black text-white">{quoteInitials(quote)}</span>
                <div>
                  <h2 className="text-2xl font-black">{quote.tailor?.shopName ?? "Verified Tailor"}</h2>
                  <p className="text-sm font-bold text-[var(--darji-muted)]">ETA {quoteEta(quote)}</p>
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--darji-orange)]">{formatMoney(quote.price)}</p>
            </div>
          </div>

          <div className="premium-card rounded-[2rem] p-6">
            <p className="font-black">Payment method</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["ONLINE", "UPI", "COD"] as const).map((method) => (
                <button key={method} onClick={() => setPaymentMethod(method)} className={`rounded-2xl border px-4 py-4 text-sm font-black ${paymentMethod === method ? "border-[var(--darji-orange)] bg-[#fff7e8] text-[var(--darji-orange)]" : "border-[#e6edf5] bg-white text-[var(--darji-muted)]"}`}>
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="premium-card rounded-[2rem] p-6">
            <p className="font-black">Coupons</p>
            <div className="mt-4 flex gap-2">
              <input className={inputClass} value={couponInput} onChange={(event) => setCouponInput(event.target.value.toUpperCase())} placeholder="Coupon code" />
              <Button variant="secondary" onClick={() => applyCoupon()}>Apply</Button>
            </div>
            {couponMessage ? <p className="mt-3 text-sm font-bold text-[var(--darji-muted)]">{couponMessage}</p> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {coupons.filter((coupon) => coupon.isActive).slice(0, 4).map((coupon) => (
                <button key={coupon.code} onClick={() => applyCoupon(coupon.code)} className={`rounded-2xl border p-4 text-left text-sm font-bold ${selectedCoupon?.code === coupon.code ? "border-[#16a34a] bg-[#ecfdf5]" : "border-[#e6edf5] bg-white"}`}>
                  <span className="block font-black">{coupon.code}</span>
                  <span className="mt-1 block text-[var(--darji-muted)]">{couponLabel(coupon)}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
            <p className="font-black">Payable</p>
            <div className="mt-4 grid gap-2">
              <SummaryLine label="Tailor quote" value={formatMoney(quote.price)} />
              <SummaryLine label="Delivery" value={formatMoney(deliveryFee)} />
              <SummaryLine label="Platform" value={formatMoney(PLATFORM_FEE)} />
              {homeFee ? <SummaryLine label="Home measurement" value={formatMoney(homeFee)} /> : null}
              {discount ? <SummaryLine label="Coupon" value={`-${formatMoney(discount)}`} /> : null}
              <SummaryLine label="Total" value={formatMoney(total)} strong />
            </div>
            {checkout.error ? <p className="mt-4 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(checkout.error)}</p> : null}
            <Button className="mt-5 w-full" loading={checkout.isPending} onClick={() => checkout.mutate()}>
              {paymentMethod === "COD" ? "Confirm COD" : paymentMethod === "UPI" ? "Pay UPI" : "Pay Online"} {formatMoney(total)}
            </Button>
          </div>
          <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
            <p className="font-black">Items</p>
            <div className="mt-3 grid gap-2">
              {items.map((item, index) => <SummaryLine key={item.id} label={`Item ${index + 1}`} value={clothingItemSummary(item)} />)}
            </div>
          </div>
        </aside>
      </div>
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
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-[2rem] p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--darji-orange)]">{requestCode(request)}</p>
          <h3 className="mt-2 text-xl font-black">{orderItemCount(request)} clothing item{orderItemCount(request) > 1 ? "s" : ""}</h3>
          <p className="mt-2 text-sm font-semibold text-[var(--darji-muted)]">{request.items?.[0] ? clothingItemSummary(request.items[0]) : `${request.workType} - ${request.clothType}`}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-4 py-2 text-sm font-black ${statusPillClass(request)}`}>{statusLabel(request)}</span>
          <button onClick={openOrder} className="grid h-11 w-11 place-items-center rounded-full bg-[var(--darji-ink)] text-white">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      {!compact ? <OrderTimeline request={request} /> : null}
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
  const quotes = useQuery({ queryKey: ["customer", "quotes", request.id], queryFn: () => customerApi.quotes(request.id) });
  const visibleQuotes = (quotes.data ?? []).filter((quote) => ["SUBMITTED", "RESERVED", "ACCEPTED"].includes(quote.status));
  const deliveryFee = deliveryFeeForUrgency(request.urgency);
  const homeFee = homeMeasurementFeeForItems(request.items ?? []);
  const subtotal = Number(selectedQuote?.price ?? 0) + deliveryFee + PLATFORM_FEE + homeFee;
  const discount = couponDiscount(selectedCoupon, subtotal);
  const total = Math.max(subtotal - discount, 0);

  const checkout = useMutation({
    mutationFn: () => {
      if (!selectedQuote) throw new Error("Select a tailor quote first.");
      return customerApi.checkout(request.id, {
        quoteId: selectedQuote.id,
        paymentMethod,
        deliveryFee,
        platformFee: PLATFORM_FEE,
        homeMeasurementFee: homeFee,
        couponCode: selectedCoupon?.code,
        additionalItems: request.items?.slice(1).map((item) => ({ gender: item.gender, clothType: item.clothType, workType: item.workType, description: item.description })) ?? [],
        totalAmount: total
      });
    },
    onSuccess: async (response) => {
      if (response.mode === "online") {
        await openRazorpay(response.request.id, response.razorpay, async () => {
          await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
          onOrderPlaced(response.request);
        });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["customer", "requests"] });
        onOrderPlaced(response.request);
      }
    }
  });

  return (
    <section className="premium-card rounded-[2rem] p-6">
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
          <div className="rounded-2xl border border-[#e6edf5] bg-white p-5">
            <SummaryLine label="Subtotal" value={formatMoney(subtotal)} />
            {discount ? <SummaryLine label="Coupon" value={`-${formatMoney(discount)}`} /> : null}
            <SummaryLine label="Payable" value={formatMoney(total)} strong />
            {checkout.error ? <p className="mt-4 rounded-2xl bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">{errorMessage(checkout.error)}</p> : null}
            <Button className="mt-5 w-full" loading={checkout.isPending} onClick={() => checkout.mutate()}>Confirm Order</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AccountScreen({
  wallet,
  coupons,
  notifications,
  addresses,
  signOut
}: {
  wallet?: WalletSummary;
  coupons: Coupon[];
  notifications: NotificationRow[];
  addresses: Address[];
  signOut: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--darji-orange)]">Account</p>
          <h1 className="mt-1 text-4xl font-black">{user?.name ?? "Darji Customer"}</h1>
          <p className="mt-2 font-bold text-[var(--darji-muted)]">{user?.phone}</p>
        </div>
        <Button variant="secondary" onClick={signOut}><LogOut className="h-4 w-4" /> Logout</Button>
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] bg-[var(--darji-ink)] p-7 text-white">
          <CreditCard className="h-8 w-8 text-[var(--darji-orange)]" />
          <p className="mt-10 text-sm font-black uppercase tracking-[0.16em] text-white/55">Wallet Balance</p>
          <p className="mt-3 text-5xl font-black">{formatMoney(wallet?.balance)}</p>
        </div>
        <AddressManager addresses={addresses} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <CouponsBox coupons={coupons} />
        <NotificationsBox notifications={notifications} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <WalletActivity wallet={wallet} />
        <SupportBox />
      </section>
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
  const { accessToken, signOut } = useAuthStore();
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

  const requestRows = requests.data ?? [];
  const couponRows = coupons.data ?? [];
  const addressRows = addresses.data ?? [];
  const notificationRows = notifications.data ?? [];
  const syncing = requests.isLoading || coupons.isLoading || wallet.isLoading || notifications.isLoading || addresses.isLoading;
  const selectedOrder = useMemo(() => requestRows.find((request) => request.id === selectedOrderId), [requestRows, selectedOrderId]);

  useEffect(() => {
    if (!draft.pickup && addressRows[0]) {
      setDraft((current) => (current.pickup ? current : { ...current, pickup: addressText(addressRows[0]) }));
    }
  }, [addressRows, draft.pickup]);

  function openOrder(request: TailoringRequest) {
    setSelectedOrderId(request.id);
    setScreen("orderDetails");
  }

  function handleOrderPlaced(request: TailoringRequest) {
    setSelectedOrderId(request.id);
    setOrderSuccess({ code: requestCode(request), total: request.totalAmount, paymentMethod: request.paymentMethod });
    setScreen("orders");
  }

  function setAppScreen(nextScreen: CustomerScreen) {
    if (nextScreen === "newRequest" && draft.backendRequestId) {
      setScreen("quotes");
      return;
    }
    setScreen(nextScreen);
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
        {screen === "account" ? <AccountScreen wallet={wallet.data} coupons={couponRows} notifications={notificationRows} addresses={addressRows} signOut={signOut} /> : null}
      </div>
      <OrderPlacedModal success={orderSuccess} onClose={() => setOrderSuccess(undefined)} onOrders={() => { setOrderSuccess(undefined); setScreen("orders"); }} />
      <BottomNav screen={screen} setScreen={setAppScreen} />
    </main>
  );
}
