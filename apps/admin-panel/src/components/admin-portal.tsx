"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CUSTOMER_WEBSITE_SLIDER_SETTING_KEY,
  customerWebsiteSliderContrastRatio,
  defaultCustomerWebsiteSlider,
  normalizeCustomerWebsiteSlider,
  type CustomerWebsiteSlider
} from "../../../../shared/src/customer-website-slider";
import { defaultPlatformStatus, type MaintenanceApp, type PlatformStatus } from "../../../../shared/src/platform-status";
import { defaultFestivalTheme, festivalThemeStatus, type FestivalThemeConfig, type FestivalThemeState } from "../../../../shared/src/festival-theme";
import { defaultServiceAreaConfig, type ServiceAreaConfig } from "../../../../shared/src/service-area";
import { allowedOrderStatusTransitions, orderStatuses } from "../../../../shared/src/order-statuses";
import { GARMENTS_BY_GENDER, GENDER_FIT_OPTIONS, SERVICE_CATEGORIES, getGarmentsForGender, getServiceCategory } from "../../../../shared/src/cloth-details";
import { calculateCouponBenefit, getPlatformFee, getSmallOrderFee, measurementVisitFee } from "@darji/shared";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from "@tanstack/react-table";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  Filter,
  Info,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  Menu,
  MessageSquareText,
  Mail,
  Package,
  PackageCheck,
  PencilLine,
  Phone,
  PhoneCall,
  Plus,
  Printer,
  ReceiptIndianRupee,
  RotateCcw,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Ticket,
  Truck,
  UserCircle2,
  Users,
  X,
  CheckCheck,
  Paperclip,
  Smile,
  FileText,
  Image as ImageIcon,
  Send,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  UserRoundPlus,
  Copy,
  Flag,
  Trash2,
  AlertTriangle,
  Hourglass,
  MapPin,
  Mic,
  Square,
  Sparkles
} from "lucide-react";
import { forwardRef, useEffect, useMemo, useState, useRef, type ComponentType, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { EntityLink } from "./entity-link";
import {
  assignOrder,
  assignMeasurementVisit,
  cancelDeliveryRetry,
  cancelTailoringRequest,
  createAdminOrder,
  createAdminTailoringRequest,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  deleteAdminAccount,
  extractError,
  getAnalytics,
  getCatalog,
  getDashboardAnalytics,
  getCoupons,
  getCouponRedemptions,
  getDeliveryPartners,
  getDeliveryBatches,
  notifyDeliveryBatch,
  getDeliveryRequests,
  getDeliveryRetries,
  getMe,
  getMeasurementVisits,
  getOrders,
  getPayments,
  getPlatformStatus,
  getFestivalTheme,
  getServiceAreaConfig,
  getServiceAreaInterests,
  geocodeServiceArea,
  getWalletPayouts,
  getFinancialLedger,
  getWalletDetail,
  createWalletPayout,
  getOperationalAlerts,
  updateOperationalAlert,
  getSettings,
  resetEverythingDevelopment,
  resetOrdersRequestsBatches,
  getSupportTickets,
  getTailoringRequests,
  getTailors,
  getUsers,
  getCustomerProfile,
  getOrderById,
  getTailoringRequestById,
  inviteAdmin,
  markPaymentPaid,
  moderateUser,
  requestOtp,
  reviewDeliveryVerification,
  reviewTailorSample,
  reviewTailorVerification,
  updateOrderStatus,
  updateTailoringWorkStatus,
  updateTailoringMeasurementBypass,
  updatePlatformStatus,
  updateFestivalTheme,
  updateServiceAreaConfig,
  updateSetting,
  verifyOtp,
  replyToSupportTicket,
  getSupportStats,
  getBugReports,
  updateBugReport,
  getAccountChangeRequests,
  approveAccountChangeRequest,
  rejectAccountChangeRequest,
  getAdminReviews,
  toggleReviewFeatured,
  toggleReviewHidden,
  deleteReview,
  resolveDeliveryRetry,
  retryDeliveryNow,
  reassignDeliveryBatchTask,
  sendAdminNotification,
  getAdminNotificationCampaigns,
  getAdminActivityLogs,
  getAdminTailorQuotes,
  alertAdminNoQuote,
  uploadAdminTailoringAuditMedia,
  deleteAdminTailoringAuditMedia,
  getDeliveryRequestById,
  getDeliveryRescheduleOptions,
  rescheduleAdminDelivery,
  failAdminDelivery,
  getAdminOrderMetadata,
  updateAdminOrderMetadata,
  downloadAdminOrderImages,
  downloadAdminOrderInvoice,
  permanentlyDeleteAdminOrder,
  getAdminOrderQuotes,
  updateAdminOrderQuote,
  getAdminAssignmentCandidates,
  reportAdminOrderIssue,
  updateAdminTailorProfile,
  updateAdminDeliveryProfile,
  getAdminPartnerProfileChangeLog,
  getSystemHealth,
  getMarketingSignups,
  updateAdminProfile,
  restoreAdminSession,
  logoutAdminSession,
  addSupportTicketMessage,
  addBugReportMessage,
  addChangeRequestMessage,
  uploadAdminMedia,
  uploadAdminTailoringMedia,
  startAdminTailoringCheckout,
  verifyAdminTailoringCheckout,
  recoverAdminTailoringCheckout,
  reverseGeocodeAdminLocation,
  selectAdminTailorQuote,
  type UploadedTailoringMedia,
  type AdminReview,
  type AdminPartnerProfileUpdate,
  type AdminAssignmentCandidate
} from "@/src/lib/api";
import {
  cn,
  formatCurrency,
  formatDate,
  formatList,
  formatStatus,
  getInitials,
  isToday,
  percentage,
  stringifyUnknown
} from "@/src/lib/utils";
import { getCustomerFallbackAvatarUrl, getDefaultAvatarUrl } from "@/src/lib/avatar";
import { type SectionId, useAdminStore } from "@/src/store/admin-store";
import SupportCommandCenter from "./support-command-center";
import type {
  AdminUser,
  AnalyticsSummary,
  DashboardAnalytics,
  Coupon,
  DeliveryPartnerProfile,
  DeliveryBatch,
  DeliveryRequest,
  MeasurementVisit,
  MeResponse,
  Order,
  OrderItem,
  Payment,
  BasicUser,
  CatalogService,
  SettingRecord,
  SupportTicket,
  TailorProfile,
  TailorQuote,
  TailoringRequest,
  BugReport,
  AccountChangeRequest,
  SupportStats,
  WalletPayoutRow,
  WalletDetail,
  FinancialLedgerEntry,
  DeliveryFareSettings,
  OperationalAlert,
  AdminActivityLog,
  SystemHealth,
  NotificationCampaign,
  MarketingAudienceSummary,
  CustomerProfileOrder,
  CouponRedemption
} from "@/src/types/admin";
import dynamic from "next/dynamic";
const RiderLiveMap = dynamic(() => import("./RiderLiveMap"), { ssr: false });
const ServiceAreaMap = dynamic(() => import("./ServiceAreaMap"), {
  ssr: false,
  loading: () => <div className="grid h-[360px] place-items-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-500">Loading area map...</div>
});

type TrendRange = "daily" | "weekly" | "monthly";
type DashboardPeriodPreset = "today" | "yesterday" | "this_week" | "last_week" | "last_7_days" | "last_30_days" | "this_month" | "previous_month" | "custom" | "lifetime";
type DashboardDrilldownKey =
  | "orders_total"
  | "orders_active"
  | "orders_completed"
  | "orders_cancelled"
  | "orders_pending"
  | "orders_resolved"
  | "orders_realized"
  | "payments_paid"
  | "partner_cost"
  | "pending_payouts"
  | "active_delivery_partners"
  | "active_tailors"
  | "new_customers"
  | "new_tailors"
  | "new_delivery_partners";

type DashboardDrilldown = {
  key: DashboardDrilldownKey;
  label: string;
  target: SectionId;
  periodScoped: boolean;
};

type FinanceDetailKind = "gross_paid" | "partner_cost" | "pending_payouts" | "realized_revenue";

type QueryBundle = {
  analytics: AnalyticsSummary;
  me: MeResponse;
  orders: Order[];
  tailoringRequests: TailoringRequest[];
  deliveryRequests: DeliveryRequest[];
  deliveryBatches: DeliveryBatch[];
  tailors: TailorProfile[];
  partners: DeliveryPartnerProfile[];
  users: AdminUser[];
  payments: Payment[];
  coupons: Coupon[];
  tickets: SupportTicket[];
  settings: SettingRecord[];
};

type TailorTutorialMediaDraft = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  images: string[];
};

type DeliveryBatchSettingsDraft = {
  lockMinutes: number;
  maxOrdersPerBatch: number;
};

type SettingsPage = "festival" | "service-area" | "tutorial" | "delivery" | "development";

type MapPartnerFocus = {
  partnerId: string;
  requestId: number;
};

type DashboardMetrics = {
  averageOrderValue: number;
  cancellationRate: number;
  completionRate: number;
  ordersToday: number;
  pendingCollections: number;
  pendingVerifications: number;
  revenueToday: number;
  totalRevenue: number;
};

type AdminOrderPriority = "Normal" | "High" | "Urgent" | "VIP";

type AdminOrderNote = {
  admin: string;
  note: string;
  createdAt: string;
};

type GlobalSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  section: SectionId;
  icon: ComponentType<{ size?: number; className?: string }>;
  onSelect: () => void;
};

type BatchFocusTarget = {
  batchId: string;
  roundAt: string;
};

type OrderDetailFocus = "overview" | "notes" | "invoice" | "media" | "timeline";

type PaymentBreakdown = {
  customerPaid: number;
  tailorQuote: number;
  measurementVisitCost: number;
  deliveryEarnings: number;
  packagingCost: number;
  netRevenue: number;
  realized: boolean;
};

type FinanceSummary = {
  averagePaidOrderValue: number;
  deliveryEarnings: number;
  failedCount: number;
  grossPaid: number;
  netRevenue: number;
  paidCount: number;
  pendingAmount: number;
  pendingCount: number;
  refundedCount: number;
  revenueToday: number;
  tailorQuotes: number;
  totalPartnerCost: number;
  byPaymentId: Map<string, PaymentBreakdown>;
};

type TableProps<T extends object> = {
  columns: Array<ColumnDef<T>>;
  data: T[];
  emptyMessage: string;
};

type InspectionItem = {
  label: string;
  value: React.ReactNode;
};

type RevenuePoint = {
  label: string;
  revenue: number;
};

type OrderTrendPoint = {
  label: string;
  completed: number;
  active: number;
  cancelled: number;
  pending: number;
};

type AdminCreateOrderDraft = {
  customerId: string;
  customerSearch: string;
  pickupScheduledAt: string;
  paymentMethod: "COD" | "ONLINE" | "UPI";
  instructions: string;
  address: {
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string;
  };
  items: Array<{ serviceId: string; quantity: number; instructions: string }>;
};

type GrowthPoint = {
  label: string;
  customers: number;
  tailors: number;
  partners: number;
};

type PiePoint = {
  name: string;
  value: number;
};

type SupportStreamTab = "customer" | "tailor" | "delivery" | "bugs";

type SupportQueueItem =
  | { kind: "ticket"; entity: SupportTicket }
  | { kind: "request"; entity: AccountChangeRequest }
  | { kind: "bug"; entity: BugReport };

type SupportStatusTabId = "all" | "open" | "pending" | "resolved" | "closed";

type SidebarSection = { id: SectionId; icon: React.ComponentType<{ size?: number }>; label: string; description: string };

const sidebarSections: SidebarSection[] = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard", description: "Platform health and trends" },
  { id: "alerts", icon: Bell, label: "Live Alerts", description: "Operational exceptions requiring attention" },
  { id: "orders", icon: PackageCheck, label: "Orders", description: "Assignment and status control" },
  { id: "tailoring", icon: Scissors, label: "Tailoring Requests", description: "Quote-led requests and work status" },
  { id: "delivery", icon: Truck, label: "Delivery Ops", description: "Pickup and delivery tasks" },
  { id: "batches", icon: PackageCheck, label: "Batch Management", description: "Delivery batch routing and reassignment" },
  { id: "measurements", icon: CalendarDays, label: "Measurements", description: "Home visit assignment and submissions" },
  { id: "tailors", icon: ShieldCheck, label: "Tailors", description: "Availability, verification, earnings" },
  { id: "samples", icon: ImageIcon, label: "Sample Work", description: "Approve tailor profile photos" },
  { id: "partners", icon: Users, label: "Delivery Partners", description: "Fleet management and ratings" },
  { id: "users", icon: UserCircle2, label: "Customers", description: "Customer accounts and access control" },
  { id: "payments", icon: CreditCard, label: "Payments", description: "Collections and payment state" },
  { id: "coupons", icon: Ticket, label: "Coupons", description: "Offers and retention levers" },
  { id: "support", icon: Bell, label: "Support", description: "Tickets and customer follow-up" },
  { id: "reviews", icon: MessageSquareText, label: "Reviews", description: "Customer and tailor reviews management" },
  { id: "notifications", icon: Send, label: "Notifications", description: "Push, SMS, email and in-app campaigns" },
  { id: "activity", icon: FileText, label: "Activity Logs", description: "Admin action audit trail" },
  { id: "roles", icon: ShieldCheck, label: "Accounts", description: "Approved admin phone access" },
  { id: "health", icon: AlertCircle, label: "System Health", description: "Technical service monitoring" },
  { id: "exports", icon: Paperclip, label: "Export Center", description: "Central data export hub" },
  { id: "platform", icon: AlertTriangle, label: "Platform Settings", description: "Live and maintenance controls" },
  { id: "website", icon: ImageIcon, label: "Configure Website", description: "Homepage content and audience" },
  { id: "settings", icon: Settings, label: "Settings", description: "Operational configuration" }
];

const sidebarGroups: Array<{ label: string; sections: SectionId[] }> = [
  { label: "Overview", sections: ["dashboard", "alerts"] },
  { label: "Operations", sections: ["orders", "tailoring", "delivery", "batches", "measurements"] },
  { label: "People", sections: ["users", "tailors", "partners", "samples"] },
  { label: "Money", sections: ["payments", "coupons", "exports"] },
  { label: "Engagement", sections: ["support", "reviews", "notifications"] },
  { label: "Administration", sections: ["activity", "roles", "health", "platform", "website", "settings"] }
];

const validSectionIds = new Set<SectionId>(sidebarSections.map((section) => section.id));

function sectionFromUrl() {
  if (typeof window === "undefined") return undefined;
  const candidate = new URL(window.location.href).searchParams.get("section") as SectionId | null;
  return candidate && validSectionIds.has(candidate) ? candidate : undefined;
}

const pieColors = ["#f6a313", "#0b2241", "#2a79ff", "#f97316", "#10b981"];
const darjiChartPalette = {
  deep: "#0b2241",
  orange: "#f6a313",
  orangeSoft: "#ffd889",
  sky: "#2a79ff",
  success: "#15803d",
  rose: "#dc2626",
  cream: "#fff4dc"
};
const loginPieData = [
  { name: "Orders", value: 42, color: "#f6a313" },
  { name: "Tailoring", value: 28, color: "#0b2241" },
  { name: "Delivery", value: 18, color: "#2a79ff" },
  { name: "Support", value: 12, color: "#f97316" }
];

function localDateTimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

type CouponFormDraft = {
  code: string;
  description: string;
  benefitType: NonNullable<Coupon["benefitType"]>;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: string;
  usageLimit: string;
  perCustomerLimit: string;
  maxCampaignDiscount: string;
  startsAt: string;
  expiresAt: string;
  orderEligibilityType: NonNullable<Coupon["orderEligibilityType"]>;
  orderNumber: string;
  orderNumberFrom: string;
  orderNumberTo: string;
  audienceType: NonNullable<Coupon["audienceType"]>;
  selectedCustomerIds: string[];
  inactiveDays: string;
  registeredAfter: string;
  registeredBefore: string;
  orderScope: NonNullable<Coupon["orderScope"]>;
  allowedDeliveryModes: NonNullable<Coupon["allowedDeliveryModes"]>;
  allowedPaymentMethods: NonNullable<Coupon["allowedPaymentMethods"]>;
  isActive: boolean;
};

function emptyCouponDraft(): CouponFormDraft {
  return {
    code: "", description: "", benefitType: "ORDER_FLAT", discountValue: 100, minOrderValue: 499,
    maxDiscount: "", usageLimit: "", perCustomerLimit: "", maxCampaignDiscount: "", startsAt: "", expiresAt: "",
    orderEligibilityType: "ANY", orderNumber: "", orderNumberFrom: "", orderNumberTo: "", audienceType: "EVERYONE",
    selectedCustomerIds: [], inactiveDays: "", registeredAfter: "", registeredBefore: "", orderScope: "BOTH",
    allowedDeliveryModes: [], allowedPaymentMethods: [], isActive: true
  };
}

function couponDiscountType(benefitType: CouponFormDraft["benefitType"]): "FLAT" | "PERCENTAGE" {
  return benefitType === "ORDER_PERCENTAGE" || benefitType === "DELIVERY_PERCENTAGE" ? "PERCENTAGE" : "FLAT";
}

function emptyAdminOrderDraft(): AdminCreateOrderDraft {
  return {
    customerId: "",
    customerSearch: "",
    pickupScheduledAt: localDateTimeInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    paymentMethod: "COD",
    instructions: "",
    address: { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", landmark: "" },
    items: [{ serviceId: "", quantity: 1, instructions: "" }]
  };
}

export function AdminPortal() {
  const activeSection = useAdminStore((state) => state.activeSection);
  const hydrated = useAdminStore((state) => state.hydrated);
  const logout = useAdminStore((state) => state.logout);
  const setActiveSection = useAdminStore((state) => state.setActiveSection);
  const setSidebarOpen = useAdminStore((state) => state.setSidebarOpen);
  const persistedSupportSubTab = useAdminStore((state) => state.supportSubTab);
  const persistSupportSubTab = useAdminStore((state) => state.setSupportSubTab);
  const setSession = useAdminStore((state) => state.setSession);
  const sidebarOpen = useAdminStore((state) => state.sidebarOpen);
  const token = useAdminStore((state) => state.token);
  const sessionNotice = useAdminStore((state) => state.sessionNotice);
  const clearSessionNotice = useAdminStore((state) => state.clearSessionNotice);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const urlSectionSyncReadyRef = useRef(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [tailorDirectorySearch, setTailorDirectorySearch] = useState("");
  const [partnerDirectorySearch, setPartnerDirectorySearch] = useState("");
  const [mapPartnerFocus, setMapPartnerFocus] = useState<MapPartnerFocus | null>(null);
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("service-area");
  const [sessionRestoreDone, setSessionRestoreDone] = useState(false);
  const [dashboardDrilldown, setDashboardDrilldown] = useState<DashboardDrilldown | null>(null);
  const [financeDetailKind, setFinanceDetailKind] = useState<FinanceDetailKind | null>(null);

  useEffect(() => {
    if (!sessionNotice) return;
    toast.error(sessionNotice);
    clearSessionNotice();
  }, [clearSessionNotice, sessionNotice]);
  useEffect(() => {
    if (!hydrated) return;
    const applyUrlSection = () => {
      const urlSection = sectionFromUrl() ?? "dashboard";
      if (urlSection !== useAdminStore.getState().activeSection) {
        useAdminStore.getState().setActiveSection(urlSection);
      }
    };
    applyUrlSection();
    urlSectionSyncReadyRef.current = true;
    window.addEventListener("popstate", applyUrlSection);
    return () => window.removeEventListener("popstate", applyUrlSection);
  }, [hydrated]);
  useEffect(() => {
    if (!hydrated || !urlSectionSyncReadyRef.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("section") === activeSection) return;
    url.searchParams.set("section", activeSection);
    window.history.pushState({ ...window.history.state, darjiAdminSection: activeSection }, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activeSection, hydrated]);
  useEffect(() => {
    if (!hydrated || sessionRestoreDone) return;
    if (token) {
      setSessionRestoreDone(true);
      return;
    }
    void restoreAdminSession().catch(() => undefined).finally(() => setSessionRestoreDone(true));
  }, [hydrated, sessionRestoreDone, token]);
  const handleLogout = () => { void logoutAdminSession().catch(() => logout()); };
  const [orderSearch, setOrderSearch] = useState("");
  const [range] = useState<TrendRange>("monthly");
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriodPreset>("last_30_days");
  const [dashboardFromMonth, setDashboardFromMonth] = useState(() => dateInputValue(new Date(Date.now() - 29 * 86_400_000)));
  const [dashboardToMonth, setDashboardToMonth] = useState(() => dateInputValue(new Date()));
  const payoutPeriodBounds = getDashboardPeriodBounds(dashboardPeriod, dashboardFromMonth, dashboardToMonth);
  const payoutPeriodParams = {
    weekStart: (payoutPeriodBounds.start ?? new Date(0)).toISOString(),
    weekEnd: (payoutPeriodBounds.endExclusive ?? new Date(2100, 0, 1)).toISOString()
  };
  const [orderFilter, setOrderFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [deliveryPartnerFilter, setDeliveryPartnerFilter] = useState("");
  const [orderCategoryFilter, setOrderCategoryFilter] = useState("");
  const [orderTailorFilter, setOrderTailorFilter] = useState("");
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [paymentsSubTab, setPaymentsSubTab] = useState<"ledger" | "tailors" | "delivery">("ledger");
  const [walletDetailTarget, setWalletDetailTarget] = useState<WalletPayoutRow | null>(null);
  const [measurementVisitFocusId, setMeasurementVisitFocusId] = useState<string | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<WalletPayoutRow | null>(null);
  const [payoutDraft, setPayoutDraft] = useState({ amount: "", receiptUrl: "", notes: "", referenceNumber: "" });
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<Order | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createOrderDraft, setCreateOrderDraft] = useState<AdminCreateOrderDraft>(() => emptyAdminOrderDraft());
  const [orderDetailFocus, setOrderDetailFocus] = useState<OrderDetailFocus>("overview");
  const [tailoringDetail, setTailoringDetail] = useState<TailoringRequest | null>(null);
  const [deliveryDetail, setDeliveryDetail] = useState<DeliveryRequest | null>(null);
  const [tailoringStatusFilter, setTailoringStatusFilter] = useState("");
  const [tailoringWorkFilter, setTailoringWorkFilter] = useState("");
  const [tailoringUrgencyFilter, setTailoringUrgencyFilter] = useState("");
  const [tailoringAttentionOnly, setTailoringAttentionOnly] = useState(false);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [deliveryServiceFilter, setDeliveryServiceFilter] = useState("");
  const [deliveryExceptionOnly, setDeliveryExceptionOnly] = useState(false);
  const [selectedTailoringIds, setSelectedTailoringIds] = useState<string[]>([]);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [tailorDetail, setTailorDetail] = useState<TailorProfile | null>(null);
  const [partnerDetail, setPartnerDetail] = useState<DeliveryPartnerProfile | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUser | null>(null);
  const [orderPriorities, setOrderPriorities] = useState<Record<string, AdminOrderPriority>>({});
  const [orderNotes, setOrderNotes] = useState<Record<string, AdminOrderNote[]>>({});
  const [ticketDetail, setTicketDetail] = useState<SupportTicket | null>(null);
  const [batchFocus, setBatchFocus] = useState<BatchFocusTarget | null>(null);
  const [supportCategory, setSupportCategory] = useState("all");
  const [customerSupportSearch, setCustomerSupportSearch] = useState("");
  const [customerSupportStatus, setCustomerSupportStatus] = useState("");
  const [tailorSupportSearch, setTailorSupportSearch] = useState("");
  const [tailorSupportStatus, setTailorSupportStatus] = useState("");
  const [deliverySupportSearch, setDeliverySupportSearch] = useState("");
  const [deliverySupportStatus, setDeliverySupportStatus] = useState("");
  const [bugSearch, setBugSearch] = useState("");
  const [bugStatus, setBugStatus] = useState("");
  const [supportStatusFilter, setSupportStatusFilter] = useState("");
  const [supportPriorityFilter, setSupportPriorityFilter] = useState("");
  const [supportAgentFilter, setSupportAgentFilter] = useState("");
  const [supportStatusTab, setSupportStatusTab] = useState<SupportStatusTabId>("all");
  const [contextTab, setContextTab] = useState<"customer" | "order" | "ticket" | "activity">("customer");
  const [adminNotes, setAdminNotes] = useState("");


  const [activeChangeRequest, setActiveChangeRequest] = useState<AccountChangeRequest | null>(null);
  const [activeBugReport, setActiveBugReport] = useState<BugReport | null>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketDetail?.messages, activeBugReport?.messages, activeChangeRequest?.messages]);
  const [assignOrderTarget, setAssignOrderTarget] = useState<Order | null>(null);
  const [assignTailorId, setAssignTailorId] = useState("");
  const [assignPickupPartnerId, setAssignPickupPartnerId] = useState("");
  const [assignDeliveryPartnerId, setAssignDeliveryPartnerId] = useState("");
  const [couponDraft, setCouponDraft] = useState<CouponFormDraft>(emptyCouponDraft);
  const [batchSettingsDraft, setBatchSettingsDraft] = useState<DeliveryBatchSettingsDraft>({ lockMinutes: 45, maxOrdersPerBatch: 10 });
  const [platformStatusDraft, setPlatformStatusDraft] = useState<PlatformStatus>(defaultPlatformStatus);
  const [festivalThemeDraft, setFestivalThemeDraft] = useState<FestivalThemeConfig>(defaultFestivalTheme);
  const [serviceAreaDraft, setServiceAreaDraft] = useState<ServiceAreaConfig>(defaultServiceAreaConfig);
  const [tailorTutorialDraft, setTailorTutorialDraft] = useState<TailorTutorialMediaDraft>(() => defaultTailorTutorialMediaDraft());
  const [uploadingTutorialMedia, setUploadingTutorialMedia] = useState<"video" | "thumbnail" | "image" | null>(null);
  const [websiteSliderDraft, setWebsiteSliderDraft] = useState<CustomerWebsiteSlider>(() => defaultCustomerWebsiteSlider());
  const [uploadingWebsiteSlideId, setUploadingWebsiteSlideId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const isAuthed = Boolean(token);
  const globalLookupActive = globalSearch.trim().length >= 2;
  const needsSection = (...sections: SectionId[]) => isAuthed && (sections.includes(activeSection) || globalLookupActive);
  const supportSubTab = persistedSupportSubTab;

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    enabled: isAuthed
  });
  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: getAnalytics,
    enabled: needsSection("dashboard")
  });
  const ordersQuery = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => getOrders({ limit: 1000 }),
    enabled: needsSection("dashboard", "alerts", "orders", "analytics", "activity", "exports")
  });
  const [couponEditTarget, setCouponEditTarget] = useState<Coupon | null>(null);
  const [couponHistoryTarget, setCouponHistoryTarget] = useState<Coupon | null>(null);
  const catalogQuery = useQuery({
    queryKey: ["admin", "catalog"],
    queryFn: getCatalog,
    enabled: needsSection("orders") || createOrderOpen
  });
  const tailoringQuery = useQuery({
    queryKey: ["admin", "tailoring-requests"],
    queryFn: getTailoringRequests,
    enabled: needsSection("dashboard", "alerts", "orders", "tailoring", "measurements", "payments", "analytics", "exports")
  });
  const deliveryQuery = useQuery({
    queryKey: ["admin", "delivery-requests"],
    queryFn: getDeliveryRequests,
    enabled: needsSection("dashboard", "alerts", "orders", "delivery", "batches", "payments", "analytics", "exports")
  });
  const deliveryRetriesQuery = useQuery({
    queryKey: ["admin", "delivery-retries"],
    queryFn: getDeliveryRetries,
    enabled: needsSection("delivery")
  });
  const deliveryBatchesQuery = useQuery({
    queryKey: ["admin", "delivery-batches"],
    queryFn: getDeliveryBatches,
    enabled: needsSection("dashboard", "delivery", "batches", "payments"),
    refetchInterval: ["delivery", "batches"].includes(activeSection) ? 15_000 : false
  });
  const dashboardAnalyticsQuery = useQuery({
    queryKey: ["admin", "dashboard-analytics", dashboardPeriod, payoutPeriodParams.weekStart, payoutPeriodParams.weekEnd],
    queryFn: () => getDashboardAnalytics({ start: payoutPeriodParams.weekStart, endExclusive: payoutPeriodParams.weekEnd, lifetime: dashboardPeriod === "lifetime" }),
    // The portal derives shared navigation counts, search results, and summary
    // values from this payload even when another section is active. Treat it as
    // required boot data so restoring a non-dashboard section cannot render
    // with an undefined analytics object.
    enabled: isAuthed
  });
  const measurementVisitsQuery = useQuery({
    queryKey: ["admin", "measurement-visits"],
    queryFn: getMeasurementVisits,
    enabled: needsSection("measurements", "tailoring", "payments"),
    refetchInterval: activeSection === "measurements" ? 15_000 : false
  });
  const operationalAlertsQuery = useQuery({
    queryKey: ["admin", "operational-alerts", "ALL"],
    queryFn: () => getOperationalAlerts(),
    enabled: needsSection("dashboard", "alerts"),
    refetchInterval: ["dashboard", "alerts"].includes(activeSection) ? 15_000 : false
  });
  const tailorsQuery = useQuery({
    queryKey: ["admin", "tailors"],
    queryFn: getTailors,
    enabled: needsSection("dashboard", "orders", "tailoring", "measurements", "tailors", "samples", "notifications", "analytics", "exports")
  });
  const partnersQuery = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: getDeliveryPartners,
    enabled: needsSection("dashboard", "orders", "delivery", "batches", "partners", "notifications", "analytics", "exports"),
    refetchInterval: ["delivery", "batches", "partners"].includes(activeSection) ? 15_000 : false
  });
  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: getUsers,
    enabled: needsSection("dashboard", "orders", "users", "roles", "notifications", "exports") || createOrderOpen
  });
  const paymentsQuery = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: getPayments,
    enabled: needsSection("dashboard", "alerts", "payments", "analytics", "activity", "exports")
  });
  const financialLedgerQuery = useQuery({
    queryKey: ["admin", "financial-ledger"],
    queryFn: getFinancialLedger,
    enabled: needsSection("payments", "exports")
  });
  const tailorPayoutsQuery = useQuery({
    queryKey: ["admin", "wallet-payouts", "tailors", payoutPeriodParams.weekStart, payoutPeriodParams.weekEnd],
    queryFn: () => getWalletPayouts("TAILOR", payoutPeriodParams),
    enabled: needsSection("dashboard", "payments")
  });
  const deliveryPayoutsQuery = useQuery({
    queryKey: ["admin", "wallet-payouts", "delivery", payoutPeriodParams.weekStart, payoutPeriodParams.weekEnd],
    queryFn: () => getWalletPayouts("DELIVERY_PARTNER", payoutPeriodParams),
    enabled: needsSection("dashboard", "payments")
  });
  const walletDetailQuery = useQuery({
    queryKey: ["admin", "wallet-detail", walletDetailTarget?.userId, walletDetailTarget?.userType],
    queryFn: () => getWalletDetail(walletDetailTarget!.userId, walletDetailTarget!.userType),
    enabled: isAuthed && Boolean(walletDetailTarget)
  });
  const couponsQuery = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: getCoupons,
    enabled: needsSection("coupons")
  });
  const couponHistoryQuery = useQuery({
    queryKey: ["admin", "coupon-redemptions", couponHistoryTarget?.id],
    queryFn: () => getCouponRedemptions(couponHistoryTarget!.id),
    enabled: isAuthed && Boolean(couponHistoryTarget)
  });
  const supportQuery = useQuery({
    queryKey: ["admin", "support"],
    queryFn: getSupportTickets,
    enabled: needsSection("support", "dashboard", "alerts", "activity", "exports")
  });
  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: getSettings,
    enabled: needsSection("settings", "platform", "website", "batches", "tailors")
  });
  const marketingSignupsQuery = useQuery({
    queryKey: ["admin", "marketing-signups"],
    queryFn: getMarketingSignups,
    enabled: needsSection("website"),
    refetchInterval: activeSection === "website" ? 30_000 : false
  });
  const platformStatusQuery = useQuery({
    queryKey: ["admin", "platform-status"],
    queryFn: getPlatformStatus,
    enabled: needsSection("platform", "dashboard"),
    refetchInterval: 60_000
  });
  const festivalThemeQuery = useQuery({
    queryKey: ["admin", "festival-theme"],
    queryFn: getFestivalTheme,
    enabled: needsSection("settings", "dashboard"),
    refetchInterval: 60_000
  });
  const supportStatsQuery = useQuery({
    queryKey: ["admin", "support-stats"],
    queryFn: getSupportStats,
    enabled: needsSection("support", "dashboard")
  });
  const bugReportsQuery = useQuery({
    queryKey: ["admin", "bug-reports"],
    queryFn: getBugReports,
    enabled: needsSection("support")
  });
  const changeRequestsQuery = useQuery({
    queryKey: ["admin", "change-requests"],
    queryFn: getAccountChangeRequests,
    enabled: needsSection("support")
  });
  const reviewsQuery = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: getAdminReviews,
    enabled: needsSection("reviews", "analytics")
  });
  const serviceAreaQuery = useQuery({
    queryKey: ["admin", "service-areas"],
    queryFn: getServiceAreaConfig,
    enabled: needsSection("settings", "platform")
  });
  const serviceAreaInterestsQuery = useQuery({
    queryKey: ["admin", "service-area-interests"],
    queryFn: getServiceAreaInterests,
    enabled: needsSection("settings", "platform")
  });
  const orderMetadataQuery = useQuery({
    queryKey: ["admin", "order-metadata"],
    queryFn: getAdminOrderMetadata,
    enabled: isAuthed && ["orders", "dashboard", "tailoring", "delivery"].includes(activeSection)
  });
  const activityLogsQuery = useQuery({
    queryKey: ["admin", "activity-logs"],
    queryFn: getAdminActivityLogs,
    enabled: isAuthed && activeSection === "activity"
  });
  const systemHealthQuery = useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: getSystemHealth,
    enabled: isAuthed && activeSection === "health",
    refetchInterval: activeSection === "health" ? 30_000 : false
  });
  const notificationCampaignsQuery = useQuery({
    queryKey: ["admin", "notification-campaigns"],
    queryFn: getAdminNotificationCampaigns,
    enabled: isAuthed && activeSection === "notifications",
    refetchInterval: activeSection === "notifications" ? 15_000 : false
  });
  const emptyAnalytics: AnalyticsSummary = {
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    pendingOrders: 0,
    activeTailors: 0,
    activeDeliveryPartners: 0,
    revenue: 0,
    expenses: 0,
    netProfit: 0,
    pendingPayouts: 0
  };
  const dashboardData = !meQuery.data || !dashboardAnalyticsQuery.data
    ? null
    : {
        analytics: analyticsQuery.data ?? emptyAnalytics,
        dashboardAnalytics: dashboardAnalyticsQuery.data,
        me: meQuery.data,
        orders: ordersQuery.data ?? [],
        tailoringRequests: tailoringQuery.data ?? [],
        deliveryRequests: deliveryQuery.data ?? [],
        deliveryBatches: deliveryBatchesQuery.data ?? [],
        tailors: tailorsQuery.data ?? [],
        partners: partnersQuery.data ?? [],
        users: usersQuery.data ?? [],
        payments: paymentsQuery.data ?? [],
        coupons: couponsQuery.data ?? [],
        tickets: supportQuery.data ?? [],
        settings: settingsQuery.data ?? []
      };

  const failedBootQuery = [
    { label: "Dashboard analytics", query: dashboardAnalyticsQuery },
    { label: "Analytics", query: analyticsQuery },
    { label: "Orders", query: ordersQuery },
    { label: "Tailoring requests", query: tailoringQuery },
    { label: "Delivery requests", query: deliveryQuery },
    { label: "Tailors", query: tailorsQuery },
    { label: "Delivery partners", query: partnersQuery },
    { label: "Users", query: usersQuery },
    { label: "Payments", query: paymentsQuery },
    { label: "Coupons", query: couponsQuery },
    { label: "Support", query: supportQuery },
    { label: "Settings", query: settingsQuery }
  ].find(({ query }) => query.isError);
  const bootQueryError = failedBootQuery?.query.error;
  const bootQueryErrorLabel = failedBootQuery?.label;

  useEffect(() => {
    if (bootQueryError) {
      toast.error(`${bootQueryErrorLabel ?? "Dashboard data"} could not be loaded: ${extractError(bootQueryError)}`, { id: "dashboard-partial-load" });
    }
  }, [bootQueryError, bootQueryErrorLabel]);

  useEffect(() => {
    if (settingsQuery.data) {
      const tutorialSetting = settingsQuery.data.find((item) => item.key === "tailor_tutorial_media");
      setTailorTutorialDraft(normalizeTailorTutorialDraft(tutorialSetting?.value));
      const batchSetting = settingsQuery.data.find((item) => item.key === "delivery_batch_settings");
      setBatchSettingsDraft(normalizeDeliveryBatchSettings(batchSetting?.value));
      const websiteSliderSetting = settingsQuery.data.find((item) => item.key === CUSTOMER_WEBSITE_SLIDER_SETTING_KEY);
      setWebsiteSliderDraft(normalizeCustomerWebsiteSlider(websiteSliderSetting?.value));
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (platformStatusQuery.data) setPlatformStatusDraft(platformStatusQuery.data);
  }, [platformStatusQuery.data]);

  useEffect(() => {
    if (festivalThemeQuery.data) setFestivalThemeDraft(festivalThemeQuery.data);
  }, [festivalThemeQuery.data]);

  useEffect(() => {
    if (serviceAreaQuery.data) setServiceAreaDraft(serviceAreaQuery.data);
  }, [serviceAreaQuery.data]);

  useEffect(() => {
    if (!orderMetadataQuery.data) return;
    setOrderPriorities(Object.fromEntries(orderMetadataQuery.data.map((item) => [item.entityId, item.priority])));
    setOrderNotes(Object.fromEntries(orderMetadataQuery.data.map((item) => [
      item.entityId,
      item.notes.map((note) => ({ admin: note.adminName, note: note.note, createdAt: note.createdAt }))
    ])));
  }, [orderMetadataQuery.data]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Search order, person, ID..."]')?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!assignOrderTarget) {
      setAssignTailorId("");
      setAssignPickupPartnerId("");
      setAssignDeliveryPartnerId("");
      return;
    }
    setAssignTailorId(assignOrderTarget.tailorId ?? "");
    setAssignPickupPartnerId(assignOrderTarget.pickupPartnerId ?? "");
    setAssignDeliveryPartnerId(assignOrderTarget.deliveryPartnerId ?? "");
  }, [assignOrderTarget]);

  const openOrderDetail = (order: Order, focus: OrderDetailFocus = "overview") => {
    setOrderDetailFocus(focus);
    setOrderDetail(order);
  };

  const openOrderAssignment = (order: Order) => {
    setAssignOrderTarget(order);
  };

  const normalizePhoneDigits = (phone?: string | null) => (phone ?? "").replace(/\D/g, "");

  const openCustomerChat = (order: Order) => {
    const digits = normalizePhoneDigits(order.customer?.phone);
    if (!digits) {
      toast.error("Customer phone number is missing");
      return;
    }
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  };

  const callCustomer = (order: Order) => {
    const phone = order.customer?.phone?.trim();
    if (!phone) {
      toast.error("Customer phone number is missing");
      return;
    }
    window.open(`tel:${phone}`);
  };

  const downloadOrderImages = async (order: Order) => {
    try {
      const blob = await downloadAdminOrderImages(order.id);
      downloadFileBlob(`Darji-${safeFileName(getOrderDisplayNumber(order))}-images.zip`, blob);
      toast.success("Order images downloaded as ZIP");
    } catch (error) {
      toast.error(extractError(error));
    }
  };

  const downloadOrderInvoice = async (order: Order) => {
    try {
      const blob = await downloadAdminOrderInvoice(order.id);
      downloadFileBlob(`Darji-Invoice-${safeFileName(getOrderDisplayNumber(order))}.pdf`, blob);
      toast.success("Invoice downloaded");
    } catch (error) {
      toast.error(extractError(error));
    }
  };

  const requestOtpMutation = useMutation({
    mutationFn: requestOtp,
    onSuccess: () => toast.success("OTP sent"),
    onError: (error) => toast.error(extractError(error))
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ phone, otp }: { phone: string; otp: string }) => verifyOtp(phone, otp),
    onSuccess: (session) => {
      setSession(session);
      toast.success("Admin session started");
    },
    onError: (error) => toast.error(extractError(error))
  });

  const refreshData = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "tailoring-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-retries"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-batches"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "tailors"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "customer-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "financial-ledger"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "wallet-payouts"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "wallet-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-fare-settings"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "support"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "support-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "bug-reports"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "change-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] })
    ]);

  const notificationReadMutation = useMutation({
    mutationFn: async (alertIds: string[]) => Promise.all(alertIds.map((alertId) => updateOperationalAlert({ alertId, status: "ACKNOWLEDGED" }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "operational-alerts"] }),
    onError: (error) => toast.error(extractError(error))
  });

  const assignMutation = useMutation({
    mutationFn: (assignments: Parameters<typeof assignOrder>[0][]) => Promise.all(assignments.map(assignOrder)),
    onSuccess: async (updatedAssignments) => {
      toast.success(updatedAssignments.length === 1 ? "Order assignment updated" : "All order assignments updated");
      setAssignOrderTarget(null);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const statusMutation = useMutation({
    mutationFn: async ({ order, status }: { order: Order; status: string }) => {
      if (!order.request) return updateOrderStatus({ orderId: order.id, status });
      if (status === "CANCELLED") return cancelTailoringRequest(order.request.id ?? order.id);
      if (["CUTTING", "STITCHING_STARTED", "FINISHING"].includes(status)) {
        return updateTailoringWorkStatus(order.request.id ?? order.id, "WORKING");
      }
      if (["STITCHING_COMPLETED", "READY"].includes(status)) {
        return updateTailoringWorkStatus(order.request.id ?? order.id, "READY");
      }
      throw new Error("Pickup and delivery stages are updated from the linked delivery task. Open Delivery Ops for this order.");
    },
    onSuccess: async (_result, variables) => {
      setOrderDetail((current) => current?.id === variables.order.id ? { ...current, status: variables.status } : current);
      toast.success("Order status updated");
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const paymentMutation = useMutation({
    mutationFn: markPaymentPaid,
    onSuccess: async () => {
      toast.success("Payment marked as paid");
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const walletPayoutMutation = useMutation({
    mutationFn: createWalletPayout,
    onSuccess: async () => {
      toast.success("Weekly payout recorded");
      setPayoutTarget(null);
      setPayoutDraft({ amount: "", receiptUrl: "", notes: "", referenceNumber: "" });
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const couponMutation = useMutation({
    mutationFn: createCoupon,
    onSuccess: async () => {
      toast.success("Coupon created");
      setCouponDraft(emptyCouponDraft());
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const settingMutation = useMutation({
    mutationFn: updateSetting,
    onSuccess: async () => {
      toast.success("Setting saved");
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const platformStatusMutation = useMutation({
    mutationFn: updatePlatformStatus,
    onSuccess: async (status) => {
      setPlatformStatusDraft(status);
      toast.success(status.maintenanceMode ? "Maintenance mode enabled" : "Darji is live");
      await queryClient.invalidateQueries({ queryKey: ["admin", "platform-status"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const festivalThemeMutation = useMutation({
    mutationFn: updateFestivalTheme,
    onSuccess: async (theme) => {
      setFestivalThemeDraft(theme);
      toast.success(theme.active ? "Festival theme is active" : theme.status === "Scheduled" ? "Festival theme scheduled" : "Normal customer theme restored");
      await queryClient.invalidateQueries({ queryKey: ["admin", "festival-theme"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const resetOrdersMutation = useMutation({
    mutationFn: resetOrdersRequestsBatches,
    onSuccess: async (result) => {
      const deletedCount = Object.values(result.deleted ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0);
      toast.success(`Order/request/batch data reset (${deletedCount} records deleted)`);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const resetEverythingMutation = useMutation({
    mutationFn: resetEverythingDevelopment,
    onSuccess: async (result) => {
      const deletedCount = Object.values(result.deleted ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0);
      toast.success(`Development data reset (${deletedCount} records deleted)`);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const reviewFeaturedMutation = useMutation({
    mutationFn: toggleReviewFeatured,
    onSuccess: async () => {
      toast.success("Review visibility updated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  async function handleTutorialMediaUpload(kind: "video" | "thumbnail" | "image", file: File) {
    try {
      setUploadingTutorialMedia(kind);
      const uploaded = await uploadAdminMedia(file);
      setTailorTutorialDraft((current) => {
        if (kind === "video") return { ...current, videoUrl: uploaded.url };
        if (kind === "thumbnail") return { ...current, thumbnailUrl: uploaded.url };
        return { ...current, images: [...current.images, uploaded.url].slice(0, 12) };
      });
      toast.success("Media uploaded");
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setUploadingTutorialMedia(null);
    }
  }

  const deliveryRetryMutation = useMutation({
    mutationFn: ({ taskId, action }: { taskId: string; action: string }) => {
      if (action === "retry") return retryDeliveryNow(taskId);
      if (action === "resolve") return resolveDeliveryRetry(taskId);
      if (action === "cancel") return cancelDeliveryRetry(taskId);
      if (action.startsWith("assign_")) {
        const parts = action.split("_");
        const round = parts[1] === "1pm" ? "ONE_PM" : parts[1] === "6pm" ? "SIX_PM" : parts[1];
        const dateStr = parts[2];
        return retryDeliveryNow(taskId, {
          deliveryRound: round as "ONE_PM" | "SIX_PM",
          roundAt: dateStr ? new Date(dateStr).toISOString() : undefined
        });
      }
      return cancelDeliveryRetry(taskId);
    },
    onSuccess: async (_, variables) => {
      toast.success(variables.action === "retry" || variables.action.startsWith("assign") ? "Delivery retry scheduled" : variables.action === "resolve" ? "Retry order resolved" : "Delivery order cancelled");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "delivery-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "delivery-retries"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "delivery-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "tailoring-requests"] })
      ]);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const batchReassignMutation = useMutation({
    mutationFn: reassignDeliveryBatchTask,
    onSuccess: async () => {
      toast.success("Order moved to selected batch");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "delivery-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "delivery-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "tailoring-requests"] })
      ]);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const serviceAreaMutation = useMutation({
    mutationFn: updateServiceAreaConfig,
    onSuccess: async (config) => {
      setServiceAreaDraft(config);
      toast.success(config.enabled ? "Service-area filtering enabled" : "Service-area filtering disabled");
      await queryClient.invalidateQueries({ queryKey: ["admin", "service-areas"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const reviewHiddenMutation = useMutation({
    mutationFn: toggleReviewHidden,
    onSuccess: async () => {
      toast.success("Review moderation updated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const reviewDeleteMutation = useMutation({
    mutationFn: deleteReview,
    onSuccess: async () => {
      toast.success("Review deleted");
      await queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const couponUpdateMutation = useMutation({
    mutationFn: updateCoupon,
    onSuccess: async () => {
      setCouponEditTarget(null);
      toast.success("Coupon updated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const couponDeleteMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: async () => {
      toast.success("Unused coupon deleted");
      await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const orderMetadataMutation = useMutation({
    mutationFn: updateAdminOrderMetadata,
    onSuccess: async (metadata) => {
      setOrderPriorities((current) => ({ ...current, [metadata.entityId]: metadata.priority }));
      setOrderNotes((current) => ({
        ...current,
        [metadata.entityId]: metadata.notes.map((note) => ({ admin: note.adminName, note: note.note, createdAt: note.createdAt }))
      }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "order-metadata"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  const orderDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteAdminOrder,
    onSuccess: async () => {
      setDeleteOrderTarget(null);
      setOrderDetail(null);
      toast.success("Order permanently deleted");
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const createOrderMutation = useMutation({
    mutationFn: createAdminOrder,
    onSuccess: async (order) => {
      setCreateOrderOpen(false);
      setCreateOrderDraft(emptyAdminOrderDraft());
      setOrderDetail(order);
      setActiveSection("orders");
      toast.success(`${getOrderDisplayNumber(order)} created`);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const measurementAssignMutation = useMutation({
    mutationFn: assignMeasurementVisit,
    onSuccess: async () => {
      toast.success("Measurement visit assigned");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "measurement-visits"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "operational-alerts"] })
      ]);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const notifyBatchMutation = useMutation({
    mutationFn: notifyDeliveryBatch,
    onSuccess: async (result) => {
      const partnerCount = Number(result?.notifiedPartners ?? 0);
      const taskCount = Number(result?.notifiedTasks ?? 0);
      if (partnerCount <= 0) {
        toast.error(`No eligible delivery partners found for this batch (${taskCount} tasks)`);
      } else {
        toast.success(
          `Batch notification sent to ${partnerCount} partner${partnerCount === 1 ? "" : "s"} for ${taskCount} task${taskCount === 1 ? "" : "s"}`
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "delivery-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "delivery-requests"] })
      ]);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const tailorReviewMutation = useMutation({
    mutationFn: reviewTailorVerification,
    onSuccess: async (_, variables) => {
      toast.success(`Tailor marked ${formatStatus(variables.status).toLowerCase()}`);
      await Promise.all([refreshData(), queryClient.invalidateQueries({ queryKey: ["admin", "partner-profile-change-log", "TAILOR", variables.tailorId] })]);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const tailorSampleReviewMutation = useMutation({
    mutationFn: reviewTailorSample,
    onSuccess: async (_, variables) => {
      toast.success(`Sample ${variables.status.toLowerCase()}`);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const partnerReviewMutation = useMutation({
    mutationFn: reviewDeliveryVerification,
    onSuccess: async (_, variables) => {
      toast.success(`Delivery partner marked ${formatStatus(variables.status).toLowerCase()}`);
      await Promise.all([refreshData(), queryClient.invalidateQueries({ queryKey: ["admin", "partner-profile-change-log", "DELIVERY_PARTNER", variables.partnerId] })]);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const tailorProfileUpdateMutation = useMutation({
    mutationFn: updateAdminTailorProfile,
    onSuccess: async (profile) => {
      setTailorDetail(profile);
      toast.success("Tailor profile updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "tailors"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "partner-profile-change-log", "TAILOR", profile.id] })
      ]);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const deliveryProfileUpdateMutation = useMutation({
    mutationFn: updateAdminDeliveryProfile,
    onSuccess: async (profile) => {
      setPartnerDetail(profile);
      toast.success("Delivery partner profile updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "partners"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "partner-profile-change-log", "DELIVERY_PARTNER", profile.id] })
      ]);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const userModerationMutation = useMutation({
    mutationFn: moderateUser,
    onSuccess: async (_, variables) => {
      toast.success(`User set to ${formatStatus(variables.action).toLowerCase()}`);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const accountDeleteMutation = useMutation({
    mutationFn: deleteAdminAccount,
    onSuccess: async () => {
      toast.success("Account deleted");
      setTailorDetail(null);
      setPartnerDetail(null);
      setUserDetail(null);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const adminInviteMutation = useMutation({
    mutationFn: inviteAdmin,
    onSuccess: async () => {
      toast.success("Full admin access granted");
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const bugReportUpdateMutation = useMutation({
    mutationFn: updateBugReport,
    onSuccess: async () => {
      toast.success("Bug report updated successfully");
      setActiveBugReport(null);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const changeRequestApproveMutation = useMutation({
    mutationFn: approveAccountChangeRequest,
    onSuccess: async () => {
      toast.success("Account change request approved");
      setActiveChangeRequest(null);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const changeRequestRejectMutation = useMutation({
    mutationFn: rejectAccountChangeRequest,
    onSuccess: async () => {
      toast.success("Account change request rejected");
      setActiveChangeRequest(null);
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const inlineTicketReplyMutation = useMutation({
    mutationFn: replyToSupportTicket,
    onSuccess: async (updatedTicket) => {
      toast.success("Reply sent successfully");
      await refreshData();
      if (updatedTicket) {
        setTicketDetail(updatedTicket);
      }
    },
    onError: (error) => toast.error(extractError(error))
  });

  const inlineTicketUpdateMutation = useMutation({
    mutationFn: replyToSupportTicket,
    onSuccess: async (updatedTicket) => {
      toast.success("Ticket updated successfully");
      await refreshData();
      if (updatedTicket) {
        setTicketDetail(updatedTicket);
      }
    },
    onError: (error) => toast.error(extractError(error))
  });

  const inlineBugUpdateMutation = useMutation({
    mutationFn: updateBugReport,
    onSuccess: async () => {
      toast.success("Bug report updated successfully");
      await refreshData();
    },
    onError: (error) => toast.error(extractError(error))
  });

  const inlineChangeRequestApproveMutation = useMutation({
    mutationFn: approveAccountChangeRequest,
    onSuccess: async (data, variables) => {
      toast.success("Account change request approved");
      await refreshData();
      setActiveChangeRequest(null);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const inlineChangeRequestRejectMutation = useMutation({
    mutationFn: rejectAccountChangeRequest,
    onSuccess: async (data, variables) => {
      toast.success("Account change request rejected");
      await refreshData();
      setActiveChangeRequest(null);
    },
    onError: (error) => toast.error(extractError(error))
  });

  const addTicketMessageMutation = useMutation({
    mutationFn: addSupportTicketMessage,
    onSuccess: async (updatedTicket) => {
      await refreshData();
      if (updatedTicket) {
        setTicketDetail(updatedTicket);
      }
    },
    onError: (error) => toast.error(extractError(error))
  });

  const addBugMessageMutation = useMutation({
    mutationFn: addBugReportMessage,
    onSuccess: async (updatedBug) => {
      await refreshData();
      if (updatedBug) {
        setActiveBugReport(updatedBug);
      }
    },
    onError: (error) => toast.error(extractError(error))
  });

  const addChangeRequestMessageMutation = useMutation({
    mutationFn: addChangeRequestMessage,
    onSuccess: async (updatedRequest) => {
      await refreshData();
      if (updatedRequest) {
        setActiveChangeRequest(updatedRequest);
      }
    },
    onError: (error) => toast.error(extractError(error))
  });



  if (!hydrated || !sessionRestoreDone) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-8 text-center shadow-[var(--shadow)] backdrop-blur">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-sm text-[var(--muted)]">Loading Darji Admin workspace...</p>
        </div>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <LoginPanel
        isRequesting={requestOtpMutation.isPending}
        isVerifying={verifyOtpMutation.isPending}
        onRequestOtp={async (phone) => {
          try {
            const result = await requestOtpMutation.mutateAsync(phone);
            return { success: true, otp: result.otp };
          } catch {
            return { success: false };
          }
        }}
        onVerifyOtp={(phone, otp) => verifyOtpMutation.mutate({ phone, otp })}
        returnedOtp={requestOtpMutation.data?.otp}
      />
    );
  }

  const isBootLoading = [
    meQuery,
    dashboardAnalyticsQuery,
    analyticsQuery,
    ordersQuery,
    tailoringQuery,
    deliveryQuery,
    tailorsQuery,
    partnersQuery,
    paymentsQuery,
    couponsQuery,
    supportQuery,
    settingsQuery
  ].some((query) => query.isLoading);

  if (meQuery.isError) {
    return (
      <PortalFrame
        activeSection={activeSection}
        alertCount={0}
        globalSearch={globalSearch}
        globalSearchResults={[]}
        onGlobalSearchChange={setGlobalSearch}
        onLogout={handleLogout}
        onOpenSidebar={() => setSidebarOpen(true)}
        onSectionChange={setActiveSection}
        sidebarOpen={sidebarOpen}
        supportCount={0}
      >
        <Panel className="mx-auto max-w-2xl p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h2 className="mt-4 text-xl font-semibold">Unable to load your admin session</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{extractError(meQuery.error)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ActionButton disabled={meQuery.isFetching} onClick={() => void meQuery.refetch()}>
              {meQuery.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Retry
            </ActionButton>
            <ActionButton onClick={handleLogout} variant="secondary">Sign in again</ActionButton>
          </div>
        </Panel>
      </PortalFrame>
    );
  }

  async function handleWebsiteSlideUpload(slideId: string, file: File) {
    try {
      setUploadingWebsiteSlideId(slideId);
      const uploaded = await uploadAdminMedia(file);
      setWebsiteSliderDraft((current) => ({
        ...current,
        slides: current.slides.map((slide) => slide.id === slideId ? { ...slide, imageUrl: uploaded.url } : slide)
      }));
      toast.success("Slider image uploaded");
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setUploadingWebsiteSlideId(null);
    }
  }

  if (dashboardAnalyticsQuery.isError) {
    return (
      <PortalFrame
        activeSection={activeSection}
        alertCount={0}
        globalSearch={globalSearch}
        globalSearchResults={[]}
        onGlobalSearchChange={setGlobalSearch}
        onLogout={handleLogout}
        onOpenSidebar={() => setSidebarOpen(true)}
        onSectionChange={setActiveSection}
        sidebarOpen={sidebarOpen}
        supportCount={0}
      >
        <Panel className="mx-auto max-w-2xl p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-xl font-semibold">Dashboard analytics could not be loaded</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">No KPI values are shown because their authoritative source is unavailable. {extractError(dashboardAnalyticsQuery.error)}</p>
          <ActionButton className="mt-6" disabled={dashboardAnalyticsQuery.isFetching} onClick={() => void dashboardAnalyticsQuery.refetch()}>
            {dashboardAnalyticsQuery.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Retry analytics
          </ActionButton>
        </Panel>
      </PortalFrame>
    );
  }

  if (!dashboardData || isBootLoading) {
    return (
      <PortalFrame
        activeSection={activeSection}
        alertCount={0}
        globalSearch={globalSearch}
        globalSearchResults={[]}
        me={meQuery.data}
        onGlobalSearchChange={setGlobalSearch}
        onLogout={handleLogout}
        onOpenSidebar={() => setSidebarOpen(true)}
        onSectionChange={setActiveSection}
        sidebarOpen={sidebarOpen}
        supportCount={0}
      >
        <LoadingDashboard />
      </PortalFrame>
    );
  }

  const { analytics, dashboardAnalytics, me, orders, tailoringRequests, deliveryRequests, deliveryBatches, tailors, partners, users, payments, coupons, tickets } = dashboardData;
  const measurementVisits = measurementVisitsQuery.data ?? [];
  
  const normalizedTailoringRequests: Order[] = tailoringRequests.map((request) => normalizeTailoringRequestForAdmin(request, partners));

  const allOrders = [...orders, ...normalizedTailoringRequests];
  const dashboardPeriodBounds = getDashboardPeriodBounds(dashboardPeriod, dashboardFromMonth, dashboardToMonth);
  const dashboardOrders = allOrders.filter((order) => isDateInDashboardPeriod(order.createdAt, dashboardPeriodBounds));
  const dashboardPayments = payments.filter((payment) => isDateInDashboardPeriod(payment.paidAt ?? payment.updatedAt ?? payment.createdAt, dashboardPeriodBounds));
  const dashboardTailoringRequestsForPeriod = tailoringRequests.filter((request) => isDateInDashboardPeriod(request.confirmedAt ?? request.createdAt, dashboardPeriodBounds));
  const dashboardDeliveryRequestsForPeriod = deliveryRequests.filter((request) => isDateInDashboardPeriod(request.createdAt, dashboardPeriodBounds));
  const dashboardTailors = tailors.filter((tailor) => isDateInDashboardPeriod(tailor.createdAt, dashboardPeriodBounds));
  const dashboardPartners = partners.filter((partner) => isDateInDashboardPeriod(partner.createdAt, dashboardPeriodBounds));
  const searchTerm = globalSearch.trim().toLowerCase();
  const headerNotifications = operationalAlertsQuery.data ?? [];
  const unreadHeaderNotifications = headerNotifications.filter((alert) => alert.status === "OPEN");
  const alertCount = unreadHeaderNotifications.length;

  const financeSummary = buildFinanceSummary(dashboardPayments, tailoringRequests, deliveryRequests, deliveryBatches);
  const metrics = buildMetrics(dashboardOrders, dashboardTailors, dashboardPartners, dashboardPayments, financeSummary);
  const revenueSeries: RevenuePoint[] = dashboardAnalytics.series.revenue.map((point) => ({ label: point.label, revenue: point.netRevenue }));
  const orderSeries: OrderTrendPoint[] = dashboardAnalytics.series.orders;
  const growthSeries: GrowthPoint[] = dashboardAnalytics.series.growth;
  const serviceMix = buildServiceMix(dashboardOrders);
  const completedOrders = dashboardAnalytics.orders.completed;
  const cancelledOrders = dashboardAnalytics.orders.cancelled;
  const pendingOrders = dashboardAnalytics.orders.pending;
  const activeOrders = dashboardAnalytics.orders.active;
  const recentOrders = [...dashboardOrders].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 5);
  const customerUsers: AdminUser[] = (() => {
    const customerOrdersByUser = new Map<string, Order[]>();
    allOrders.forEach((order) => {
      if (!order.customerId) return;
      const current = customerOrdersByUser.get(order.customerId) ?? [];
      current.push(order);
      customerOrdersByUser.set(order.customerId, current);
    });
    const directory = users
      .filter((user) => user.role === "CUSTOMER" || customerOrdersByUser.has(user.id))
      .map((user) => ({ ...user, hasCustomerActivity: customerOrdersByUser.has(user.id) }));
    const knownIds = new Set(directory.map((user) => user.id));

    customerOrdersByUser.forEach((customerOrders, customerId) => {
      if (knownIds.has(customerId)) return;
      const latestOrder = [...customerOrders].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
      const firstOrder = [...customerOrders].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())[0];
      directory.push({
        id: customerId,
        phone: latestOrder?.customer?.phone ?? "Account deleted",
        name: latestOrder?.customer?.name ?? "Archived customer",
        role: "CUSTOMER",
        accountStatus: "ARCHIVED",
        createdAt: firstOrder?.createdAt,
        hasCustomerActivity: true,
        archivedCustomer: true
      });
    });

    return directory.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  })();
  const adminUsers = users.filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  const openSupportTickets = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const globalSearchResults: GlobalSearchResult[] = (() => {
    if (!searchTerm) return [];
    const matches = (...values: Array<string | number | null | undefined>) =>
      values.some((value) => String(value ?? "").toLowerCase().includes(searchTerm));
    const results: GlobalSearchResult[] = [];

    allOrders.forEach((order) => {
      if (matches(order.id, order.orderNumber, order.customer?.name, order.customer?.phone, order.customerId, order.tailorId, order.pickupPartnerId, order.deliveryPartnerId)) {
        results.push({
          id: `order-${order.id}`,
          title: order.orderNumber || order.id,
          subtitle: `Order - ${order.customer?.name ?? order.customer?.phone ?? "Customer"} - ${formatStatus(order.status)}`,
          section: "orders",
          icon: PackageCheck,
          onSelect: () => {
            openOrderDetail(order, "overview");
            setActiveSection("orders");
            setGlobalSearch("");
          }
        });
      }
    });

    tailoringRequests.forEach((request) => {
      if (matches(request.darjiId, request.customer?.name, request.customer?.phone, request.workType, request.clothType, request.assignedTailorId)) {
        results.push({
          id: `tailoring-${request.id}`,
          title: request.darjiId ?? "Darji ID pending",
          subtitle: `Tailoring request - ${request.customer?.name ?? request.customer?.phone ?? "Customer"}`,
          section: "tailoring",
          icon: Scissors,
          onSelect: () => {
            setTailoringDetail(request);
            setActiveSection("tailoring");
            setGlobalSearch("");
          }
        });
      }
    });

    tailors.forEach((tailor) => {
      if (matches(tailor.id, tailor.userId, tailor.darjiTailorId, tailor.shopName, tailor.user?.name, tailor.user?.phone)) {
        results.push({
          id: `tailor-${tailor.id}`,
          title: tailor.shopName || tailor.user?.name || "Tailor",
          subtitle: `Tailor - ${tailor.darjiTailorId ?? "Darji ID pending"}`,
          section: "tailors",
          icon: Scissors,
          onSelect: () => {
            setTailorDetail(tailor);
            setActiveSection("tailors");
            setGlobalSearch("");
          }
        });
      }
    });

    partners.forEach((partner) => {
      if (matches(partner.id, partner.userId, partner.user?.name, partner.user?.phone, partner.vehicleNumber, partner.assignedArea)) {
        results.push({
          id: `partner-${partner.id}`,
          title: getPartnerDisplayName(partner),
          subtitle: `${getPartnerRoleLabel(partner)} delivery partner - ${partner.user?.phone ?? partner.assignedArea ?? partner.id}`,
          section: "partners",
          icon: Truck,
          onSelect: () => {
            setPartnerDetail(partner);
            setActiveSection("partners");
            setGlobalSearch("");
          }
        });
      }
    });

    customerUsers.forEach((user) => {
      if (matches(user.id, user.name, user.phone, user.email, user.role)) {
        results.push({
          id: `user-${user.id}`,
          title: getCustomerDisplayName(user),
          subtitle: `Customer - ${user.phone ?? user.email ?? user.id}`,
          section: "users",
          icon: UserCircle2,
          onSelect: () => {
            setUserDetail(user);
            setActiveSection("users");
            setGlobalSearch("");
          }
        });
      }
    });

    deliveryRequests.forEach((request) => {
      if (matches(request.id, request.orderId, request.taskId, request.customerName, request.customerPhone, request.tailorName, request.assignedDeliveryPartnerId)) {
        results.push({
          id: `delivery-${request.id}`,
          title: request.taskId || request.orderId || request.id,
          subtitle: `Delivery task - ${request.customerName ?? request.customerPhone ?? "Customer"}`,
          section: "delivery",
          icon: Truck,
          onSelect: () => {
            setDeliveryDetail(request);
            setActiveSection("delivery");
            setGlobalSearch("");
          }
        });
      }
    });

    return results.slice(0, 8);
  })();
  const dateRangeLabel = buildDashboardPeriodLabel(dashboardPeriod, dashboardPeriodBounds);
  const fallbackNewCustomerIds = (() => {
    const firstOrderByCustomer = new Map<string, Date>();
    allOrders.forEach((order) => {
      if (!order.customerId || !order.createdAt) return;
      const createdAt = new Date(order.createdAt);
      const previous = firstOrderByCustomer.get(order.customerId);
      if (!previous || createdAt < previous) firstOrderByCustomer.set(order.customerId, createdAt);
    });
    return [...firstOrderByCustomer.entries()]
      .filter(([, createdAt]) => isDateInDashboardPeriod(createdAt.toISOString(), dashboardPeriodBounds))
      .map(([customerId]) => customerId);
  })();
  const fallbackOrderIds = (state?: ReturnType<typeof classifyDashboardOrderStatus>) => dashboardOrders
    .filter((order) => !state || classifyDashboardOrderStatus(order.status) === state)
    .map((order) => order.id);
  const drilldownData = dashboardAnalytics.drilldowns ?? {
    orders: {
      total: fallbackOrderIds(),
      pending: fallbackOrderIds("pending"),
      active: fallbackOrderIds("active"),
      completed: fallbackOrderIds("completed"),
      cancelled: fallbackOrderIds("cancelled"),
      resolved: dashboardOrders.filter((order) => ["completed", "cancelled"].includes(classifyDashboardOrderStatus(order.status))).map((order) => order.id),
      realized: fallbackOrderIds("completed")
    },
    finance: {
      paidPaymentIds: dashboardPayments.filter((payment) => String(payment.status).toUpperCase() === "PAID").map((payment) => payment.id),
      partnerCostUserIds: [...new Set([...(tailorPayoutsQuery.data ?? []), ...(deliveryPayoutsQuery.data ?? [])].filter((row) => row.currentWeekEarnings > 0).map((row) => row.userId))],
      pendingPayoutUserIds: [...new Set([...(tailorPayoutsQuery.data ?? []), ...(deliveryPayoutsQuery.data ?? [])].filter((row) => row.pendingAmount > 0).map((row) => row.userId))]
    },
    partners: {
      activeTailorIds: tailors.filter((tailor) => tailor.isAvailable && tailor.verificationStatus === "VERIFIED").map((tailor) => tailor.id),
      activeDeliveryPartnerIds: partners.filter((partner) => partner.isAvailable && partner.verificationStatus === "VERIFIED").map((partner) => partner.id)
    },
    growth: {
      newCustomerIds: fallbackNewCustomerIds,
      newTailorIds: dashboardTailors.map((tailor) => tailor.id),
      newDeliveryPartnerIds: dashboardPartners.map((partner) => partner.id)
    }
  };
  const drilldownIds = (() => {
    switch (dashboardDrilldown?.key) {
      case "orders_total": return drilldownData.orders.total;
      case "orders_active": return drilldownData.orders.active;
      case "orders_completed": return drilldownData.orders.completed;
      case "orders_cancelled": return drilldownData.orders.cancelled;
      case "orders_pending": return drilldownData.orders.pending;
      case "orders_resolved": return drilldownData.orders.resolved;
      case "orders_realized": return drilldownData.orders.realized;
      case "payments_paid": return drilldownData.finance.paidPaymentIds;
      case "partner_cost": return drilldownData.finance.partnerCostUserIds;
      case "pending_payouts": return drilldownData.finance.pendingPayoutUserIds;
      case "active_delivery_partners": return drilldownData.partners.activeDeliveryPartnerIds;
      case "active_tailors": return drilldownData.partners.activeTailorIds;
      case "new_customers": return drilldownData.growth.newCustomerIds;
      case "new_tailors": return drilldownData.growth.newTailorIds;
      case "new_delivery_partners": return drilldownData.growth.newDeliveryPartnerIds;
      default: return [];
    }
  })();
  const drilldownIdSet = new Set(drilldownIds);

  const clearRecordFilters = () => {
    setGlobalSearch("");
    setOrderSearch("");
    setOrderFilter("");
    setDeliveryPartnerFilter("");
    setPaymentFilter("");
    setOrderCategoryFilter("");
    setOrderTailorFilter("");
    setOrderPaymentStatusFilter("");
    setOrderDateFilter("");
    setPaymentsSubTab("ledger");
  };
  const clearDashboardDrilldown = () => {
    setDashboardDrilldown(null);
    clearRecordFilters();
  };
  const openDashboardDrilldown = (drilldown: DashboardDrilldown) => {
    clearRecordFilters();
    setDashboardDrilldown(drilldown);
    if (drilldown.key === "orders_active") setOrderFilter("__ACTIVE__");
    if (drilldown.key === "orders_completed" || drilldown.key === "orders_realized") setOrderFilter("__COMPLETED__");
    if (drilldown.key === "orders_cancelled") setOrderFilter("__CANCELLED__");
    if (drilldown.key === "orders_pending") setOrderFilter("__PENDING__");
    if (drilldown.key === "orders_resolved") setOrderFilter("__RESOLVED__");
    if (drilldown.key === "payments_paid") {
      setPaymentFilter("PAID");
      setPaymentsSubTab("ledger");
    }
    if (drilldown.key === "partner_cost") setPaymentsSubTab("ledger");
    if (drilldown.key === "pending_payouts") setPaymentsSubTab("tailors");
    setActiveSection(drilldown.target);
  };
  const changeOrderStatusFilter = (value: string) => {
    if (dashboardDrilldown?.target === "orders") setDashboardDrilldown(null);
    setOrderFilter(value);
  };
  const openOrderSummaryFilter = (value: string) => {
    clearRecordFilters();
    setDashboardDrilldown(null);
    setOrderFilter(value);
  };
  const latestGrowthPoint = { customers: dashboardAnalytics.growth.newCustomers, tailors: dashboardAnalytics.growth.newTailors, partners: dashboardAnalytics.growth.newDeliveryPartners };
  const comparisonLabel = (value: number | null) => dashboardPeriod === "lifetime" ? "Lifetime" : formatComparison(value);
  const revenueDelta = comparisonLabel(dashboardAnalytics.comparison.netRevenue);
  const verificationDelta = buildCountMeta(metrics.pendingVerifications, true);
  const collectionDelta = buildCountMeta(metrics.pendingCollections, true);
  const cancellationDelta = buildCountMeta(Number(metrics.cancellationRate.toFixed(1)), true, "%");
  const statusBreakdown = dashboardAnalytics.liveStages.map((item) => ({
    label: item.stage,
    count: item.count,
    color: liveStageColor(item.stage)
  }));
  const categoryTotal = serviceMix.reduce((sum, item) => sum + item.value, 0);
  const categoryChartData = buildCategoryChartData(serviceMix, 4);
  const categoryBreakdown = categoryChartData
    .map((item) => ({
      ...item,
      share: categoryTotal ? Math.round((item.value / categoryTotal) * 100) : 0
    }));
  const hasRevenueData = revenueSeries.some((point) => point.revenue !== 0);
  const hasOrderChartData = orderSeries.some((point) => point.completed || point.active || point.cancelled || point.pending);
  const tailorWalletByUser = new Map((tailorPayoutsQuery.data ?? []).map((row) => [row.userId, row]));
  const deliveryWalletByUser = new Map((deliveryPayoutsQuery.data ?? []).map((row) => [row.userId, row]));
  const periodPendingPayouts = dashboardAnalytics.finance.pendingPayouts;
  const liveAlerts = buildLiveAlerts({
    deliveryRequests,
    operationalAlerts: operationalAlertsQuery.data ?? [],
    orders: allOrders,
    payments,
    setActiveSection,
    setBatchFocus,
    setDeliveryDetail,
    setOrderDetail,
    setTicketDetail,
    setTailoringDetail,
    tailoringRequests,
    tickets
  });
  const todayOperations = buildTodayOperationsSummary({
    deliveryBatches: deliveryBatches.filter((batch) => isDateInDashboardPeriod(batch.roundAt, dashboardPeriodBounds)),
    deliveryRequests: dashboardDeliveryRequestsForPeriod,
    partners,
    tailoringRequests: dashboardTailoringRequestsForPeriod,
    tailors,
    periodScoped: true
  });
  const dashboardStats = [
    {
      icon: LayoutGrid,
      label: "Total Orders",
      note: dateRangeLabel,
      tone: "sky" as const,
      value: dashboardAnalytics.orders.total.toLocaleString("en-IN"),
      change: comparisonLabel(dashboardAnalytics.comparison.orders),
      changeTone: comparisonTone(dashboardAnalytics.comparison.orders),
      target: "orders" as SectionId,
      drilldownKey: "orders_total" as DashboardDrilldownKey,
      periodScoped: true
    },
    {
      icon: PackageCheck,
      label: "Active Orders",
      note: "In progress",
      tone: "teal" as const,
      value: activeOrders.toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "orders" as SectionId,
      drilldownKey: "orders_active" as DashboardDrilldownKey,
      periodScoped: true
    },
    {
      icon: CheckCircle2,
      label: "Completed Orders",
      note: "Successfully delivered",
      tone: "emerald" as const,
      value: completedOrders.toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "orders" as SectionId,
      drilldownKey: "orders_completed" as DashboardDrilldownKey,
      periodScoped: true
    },
    {
      icon: AlertCircle,
      label: "Cancelled Orders",
      note: "Discarded",
      tone: "rose" as const,
      value: cancelledOrders.toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "orders" as SectionId,
      drilldownKey: "orders_cancelled" as DashboardDrilldownKey,
      periodScoped: true
    },
    {
      icon: BarChart3,
      label: "Realized Net Revenue",
      formula: "Completed-order net collections − finalized stitching, measurement and delivery costs − ₹16 operational allowance once per eligible completed order.",
      note: `From ${dashboardAnalytics.finance.realizedCompletedOrders.toLocaleString("en-IN")} completed order${dashboardAnalytics.finance.realizedCompletedOrders === 1 ? "" : "s"}`,
      tone: "sky" as const,
      value: formatCurrency(dashboardAnalytics.finance.netRevenue),
      change: comparisonLabel(dashboardAnalytics.comparison.netRevenue),
      changeTone: comparisonTone(dashboardAnalytics.comparison.netRevenue),
      target: "orders" as SectionId,
      drilldownKey: "orders_realized" as DashboardDrilldownKey,
      detailKind: "realized_revenue" as FinanceDetailKind,
      periodScoped: true
    },
    {
      icon: ReceiptIndianRupee,
      label: "Gross Paid",
      formula: "Successful customer collections minus successful full refunds in the selected payment/refund period. Duplicate payment records are ignored.",
      note: `${formatCurrency(dashboardAnalytics.finance.incompleteCollections)} awaiting completion`,
      tone: "emerald" as const,
      value: formatCurrency(dashboardAnalytics.finance.grossPaid),
      change: comparisonLabel(dashboardAnalytics.comparison.grossPaid),
      changeTone: comparisonTone(dashboardAnalytics.comparison.grossPaid),
      target: "payments" as SectionId,
      drilldownKey: "payments_paid" as DashboardDrilldownKey,
      detailKind: "gross_paid" as FinanceDetailKind,
      periodScoped: true
    },
    {
      icon: AlertCircle,
      label: "Partner Cost",
      formula: "Finalized stitching, measurement and delivery obligations for orders completed in the selected period, whether paid or still pending.",
      note: `${formatCurrency(dashboardAnalytics.finance.paidPartnerCost)} paid · ${formatCurrency(dashboardAnalytics.finance.pendingPartnerCost)} pending`,
      tone: "rose" as const,
      value: formatCurrency(dashboardAnalytics.finance.partnerCost),
      change: "",
      changeTone: "neutral" as const,
      target: "payments" as SectionId,
      drilldownKey: "partner_cost" as DashboardDrilldownKey,
      detailKind: "partner_cost" as FinanceDetailKind,
      periodScoped: true
    },
    {
      icon: PackageCheck,
      label: "Pending Payouts",
      formula: "As-of-now unpaid portion of finalized partner obligations belonging to completed orders only.",
      note: `As of ${formatDate(dashboardAnalytics.finance.pendingPayoutAsOf, true)}`,
      tone: "amber" as const,
      value: formatCurrency(periodPendingPayouts),
      change: "",
      changeTone: "neutral" as const,
      target: "payments" as SectionId,
      drilldownKey: "pending_payouts" as DashboardDrilldownKey,
      detailKind: "pending_payouts" as FinanceDetailKind,
      periodScoped: false
    },
    {
      icon: ShieldCheck,
      label: "Pending Orders",
      note: "Awaiting action",
      tone: "amber" as const,
      value: pendingOrders.toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "orders" as SectionId,
      drilldownKey: "orders_pending" as DashboardDrilldownKey,
      periodScoped: true
    },
    {
      icon: Truck,
      label: "Delivery Partners",
      note: "Registered fleet",
      tone: "cyan" as const,
      value: partners.length.toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "partners" as SectionId,
      periodScoped: false
    },
    {
      icon: Scissors,
      label: "Active Tailors",
      note: "Available for work",
      tone: "amber" as const,
      value: dashboardAnalytics.partners.activeTailors.toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "tailors" as SectionId,
      drilldownKey: "active_tailors" as DashboardDrilldownKey,
      periodScoped: false
    },
    {
      icon: MessageSquareText,
      label: "SMS OTPs Sent",
      note: dashboardAnalytics.otp?.lastSentAt ? `Last sent ${formatDate(dashboardAnalytics.otp.lastSentAt, true)}` : "Counting starts with the updated backend",
      tone: "violet" as const,
      value: (dashboardAnalytics.otp?.successfulSends ?? 0).toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "roles" as SectionId,
      periodScoped: false
    }
  ];
  const miniTrendCards = [
    {
      icon: CheckCircle2,
      label: "Completion Rate",
      formula: "Delivered ÷ (Delivered + Cancelled). Pending and active orders are excluded.",
      note: `${percentage(dashboardAnalytics.orders.cancellationRate)} cancelled`,
      tone: "emerald" as const,
      value: percentage(dashboardAnalytics.orders.completionRate),
      target: "orders" as SectionId,
      drilldownKey: "orders_resolved" as DashboardDrilldownKey,
      periodScoped: true,
      data: orderSeries.map((point) => ({
        label: point.label,
        value: point.completed + point.cancelled ? Number(((point.completed / (point.completed + point.cancelled)) * 100).toFixed(1)) : 0
      }))
    },
    {
      icon: ReceiptIndianRupee,
      label: "Average Order Value",
      formula: "Gross Paid ÷ distinct successfully paid orders.",
      note: revenueDelta,
      tone: "amber" as const,
      value: formatCurrency(dashboardAnalytics.finance.averageOrderValue),
      target: "payments" as SectionId,
      drilldownKey: "payments_paid" as DashboardDrilldownKey,
      periodScoped: true,
      data: revenueSeries.map((point) => ({ label: point.label, value: point.revenue }))
    },
    {
      icon: Users,
      label: "New Customers",
      note: comparisonLabel(dashboardAnalytics.comparison.newCustomers),
      tone: "violet" as const,
      value: latestGrowthPoint.customers.toLocaleString("en-IN"),
      target: "users" as SectionId,
      drilldownKey: "new_customers" as DashboardDrilldownKey,
      periodScoped: true,
      data: growthSeries.map((point) => ({ label: point.label, value: point.customers }))
    },
    {
      icon: Scissors,
      label: "New Tailors",
      note: comparisonLabel(dashboardAnalytics.comparison.newTailors),
      tone: "amber" as const,
      value: latestGrowthPoint.tailors.toLocaleString("en-IN"),
      target: "tailors" as SectionId,
      drilldownKey: "new_tailors" as DashboardDrilldownKey,
      periodScoped: true,
      data: growthSeries.map((point) => ({ label: point.label, value: point.tailors }))
    },
    {
      icon: Truck,
      label: "New Delivery Partners",
      note: comparisonLabel(dashboardAnalytics.comparison.newDeliveryPartners),
      tone: "sky" as const,
      value: latestGrowthPoint.partners.toLocaleString("en-IN"),
      target: "partners" as SectionId,
      drilldownKey: "new_delivery_partners" as DashboardDrilldownKey,
      periodScoped: true,
      data: growthSeries.map((point) => ({ label: point.label, value: point.partners }))
    }
  ];

  const orderPartnerOptions = [...partners]
    .filter((partner, index, list) => list.findIndex((item) => item.id === partner.id) === index)
    .sort((a, b) => getPartnerDisplayName(a).localeCompare(getPartnerDisplayName(b)));

  const scopedOrderRecords = dashboardDrilldown?.target === "orders"
    ? allOrders.filter((order) => drilldownIdSet.has(order.id))
    : dashboardOrders;

  const filteredOrders = allOrders
    .filter((order) => dashboardDrilldown?.key === "orders_realized" || isDateInDashboardPeriod(order.createdAt, dashboardPeriodBounds))
    .filter((order) => dashboardDrilldown?.target !== "orders" || drilldownIdSet.has(order.id))
    .filter((order) => {
      const orderPartnerId = String(order.deliveryPartner?.id ?? order.pickupPartner?.id ?? "");
      const partnerMatch = !deliveryPartnerFilter || orderPartnerId === deliveryPartnerFilter;
      const categoryMatch = !orderCategoryFilter || (order.items ?? []).some((item) => (item.service?.category?.name ?? "General") === orderCategoryFilter);
      const tailorMatch = !orderTailorFilter || order.tailor?.id === orderTailorFilter;
      const paymentMethodMatch = !paymentFilter || String(order.paymentMethod).toUpperCase() === paymentFilter;
      const paymentStatusMatch = !orderPaymentStatusFilter || String(order.paymentStatus).toUpperCase() === orderPaymentStatusFilter;
      const dateMatch = !orderDateFilter || Boolean(order.createdAt && new Date(order.createdAt).toISOString().slice(0, 10) === orderDateFilter);
      const normalizedStatus = String(order.status).toUpperCase();
      const dashboardState = classifyDashboardOrderStatus(normalizedStatus);
      const orderPlacedStatuses = ["ORDER_PLACED", "QUOTE_REQUESTED", "PAYMENT_PENDING", "TAILOR_SELECTED", "PICKUP_ASSIGNED"];
      const statusMatch = !orderFilter ||
        (orderFilter === "__ACTIVE__" && dashboardState === "active") ||
        (orderFilter === "__COMPLETED__" && dashboardState === "completed") ||
        (orderFilter === "__CANCELLED__" && dashboardState === "cancelled") ||
        (orderFilter === "__PENDING__" && dashboardState === "pending") ||
        (orderFilter === "__RESOLVED__" && (dashboardState === "completed" || dashboardState === "cancelled")) ||
        (orderFilter === "ORDER_PLACED" && (orderPlacedStatuses.includes(normalizedStatus) || (Boolean(order.pickupPartnerId || order.deliveryPartnerId) && !["DELIVERED", "CANCELLED"].includes(normalizedStatus)))) ||
        normalizedStatus === orderFilter;
      return matchesOrderSearch(order, orderSearch) && statusMatch && partnerMatch && categoryMatch && tailorMatch && paymentMethodMatch && paymentStatusMatch && dateMatch;
    })
    .sort((a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime());

  const tailoringNeedsAttention = (request: TailoringRequest) => {
    const createdAt = new Date(request.createdAt ?? 0).getTime();
    const waitingWithoutQuote = request.status === "QUOTE_REQUESTED" && Number(request.quoteCount ?? 0) === 0 && Date.now() - createdAt > 15 * 60_000;
    return waitingWithoutQuote || request.orderStatus === "delivery_issue" || request.orderStatus === "delivery_retry_scheduled" || ["High", "Urgent", "VIP"].includes(orderPriorities[request.id] ?? "Normal");
  };
  const deliveryNeedsAttention = (request: DeliveryRequest) => {
    const overdue = Boolean(request.deadlineAt && new Date(request.deadlineAt).getTime() < Date.now() && !["delivered", "cancelled"].includes(request.taskStatus));
    return overdue || Boolean(request.lastFailureReason) || ["PENDING_RETRY", "ACTION_REQUIRED"].includes(request.retryStatus ?? "") || ["High", "Urgent", "VIP"].includes(orderPriorities[request.id] ?? "Normal");
  };
  const filteredTailoring = tailoringRequests.filter((request) => {
    const searchMatch = !searchTerm || [request.id, request.description, request.clothType, request.workType, request.darjiId, request.customer?.name, request.customer?.phone, request.selectedQuote?.tailor?.shopName]
      .filter(Boolean).join(" ").toLowerCase().includes(searchTerm);
    return searchMatch &&
      (!tailoringStatusFilter || request.status === tailoringStatusFilter) &&
      (!tailoringWorkFilter || request.workStatus === tailoringWorkFilter) &&
      (!tailoringUrgencyFilter || String(request.urgency).toUpperCase() === tailoringUrgencyFilter) &&
      (!tailoringAttentionOnly || (tailoringStatusFilter === "QUOTE_REQUESTED" ? Number(request.quoteCount ?? 0) === 0 : tailoringNeedsAttention(request)));
  });

  const filteredDelivery = deliveryRequests.filter((request) => {
    const searchMatch = !searchTerm || [request.id, request.taskId, request.orderId, request.darjiId, request.customerName, request.customerPhone, request.tailorName, request.pickupAddress, request.dropAddress, request.taskStatus, request.assignedDeliveryPartnerId]
      .filter(Boolean).join(" ").toLowerCase().includes(searchTerm);
    return searchMatch &&
      (!deliveryStatusFilter || request.taskStatus === deliveryStatusFilter) &&
      (!deliveryTypeFilter || request.type === deliveryTypeFilter) &&
      (!deliveryServiceFilter || request.serviceLevel === deliveryServiceFilter) &&
      (!deliveryExceptionOnly || deliveryNeedsAttention(request));
  });
  const retryDeliveryRows = (deliveryRetriesQuery.data ?? []).filter((request) =>
    !searchTerm ||
    [request.taskId, request.darjiId, request.customerName, request.tailorName, request.lastFailureReason, request.retryStatus]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );
  const tailoringSummary = {
    total: tailoringRequests.length,
    awaitingQuotes: tailoringRequests.filter((request) => request.status === "QUOTE_REQUESTED").length,
    noQuotes: tailoringRequests.filter((request) => request.status === "QUOTE_REQUESTED" && Number(request.quoteCount ?? 0) === 0).length,
    paymentPending: tailoringRequests.filter((request) => request.status === "PAYMENT_PENDING" || request.paymentStatus === "PENDING").length,
    working: tailoringRequests.filter((request) => request.workStatus === "WORKING").length,
    ready: tailoringRequests.filter((request) => request.workStatus === "READY").length,
    attention: tailoringRequests.filter(tailoringNeedsAttention).length
  };
  const deliverySummary = {
    total: deliveryRequests.length,
    unassigned: deliveryRequests.filter((request) => request.taskStatus === "pending" && !request.assignedDeliveryPartnerId).length,
    accepted: deliveryRequests.filter((request) => request.taskStatus === "accepted").length,
    inTransit: deliveryRequests.filter((request) => request.taskStatus === "picked_up").length,
    delivered: deliveryRequests.filter((request) => request.taskStatus === "delivered").length,
    retries: deliveryRequests.filter((request) => ["PENDING_RETRY", "ACTION_REQUIRED"].includes(request.retryStatus ?? "")).length,
    attention: deliveryRequests.filter(deliveryNeedsAttention).length
  };

  const filteredTailors = tailors.filter((tailor) => {
    const status = tailor.verificationStatus ?? "NOT_SUBMITTED";
    const directoryTerm = tailorDirectorySearch.trim().toLowerCase();
    const searchableValues = [tailor.shopName, tailor.darjiTailorId, tailor.id, tailor.userId, tailor.user?.name, tailor.user?.phone, status, formatList(tailor.specialization)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      !searchTerm ||
      searchableValues.includes(searchTerm);
    const matchesDirectorySearch = !directoryTerm || searchableValues.includes(directoryTerm);
    const matchesDrilldown = dashboardDrilldown?.target !== "tailors" || drilldownIdSet.has(tailor.id);
    return matchesSearch && matchesDirectorySearch && matchesDrilldown;
  });
  const rejectedTailors = filteredTailors.filter((tailor) => tailor.verificationStatus === "REJECTED");

  const filteredPartners = partners.filter((partner) => {
    const status = partner.verificationStatus ?? "NOT_SUBMITTED";
    const directoryTerm = partnerDirectorySearch.trim().toLowerCase();
    const searchableValues = [partner.darjiPartnerId, partner.id, partner.userId, partner.user?.name, partner.user?.phone, getPartnerVehicleNumber(partner), getPartnerRoleLabel(partner), status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      !searchTerm ||
      searchableValues.includes(searchTerm);
    const matchesDirectorySearch = !directoryTerm || searchableValues.includes(directoryTerm);
    const matchesDrilldown = dashboardDrilldown?.target !== "partners" || drilldownIdSet.has(partner.id);
    return matchesSearch && matchesDirectorySearch && matchesDrilldown;
  });

  const filteredUsers = customerUsers.filter((user) => {
    const matchesSearch = !searchTerm || [user.name, user.phone, user.email, user.role, user.accountStatus, user.darjiCustomerId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm);
    const matchesDrilldown = dashboardDrilldown?.target !== "users" || drilldownIdSet.has(user.id);
    return matchesSearch && matchesDrilldown;
  });

  const filteredPayments = payments.filter((payment) => {
    const content = [
      payment.orderId,
      payment.order?.orderNumber,
      payment.order?.customerName,
      payment.order?.customerPhone,
      payment.method,
      payment.status,
      payment.providerRef,
      payment.source
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesDrilldown = dashboardDrilldown?.target !== "payments" || dashboardDrilldown.key !== "payments_paid" || drilldownIdSet.has(payment.id);
    const orderCompleted = ["DELIVERED", "COMPLETED"].includes(String(payment.order?.status ?? "").toUpperCase());
    return orderCompleted && (!searchTerm || content.includes(searchTerm)) && (!paymentFilter || payment.status === paymentFilter) && matchesDrilldown;
  });
  const financialLedger = financialLedgerQuery.data ?? [];
  const filteredFinancialLedger = financialLedger.filter((entry) => {
    const content = [entry.darjiId, entry.category, entry.partyName, entry.partyType, entry.sourceId, entry.sourceLabel, entry.referenceNumber, entry.method, entry.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (!searchTerm || content.includes(searchTerm)) && (!paymentFilter || entry.status === paymentFilter);
  });
  const tailorPayoutRows = tailorPayoutsQuery.data ?? [];
  const deliveryPayoutRows = deliveryPayoutsQuery.data ?? [];
  const combinedPayoutRows = [...tailorPayoutRows, ...deliveryPayoutRows];
  const drilldownPayoutRows = dashboardDrilldown?.target === "payments" && (dashboardDrilldown.key === "partner_cost" || dashboardDrilldown.key === "pending_payouts")
    ? combinedPayoutRows.filter((row) => drilldownIdSet.has(row.userId))
    : combinedPayoutRows;
  const activePayoutRows = paymentsSubTab === "delivery"
    ? deliveryPayoutRows
    : paymentsSubTab === "tailors"
      ? tailorPayoutRows
      : drilldownPayoutRows;
  const walletLiabilities = [...tailorPayoutRows, ...deliveryPayoutRows].reduce((sum, row) => sum + Number(row.pendingAmount ?? 0), 0);
  const totalPendingTailorPayments = tailorPayoutRows.reduce((sum, row) => sum + Number(row.pendingAmount ?? 0), 0);
  const totalPendingDeliveryPayments = deliveryPayoutRows.reduce((sum, row) => sum + Number(row.pendingAmount ?? 0), 0);

  const filteredCoupons = coupons.filter((coupon) =>
    !searchTerm ||
    [coupon.darjiId, coupon.code, coupon.description, coupon.discountType]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredTickets = tickets.filter((ticket) => {
    const searchMatch = !searchTerm ||
      [ticket.darjiId, ticket.subject, ticket.status, ticket.user?.phone, ticket.order?.orderNumber, ticket.user?.darjiCustomerId, ticket.user?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm);

    if (!searchMatch) return false;

    const isCustomer = ticket.user?.role === "CUSTOMER" || ticket.subject === "Customer Support Request" || ticket.subject === "Bug Report";
    const isTailor = ticket.user?.role === "TAILOR" || ticket.subject === "Tailor Support Request" || ticket.subject === "Shop Details Change Request" || (ticket.subject === "Bank Details Change Request" && ticket.user?.role === "TAILOR");
    const isDelivery = ticket.user?.role === "DELIVERY_PARTNER" || ticket.subject === "Delivery Support Request" || ticket.subject === "Vehicle Details Change Request" || (ticket.subject === "Bank Details Change Request" && ticket.user?.role === "DELIVERY_PARTNER");

    if (supportCategory === "customer") return isCustomer;
    if (supportCategory === "tailor") return isTailor;
    if (supportCategory === "delivery") return isDelivery;

  });

  const clearSupportSelection = () => {
    setTicketDetail(null);
    setActiveChangeRequest(null);
    setActiveBugReport(null);
    setContextTab("customer");
  };

  const setSupportTab = (tab: SupportStreamTab) => {
    persistSupportSubTab(tab);
    clearSupportSelection();
  };

  const customerChangeRequests = changeRequestsQuery.data ? changeRequestsQuery.data.filter(r => r.user?.role === "CUSTOMER" || r.userRole === "CUSTOMER") : [];
  const customerOpenCount = tickets.filter(t => 
    (t.user?.role === "CUSTOMER" || t.subject?.includes("Customer") || (!t.user?.role && t.subject?.toLowerCase().includes("customer"))) && 
    (t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "PENDING")
  ).length + customerChangeRequests.filter(r => r.status === "PENDING").length;

  const tailorTickets = tickets.filter(t => t.user?.role === "TAILOR" || t.subject?.includes("Tailor"));
  const tailorRequests = changeRequestsQuery.data ? changeRequestsQuery.data.filter(r => r.user?.role === "TAILOR" || r.userRole === "TAILOR") : [];
  const tailorOpenCount = tailorTickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "PENDING").length +
    tailorRequests.filter(r => r.status === "PENDING").length;

  const deliveryTickets = tickets.filter(t => t.user?.role === "DELIVERY_PARTNER" || t.subject?.includes("Delivery"));
  const deliveryChangeRequests = changeRequestsQuery.data ? changeRequestsQuery.data.filter(r => r.user?.role === "DELIVERY_PARTNER" || r.userRole === "DELIVERY_PARTNER") : [];
  const deliveryOpenCount = deliveryTickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "PENDING").length +
    deliveryChangeRequests.filter(r => r.status === "PENDING").length;

  const bugReportsList = bugReportsQuery.data || [];
  const bugOpenCount = bugReportsList.filter(b => b.status === "NEW" || b.status === "INVESTIGATING" || b.status === "IN_PROGRESS").length;

  const admins = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN");
  const customerTickets = tickets.filter(isCustomerSupportTicket);
  const tailorChatTickets = tickets.filter(isTailorSupportTicket);
  const deliveryChatTickets = tickets.filter(isDeliverySupportTicket);
  const selectedSupportItem = ticketDetail || activeBugReport || activeChangeRequest;

  let rawSupportQueueItems: SupportQueueItem[] = [];
  if (supportSubTab === "customer") {
    rawSupportQueueItems = [
      ...customerTickets.map((entity) => ({ kind: "ticket" as const, entity })),
      ...customerChangeRequests.map((entity) => ({ kind: "request" as const, entity }))
    ];
  } else if (supportSubTab === "tailor") {
    rawSupportQueueItems =
      tailorSupportStatus === "requests"
        ? tailorRequests.map((entity) => ({ kind: "request", entity }))
        : tailorChatTickets.map((entity) => ({ kind: "ticket", entity }));
  } else if (supportSubTab === "delivery") {
    rawSupportQueueItems =
      deliverySupportStatus === "requests"
        ? deliveryChangeRequests.map((entity) => ({ kind: "request", entity }))
        : deliveryChatTickets.map((entity) => ({ kind: "ticket", entity }));
  } else {
    rawSupportQueueItems = bugReportsList.map((entity) => ({ kind: "bug", entity }));
  }

  const currentSupportSearch =
    supportSubTab === "customer"
      ? customerSupportSearch
      : supportSubTab === "tailor"
        ? tailorSupportSearch
        : supportSubTab === "delivery"
          ? deliverySupportSearch
          : bugSearch;

  const filteredSupportQueueItems = rawSupportQueueItems
    .filter((item) => matchesSupportQueueSearch(item, currentSupportSearch))
    .filter((item) => matchesSupportQueueFilters(item, supportStatusFilter, supportPriorityFilter, supportAgentFilter))
    .sort((left, right) => {
      const leftTime = new Date(getSupportQueueTimestamp(left) ?? 0).getTime();
      const rightTime = new Date(getSupportQueueTimestamp(right) ?? 0).getTime();
      return rightTime - leftTime;
    });

  const supportQueueStatusCounts = {
    all: filteredSupportQueueItems.length,
    open: filteredSupportQueueItems.filter((item) => getSupportQueueStatusGroup(item) === "OPEN").length,
    pending: filteredSupportQueueItems.filter((item) => getSupportQueueStatusGroup(item) === "PENDING").length,
    resolved: filteredSupportQueueItems.filter((item) => getSupportQueueStatusGroup(item) === "RESOLVED").length,
    closed: filteredSupportQueueItems.filter((item) => getSupportQueueStatusGroup(item) === "CLOSED").length
  };
  const statusTabToFilter: Record<SupportStatusTabId, string> = {
    all: "",
    open: "OPEN",
    pending: "PENDING",
    resolved: "RESOLVED",
    closed: "CLOSED"
  };



  const orderColumns = getOrderColumns({
    onAssign: openOrderAssignment,
    onOpenCustomer: (order) => setUserDetail(users.find((candidate) => candidate.id === order.customerId) ?? ({ ...order.customer, id: order.customerId } as AdminUser)),
    onOpenTailor: (order) => {
      const tailor = tailors.find((candidate) => candidate.id === order.tailorId) ?? order.tailor;
      if (tailor) setTailorDetail(tailor);
    },
    onOpenPartner: (order) => {
      const partnerId = order.deliveryPartnerId ?? order.pickupPartnerId;
      const partner = partners.find((candidate) => candidate.id === partnerId) ?? order.deliveryPartner ?? order.pickupPartner;
      if (partner) setPartnerDetail(partner);
    },
    onCallCustomer: (order) => {
      openOrderDetail(order, "overview");
      callCustomer(order);
    },
    onChatCustomer: (order) => {
      openOrderDetail(order, "notes");
      openCustomerChat(order);
    },
    onDownloadImages: (order) => {
      void downloadOrderImages(order);
    },
    onGenerateInvoice: (order) => {
      void downloadOrderInvoice(order);
    },
    onMarkHighPriority: (order) => {
      orderMetadataMutation.mutate({ orderId: order.id, priority: "High" }, { onSuccess: () => toast.success("Order marked high priority") });
    },
    onDeleteOrder: setDeleteOrderTarget,
    onOpen: openOrderDetail,
    onReportIssue: (order) => {
      void reportAdminOrderIssue({ orderId: order.id }).then(async () => {
        openOrderDetail(order, "notes");
        toast.success("Operational issue reported for this order");
        await queryClient.invalidateQueries({ queryKey: ["admin", "operational-alerts"] });
      }).catch((error) => toast.error(extractError(error)));
    },
    onOpenBatch: (batch) => {
      setBatchFocus(batch);
      setActiveSection("batches");
      setSidebarOpen(false);
    },
    onStatusChange: (order, status) => statusMutation.mutate({ order, status }),
    batches: deliveryBatches,
    pending: statusMutation.isPending,
    priorities: orderPriorities
  });
  const tailoringColumns = getTailoringColumns({
    onOpen: setTailoringDetail,
    onOpenCustomer: (request) => setUserDetail(users.find((candidate) => candidate.id === request.customerId) ?? ({ ...request.customer, id: request.customerId } as AdminUser)),
    onOpenTailor: (request) => {
      const tailorId = request.selectedQuote?.tailorId ?? request.assignedTailorId;
      const tailor = tailors.find((candidate) => candidate.id === tailorId);
      if (tailor) setTailorDetail(tailor);
      else toast.info("The selected tailor profile is not available in the current data set");
    },
    priorities: orderPriorities,
    selectedIds: selectedTailoringIds,
    visibleIds: filteredTailoring.map((request) => request.id),
    onToggleSelected: (requestId) => setSelectedTailoringIds((current) => current.includes(requestId) ? current.filter((id) => id !== requestId) : [...current, requestId]),
    onToggleAll: () => setSelectedTailoringIds((current) => filteredTailoring.every((request) => current.includes(request.id)) ? current.filter((id) => !filteredTailoring.some((request) => request.id === id)) : Array.from(new Set([...current, ...filteredTailoring.map((request) => request.id)])))
  });
  const deliveryColumns = getDeliveryColumns({
    onOpen: setDeliveryDetail,
    onOpenCustomer: (request) => setUserDetail(users.find((candidate) => candidate.id === request.customerId) ?? ({ id: request.customerId, name: request.customerName, phone: request.customerPhone } as AdminUser)),
    onOpenPartner: (request) => {
      const partner = partners.find((candidate) => candidate.id === request.assignedDeliveryPartnerId);
      if (partner) setPartnerDetail(partner);
      else toast.info("No delivery partner is assigned to this task");
    },
    onOpenTailor: (request) => {
      const tailor = tailors.find((candidate) => candidate.id === request.tailorId);
      if (tailor) setTailorDetail(tailor);
      else toast.info("The linked tailor profile is not available in the current data set");
    },
    partners,
    priorities: orderPriorities,
    selectedIds: selectedDeliveryIds,
    visibleIds: filteredDelivery.map((request) => request.id),
    onToggleSelected: (requestId) => setSelectedDeliveryIds((current) => current.includes(requestId) ? current.filter((id) => id !== requestId) : [...current, requestId]),
    onToggleAll: () => setSelectedDeliveryIds((current) => filteredDelivery.every((request) => current.includes(request.id)) ? current.filter((id) => !filteredDelivery.some((request) => request.id === id)) : Array.from(new Set([...current, ...filteredDelivery.map((request) => request.id)])))
  });
  const tailorColumns = getTailorColumns({
    onOpen: setTailorDetail,
    onReview: (tailorId, status) => tailorReviewMutation.mutate({ tailorId, status }),
    onDelete: (tailor) => {
      const label = getTailorDisplayName(tailor);
      if (window.confirm(`Permanently delete tailor account "${label}"? This action cannot be undone.`)) {
        accountDeleteMutation.mutate(tailor.userId);
      }
    },
    pendingDelete: accountDeleteMutation.isPending
  });
  const partnerColumns = getPartnerColumns({
    onLocate: (partner) => {
      const coordinates = partner.currentLocation?.coordinates;
      if (!coordinates || coordinates.length < 2) {
        toast.info(`${getPartnerDisplayName(partner)} has not shared a phone GPS location yet.`);
        return;
      }
      setMapPartnerFocus({ partnerId: partner.id, requestId: Date.now() });
    },
    onOpen: setPartnerDetail,
    onReview: (partnerId, status) => partnerReviewMutation.mutate({ partnerId, status }),
    onDelete: (partner) => {
      const label = getPartnerDisplayName(partner);
      if (window.confirm(`Permanently delete delivery partner account "${label}"? This action cannot be undone.`)) {
        accountDeleteMutation.mutate(partner.userId);
      }
    },
    pendingDelete: accountDeleteMutation.isPending
  });
  const userColumns = getUserColumns({
    onActivate: (userId) => userModerationMutation.mutate({ userId, action: "ACTIVE" }),
    onBan: (userId) => userModerationMutation.mutate({ userId, action: "BANNED", reason: "Banned by admin" }),
    onDelete: (user) => {
      const label = getCustomerDisplayName(user);
      if (window.confirm(`Permanently delete customer account "${label}"? This action cannot be undone.`)) {
        accountDeleteMutation.mutate(user.id);
      }
    },
    onOpen: setUserDetail,
    onSuspend: (userId) =>
      userModerationMutation.mutate({
        userId,
        action: "SUSPENDED",
        reason: "Temporarily suspended by admin",
        suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }),
    pending: userModerationMutation.isPending,
    pendingDelete: accountDeleteMutation.isPending
  });
  const paymentColumns = getPaymentColumns({
    breakdowns: financeSummary.byPaymentId,
    onMarkPaid: (paymentId) => paymentMutation.mutate({ paymentId }),
    onOpenPayment: setPaymentDetail,
    onOpenOrder: (payment) => {
      const order = allOrders.find((candidate) => candidate.id === payment.orderId);
      if (!order) {
        toast.error("The linked order is not available in the current data set");
        return;
      }
      openOrderDetail(order, "overview");
    },
    onOpenCustomer: (payment) => {
      const customerId = payment.order?.customerId;
      if (!customerId) return;
      setUserDetail(users.find((candidate) => candidate.id === customerId) ?? ({ id: customerId, name: payment.order?.customerName, phone: payment.order?.customerPhone } as AdminUser));
    },
    pending: paymentMutation.isPending
  });
  const couponColumns = getCouponColumns({
    onDelete: (coupon) => {
      if (window.confirm(`Delete unused coupon ${coupon.code}? This cannot be undone.`)) couponDeleteMutation.mutate(coupon.id);
    },
    onEdit: setCouponEditTarget,
    onHistory: setCouponHistoryTarget,
    onToggle: (coupon) => couponUpdateMutation.mutate({ couponId: coupon.id, isActive: !coupon.isActive }),
    pendingId: couponUpdateMutation.isPending ? couponUpdateMutation.variables?.couponId : couponDeleteMutation.isPending ? couponDeleteMutation.variables : undefined
  });
  const ticketColumns = getTicketColumns({ onOpen: setTicketDetail });
  const changeRequestColumns = getChangeRequestColumns({ onOpen: setActiveChangeRequest });
  const bugReportColumns = getBugReportColumns({ onOpen: setActiveBugReport, users });
  const openHeaderNotification = (alert: OperationalAlert) => {
    if (alert.status === "OPEN") notificationReadMutation.mutate([alert.id]);
    const metadata = alert.metadata ?? {};
    const ids = [alert.entityId, metadata.taskId, metadata.orderId, metadata.requestId, metadata.paymentId, metadata.batchId].filter(Boolean).map(String);
    const delivery = deliveryRequests.find((request) => ids.includes(request.id) || ids.includes(request.taskId) || ids.includes(request.orderId));
    const orderIds = delivery?.orderId ? [...ids, String(delivery.orderId)] : ids;
    const order = allOrders.find((item) => orderIds.includes(item.id) || orderIds.includes(String(item.darjiId ?? "")) || orderIds.includes(String(item.orderNumber ?? "")));
    const tailoring = tailoringRequests.find((request) => ids.includes(request.id) || ids.includes(String(request.darjiId ?? "")));
    if (order) {
      setOrderDetail(order);
      setActiveSection("orders");
    } else if (delivery) {
      setDeliveryDetail(delivery);
      setActiveSection("delivery");
    } else if (tailoring) {
      setTailoringDetail(tailoring);
      setActiveSection("tailoring");
    } else if (alert.entityType === "delivery_batch" || alert.type.includes("BATCH")) {
      const batchId = String(metadata.batchId ?? alert.entityId ?? "");
      if (batchId) setBatchFocus({ batchId, roundAt: String(metadata.roundAt ?? new Date().toISOString()) });
      setActiveSection("batches");
    } else if (alert.type.includes("PAYMENT")) setActiveSection("payments");
    else if (alert.type.includes("SUPPORT")) setActiveSection("support");
    else setActiveSection("dashboard");
  };

  return (
    <>
      <PortalFrame
        activeSection={activeSection}
        alertCount={alertCount}
        headerDateControl={<DashboardPeriodPicker compact fromMonth={dashboardFromMonth} label={dateRangeLabel} onFromMonthChange={setDashboardFromMonth} onPresetChange={setDashboardPeriod} onToMonthChange={setDashboardToMonth} preset={dashboardPeriod} toMonth={dashboardToMonth} />}
        notifications={headerNotifications}
        globalSearch={globalSearch}
        globalSearchResults={globalSearchResults}
        me={me}
        onGlobalSearchChange={setGlobalSearch}
        onLogout={handleLogout}
        onOpenSidebar={() => setSidebarOpen(true)}
        onMarkAllNotificationsRead={() => notificationReadMutation.mutate(unreadHeaderNotifications.map((alert) => alert.id))}
        onNotificationOpen={openHeaderNotification}
        onSectionChange={(section) => {
          clearDashboardDrilldown();
          setActiveSection(section);
          setSidebarOpen(false);
        }}
        sidebarOpen={sidebarOpen}
        supportCount={openSupportTickets}
      >
        {activeSection === "dashboard" ? (
          <div className="space-y-4">
            <Panel className="darji-hero-wave relative overflow-hidden border-[#efdfc5] bg-[linear-gradient(180deg,#fffdf8_0%,#fff8ee_100%)] p-0">
              <div className="darji-hero-overlay absolute left-0 right-0 top-0 h-full bg-[radial-gradient(circle_at_78%_24%,rgba(246,163,19,0.12),transparent_20%),radial-gradient(circle_at_88%_26%,rgba(246,163,19,0.12),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.92),rgba(255,250,240,0.58))]" />
              <div className="absolute right-6 top-5 hidden h-28 w-40 opacity-60 lg:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle,#efc871_1px,transparent_1px)] [background-size:10px_10px]" />
              </div>
              <div className="relative flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between lg:px-7">
                <div>
                  <h2 className="text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--deep)] lg:text-[2.05rem]">
                    Welcome back, {me.name ?? "Darji Admin"}.
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6f614c]">Here&apos;s what&apos;s happening with Darji today.</p>
                </div>
                <DashboardPeriodPicker fromMonth={dashboardFromMonth} label={dateRangeLabel} onFromMonthChange={setDashboardFromMonth} onPresetChange={setDashboardPeriod} onToMonthChange={setDashboardToMonth} preset={dashboardPeriod} toMonth={dashboardToMonth} />
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-12">
              <LiveAlertsWidget className="xl:col-span-7" alerts={liveAlerts} onViewAll={() => setActiveSection("alerts")} />
              <TodayOperationsWidget className="xl:col-span-5" items={todayOperations} onOpen={setActiveSection} title={`${dateRangeLabel} Operations`} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {dashboardStats.map((item) => (
                <StatCard
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  note={item.note}
                  tone={item.tone}
                  value={item.value}
                  change={item.change}
                  changeTone={item.changeTone}
                  formula={"formula" in item ? item.formula : undefined}
                  onClick={() => "detailKind" in item && item.detailKind
                    ? setFinanceDetailKind(item.detailKind)
                    : "drilldownKey" in item && item.drilldownKey
                      ? openDashboardDrilldown({
                        key: item.drilldownKey,
                        label: item.label,
                        target: item.target,
                        periodScoped: item.periodScoped
                      })
                      : setActiveSection(item.target)}
                />
              ))}
            </div>

            <Panel className="overflow-hidden p-0">
              <div className="grid gap-px bg-[var(--panel-border)] sm:grid-cols-2 xl:grid-cols-5">
                <FinanceBreakdownItem label="Completed-order collections" value={dashboardAnalytics.finance.realizedGrossPaid} onClick={() => setFinanceDetailKind("realized_revenue")} />
                <FinanceBreakdownItem label="Stitching + measurement" value={dashboardAnalytics.finance.realizedTailorCost} tone="cost" onClick={() => setFinanceDetailKind("realized_revenue")} />
                <FinanceBreakdownItem label="Finalized delivery payout" value={dashboardAnalytics.finance.realizedDeliveryCost} tone="cost" onClick={() => setFinanceDetailKind("realized_revenue")} />
                <FinanceBreakdownItem label={`Operational allowance (₹${dashboardAnalytics.finance.packagingCostPerOrder} × ${dashboardAnalytics.finance.realizedCompletedOrders})`} value={dashboardAnalytics.finance.realizedPackagingCost} tone="cost" onClick={() => setFinanceDetailKind("realized_revenue")} />
                <FinanceBreakdownItem emphasized label="Realized Net Revenue" value={dashboardAnalytics.finance.netRevenue} onClick={() => setFinanceDetailKind("realized_revenue")} />
              </div>
              {dashboardAnalytics.finance.unrealizedCompletedOrders > 0 ? (
                <p className="bg-amber-50 px-5 py-3 text-xs font-medium text-amber-800">
                  {dashboardAnalytics.finance.unrealizedCompletedOrders.toLocaleString("en-IN")} delivered order{dashboardAnalytics.finance.unrealizedCompletedOrders === 1 ? " is" : "s are"} excluded until collected payment and partner costs are finalized.
                </p>
              ) : null}
            </Panel>

            <div className="grid gap-4 xl:grid-cols-12">
              <ChartCard
                title="Revenue Overview"
                description="Realized net revenue from delivered orders with collected payment and finalized partner costs."
                className="xl:col-span-6 p-5"
                action={<SelectPill label={dateRangeLabel} />}
              >
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[2rem] font-semibold tracking-tight text-[var(--deep)]">{formatCurrency(dashboardAnalytics.finance.netRevenue)}</p>
                    <p className="mt-1.5 text-sm text-emerald-600">
                      {revenueDelta} {dashboardPeriod === "lifetime" ? null : <span className="text-[var(--muted)]">vs equal preceding period</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <MetricChip label="Completed-order paid" value={formatCurrency(dashboardAnalytics.finance.realizedGrossPaid)} />
                    <MetricChip label="AOV" value={formatCurrency(dashboardAnalytics.finance.averageOrderValue)} />
                  </div>
                </div>
                {hasRevenueData ? <ResponsiveContainer width="100%" height={190}>
                  {revenueSeries.length === 1 ? <BarChart data={revenueSeries} barSize={46}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 175, 131, 0.26)" vertical={false} />
                    <XAxis axisLine={false} tickLine={false} dataKey="label" stroke="var(--muted)" />
                    <YAxis axisLine={false} tickLine={false} stroke="var(--muted)" tickFormatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Tooltip contentStyle={tooltipStyle()} formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Bar dataKey="revenue" fill={darjiChartPalette.orange} radius={[9, 9, 0, 0]} />
                  </BarChart> : <AreaChart data={revenueSeries}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f6a313" stopOpacity={0.42} />
                        <stop offset="95%" stopColor="#f6a313" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 175, 131, 0.26)" vertical={false} />
                    <XAxis axisLine={false} tickLine={false} dataKey="label" stroke="var(--muted)" />
                    <YAxis axisLine={false} tickLine={false} stroke="var(--muted)" tickFormatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Tooltip contentStyle={tooltipStyle()} formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Area dataKey="revenue" dot={{ fill: darjiChartPalette.orange, r: 3, strokeWidth: 0 }} fill="url(#revenueFill)" stroke={darjiChartPalette.orange} strokeWidth={3} type="monotone" />
                  </AreaChart>}
                </ResponsiveContainer> : <CompactChartEmptyState message="No delivered orders with finalized costs in this period." />}
              </ChartCard>

              <ChartCard title="Orders Overview" description="Mutually exclusive order states from one normalized source." className="xl:col-span-6 p-5" action={<SelectPill label={dateRangeLabel} />}>
                <div className="mb-3 flex flex-wrap gap-3 text-sm">
                  <LegendDot color={darjiChartPalette.success} label={`Completed ${completedOrders}`} />
                  <LegendDot color={darjiChartPalette.sky} label={`Active ${activeOrders}`} />
                  <LegendDot color={darjiChartPalette.rose} label={`Cancelled ${cancelledOrders}`} />
                  <LegendDot color={darjiChartPalette.orange} label={`Pending ${pendingOrders}`} />
                </div>
                {hasOrderChartData ? <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={orderSeries} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 175, 131, 0.2)" vertical={false} />
                    <XAxis axisLine={false} tickLine={false} dataKey="label" stroke="var(--muted)" />
                    <YAxis axisLine={false} tickLine={false} stroke="var(--muted)" />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Bar dataKey="completed" fill={darjiChartPalette.success} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="active" fill={darjiChartPalette.sky} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="cancelled" fill={darjiChartPalette.rose} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="pending" fill={darjiChartPalette.orange} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer> : <CompactChartEmptyState message="No orders in this period." />}
              </ChartCard>

              <ChartCard title="Order Category" description="Service split across selected orders." className="xl:col-span-7 p-5" action={<SelectPill label={dateRangeLabel} />}>
                <div className="grid items-center gap-5 sm:grid-cols-[180px_1fr]">
                  <div className="relative mx-auto h-[160px] w-full max-w-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryChartData} dataKey="value" innerRadius={40} outerRadius={64} paddingAngle={3}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle()} formatter={(value) => `${Number(value ?? 0)} items`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold text-[var(--deep)]">{dashboardAnalytics.orders.total.toLocaleString("en-IN")}</span>
                      <span className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Total orders</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {categoryBreakdown.length ? categoryBreakdown.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 text-[var(--foreground)]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                          <span>{entry.name}</span>
                        </div>
                        <span className="font-medium text-[var(--muted)]">{entry.share}%</span>
                      </div>
                    )) : <EmptyState message="No category data yet." />}
                  </div>
                </div>
              </ChartCard>

              <LiveStatusPanel className="xl:col-span-5 p-5" items={statusBreakdown} />
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <RecentOrdersPanel className="xl:col-span-6" orders={recentOrders} onOpen={setOrderDetail} />
              <LeaderboardCard
                className="xl:col-span-3"
                title="Top Tailors"
                description="Highest earners this cycle."
                onViewAll={() => setActiveSection("tailors")}
                items={dashboardAnalytics.topTailors.map((row) => ({
                  id: row.profileId,
                  name: row.name,
                  avatarUrl: row.avatarUrl,
                  avatarSeed: row.avatarSeed,
                  subtitle: `${row.completedOrders} credited work orders`,
                  value: formatCurrency(row.amount),
                  rating: row.rating ? row.rating.toFixed(1) : undefined,
                  onClick: () => {
                    const tailor = tailors.find((item) => item.id === row.profileId);
                    if (tailor) setTailorDetail(tailor);
                  }
                }))}
              />
              <LeaderboardCard
                className="xl:col-span-3"
                title="Top Delivery Partners"
                description="Top performing delivery network."
                onViewAll={() => setActiveSection("partners")}
                items={dashboardAnalytics.topDeliveryPartners.map((row) => ({
                  id: row.profileId,
                  name: row.name,
                  avatarUrl: row.avatarUrl,
                  avatarGender: row.avatarGender,
                  subtitle: `${row.completedDeliveries} completed deliveries`,
                  value: formatCurrency(row.amount),
                  rating: row.rating ? row.rating.toFixed(1) : undefined,
                  onClick: () => {
                    const partner = partners.find((item) => item.id === row.profileId);
                    if (partner) setPartnerDetail(partner);
                  }
                }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {miniTrendCards.map((item) => (
                <MiniTrendCard key={item.label} data={item.data} formula={"formula" in item ? item.formula : undefined} icon={item.icon} label={item.label} note={item.note} tone={item.tone} value={item.value} onClick={() => openDashboardDrilldown({
                  key: item.drilldownKey,
                  label: item.label,
                  target: item.target,
                  periodScoped: item.periodScoped
                })} />
              ))}
            </div>
          </div>
        ) : null}

        {activeSection === "alerts" ? (
          <LiveAlertsPage
            alerts={liveAlerts}
            onBack={() => setActiveSection("dashboard")}
          />
        ) : null}

        {activeSection === "orders" ? (
          <OrdersManagementView
            allOrders={scopedOrderRecords}
            analyticsCounts={dashboardDrilldown?.target === "orders" ? undefined : dashboardAnalytics.orders}
            categories={[...new Set(allOrders.flatMap((order) => (order.items ?? []).map((item) => item.service?.category?.name ?? "General")))].sort()}
            columns={orderColumns}
            deliveryPartnerFilter={deliveryPartnerFilter}
            deliveryPartners={orderPartnerOptions}
            filteredOrders={filteredOrders}
            drilldownNotice={dashboardDrilldown?.target === "orders" ? <KpiDrilldownNotice count={filteredOrders.length} label={dashboardDrilldown.label} onClear={clearDashboardDrilldown} periodLabel={dashboardDrilldown.periodScoped ? dateRangeLabel : "Current records"} /> : null}
            orderCategoryFilter={orderCategoryFilter}
            orderDateFilter={orderDateFilter}
            orderFilter={orderFilter}
            orderPaymentStatusFilter={orderPaymentStatusFilter}
            orderSearch={orderSearch}
            orderTailorFilter={orderTailorFilter}
            paymentFilter={paymentFilter}
            tailors={tailors}
            onCategoryChange={setOrderCategoryFilter}
            onCreate={() => setCreateOrderOpen(true)}
            onDateChange={setOrderDateFilter}
            onDeliveryPartnerChange={setDeliveryPartnerFilter}
            onExport={() => void downloadExcel("darji-orders.xlsx", "Orders", filteredOrders.map(orderToCsv))}
            onBulkPriority={(orders, priority) => {
              void Promise.all(orders.map((order) => updateAdminOrderMetadata({ orderId: order.id, priority }))).then(async (records) => {
                setOrderPriorities((current) => ({ ...current, ...Object.fromEntries(records.map((record) => [record.entityId, record.priority])) }));
                toast.success(`${orders.length} orders marked ${priority.toLowerCase()}`);
                await queryClient.invalidateQueries({ queryKey: ["admin", "order-metadata"] });
              }).catch((error) => toast.error(extractError(error)));
            }}
            onPaymentMethodChange={setPaymentFilter}
            onPaymentStatusChange={setOrderPaymentStatusFilter}
            onOpen={openOrderDetail}
            onSearchChange={setOrderSearch}
            onStatusChange={changeOrderStatusFilter}
            onSummaryChange={openOrderSummaryFilter}
            onTailorChange={setOrderTailorFilter}
            onReset={() => {
              setDashboardDrilldown(null);
              setOrderSearch("");
              setOrderFilter("");
              setDeliveryPartnerFilter("");
              setPaymentFilter("");
              setOrderCategoryFilter("");
              setOrderTailorFilter("");
              setOrderPaymentStatusFilter("");
              setOrderDateFilter("");
            }}
          />
        ) : null}

        {activeSection === "tailoring" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Tailoring request marketplace"
              description="Operate the complete quote-to-stitching lifecycle and move directly into the connected customer, tailor, payment, measurement, and delivery records."
              action={<ActionButton variant="secondary" onClick={() => downloadCsv("darji-tailoring-requests.csv", filteredTailoring.map(tailoringToCsv))}>Export CSV</ActionButton>}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              <OperationsMetricButton label="All requests" value={tailoringSummary.total} active={!tailoringStatusFilter && !tailoringWorkFilter && !tailoringAttentionOnly} onClick={() => { setTailoringStatusFilter(""); setTailoringWorkFilter(""); setTailoringAttentionOnly(false); }} />
              <OperationsMetricButton label="Awaiting quotes" value={tailoringSummary.awaitingQuotes} active={tailoringStatusFilter === "QUOTE_REQUESTED" && !tailoringAttentionOnly} onClick={() => { setTailoringStatusFilter("QUOTE_REQUESTED"); setTailoringWorkFilter(""); setTailoringAttentionOnly(false); }} tone="amber" />
              <OperationsMetricButton label="No quotes" value={tailoringSummary.noQuotes} active={tailoringStatusFilter === "QUOTE_REQUESTED" && tailoringAttentionOnly} onClick={() => { setTailoringStatusFilter("QUOTE_REQUESTED"); setTailoringWorkFilter(""); setTailoringAttentionOnly(true); }} tone="rose" />
              <OperationsMetricButton label="Payment pending" value={tailoringSummary.paymentPending} active={tailoringStatusFilter === "PAYMENT_PENDING"} onClick={() => { setTailoringStatusFilter("PAYMENT_PENDING"); setTailoringWorkFilter(""); setTailoringAttentionOnly(false); }} tone="violet" />
              <OperationsMetricButton label="In stitching" value={tailoringSummary.working} active={tailoringWorkFilter === "WORKING"} onClick={() => { setTailoringStatusFilter(""); setTailoringWorkFilter("WORKING"); setTailoringAttentionOnly(false); }} tone="sky" />
              <OperationsMetricButton label="Ready" value={tailoringSummary.ready} active={tailoringWorkFilter === "READY"} onClick={() => { setTailoringStatusFilter(""); setTailoringWorkFilter("READY"); setTailoringAttentionOnly(false); }} tone="emerald" />
              <OperationsMetricButton label="Needs attention" value={tailoringSummary.attention} active={tailoringAttentionOnly} onClick={() => { setTailoringStatusFilter(""); setTailoringWorkFilter(""); setTailoringAttentionOnly(true); }} tone="rose" />
            </div>
            <Panel className="flex flex-wrap items-center gap-3 p-4">
              <FilterSelect value={tailoringStatusFilter} onChange={setTailoringStatusFilter} options={[{ label: "All request statuses", value: "" }, { label: "Quote requested", value: "QUOTE_REQUESTED" }, { label: "Payment pending", value: "PAYMENT_PENDING" }, { label: "Tailor selected", value: "TAILOR_SELECTED" }, { label: "Cancelled", value: "CANCELLED" }]} />
              <FilterSelect value={tailoringWorkFilter} onChange={setTailoringWorkFilter} options={[{ label: "All work statuses", value: "" }, { label: "Accepted", value: "ACCEPTED" }, { label: "Working", value: "WORKING" }, { label: "Ready", value: "READY" }]} />
              <FilterSelect value={tailoringUrgencyFilter} onChange={setTailoringUrgencyFilter} options={[{ label: "All urgency levels", value: "" }, { label: "Standard", value: "STANDARD" }, { label: "Express", value: "EXPRESS" }, { label: "Instant", value: "INSTANT" }]} />
              <button className={cn("rounded-xl border px-4 py-2 text-sm font-bold", tailoringAttentionOnly ? "border-rose-300 bg-rose-50 text-rose-700" : "border-[var(--panel-border)] bg-white text-[var(--muted)]")} onClick={() => setTailoringAttentionOnly((current) => !current)} type="button">Needs attention only</button>
              <button className="ml-auto rounded-xl px-4 py-2 text-sm font-bold text-[var(--muted)] hover:bg-slate-100" onClick={() => { setTailoringStatusFilter(""); setTailoringWorkFilter(""); setTailoringUrgencyFilter(""); setTailoringAttentionOnly(false); }} type="button"><RotateCcw className="mr-2 inline" size={14} />Reset</button>
            </Panel>
            {selectedTailoringIds.length ? <Panel className="flex flex-wrap items-center gap-3 border-orange-200 bg-orange-50/70 p-4"><p className="mr-auto text-sm font-black text-orange-900">{selectedTailoringIds.length} request(s) selected</p><button className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold" onClick={() => downloadCsv("darji-selected-tailoring-requests.csv", tailoringRequests.filter((request) => selectedTailoringIds.includes(request.id)).map(tailoringToCsv))} type="button"><Download className="mr-2 inline" size={14} />Export selected</button>{(["High", "Urgent", "Normal"] as AdminOrderPriority[]).map((priority) => <button className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold" key={priority} onClick={() => { void Promise.all(selectedTailoringIds.map((orderId) => updateAdminOrderMetadata({ orderId, priority }))).then((records) => { setOrderPriorities((current) => ({ ...current, ...Object.fromEntries(records.map((record) => [record.entityId, record.priority])) })); toast.success(`${records.length} requests marked ${priority.toLowerCase()}`); }).catch((error) => toast.error(extractError(error))); }} type="button">Mark {priority}</button>)}<button className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500" onClick={() => setSelectedTailoringIds([])} type="button">Clear</button></Panel> : null}
            <DataTable columns={tailoringColumns} data={filteredTailoring} emptyMessage="No tailoring requests available." />
          </div>
        ) : null}

        {activeSection === "delivery" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Delivery operations"
              description="Operate individual pickup and final-delivery tasks while preserving OTP, proof-photo, COD, batch, retry, and payout safeguards."
              action={<ActionButton variant="secondary" onClick={() => downloadCsv("darji-delivery-ops.csv", filteredDelivery.map(deliveryToCsv))}>Export CSV</ActionButton>}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              <OperationsMetricButton label="All tasks" value={deliverySummary.total} active={!deliveryStatusFilter && !deliveryExceptionOnly} onClick={() => { setDeliveryStatusFilter(""); setDeliveryExceptionOnly(false); }} />
              <OperationsMetricButton label="Unassigned" value={deliverySummary.unassigned} active={deliveryStatusFilter === "pending" && !deliveryExceptionOnly} onClick={() => { setDeliveryStatusFilter("pending"); setDeliveryExceptionOnly(false); }} tone="amber" />
              <OperationsMetricButton label="Accepted" value={deliverySummary.accepted} active={deliveryStatusFilter === "accepted"} onClick={() => { setDeliveryStatusFilter("accepted"); setDeliveryExceptionOnly(false); }} tone="sky" />
              <OperationsMetricButton label="In transit" value={deliverySummary.inTransit} active={deliveryStatusFilter === "picked_up"} onClick={() => { setDeliveryStatusFilter("picked_up"); setDeliveryExceptionOnly(false); }} tone="violet" />
              <OperationsMetricButton label="Delivered" value={deliverySummary.delivered} active={deliveryStatusFilter === "delivered"} onClick={() => { setDeliveryStatusFilter("delivered"); setDeliveryExceptionOnly(false); }} tone="emerald" />
              <OperationsMetricButton label="Retries" value={deliverySummary.retries} active={deliveryExceptionOnly && deliveryStatusFilter === "pending"} onClick={() => { setDeliveryStatusFilter("pending"); setDeliveryExceptionOnly(true); }} tone="rose" />
              <OperationsMetricButton label="Needs attention" value={deliverySummary.attention} active={deliveryExceptionOnly && !deliveryStatusFilter} onClick={() => { setDeliveryStatusFilter(""); setDeliveryExceptionOnly(true); }} tone="rose" />
            </div>
            <Panel className="flex flex-wrap items-center gap-3 p-4">
              <FilterSelect value={deliveryStatusFilter} onChange={setDeliveryStatusFilter} options={[{ label: "All task statuses", value: "" }, { label: "Pending", value: "pending" }, { label: "Accepted", value: "accepted" }, { label: "Picked up", value: "picked_up" }, { label: "Delivered", value: "delivered" }, { label: "Cancelled", value: "cancelled" }]} />
              <FilterSelect value={deliveryTypeFilter} onChange={setDeliveryTypeFilter} options={[{ label: "All task types", value: "" }, { label: "Customer to tailor", value: "customer_to_tailor" }, { label: "Tailor to customer", value: "tailor_to_customer" }, { label: "Darji to customer", value: "darji_to_customer" }]} />
              <FilterSelect value={deliveryServiceFilter} onChange={setDeliveryServiceFilter} options={[{ label: "All service levels", value: "" }, { label: "Standard", value: "STANDARD" }, { label: "Express", value: "EXPRESS" }, { label: "Instant", value: "INSTANT" }]} />
              <button className={cn("rounded-xl border px-4 py-2 text-sm font-bold", deliveryExceptionOnly ? "border-rose-300 bg-rose-50 text-rose-700" : "border-[var(--panel-border)] bg-white text-[var(--muted)]")} onClick={() => setDeliveryExceptionOnly((current) => !current)} type="button">Exceptions only</button>
              <button className="ml-auto rounded-xl px-4 py-2 text-sm font-bold text-[var(--muted)] hover:bg-slate-100" onClick={() => { setDeliveryStatusFilter(""); setDeliveryTypeFilter(""); setDeliveryServiceFilter(""); setDeliveryExceptionOnly(false); }} type="button"><RotateCcw className="mr-2 inline" size={14} />Reset</button>
            </Panel>
            {selectedDeliveryIds.length ? <Panel className="flex flex-wrap items-center gap-3 border-orange-200 bg-orange-50/70 p-4"><p className="mr-auto text-sm font-black text-orange-900">{selectedDeliveryIds.length} task(s) selected</p><button className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold" onClick={() => downloadCsv("darji-selected-delivery-tasks.csv", deliveryRequests.filter((request) => selectedDeliveryIds.includes(request.id)).map(deliveryToCsv))} type="button"><Download className="mr-2 inline" size={14} />Export selected</button>{(["High", "Urgent", "Normal"] as AdminOrderPriority[]).map((priority) => <button className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold" key={priority} onClick={() => { void Promise.all(selectedDeliveryIds.map((orderId) => updateAdminOrderMetadata({ orderId, priority }))).then((records) => { setOrderPriorities((current) => ({ ...current, ...Object.fromEntries(records.map((record) => [record.entityId, record.priority])) })); toast.success(`${records.length} tasks marked ${priority.toLowerCase()}`); }).catch((error) => toast.error(extractError(error))); }} type="button">Mark {priority}</button>)}<button className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500" onClick={() => setSelectedDeliveryIds([])} type="button">Clear</button></Panel> : null}
            <PendingRetryOrdersPanel
              rows={retryDeliveryRows}
              pending={deliveryRetryMutation.isPending}
              onOpen={setDeliveryDetail}
              onAction={(taskId, action) => deliveryRetryMutation.mutate({ taskId, action })}
            />
            <DataTable columns={deliveryColumns} data={filteredDelivery} emptyMessage="No delivery tasks available." />
          </div>
        ) : null}

        {activeSection === "batches" ? (
          <DeliveryBatchManagement
            batches={deliveryBatches}
            deliveryRequests={deliveryRequests}
            partners={partners}
            error={deliveryBatchesQuery.isError ? extractError(deliveryBatchesQuery.error) : undefined}
            focusBatch={batchFocus}
            batchCapacity={batchSettingsDraft.maxOrdersPerBatch}
            orders={allOrders}
            pendingTaskId={batchReassignMutation.isPending ? batchReassignMutation.variables?.taskId : undefined}
            onOpenOrder={(order) => setOrderDetail(order)}
            onOpenCustomer={(request) => setUserDetail(users.find((candidate) => candidate.id === request.customerId) ?? ({ id: request.customerId, name: request.customerName, phone: request.customerPhone } as AdminUser))}
            onReassign={(taskId, batchId) => batchReassignMutation.mutate({ taskId, batchId })}
            onNotifyBatch={(batchId) => notifyBatchMutation.mutate(batchId)}
          />
        ) : null}

        {activeSection === "measurements" ? (
          <MeasurementVisitsModule
            error={measurementVisitsQuery.isError ? extractError(measurementVisitsQuery.error) : undefined}
            focusVisitId={measurementVisitFocusId}
            onFocusVisitOpened={() => setMeasurementVisitFocusId(null)}
            onAssign={(visitId, tailorId) => measurementAssignMutation.mutate({ visitId, tailorId })}
            onOpenCustomer={(visit) => setUserDetail(users.find((candidate) => candidate.id === visit.customerId) ?? ({ id: visit.customerId, name: visit.customerName, phone: visit.customerPhone } as AdminUser))}
            pendingVisitId={measurementAssignMutation.isPending ? measurementAssignMutation.variables?.visitId : undefined}
            tailors={tailors}
            visits={measurementVisits}
          />
        ) : null}

        {activeSection === "tailors" ? (
          <div className="space-y-6">
            {dashboardDrilldown?.target === "tailors" ? <KpiDrilldownNotice count={filteredTailors.length} label={dashboardDrilldown.label} onClear={clearDashboardDrilldown} periodLabel={dashboardDrilldown.periodScoped ? dateRangeLabel : "Current records"} /> : null}
            <SectionIntro
              title="Tailor network"
              description="Only tailors who submitted verification are included. Pending, reviewed, and re-upload records remain visible."
              action={
                <div className="flex items-center justify-end gap-2">
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darji-tailors.csv", filteredTailors.map(tailorToCsv))}>Export CSV</ActionButton>
                </div>
              }
            />
            <Panel className="p-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
                <input
                  aria-label="Search tailor partners"
                  className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white pl-10 pr-10 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                  onChange={(event) => setTailorDirectorySearch(event.target.value)}
                  placeholder="Search by tailor name, tailor ID or phone number"
                  value={tailorDirectorySearch}
                />
                {tailorDirectorySearch ? <button aria-label="Clear tailor search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--muted)] hover:bg-slate-100" onClick={() => setTailorDirectorySearch("")} type="button"><X size={15} /></button> : null}
              </label>
              <p className="mt-2 text-xs text-[var(--muted)]">Showing {filteredTailors.length} of {tailors.length} submitted tailor records.</p>
            </Panel>
            <PartnerProximitySearch customers={users.filter((user) => String(user.role).toUpperCase() === "CUSTOMER")} role="TAILOR" onOpen={(profile) => setTailorDetail(profile as TailorProfile)} />
            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Rejected tailors</h3>
                <p className="text-sm text-[var(--muted)]">Approve from here to immediately bypass and clear the 15 day reapply limit.</p>
              </div>
              <DataTable columns={tailorColumns} data={rejectedTailors} emptyMessage="No rejected tailors match the current search." />
            </div>
            <DataTable
              columns={tailorColumns}
              data={filteredTailors.filter((tailor) => tailor.verificationStatus !== "REJECTED")}
              emptyMessage="No submitted tailor verifications match the current search."
            />
          </div>
        ) : null}

        {activeSection === "samples" ? (
          <SampleWorkModule
            tailors={tailors}
            pending={tailorSampleReviewMutation.isPending}
            onReview={(tailorId, sampleId, status) => tailorSampleReviewMutation.mutate({ tailorId, sampleId, status })}
          />
        ) : null}

        {activeSection === "partners" ? (
          <div className="space-y-6">
            {dashboardDrilldown?.target === "partners" ? <KpiDrilldownNotice count={filteredPartners.length} label={dashboardDrilldown.label} onClear={clearDashboardDrilldown} periodLabel={dashboardDrilldown.periodScoped ? dateRangeLabel : "Current records"} /> : null}
            <SectionIntro
              title="Delivery partner network"
              description="Only partners who submitted verification are included. The map and table use the same live five-second data refresh."
              action={
                <div className="flex items-center justify-end gap-2">
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darji-delivery-partners.csv", filteredPartners.map(partnerToCsv))}>Export CSV</ActionButton>
                </div>
              }
            />
            <Panel className="p-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
                <input
                  aria-label="Search delivery partners"
                  className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white pl-10 pr-10 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                  onChange={(event) => setPartnerDirectorySearch(event.target.value)}
                  placeholder="Search by delivery partner name, partner ID or phone number"
                  value={partnerDirectorySearch}
                />
                {partnerDirectorySearch ? <button aria-label="Clear delivery partner search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--muted)] hover:bg-slate-100" onClick={() => setPartnerDirectorySearch("")} type="button"><X size={15} /></button> : null}
              </label>
              <p className="mt-2 text-xs text-[var(--muted)]">Showing {filteredPartners.length} of {partners.length} submitted delivery partner records. Select a partner below to locate their latest phone GPS.</p>
            </Panel>
            <PartnerProximitySearch customers={users.filter((user) => String(user.role).toUpperCase() === "CUSTOMER")} role="DELIVERY_PARTNER" onOpen={(profile) => setPartnerDetail(profile as DeliveryPartnerProfile)} />
            <RiderLiveMap focusPartnerId={mapPartnerFocus?.partnerId ?? null} focusRequestId={mapPartnerFocus?.requestId ?? 0} partners={filteredPartners} token={token} />
            <DataTable
              columns={partnerColumns}
              data={filteredPartners}
              emptyMessage="No submitted delivery verifications match the current search."
            />
          </div>
        ) : null}

        {activeSection === "users" ? (
          <div className="space-y-6">
            {dashboardDrilldown?.target === "users" ? <KpiDrilldownNotice count={filteredUsers.length} label={dashboardDrilldown.label} onClear={clearDashboardDrilldown} periodLabel={dateRangeLabel} /> : null}
            <SectionIntro
              title="Customer directory"
              description="Every registered customer and every account with order activity appears here. Cross-role accounts remain managed in their dedicated section; deleted accounts are retained as archived order history."
              action={
                <div className="flex items-center gap-2">
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darji-customers.csv", filteredUsers.map(userToCsv))}>Export CSV</ActionButton>
                </div>
              }
            />
            <DataTable columns={userColumns} data={filteredUsers} emptyMessage="No customers match the current search." />
          </div>
        ) : null}

        {activeSection === "payments" ? (
          <div className="space-y-6">
            {dashboardDrilldown?.target === "payments" ? <KpiDrilldownNotice count={dashboardDrilldown.key === "payments_paid" ? filteredPayments.length : activePayoutRows.filter((row) => dashboardDrilldown.key === "partner_cost" ? row.currentWeekEarnings > 0 : row.pendingAmount > 0).length} label={dashboardDrilldown.label} onClear={clearDashboardDrilldown} periodLabel={dashboardDrilldown.periodScoped ? dateRangeLabel : "Current records"} /> : null}
            <SectionIntro
              title="Payments"
              description="A clean financial ledger and weekly, partner-level payouts with permanent task-to-payout history."
              action={
                <div className="flex items-center gap-2">
                  <FilterSelect
                    value={paymentFilter}
                    onChange={setPaymentFilter}
                    options={[
                      { label: "All payment states", value: "" },
                      { label: "Pending", value: "PENDING" },
                      { label: "Paid", value: "PAID" },
                      { label: "Failed", value: "FAILED" },
                      { label: "Refunded", value: "REFUNDED" },
                      { label: "Accrued", value: "ACCRUED" }
                    ]}
                  />
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darji-financial-ledger.csv", filteredFinancialLedger.map(financialLedgerToCsv))}>
                    Export CSV
                  </ActionButton>
                </div>
              }
            />
            <div className="flex flex-wrap gap-2">
              {[
                { id: "ledger", label: "Financial Ledger", description: "Every collection, refund, earning, and payout" },
                { id: "tailors", label: "Tailor Payouts", description: "Weekly stitching and measurement settlement" },
                { id: "delivery", label: "Delivery Payouts", description: "Weekly task and batch settlement" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "min-w-[220px] rounded-2xl border px-4 py-3 text-left transition",
                    paymentsSubTab === tab.id
                      ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                      : "border-[var(--panel-border)] bg-[var(--panel)] text-[var(--foreground)] hover:border-[var(--accent)]"
                  )}
                  onClick={() => setPaymentsSubTab(tab.id as typeof paymentsSubTab)}
                  type="button"
                >
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className={cn("mt-1 block text-xs", paymentsSubTab === tab.id ? "text-black/65" : "text-[var(--muted)]")}>{tab.description}</span>
                </button>
              ))}
            </div>
            {paymentsSubTab === "ledger" ? (
              <FinancialLedgerWorkspace
                entries={filteredFinancialLedger}
                loading={financialLedgerQuery.isLoading}
                tailorDue={totalPendingTailorPayments}
                deliveryDue={totalPendingDeliveryPayments}
                walletLiabilities={walletLiabilities}
                onOpenPartner={(entry) => {
                  if (entry.partyType === "TAILOR") {
                    const profile = tailors.find((tailor) => tailor.userId === entry.partyId);
                    if (profile) setTailorDetail(profile);
                  } else {
                    const profile = partners.find((partner) => partner.userId === entry.partyId);
                    if (profile) setPartnerDetail(profile);
                  }
                }}
                onOpenSource={(entry) => {
                  const order = allOrders.find((candidate) => [candidate.id, candidate.orderNumber, candidate.darjiId].filter(Boolean).includes(entry.sourceId ?? ""));
                  if (order) return openOrderDetail(order, "overview");
                  const request = tailoringRequests.find((candidate) => candidate.id === entry.sourceId || candidate.darjiId === entry.sourceId);
                  if (request) return setTailoringDetail(request);
                  const visit = measurementVisits.find((candidate) => candidate.id === entry.sourceId || candidate.darjiId === entry.sourceId);
                  if (visit) {
                    setMeasurementVisitFocusId(visit.id);
                    return setActiveSection("measurements");
                  }
                  const delivery = deliveryRequests.find((candidate) => candidate.id === entry.sourceId || candidate.taskId === entry.sourceId);
                  if (delivery) return setDeliveryDetail(delivery);
                  const batch = deliveryBatches.find((candidate) => candidate.batchId === entry.sourceId);
                  if (batch) {
                    setBatchFocus({ batchId: batch.batchId, roundAt: batch.roundAt });
                    return setActiveSection("batches");
                  }
                  toast.error("The linked operational record is not available");
                }}
              />
            ) : (
              <PayoutWorkspace
                kind={paymentsSubTab === "tailors" ? "TAILOR" : "DELIVERY_PARTNER"}
                rows={activePayoutRows}
                loading={tailorPayoutsQuery.isLoading || deliveryPayoutsQuery.isLoading}
                payingUserId={walletPayoutMutation.isPending ? payoutTarget?.userId : undefined}
                onDetails={setWalletDetailTarget}
                onPay={(row) => {
                  if (walletPayoutMutation.isPending) return;
                  setPayoutTarget(row);
                  setPayoutDraft({ amount: String(row.pendingAmount || ""), receiptUrl: "", notes: "", referenceNumber: "" });
                }}
              />
            )}
          </div>
        ) : null}

        {activeSection === "coupons" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Coupon management"
              description="Promotional codes backed by the existing coupon API."
              action={<CouponComposer customers={customerUsers} draft={couponDraft} onChange={setCouponDraft} onSubmit={() => couponMutation.mutate({
                code: couponDraft.code.trim().toUpperCase(),
                description: couponDraft.description.trim(),
                benefitType: couponDraft.benefitType,
                discountType: couponDiscountType(couponDraft.benefitType),
                discountValue: Number(couponDraft.discountValue),
                minOrderValue: Number(couponDraft.minOrderValue),
                maxDiscount: couponDraft.maxDiscount ? Number(couponDraft.maxDiscount) : null,
                usageLimit: couponDraft.usageLimit ? Number(couponDraft.usageLimit) : null,
                perCustomerLimit: couponDraft.perCustomerLimit ? Number(couponDraft.perCustomerLimit) : null,
                maxCampaignDiscount: couponDraft.maxCampaignDiscount ? Number(couponDraft.maxCampaignDiscount) : null,
                startsAt: couponDraft.startsAt ? new Date(couponDraft.startsAt).toISOString() : null,
                expiresAt: couponDraft.expiresAt ? new Date(couponDraft.expiresAt).toISOString() : null,
                orderEligibilityType: couponDraft.orderEligibilityType,
                orderNumber: couponDraft.orderNumber ? Number(couponDraft.orderNumber) : null,
                orderNumberFrom: couponDraft.orderNumberFrom ? Number(couponDraft.orderNumberFrom) : null,
                orderNumberTo: couponDraft.orderNumberTo ? Number(couponDraft.orderNumberTo) : null,
                audienceType: couponDraft.audienceType,
                selectedCustomerIds: couponDraft.selectedCustomerIds,
                inactiveDays: couponDraft.inactiveDays ? Number(couponDraft.inactiveDays) : null,
                registeredAfter: couponDraft.registeredAfter ? new Date(couponDraft.registeredAfter).toISOString() : null,
                registeredBefore: couponDraft.registeredBefore ? new Date(couponDraft.registeredBefore).toISOString() : null,
                orderScope: couponDraft.orderScope,
                allowedDeliveryModes: couponDraft.allowedDeliveryModes,
                allowedPaymentMethods: couponDraft.allowedPaymentMethods,
                isActive: couponDraft.isActive
              })} pending={couponMutation.isPending} />}
            />
            <DataTable columns={couponColumns} data={filteredCoupons} emptyMessage="No coupons match the current search." />
            <CouponEditDialog
              coupon={couponEditTarget}
              customers={customerUsers}
              onClose={() => setCouponEditTarget(null)}
              onSave={(payload) => couponEditTarget && couponUpdateMutation.mutate({ couponId: couponEditTarget.id, ...payload })}
              pending={couponUpdateMutation.isPending}
            />
            <CouponRedemptionDialog
              coupon={couponHistoryTarget}
              loading={couponHistoryQuery.isLoading}
              redemptions={couponHistoryQuery.data ?? []}
              onClose={() => setCouponHistoryTarget(null)}
              onOpenOrder={(redemption) => {
                const order = allOrders.find((candidate) => candidate.id === redemption.orderId || candidate.orderNumber === redemption.order?.reference || candidate.darjiId === redemption.order?.reference);
                if (order) openOrderDetail(order, "overview"); else toast.error("The linked order is not available in the current data set");
              }}
            />
          </div>
        ) : null}
        {activeSection === "support" ? (
          <SupportCommandCenter
            tickets={tickets}
            bugReports={bugReportsQuery.data ?? []}
            changeRequests={changeRequestsQuery.data ?? []}
            me={me}
            supportStats={supportStatsQuery.data}
            onExit={() => setActiveSection("dashboard")}
            onOpenPartnerProfile={(request) => {
              if (request.userRole === "TAILOR") {
                const tailor = tailors.find((candidate) => candidate.userId === request.userId);
                if (tailor) setTailorDetail(tailor); else toast.error("Tailor profile is not available in the current data set");
              } else if (request.userRole === "DELIVERY_PARTNER") {
                const partner = partners.find((candidate) => candidate.userId === request.userId);
                if (partner) setPartnerDetail(partner); else toast.error("Delivery partner profile is not available in the current data set");
              }
            }}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ["admin", "support"] });
              queryClient.invalidateQueries({ queryKey: ["admin", "support-stats"] });
              queryClient.invalidateQueries({ queryKey: ["admin", "bug-reports"] });
              queryClient.invalidateQueries({ queryKey: ["admin", "change-requests"] });
            }}
          />
        ) : null}

        {activeSection === "reviews" ? (
          <ReviewsManagementPanel
            loading={reviewsQuery.isLoading}
            onDelete={(reviewId) => {
              if (window.confirm("Permanently delete this review?")) reviewDeleteMutation.mutate(reviewId);
            }}
            onToggleHidden={(reviewId) => reviewHiddenMutation.mutate(reviewId)}
            onToggleFeatured={(reviewId) => reviewFeaturedMutation.mutate(reviewId)}
            pendingReviewId={reviewFeaturedMutation.isPending ? reviewFeaturedMutation.variables : reviewHiddenMutation.isPending ? reviewHiddenMutation.variables : reviewDeleteMutation.isPending ? reviewDeleteMutation.variables : undefined}
            reviews={reviewsQuery.data ?? []}
          />
        ) : null}

        {activeSection === "notifications" ? (
          <NotificationsModule
            campaigns={notificationCampaignsQuery.data ?? []}
            customers={filteredUsers}
            loading={notificationCampaignsQuery.isLoading}
            onRefresh={() => void queryClient.invalidateQueries({ queryKey: ["admin", "notification-campaigns"] })}
            partners={partners}
            tailors={tailors}
          />
        ) : null}

        {activeSection === "activity" ? (
          <ActivityLogsModule
            loading={activityLogsQuery.isLoading}
            logs={activityLogsQuery.data ?? []}
          />
        ) : null}

        {activeSection === "roles" ? (
          <RolesModule
            admins={adminUsers}
            pendingInvite={adminInviteMutation.isPending}
            pendingDelete={accountDeleteMutation.isPending}
            onInvite={(phone) => adminInviteMutation.mutate({ phone })}
            onDelete={(userId) => accountDeleteMutation.mutate(userId)}
          />
        ) : null}

        {activeSection === "health" ? (
          <SystemHealthModule
            error={systemHealthQuery.isError ? extractError(systemHealthQuery.error) : undefined}
            health={systemHealthQuery.data}
            loading={systemHealthQuery.isLoading}
            onRetry={() => void systemHealthQuery.refetch()}
          />
        ) : null}

        {activeSection === "exports" ? (
          <ExportCenterModule
            analyticsRows={revenueSeries.map((item) => ({ label: item.label, revenue: item.revenue }))}
            customers={filteredUsers}
            deliveryPartners={filteredPartners}
            orders={filteredOrders}
            payments={filteredPayments}
            supportTickets={filteredTickets}
            tailors={filteredTailors}
          />
        ) : null}

        {activeSection === "platform" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Platform Settings"
              description="Pause customer and partner workflows immediately without publishing a new app version. Admin access always remains available."
            />
            <PlatformStatusCard
              draft={platformStatusDraft}
              pending={platformStatusMutation.isPending || platformStatusQuery.isLoading}
              onChange={setPlatformStatusDraft}
              onSave={(status) => platformStatusMutation.mutate(status)}
            />
          </div>
        ) : null}

        {activeSection === "website" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Configure customer website"
              description="Manage the homepage slider and review interest collected from the launch popup and footer newsletter."
            />
            <CustomerWebsiteSliderCard
              draft={websiteSliderDraft}
              onChange={setWebsiteSliderDraft}
              onSave={() => settingMutation.mutate({ key: CUSTOMER_WEBSITE_SLIDER_SETTING_KEY, value: websiteSliderDraft })}
              onUpload={handleWebsiteSlideUpload}
              pending={settingMutation.isPending}
              uploadingSlideId={uploadingWebsiteSlideId}
            />
            <MarketingAudienceCard
              data={marketingSignupsQuery.data}
              error={marketingSignupsQuery.error ? extractError(marketingSignupsQuery.error) : undefined}
              loading={marketingSignupsQuery.isLoading}
              onRetry={() => marketingSignupsQuery.refetch()}
            />
          </div>
        ) : null}

        {activeSection === "settings" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Operational settings"
              description="Open one settings page at a time. Raw platform and delivery-round JSON are intentionally not exposed here."
            />
            <div className="grid gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-2 sm:grid-cols-2 xl:grid-cols-5">
              {([
                { id: "festival", label: "Festival Themes", description: "Seasonal customer app" },
                { id: "service-area", label: "Service Areas", description: "Coverage and requests" },
                { id: "tutorial", label: "Tailor Tutorial", description: "Training media" },
                { id: "delivery", label: "Delivery", description: "Pricing and batches" },
                { id: "development", label: "Development", description: "Reset tools" }
              ] as Array<{ id: SettingsPage; label: string; description: string }>).map((page) => (
                <button aria-current={settingsPage === page.id ? "page" : undefined} className={cn("rounded-xl border px-4 py-3 text-left transition", settingsPage === page.id ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)] shadow-sm" : "border-transparent text-[var(--muted)] hover:border-[var(--panel-border)] hover:bg-black/5")} key={page.id} onClick={() => setSettingsPage(page.id)} type="button">
                  <span className="block text-sm font-bold">{page.label}</span>
                  <span className="mt-0.5 block text-xs">{page.description}</span>
                </button>
              ))}
            </div>

            {settingsPage === "festival" ? (
              <FestivalThemeCard
                draft={festivalThemeDraft}
                serverState={festivalThemeQuery.data}
                pending={festivalThemeMutation.isPending || festivalThemeQuery.isLoading}
                onChange={setFestivalThemeDraft}
                onSave={(value) => festivalThemeMutation.mutate(value)}
              />
            ) : null}

            {settingsPage === "service-area" ? <ServiceAreaSettingsCard draft={serviceAreaDraft} interests={serviceAreaInterestsQuery.data} pending={serviceAreaMutation.isPending} onChange={setServiceAreaDraft} onSave={(value) => serviceAreaMutation.mutate(value)} /> : null}

            {settingsPage === "tutorial" ? <TailorTutorialMediaCard draft={tailorTutorialDraft} onChange={setTailorTutorialDraft} onSave={() => settingMutation.mutate({ key: "tailor_tutorial_media", value: tailorTutorialDraft })} onUpload={handleTutorialMediaUpload} pending={settingMutation.isPending} uploading={uploadingTutorialMedia} /> : null}

            {settingsPage === "delivery" ? (
              <div className="space-y-6">
                <Panel>
                  <h3 className="text-lg font-semibold">Delivery pricing policy</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Delivery prices and partner payouts are enforced by the backend distance-pricing engine. They remain read-only here so the admin cannot save values the live workflow would ignore.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <DetailBox label="Standard" value="₹49 base" note="₹0.50 per 100 m round-trip" />
                    <DetailBox label="Express" value="₹59 base" note="₹0.50 per 100 m round-trip" />
                    <DetailBox label="Instant" value="₹69 base" note="₹1.00 per 100 m round-trip" />
                  </div>
                </Panel>
                <BatchSettingsCard
                  draft={batchSettingsDraft}
                  pending={settingMutation.isPending}
                  onChange={setBatchSettingsDraft}
                  onSave={(value) => {
                    const batchSettingsRecord = settingsQuery.data?.find((item) => item.key === "delivery_batch_settings");
                    const existingValue = batchSettingsRecord?.value && typeof batchSettingsRecord.value === "object" ? (batchSettingsRecord.value as Record<string, unknown>) : {};
                    settingMutation.mutate({ key: "delivery_batch_settings", value: { ...existingValue, lockMinutes: value.lockMinutes, maxOrdersPerBatch: value.maxOrdersPerBatch } });
                  }}
                />
              </div>
            ) : null}

            {settingsPage === "development" ? <DevelopmentResetCard ordersPending={resetOrdersMutation.isPending} everythingPending={resetEverythingMutation.isPending} onResetOrders={() => resetOrdersMutation.mutate()} onResetEverything={() => resetEverythingMutation.mutate()} /> : null}
          </div>
        ) : null}
      </PortalFrame>

      <FinancialDetailDialog
        analytics={dashboardAnalytics}
        kind={financeDetailKind}
        periodLabel={dateRangeLabel}
        onClose={() => setFinanceDetailKind(null)}
        onOpenPartnerManagement={() => {
          setFinanceDetailKind(null);
          setActiveSection("partners");
        }}
        onOpenPayouts={() => {
          setFinanceDetailKind(null);
          setPaymentsSubTab("tailors");
          setActiveSection("payments");
        }}
        onOpenOrder={(orderId) => {
          const order = allOrders.find((candidate) => candidate.id === orderId || candidate.orderNumber === orderId || candidate.darjiId === orderId);
          if (!order) {
            toast.error("The linked order is not available in the current data set");
            return;
          }
          setFinanceDetailKind(null);
          openOrderDetail(order, "overview");
        }}
        onOpenPartner={(partnerId, partnerType) => {
          if (partnerType === "TAILOR") {
            const tailor = tailors.find((candidate) => candidate.id === partnerId || candidate.userId === partnerId);
            if (tailor) {
              setFinanceDetailKind(null);
              setTailorDetail(tailor);
              return;
            }
          }
          const partner = partners.find((candidate) => candidate.id === partnerId || candidate.userId === partnerId);
          if (partner) {
            setFinanceDetailKind(null);
            setPartnerDetail(partner);
            return;
          }
          toast.error("The linked partner is not available in the current data set");
        }}
      />

      <AssistedCreateOrderDialog
        coupons={couponsQuery.data ?? []}
        customers={customerUsers}
        onComplete={async (request) => {
          setCreateOrderOpen(false);
          setActiveSection("tailoring");
          toast.success(`${request.darjiId ?? `REQ-${request.id.slice(0, 8).toUpperCase()}`} created`);
          await refreshData();
        }}
        open={createOrderOpen}
        setOpen={setCreateOrderOpen}
      />
      <OrderDetailDialog
        me={me}
        notes={orderDetail ? orderNotes[orderDetail.id] ?? [] : []}
        onAssign={() => orderDetail && openOrderAssignment(orderDetail)}
        onAddNote={(note) => {
          if (!orderDetail) return;
          orderMetadataMutation.mutate({ orderId: orderDetail.id, note });
        }}
        onPriorityChange={(priority) => {
          if (!orderDetail) return;
          orderMetadataMutation.mutate({ orderId: orderDetail.id, priority });
        }}
        onStatusChange={(status) => orderDetail && statusMutation.mutate({ order: orderDetail, status })}
        open={Boolean(orderDetail)}
        order={orderDetail}
        deliveryRequests={deliveryRequests}
        priority={orderDetail ? orderPriorities[orderDetail.id] ?? "Normal" : "Normal"}
        focusSection={orderDetailFocus}
        onPrintInvoice={() => orderDetail && void downloadOrderInvoice(orderDetail)}
        onDownloadImages={() => orderDetail && void downloadOrderImages(orderDetail)}
        onDeleteOrder={() => orderDetail && setDeleteOrderTarget(orderDetail)}
        onOpenCustomer={() => {
          if (!orderDetail) return;
          const customer = users.find((candidate) => candidate.id === orderDetail.customerId) ?? ({ ...orderDetail.customer, id: orderDetail.customerId } as AdminUser);
          setOrderDetail(null);
          setUserDetail(customer);
        }}
        onOpenTailor={() => {
          if (!orderDetail?.tailor) return;
          setOrderDetail(null);
          setTailorDetail(tailors.find((candidate) => candidate.id === orderDetail.tailorId) ?? orderDetail.tailor);
        }}
        onOpenQuoteTailor={(tailor) => {
          setOrderDetail(null);
          setTailorDetail(tailors.find((candidate) => candidate.id === tailor.id) ?? tailor);
        }}
        onOpenPartner={(partner) => {
          setOrderDetail(null);
          setPartnerDetail(partners.find((candidate) => candidate.id === partner.id) ?? partner);
        }}
        onOpenDeliveryTask={(request) => {
          setOrderDetail(null);
          setDeliveryDetail(request);
        }}
        onOpenBatch={(batch) => {
          setOrderDetail(null);
          setBatchFocus(batch);
          setActiveSection("batches");
        }}
        onOpenPayment={(payment) => {
          setOrderDetail(null);
          setPaymentDetail(payment);
        }}
        setOpen={(next) => {
          if (!next) setOrderDetail(null);
        }}
      />
      <PermanentDeleteOrderDialog
        open={Boolean(deleteOrderTarget)}
        order={deleteOrderTarget}
        pending={orderDeleteMutation.isPending}
        onClose={() => setDeleteOrderTarget(null)}
        onConfirm={(confirmation) => deleteOrderTarget && orderDeleteMutation.mutate({ orderId: deleteOrderTarget.id, confirmation })}
      />
      <PaymentDetailDialog
        open={Boolean(paymentDetail)}
        payment={paymentDetail}
        onOpenOrder={() => {
          if (!paymentDetail) return;
          const order = allOrders.find((candidate) => candidate.id === paymentDetail.orderId);
          if (!order) {
            toast.error("The linked order is not available in the current data set");
            return;
          }
          setPaymentDetail(null);
          openOrderDetail(order, "overview");
        }}
        onOpenCustomer={() => {
          const customerId = paymentDetail?.order?.customerId;
          if (!customerId) return;
          setPaymentDetail(null);
          setUserDetail(users.find((candidate) => candidate.id === customerId) ?? ({ id: customerId, name: paymentDetail?.order?.customerName, phone: paymentDetail?.order?.customerPhone } as AdminUser));
        }}
        setOpen={(next) => {
          if (!next) setPaymentDetail(null);
        }}
      />
      <TailoringRequestDialog
        deliveryRequests={deliveryRequests}
        measurementVisits={measurementVisitsQuery.data ?? []}
        notes={tailoringDetail ? orderNotes[tailoringDetail.id] ?? [] : []}
        priority={tailoringDetail ? orderPriorities[tailoringDetail.id] ?? "Normal" : "Normal"}
        open={Boolean(tailoringDetail)}
        request={tailoringDetail}
        onMetadata={(payload) => tailoringDetail && orderMetadataMutation.mutate({ orderId: tailoringDetail.id, ...payload })}
        onOpenCustomer={(request) => {
          setTailoringDetail(null);
          setUserDetail(users.find((candidate) => candidate.id === request.customerId) ?? ({ ...request.customer, id: request.customerId } as AdminUser));
        }}
        onOpenDelivery={(request) => { setTailoringDetail(null); setDeliveryDetail(request); }}
        onOpenTailor={(tailor) => { setTailoringDetail(null); setTailorDetail(tailor); }}
        onUpdated={(updated) => setTailoringDetail(updated)}
        setOpen={(next) => {
          if (!next) setTailoringDetail(null);
        }}
      />
      <DeliveryRequestDialog
        batches={deliveryBatches}
        notes={deliveryDetail ? orderNotes[deliveryDetail.id] ?? [] : []}
        priority={deliveryDetail ? orderPriorities[deliveryDetail.id] ?? "Normal" : "Normal"}
        open={Boolean(deliveryDetail)}
        partners={partners}
        request={deliveryDetail}
        onMetadata={(payload) => deliveryDetail && orderMetadataMutation.mutate({ orderId: deliveryDetail.id, ...payload })}
        onOpenBatch={(batch) => { setDeliveryDetail(null); setBatchFocus({ batchId: batch.batchId, roundAt: batch.roundAt }); setActiveSection("batches"); }}
        onOpenCustomer={(request) => { setDeliveryDetail(null); setUserDetail(users.find((candidate) => candidate.id === request.customerId) ?? ({ id: request.customerId, name: request.customerName, phone: request.customerPhone } as AdminUser)); }}
        onOpenOrder={(request) => {
          const order = allOrders.find((candidate) => candidate.id === request.orderId || candidate.request?.id === request.orderId);
          if (!order) return toast.error("The linked order is not available in the current data set");
          setDeliveryDetail(null);
          openOrderDetail(order, "overview");
        }}
        onOpenPartner={(partner) => { setDeliveryDetail(null); setPartnerDetail(partner); }}
        onOpenTailor={(request) => {
          const tailor = tailors.find((candidate) => candidate.id === request.tailorId);
          if (!tailor) return toast.error("The linked tailor profile is not available in the current data set");
          setDeliveryDetail(null);
          setTailorDetail(tailor);
        }}
        onRetryAction={(taskId, action) => deliveryRetryMutation.mutate({ taskId, action })}
        onUpdated={(updated) => setDeliveryDetail(updated)}
        setOpen={(next) => {
          if (!next) setDeliveryDetail(null);
        }}
      />
      <ProfileDialog
        deliveryRequests={deliveryRequests}
        orders={allOrders}
        onOpenBatch={(batch) => {
          setTailorDetail(null);
          setBatchFocus(batch);
          setActiveSection("batches");
        }}
        onOpenDeliveryTask={(request) => {
          setTailorDetail(null);
          setDeliveryDetail(request);
        }}
        onOpenOrder={(order) => {
          setTailorDetail(null);
          openOrderDetail(order, "overview");
        }}
        onOpenWallet={() => {
          const row = activePayoutRows.find((candidate) => candidate.userId === tailorDetail?.userId);
          if (!row) return toast.info("No wallet record is available for this tailor yet");
          setTailorDetail(null);
          setWalletDetailTarget(row);
        }}
        open={Boolean(tailorDetail)}
        profile={tailorDetail}
        pending={tailorReviewMutation.isPending || tailorSampleReviewMutation.isPending || tailorProfileUpdateMutation.isPending}
        onSave={(updates) => tailorDetail && tailorProfileUpdateMutation.mutate({ tailorId: tailorDetail.id, updates })}
        onReview={(review) => tailorDetail && tailorReviewMutation.mutate({ tailorId: tailorDetail.id, status: review.status, reason: review.reason, reuploadFields: review.reuploadFields })}
        onSampleReview={(sampleId, status) => tailorDetail && tailorSampleReviewMutation.mutate({ tailorId: tailorDetail.id, sampleId, status })}
        subtitle="Tailor profile"
        setOpen={(next) => {
          if (!next) setTailorDetail(null);
        }}
      />
      <ProfileDialog
        deliveryRequests={deliveryRequests}
        orders={allOrders}
        onOpenBatch={(batch) => {
          setPartnerDetail(null);
          setBatchFocus(batch);
          setActiveSection("batches");
        }}
        onOpenDeliveryTask={(request) => {
          setPartnerDetail(null);
          setDeliveryDetail(request);
        }}
        onOpenOrder={(order) => {
          setPartnerDetail(null);
          openOrderDetail(order, "overview");
        }}
        onOpenWallet={() => {
          const row = activePayoutRows.find((candidate) => candidate.userId === partnerDetail?.userId);
          if (!row) return toast.info("No wallet record is available for this delivery partner yet");
          setPartnerDetail(null);
          setWalletDetailTarget(row);
        }}
        open={Boolean(partnerDetail)}
        profile={partnerDetail}
        pending={partnerReviewMutation.isPending || deliveryProfileUpdateMutation.isPending}
        onSave={(updates) => partnerDetail && deliveryProfileUpdateMutation.mutate({ partnerId: partnerDetail.id, updates })}
        onReview={(review) => partnerDetail && partnerReviewMutation.mutate({ partnerId: partnerDetail.id, status: review.status, reason: review.reason, deliveryType: review.deliveryType, assignedArea: review.assignedArea })}
        subtitle="Delivery partner profile"
        setOpen={(next) => {
          if (!next) setPartnerDetail(null);
        }}
      />
      <UserDialog
        onActivate={() => userDetail && userModerationMutation.mutate({ userId: userDetail.id, action: "ACTIVE" })}
        onBan={() => userDetail && userModerationMutation.mutate({ userId: userDetail.id, action: "BANNED", reason: "Banned by admin" })}
        onOpenOrder={async (profileOrder) => {
          try {
            const detail = profileOrder.source === "ORDER"
              ? await getOrderById(profileOrder.id)
              : normalizeTailoringRequestForAdmin(await getTailoringRequestById(profileOrder.id), partners);
            setUserDetail(null);
            setOrderDetailFocus("overview");
            setOrderDetail(detail);
          } catch (error) {
            toast.error(extractError(error));
          }
        }}
        onSuspend={() =>
          userDetail &&
          userModerationMutation.mutate({
            userId: userDetail.id,
            action: "SUSPENDED",
            reason: "Temporarily suspended by admin",
            suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
        }
        open={Boolean(userDetail)}
        pending={userModerationMutation.isPending}
        setOpen={(next) => {
          if (!next) setUserDetail(null);
        }}
        user={userDetail}
      />
      <WalletDetailDialog
        detail={walletDetailQuery.data}
        loading={walletDetailQuery.isLoading}
        open={Boolean(walletDetailTarget)}
        row={walletDetailTarget}
        onOpenAllocation={(allocation) => {
          const sourceId = allocation.sourceId;
          if (!sourceId) return toast.info("This wallet adjustment is not linked to an operational record");
          setWalletDetailTarget(null);
          if (allocation.sourceType === "MEASUREMENT") {
            const visit = measurementVisits.find((candidate) => candidate.id === sourceId || candidate.darjiId === sourceId);
            if (!visit) return toast.error("The linked measurement visit is not available");
            setMeasurementVisitFocusId(visit.id);
            setActiveSection("measurements");
            return;
          }
          if (allocation.sourceType === "DELIVERY_TASK") {
            const request = deliveryRequests.find((candidate) => candidate.id === sourceId || candidate.taskId === sourceId || candidate.orderId === sourceId);
            if (!request) return toast.error("The linked delivery task is not available");
            setDeliveryDetail(request);
            return;
          }
          if (allocation.sourceType === "DELIVERY_BATCH") {
            const batch = deliveryBatches.find((candidate) => candidate.batchId === sourceId);
            if (!batch) return toast.error("The linked delivery batch is not available");
            setBatchFocus({ batchId: batch.batchId, roundAt: batch.roundAt });
            setActiveSection("batches");
            return;
          }
          const order = allOrders.find((candidate) => candidate.id === sourceId || candidate.request?.id === sourceId || candidate.orderNumber === sourceId || candidate.darjiId === sourceId);
          if (!order) return toast.error("The linked order is not available");
          openOrderDetail(order, "overview");
        }}
        setOpen={(next) => {
          if (!next) setWalletDetailTarget(null);
        }}
      />
      <PayoutDialog
        draft={payoutDraft}
        onChange={setPayoutDraft}
        onSubmit={() => {
          if (!payoutTarget) return;
          walletPayoutMutation.mutate({
            userId: payoutTarget.userId,
            userType: payoutTarget.userType,
            amount: Number(payoutDraft.amount),
            receiptUrl: payoutDraft.receiptUrl.trim(),
            notes: payoutDraft.notes.trim() || undefined,
            referenceNumber: payoutDraft.referenceNumber.trim() || undefined
          });
        }}
        open={Boolean(payoutTarget)}
        pending={walletPayoutMutation.isPending}
        row={payoutTarget}
        setOpen={(next) => {
          if (!next) setPayoutTarget(null);
        }}
      />
      <InspectTicketDialog
        open={Boolean(ticketDetail)}
        ticket={ticketDetail}
        setOpen={(next: boolean) => {
          if (!next) setTicketDetail(null);
        }}
        users={users}
        orders={orders}
        onOpenOrder={(order) => openOrderDetail(order, "overview")}
        onOpenCustomer={(customer) => {
          setTicketDetail(null);
          setUserDetail(customer);
        }}
      />
      <InspectBugReportDialog
        open={Boolean(activeBugReport)}
        bug={activeBugReport}
        setOpen={(next: boolean) => {
          if (!next) setActiveBugReport(null);
        }}
        users={users}
        onUpdate={(params) => bugReportUpdateMutation.mutate(params)}
      />
      <InspectChangeRequestDialog
        open={Boolean(activeChangeRequest)}
        request={activeChangeRequest}
        setOpen={(next: boolean) => {
          if (!next) setActiveChangeRequest(null);
        }}
        onApprove={(id) => changeRequestApproveMutation.mutate({ requestId: id })}
        onReject={(id, notes) => changeRequestRejectMutation.mutate({ requestId: id, adminNotes: notes })}
        pending={changeRequestApproveMutation.isPending || changeRequestRejectMutation.isPending}
      />
      <AssignOrderDialog
        open={Boolean(assignOrderTarget)}
        order={assignOrderTarget}
        partners={partners}
        setAssignDeliveryPartnerId={setAssignDeliveryPartnerId}
        setAssignPickupPartnerId={setAssignPickupPartnerId}
        setAssignTailorId={setAssignTailorId}
        tailors={tailors}
        onOpenTailor={(tailor) => {
          setAssignOrderTarget(null);
          setTailorDetail(tailor);
        }}
        onOpenPartner={(partner) => {
          setAssignOrderTarget(null);
          setPartnerDetail(partner);
        }}
        values={{
          deliveryPartnerId: assignDeliveryPartnerId,
          pickupPartnerId: assignPickupPartnerId,
          tailorId: assignTailorId
        }}
        setOpen={(next) => {
          if (!next) setAssignOrderTarget(null);
        }}
        onSubmit={() => {
          if (!assignOrderTarget) return;
          const assignments: Parameters<typeof assignOrder>[0][] = [];
          if (assignTailorId && assignTailorId !== assignOrderTarget.tailorId) {
            assignments.push({ orderId: assignOrderTarget.id, tailorId: assignTailorId });
          }
          if (assignPickupPartnerId && assignPickupPartnerId !== assignOrderTarget.pickupPartnerId) {
            assignments.push({ orderId: assignOrderTarget.id, deliveryPartnerId: assignPickupPartnerId, mode: "pickup" });
          }
          if (assignDeliveryPartnerId && assignDeliveryPartnerId !== assignOrderTarget.deliveryPartnerId) {
            assignments.push({ orderId: assignOrderTarget.id, deliveryPartnerId: assignDeliveryPartnerId, mode: "delivery" });
          }
          if (!assignments.length) {
            toast.info("No assignment changes to save");
            return;
          }
          assignMutation.mutate(assignments);
        }}
        pending={assignMutation.isPending}
      />
    </>
  );
}

function LoginPanel({
  isRequesting,
  isVerifying,
  onRequestOtp,
  onVerifyOtp,
  returnedOtp
}: {
  isRequesting: boolean;
  isVerifying: boolean;
  onRequestOtp: (phone: string) => Promise<{ success: boolean; otp?: string }>;
  onVerifyOtp: (phone: string, otp: string) => void;
  returnedOtp?: string;
}) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [requested, setRequested] = useState(false);
  const cleanPhoneInput = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(246,163,19,0.18),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(246,163,19,0.12),transparent_24%),linear-gradient(180deg,#fffdf8_0%,#fff6e8_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-10 top-0 h-60 w-60 rounded-full border border-dashed border-[#f0cf88]" />
        <div className="absolute left-[28%] top-10 text-[#efdeb7]"><GhostSewIcon type="button" /></div>
        <div className="absolute left-[37%] top-36 text-[#efdeb7]"><GhostSewIcon type="spool" /></div>
        <div className="absolute left-[38%] bottom-52 text-[#efdeb7]"><GhostSewIcon type="scissors" /></div>
        <div className="absolute left-[46%] top-1/2 text-[#efdeb7]"><GhostSewIcon type="button" /></div>
      </div>

      <section className="mx-auto grid min-h-[100dvh] max-w-[1540px] items-center gap-4 px-3 py-3 sm:gap-6 sm:px-5 sm:py-6 xl:grid-cols-[1fr_0.92fr] xl:gap-8 xl:px-10 xl:py-8">
        <div className="relative order-2 flex min-h-0 flex-col justify-between overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(255,213,94,0.16),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,248,231,0.72))] p-5 sm:rounded-[36px] sm:p-8 xl:order-1 xl:min-h-[760px] xl:rounded-[42px] xl:p-12">
          <div>
            <img alt="Darji" className="h-auto w-[170px] sm:w-[210px] xl:w-[240px]" fetchPriority="high" src="/darji-logo.png" />
            <p className="mt-3 pl-2 text-[15px] font-medium text-[#59483a]">Stitching Made Simple</p>

            <div className="mt-7 max-w-[520px] sm:mt-10 xl:mt-12">
              <h1 className="text-[clamp(2.15rem,7vw,3.35rem)] font-semibold leading-[1.08] tracking-[-0.05em] text-[#4f3115]">
                Welcome to <span className="text-[#f2a600]">Darji</span>
                <br />
                Admin Portal
              </h1>
              <p className="mt-5 max-w-[470px] text-[1.04rem] leading-8 text-[#6f645a]">
                Manage your business, track performance, and grow Darji with data-driven insights while keeping every operation under one roof.
              </p>
              <div className="mt-7 h-[3px] w-[72px] rounded-full bg-[#f2a600]" />
            </div>

            <div className="mt-10 hidden max-w-[520px] gap-6 md:grid">
              <LoginFeature
                icon={BarChart3}
                title="Real-time Analytics"
                description="Track orders, revenue, partner activity, and admin performance in real time."
              />
              <LoginFeature
                icon={ShieldCheck}
                title="Secure & Reliable"
                description="Phone-number OTP access with secure role-based entry into the Darji dashboard."
              />
              <LoginFeature
                icon={Users}
                title="Complete Control"
                description="Manage customers, tailors, delivery partners, payouts, and support from one place."
              />
            </div>
          </div>

          <div className="mt-10 hidden lg:block">
            <SewingMachineIllustration />
          </div>
        </div>

        <div className="relative order-1 min-w-0 xl:order-2">
          <div className="absolute inset-x-10 top-10 h-36 rounded-full bg-[rgba(246,163,19,0.12)] blur-3xl" />
          <div className="relative overflow-hidden rounded-[26px] border border-[#ead6ad] bg-[linear-gradient(180deg,#ffffff_0%,#fffdf8_100%)] p-5 shadow-[0_28px_80px_rgba(181,135,37,0.14)] sm:rounded-[34px] sm:p-8 lg:p-10 xl:rounded-[38px]">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(246,163,19,0.12),transparent_65%)]" />
            <div className="relative z-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fff7de,#ffe9a4)] text-[#8f5d12] shadow-[0_16px_32px_rgba(246,163,19,0.16)] sm:h-24 sm:w-24 xl:h-28 xl:w-28">
                <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 xl:h-11 xl:w-11" strokeWidth={1.8} />
              </div>

              <div className="mt-5 text-center sm:mt-7 xl:mt-8">
                <h2 className="text-[clamp(2rem,8vw,3rem)] font-semibold tracking-[-0.04em] text-[#1f1f1f]">Welcome Back!</h2>
                <p className="mt-2 text-[0.98rem] text-[#6f6f79] sm:mt-3 sm:text-[1.12rem]">Login to access your Darji Admin Dashboard</p>
              </div>

              <div className="mt-7 space-y-5 sm:mt-9 sm:space-y-6 xl:mt-10">
                <Field label="Phone Number">
                  <div className="flex h-[58px] items-center gap-4 rounded-[18px] border border-[#e7e3d8] bg-white px-5 shadow-[inset_0_0_0_1px_rgba(255,248,232,0.5)]">
                    <Users size={20} className="text-[#8f8f95]" />
                    <input
                      className="w-full bg-transparent outline-none placeholder:text-[#9a9aa3]"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]*"
                      value={phone}
                      onChange={(event) => setPhone(cleanPhoneInput(event.target.value))}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </Field>

                {requested ? (
                  <Field label="OTP">
                    <div className="flex h-[58px] items-center gap-4 rounded-[18px] border border-[#e7e3d8] bg-white px-5 shadow-[inset_0_0_0_1px_rgba(255,248,232,0.5)]">
                      <ShieldCheck size={20} className="text-[#8f8f95]" />
                      <input
                        className="w-full bg-transparent text-[1.05rem] font-medium tracking-[0.28em] outline-none placeholder:text-[#9a9aa3]"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter OTP"
                      />
                    </div>
                  </Field>
                ) : null}

                <div className="flex flex-col items-start gap-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="text-[#6a6460]">Secure admin access</span>
                  <a className="font-medium text-[#d88500] underline-offset-4 hover:underline" href="mailto:support@darji.app?subject=Admin%20portal%20login%20help">
                    Need help?
                  </a>
                </div>

                  {returnedOtp ? (
                    <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Current test OTP: <span className="font-semibold">{returnedOtp}</span>
                    </div>
                  ) : null}

                <ActionButton
                  className="h-[58px] w-full justify-center rounded-[18px] text-[1.05rem] font-semibold shadow-[0_18px_32px_rgba(246,163,19,0.22)]"
                  disabled={isRequesting || isVerifying}
                  onClick={async () => {
                    if (!requested) {
                      if (!/^[6-9]\d{9}$/.test(phone.trim())) {
                        toast.error("Enter a valid 10 digit mobile number");
                        return;
                      }
                      const result = await onRequestOtp(phone.trim());
                      if (result.success) {
                        if (result.otp) setOtp(result.otp.replace(/\D/g, "").slice(0, 6));
                        setRequested(true);
                      }
                      return;
                    }
                    if (!/^\d{6}$/.test(otp.trim())) {
                      toast.error("Enter the 6 digit OTP");
                      return;
                    }
                    onVerifyOtp(phone.trim(), otp.trim());
                  }}
                >
                  {isRequesting || isVerifying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {requested ? "Verify and Open Dashboard" : "Login to Dashboard"}
                </ActionButton>
              </div>

              <div className="mt-7 flex items-center gap-4 text-[#8c8781] sm:mt-10">
                <div className="h-px flex-1 bg-[#ece5d7]" />
                <span className="text-sm">Need help?</span>
                <div className="h-px flex-1 bg-[#ece5d7]" />
              </div>

              <div className="mt-6 text-center text-[1rem] text-[#6f6b66]">
                Contact Darji support for admin access assistance.
              </div>

              <div className="mt-7 text-center text-sm text-[#8c8781] sm:mt-10">© {new Date().getFullYear()} Darji. All rights reserved.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginFeature({
  description,
  icon: Icon,
  title
}: {
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-start gap-5">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,#fff6de,#ffe19a)] text-[#8f5d12] shadow-[0_16px_30px_rgba(246,163,19,0.14)]">
        <Icon size={28} />
      </div>
      <div>
        <p className="text-[1.28rem] font-semibold text-[#4f3115]">{title}</p>
        <p className="mt-1.5 max-w-[360px] text-[1rem] leading-7 text-[#72665c]">{description}</p>
      </div>
    </div>
  );
}

function GhostSewIcon({ type }: { type: "button" | "spool" | "scissors" }) {
  if (type === "button") {
    return (
      <svg fill="none" height="42" viewBox="0 0 42 42" width="42">
        <circle cx="21" cy="21" r="16" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="16.5" cy="16.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="25.5" cy="16.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="16.5" cy="25.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="25.5" cy="25.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }

  if (type === "spool") {
    return (
      <svg fill="none" height="46" viewBox="0 0 46 46" width="46">
        <path d="M18 10H28" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
        <path d="M16 14H30L27 32H19L16 14Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
        <path d="M18 18H28" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
        <path d="M18 22H28" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
        <path d="M18 26H28" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
        <path d="M18 30H28" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
        <path d="M17 36H29" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </svg>
    );
  }

  return (
    <svg fill="none" height="58" viewBox="0 0 58 58" width="58">
      <circle cx="19" cy="19" r="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="39" cy="39" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M24 24L34 34" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M15 43L43 15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M23 14L44 35" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function SewingMachineIllustration() {
  return (
    <div className="relative mx-auto max-w-[620px]">
      <div className="absolute inset-x-0 bottom-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(246,163,19,0.18),transparent_68%)] blur-2xl" />
      <svg className="relative h-auto w-full" fill="none" viewBox="0 0 700 250">
        <path d="M0 210C80 150 165 154 245 206C330 258 408 245 494 202C570 164 629 164 700 197V250H0V210Z" fill="rgba(248,197,71,0.18)" />
        <path d="M40 225C124 183 212 179 296 223C369 262 449 257 530 216C585 187 640 184 690 204" stroke="#f1d48f" strokeDasharray="8 8" strokeLinecap="round" strokeWidth="2" />
        <ellipse cx="338" cy="170" fill="rgba(255,214,113,0.26)" rx="166" ry="42" />
        <path d="M200 124C200 109.641 211.641 98 226 98H474C496.091 98 514 115.909 514 138V205C514 218.807 502.807 230 489 230H225C211.193 230 200 218.807 200 205V124Z" fill="url(#machineBody)" />
        <path d="M234 112H416C432.569 112 446 125.431 446 142V198C446 204.627 440.627 210 434 210H246C239.373 210 234 204.627 234 198V112Z" fill="white" fillOpacity="0.86" />
        <path d="M446 128H506C528.091 128 546 145.909 546 168V203C546 217.912 533.912 230 519 230H446V128Z" fill="url(#machineArm)" />
        <path d="M336 118V195" stroke="#b27c14" strokeLinecap="round" strokeWidth="4" />
        <path d="M331 121H360" stroke="#b27c14" strokeLinecap="round" strokeWidth="4" />
        <path d="M333 140H353" stroke="#b27c14" strokeLinecap="round" strokeWidth="3" />
        <path d="M338 167V214" stroke="#845318" strokeLinecap="round" strokeWidth="5" />
        <path d="M298 225H527" stroke="#cf9a26" strokeLinecap="round" strokeWidth="9" />
        <path d="M212 210C243 186 286 177 341 183C383 188 412 203 428 230H168C176 216 190 209 212 210Z" fill="url(#fabric)" />
        <circle cx="500" cy="181" fill="#f7d27a" r="24" />
        <circle cx="500" cy="181" fill="white" fillOpacity="0.88" r="10" />
        <path d="M570 110C570 102.268 576.268 96 584 96H596C603.732 96 610 102.268 610 110V180C610 187.732 603.732 194 596 194H584C576.268 194 570 187.732 570 180V110Z" fill="url(#spool)" />
        <path d="M570 118H610" stroke="#d9a22e" strokeWidth="2" />
        <path d="M570 128H610" stroke="#d9a22e" strokeWidth="2" />
        <path d="M570 138H610" stroke="#d9a22e" strokeWidth="2" />
        <path d="M570 148H610" stroke="#d9a22e" strokeWidth="2" />
        <path d="M570 158H610" stroke="#d9a22e" strokeWidth="2" />
        <path d="M570 168H610" stroke="#d9a22e" strokeWidth="2" />
        <path d="M536 205C568 198 600 198 631 205V227C601 221 569 221 536 227V205Z" fill="#f4c247" />
        <path d="M539 211C566 205 596 205 628 211" stroke="#b57e0f" strokeDasharray="6 6" strokeLinecap="round" strokeWidth="2" />
        <path d="M539 220C566 214 596 214 628 220" stroke="#b57e0f" strokeDasharray="6 6" strokeLinecap="round" strokeWidth="2" />
        <text fill="#e09c08" fontFamily="Georgia, serif" fontSize="20" fontWeight="700" x="409" y="201">
          Darji
        </text>
        <defs>
          <linearGradient id="machineBody" x1="200" x2="514" y1="98" y2="230">
            <stop stopColor="#fff9e9" />
            <stop offset="1" stopColor="#f7d27a" />
          </linearGradient>
          <linearGradient id="machineArm" x1="446" x2="546" y1="128" y2="230">
            <stop stopColor="#fff5dd" />
            <stop offset="1" stopColor="#f1be54" />
          </linearGradient>
          <linearGradient id="fabric" x1="168" x2="428" y1="183" y2="230">
            <stop stopColor="#efb625" />
            <stop offset="1" stopColor="#ffd15b" />
          </linearGradient>
          <linearGradient id="spool" x1="570" x2="610" y1="96" y2="194">
            <stop stopColor="#ffe5a6" />
            <stop offset="1" stopColor="#f4bc38" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function SidebarNavItem({ activeSection, onSectionChange, section, setSupportSubTab, supportSubTab }: {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
  section: SidebarSection;
  setSupportSubTab: (tab: "customer" | "tailor" | "delivery" | "bugs") => void;
  supportSubTab: "customer" | "tailor" | "delivery" | "bugs";
}) {
  const Icon = section.icon;
  const isActive = section.id === activeSection;
  const button = (
    <button
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
        isActive
          ? "bg-orange-50 text-orange-700 shadow-[inset_3px_0_0_#f97316] dark:bg-orange-500/10 dark:text-orange-300"
          : "text-[var(--foreground)] hover:bg-slate-100/80 dark:hover:bg-white/5"
      )}
      onClick={() => onSectionChange(section.id)}
      title={section.description}
      type="button"
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", isActive ? "bg-white text-orange-600 shadow-sm dark:bg-white/10" : "bg-slate-100 text-slate-500 dark:bg-white/5")}>
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{section.label}</span>
      {section.id === "support" ? <ChevronDown size={14} className={cn("transition", isActive && "rotate-180")} /> : <ChevronRight size={14} className="opacity-35 transition group-hover:translate-x-0.5 group-hover:opacity-70" />}
    </button>
  );

  if (section.id !== "support") return button;
  return (
    <div className="space-y-1">
      {button}
      {isActive ? (
        <div className="ml-11 space-y-0.5 border-l border-orange-200 pl-3">
          {([
            ["customer", "Customer Support"],
            ["tailor", "Tailor Support"],
            ["delivery", "Delivery Support"],
            ["bugs", "Bug Reports"]
          ] as const).map(([id, label]) => (
            <button
              className={cn("block w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition", supportSubTab === id ? "bg-orange-50 text-orange-700" : "text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--foreground)]")}
              key={id}
              onClick={() => { setSupportSubTab(id); onSectionChange("support"); }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PortalFrame({
  activeSection,
  alertCount,
  children,
  globalSearch,
  globalSearchResults,
  headerDateControl,
  me,
  notifications = [],
  onGlobalSearchChange,
  onLogout,
  onMarkAllNotificationsRead,
  onNotificationOpen,
  onOpenSidebar,
  onSectionChange,
  sidebarOpen,
  supportCount
}: {
  activeSection: SectionId;
  alertCount: number;
  children: React.ReactNode;
  globalSearch: string;
  globalSearchResults: GlobalSearchResult[];
  headerDateControl?: React.ReactNode;
  me?: MeResponse;
  notifications?: OperationalAlert[];
  onGlobalSearchChange: (value: string) => void;
  onLogout: () => void;
  onMarkAllNotificationsRead?: () => void;
  onNotificationOpen?: (notification: OperationalAlert) => void;
  onOpenSidebar: () => void;
  onSectionChange: (section: SectionId) => void;
  sidebarOpen: boolean;
  supportCount: number;
}) {
  const setSidebarOpen = useAdminStore((state) => state.setSidebarOpen);
  const supportSubTab = useAdminStore((state) => state.supportSubTab);
  const setSupportSubTab = useAdminStore((state) => state.setSupportSubTab);
  const theme = useAdminStore((state) => state.theme);
  const toggleTheme = useAdminStore((state) => state.toggleTheme);
  const queryClient = useQueryClient();
  const [adminProfileOpen, setAdminProfileOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState(() => ({ name: "", avatarUrl: "" }));
  const displayName = adminProfile.name || me?.name || "Super Admin";
  const profileMe: MeResponse | undefined = me ? { ...me, name: displayName, avatarUrl: adminProfile.avatarUrl || me.avatarUrl } : undefined;

  useEffect(() => {
    if (me) setAdminProfile({ name: me.name ?? "", avatarUrl: me.avatarUrl ?? "" });
  }, [me]);

  const profileMutation = useMutation({
    mutationFn: updateAdminProfile,
    onSuccess: async (updated) => {
      setAdminProfile({ name: updated.name ?? "", avatarUrl: updated.avatarUrl ?? "" });
      setAdminProfileOpen(false);
      toast.success("Admin profile saved to your account");
      await queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

  function saveAdminProfile() {
    const name = adminProfile.name.trim();
    if (name.length < 2) {
      toast.error("Enter an admin name with at least 2 characters");
      return;
    }
    profileMutation.mutate({ name, avatarUri: adminProfile.avatarUrl || undefined });
  }

  return (
    <>
    <main className="min-h-screen">
      <div className="darji-dashboard-scale darji-shell relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(246,163,19,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(246,163,19,0.08),transparent_18%)] bg-[var(--background)]">
        <div className={cn("fixed inset-0 z-[1000] bg-black/55 backdrop-blur-sm transition lg:hidden", sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setSidebarOpen(false)} />
        <aside
          className={cn(
            "darji-sidebar fixed inset-y-3 left-3 z-[1010] flex w-[min(300px,calc(100vw-24px))] flex-col overflow-hidden rounded-[26px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-[var(--shadow)] backdrop-blur transition lg:inset-y-4 lg:left-4 lg:z-30 lg:w-[252px] lg:translate-x-0 lg:rounded-[30px]",
            sidebarOpen ? "translate-x-0" : "-translate-x-[120%]"
          )}
        >
          <div className="mb-7 flex items-start justify-between">
            <LogoMark />
            <button className="rounded-full p-2 text-[var(--muted)] hover:bg-[#f4f7fb] hover:text-[var(--foreground)] lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav aria-label="Admin sections" className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            {sidebarGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                <div className="space-y-1">
                  {group.sections.map((sectionId) => {
                    const section = sidebarSections.find((candidate) => candidate.id === sectionId);
                    return section ? <SidebarNavItem activeSection={activeSection} key={section.id} onSectionChange={onSectionChange} section={section} setSupportSubTab={setSupportSubTab} supportSubTab={supportSubTab} /> : null;
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto space-y-3 pt-4">
            {/* Dark Mode Toggle Switch */}
            <div className="flex items-center justify-between rounded-[22px] border border-[var(--panel-border)] bg-[var(--panel-strong)] px-4 py-3 shadow-[var(--shadow)]">
              <span className="text-sm font-semibold text-[var(--foreground)]">Dark Mode</span>
              <button
                onClick={toggleTheme}
                type="button"
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  theme === "dark" ? "bg-orange-500" : "bg-gray-200 dark:bg-gray-800"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    theme === "dark" ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

          </div>
        </aside>

        <div className="min-w-0 lg:pl-[278px]">
          <div className="sticky top-0 z-20 px-3 pt-3 lg:px-6 lg:pt-4">
            <header className="darji-topbar relative rounded-[28px] border border-[#e8d2a7] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(255,249,241,0.98))] px-4 py-4 shadow-[var(--shadow)] backdrop-blur sm:px-5">
              <div className="darji-topbar-overlay pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_120%,rgba(246,163,19,0.14),transparent_24%),radial-gradient(circle_at_78%_30%,rgba(246,163,19,0.12),transparent_20%),linear-gradient(90deg,transparent_0%,rgba(246,163,19,0.04)_34%,rgba(255,255,255,0)_70%)]" />
              <div className="pointer-events-none absolute right-10 top-0 hidden h-full w-80 opacity-60 xl:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle,#efc871_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(246,190,73,0.12)_28%,transparent_46%,rgba(246,190,73,0.08)_62%,transparent_84%)]" />
              </div>
              <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button className="rounded-2xl border border-[var(--panel-border)] p-3 text-[var(--foreground)] lg:hidden" onClick={onOpenSidebar}>
                    <Menu size={18} />
                  </button>
                  <div className="darji-header-control hidden h-12 w-12 items-center justify-center rounded-2xl border border-[#f0dcc0] bg-[#fff6e3] text-[#c78309] lg:flex">
                    <Menu size={18} />
                  </div>
                  <div className="relative min-w-0 flex-1 xl:flex-none">
                    <div className="darji-header-control flex w-full min-w-0 items-center gap-2 rounded-2xl border border-[#e8cf9d] bg-white px-3 py-3 shadow-[inset_0_0_0_1px_rgba(255,245,224,0.55)] sm:min-w-[340px] sm:gap-3 sm:px-4">
                      <Search size={18} className="text-[var(--muted)]" />
                      <input
                        className="w-full bg-transparent outline-none"
                        value={globalSearch}
                        onChange={(event) => onGlobalSearchChange(event.target.value)}
                        placeholder="Search order, person, ID..."
                      />
                      <span className="darji-keycap hidden rounded-lg border border-[#eedec0] bg-[#fff8ea] px-2 py-1 text-[11px] font-semibold text-[var(--muted)] sm:inline-flex">
                        K
                      </span>
                    </div>
                    {globalSearch.trim() ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-3xl border border-[#ead7b2] bg-[var(--panel-strong)] p-2 shadow-[0_18px_42px_rgba(26,22,14,0.16)]">
                        {globalSearchResults.length ? (
                          globalSearchResults.map((result) => {
                            const Icon = result.icon;
                            return (
                              <button
                                key={result.id}
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#fff6e7] dark:hover:bg-white/5"
                                onClick={result.onSelect}
                                type="button"
                              >
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff1d6] text-[#c78309]">
                                  <Icon size={16} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{result.title}</span>
                                  <span className="block truncate text-xs text-[var(--muted)]">{result.subtitle}</span>
                                </span>
                                <ChevronRight size={15} className="text-[#c8b79b]" />
                              </button>
                            );
                          })
                        ) : (
                          <p className="px-3 py-3 text-sm font-semibold text-[var(--muted)]">No matching orders, users, tailors or delivery tasks.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                  <div className="hidden lg:block">
                    {headerDateControl ?? <div className="darji-header-control inline-flex items-center gap-2 rounded-2xl border border-[#f0dcc0] bg-white px-4 py-3 text-sm font-medium text-[var(--deep)]"><CalendarDays size={17} className="text-[var(--accent)]" />{buildDashboardDateRangeLabel("monthly")}</div>}
                  </div>

                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="darji-header-control relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f0dcc0] bg-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                        <Bell size={18} />
                        {alertCount > 0 ? (
                          <span className="absolute right-2 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                            {alertCount}
                          </span>
                        ) : null}
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-[min(390px,calc(100vw-24px))] rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-strong)] p-3 shadow-[var(--shadow)] backdrop-blur">
                        <div className="flex items-center justify-between gap-3 px-2 py-2">
                          <div><p className="text-sm font-semibold">Notifications</p><p className="text-xs text-[var(--muted)]">{alertCount} unread · {notifications.length} total</p></div>
                          {alertCount > 0 ? <button className="text-xs font-semibold text-orange-600 hover:underline" onClick={onMarkAllNotificationsRead} type="button">Mark all read</button> : null}
                        </div>
                        <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                          {notifications.length ? notifications.map((notification) => (
                            <button className={cn("flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]", notification.status === "OPEN" ? "border-orange-200 bg-orange-50/70" : "border-[var(--panel-border)] bg-[#fbfdff] opacity-75")} key={notification.id} onClick={() => onNotificationOpen?.(notification)} type="button">
                              <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl", notification.severity === "CRITICAL" ? "bg-rose-100 text-rose-600" : notification.severity === "WARNING" ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600")}><AlertCircle size={16} /></span>
                              <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="text-sm font-semibold text-[var(--foreground)]">{notification.title}</span>{notification.status === "OPEN" ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" /> : null}</span><span className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{notification.message}</span><span className="mt-1.5 block text-[11px] text-[var(--muted)]">{formatDate(notification.createdAt, true)}</span></span>
                            </button>
                          )) : <div className="px-3 py-10 text-center text-sm text-[var(--muted)]">You’re all caught up.</div>}
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  <button
                    className="darji-header-control relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f0dcc0] bg-white text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    onClick={() => onSectionChange("support")}
                    type="button"
                  >
                    <MessageSquareText size={18} />
                    {supportCount > 0 ? (
                      <span className="absolute right-2 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[#111111]">
                        {supportCount}
                      </span>
                    ) : null}
                  </button>

                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="darji-header-control flex min-w-0 items-center gap-2 rounded-2xl border border-[#f0dcc0] bg-white px-2.5 py-2.5 transition hover:border-[var(--accent)] sm:gap-3 sm:px-3">
                        <AvatarBadge me={profileMe} size="sm" />
                        <div className="hidden text-left sm:block">
                          <p className="text-sm font-semibold">{displayName}</p>
                          <p className="text-xs text-[var(--muted)]">{me?.role ? formatRoleLabel(me.role) : "Super Administrator"}</p>
                        </div>
                        <ChevronDown size={16} className="text-[var(--muted)]" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-64 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-strong)] p-2 shadow-[var(--shadow)] backdrop-blur">
                        <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm outline-none transition hover:bg-[#f4f7fb]">
                          <UserCircle2 size={16} />
                          Signed in as {displayName}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm outline-none transition hover:bg-[#f4f7fb]" onSelect={() => setAdminProfileOpen(true)}>
                          <Settings size={16} />
                          Edit profile
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm outline-none transition hover:bg-[#f4f7fb]" onSelect={onLogout}>
                          <LogOut size={16} />
                          Sign out
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </div>
            </header>
          </div>

          <div className="min-w-0 px-3 py-3 sm:py-4 lg:px-6 lg:pb-8">
            <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold text-[var(--muted)]">
              <button className="transition hover:text-orange-600" onClick={() => onSectionChange("dashboard")} type="button">Admin</button>
              <ChevronRight size={12} />
              <span className="text-[var(--foreground)]">{sidebarSections.find((section) => section.id === activeSection)?.label ?? "Dashboard"}</span>
            </nav>
            {children}
          </div>
        </div>
      </div>
    </main>
    <Dialog.Root open={adminProfileOpen} onOpenChange={setAdminProfileOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-28px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-5 shadow-[var(--shadow)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[var(--foreground)]">Edit Admin Profile</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Name and avatar are saved to your admin account across devices.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-2xl p-2 text-[var(--muted)] hover:bg-[#fff6e7]">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="grid gap-3">
            <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
              Name
              <input className="w-full rounded-2xl border border-[var(--panel-border)] bg-white px-3 py-2.5 outline-none dark:bg-white/5" value={adminProfile.name} onChange={(event) => setAdminProfile((current) => ({ ...current, name: event.target.value }))} placeholder={me?.name ?? "Admin name"} />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {getAdminAvatarOptions().map((avatar) => (
              <button key={avatar} className={cn("overflow-hidden rounded-2xl border bg-[#fff6e4] p-1 transition", adminProfile.avatarUrl === avatar ? "border-[var(--accent)] ring-2 ring-[rgba(246,163,19,0.22)]" : "border-[var(--panel-border)]")} onClick={() => setAdminProfile((current) => ({ ...current, avatarUrl: avatar }))} type="button">
                <img alt="" className="aspect-square w-full rounded-xl object-cover" src={avatar} />
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="rounded-2xl border border-[var(--panel-border)] px-4 py-2 text-sm font-semibold" onClick={() => setAdminProfileOpen(false)} type="button">Cancel</button>
            <button className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#111111] disabled:cursor-not-allowed disabled:opacity-60" disabled={profileMutation.isPending} onClick={saveAdminProfile} type="button">{profileMutation.isPending ? "Saving..." : "Save Profile"}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}

function LoadingDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-[26px] border border-[var(--panel-border)] bg-[var(--panel)]" />
      ))}
    </div>
  );
}

function LogoMark() {
  return (
    <div className="pl-1">
      <img alt="Darji" className="h-auto w-[112px]" fetchPriority="high" src="/darji-logo.png" />
      <p className="mt-1 pl-1 text-[11px] font-semibold tracking-[0.04em] text-[#7d6d58]">Stitching Made Simple</p>
    </div>
  );
}

function AvatarBadge({ me, size }: { me?: MeResponse; size: "sm" | "md" }) {
  const dimension = size === "sm" ? "h-10 w-10 rounded-2xl" : "h-11 w-11 rounded-2xl";

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden border border-[#ead8b2] bg-[#fff6e4] shadow-[0_6px_16px_rgba(206,156,39,0.12)]", dimension)}>
      {me?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={me.name ?? "Admin avatar"} className="h-full w-full object-cover" src={me.avatarUrl} />
      ) : (
        <img alt={me?.name ?? "Admin avatar"} className="h-full w-full object-cover" src={getDefaultAvatarUrl(me?.name ?? me?.phone ?? "Admin")} />
      )}
      <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
    </div>
  );
}

function AvatarIllustration({ className, seed }: { className?: string; seed: string }) {
  const palette = avatarPalette(seed);

  return (
    <svg className={className} fill="none" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect fill={palette.background} height="64" rx="18" width="64" />
      <circle cx="32" cy="25" fill={palette.skin} r="12" />
      <path d="M20 22.5C20 16.1487 25.1487 11 31.5 11H32.5C38.8513 11 44 16.1487 44 22.5V24C40.6111 21.9859 37.2222 20.9789 33.8333 20.9789C28.755 20.9789 24.144 23.3193 20 28V22.5Z" fill={palette.hair} />
      <path d="M14 58C14 46.402 22.9543 37 34 37C45.0457 37 54 46.402 54 58V64H14V58Z" fill={palette.shirt} />
      <path d="M25 38.5C27.0783 40.1151 29.4852 40.9227 32 40.9227C34.5148 40.9227 36.9217 40.1151 39 38.5V44C39 47.866 35.866 51 32 51C28.134 51 25 47.866 25 44V38.5Z" fill={palette.skin} opacity="0.9" />
      <circle cx="27.5" cy="25.5" fill="#2C2116" r="1.2" />
      <circle cx="36.5" cy="25.5" fill="#2C2116" r="1.2" />
      <path d="M28 31C29.1945 32.2949 30.5614 32.9423 32.1007 32.9423C33.6399 32.9423 35.0068 32.2949 36.2013 31" stroke="#7C4A2D" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function avatarPalette(seed: string) {
  const palettes = [
    { background: "#FFF2DA", hair: "#5C3417", shirt: "#1F78FF", skin: "#F0BF96" },
    { background: "#FFF0E1", hair: "#2F231D", shirt: "#F6A313", skin: "#D8A179" },
    { background: "#F5EEFF", hair: "#4C2D1C", shirt: "#7B61FF", skin: "#E5B08C" },
    { background: "#EAF6FF", hair: "#3C3027", shirt: "#0EA5E9", skin: "#F2C29F" },
    { background: "#EDF9EF", hair: "#4B321F", shirt: "#42A845", skin: "#E7B186" }
  ];
  const value = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palettes[value % palettes.length];
}

function MiniAvatar({ alt = "Profile photo", fallbackSrc: providedFallbackSrc, gender, seed, src }: { alt?: string; fallbackSrc?: string; gender?: string; seed: string; src?: string | null }) {
  const fallbackSrc = providedFallbackSrc || getDefaultAvatarUrl(seed, gender);
  return (
    <div className="h-10 w-10 overflow-hidden rounded-full border border-[#ead8b2] bg-[#fff6e4] shadow-[0_4px_12px_rgba(206,156,39,0.12)]">
      <img
        alt={alt}
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = fallbackSrc;
        }}
        src={src || fallbackSrc}
      />
    </div>
  );
}

function getAdminAvatarOptions() {
  return [
    "boy.png",
    "girl.png",
    "young male.png",
    "young female.png",
    "black_male.png",
    "black_female.png",
    "uncle.png",
    "aunt.png",
    "aunt_2.png",
    "old_male.png",
    "tanned_male.png",
    "tanned_uncle.png"
  ].map((file) => `/avatars/${encodeURIComponent(file)}`);
}

function GrowthPromoGraphic() {
  return (
    <div className="relative h-16 overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,rgba(255,244,220,0.92),rgba(255,255,255,0.42))]">
      <div className="absolute inset-x-2 bottom-2 flex items-end gap-2">
        {[20, 34, 28, 42, 56].map((height, index) => (
          <div
            key={height}
            className={cn(
              "w-4 rounded-t-[6px] bg-[linear-gradient(180deg,#ffd97d,#f6a313)] shadow-[0_6px_14px_rgba(246,163,19,0.18)]",
              index === 4 && "w-5"
            )}
            style={{ height }}
          />
        ))}
      </div>
      <div className="absolute left-2 right-3 top-4 h-8">
        <svg className="h-full w-full" fill="none" viewBox="0 0 160 40">
          <path d="M3 31C20 31 25 16 37 16C50 16 54 24 67 24C82 24 89 8 104 8C115 8 120 13 132 13C142 13 148 8 157 3" stroke="#f0b12b" strokeLinecap="round" strokeWidth="3" />
          <path d="M148 3H157V12" stroke="#f0b12b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}

function FeatureLine({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number }>; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.08))] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
      <span className="rounded-xl bg-[#fff4dc] p-2 text-[#0b2241] shadow-sm">
        <Icon size={16} />
      </span>
      <span className="text-sm leading-6 text-slate-100">{title}</span>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.06))] px-4 py-4 backdrop-blur shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
      <p className="text-xs uppercase tracking-[0.24em] text-[#f7dca2]">{label}</p>
      <p className="mt-3 text-xl font-semibold leading-7 text-white">{value}</p>
    </div>
  );
}

function MiniInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#ead7b2] bg-[#fffdf8] px-4 py-4 shadow-[0_10px_24px_rgba(188,142,47,0.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a8764]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function ActionButton({
  children,
  className,
  disabled,
  onClick,
  type = "button",
  variant = "primary"
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[var(--accent)] text-[#111111] hover:bg-[var(--accent-strong)]",
        variant === "secondary" && "border border-[var(--panel-border)] bg-[#fbfdff] hover:border-[var(--accent)] hover:text-[var(--accent)]",
        variant === "danger" && "bg-rose-500 text-white hover:bg-rose-600",
        className
      )}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "teal" | "amber" | "rose" | "burgundy" | "sky" | "slate" | "emerald" | "violet" | "cyan" }) {
  const toneMap: Record<string, string> = {
    amber: "bg-amber-500/12 text-amber-700",
    cyan: "bg-cyan-500/12 text-cyan-700",
    emerald: "bg-emerald-500/12 text-emerald-700",
    rose: "bg-rose-500/12 text-rose-700",
    burgundy: "bg-[#7f1d2d]/12 text-[#7f1d2d]",
    sky: "bg-sky-500/12 text-sky-700",
    slate: "bg-slate-500/12 text-slate-700",
    teal: "bg-teal-500/12 text-teal-700",
    violet: "bg-violet-500/12 text-violet-700"
  };

  return <span className={cn("inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold", toneMap[tone])}>{children}</span>;
}

const Panel = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(function Panel({ children, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn("darji-panel rounded-[26px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-4 shadow-[var(--shadow)]", className)}
    >
      {children}
    </div>
  );
});

function SectionIntro({
  action,
  description,
  title
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] backdrop-blur lg:flex-row lg:items-end lg:justify-between animate-slide-up-fade">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-[var(--muted)]" role="status"><LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent)]" /><span>{label}</span></div>;
}

function InlineError({ message }: { message: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{message}</p></div>;
}

function KpiDrilldownNotice({ count, label, onClear, periodLabel }: { count: number; label: string; onClear: () => void; periodLabel: string }) {
  return (
    <div aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-orange-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <Filter className="mt-0.5 shrink-0 text-orange-600 sm:mt-0" size={17} />
        <p className="min-w-0 text-sm">
          Showing <strong className="tabular-nums">{count.toLocaleString("en-IN")}</strong> source record{count === 1 ? "" : "s"} for <strong>{label}</strong>
          <span className="text-orange-800"> · {periodLabel}</span>
        </p>
      </div>
      <button className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-300 bg-white px-3 text-sm font-semibold text-orange-800 transition hover:border-orange-500 hover:text-orange-950" onClick={onClear} type="button">
        <X size={15} /> Clear KPI filter
      </button>
    </div>
  );
}

function FinancialDetailDialog({
  analytics,
  kind,
  onClose,
  onOpenPartnerManagement,
  onOpenPartner,
  onOpenOrder,
  onOpenPayouts,
  periodLabel
}: {
  analytics: DashboardAnalytics;
  kind: FinanceDetailKind | null;
  onClose: () => void;
  onOpenPartnerManagement: () => void;
  onOpenPartner: (partnerId: string, partnerType?: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenPayouts: () => void;
  periodLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  useEffect(() => {
    setSearch("");
    setCategory("");
    setPage(1);
  }, [kind]);
  if (!kind) return null;

  const details = analytics.financeDetails;
  if (!details) {
    return (
      <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-[var(--foreground)]">Financial breakdown unavailable</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  The dashboard is connected to an older backend response. Restart or deploy the updated backend, then refresh this page. Summary cards remain available in the meantime.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--accent-soft)]"><X size={18} /></Dialog.Close>
            </div>
            <div className="mt-5 flex justify-end"><Dialog.Close asChild><ActionButton>Close</ActionButton></Dialog.Close></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  const title = kind === "gross_paid" ? "Gross Paid"
    : kind === "partner_cost" ? "Completed-order Partner Cost"
      : kind === "pending_payouts" ? "Pending Partner Payouts"
        : "Realized Net Revenue";
  const description = kind === "gross_paid"
    ? `Collection-date ledger for ${periodLabel}. Online advances remain visible before completion; COD is not treated as remitted cash.`
    : kind === "partner_cost"
      ? `Finalized obligations recognized by order completion date for ${periodLabel}. Paid plus pending always equals total partner cost.`
      : kind === "pending_payouts"
        ? `As-of-now liabilities from completed orders only, calculated at ${formatDate(details.pendingPayouts.asOf, true)}.`
        : `Completed-order contribution for ${periodLabel}, using ₹16 once per eligible order.`;

  const sourceRows = kind === "gross_paid" ? details.grossPaid.rows
    : kind === "partner_cost" ? details.partnerCost.rows
      : kind === "pending_payouts" ? details.pendingPayouts.rows
        : details.realizedRevenue.rows;
  const filteredRows = sourceRows.filter((row) => {
    const values = Object.values(row as Record<string, unknown>).join(" ").toLowerCase();
    if (search && !values.includes(search.toLowerCase())) return false;
    if (!category) return true;
    if ("category" in row) return String(row.category) === category;
    if (kind === "gross_paid") return String((row as { paymentMethod: string }).paymentMethod) === category;
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const exceptions = details.reconciliation.exceptions;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-3 right-3 top-3 z-50 w-[min(1120px,calc(100vw-1.5rem))] overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-strong)] shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--panel-border)] bg-[var(--panel-strong)] px-5 py-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-[var(--foreground)]">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--accent-soft)]"><X size={18} /></Dialog.Close>
          </div>

          <div className="space-y-5 p-5">
            {kind === "gross_paid" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                  <p className="font-semibold">Gross Paid = Online collections + COD collections − successful refunds</p>
                  <p className="mt-1 tabular-nums">{formatCurrency(details.grossPaid.summary.onlineCollections)} + {formatCurrency(details.grossPaid.summary.codCollections)} − {formatCurrency(details.grossPaid.summary.refunds)} = <strong>{formatCurrency(details.grossPaid.summary.grossPaid)}</strong></p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <FinanceDetailMetric info="Successful online and COD customer collections in the selected period, minus successful refunds recorded in that period. Pending and failed payments are excluded." label="Gross Paid" value={details.grossPaid.summary.grossPaid} />
                  <FinanceDetailMetric info="Successful online or UPI customer collections whose payment date falls in the selected period." label="Online collections" value={details.grossPaid.summary.onlineCollections} />
                  <FinanceDetailMetric info="COD marked collected after final delivery confirmation. This does not prove that the delivery partner has remitted the cash to Darji." label="COD collected" value={details.grossPaid.summary.codCollections} />
                  <FinanceDetailMetric info="Successful full refunds recorded in the selected period. The current payment schema does not support partial-refund amounts." label="Refunds" value={details.grossPaid.summary.refunds} negative />
                  <FinanceDetailMetric info="Net collections in this payment period belonging to orders that are currently completed." label="Completed-order collections" value={details.grossPaid.summary.completedCollections} />
                  <FinanceDetailMetric info="Net collections already received for orders that are still pending or active. These remain in Gross Paid but are excluded from Realized Net Revenue until completion." label="Collected — Awaiting Completion" value={details.grossPaid.summary.incompleteCollections} />
                  <FinanceDetailMetric info="The cancellation fee recorded on cancelled orders represented in this period. It is shown separately from actual refunds." label="Cancellation fees" value={details.grossPaid.summary.cancellationFees} />
                  <FinanceDetailMetric info="Cancelled-order cash still recorded as collected above the cancellation fee, without a successful refund record proving that the balance was returned." label="Cancelled cash awaiting refund proof" value={details.grossPaid.summary.unrefundedCancelledCollections} />
                </div>
              </div>
            ) : kind === "realized_revenue" ? (
              <div className="rounded-2xl border border-[var(--panel-border)] bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Financial equation</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <FinanceDetailMetric info="Actual net customer collections attributable to financially complete orders completed during this reporting period." label="Completed collections" value={analytics.finance.realizedGrossPaid} />
                  <FinanceDetailMetric info="Full accepted stitching quotes plus finalized home-measurement payouts for eligible completed orders." label="Stitching + measurement" value={analytics.finance.realizedTailorCost} negative />
                  <FinanceDetailMetric info="Finalized instant-task payouts and allocated batch-delivery payouts for eligible completed orders." label="Delivery" value={analytics.finance.realizedDeliveryCost} negative />
                  <FinanceDetailMetric info="Fixed operational allowance applied once per financially eligible completed order, not once per garment or delivery task." label={`₹16 × ${analytics.finance.realizedCompletedOrders}`} value={analytics.finance.realizedPackagingCost} negative />
                  <FinanceDetailMetric info="Completed-order collections minus stitching, measurement, delivery and the ₹16 operational allowance." label="Realized revenue" value={analytics.finance.netRevenue} />
                  <FinanceDetailMetric info="Completed orders in this period with a customer collection and all required finalized partner costs." label="Eligible orders" value={analytics.finance.realizedCompletedOrders} currency={false} />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <FinanceDetailMetric info={kind === "partner_cost" ? "Total finalized stitching, measurement and delivery obligations for orders completed in the selected period. Paid plus unpaid equals Partner Cost." : "As-of-now unpaid finalized partner obligations belonging to completed orders only."} label={kind === "partner_cost" ? "Partner Cost" : "Pending Payout"} value={kind === "partner_cost" ? details.partnerCost.summary.partnerCost : details.pendingPayouts.summary.pendingPartnerCost} />
                <FinanceDetailMetric info={kind === "partner_cost" ? "Full accepted stitching quotes recognized when their orders complete in the selected period." : "Unpaid portion of finalized stitching obligations belonging to completed orders."} label="Stitching" value={kind === "partner_cost" ? details.partnerCost.summary.stitchingCost : details.pendingPayouts.summary.pendingStitching} />
                <FinanceDetailMetric info={kind === "partner_cost" ? "Finalized home-measurement partner payouts recognized when their related orders complete." : "Unpaid portion of finalized measurement-visit obligations belonging to completed orders."} label="Measurement" value={kind === "partner_cost" ? details.partnerCost.summary.measurementCost : details.pendingPayouts.summary.pendingMeasurement} />
                <FinanceDetailMetric info={kind === "partner_cost" ? "Finalized instant delivery payouts plus deterministic shares of finalized batch payouts." : "Unpaid portion of finalized delivery obligations belonging to completed orders."} label="Delivery" value={kind === "partner_cost" ? details.partnerCost.summary.deliveryCost : details.pendingPayouts.summary.pendingDelivery} />
                <FinanceDetailMetric info="Amount successfully recorded as paid to partners through payout history. Wallet credits alone do not count as paid." label="Paid" value={kind === "partner_cost" ? details.partnerCost.summary.paidPartnerCost : details.pendingPayouts.summary.paidPartnerCost} />
                <FinanceDetailMetric info="Remaining finalized partner liability after successful payouts are allocated to earning sources." label="Unpaid" value={kind === "partner_cost" ? details.partnerCost.summary.pendingPartnerCost : details.pendingPayouts.summary.pendingPartnerCost} />
              </div>
            )}

            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <strong>Reconciliation:</strong> collected in period {formatCurrency(details.reconciliation.collectedInPeriod)} · completed-order collections recognized {formatCurrency(details.reconciliation.completedOrderCollectionsInPeriod)} · current eligible unpaid partner liability {formatCurrency(details.reconciliation.currentEligiblePendingPayouts)}.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                <input className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white pl-10 pr-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Search order, payment, partner, task or batch" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {kind === "gross_paid" ? <FilterSelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={[{ label: "All methods", value: "" }, { label: "Online", value: "ONLINE" }, { label: "UPI", value: "UPI" }, { label: "COD", value: "COD" }]} /> : null}
                {kind === "partner_cost" || kind === "pending_payouts" ? <FilterSelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={[{ label: "All costs", value: "" }, { label: "Stitching", value: "STITCHING" }, { label: "Measurement", value: "MEASUREMENT" }, { label: "Delivery", value: "DELIVERY" }]} /> : null}
                {(kind === "partner_cost" || kind === "pending_payouts") ? <ActionButton variant="secondary" onClick={onOpenPartnerManagement}>Partners</ActionButton> : null}
                {kind === "pending_payouts" ? <ActionButton onClick={onOpenPayouts}>Open payouts</ActionButton> : null}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--panel-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#fff8ec] text-xs uppercase tracking-wide text-[#74654f]">
                  {kind === "gross_paid" ? <tr><th className="px-4 py-3">S. No.</th><th className="px-4 py-3">Order / customer</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Date / status</th><th className="px-4 py-3 text-right">Collected</th><th className="px-4 py-3 text-right">Refunded</th><th className="px-4 py-3 text-right">Net</th></tr>
                    : kind === "realized_revenue" ? <tr><th className="px-4 py-3">S. No.</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Completion</th><th className="px-4 py-3 text-right">Collected</th><th className="px-4 py-3 text-right">Partner cost</th><th className="px-4 py-3 text-right">Allowance</th><th className="px-4 py-3 text-right">Revenue / margin</th></tr>
                      : <tr><th className="px-4 py-3">S. No.</th><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Order / source</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Earning</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Pending</th></tr>}
                </thead>
                <tbody className="divide-y divide-[var(--panel-border)] bg-white/60">
                  {rows.map((row: any, rowIndex: number) => kind === "gross_paid" ? (
                    <tr key={row.key}><td className="px-4 py-3 font-semibold tabular-nums text-[var(--muted)]">{(safePage - 1) * pageSize + rowIndex + 1}</td><td className="px-4 py-3"><button className="rounded-lg text-left underline decoration-orange-300 underline-offset-4 hover:text-orange-700" onClick={() => onOpenOrder(row.orderId)} type="button"><span className="block font-semibold">{row.orderNumber ?? row.orderId}</span><span className="block text-xs text-[var(--muted)]">{row.customerName ?? row.customerId ?? "Customer"}</span></button></td><td className="px-4 py-3"><StatusBadge value={row.paymentMethod} /><p className="mt-1 text-xs text-[var(--muted)]">{row.paymentId}{row.duplicateRecords ? ` · ${row.duplicateRecords} duplicate ignored` : ""}</p></td><td className="px-4 py-3"><p>{formatDate(row.paymentDate ?? row.refundDate, true)}</p><p className="mt-1 text-xs text-[var(--muted)]">{row.orderStatus}{row.cancelled ? ` · fee ${formatCurrency(row.cancellationFee)}` : ""}{row.codRemittanceStatus === "COLLECTED_UNRECONCILED" ? " · COD remittance unverified" : ""}</p></td><td className="px-4 py-3 text-right">{formatCurrency(row.collectedAmount)}</td><td className="px-4 py-3 text-right text-rose-600">{formatCurrency(row.refundedAmount)}</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.netCollectedAmount)}</td></tr>
                  ) : kind === "realized_revenue" ? (
                    <tr className={row.realizedRevenue < 0 ? "bg-rose-50/70" : undefined} key={row.orderId}><td className="px-4 py-3 font-semibold tabular-nums text-[var(--muted)]">{(safePage - 1) * pageSize + rowIndex + 1}</td><td className="px-4 py-3"><button className="rounded-lg text-left underline decoration-orange-300 underline-offset-4 hover:text-orange-700" onClick={() => onOpenOrder(row.orderId)} type="button"><span className="block font-semibold">{row.orderNumber ?? row.orderId}</span><span className="block text-xs text-[var(--muted)]">{row.orderId}</span></button></td><td className="px-4 py-3">{formatDate(row.completionDate, true)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.collectedAmount)}</td><td className="px-4 py-3 text-right"><p>{formatCurrency(row.partnerCost)}</p><p className="text-xs text-[var(--muted)]">S {formatCurrency(row.stitchingCost)} · M {formatCurrency(row.measurementCost)} · D {formatCurrency(row.deliveryCost)}</p></td><td className="px-4 py-3 text-right">{formatCurrency(row.operationalAllowance)}</td><td className={cn("px-4 py-3 text-right font-semibold", row.realizedRevenue < 0 ? "text-rose-700" : "text-emerald-700")}><p>{formatCurrency(row.realizedRevenue)}</p><p className="text-xs">{row.marginPercentage == null ? "—" : `${row.marginPercentage.toFixed(2)}%`}</p></td></tr>
                  ) : (
                    <tr key={row.id}><td className="px-4 py-3 font-semibold tabular-nums text-[var(--muted)]">{(safePage - 1) * pageSize + rowIndex + 1}</td><td className="px-4 py-3"><button className="rounded-lg text-left underline decoration-orange-300 underline-offset-4 hover:text-orange-700" onClick={() => onOpenPartner(row.partnerId, row.partnerType)} type="button"><span className="block font-semibold">{row.partnerName}</span><span className="block text-xs text-[var(--muted)]">{row.partnerType} · {row.partnerId}</span></button></td><td className="px-4 py-3"><button className="rounded-lg text-left underline decoration-orange-300 underline-offset-4 hover:text-orange-700" onClick={() => onOpenOrder(row.orderId)} type="button"><span className="block">{row.orderId}</span><span className="block text-xs text-[var(--muted)]">{row.batchId ? `Batch ${row.batchId}` : row.taskId ? `Task ${row.taskId}` : row.sourceId}</span></button></td><td className="px-4 py-3"><StatusBadge value={row.category} /><p className="mt-1 text-xs text-[var(--muted)]">Recognized {formatDate(row.recognitionDate, true)}</p></td><td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td><td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(row.amountPaid)}</td><td className="px-4 py-3 text-right font-semibold text-amber-700">{formatCurrency(row.amountPending)}</td></tr>
                  ))}
                  {!rows.length ? <tr><td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={7}>No financial records match these filters.</td></tr> : null}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
              <span>{filteredRows.length.toLocaleString("en-IN")} record{filteredRows.length === 1 ? "" : "s"}</span>
              <div className="flex items-center gap-2"><ActionButton variant="secondary" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /> Previous</ActionButton><span>Page {safePage} of {pageCount}</span><ActionButton variant="secondary" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next <ChevronRight size={15} /></ActionButton></div>
            </div>

            {exceptions.length ? (
              <details className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <summary className="cursor-pointer font-semibold text-amber-950">Reconciliation exceptions ({exceptions.length})</summary>
                <div className="mt-3 space-y-2 text-sm text-amber-950">{exceptions.map((exception, index) => <p key={`${exception.type}-${exception.orderId ?? index}`}><strong>{exception.type.replaceAll("_", " ")}:</strong> {exception.message}{exception.orderId ? ` Order ${exception.orderId}.` : ""}</p>)}</div>
              </details>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FinanceDetailMetric({ currency = true, info, label, negative = false, value }: { currency?: boolean; info: string; label: string; negative?: boolean; value: number }) {
  return (
    <div className="relative rounded-2xl border border-[var(--panel-border)] bg-white/70 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
        <span className="group/info relative shrink-0">
          <button
            aria-label={`About ${label}`}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:border-[var(--brand)] hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1"
            type="button"
          >
            <Info aria-hidden="true" size={12} strokeWidth={2.2} />
          </button>
          <span
            className="pointer-events-none invisible absolute right-0 top-7 z-30 w-64 rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-normal leading-5 text-white opacity-0 shadow-xl transition-opacity group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100"
            role="tooltip"
          >
            {info}
          </span>
        </span>
      </div>
      <p className={cn("mt-1 text-lg font-semibold", negative ? "text-rose-700" : "text-[var(--deep)]")}>{currency ? formatCurrency(value) : value.toLocaleString("en-IN")}</p>
    </div>
  );
}

function StatCard({
  change,
  changeTone = "positive",
  formula,
  icon: Icon,
  label,
  note,
  onClick,
  tone,
  value
}: {
  change?: string;
  changeTone?: "positive" | "negative" | "neutral";
  formula?: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  note: React.ReactNode;
  onClick?: () => void;
  tone: "teal" | "sky" | "amber" | "rose" | "emerald" | "violet" | "cyan" | "slate";
  value: string;
}) {
  const toneMap: Record<string, string> = {
    amber: "darji-stat-icon bg-[#fff3de] text-[#d48500]",
    cyan: "darji-stat-icon bg-[#edf5ff] text-[#3a7cff]",
    emerald: "darji-stat-icon bg-[#ecf9ea] text-[#47a232]",
    rose: "darji-stat-icon bg-[#fff0f4] text-[#de4c72]",
    sky: "darji-stat-icon bg-[#edf5ff] text-[#3a7cff]",
    slate: "darji-stat-icon bg-slate-500/12 text-slate-700",
    teal: "darji-stat-icon bg-[#fff3de] text-[#d48500]",
    violet: "darji-stat-icon bg-[#f2edff] text-[#7b61ff]"
  };

  const content = (
      <div className="flex h-full flex-col rounded-[26px] p-4" title={formula}>
        <div className="flex items-center justify-between gap-4">
          <span className={cn("rounded-[18px] p-3 shadow-sm", toneMap[tone])}>
            <Icon size={18} />
          </span>
          {change ? <TrendPill tone={changeTone}>{change}</TrendPill> : null}
        </div>
        <div className="mt-5">
          <p className="darji-stat-label text-sm font-medium text-[#433624]">{label}</p>
          <p className="mt-1 text-[1.65rem] font-semibold tracking-tight text-[var(--deep)]">{value}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{note}</p>
        </div>
      </div>
  );

  return (
    <Panel className="p-0">
      {onClick ? (
        <button aria-label={`View records for ${label}`} className="block h-full w-full text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" onClick={onClick} type="button">
          {content}
        </button>
      ) : (
        content
      )}
    </Panel>
  );
}

function FinanceStatCard({
  label,
  note,
  tone,
  value
}: {
  label: string;
  note: string;
  onClick?: () => void;
  tone: "amber" | "emerald" | "rose" | "sky" | "violet";
  value: string;
}) {
  const toneMap: Record<string, string> = {
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300"
  };

  return (
    <Panel className="p-4">
      <div className={cn("mb-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold", toneMap[tone])}>{label}</div>
      <p className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{note}</p>
    </Panel>
  );
}

function OperationsMetricButton({
  active,
  label,
  onClick,
  tone = "neutral",
  value
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "amber" | "sky" | "violet" | "emerald" | "rose";
  value: number;
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    sky: "bg-sky-100 text-sky-800",
    violet: "bg-violet-100 text-violet-800",
    emerald: "bg-emerald-100 text-emerald-800",
    rose: "bg-rose-100 text-rose-800"
  };
  return (
    <button
      className={cn("rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", active ? "border-orange-400 ring-2 ring-orange-100" : "border-[var(--panel-border)]")}
      onClick={onClick}
      type="button"
    >
      <span className={cn("inline-flex min-w-10 items-center justify-center rounded-xl px-2.5 py-1 text-lg font-black tabular-nums", tones[tone])}>{value.toLocaleString("en-IN")}</span>
      <span className="mt-3 block text-xs font-bold text-[var(--deep)]">{label}</span>
    </button>
  );
}

function ReviewsManagementPanel({
  loading,
  onDelete,
  onToggleHidden,
  onToggleFeatured,
  pendingReviewId,
  reviews
}: {
  loading: boolean;
  onDelete: (reviewId: string) => void;
  onToggleHidden: (reviewId: string) => void;
  onToggleFeatured: (reviewId: string) => void;
  pendingReviewId?: string;
  reviews: AdminReview[];
}) {
  const [kindFilter, setKindFilter] = useState<"all" | AdminReview["kind"]>("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "hidden">("all");
  const [search, setSearch] = useState("");
  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) => {
      if (kindFilter !== "all" && review.kind !== kindFilter) return false;
      if (featuredFilter === "featured" && (!review.isFeatured || review.isHidden)) return false;
      if (featuredFilter === "hidden" && !review.isHidden) return false;
      if (!query) return true;
      return [
        review.user?.name,
        review.user?.phone,
        review.targetName,
        review.targetPhone,
        review.targetDarjiId,
        review.targetVehicleNumber,
        review.targetArea,
        review.customerAddress,
        review.orderNumber,
        review.comment,
        review.kind
      ].some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [featuredFilter, kindFilter, reviews, search]);
  const featuredCount = reviews.filter((review) => review.isFeatured).length;
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) / reviews.length : 0;

  if (loading) return <LoadingDashboard />;

  return (
    <div className="space-y-6">
      <SectionIntro
        title="Reviews"
        description="Moderate customer reviews, filter by Tailor, Delivery Partner, or Darji App, and choose which reviews appear in the customer app."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="min-h-11 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 text-sm outline-none focus:border-[var(--accent)]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reviews..."
              value={search}
            />
            <FilterSelect
              value={kindFilter}
              onChange={(value) => setKindFilter(value as typeof kindFilter)}
              options={[
                { label: "All review types", value: "all" },
                { label: "Tailor reviews", value: "tailor" },
                { label: "Delivery reviews", value: "delivery" },
                { label: "Darji app reviews", value: "app" }
              ]}
            />
            <FilterSelect
              value={featuredFilter}
              onChange={(value) => setFeaturedFilter(value as typeof featuredFilter)}
              options={[
                { label: "All visibility", value: "all" },
                { label: "Shown in app", value: "featured" },
                { label: "Moderated / hidden", value: "hidden" }
              ]}
            />
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <FinanceStatCard label="Total reviews" value={String(reviews.length)} note="All submitted reviews" tone="violet" />
        <FinanceStatCard label="Featured" value={String(featuredCount)} note="Visible in customer app" tone="emerald" />
        <FinanceStatCard label="Average rating" value={averageRating ? averageRating.toFixed(1) : "0.0"} note="Across all reviews" tone="amber" />
        <FinanceStatCard label="Filtered" value={String(filteredReviews.length)} note="Current view" tone="sky" />
      </div>
      <Panel className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] bg-[var(--panel)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-4 font-semibold">S. No.</th>
                <th className="px-4 py-4 font-semibold">Customer</th>
                <th className="px-4 py-4 font-semibold">Type</th>
                <th className="px-4 py-4 font-semibold">Review For</th>
                <th className="px-4 py-4 font-semibold">Rating</th>
                <th className="px-4 py-4 font-semibold">Review</th>
                <th className="px-4 py-4 font-semibold">Order</th>
                <th className="px-4 py-4 font-semibold">Visibility</th>
                <th className="px-4 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={9}>
                    No reviews match the current filters.
                  </td>
                </tr>
              ) : null}
              {filteredReviews.map((review, reviewIndex) => (
                <tr key={review.id} className="border-b border-[var(--panel-border)] align-top transition hover:bg-[var(--accent-soft)]">
                  <td className="px-4 py-4 font-semibold tabular-nums text-[var(--muted)]">{reviewIndex + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        alt={review.user?.name ?? "Customer avatar"}
                        className="h-10 w-10 rounded-full border border-[var(--panel-border)] object-cover"
                        src={review.user?.profileUrl || review.user?.avatarUrl || getCustomerFallbackAvatarUrl(review.user)}
                      />
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{review.user?.name ?? "Customer"}</p>
                        <p className="text-xs text-[var(--muted)]">{review.user?.phone ?? "-"}</p>
                        {review.customerAddress ? <p className="mt-1 max-w-64 text-xs leading-5 text-[var(--muted)]">{review.customerAddress}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><Badge tone={review.kind === "tailor" ? "amber" : review.kind === "delivery" ? "sky" : "violet"}>{review.kind === "app" ? "Darji App" : formatStatus(review.kind)}</Badge></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        alt={review.targetName ?? "Review target"}
                        className="h-9 w-9 rounded-full border border-[var(--panel-border)] object-cover"
                        src={review.targetAvatarUrl || getDefaultAvatarUrl(review.targetName ?? review.kind)}
                      />
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{review.targetName ?? (review.kind === "app" ? "Darji App" : "-")}</p>
                        <p className="text-xs text-[var(--muted)]">{review.targetPhone ?? "-"}</p>
                        {review.targetDarjiId ? <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{review.targetDarjiId}</p> : null}
                        {review.targetVehicleNumber ? <p className="text-xs text-[var(--muted)]">Vehicle {review.targetVehicleNumber}</p> : null}
                        {review.targetArea ? <p className="text-xs text-[var(--muted)]">Area {review.targetArea}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600"><Star size={15} fill="currentColor" /> {Number(review.rating ?? 0).toFixed(1)}</span>
                  </td>
                  <td className="max-w-md px-4 py-4 text-[var(--foreground)]">"{review.comment || "No comment"}"</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{review.orderNumber}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDate(review.createdAt, true)}</p>
                  </td>
                  <td className="px-4 py-4"><Badge tone={review.isHidden ? "rose" : review.isFeatured ? "emerald" : "slate"}>{review.isHidden ? "Moderated" : review.isFeatured ? "Featured" : "Available"}</Badge></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton className="px-3 py-2" disabled={pendingReviewId === review.id || review.isHidden} onClick={() => onToggleFeatured(review.id)} variant={review.isFeatured ? "secondary" : "primary"}>
                        {review.isFeatured ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        {review.isFeatured ? "Unfeature" : "Feature"}
                      </ActionButton>
                      <ActionButton className="px-3 py-2" disabled={pendingReviewId === review.id} onClick={() => onToggleHidden(review.id)} variant="secondary">
                        {review.isHidden ? "Restore" : "Moderate"}
                      </ActionButton>
                      <ActionButton aria-label={`Delete review ${review.id}`} className="px-3 py-2 text-rose-700" disabled={pendingReviewId === review.id} onClick={() => onDelete(review.id)} variant="secondary">
                        <Trash2 size={16} />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

type AdminAlert = {
  id: string;
  title: string;
  detail: string;
  createdAt?: string;
  tone: "amber" | "rose" | "burgundy" | "sky" | "emerald" | "violet";
  onOpen: () => void;
};

type AlertCategory = "delivery" | "order" | "payment" | "support" | "tailoring" | "other";

function getAlertCategory(alert: AdminAlert): AlertCategory {
  const key = `${alert.id} ${alert.title}`.toLowerCase();
  if (key.includes("payment") || key.includes("cod")) return "payment";
  if (key.includes("support") || key.includes("ticket")) return "support";
  if (key.includes("quote") || key.includes("tailor")) return "tailoring";
  if (key.includes("delivery") || key.includes("pickup") || key.includes("drop") || key.includes("batch")) return "delivery";
  if (key.includes("order")) return "order";
  return "other";
}

function getAlertSeverity(alert: AdminAlert) {
  if (alert.tone === "burgundy") return "critical";
  if (["rose", "amber"].includes(alert.tone)) return "warning";
  return "info";
}

function alertPriority(alert: AdminAlert) {
  return { critical: 3, warning: 2, info: 1 }[getAlertSeverity(alert)];
}

const alertToneStyles: Record<AdminAlert["tone"], { badge: string; icon: string; rail: string }> = {
  amber: {
    badge: "bg-orange-50 text-orange-700",
    icon: "bg-orange-50 text-orange-600",
    rail: "border-l-orange-500"
  },
  rose: {
    badge: "bg-red-50 text-red-600",
    icon: "bg-red-50 text-red-500",
    rail: "border-l-red-500"
  },
  burgundy: {
    badge: "bg-[#7f1d2d]/8 text-[#7f1d2d]",
    icon: "bg-[#7f1d2d]/8 text-[#7f1d2d]",
    rail: "border-l-[#7f1d2d]"
  },
  sky: {
    badge: "bg-sky-50 text-sky-700",
    icon: "bg-sky-50 text-sky-600",
    rail: "border-l-sky-500"
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-50 text-emerald-600",
    rail: "border-l-emerald-500"
  },
  violet: {
    badge: "bg-violet-50 text-violet-700",
    icon: "bg-violet-50 text-violet-600",
    rail: "border-l-violet-500"
  }
};

function getAlertIcon(alert: AdminAlert) {
  const key = `${alert.id} ${alert.title}`.toLowerCase();
  if (key.includes("quote")) return FileText;
  if (key.includes("payment")) return ReceiptIndianRupee;
  if (key.includes("support")) return MessageSquareText;
  if (key.includes("exception") || key.includes("failure") || key.includes("failed")) return AlertTriangle;
  if (key.includes("delay")) return Hourglass;
  if (key.includes("delivery") || key.includes("pickup") || key.includes("drop")) return Truck;
  if (key.includes("order") || key.includes("tailor")) return Package;
  return Bell;
}

function splitAlertDetail(detail: string) {
  const match = detail.match(/^(.+?)\s+(has\b|is\b|failed\b|from\b)(.*)$/i);
  if (!match) return { description: detail, headline: "" };
  return { description: `${match[2]}${match[3]}`, headline: match[1] };
}

function LiveAlertCard({ alert }: { alert: AdminAlert }) {
  const Icon = getAlertIcon(alert);
  const detail = splitAlertDetail(alert.detail);
  const tone = alertToneStyles[alert.tone];
  return (
    <button
      className={cn(
        "group relative flex min-h-[142px] items-center gap-3 overflow-hidden rounded-2xl border border-l-[5px] border-[var(--panel-border)] bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
        tone.rail
      )}
      onClick={alert.onOpen}
      type="button"
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", tone.icon)}>
        <Icon className="h-6 w-6" strokeWidth={2.15} />
      </span>
      <span className="min-w-0 flex-1 pr-6">
        <span className={cn("inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold", tone.badge)}>{alert.title}</span>
        {detail.headline ? <strong className="mt-2 block truncate text-sm font-bold text-[var(--deep)]" title={detail.headline}>{detail.headline}</strong> : null}
        <span className={cn("block text-sm leading-5 text-[var(--muted)]", detail.headline ? "mt-0.5" : "mt-2")}>{detail.description}</span>
        {alert.createdAt ? <span className="mt-2 block text-xs font-medium text-slate-400">Raised {formatDate(alert.createdAt, true)}</span> : null}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-700">Open related record <ArrowRight size={13} /></span>
      </span>
      <ChevronRight className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
    </button>
  );
}

function LiveAlertsWidget({ alerts, className, onViewAll }: { alerts: AdminAlert[]; className?: string; onViewAll: () => void }) {
  return (
    <Panel className={cn("h-full p-5 sm:p-6", className)}>
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 sm:h-14 sm:w-14">
            <Bell className="h-6 w-6" strokeWidth={2.3} />
          </span>
          <div className="min-w-0">
            <h3 className="text-xl font-bold tracking-[-0.025em] text-[var(--deep)] sm:text-2xl">Live Alerts</h3>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Operational exceptions that need admin attention.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <button className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-[var(--deep)] transition hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" onClick={onViewAll} type="button">
            View all
            <ArrowRight className="h-4 w-4" />
          </button>
          <span className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
            alerts.length ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"
          )}>
            <span className={cn("h-2 w-2 rounded-full", alerts.length ? "bg-orange-500" : "bg-emerald-500")} />
            {alerts.length} active
          </span>
        </div>
      </div>
      <div className="grid gap-3.5 md:grid-cols-2">
        {alerts.length ? alerts.slice(0, 6).map((alert) => <LiveAlertCard key={alert.id} alert={alert} />) : <EmptyState message="No live alerts right now." />}
      </div>
    </Panel>
  );
}

function LiveAlertsPage({ alerts, onBack }: { alerts: AdminAlert[]; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const filteredAlerts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return alerts
      .filter((alert) => !needle || `${alert.title} ${alert.detail} ${getAlertCategory(alert)}`.toLowerCase().includes(needle))
      .filter((alert) => category === "all" || getAlertCategory(alert) === category)
      .filter((alert) => severity === "all" || getAlertSeverity(alert) === severity)
      .sort((left, right) => {
        if (sortBy === "newest") return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
        if (sortBy === "oldest") return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
        if (sortBy === "title") return left.title.localeCompare(right.title);
        return alertPriority(right) - alertPriority(left)
          || new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
      });
  }, [alerts, category, search, severity, sortBy]);
  const hasFilters = Boolean(search.trim()) || category !== "all" || severity !== "all" || sortBy !== "priority";
  const severityCounts = {
    critical: alerts.filter((alert) => getAlertSeverity(alert) === "critical").length,
    warning: alerts.filter((alert) => getAlertSeverity(alert) === "warning").length,
    info: alerts.filter((alert) => getAlertSeverity(alert) === "info").length
  };

  return (
    <div className="space-y-4">
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 sm:h-14 sm:w-14">
              <Bell className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-[var(--deep)]">All Live Alerts</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Every current operational exception requiring admin attention. This list refreshes automatically.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[var(--deep)] transition hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" onClick={onBack} type="button">
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </button>
            <span className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
              alerts.length ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"
            )}>
              <span className={cn("h-2 w-2 rounded-full", alerts.length ? "bg-orange-500" : "bg-emerald-500")} />
              {alerts.length} active
            </span>
          </div>
        </div>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          { id: "critical", label: "Critical", count: severityCounts.critical, note: "Immediate intervention", className: "border-rose-200 bg-rose-50 text-rose-800" },
          { id: "warning", label: "Warning", count: severityCounts.warning, note: "Needs review soon", className: "border-orange-200 bg-orange-50 text-orange-800" },
          { id: "info", label: "Information", count: severityCounts.info, note: "Monitor and follow up", className: "border-sky-200 bg-sky-50 text-sky-800" }
        ] as const).map((item) => <button aria-pressed={severity === item.id} className={cn("rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]", item.className, severity === item.id && "ring-2 ring-[var(--accent)] ring-offset-2")} key={item.id} onClick={() => setSeverity((current) => current === item.id ? "all" : item.id)} type="button"><span className="flex items-center justify-between gap-3"><span><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs opacity-75">{item.note}</span></span><strong className="text-2xl tabular-nums">{item.count}</strong></span></button>)}
      </div>
      <Panel className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(170px,auto))_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search live alerts"
              className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-orange-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search alert, order, payment or task"
              value={search}
            />
          </label>
          <FilterSelect value={category} onChange={setCategory} options={[{ label: "All categories", value: "all" }, { label: "Delivery", value: "delivery" }, { label: "Orders", value: "order" }, { label: "Payments", value: "payment" }, { label: "Support", value: "support" }, { label: "Tailoring", value: "tailoring" }, { label: "Other", value: "other" }]} />
          <FilterSelect value={severity} onChange={setSeverity} options={[{ label: "All severities", value: "all" }, { label: "Critical", value: "critical" }, { label: "Warning", value: "warning" }, { label: "Information", value: "info" }]} />
          <FilterSelect value={sortBy} onChange={setSortBy} options={[{ label: "Priority first", value: "priority" }, { label: "Newest first", value: "newest" }, { label: "Oldest first", value: "oldest" }, { label: "A–Z", value: "title" }]} />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm font-semibold text-[var(--deep)] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!hasFilters}
            onClick={() => { setSearch(""); setCategory("all"); setSeverity("all"); setSortBy("priority"); }}
            type="button"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <span>Showing <strong className="text-[var(--deep)]">{filteredAlerts.length}</strong> of {alerts.length} active alerts</span>
          <span>Search checks alert type, reference and description.</span>
        </div>
      </Panel>
      {filteredAlerts.length ? (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filteredAlerts.map((alert) => <LiveAlertCard key={alert.id} alert={alert} />)}
        </div>
      ) : (
        <Panel className="p-8">
          <EmptyState message={alerts.length ? "No alerts match these filters." : "No live alerts right now."} />
        </Panel>
      )}
    </div>
  );
}

function TodayOperationsWidget({ className, items, onOpen, title = "Today's Operations" }: { className?: string; items: Array<{ label: string; value: string; tone: "amber" | "emerald" | "sky" | "rose" | "violet"; target: SectionId }>; onOpen: (target: SectionId) => void; title?: string }) {
  const toneStyles = {
    amber: { card: "bg-orange-50/45 hover:border-orange-200", icon: "bg-orange-50 text-orange-600", label: "text-orange-700" },
    emerald: { card: "bg-emerald-50/40 hover:border-emerald-200", icon: "bg-emerald-50 text-emerald-600", label: "text-emerald-700" },
    rose: { card: "bg-red-50/35 hover:border-red-200", icon: "bg-red-50 text-red-500", label: "text-slate-600" },
    sky: { card: "bg-sky-50/45 hover:border-sky-200", icon: "bg-sky-50 text-sky-600", label: "text-sky-700" },
    violet: { card: "bg-violet-50/40 hover:border-violet-200", icon: "bg-violet-50 text-indigo-600", label: "text-slate-600" }
  } as const;
  const getOperationIcon = (label: string) => {
    const key = label.toLowerCase();
    if (key.includes("completed")) return CheckCircle2;
    if (key.includes("stitching")) return Hourglass;
    if (key.includes("ready")) return PackageCheck;
    if (key.includes("tailor")) return Users;
    if (key.includes("partner")) return Truck;
    if (key.includes("drop")) return Package;
    return Package;
  };

  return (
    <Panel className={cn("h-full p-5 sm:p-6", className)}>
      <div className="flex items-center gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 sm:h-14 sm:w-14">
          <BarChart3 className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight tracking-[-0.02em] text-[var(--deep)] sm:text-xl">{title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Operational summary for the selected dashboard period.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = getOperationIcon(item.label);
          const tone = toneStyles[item.tone];
          return (
            <button
              key={item.label}
              className={cn(
                "group flex min-h-[104px] items-center gap-3 rounded-2xl border border-[var(--panel-border)] p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                tone.card
              )}
              onClick={() => onOpen(item.target)}
              type="button"
            >
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", tone.icon)}>
                <Icon className="h-6 w-6" strokeWidth={2.15} />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-semibold", tone.label)}>{item.label}</span>
                <strong className="mt-1 block text-2xl font-bold leading-none text-[var(--deep)]">{item.value}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function NotificationsModule({ campaigns, customers, loading, onRefresh, partners, tailors }: {
  campaigns: NotificationCampaign[];
  customers: AdminUser[];
  loading: boolean;
  onRefresh: () => void;
  partners: DeliveryPartnerProfile[];
  tailors: TailorProfile[];
}) {
  const [target, setTarget] = useState("everyone");
  const [targetUserId, setTargetUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [category, setCategory] = useState<NonNullable<NotificationCampaign["category"]>>("GENERAL_ANNOUNCEMENT");
  const [style, setStyle] = useState<NonNullable<NotificationCampaign["style"]>>("STANDARD");
  const [richEnabled, setRichEnabled] = useState(false);
  const [marks, setMarks] = useState<Array<"bold" | "italic" | "underline">>([]);
  const [bullets, setBullets] = useState(false);
  const [imageMode, setImageMode] = useState<"none" | "large" | "picture" | "both">("none");
  const [largeIconUrl, setLargeIconUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actionType, setActionType] = useState("OPEN_APP");
  const [actionEntityId, setActionEntityId] = useState("");
  const selectedPeople = target === "customer" ? customers : target === "tailor" ? tailors : target === "delivery_partner" ? partners : [];
  const isSingleTarget = ["customer", "tailor", "delivery_partner"].includes(target);
  const permittedActions = target === "tailors" || target === "tailor"
    ? [["OPEN_APP", "Open app"], ["VIEW_ASSIGNED_WORK", "View assigned work"], ["VIEW_MEASUREMENT_VISIT", "View measurement visit"], ["VIEW_TAILORING_REQUEST", "View tailoring request"]]
    : target === "delivery" || target === "delivery_partner"
      ? [["OPEN_APP", "Open app"], ["VIEW_DELIVERY_TASK", "View delivery task"], ["VIEW_BATCH", "View batch"]]
      : [["OPEN_APP", "Open app"], ["VIEW_ORDER", "View order"], ["TRACK_DELIVERY", "Track delivery"], ["VIEW_PAYMENT", "View payment"], ["VIEW_ANNOUNCEMENT", "View announcement"]];
  const requiresEntity = actionType !== "OPEN_APP" && actionType !== "VIEW_ANNOUNCEMENT";
  const richBody = richEnabled ? { blocks: message.split(/\n+/).map((text) => text.trim()).filter(Boolean).slice(0, 12).map((text) => ({ type: bullets ? "bullet" as const : "paragraph" as const, text, ...(marks.length ? { marks } : {}) })) } : undefined;
  const resetComposer = () => { setTitle(""); setMessage(""); setScheduledAt(""); setLargeIconUrl(""); setImageUrl(""); setImageMode("none"); setActionType("OPEN_APP"); setActionEntityId(""); setRichEnabled(false); setMarks([]); setBullets(false); };
  const useCampaign = (item: NotificationCampaign) => {
    setTarget(item.target); setTargetUserId(item.targetUserId ?? ""); setTitle(item.title); setMessage(item.body); setCategory(item.category ?? "GENERAL_ANNOUNCEMENT"); setStyle(item.style ?? "STANDARD"); setRichEnabled(item.bodyFormat === "RESTRICTED_RICH_TEXT"); setMarks(item.richBody?.blocks?.[0]?.marks ?? []); setBullets(item.richBody?.blocks?.[0]?.type === "bullet"); setLargeIconUrl(item.largeIconUrl ?? ""); setImageUrl(item.imageUrl ?? ""); setImageMode(item.largeIconUrl && item.imageUrl ? "both" : item.largeIconUrl ? "large" : item.imageUrl ? "picture" : "none"); setActionType(item.action?.type ?? "OPEN_APP"); setActionEntityId(item.action?.entityId ?? "");
  };
  const templates = [
    { label: "Order confirmed", title: "Your order is confirmed!", body: "Your tailoring order has been confirmed. Track its progress in Darji.", category: "ORDER_UPDATE" as const, action: "VIEW_ORDER", target: "customers" },
    { label: "Tailor selected", title: "Your tailor is selected!", body: "Your tailoring request is moving forward.", category: "TAILORING_UPDATE" as const, action: "VIEW_ASSIGNED_WORK", target: "tailors" },
    { label: "Stitching completed", title: "Your outfit is ready!", body: "Your stitching is complete. Delivery updates will follow.", category: "TAILORING_UPDATE" as const, action: "VIEW_ORDER", target: "customers" },
    { label: "Delivery update", title: "Your delivery is on the way!", body: "Track your delivery in the Darji app.", category: "DELIVERY_UPDATE" as const, action: "TRACK_DELIVERY", target: "customers" },
    { label: "Payment received", title: "Payment received!", body: "Your payment was successfully recorded.", category: "PAYMENT_UPDATE" as const, action: "VIEW_PAYMENT", target: "customers" }
  ];
  const sendMutation = useMutation({
    mutationFn: sendAdminNotification,
    onSuccess: (result) => {
      resetComposer();
      onRefresh();
      toast.success(result.campaign.status === "SCHEDULED"
        ? "Push campaign scheduled"
        : `Notification accepted by ${result.recipients} device${result.recipients === 1 ? "" : "s"}`);
    },
    onError: (error) => {
      onRefresh();
      toast.error(extractError(error));
    }
  });
  const targetCount = isSingleTarget ? (targetUserId ? 1 : 0) : target === "customers" ? customers.length : target === "tailors" ? tailors.length : target === "delivery" ? partners.length : customers.length + tailors.length + partners.length;
  const scheduleIsValid = Boolean(scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 5000);
  const canSend = Boolean(title.trim() && message.trim() && (!isSingleTarget || targetUserId) && (!requiresEntity || actionEntityId.trim()));
  const buildPayload = (sendMode: "now" | "schedule", isTest = false) => ({
    channel: "push" as const, target: target as Parameters<typeof sendAdminNotification>[0]["target"], targetUserId: isSingleTarget ? targetUserId : undefined, title: title.trim(), body: message.trim(), sendMode, scheduledAt: sendMode === "schedule" ? new Date(scheduledAt).toISOString() : null,
    payloadVersion: 1 as const, category, bodyFormat: richEnabled ? "RESTRICTED_RICH_TEXT" as const : "PLAIN_TEXT" as const, richBody, style, largeIconUrl: imageMode === "large" || imageMode === "both" ? largeIconUrl || null : null, imageUrl: imageMode === "picture" || imageMode === "both" ? imageUrl || null : null,
    action: { type: actionType, ...(requiresEntity ? { entityId: actionEntityId.trim() } : {}) }, isTest
  });
  const uploadImage = async (file: File, placement: "large" | "picture") => {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { toast.error("Choose an image under 5 MB."); return; }
    setUploadingImage(true);
    try { const uploaded = await uploadAdminMedia(file); if (placement === "large") setLargeIconUrl(uploaded.url); else setImageUrl(uploaded.url); toast.success("Notification image uploaded"); } catch (error) { toast.error(extractError(error)); } finally { setUploadingImage(false); }
  };

  return (
    <div className="space-y-6">
      <SectionIntro title="Notifications" description="Compose a safe, versioned push campaign. Delivery history records provider acceptance, not proof that a person opened it." />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Start from a template</p><div className="mt-2 flex flex-wrap gap-2">{templates.map((template) => <button className="rounded-xl border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold hover:border-orange-300 hover:bg-orange-50" key={template.label} onClick={() => { setTitle(template.title); setMessage(template.body); setCategory(template.category); setTarget(template.target); setActionType(template.action); }} type="button">{template.label}</button>)}</div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Channel"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 text-[var(--foreground)]" disabled value="Push notification" /></Field>
            <Field label="Target">
              <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={target} onChange={(event) => { setTarget(event.target.value); setActionType("OPEN_APP"); setActionEntityId(""); }}>
                <option value="everyone">Everyone</option>
                <option value="customers">Customers</option>
                <option value="tailors">Tailors</option>
                <option value="delivery">Delivery Partners</option>
                <option value="customer">One Specific Customer</option>
                <option value="tailor">One Specific Tailor</option>
                <option value="delivery_partner">One Specific Delivery Partner</option>
              </select>
            </Field>
          </div>
          {isSingleTarget ? <div className="mt-4"><Field label="Recipient">
            <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
              <option value="">Choose a recipient</option>
              {selectedPeople.map((person) => <option key={person.id} value={"userId" in person ? person.userId : person.id}>{("name" in person ? person.name : "") || ("user" in person ? person.user?.name : "") || ("shopName" in person ? person.shopName : "Partner")} - {"phone" in person ? person.phone : "darjiTailorId" in person ? person.darjiTailorId : "darjiPartnerId" in person ? person.darjiPartnerId : person.id}</option>)}
            </select>
          </Field></div> : null}
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Category"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>{[["GENERAL_ANNOUNCEMENT", "General announcement"], ["ORDER_UPDATE", "Order update"], ["TAILORING_UPDATE", "Tailoring update"], ["DELIVERY_UPDATE", "Delivery update"], ["PAYMENT_UPDATE", "Payment update"], ["PROMOTIONAL", "Promotional"], ["CUSTOM", "Custom"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Style"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={style} onChange={(event) => setStyle(event.target.value as typeof style)}>{[["STANDARD", "Standard"], ["BIG_TEXT", "Expanded text"], ["LARGE_ICON", "Large icon"], ["BIG_PICTURE", "Big picture"], ["ACTION", "Action notification"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
            <input maxLength={120} className="w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 outline-none" placeholder="Notification title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--panel-border)] bg-slate-50 p-2 text-xs"><button className={cn("rounded-lg px-3 py-2 font-bold", richEnabled && "bg-slate-950 text-white")} onClick={() => setRichEnabled((value) => !value)} type="button">Rich text</button>{(["bold", "italic", "underline"] as const).map((mark) => <button className={cn("rounded-lg px-3 py-2 capitalize", marks.includes(mark) && "bg-orange-100 font-bold text-orange-800")} disabled={!richEnabled} key={mark} onClick={() => setMarks((current) => current.includes(mark) ? current.filter((item) => item !== mark) : [...current, mark])} type="button">{mark}</button>)}<button className={cn("rounded-lg px-3 py-2", bullets && "bg-orange-100 font-bold text-orange-800")} disabled={!richEnabled} onClick={() => setBullets((value) => !value)} type="button">Bullets</button><span className="text-[var(--muted)]">Formatting is stored safely; Android receives plain text when it cannot style content.</span></div>
            <textarea maxLength={500} className="min-h-28 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 outline-none" placeholder="Message (new lines become separate rich-text blocks)" value={message} onChange={(event) => setMessage(event.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Image treatment"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={imageMode} onChange={(event) => setImageMode(event.target.value as typeof imageMode)}><option value="none">No additional image</option><option value="large">Large icon / thumbnail</option><option value="picture">Big picture</option><option value="both">Both</option></select></Field><Field label="Notification action"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={actionType} onChange={(event) => { setActionType(event.target.value); setActionEntityId(""); }}>{permittedActions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
            {(imageMode === "large" || imageMode === "both") ? <ImageUploadRow label="Large icon / thumbnail" url={largeIconUrl} uploading={uploadingImage} onClear={() => setLargeIconUrl("")} onUpload={(file) => uploadImage(file, "large")} /> : null}
            {(imageMode === "picture" || imageMode === "both") ? <ImageUploadRow label="Big picture" url={imageUrl} uploading={uploadingImage} onClear={() => setImageUrl("")} onUpload={(file) => uploadImage(file, "picture")} /> : null}
            {requiresEntity ? <input className="w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 outline-none" placeholder="Validated order, task, batch, visit, or request ID" value={actionEntityId} onChange={(event) => setActionEntityId(event.target.value)} /> : null}
            <Field label="Schedule time">
              <input className="w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 outline-none" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            </Field>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ActionButton disabled={!canSend || sendMutation.isPending} onClick={() => sendMutation.mutate(buildPayload("now"))}>
                {sendMutation.isPending && sendMutation.variables?.sendMode === "now" ? "Sending..." : "Send Now"}
              </ActionButton>
              <ActionButton variant="secondary" disabled={!canSend || !scheduleIsValid || sendMutation.isPending} onClick={() => sendMutation.mutate(buildPayload("schedule"))}>
                {sendMutation.isPending && sendMutation.variables?.sendMode === "schedule" ? "Scheduling..." : "Schedule Notification"}
              </ActionButton>
              <ActionButton variant="secondary" disabled={!canSend || !isSingleTarget || sendMutation.isPending} onClick={() => sendMutation.mutate(buildPayload("now", true))}>Send test to selected account</ActionButton>
            </div>
          </div>
        </Panel>
        <Panel>
          <h3 className="text-lg font-semibold">Android-style preview</h3>
          <div className="mt-4 rounded-3xl border border-[var(--panel-border)] bg-[#fbfdff] p-4">
            <Badge tone="sky">APPROXIMATE PREVIEW - {targetCount} potential recipients</Badge>
            <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white shadow-lg"><div className="flex gap-3">{(largeIconUrl || imageUrl) ? <img alt="" className="h-10 w-10 rounded-lg object-cover" src={largeIconUrl || imageUrl} /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500 font-black">D</div>}<div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wide text-slate-300">Darji · now</p><p className={cn("mt-1 font-bold", marks.includes("italic") && "italic", marks.includes("underline") && "underline")}>{title || "Notification title"}</p><p className={cn("mt-1 line-clamp-2 text-sm text-slate-200", marks.includes("bold") && "font-bold")}>{message || "Message preview will appear here."}</p></div></div>{imageUrl && (style === "BIG_PICTURE" || style === "ACTION") ? <img alt="Big picture preview" className="mt-3 aspect-[16/8] w-full rounded-xl object-cover" src={imageUrl} /> : null}{style === "BIG_TEXT" ? <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{message || "Expanded text preview"}</p> : null}{style === "ACTION" ? <button className="mt-3 text-xs font-bold uppercase text-orange-300" type="button">{permittedActions.find(([value]) => value === actionType)?.[1] ?? "Open app"}</button> : null}</div>
            <p className="mt-4 text-xs text-[var(--muted)]">{scheduledAt ? `Scheduled ${scheduledAt}` : "Send immediately"} · Device and Android version control the final layout.</p>
          </div>
          <h4 className="mt-5 font-semibold">Delivery history</h4>
          <div className="mt-3 space-y-2">
            {campaigns.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--panel-border)] p-3 text-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{formatStatus(item.category ?? "GENERAL_ANNOUNCEMENT")} · {formatStatus(item.style ?? "STANDARD")}{item.isTest ? " · Test" : ""}</p></div><StatusBadge value={item.status} /></div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Push to {item.target} · {item.status === "SCHEDULED" ? `Scheduled ${formatDate(item.scheduledAt, true)}` : formatDate(item.sentAt ?? item.createdAt, true)} · {item.status === "SCHEDULED"
                    ? "Waiting for scheduled delivery"
                    : item.deliveredCount == null && item.deviceCount == null
                      ? `${item.recipientCount ?? 0} recipients (legacy result)`
                      : `${item.deliveredCount ?? 0}/${item.deviceCount ?? 0} device deliveries accepted · ${item.recipientCount ?? 0} matching users`}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">Created by {item.createdByName ?? "Administrator"}</p>
                {item.error ? <p className="mt-2 text-xs font-semibold text-rose-700">{item.error}</p> : null}
                <button className="mt-2 text-xs font-bold text-orange-700 hover:underline" onClick={() => useCampaign(item)} type="button">Reuse as draft</button>
              </div>
            ))}
            {loading ? <LoadingState label="Loading campaign history..." /> : null}
            {!loading && !campaigns.length ? <EmptyState message="No push campaigns have been created yet." /> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ImageUploadRow({ label, onClear, onUpload, uploading, url }: { label: string; url: string; uploading: boolean; onClear: () => void; onUpload: (file: File) => void }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--panel-border)] p-3">{url ? <img alt={label} className="h-12 w-16 rounded-lg object-cover" src={url} /> : <ImageIcon className="h-5 w-5 text-[var(--muted)]" />}<div className="min-w-0 flex-1"><p className="text-xs font-bold">{label}</p><p className="truncate text-[11px] text-[var(--muted)]">{url || "PNG, JPG, or WebP · maximum 5 MB"}</p></div><label className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-bold hover:bg-slate-50">{uploading ? "Uploading..." : "Upload"}<input accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} /></label>{url ? <button className="text-xs font-bold text-rose-600" onClick={onClear} type="button">Remove</button> : null}</div>;
}

function AnalyticsModule({ categoryBreakdown, dashboardAnalytics, orders, payments, reviews, serviceMix }: { categoryBreakdown: Array<{ name: string; value: number; share: number }>; dashboardAnalytics: DashboardAnalytics; orders: Order[]; payments: Payment[]; reviews: AdminReview[]; serviceMix: Array<{ name: string; value: number }> }) {
  const paid = payments.filter((payment) => payment.status === "PAID");
  const customerOrderCounts = orders.reduce<Map<string, number>>((counts, order) => counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1), new Map());
  const repeatCustomers = [...customerOrderCounts.values()].filter((count) => count > 1).length;
  const avgRating = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "-";
  return (
    <div className="space-y-6">
      <SectionIntro title="Analytics" description="Reporting uses the same server-side order and realized-revenue definitions as the dashboard." action={<ActionButton variant="secondary" onClick={() => downloadCsv("darji-analytics.csv", [{ realizedNetRevenue: dashboardAnalytics.finance.netRevenue, orders: dashboardAnalytics.orders.total, paid: paid.length, repeatCustomers }])}>Export CSV</ActionButton>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinanceStatCard label="Realized Net Revenue" value={formatCurrency(dashboardAnalytics.finance.netRevenue)} note="Paid − stitching − measurement visits − delivery − packaging" tone="emerald" />
        <FinanceStatCard label="Orders" value={dashboardAnalytics.orders.total.toLocaleString("en-IN")} note="Created in selected period" tone="sky" />
        <FinanceStatCard label="Repeat Customers" value={repeatCustomers.toLocaleString("en-IN")} note="More than one loaded order" tone="violet" />
        <FinanceStatCard label="Avg Review" value={avgRating} note={`${reviews.length} reviews`} tone="amber" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h3 className="text-lg font-semibold">Top Categories</h3>
          <div className="mt-4 space-y-3">
            {categoryBreakdown.map((item) => <MetricChip key={item.name} label={`${item.name} (${item.share}%)`} value={`${item.value} orders`} />)}
          </div>
        </Panel>
        <Panel>
          <h3 className="text-lg font-semibold">Growth Snapshot</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(dashboardAnalytics.series.growth.slice(-3).length ? dashboardAnalytics.series.growth.slice(-3) : [{ label: "Now", customers: 0, tailors: 0, partners: 0 }]).map((point) => (
              <div key={point.label} className="rounded-2xl border border-[var(--panel-border)] p-4">
                <p className="font-semibold">{point.label}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">Customers {point.customers} - Tailors {point.tailors} - Partners {point.partners}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel>
        <h3 className="text-lg font-semibold">Service Mix</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {serviceMix.map((item) => <MetricChip key={item.name} label={item.name} value={String(item.value)} />)}
        </div>
      </Panel>
    </div>
  );
}

function ActivityLogsModule({ loading, logs }: { loading: boolean; logs: AdminActivityLog[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AdminActivityLog["category"] | "ALL">("ALL");
  const [selectedLog, setSelectedLog] = useState<AdminActivityLog | null>(null);
  const categories: Array<{ value: AdminActivityLog["category"] | "ALL"; label: string }> = [
    { value: "ALL", label: "All activity" }, { value: "ACCESS", label: "Access" }, { value: "ORDERS", label: "Orders" },
    { value: "OPERATIONS", label: "Operations" }, { value: "PEOPLE", label: "People" }, { value: "FINANCE", label: "Finance" },
    { value: "SUPPORT", label: "Support" }, { value: "CONFIGURATION", label: "Configuration" }, { value: "OTHER", label: "Other" }
  ];
  const needle = search.trim().toLowerCase();
  const rows = logs.filter((row) => {
    const matchesSearch = !needle || [row.actorName, row.actorPhone, row.actorRole, row.actorId, row.action, row.summary, row.method, row.path, row.entityType, row.entityId, row.ipAddress].some((value) => String(value ?? "").toLowerCase().includes(needle));
    return matchesSearch && (category === "ALL" || (row.category ?? "OTHER") === category);
  });
  const categoryTone = (value?: AdminActivityLog["category"]) => value === "ACCESS" ? "sky" : value === "ORDERS" ? "amber" : value === "OPERATIONS" ? "violet" : value === "PEOPLE" ? "teal" : value === "FINANCE" ? "emerald" : value === "SUPPORT" ? "rose" : value === "CONFIGURATION" ? "cyan" : "slate";
  return (
    <div className="space-y-6">
      <SectionIntro title="Activity Logs" description="Immutable records of successful admin actions. Request bodies and secrets are intentionally excluded." action={<div className="flex gap-2"><input aria-label="Search activity logs" className="h-10 min-w-[240px] rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]" onChange={(event) => setSearch(event.target.value)} placeholder="Search admin, action or IP" value={search} /><ActionButton onClick={() => downloadCsv("darji-admin-activity.csv", rows.map((row) => ({ "Date and time": formatDate(row.createdAt, true), Category: row.category ?? "OTHER", Action: row.action ?? row.summary, Admin: row.actorName ?? row.actorRole, Phone: row.actorPhone ?? "", "Admin ID": row.actorId, Target: row.entityId ?? "", IP: row.ipAddress ?? "", Route: row.path }))) } variant="secondary">Export CSV</ActionButton></div>} />
      <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button className={cn("whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition", category === item.value ? "border-[var(--deep)] bg-[var(--deep)] text-white" : "border-[var(--panel-border)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--accent)]")} key={item.value} onClick={() => setCategory(item.value)} type="button">{item.label}</button>)}</div>
      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr><th className="px-4 py-3">S. No.</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Timestamp</th></tr>
            </thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={row.id} className="border-b border-[var(--panel-border)]"><td className="px-4 py-3 font-semibold tabular-nums text-[var(--muted)]">{rowIndex + 1}</td><td className="px-4 py-3"><p className="font-semibold">{row.actorName || row.actorRole}</p><p className="text-xs text-[var(--muted)]">{row.actorId}</p></td><td className="px-4 py-3"><p>{formatStatus(row.entityType ?? "Admin action")}</p><p className="text-xs text-[var(--muted)]">{row.entityId ?? "—"}</p></td><td className="px-4 py-3"><Badge tone={row.method === "DELETE" ? "rose" : row.method === "POST" ? "emerald" : "sky"}>{row.method}</Badge></td><td className="px-4 py-3 text-xs">{row.path}</td><td className="px-4 py-3">{formatDate(row.createdAt, true)}</td></tr>)}</tbody>
          </table>
        </div>
        {loading ? <LoadingState label="Loading activity logs..." /> : null}
        {!loading && !rows.length ? <EmptyState message={needle ? "No activity matches this search." : "No admin mutations have been recorded yet."} /> : null}
      </Panel>
      {!loading && rows.length ? <Panel><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Action details</h3><p className="text-sm text-[var(--muted)]">Open an entry to see the actor, linked record, IP address, device and change payload.</p></div><Badge tone="slate">{rows.length} shown</Badge></div><div className="mt-4 grid gap-3">{rows.slice(0, 30).map((row) => <button className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--panel-border)] bg-[#fffdfa] p-4 text-left transition hover:border-[var(--accent)] hover:bg-[#fff7e8]" key={`detail-${row.id}`} onClick={() => setSelectedLog(row)} type="button"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge tone={categoryTone(row.category)}>{formatStatus(row.category ?? "OTHER")}</Badge><span className="font-semibold">{row.action || row.summary}</span></div><p className="mt-1 truncate text-sm text-[var(--muted)]">{row.actorName || row.actorRole}{row.actorPhone ? ` - ${row.actorPhone}` : ""} - {formatDate(row.createdAt, true)}</p></div><span className="shrink-0 text-sm font-semibold text-[var(--accent)]">View</span></button>)}</div></Panel> : null}
      {selectedLog ? <Dialog.Root open onOpenChange={(open) => { if (!open) setSelectedLog(null); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-semibold">Activity details</Dialog.Title><Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Immutable audit information for this admin action.</Dialog.Description></div><Dialog.Close className="rounded-xl p-2 text-xl text-[var(--muted)] hover:bg-[var(--accent-soft)]">x</Dialog.Close></div><div className="mt-5 flex flex-wrap gap-2"><Badge tone={categoryTone(selectedLog.category)}>{formatStatus(selectedLog.category ?? "OTHER")}</Badge><Badge tone={selectedLog.method === "DELETE" ? "rose" : "sky"}>{selectedLog.method}</Badge></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><DetailBox label="Action" value={selectedLog.action || selectedLog.summary} /><DetailBox label="When" value={formatDate(selectedLog.createdAt, true)} /><DetailBox label="Admin" note={selectedLog.actorId} value={selectedLog.actorName || selectedLog.actorRole} /><DetailBox label="Phone" value={selectedLog.actorPhone || "Not recorded"} /><DetailBox label="Target" note={selectedLog.entityId} value={formatStatus(selectedLog.entityType ?? "Admin action")} /><DetailBox label="Client IP" value={selectedLog.ipAddress || "Not captured"} /><DetailBox label="Route" value={selectedLog.path} /><DetailBox label="HTTP status" value={String(selectedLog.statusCode)} /></div>{selectedLog.userAgent ? <div className="mt-3"><DetailBox label="Device" value={selectedLog.userAgent} /></div> : null}{selectedLog.metadata ? <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-[#101827] p-4 text-xs text-slate-100">{JSON.stringify(selectedLog.metadata, null, 2)}</pre> : null}</Dialog.Content></Dialog.Portal></Dialog.Root> : null}
    </div>
  );
}

function FinanceBreakdownItem({ emphasized = false, label, onClick, tone = "income", value }: {
  emphasized?: boolean;
  label: string;
  onClick?: () => void;
  tone?: "income" | "cost";
  value: number;
}) {
  const content = (
    <div className={cn("bg-[var(--panel)] px-5 py-4", emphasized && "bg-[#fff6df]") } title={emphasized ? "Realized Net Revenue = completed-order Gross Paid − stitching payout − measurement-visit payout − finalized Delivery Payout − Packaging Cost" : undefined}>
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums text-[var(--deep)]", tone === "cost" && "text-rose-700", emphasized && "text-2xl text-emerald-700")}>
        {tone === "cost" ? "−" : ""}{formatCurrency(value)}
      </p>
    </div>
  );
  return onClick ? <button aria-label={`View records for ${label}`} className="block w-full text-left transition hover:bg-[var(--accent-soft)]" onClick={onClick} type="button">{content}</button> : content;
}

function matchesOrderSearch(order: Order, rawQuery: string) {
  const normalize = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const query = normalize(rawQuery);
  if (!query) return true;
  const fields = [
    order.orderNumber,
    order.darjiId,
    order.id,
    order.customer?.darjiCustomerId,
    order.customer?.name,
    order.customer?.phone,
    order.tailor?.shopName,
    order.tailor?.user?.name,
    order.tailor?.darjiTailorId,
    order.deliveryPartner?.user?.name,
    order.deliveryPartner?.user?.phone,
    order.deliveryPartner?.darjiPartnerId,
    order.pickupPartner?.user?.name,
    order.pickupPartner?.user?.phone,
    order.pickupPartner?.darjiPartnerId
  ].filter(Boolean).map(normalize);
  const tokens = query.split(" ").filter(Boolean);
  const compactQuery = query.replace(/[^a-z0-9]/g, "");
  const compactIdentifiers = fields.map((field) => field.replace(/[^a-z0-9]/g, ""));
  return tokens.every((token) => fields.some((field) => field.includes(token))) ||
    (compactQuery.length >= 4 && compactIdentifiers.some((field) => field.includes(compactQuery)));
}

function OrdersManagementView({
  analyticsCounts,
  allOrders,
  categories,
  columns,
  deliveryPartnerFilter,
  deliveryPartners,
  drilldownNotice,
  filteredOrders,
  onCategoryChange,
  onCreate,
  onDateChange,
  onDeliveryPartnerChange,
  onExport,
  onBulkPriority,
  onOpen,
  onPaymentMethodChange,
  onPaymentStatusChange,
  onReset,
  onSearchChange,
  onStatusChange,
  onSummaryChange,
  onTailorChange,
  orderCategoryFilter,
  orderDateFilter,
  orderFilter,
  orderPaymentStatusFilter,
  orderSearch,
  orderTailorFilter,
  paymentFilter,
  tailors
}: {
  analyticsCounts?: { total: number; pending: number; active: number; completed: number; cancelled: number };
  allOrders: Order[];
  categories: string[];
  columns: Array<ColumnDef<Order>>;
  deliveryPartnerFilter: string;
  deliveryPartners: DeliveryPartnerProfile[];
  drilldownNotice?: React.ReactNode;
  filteredOrders: Order[];
  onCategoryChange: (value: string) => void;
  onCreate: () => void;
  onDateChange: (value: string) => void;
  onDeliveryPartnerChange: (value: string) => void;
  onExport: () => void;
  onBulkPriority: (orders: Order[], priority: AdminOrderPriority) => void;
  onOpen: (order: Order, focus?: OrderDetailFocus) => void;
  onPaymentMethodChange: (value: string) => void;
  onPaymentStatusChange: (value: string) => void;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onTailorChange: (value: string) => void;
  orderCategoryFilter: string;
  orderDateFilter: string;
  orderFilter: string;
  orderPaymentStatusFilter: string;
  orderSearch: string;
  orderTailorFilter: string;
  paymentFilter: string;
  tailors: TailorProfile[];
}) {
  const loadedCounts = {
    pending: allOrders.filter((order) => classifyDashboardOrderStatus(order.status) === "pending").length,
    progress: allOrders.filter((order) => classifyDashboardOrderStatus(order.status) === "active").length,
    completed: allOrders.filter((order) => classifyDashboardOrderStatus(order.status) === "completed").length,
    cancelled: allOrders.filter((order) => classifyDashboardOrderStatus(order.status) === "cancelled").length
  };
  const counts = analyticsCounts ? {
    pending: analyticsCounts.pending,
    progress: analyticsCounts.active,
    completed: analyticsCounts.completed,
    cancelled: analyticsCounts.cancelled
  } : loadedCounts;
  const authoritativeTotal = analyticsCounts?.total ?? allOrders.length;
  const total = Math.max(authoritativeTotal, 1);
  const statusTabs = [
    { label: "All Orders", value: "", count: authoritativeTotal, tone: "text-orange-500 border-orange-500" },
    { label: "Pending", value: "__PENDING__", count: counts.pending, tone: "text-blue-600 border-blue-600" },
    { label: "Active", value: "__ACTIVE__", count: counts.progress, tone: "text-blue-600 border-blue-600" },
    { label: "Completed", value: "__COMPLETED__", count: counts.completed, tone: "text-emerald-600 border-emerald-600" },
    { label: "Cancelled", value: "__CANCELLED__", count: counts.cancelled, tone: "text-rose-600 border-rose-600" },
    { label: "Resolved", value: "__RESOLVED__", count: counts.completed + counts.cancelled, tone: "text-violet-600 border-violet-600" }
  ];

  return (
    <div className="space-y-5">
      {drilldownNotice}
      <div className="flex flex-col gap-4 px-1 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Package className="text-[var(--deep)]" size={25} />
            <h2 className="text-[1.75rem] font-bold tracking-tight text-[var(--deep)]">Orders</h2>
          </div>
          <p className="mt-1.5 text-sm text-[var(--muted)]">Manage orders, assignments and deliveries from one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton className="min-h-11 rounded-xl px-5" variant="secondary" onClick={onExport}>
            <Download size={16} /> Export Excel
          </ActionButton>
          <ActionButton className="min-h-11 rounded-xl bg-gradient-to-r from-[#ffad16] to-[#ff8500] px-5 text-white shadow-[0_10px_24px_rgba(255,145,0,0.2)]" onClick={onCreate}>
            <Plus size={17} /> Create Order
          </ActionButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <OrderSummaryCard icon={Package} label="Total Orders" value={authoritativeTotal} note="100% of selected period" tone="amber" selected={!orderFilter} onClick={() => onSummaryChange("")} />
        <OrderSummaryCard icon={RotateCcw} label="Pending" value={counts.pending} note={`${((counts.pending / total) * 100).toFixed(1)}% pending`} tone="sky" selected={orderFilter === "__PENDING__"} onClick={() => onSummaryChange("__PENDING__")} />
        <OrderSummaryCard icon={Hourglass} label="In Progress" value={counts.progress} note={`${((counts.progress / total) * 100).toFixed(1)}% active`} tone="violet" selected={orderFilter === "__ACTIVE__"} onClick={() => onSummaryChange("__ACTIVE__")} />
        <OrderSummaryCard icon={CheckCircle2} label="Completed" value={counts.completed} note={`${((counts.completed / total) * 100).toFixed(1)}% completed`} tone="emerald" selected={orderFilter === "__COMPLETED__"} onClick={() => onSummaryChange("__COMPLETED__")} />
        <OrderSummaryCard icon={X} label="Cancelled" value={counts.cancelled} note={`${((counts.cancelled / total) * 100).toFixed(1)}% cancelled`} tone="rose" selected={orderFilter === "__CANCELLED__"} onClick={() => onSummaryChange("__CANCELLED__")} />
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="space-y-3 p-4 lg:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_repeat(4,1fr)]">
            <OrderSearchInput value={orderSearch} onChange={onSearchChange} />
            <FilterSelect value={orderFilter.startsWith("__") ? "" : orderFilter} onChange={onStatusChange} options={[{ label: "All Statuses", value: "" }, ...orderStatuses.map((status) => ({ label: status === "ORDER_PLACED" ? "Order Placed (includes assigned pickup)" : formatStatus(status), value: status }))]} />
            <FilterSelect value={orderCategoryFilter} onChange={onCategoryChange} options={[{ label: "All Categories", value: "" }, ...categories.map((category) => ({ label: category, value: category }))]} />
            <FilterSelect value={deliveryPartnerFilter} onChange={onDeliveryPartnerChange} options={[{ label: "All Delivery Partners", value: "" }, ...deliveryPartners.map((partner) => ({ label: getPartnerDisplayName(partner), value: partner.id }))]} />
            <FilterSelect value={paymentFilter} onChange={onPaymentMethodChange} options={[{ label: "All Payment Methods", value: "" }, { label: "COD", value: "COD" }, { label: "Online", value: "ONLINE" }, { label: "UPI", value: "UPI" }]} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
            <FilterSelect value={orderTailorFilter} onChange={onTailorChange} options={[{ label: "All Tailors", value: "" }, ...tailors.map((tailor) => ({ label: getTailorDisplayName(tailor), value: tailor.id }))]} />
            <FilterSelect value={orderPaymentStatusFilter} onChange={onPaymentStatusChange} options={[{ label: "All Payment Status", value: "" }, { label: "Paid", value: "PAID" }, { label: "Pending", value: "PENDING" }, { label: "Failed", value: "FAILED" }, { label: "Refunded", value: "REFUNDED" }]} />
            <label className="relative flex h-12 items-center rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--foreground)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)]">
              <CalendarDays className="mr-3 text-[var(--muted)]" size={16} />
              <input aria-label="Order date" className="h-full min-w-0 flex-1 cursor-pointer bg-transparent text-sm text-[var(--foreground)] outline-none [color-scheme:light]" type="date" value={orderDateFilter} onChange={(event) => onDateChange(event.target.value)} />
            </label>
            <ActionButton className="h-12 rounded-xl px-5" variant="secondary" onClick={onReset}><RotateCcw size={16} /> Reset</ActionButton>
          </div>
        </div>
        <div className="flex gap-7 overflow-x-auto border-t border-[var(--panel-border)] px-4 lg:px-5">
          {statusTabs.map((tab) => {
            const selected = orderFilter === tab.value;
            return <button key={tab.label} className={cn("flex shrink-0 items-center gap-2 border-b border-transparent py-3.5 text-sm font-semibold transition", selected ? tab.tone : "text-[var(--muted)] hover:text-[var(--foreground)]")} onClick={() => onStatusChange(tab.value)} type="button">{tab.label}<span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{tab.count}</span></button>;
          })}
        </div>
      </Panel>

      <OrdersTable columns={columns} data={filteredOrders} emptyMessage="No orders match the current filters." onBulkPriority={onBulkPriority} onOpen={(order) => onOpen(order, "overview")} />
    </div>
  );
}

function OrderSearchInput({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} /><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" onChange={(event) => onChange(event.target.value)} placeholder="Order ID, customer or phone" value={value} /></div>;
}

function OrderSummaryCard({ icon: Icon, label, note, onClick, selected, tone, value }: { icon: ComponentType<{ size?: number }>; label: string; note: string; onClick: () => void; selected: boolean; tone: "amber" | "sky" | "violet" | "emerald" | "rose"; value: number }) {
  const tones = { amber: "bg-orange-50 text-orange-500", sky: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600", rose: "bg-rose-50 text-rose-600" };
  return <button aria-label={`Show ${label.toLowerCase()}`} aria-pressed={selected} className={cn("rounded-2xl border-2 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2", selected ? "border-[var(--accent)] shadow-[0_8px_22px_rgba(255,145,0,0.16)]" : "border-transparent")} onClick={onClick} type="button"><Panel className="h-full rounded-2xl p-4"><div className="flex items-center gap-4"><span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-full", tones[tone])}><Icon size={24} /></span><div><p className={cn("text-xs font-semibold", tones[tone].split(" ")[1])}>{label}</p><p className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--deep)]">{value.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-[var(--muted)]">{note}</p></div></div></Panel></button>;
}

function OrdersTable({ columns, data, emptyMessage, onBulkPriority, onOpen }: { columns: Array<ColumnDef<Order>>; data: Order[]; emptyMessage: string; onBulkPriority: (orders: Order[], priority: AdminOrderPriority) => void; onOpen: (order: Order) => void }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const tableTopRef = useRef<HTMLDivElement>(null);
  const table = useReactTable({ columns, data, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), onSortingChange: setSorting, state: { sorting } });
  const rows = table.getRowModel().rows;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const visiblePageCount = Math.min(5, pageCount);
  const firstVisiblePage = Math.max(0, Math.min(safePage - 2, pageCount - visiblePageCount));
  const visiblePages = Array.from({ length: visiblePageCount }, (_, index) => firstVisiblePage + index);
  useEffect(() => setPage(0), [data, pageSize]);
  useEffect(() => setSelectedIds((current) => new Set([...current].filter((id) => data.some((order) => order.id === id)))), [data]);
  const selectedOrders = data.filter((order) => selectedIds.has(order.id));
  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const toggleSelected = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const goToPage = (nextPage: number) => {
    setPage(Math.max(0, Math.min(nextPage, pageCount - 1)));
    requestAnimationFrame(() => tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const statusRail = (status: string) => {
    const value = status.toUpperCase();
    if (["CANCELLED", "FAILED"].includes(value)) return "#fb7185";
    if (["DELIVERED", "COMPLETED"].includes(value)) return "#86efac";
    if (["ORDER_PLACED", "PAYMENT_PENDING", "PENDING"].includes(value)) return "#7dd3fc";
    return "#c4b5fd";
  };

  const activateRow = (event: React.MouseEvent | React.KeyboardEvent, order: Order) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [role='menuitem']")) return;
    onOpen(order);
  };

  return <Panel className="max-w-full overflow-hidden rounded-2xl p-0">{selectedOrders.length ? <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200 bg-orange-50 px-4 py-3"><p className="text-sm font-semibold text-orange-950">{selectedOrders.length} order{selectedOrders.length === 1 ? "" : "s"} selected</p><div className="flex flex-wrap gap-2"><ActionButton className="px-3 py-2 text-xs" variant="secondary" onClick={() => onBulkPriority(selectedOrders, "Normal")}>Normal</ActionButton><ActionButton className="px-3 py-2 text-xs" variant="secondary" onClick={() => onBulkPriority(selectedOrders, "High")}><Flag size={14} /> High</ActionButton><ActionButton className="px-3 py-2 text-xs" variant="secondary" onClick={() => onBulkPriority(selectedOrders, "Urgent")}><AlertTriangle size={14} /> Urgent</ActionButton><ActionButton className="px-3 py-2 text-xs" variant="secondary" onClick={() => onBulkPriority(selectedOrders, "VIP")}><Star size={14} /> VIP</ActionButton><ActionButton className="px-3 py-2 text-xs" variant="secondary" onClick={() => setSelectedIds(new Set())}>Clear</ActionButton></div></div> : null}<div className="scroll-mt-24 max-h-[68vh] overflow-auto overscroll-contain" ref={tableTopRef}><table className="w-full min-w-[1220px] text-left text-xs"><thead className="sticky top-0 z-20 bg-[#fffcf7] text-[11px] text-amber-900/70 shadow-[0_1px_0_rgba(226,215,196,0.95)]">{table.getHeaderGroups().map((group) => <tr key={group.id}><th className="bg-[#fffcf7] px-3 py-3.5"><input aria-label="Select all filtered orders" checked={allSelected} onChange={() => setSelectedIds(allSelected ? new Set() : new Set(data.map((order) => order.id)))} type="checkbox" /></th><th className="whitespace-nowrap bg-[#fffcf7] px-3 py-3.5 font-semibold">S. No.</th>{group.headers.map((header) => <th className="whitespace-nowrap bg-[#fffcf7] px-3 py-3.5 font-semibold" key={header.id}><button className="inline-flex items-center gap-1.5" onClick={() => header.column.getCanSort() && header.column.toggleSorting(header.column.getIsSorted() === "asc")} type="button">{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getCanSort() ? <ChevronDown size={12} /> : null}</button></th>)}</tr>)}</thead><tbody>{!pageRows.length ? <tr><td className="px-4 py-14 text-center text-[var(--muted)]" colSpan={columns.length + 2}>{emptyMessage}</td></tr> : pageRows.map((row, rowIndex) => <tr aria-label={`Open order ${getOrderDisplayNumber(row.original)}`} className={cn("cursor-pointer border-t border-l-[3px] border-[var(--panel-border)] align-middle transition hover:bg-orange-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 focus-visible:outline-offset-[-2px]", selectedIds.has(row.original.id) ? "bg-orange-50/70" : "bg-white")} key={row.id} onClick={(event) => activateRow(event, row.original)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") activateRow(event, row.original); }} role="button" style={{ borderLeftColor: statusRail(row.original.status) }} tabIndex={0}><td className="px-3 py-3"><input aria-label={`Select ${getOrderDisplayNumber(row.original)}`} checked={selectedIds.has(row.original.id)} onChange={() => toggleSelected(row.original.id)} type="checkbox" /></td><td className="px-3 py-3 align-middle font-semibold tabular-nums text-[var(--muted)]">{safePage * pageSize + rowIndex + 1}</td>{row.getVisibleCells().map((cell) => <td className="px-3 py-3 align-middle" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div><div className="flex flex-col gap-3 border-t border-[var(--panel-border)] bg-[#fffefa] px-4 py-3.5 text-xs sm:flex-row sm:items-center sm:justify-between"><p className="text-[var(--muted)]">Showing {rows.length ? safePage * pageSize + 1 : 0} to {Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length} orders</p><div className="flex flex-wrap items-center gap-1.5"><button className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--panel-border)] bg-white disabled:opacity-40" disabled={safePage === 0} onClick={() => goToPage(safePage - 1)} type="button"><ChevronRight className="rotate-180" size={15} /></button>{visiblePages.map((index) => <button className={cn("h-8 min-w-8 rounded-lg px-2 font-semibold", safePage === index ? "bg-orange-500 text-white shadow-sm" : "text-amber-950 hover:bg-orange-50")} key={index} onClick={() => goToPage(index)} type="button">{index + 1}</button>)}<button className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--panel-border)] bg-white disabled:opacity-40" disabled={safePage >= pageCount - 1} onClick={() => goToPage(safePage + 1)} type="button"><ChevronRight size={15} /></button><select aria-label="Rows per page" className="ml-2 h-8 rounded-lg border border-[var(--panel-border)] bg-white px-2" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option></select></div></div></Panel>;
}

function SampleWorkModule({
  tailors,
  pending,
  onReview
}: {
  tailors: TailorProfile[];
  pending: boolean;
  onReview: (tailorId: string, sampleId: string, status: "APPROVED" | "REJECTED") => void;
}) {
  const [selectedTailorId, setSelectedTailorId] = useState<string | null>(null);
  const tailorQueues = tailors
    .map((tailor) => {
      const samples = tailor.sampleGallery ?? [];
      return {
        tailor,
        samples,
        pendingCount: samples.filter((sample) => sample.status === "PENDING").length,
        approvedCount: samples.filter((sample) => sample.status === "APPROVED").length,
        rejectedCount: samples.filter((sample) => sample.status === "REJECTED").length,
        latestAt: samples.reduce<string | undefined>((latest, sample) => {
          if (!sample.uploadedAt) return latest;
          if (!latest || new Date(sample.uploadedAt).getTime() > new Date(latest).getTime()) return sample.uploadedAt;
          return latest;
        }, undefined)
      };
    })
    .filter((item) => item.samples.length > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount || new Date(b.latestAt ?? 0).getTime() - new Date(a.latestAt ?? 0).getTime());
  const selectedQueue = tailorQueues.find((item) => item.tailor.id === selectedTailorId) ?? null;
  const allSamples = tailorQueues.flatMap((item) => item.samples);
  const pendingSamples = allSamples.filter((sample) => sample.status === "PENDING");

  return (
    <div className="space-y-6">
      <SectionIntro
        title="Sample Work Verification"
        description={selectedQueue ? "Review this tailor account's submitted sample photos." : "Open a tailor account to review submitted sample photos."}
        action={selectedQueue ? <ActionButton variant="secondary" onClick={() => setSelectedTailorId(null)}>Back to Tailors</ActionButton> : undefined}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel><Badge tone="amber">{pendingSamples.length} pending</Badge><p className="mt-3 font-semibold">Waiting for review</p></Panel>
        <Panel><Badge tone="emerald">{allSamples.filter((sample) => sample.status === "APPROVED").length} approved</Badge><p className="mt-3 font-semibold">Visible to customers</p></Panel>
        <Panel><Badge tone="rose">{allSamples.filter((sample) => sample.status === "REJECTED").length} rejected</Badge><p className="mt-3 font-semibold">Hidden from profiles</p></Panel>
      </div>

      {selectedQueue ? (
        <Panel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--panel-border)] pb-5">
            <div>
              <h3 className="text-xl font-semibold">{selectedQueue.tailor.shopName ?? selectedQueue.tailor.user?.name ?? "Tailor"}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">+91 {selectedQueue.tailor.user?.phone ?? "Unknown"} · {selectedQueue.tailor.darjiTailorId ?? selectedQueue.tailor.id}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{formatList(selectedQueue.tailor.specialization) || "Custom tailoring"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="amber">{selectedQueue.pendingCount} pending</Badge>
              <Badge tone="emerald">{selectedQueue.approvedCount} approved</Badge>
              <Badge tone="rose">{selectedQueue.rejectedCount} rejected</Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...selectedQueue.samples].sort((a, b) => (a.status === "PENDING" ? -1 : 0) - (b.status === "PENDING" ? -1 : 0)).map((sample, index) => {
              const sampleId = sample.id ?? sample._id;
              return (
                <div key={`${selectedQueue.tailor.id}-${sampleId ?? sample.url}`} className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] dark:bg-white/5">
                  <a href={sample.url} target="_blank" rel="noreferrer">
                    <img alt={`Sample ${index + 1}`} className="h-44 w-full object-cover" src={sample.url} />
                  </a>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{sample.originalName ?? `Sample ${index + 1}`}</p>
                      <StatusBadge value={sample.status} />
                    </div>
                    <p className="text-xs text-[var(--muted)]">Uploaded {formatDate(sample.uploadedAt, true)}</p>
                    {sampleId ? (
                      <div className="grid grid-cols-2 gap-2">
                        {sample.status !== "APPROVED" ? (
                          <ActionButton className="px-3 py-2 text-xs" disabled={pending} onClick={() => onReview(selectedQueue.tailor.id, sampleId, "APPROVED")}>Approve</ActionButton>
                        ) : null}
                        {sample.status !== "REJECTED" ? (
                          <ActionButton className="px-3 py-2 text-xs" disabled={pending} variant="danger" onClick={() => onReview(selectedQueue.tailor.id, sampleId, "REJECTED")}>
                            {sample.status === "APPROVED" ? "Remove" : "Reject"}
                          </ActionButton>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : (
        <Panel>
          {tailorQueues.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {tailorQueues.map(({ tailor, samples, pendingCount, approvedCount, rejectedCount, latestAt }) => (
                <button
                  key={tailor.id}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-4 text-left transition hover:border-[var(--accent)] hover:shadow-sm dark:bg-white/5"
                  onClick={() => setSelectedTailorId(tailor.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{tailor.shopName ?? tailor.user?.name ?? "Tailor"}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">+91 {tailor.user?.phone ?? "Unknown"} · {tailor.darjiTailorId ?? tailor.id}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{formatList(tailor.specialization) || "Custom tailoring"}</p>
                    </div>
                    {pendingCount ? <Badge tone="amber">{pendingCount} pending</Badge> : <Badge tone="slate">No pending</Badge>}
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                    <MetricChip label="Photos" value={String(samples.length)} />
                    <MetricChip label="Approved" value={String(approvedCount)} />
                    <MetricChip label="Rejected" value={String(rejectedCount)} />
                    <MetricChip label="Latest" value={latestAt ? formatDate(latestAt) : "-"} />
                  </div>
                </button>
              ))}
            </div>

          ) : (
          <div className="py-12 text-center">
            <ImageIcon className="mx-auto text-[var(--muted)]" size={36} />
            <p className="mt-3 font-semibold">No sample photos submitted yet</p>
          </div>
          )}
        </Panel>
      )}
    </div>
  );
}

const PROTECTED_ADMIN_PHONE = "9971416471";

function RolesModule({
  admins,
  pendingInvite,
  pendingDelete,
  onInvite,
  onDelete
}: {
  admins: AdminUser[];
  pendingInvite: boolean;
  pendingDelete: boolean;
  onInvite: (phone: string) => void;
  onDelete: (userId: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const rows = admins;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Enter a valid admin phone number");
      return;
    }
    onInvite(cleanPhone);
    setPhone("");
  }

  return (
    <div className="space-y-6">
      <SectionIntro title="Admin Accounts" description="Every phone number in this list has full dashboard access. Numbers not listed here cannot log in." />
      <Panel>
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submit}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Phone number</label>
            <input
              className="mt-2 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4 py-3 font-semibold outline-none dark:bg-white/5"
              inputMode="tel"
              placeholder="Enter admin phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <ActionButton className="self-end" disabled={pendingInvite} type="submit">
            <UserRoundPlus size={16} /> Grant Full Access
          </ActionButton>
        </form>
      </Panel>
      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr><th className="px-4 py-3">S. No.</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((admin, adminIndex) => {
                const protectedOwner = admin.phone === PROTECTED_ADMIN_PHONE;
                return (
                  <tr key={admin.id} className="border-b border-[var(--panel-border)]">
                    <td className="px-4 py-3 font-semibold tabular-nums text-[var(--muted)]">{adminIndex + 1}</td>
                    <td className="px-4 py-3 font-semibold">+91 {admin.phone}</td>
                    <td className="px-4 py-3"><Badge tone={protectedOwner ? "amber" : "emerald"}>{protectedOwner ? "Full access · Owner" : "Full access"}</Badge></td>
                    <td className="px-4 py-3"><StatusBadge value={admin.accountStatus ?? "ACTIVE"} /></td>
                    <td className="px-4 py-3">
                      <ActionButton
                        className="px-3 py-2 text-xs"
                        disabled={pendingDelete || protectedOwner || admin.id === "protected-owner"}
                        variant="danger"
                        onClick={() => {
                          if (!protectedOwner && window.confirm(`Remove admin access for +91 ${admin.phone}?`)) onDelete(admin.id);
                        }}
                      >
                        Remove
                      </ActionButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function SystemHealthModule({ error, health, loading, onRetry }: { error?: string; health?: SystemHealth; loading: boolean; onRetry: () => void }) {
  return (
    <div className="space-y-6">
      <SectionIntro title="System Health" description={health ? `Backend configuration and live connection status checked ${formatDate(health.checkedAt, true)}.` : "Backend configuration and live connection status."} action={<ActionButton disabled={loading} onClick={onRetry} variant="secondary">{loading ? "Checking..." : "Check again"}</ActionButton>} />
      {error ? <InlineError message={error} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {health?.checks.map((check) => <Panel key={check.key}><Badge tone={check.status === "healthy" ? "emerald" : check.status === "degraded" ? "rose" : "amber"}>{formatStatus(check.status)}</Badge><p className="mt-3 font-semibold">{check.label}</p><p className="mt-1 text-xs text-[var(--muted)]">{check.detail}</p></Panel>)}
      </div>
      {loading && !health ? <LoadingState label="Checking backend services..." /> : null}
    </div>
  );
}

function ExportCenterModule({ analyticsRows, customers, deliveryPartners, orders, payments, supportTickets, tailors }: { analyticsRows: Array<Record<string, unknown>>; customers: AdminUser[]; deliveryPartners: DeliveryPartnerProfile[]; orders: Order[]; payments: Payment[]; supportTickets: SupportTicket[]; tailors: TailorProfile[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const datasets = [
    ["Orders", "darji-orders.csv", orders.map(orderToCsv)],
    ["Payments", "darji-payments.csv", payments.map(paymentToCsv)],
    ["Customers", "darji-customers.csv", customers.map(userToCsv)],
    ["Tailors", "darji-tailors.csv", tailors.map(tailorToCsv)],
    ["Delivery Partners", "darji-delivery-partners.csv", deliveryPartners.map(partnerToCsv)],
    ["Analytics", "darji-analytics.csv", analyticsRows],
    ["Support Tickets", "darji-support.csv", supportTickets.map(ticketToCsv)]
  ] as const;
  const exports = datasets.map(([label, filename, rows]) => [label, filename, rows.filter((row) => exportRowMatches(row, { search, status, fromDate, toDate }))] as const);
  return (
    <div className="space-y-6">
      <SectionIntro title="Export Center" description="Export the currently loaded operational records using the filters below." />
      <Panel className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Search all columns"><input className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3" placeholder="Name, ID, phone..." value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
        <Field label="Status"><input className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3" placeholder="Paid, delivered, open..." value={status} onChange={(event) => setStatus(event.target.value)} /></Field>
        <Field label="From date"><input className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
        <Field label="To date"><input className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exports.map(([label, filename, rows]) => (
          <Panel key={label}>
            <h3 className="text-lg font-semibold">{label}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{rows.length} matching loaded rows</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton onClick={() => downloadCsv(filename, rows)}>CSV</ActionButton>
              <ActionButton variant="secondary" onClick={() => void downloadExcel(filename.replace(/\.csv$/i, ".xlsx"), label, rows)}>Excel (.xlsx)</ActionButton>
              <ActionButton variant="secondary" onClick={() => printTableReport(label, rows)}>Print / PDF</ActionButton>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function PartnerEarningsWorkspace({ onDetails, periodLabel, rows }: { onDetails: (row: WalletPayoutRow) => void; periodLabel: string; rows: WalletPayoutRow[] }) {
  const total = rows.reduce((sum, row) => sum + Number(row.currentWeekEarnings ?? 0), 0);
  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex flex-col gap-2 border-b border-[var(--panel-border)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">Partner earnings credited</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Tailor and delivery earning totals that make up Partner Cost for {periodLabel}.</p>
        </div>
        <p className="text-lg font-semibold tabular-nums text-rose-700">{formatCurrency(total)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--panel-border)] bg-[var(--panel)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-4 font-semibold">S. No.</th>
              <th className="px-4 py-4 font-semibold">Partner</th>
              <th className="px-4 py-4 font-semibold">Type</th>
              <th className="px-4 py-4 font-semibold">Phone</th>
              <th className="px-4 py-4 font-semibold">Period earnings</th>
              <th className="px-4 py-4 font-semibold">Wallet balance</th>
              <th className="px-4 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={7}>No partner earning records exist for this period.</td></tr> : null}
            {rows.map((row, rowIndex) => (
              <tr className="border-b border-[var(--panel-border)] transition hover:bg-[var(--accent-soft)]" key={`${row.userType}-${row.userId}`}>
                <td className="px-4 py-4 font-semibold tabular-nums text-[var(--muted)]">{rowIndex + 1}</td>
                <td className="px-4 py-4 font-semibold text-[var(--foreground)]">{row.name}</td>
                <td className="px-4 py-4"><Badge tone={row.userType === "TAILOR" ? "amber" : "sky"}>{row.userType === "TAILOR" ? "Tailor" : "Delivery"}</Badge></td>
                <td className="px-4 py-4 text-[var(--muted)]">{row.phone || "-"}</td>
                <td className="px-4 py-4 font-semibold tabular-nums text-rose-700">{formatCurrency(row.currentWeekEarnings)}</td>
                <td className="px-4 py-4 tabular-nums">{formatCurrency(row.walletBalance)}</td>
                <td className="px-4 py-4"><ActionButton className="px-3 py-2" variant="secondary" onClick={() => onDetails(row)}>Details</ActionButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function FinancialLedgerWorkspace({
  deliveryDue,
  entries,
  loading,
  onOpenPartner,
  onOpenSource,
  tailorDue,
  walletLiabilities
}: {
  deliveryDue: number;
  entries: FinancialLedgerEntry[];
  loading: boolean;
  onOpenPartner: (entry: FinancialLedgerEntry) => void;
  onOpenSource: (entry: FinancialLedgerEntry) => void;
  tailorDue: number;
  walletLiabilities: number;
}) {
  if (loading) return <LoadingDashboard />;
  const cashIn = entries.filter((entry) => entry.direction === "IN" && entry.status === "PAID").reduce((sum, entry) => sum + entry.amount, 0);
  const cashOut = entries.filter((entry) => entry.direction === "OUT" && ["PAID", "REFUNDED"].includes(entry.status)).reduce((sum, entry) => sum + entry.amount, 0);
  const accrued = entries.filter((entry) => entry.direction === "ACCRUAL").reduce((sum, entry) => sum + entry.amount, 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <FinanceStatCard label="Cash received" value={formatCurrency(cashIn)} note="Successful customer collections" tone="emerald" />
        <FinanceStatCard label="Cash paid out" value={formatCurrency(cashOut)} note="Refunds and partner payouts" tone="rose" />
        <FinanceStatCard label="Partner earnings" value={formatCurrency(accrued)} note="Accrued liabilities, not cash movement" tone="violet" />
        <FinanceStatCard label="Tailor due" value={formatCurrency(tailorDue)} note="Stitching and measurement" tone="amber" />
        <FinanceStatCard label="Delivery due" value={formatCurrency(deliveryDue)} note={`${formatCurrency(walletLiabilities)} total wallet liability`} tone="sky" />
      </div>
      <Panel className="overflow-hidden p-0">
        <div className="border-b border-[var(--panel-border)] px-5 py-4">
          <h3 className="font-semibold">Complete ledger</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Cash movements and partner liabilities are separated so accrued earnings are never mistaken for money already paid.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] bg-[var(--panel)] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-4 font-semibold">Date & time</th>
                <th className="px-4 py-4 font-semibold">Entry</th>
                <th className="px-4 py-4 font-semibold">Party / source</th>
                <th className="px-4 py-4 font-semibold">Movement</th>
                <th className="px-4 py-4 font-semibold">Amount</th>
                <th className="px-4 py-4 font-semibold">Reference</th>
                <th className="px-4 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? <tr><td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={7}>No financial entries match the current filters.</td></tr> : null}
              {entries.map((entry) => (
                <tr className="border-b border-[var(--panel-border)] transition hover:bg-[var(--accent-soft)]" key={`${entry.entryType}-${entry.id}`}>
                  <td className="whitespace-nowrap px-4 py-4 text-[var(--muted)]">{formatDate(entry.occurredAt, true)}</td>
                  <td className="px-4 py-4"><p className="font-semibold">{entry.category}</p><p className="text-xs text-[var(--muted)]">{entry.accountingType === "CASH" ? "Cash movement" : "Liability accrued"}</p></td>
                  <td className="px-4 py-4">
                    {entry.partyId ? <button className="block max-w-[280px] text-left font-semibold underline decoration-transparent underline-offset-4 transition hover:text-[var(--accent)] hover:decoration-current" onClick={() => onOpenPartner(entry)} type="button">{entry.partyName ?? "Partner"}</button> : <p className="font-semibold">{entry.entryType === "REFUND" ? "Customer refund" : entry.entryType === "CUSTOMER_PAYMENT" ? "Customer order" : "Darji"}</p>}
                    {entry.sourceId ? <button className="block max-w-[280px] truncate text-left text-xs text-[var(--muted)] underline decoration-transparent underline-offset-2 hover:text-[var(--accent)] hover:decoration-current" onClick={() => onOpenSource(entry)} type="button">{entry.sourceLabel ?? entry.sourceId}</button> : <p className="max-w-[280px] truncate text-xs text-[var(--muted)]">{entry.partyType ?? "-"}</p>}
                  </td>
                  <td className="px-4 py-4"><Badge tone={entry.direction === "IN" ? "emerald" : entry.direction === "OUT" ? "rose" : "violet"}>{entry.direction === "IN" ? "Money in" : entry.direction === "OUT" ? "Money out" : "Accrued"}</Badge></td>
                  <td className={cn("px-4 py-4 font-semibold tabular-nums", entry.direction === "IN" ? "text-emerald-600" : entry.direction === "OUT" ? "text-rose-600" : "text-violet-700")}>{entry.direction === "IN" ? "+" : entry.direction === "OUT" ? "-" : ""}{formatCurrency(entry.amount)}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{entry.referenceNumber ?? entry.method ?? entry.darjiId ?? "-"}</td>
                  <td className="px-4 py-4"><StatusBadge value={entry.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function PayoutWorkspace({
  kind,
  loading,
  onDetails,
  onPay,
  payingUserId,
  rows
}: {
  kind: "TAILOR" | "DELIVERY_PARTNER";
  loading: boolean;
  onDetails: (row: WalletPayoutRow) => void;
  onPay: (row: WalletPayoutRow) => void;
  payingUserId?: string;
  rows: WalletPayoutRow[];
}) {
  if (loading) return <LoadingDashboard />;
  const pendingRows = rows.filter((row) => Number(row.pendingAmount ?? 0) > 0);
  const paidRows = rows.filter((row) => row.lastPayment);
  const totalDue = pendingRows.reduce((sum, row) => sum + Number(row.pendingAmount ?? 0), 0);
  const isTailor = kind === "TAILOR";
  const primaryDue = pendingRows.reduce((sum, row) => sum + Number(isTailor ? row.pendingBreakdown?.STITCHING : row.pendingBreakdown?.DELIVERY_TASK), 0);
  const secondaryDue = pendingRows.reduce((sum, row) => sum + Number(isTailor ? row.pendingBreakdown?.MEASUREMENT : row.pendingBreakdown?.DELIVERY_BATCH), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinanceStatCard label="Total due" value={formatCurrency(totalDue)} note={`${pendingRows.length} partner${pendingRows.length === 1 ? "" : "s"} awaiting payout`} tone="rose" />
        <FinanceStatCard label={isTailor ? "Stitching due" : "Task due"} value={formatCurrency(primaryDue)} note={isTailor ? "Completed stitching earnings" : "Completed individual deliveries"} tone="amber" />
        <FinanceStatCard label={isTailor ? "Measurement due" : "Batch due"} value={formatCurrency(secondaryDue)} note={isTailor ? "Completed measurement visits" : "Completed delivery batches"} tone="violet" />
        <FinanceStatCard label="Payout frequency" value="Weekly" note="One consolidated transfer per partner" tone="sky" />
      </div>
      <Panel className="p-0">
        <div className="border-b border-[var(--panel-border)] px-4 py-4">
          <h3 className="font-semibold text-[var(--foreground)]">{isTailor ? "Tailors awaiting payout" : "Delivery partners awaiting payout"}</h3>
          <p className="text-sm text-[var(--muted)]">One consolidated balance per partner. Open details to verify every included earning.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] bg-[var(--panel)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-4 font-semibold">S. No.</th>
                <th className="px-4 py-4 font-semibold">Partner</th>
                <th className="px-4 py-4 font-semibold">Earning breakdown</th>
                <th className="px-4 py-4 font-semibold">Total due</th>
                <th className="px-4 py-4 font-semibold">Unpaid items</th>
                <th className="px-4 py-4 font-semibold">Last Payment</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={8}>
                    No unpaid bills right now.
                  </td>
                </tr>
              ) : null}
              {pendingRows.map((row, rowIndex) => {
                const paying = payingUserId === row.userId;
                return (
                <tr key={row.userId} className="border-b border-[var(--panel-border)] transition hover:bg-[var(--accent-soft)]">
                  <td className="px-4 py-4 font-semibold tabular-nums text-[var(--muted)]">{rowIndex + 1}</td>
                  <td className="px-4 py-4"><p className="font-semibold text-[var(--foreground)]">{row.name}</p><p className="text-xs text-[var(--muted)]">{row.profileId} - {row.phone || "No phone"}</p></td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5"><Badge tone="amber">{isTailor ? "Stitching" : "Tasks"} {formatCurrency(isTailor ? row.pendingBreakdown?.STITCHING ?? 0 : row.pendingBreakdown?.DELIVERY_TASK ?? 0)}</Badge><Badge tone="violet">{isTailor ? "Measurement" : "Batches"} {formatCurrency(isTailor ? row.pendingBreakdown?.MEASUREMENT ?? 0 : row.pendingBreakdown?.DELIVERY_BATCH ?? 0)}</Badge></div></td>
                  <td className="px-4 py-4 font-bold tabular-nums">{formatCurrency(row.walletBalance)}</td>
                  <td className="px-4 py-4"><p className="font-semibold">{row.unpaidItemCount ?? 0}</p><p className="text-xs text-[var(--muted)]">{row.oldestUnpaidAt ? `Oldest ${formatDate(row.oldestUnpaidAt)}` : "No dated items"}</p></td>
                  <td className="px-4 py-4 text-[var(--muted)]">{row.lastPayment ? formatDate(row.lastPayment.paidAt, true) : "-"}</td>
                  <td className="px-4 py-4"><StatusBadge value="DUE" /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onDetails(row)}>Details</ActionButton>
                      <ActionButton className="px-3 py-2" disabled={Boolean(payingUserId)} onClick={() => onPay(row)}>
                        {paying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                        {paying ? "Paying" : "Create weekly payout"}
                      </ActionButton>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="p-0">
        <div className="border-b border-[var(--panel-border)] px-4 py-4">
          <h3 className="font-semibold text-emerald-600">Recent payout statements</h3>
          <p className="text-sm text-[var(--muted)]">Open partner details for the complete history and the tasks included in every transfer.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] bg-[var(--panel)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-4 font-semibold">S. No.</th>
                <th className="px-4 py-4 font-semibold">Name</th>
                <th className="px-4 py-4 font-semibold">Paid Amount</th>
                <th className="px-4 py-4 font-semibold">Paid At</th>
                <th className="px-4 py-4 font-semibold">Reference</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Proof</th>
              </tr>
            </thead>
            <tbody>
              {paidRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={7}>
                    Paid bills will appear here after payout.
                  </td>
                </tr>
              ) : null}
              {paidRows.map((row, rowIndex) => (
                <tr key={`${row.userId}-${row.lastPayment?.id}`} className="border-b border-emerald-500/20 bg-emerald-500/5">
                  <td className="px-4 py-4 font-semibold tabular-nums text-[var(--muted)]">{rowIndex + 1}</td>
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">{row.name}</td>
                  <td className="px-4 py-4 font-semibold text-emerald-600">{formatCurrency(row.lastPayment?.amount ?? 0)}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{formatDate(row.lastPayment?.paidAt, true)}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{row.lastPayment?.referenceNumber ?? row.lastPayment?.notes ?? "-"}</td>
                  <td className="px-4 py-4"><StatusBadge value="PAID" /></td>
                  <td className="px-4 py-4">
                    {row.lastPayment?.receiptUrl ? (
                      <a className="inline-flex rounded-2xl border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-500/10" href={row.lastPayment.receiptUrl} target="_blank" rel="noreferrer">View Proof</a>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function DeliveryBatchManagement({
  batches,
  deliveryRequests,
  partners,
  error,
  focusBatch,
  batchCapacity,
  onOpenOrder,
  onOpenCustomer,
  onNotifyBatch,
  onReassign,
  orders,
  pendingTaskId
}: {
  batches: DeliveryBatch[];
  deliveryRequests: DeliveryRequest[];
  partners: DeliveryPartnerProfile[];
  error?: string;
  focusBatch?: BatchFocusTarget | null;
  batchCapacity: number;
  onOpenOrder: (order: Order) => void;
  onOpenCustomer: (request: DeliveryRequest) => void;
  onNotifyBatch: (batchId: string) => void;
  onReassign: (taskId: string, batchId: string) => void;
  orders: Order[];
  pendingTaskId?: string;
}) {
  const [view, setView] = useState<"batches" | "instant">("batches");
  const [dateScope, setDateScope] = useState<"all" | "selected">("all");
  const [roundFilter, setRoundFilter] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => localDateInputValue(new Date()));
  const sortedBatches = useMemo(
    () => [...batches].sort((a, b) => new Date(a.roundAt).getTime() - new Date(b.roundAt).getTime()),
    [batches]
  );
  const selectedDayBatches = useMemo(
    () => sortedBatches.filter((batch) => dateScope === "all" || localDateKey(batch.roundAt) === selectedDate),
    [dateScope, selectedDate, sortedBatches]
  );
  const pickupCount = selectedDayBatches.reduce((sum, batch) => sum + Number(batch.pickupCount ?? batch.tasks.filter((task) => task.type === "customer_to_tailor").length), 0);
  const dropCount = selectedDayBatches.reduce((sum, batch) => sum + Number(batch.dropCount ?? batch.tasks.filter((task) => task.type === "tailor_to_customer").length), 0);
  const batchStage = (batch: DeliveryBatch) => {
    const status = String(batch.status);
    if (status === "completed") return "completed";
    if (status === "cancelled") return "cancelled";
    if (batch.deliveryPartnerId || batch.partner) return status === "active" ? "active" : "accepted";
    if (status === "locked") return "notified";
    return "upcoming";
  };
  const normalizedSearch = search.trim().toLowerCase();
  const visibleBatches = selectedDayBatches.filter((batch) =>
    (!statusFilter || batchStage(batch) === statusFilter) &&
    (!roundFilter || batch.deliveryRound === roundFilter) &&
    (!normalizedSearch || [batch.batchId, batch.area, batch.partner ? getPartnerDisplayName(batch.partner) : "", ...batch.tasks.flatMap((task) => [task.taskId, task.orderId, task.customerName ?? "", task.customerPhone ?? ""])]
      .some((value) => String(value).toLowerCase().includes(normalizedSearch)))
  );
  const instantOrders = useMemo(() => deliveryRequests
    .filter((request) => request.serviceLevel === "INSTANT")
    .filter((request) => dateScope === "all" || localDateKey(request.createdAt) === selectedDate)
    .filter((request) => !statusFilter || String(request.taskStatus).toLowerCase() === statusFilter)
    .filter((request) => !normalizedSearch || [request.taskId, request.orderId, request.customerName, request.customerPhone, request.tailorName]
      .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch)))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
  [dateScope, deliveryRequests, normalizedSearch, selectedDate, statusFilter]);
  const selectedIsToday = selectedDate === localDateInputValue(new Date());
  const activeTargetBatches = sortedBatches.filter((batch) => !["completed", "cancelled"].includes(batch.status));
  const totalEarnings = visibleBatches.reduce((sum, batch) => sum + Number(batch.estimatedEarnings ?? 0), 0);
  const totalTasks = visibleBatches.reduce((sum, batch) => sum + batch.tasks.length, 0);
  const selectedDateLabel = dateScope === "all" ? "all dates" : formatDate(selectedDate, false);
  const focusedBatch = focusBatch ? selectedDayBatches.find((batch) => batch.batchId === focusBatch.batchId) : undefined;
  const onePmBatches = visibleBatches.filter((batch) => String(batch.deliveryRound).toUpperCase() === "ONE_PM");
  const sixPmBatches = visibleBatches.filter((batch) => String(batch.deliveryRound).toUpperCase() === "SIX_PM");

  return (
    <div className="space-y-6">
      <SectionIntro
        title="Batches & instant deliveries"
        description="Scheduled pickup and drop jobs share the upcoming 1 PM or 6 PM batch. Instant jobs stay separate and are offered immediately."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2">
              <CalendarDays size={16} className="text-[var(--muted)]" />
              <input
                className="bg-transparent text-sm font-semibold outline-none"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                disabled={dateScope === "all"}
              />
            </div>
            <FilterSelect value={dateScope} onChange={(value) => setDateScope(value as "all" | "selected")} options={[{ label: "All dates", value: "all" }, { label: "Selected date", value: "selected" }]} />
            {view === "batches" ? <FilterSelect value={roundFilter} onChange={setRoundFilter} options={[{ label: "All batch times", value: "" }, { label: "1 PM", value: "ONE_PM" }, { label: "6 PM", value: "SIX_PM" }]} /> : null}
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={view === "instant" ? [
                { label: "All statuses", value: "" },
                { label: "Pending", value: "pending" },
                { label: "Accepted", value: "accepted" },
                { label: "Picked up", value: "picked_up" },
                { label: "Delivered", value: "delivered" },
                { label: "Cancelled", value: "cancelled" }
              ] : [
                { label: "All statuses", value: "" },
                { label: "Upcoming", value: "upcoming" },
                { label: "Notified", value: "notified" },
                { label: "Accepted", value: "accepted" },
                { label: "Active", value: "active" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" }
              ]}
            />
          </div>
        }
      />
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button className={cn("rounded-lg border px-4 py-2 text-sm font-bold", view === "batches" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--panel-border)] bg-white")} onClick={() => { setView("batches"); setStatusFilter(""); }} type="button">Scheduled batches ({batches.length})</button>
          <button className={cn("rounded-lg border px-4 py-2 text-sm font-bold", view === "instant" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--panel-border)] bg-white")} onClick={() => { setView("instant"); setStatusFilter(""); }} type="button">Instant orders ({deliveryRequests.filter((request) => request.serviceLevel === "INSTANT").length})</button>
        </div>
        <input className="h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)] sm:max-w-xs" onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, order or customer" value={search} />
      </div>
      {view === "instant" ? (
        <InstantDeliveryOrders requests={instantOrders} orders={orders} partners={partners} onOpenOrder={onOpenOrder} onOpenCustomer={onOpenCustomer} />
      ) : <>
      <div className="grid gap-4 md:grid-cols-5">
        <FinanceStatCard label="Visible batches" value={visibleBatches.length.toLocaleString("en-IN")} note={selectedDateLabel} tone="sky" />
        <FinanceStatCard label="Pickup jobs" value={pickupCount.toLocaleString("en-IN")} note="Selected day" tone="amber" />
        <FinanceStatCard label="Drop jobs" value={dropCount.toLocaleString("en-IN")} note="Selected day" tone="rose" />
        <FinanceStatCard label="1 PM batches" value={onePmBatches.length.toLocaleString("en-IN")} note={selectedIsToday ? "Today" : "Selected day"} tone="amber" />
        <FinanceStatCard label="6 PM batches" value={sixPmBatches.length.toLocaleString("en-IN")} note={selectedIsToday ? "Today" : "Selected day"} tone="emerald" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FinanceStatCard label="Orders in batches" value={totalTasks.toLocaleString("en-IN")} note="Pickup and drop requests" tone="emerald" />
        <FinanceStatCard label="Delivery earnings" value={formatCurrency(totalEarnings)} note="Partner payable" tone="rose" />
      </div>
      {error ? (
        <Panel className="border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-semibold">Batch endpoint unavailable</p>
          <p className="mt-1 text-xs">{error}</p>
        </Panel>
      ) : null}
      <div className="space-y-4">
        {focusedBatch ? (
          <Panel className="border-[var(--accent)] bg-[linear-gradient(135deg,#fff9ec,#ffffff)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">Opened from Orders</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--deep)]">BATCH-{focusedBatch.batchId.slice(0, 8).toUpperCase()}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(focusedBatch.roundAt, true)} - {focusedBatch.area} - mixed route</p>
              </div>
              <Badge tone="amber">Focused batch</Badge>
            </div>
          </Panel>
        ) : null}
        <BatchSection
          title={`1 PM mixed batches for ${selectedDateLabel}`}
          focusBatchId={focusBatch?.batchId}
          batchCapacity={batchCapacity}
          batches={onePmBatches}
          orders={orders}
          activeTargetBatches={activeTargetBatches}
          pendingTaskId={pendingTaskId}
          onOpenOrder={onOpenOrder}
          onOpenCustomer={onOpenCustomer}
          onNotifyBatch={onNotifyBatch}
          onReassign={onReassign}
        />
        <BatchSection
          title={`6 PM mixed batches for ${selectedDateLabel}`}
          focusBatchId={focusBatch?.batchId}
          batchCapacity={batchCapacity}
          batches={sixPmBatches}
          orders={orders}
          activeTargetBatches={activeTargetBatches}
          pendingTaskId={pendingTaskId}
          onOpenOrder={onOpenOrder}
          onOpenCustomer={onOpenCustomer}
          onNotifyBatch={onNotifyBatch}
          onReassign={onReassign}
        />
        {!visibleBatches.length ? (
          <EmptyState
            message={sortedBatches.length ? `No delivery batches found for ${selectedDateLabel} and the current filters.` : "No delivery batches found yet."}
          />
        ) : null}
      </div>
      </>}
    </div>
  );
}

function MeasurementVisitsModule({
  error,
  focusVisitId,
  onFocusVisitOpened,
  onAssign,
  onOpenCustomer,
  pendingVisitId,
  tailors,
  visits
}: {
  error?: string;
  focusVisitId?: string | null;
  onFocusVisitOpened: () => void;
  onAssign: (visitId: string, tailorId: string) => void;
  onOpenCustomer: (visit: MeasurementVisit) => void;
  pendingVisitId?: string;
  tailors: TailorProfile[];
  visits: MeasurementVisit[];
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<MeasurementVisit | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => new Date(b.createdAt ?? b.scheduledAt ?? 0).getTime() - new Date(a.createdAt ?? a.scheduledAt ?? 0).getTime()),
    [visits]
  );
  const normalizedSearch = search.trim().toLowerCase();
  const visibleVisits = sortedVisits.filter((visit) => (!statusFilter || visit.status === statusFilter) && (!normalizedSearch || [visit.darjiId, visit.requestId, visit.customerName, visit.customerPhone, visit.garmentSummary].some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch))));
  const pendingCount = visits.filter((visit) => ["OFFERED_TO_STITCHING_TAILOR", "POOL"].includes(visit.status)).length;
  const assignedCount = visits.filter((visit) => ["ACCEPTED", "IN_PROGRESS"].includes(visit.status)).length;
  const submittedCount = visits.filter((visit) => visit.status === "SUBMITTED").length;
  const capableTailors = [...tailors].sort((a, b) => getTailorDisplayName(a).localeCompare(getTailorDisplayName(b)));
  useEffect(() => {
    if (!focusVisitId) return;
    const visit = visits.find((candidate) => candidate.id === focusVisitId || candidate.darjiId === focusVisitId);
    if (visit) {
      setSelectedVisit(visit);
      onFocusVisitOpened();
    }
  }, [focusVisitId, onFocusVisitOpened, visits]);

  return (
    <div className="space-y-6">
      <SectionIntro
        title="Home measurement visits"
        description="Offer, assign, reassign, and review tailor-at-home measurement jobs."
        action={<div className="flex flex-wrap gap-2"><input className="h-10 min-w-[240px] rounded-xl border border-[var(--panel-border)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]" onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, visit or request" value={search} /><FilterSelect value={statusFilter} onChange={setStatusFilter} options={[{ label: "All statuses", value: "" }, { label: "Offered", value: "OFFERED_TO_STITCHING_TAILOR" }, { label: "Pool", value: "POOL" }, { label: "Accepted", value: "ACCEPTED" }, { label: "In progress", value: "IN_PROGRESS" }, { label: "Submitted", value: "SUBMITTED" }, { label: "Cancelled", value: "CANCELLED" }, { label: "Expired", value: "EXPIRED" }]} /></div>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <FinanceStatCard label="Total visits" value={visits.length.toLocaleString("en-IN")} note="Measurement jobs" tone="sky" />
        <FinanceStatCard label="Needs action" value={pendingCount.toLocaleString("en-IN")} note="Offered or in pool" tone="amber" />
        <FinanceStatCard label="Assigned" value={assignedCount.toLocaleString("en-IN")} note="Accepted / in progress" tone="violet" />
        <FinanceStatCard label="Submitted" value={submittedCount.toLocaleString("en-IN")} note="Sent to stitching tailor" tone="emerald" />
      </div>
      {error ? (
        <Panel className="border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-semibold">Measurement endpoint unavailable</p>
          <p className="mt-1 text-xs">{error}</p>
        </Panel>
      ) : null}
      <Panel className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[var(--panel-border)] bg-[#fffaf0] text-xs uppercase tracking-[0.14em] text-[var(--muted)]"><tr><th className="px-4 py-3">S. No.</th><th className="px-4 py-3">Visit</th><th className="px-4 py-3">Customer details</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Measurement partner</th><th className="px-4 py-3">Partner payout</th><th className="px-4 py-3">Upload</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>
        {visibleVisits.map((visit, visitIndex) => { const assignedTailor = tailors.find((tailor) => tailor.id === visit.assignedTailorId); const offeredTailor = tailors.find((tailor) => tailor.id === visit.offeredTailorId); const measurementCount = Object.keys(visit.submission?.measurement?.fields ?? {}).length; return <tr className="border-b border-[var(--panel-border)] last:border-0 hover:bg-[#fffaf0]/50" key={visit.id}><td className="px-4 py-4 font-semibold tabular-nums text-[var(--muted)]">{visitIndex + 1}</td><td className="px-4 py-4"><p className="font-bold">{visit.darjiId ?? `MVS-${visit.id.slice(0, 8).toUpperCase()}`}</p><p className="text-xs text-[var(--muted)]">Request {visit.requestId}</p></td><td className="px-4 py-4"><button className="rounded-lg px-2 py-1 text-left transition hover:bg-orange-50" onClick={() => onOpenCustomer(visit)} type="button"><p className="font-semibold">{cleanText(visit.customerName) ?? "Customer"}</p><p className="text-xs text-[var(--muted)]">{visit.customerPhone ?? "Phone unavailable"}</p></button></td><td className="whitespace-nowrap px-4 py-4">{formatDate(visit.scheduledAt, true)}</td><td className="px-4 py-4"><p className="font-semibold">{assignedTailor ? getTailorDisplayName(assignedTailor) : offeredTailor ? getTailorDisplayName(offeredTailor) : "Unassigned"}</p><p className="text-xs text-[var(--muted)]">{assignedTailor ? assignedTailor.darjiTailorId ?? "Partner ID pending" : offeredTailor ? "Offer awaiting acceptance" : "Needs assignment"}</p></td><td className="px-4 py-4"><p className="font-bold text-emerald-700">{formatCurrency(visit.visitPayout ?? 0)}</p><p className="text-xs text-[var(--muted)]">Paid to measurement partner</p></td><td className="px-4 py-4">{visit.submittedAt || visit.status === "SUBMITTED" ? <div><Badge tone="emerald">Uploaded</Badge><p className="mt-1 text-xs text-[var(--muted)]">{measurementCount} fields</p></div> : <Badge tone="amber">Pending upload</Badge>}</td><td className="px-4 py-4"><StatusBadge value={visit.status} /></td><td className="px-4 py-4"><ActionButton className="px-3 py-2" onClick={() => setSelectedVisit(visit)} variant="secondary"><Eye className="h-4 w-4" />View details</ActionButton></td></tr>; })}
        {!visibleVisits.length ? <tr><td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={9}>{visits.length ? "No measurement visits match these filters." : "No home measurement visits have been created yet."}</td></tr> : null}
      </tbody></table></div></Panel>
      <MeasurementVisitDialog visit={selectedVisit} tailors={capableTailors} assignmentDrafts={assignmentDrafts} setAssignmentDrafts={setAssignmentDrafts} pendingVisitId={pendingVisitId} onAssign={onAssign} onClose={() => setSelectedVisit(null)} />
    </div>
  );
}

function MeasurementVisitDialog({ visit, tailors, assignmentDrafts, setAssignmentDrafts, pendingVisitId, onAssign, onClose }: { visit: MeasurementVisit | null; tailors: TailorProfile[]; assignmentDrafts: Record<string, string>; setAssignmentDrafts: Dispatch<SetStateAction<Record<string, string>>>; pendingVisitId?: string; onAssign: (visitId: string, tailorId: string) => void; onClose: () => void }) {
  if (!visit) return null;
  const assignedTailor = tailors.find((tailor) => tailor.id === visit.assignedTailorId);
  const stitchingTailor = tailors.find((tailor) => tailor.id === visit.stitchingTailorId);
  const selectedTailorId = assignmentDrafts[visit.id] ?? visit.assignedTailorId ?? visit.offeredTailorId ?? visit.stitchingTailorId ?? "";
  const measurementFields = Object.entries(visit.submission?.measurement?.fields ?? {});
  const photos = [...(visit.submission?.photos ?? []), ...(visit.submission?.measurement?.imageUrl ? [{ url: visit.submission.measurement.imageUrl, originalName: visit.submission.measurement.label ?? "Measurement reference" }] : [])];
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" /><Dialog.Content className="fixed right-3 top-3 bottom-3 z-50 w-[min(780px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><Dialog.Title className="text-xl font-bold">{visit.darjiId ?? `MVS-${visit.id.slice(0, 8).toUpperCase()}`}</Dialog.Title><StatusBadge value={visit.status} /></div><Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Complete measurement visit details and uploaded submission.</Dialog.Description></div><Dialog.Close className="rounded-lg border border-[var(--panel-border)] p-2 hover:bg-slate-50"><X size={18} /></Dialog.Close></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><DetailBox label="Customer" value={cleanText(visit.customerName) ?? "Customer"} note={visit.customerPhone ?? "Phone unavailable"} /><DetailBox label="Scheduled visit" value={formatDate(visit.scheduledAt, true)} note={`Request ${visit.requestId}`} /><DetailBox label="Measurement partner" value={assignedTailor ? getTailorDisplayName(assignedTailor) : "Unassigned"} note={assignedTailor?.darjiTailorId ?? "No accepted partner"} /><DetailBox label="Measurement partner payout" value={formatCurrency(visit.visitPayout ?? 0)} note="Amount payable for this visit" /></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><Panel className="p-4"><h4 className="font-bold">Customer and garment</h4><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs font-bold uppercase text-[var(--muted)]">Customer address</dt><dd className="mt-1">{cleanText(visit.pickupAddress) ?? "Address unavailable"}</dd></div><div><dt className="text-xs font-bold uppercase text-[var(--muted)]">Garment details</dt><dd className="mt-1">{cleanText(visit.garmentSummary) ?? "Garment details unavailable"}</dd></div><div><dt className="text-xs font-bold uppercase text-[var(--muted)]">Stitching tailor</dt><dd className="mt-1">{stitchingTailor ? getTailorDisplayName(stitchingTailor) : visit.stitchingTailorId}</dd></div></dl></Panel><Panel className="p-4"><h4 className="font-bold">Assign measurement partner</h4><div className="mt-3 space-y-3"><FilterSelect value={selectedTailorId} onChange={(tailorId) => setAssignmentDrafts((current) => ({ ...current, [visit.id]: tailorId }))} options={[{ label: "Select measurement partner", value: "" }, ...tailors.map((tailor) => ({ label: `${getTailorDisplayName(tailor)}${tailor.darjiTailorId ? ` (${tailor.darjiTailorId})` : ""}`, value: tailor.id }))]} /><ActionButton disabled={!selectedTailorId || pendingVisitId === visit.id} onClick={() => onAssign(visit.id, selectedTailorId)}>{pendingVisitId === visit.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRoundPlus className="h-4 w-4" />}{visit.assignedTailorId ? "Reassign partner" : "Assign partner"}</ActionButton></div></Panel></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><Panel className="p-4"><div className="flex items-center justify-between"><h4 className="font-bold">Uploaded measurements</h4>{visit.submittedAt ? <Badge tone="emerald">Uploaded {formatDate(visit.submittedAt, true)}</Badge> : null}</div>{measurementFields.length ? <div className="mt-3 grid grid-cols-2 gap-2">{measurementFields.map(([label, value]) => <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3" key={label}><p className="text-xs font-bold text-emerald-700">{formatStatus(label)}</p><p className="mt-1 font-bold">{String(value)}</p></div>)}</div> : <p className="mt-3 text-sm text-[var(--muted)]">No measurements uploaded yet.</p>}{visit.submission?.fitPreferences?.length ? <div className="mt-4"><p className="text-xs font-bold uppercase text-[var(--muted)]">Fit preferences</p><div className="mt-2 flex flex-wrap gap-2">{visit.submission.fitPreferences.map((item) => <Badge key={item} tone="sky">{item}</Badge>)}</div></div> : null}</Panel><Panel className="p-4"><h4 className="font-bold">Notes uploaded by tailor</h4><div className="mt-3 space-y-3 text-sm"><div className="rounded-lg bg-sky-50 p-3"><p className="text-xs font-bold uppercase text-sky-700">Measurement notes</p><p className="mt-1">{cleanText(visit.submission?.notes) ?? "No measurement notes uploaded."}</p></div><div className="rounded-lg bg-amber-50 p-3"><p className="text-xs font-bold uppercase text-amber-700">Special instructions</p><p className="mt-1">{cleanText(visit.submission?.specialInstructions) ?? "No special instructions uploaded."}</p></div></div></Panel></div>
    {photos.length ? <Panel className="mt-4 p-4"><h4 className="font-bold">Uploaded photos</h4><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo, index) => <a href={photo.url} key={`${photo.url}-${index}`} rel="noreferrer" target="_blank"><img alt={photo.originalName ?? "Measurement upload"} className="h-32 w-full rounded-xl border border-[var(--panel-border)] object-cover" src={photo.url} /><p className="mt-1 truncate text-xs text-[var(--muted)]">{photo.originalName ?? `Photo ${index + 1}`}</p></a>)}</div></Panel> : null}
    {visit.submission?.voiceNotes?.length ? <Panel className="mt-4 p-4"><h4 className="font-bold">Voice notes</h4><div className="mt-3 space-y-2">{visit.submission.voiceNotes.map((note, index) => <audio className="w-full" controls key={`${note.url}-${index}`} src={note.url}>Voice note {index + 1}</audio>)}</div></Panel> : null}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function DetailBox({ label, value, note }: { label: string; value: string; note?: string }) { return <div className="rounded-xl border border-[var(--panel-border)] bg-[#fffaf0] p-3"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p><p className="mt-1 font-bold text-[var(--deep)]">{value}</p>{note ? <p className="mt-1 text-xs text-[var(--muted)]">{note}</p> : null}</div>; }

function InstantDeliveryOrders({ requests, orders, partners, onOpenOrder, onOpenCustomer }: { requests: DeliveryRequest[]; orders: Order[]; partners: DeliveryPartnerProfile[]; onOpenOrder: (order: Order) => void; onOpenCustomer: (request: DeliveryRequest) => void }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--panel-border)] bg-[#fffaf0] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            <tr><th className="px-4 py-3">S. No.</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Customer / tailor</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Earnings</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th></tr>
          </thead>
          <tbody>{requests.map((request, requestIndex) => {
            const order = orders.find((candidate) => candidate.id === request.orderId || candidate.request?.id === request.orderId);
            const partner = partners.find((candidate) => candidate.id === request.assignedDeliveryPartnerId);
            const partnerPhone = partner?.user?.phone?.trim();
            return <tr className="border-b border-[var(--panel-border)] last:border-0" key={request.id}>
              <td className="px-4 py-4 font-semibold tabular-nums text-[var(--muted)]">{requestIndex + 1}</td>
              <td className="px-4 py-4"><button className="font-bold text-[#c68008] hover:underline" onClick={() => order && onOpenOrder(order)} type="button">{order ? getOrderDisplayNumber(order) : formatCustomerRequestId(request.orderId)}</button><p className="text-xs text-[var(--muted)]">{request.taskId}</p></td>
              <td className="px-4 py-4"><DeliveryRoleBadge role={request.type === "customer_to_tailor" ? "PICKUP" : "DROP"} /></td>
              <td className="px-4 py-4"><button className="rounded-lg px-2 py-1 text-left transition hover:bg-orange-50" onClick={() => onOpenCustomer(request)} type="button"><p className="font-semibold">{cleanText(request.customerName) ?? "Customer"}</p><p className="text-xs text-[var(--muted)]">{request.customerPhone ?? "No phone"}</p></button><p className="mt-1 text-xs text-[var(--muted)]">Tailor: {cleanText(request.tailorName) ?? "Unassigned"}</p></td>
              <td className="max-w-[320px] px-4 py-4"><p className="truncate">{request.pickupAddress}</p><p className="mt-1 truncate text-[var(--muted)]">to {request.dropAddress}</p></td>
              <td className="px-4 py-4">
                {partner ? (
                  <div className="min-w-[170px]">
                    <p className="font-bold text-[var(--deep)]">{getPartnerDisplayName(partner)}</p>
                    <p className="mt-0.5 text-xs font-semibold text-orange-600">{partner.darjiPartnerId ?? `ID: ${partner.id.slice(0, 8).toUpperCase()}`}</p>
                    {partnerPhone ? <a className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline" href={`tel:${partnerPhone}`}><PhoneCall className="h-3.5 w-3.5" />{partnerPhone}</a> : <p className="mt-1 text-xs text-[var(--muted)]">Mobile unavailable</p>}
                  </div>
                ) : request.assignedDeliveryPartnerId ? (
                  <div><p className="font-semibold">Accepted partner</p><p className="text-xs text-[var(--muted)]">ID: {request.assignedDeliveryPartnerId}</p></div>
                ) : <span className="text-[var(--muted)]">Unassigned</span>}
              </td>
              <td className="px-4 py-4 font-bold">{formatCurrency(request.estimatedEarnings ?? 0)}</td>
              <td className="px-4 py-4"><StatusBadge value={request.taskStatus} /></td>
              <td className="whitespace-nowrap px-4 py-4 text-[var(--muted)]">{formatDate(request.createdAt, true)}</td>
            </tr>;
          })}{!requests.length ? <tr><td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={9}>No instant delivery orders match these filters.</td></tr> : null}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function BatchSection({
  title,
  batches,
  orders,
  activeTargetBatches,
  focusBatchId,
  batchCapacity,
  onNotifyBatch,
  pendingTaskId,
  onOpenOrder,
  onOpenCustomer,
  onReassign
}: {
  title: string;
  batches: DeliveryBatch[];
  orders: Order[];
  activeTargetBatches: DeliveryBatch[];
  focusBatchId?: string | null;
  batchCapacity: number;
  onNotifyBatch: (batchId: string) => void;
  pendingTaskId?: string;
  onOpenOrder: (order: Order) => void;
  onOpenCustomer: (request: DeliveryRequest) => void;
  onReassign: (taskId: string, batchId: string) => void;
}) {
  if (!batches.length) return null;
  const [openBatchIds, setOpenBatchIds] = useState<Set<string>>(() => new Set(focusBatchId ? [focusBatchId] : []));

  useEffect(() => {
    if (!focusBatchId) return;
    setOpenBatchIds(new Set([focusBatchId]));
  }, [focusBatchId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-black uppercase tracking-[0.18em] text-[var(--muted)]">{title}</h4>
        <Badge tone="slate">{batches.length}</Badge>
      </div>
      {batches.map((batch) => {
        const partner = batch.partner;
        const partnerPhone = partner?.user?.phone?.trim();
        const isOpen = openBatchIds.has(batch.batchId);
        const tasks = batch.tasks ?? [];
        const ordersCount = batch.ordersCount ?? tasks.length;
        const hiddenTaskCount = tasks.filter((task) => !task.notificationSentAt).length;
        const isHidden = batch.status === "scheduled" && hiddenTaskCount === tasks.length && tasks.length > 0;
        const isCompleted = String(batch.status) === "completed";
        const isAccepted = Boolean(partner) && !isCompleted;
        return (
          <Panel
            key={batch.batchId}
            className={cn(
              "overflow-hidden p-0",
              isCompleted && "border-emerald-200 bg-emerald-50/60 opacity-80",
              isAccepted && "border-sky-200",
              focusBatchId === batch.batchId && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-transparent"
            )}
          >
            <div className={cn(
              "flex flex-col gap-4 border-b border-[var(--panel-border)] p-5 lg:flex-row lg:items-center lg:justify-between",
              isCompleted ? "bg-emerald-50/80" : "bg-[linear-gradient(135deg,#fff8e9,#fbfdff)]"
            )}>
              <button
                type="button"
                onClick={() => setOpenBatchIds((current) => {
                  const next = new Set(current);
                  if (next.has(batch.batchId)) next.delete(batch.batchId);
                  else next.add(batch.batchId);
                  return next;
                })}
                className="flex min-w-0 flex-1 flex-col text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-[var(--deep)]">BATCH-{batch.batchId.slice(0, 8).toUpperCase()}</h3>
                  <Badge tone="violet">Mixed pickup + drop</Badge>
                  <StatusBadge value={batch.status} />
                  {isHidden ? <Badge tone="slate">Hidden</Badge> : <Badge tone="emerald">Visible</Badge>}
                  <Badge tone="sky">{ordersCount} orders</Badge>
                  {hiddenTaskCount > 0 ? <Badge tone="amber">{hiddenTaskCount} pending notify</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {batch.deliveryRound === "ONE_PM" ? "1 PM" : batch.deliveryRound === "SIX_PM" ? "6 PM" : formatStatus(batch.deliveryRound)} round - {batch.area} - {formatDate(batch.roundAt, true)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--foreground)]">
                  <span>Accepted by {partner ? getPartnerDisplayName(partner) : "Unassigned"} {partner?.darjiPartnerId ? `(${partner.darjiPartnerId})` : ""}</span>
                  {partnerPhone ? (
                    <a className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100" href={`tel:${partnerPhone}`}>
                      <PhoneCall className="h-3.5 w-3.5" />
                      {partnerPhone}
                    </a>
                  ) : null}
                </div>
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <MetricChip label="Orders" value={String(ordersCount)} />
                  <MetricChip label="Earnings" value={formatCurrency(batch.estimatedEarnings ?? 0)} />
                  <MetricChip label="Distance" value={`${Number(batch.totalDistance ?? 0).toFixed(1)} km`} />
                </div>
                {!partner && !["active", "completed", "cancelled"].includes(String(batch.status)) ? (
                  <ActionButton
                    className="px-4 py-2"
                    onClick={() => onNotifyBatch(batch.batchId)}
                    variant="secondary"
                  >
                    {batch.status === "locked" || hiddenTaskCount === 0 ? "Notify again" : "Notify now"}
                  </ActionButton>
                ) : null}
                <ChevronDown className={cn("h-5 w-5 text-[var(--muted)] transition-transform", isOpen ? "rotate-180" : "")} />
              </div>
            </div>
            {isOpen ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--panel-border)] bg-[var(--panel)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">S. No.</th>
                      <th className="px-4 py-3 font-semibold">Order ID</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Tailor</th>
                      <th className="px-4 py-3 font-semibold">Route</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Earnings</th>
                      <th className="px-4 py-3 font-semibold">Move to batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length ? tasks.map((task, taskIndex) => {
                      const order = orders.find((candidate) => candidate.id === task.orderId || candidate.request?.id === task.orderId);
                      const targetBatches = activeTargetBatches.filter((target) => target.batchId !== batch.batchId);
                      const pending = pendingTaskId === task.id;
                      return (
                        <tr key={task.id} className="border-b border-[var(--panel-border)] last:border-0">
                          <td className="px-4 py-4 font-semibold tabular-nums text-[var(--muted)]">{taskIndex + 1}</td>
                          <td className="px-4 py-4">
                            <button className="font-bold text-[#c68008] hover:underline" type="button" onClick={() => order && onOpenOrder(order)}>
                              {order ? getOrderDisplayNumber(order) : formatCustomerRequestId(task.orderId)}
                            </button>
                            <p className="mt-1 text-xs text-[var(--muted)]">{task.taskId}</p>
                          </td>
                          <td className="px-4 py-4"><button className="rounded-lg px-2 py-1 text-left transition hover:bg-orange-50" onClick={() => onOpenCustomer(task)} type="button"><p className="font-semibold">{cleanText(task.customerName) ?? cleanText(task.customerPhone) ?? "Customer"}</p><p className="text-xs text-[var(--muted)]">{task.customerPhone ?? "No phone"}</p></button></td>
                          <td className="px-4 py-4">
                            <p className="font-semibold">{cleanText(task.tailorName) ?? "Tailor"}</p>
                            <p className="text-xs text-[var(--muted)]">{task.tailorPhone ?? "No phone"}</p>
                          </td>
                          <td className="max-w-[340px] px-4 py-4">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Pickup</p>
                            <p className="truncate font-semibold">{task.pickupAddress}</p>
                            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Drop</p>
                            <p className="truncate font-semibold">{task.dropAddress}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">{Number(task.estimatedDistanceKm ?? 0).toFixed(1)} km</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <StatusBadge value={task.taskStatus} />
                              {task.notificationSentAt ? <Badge tone="emerald">Notified {formatDate(task.notificationSentAt, true)}</Badge> : <Badge tone="slate">Hidden</Badge>}
                              {task.acceptedAt ? <Badge tone="sky">Accepted {formatDate(task.acceptedAt, true)}</Badge> : null}
                              {task.pickedUpAt ? <Badge tone="amber">Picked {formatDate(task.pickedUpAt, true)}</Badge> : null}
                              {task.deliveredAt ? <Badge tone="emerald">Delivered {formatDate(task.deliveredAt, true)}</Badge> : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-semibold">{formatCurrency(task.estimatedEarnings ?? 0)}</td>
                          <td className="px-4 py-4">
                            <select
                              className="h-10 min-w-[220px] rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 text-sm outline-none"
                              disabled={pending || targetBatches.length === 0}
                              value=""
                              onChange={(event) => {
                                if (event.target.value) onReassign(task.id, event.target.value);
                              }}
                            >
                              <option value="">{pending ? "Moving..." : targetBatches.length ? "Select any active batch" : "No active batch"}</option>
                              {targetBatches.map((target) => (
                              <option key={target.batchId} value={target.batchId}>
                                  BATCH-{target.batchId.slice(0, 8).toUpperCase()} - {target.area} - {formatDate(target.roundAt, true)} - {target.ordersCount ?? (target.tasks ?? []).length} orders
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                    }) : (
                      <tr>
                        <td className="px-4 py-8 text-center text-[var(--muted)]" colSpan={8}>No delivery requests in this batch yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4 text-sm text-[var(--muted)]">Tap to open batch details.</div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function WalletDetailDialog({
  detail,
  loading,
  onOpenAllocation,
  open,
  row,
  setOpen
}: {
  detail?: WalletDetail;
  loading: boolean;
  onOpenAllocation: (allocation: WalletDetail["outstandingAllocations"][number]) => void;
  open: boolean;
  row: WalletPayoutRow | null;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-4 top-4 bottom-4 z-50 w-[min(720px,calc(100vw-2rem))] overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-5 shadow-2xl">
          <Dialog.Title className="text-xl font-semibold">{row?.name ?? "Wallet details"}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Payable work and completed payout statements.</Dialog.Description>
          {loading ? (
            <div className="py-10 text-center text-[var(--muted)]">Loading wallet...</div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <FinanceStatCard label="Total payable" value={formatCurrency(detail?.balance ?? 0)} note="Current unpaid balance" tone="amber" />
                <FinanceStatCard label="Unpaid work" value={String(detail?.unpaidItemCount ?? 0)} note={detail?.oldestUnpaidAt ? `Oldest from ${formatDate(detail.oldestUnpaidAt)}` : "No pending work"} tone="emerald" />
                <FinanceStatCard label="Last Payment" value={detail?.lastPayment ? formatCurrency(detail.lastPayment.amount) : "-"} note={detail?.lastPayment ? formatDate(detail.lastPayment.paidAt, true) : "No payout yet"} tone="sky" />
              </div>
              <Panel>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div><h4 className="font-semibold">Pending earning items</h4><p className="text-xs text-[var(--muted)]">These items make up the current payable balance.</p></div>
                  <Badge tone="amber">{detail?.unpaidItemCount ?? 0} unpaid</Badge>
                </div>
                <div className="space-y-2">
                  {(detail?.outstandingAllocations ?? []).map((allocation) => (
                    <button className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--panel-border)] p-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]" key={allocation.earningTransactionId} onClick={() => onOpenAllocation(allocation)} type="button">
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold underline decoration-transparent underline-offset-4 group-hover:decoration-current">{allocation.label}</p><Badge tone={allocation.sourceType === "MEASUREMENT" ? "violet" : allocation.sourceType.startsWith("DELIVERY") ? "sky" : "amber"}>{formatStatus(allocation.sourceType)}</Badge></div><p className="mt-1 text-xs text-[var(--muted)]">{allocation.sourceId ?? allocation.earningTransactionId} · {formatDate(allocation.earnedAt, true)} · Open linked record</p></div>
                      <p className="shrink-0 font-bold tabular-nums">{formatCurrency(allocation.amount)}</p>
                    </button>
                  ))}
                  {!(detail?.outstandingAllocations?.length) ? <EmptyState message="No unpaid earning items." /> : null}
                </div>
              </Panel>
              <Panel>
                <h4 className="mb-3 font-semibold">Payout history</h4>
                <div className="space-y-2">
                  {(detail?.payments ?? []).map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-[var(--panel-border)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{formatCurrency(payment.amount)}</p><Badge tone={payment.allocationMode === "EXACT" ? "emerald" : "amber"}>{payment.allocationMode === "EXACT" ? "Exact statement" : "Reconstructed"}</Badge></div>
                          <p className="text-xs text-[var(--muted)]">{payment.notes ?? payment.referenceNumber ?? "Weekly payout"}</p>
                        </div>
                        <p className="text-xs text-[var(--muted)]">{formatDate(payment.paidAt, true)}</p>
                      </div>
                      <div className="mt-3 space-y-1.5 border-t border-[var(--panel-border)] pt-3">
                        {(payment.allocations ?? []).map((allocation) => (
                          <button className="flex w-full items-start justify-between gap-3 rounded-lg p-1 text-left text-xs hover:bg-[var(--accent-soft)]" key={`${payment.id}-${allocation.earningTransactionId}-${allocation.amount}`} onClick={() => onOpenAllocation(allocation)} type="button">
                            <div className="min-w-0"><p className="truncate font-semibold text-[var(--foreground)]">{allocation.label}</p><p className="truncate text-[var(--muted)]">{formatStatus(allocation.sourceType)} · {allocation.sourceId ?? "Wallet credit"}</p></div>
                            <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(allocation.amount)}</span>
                          </button>
                        ))}
                        {!(payment.allocations?.length) ? <p className="text-xs text-[var(--muted)]">No source items could be reconstructed for this legacy payout.</p> : null}
                      </div>
                      {payment.receiptUrl?.startsWith("data:image") || /\.(png|jpe?g|webp)$/i.test(payment.receiptUrl) ? (
                        <a href={payment.receiptUrl} target="_blank" rel="noreferrer"><img alt="Payment proof" className="mt-3 max-h-48 rounded-2xl border border-[var(--panel-border)] object-contain" src={payment.receiptUrl} /></a>
                      ) : (
                        <a className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)]" href={payment.receiptUrl} target="_blank" rel="noreferrer">Open payment proof</a>
                      )}
                    </div>
                  ))}
                  {!(detail?.payments?.length) ? <EmptyState message="No payments have been recorded." /> : null}
                </div>
              </Panel>
            </div>
          )}
          <Dialog.Close className="absolute right-4 top-4 rounded-full p-2 hover:bg-[var(--accent-soft)]"><X size={18} /></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PayoutDialog({
  draft,
  onChange,
  onSubmit,
  open,
  pending,
  row,
  setOpen
}: {
  draft: { amount: string; receiptUrl: string; notes: string; referenceNumber: string };
  onChange: (draft: { amount: string; receiptUrl: string; notes: string; referenceNumber: string }) => void;
  onSubmit: () => void;
  open: boolean;
  pending: boolean;
  row: WalletPayoutRow | null;
  setOpen: (open: boolean) => void;
}) {
  const [uploadingProof, setUploadingProof] = useState(false);

  async function handleProofUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Upload a PNG, JPG, or WEBP payment screenshot");
      return;
    }
    try {
      setUploadingProof(true);
      const uploaded = await uploadAdminMedia(file);
      onChange({ ...draft, receiptUrl: uploaded.url, notes: file.name });
      toast.success("Payment proof uploaded");
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setUploadingProof(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => {
      if (pending && !next) return;
      setOpen(next);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-5 shadow-2xl">
          {pending ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[24px] bg-white/80 text-[var(--deep)] backdrop-blur-sm">
              <LoaderCircle className="h-7 w-7 animate-spin text-[var(--accent)]" />
              <p className="mt-3 text-sm font-semibold">Saving payout...</p>
            </div>
          ) : null}
          <Dialog.Title className="text-xl font-semibold">Record weekly payout</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--muted)]">
            Debit the wallet only after transfer proof is available.
          </Dialog.Description>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{row?.name ?? "Partner"}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{row?.phone || "No phone"} - {row?.userType === "DELIVERY_PARTNER" ? "Delivery partner" : "Tailor"}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Wallet</p>
                  <p className="font-bold">{formatCurrency(row?.walletBalance ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">This week</p>
                  <p className="font-bold">{formatCurrency(row?.currentWeekEarnings ?? 0)}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 border-t border-[var(--panel-border)] pt-3 text-sm">
                {row?.userType === "TAILOR" ? (
                  <><PayoutPreviewLine label="Stitching" value={row.pendingBreakdown?.STITCHING ?? 0} /><PayoutPreviewLine label="Measurement visits" value={row.pendingBreakdown?.MEASUREMENT ?? 0} /></>
                ) : (
                  <><PayoutPreviewLine label="Delivery tasks" value={row?.pendingBreakdown?.DELIVERY_TASK ?? 0} /><PayoutPreviewLine label="Delivery batches" value={row?.pendingBreakdown?.DELIVERY_BATCH ?? 0} /></>
                )}
                <PayoutPreviewLine label="Bonus / adjustment" value={(row?.pendingBreakdown?.BONUS ?? 0) + (row?.pendingBreakdown?.ADJUSTMENT ?? 0)} />
                <p className="pt-1 text-xs text-[var(--muted)]">This payout will permanently record {row?.unpaidItemCount ?? 0} included earning item{row?.unpaidItemCount === 1 ? "" : "s"}.</p>
              </div>
            </div>
            <Field label="Payout amount">
              <input className="w-full cursor-not-allowed rounded-2xl border border-[var(--panel-border)] bg-slate-100 px-4 py-3 font-semibold text-[var(--foreground)]" value={draft.amount} readOnly />
              <p className="mt-1 text-xs text-[var(--muted)]">The full pending wallet balance is paid to avoid partially settled order proofs.</p>
            </Field>
            <Field label="Payment proof screenshot">
              <input
                accept="image/png,image/jpeg,image/webp"
                className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void handleProofUpload(file);
                }}
              />
              {uploadingProof ? <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[var(--accent)]"><LoaderCircle className="h-4 w-4 animate-spin" />Uploading proof...</p> : null}
              {draft.receiptUrl ? <img alt="Uploaded payment proof" className="mt-3 max-h-44 w-full rounded-2xl border border-[var(--panel-border)] bg-white object-contain" src={draft.receiptUrl} /> : null}
            </Field>
            <Field label="Bank / UPI reference (optional)">
              <input className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)]" value={draft.referenceNumber} onChange={(event) => onChange({ ...draft, referenceNumber: event.target.value })} placeholder="UTR or transaction ID" />
            </Field>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild><ActionButton disabled={pending} variant="secondary">Cancel</ActionButton></Dialog.Close>
              <ActionButton disabled={pending || uploadingProof || !draft.receiptUrl.trim() || Number(draft.amount) <= 0} onClick={onSubmit}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Save payout
              </ActionButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PayoutPreviewLine({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-[var(--muted)]">{label}</span><span className="font-semibold tabular-nums">{formatCurrency(value)}</span></div>;
}

export function getNextTwoBatches(now: Date = new Date()) {
  const batches: Array<{ label: string; date: Date; round: "ONE_PM" | "SIX_PM" }> = [];
  
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  
  const candidates = [
    { date: today, hour: 13, round: "ONE_PM" as const, label: "Today, 1:00 PM" },
    { date: today, hour: 18, round: "SIX_PM" as const, label: "Today, 6:00 PM" },
    { date: tomorrow, hour: 13, round: "ONE_PM" as const, label: "Tomorrow, 1:00 PM" },
    { date: tomorrow, hour: 18, round: "SIX_PM" as const, label: "Tomorrow, 6:00 PM" },
    { date: dayAfter, hour: 13, round: "ONE_PM" as const, label: "Day After, 1:00 PM" },
    { date: dayAfter, hour: 18, round: "SIX_PM" as const, label: "Day After, 6:00 PM" }
  ];
  
  for (const cand of candidates) {
    const candDate = new Date(cand.date);
    candDate.setHours(cand.hour, 0, 0, 0);
    if (candDate > now) {
      batches.push({
        label: cand.label,
        date: candDate,
        round: cand.round
      });
      if (batches.length === 2) break;
    }
  }
  
  return batches;
}

function PendingRetryOrdersPanel({
  rows,
  pending,
  onOpen,
  onAction
}: {
  rows: DeliveryRequest[];
  pending: boolean;
  onOpen: (request: DeliveryRequest) => void;
  onAction: (taskId: string, action: string) => void;
}) {
  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Pending Retry Orders</h3>
          <p className="text-sm text-[var(--muted)]">Failed deliveries waiting for the next batch or admin action.</p>
        </div>
        <StatusBadge value={`${rows.length} pending`} />
      </div>
      {rows.length ? (
        <div className="grid gap-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--foreground)]">{row.taskId ?? row.id}</p>
                    <StatusBadge value={row.retryStatus ?? "PENDING_RETRY"} />
                    <StatusBadge value={row.lastFailureReason ?? "Failed"} />
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{row.customerName ?? "Customer"} - {row.customerPhone ?? "No phone"}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Retry {row.retryCount ?? 0}/3
                    {row.nextScheduledBatch ? ` - Next batch ${formatDate(row.nextScheduledBatch)}` : " - Admin action required"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton className="px-3 py-2" disabled={pending} onClick={() => onAction(row.id, "retry")}>Retry Now</ActionButton>
                  {getNextTwoBatches().map((batchOpt, idx) => (
                    <ActionButton
                      key={idx}
                      className="px-3 py-2"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => onAction(row.id, `assign_${batchOpt.round}_${batchOpt.date.toISOString()}`)}
                    >
                      Assign {batchOpt.label}
                    </ActionButton>
                  ))}
                  <ActionButton className="px-3 py-2" variant="secondary" disabled={pending} onClick={() => onAction(row.id, "resolve")}>Mark Resolved</ActionButton>
                  <ActionButton className="px-3 py-2" variant="secondary" disabled={pending} onClick={() => onAction(row.id, "cancel")}>Cancel</ActionButton>
                  <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row)}>View</ActionButton>
                  {row.customerPhone ? (
                    <ActionButton className="px-3 py-2" variant="secondary" onClick={() => window.open(`tel:${row.customerPhone}`)}>
                      <Phone className="h-4 w-4" />
                      Contact
                    </ActionButton>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-5 text-sm text-[var(--muted)]">No retry orders need attention.</div>
      )}
    </Panel>
  );
}

function isoToIstLocalInput(value?: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function istLocalInputToIso(value: string) {
  return value ? new Date(`${value}:00+05:30`).toISOString() : null;
}

function FestivalThemeCard({ draft, serverState, pending, onChange, onSave }: {
  draft: FestivalThemeConfig;
  serverState?: FestivalThemeState;
  pending: boolean;
  onChange: (value: FestivalThemeConfig) => void;
  onSave: (value: FestivalThemeConfig) => void;
}) {
  const status = festivalThemeStatus(draft);
  const datesValid = !draft.startAt || !draft.endAt || new Date(draft.startAt).getTime() < new Date(draft.endAt).getTime();
  const statusTone = status === "Active" ? "bg-emerald-100 text-emerald-800" : status === "Scheduled" ? "bg-amber-100 text-amber-800" : status === "Expired" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700";
  const update = (patch: Partial<FestivalThemeConfig>) => onChange({ ...draft, ...patch });
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Sparkles className="text-amber-500" size={22} /><h3 className="text-lg font-semibold">Festival Theme Manager</h3></div>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">Publish a centrally controlled customer-app theme. Times are entered and evaluated in Asia/Kolkata.</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", statusTone)}>{status}</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Festival">
          <select className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2.5" value={draft.themeId} onChange={(event) => update({ themeId: event.target.value })}>
            <option value="diwali">Diwali Darji Edition</option>
          </select>
        </Field>
        <Field label="Asset version">
          <input className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2.5" value={draft.assetVersion} onChange={(event) => update({ assetVersion: event.target.value })} />
        </Field>
        <Field label="Display title">
          <input className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2.5" value={draft.title} onChange={(event) => update({ title: event.target.value })} />
        </Field>
        <Field label="Greeting template">
          <input className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2.5" value={draft.greetingTemplate} onChange={(event) => update({ greetingTemplate: event.target.value })} />
          <span className="mt-1 block text-xs text-[var(--muted)]">Use {"{firstName}"} for the signed-in customer.</span>
        </Field>
        <Field label="Starts at (IST, optional)">
          <input type="datetime-local" className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2.5" value={isoToIstLocalInput(draft.startAt)} onChange={(event) => update({ startAt: istLocalInputToIso(event.target.value) })} />
        </Field>
        <Field label="Ends at (IST, optional)">
          <input type="datetime-local" className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2.5" value={isoToIstLocalInput(draft.endAt)} onChange={(event) => update({ endAt: istLocalInputToIso(event.target.value) })} />
          {!datesValid ? <span className="mt-1 block text-xs font-semibold text-rose-600">End time must be after start time.</span> : null}
        </Field>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ["page", "Page"],
          ["hero", "Hero"],
          ["accent", "Accent"],
          ["fabric", "Fabric"]
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2">
            <span className="text-sm font-semibold">{label}</span>
            <input
              type="color"
              aria-label={`${label} color`}
              className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent"
              value={draft.palette[key]}
              onChange={(event) => update({ palette: { ...draft.palette, [key]: event.target.value.toUpperCase() } })}
            />
          </label>
        ))}
      </div>

      <button type="button" aria-pressed={draft.enabled} onClick={() => update({ enabled: !draft.enabled })} className={cn("mt-5 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition", draft.enabled ? "border-emerald-400 bg-emerald-50" : "border-[var(--panel-border)] bg-[var(--panel)]")}>
        <span><span className="block font-bold">{draft.enabled ? "Festival theme enabled" : "Festival theme disabled"}</span><span className="mt-1 block text-xs text-[var(--muted)]">When enabled, the schedule determines whether customers see the festive design.</span></span>
        {draft.enabled ? <ToggleRight className="text-emerald-600" size={30} /> : <ToggleLeft className="text-slate-500" size={30} />}
      </button>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[#f7f9fc] p-4 text-slate-900">
          <p className="text-xs font-black tracking-wider text-slate-500">NORMAL PREVIEW</p>
          <p className="mt-4 text-sm font-semibold text-slate-500">Good morning</p><p className="text-lg font-black">Customer</p>
          <div className="mt-4 rounded-2xl bg-[#2b1503] p-4 text-white"><p className="text-xs font-black text-amber-500">TAILORING REQUEST</p><p className="mt-2 font-black">Get Tailoring Done<br />at Your Doorstep</p></div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border p-4" style={{ backgroundColor: draft.palette.page, borderColor: draft.palette.accent, color: draft.palette.hero }}>
          <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full opacity-15" style={{ backgroundColor: draft.palette.fabric }} />
          <p className="text-xs font-black tracking-wider" style={{ color: draft.palette.fabric }}>DIWALI PREVIEW</p>
          <p className="mt-4 text-lg font-black" style={{ color: draft.palette.fabric }}>{draft.greetingTemplate.replace("{firstName}", "Customer")} 🪔</p>
          <div className="mt-4 rounded-2xl border p-4 text-white" style={{ backgroundColor: draft.palette.hero, borderColor: draft.palette.accent }}><p className="text-xs font-black" style={{ color: draft.palette.accent }}>FESTIVE SEASON</p><p className="mt-2 font-black">Get Tailoring Done<br />at Your Doorstep</p><div className="mt-3 h-1 w-24 rounded opacity-70" style={{ backgroundColor: draft.palette.accent }} /></div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ActionButton disabled={pending || !datesValid} onClick={() => onSave(draft)}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Save / Publish
        </ActionButton>
        <ActionButton variant="secondary" disabled={pending || !draft.enabled} onClick={() => onSave({ ...draft, enabled: false, startAt: null, endAt: null })}>
          <RotateCcw className="h-4 w-4" />Turn Off / Restore Normal
        </ActionButton>
        {serverState?.updatedAt ? <span className="text-xs text-[var(--muted)]">Last published {formatDate(serverState.updatedAt, true)}</span> : null}
      </div>
    </Panel>
  );
}

function ServiceAreaSettingsCard({
  draft,
  interests,
  pending,
  onChange,
  onSave
}: {
  draft: ServiceAreaConfig;
  interests?: Awaited<ReturnType<typeof getServiceAreaInterests>>;
  pending: boolean;
  onChange: (value: ServiceAreaConfig) => void;
  onSave: (value: ServiceAreaConfig) => void;
}) {
  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);
  const [areaSearch, setAreaSearch] = useState("");
  const [searchingArea, setSearchingArea] = useState(false);
  const [unlocatedAreaIds, setUnlocatedAreaIds] = useState<Set<string>>(() => new Set());
  const updateArea = (index: number, patch: Partial<ServiceAreaConfig["areas"][number]>) => {
    onChange({ ...draft, areas: draft.areas.map((area, areaIndex) => areaIndex === index ? { ...area, ...patch } : area) });
  };
  const selectedArea = draft.areas[selectedAreaIndex];

  async function searchAndSelectArea() {
    const query = areaSearch.trim();
    if (query.length < 3) {
      toast.error("Enter an area with its city or state");
      return;
    }
    setSearchingArea(true);
    try {
      const result = await geocodeServiceArea(query);
      if (selectedArea) {
        updateArea(selectedAreaIndex, { name: query, latitude: result.latitude, longitude: result.longitude, shape: "circle", polygon: [] });
        setUnlocatedAreaIds((current) => {
          const next = new Set(current);
          next.delete(selectedArea.id);
          return next;
        });
      } else {
        onChange({
          ...draft,
          areas: [...draft.areas, { id: `area-${Date.now()}`, name: query, latitude: result.latitude, longitude: result.longitude, radiusKm: 5, shape: "circle", polygon: [], enabled: true }]
        });
        setSelectedAreaIndex(draft.areas.length);
      }
      toast.success("Area located. Confirm the centre and radius on the map.");
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setSearchingArea(false);
    }
  }
  const hasIncompletePolygon = draft.areas.some((area) => area.enabled && area.shape === "polygon" && area.polygon.length < 3);
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Customer service areas</h3>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">One master control for launch-area availability. When disabled, customers can request service everywhere. When enabled, the pickup coordinates must fall inside an active area below.</p>
        </div>
        <button
          type="button"
          aria-pressed={draft.enabled}
          onClick={() => onChange({ ...draft, enabled: !draft.enabled })}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 font-semibold text-white", draft.enabled ? "bg-emerald-600" : "bg-slate-600")}
        >
          {draft.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          {draft.enabled ? "Filtering enabled" : "Filtering disabled"}
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">Outside-area title
          <input className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 py-2" value={draft.unavailableTitle} onChange={(event) => onChange({ ...draft, unavailableTitle: event.target.value })} />
        </label>
        <label className="text-sm font-medium">Outside-area message
          <input className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 py-2" value={draft.unavailableMessage} onChange={(event) => onChange({ ...draft, unavailableMessage: event.target.value })} />
        </label>
      </div>
      <div className="mt-5 rounded-2xl border border-[var(--panel-border)] bg-black/[0.02] p-4 dark:bg-white/[0.03]">
        <h4 className="font-semibold">Find and select an area</h4>
        <p className="mt-1 text-sm text-[var(--muted)]">Search by locality and city, then fine-tune the centre by clicking OpenStreetMap. Coordinates are saved internally.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-11 flex-1 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3"
            placeholder="Example: Dwarka, New Delhi"
            value={areaSearch}
            onChange={(event) => setAreaSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchAndSelectArea(); } }}
          />
          <ActionButton disabled={searchingArea} onClick={() => void searchAndSelectArea()}>
            {searchingArea ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Locate area
          </ActionButton>
        </div>
      </div>
      <div className="mt-4">
        {selectedArea ? (
          <div className="mb-3 space-y-3 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-auto font-semibold">Editing: {selectedArea.name}</span>
              <button type="button" className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", selectedArea.shape === "circle" ? "bg-amber-500 text-black" : "bg-white text-slate-700 shadow-sm")} onClick={() => updateArea(selectedAreaIndex, { shape: "circle", polygon: [] })}>Circle</button>
              <button type="button" className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", selectedArea.shape === "polygon" ? "bg-amber-500 text-black" : "bg-white text-slate-700 shadow-sm")} onClick={() => updateArea(selectedAreaIndex, { shape: "polygon", polygon: [] })}>Custom boundary</button>
            </div>
            {selectedArea.shape === "circle" ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-xs">Drag the centre dot. The coverage circle moves with it.</span>
                <span className="text-xs font-semibold">Quick radius:</span>
                {[2, 5, 10, 15, 25].map((radius) => (
                  <button key={radius} type="button" className={cn("rounded-lg px-2.5 py-1 text-xs font-bold", selectedArea.radiusKm === radius ? "bg-amber-500 text-black" : "bg-white text-slate-700 shadow-sm")} onClick={() => updateArea(selectedAreaIndex, { radiusKm: radius })}>{radius} km</button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-xs">Click around the boundary to connect dots. Minimum 3, maximum 60. Drag a dot to refine it.</span>
                <Badge tone="slate">{selectedArea.polygon.length} dots</Badge>
                <button type="button" disabled={!selectedArea.polygon.length} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-50" onClick={() => updateArea(selectedAreaIndex, { polygon: selectedArea.polygon.slice(0, -1) })}>Undo dot</button>
                <button type="button" disabled={!selectedArea.polygon.length} className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 disabled:opacity-50" onClick={() => updateArea(selectedAreaIndex, { polygon: [] })}>Clear boundary</button>
              </div>
            )}
          </div>
        ) : null}
        <ServiceAreaMap
          areas={draft.areas}
          selectedIndex={selectedAreaIndex}
          onSelectArea={setSelectedAreaIndex}
          onDragPoint={(areaIndex, pointIndex, latitude, longitude) => {
            const area = draft.areas[areaIndex];
            if (!area) return;
            if (pointIndex == null) {
              updateArea(areaIndex, { latitude, longitude });
              return;
            }
            updateArea(areaIndex, { polygon: area.polygon.map((point, index) => index === pointIndex ? { latitude, longitude } : point) });
          }}
          onSelectPoint={(latitude, longitude) => {
            if (!draft.areas[selectedAreaIndex]) {
              const id = `area-${Date.now()}`;
              onChange({ ...draft, areas: [...draft.areas, { id, name: `Map area ${draft.areas.length + 1}`, latitude, longitude, radiusKm: 5, shape: "circle", polygon: [], enabled: true }] });
              setSelectedAreaIndex(draft.areas.length);
              toast.success("Area added. Rename it or search for the exact locality.");
              return;
            }
            const area = draft.areas[selectedAreaIndex];
            if (area.shape === "polygon") {
              if (area.polygon.length >= 60) {
                toast.error("A custom boundary can contain up to 60 dots");
                return;
              }
              updateArea(selectedAreaIndex, { polygon: [...area.polygon, { latitude, longitude }] });
            } else {
              updateArea(selectedAreaIndex, { latitude, longitude });
            }
            setUnlocatedAreaIds((current) => {
              const next = new Set(current);
              next.delete(draft.areas[selectedAreaIndex].id);
              return next;
            });
          }}
        />
      </div>
      <div className="mt-5 space-y-3">
        {draft.areas.map((area, index) => (
          <div key={area.id} className={cn("grid gap-3 rounded-2xl border p-4 md:grid-cols-6", index === selectedAreaIndex ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/10" : "border-[var(--panel-border)]")}>
            <label className="text-xs font-semibold md:col-span-3">Area name
              <input className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 py-2 text-sm" value={area.name} onChange={(event) => updateArea(index, { name: event.target.value })} />
            </label>
            {area.shape === "circle" ? (
              <label className="text-xs font-semibold">Radius (km)
                <input type="number" min="0.1" step="0.1" className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 py-2 text-sm" value={area.radiusKm} onChange={(event) => updateArea(index, { radiusKm: Number(event.target.value) })} />
              </label>
            ) : <div className="flex items-end text-xs font-semibold">{area.polygon.length} boundary dots</div>}
            <div className="flex items-end gap-2 md:col-span-2">
              <button type="button" className="min-h-10 rounded-xl bg-amber-100 px-3 text-xs font-semibold text-amber-900" onClick={() => setSelectedAreaIndex(index)}>{index === selectedAreaIndex ? "Selected" : "Edit on map"}</button>
              <button type="button" className={cn("min-h-10 flex-1 rounded-xl px-2 text-xs font-semibold", area.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700")} onClick={() => updateArea(index, { enabled: !area.enabled })}>{area.enabled ? "Active" : "Paused"}</button>
              <button type="button" aria-label={`Remove ${area.name}`} className="grid min-h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-700" onClick={() => { onChange({ ...draft, areas: draft.areas.filter((_, areaIndex) => areaIndex !== index) }); setUnlocatedAreaIds((current) => { const next = new Set(current); next.delete(area.id); return next; }); setSelectedAreaIndex(0); }}><Trash2 size={16} /></button>
            </div>
            <details className="text-xs text-[var(--muted)] md:col-span-6">
              <summary className="cursor-pointer font-semibold">Advanced coordinates</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input aria-label="Latitude" type="number" step="any" className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 py-2" value={area.latitude} onChange={(event) => updateArea(index, { latitude: Number(event.target.value) })} />
                <input aria-label="Longitude" type="number" step="any" className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 py-2" value={area.longitude} onChange={(event) => updateArea(index, { longitude: Number(event.target.value) })} />
              </div>
            </details>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-3">
        <ActionButton variant="secondary" onClick={() => { const index = draft.areas.length; const id = `area-${Date.now()}`; onChange({ ...draft, areas: [...draft.areas, { id, name: "New launch area", latitude: 28.6139, longitude: 77.209, radiusKm: 5, shape: "circle", polygon: [], enabled: true }] }); setUnlocatedAreaIds((current) => new Set(current).add(id)); setSelectedAreaIndex(index); }}><Plus className="h-4 w-4" />Add area</ActionButton>
        <ActionButton disabled={pending || unlocatedAreaIds.size > 0 || hasIncompletePolygon || (draft.enabled && !draft.areas.some((area) => area.enabled))} onClick={() => onSave(draft)}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save service areas</ActionButton>
      </div>
      {draft.enabled && !draft.areas.some((area) => area.enabled) ? <p className="mt-3 text-sm font-semibold text-rose-700">Add and activate at least one area before enabling filtering.</p> : null}
      {unlocatedAreaIds.size > 0 ? <p className="mt-3 text-sm font-semibold text-amber-700">Locate every new area by searching or clicking its centre on the map before saving.</p> : null}
      {hasIncompletePolygon ? <p className="mt-3 text-sm font-semibold text-amber-700">Each active custom boundary needs at least three connected dots before saving.</p> : null}
      <div className="mt-6 border-t border-[var(--panel-border)] pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold">Customer launch requests</h4>
            <p className="text-sm text-[var(--muted)]">Latest out-of-area customers who tapped Request Darji Here.</p>
          </div>
          <Badge tone="slate">{interests?.uniqueCustomers ?? 0} people · {interests?.total ?? 0} area requests</Badge>
        </div>
        <div className="mt-3 space-y-2">
          {interests?.items.slice(0, 5).map((interest) => (
            <div key={interest.id} className="rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
              <p className="font-medium">{interest.address}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--foreground)]">{interest.customerName ?? "Customer"} · {interest.customerPhone ?? "Phone unavailable"}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{interest.latitude.toFixed(4)}, {interest.longitude.toFixed(4)} · {formatDate(interest.createdAt, true)}</p>
            </div>
          ))}
          {interests && interests.items.length === 0 ? <p className="text-sm text-[var(--muted)]">No launch requests yet.</p> : null}
        </div>
      </div>
    </Panel>
  );
}

function defaultTailorTutorialMediaDraft(): TailorTutorialMediaDraft {
  return {
    title: "How Darji Works for Tailors",
    description: "Watch the complete tutorial before submitting verification.",
    videoUrl: "",
    thumbnailUrl: "",
    durationSeconds: 15,
    images: []
  };
}

function normalizeTailorTutorialDraft(value: unknown): TailorTutorialMediaDraft {
  const base = defaultTailorTutorialMediaDraft();
  if (!value || typeof value !== "object") return base;
  const raw = value as Record<string, unknown>;
  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : base.title,
    description: typeof raw.description === "string" && raw.description.trim() ? raw.description : base.description,
    videoUrl: typeof raw.videoUrl === "string" ? raw.videoUrl : "",
    thumbnailUrl: typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : "",
    durationSeconds: Number.isFinite(Number(raw.durationSeconds)) ? Number(raw.durationSeconds) : base.durationSeconds,
    images: Array.isArray(raw.images) ? raw.images.filter((item): item is string => typeof item === "string") : []
  };
}

function PlatformStatusCard({
  draft,
  pending,
  onChange,
  onSave
}: {
  draft: PlatformStatus;
  pending: boolean;
  onChange: (value: PlatformStatus) => void;
  onSave: (value: PlatformStatus) => void;
}) {
  const valid = draft.title.trim().length >= 2 && draft.description.trim().length >= 2;
  const targetApps: Array<{ id: MaintenanceApp; label: string; description: string }> = [
    { id: "CUSTOMER_APP", label: "Customer app", description: "Darji mobile app for customers" },
    { id: "TAILOR_APP", label: "Tailor app", description: "Tailor workspace and requests" },
    { id: "DELIVERY_APP", label: "Delivery app", description: "Delivery partner operations" },
    { id: "CUSTOMER_WEB", label: "Website", description: "Customer web experience" }
  ];
  // The production API can briefly return the pre-targeting setting shape
  // during a rolling deployment. Treat the omitted field as no selection.
  const maintenanceApps = draft.maintenanceApps ?? [];
  const maintenanceActive = draft.maintenanceMode && maintenanceApps.length > 0;
  const toggleTarget = (app: MaintenanceApp) => {
    const nextMaintenanceApps = maintenanceApps.includes(app)
      ? maintenanceApps.filter((item) => item !== app)
      : [...maintenanceApps, app];
    onChange({ ...draft, maintenanceApps: nextMaintenanceApps, maintenanceMode: nextMaintenanceApps.length ? draft.maintenanceMode : false, allowAdminAccess: true });
  };
  const toggleMode = () => {
    if (!valid || pending) return;
    if (!maintenanceApps.length) return;
    const next = { ...draft, maintenanceMode: !maintenanceActive, allowAdminAccess: true as const };
    onChange(next);
    onSave(next);
  };

  return (
    <Panel>
      <div className="flex flex-col gap-5">
        <div className={cn("rounded-3xl border p-5", maintenanceActive ? "border-rose-300 bg-rose-50" : "border-emerald-300 bg-emerald-50")}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full", maintenanceActive ? "bg-rose-600" : "bg-emerald-600")} />
                <h3 className={cn("text-xl font-bold", maintenanceActive ? "text-rose-900" : "text-emerald-900")}>
                  {maintenanceActive ? "Targeted Maintenance" : "Platform Live"}
                </h3>
              </div>
              <p className={cn("mt-2 text-sm", maintenanceActive ? "text-rose-700" : "text-emerald-700")}>
                {maintenanceActive
                  ? `${maintenanceApps.length} selected experience${maintenanceApps.length === 1 ? " is" : "s are"} currently paused.`
                  : "All Darji customer and partner workflows are available."}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={maintenanceActive}
              className={cn("inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60", maintenanceActive ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}
              disabled={pending || !valid || (!maintenanceActive && !maintenanceApps.length)}
              onClick={toggleMode}
            >
              {pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : maintenanceActive ? <ToggleLeft size={22} /> : <ToggleRight size={22} />}
              {maintenanceActive ? "Set Selected Apps Live" : "Enable selected apps"}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-3"><h4 className="font-bold">Apps under maintenance</h4><p className="mt-1 text-sm text-[var(--muted)]">Only selected experiences show the maintenance page. Admin access always remains available.</p></div>
          <div className="grid gap-3 md:grid-cols-2">{targetApps.map((app) => {
            const selected = maintenanceApps.includes(app.id);
            return <button className={cn("flex items-start justify-between rounded-2xl border p-4 text-left transition", selected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--panel-border)] bg-[var(--panel)] hover:border-[var(--accent)]")} key={app.id} onClick={() => toggleTarget(app.id)} type="button"><span><span className="block font-semibold">{app.label}</span><span className="mt-1 block text-xs text-[var(--muted)]">{app.description}</span></span>{selected ? <ToggleRight className="shrink-0 text-emerald-600" /> : <ToggleLeft className="shrink-0 text-[var(--muted)]" />}</button>;
          })}</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Maintenance title">
            <input
              className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
              maxLength={120}
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              placeholder="We'll Be Back Soon"
            />
          </Field>
          <Field label="Estimated completion (optional)">
            <input
              className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)] disabled:opacity-50"
              disabled={!draft.showEstimatedCompletion}
              maxLength={160}
              value={draft.estimatedCompletion ?? ""}
              onChange={(event) => onChange({ ...draft, estimatedCompletion: event.target.value || null })}
              placeholder="Approximately 30 minutes"
            />
          </Field>
        </div>

        <Field label="Maintenance description">
          <textarea
            className="min-h-32 w-full resize-y rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
            maxLength={600}
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            placeholder="We're improving Darji to serve you better. Please check back shortly."
          />
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-left"
            onClick={() => onChange({ ...draft, showEstimatedCompletion: !draft.showEstimatedCompletion })}
          >
            <span><span className="block font-semibold">Show estimated completion</span><span className="mt-1 block text-xs text-[var(--muted)]">Display the ETA on mobile maintenance screens.</span></span>
            {draft.showEstimatedCompletion ? <ToggleRight className="text-emerald-600" /> : <ToggleLeft className="text-[var(--muted)]" />}
          </button>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <span><span className="block font-semibold">Allow Admin Access</span><span className="mt-1 block text-xs text-[var(--muted)]">Always enabled so the platform can be restored.</span></span>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><ShieldCheck size={20} />Enabled</div>
          </div>
        </div>

        <div className="flex justify-end">
          <ActionButton disabled={pending || !valid} onClick={() => onSave({ ...draft, allowAdminAccess: true })}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Save message settings
          </ActionButton>
        </div>
      </div>
    </Panel>
  );
}

function defaultDeliveryBatchSettingsDraft(): DeliveryBatchSettingsDraft {
  return {
    lockMinutes: 45,
    maxOrdersPerBatch: 10
  };
}

function normalizeDeliveryBatchSettings(value: unknown): DeliveryBatchSettingsDraft {
  const base = defaultDeliveryBatchSettingsDraft();
  if (!value || typeof value !== "object") return base;
  const raw = value as Record<string, unknown>;
  return {
    lockMinutes: Number.isFinite(Number(raw.lockMinutes)) ? Math.max(45, Number(raw.lockMinutes)) : base.lockMinutes,
    maxOrdersPerBatch: Number.isFinite(Number(raw.maxOrdersPerBatch)) ? Math.max(1, Number(raw.maxOrdersPerBatch)) : base.maxOrdersPerBatch
  };
}

function MarketingAudienceCard({
  data,
  error,
  loading,
  onRetry
}: {
  data?: MarketingAudienceSummary;
  error?: string;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[var(--panel-border)] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Website audience</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Live interest recorded from the pickup popup and newsletter form.</p>
        </div>
        <ActionButton disabled={loading} onClick={onRetry} variant="secondary">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Refresh
        </ActionButton>
      </div>

      {error ? <div className="p-4 sm:p-6"><InlineError message={error} /></div> : loading && !data ? <LoadingState label="Loading website audience…" /> : (
        <>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-800"><Bell className="h-4 w-4" />Launch interest</div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-[var(--deep)]">{(data?.launchNotifyCount ?? 0).toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Unique browsers that clicked Notify Me</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-800"><Mail className="h-4 w-4" />Newsletter subscribers</div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-[var(--deep)]">{(data?.newsletterCount ?? 0).toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Unique emails submitted through the footer</p>
            </div>
          </div>

          <div className="border-t border-[var(--panel-border)] px-4 py-5 sm:px-6">
            <div className="mb-3">
              <h4 className="font-semibold text-[var(--foreground)]">Subscriber emails</h4>
              <p className="mt-1 text-xs text-[var(--muted)]">Newest footer signups appear first.</p>
            </div>
            {data?.newsletterSignups.length ? (
              <div className="max-h-80 overflow-auto rounded-2xl border border-[var(--panel-border)]">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--panel)] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    <tr><th className="px-4 py-3 font-semibold">S. No.</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Subscribed</th></tr>
                  </thead>
                  <tbody>
                    {data.newsletterSignups.map((signup, signupIndex) => (
                      <tr className="border-t border-[var(--panel-border)]" key={signup.id}>
                        <td className="px-4 py-3 font-semibold tabular-nums text-[var(--muted)]">{signupIndex + 1}</td>
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]"><a className="hover:text-[var(--accent)] hover:underline" href={`mailto:${signup.email}`}>{signup.email}</a></td>
                        <td className="px-4 py-3 text-[var(--muted)]">{formatDate(signup.createdAt, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState message="No footer newsletter signups yet." />}
          </div>
        </>
      )}
    </Panel>
  );
}

function CustomerWebsiteSliderCard({
  draft,
  onChange,
  onSave,
  onUpload,
  pending,
  uploadingSlideId
}: {
  draft: CustomerWebsiteSlider;
  onChange: (draft: CustomerWebsiteSlider) => void;
  onSave: () => void;
  onUpload: (slideId: string, file: File) => void;
  pending: boolean;
  uploadingSlideId: string | null;
}) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const inputClass = "w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";
  const activeSlide = draft.slides[previewIndex] ?? draft.slides[0];
  const validHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
  const buttonContrast = customerWebsiteSliderContrastRatio(draft.buttonTextColor, draft.buttonColor);
  const isValid = Boolean(
    draft.buttonText.trim()
    && validHexColor(draft.buttonColor)
    && validHexColor(draft.buttonTextColor)
    && buttonContrast >= 4.5
    && draft.intervalSeconds >= 3
    && draft.intervalSeconds <= 30
    && draft.slides.length
    && draft.slides.every((slide) => slide.imageUrl.trim() && slide.altText.trim().length >= 2)
  );

  useEffect(() => {
    if (previewIndex >= draft.slides.length) setPreviewIndex(Math.max(draft.slides.length - 1, 0));
  }, [draft.slides.length, previewIndex]);

  const updateSlide = (id: string, patch: Partial<CustomerWebsiteSlider["slides"][number]>) => {
    onChange({ ...draft, slides: draft.slides.map((slide) => slide.id === id ? { ...slide, ...patch } : slide) });
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.slides.length) return;
    const slides = [...draft.slides];
    [slides[index], slides[nextIndex]] = [slides[nextIndex], slides[index]];
    onChange({ ...draft, slides });
    setPreviewIndex(nextIndex);
  };

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-[var(--panel-border)] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold tracking-tight">Homepage slider</h3>
              <Badge tone={draft.enabled ? "emerald" : "slate"}>{draft.enabled ? "Visible" : "Hidden"}</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">Upload up to eight banners, set their display time, and style the fixed booking action once for every slide.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="secondary"
              onClick={() => onChange({ ...draft, enabled: !draft.enabled })}
            >
              {draft.enabled ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
              {draft.enabled ? "Slider enabled" : "Slider hidden"}
            </ActionButton>
            <ActionButton disabled={pending || Boolean(uploadingSlideId) || !isValid} onClick={onSave}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Publish slider
            </ActionButton>
          </div>
        </div>
        {!isValid ? <p className="mt-3 text-sm font-medium text-rose-700">Add at least one image with alt text, use a 3–30 second duration, and keep button color contrast at 4.5:1 or higher.</p> : null}
      </div>

      <div className="border-b border-[var(--panel-border)] bg-[var(--panel-strong)] px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Banner preparation guide</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-[var(--muted)]">Resolution</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--foreground)]">1920 × 640 px</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Aspect ratio</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--foreground)]">3:1</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Format</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">WebP preferred</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">File size</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">Aim below 500 KB</dd>
              </div>
            </dl>
            <p className="mt-3 max-w-4xl text-xs leading-5 text-[var(--muted)]">PNG and JPG are also supported. The full image is preserved without cropping, so other proportions may show blank space at the sides. Keep essential artwork away from the edges and leave the bottom-left area clear for the fixed booking button.</p>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="border-b border-[var(--panel-border)] p-4 sm:p-6 xl:border-b-0 xl:border-r">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Live composition preview</p>
              <p className="mt-1 text-xs text-[var(--muted)]">The CTA stays anchored while the selected artwork changes.</p>
            </div>
            <span className="text-xs font-semibold tabular-nums text-[var(--muted)]">{draft.slides.length ? `${previewIndex + 1} / ${draft.slides.length}` : "No slides"}</span>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white pb-3 shadow-[0_22px_50px_rgba(8,17,31,0.12)] sm:aspect-[3/1] sm:pb-0">
            <div className="relative aspect-[16/7] overflow-hidden bg-[#f7f3ee] sm:absolute sm:inset-0 sm:aspect-auto sm:bg-white">
              {activeSlide?.imageUrl ? (
                <>
                  <img aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl sm:hidden" src={activeSlide.imageUrl} alt="" />
                  <img className="relative h-full w-full object-contain" src={activeSlide.imageUrl} alt={activeSlide.altText || "Slider preview"} />
                </>
              ) : (
                <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--muted)]">Upload an image to preview this slide.</div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(8,17,31,0.18))]" />
            </div>
            <div
              className="relative mx-3 mt-3 flex min-h-11 w-[calc(100%-24px)] items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-[0_12px_28px_rgba(8,17,31,0.22)] sm:absolute sm:bottom-3 sm:left-3 sm:mx-0 sm:mt-0 sm:min-h-10 sm:w-auto"
              style={{ backgroundColor: draft.buttonColor, color: draft.buttonTextColor }}
            >
              {draft.buttonText || "Button label"}<ArrowRight className="h-4 w-4" />
            </div>
            {draft.slides.length > 1 ? (
              <>
                <div className="absolute right-2 top-2 flex items-center rounded-full bg-[#08111f]/82 p-1 text-white sm:hidden">
                  <button aria-label="Preview previous slide" className="grid h-11 w-11 place-items-center rounded-full" onClick={() => setPreviewIndex((previewIndex - 1 + draft.slides.length) % draft.slides.length)} type="button"><ChevronLeft className="h-5 w-5" /></button>
                  <span className="min-w-10 text-center text-xs font-semibold tabular-nums" aria-hidden="true">{previewIndex + 1}/{draft.slides.length}</span>
                  <button aria-label="Preview next slide" className="grid h-11 w-11 place-items-center rounded-full" onClick={() => setPreviewIndex((previewIndex + 1) % draft.slides.length)} type="button"><ChevronRight className="h-5 w-5" /></button>
                </div>
                <div className="absolute bottom-3 right-3 hidden items-center gap-1 rounded-full bg-[#08111f]/82 px-2 py-2 sm:flex">
                  {draft.slides.map((slide, index) => (
                    <button
                      aria-label={`Preview slide ${index + 1}`}
                      aria-current={index === previewIndex ? "true" : undefined}
                      className="grid h-6 w-6 place-items-center rounded-full"
                      key={slide.id}
                      onClick={() => setPreviewIndex(index)}
                      type="button"
                    >
                      <span className={cn("h-1.5 rounded-full bg-white/55 transition-all", index === previewIndex && "w-4 bg-white", index !== previewIndex && "w-1.5")} />
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Time per slide (seconds)">
              <input
                className={inputClass}
                min={3}
                max={30}
                type="number"
                value={draft.intervalSeconds}
                onChange={(event) => onChange({ ...draft, intervalSeconds: Math.min(30, Math.max(3, Number(event.target.value) || 3)) })}
              />
            </Field>
            <Field label="Button text">
              <input
                className={inputClass}
                maxLength={40}
                value={draft.buttonText}
                onChange={(event) => onChange({ ...draft, buttonText: event.target.value })}
                placeholder="Book pickup now"
              />
            </Field>
            <Field label="Button color">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-2">
                <input
                  aria-label="Button color picker"
                  className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  type="color"
                  value={validHexColor(draft.buttonColor) ? draft.buttonColor : "#000000"}
                  onChange={(event) => onChange({ ...draft, buttonColor: event.target.value })}
                />
                <input className="min-w-0 flex-1 bg-transparent text-sm font-medium uppercase outline-none" value={draft.buttonColor} onChange={(event) => onChange({ ...draft, buttonColor: event.target.value })} />
              </div>
            </Field>
            <Field label="Button text color">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-2">
                <input
                  aria-label="Button text color picker"
                  className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  type="color"
                  value={validHexColor(draft.buttonTextColor) ? draft.buttonTextColor : "#ffffff"}
                  onChange={(event) => onChange({ ...draft, buttonTextColor: event.target.value })}
                />
                <input className="min-w-0 flex-1 bg-transparent text-sm font-medium uppercase outline-none" value={draft.buttonTextColor} onChange={(event) => onChange({ ...draft, buttonTextColor: event.target.value })} />
              </div>
            </Field>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Slides</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Drag-free ordering keeps changes precise on touch screens.</p>
            </div>
            <ActionButton
              className="px-3 py-2"
              disabled={draft.slides.length >= 8}
              variant="secondary"
              onClick={() => {
                const id = `slide-${Date.now()}`;
                onChange({ ...draft, slides: [...draft.slides, { id, imageUrl: "", altText: "" }] });
                setPreviewIndex(draft.slides.length);
              }}
            >
              <Plus className="h-4 w-4" /> Add slide
            </ActionButton>
          </div>

          <div className="mt-4 space-y-3">
            {draft.slides.map((slide, index) => (
              <div className={cn("rounded-2xl border p-3 transition", index === previewIndex ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--panel-border)] bg-[var(--panel)]")} key={slide.id}>
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setPreviewIndex(index)} type="button">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0b2241] text-xs font-semibold text-white">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{slide.altText || `Untitled slide ${index + 1}`}</span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{slide.imageUrl || "Image required"}</span>
                  </span>
                  {slide.imageUrl ? <img className="h-10 w-16 shrink-0 rounded-lg object-cover" src={slide.imageUrl} alt="" aria-hidden="true" /> : <ImageIcon className="h-5 w-5 shrink-0 text-[var(--muted)]" />}
                </button>

                {index === previewIndex ? (
                  <div className="mt-3 space-y-3 border-t border-[var(--panel-border)] pt-3">
                    <input className={inputClass} value={slide.imageUrl} onChange={(event) => updateSlide(slide.id, { imageUrl: event.target.value })} placeholder="Image URL" />
                    <input className={inputClass} maxLength={160} value={slide.altText} onChange={(event) => updateSlide(slide.id, { altText: event.target.value })} placeholder="Describe the banner for screen readers" />
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 text-sm font-semibold transition hover:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          event.currentTarget.querySelector("input")?.click();
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {uploadingSlideId === slide.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-[var(--accent)]" />}
                        {slide.imageUrl ? "Replace image" : "Upload image"}
                        <input
                          accept="image/*"
                          className="hidden"
                          disabled={Boolean(uploadingSlideId)}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) onUpload(slide.id, file);
                            event.currentTarget.value = "";
                          }}
                          type="file"
                        />
                      </label>
                      <button aria-label={`Move slide ${index + 1} up`} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] disabled:opacity-40" disabled={index === 0} onClick={() => moveSlide(index, -1)} type="button"><ChevronUp className="h-4 w-4" /></button>
                      <button aria-label={`Move slide ${index + 1} down`} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] disabled:opacity-40" disabled={index === draft.slides.length - 1} onClick={() => moveSlide(index, 1)} type="button"><ChevronDown className="h-4 w-4" /></button>
                      <button aria-label={`Remove slide ${index + 1}`} className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-40" disabled={draft.slides.length === 1} onClick={() => onChange({ ...draft, slides: draft.slides.filter((item) => item.id !== slide.id) })} type="button"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TailorTutorialMediaCard({
  draft,
  onChange,
  onSave,
  onUpload,
  pending,
  uploading
}: {
  draft: TailorTutorialMediaDraft;
  onChange: (draft: TailorTutorialMediaDraft) => void;
  onSave: () => void;
  onUpload: (kind: "video" | "thumbnail" | "image", file: File) => void;
  pending: boolean;
  uploading: "video" | "thumbnail" | "image" | null;
}) {
  const inputClass = "rounded-2xl border border-[var(--panel-border)] bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] dark:bg-white/5";
  const uploadControl = (kind: "video" | "thumbnail" | "image", label: string, accept: string) => (
    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--panel-border)] bg-[#fbfdff] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] dark:bg-white/5">
      {uploading === kind ? <LoaderCircle className="h-4 w-4 animate-spin" /> : kind === "video" ? <Paperclip className="h-4 w-4 text-[var(--accent)]" /> : <ImageIcon className="h-4 w-4 text-[var(--accent)]" />}
      {label}
      <input
        accept={accept}
        className="hidden"
        disabled={Boolean(uploading)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(kind, file);
          event.currentTarget.value = "";
        }}
        type="file"
      />
    </label>
  );

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Tailor tutorial media</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Upload the video, thumbnail, and optional images shown in the tailor verification tutorial step.</p>
        </div>
        <ActionButton disabled={pending} onClick={onSave}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Save tutorial
        </ActionButton>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <input className={inputClass} value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="Tutorial title" />
          <textarea className={`${inputClass} min-h-28 w-full`} value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} placeholder="Tutorial description" />
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={inputClass} type="number" min={5} max={3600} value={draft.durationSeconds} onChange={(event) => onChange({ ...draft, durationSeconds: Number(event.target.value) })} />
            {uploadControl("video", "Upload video", "video/*")}
            {uploadControl("thumbnail", "Upload thumbnail", "image/*")}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className={inputClass} value={draft.videoUrl} onChange={(event) => onChange({ ...draft, videoUrl: event.target.value })} placeholder="Video URL" />
            {uploadControl("image", "Add image", "image/*")}
          </div>
          <input className={inputClass} value={draft.thumbnailUrl} onChange={(event) => onChange({ ...draft, thumbnailUrl: event.target.value })} placeholder="Thumbnail URL" />
        </div>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[#fbfdff] dark:bg-white/5">
            {draft.videoUrl ? (
              <video className="aspect-video w-full object-cover" controls poster={draft.thumbnailUrl || undefined} src={draft.videoUrl} />
            ) : draft.thumbnailUrl ? (
              <img alt="Tailor tutorial thumbnail" className="aspect-video w-full object-cover" src={draft.thumbnailUrl} />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-[var(--muted)]">No tutorial media yet</div>
            )}
            <div className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{draft.title}</div>
          </div>
          {draft.images.length ? (
            <div className="grid grid-cols-3 gap-2">
              {draft.images.map((url) => (
                <div key={url} className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)]">
                  <img alt="Tutorial supporting media" className="aspect-square w-full object-cover" src={url} />
                  <button className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white" onClick={() => onChange({ ...draft, images: draft.images.filter((item) => item !== url) })} type="button">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function DeliveryFareSettingsCard({
  onSave,
  pending,
  settings
}: {
  onSave: (settings: DeliveryFareSettings) => void;
  pending: boolean;
  settings?: DeliveryFareSettings;
}) {
  const [draft, setDraft] = useState<any>({
    normal: { partnerFare: 8, customerCharge: 30 },
    express: { partnerFare: 8, customerCharge: 40 },
    instant: { partnerFare: 15, customerCharge: 50 }
  });

  useEffect(() => {
    if (settings) {
      setDraft({
        normal: settings.normal ?? { partnerFare: 8, customerCharge: 30 },
        express: settings.express ?? { partnerFare: 8, customerCharge: 40 },
        instant: settings.instant ?? { partnerFare: 15, customerCharge: 50 }
      });
    }
  }, [settings]);

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Delivery Fare Settings</h3>
          <p className="text-sm text-[var(--muted)]">Configure rider payouts and customer display delivery charges dynamically.</p>
        </div>
        <ActionButton disabled={pending} onClick={() => onSave(draft)}>Save fares</ActionButton>
      </div>
      <div className="space-y-4">
        {[
          ["normal", "Normal Delivery"],
          ["express", "Express Delivery"],
          ["instant", "Instant Delivery"]
        ].map(([key, label]) => (
          <div key={key} className="grid gap-4 rounded-2xl border border-[var(--panel-border)] p-4 sm:grid-cols-3 sm:items-center">
            <div>
              <p className="font-semibold">{label}</p>
            </div>
            <Field label="Delivery Partner Earning (Rs)">
              <input
                className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
                type="number"
                min="0"
                value={draft[key]?.partnerFare ?? 0}
                onChange={(event) => {
                  const val = Number(event.target.value);
                  setDraft((current: any) => ({
                    ...current,
                    [key]: { ...current[key], partnerFare: val }
                  }));
                }}
              />
            </Field>
            <Field label="Customer Display Charge (Rs)">
              <input
                className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
                type="number"
                min="0"
                value={draft[key]?.customerCharge ?? 0}
                onChange={(event) => {
                  const val = Number(event.target.value);
                  setDraft((current: any) => ({
                    ...current,
                    [key]: { ...current[key], customerCharge: val }
                  }));
                }}
              />
            </Field>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BatchSettingsCard({
  draft,
  onChange,
  onSave,
  pending
}: {
  draft: DeliveryBatchSettingsDraft;
  onChange: (value: DeliveryBatchSettingsDraft) => void;
  onSave: (value: DeliveryBatchSettingsDraft) => void;
  pending: boolean;
}) {
  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Batch Capacity Settings</h3>
          <p className="text-sm text-[var(--muted)]">Control how many delivery requests can sit in one batch before a new one is created.</p>
        </div>
        <ActionButton disabled={pending} onClick={() => onSave(draft)}>
          Save batch settings
        </ActionButton>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Max orders per batch">
          <input
            className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
            min="1"
            type="number"
            value={draft.maxOrdersPerBatch}
            onChange={(event) => onChange({ ...draft, maxOrdersPerBatch: Math.max(1, Number(event.target.value) || 1) })}
          />
        </Field>
        <Field label="Notify before batch (minutes)">
          <input
            className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
            min="45"
            type="number"
            value={draft.lockMinutes}
            onChange={(event) => onChange({ ...draft, lockMinutes: Math.max(45, Number(event.target.value) || 45) })}
          />
        </Field>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        This keeps batches hidden until they are notified, and it limits each batch to the configured order count.
      </p>
    </Panel>
  );
}

function DevelopmentResetCard({
  ordersPending,
  everythingPending,
  onResetOrders,
  onResetEverything
}: {
  ordersPending: boolean;
  everythingPending: boolean;
  onResetOrders: () => void;
  onResetEverything: () => void;
}) {
  const pending = ordersPending || everythingPending;
  const confirmAndRun = (expected: string, action: () => void) => {
    const value = window.prompt(`Type ${expected} to continue.`);
    if (value === expected) action();
  };

  return (
    <Panel className="border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h3 className="text-lg font-semibold text-rose-700 dark:text-rose-200">Development reset</h3>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-rose-700/80 dark:text-rose-100/80">
            Destructive tools for clearing test data. Admin and super admin accounts are preserved so you can keep using this panel.
          </p>
        </div>
        <Badge tone="rose">Development only</Badge>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-rose-200 bg-white/70 p-4 dark:border-rose-500/20 dark:bg-black/10">
          <h4 className="font-semibold text-[var(--foreground)]">Reset orders, requests, batches</h4>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Clears orders, tailoring requests, quotes, delivery tasks, delivery batches, payments, notifications, reviews, support data, transactions, and resets earnings/wallet balances.
          </p>
          <ActionButton
            className="mt-4 bg-rose-600 text-white hover:bg-rose-700"
            disabled={pending}
            onClick={() => confirmAndRun("RESET ORDERS", onResetOrders)}
          >
            {ordersPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Reset orders-req-batches
          </ActionButton>
        </div>
        <div className="rounded-2xl border border-rose-300 bg-white/80 p-4 dark:border-rose-500/30 dark:bg-black/20">
          <h4 className="font-semibold text-[var(--foreground)]">Reset everything</h4>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Clears all test data plus customer, tailor, and delivery partner accounts/profiles, catalog, coupons, wallets, OTPs, and non-admin ID counters.
          </p>
          <ActionButton
            className="mt-4 bg-red-700 text-white hover:bg-red-800"
            disabled={pending}
            onClick={() => confirmAndRun("RESET EVERYTHING", onResetEverything)}
          >
            {everythingPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Reset everything
          </ActionButton>
        </div>
      </div>
    </Panel>
  );
}

function TrendPill({ children, tone }: { children: React.ReactNode; tone: "positive" | "negative" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "positive" && "bg-emerald-500/12 text-emerald-700",
        tone === "negative" && "bg-rose-500/12 text-rose-700",
        tone === "neutral" && "bg-slate-500/12 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function ChartCard({
  action,
  children,
  className,
  description,
  title
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <Panel className={className}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--deep)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </Panel>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#f0e0c6] bg-[#fffaf1] px-4 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--deep)]">{value}</p>
    </div>
  );
}

function SelectPill({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-40 items-center gap-1 rounded-xl border border-[#f0dcc0] bg-[#fffaf1] px-3 py-1.5 text-xs font-semibold text-[#ba7b08]">
      <span className="truncate">{label}</span>
      <ChevronDown size={14} />
    </span>
  );
}

function DashboardPeriodPicker({ compact = false, fromMonth, label, onFromMonthChange, onPresetChange, onToMonthChange, preset, toMonth }: {
  compact?: boolean;
  fromMonth: string;
  label: string;
  onFromMonthChange: (value: string) => void;
  onPresetChange: (value: DashboardPeriodPreset) => void;
  onToMonthChange: (value: string) => void;
  preset: DashboardPeriodPreset;
  toMonth: string;
}) {
  const options: Array<[DashboardPeriodPreset, string]> = [
    ["today", "Today"],
    ["yesterday", "Yesterday"],
    ["this_week", "This week"],
    ["last_week", "Last week"],
    ["this_month", "This month"],
    ["previous_month", "Last month"],
    ["last_7_days", "Last 7 days"],
    ["last_30_days", "Last 30 days"],
    ["lifetime", "Lifetime"]
  ];
  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><button aria-label={`Dashboard period: ${label}`} className={cn("darji-header-control inline-flex items-center justify-between gap-3 rounded-2xl border border-[#f0dcc0] bg-white text-sm font-medium text-[var(--deep)] transition hover:border-[var(--accent)]", compact ? "h-12 min-w-[270px] px-4" : "px-4 py-3")} type="button"><span className="flex items-center gap-2"><CalendarDays size={17} className="text-[var(--accent)]" /><span className="truncate">{label}</span></span><ChevronDown size={15} className="text-[var(--muted)]" /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" className="z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl bg-white p-3 shadow-[0_22px_55px_rgba(60,42,12,0.16)]"><p className="px-2 pb-2 text-sm font-bold text-[var(--deep)]">Dashboard period</p><div className="grid grid-cols-2 gap-2">{options.map(([value, optionLabel]) => <button className={cn("rounded-xl border px-3 py-2 text-left text-xs font-semibold transition", preset === value ? "border-orange-400 bg-orange-50 text-orange-700" : "border-[var(--panel-border)] hover:bg-orange-50/60")} key={value} onClick={() => onPresetChange(value)} type="button">{optionLabel}</button>)}</div><div className="my-3 h-px bg-[var(--panel-border)]" /><p className="px-1 text-xs font-semibold text-[var(--muted)]">Custom date range</p><div className="mt-2 grid grid-cols-2 gap-2" onPointerDown={(event) => event.stopPropagation()}><label className="text-[11px] font-semibold text-[var(--muted)]">From<input className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-2 text-xs outline-none focus:border-orange-400" type="date" value={fromMonth} onChange={(event) => { onFromMonthChange(event.target.value); onPresetChange("custom"); }} /></label><label className="text-[11px] font-semibold text-[var(--muted)]">To<input className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-2 text-xs outline-none focus:border-orange-400" type="date" value={toMonth} onChange={(event) => { onToMonthChange(event.target.value); onPresetChange("custom"); }} /></label></div><p className="mt-2 px-1 text-[11px] text-[var(--muted)]">Both boundary dates are included.</p></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}

function CompactChartEmptyState({ message }: { message: string }) {
  return <div className="grid h-[190px] place-items-center rounded-2xl border border-dashed border-[#ead9bd] bg-[#fffdf8] px-4 text-center text-sm text-[var(--muted)]">{message}</div>;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-[var(--muted)]">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function LiveStatusPanel({
  className,
  items
}: {
  className?: string;
  items: Array<{ label: string; count: number; color: string }>;
}) {
  return (
    <Panel className={cn("h-full", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--deep)]">Live Order Status</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Current order movement across the platform.</p>
        </div>
        <ActionButton className="px-3 py-2 text-xs font-semibold" variant="secondary">
          View All
        </ActionButton>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#f2e4cd] bg-[#fffdf8] px-3 py-2.5">
            <div className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
            <span className={cn("text-sm font-semibold", item.label === "Delivered" ? "text-[#56a820]" : "text-[var(--deep)]")}>
              {item.count.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RecentOrdersPanel({
  className,
  onOpen,
  orders
}: {
  className?: string;
  onOpen: (order: Order) => void;
  orders: Order[];
}) {
  return (
    <Panel className={className}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--deep)]">Recent Orders</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Latest customer orders from the standard workflow.</p>
        </div>
        <ActionButton className="px-3 py-2 text-xs font-semibold" variant="secondary">
          View All
        </ActionButton>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-[#f1e3ca]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#fff6e6] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-4 font-medium">S. No.</th>
                <th className="px-4 py-4 font-medium">Order ID</th>
                <th className="px-4 py-4 font-medium">Customer</th>
                <th className="px-4 py-4 font-medium">Tailor</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Amount</th>
                <th className="px-4 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={7}>
                    No recent orders available.
                  </td>
                </tr>
              ) : null}
              {orders.map((order, orderIndex) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-t border-[#f5eada] bg-white transition hover:bg-[#fffaf1]"
                  onClick={() => onOpen(order)}
                >
                  <td className="px-4 py-4 font-semibold tabular-nums text-[var(--muted)]">{orderIndex + 1}</td>
                  <td className="px-4 py-4 font-semibold text-[#c68008]">{order.orderNumber}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <MiniAvatar alt={`${order.customer?.name ?? "Customer"} profile photo`} fallbackSrc={getCustomerFallbackAvatarUrl(order.customer)} seed={order.customer?.name ?? order.customer?.phone ?? order.id} src={order.customer?.avatarUrl} />
                      <div>
                        <p className="font-medium text-[var(--deep)]">{order.customer?.name ?? order.customer?.phone ?? "Customer"}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{order.customer?.phone ?? "No phone"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 text-[var(--foreground)]">
                      <MiniAvatar alt={`${getTailorDisplayName(order.tailor) ?? "Tailor"} profile photo`} seed={order.tailor?.user?.name ?? getTailorDisplayName(order.tailor) ?? `tailor-${order.id}`} src={order.tailor?.user?.profileUrl || order.tailor?.user?.avatarUrl} />
                      <span>{order.tailor ? getTailorDisplayName(order.tailor) : "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge value={order.status} />
                  </td>
                  <td className="px-4 py-4 font-medium text-[var(--deep)]">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{formatDate(order.createdAt, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

function LeaderboardCard({
  className,
  description,
  items,
  onViewAll,
  title
}: {
  className?: string;
  description: string;
  items: Array<{ id: string; name: string; avatarUrl?: string; avatarGender?: string; avatarSeed?: string; subtitle: string; value: string; rating?: string; onClick?: () => void }>;
  onViewAll: () => void;
  title: string;
}) {
  return (
    <Panel className={className}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--deep)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
        <ActionButton className="px-3 py-2 text-xs font-semibold" onClick={onViewAll} variant="secondary">
          View All
        </ActionButton>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? <EmptyState message="Nothing to rank yet." /> : null}
        {items.map((item, index) => {
          const content = (
            <div className="flex items-center gap-3 rounded-2xl border border-[#ecd7ae] bg-[#fffdf8] px-4 py-3 text-left shadow-[0_10px_24px_rgba(188,142,47,0.05)]">
              <span className="w-5 text-sm font-semibold text-[var(--muted)]">{index + 1}</span>
              <MiniAvatar alt={`${item.name} profile photo`} gender={item.avatarGender} seed={item.avatarSeed ?? item.name} src={item.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--deep)]">{item.name}</p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{item.subtitle}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[var(--deep)]">{item.value}</p>
                {item.rating ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#d79409]">
                    <Star size={12} fill="currentColor" />
                    {item.rating}
                  </p>
                ) : null}
              </div>
            </div>
          );

          if (!item.onClick) return <div key={item.id}>{content}</div>;

          return (
            <button key={item.id} className="block w-full transition hover:-translate-y-0.5" onClick={item.onClick} type="button">
              {content}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function MiniTrendCard({
  data,
  formula,
  icon: Icon,
  label,
  note,
  onClick,
  tone,
  value
}: {
  data: Array<{ label: string; value: number }>;
  formula?: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  note: string;
  onClick?: () => void;
  tone: "emerald" | "amber" | "violet" | "sky";
  value: string;
}) {
  const colorMap = {
    amber: "#f6a313",
    emerald: "#16a34a",
    sky: "#2a79ff",
    violet: "#8b5cf6"
  };

  return (
    <Panel className={cn("p-4", onClick && "cursor-pointer transition hover:-translate-y-0.5 hover:border-[var(--accent)]")}>
      <button aria-label={`View records for ${label}`} className="block w-full text-left" onClick={onClick} title={formula} type="button">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={cn("inline-flex rounded-2xl p-2.5", tone === "amber" && "bg-[#fff1d8] text-[#cf7d00]", tone === "emerald" && "bg-emerald-500/12 text-emerald-700", tone === "sky" && "bg-sky-500/12 text-sky-700", tone === "violet" && "bg-violet-500/12 text-violet-700")}>
            <Icon size={16} />
          </span>
          <p className="mt-3 text-sm font-medium text-[var(--muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--deep)]">{value}</p>
          <p className="mt-1 text-xs font-medium text-emerald-600">{note}</p>
        </div>
        <div className="h-16 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line dataKey="value" dot={false} stroke={colorMap[tone]} strokeWidth={2.5} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </button>
    </Panel>
  );
}

function ChartHighlights({
  items
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{item.label}</p>
          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryList({
  description,
  items,
  title
}: {
  description: string;
  items: Array<{ id: string; title: string; subtitle: string; meta: string; onClick?: () => void }>;
  title: string;
}) {
  return (
    <Panel>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? <EmptyState message="Nothing to show yet." /> : null}
        {items.map((item) => (
          <button
            key={item.id}
            className="flex w-full items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            onClick={item.onClick}
            type="button"
          >
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.subtitle}</p>
            </div>
            <Badge tone="slate">{item.meta}</Badge>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-1">
      <span className="px-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          className={cn(
            "rounded-xl px-3 py-2 text-sm transition",
            value === option.value ? "bg-[var(--accent)] text-[#111111]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
          )}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FilterSelect({
  onChange,
  options,
  value
}: {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <select
      className="h-12 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value || option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function CouponComposer({
  customers,
  draft,
  onChange,
  onSubmit,
  pending
}: {
  customers: AdminUser[];
  draft: CouponFormDraft;
  onChange: (value: CouponFormDraft) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [randomCount, setRandomCount] = useState("10");
  const visibleCustomers = customers.filter((customer) => `${customer.name ?? ""} ${customer.phone ?? ""} ${customer.darjiCustomerId ?? ""}`.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 100);
  const valueRequired = ["ORDER_FLAT", "ORDER_PERCENTAGE", "DELIVERY_PERCENTAGE"].includes(draft.benefitType);
  const toggleValue = <T extends string>(values: T[], value: T) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <ActionButton>Create coupon</ActionButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(96vw,980px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-semibold">New coupon</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">Define the benefit, eligible order, audience, limits, and checkout restrictions.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-full p-2 text-[var(--muted)] hover:bg-[#f4f7fb]">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-[24px] border border-[var(--panel-border)] bg-[#fbfdff] p-5">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">1. Benefit</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Coupon code"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4 outline-none" value={draft.code} onChange={(event) => onChange({ ...draft, code: event.target.value.toUpperCase() })} /></Field>
                <Field label="Benefit type"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" value={draft.benefitType} onChange={(event) => onChange({ ...draft, benefitType: event.target.value as CouponFormDraft["benefitType"] })}>
                  <option value="ORDER_FLAT">Flat amount off entire order</option><option value="ORDER_PERCENTAGE">Percentage off entire order</option><option value="FREE_DELIVERY">Free delivery</option><option value="DELIVERY_PERCENTAGE">Percentage off delivery</option><option value="WAIVE_PLATFORM_FEE">Waive platform fee</option><option value="WAIVE_SMALL_ORDER_FEE">Waive small-order fee</option><option value="FREE_MEASUREMENT">Free home measurement</option>
                </select></Field>
                <Field label="Customer-facing description"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></Field>
                {valueRequired ? <Field label={draft.benefitType.includes("PERCENTAGE") ? "Discount percentage" : "Discount amount"}><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="0" max={draft.benefitType.includes("PERCENTAGE") ? 100 : undefined} type="number" value={draft.discountValue} onChange={(event) => onChange({ ...draft, discountValue: Number(event.target.value) })} /></Field> : null}
                <Field label="Minimum order value"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="0" type="number" value={draft.minOrderValue} onChange={(event) => onChange({ ...draft, minOrderValue: Number(event.target.value) })} /></Field>
                <Field label="Maximum discount per order"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="1" placeholder="No cap" type="number" value={draft.maxDiscount} onChange={(event) => onChange({ ...draft, maxDiscount: event.target.value })} /></Field>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--panel-border)] bg-[#fbfdff] p-5">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">2. Eligible order</p>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Order milestone"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" value={draft.orderEligibilityType} onChange={(event) => onChange({ ...draft, orderEligibilityType: event.target.value as CouponFormDraft["orderEligibilityType"] })}><option value="ANY">Any order</option><option value="FIRST">First order only</option><option value="EXACT">Exact order number</option><option value="RANGE">Order-number range</option></select></Field>
                {draft.orderEligibilityType === "EXACT" ? <Field label="Exact order number"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="1" type="number" value={draft.orderNumber} onChange={(event) => onChange({ ...draft, orderNumber: event.target.value })} /></Field> : null}
                {draft.orderEligibilityType === "RANGE" ? <><Field label="From order"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="1" type="number" value={draft.orderNumberFrom} onChange={(event) => onChange({ ...draft, orderNumberFrom: event.target.value })} /></Field><Field label="To order"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="1" type="number" value={draft.orderNumberTo} onChange={(event) => onChange({ ...draft, orderNumberTo: event.target.value })} /></Field></> : null}
                <Field label="Order type"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" value={draft.orderScope} onChange={(event) => onChange({ ...draft, orderScope: event.target.value as CouponFormDraft["orderScope"] })}><option value="BOTH">Catalog and tailoring</option><option value="CATALOG">Catalog only</option><option value="TAILORING">Tailoring only</option></select></Field>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Allowed delivery speeds (empty means all)"><div className="flex flex-wrap gap-2">{(["STANDARD", "EXPRESS", "INSTANT"] as const).map((mode) => <button className={cn("rounded-full border px-3 py-2 text-sm", draft.allowedDeliveryModes.includes(mode) ? "border-[#0b2241] bg-[#0b2241] text-white" : "border-[var(--panel-border)] bg-white")} key={mode} onClick={() => onChange({ ...draft, allowedDeliveryModes: toggleValue(draft.allowedDeliveryModes, mode) })} type="button">{formatStatus(mode)}</button>)}</div></Field>
                <Field label="Allowed payment methods (empty means all)"><div className="flex flex-wrap gap-2">{(["ONLINE", "UPI", "COD"] as const).map((method) => <button className={cn("rounded-full border px-3 py-2 text-sm", draft.allowedPaymentMethods.includes(method) ? "border-[#0b2241] bg-[#0b2241] text-white" : "border-[var(--panel-border)] bg-white")} key={method} onClick={() => onChange({ ...draft, allowedPaymentMethods: toggleValue(draft.allowedPaymentMethods, method) })} type="button">{method}</button>)}</div></Field>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--panel-border)] bg-[#fbfdff] p-5">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">3. Audience</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Who can use it"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" value={draft.audienceType} onChange={(event) => onChange({ ...draft, audienceType: event.target.value as CouponFormDraft["audienceType"], selectedCustomerIds: event.target.value === "SELECTED_CUSTOMERS" ? draft.selectedCustomerIds : [] })}><option value="EVERYONE">Everyone</option><option value="SELECTED_CUSTOMERS">Selected customers</option><option value="NEW_CUSTOMERS">New customers</option><option value="INACTIVE_CUSTOMERS">Inactive customers</option><option value="REGISTERED_BETWEEN">Registered during a date range</option></select></Field>
                {draft.audienceType === "INACTIVE_CUSTOMERS" ? <Field label="Inactive for at least (days)"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="1" type="number" value={draft.inactiveDays} onChange={(event) => onChange({ ...draft, inactiveDays: event.target.value })} /></Field> : null}
                {draft.audienceType === "REGISTERED_BETWEEN" ? <><Field label="Registered after"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" type="datetime-local" value={draft.registeredAfter} onChange={(event) => onChange({ ...draft, registeredAfter: event.target.value })} /></Field><Field label="Registered before"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" type="datetime-local" value={draft.registeredBefore} onChange={(event) => onChange({ ...draft, registeredBefore: event.target.value })} /></Field></> : null}
              </div>
              {draft.audienceType === "SELECTED_CUSTOMERS" ? <div className="mt-4 rounded-2xl border border-[var(--panel-border)] bg-white p-4"><div className="flex flex-wrap items-end gap-3"><Field label="Search customers"><input className="h-11 rounded-xl border border-[var(--panel-border)] px-3" placeholder="Name, phone or customer ID" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} /></Field><Field label="Random customer count"><input className="h-11 w-32 rounded-xl border border-[var(--panel-border)] px-3" min="1" type="number" value={randomCount} onChange={(event) => setRandomCount(event.target.value)} /></Field><ActionButton onClick={() => { const shuffled = [...customers].sort(() => Math.random() - 0.5); onChange({ ...draft, selectedCustomerIds: shuffled.slice(0, Math.min(Number(randomCount) || 1, customers.length)).map((customer) => customer.id) }); }} variant="secondary">Select random</ActionButton></div><p className="mt-3 text-xs text-[var(--muted)]">{draft.selectedCustomerIds.length} customer(s) selected</p><div className="mt-3 max-h-48 space-y-2 overflow-y-auto">{visibleCustomers.map((customer) => <label className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] px-3 py-2 text-sm" key={customer.id}><span><span className="font-semibold">{getCustomerDisplayName(customer)}</span><span className="ml-2 text-[var(--muted)]">{customer.darjiCustomerId ?? customer.phone}</span></span><input checked={draft.selectedCustomerIds.includes(customer.id)} onChange={() => onChange({ ...draft, selectedCustomerIds: toggleValue(draft.selectedCustomerIds, customer.id) })} type="checkbox" /></label>)}</div></div> : null}
            </div>

            <div className="rounded-[24px] border border-[var(--panel-border)] bg-[#fbfdff] p-5">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">4. Schedule and safeguards</p>
              <div className="grid gap-4 md:grid-cols-3"><Field label="Starts"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" type="datetime-local" value={draft.startsAt} onChange={(event) => onChange({ ...draft, startsAt: event.target.value })} /></Field><Field label="Expires"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" type="datetime-local" value={draft.expiresAt} onChange={(event) => onChange({ ...draft, expiresAt: event.target.value })} /></Field><Field label="Campaign discount budget"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="1" placeholder="Unlimited" type="number" value={draft.maxCampaignDiscount} onChange={(event) => onChange({ ...draft, maxCampaignDiscount: event.target.value })} /></Field><Field label="Total redemptions"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="1" placeholder="Unlimited" type="number" value={draft.usageLimit} onChange={(event) => onChange({ ...draft, usageLimit: event.target.value })} /></Field><Field label="Per-customer redemptions"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" min="1" placeholder="Unlimited" type="number" value={draft.perCustomerLimit} onChange={(event) => onChange({ ...draft, perCustomerLimit: event.target.value })} /></Field><Field label="State"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-white px-4" value={String(draft.isActive)} onChange={(event) => onChange({ ...draft, isActive: event.target.value === "true" })}><option value="true">Enabled</option><option value="false">Disabled</option></select></Field></div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <ActionButton variant="secondary">Cancel</ActionButton>
            </Dialog.Close>
            <ActionButton disabled={pending || draft.code.trim().length < 3 || draft.description.trim().length < 3 || (valueRequired && draft.discountValue <= 0) || (draft.audienceType === "SELECTED_CUSTOMERS" && !draft.selectedCustomerIds.length)} onClick={onSubmit}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Create coupon
            </ActionButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CouponEditDialog({ coupon, customers, onClose, onSave, pending }: {
  coupon: Coupon | null;
  customers: AdminUser[];
  onClose: () => void;
  onSave: (payload: Partial<Coupon>) => void;
  pending: boolean;
}) {
  const [draft, setDraft] = useState<CouponFormDraft>(emptyCouponDraft);
  useEffect(() => {
    if (!coupon) return;
    setDraft({
      code: coupon.code,
      description: coupon.description,
      benefitType: coupon.benefitType ?? (coupon.discountType === "PERCENTAGE" ? "ORDER_PERCENTAGE" : "ORDER_FLAT"),
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount == null ? "" : String(coupon.maxDiscount),
      usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
      perCustomerLimit: coupon.perCustomerLimit == null ? "" : String(coupon.perCustomerLimit),
      maxCampaignDiscount: coupon.maxCampaignDiscount == null ? "" : String(coupon.maxCampaignDiscount),
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : "",
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : "",
      orderEligibilityType: coupon.orderEligibilityType ?? "ANY",
      orderNumber: coupon.orderNumber == null ? "" : String(coupon.orderNumber),
      orderNumberFrom: coupon.orderNumberFrom == null ? "" : String(coupon.orderNumberFrom),
      orderNumberTo: coupon.orderNumberTo == null ? "" : String(coupon.orderNumberTo),
      audienceType: coupon.audienceType ?? "EVERYONE",
      selectedCustomerIds: coupon.selectedCustomerIds ?? [],
      inactiveDays: coupon.inactiveDays == null ? "" : String(coupon.inactiveDays),
      registeredAfter: coupon.registeredAfter ? new Date(coupon.registeredAfter).toISOString().slice(0, 16) : "",
      registeredBefore: coupon.registeredBefore ? new Date(coupon.registeredBefore).toISOString().slice(0, 16) : "",
      orderScope: coupon.orderScope ?? "BOTH",
      allowedDeliveryModes: coupon.allowedDeliveryModes ?? [],
      allowedPaymentMethods: coupon.allowedPaymentMethods ?? [],
      isActive: coupon.isActive
    });
  }, [coupon]);
  return (
    <Dialog.Root open={Boolean(coupon)} onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(96vw,920px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-semibold">Edit {coupon?.code}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Changes apply to future validations; existing redemptions are preserved.</Dialog.Description></div><Dialog.Close asChild><button aria-label="Close coupon editor" className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--accent-soft)]"><X size={18} /></button></Dialog.Close></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Description"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
            <Field label="Benefit"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={draft.benefitType} onChange={(event) => setDraft({ ...draft, benefitType: event.target.value as CouponFormDraft["benefitType"] })}><option value="ORDER_FLAT">Flat amount off order</option><option value="ORDER_PERCENTAGE">Percentage off order</option><option value="FREE_DELIVERY">Free delivery</option><option value="DELIVERY_PERCENTAGE">Percentage off delivery</option><option value="WAIVE_PLATFORM_FEE">Waive platform fee</option><option value="WAIVE_SMALL_ORDER_FEE">Waive small-order fee</option><option value="FREE_MEASUREMENT">Free home measurement</option></select></Field>
            <Field label="Discount value"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" min="0" type="number" value={draft.discountValue} onChange={(event) => setDraft({ ...draft, discountValue: Number(event.target.value) })} /></Field>
            <Field label="Minimum order"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" min="0" type="number" value={draft.minOrderValue} onChange={(event) => setDraft({ ...draft, minOrderValue: Number(event.target.value) })} /></Field>
            <Field label="Maximum discount"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" min="1" placeholder="No cap" type="number" value={draft.maxDiscount} onChange={(event) => setDraft({ ...draft, maxDiscount: event.target.value })} /></Field>
            <Field label="Campaign budget"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" min="1" placeholder="Unlimited" type="number" value={draft.maxCampaignDiscount} onChange={(event) => setDraft({ ...draft, maxCampaignDiscount: event.target.value })} /></Field>
            <Field label="Total usage limit"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" min="1" placeholder="Unlimited" type="number" value={draft.usageLimit} onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })} /></Field>
            <Field label="Per-customer limit"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" min="1" placeholder="Unlimited" type="number" value={draft.perCustomerLimit} onChange={(event) => setDraft({ ...draft, perCustomerLimit: event.target.value })} /></Field>
            <Field label="Starts"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></Field>
            <Field label="Expiry"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" type="datetime-local" value={draft.expiresAt} onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })} /></Field>
            <Field label="Order milestone"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={draft.orderEligibilityType} onChange={(event) => setDraft({ ...draft, orderEligibilityType: event.target.value as CouponFormDraft["orderEligibilityType"] })}><option value="ANY">Any order</option><option value="FIRST">First order</option><option value="EXACT">Exact order</option><option value="RANGE">Order range</option></select></Field>
            {draft.orderEligibilityType === "EXACT" ? <Field label="Order number"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" type="number" value={draft.orderNumber} onChange={(event) => setDraft({ ...draft, orderNumber: event.target.value })} /></Field> : null}
            {draft.orderEligibilityType === "RANGE" ? <><Field label="Order range from"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" type="number" value={draft.orderNumberFrom} onChange={(event) => setDraft({ ...draft, orderNumberFrom: event.target.value })} /></Field><Field label="Order range to"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" type="number" value={draft.orderNumberTo} onChange={(event) => setDraft({ ...draft, orderNumberTo: event.target.value })} /></Field></> : null}
            <Field label="Order type"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={draft.orderScope} onChange={(event) => setDraft({ ...draft, orderScope: event.target.value as CouponFormDraft["orderScope"] })}><option value="BOTH">Catalog and tailoring</option><option value="CATALOG">Catalog only</option><option value="TAILORING">Tailoring only</option></select></Field>
            <Field label="Audience"><select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={draft.audienceType} onChange={(event) => setDraft({ ...draft, audienceType: event.target.value as CouponFormDraft["audienceType"] })}><option value="EVERYONE">Everyone</option><option value="SELECTED_CUSTOMERS">Selected customers</option><option value="NEW_CUSTOMERS">New customers</option><option value="INACTIVE_CUSTOMERS">Inactive customers</option><option value="REGISTERED_BETWEEN">Registered in date range</option></select></Field>
            {draft.audienceType === "INACTIVE_CUSTOMERS" ? <Field label="Inactive days"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" type="number" value={draft.inactiveDays} onChange={(event) => setDraft({ ...draft, inactiveDays: event.target.value })} /></Field> : null}
            {draft.audienceType === "REGISTERED_BETWEEN" ? <><Field label="Registered after"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" type="datetime-local" value={draft.registeredAfter} onChange={(event) => setDraft({ ...draft, registeredAfter: event.target.value })} /></Field><Field label="Registered before"><input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" type="datetime-local" value={draft.registeredBefore} onChange={(event) => setDraft({ ...draft, registeredBefore: event.target.value })} /></Field></> : null}
          </div>
          {draft.audienceType === "SELECTED_CUSTOMERS" ? <div className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-[var(--panel-border)] p-3">{customers.map((customer) => <label className="flex items-center justify-between rounded-xl px-2 py-1 text-sm" key={customer.id}><span>{getCustomerDisplayName(customer)} <span className="text-[var(--muted)]">{customer.darjiCustomerId ?? customer.phone}</span></span><input checked={draft.selectedCustomerIds.includes(customer.id)} onChange={() => setDraft({ ...draft, selectedCustomerIds: draft.selectedCustomerIds.includes(customer.id) ? draft.selectedCustomerIds.filter((id) => id !== customer.id) : [...draft.selectedCustomerIds, customer.id] })} type="checkbox" /></label>)}</div> : null}
          <label className="mt-4 flex items-center gap-3 text-sm font-semibold"><input checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} type="checkbox" />Coupon active</label>
          <div className="mt-6 flex justify-end gap-3"><ActionButton disabled={pending} onClick={onClose} variant="secondary">Cancel</ActionButton><ActionButton disabled={pending || draft.description.trim().length < 3} onClick={() => onSave({ description: draft.description, benefitType: draft.benefitType, discountType: couponDiscountType(draft.benefitType), discountValue: draft.discountValue, minOrderValue: draft.minOrderValue, maxDiscount: draft.maxDiscount ? Number(draft.maxDiscount) : null, usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null, perCustomerLimit: draft.perCustomerLimit ? Number(draft.perCustomerLimit) : null, maxCampaignDiscount: draft.maxCampaignDiscount ? Number(draft.maxCampaignDiscount) : null, startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null, expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null, orderEligibilityType: draft.orderEligibilityType, orderNumber: draft.orderNumber ? Number(draft.orderNumber) : null, orderNumberFrom: draft.orderNumberFrom ? Number(draft.orderNumberFrom) : null, orderNumberTo: draft.orderNumberTo ? Number(draft.orderNumberTo) : null, audienceType: draft.audienceType, selectedCustomerIds: draft.selectedCustomerIds, inactiveDays: draft.inactiveDays ? Number(draft.inactiveDays) : null, registeredAfter: draft.registeredAfter ? new Date(draft.registeredAfter).toISOString() : null, registeredBefore: draft.registeredBefore ? new Date(draft.registeredBefore).toISOString() : null, orderScope: draft.orderScope, allowedDeliveryModes: draft.allowedDeliveryModes, allowedPaymentMethods: draft.allowedPaymentMethods, isActive: draft.isActive })}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save coupon</ActionButton></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CouponRedemptionDialog({ coupon, redemptions, loading, onClose, onOpenOrder }: {
  coupon: Coupon | null;
  redemptions: CouponRedemption[];
  loading: boolean;
  onClose: () => void;
  onOpenOrder: (redemption: CouponRedemption) => void;
}) {
  return (
    <Dialog.Root open={Boolean(coupon)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(94vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-semibold">{coupon?.code} redemption history</Dialog.Title><Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Every reserved use is retained with its order, benefit, amount, and timestamp.</Dialog.Description></div><button aria-label="Close redemption history" className="rounded-full p-2 hover:bg-[var(--accent-soft)]" onClick={onClose}><X size={18} /></button></div>
          <div className="mt-6 space-y-3">
            {loading ? <div className="flex items-center gap-2 rounded-2xl border border-[var(--panel-border)] p-5 text-sm text-[var(--muted)]"><LoaderCircle className="h-4 w-4 animate-spin" />Loading redemption history…</div> : null}
            {!loading && redemptions.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-[var(--muted)]">This coupon has not been used yet.</div> : null}
            {redemptions.map((redemption) => <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-4" key={`${redemption.orderId}-${redemption.redeemedAt}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{redemption.customer?.name ?? redemption.customer?.phone ?? "Customer"}</p><p className="mt-1 text-xs text-[var(--muted)]">{redemption.customer?.darjiCustomerId ?? redemption.customer?.phone ?? redemption.customerId} · {formatDate(redemption.redeemedAt, true)}</p></div><p className="text-lg font-semibold text-emerald-700">−{formatCurrency(redemption.discountAmount)}</p></div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><Badge tone="violet">{formatStatus(redemption.benefitType ?? "ORDER")}</Badge><Badge tone="sky">{formatStatus(redemption.affectedComponent ?? "ORDER")}</Badge><ActionButton className="px-3 py-1.5" onClick={() => onOpenOrder(redemption)} variant="secondary">Open {redemption.orderType === "CATALOG" ? "order" : "tailoring request"} {redemption.order?.reference ?? ""}</ActionButton></div></div>)}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DataTable<T extends object>({ columns, data, emptyMessage }: TableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting }
  });

  return (
    <Panel>
      <div className="overflow-hidden rounded-[24px] border border-[var(--panel-border)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--accent-cream)] text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  <th className="px-4 py-4 font-medium">S. No.</th>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-4 font-medium">
                      {header.isPlaceholder ? null : (
                        <button
                          className={cn("inline-flex items-center gap-2", header.column.getCanSort() && "hover:text-[var(--foreground)]")}
                          onClick={() => header.column.getCanSort() && header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                          type="button"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() ? <ChevronDown size={14} className={cn("transition", header.column.getIsSorted() === "desc" && "rotate-180")} /> : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={columns.length + 1}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}
              {table.getRowModel().rows.map((row, rowIndex) => (
                <tr key={row.id} className="border-t border-[var(--panel-border)] bg-[var(--panel-strong)]/50 align-top transition hover:bg-[var(--accent-soft)]/40">
                  <td className="px-4 py-5 font-semibold tabular-nums text-[var(--muted)]">{rowIndex + 1}</td>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-5 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

function StatusBadge({ value }: { value?: string | null }) {
  const normalized = value ?? "";
  const lower = normalized.toLowerCase();
  let tone: "teal" | "amber" | "rose" | "sky" | "slate" | "emerald" | "violet" | "cyan" = "slate";
  if (["scheduled", "upcoming", "locked"].includes(lower)) tone = "amber";
  else if (["accepted", "submitted"].includes(lower)) tone = "emerald";
  else if (["offered_to_stitching_tailor", "pool"].includes(lower)) tone = "amber";
  else if (["expired"].includes(lower)) tone = "rose";
  else if (lower === "active") tone = "emerald";
  else if (lower === "completed") tone = "slate";
  else if (lower === "cancelled") tone = "rose";
  else if (["ACTIVE", "DELIVERED", "PAID", "SETTLED", "READY", "VERIFIED", "RESOLVED", "delivered", "accepted"].includes(normalized)) tone = "emerald";
  else if (["BANNED", "CANCELLED", "FAILED", "REJECTED"].includes(normalized)) tone = "rose";
  else if (["DUE", "PENDING", "QUOTE_REQUESTED", "OPEN", "REUPLOAD_REQUIRED", "SUSPENDED", "pending", "accepted", "picked_up"].includes(normalized)) tone = "amber";
  else if (["STITCHING_STARTED", "AT_TAILOR", "IN_PROGRESS", "WORKING"].includes(normalized)) tone = "sky";
  const label = lower === "scheduled" || lower === "locked" ? "Upcoming" : lower === "active" ? "Active" : lower === "completed" ? "Completed" : lower === "cancelled" ? "Cancelled" : formatStatus(normalized);
  return <Badge tone={tone}>{label}</Badge>;
}

function PriorityBadge({ value }: { value: AdminOrderPriority }) {
  const toneByPriority: Record<AdminOrderPriority, "slate" | "amber" | "rose" | "violet"> = {
    High: "amber",
    Normal: "slate",
    Urgent: "rose",
    VIP: "violet"
  };
  return <Badge tone={toneByPriority[value]}>{value}</Badge>;
}

function UrgencyBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const tone = normalized === "INSTANT" ? "rose" : normalized === "EXPRESS" ? "amber" : "sky";
  return <Badge tone={tone}>{formatStatus(normalized)}</Badge>;
}

function cleanText(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length ? trimmed : undefined;
}

function formatDistance(meters?: number | null) {
  if (meters == null || !Number.isFinite(meters)) return "Distance unavailable";
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function getUserDisplayName(user?: BasicUser | AdminUser | null, fallback = "Customer") {
  return cleanText(user?.name) ?? cleanText(user?.phone) ?? cleanText(user?.darjiCustomerId) ?? fallback;
}

function getCustomerDisplayName(user?: BasicUser | AdminUser | null) {
  return getUserDisplayName(user, "Customer");
}

function normalizeTailoringRequestForAdmin(request: TailoringRequest, partners: DeliveryPartnerProfile[]): Order {
  const pickupPartner = partners.find((partner) => partner.id === request.pickupPartnerId || partner.id === request.assignedDeliveryBoyId) ?? null;
  const deliveryPartner = partners.find((partner) => partner.id === request.deliveryPartnerId) ?? null;
  const orderStatusMap: Record<string, string> = {
    completed: "DELIVERED", cancelled: "CANCELLED", ready_for_delivery: "READY",
    received_by_tailor: "AT_TAILOR", picked_up_from_customer: "CLOTH_PICKED",
    pickup_started: "PICKUP_ASSIGNED", tailor_accepted: "PICKUP_ASSIGNED", payment_pending: "ORDER_PLACED",
    out_for_delivery: "OUT_FOR_DELIVERY", delivery_retry_scheduled: "OUT_FOR_DELIVERY", delivery_issue: "OUT_FOR_DELIVERY"
  };
  const mappedStatus = request.status === "CANCELLED"
    ? "CANCELLED"
    : request.orderStatus ? (orderStatusMap[request.orderStatus] || request.orderStatus) : request.status;
  const price = request.quoteAmount ?? request.selectedQuote?.price ?? request.ownQuote?.price ?? 0;
  const requestItems = request.items?.length ? request.items : [{
    serviceId: "tailoring",
    quantity: 1,
    description: request.description,
    gender: request.gender,
    clothType: request.clothType,
    workType: request.workType,
    serviceCategory: request.serviceCategory,
    selectedWorkItems: request.selectedWorkItems,
    otherWorkDescription: request.otherWorkDescription,
    measurement: request.measurement,
    measurementNotes: request.measurementNotes,
    media: request.media,
    voiceNotes: request.voiceNotes,
    sampleProvided: request.sampleProvided,
    sampleMedia: request.sampleMedia,
    designMedia: request.designMedia,
    homeMeasurementBooked: request.homeMeasurementBooked,
    preferredMeasurementSlot: request.preferredMeasurementSlot
  }];
  return {
    id: request.id,
    darjiId: request.darjiId,
    orderNumber: formatCustomerRequestId(request.id),
    customerId: request.customerId,
    customer: request.customer,
    tailorId: request.selectedQuote?.tailor?.id ?? request.assignedTailorId,
    pickupPartnerId: request.pickupPartnerId ?? request.assignedDeliveryBoyId,
    deliveryPartnerId: request.deliveryPartnerId,
    tailor: request.selectedQuote?.tailor || request.ownQuote?.tailor || null,
    pickupPartner,
    deliveryPartner,
    status: mappedStatus.toUpperCase(),
    paymentMethod: request.paymentMethod || "UNKNOWN",
    paymentStatus: request.paymentStatus || "PENDING",
    subtotal: price,
    deliveryFee: request.deliveryFee ?? 0,
    deliveryMode: request.deliveryMode,
    customerToTailorDistanceMeters: request.customerToTailorDistanceMeters,
    totalChargeableDistanceMeters: request.totalChargeableDistanceMeters,
    deliveryFeeLockedAt: request.deliveryFeeLockedAt,
    platformFee: request.platformFee ?? 0,
    smallOrderFee: request.smallOrderFee ?? 0,
    homeMeasurementFee: request.homeMeasurementFee ?? 0,
    couponCode: request.couponCode,
    discount: request.discountAmount ?? 0,
    totalAmount: request.totalAmount || price,
    createdAt: request.confirmedAt || request.createdAt,
    request,
    items: requestItems.map((item, index) => ({
      ...item,
      serviceId: item.serviceId || `tailoring-${index + 1}`,
      quantity: item.quantity || 1,
      price: index === 0 ? price : item.price,
      service: {
        id: item.serviceId || `tailoring-${index + 1}`,
        name: item.workType || request.workType || `Item ${index + 1}`,
        price: index === 0 ? price : Number(item.price ?? 0),
        category: { name: item.clothType || request.clothType || "Tailoring" }
      }
    }))
  } as Order;
}

function getTailorDisplayName(tailor?: TailorProfile | null) {
  return cleanText(tailor?.user?.name) ?? cleanText(tailor?.shopName) ?? cleanText(tailor?.user?.phone) ?? cleanText(tailor?.darjiTailorId) ?? "Tailor";
}

function getPartnerRole(partner?: DeliveryPartnerProfile | null) {
  return partner?.deliveryType === "DROP" ? "DROP" : "PICKUP";
}

function getPartnerRoleLabel(partner?: DeliveryPartnerProfile | null) {
  return getPartnerRole(partner) === "DROP" ? "Drop" : "Pickup";
}

function getPartnerDisplayName(partner?: DeliveryPartnerProfile | null) {
  return cleanText(partner?.user?.name) ?? cleanText(partner?.user?.phone) ?? cleanText(partner?.vehicleNumber) ?? cleanText(partner?.darjiPartnerId) ?? "Delivery partner";
}

function getPartnerVehicleNumber(partner?: DeliveryPartnerProfile | null) {
  const verificationVehicle = partner?.verification?.vehicle as { vehicleNumber?: string } | undefined;
  return cleanText(partner?.vehicleNumber) ?? cleanText(verificationVehicle?.vehicleNumber) ?? "Vehicle not added";
}

function DeliveryRoleBadge({ partner, role }: { partner?: DeliveryPartnerProfile | null; role?: "PICKUP" | "DROP" }) {
  const normalized = role ?? getPartnerRole(partner);
  return <Badge tone={normalized === "DROP" ? "sky" : "amber"}>{normalized === "DROP" ? "Drop" : "Pickup"}</Badge>;
}

function getOrderDisplayNumber(order?: Pick<Order, "orderNumber" | "darjiId" | "id"> | null) {
  return cleanText(order?.orderNumber) ?? cleanText(order?.darjiId) ?? cleanText(order?.id) ?? "Order ID pending";
}

function formatCustomerRequestId(id?: string | null) {
  return id ? `REQ-${id.slice(0, 8).toUpperCase()}` : "REQ-PENDING";
}

function findBatchForOrder(order: Order, batches: DeliveryBatch[]) {
  const orderIds = [order.id, order.request?.id].filter(Boolean) as string[];
  return batches.find((batch) =>
    batch.batchId === order.batchId ||
    (batch.tasks ?? []).some((task) => orderIds.includes(task.orderId))
  );
}

function localDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateKey(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return localDateInputValue(date);
}

function SupportStatMini({
  label,
  value,
  tone
}: {
  label: string;
  value: number | string;
  tone: "orange" | "amber" | "green" | "slate";
}) {
  const valueClass =
    tone === "orange"
      ? "text-[var(--accent)]"
      : tone === "amber"
        ? "text-[#f5b84c]"
        : tone === "green"
          ? "text-[#7ce6a1]"
          : "text-[var(--foreground)]";

  return (
    <div className="rounded-[16px] border border-[var(--panel-border)] bg-[#202530] p-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", valueClass)}>{value}</p>
    </div>
  );
}

function isCustomerSupportTicket(ticket: SupportTicket) {
  return ticket.user?.role === "CUSTOMER" || ticket.subject?.includes("Customer") || (!ticket.user?.role && ticket.subject?.toLowerCase().includes("customer"));
}

function isTailorSupportTicket(ticket: SupportTicket) {
  return ticket.user?.role === "TAILOR" || ticket.subject?.includes("Tailor");
}

function isDeliverySupportTicket(ticket: SupportTicket) {
  return ticket.user?.role === "DELIVERY_PARTNER" || ticket.subject?.includes("Delivery");
}

function getSupportQueueTimestamp(item: SupportQueueItem) {
  return item.entity.updatedAt ?? item.entity.createdAt;
}

function getSupportQueueStatusGroup(item: SupportQueueItem) {
  if (item.kind === "ticket") {
    if (item.entity.status === "OPEN") return "OPEN";
    if (item.entity.status === "IN_PROGRESS" || item.entity.status === "PENDING") return "PENDING";
    if (item.entity.status === "RESOLVED") return "RESOLVED";
    return "CLOSED";
  }
  if (item.kind === "request") {
    if (item.entity.status === "PENDING") return "PENDING";
    if (item.entity.status === "APPROVED") return "RESOLVED";
    return "CLOSED";
  }
  if (item.entity.status === "NEW") return "OPEN";
  if (item.entity.status === "INVESTIGATING" || item.entity.status === "IN_PROGRESS") return "PENDING";
  if (item.entity.status === "FIXED") return "RESOLVED";
  return "CLOSED";
}

function matchesSupportQueueSearch(item: SupportQueueItem, search: string) {
  if (!search.trim()) return true;
  const normalized = search.toLowerCase();
  const text =
    item.kind === "ticket"
      ? [item.entity.subject, item.entity.message, item.entity.user?.name, item.entity.user?.phone, item.entity.order?.orderNumber]
      : item.kind === "request"
        ? [item.entity.type, item.entity.user?.name, item.entity.user?.phone, item.entity.adminNotes]
        : [item.entity.title, item.entity.description, item.entity.user?.name, item.entity.user?.phone, item.entity.deviceInfo];

  return text.filter(Boolean).join(" ").toLowerCase().includes(normalized);
}

function matchesSupportQueueFilters(item: SupportQueueItem, statusFilter: string, priorityFilter: string, agentFilter: string) {
  if (statusFilter && getSupportQueueStatusGroup(item) !== statusFilter) return false;
  if (priorityFilter && item.kind === "ticket" && (item.entity.priority ?? "NORMAL") !== priorityFilter) return false;
  if (agentFilter) {
    const assignedTo =
      item.kind === "request"
        ? ""
        : item.entity.assignedTo ?? "";
    if (agentFilter === "unassigned") return !assignedTo;
    return assignedTo === agentFilter;
  }
  return true;
}

function getSupportQueueMeta(item: SupportQueueItem) {
  if (item.kind === "ticket") {
    const lastMessage = item.entity.messages?.[item.entity.messages.length - 1];
    const unreadCount = item.entity.status === "OPEN" ? Math.min(item.entity.messages?.length ?? 0, 9) : 0;
    return {
      avatar: getInitials(item.entity.user?.name, "CU"),
      title: item.entity.user?.name ?? item.entity.user?.phone ?? "Customer",
      subtitle: `${item.entity.darjiId ?? "Darji ID pending"} | ${item.entity.order?.orderNumber ?? item.entity.subject}`,
      ticketLabel: item.entity.darjiId ?? "Darji ID pending",
      preview: lastMessage?.text ?? item.entity.message ?? "No messages yet",
      status: item.entity.status,
      timeLabel: item.entity.updatedAt ? new Date(item.entity.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      typeLabel: supportTicketTypeLabel(item.entity),
      unreadCount
    };
  }

  if (item.kind === "request") {
    const lastMessage = item.entity.messages?.[item.entity.messages.length - 1];
    return {
      avatar: getInitials(item.entity.user?.name, item.entity.userRole === "TAILOR" ? "TA" : item.entity.userRole === "DELIVERY_PARTNER" ? "DP" : "CU"),
      title: item.entity.user?.name ?? item.entity.user?.phone ?? "Darji user",
      subtitle: `${item.entity.darjiId ?? "Darji ID pending"} | ${formatStatus(item.entity.type)}`,
      ticketLabel: item.entity.darjiId ?? "Darji ID pending",
      preview: lastMessage?.text ?? `${formatStatus(item.entity.type)} update request`,
      status: item.entity.status,
      timeLabel: item.entity.updatedAt ? new Date(item.entity.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      typeLabel: accountRequestTypeLabel(item.entity),
      unreadCount: item.entity.status === "PENDING" ? 1 : 0
    };
  }

  const lastMessage = item.entity.messages?.[item.entity.messages.length - 1];
  return {
    avatar: "BG",
    title: item.entity.title,
    subtitle: `${item.entity.darjiId ?? "Darji ID pending"} | ${item.entity.appVersion}`,
    ticketLabel: item.entity.darjiId ?? "Darji ID pending",
    preview: lastMessage?.text ?? item.entity.description,
    status: item.entity.status,
    timeLabel: item.entity.updatedAt ? new Date(item.entity.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    typeLabel: "Bug Report",
    unreadCount: item.entity.status === "NEW" ? 1 : 0
  };
}

function supportTicketTypeLabel(ticket: SupportTicket) {
  const subject = ticket.subject?.toLowerCase() ?? "";
  if (subject.includes("payment")) return "Payment Change";
  if (subject.includes("shop")) return "Shop Name Change";
  if (subject.includes("vehicle")) return "Vehicle Update";
  return "Chat Support";
}

function accountRequestTypeLabel(request: AccountChangeRequest) {
  if (request.type === "AccountDeletion") return "Account Deletion";
  if (request.type === "Vehicle" || request.type === "RC" || request.type === "DrivingLicense") return "Vehicle Update";
  if (request.type === "BankAccount" || request.type === "UPI") return "Payment Change";
  if (request.type === "ShopName") return "Shop Name Change";
  return formatStatus(request.type);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}

function InspectGrid({ items }: { items: InspectionItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{item.label}</p>
          <div className="mt-2 text-sm">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/80 px-5 py-4 md:border-r md:last:border-r-0">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--deep)]">{value}</p>
    </div>
  );
}

function MediaStrip({
  items,
  title
}: {
  items?: Array<{ url: string; resourceType: string; originalName?: string }>;
  title: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <a
            key={item.url}
            className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff]"
            href={item.url}
            rel="noreferrer"
            target="_blank"
          >
            {item.resourceType === "video" ? (
              <video className="aspect-video w-full object-cover" controls src={item.url} />
            ) : (
              <img alt={item.originalName ?? title} className="aspect-video w-full object-cover" src={item.url} />
            )}
            <div className="px-3 py-2 text-xs text-[var(--muted)]">{item.originalName ?? item.resourceType}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ProofMediaManager({
  items,
  onAdd,
  onDelete,
  pending,
  stage,
  title
}: {
  items: Array<{ url: string; resourceType: string; originalName?: string }>;
  onAdd: (files: File[]) => void;
  onDelete: (url: string) => void;
  pending: boolean;
  stage: "RECEIVED" | "STITCHED";
  title: string;
}) {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-black">{title}</h4><p className="mt-1 text-xs text-slate-500">{items.length} uploaded photo(s)</p></div><label className={cn("cursor-pointer rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white", pending && "pointer-events-none opacity-50")}><input accept="image/*" className="hidden" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) onAdd(files); event.currentTarget.value = ""; }} type="file" />Upload {stage === "RECEIVED" ? "received" : "stitched"} photos</label></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" key={item.url}><a href={item.url} rel="noreferrer" target="_blank"><img alt={item.originalName ?? title} className="aspect-video w-full object-cover" src={item.url} /></a><div className="flex items-center justify-between gap-2 p-3"><p className="truncate text-xs text-slate-500">{item.originalName ?? "Proof photo"}</p><button className="text-xs font-bold text-rose-600" disabled={pending} onClick={() => { if (window.confirm("Remove this proof photo?")) onDelete(item.url); }} type="button">Remove</button></div></div>)}</div>
      {!items.length ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No proof photos uploaded yet.</p> : null}
    </Panel>
  );
}

type VerificationMediaItem = { label: string; resourceType: string; url: string };

function collectVerificationMedia(value: unknown, path: string[] = [], seen = new Set<string>()): VerificationMediaItem[] {
  if (!value) return [];
  if (typeof value === "string") {
    const key = path[path.length - 1] ?? "document";
    const isUrl = /^https?:\/\//i.test(value);
    const isMediaField = /(url|photo|image|front|back|pan|aadhaar|aadhar|license|document|selfie|face)/i.test(key);
    if (!isUrl || !isMediaField || seen.has(value)) return [];
    seen.add(value);
    return [{ label: humanizeFieldLabel(key), resourceType: /\.(mp4|mov|webm)(\?|$)/i.test(value) ? "video" : "image", url: value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectVerificationMedia(item, [...path, String(index + 1)], seen));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => collectVerificationMedia(nested, [...path, key], seen));
  }
  return [];
}

function VerificationMediaGallery({ items, title }: { items: VerificationMediaItem[]; title: string }) {
  if (!items.length) return null;
  return (
    <Panel>
      <h4 className="text-lg font-semibold">{title}</h4>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <a key={item.url} className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff]" href={item.url} rel="noreferrer" target="_blank">
            {item.resourceType === "video" ? (
              <video className="aspect-video w-full object-cover" controls src={item.url} />
            ) : (
              <img alt={item.label} className="aspect-video w-full object-cover" src={item.url} />
            )}
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-[var(--muted)]">
              <span>{item.label}</span>
              <span className="font-semibold text-[var(--accent)]">Open document</span>
            </div>
          </a>
        ))}
      </div>
    </Panel>
  );
}

function humanizeFieldLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

type AssistedOrderStep = "request" | "summary" | "quotes" | "checkout" | "payment";
type AssistedMeasurementMode = "MANUAL" | "SAMPLE" | "HOME";
type AssistedOrderItem = {
  id: string;
  description: string;
  gender: string;
  clothType: string;
  workType: string;
  selectedWorkItems: string[];
  otherWorkDescription: string;
  measurementMode: AssistedMeasurementMode;
  measurementNotes: string;
  preferredMeasurementSlot: string;
  mediaFiles: File[];
  voiceFiles: File[];
  sampleFile?: File;
  designFile?: File;
  mediaError?: string;
  voiceError?: string;
  sampleError?: string;
  designError?: string;
};

const ASSISTED_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ASSISTED_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const ASSISTED_AUDIO_MAX_BYTES = 50 * 1024 * 1024;
const ASSISTED_MAX_MEDIA_FILES = 20;
const ASSISTED_MAX_VOICE_FILES = 3;

function fileSizeLabel(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`;
}

function validateAssistedFiles(files: File[], kind: "media" | "voice" | "image") {
  const maxCount = kind === "voice" ? ASSISTED_MAX_VOICE_FILES : kind === "media" ? ASSISTED_MAX_MEDIA_FILES : 1;
  if (files.length > maxCount) return `Select no more than ${maxCount} ${kind === "voice" ? "voice clips" : kind === "media" ? "photos or videos" : "photo"}.`;
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    if (kind === "media" && !isImage && !isVideo) return `${file.name} is not a supported photo or video.`;
    if (kind === "voice" && !isAudio) return `${file.name} is not a supported audio file.`;
    if (kind === "image" && !isImage) return `${file.name} is not a supported photo.`;
    const limit = isImage ? ASSISTED_IMAGE_MAX_BYTES : isVideo ? ASSISTED_VIDEO_MAX_BYTES : ASSISTED_AUDIO_MAX_BYTES;
    if (file.size > limit) {
      const label = isImage ? "Photos" : isVideo ? "Videos" : "Voice clips";
      return `${file.name} is ${fileSizeLabel(file.size)}. ${label} must be ${fileSizeLabel(limit)} or smaller.`;
    }
  }
  return "";
}

const assistedMeasurementSlots = [
  "08:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 04:00 PM",
  "04:00 PM - 06:00 PM", "06:00 PM - 08:00 PM", "08:00 PM - 10:00 PM"
];

function newAssistedOrderItem(): AssistedOrderItem {
  return {
    id: `cloth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: "",
    gender: "",
    clothType: "",
    workType: "",
    selectedWorkItems: [],
    otherWorkDescription: "",
    measurementMode: "MANUAL",
    measurementNotes: "",
    preferredMeasurementSlot: "",
    mediaFiles: [],
    voiceFiles: []
  };
}

function parseMeasurementFields(notes: string) {
  return Object.fromEntries(notes.split(/\r?\n/).map((line) => line.split(":")).filter((parts) => parts.length > 1).map(([label, ...value]) => [label.trim(), value.join(":").trim()]).filter(([label, value]) => label && value));
}

function activeCouponDiscount(coupon: Coupon | undefined, pricing: { orderSubtotal: number; deliveryFee: number; platformFee: number; smallOrderFee: number; homeMeasurementFee: number }) {
  if (!coupon) return 0;
  return calculateCouponBenefit(coupon, pricing).discount;
}

function quoteEtaLabel(quote: TailorQuote) {
  return quote.estimatedHours ? `${quote.estimatedHours} hour${quote.estimatedHours === 1 ? "" : "s"}` : `${quote.estimatedDays} day${quote.estimatedDays === 1 ? "" : "s"}`;
}

async function openAdminRazorpayCheckout(
  requestId: string,
  config: Extract<Awaited<ReturnType<typeof startAdminTailoringCheckout>>, { mode: "online" }>["razorpay"]
) {
  if (!(window as unknown as { Razorpay?: unknown }).Razorpay) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Razorpay checkout could not be loaded"));
      document.head.appendChild(script);
    });
  }
  return new Promise<TailoringRequest>((resolve, reject) => {
    const Razorpay = (window as unknown as { Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (payload: { error?: { description?: string } }) => void) => void } }).Razorpay;
    const checkout = new Razorpay({
      key: config.keyId,
      amount: config.amount,
      currency: config.currency,
      name: config.name,
      description: config.description,
      order_id: config.orderId,
      prefill: config.prefill,
      handler: async (payload: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        try { resolve(await verifyAdminTailoringCheckout(requestId, payload)); } catch (error) { reject(error); }
      },
      modal: { ondismiss: () => reject(new Error("Payment window closed before payment was confirmed")) }
    });
    checkout.on("payment.failed", (payload) => reject(new Error(payload.error?.description ?? "Razorpay reported a failed payment")));
    checkout.open();
  });
}

function AssistedCreateOrderDialog({ coupons, customers, onComplete, open, setOpen }: {
  coupons: Coupon[];
  customers: AdminUser[];
  onComplete: (request: TailoringRequest) => void | Promise<void>;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [step, setStep] = useState<AssistedOrderStep>("request");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number }>();
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [urgency, setUrgency] = useState("Normal (up to 7 days)");
  const [items, setItems] = useState<AssistedOrderItem[]>(() => [newAssistedOrderItem()]);
  const [request, setRequest] = useState<TailoringRequest>();
  const [selectedQuote, setSelectedQuote] = useState<TailorQuote>();
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "UPI" | "ONLINE">("COD");
  const [couponCode, setCouponCode] = useState("");
  const [qr, setQr] = useState<{ id: string; imageUrl: string; paymentUrl: string; amount: number; currency: string; closeBy?: number }>();
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const recorderStreamRef = useRef<MediaStream | undefined>(undefined);
  const recorderChunksRef = useRef<Blob[]>([]);
  const [recordingItemId, setRecordingItemId] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const activeCustomer = customers.find((customer) => customer.id === customerId);
  const activeCustomerWhatsApp = (() => {
    const digits = (activeCustomer?.phone ?? "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.length === 10 ? `91${digits}` : digits;
  })();
  const customerOptions = customers.filter((customer) => {
    const haystack = `${customer.name ?? ""} ${customer.phone ?? ""} ${customer.darjiCustomerId ?? ""}`.toLowerCase();
    return customer.id === customerId || !customerSearch.trim() || haystack.includes(customerSearch.trim().toLowerCase());
  });
  const quoteQuery = useQuery({
    queryKey: ["admin", "assisted-order-quotes", request?.id],
    queryFn: () => getAdminTailorQuotes(request!.id),
    enabled: Boolean(request?.id) && step === "quotes",
    refetchInterval: step === "quotes" ? 10_000 : false
  });
  const quotes = (quoteQuery.data ?? []).filter((quote) => ["SUBMITTED", "RESERVED", "ACCEPTED"].includes(quote.status));
  const deliveryFee = Number(selectedQuote?.deliveryEstimate?.deliveryFee ?? 0);
  const tailoringSubtotal = Number(selectedQuote?.price ?? 0);
  const platformFee = getPlatformFee(tailoringSubtotal);
  const smallOrderFee = getSmallOrderFee(tailoringSubtotal);
  const homeMeasurementFee = items.some((item) => item.measurementMode === "HOME") ? measurementVisitFee(selectedQuote?.deliveryEstimate?.oneWayDistanceMeters) : 0;
  const beforeDiscount = tailoringSubtotal + deliveryFee + platformFee + smallOrderFee + homeMeasurementFee;
  const eligibleCoupons = coupons.filter((coupon) => coupon.isActive && Number(coupon.minOrderValue ?? 0) <= tailoringSubtotal && (!coupon.startsAt || new Date(coupon.startsAt).getTime() <= Date.now()) && (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() > Date.now()));
  const appliedCoupon = eligibleCoupons.find((coupon) => coupon.code.toUpperCase() === couponCode.toUpperCase());
  const discount = activeCouponDiscount(appliedCoupon, { orderSubtotal: tailoringSubtotal, deliveryFee, platformFee, smallOrderFee, homeMeasurementFee });
  const payable = Math.max(0, beforeDiscount - discount);

  const reset = () => {
    setStep("request"); setCustomerId(""); setCustomerSearch(""); setPickupAddress(""); setPickupLocation(undefined); setLocationBusy(false); setLocationError(""); setUrgency("Normal (up to 7 days)");
    setItems([newAssistedOrderItem()]); setRequest(undefined); setSelectedQuote(undefined); setPaymentMethod("COD"); setCouponCode(""); setQr(undefined); setBusyLabel(""); setError("");
  };
  useEffect(() => {
    if (!open) {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      reset();
    }
  }, [open]);
  useEffect(() => {
    if (!recordingItemId) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recordingItemId]);
  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);
  useEffect(() => {
    if (!qr || !request?.id || step !== "payment") return;
    const timer = window.setInterval(async () => {
      try {
        const status = await recoverAdminTailoringCheckout(request.id);
        if (status.status === "paid" && status.request) {
          window.clearInterval(timer);
          toast.success("Online payment received and order confirmed");
          await onComplete(status.request);
        }
      } catch { /* keep the QR screen available; manual refresh remains possible */ }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [onComplete, qr, request?.id, step]);

  const updateItem = (id: string, patch: Partial<AssistedOrderItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const useCurrentLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Current location is not supported by this browser. Enter the pickup address manually.");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const resolved = await reverseGeocodeAdminLocation(coords.latitude, coords.longitude);
        setPickupAddress(resolved.formattedAddress);
        setPickupLocation({ lat: resolved.latitude, lng: resolved.longitude });
      } catch (caught) {
        setLocationError(extractError(caught));
      } finally {
        setLocationBusy(false);
      }
    }, (geolocationError) => {
      setLocationBusy(false);
      setLocationError(geolocationError.code === geolocationError.PERMISSION_DENIED
        ? "Location permission was denied. Allow location access or enter the address manually."
        : "Your current location could not be detected. Try again or enter the address manually.");
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 });
  };
  const setMediaFiles = (itemId: string, files: File[]) => updateItem(itemId, { mediaFiles: files, mediaError: validateAssistedFiles(files, "media") });
  const setVoiceFiles = (itemId: string, files: File[]) => updateItem(itemId, { voiceFiles: files, voiceError: validateAssistedFiles(files, "voice") });
  const startVoiceRecording = async (itemId: string) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      updateItem(itemId, { voiceError: "Voice recording is not supported by this browser. Upload an audio file instead." });
      return;
    }
    const target = items.find((item) => item.id === itemId);
    if (!target || target.voiceFiles.length >= ASSISTED_MAX_VOICE_FILES) {
      updateItem(itemId, { voiceError: `You can add up to ${ASSISTED_MAX_VOICE_FILES} voice clips.` });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorderStreamRef.current = stream;
      recorderRef.current = recorder;
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recorderChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(recorderChunksRef.current, { type: mimeType });
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: mimeType });
        setItems((current) => current.map((item) => {
          if (item.id !== itemId) return item;
          const nextFiles = [...item.voiceFiles, file];
          const voiceError = file.size < 1024 ? "The recording is empty or too short. Record it again." : validateAssistedFiles(nextFiles, "voice");
          return { ...item, voiceFiles: voiceError ? item.voiceFiles : nextFiles, voiceError };
        }));
        stream.getTracks().forEach((track) => track.stop());
        recorderChunksRef.current = [];
        recorderRef.current = undefined;
        recorderStreamRef.current = undefined;
        setRecordingItemId("");
        setRecordingSeconds(0);
      };
      recorder.start();
      setRecordingSeconds(0);
      setRecordingItemId(itemId);
      updateItem(itemId, { voiceError: "" });
    } catch {
      updateItem(itemId, { voiceError: "Microphone access was denied or unavailable. Allow access or upload an audio file instead." });
    }
  };
  const stopVoiceRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };
  const itemIsValid = (item: AssistedOrderItem) => Boolean(
    item.description.trim().length >= 10 && item.gender && item.clothType && item.workType && item.mediaFiles.length &&
    !item.mediaError && !item.voiceError && !item.sampleError && !item.designError &&
    (item.workType === "Other" ? item.otherWorkDescription.trim().length >= 3 : item.selectedWorkItems.length) &&
    (item.measurementMode !== "HOME" || item.preferredMeasurementSlot) &&
    (!item.selectedWorkItems.includes("Copy Existing Garment") || item.sampleFile) &&
    (!item.selectedWorkItems.includes("Stitch from Reference / Design") || item.designFile)
  );
  const requestValid = Boolean(customerId && pickupAddress.trim().length >= 8 && items.length && items.every(itemIsValid));

  const submitForQuotes = async () => {
    if (!requestValid) return;
    setBusyLabel("Uploading request files"); setError("");
    try {
      const uploadedItems = await Promise.all(items.map(async (item) => {
        const [media, voiceNotes, sampleMedia, designMedia] = await Promise.all([
          uploadAdminTailoringMedia(item.mediaFiles),
          item.voiceFiles.length ? uploadAdminTailoringMedia(item.voiceFiles) : Promise.resolve([] as UploadedTailoringMedia[]),
          item.sampleFile ? uploadAdminTailoringMedia([item.sampleFile]) : Promise.resolve([] as UploadedTailoringMedia[]),
          item.designFile ? uploadAdminTailoringMedia([item.designFile]) : Promise.resolve([] as UploadedTailoringMedia[])
        ]);
        const measurementFields = item.measurementMode === "MANUAL" ? parseMeasurementFields(item.measurementNotes) : {};
        return {
          description: item.description.trim(), gender: item.gender, clothType: item.clothType, workType: item.workType,
          serviceCategory: item.workType, selectedWorkItems: item.selectedWorkItems, otherWorkDescription: item.otherWorkDescription.trim() || undefined,
          measurement: item.measurementMode === "MANUAL" ? { label: item.clothType, fields: measurementFields } : undefined,
          measurementNotes: item.measurementNotes.trim() || undefined,
          homeMeasurementBooked: item.measurementMode === "HOME", preferredMeasurementSlot: item.measurementMode === "HOME" ? item.preferredMeasurementSlot : undefined,
          sampleProvided: item.measurementMode === "SAMPLE" || Boolean(item.sampleFile), media, voiceNotes, sampleMedia, designMedia
        };
      }));
      setBusyLabel("Sending request to verified tailors");
      const created = await createAdminTailoringRequest({ customerId, urgency, pickupAddress: pickupAddress.trim(), pickupLocation, ...uploadedItems[0], items: uploadedItems });
      setRequest(created); setStep("quotes");
      toast.success("Request sent to verified tailors");
    } catch (caught) { setError(extractError(caught)); } finally { setBusyLabel(""); }
  };

  const continueWithQuote = async () => {
    if (!request || !selectedQuote) return;
    setBusyLabel("Locking tailor and calculating delivery"); setError("");
    try {
      const result = await selectAdminTailorQuote(request.id, selectedQuote.id);
      setRequest(result.request); setSelectedQuote(result.quote); setStep("checkout");
    } catch (caught) { setError(extractError(caught)); } finally { setBusyLabel(""); }
  };

  const confirmOrder = async () => {
    if (!request || !selectedQuote) return;
    setBusyLabel(paymentMethod === "UPI" ? "Generating secure Razorpay QR" : paymentMethod === "ONLINE" ? "Opening Razorpay checkout" : "Confirming COD order"); setError("");
    try {
      const response = await startAdminTailoringCheckout(request.id, {
        quoteId: selectedQuote.id, paymentMethod, adminQr: paymentMethod === "UPI", deliveryFee, platformFee, smallOrderFee, homeMeasurementFee,
        preferredMeasurementSlot: items.find((item) => item.measurementMode === "HOME")?.preferredMeasurementSlot,
        couponCode: appliedCoupon?.code,
        additionalItems: items.slice(1).map((item) => ({ gender: item.gender, clothType: item.clothType, workType: item.workType, description: item.description })),
        totalAmount: payable
      });
      if (response.mode === "admin_qr") { setRequest(response.request); setQr(response.razorpayQr); setStep("payment"); return; }
      if (response.mode === "online") {
        const confirmed = await openAdminRazorpayCheckout(request.id, response.razorpay);
        await onComplete(confirmed); return;
      }
      await onComplete(response.request);
    } catch (caught) { setError(extractError(caught)); } finally { setBusyLabel(""); }
  };

  const stepIndex = ["request", "summary", "quotes", "checkout", "payment"].indexOf(step);
  const labels = ["Request", "Review", "Quotes", "Checkout", "Payment"];
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!busyLabel) setOpen(next); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[94vh] w-[min(1180px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-[#ead7b6] bg-[#fffdfa] shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
          <div className="sticky top-0 z-20 border-b border-[#efe1ca] bg-[#fffdfa]/95 px-5 py-4 backdrop-blur-xl sm:px-7">
            <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-2xl font-bold text-[var(--deep)]">Create customer order</Dialog.Title><Dialog.Description className="mt-1 text-sm text-[var(--muted)]">The same request, tailor quote and checkout flow used by the customer app.</Dialog.Description></div><Dialog.Close asChild><button aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl border border-[#efd9b5] bg-white" disabled={Boolean(busyLabel)}><X size={18} /></button></Dialog.Close></div>
            <div className="mt-4 grid grid-cols-5 gap-2">{labels.map((label, index) => <div key={label} className={cn("rounded-xl px-2 py-2 text-center text-[11px] font-bold", index <= stepIndex ? "bg-orange-500 text-white" : "bg-orange-50 text-amber-900/55")}>{index + 1}. {label}</div>)}</div>
          </div>
          <div className="space-y-5 p-5 sm:p-7">
            {error ? <InlineError message={error} /> : null}
            {busyLabel ? <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800"><LoaderCircle className="animate-spin" size={18} />{busyLabel}</div> : null}

            {step === "request" ? <>
              <Panel className="grid gap-4 md:grid-cols-2"><Field label="Find customer"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4" placeholder="Name, phone or CUS ID" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} /></Field><Field label="Customer account"><select className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select customer</option>{customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{getCustomerDisplayName(customer)} · {customer.phone} · {customer.darjiCustomerId ?? customer.id.slice(0, 8)}</option>)}</select></Field><Field label="Pickup address"><textarea className="min-h-24 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-3" placeholder="House, street, area, city, state and pincode" value={pickupAddress} onChange={(event) => { setPickupAddress(event.target.value); setPickupLocation(undefined); setLocationError(""); }} /><div className="mt-2 flex flex-wrap items-center gap-2"><button className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-3 text-sm font-bold text-orange-700 disabled:opacity-50" disabled={locationBusy} onClick={useCurrentLocation} type="button">{locationBusy ? <LoaderCircle className="animate-spin" size={16} /> : <MapPin size={16} />}{locationBusy ? "Fetching location" : "Use current location"}</button>{pickupLocation ? <span className="text-xs font-semibold text-emerald-700">Location captured · {pickupLocation.lat.toFixed(5)}, {pickupLocation.lng.toFixed(5)}</span> : null}</div>{locationError ? <p className="mt-2 text-xs font-semibold text-rose-600">{locationError}</p> : null}</Field><Field label="Delivery urgency"><select className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4" value={urgency} onChange={(event) => setUrgency(event.target.value)}><option>Normal (up to 7 days)</option><option>Express (3-5 days)</option><option>Instant Delivery</option></select></Field></Panel>
              {items.map((item, itemIndex) => {
                const garments = getGarmentsForGender(item.gender);
                const workOptions = getServiceCategory(item.workType)?.workItems ?? [];
                return <Panel key={item.id} className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">Clothing item {itemIndex + 1}</p><h3 className="mt-1 text-lg font-bold text-[var(--deep)]">Photos and tailoring details</h3></div><button className="rounded-xl p-2 text-rose-600 disabled:opacity-30" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 size={18} /></button></div>
                  <div className="grid gap-4 md:grid-cols-2"><Field label="Photos / videos (required)"><input accept="image/*,video/*" className="block w-full rounded-xl border border-[var(--panel-border)] bg-white p-3 text-sm" multiple type="file" onChange={(event) => setMediaFiles(item.id, Array.from(event.target.files ?? []))} /><p className="mt-1 text-xs text-[var(--muted)]">Photos: max 5 MB each · Videos: max 50 MB each · Up to 20 files.</p>{item.mediaFiles.length ? <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{item.mediaFiles.length} selected</p> : null}{item.mediaError ? <p className="mt-2 text-xs font-semibold text-rose-600">{item.mediaError}</p> : null}</Field><Field label="Voice clips (optional)"><input accept="audio/*" className="block w-full rounded-xl border border-[var(--panel-border)] bg-white p-3 text-sm" multiple type="file" onChange={(event) => setVoiceFiles(item.id, Array.from(event.target.files ?? []))} /><div className="mt-2 flex flex-wrap items-center gap-2"><button className={cn("inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold", recordingItemId === item.id ? "border-rose-300 bg-rose-50 text-rose-700" : "border-orange-300 bg-orange-50 text-orange-700")} disabled={Boolean(recordingItemId && recordingItemId !== item.id)} onClick={() => recordingItemId === item.id ? stopVoiceRecording() : void startVoiceRecording(item.id)} type="button">{recordingItemId === item.id ? <Square size={15} /> : <Mic size={16} />}{recordingItemId === item.id ? `Stop recording (${recordingSeconds}s)` : "Record voice"}</button><span className="text-xs text-[var(--muted)]">or upload · max 50 MB each · up to 3</span></div>{item.voiceFiles.length ? <div className="mt-2 space-y-1">{item.voiceFiles.map((file, fileIndex) => <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs" key={`${file.name}-${file.lastModified}-${fileIndex}`}><span className="min-w-0 truncate">{file.name} · {fileSizeLabel(file.size)}</span><button className="shrink-0 font-bold text-rose-600" onClick={() => setVoiceFiles(item.id, item.voiceFiles.filter((_, index) => index !== fileIndex))} type="button">Remove</button></div>)}</div> : null}{item.voiceError ? <p className="mt-2 text-xs font-semibold text-rose-600">{item.voiceError}</p> : null}</Field></div>
                  <Field label="What does the customer need?"><textarea className="min-h-24 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-3" maxLength={1000} placeholder="Describe the fit, repair, design and special instructions" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} /></Field>
                  <div className="grid gap-4 md:grid-cols-3"><Field label="Gender / fit"><select className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3" value={item.gender} onChange={(event) => updateItem(item.id, { gender: event.target.value, clothType: "" })}><option value="">Select</option>{GENDER_FIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Garment type"><select className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3" value={item.clothType} onChange={(event) => updateItem(item.id, { clothType: event.target.value })}><option value="">Select</option>{garments.map((garment) => <option key={garment} value={garment}>{garment}</option>)}</select></Field><Field label="Service type"><select className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3" value={item.workType} onChange={(event) => updateItem(item.id, { workType: event.target.value, selectedWorkItems: [], otherWorkDescription: "" })}><option value="">Select</option>{SERVICE_CATEGORIES.map((category) => <option key={category.id} value={category.label}>{category.label}</option>)}</select></Field></div>
                  {item.workType === "Other" ? <Field label="Other work details"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4" value={item.otherWorkDescription} onChange={(event) => updateItem(item.id, { otherWorkDescription: event.target.value })} /></Field> : workOptions.length ? <div><p className="mb-2 text-sm font-semibold">Select work</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{workOptions.map((work) => <label key={work} className={cn("flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-semibold", item.selectedWorkItems.includes(work) ? "border-orange-400 bg-orange-50" : "border-[var(--panel-border)] bg-white")}><input checked={item.selectedWorkItems.includes(work)} type="checkbox" onChange={(event) => updateItem(item.id, { selectedWorkItems: event.target.checked ? [...item.selectedWorkItems, work] : item.selectedWorkItems.filter((entry) => entry !== work) })} />{work}</label>)}</div></div> : null}
                  <div><p className="mb-2 text-sm font-semibold">Measurement method</p><div className="grid gap-2 sm:grid-cols-3">{([['MANUAL','Upload / enter measurements'],['SAMPLE','Use sample garment'],['HOME','Home measurement visit']] as const).map(([value, label]) => <button className={cn("rounded-xl border px-4 py-3 text-left text-sm font-semibold", item.measurementMode === value ? "border-orange-500 bg-orange-50 text-orange-700" : "border-[var(--panel-border)] bg-white")} key={value} onClick={() => updateItem(item.id, { measurementMode: value })} type="button">{label}</button>)}</div></div>
                  {item.measurementMode === "MANUAL" ? <Field label="Measurements / notes"><textarea className="min-h-24 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-3" placeholder={'One per line, for example:\nChest: 40 in\nWaist: 34 in'} value={item.measurementNotes} onChange={(event) => updateItem(item.id, { measurementNotes: event.target.value })} /></Field> : null}
                  {item.measurementMode === "SAMPLE" || item.selectedWorkItems.includes("Copy Existing Garment") ? <Field label="Sample garment photo"><input accept="image/*" className="block w-full rounded-xl border border-[var(--panel-border)] bg-white p-3 text-sm" type="file" onChange={(event) => { const file = event.target.files?.[0]; updateItem(item.id, { sampleFile: file, sampleError: file ? validateAssistedFiles([file], "image") : "" }); }} /><p className="mt-1 text-xs text-[var(--muted)]">Maximum photo size: 5 MB.</p>{item.sampleError ? <p className="mt-2 text-xs font-semibold text-rose-600">{item.sampleError}</p> : null}</Field> : null}
                  {item.selectedWorkItems.includes("Stitch from Reference / Design") ? <Field label="Design / reference photo"><input accept="image/*" className="block w-full rounded-xl border border-[var(--panel-border)] bg-white p-3 text-sm" type="file" onChange={(event) => { const file = event.target.files?.[0]; updateItem(item.id, { designFile: file, designError: file ? validateAssistedFiles([file], "image") : "" }); }} /><p className="mt-1 text-xs text-[var(--muted)]">Maximum photo size: 5 MB.</p>{item.designError ? <p className="mt-2 text-xs font-semibold text-rose-600">{item.designError}</p> : null}</Field> : null}
                  {item.measurementMode === "HOME" ? <Field label="Measurement visit time"><select className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4" value={item.preferredMeasurementSlot} onChange={(event) => updateItem(item.id, { preferredMeasurementSlot: event.target.value })}><option value="">Select time slot</option>{assistedMeasurementSlots.map((slot) => <option key={slot}>{slot}</option>)}</select></Field> : null}
                </Panel>;
              })}
              <div className="flex flex-wrap justify-between gap-3"><ActionButton variant="secondary" onClick={() => setItems((current) => [...current, newAssistedOrderItem()])}><Plus size={16} /> Add another cloth</ActionButton><ActionButton disabled={!requestValid} onClick={() => setStep("summary")}>Review request <ChevronRight size={16} /></ActionButton></div>
            </> : null}

            {step === "summary" ? <><Panel><h3 className="text-lg font-bold">Request summary</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><AssistedSummaryTile label="Customer" value={getCustomerDisplayName(activeCustomer)} /><AssistedSummaryTile label="Urgency" value={urgency} /><AssistedSummaryTile label="Clothing items" value={String(items.length)} /></div><p className="mt-4 rounded-xl bg-orange-50 p-4 text-sm font-semibold">Pickup: {pickupAddress}</p></Panel>{items.map((item, index) => <Panel key={item.id}><p className="text-xs font-bold uppercase text-orange-500">Item {index + 1}</p><h4 className="mt-1 text-lg font-bold">{item.gender} {item.clothType}</h4><p className="mt-1 text-sm text-[var(--muted)]">{item.workType}: {item.selectedWorkItems.join(", ") || item.otherWorkDescription}</p><p className="mt-3 text-sm">{item.description}</p><p className="mt-3 text-xs font-semibold text-[var(--muted)]">{item.mediaFiles.length} media · {item.voiceFiles.length} voice · {item.measurementMode === "HOME" ? item.preferredMeasurementSlot : item.measurementMode}</p></Panel>)}<div className="flex justify-between gap-3"><ActionButton variant="secondary" onClick={() => setStep("request")}>Edit</ActionButton><ActionButton disabled={Boolean(busyLabel)} onClick={() => void submitForQuotes()}>Get tailor quotes <ChevronRight size={16} /></ActionButton></div></> : null}

            {step === "quotes" ? <><Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-bold">Live tailor quotes</h3><p className="text-sm text-[var(--muted)]">{quotes.length ? `${quotes.length} quote${quotes.length === 1 ? "" : "s"} received` : "Waiting for verified tailors to quote."}</p></div><ActionButton variant="secondary" disabled={quoteQuery.isFetching} onClick={() => void quoteQuery.refetch()}><RotateCcw size={15} /> Refresh</ActionButton></Panel><div className="grid gap-3">{quotes.map((quote) => <button key={quote.id} className={cn("grid gap-4 rounded-2xl border bg-white p-5 text-left sm:grid-cols-[1fr_auto]", selectedQuote?.id === quote.id ? "border-orange-500 ring-2 ring-orange-100" : "border-[var(--panel-border)]")} onClick={() => setSelectedQuote(quote)}><div className="flex gap-3"><MiniAvatar seed={quote.tailorId} src={quote.tailor?.user?.profileUrl || quote.tailor?.user?.avatarUrl} /><div><p className="font-bold">{getTailorDisplayName(quote.tailor ?? ({ id: quote.tailorId } as TailorProfile))}</p><p className="mt-1 text-sm text-[var(--muted)]">ETA {quoteEtaLabel(quote)} · Rating {Number(quote.tailor?.rating ?? 0).toFixed(1)}</p><p className="mt-2 text-sm">{quote.message || "No additional message"}</p></div></div><div className="text-right"><p className="text-2xl font-bold text-orange-600">{formatCurrency(quote.price)}</p><p className="mt-1 text-xs text-[var(--muted)]">Delivery {formatCurrency(quote.deliveryEstimate?.deliveryFee ?? 0)}</p><p className="text-xs text-[var(--muted)]">{((quote.deliveryEstimate?.oneWayDistanceMeters ?? 0) / 1000).toFixed(1)} km one way</p></div></button>)}{!quotes.length && !quoteQuery.isLoading ? <EmptyState message="No quote yet. Keep this window open or return later; new quotes refresh automatically." /> : null}</div><div className="flex justify-end"><ActionButton disabled={!selectedQuote || Boolean(busyLabel)} onClick={() => void continueWithQuote()}>Confirm this tailor <ChevronRight size={16} /></ActionButton></div></> : null}

            {step === "checkout" && selectedQuote ? <><div className="grid gap-4 lg:grid-cols-[1fr_380px]"><Panel><h3 className="text-lg font-bold">Payment and coupon</h3><div className="mt-4 grid gap-3 sm:grid-cols-3">{([['COD','Cash on delivery'],['UPI','Payment QR'],['ONLINE','Online checkout']] as const).map(([value, label]) => <button className={cn("rounded-2xl border p-4 text-left font-semibold", paymentMethod === value ? "border-orange-500 bg-orange-50" : "border-[var(--panel-border)] bg-white")} key={value} onClick={() => setPaymentMethod(value)}>{label}</button>)}</div><Field label="Coupon"><select className="mt-4 h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4" value={couponCode} onChange={(event) => setCouponCode(event.target.value)}><option value="">No coupon</option>{eligibleCoupons.map((coupon) => <option key={coupon.id ?? coupon.code} value={coupon.code}>{coupon.code} · {coupon.description}</option>)}</select></Field>{paymentMethod === "UPI" ? <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">A fixed-amount QR for Razorpay's secure hosted payment page will be generated. Share it with the customer; the order confirms only after Razorpay reports a captured payment.</p> : null}</Panel><Panel><h3 className="text-lg font-bold">Price breakdown</h3><div className="mt-4 space-y-3 text-sm"><SummaryAmount label="Tailor quote" value={tailoringSubtotal} /><SummaryAmount label="Two-way delivery" value={deliveryFee} /><SummaryAmount label="Platform fee" value={platformFee} /><SummaryAmount label="Small-order fee" value={smallOrderFee} />{homeMeasurementFee ? <SummaryAmount label="Home measurement" value={homeMeasurementFee} /> : null}{discount ? <SummaryAmount label={`Coupon ${appliedCoupon?.code}`} value={-discount} /> : null}<div className="border-t pt-3"><SummaryAmount label="Total payable" value={payable} strong /></div></div></Panel></div><div className="flex justify-between gap-3"><ActionButton variant="secondary" onClick={() => setStep("quotes")}>Back to quotes</ActionButton><ActionButton disabled={Boolean(busyLabel)} onClick={() => void confirmOrder()}>{paymentMethod === "COD" ? "Confirm COD order" : paymentMethod === "UPI" ? "Generate Razorpay QR" : "Pay with Razorpay"}</ActionButton></div></> : null}

            {step === "payment" && qr ? <div className="mx-auto max-w-lg text-center"><Panel><p className="text-xs font-bold uppercase tracking-widest text-orange-500">Awaiting online payment</p><h3 className="mt-2 text-2xl font-bold">Pay {formatCurrency(qr.amount / 100)}</h3><img alt="Razorpay payment QR" className="mx-auto mt-5 aspect-square w-full max-w-[320px] rounded-2xl border border-[var(--panel-border)] bg-white object-contain p-3" src={qr.imageUrl} /><p className="mt-4 text-sm text-[var(--muted)]">The QR opens Razorpay's hosted payment page and expires automatically. Payment status is checked every 10 seconds.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><ActionButton disabled={!activeCustomerWhatsApp} onClick={() => window.open(`https://wa.me/${activeCustomerWhatsApp}?text=${encodeURIComponent(`Darji order payment ${formatCurrency(qr.amount / 100)}: ${qr.paymentUrl}`)}`, "_blank", "noopener,noreferrer")}><Send size={16} /> Share on WhatsApp</ActionButton><ActionButton variant="secondary" onClick={() => void navigator.clipboard.writeText(qr.paymentUrl)}><Copy size={16} /> Copy payment link</ActionButton><ActionButton variant="secondary" onClick={() => window.open(qr.paymentUrl, "_blank", "noopener,noreferrer")}><ArrowRight size={16} /> Open payment page</ActionButton><ActionButton variant="secondary" onClick={async () => { if (!request) return; const status = await recoverAdminTailoringCheckout(request.id); if (status.status === "paid" && status.request) await onComplete(status.request); else toast.info(status.message ?? "Payment is still pending"); }}><RotateCcw size={16} /> Check payment</ActionButton></div></Panel></div> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SummaryAmount({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return <div className={cn("flex items-center justify-between gap-4", strong && "text-lg font-bold")}><span>{label}</span><span className={cn("tabular-nums", value < 0 && "text-emerald-700")}>{value < 0 ? "−" : ""}{formatCurrency(Math.abs(value))}</span></div>;
}

function AssistedSummaryTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--panel-border)] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p><p className="mt-2 font-bold text-[var(--deep)]">{value || "Not selected"}</p></div>;
}

function CreateOrderDialog({
  catalog,
  customers,
  draft,
  loadingCatalog,
  onChange,
  onSubmit,
  open,
  pending,
  setOpen
}: {
  catalog: CatalogService[];
  customers: AdminUser[];
  draft: AdminCreateOrderDraft;
  loadingCatalog: boolean;
  onChange: (draft: AdminCreateOrderDraft) => void;
  onSubmit: () => void;
  open: boolean;
  pending: boolean;
  setOpen: (open: boolean) => void;
}) {
  const customerQuery = draft.customerSearch.trim().toLocaleLowerCase();
  const customerOptions = customers
    .filter((customer) => customer.id === draft.customerId || !customerQuery || [customer.name, customer.phone, customer.darjiCustomerId].some((value) => String(value ?? "").toLocaleLowerCase().includes(customerQuery)))
    .sort((a, b) => getCustomerDisplayName(a).localeCompare(getCustomerDisplayName(b)));
  const estimatedSubtotal = draft.items.reduce((total, item) => {
    const service = catalog.find((entry) => entry.id === item.serviceId);
    return total + Number(service?.price ?? 0) * Math.max(1, item.quantity);
  }, 0);
  const isValid = Boolean(
    draft.customerId &&
    draft.pickupScheduledAt &&
    draft.items.length &&
    draft.items.every((item) => item.serviceId && Number.isInteger(item.quantity) && item.quantity > 0) &&
    draft.address.name.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(draft.address.phone.trim()) &&
    draft.address.line1.trim().length >= 5 &&
    draft.address.city.trim().length >= 2 &&
    draft.address.state.trim().length >= 2 &&
    /^\d{6}$/.test(draft.address.pincode.trim())
  );
  const updateAddress = (key: keyof AdminCreateOrderDraft["address"], value: string) => onChange({
    ...draft,
    address: { ...draft.address, [key]: value }
  });
  const updateItem = (index: number, value: Partial<AdminCreateOrderDraft["items"][number]>) => onChange({
    ...draft,
    items: draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item)
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-[#fffdfa] shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#efe1ca] bg-[#fffdfa]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
            <div>
              <Dialog.Title className="text-xl font-bold text-[var(--deep)]">Create order</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Create a customer order and schedule its pickup from the admin panel.</Dialog.Description>
            </div>
            <Dialog.Close asChild><button aria-label="Close create order" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#efd9b5] bg-white text-[var(--deep)] transition hover:bg-orange-50" disabled={pending} type="button"><X size={18} /></button></Dialog.Close>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <section>
              <h3 className="text-base font-bold text-[var(--deep)]">Customer</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Find customer">
                  <input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" placeholder="Name, phone or customer ID" value={draft.customerSearch} onChange={(event) => onChange({ ...draft, customerSearch: event.target.value })} />
                </Field>
                <Field label="Customer account">
                  <select
                    className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                    value={draft.customerId}
                    onChange={(event) => {
                      const customerId = event.target.value;
                      const customer = customers.find((item) => item.id === customerId);
                      onChange({
                        ...draft,
                        customerId,
                        address: {
                          ...draft.address,
                          name: customer?.name ?? draft.address.name,
                          phone: customer?.phone ?? draft.address.phone
                        }
                      });
                    }}
                  >
                    <option value="">Select customer</option>
                    {customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{getCustomerDisplayName(customer)} · {customer.phone} · {customer.darjiCustomerId ?? customer.id.slice(0, 8)}</option>)}
                  </select>
                </Field>
              </div>
              {!customerOptions.length && customerQuery ? <p className="mt-2 text-sm text-rose-700">No customer matches that search. Create the customer account first.</p> : null}
            </section>

            <section className="border-t border-[var(--panel-border)] pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--deep)]">Services</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Add each service included in this order.</p>
                </div>
                <ActionButton
                  className="h-10 px-4"
                  disabled={loadingCatalog || !catalog.length}
                  onClick={() => onChange({ ...draft, items: [...draft.items, { serviceId: "", quantity: 1, instructions: "" }] })}
                  variant="secondary"
                >
                  <Plus size={15} /> Add service
                </ActionButton>
              </div>
              <div className="mt-3 space-y-3">
                {draft.items.map((item, index) => (
                  <div className="grid gap-3 rounded-2xl border border-[var(--panel-border)] bg-white p-3 md:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)_40px]" key={index}>
                    <select aria-label={`Service ${index + 1}`} className="h-11 min-w-0 rounded-xl border border-[var(--panel-border)] bg-[#fffdfa] px-3 text-sm outline-none focus:border-[var(--accent)]" disabled={loadingCatalog} value={item.serviceId} onChange={(event) => updateItem(index, { serviceId: event.target.value })}>
                      <option value="">{loadingCatalog ? "Loading services…" : "Select service"}</option>
                      {catalog.map((service) => <option key={service.id} value={service.id}>{service.category} · {service.name} · {formatCurrency(service.price)}</option>)}
                    </select>
                    <input aria-label={`Quantity for service ${index + 1}`} className="h-11 rounded-xl border border-[var(--panel-border)] bg-[#fffdfa] px-3 text-sm outline-none focus:border-[var(--accent)]" min={1} type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} />
                    <input aria-label={`Instructions for service ${index + 1}`} className="h-11 min-w-0 rounded-xl border border-[var(--panel-border)] bg-[#fffdfa] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="Item instructions (optional)" value={item.instructions} onChange={(event) => updateItem(index, { instructions: event.target.value })} />
                    <button aria-label={`Remove service ${index + 1}`} className="grid h-11 w-10 place-items-center rounded-xl text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-35" disabled={draft.items.length === 1} onClick={() => onChange({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })} type="button"><Trash2 size={16} /></button>
                  </div>
                ))}
                {!loadingCatalog && !catalog.length ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">No active services are available. Add a catalog service before creating an order.</p> : null}
              </div>
            </section>

            <section className="border-t border-[var(--panel-border)] pt-5">
              <h3 className="text-base font-bold text-[var(--deep)]">Pickup and payment</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Pickup date and time"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" min={localDateTimeInputValue(new Date())} type="datetime-local" value={draft.pickupScheduledAt} onChange={(event) => onChange({ ...draft, pickupScheduledAt: event.target.value })} /></Field>
                <Field label="Payment method"><select className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" value={draft.paymentMethod} onChange={(event) => onChange({ ...draft, paymentMethod: event.target.value as AdminCreateOrderDraft["paymentMethod"] })}><option value="COD">Cash on delivery</option><option value="UPI">UPI</option><option value="ONLINE">Online</option></select></Field>
              </div>
            </section>

            <section className="border-t border-[var(--panel-border)] pt-5">
              <h3 className="text-base font-bold text-[var(--deep)]">Pickup address</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Contact name"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" value={draft.address.name} onChange={(event) => updateAddress("name", event.target.value)} /></Field>
                <Field label="Phone"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={draft.address.phone} onChange={(event) => updateAddress("phone", event.target.value.replace(/\D/g, "").slice(0, 10))} /></Field>
                <Field label="Address line 1"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" placeholder="House, building and street" value={draft.address.line1} onChange={(event) => updateAddress("line1", event.target.value)} /></Field>
                <Field label="Address line 2"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" placeholder="Area or locality (optional)" value={draft.address.line2} onChange={(event) => updateAddress("line2", event.target.value)} /></Field>
                <Field label="City"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" value={draft.address.city} onChange={(event) => updateAddress("city", event.target.value)} /></Field>
                <Field label="State"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" value={draft.address.state} onChange={(event) => updateAddress("state", event.target.value)} /></Field>
                <Field label="Pincode"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" inputMode="numeric" maxLength={6} value={draft.address.pincode} onChange={(event) => updateAddress("pincode", event.target.value.replace(/\D/g, "").slice(0, 6))} /></Field>
                <Field label="Landmark"><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-[var(--accent)]" placeholder="Optional" value={draft.address.landmark} onChange={(event) => updateAddress("landmark", event.target.value)} /></Field>
              </div>
              <Field label="Order instructions"><textarea className="mt-3 min-h-24 w-full rounded-xl border border-[var(--panel-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" maxLength={1000} placeholder="Pickup or order notes (optional)" value={draft.instructions} onChange={(event) => onChange({ ...draft, instructions: event.target.value })} /></Field>
            </section>

            <div className="flex flex-col gap-3 border-t border-[var(--panel-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-[var(--deep)]">Estimated service subtotal</p><p className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--deep)]">{formatCurrency(estimatedSubtotal)}</p><p className="mt-1 text-xs text-[var(--muted)]">Platform and small-order fees are calculated by the server.</p></div>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild><ActionButton disabled={pending} variant="secondary">Cancel</ActionButton></Dialog.Close>
                <ActionButton disabled={!isValid || pending || loadingCatalog} onClick={onSubmit}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{pending ? "Creating…" : "Create order"}</ActionButton>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OrderDetailDialog({
  me,
  notes,
  onAssign,
  onAddNote,
  onPriorityChange,
  onStatusChange,
  onPrintInvoice,
  onDownloadImages,
  onDeleteOrder,
  onOpenCustomer,
  onOpenTailor,
  onOpenQuoteTailor,
  onOpenPartner,
  onOpenDeliveryTask,
  onOpenBatch,
  onOpenPayment,
  focusSection,
  open,
  order,
  deliveryRequests = [],
  priority,
  setOpen
}: {
  me: MeResponse;
  notes: AdminOrderNote[];
  onAssign: () => void;
  onAddNote: (note: string) => void;
  onPriorityChange: (priority: AdminOrderPriority) => void;
  onStatusChange: (status: string) => void;
  onPrintInvoice: () => void;
  onDownloadImages: () => void;
  onDeleteOrder: () => void;
  onOpenCustomer: () => void;
  onOpenTailor: () => void;
  onOpenQuoteTailor: (tailor: TailorProfile) => void;
  onOpenPartner: (partner: DeliveryPartnerProfile) => void;
  onOpenDeliveryTask: (request: DeliveryRequest) => void;
  onOpenBatch: (batch: BatchFocusTarget) => void;
  onOpenPayment: (payment: Payment) => void;
  focusSection: OrderDetailFocus;
  open: boolean;
  order: Order | null;
  deliveryRequests?: any[];
  priority: AdminOrderPriority;
  setOpen: (open: boolean) => void;
}) {
  const [nextStatus, setNextStatus] = useState(order?.status ?? "ORDER_PLACED");
  const [noteDraft, setNoteDraft] = useState("");
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteDraft, setQuoteDraft] = useState({ price: "", estimatedDays: "", estimatedHours: "", message: "" });
  const queryClient = useQueryClient();
  const overviewRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNextStatus(order?.status ?? "ORDER_PLACED");
    setNoteDraft("");
    setExpandedItem(null);
    setEditingQuoteId(null);
  }, [order]);

  useEffect(() => {
    if (!open) return;
    const target = {
      overview: overviewRef.current,
      notes: notesRef.current,
      invoice: invoiceRef.current,
      media: mediaRef.current,
      timeline: timelineRef.current
    }[focusSection];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusSection, open, order?.id]);

  const linkedDeliveryRequests = order ? deliveryRequests.filter((request) => request.orderId === order.id) : [];
  const trackingEvents = order ? buildOrderTrackingEvents(order, linkedDeliveryRequests) : [];
  const pricingDetails = order ? buildOrderPricingDetails(order) : null;
  const quotesQuery = useQuery({
    queryKey: ["admin", "order-quotes", order?.id],
    queryFn: () => getAdminOrderQuotes(order!.id),
    enabled: open && Boolean(order?.id)
  });
  const quoteUpdateMutation = useMutation({
    mutationFn: updateAdminOrderQuote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "order-quotes", order?.id] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "tailoring-requests"] });
      setEditingQuoteId(null);
      toast.success("Tailor quote updated");
    },
    onError: (error) => toast.error(extractError(error))
  });

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed bottom-3 right-3 top-3 z-50 w-[min(96vw,980px)] overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[#fffdfa] shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
          {order ? (
            <>
              <div className="sticky top-0 z-20 border-b border-[#efe1ca] bg-[#fffdfa]/95 px-5 py-4 backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3"><Dialog.Title className="text-xl font-bold text-[var(--deep)]">{getOrderDisplayNumber(order)}</Dialog.Title><StatusBadge value={order.status} /><UrgencyBadge value={String(order.deliveryMode ?? order.request?.deliveryMode ?? order.request?.urgency ?? "STANDARD")} /><PriorityBadge value={priority} /></div>
                    <Dialog.Description className="mt-2 text-xs font-medium text-[var(--muted)]">Internal trace: {order.darjiId ?? order.id}</Dialog.Description>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pr-11">
                    <ActionButton className="h-10 rounded-xl px-4" variant="secondary" onClick={onAssign}><PencilLine className="h-4 w-4" />Edit</ActionButton>
                    <ActionButton className="h-10 rounded-xl px-4" variant="secondary" onClick={onDownloadImages}><Download className="h-4 w-4" />Images ZIP</ActionButton>
                    <ActionButton className="h-10 rounded-xl px-4" variant="secondary" onClick={onPrintInvoice}><Download className="h-4 w-4" />Download Invoice</ActionButton>
                  </div>
                </div>
                <Dialog.Close asChild><button aria-label="Close order details" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[#efd9b5] bg-white text-[var(--deep)] transition hover:bg-orange-50" type="button"><X size={18} /></button></Dialog.Close>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <OrderDrawerSummary icon={UserCircle2} label="Customer" value={getCustomerDisplayName(order.customer)} detail={order.customer?.phone ?? "No phone"} onClick={onOpenCustomer} />
                  <OrderDrawerSummary icon={CalendarDays} label="Order Date & Time" value={formatDate(order.createdAt)} detail={order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"} />
                  <OrderDrawerSummary icon={CreditCard} label="Payment" value={formatStatus(order.paymentMethod)} detail={formatStatus(order.paymentStatus)} onClick={order.payments?.[0] ? () => onOpenPayment(order.payments![0]) : undefined} />
                  <OrderDrawerSummary icon={ReceiptIndianRupee} label="Order Total" value={formatCurrency(order.totalAmount)} detail="Customer total" />
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-4 lg:grid-cols-2" ref={overviewRef}>
                  <Panel className="rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-[var(--deep)]">People &amp; fulfilment</h4>
                    <div className="mt-4 grid gap-3 text-xs">
                      <OrderDetailRow label="Category" value={order.items?.[0]?.service?.category?.name ?? "General"} />
                      <OrderDetailRow label="Tailor" value={order.tailor ? getTailorDisplayName(order.tailor) : "Unassigned"} onClick={order.tailor ? onOpenTailor : undefined} />
                      <OrderDetailRow label="Pickup Partner" value={order.pickupPartner ? getPartnerDisplayName(order.pickupPartner) : "Unassigned"} onClick={order.pickupPartner ? () => onOpenPartner(order.pickupPartner!) : undefined} />
                      <OrderDetailRow label="Delivery Partner" value={order.deliveryPartner ? getPartnerDisplayName(order.deliveryPartner) : "Unassigned"} onClick={order.deliveryPartner ? () => onOpenPartner(order.deliveryPartner!) : undefined} />
                      <OrderDetailRow label="Pickup Scheduled" value={formatDate(order.pickupScheduledAt, true)} />
                      {(() => {
                        const batchId = order.batchId ?? linkedDeliveryRequests.find((request) => request.batchId)?.batchId;
                        return <OrderDetailRow label="Delivery batch" value={batchId ? batchId.slice(0, 12).toUpperCase() : "Not batched"} onClick={batchId ? () => onOpenBatch({ batchId, roundAt: linkedDeliveryRequests.find((request) => request.batchId === batchId)?.roundAt }) : undefined} />;
                      })()}
                    </div>
                    <div className="mt-4 border-t border-[#efe3d0] pt-4">
                      <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-[var(--deep)]">Delivery tasks</p><Badge tone={linkedDeliveryRequests.length ? "sky" : "slate"}>{linkedDeliveryRequests.length} linked</Badge></div>
                      <div className="mt-2 space-y-2">
                        {linkedDeliveryRequests.map((request) => <button className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-white px-3 py-2 text-left transition hover:border-sky-300 hover:bg-sky-50" key={request.id} onClick={() => onOpenDeliveryTask(request)} type="button"><span><span className="block text-xs font-semibold text-[var(--deep)]">{request.taskId ?? request.darjiId ?? request.id}</span><span className="block text-[10px] text-[var(--muted)]">{formatStatus(request.type)} · {(order.deliveryPartner ?? order.pickupPartner) ? getPartnerDisplayName((order.deliveryPartner ?? order.pickupPartner)!) : "Unassigned"}</span></span><StatusBadge value={request.taskStatus} /></button>)}
                        {!linkedDeliveryRequests.length ? <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-[var(--muted)]">No delivery tasks are linked to this order yet.</p> : null}
                      </div>
                    </div>
                  </Panel>

                  {pricingDetails ? (
                    <Panel className="rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-[var(--deep)]">Price Details</h4>
                          <p className="mt-1 text-xs text-[var(--muted)]">Saved checkout values from the customer flow.</p>
                        </div>
                        <Badge tone={pricingDetails.couponCode ? "emerald" : "slate"}>{pricingDetails.couponCode ? `Coupon ${pricingDetails.couponCode}` : "No coupon"}</Badge>
                      </div>
                      <div className="mt-4 space-y-2 text-xs">
                        <OrderDetailRow label="Tailor quote" value={formatCurrency(pricingDetails.tailorQuote)} />
                        <OrderDetailRow label="Delivery charges" value={formatCurrency(pricingDetails.deliveryFee)} />
                        <OrderDetailRow label="Distance" value={pricingDetails.distanceLabel} />
                        <OrderDetailRow label="Delivery mode" value={pricingDetails.deliveryMode} />
                        <OrderDetailRow label="Tailor measurement visit" value={pricingDetails.homeMeasurementLabel} />
                        <OrderDetailRow label="Platform fee" value={formatCurrency(pricingDetails.platformFee)} />
                        {pricingDetails.smallOrderFee > 0 ? <OrderDetailRow label="Small order fee" value={formatCurrency(pricingDetails.smallOrderFee)} /> : null}
                        <OrderDetailRow label="Coupon applied" value={pricingDetails.couponLabel} />
                      </div>
                      <div className="mt-4 space-y-2 border-t border-[#efe3d0] pt-3 text-xs">
                        <div className="flex justify-between text-[var(--muted)]"><span>Subtotal before discount</span><span>{formatCurrency(pricingDetails.subtotalBeforeDiscount)}</span></div>
                        <div className="flex justify-between text-[var(--muted)]"><span>Discount</span><span>-{formatCurrency(pricingDetails.discount)}</span></div>
                        <div className="flex justify-between border-t border-[#efe3d0] pt-2 font-bold text-[var(--deep)]"><span>Customer total</span><span>{formatCurrency(pricingDetails.totalAmount)}</span></div>
                      </div>
                    </Panel>
                  ) : null}

                <Panel className="rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-[var(--deep)]">Order Items</h4>
                  <div className="mt-4 space-y-3">
                    {(order.items ?? []).map((item, index) => (
                      <div key={`${item.serviceId}-${index}`} className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff]">
                        <button className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-orange-50/60" onClick={() => setExpandedItem(expandedItem === index ? null : index)} type="button">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-orange-500">Item {index + 1}</p>
                            <p className="mt-1 font-medium">{item.service?.name ?? item.workType ?? "Service item"}</p>
                            <p className="mt-1 text-sm text-[var(--muted)]">{item.gender ? `${formatStatus(item.gender)} / ` : ""}{item.clothType ?? item.service?.category?.name ?? "General"} / Qty {item.quantity}</p>
                          </div>
                          <span className="flex items-center gap-3"><span className="text-sm font-medium">{formatCurrency(item.price ?? item.service?.price ?? 0)}</span>{expandedItem === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                        </button>
                        {expandedItem === index ? <OrderItemDetail item={item} index={index} /> : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-[#efe3d0] pt-3 text-xs"><div className="flex justify-between text-[var(--muted)]"><span>Subtotal</span><span>{formatCurrency(order.subtotal ?? order.totalAmount)}</span></div><div className="flex justify-between text-[var(--muted)]"><span>Discount</span><span>-{formatCurrency(order.discount ?? 0)}</span></div><div className="flex justify-between border-t border-[#efe3d0] pt-2 font-bold text-[var(--deep)]"><span>Order Total</span><span>{formatCurrency(order.totalAmount)}</span></div></div>
                </Panel>
                </div>

                {order.instructions ? (
                  <Panel ref={instructionsRef}>
                    <h4 className="text-lg font-semibold">Instructions</h4>
                    <p className="mt-3 text-sm text-[var(--muted)]">{order.instructions}</p>
                  </Panel>
                ) : null}

                <Panel className="rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3"><div><h4 className="text-lg font-semibold">Tailor quotes</h4><p className="mt-1 text-sm text-[var(--muted)]">Every quote received for this request, linked to the tailor profile.</p></div><Badge tone="slate">{quotesQuery.data?.length ?? 0} quotes</Badge></div>
                  {quotesQuery.isLoading ? <div className="mt-4"><LoadingState label="Loading quotes..." /></div> : null}
                  {quotesQuery.isError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{extractError(quotesQuery.error)}</p> : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(quotesQuery.data ?? []).map((quote) => <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-4" key={quote.id}>{editingQuoteId === quote.id ? <div className="space-y-3"><div className="flex items-center justify-between gap-3"><p className="font-bold">Edit {quote.tailor ? getTailorDisplayName(quote.tailor) : "tailor quote"}</p><StatusBadge value={quote.status} /></div><div className="grid gap-3 sm:grid-cols-3"><Field label="Quote amount"><input className="h-11 w-full rounded-xl border border-[var(--panel-border)] px-3" min="0" type="number" value={quoteDraft.price} onChange={(event) => setQuoteDraft((current) => ({ ...current, price: event.target.value }))} /></Field><Field label="Estimated days"><input className="h-11 w-full rounded-xl border border-[var(--panel-border)] px-3" min="0" type="number" value={quoteDraft.estimatedDays} onChange={(event) => setQuoteDraft((current) => ({ ...current, estimatedDays: event.target.value }))} /></Field><Field label="Estimated hours"><input className="h-11 w-full rounded-xl border border-[var(--panel-border)] px-3" min="0" type="number" value={quoteDraft.estimatedHours} onChange={(event) => setQuoteDraft((current) => ({ ...current, estimatedHours: event.target.value }))} /></Field></div><Field label="Tailor message"><textarea className="min-h-20 w-full rounded-xl border border-[var(--panel-border)] px-3 py-2" value={quoteDraft.message} onChange={(event) => setQuoteDraft((current) => ({ ...current, message: event.target.value }))} /></Field><div className="flex justify-end gap-2"><ActionButton variant="secondary" onClick={() => setEditingQuoteId(null)}>Cancel</ActionButton><ActionButton disabled={quoteUpdateMutation.isPending || !quoteDraft.price} onClick={() => quoteUpdateMutation.mutate({ orderId: order.id, quoteId: quote.id, price: Number(quoteDraft.price), estimatedDays: Number(quoteDraft.estimatedDays || 0), estimatedHours: quoteDraft.estimatedHours ? Number(quoteDraft.estimatedHours) : null, message: quoteDraft.message })}>{quoteUpdateMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={15} />}Save quote</ActionButton></div></div> : <><button className="w-full text-left transition hover:text-orange-700" onClick={() => quote.tailor && onOpenQuoteTailor(quote.tailor)} type="button"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[var(--deep)]">{quote.tailor ? getTailorDisplayName(quote.tailor) : quote.tailorId}</p><p className="mt-1 text-xs text-[var(--muted)]">{quote.darjiId ?? quote.id} · {formatDate(quote.createdAt, true)}</p></div><StatusBadge value={quote.status} /></div><div className="mt-4 flex items-end justify-between gap-3"><div className="text-xs text-[var(--muted)]"><p>{quote.estimatedHours ? `${quote.estimatedHours} hours` : `${quote.estimatedDays} days`} estimated</p><p className="mt-1">{quote.message || "No tailor message"}</p></div><p className="text-lg font-bold text-orange-600">{formatCurrency(quote.price)}</p></div></button><div className="mt-3 flex justify-end border-t border-[#efe3d0] pt-3"><ActionButton className="px-3 py-2 text-xs" variant="secondary" onClick={() => { setEditingQuoteId(quote.id); setQuoteDraft({ price: String(quote.price), estimatedDays: String(quote.estimatedDays), estimatedHours: quote.estimatedHours ? String(quote.estimatedHours) : "", message: quote.message ?? "" }); }}><PencilLine size={14} />Edit quote</ActionButton></div></>}</div>)}
                    {!quotesQuery.isLoading && !quotesQuery.data?.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-[var(--muted)]">No quotes are linked to this order.</p> : null}
                  </div>
                </Panel>

                <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
                <Panel className="rounded-2xl p-4" ref={invoiceRef}>
                  <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
                    <div>
                      <h4 className="text-lg font-semibold">Admin priority</h4>
                      <p className="mt-1 text-sm text-[var(--muted)]">Shared operations priority for triage and follow-up.</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <select
                          className="h-12 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none"
                          value={priority}
                          onChange={(event) => onPriorityChange(event.target.value as AdminOrderPriority)}
                        >
                          {(["Normal", "High", "Urgent", "VIP"] as AdminOrderPriority[]).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <PriorityBadge value={priority} />
                      </div>
                    </div>
                    <div ref={notesRef}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold">Admin notes</h4>
                          <p className="mt-1 text-sm text-[var(--muted)]">Notes are securely shared with other administrators.</p>
                        </div>
                        <Badge tone="slate">{notes.length} notes</Badge>
                      </div>
                      <div className="mt-4 flex flex-col gap-3">
                        <textarea
                          className="min-h-24 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 text-sm outline-none"
                          placeholder={`Add note as ${me.name ?? me.phone ?? "Admin"}`}
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                        />
                        <div className="flex justify-end">
                          <ActionButton
                            disabled={!noteDraft.trim()}
                            onClick={() => {
                              const note = noteDraft.trim();
                              if (!note) return;
                              onAddNote(note);
                              setNoteDraft("");
                            }}
                          >
                            Add note
                          </ActionButton>
                        </div>
                        <div className="max-h-48 space-y-2 overflow-y-auto">
                          {notes.map((item, index) => (
                            <div key={`${item.createdAt}-${index}`} className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-[var(--deep)]">{item.admin}</span>
                                <span className="text-xs text-[var(--muted)]">{formatDate(item.createdAt, true)}</span>
                              </div>
                              <p className="mt-2 text-[var(--muted)]">{item.note}</p>
                            </div>
                          ))}
                          {!notes.length ? <p className="text-sm text-[var(--muted)]">No admin notes yet.</p> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-strong)]/95 p-4 backdrop-blur">
                  <div className="flex h-full flex-col gap-4">
                    <div>
                      <h4 className="text-lg font-semibold">Admin actions</h4>
                      <p className="mt-1 text-sm text-[var(--muted)]">Use current backend endpoints for reassignment or status change.</p>
                    </div>
                    <div className="mt-auto grid gap-2">
                      <ActionButton className="justify-start" variant="secondary" onClick={onAssign}><UserRoundPlus size={15} />Manage assignments</ActionButton>
                      <select className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 text-sm outline-none" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                        {[order.status, ...allowedOrderStatusTransitions(order.status)].map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                      <ActionButton disabled={nextStatus === order.status} className="w-full justify-center bg-gradient-to-r from-[#ffad16] to-[#ff8500] text-white" onClick={() => onStatusChange(nextStatus)}>Update status</ActionButton>
                      <ActionButton className="w-full justify-center" variant="danger" onClick={onDeleteOrder}><Trash2 size={15} />Permanently delete</ActionButton>
                    </div>
                  </div>
                </Panel>
                </div>

                <OrderTrackingPanel events={trackingEvents} order={order} ref={timelineRef} />

                {/* Categorized Order Photo Proofs */}
                <Panel ref={mediaRef} className="space-y-4">
                  <h4 className="text-lg font-semibold text-[var(--deep)]">Order Photo Proofs</h4>
                  <p className="text-sm text-[var(--muted)] -mt-2">Categorized proof images from customer, tailor, and delivery partner.</p>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Category 1: Customer Uploads */}
                    {(() => {
                      const customerMedia = order?.request?.media ?? [];
                      const customerSampleMedia = order?.request?.sampleMedia ?? [];
                      const allCustomerMedia = [...customerMedia, ...customerSampleMedia];
                      return allCustomerMedia.length > 0 ? (
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-slate-50/50 p-4">
                          <h5 className="font-bold text-sm text-[var(--deep)]">1. Customer References</h5>
                          <p className="text-xs text-[var(--muted)] mb-3">Images uploaded during request</p>
                          <div className="grid grid-cols-2 gap-2">
                            {allCustomerMedia.map((item: any, idx: number) => (
                              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-video overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white transition hover:opacity-90">
                                {item.resourceType === "video" ? (
                                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-white">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    <span className="mt-1 text-[9px] uppercase font-bold tracking-wider">Video</span>
                                  </div>
                                ) : (
                                  <img alt="Customer reference" src={item.url} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Category 2: Delivery Partner Pickup Proof */}
                    {(() => {
                      const linkedDeliveries = (deliveryRequests ?? []).filter((dr) => dr.orderId === order?.id);
                      const pickupMedia = [
                        ...(order?.pickupImageUrl ? [{ url: order.pickupImageUrl, resourceType: "image" }] : []),
                        ...linkedDeliveries
                          .filter((dr) => dr.type === "customer_to_tailor")
                          .flatMap((dr) => [
                            ...(dr.clothPhotos ?? []),
                            ...(dr.samplePhotos ?? [])
                          ])
                      ];
                      return pickupMedia.length > 0 ? (
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-slate-50/50 p-4">
                          <h5 className="font-bold text-sm text-[var(--deep)]">2. Delivery Partner Pickup</h5>
                          <p className="text-xs text-[var(--muted)] mb-3">Proof clothes picked up from customer</p>
                          <div className="grid grid-cols-2 gap-2">
                            {pickupMedia.map((item: any, idx: number) => (
                              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-video overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white transition hover:opacity-90">
                                {item.resourceType === "video" ? (
                                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-white">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    <span className="mt-1 text-[9px] uppercase font-bold tracking-wider">Video</span>
                                  </div>
                                ) : (
                                  <img alt="Delivery pickup proof" src={item.url} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Category 3: Tailor Received Clothes Proof */}
                    {(() => {
                      const tailorReceived = order?.request?.receivedMedia ?? [];
                      return tailorReceived.length > 0 ? (
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-slate-50/50 p-4">
                          <h5 className="font-bold text-sm text-[var(--deep)]">3. Tailor Received</h5>
                          <p className="text-xs text-[var(--muted)] mb-3">Proof package received by tailor</p>
                          <div className="grid grid-cols-2 gap-2">
                            {tailorReceived.map((item: any, idx: number) => (
                              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-video overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white transition hover:opacity-90">
                                {item.resourceType === "video" ? (
                                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-white">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    <span className="mt-1 text-[9px] uppercase font-bold tracking-wider">Video</span>
                                  </div>
                                ) : (
                                  <img alt="Tailor received proof" src={item.url} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Category 4: Tailor Stitched Clothes Proof */}
                    {(() => {
                      const tailorStitched = [
                        ...(order?.finalImageUrl ? [{ url: order.finalImageUrl, resourceType: "image" }] : []),
                        ...(order?.request?.stitchedMedia ?? [])
                      ];
                      return tailorStitched.length > 0 ? (
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-slate-50/50 p-4">
                          <h5 className="font-bold text-sm text-[var(--deep)]">4. Tailor Stitched</h5>
                          <p className="text-xs text-[var(--muted)] mb-3">Proof uploaded after stitching garment</p>
                          <div className="grid grid-cols-2 gap-2">
                            {tailorStitched.map((item: any, idx: number) => (
                              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-video overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white transition hover:opacity-90">
                                {item.resourceType === "video" ? (
                                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-white">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    <span className="mt-1 text-[9px] uppercase font-bold tracking-wider">Video</span>
                                  </div>
                                ) : (
                                  <img alt="Tailor stitched proof" src={item.url} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Category 5: Delivery Partner Delivery Proof */}
                    {(() => {
                      const linkedDeliveries = (deliveryRequests ?? []).filter((dr) => dr.orderId === order?.id);
                      const deliveryHandover = [
                        ...(order?.deliveryProofUrl ? [{ url: order.deliveryProofUrl, resourceType: "image" }] : []),
                        ...linkedDeliveries
                          .filter((dr) => dr.type === "tailor_to_customer" || dr.type === "darji_to_customer")
                          .flatMap((dr) => dr.deliveryPhotos ?? [])
                      ];
                      return deliveryHandover.length > 0 ? (
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-slate-50/50 p-4">
                          <h5 className="font-bold text-sm text-[var(--deep)]">5. Delivery Handover</h5>
                          <p className="text-xs text-[var(--muted)] mb-3">Proof package delivered to customer</p>
                          <div className="grid grid-cols-2 gap-2">
                            {deliveryHandover.map((item: any, idx: number) => (
                              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group relative aspect-video overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white transition hover:opacity-90">
                                {item.resourceType === "video" ? (
                                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-white">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    <span className="mt-1 text-[9px] uppercase font-bold tracking-wider">Video</span>
                                  </div>
                                ) : (
                                  <img alt="Delivery handover proof" src={item.url} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </Panel>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OrderItemDetail({ item, index }: { item: OrderItem; index: number }) {
  const customerMedia = [
    ...(item.media ?? []).map((media) => ({ ...media, label: "Customer garment photo" })),
    ...(item.sampleMedia ?? []).map((media) => ({ ...media, label: "Sample garment photo" })),
    ...(item.designMedia ?? []).map((media) => ({ ...media, label: "Design / reference photo" })),
    ...(item.referenceImageUrl ? [{ url: item.referenceImageUrl, resourceType: "image", label: "Reference image" }] : [])
  ];
  const measurementType = item.homeMeasurementBooked
    ? "Tailor home measurement"
    : item.sampleProvided
      ? "Sample garment"
      : item.measurement?.label || (Object.keys(item.measurement?.fields ?? {}).length || item.measurementNotes ? "Customer measurements" : "Not specified");
  return <div className="border-t border-[#efe3d0] bg-white px-4 py-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><DetailBox label="Gender / fit" value={formatStatus(item.gender ?? "Not specified")} /><DetailBox label="Garment type" value={item.clothType ?? item.service?.category?.name ?? "Not specified"} /><DetailBox label="Service type" value={item.workType ?? item.serviceCategory ?? item.service?.name ?? "Not specified"} /><DetailBox label="Selected work" value={item.selectedWorkItems?.length ? item.selectedWorkItems.join(", ") : item.otherWorkDescription ?? "Not specified"} /><DetailBox label="Measurement type" value={measurementType} note={item.preferredMeasurementSlot ? `Visit slot: ${item.preferredMeasurementSlot}` : undefined} /><DetailBox label="Quantity" value={String(item.quantity ?? 1)} /></div><div className="mt-4 rounded-xl bg-[#fff8ed] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Customer description</p><p className="mt-2 whitespace-pre-wrap text-sm text-[var(--deep)]">{item.description ?? item.instructions ?? "No description provided for this item."}</p>{item.measurementNotes ? <p className="mt-3 border-t border-orange-100 pt-3 text-sm text-[var(--muted)]"><strong className="text-[var(--deep)]">Measurement notes:</strong> {item.measurementNotes}</p> : null}</div>{Object.keys(item.measurement?.fields ?? {}).length ? <div className="mt-4"><p className="text-xs font-bold text-[var(--deep)]">Recorded measurements</p><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(item.measurement?.fields ?? {}).map(([label, value]) => <div className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2" key={label}><p className="text-[10px] uppercase text-[var(--muted)]">{formatStatus(label)}</p><p className="mt-1 text-sm font-bold">{String(value)}</p></div>)}</div></div> : null}{item.voiceNotes?.length ? <div className="mt-4"><p className="text-xs font-bold text-[var(--deep)]">Customer voice recordings</p><div className="mt-2 space-y-2">{item.voiceNotes.map((voice, voiceIndex) => <div className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] p-3" key={`${voice.url}-${voiceIndex}`}><p className="mb-2 text-[11px] font-semibold text-[var(--muted)]">{voice.originalName || `Item ${index + 1} voice note ${voiceIndex + 1}`}</p><audio className="h-10 w-full" controls preload="none" src={voice.url} /></div>)}</div></div> : null}{customerMedia.length ? <div className="mt-4"><p className="text-xs font-bold text-[var(--deep)]">Item photos and references</p><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{customerMedia.map((media, mediaIndex) => <a className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[#fbfdff]" href={media.url} key={`${media.url}-${mediaIndex}`} rel="noopener noreferrer" target="_blank"><img alt={media.label} className="aspect-video w-full object-cover" src={media.url} /><div className="px-3 py-2"><p className="text-xs font-bold">{media.label}</p><p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{media.originalName || `Item ${index + 1}`}</p></div></a>)}</div></div> : null}</div>;
}

function OrderDrawerSummary({ detail, icon: Icon, label, onClick, value }: { detail: string; icon: ComponentType<{ size?: number }>; label: string; onClick?: () => void; value: string }) {
  const content = <><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-500"><Icon size={16} /></span><div className="min-w-0"><p className="text-[10px] font-semibold text-[var(--muted)]">{label}</p><p className="mt-0.5 truncate text-sm font-bold text-[var(--deep)]">{value}</p><p className="truncate text-[11px] text-[var(--muted)]">{detail}</p></div></>;
  return onClick
    ? <button className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#f3e8d7] bg-white px-3 py-3 text-left transition hover:border-orange-300 hover:bg-orange-50" onClick={onClick} type="button">{content}</button>
    : <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#f3e8d7] bg-white px-3 py-3">{content}</div>;
}

function buildOrderPricingDetails(order: Order) {
  const request = (order.request ?? {}) as Partial<TailoringRequest>;
  const tailorQuote = Number(
    request.quoteAmount
    ?? request.selectedQuote?.price
    ?? request.ownQuote?.price
    ?? order.subtotal
    ?? order.items?.reduce((sum, item) => sum + Number(item.price ?? item.service?.price ?? 0) * Math.max(1, item.quantity ?? 1), 0)
    ?? 0
  );
  const deliveryFee = Number(order.deliveryFee ?? request.deliveryFee ?? 0);
  const platformFee = Number(order.platformFee ?? request.platformFee ?? 0);
  const smallOrderFee = Number(order.smallOrderFee ?? request.smallOrderFee ?? 0);
  const homeMeasurementFee = Number(order.homeMeasurementFee ?? request.homeMeasurementFee ?? 0);
  const discount = Number(order.discount ?? request.discountAmount ?? 0);
  const totalAmount = Number(order.totalAmount ?? request.totalAmount ?? 0);
  const oneWayMeters = Number(order.customerToTailorDistanceMeters ?? request.customerToTailorDistanceMeters ?? 0);
  const chargeableMeters = Number(order.totalChargeableDistanceMeters ?? request.totalChargeableDistanceMeters ?? 0);
  const couponCode = order.couponCode ?? request.couponCode;
  const homeMeasurementBooked = Boolean(request.homeMeasurementBooked || homeMeasurementFee > 0);

  return {
    tailorQuote,
    deliveryFee,
    platformFee,
    smallOrderFee,
    homeMeasurementFee,
    discount,
    totalAmount,
    couponCode,
    subtotalBeforeDiscount: tailorQuote + deliveryFee + platformFee + smallOrderFee + homeMeasurementFee,
    distanceLabel: formatOrderDistance(oneWayMeters, chargeableMeters),
    deliveryMode: formatStatus(String(order.deliveryMode ?? request.deliveryMode ?? "Not locked")),
    homeMeasurementLabel: homeMeasurementBooked ? `Yes, ${formatCurrency(homeMeasurementFee)}` : "No",
    couponLabel: couponCode ? `${couponCode} saved ${formatCurrency(discount)}` : "No coupon applied"
  };
}

function formatOrderDistance(oneWayMeters?: number, chargeableMeters?: number) {
  const oneWay = Number(oneWayMeters ?? 0);
  const chargeable = Number(chargeableMeters ?? 0);
  if (oneWay > 0) {
    const roundTrip = chargeable > 0 ? chargeable : oneWay * 2;
    return `${(oneWay / 1000).toFixed(1)} km tailor to customer, ${(roundTrip / 1000).toFixed(1)} km two-way`;
  }
  if (chargeable > 0) return `${(chargeable / 1000).toFixed(1)} km two-way`;
  return "Not captured";
}

function OrderDetailRow({ label, onClick, value }: { label: string; onClick?: () => void; value: string }) {
  return <div className="grid grid-cols-[120px_1fr] items-start gap-3"><span className="text-[var(--muted)]">{label}</span>{onClick ? <button className="inline-flex items-center gap-1.5 justify-self-start font-semibold text-[var(--deep)] underline decoration-orange-300 underline-offset-4 transition hover:text-orange-600" onClick={onClick} type="button">{value}<ChevronRight size={13} /></button> : <span className="font-semibold text-[var(--deep)]">{value}</span>}</div>;
}

function formatAdminValue(value: unknown): string {
  if (value == null || value === "") return "Not provided";
  if (Array.isArray(value)) return value.length ? value.map((item) => formatAdminValue(item)).join(", ") : "Not provided";
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item != null && item !== "");
    if (!entries.length) return "Not provided";
    return entries.map(([key, item]) => `${formatStatus(key)}: ${formatAdminValue(item)}`).join(" · ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function flattenAdminRecord(value: unknown, prefix = ""): Array<{ label: string; value: string }> {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
    const label = prefix ? `${prefix} / ${formatStatus(key)}` : formatStatus(key);
    if (item && typeof item === "object" && !Array.isArray(item)) return flattenAdminRecord(item, label);
    if (Array.isArray(item)) return item.length ? item.flatMap((entry, index) => entry && typeof entry === "object" ? flattenAdminRecord({ [`Item ${index + 1}`]: entry }, label) : [{ label: `${label} / Item ${index + 1}`, value: formatAdminValue(entry) }]) : [{ label, value: "Not provided" }];
    return [{ label, value: formatAdminValue(item) }];
  });
}

type EditableVerificationField = { path: string[]; label: string; value: string | number | boolean | null };

const protectedVerificationFieldKeys = new Set(["status", "verificationstatus", "ocrstatus", "facedetectionstatus", "reviewstatus", "approvalstatus", "submittedat", "reviewedat", "approvedat", "rejectedat", "savedat", "createdat", "updatedat", "reviewedby", "approvedby", "rejectedby", "lat", "lng", "latitude", "longitude", "coordinates"]);

function isProtectedVerificationField(path: string[]) {
  return path.some((part) => protectedVerificationFieldKeys.has(part.replace(/[^a-z0-9]/gi, "").toLowerCase()))
    || /(url|photo|image|media|resourcetype|originalname)$/i.test(path[path.length - 1]?.replace(/[^a-z0-9]/gi, "") ?? "");
}

function isDocumentRegistrationField(path: string[]) {
  const value = path.join(" ").toLowerCase();
  return /(aadhaar|aadhar|pan|identity|id number|idnumber|licen[cs]e|driving|rc number|rcnumber|registration number|registrationnumber|vehicle.*number|document)/.test(value);
}

function flattenEditableVerification(value: unknown, path: string[] = [], filter?: (path: string[]) => boolean): EditableVerificationField[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
    const nextPath = [...path, key];
    if (item && typeof item === "object" && !Array.isArray(item)) return flattenEditableVerification(item, nextPath, filter);
    if (Array.isArray(item) || isProtectedVerificationField(nextPath) || (filter && !filter(nextPath))) return [];
    return [{ path: nextPath, label: nextPath.map(humanizeFieldLabel).join(" / "), value: item as string | number | boolean | null }];
  });
}

function updateVerificationField(json: string, field: EditableVerificationField, nextValue: string | boolean) {
  const record = JSON.parse(json) as Record<string, any>;
  const next = structuredClone(record);
  let cursor: Record<string, any> = next;
  field.path.slice(0, -1).forEach((key) => { cursor = cursor[key] as Record<string, any>; });
  const key = field.path[field.path.length - 1];
  cursor[key] = typeof field.value === "boolean" ? Boolean(nextValue) : typeof field.value === "number" && nextValue !== "" ? Number(nextValue) : nextValue;
  return JSON.stringify(next, null, 2);
}

function VerificationRecordEditor({ json, onChange, documentsOnly = false }: { json: string; onChange: (json: string) => void; documentsOnly?: boolean }) {
  let record: Record<string, unknown> = {};
  let parseError = "";
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Registration record must be a JSON object");
    record = parsed as Record<string, unknown>;
  } catch (error) {
    parseError = error instanceof Error ? error.message : "Invalid registration record";
  }
  const fields = flattenEditableVerification(record, [], documentsOnly ? isDocumentRegistrationField : undefined);
  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <Field key={field.path.join(".")} label={field.label}>{typeof field.value === "boolean" ? <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3" value={field.value ? "true" : "false"} onChange={(event) => onChange(updateVerificationField(json, field, event.target.value === "true"))}><option value="true">Yes</option><option value="false">No</option></select> : <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3" type={typeof field.value === "number" ? "number" : "text"} value={field.value == null ? "" : String(field.value)} onChange={(event) => onChange(updateVerificationField(json, field, event.target.value))} />}</Field>)}</div>{!fields.length && !parseError ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No editable document or identity numbers were submitted.</p> : null}{parseError ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{parseError}</p> : null}</div>;
}

function PaymentDetailDialog({ open, onOpenCustomer, onOpenOrder, payment, setOpen }: { open: boolean; onOpenCustomer: () => void; onOpenOrder: () => void; payment: Payment | null; setOpen: (open: boolean) => void }) {
  return <Dialog.Root onOpenChange={setOpen} open={open}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" /><Dialog.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[88vh] w-[min(94vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[#fffdfa] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">{payment ? <><div className="flex items-start justify-between gap-4 pr-10"><div><Dialog.Title className="text-xl font-bold text-[var(--deep)]">Payment details</Dialog.Title><Dialog.Description className="mt-1 text-sm text-[var(--muted)]">{payment.darjiId ?? payment.id}</Dialog.Description></div><StatusBadge value={payment.status} /></div><Dialog.Close asChild><button aria-label="Close payment details" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[var(--panel-border)] bg-white" type="button"><X size={18} /></button></Dialog.Close><div className="mt-6 grid gap-3 sm:grid-cols-2"><OrderDrawerSummary icon={ReceiptIndianRupee} label="Collected" value={formatCurrency(payment.recognizedAmount ?? payment.amount)} detail={formatStatus(payment.method)} /><OrderDrawerSummary icon={CalendarDays} label="Created" value={formatDate(payment.createdAt)} detail={payment.paidAt ? `Paid ${formatDate(payment.paidAt, true)}` : "Not marked paid"} /><OrderDrawerSummary icon={Package} label="Linked order" value={payment.order?.orderNumber ?? payment.orderId} detail={formatStatus(payment.order?.status ?? "Unknown")} onClick={onOpenOrder} /><OrderDrawerSummary icon={UserCircle2} label="Customer" value={cleanText(payment.order?.customerName) ?? "Customer"} detail={payment.order?.customerPhone ?? payment.order?.customerId ?? "No customer reference"} onClick={payment.order?.customerId ? onOpenCustomer : undefined} /></div><Panel className="mt-5 rounded-2xl p-4"><h4 className="text-sm font-bold text-[var(--deep)]">Audit references</h4><div className="mt-4 grid gap-3 text-xs"><OrderDetailRow label="Payment ID" value={payment.id} /><OrderDetailRow label="Provider ref" value={payment.providerRef ?? "Not available"} /><OrderDetailRow label="Order ID" value={payment.orderId} /><OrderDetailRow label="Updated" value={formatDate(payment.updatedAt, true)} /></div></Panel></> : null}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}

type OrderTrackingEvent = { id: string; label: string; detail: string; timestamp?: string; tone: "done" | "issue" | "active" };

function buildOrderTrackingEvents(order: Order, deliveryRequests: any[]): OrderTrackingEvent[] {
  const events: OrderTrackingEvent[] = [];
  if (order.createdAt) events.push({ id: "order-created", label: "Order created", detail: "Customer order entered the Darji workflow.", timestamp: order.createdAt, tone: "done" });
  (order.timelineEvents ?? []).forEach((event, index) => events.push({ id: `timeline-${index}-${event.timestamp}`, label: formatStatus(event.status), detail: event.description ?? "Order status updated.", timestamp: event.timestamp, tone: ["CANCELLED", "FAILED"].includes(String(event.status).toUpperCase()) ? "issue" : "done" }));
  deliveryRequests.forEach((request, requestIndex) => {
    const prefix = request.type === "customer_to_tailor" ? "Pickup" : "Delivery";
    if (request.createdAt) events.push({ id: `task-${requestIndex}-created`, label: `${prefix} task created`, detail: request.taskId ?? "Delivery task scheduled.", timestamp: request.createdAt, tone: "done" });
    if (request.acceptedAt) events.push({ id: `task-${requestIndex}-accepted`, label: `${prefix} accepted`, detail: "Delivery partner accepted the task.", timestamp: request.acceptedAt, tone: "done" });
    if (request.pickedUpAt) events.push({ id: `task-${requestIndex}-picked`, label: prefix === "Pickup" ? "Collected from customer" : "Collected from tailor", detail: `Tracking status: ${formatStatus(request.taskStatus)}`, timestamp: request.pickedUpAt, tone: "done" });
    if (request.lastFailureAt) events.push({ id: `task-${requestIndex}-failure`, label: `${prefix} exception`, detail: request.lastFailureReason ?? "Delivery attempt requires attention.", timestamp: request.lastFailureAt, tone: "issue" });
    if (request.deliveredAt) events.push({ id: `task-${requestIndex}-delivered`, label: prefix === "Pickup" ? "Received by tailor" : "Delivered to customer", detail: `${request.taskId ?? "Task"} completed successfully.`, timestamp: request.deliveredAt, tone: "done" });
  });
  return events.sort((left, right) => new Date(left.timestamp ?? 0).getTime() - new Date(right.timestamp ?? 0).getTime());
}

const OrderTrackingPanel = forwardRef<HTMLDivElement, { events: OrderTrackingEvent[]; order: Order }>(({ events, order }, ref) => {
  const stages = ["Order Placed", "Pickup", "At Tailor", "Ready", "Out for Delivery", "Delivered"];
  const status = String(order.status).toUpperCase();
  const stageIndex = status === "DELIVERED" || status === "COMPLETED" ? 5 : status.includes("OUT_FOR_DELIVERY") ? 4 : status === "READY" ? 3 : ["AT_TAILOR", "STITCHING_STARTED", "WORKING"].includes(status) ? 2 : status.includes("PICKUP") || status === "CLOTH_PICKED" ? 1 : 0;
  const cancelled = ["CANCELLED", "FAILED"].includes(status);
  return <Panel className="rounded-2xl p-4" ref={ref}><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-[var(--deep)]">Order Tracking</h4><p className="mt-1 text-xs text-[var(--muted)]">Live workflow milestones and delivery-task activity.</p></div><StatusBadge value={order.status} /></div><div className="mt-5 overflow-x-auto pb-2"><div className="flex min-w-[680px] items-start">{stages.map((stage, index) => { const reached = !cancelled && index <= stageIndex; return <div className="relative flex flex-1 flex-col items-center text-center" key={stage}>{index > 0 ? <span className={cn("absolute right-1/2 top-3 h-0.5 w-full", reached ? "bg-orange-400" : "bg-slate-200")} /> : null}<span className={cn("relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-[10px] font-bold", reached ? "border-orange-400 bg-orange-500 text-white" : "border-slate-200 bg-white text-amber-900")}>{reached ? <CheckCircle2 size={14} /> : index + 1}</span><span className={cn("mt-2 text-[11px] font-semibold", reached ? "text-[var(--deep)]" : "text-[var(--muted)]")}>{stage}</span></div>; })}</div></div><div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-[#efe3d0] bg-white px-4">{events.length ? events.map((event, index) => <div className="flex gap-3 border-b border-[#f2e8d9] py-3 last:border-b-0" key={event.id}><span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", event.tone === "issue" ? "bg-rose-500" : index === events.length - 1 ? "bg-orange-500" : "bg-emerald-500")} /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-bold text-[var(--deep)]">{event.label}</p><p className="text-[10px] text-[var(--muted)]">{formatDate(event.timestamp, true)}</p></div><p className="mt-1 text-[11px] text-[var(--muted)]">{event.detail}</p></div></div>) : <p className="py-8 text-center text-xs text-[var(--muted)]">Tracking events will appear as the order moves through the workflow.</p>}</div></Panel>;
});
OrderTrackingPanel.displayName = "OrderTrackingPanel";

function TailoringRequestDialog({
  deliveryRequests,
  measurementVisits,
  notes,
  onMetadata,
  onOpenCustomer,
  onOpenDelivery,
  onOpenTailor,
  onUpdated,
  open,
  priority,
  request,
  setOpen
}: {
  deliveryRequests: DeliveryRequest[];
  measurementVisits: MeasurementVisit[];
  notes: AdminOrderNote[];
  onMetadata: (payload: { priority?: AdminOrderPriority; note?: string }) => void;
  onOpenCustomer: (request: TailoringRequest) => void;
  onOpenDelivery: (request: DeliveryRequest) => void;
  onOpenTailor: (tailor: TailorProfile) => void;
  onUpdated: (request: TailoringRequest) => void;
  open: boolean;
  priority: AdminOrderPriority;
  request: TailoringRequest | null;
  setOpen: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<"overview" | "quotes" | "measurement" | "logistics" | "progress" | "finance" | "timeline">("overview");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ["admin", "tailoring-request", request?.id],
    queryFn: () => getTailoringRequestById(request!.id),
    enabled: open && Boolean(request?.id)
  });
  const quotesQuery = useQuery({
    queryKey: ["admin", "tailoring-quotes", request?.id],
    queryFn: () => getAdminTailorQuotes(request!.id),
    enabled: open && Boolean(request?.id)
  });
  const activeRequest = detailQuery.data ?? request;
  const requestDeliveries = deliveryRequests.filter((task) => task.orderId === activeRequest?.id);
  const requestVisits = measurementVisits.filter((visit) => visit.requestId === activeRequest?.id);
  const quotes = quotesQuery.data ?? [];
  const selectedQuote = quotes.find((quote) => quote.id === activeRequest?.selectedQuoteId || quote.status === "ACCEPTED") ?? activeRequest?.selectedQuote;
  const requiresMeasurementVisit = Boolean(activeRequest?.homeMeasurementBooked || activeRequest?.items?.some((item) => item.homeMeasurementBooked));
  const measurementVisitSubmitted = requestVisits.some((visit) => visit.status === "SUBMITTED");
  const refreshRequest = async (updated?: TailoringRequest) => {
    if (updated) onUpdated(updated);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "tailoring-request", request?.id] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "tailoring-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "delivery-requests"] })
    ]);
  };
  const workMutation = useMutation({
    mutationFn: ({ action }: { action: "WORKING" | "READY" | "CANCEL" }) => action === "CANCEL" ? cancelTailoringRequest(activeRequest!.id) : updateTailoringWorkStatus(activeRequest!.id, action),
    onSuccess: async (updated) => { toast.success("Tailoring request updated"); await refreshRequest(updated); },
    onError: (error) => toast.error(extractError(error))
  });
  const measurementBypassMutation = useMutation({
    mutationFn: (allowed: boolean) => updateTailoringMeasurementBypass(activeRequest!.id, allowed, allowed ? "Allowed from admin tailoring request details" : undefined),
    onSuccess: async (updated) => {
      toast.success(updated.allowTailoringWithoutMeasurementVisit ? "Tailoring bypass enabled" : "Measurement requirement restored");
      await refreshRequest(updated);
    },
    onError: (error) => toast.error(extractError(error))
  });
  const noQuoteMutation = useMutation({
    mutationFn: () => alertAdminNoQuote(activeRequest!.id),
    onSuccess: (result) => toast.success(result.alerted ? "No-quote escalation created" : "The request already has an active quote"),
    onError: (error) => toast.error(extractError(error))
  });
  const mediaMutation = useMutation({
    mutationFn: ({ files, stage }: { files: File[]; stage: "RECEIVED" | "STITCHED" }) => uploadAdminTailoringAuditMedia(activeRequest!.id, stage, files),
    onSuccess: async (updated) => { toast.success("Proof photos uploaded"); await refreshRequest(updated); },
    onError: (error) => toast.error(extractError(error))
  });
  const mediaDeleteMutation = useMutation({
    mutationFn: ({ stage, url }: { stage: "RECEIVED" | "STITCHED"; url: string }) => deleteAdminTailoringAuditMedia(activeRequest!.id, stage, url),
    onSuccess: async (updated) => { toast.success("Proof photo removed"); await refreshRequest(updated); },
    onError: (error) => toast.error(extractError(error))
  });
  useEffect(() => { if (open) { setTab("overview"); setNote(""); } }, [open, request?.id]);

  const tabs = [
    ["overview", "Overview"], ["quotes", `Quotes (${quotes.length})`], ["measurement", "Measurement"], ["logistics", `Pickup & delivery (${requestDeliveries.length})`], ["progress", "Tailoring progress"], ["finance", "Pricing & payment"], ["timeline", "Timeline & notes"]
  ] as const;
  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[94vh] w-[min(98vw,1240px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-[var(--panel-border)] bg-[#fbfaf7] shadow-[var(--shadow)]">
          {activeRequest ? (
            <>
              <header className="border-b border-slate-200 bg-white px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><Dialog.Title className="text-xl font-black text-slate-950">{activeRequest.darjiId ?? `TRQ-${activeRequest.id.slice(0, 8).toUpperCase()}`}</Dialog.Title><StatusBadge value={activeRequest.status} /><StatusBadge value={activeRequest.deliveryMode ?? activeRequest.urgency} /><PriorityBadge value={priority} /></div><Dialog.Description className="mt-2 text-sm text-slate-600">{activeRequest.clothType} · {activeRequest.workType} · submitted {formatDate(activeRequest.createdAt, true)}</Dialog.Description></div><div className="flex flex-wrap gap-2"><select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" value={priority} onChange={(event) => onMetadata({ priority: event.target.value as AdminOrderPriority })}><option>Normal</option><option>High</option><option>Urgent</option><option>VIP</option></select>{activeRequest.status === "QUOTE_REQUESTED" && Number(activeRequest.quoteCount ?? quotes.length) === 0 ? <ActionButton variant="secondary" onClick={() => noQuoteMutation.mutate()} disabled={noQuoteMutation.isPending}>Escalate no quote</ActionButton> : null}{activeRequest.status === "TAILOR_SELECTED" && activeRequest.workStatus === "ACCEPTED" ? <ActionButton onClick={() => workMutation.mutate({ action: "WORKING" })} disabled={workMutation.isPending || (requiresMeasurementVisit && !measurementVisitSubmitted && !activeRequest.allowTailoringWithoutMeasurementVisit)}>{requiresMeasurementVisit && !measurementVisitSubmitted && !activeRequest.allowTailoringWithoutMeasurementVisit ? "Waiting for measurements" : "Start stitching"}</ActionButton> : null}{activeRequest.status === "TAILOR_SELECTED" && activeRequest.workStatus === "WORKING" ? <ActionButton onClick={() => workMutation.mutate({ action: "READY" })} disabled={workMutation.isPending}>Mark ready</ActionButton> : null}<Dialog.Close asChild><button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white" type="button"><X size={18} /></button></Dialog.Close></div></div>
                <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.map(([id, label]) => <button className={cn("whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold", tab === id ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900")} key={id} onClick={() => setTab(id)} type="button">{label}</button>)}</div>
              </header>
              <div className="overflow-y-auto p-6">
                {detailQuery.isLoading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-orange-500" /></div> : null}
                {tab === "overview" ? <div className="space-y-5">
                <InspectGrid
                  items={[
                    { label: "Customer", value: <button className="font-bold text-orange-600" onClick={() => onOpenCustomer(activeRequest)} type="button">{getCustomerDisplayName(activeRequest.customer)} · {activeRequest.customer?.phone ?? "No phone"}</button> },
                    { label: "Request / work status", value: <span className="flex flex-wrap gap-2"><StatusBadge value={activeRequest.status} /><StatusBadge value={activeRequest.workStatus} /></span> },
                    { label: "Handoff status", value: <StatusBadge value={activeRequest.orderStatus ?? "Not started"} /> },
                    { label: "Items", value: `${activeRequest.itemCount ?? activeRequest.items?.length ?? 1} · ${activeRequest.clothType}` },
                    { label: "Service", value: `${formatStatus(activeRequest.deliveryMode ?? activeRequest.urgency)} · ${activeRequest.workType}` },
                    { label: "Measurement", value: activeRequest.homeMeasurementBooked ? `Home visit · ${activeRequest.preferredMeasurementSlot ?? "slot pending"}` : "Customer-provided measurements" },
                    { label: "Pickup address", value: activeRequest.pickupAddress },
                    { label: "Submitted", value: formatDate(activeRequest.createdAt, true) }
                  ]}
                />
                <Panel>
                  <h4 className="text-lg font-semibold">Description</h4>
                  <p className="mt-3 text-sm text-[var(--muted)]">{activeRequest.description}</p>
                  {activeRequest.measurementNotes ? <p className="mt-3 text-sm text-[var(--muted)]">Measurement notes: {activeRequest.measurementNotes}</p> : null}
                </Panel>
                <MediaStrip items={activeRequest.media} title="Customer request media" />
                <MediaStrip items={activeRequest.designMedia} title="Design references" />
                <MediaStrip items={activeRequest.sampleMedia} title="Sample garment media" />
                {activeRequest.voiceNotes?.length ? <MediaStrip items={activeRequest.voiceNotes} title="Voice notes" /> : null}
                </div> : null}
                {tab === "quotes" ? <div className="space-y-4">{quotesQuery.isLoading ? <LoaderCircle className="animate-spin text-orange-500" /> : null}{quotes.map((quote) => <Panel className={cn("p-5", quote.id === selectedQuote?.id ? "border-emerald-300 bg-emerald-50/40" : "bg-white")} key={quote.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><p className="text-lg font-black">{quote.tailor?.shopName ?? quote.tailor?.user?.name ?? "Tailor"}</p><StatusBadge value={quote.status} /></div><p className="mt-1 text-sm text-slate-500">{quote.tailor?.darjiTailorId ?? quote.tailorId} · {quote.estimatedHours ? `${quote.estimatedHours} hours` : `${quote.estimatedDays} days`}</p><p className="mt-3 text-sm text-slate-600">{quote.message || "No quote message"}</p></div><div className="text-right"><p className="text-2xl font-black">{formatCurrency(quote.price)}</p><p className="text-xs text-slate-500">Tailoring quote</p>{quote.tailor ? <button className="mt-3 text-sm font-bold text-orange-600" onClick={() => onOpenTailor(quote.tailor!)} type="button">View tailor profile</button> : null}</div></div>{quote.deliveryEstimate ? <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3"><span>{formatStatus(quote.deliveryEstimate.deliveryMode ?? "STANDARD")}</span><span>{formatDistance(quote.deliveryEstimate.oneWayDistanceMeters)}</span><span>{formatCurrency(quote.deliveryEstimate.deliveryFee ?? 0)} delivery</span></div> : null}</Panel>)}{!quotesQuery.isLoading && !quotes.length ? <EmptyState message="No tailor quotes have been submitted for this request." /> : null}</div> : null}
                {tab === "measurement" ? <div className="space-y-4">
                  <InspectGrid items={[{ label: "Measurement method", value: requiresMeasurementVisit ? "Home measurement visit" : "Customer-provided measurement" }, { label: "Preferred slot", value: activeRequest.preferredMeasurementSlot ?? "Not applicable" }, { label: "Measurement fee", value: formatCurrency(activeRequest.homeMeasurementFee ?? 0) }, { label: "Measurement notes", value: activeRequest.measurementNotes ?? "No notes" }, { label: "Tailoring bypass", value: activeRequest.allowTailoringWithoutMeasurementVisit ? "Allowed by admin" : "Not allowed" }]} />
                  {requiresMeasurementVisit && activeRequest.workStatus === "ACCEPTED" && !measurementVisitSubmitted ? <Panel className={activeRequest.allowTailoringWithoutMeasurementVisit ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}><div className="flex flex-wrap items-center justify-between gap-4"><div><h4 className="font-black">Allow tailoring without measurement visit</h4><p className="mt-1 max-w-2xl text-sm text-slate-600">Use this only when operations have confirmed that stitching can safely start without a submitted home-visit measurement.</p>{activeRequest.measurementBypassReason ? <p className="mt-2 text-xs font-semibold text-slate-500">Reason: {activeRequest.measurementBypassReason}</p> : null}</div><ActionButton variant={activeRequest.allowTailoringWithoutMeasurementVisit ? "secondary" : undefined} disabled={measurementBypassMutation.isPending} onClick={() => { const next = !activeRequest.allowTailoringWithoutMeasurementVisit; if (window.confirm(next ? "Allow this tailor to start without submitted visit measurements?" : "Restore the submitted-measurement requirement?")) measurementBypassMutation.mutate(next); }}>{activeRequest.allowTailoringWithoutMeasurementVisit ? "Revoke bypass" : "Allow tailoring without measurement visit"}</ActionButton></div></Panel> : null}
                  {activeRequest.measurement ? <Panel><h4 className="font-bold">Submitted measurement</h4><pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">{JSON.stringify(activeRequest.measurement, null, 2)}</pre></Panel> : null}
                  {requestVisits.map((visit) => <Panel key={visit.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">{visit.darjiId ?? `Visit ${visit.id.slice(0, 8).toUpperCase()}`}</p><p className="mt-1 text-sm text-slate-500">{visit.customerName} · {formatDate(visit.scheduledAt, true)}</p></div><StatusBadge value={visit.status} /></div></Panel>)}
                  {requiresMeasurementVisit && !requestVisits.length ? <EmptyState message="The measurement visit has not been created or is not available in the current data set." /> : null}
                </div> : null}
                {tab === "logistics" ? <div className="space-y-4">{requestDeliveries.map((task) => <button className="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-orange-300" key={task.id} onClick={() => onOpenDelivery(task)} type="button"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{task.taskId}</p><p className="mt-1 text-sm text-slate-500">{formatStatus(task.type)} · {formatStatus(task.serviceLevel ?? "STANDARD")}</p></div><StatusBadge value={task.taskStatus} /></div><div className="mt-4 grid gap-3 text-sm md:grid-cols-3"><span>{task.pickupAddress}</span><span>→ {task.dropAddress}</span><span>{task.batchId ? `Batch ${task.batchId.slice(0, 8).toUpperCase()}` : "Unbatched / instant"}</span></div></button>)}{!requestDeliveries.length ? <EmptyState message="Pickup and delivery tasks will appear after the order reaches the relevant workflow stage." /> : null}</div> : null}
                {tab === "progress" ? <div className="space-y-5"><InspectGrid items={[{ label: "Current work status", value: <StatusBadge value={activeRequest.workStatus} /> }, { label: "Required proof count", value: String(Math.max(1, activeRequest.itemCount ?? activeRequest.items?.length ?? 1)) }, { label: "Received-clothes proofs", value: String(activeRequest.receivedMedia?.length ?? 0) }, { label: "Stitched-clothes proofs", value: String(activeRequest.stitchedMedia?.length ?? 0) }]} /><ProofMediaManager title="Before stitching / clothes received" items={activeRequest.receivedMedia ?? []} stage="RECEIVED" pending={mediaMutation.isPending || mediaDeleteMutation.isPending} onAdd={(files) => mediaMutation.mutate({ files, stage: "RECEIVED" })} onDelete={(url) => mediaDeleteMutation.mutate({ url, stage: "RECEIVED" })} /><ProofMediaManager title="After stitching / finished clothes" items={activeRequest.stitchedMedia ?? []} stage="STITCHED" pending={mediaMutation.isPending || mediaDeleteMutation.isPending} onAdd={(files) => mediaMutation.mutate({ files, stage: "STITCHED" })} onDelete={(url) => mediaDeleteMutation.mutate({ url, stage: "STITCHED" })} /><p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">The backend requires one received-clothes photo per item before stitching can start, and one stitched-clothes photo per item before the request can be marked ready.</p></div> : null}
                {tab === "finance" ? <div className="space-y-5"><InspectGrid items={[{ label: "Payment", value: <span className="flex flex-wrap gap-2"><StatusBadge value={activeRequest.paymentMethod ?? "Not selected"} /><StatusBadge value={activeRequest.paymentStatus ?? "PENDING"} /></span> }, { label: "Tailor quote", value: formatCurrency(activeRequest.quoteAmount ?? selectedQuote?.price ?? 0) }, { label: "Delivery fee", value: formatCurrency(activeRequest.deliveryFee ?? 0) }, { label: "Platform fee", value: formatCurrency(activeRequest.platformFee ?? 0) }, { label: "Small-order fee", value: formatCurrency(activeRequest.smallOrderFee ?? 0) }, { label: "Home measurement fee", value: formatCurrency(activeRequest.homeMeasurementFee ?? 0) }, { label: "Coupon / discount", value: `${activeRequest.couponCode ?? "No coupon"} · -${formatCurrency(activeRequest.discountAmount ?? 0)}` }, { label: "Customer total", value: <strong className="text-lg">{formatCurrency(activeRequest.totalAmount ?? 0)}</strong> }]} /><p className="rounded-xl bg-slate-100 p-3 text-xs font-semibold text-slate-600">Financial values are shown from the confirmed backend record and are not free-text editable here.</p></div> : null}
                {tab === "timeline" ? <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]"><Panel><h4 className="font-black">Request timeline</h4><div className="mt-4 space-y-3">{(activeRequest.timelineEvents ?? []).map((event, index) => <div className="flex gap-3 border-b border-slate-100 pb-3" key={`${event.timestamp}-${index}`}><span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" /><div><p className="text-sm font-bold">{formatStatus(event.status)}</p><p className="text-xs text-slate-500">{event.description ?? "Request updated"} · {formatDate(event.timestamp, true)}</p>{event.userName || event.userId ? <p className="mt-1 text-[11px] font-semibold text-slate-400">By {event.userName ?? event.userId}</p> : null}</div></div>)}{!activeRequest.timelineEvents?.length ? <p className="text-sm text-slate-500">No request timeline events are available yet.</p> : null}</div></Panel><div className="space-y-4"><Panel><h4 className="font-black">Internal note</h4><textarea className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-orange-400" maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="Add context for other administrators" value={note} /><ActionButton className="mt-3 w-full justify-center" disabled={!note.trim()} onClick={() => { onMetadata({ note: note.trim() }); setNote(""); }}>Save internal note</ActionButton></Panel>{notes.map((item, index) => <Panel className="p-4" key={`${item.createdAt}-${index}`}><p className="text-sm text-slate-700">{item.note}</p><p className="mt-2 text-xs font-semibold text-slate-500">{item.admin} · {formatDate(item.createdAt, true)}</p></Panel>)}</div></div> : null}
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4"><p className="text-xs text-slate-500">Only backend-validated transitions are available. Pickup and delivery milestones are controlled from their linked tasks.</p>{!["CANCELLED"].includes(activeRequest.status) && activeRequest.orderStatus !== "completed" ? <button className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50" disabled={workMutation.isPending} onClick={() => { if (window.confirm("Cancel this tailoring request? The backend will also cancel active delivery tasks and measurement visits where applicable.")) workMutation.mutate({ action: "CANCEL" }); }} type="button">Cancel request</button> : null}</footer>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeliveryRequestDialog({
  batches,
  notes,
  onMetadata,
  onOpenBatch,
  onOpenCustomer,
  onOpenOrder,
  onOpenPartner,
  onOpenTailor,
  onRetryAction,
  onUpdated,
  open,
  partners,
  priority,
  request,
  setOpen
}: {
  batches: DeliveryBatch[];
  notes: AdminOrderNote[];
  onMetadata: (payload: { priority?: AdminOrderPriority; note?: string }) => void;
  onOpenBatch: (batch: DeliveryBatch) => void;
  onOpenCustomer: (request: DeliveryRequest) => void;
  onOpenOrder: (request: DeliveryRequest) => void;
  onOpenPartner: (partner: DeliveryPartnerProfile) => void;
  onOpenTailor: (request: DeliveryRequest) => void;
  onRetryAction: (taskId: string, action: "retry" | "resolve" | "cancel") => void;
  onUpdated: (request: DeliveryRequest) => void;
  open: boolean;
  partners: DeliveryPartnerProfile[];
  priority: AdminOrderPriority;
  request: DeliveryRequest | null;
  setOpen: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<"overview" | "assignment" | "route" | "handoff" | "proofs" | "exceptions" | "finance" | "timeline">("overview");
  const [failureReason, setFailureReason] = useState("Customer not available");
  const [failureNote, setFailureNote] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const detailQuery = useQuery({ queryKey: ["admin", "delivery-request", request?.id], queryFn: () => getDeliveryRequestById(request!.id), enabled: open && Boolean(request?.id) });
  const activeRequest = detailQuery.data ?? request;
  const assignedPartner = partners.find((partner) => partner.id === activeRequest?.assignedDeliveryPartnerId);
  const assignedBatch = batches.find((batch) => batch.batchId === activeRequest?.batchId);
  const rescheduleQuery = useQuery({ queryKey: ["admin", "delivery-reschedule-options", activeRequest?.id], queryFn: () => getDeliveryRescheduleOptions(activeRequest!.id), enabled: open && tab === "exceptions" && Boolean(activeRequest?.id) && activeRequest?.taskStatus === "pending" && activeRequest?.serviceLevel !== "INSTANT" });
  const refreshTask = async (updated?: DeliveryRequest) => {
    if (updated) onUpdated(updated);
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin", "delivery-request", request?.id] }), queryClient.invalidateQueries({ queryKey: ["admin", "delivery-requests"] }), queryClient.invalidateQueries({ queryKey: ["admin", "delivery-retries"] }), queryClient.invalidateQueries({ queryKey: ["admin", "delivery-batches"] })]);
  };
  const rescheduleMutation = useMutation({ mutationFn: (option: { deliveryRound: "ONE_PM" | "SIX_PM"; roundAt: string }) => rescheduleAdminDelivery(activeRequest!.id, option), onSuccess: async (result) => { toast.success("Delivery rescheduled"); await refreshTask(result.task); }, onError: (error) => toast.error(extractError(error)) });
  const failMutation = useMutation({ mutationFn: () => failAdminDelivery(activeRequest!.id, { reason: failureReason, note: failureNote.trim() || undefined }), onSuccess: async (updated) => { toast.success("Failure recorded and retry policy applied"); setFailureNote(""); await refreshTask(updated); }, onError: (error) => toast.error(extractError(error)) });
  useEffect(() => { if (open) { setTab("overview"); setNote(""); setFailureNote(""); } }, [open, request?.id]);
  const tabs = [["overview", "Overview"], ["assignment", "Assignment"], ["route", "Route & batch"], ["handoff", "OTP & milestones"], ["proofs", "Proofs"], ["exceptions", "Failures & retry"], ["finance", "Cash & payout"], ["timeline", "Timeline & notes"]] as const;

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[94vh] w-[min(98vw,1240px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-[var(--panel-border)] bg-[#fbfaf7] shadow-[var(--shadow)]">
          {activeRequest ? (
            <>
              <header className="border-b border-slate-200 bg-white px-6 py-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><Dialog.Title className="text-xl font-black text-slate-950">{activeRequest.taskId}</Dialog.Title><StatusBadge value={activeRequest.taskStatus} /><StatusBadge value={activeRequest.serviceLevel ?? "STANDARD"} /><PriorityBadge value={priority} /></div><Dialog.Description className="mt-2 text-sm text-slate-600">{formatStatus(activeRequest.type)} · created {formatDate(activeRequest.createdAt, true)}</Dialog.Description></div><div className="flex flex-wrap gap-2"><select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" value={priority} onChange={(event) => onMetadata({ priority: event.target.value as AdminOrderPriority })}><option>Normal</option><option>High</option><option>Urgent</option><option>VIP</option></select><ActionButton variant="secondary" onClick={() => onOpenOrder(activeRequest)}>Open order</ActionButton><Dialog.Close asChild><button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200" type="button"><X size={18} /></button></Dialog.Close></div></div><div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.map(([id, label]) => <button className={cn("whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold", tab === id ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900")} key={id} onClick={() => setTab(id)} type="button">{label}</button>)}</div></header>
              <div className="overflow-y-auto p-6">
                {detailQuery.isLoading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-orange-500" /></div> : null}
                {tab === "overview" ? <div className="space-y-5"><InspectGrid items={[{ label: "Task / linked order", value: `${activeRequest.taskId} · ${activeRequest.orderId}` }, { label: "Task type", value: <span className="flex flex-wrap gap-2"><StatusBadge value={activeRequest.type} /><StatusBadge value={activeRequest.deliveryType ?? (activeRequest.type === "customer_to_tailor" ? "PICKUP" : "DROP")} /></span> }, { label: "Customer", value: <button className="font-bold text-orange-600" onClick={() => onOpenCustomer(activeRequest)} type="button">{activeRequest.customerName ?? "Customer"} · {activeRequest.customerPhone ?? "No phone"}</button> }, { label: "Tailor", value: <button className="font-bold text-orange-600" onClick={() => onOpenTailor(activeRequest)} type="button">{activeRequest.tailorName ?? "Tailor"} · {activeRequest.tailorPhone ?? "No phone"}</button> }, { label: "Garments", value: `${activeRequest.clothType ?? "Clothing"} · ${activeRequest.itemCount ?? 1} item(s)` }, { label: "Schedule", value: activeRequest.serviceLevel === "INSTANT" ? "Immediate / instant job" : `${formatStatus(activeRequest.deliveryRound ?? activeRequest.shift)} · ${formatDate(activeRequest.roundAt, true)}` }, { label: "Pickup address", value: activeRequest.pickupAddress }, { label: "Drop address", value: activeRequest.dropAddress }]} /></div> : null}
                {tab === "assignment" ? <div className="space-y-5">{assignedPartner ? <Panel><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-orange-100 font-black text-orange-700">{(assignedPartner.user?.profileUrl || assignedPartner.user?.avatarUrl) ? <img alt={getPartnerDisplayName(assignedPartner)} className="h-full w-full object-cover" src={assignedPartner.user.profileUrl || assignedPartner.user.avatarUrl} /> : getInitials(getPartnerDisplayName(assignedPartner))}</span><div><p className="font-black">{getPartnerDisplayName(assignedPartner)}</p><p className="text-sm text-slate-500">{assignedPartner.darjiPartnerId} · {getPartnerVehicleNumber(assignedPartner)}</p><div className="mt-1"><DeliveryRoleBadge partner={assignedPartner} /></div></div></div><ActionButton variant="secondary" onClick={() => onOpenPartner(assignedPartner)}>View partner profile</ActionButton></div></Panel> : <EmptyState message="This delivery task is currently unassigned." />}<p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Partner assignment and reassignment use the connected order assignment workflow so pickup/drop role eligibility and distance ranking remain enforced.</p><ActionButton onClick={() => onOpenOrder(activeRequest)}>Manage assignment from order</ActionButton></div> : null}
                {tab === "route" ? <div className="space-y-5"><InspectGrid items={[{ label: "Service level", value: <StatusBadge value={activeRequest.serviceLevel ?? "STANDARD"} /> }, { label: "Distance", value: activeRequest.distanceMeters ? formatDistance(activeRequest.distanceMeters) : activeRequest.estimatedDistanceKm != null ? `${activeRequest.estimatedDistanceKm.toFixed(1)} km` : "Unavailable" }, { label: "Delivery round", value: formatStatus(activeRequest.deliveryRound ?? activeRequest.shift) }, { label: "ETA window", value: `${formatDate(activeRequest.etaWindowStart, true)} – ${formatDate(activeRequest.etaWindowEnd, true)}` }, { label: "Deadline", value: formatDate(activeRequest.deadlineAt, true) }, { label: "Route position", value: activeRequest.routePosition ? `${activeRequest.routePosition} of ${activeRequest.routeTotal ?? "?"}` : "Not routed" }]} />{assignedBatch ? <Panel><div className="flex items-center justify-between gap-3"><div><p className="font-black">Batch {assignedBatch.batchId.slice(0, 8).toUpperCase()}</p><p className="mt-1 text-sm text-slate-500">{assignedBatch.area} · {formatDate(assignedBatch.roundAt, true)}</p></div><ActionButton variant="secondary" onClick={() => onOpenBatch(assignedBatch)}>Open batch</ActionButton></div></Panel> : <EmptyState message={activeRequest.serviceLevel === "INSTANT" ? "Instant jobs intentionally use the single-job route instead of an optimized scheduled batch." : "This task is not currently attached to a delivery batch."} />}</div> : null}
                {tab === "handoff" ? <div className="space-y-5"><InspectGrid items={[{ label: "Accepted", value: formatDate(activeRequest.acceptedAt, true) }, { label: "Pickup OTP", value: activeRequest.pickupOtpVerifiedAt ? <span className="font-bold text-emerald-700">Verified · {formatDate(activeRequest.pickupOtpVerifiedAt, true)}</span> : <span className="font-bold text-amber-700">Pending</span> }, { label: "Picked up", value: formatDate(activeRequest.pickedUpAt, true) }, { label: "Drop OTP", value: activeRequest.dropOtpVerifiedAt ? <span className="font-bold text-emerald-700">Verified · {formatDate(activeRequest.dropOtpVerifiedAt, true)}</span> : <span className="font-bold text-amber-700">Pending</span> }, { label: "Delivered", value: formatDate(activeRequest.deliveredAt, true) }, { label: "Current status", value: <StatusBadge value={activeRequest.taskStatus} /> }]} /><p className="rounded-xl bg-slate-100 p-3 text-xs font-semibold text-slate-600">Raw OTP values are intentionally not displayed. Completion remains blocked until the correct handoff OTP and required proof photos are recorded by the delivery workflow.</p></div> : null}
                {tab === "proofs" ? <div className="space-y-5"><MediaStrip items={activeRequest.clothPhotos} title={`Customer pickup cloth proofs (${activeRequest.clothPhotos?.length ?? 0}/${Math.max(1, activeRequest.itemCount ?? 1)})`} /><MediaStrip items={activeRequest.samplePhotos} title="Sample garment proofs" /><MediaStrip items={activeRequest.deliveryPhotos} title={`Final delivery proofs (${activeRequest.deliveryPhotos?.length ?? 0}/${Math.max(1, activeRequest.itemCount ?? 1)})`} /><p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Delivery proof changes remain in the assigned partner workflow because the backend requires live partner ownership, fresh location, the correct task stage, and verified OTP.</p></div> : null}
                {tab === "exceptions" ? <div className="space-y-5"><InspectGrid items={[{ label: "Retry status", value: <StatusBadge value={activeRequest.retryStatus ?? "ACTIVE"} /> }, { label: "Retry count", value: String(activeRequest.retryCount ?? 0) }, { label: "Last failure", value: activeRequest.lastFailureReason ?? "No failure" }, { label: "Last failure time", value: formatDate(activeRequest.lastFailureAt, true) }, { label: "Next batch", value: formatDate(activeRequest.nextScheduledBatch, true) }, { label: "Next round", value: formatStatus(activeRequest.nextDeliveryRound ?? "Not scheduled") }]} />{(activeRequest.failureHistory ?? []).map((failure, index) => <Panel className="p-4" key={`${failure.failedAt}-${index}`}><div className="flex flex-wrap justify-between gap-2"><p className="font-bold text-rose-700">{failure.reason ?? "Delivery failure"}</p><p className="text-xs text-slate-500">{formatDate(failure.failedAt, true)}</p></div><p className="mt-2 text-sm text-slate-600">{failure.note ?? formatStatus(failure.action ?? "Recorded")}</p></Panel>)}{["accepted", "picked_up"].includes(activeRequest.taskStatus) ? <Panel><h4 className="font-black">Record delivery failure</h4><div className="mt-3 grid gap-3 md:grid-cols-2"><select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={failureReason} onChange={(event) => setFailureReason(event.target.value)}>{["Customer not available", "Customer requested later today", "Customer requested tomorrow", "Phone unreachable", "Wrong address", "Customer cancelled", "Other"].map((reason) => <option key={reason}>{reason}</option>)}</select><input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" maxLength={500} onChange={(event) => setFailureNote(event.target.value)} placeholder="Optional operational note" value={failureNote} /></div><ActionButton className="mt-3" disabled={failMutation.isPending} onClick={() => { if (window.confirm("Record this failure and apply the backend retry policy?")) failMutation.mutate(); }}>Record failure</ActionButton></Panel> : null}{rescheduleQuery.data?.length ? <Panel><h4 className="font-black">Available reschedule slots</h4><div className="mt-3 flex flex-wrap gap-2">{rescheduleQuery.data.map((option) => <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold hover:border-orange-400" disabled={rescheduleMutation.isPending} key={`${option.deliveryRound}-${option.roundAt}`} onClick={() => rescheduleMutation.mutate({ deliveryRound: option.deliveryRound, roundAt: option.roundAt })} type="button">{option.label}</button>)}</div></Panel> : null}{["PENDING_RETRY", "ACTION_REQUIRED"].includes(activeRequest.retryStatus ?? "") ? <div className="flex flex-wrap gap-2"><ActionButton onClick={() => onRetryAction(activeRequest.id, "retry")}>Retry now</ActionButton><ActionButton variant="secondary" onClick={() => onRetryAction(activeRequest.id, "resolve")}>Resolve exception</ActionButton><button className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700" onClick={() => onRetryAction(activeRequest.id, "cancel")} type="button">Cancel retry</button></div> : null}</div> : null}
                {tab === "finance" ? <div className="space-y-5"><InspectGrid items={[{ label: "Payment", value: <span className="flex flex-wrap gap-2"><StatusBadge value={activeRequest.paymentMethod ?? "Not available"} /><StatusBadge value={activeRequest.paymentStatus ?? "PENDING"} /></span> }, { label: "Customer order total", value: formatCurrency(activeRequest.totalAmount ?? 0) }, { label: "COD required", value: activeRequest.cashCollectionRequired ? "Yes" : "No" }, { label: "Cash collection", value: activeRequest.cashCollectionRequired ? activeRequest.cashCollected ? `Collected · ${formatDate(activeRequest.cashCollectedAt, true)}` : "Pending" : "Not applicable" }, { label: "Estimated payout", value: formatCurrency(activeRequest.estimatedPayout ?? activeRequest.estimatedEarnings) }, { label: "Final payout", value: activeRequest.finalPayout != null ? formatCurrency(activeRequest.finalPayout) : "Finalizes on completion" }]} /><p className="rounded-xl bg-slate-100 p-3 text-xs font-semibold text-slate-600">COD confirmation remains locked behind final delivery OTP verification. Payout amounts are read from the backend and are not manually recalculated here.</p></div> : null}
                {tab === "timeline" ? <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]"><Panel><h4 className="font-black">Task timeline</h4><div className="mt-4 space-y-3">{(activeRequest.timelineEvents ?? []).map((event, index) => <div className="flex gap-3 border-b border-slate-100 pb-3" key={`${event.timestamp}-${index}`}><span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" /><div><p className="text-sm font-bold">{formatStatus(event.status)}</p><p className="text-xs text-slate-500">{event.description ?? "Task updated"} · {formatDate(event.timestamp, true)}</p>{event.userName || event.userId ? <p className="mt-1 text-[11px] font-semibold text-slate-400">By {event.userName ?? event.userId}</p> : null}</div></div>)}{!activeRequest.timelineEvents?.length ? <p className="text-sm text-slate-500">No task timeline events are available yet.</p> : null}</div></Panel><div className="space-y-4"><Panel><h4 className="font-black">Internal note</h4><textarea className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="Add context for other administrators" value={note} /><ActionButton className="mt-3 w-full justify-center" disabled={!note.trim()} onClick={() => { onMetadata({ note: note.trim() }); setNote(""); }}>Save internal note</ActionButton></Panel>{notes.map((item, index) => <Panel className="p-4" key={`${item.createdAt}-${index}`}><p className="text-sm text-slate-700">{item.note}</p><p className="mt-2 text-xs font-semibold text-slate-500">{item.admin} · {formatDate(item.createdAt, true)}</p></Panel>)}</div></div> : null}
              </div>
              <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs font-semibold text-slate-500">Status completion is intentionally not editable from this page; OTP, proof, location, ownership, COD, and task-order rules remain enforced by the delivery workflow.</footer>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProfileDialog({
  deliveryRequests,
  onOpenBatch,
  onOpenDeliveryTask,
  onOpenOrder,
  onOpenWallet,
  onReview,
  onSave,
  onSampleReview,
  orders,
  open,
  pending,
  profile,
  setOpen,
  subtitle
}: {
  deliveryRequests: DeliveryRequest[];
  onOpenBatch: (batch: BatchFocusTarget) => void;
  onOpenDeliveryTask: (request: DeliveryRequest) => void;
  onOpenOrder: (order: Order) => void;
  onOpenWallet: () => void;
  onReview?: (review: { status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED"; deliveryType?: "PICKUP" | "DROP"; assignedArea?: string; reason?: string; reuploadFields?: string[] }) => void;
  onSave: (updates: AdminPartnerProfileUpdate) => void;
  onSampleReview?: (sampleId: string, status: "APPROVED" | "REJECTED") => void;
  orders: Order[];
  open: boolean;
  pending?: boolean;
  profile: TailorProfile | DeliveryPartnerProfile | null;
  setOpen: (open: boolean) => void;
  subtitle: string;
}) {
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DROP">("PICKUP");
  const [assignedArea, setAssignedArea] = useState<string>("unassigned");
  const [reviewReason, setReviewReason] = useState("");
  const [selectedReuploadFields, setSelectedReuploadFields] = useState<string[]>(["aadhaarFront", "aadhaarBack", "facePhoto"]);
  const [profileTab, setProfileTab] = useState<"personal" | "business" | "bank" | "documents" | "registration" | "change-log" | "review" | "activity">("personal");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editDraft, setEditDraft] = useState({ name: "", phone: "", email: "", avatarUrl: "", shopName: "", specialization: "", address: "", shopAddress: "", vehicleNumber: "", vehicleModel: "", accountHolder: "", accountNumber: "", ifsc: "", upi: "" });
  const [draftBeforeEdit, setDraftBeforeEdit] = useState(editDraft);
  const [verificationJson, setVerificationJson] = useState("{}");
  const [verificationJsonBeforeEdit, setVerificationJsonBeforeEdit] = useState("{}");
  const [deliveryTypeBeforeEdit, setDeliveryTypeBeforeEdit] = useState<"PICKUP" | "DROP">("PICKUP");
  const [assignedAreaBeforeEdit, setAssignedAreaBeforeEdit] = useState("unassigned");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile && !("specialization" in profile)) {
      setDeliveryType((profile as DeliveryPartnerProfile).deliveryType ?? "PICKUP");
      setAssignedArea((profile as DeliveryPartnerProfile).assignedArea ?? "unassigned");
    }
    if (profile && "specialization" in profile) {
      const idType = String((profile.verification?.idVerification as { idType?: string } | undefined)?.idType ?? "Aadhaar");
      setSelectedReuploadFields(profile.verificationReuploadFields?.length ? profile.verificationReuploadFields : idType === "Aadhaar" ? ["aadhaarFront", "aadhaarBack", "facePhoto"] : ["panPhoto", "facePhoto"]);
    }
    setReviewReason(profile?.verificationRejectionReason ?? "");
    setIsEditing(false);
    if (profile) {
      const verification = (profile.verification ?? {}) as Record<string, any>;
      const personal = (verification.personal ?? {}) as Record<string, any>;
      const shop = (verification.shop ?? {}) as Record<string, any>;
      const vehicle = (verification.vehicle ?? {}) as Record<string, any>;
      const bank = (verification.bank ?? {}) as Record<string, any>;
      setProfileTab("personal");
      setVerificationJson(JSON.stringify(verification, null, 2));
      setEditDraft({
        name: profile.user?.name ?? personal.name ?? personal.fullName ?? "",
        phone: profile.user?.phone ?? "",
        email: profile.user?.email ?? personal.email ?? "",
        avatarUrl: profile.user?.profileUrl || profile.user?.avatarUrl || "",
        shopName: "shopName" in profile ? profile.shopName ?? shop.shopName ?? "" : "",
        specialization: "specialization" in profile ? (profile.specialization ?? []).join(", ") : "",
        address: personal.address ?? "",
        shopAddress: shop.shopAddress ?? "",
        vehicleNumber: "vehicleNumber" in profile ? profile.vehicleNumber ?? vehicle.vehicleNumber ?? "" : "",
        vehicleModel: vehicle.vehicleModel ?? "",
        accountHolder: bank.accountHolder ?? "",
        accountNumber: bank.accountNumber ?? "",
        ifsc: bank.ifsc ?? "",
        upi: bank.upi ?? ""
      });
    }
  }, [profile]);

  const isDelivery = profile ? !isTailorProfile(profile) : false;
  const verificationLocked = profile?.verificationStatus === "VERIFIED";
  const submittedMedia = collectVerificationMedia(profile?.verification);
  const draftMedia = collectVerificationMedia(profile?.verificationDraft);
  const profileOrders = profile
    ? orders.filter((order) =>
        isDelivery
          ? order.pickupPartnerId === profile.id || order.deliveryPartnerId === profile.id
          : order.tailorId === profile.id
      )
    : [];
  const activeProfileOrders = profileOrders.filter((order) => !["DELIVERED", "CANCELLED", "completed", "cancelled"].includes(order.status));
  const completedProfileOrders = profileOrders.filter((order) => ["DELIVERED", "completed"].includes(order.status));
  const profileDeliveryRequests = profile && isDelivery
    ? deliveryRequests.filter((request) => request.assignedDeliveryPartnerId === profile.id)
    : [];
  const profileChangeLogQuery = useQuery({
    queryKey: ["admin", "partner-profile-change-log", isDelivery ? "DELIVERY_PARTNER" : "TAILOR", profile?.id],
    queryFn: () => getAdminPartnerProfileChangeLog({ profileId: profile!.id, role: isDelivery ? "DELIVERY_PARTNER" : "TAILOR" }),
    enabled: open && Boolean(profile?.id) && profileTab === "change-log",
    staleTime: 15_000
  });
  const displayName = profile
    ? isDelivery
      ? getPartnerDisplayName(profile as DeliveryPartnerProfile)
      : getTailorDisplayName(profile as TailorProfile)
    : "Profile";
  const avatarSeed = profile?.user?.name ?? profile?.user?.phone ?? displayName;
  const avatarGender = isDelivery
    ? String((profile?.verification as { personal?: { gender?: string }; gender?: string } | undefined)?.personal?.gender
      ?? (profile?.verification as { gender?: string } | undefined)?.gender
      ?? "")
    : undefined;
  const profileFallbackAvatar = getDefaultAvatarUrl(avatarSeed, avatarGender);
  const headline = profile
    ? isDelivery
      ? `${getPartnerRoleLabel(profile as DeliveryPartnerProfile)} delivery partner - ${getPartnerVehicleNumber(profile as DeliveryPartnerProfile)}`
      : `Shop: ${(profile as TailorProfile).shopName ?? "Not provided"}`
    : subtitle;
  const updateDraft = (field: keyof typeof editDraft, value: string) => setEditDraft((current) => ({ ...current, [field]: value }));
  const beginEditing = () => {
    setDraftBeforeEdit(editDraft);
    setVerificationJsonBeforeEdit(verificationJson);
    setDeliveryTypeBeforeEdit(deliveryType);
    setAssignedAreaBeforeEdit(assignedArea);
    setIsEditing(true);
  };
  const cancelEditing = () => {
    setEditDraft(draftBeforeEdit);
    setVerificationJson(verificationJsonBeforeEdit);
    setDeliveryType(deliveryTypeBeforeEdit);
    setAssignedArea(assignedAreaBeforeEdit);
    setIsEditing(false);
  };
  const saveProfile = () => {
    if (!profile) return;
    let verification: Record<string, any>;
    try {
      const parsed = JSON.parse(verificationJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Registration record must be a JSON object");
      verification = structuredClone(parsed as Record<string, any>);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration record contains invalid JSON");
      return;
    }
    verification.personal = { ...(verification.personal ?? {}), name: editDraft.name, fullName: editDraft.name, email: editDraft.email, address: editDraft.address };
    verification.bank = { ...(verification.bank ?? {}), accountHolder: editDraft.accountHolder, accountNumber: editDraft.accountNumber, ifsc: editDraft.ifsc, upi: editDraft.upi };
    if (isDelivery) verification.vehicle = { ...(verification.vehicle ?? {}), vehicleNumber: editDraft.vehicleNumber, vehicleModel: editDraft.vehicleModel };
    else verification.shop = { ...(verification.shop ?? {}), shopName: editDraft.shopName, shopAddress: editDraft.shopAddress };
    onSave({
      name: editDraft.name,
      phone: editDraft.phone,
      email: editDraft.email,
      avatarUrl: editDraft.avatarUrl,
      ...(isDelivery ? { vehicleNumber: editDraft.vehicleNumber, deliveryType, assignedArea } : { shopName: editDraft.shopName, specialization: editDraft.specialization.split(",").map((item) => item.trim()).filter(Boolean) }),
      verification
    });
    setIsEditing(false);
  };

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,860px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          {profile ? (
            <>
              <Dialog.Title className="text-2xl font-semibold">
                {displayName}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">{subtitle}</Dialog.Description>
              <div className="mt-5 overflow-hidden rounded-[28px] border border-[var(--panel-border)] bg-[linear-gradient(135deg,#fff8e9,#fbfdff_58%,#eef6ff)]">
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/80 bg-[#fff6e4] shadow-lg">
                    <img
                      alt="Profile photo"
                      className="h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = profileFallbackAvatar; }}
                      src={profile.user?.profileUrl || profile.user?.avatarUrl || profileFallbackAvatar}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold tracking-[-0.03em] text-[var(--deep)]">{displayName}</h3>
                      {isDelivery ? <DeliveryRoleBadge partner={profile as DeliveryPartnerProfile} /> : null}
                      <StatusBadge value={profile.verificationStatus} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#6f614c]">{headline}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      <span>{isDelivery ? (profile as DeliveryPartnerProfile).darjiPartnerId ?? "Partner ID pending" : (profile as TailorProfile).darjiTailorId ?? "Tailor ID pending"}</span>
                      <span>Joined {formatDate(profile.createdAt, true)}</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">For verified partners, this photo is the submitted face verification selfie.</p>
                    <div className="mt-4 flex flex-wrap gap-2"><ActionButton className="px-3 py-2 text-xs" variant="secondary" onClick={onOpenWallet}><ReceiptIndianRupee size={14} />Wallet &amp; payouts</ActionButton>{!isEditing ? <ActionButton className="px-3 py-2 text-xs" onClick={beginEditing}><PencilLine size={14} />Edit profile</ActionButton> : null}</div>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
                  <div className="flex gap-2 overflow-x-auto p-1">
                    {([
                      ["personal", "Personal details"],
                      ["business", isDelivery ? "Vehicle details" : "Shop details"],
                      ["bank", "Bank details"],
                      ["documents", "Documents & images"],
                      ["registration", "Original registration"],
                      ["change-log", "Change log"],
                      ["review", "Verification review"],
                      ["activity", "Orders & activity"]
                    ] as const).map(([id, label]) => <button className={cn("shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition", profileTab === id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100")} key={id} onClick={() => setProfileTab(id)} type="button">{label}</button>)}
                  </div>
                  <fieldset className="border-t border-slate-100 p-4 disabled:opacity-75" disabled={!isEditing && ["personal", "business", "bank"].includes(profileTab)}>
                    {profileTab === "personal" ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Full name"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={editDraft.name} onChange={(event) => updateDraft("name", event.target.value)} /></Field><Field label="Phone"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={editDraft.phone} onChange={(event) => updateDraft("phone", event.target.value)} /></Field><Field label="Email"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" type="email" value={editDraft.email} onChange={(event) => updateDraft("email", event.target.value)} /></Field><Field label="Profile photo"><div className="flex gap-2"><input className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3" value={editDraft.avatarUrl} onChange={(event) => updateDraft("avatarUrl", event.target.value)} /><label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold hover:bg-slate-50">{uploadingAvatar ? "Uploading..." : "Upload"}<input accept="image/*" className="hidden" disabled={uploadingAvatar} type="file" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setUploadingAvatar(true); try { const uploaded = await uploadAdminMedia(file); updateDraft("avatarUrl", uploaded.url); toast.success("Profile photo uploaded. Save changes to apply it."); } catch (error) { toast.error(extractError(error)); } finally { setUploadingAvatar(false); event.target.value = ""; } }} /></label></div></Field><div className="sm:col-span-2"><Field label="Home address"><textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2" value={editDraft.address} onChange={(event) => updateDraft("address", event.target.value)} /></Field></div></div> : null}
                    {profileTab === "business" ? isDelivery ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Vehicle number"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={editDraft.vehicleNumber} onChange={(event) => updateDraft("vehicleNumber", event.target.value)} /></Field><Field label="Vehicle model"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={editDraft.vehicleModel} onChange={(event) => updateDraft("vehicleModel", event.target.value)} /></Field><Field label="Delivery role"><select className="h-11 w-full rounded-xl border border-slate-200 px-3" value={deliveryType} onChange={(event) => setDeliveryType(event.target.value as "PICKUP" | "DROP")}><option value="PICKUP">Pickup</option><option value="DROP">Drop</option></select></Field><Field label="Assigned area"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={assignedArea} onChange={(event) => setAssignedArea(event.target.value)} /></Field></div> : <div className="grid gap-4 sm:grid-cols-2"><Field label="Shop name"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={editDraft.shopName} onChange={(event) => updateDraft("shopName", event.target.value)} /></Field><Field label="Specializations"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" placeholder="Shirt, Kurta, Blouse" value={editDraft.specialization} onChange={(event) => updateDraft("specialization", event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Shop address"><textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2" value={editDraft.shopAddress} onChange={(event) => updateDraft("shopAddress", event.target.value)} /></Field></div></div> : null}
                    {profileTab === "bank" ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Account holder"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={editDraft.accountHolder} onChange={(event) => updateDraft("accountHolder", event.target.value)} /></Field><Field label="Account number"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={editDraft.accountNumber} onChange={(event) => updateDraft("accountNumber", event.target.value)} /></Field><Field label="IFSC"><input className="h-11 w-full rounded-xl border border-slate-200 px-3 uppercase" value={editDraft.ifsc} onChange={(event) => updateDraft("ifsc", event.target.value.toUpperCase())} /></Field><Field label="UPI ID"><input className="h-11 w-full rounded-xl border border-slate-200 px-3" value={editDraft.upi} onChange={(event) => updateDraft("upi", event.target.value)} /></Field></div> : null}
                    {profileTab === "documents" ? <div><div><h4 className="font-bold text-slate-950">Uploaded verification documents</h4><p className="mt-1 text-sm text-slate-600">Aadhaar, PAN, licence, RC, face, shop, and other submitted images are shown with their exact labels.</p></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[...submittedMedia, ...draftMedia].map((item, index) => <a className="overflow-hidden rounded-xl border border-slate-200" href={item.url} key={`${item.url}-${index}`} rel="noreferrer" target="_blank"><img alt={item.label} className="aspect-square w-full object-cover" src={item.url} /><p className="truncate px-2 py-1.5 text-[10px] font-semibold text-slate-600">{item.label}</p></a>)}</div>{![...submittedMedia, ...draftMedia].length ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No uploaded verification images.</p> : null}{!isEditing ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{flattenEditableVerification(profile.verification, [], isDocumentRegistrationField).map((item) => <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" key={item.path.join(".")}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-900">{formatAdminValue(item.value)}</p></div>)}</div> : null}</div> : null}
                    {profileTab === "registration" ? <div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={20} /><div><h4 className="font-bold text-emerald-950">Original registration — read only</h4><p className="mt-1 text-sm text-emerald-800">This preserves the earliest available registration submission and is never changed by profile edits.</p><p className="mt-2 text-xs font-semibold text-emerald-700">Captured {formatDate(profile.registrationSnapshotCapturedAt ?? profile.verificationSubmittedAt, true)}</p>{!profile.registrationSnapshot ? <p className="mt-2 text-xs text-amber-700">Legacy profile: the current submitted registration is shown as the earliest available baseline. It will be locked when the updated backend records its first snapshot.</p> : null}</div></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{flattenAdminRecord(profile.registrationSnapshot ?? profile.verification).map((item) => <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" key={`original-${item.label}`}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-900">{item.value}</p></div>)}</div></div> : null}
                    {profileTab === "change-log" ? <div><div><h4 className="font-bold text-slate-950">Profile change log</h4><p className="mt-1 text-sm text-slate-600">Every admin profile edit records who changed it, when it changed, and the before/after values.</p></div>{profileChangeLogQuery.isLoading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-orange-500" /></div> : null}{profileChangeLogQuery.isError ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{extractError(profileChangeLogQuery.error)}</p> : null}<div className="mt-4 space-y-3">{(profileChangeLogQuery.data ?? []).map((log) => <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={log.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-950">{log.actorName || "Admin"}</p><p className="text-xs text-slate-500">{formatStatus(log.actorRole)} · {log.summary}</p></div><p className="text-xs font-semibold text-slate-600">{formatDate(log.createdAt, true)}</p></div><div className="mt-3 space-y-2">{(log.metadata?.changes ?? []).map((change, index) => <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[180px_1fr_24px_1fr] md:items-center" key={`${change.field}-${index}`}><p className="text-xs font-bold text-slate-700">{change.field.split(".").map(humanizeFieldLabel).join(" / ")}</p><p className="break-words text-xs text-rose-700">{formatAdminValue(change.before)}</p><ArrowRight className="hidden text-slate-400 md:block" size={15} /><p className="break-words text-xs font-semibold text-emerald-700">{formatAdminValue(change.after)}</p></div>)}</div></div>)}{!profileChangeLogQuery.isLoading && !profileChangeLogQuery.data?.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No recorded admin changes yet. New changes will appear here after the backend update is deployed.</p> : null}</div></div> : null}
                    {profileTab === "documents" && !isEditing ? <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4"><div><p className="text-sm font-bold text-orange-950">Need to correct ID or document details?</p><p className="mt-1 text-xs text-orange-800">Edit Aadhaar, PAN, licence, verification fields, and stored document information.</p></div><ActionButton className="shrink-0 px-3 py-2 text-xs" onClick={beginEditing}><PencilLine size={14} />Edit documents</ActionButton></div> : null}
                    {profileTab === "documents" && isEditing ? <div className="mt-5 border-t border-slate-200 pt-5"><div className="sticky top-0 z-10 mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-bold text-slate-950">Edit document details</h4><p className="mt-1 text-xs text-slate-500">Only registration-entered identity and document numbers are editable. Verification and system statuses stay protected.</p></div><div className="flex shrink-0 gap-2"><ActionButton className="px-3 py-2 text-xs" variant="secondary" onClick={cancelEditing}>Cancel</ActionButton><ActionButton className="px-3 py-2 text-xs" disabled={pending} onClick={saveProfile}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={14} />}Save documents</ActionButton></div></div><VerificationRecordEditor documentsOnly json={verificationJson} onChange={setVerificationJson} /></div> : null}
                    {profileTab === "activity" ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-4"><ProfileMetric label="Total orders" value={profileOrders.length.toLocaleString("en-IN")} /><ProfileMetric label="Active" value={activeProfileOrders.length.toLocaleString("en-IN")} /><ProfileMetric label="Completed" value={completedProfileOrders.length.toLocaleString("en-IN")} /><ProfileMetric label="Rating" value={typeof profile.rating === "number" ? profile.rating.toFixed(1) : "-"} /></div>{isDelivery && profileDeliveryRequests.length ? <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent delivery assignments</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{profileDeliveryRequests.slice(0, 6).map((request) => <button className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left" key={request.id} onClick={() => onOpenDeliveryTask(request)} type="button"><span><span className="block text-sm font-bold">{request.taskId ?? request.darjiId ?? request.id}</span><span className="text-[10px] text-slate-500">{formatStatus(request.type)}</span></span><StatusBadge value={request.taskStatus} /></button>)}</div></div> : null}<div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent orders</p><div className="mt-2 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{profileOrders.slice(0, 12).map((profileOrder) => <button className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left" key={profileOrder.id} onClick={() => onOpenOrder(profileOrder)} type="button"><span><span className="block text-sm font-bold">{getOrderDisplayNumber(profileOrder)}</span><span className="text-[10px] text-slate-500">{getCustomerDisplayName(profileOrder.customer)}</span></span><StatusBadge value={profileOrder.status} /></button>)}{!profileOrders.length ? <p className="text-sm text-slate-500">No associated orders.</p> : null}</div></div></div> : null}
                    {isEditing && ["personal", "business", "bank"].includes(profileTab) ? <div className="mt-5 flex justify-end gap-2"><ActionButton variant="secondary" onClick={cancelEditing}>Cancel</ActionButton><ActionButton disabled={pending} onClick={saveProfile}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={15} />}Save profile changes</ActionButton></div> : null}
                  </fieldset>
                  {profileTab === "personal" ? (
                    <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">
                      <DetailBox label="Current availability" value={profile.isAvailable ? "Online" : "Offline"} />
                      <DetailBox label="Verification status" value={formatStatus(profile.verificationStatus ?? "Pending")} />
                      <DetailBox label="Rating" value={typeof profile.rating === "number" ? profile.rating.toFixed(1) : "Not rated"} />
                    </div>
                  ) : null}
                </div>
                {profileTab === "review" && onReview ? (
                  <Panel>
                    <h4 className="text-lg font-semibold text-[var(--foreground)]">Review action</h4>
                    {verificationLocked ? <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><ShieldCheck className="mt-0.5 shrink-0" size={17} /><p><strong>Verification locked.</strong> This profile is verified, so its verification status cannot be rewritten or downgraded.</p></div> : null}
                    <textarea
                      className="mt-3 min-h-24 w-full rounded-2xl border border-[var(--panel-border)] bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] dark:bg-white/5"
                      value={reviewReason}
                      disabled={verificationLocked}
                      onChange={(event) => setReviewReason(event.target.value)}
                      placeholder="Admin feedback or rejection reason..."
                    />
                    {!isDelivery ? (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-[var(--foreground)]">Requested reupload fields</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {[
                            ["aadhaarFront", "Aadhaar front"],
                            ["aadhaarBack", "Aadhaar back"],
                            ["panPhoto", "PAN / licence card"],
                            ["facePhoto", "Face selfie"],
                            ["shopPhotos", "Shop photos"]
                          ].map(([field, label]) => {
                            const checked = selectedReuploadFields.includes(field);
                            return (
                              <label key={field} className="flex items-center gap-2 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2 text-sm dark:bg-white/5">
                                <input
                                  checked={checked}
                                  disabled={verificationLocked}
                                  onChange={() =>
                                    setSelectedReuploadFields((current) =>
                                      checked ? current.filter((item) => item !== field) : [...current, field]
                                    )
                                  }
                                  type="checkbox"
                                />
                                <span>{label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <ActionButton disabled={pending || verificationLocked} onClick={() => onReview({ status: "VERIFIED", deliveryType, assignedArea, reason: reviewReason.trim() || undefined })}>
                        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                        Approve
                      </ActionButton>
                      <ActionButton
                        disabled={pending || verificationLocked || (!isDelivery && selectedReuploadFields.length === 0)}
                        variant="secondary"
                        onClick={() => onReview({ status: "REUPLOAD_REQUIRED", reason: reviewReason.trim() || "Please upload clearer documents.", reuploadFields: selectedReuploadFields })}
                      >
                        Request reupload
                      </ActionButton>
                      <ActionButton disabled={pending || verificationLocked} variant="danger" onClick={() => onReview({ status: "REJECTED", reason: reviewReason.trim() || "Verification documents were not approved." })}>
                        Reject
                      </ActionButton>
                    </div>
                  </Panel>
                ) : null}
                <div className="hidden">
                {isDelivery ? (
                  <Panel>
                    <h4 className="text-lg font-semibold text-[var(--foreground)]">Delivery partner role assignment</h4>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 dark:bg-white/5">
                        <label className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Delivery Type</label>
                        <select
                          className="mt-2 block w-full rounded-lg border border-[var(--panel-border)] bg-transparent py-1 text-sm outline-none text-[var(--foreground)] dark:bg-[var(--panel-strong)]"
                          value={deliveryType}
                          onChange={(e) => setDeliveryType(e.target.value as "PICKUP" | "DROP")}
                        >
                          <option value="PICKUP" className="bg-[var(--panel-strong)] text-[var(--foreground)]">PICKUP</option>
                          <option value="DROP" className="bg-[var(--panel-strong)] text-[var(--foreground)]">DROP</option>
                        </select>
                      </div>
                      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 dark:bg-white/5">
                        <label className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Assigned Area</label>
                        <input
                          type="text"
                          className="mt-2 block w-full rounded-lg border border-[var(--panel-border)] bg-transparent py-1 text-sm outline-none px-2 text-[var(--foreground)]"
                          value={assignedArea}
                          onChange={(e) => setAssignedArea(e.target.value)}
                          placeholder="e.g. Laxmi Nagar"
                        />
                      </div>
                    </div>
                  </Panel>
                ) : null}
                <InspectGrid
                  items={[
                    { label: "Phone", value: profile.user?.phone ?? "-" },
                    { label: "Current status", value: profile.isAvailable ? "Online" : "Offline" },
                    { label: "Verification", value: <StatusBadge value={profile.verificationStatus} /> },
                    { label: "Rating", value: typeof profile.rating === "number" ? profile.rating.toFixed(1) : "-" },
                    ...(isDelivery ? [
                      { label: "Delivery Type", value: (profile as DeliveryPartnerProfile).deliveryType || "PICKUP" },
                      { label: "Assigned Area", value: (profile as DeliveryPartnerProfile).assignedArea || "unassigned" }
                    ] : []),
                    { label: "Working hours", value: formatAdminValue(profile.workingHours) },
                    { label: "Verification reviewed", value: formatDate(profile.verificationReviewedAt, true) },
                    { label: "Requested reuploads", value: Array.isArray((profile as TailorProfile).verificationReuploadFields) ? formatList((profile as TailorProfile).verificationReuploadFields) : "-" },
                    { label: "Can reapply after", value: formatDate((profile as TailorProfile).verificationRejectedUntil, true) },
                    { label: "Rejection reason", value: profile.verificationRejectionReason ?? "—" }
                  ]}
                />
                {"specialization" in profile ? (
                  <>
                    <Panel>
                      <h4 className="text-lg font-semibold">Tailor details</h4>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Shop name</p>
                          <p className="mt-2 text-sm">{profile.shopName ?? "—"}</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Specialization</p>
                          <p className="mt-2 text-sm">{formatList(profile.specialization)}</p>
                        </div>
                      </div>
                    </Panel>
                    <Panel>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-lg font-semibold">Profile samples</h4>
                        <Badge tone="amber">{((profile as TailorProfile).sampleGallery ?? []).filter((sample) => sample.status === "PENDING").length} pending</Badge>
                      </div>
                      {((profile as TailorProfile).sampleGallery ?? []).length ? (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {((profile as TailorProfile).sampleGallery ?? []).map((sample, index) => {
                            const sampleId = sample.id ?? sample._id;
                            return (
                              <div key={sampleId ?? sample.url} className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff]">
                                <a href={sample.url} target="_blank" rel="noreferrer">
                                  <img alt={`Tailor sample ${index + 1}`} className="h-36 w-full object-cover" src={sample.url} />
                                </a>
                                <div className="space-y-3 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-semibold">{sample.originalName ?? `Sample ${index + 1}`}</p>
                                    <StatusBadge value={sample.status} />
                                  </div>
                                  <p className="text-xs text-[var(--muted)]">Uploaded {formatDate(sample.uploadedAt, true)}</p>
                                  {sample.status === "PENDING" && sampleId && onSampleReview ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      <ActionButton className="px-3 py-2 text-xs" disabled={pending} onClick={() => onSampleReview(sampleId, "APPROVED")}>Approve</ActionButton>
                                      <ActionButton className="px-3 py-2 text-xs" disabled={pending} variant="danger" onClick={() => onSampleReview(sampleId, "REJECTED")}>Reject</ActionButton>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--muted)]">No tailor samples uploaded yet.</p>
                      )}
                    </Panel>
                    <Panel>
                      <h4 className="text-lg font-semibold">Earnings</h4>
                      <div className="mt-4">
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Total Earnings</p>
                          <p className="mt-2 text-2xl font-bold">{formatCurrency(profile.earnings ?? 0)}</p>
                        </div>
                      </div>
                    </Panel>
                  </>
                ) : (
                  <Panel>
                    <h4 className="text-lg font-semibold">Earnings</h4>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Daily</p>
                        <p className="mt-2 text-xl font-bold">{formatCurrency((profile as DeliveryPartnerProfile).dailyEarnings ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Weekly</p>
                        <p className="mt-2 text-xl font-bold">{formatCurrency((profile as DeliveryPartnerProfile).weeklyEarnings ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Monthly</p>
                        <p className="mt-2 text-xl font-bold">{formatCurrency((profile as DeliveryPartnerProfile).monthlyEarnings ?? 0)}</p>
                      </div>
                    </div>
                  </Panel>
                )}
                {isDelivery ? (() => {
                  const v = profile.verification as Record<string, unknown> | undefined;
                  const vPersonal = v?.personal as Record<string, unknown> | undefined;
                  const vIdentity = v?.identity as Record<string, unknown> | undefined;
                  const vLicense = v?.license as Record<string, unknown> | undefined;
                  const vVehicle = v?.vehicle as Record<string, unknown> | undefined;
                  const vBank = v?.bank as Record<string, unknown> | undefined;
                  const vPrefs = v?.preferences as Record<string, unknown> | undefined;
                  return (
                    <>
                      {vPersonal && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Personal Details</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["Full Name", vPersonal.fullName],
                              ["Date of Birth", vPersonal.dob],
                              ["Gender", vPersonal.gender],
                              ["Email", vPersonal.email],
                              ["Emergency Contact", vPersonal.emergencyContact],
                              ["Address", vPersonal.address],
                              ["City", vPersonal.city],
                              ["State", vPersonal.state],
                              ["Pincode", vPersonal.pincode],
                            ] as [string, unknown][]).map(([lbl, val]) => val ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                      {vIdentity && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Identity Verification</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["ID Type", vIdentity.identityType],
                              ["Aadhaar No.", vIdentity.aadhaarNumber],
                              ["PAN No.", vIdentity.panNumber],
                              ["OCR Status", vIdentity.ocrStatus],
                              ["Face Status", vIdentity.faceStatus],
                            ] as [string, unknown][]).map(([lbl, val]) => val ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                      {vLicense && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Driving License</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["License No.", vLicense.licenseNumber],
                              ["Expiry Date", vLicense.licenseExpiry],
                            ] as [string, unknown][]).map(([lbl, val]) => val ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                      {vVehicle && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Vehicle Details</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["Vehicle Type", vVehicle.vehicleType],
                              ["Vehicle No.", vVehicle.vehicleNumber],
                              ["Vehicle Model", vVehicle.vehicleModel],
                            ] as [string, unknown][]).map(([lbl, val]) => val ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                      {vBank && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Bank Account</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["Account Holder", vBank.accountHolder],
                              ["Account No.", vBank.accountNumber],
                              ["IFSC Code", vBank.ifsc],
                              ["UPI ID", vBank.upi],
                            ] as [string, unknown][]).map(([lbl, val]) => val ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                      {vPrefs && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Delivery Preferences</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["Availability", vPrefs.availability],
                              ["Working Hours", vPrefs.workingHours],
                              ["Preferred Radius", vPrefs.radius],
                              ["Instant Deliveries", vPrefs.instantDeliveries !== undefined ? (vPrefs.instantDeliveries ? "Yes" : "No") : undefined],
                            ] as [string, unknown][]).map(([lbl, val]) => val !== undefined && val !== null ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                    </>
                  );
                })() : (() => {
                  const v = profile.verification as Record<string, unknown> | undefined;
                  const vPersonal = v?.personal as Record<string, unknown> | undefined;
                  const vShop = v?.shop as Record<string, unknown> | undefined;
                  const vId = v?.idVerification as Record<string, unknown> | undefined;
                  const vRows = v?.specializationRows as Array<Record<string, unknown>> | undefined;
                  return (
                    <>
                      {vPersonal && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Personal Details</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["Name", vPersonal.name],
                              ["Date of Birth", vPersonal.dob],
                              ["Email", vPersonal.email],
                              ["Address", vPersonal.address],
                            ] as [string, unknown][]).map(([lbl, val]) => val ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                      {vShop && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Shop Details</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["Shop Name", vShop.shopName],
                              ["Shop Address", vShop.shopAddress],
                              ["Work From Home", vShop.workFromHome !== undefined ? (vShop.workFromHome ? "Yes" : "No") : undefined],
                              ["GST No.", vShop.gstNumber],
                              ["Employee Count", vShop.employeeCount],
                              ["Years Experience", vShop.yearsExperience],
                              ["Machinery", Array.isArray(vShop.machinery) ? (vShop.machinery as string[]).join(", ") : undefined],
                            ] as [string, unknown][]).map(([lbl, val]) => val !== undefined && val !== null && val !== "" ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                      {vRows && vRows.length > 0 && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">Specialization &amp; Pricing</h4>
                          <div className="overflow-x-auto rounded-xl border border-[var(--panel-border)]">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--panel-border)] bg-[#f8fafc]">
                                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">S. No.</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Gender</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Cloth Type</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Stitching</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Price (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {vRows.map((row, i) => (
                                  <tr key={i} className="border-b border-[var(--panel-border)] last:border-0">
                                    <td className="px-3 py-2 font-semibold tabular-nums text-[var(--muted)]">{i + 1}</td>
                                    <td className="px-3 py-2">{String(row.gender ?? "-")}</td>
                                    <td className="px-3 py-2">{String(row.clothType ?? "-")}</td>
                                    <td className="px-3 py-2">{String(row.stitchingType ?? "-")}</td>
                                    <td className="px-3 py-2 text-right font-semibold">{row.price ? `₹${String(row.price)}` : "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Panel>
                      )}
                      {vId && (
                        <Panel>
                          <h4 className="mb-4 text-base font-semibold">ID Verification</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {([
                              ["ID Type", vId.idType],
                              ["ID Number", vId.idNumber],
                              ["OCR Status", vId.ocrStatus],
                              ["Face Status", vId.faceDetectionStatus],
                            ] as [string, unknown][]).map(([lbl, val]) => val ? (
                              <div key={lbl} className="rounded-xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{lbl}</p>
                                <p className="mt-1 text-sm font-semibold break-all">{String(val)}</p>
                              </div>
                            ) : null)}
                          </div>
                        </Panel>
                      )}
                    </>
                  );
                })()}
                {isDelivery ? <Panel>
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-lg font-semibold">Delivery assignments</h4><p className="mt-1 text-sm text-[var(--muted)]">Active and historical jobs assigned to this partner.</p></div><Badge tone="sky">{profileDeliveryRequests.length} jobs</Badge></div>
                  <div className="mt-4 space-y-2">
                    {profileDeliveryRequests.slice(0, 12).map((request) => <div className="flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" key={request.id}><button className="text-left" onClick={() => onOpenDeliveryTask(request)} type="button"><span className="block font-semibold text-[var(--deep)] underline decoration-sky-300 underline-offset-4">{request.taskId ?? request.darjiId ?? request.id}</span><span className="mt-1 block text-xs text-[var(--muted)]">{formatStatus(request.type)} · {formatDate(request.createdAt, true)}</span></button><span className="flex flex-wrap items-center gap-2"><StatusBadge value={request.taskStatus} />{request.batchId ? <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-white px-2 py-1 text-xs font-semibold hover:border-orange-300" onClick={() => onOpenBatch({ batchId: String(request.batchId), roundAt: request.roundAt ?? request.createdAt ?? new Date().toISOString() })} type="button">Batch {request.batchId.slice(0, 8)}<ChevronRight size={12} /></button> : <Badge tone="slate">Instant / unbatched</Badge>}</span></div>)}
                    {!profileDeliveryRequests.length ? <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-[var(--muted)]">No delivery jobs are linked to this partner.</p> : null}
                  </div>
                </Panel> : null}
                <Panel>
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-lg font-semibold">Associated orders</h4><p className="mt-1 text-sm text-[var(--muted)]">Open an order to review its full customer, fulfilment and payment trail.</p></div><Badge tone="slate">{profileOrders.length} total</Badge></div>
                  <div className="mt-4 space-y-2">
                    {profileOrders.slice(0, 12).map((order) => <button className="grid w-full gap-2 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 text-left transition hover:border-orange-300 hover:bg-orange-50 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center" key={order.id} onClick={() => onOpenOrder(order)} type="button"><span><span className="block font-semibold text-[var(--deep)]">{getOrderDisplayNumber(order)}</span><span className="mt-0.5 block text-xs text-[var(--muted)]">{getCustomerDisplayName(order.customer)}</span></span><span className="text-xs text-[var(--muted)]">{formatDate(order.createdAt, true)}</span><span className="flex items-center gap-2"><StatusBadge value={order.status} /><ChevronRight size={15} /></span></button>)}
                    {!profileOrders.length ? <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-[var(--muted)]">No linked orders are available for this profile.</p> : null}
                    {profileOrders.length > 12 ? <p className="text-center text-xs text-[var(--muted)]">Showing the 12 most recently loaded records.</p> : null}
                  </div>
                </Panel>
                <VerificationMediaGallery items={submittedMedia} title="Uploaded verification documents" />
                <VerificationMediaGallery items={draftMedia} title="Draft verification documents" />
                </div>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UserDialog({
  onActivate,
  onBan,
  onOpenOrder,
  onSuspend,
  open,
  pending,
  setOpen,
  user
}: {
  onActivate: () => void;
  onBan: () => void;
  onOpenOrder: (order: CustomerProfileOrder) => void | Promise<void>;
  onSuspend: () => void;
  open: boolean;
  pending: boolean;
  setOpen: (open: boolean) => void;
  user: AdminUser | null;
}) {
  const [tab, setTab] = useState<"activity" | "orders" | "access">("activity");
  const [orderSearch, setOrderSearch] = useState("");
  const profileQuery = useQuery({
    queryKey: ["admin", "customer-profile", user?.id],
    queryFn: () => getCustomerProfile(user!.id),
    enabled: open && Boolean(user?.id),
    refetchInterval: open ? 15000 : false,
    refetchIntervalInBackground: false
  });
  useEffect(() => {
    if (!open) return;
    setTab("activity");
    setOrderSearch("");
  }, [open, user?.id]);
  const profile = profileQuery.data;
  const customer = profile?.customer ?? user;
  const customerCoordinates = profile?.customer.currentLocation?.coordinates;
  const locationUpdatedAtMs = profile?.customer.locationUpdatedAt ? new Date(profile.customer.locationUpdatedAt).getTime() : Number.NaN;
  const customerLocationIsLive = Number.isFinite(locationUpdatedAtMs) && Date.now() - locationUpdatedAtMs <= 90000;
  const customerLongitude = customerCoordinates?.[0];
  const customerLatitude = customerCoordinates?.[1];
  const customerMapUrl = customerLatitude != null && customerLongitude != null
    ? `https://www.google.com/maps?q=${customerLatitude},${customerLongitude}`
    : undefined;
  const displayName = customer ? getCustomerDisplayName(customer) : "Customer";
  const customerFallbackAvatar = getCustomerFallbackAvatarUrl(customer);
  const visibleOrders = (profile?.orders ?? []).filter((order) => {
    const needle = orderSearch.trim().toLowerCase();
    return !needle || [order.publicId, order.orderNumber, order.title, order.status, order.paymentStatus].some((value) => String(value ?? "").toLowerCase().includes(needle));
  });
  const profileMetrics: Array<{ label: string; value: string | number; icon: ComponentType<{ className?: string }> }> = profile ? [
    { label: "Lifetime orders", value: profile.stats.totalOrders, icon: PackageCheck },
    { label: "Active", value: profile.stats.activeOrders, icon: Hourglass },
    { label: "Completed", value: profile.stats.completedOrders, icon: CheckCircle2 },
    { label: "Cancelled", value: profile.stats.cancelledOrders, icon: X },
    { label: "Paid lifetime", value: formatCurrency(profile.stats.paidTotal), icon: ReceiptIndianRupee }
  ] : [];

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-3 right-3 top-3 z-50 w-[min(96vw,980px)] overflow-y-auto rounded-[28px] border border-[var(--panel-border)] bg-[#fffdfa] shadow-[0_28px_80px_rgba(15,23,42,0.3)]">
          {user ? (
            <>
              <div className="sticky top-0 z-20 border-b border-[#efe1ca] bg-[#fffdfa]/95 px-5 py-4 backdrop-blur-xl">
                <Dialog.Close asChild><button aria-label="Close customer profile" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[#efd9b5] bg-white transition hover:bg-orange-50" type="button"><X size={18} /></button></Dialog.Close>
                <div className="flex flex-col gap-5 pr-12 md:flex-row md:items-center">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white bg-[#fff3df] shadow-lg">
                    <img
                      alt="Customer profile"
                      className="h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = customerFallbackAvatar; }}
                      src={customer?.avatarUrl || customerFallbackAvatar}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Dialog.Title className="text-2xl font-bold tracking-[-0.03em] text-[var(--deep)]">{displayName}</Dialog.Title>
                      <Badge tone="slate">Customer</Badge>
                      <StatusBadge value={customer?.accountStatus} />
                    </div>
                    <Dialog.Description className="mt-1 text-sm font-bold text-orange-600">{customer?.darjiCustomerId ?? "Assigning customer ID…"}</Dialog.Description>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1.5"><Phone size={13} />{customer?.phone ?? "No phone"}</span>
                      <span className="inline-flex items-center gap-1.5"><Mail size={13} />{customer?.email ?? "Email not added"}</span>
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />Joined {formatDate(customer?.createdAt, true)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customer?.phone ? <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#efd9b5] bg-white px-4 text-sm font-semibold hover:bg-orange-50" href={`tel:${customer.phone}`}><PhoneCall size={15} />Call</a> : null}
                    {customer?.email ? <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#efd9b5] bg-white px-4 text-sm font-semibold hover:bg-orange-50" href={`mailto:${customer.email}`}><Mail size={15} />Email</a> : null}
                  </div>
                </div>
              </div>
              <div className="space-y-5 p-5">
                {profileQuery.isLoading ? <LoadingState label="Loading complete customer profile..." /> : null}
                {profileQuery.isError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p className="font-bold">Customer profile could not be loaded.</p><p className="mt-1">{extractError(profileQuery.error)}</p><button className="mt-3 font-semibold underline" onClick={() => profileQuery.refetch()} type="button">Retry</button></div> : null}
                {profile ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {profileMetrics.map(({ label, value, icon: Icon }) => <Panel className="rounded-2xl p-4" key={label}><div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--muted)]">{label}</p><Icon className="h-4 w-4 text-orange-500" /></div><p className="mt-3 text-xl font-bold text-[var(--deep)]">{String(value)}</p></Panel>)}
                    </div>
                    <div className="flex gap-2 overflow-x-auto border-b border-[#efe1ca] pb-3">
                      {(["activity", "orders", "access"] as const).map((item) => <button className={cn("rounded-xl px-4 py-2 text-sm font-semibold capitalize transition", tab === item ? "bg-[#f6a313] text-[#241706]" : "bg-white text-[var(--muted)] hover:bg-orange-50")} key={item} onClick={() => setTab(item)} type="button">{item === "orders" ? `Orders (${profile.stats.totalOrders})` : item}</button>)}
                    </div>
                    {tab === "activity" ? (
                      <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
                        <Panel className="rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold text-[var(--deep)]">Recent activity</h3><p className="mt-1 text-xs text-[var(--muted)]">Real events reconstructed from saved customer records.</p></div><Badge tone="slate">Latest {profile.recentActivity.length}</Badge></div><div className="mt-4 divide-y divide-[#f1e5d3]">{profile.recentActivity.length ? profile.recentActivity.map((item) => <div className="flex gap-3 py-3" key={item.id}><span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", item.tone === "danger" ? "bg-rose-500" : item.tone === "success" ? "bg-emerald-500" : "bg-orange-400")} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-semibold">{item.title}</p><span className="text-[11px] text-[var(--muted)]">{formatDate(item.timestamp, true)}</span></div>{item.detail ? <p className="mt-1 text-xs text-[var(--muted)]">{item.detail}</p> : null}</div></div>) : <EmptyState message="No customer activity has been recorded yet." />}</div></Panel>
                <div className="space-y-4"><Panel className="rounded-2xl p-5"><h3 className="font-bold">Contact details</h3><InspectGrid items={[{ label: "Customer ID", value: profile.customer.darjiCustomerId ?? "-" }, { label: "Phone", value: profile.customer.phone }, { label: "Email", value: profile.customer.email ?? "Not added" }, { label: "Language", value: profile.access.preferredLanguage === "hi" ? "Hindi" : "English" }]} /></Panel><Panel className="rounded-2xl p-5"><div className="flex items-center justify-between"><h3 className="font-bold">Saved addresses</h3><Badge tone="slate">{profile.addresses.length}</Badge></div><div className="mt-3 space-y-2">{profile.addresses.length ? profile.addresses.slice(0, 4).map((address) => <div className="rounded-xl bg-[#fff8ed] p-3 text-xs" key={address.id}><p className="font-semibold">{address.name}{address.isDefault ? " · Default" : ""}</p><p className="mt-1 text-[var(--muted)]">{[address.line1, address.line2, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p></div>) : <p className="text-xs text-[var(--muted)]">No saved addresses.</p>}</div></Panel><Panel className="rounded-2xl p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><h3 className="font-bold">Customer location</h3><Badge tone={customerLocationIsLive ? "emerald" : "slate"}>{customerLocationIsLive ? "Live now" : "Last known"}</Badge></div><MapPin className="text-orange-500" size={17} /></div><p className="mt-1 text-xs text-[var(--muted)]">The customer app shares location only with foreground permission while it is open. This panel refreshes every 15 seconds.</p>{customerMapUrl && customerLatitude != null && customerLongitude != null ? <div className="mt-3 rounded-xl bg-[#fff8ed] p-3"><p className="text-sm font-semibold">{customerLatitude.toFixed(5)}, {customerLongitude.toFixed(5)}</p><p className="mt-1 text-xs text-[var(--muted)]">Updated {formatDate(profile.customer.locationUpdatedAt, true)}{profile.customer.locationAccuracy != null ? ` · ±${Math.round(profile.customer.locationAccuracy)} m` : ""}</p><a className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 underline" href={customerMapUrl} target="_blank" rel="noreferrer"><MapPin size={13} />Open in Maps</a></div> : <p className="mt-3 rounded-xl bg-[#fff8ed] p-3 text-xs text-[var(--muted)]">No saved location yet. It will appear after the customer grants foreground location permission and opens the app.</p>}</Panel></div>
                      </div>
                    ) : null}
                    {tab === "orders" ? (
                      <Panel className="rounded-2xl p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Lifetime order history</h3><p className="mt-1 text-xs text-[var(--muted)]">Placed, completed, and cancelled orders from both Darji order systems.</p></div><input className="h-10 rounded-xl border border-[var(--panel-border)] bg-white px-3 text-sm outline-none focus:border-orange-400" onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search orders" value={orderSearch} /></div><div className="mt-4 space-y-2">{visibleOrders.length ? visibleOrders.map((order) => <button className="flex w-full flex-col gap-3 rounded-2xl border border-[#efe1ca] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between" key={`${order.source}-${order.id}`} onClick={() => onOpenOrder(order)} type="button"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[var(--deep)]">{order.publicId}</p><Badge tone="slate">{order.source === "TAILORING_REQUEST" ? "Custom tailoring" : "Standard"}</Badge></div><p className="mt-1 text-sm text-[var(--muted)]">{order.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{formatDate(order.placedAt, true)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="font-bold">{formatCurrency(order.amount)}</p><p className="text-xs text-[var(--muted)]">{formatStatus(order.paymentStatus)}</p></div><StatusBadge value={order.status} /><ChevronRight size={18} className="text-orange-500" /></div></button>) : <EmptyState message={orderSearch ? "No lifetime orders match this search." : "This customer has not placed an order yet."} />}</div></Panel>
                    ) : null}
                    {tab === "access" ? (
                      <div className="grid gap-4 lg:grid-cols-3"><Panel className="rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">Account access</h3><p className="mt-1 text-xs text-[var(--muted)]">Live backend access and moderation state.</p></div><ShieldCheck className="text-orange-500" /></div><InspectGrid items={[{ label: "Account", value: <StatusBadge value={profile.access.accountStatus} /> }, { label: "Suspended until", value: formatDate(profile.access.suspendedUntil, true) }, { label: "Moderation note", value: profile.access.moderationReason ?? "-" }, { label: "Push registered", value: profile.access.hasPushRegistration ? "Yes" : "No" }, { label: "Registered apps", value: profile.access.registeredApps.length ? profile.access.registeredApps.join(", ") : "None" }]} /><div className="mt-4 flex flex-wrap gap-2">{user.role === "ADMIN" ? <Badge tone="slate">Admin account is protected from moderation.</Badge> : <><ActionButton disabled={pending} onClick={onActivate}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Activate</ActionButton><ActionButton disabled={pending} variant="secondary" onClick={onSuspend}>Suspend 7 days</ActionButton><ActionButton disabled={pending} variant="danger" onClick={onBan}>Ban user</ActionButton></>}</div></Panel><Panel className="rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">Device permissions</h3><p className="mt-1 text-xs text-[var(--muted)]">Latest status reported by the customer app.</p></div><ShieldCheck className="text-orange-500" /></div><div className="mt-4 space-y-2">{profile.access.devicePermissions ? <>{Object.entries(profile.access.devicePermissions.permissions).map(([key, status]) => <div className="flex items-center justify-between rounded-xl bg-[#fff8ed] px-3 py-2.5" key={key}><span className="text-sm font-medium">{formatStatus(key)}</span><Badge tone={status === "granted" ? "emerald" : status === "denied" ? "rose" : "slate"}>{formatStatus(status)}</Badge></div>)}<p className="pt-2 text-[11px] text-[var(--muted)]">{formatStatus(profile.access.devicePermissions.platform)} · Reported {formatDate(profile.access.devicePermissions.reportedAt, true)}</p></> : <p className="text-sm text-[var(--muted)]">Not reported yet. The next updated customer-app session will sync it.</p>}</div></Panel><Panel className="rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">Notification preferences</h3><p className="mt-1 text-xs text-[var(--muted)]">Choices saved by the customer.</p></div><Bell className="text-orange-500" /></div><div className="mt-4 space-y-2">{Object.entries(profile.access.notificationPreferences).length ? Object.entries(profile.access.notificationPreferences).map(([key, enabled]) => <div className="flex items-center justify-between rounded-xl bg-[#fff8ed] px-3 py-2.5" key={key}><span className="text-sm font-medium">{formatStatus(key)}</span><Badge tone={enabled ? "emerald" : "slate"}>{enabled ? "Allowed" : "Off"}</Badge></div>) : <p className="text-sm text-[var(--muted)]">No preferences have been reported.</p>}</div></Panel></div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </>
) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InspectTicketDialog({
  open,
  ticket,
  setOpen,
  users,
  orders,
  onOpenOrder,
  onOpenCustomer
}: {
  open: boolean;
  ticket: SupportTicket | null;
  setOpen: (open: boolean) => void;
  users: AdminUser[];
  orders: Order[];
  onOpenOrder: (order: Order) => void;
  onOpenCustomer: (customer: AdminUser) => void;
}) {
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("RESOLVED");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && ticket) {
      setReply("");
      setStatus(ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status);
    }
  }, [open, ticket]);

  const mutation = useMutation({
    mutationFn: replyToSupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support-stats"] });
      setReply("");
      setOpen(false);
      toast.success("Ticket reply sent");
    },
    onError: (err) => {
      toast.error(extractError(err));
    }
  });

  const updateMutation = useMutation({
    mutationFn: replyToSupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "support"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support-stats"] });
      toast.success("Ticket updated successfully");
    },
    onError: (err) => {
      toast.error(extractError(err));
    }
  });

  if (!ticket) return null;

  const admins = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN");
  const linkedOrder = orders.find(
    (o) => o.id === ticket.orderId || o.orderNumber === ticket.order?.orderNumber
  );

  function handleSendReply() {
    if (!ticket) return;
    mutation.mutate({
      ticketId: ticket.id,
      adminResponse: reply.trim(),
      status
    });
  }

  function handleStatusChange(newStatus: string) {
    if (!ticket) return;
    setStatus(newStatus);
    updateMutation.mutate({
      ticketId: ticket.id,
      status: newStatus
    });
  }

  function handlePriorityChange(newPriority: string) {
    if (!ticket) return;
    updateMutation.mutate({
      ticketId: ticket.id,
      priority: newPriority
    });
  }

  function handleAssigneeChange(newAssignee: string | null) {
    if (!ticket) return;
    updateMutation.mutate({
      ticketId: ticket.id,
      assignedTo: newAssignee
    });
  }

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(96vw,840px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-[var(--foreground)]">
                {ticket.subject}
              </Dialog.Title>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <span>Category: <strong className="text-[var(--foreground)]">{ticket.category ?? "General"}</strong></span>
                <span>-</span>
                <span>Opened: <strong>{formatDate(ticket.createdAt, true)}</strong></span>
                <span>Ticket ID: <strong>{ticket.darjiId ?? "Darji ID pending"}</strong></span>
              </div>
            </div>
            <Dialog.Close className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <X size={20} className="text-[var(--muted)] hover:text-[var(--foreground)]" />
            </Dialog.Close>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-12">
            {/* Left Column: Chat Conversation Thread */}
            <div className="md:col-span-7 flex flex-col space-y-4">
              <Panel className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-[var(--panel-border)] rounded-2xl overflow-hidden p-0 h-[400px]">
                {/* Chat bubbles container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50/10 dark:bg-slate-955/20">
                  {/* Customer Message Bubble */}
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                      {ticket.user?.name ? ticket.user.name.slice(0, 2).toUpperCase() : "CU"}
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-[var(--foreground)]">
                          {ticket.user?.name ?? ticket.user?.phone ?? "Customer"}
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">
                          {formatDate(ticket.createdAt, true)}
                        </span>
                      </div>
                      <div className="leading-1.5 flex flex-col p-3.5 bg-white dark:bg-slate-800 rounded-e-2xl rounded-es-2xl shadow-sm border border-gray-100 dark:border-none">
                        <p className="text-sm font-normal text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {ticket.message}
                        </p>
                        
                        {/* Attachments */}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <div className="mt-3 border-t border-gray-100 dark:border-slate-700 pt-2">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] mb-1.5">Attachments</p>
                            <div className="flex flex-wrap gap-2">
                              {ticket.attachments.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative block h-14 w-14 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 hover:opacity-80 transition bg-gray-50"
                                >
                                  {url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                    <img src={url} alt={`Attachment ${idx + 1}`} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[9px] text-gray-500 font-bold uppercase p-1 text-center">
                                      File
                                    </div>
                                  )}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Reply Message Bubble */}
                  {ticket.adminResponse && (
                    <div className="flex items-start gap-2.5 max-w-[85%] self-end flex-row-reverse">
                      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-slate-700 text-white text-xs font-bold">
                        AD
                      </div>
                      <div className="flex flex-col gap-1 w-full items-end">
                        <div className="flex items-center space-x-2 flex-row-reverse gap-2">
                          <span className="text-xs font-semibold text-[var(--foreground)]">
                            Darji Support
                          </span>
                          <span className="text-[10px] text-[var(--muted)]">
                            {formatDate(ticket.updatedAt, true)}
                          </span>
                        </div>
                        <div className="leading-1.5 flex flex-col p-3.5 bg-[#f6a313] text-white rounded-s-2xl rounded-ee-2xl shadow-sm">
                          <p className="text-sm font-normal whitespace-pre-wrap">
                            {ticket.adminResponse}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Reply Box */}
              <div className="space-y-3">
                <textarea
                  className="w-full min-h-[80px] rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-3 text-sm outline-none text-[var(--foreground)] focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition resize-none"
                  placeholder="Type your response..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--muted)]">Next status:</span>
                    <select
                      className="h-8 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-2 text-xs outline-none text-[var(--foreground)]"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <ActionButton
                    onClick={handleSendReply}
                    disabled={mutation.isPending || reply.trim().length < 2}
                  >
                    {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Send Reply
                  </ActionButton>
                </div>
              </div>
            </div>

            {/* Right Column: Ticket Info & Actions */}
            <div className="md:col-span-5 space-y-4">
              {/* Customer Profile Card */}
              <button className="block w-full rounded-2xl text-left transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => {
                const customer = users.find((candidate) => candidate.id === ticket.userId) ?? (ticket.user ? { ...ticket.user, id: ticket.userId } as AdminUser : null);
                if (customer) onOpenCustomer(customer);
              }} type="button">
              <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] rounded-2xl p-4">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-3">
                  User Profile
                </h4>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 uppercase">
                    {ticket.user?.name ? ticket.user.name.slice(0, 2) : "CU"}
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm text-[var(--foreground)]">
                      {getCustomerDisplayName(ticket.user)}
                    </h5>
                    <p className="text-xs text-[var(--muted)]">{ticket.user?.phone}</p>
                    <p className="text-[11px] text-[var(--muted)]">{ticket.user?.email ?? "No email address"}</p>
                  </div>
                </div>
              </Panel>
              </button>

              {/* Linked Order Card */}
              {ticket.orderId || ticket.order ? (
                <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] rounded-2xl p-4">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-3">
                    Linked Order
                  </h4>
                  {linkedOrder ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[var(--foreground)]">
                          {linkedOrder.orderNumber}
                        </span>
                        <StatusBadge value={linkedOrder.status} />
                      </div>
                      <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                        <p>Total amount: <strong className="text-[var(--foreground)]">{formatCurrency(linkedOrder.totalAmount)}</strong></p>
                        <p>Payment: <strong className="text-[var(--foreground)]">{linkedOrder.paymentMethod}</strong></p>
                        <p>Items: <strong>{(linkedOrder.items ?? []).map(it => it.service?.name ?? "Custom Stitch").join(", ")}</strong></p>
                      </div>
                      <button
                        onClick={() => {
                          setOpen(false);
                          onOpenOrder(linkedOrder);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-orange-200 text-orange-600 font-medium text-xs hover:bg-orange-50 transition"
                      >
                        <Search size={12} />
                        Inspect Order Details
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">
                        Order #{ticket.order?.orderNumber || ticket.orderId}
                      </p>
                      <p className="text-[11px] text-[var(--muted)] mt-1">Order details not fully loaded.</p>
                    </div>
                  )}
                </Panel>
              ) : null}

              {/* Ticket Controls Panel */}
              <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] rounded-2xl p-4 space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-1">
                  Ticket Controls
                </h4>

                {/* Assignee */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--muted)]">Assign To</label>
                  <select
                    className="w-full h-9 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 text-xs outline-none text-[var(--foreground)]"
                    value={ticket.assignedTo ?? ""}
                    onChange={(e) => handleAssigneeChange(e.target.value || null)}
                    disabled={updateMutation.isPending}
                  >
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name ?? admin.phone}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--muted)]">Ticket Priority</label>
                  <select
                    className="w-full h-9 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 text-xs outline-none text-[var(--foreground)]"
                    value={ticket.priority ?? "MEDIUM"}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    disabled={updateMutation.isPending}
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--muted)]">Support Status</label>
                  <select
                    className="w-full h-9 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 text-xs outline-none text-[var(--foreground)]"
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updateMutation.isPending}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                {/* Instant Actions */}
                <div className="border-t border-[var(--panel-border)] pt-3 flex gap-2">
                  <button
                    onClick={() => handleStatusChange("RESOLVED")}
                    disabled={updateMutation.isPending || ticket.status === "RESOLVED"}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-50"
                  >
                    Resolve Ticket
                  </button>
                  <button
                    onClick={() => handleStatusChange("CLOSED")}
                    disabled={updateMutation.isPending || ticket.status === "CLOSED"}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    Close Ticket
                  </button>
                </div>
              </Panel>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InspectBugReportDialog({
  open,
  bug,
  setOpen,
  users,
  onUpdate
}: {
  open: boolean;
  bug: BugReport | null;
  setOpen: (open: boolean) => void;
  users: AdminUser[];
  onUpdate: (params: { bugId: string; status?: string; assignedTo?: string | null }) => void;
}) {
  const [status, setStatus] = useState("NEW");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  useEffect(() => {
    if (open && bug) {
      setStatus(bug.status);
      setAssignedTo(bug.assignedTo ?? null);
    }
  }, [open, bug]);

  if (!bug) return null;

  const admins = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN");

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-[var(--foreground)]">
                Bug Report: {bug.title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[var(--muted)]">
                Submitted by {getUserDisplayName(bug.user, "Reporter")} ({bug.user?.phone ?? "No phone"})
              </Dialog.Description>
              <span className="mt-2 inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">Bug ID: {bug.darjiId ?? "Darji ID pending"}</span>
            </div>
            <Dialog.Close className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <X size={20} className="text-[var(--muted)] hover:text-[var(--foreground)]" />
            </Dialog.Close>
          </div>

          <div className="mt-6 space-y-6">
            <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] p-4 rounded-2xl">
              <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-2">Description</h4>
              <p className="text-sm whitespace-pre-wrap text-[var(--foreground)]">{bug.description}</p>
            </Panel>

            <InspectGrid
              items={[
                { label: "App Version", value: bug.appVersion ?? "0.1.0" },
                { label: "Device Info", value: bug.deviceInfo ?? "Unknown" },
                { label: "Submitted At", value: formatDate(bug.createdAt, true) },
                { label: "Current Status", value: <StatusBadge value={bug.status} /> }
              ]}
            />

            {bug.screenshot && (
              <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] p-4 rounded-2xl">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-3">Screenshot</h4>
                <a href={bug.screenshot} target="_blank" rel="noreferrer" className="block max-w-[280px] hover:opacity-90 transition">
                  <img src={bug.screenshot} alt="Bug screenshot" className="rounded-xl border border-[var(--panel-border)] max-h-60 object-contain bg-slate-50" />
                </a>
              </Panel>
            )}

            <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] p-4 rounded-2xl space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">Resolution Controls</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted)]">Status</label>
                  <select
                    className="w-full h-10 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 text-sm outline-none text-[var(--foreground)]"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="NEW">New</option>
                    <option value="INVESTIGATING">Investigating</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="FIXED">Fixed</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted)]">Assign To</label>
                  <select
                    className="w-full h-10 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 text-sm outline-none text-[var(--foreground)]"
                    value={assignedTo ?? ""}
                    onChange={(e) => setAssignedTo(e.target.value || null)}
                  >
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name ?? admin.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <ActionButton onClick={() => onUpdate({ bugId: bug.id, status, assignedTo })}>
                  Save Bug Details
                </ActionButton>
              </div>
            </Panel>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InspectChangeRequestDialog({
  open,
  request,
  setOpen,
  onApprove,
  onReject,
  pending
}: {
  open: boolean;
  request: AccountChangeRequest | null;
  setOpen: (open: boolean) => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, adminNotes: string) => void;
  pending: boolean;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (open && request) {
      setAdminNotes(request.adminNotes ?? "");
      setShowRejectForm(false);
    }
  }, [open, request]);

  if (!request) return null;

  function renderRequestedValues() {
    const vals = request?.requestedValues || {};
    return (
      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        {Object.entries(vals).map(([key, val]) => (
          <div key={key} className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{key}</p>
            <p className="mt-1 font-semibold text-[var(--foreground)]">{String(val ?? "-")}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-[var(--foreground)]">
                {request.type === "AccountDeletion" ? "Account Deletion Request" : "Account Update Request"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[var(--muted)]">
                From {getUserDisplayName(request.user, "Darji user")} ({request.user?.phone ?? "No phone"}) - Role: <strong>{request.user?.role ?? request.userRole}</strong>
              </Dialog.Description>
              <span className="mt-2 inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">Request ID: {request.darjiId ?? "Darji ID pending"}</span>
            </div>
            <Dialog.Close className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <X size={20} className="text-[var(--muted)] hover:text-[var(--foreground)]" />
            </Dialog.Close>
          </div>

          <div className="mt-6 space-y-6">
            <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--panel-border)] pb-3">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Requested Change: <strong className="text-orange-500">{request.type}</strong>
                </span>
                <StatusBadge value={request.status} />
              </div>
              {renderRequestedValues()}
            </Panel>

            {request.documents && request.documents.length > 0 && (
              <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] p-4 rounded-2xl">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-3">Verification Documents</h4>
                <div className="flex flex-wrap gap-3">
                  {request.documents.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-w-[200px] hover:opacity-90 transition bg-slate-50 border border-[var(--panel-border)] rounded-xl overflow-hidden"
                    >
                      {url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                        <img src={url} alt={`Document ${idx + 1}`} className="max-h-40 object-contain w-full" />
                      ) : (
                        <div className="flex h-24 w-32 items-center justify-center p-3 text-xs text-gray-500 font-bold uppercase text-center">
                          View File
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </Panel>
            )}

            {request.status === "PENDING" && (
              <div className="space-y-4">
                {showRejectForm ? (
                  <Panel className="border border-red-200 bg-red-50/10 p-4 rounded-2xl space-y-3">
                    <label className="text-xs font-semibold text-red-700">Reason for Rejection</label>
                    <textarea
                      className="w-full min-h-[80px] rounded-xl border border-red-200 bg-[var(--panel-strong)] p-3 text-sm outline-none text-[var(--foreground)] focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition resize-none"
                      placeholder="Explain to the partner why this request is rejected..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="py-1.5 px-3 rounded-xl text-xs font-medium bg-gray-100 hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onReject(request.id, adminNotes.trim())}
                        disabled={pending || adminNotes.trim().length < 4}
                        className="py-1.5 px-3 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
                      >
                        {pending ? <LoaderCircle className="h-3 w-3 animate-spin mr-1.5" /> : null}
                        Confirm Reject
                      </button>
                    </div>
                  </Panel>
                ) : (
                  <div className="flex justify-end gap-3 border-t border-[var(--panel-border)] pt-4">
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="py-2.5 px-5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition"
                    >
                      Reject Request
                    </button>
                    <ActionButton
                      onClick={() => {
                        if (request.type !== "AccountDeletion" || window.confirm("Permanently delete this Darji account? This action cannot be undone.")) {
                          onApprove(request.id);
                        }
                      }}
                      disabled={pending}
                    >
                      {pending ? <LoaderCircle className="h-4 w-4 animate-spin mr-1.5" /> : null}
                      {request.type === "AccountDeletion" ? "Approve & Delete Account" : "Approve & Write-back Profile"}
                    </ActionButton>
                  </div>
                )}
              </div>
            )}

            {request.status !== "PENDING" && request.adminNotes && (
              <Panel className="border border-[var(--panel-border)] bg-[var(--panel)] p-4 rounded-2xl">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[var(--muted)] mb-2">Admin Notes</h4>
                <p className="text-sm italic text-[var(--muted)]">{request.adminNotes}</p>
              </Panel>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


function PermanentDeleteOrderDialog({
  onClose,
  onConfirm,
  open,
  order,
  pending
}: {
  onClose: () => void;
  onConfirm: (confirmation: string) => void;
  open: boolean;
  order: Order | null;
  pending: boolean;
}) {
  const identifier = order ? getOrderDisplayNumber(order) : "";
  const phrase = identifier ? `DELETE ${identifier}` : "";
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => setConfirmation(""), [order?.id, open]);
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-red-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={22} /></span>
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-950">Permanently delete this order?</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">This removes the order and its linked quotes, delivery tasks, payment records, reviews, internal notes, and batch references from Darji. This cannot be undone.</Dialog.Description>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Type this phrase exactly</p>
            <p className="mt-2 select-all font-mono text-sm font-bold text-red-900">{phrase}</p>
          </div>
          <input autoFocus className="mt-4 h-12 w-full rounded-xl border border-slate-300 px-4 font-mono text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" onChange={(event) => setConfirmation(event.target.value)} placeholder={phrase} value={confirmation} />
          <div className="mt-6 flex justify-end gap-3">
            <ActionButton disabled={pending} variant="secondary" onClick={onClose}>Keep Order</ActionButton>
            <ActionButton disabled={pending || confirmation !== phrase} variant="danger" onClick={() => onConfirm(confirmation)}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 size={15} />} Delete Permanently</ActionButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PartnerProximitySearch({ customers, onOpen, role }: { customers: AdminUser[]; onOpen: (profile: TailorProfile | DeliveryPartnerProfile) => void; role: "TAILOR" | "DELIVERY_PARTNER" }) {
  const [mode, setMode] = useState<"address" | "customer">("address");
  const [address, setAddress] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState<{ address?: string; customerId?: string } | null>(null);
  const result = useQuery({
    queryKey: ["admin", "proximity-search", role, search?.address, search?.customerId],
    queryFn: () => getAdminAssignmentCandidates<TailorProfile | DeliveryPartnerProfile>({ role, ...search! }),
    enabled: Boolean(search),
    staleTime: 60_000
  });
  const label = role === "TAILOR" ? "tailors" : "delivery partners";
  const formatDistance = (meters: number | null) => meters == null ? "Distance unavailable" : meters < 1000 ? `${meters} m away` : `${(meters / 1000).toFixed(1)} km away`;
  return <Panel className="rounded-2xl p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2"><MapPin className="text-orange-500" size={18} /><h3 className="font-bold">Find nearest {label}</h3></div><p className="mt-1 text-xs text-[var(--muted)]">Search from an address or a customer&apos;s saved address. Results are ordered nearest to farthest.</p></div><div className="flex flex-col gap-2 sm:flex-row"><FilterSelect value={mode} onChange={(value) => { setMode(value as "address" | "customer"); setSearch(null); }} options={[{ label: "Search by address", value: "address" }, { label: "Search by customer", value: "customer" }]} />{mode === "address" ? <input className="h-12 min-w-[280px] rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none focus:border-orange-400" placeholder="Enter area or full address" value={address} onChange={(event) => setAddress(event.target.value)} /> : <select className="h-12 min-w-[280px] rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm outline-none" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{getCustomerDisplayName(customer)} · {customer.phone}</option>)}</select>}<ActionButton disabled={result.isFetching || (mode === "address" ? address.trim().length < 3 : !customerId)} onClick={() => setSearch(mode === "address" ? { address: address.trim() } : { customerId })}>{result.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search size={15} />}Find nearest</ActionButton></div></div>{result.isError ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{extractError(result.error)}</p> : null}{result.data ? <div className="mt-4"><p className="text-xs font-semibold text-[var(--muted)]">Distances from {result.data.originLabel}</p><div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">{result.data.candidates.map((candidate, index) => { const profile = candidate.profile; const name = role === "TAILOR" ? getTailorDisplayName(profile as TailorProfile) : getPartnerDisplayName(profile as DeliveryPartnerProfile); const id = role === "TAILOR" ? (profile as TailorProfile).darjiTailorId : (profile as DeliveryPartnerProfile).darjiPartnerId; return <button className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--panel-border)] bg-white px-4 py-3 text-left transition hover:border-orange-300 hover:bg-orange-50" key={profile.id} onClick={() => onOpen(profile)} type="button"><span className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-50 text-xs font-bold text-orange-700">{index + 1}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{name}</span><span className="block truncate text-xs text-[var(--muted)]">{id ?? "Darji ID pending"} · {candidate.locationLabel}</span></span></span><span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold">{formatDistance(candidate.distanceMeters)}</span></button>; })}</div></div> : null}</Panel>;
}

function AssignOrderDialog({
  onOpenPartner,
  onOpenTailor,
  onSubmit,
  open,
  order,
  partners,
  pending,
  setAssignDeliveryPartnerId,
  setAssignPickupPartnerId,
  setAssignTailorId,
  setOpen,
  tailors,
  values
}: {
  onOpenPartner: (profile: DeliveryPartnerProfile) => void;
  onOpenTailor: (profile: TailorProfile) => void;
  onSubmit: () => void;
  open: boolean;
  order: Order | null;
  partners: DeliveryPartnerProfile[];
  pending: boolean;
  setAssignDeliveryPartnerId: (value: string) => void;
  setAssignPickupPartnerId: (value: string) => void;
  setAssignTailorId: (value: string) => void;
  setOpen: (open: boolean) => void;
  tailors: TailorProfile[];
  values: {
    deliveryPartnerId: string;
    pickupPartnerId: string;
    tailorId: string;
  };
}) {
  const tailorCandidatesQuery = useQuery({
    queryKey: ["admin", "assignment-candidates", "TAILOR", order?.id],
    queryFn: () => getAdminAssignmentCandidates<TailorProfile>({ role: "TAILOR", orderId: order!.id }),
    enabled: open && Boolean(order?.id),
    staleTime: 60_000
  });
  const partnerCandidatesQuery = useQuery({
    queryKey: ["admin", "assignment-candidates", "DELIVERY_PARTNER", order?.id],
    queryFn: () => getAdminAssignmentCandidates<DeliveryPartnerProfile>({ role: "DELIVERY_PARTNER", orderId: order!.id }),
    enabled: open && Boolean(order?.id),
    staleTime: 60_000
  });
  const profileLocation = (profile: TailorProfile | DeliveryPartnerProfile) => {
    const verification = (profile.verification ?? profile.verificationDraft ?? {}) as Record<string, any>;
    const value = verification.shop?.shopAddress ?? verification.shop?.address ?? verification.personal?.address ?? verification.address ?? ("assignedArea" in profile ? profile.assignedArea : undefined);
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object") return [value.addressLine, value.line1, value.line2, value.area, value.city, value.state, value.pincode].filter(Boolean).join(", ");
    return "Address unavailable";
  };
  const tailorCandidates: Array<AdminAssignmentCandidate<TailorProfile>> = tailorCandidatesQuery.data?.candidates
    ?? tailors.map((profile) => ({ profile, distanceMeters: null, locationLabel: profileLocation(profile) }));
  const partnerCandidates: Array<AdminAssignmentCandidate<DeliveryPartnerProfile>> = partnerCandidatesQuery.data?.candidates
    ?? partners.map((profile) => ({ profile, distanceMeters: null, locationLabel: profileLocation(profile) }));
  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(97vw,1180px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <div className="shrink-0 pr-12"><Dialog.Title className="text-2xl font-semibold">Assign order</Dialog.Title><Dialog.Description className="mt-2 text-sm text-[var(--muted)]">Compare nearby partners visually, open their full profile, then select the best assignment.</Dialog.Description></div>
          <Dialog.Close asChild><button aria-label="Close assignment" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-xl border border-[var(--panel-border)] bg-white text-slate-600 hover:bg-slate-50" type="button"><X size={18} /></button></Dialog.Close>
          {order ? (
            <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold">{getOrderDisplayNumber(order)}</p><p className="mt-0.5 text-[var(--muted)]">Customer: {getCustomerDisplayName(order.customer)}</p></div><p className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700"><MapPin size={13} />Distance from customer</p></div>
                <p className="mt-2 text-xs text-[var(--muted)]">{tailorCandidatesQuery.data?.originLabel ?? partnerCandidatesQuery.data?.originLabel ?? order.address?.line1 ?? "Customer address"}</p>
              </div>
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-3 lg:overflow-hidden">
                <AssignmentCandidateColumn candidates={tailorCandidates} loading={tailorCandidatesQuery.isLoading} onSelect={setAssignTailorId} onViewProfile={onOpenTailor} role="TAILOR" selectedId={values.tailorId} title="Tailor" />
                <AssignmentCandidateColumn candidates={partnerCandidates} loading={partnerCandidatesQuery.isLoading} onSelect={setAssignPickupPartnerId} onViewProfile={onOpenPartner} role="DELIVERY_PARTNER" selectedId={values.pickupPartnerId} title="Pickup partner" />
                <AssignmentCandidateColumn candidates={partnerCandidates} loading={partnerCandidatesQuery.isLoading} onSelect={setAssignDeliveryPartnerId} onViewProfile={onOpenPartner} role="DELIVERY_PARTNER" selectedId={values.deliveryPartnerId} title="Delivery partner" />
              </div>
              <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--panel-border)] pt-4">
                <Dialog.Close asChild>
                  <ActionButton variant="secondary">Cancel</ActionButton>
                </Dialog.Close>
                <ActionButton disabled={pending} onClick={onSubmit}>
                  {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  Save assignments
                </ActionButton>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AssignmentCandidateColumn<T extends TailorProfile | DeliveryPartnerProfile>({ candidates, loading, onSelect, onViewProfile, role, selectedId, title }: { candidates: Array<AdminAssignmentCandidate<T>>; loading: boolean; onSelect: (id: string) => void; onViewProfile: (profile: T) => void; role: "TAILOR" | "DELIVERY_PARTNER"; selectedId: string; title: string }) {
  const distanceLabel = (meters: number | null) => meters == null ? "Distance unavailable" : meters < 1000 ? `${meters} m away` : `${(meters / 1000).toFixed(1)} km away`;
  return (
    <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#f8fafc]">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)] bg-white px-4 py-3"><div><h3 className="font-bold text-[var(--deep)]">{title}</h3><p className="text-[10px] text-[var(--muted)]">Nearest shown first</p></div>{loading ? <LoaderCircle className="h-4 w-4 animate-spin text-orange-500" /> : <Badge tone="slate">{candidates.length}</Badge>}</div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <button className={cn("w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold transition", !selectedId ? "border-orange-400 bg-orange-50 text-orange-800 ring-2 ring-orange-100" : "border-slate-200 bg-white text-slate-600 hover:border-orange-300")} onClick={() => onSelect("")} type="button">Unassigned</button>
        {candidates.map(({ profile, distanceMeters, locationLabel }) => {
          const isTailor = role === "TAILOR";
          const name = isTailor ? getTailorDisplayName(profile as TailorProfile) : getPartnerDisplayName(profile as DeliveryPartnerProfile);
          const publicId = isTailor ? (profile as TailorProfile).darjiTailorId : (profile as DeliveryPartnerProfile).darjiPartnerId;
          const selected = selectedId === profile.id;
          const avatar = profile.user?.profileUrl || profile.user?.avatarUrl || getDefaultAvatarUrl(profile.user?.name ?? profile.user?.phone ?? name);
          return (
            <div className={cn("rounded-2xl border bg-white p-3 transition", selected ? "border-orange-500 ring-2 ring-orange-100 shadow-sm" : "border-slate-200 hover:border-orange-300")} key={profile.id}>
              <button className="w-full text-left" onClick={() => onSelect(profile.id)} type="button">
                <div className="flex items-start gap-3"><img alt={`${name} profile`} className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover" src={avatar} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{name}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500">{publicId ?? "Darji ID pending"}</p></div><span className={cn("mt-0.5 h-4 w-4 shrink-0 rounded-full border-2", selected ? "border-orange-500 bg-orange-500 ring-2 ring-orange-100" : "border-slate-300")} /></div><p className="mt-2 line-clamp-2 text-xs leading-4 text-slate-600">{locationLabel}</p></div></div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-extrabold", distanceMeters == null ? "bg-slate-100 text-slate-600" : "bg-orange-100 text-orange-800")}><MapPin className="mr-1 inline h-3 w-3" />{distanceLabel(distanceMeters)}</span><span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", profile.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{profile.isAvailable ? "Available" : "Offline"}</span>{!isTailor ? <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700">{getPartnerRoleLabel(profile as DeliveryPartnerProfile)}</span> : null}</div>
              </button>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2"><span className="text-[10px] text-slate-500">Rating {typeof profile.rating === "number" ? profile.rating.toFixed(1) : "not rated"}</span><button className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-50" onClick={() => onViewProfile(profile)} type="button"><Eye size={13} />View profile</button></div>
            </div>
          );
        })}
        {!loading && !candidates.length ? <p className="rounded-xl bg-white p-4 text-center text-sm text-slate-500">No profiles available.</p> : null}
      </div>
    </section>
  );
}

function getOrderColumns({
  onAssign,
  onOpenCustomer,
  onOpenTailor,
  onOpenPartner,
  onOpen,
  onChatCustomer,
  onCallCustomer,
  onDownloadImages,
  onDeleteOrder,
  onGenerateInvoice,
  onMarkHighPriority,
  onReportIssue,
  onOpenBatch,
  batches,
  onStatusChange,
  pending,
  priorities
}: {
  onAssign: (order: Order) => void;
  onOpenCustomer: (order: Order) => void;
  onOpenTailor: (order: Order) => void;
  onOpenPartner: (order: Order) => void;
  onOpen: (order: Order, focus?: OrderDetailFocus) => void;
  onChatCustomer: (order: Order) => void;
  onCallCustomer: (order: Order) => void;
  onDownloadImages: (order: Order) => void;
  onDeleteOrder: (order: Order) => void;
  onGenerateInvoice: (order: Order) => void;
  onMarkHighPriority: (order: Order) => void;
  onReportIssue: (order: Order) => void;
  onOpenBatch: (batch: BatchFocusTarget) => void;
  batches: DeliveryBatch[];
  onStatusChange: (order: Order, status: string) => void;
  pending: boolean;
  priorities: Record<string, AdminOrderPriority>;
}): Array<ColumnDef<Order>> {
  return [
    {
      accessorKey: "orderNumber",
      header: "Order",
      cell: ({ row }) => (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[var(--foreground)]">{getOrderDisplayNumber(row.original)}</p>
            {(priorities[row.original.id] ?? "Normal") !== "Normal" ? <PriorityBadge value={priorities[row.original.id]} /> : null}
          </div>
          <p className="text-xs text-[var(--muted)]">{row.original.darjiId ?? row.original.id}</p>
          {(() => {
            const batch = findBatchForOrder(row.original, batches);
            if (!batch) return null;
            const hiddenTaskCount = batch.tasks.filter((task) => !task.notificationSentAt).length;
            const isHidden = batch.status === "scheduled" && hiddenTaskCount === batch.tasks.length && batch.tasks.length > 0;
            return (
              <button
                className={cn(
                  "inline-flex max-w-40 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold transition",
                  isHidden
                    ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--deep)] hover:bg-[var(--accent)] hover:text-black"
                )}
                type="button"
                onClick={() => onOpenBatch({ batchId: batch.batchId, roundAt: batch.roundAt })}
              >
                <span className="truncate">{isHidden ? "Hidden" : "Batch"} {batch.batchId.slice(0, 8).toUpperCase()}</span>
              </button>
            );
          })()}
        </div>
      )
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (row) => row.customer?.name ?? row.customer?.phone ?? "",
      cell: ({ row }) => (
        <EntityLink avatar={getInitials(row.original.customer?.name, "CU")} label={getCustomerDisplayName(row.original.customer)} onClick={() => onOpenCustomer(row.original)} subtitle={row.original.customer?.phone ?? "No phone"} tone="amber" />
      )
    },
    {
      id: "category",
      header: "Category",
      accessorFn: (row) => (row.items ?? []).map((item) => item.service?.category?.name ?? "General").join(", "),
      cell: ({ row }) => <span className="inline-flex items-center gap-2 whitespace-nowrap"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-50 text-orange-500"><Scissors size={14} /></span><span className="text-xs font-medium text-[var(--foreground)]">{row.original.items?.[0]?.service?.category?.name ?? "General"}</span></span>
    },
    {
      id: "tailor",
      header: "Tailor",
      accessorFn: (row) => row.tailor?.shopName ?? row.tailor?.user?.name ?? "",
      cell: ({ row }) => {
        const t = row.original.tailor;
        if (!t) return <span className="text-[var(--muted)]">Unassigned</span>;
        return (
          <EntityLink avatar={getInitials(t.user?.name ?? t.shopName, "TA")} label={getTailorDisplayName(t)} onClick={() => onOpenTailor(row.original)} subtitle={t.user?.phone ?? t.darjiTailorId ?? "No phone"} tone="emerald" />
        );
      }
    },
    {
      id: "partner",
      header: "Delivery partner",
      accessorFn: (row) => row.deliveryPartner?.user?.name ?? row.deliveryPartner?.user?.phone ?? row.pickupPartner?.user?.name ?? "",
      cell: ({ row }) => {
        const dp = row.original.deliveryPartner || row.original.pickupPartner;
        if (!dp) return <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-[var(--muted)]"><span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100"><UserCircle2 size={15} /></span>Unassigned</span>;
        return (
          <EntityLink avatar={getInitials(dp.user?.name, "DP")} label={getPartnerDisplayName(dp)} onClick={() => onOpenPartner(row.original)} subtitle={dp.user?.phone ?? dp.darjiPartnerId ?? "No phone"} tone="sky" />
        );
      }
    },
    {
      id: "urgency",
      header: "Urgency",
      accessorFn: (row) => row.deliveryMode ?? row.request?.deliveryMode ?? row.request?.urgency ?? "STANDARD",
      cell: ({ row }) => <UrgencyBadge value={String(row.original.deliveryMode ?? row.original.request?.deliveryMode ?? row.original.request?.urgency ?? "STANDARD")} />
    },
    {
      id: "priority",
      header: "Priority",
      accessorFn: (row) => priorities[row.id] ?? "Normal",
      cell: ({ row }) => <PriorityBadge value={priorities[row.original.id] ?? "Normal"} />
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      cell: ({ row }) => <span className="font-semibold text-[var(--foreground)]">{formatCurrency(row.original.totalAmount)}</span>
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment",
      cell: ({ row }) => <StatusBadge value={row.original.paymentMethod} />
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />
    },
    {
      accessorKey: "createdAt",
      header: "Order Date",
      cell: ({ row }) => <span className="whitespace-nowrap text-xs leading-5 text-[var(--muted)]">{formatDate(row.original.createdAt, true)}</span>
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-nowrap items-center gap-1.5">
          <button
            aria-label="View order details"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-white text-[var(--deep)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            onClick={() => onOpen(row.original, "overview")}
            type="button"
          >
            <Eye size={16} />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="More actions"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-white text-[var(--deep)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                type="button"
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 min-w-56 rounded-3xl border border-[var(--panel-border)] bg-white p-2 shadow-[0_20px_45px_rgba(17,24,39,0.12)]">
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onOpen(row.original, "overview")}>
                  <Eye size={14} /> View Details
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onAssign(row.original)}>
                  <UserRoundPlus size={14} /> Manage Assignments
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-2 h-px bg-[var(--panel-border)]" />
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onChatCustomer(row.original)}>
                  <MessageSquareText size={14} /> Chat Customer
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onCallCustomer(row.original)}>
                  <PhoneCall size={14} /> Call Customer
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onGenerateInvoice(row.original)}>
                  <Download size={14} /> Download Invoice
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onDownloadImages(row.original)}>
                  <Download size={14} /> Download Images
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onOpen(row.original, "notes")}>
                  <FileText size={14} /> Add Internal Note
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onMarkHighPriority(row.original)}>
                  <Flag size={14} /> Mark High Priority
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onReportIssue(row.original)}>
                  <AlertTriangle size={14} /> Report Issue
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-2 h-px bg-[var(--panel-border)]" />
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-red-50" onSelect={() => onStatusChange(row.original, "CANCELLED")}>
                  <Trash2 size={14} className="text-red-500" /> Cancel Order
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-red-700 outline-none hover:bg-red-50" onSelect={() => onDeleteOrder(row.original)}>
                  <Trash2 size={14} /> Permanently Delete Order
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )
    }
  ];
}

function getTailoringColumns({
  onOpen,
  onOpenCustomer,
  onOpenTailor,
  priorities,
  selectedIds,
  visibleIds,
  onToggleSelected,
  onToggleAll
}: {
  onOpen: (request: TailoringRequest) => void;
  onOpenCustomer: (request: TailoringRequest) => void;
  onOpenTailor: (request: TailoringRequest) => void;
  priorities: Record<string, AdminOrderPriority>;
  selectedIds: string[];
  visibleIds: string[];
  onToggleSelected: (requestId: string) => void;
  onToggleAll: () => void;
}): Array<ColumnDef<TailoringRequest>> {
  return [
    {
      id: "select",
      header: () => <input aria-label="Select all visible tailoring requests" checked={visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))} onChange={onToggleAll} type="checkbox" />,
      enableSorting: false,
      cell: ({ row }) => <input aria-label={`Select ${row.original.darjiId ?? row.original.id}`} checked={selectedIds.includes(row.original.id)} onChange={() => onToggleSelected(row.original.id)} onClick={(event) => event.stopPropagation()} type="checkbox" />
    },
    {
      id: "request",
      header: "Request",
      accessorFn: (row) => row.id,
      cell: ({ row }) => (
        <div>
          <button className="font-bold text-[var(--deep)] hover:text-orange-600" onClick={() => onOpen(row.original)} type="button">{row.original.darjiId ?? `TRQ-${row.original.id.slice(0, 8).toUpperCase()}`}</button>
          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{row.original.clothType} · {row.original.itemCount ?? row.original.items?.length ?? 1} item(s)</p>
          <p className="text-xs text-[var(--muted)]">{formatDate(row.original.createdAt, true)}</p>
        </div>
      )
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (row) => row.customer?.name ?? row.customer?.phone ?? "",
      cell: ({ row }) => (
        <button className="rounded-lg px-2 py-1 text-left transition hover:bg-orange-50" onClick={() => onOpenCustomer(row.original)} type="button">
          {getCustomerDisplayName(row.original.customer)}{" "}
          {row.original.customer?.darjiCustomerId ? (
            <span className="text-xs font-semibold text-orange-500">({row.original.customer.darjiCustomerId})</span>
          ) : null}
        </button>
      )
    },
    {
      id: "tailor",
      header: "Selected tailor",
      accessorFn: (row) => row.selectedQuote?.tailor?.shopName ?? row.selectedQuote?.tailor?.user?.name ?? row.assignedTailorId ?? "",
      cell: ({ row }) => row.original.selectedQuote || row.original.assignedTailorId ? (
        <button className="max-w-44 rounded-lg px-2 py-1 text-left hover:bg-orange-50" onClick={() => onOpenTailor(row.original)} type="button">
          <p className="font-semibold">{row.original.selectedQuote?.tailor?.shopName ?? row.original.selectedQuote?.tailor?.user?.name ?? "Assigned tailor"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.selectedQuote?.tailor?.darjiTailorId ?? row.original.assignedTailorId}</p>
        </button>
      ) : <span className="text-[var(--muted)]">Not selected</span>
    },
    {
      id: "service",
      header: "Service",
      accessorFn: (row) => `${row.workType} ${row.urgency}`,
      cell: ({ row }) => <div><p className="font-semibold">{row.original.workType}</p><div className="mt-1"><StatusBadge value={row.original.deliveryMode ?? row.original.urgency} /></div></div>
    },
    {
      accessorKey: "status",
      header: "Request status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />
    },
    {
      accessorKey: "workStatus",
      header: "Work status",
      cell: ({ row }) => <StatusBadge value={row.original.workStatus} />
    },
    {
      accessorKey: "quoteCount",
      header: "Quotes",
      cell: ({ row }) => <span className={cn("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-black", Number(row.original.quoteCount ?? 0) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{row.original.quoteCount ?? 0}</span>
    },
    {
      id: "payment",
      header: "Payment",
      accessorFn: (row) => row.paymentStatus ?? "",
      cell: ({ row }) => <div><StatusBadge value={row.original.paymentStatus ?? "PENDING"} />{row.original.totalAmount != null ? <p className="mt-1 text-xs font-bold">{formatCurrency(row.original.totalAmount)}</p> : null}</div>
    },
    {
      accessorKey: "orderStatus",
      header: "Handoff",
      cell: ({ row }) => <StatusBadge value={row.original.orderStatus ?? "awaiting confirmation"} />
    },
    {
      id: "priority",
      header: "Priority",
      accessorFn: (row) => priorities[row.id] ?? "Normal",
      cell: ({ row }) => <PriorityBadge value={priorities[row.original.id] ?? "Normal"} />
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
          View
        </ActionButton>
      )
    }
  ];
}

function getDeliveryColumns({
  onOpen,
  onOpenCustomer,
  onOpenPartner,
  onOpenTailor,
  partners,
  priorities,
  selectedIds,
  visibleIds,
  onToggleSelected,
  onToggleAll
}: {
  onOpen: (request: DeliveryRequest) => void;
  onOpenCustomer: (request: DeliveryRequest) => void;
  onOpenPartner: (request: DeliveryRequest) => void;
  onOpenTailor: (request: DeliveryRequest) => void;
  partners: DeliveryPartnerProfile[];
  priorities: Record<string, AdminOrderPriority>;
  selectedIds: string[];
  visibleIds: string[];
  onToggleSelected: (requestId: string) => void;
  onToggleAll: () => void;
}): Array<ColumnDef<DeliveryRequest>> {
  return [
    {
      id: "select",
      header: () => <input aria-label="Select all visible delivery requests" checked={visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))} onChange={onToggleAll} type="checkbox" />,
      enableSorting: false,
      cell: ({ row }) => <input aria-label={`Select ${row.original.taskId}`} checked={selectedIds.includes(row.original.id)} onChange={() => onToggleSelected(row.original.id)} onClick={(event) => event.stopPropagation()} type="checkbox" />
    },
    {
      id: "task",
      header: "Task / order",
      accessorFn: (row) => row.taskId,
      cell: ({ row }) => <div><button className="font-bold hover:text-orange-600" onClick={() => onOpen(row.original)} type="button">{row.original.taskId}</button><p className="mt-1 text-xs text-[var(--muted)]">{row.original.darjiId ?? row.original.orderId}</p></div>
    },
    {
      accessorKey: "type",
      header: "Task type",
      cell: ({ row }) => <div className="space-y-1"><StatusBadge value={row.original.type} /><div><StatusBadge value={row.original.serviceLevel ?? "STANDARD"} /></div></div>
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <button className="rounded-lg px-2 py-1 text-left transition hover:bg-orange-50" onClick={() => onOpenCustomer(row.original)} type="button">
          <p className="font-medium">{cleanText(row.original.customerName) ?? cleanText(row.original.customerPhone) ?? "Customer"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.customerPhone ?? "No phone"}</p>
        </button>
      )
    },
    {
      accessorKey: "tailorName",
      header: "Tailor",
      cell: ({ row }) => (
        <button className="rounded-lg px-2 py-1 text-left transition hover:bg-orange-50" onClick={() => onOpenTailor(row.original)} type="button">
          <p className="font-medium">{cleanText(row.original.tailorName) ?? cleanText(row.original.tailorPhone) ?? "Tailor"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.tailorPhone ?? "No phone"}</p>
        </button>
      )
    },
    {
      id: "partner",
      header: "Assigned partner",
      accessorFn: (row) => partners.find((partner) => partner.id === row.assignedDeliveryPartnerId)?.user?.name ?? "",
      cell: ({ row }) => {
        const partner = partners.find((p) => p.id === row.original.assignedDeliveryPartnerId);
        if (!partner) return <span>Unassigned</span>;
        return (
          <button className="flex flex-col gap-1 rounded-lg px-2 py-1 text-left hover:bg-orange-50" onClick={() => onOpenPartner(row.original)} type="button">
            <span>
              {getPartnerDisplayName(partner)}{" "}
              {partner.darjiPartnerId ? (
                <span className="text-xs font-semibold text-orange-500">({partner.darjiPartnerId})</span>
              ) : null}
            </span>
            <DeliveryRoleBadge partner={partner} />
          </button>
        );
      }
    },
    {
      id: "schedule",
      header: "Schedule / route",
      accessorFn: (row) => row.roundAt ?? row.createdAt ?? "",
      cell: ({ row }) => <div><p className="font-semibold">{row.original.serviceLevel === "INSTANT" ? "Immediate" : formatStatus(row.original.deliveryRound ?? row.original.shift)}</p><p className="text-xs text-[var(--muted)]">{formatDate(row.original.roundAt ?? row.original.createdAt, true)}</p>{row.original.batchId ? <p className="mt-1 text-xs font-bold text-orange-600">Batch {row.original.batchId.slice(0, 8).toUpperCase()} · {row.original.routePosition ?? "-"}/{row.original.routeTotal ?? "-"}</p> : <p className="mt-1 text-xs text-[var(--muted)]">Unbatched</p>}</div>
    },
    {
      id: "handoff",
      header: "OTP / proof",
      accessorFn: (row) => `${Boolean(row.pickupOtpVerifiedAt)} ${Boolean(row.dropOtpVerifiedAt)}`,
      cell: ({ row }) => {
        const isPickup = row.original.type === "customer_to_tailor";
        const otpVerified = isPickup ? row.original.pickupOtpVerifiedAt : row.original.dropOtpVerifiedAt;
        const proofs = isPickup ? (row.original.clothPhotos?.length ?? 0) : (row.original.deliveryPhotos?.length ?? 0);
        return <div><span className={cn("text-xs font-bold", otpVerified ? "text-emerald-700" : "text-amber-700")}>{otpVerified ? "OTP verified" : "OTP pending"}</span><p className="mt-1 text-xs text-[var(--muted)]">{proofs}/{Math.max(1, row.original.itemCount ?? 1)} proof(s)</p></div>;
      }
    },
    {
      id: "earnings",
      header: "Payout / cash",
      accessorFn: (row) => row.finalPayout ?? row.estimatedPayout ?? row.estimatedEarnings,
      cell: ({ row }) => <div><p className="font-bold">{formatCurrency(row.original.finalPayout ?? row.original.estimatedPayout ?? row.original.estimatedEarnings)}</p>{row.original.cashCollectionRequired ? <p className={cn("mt-1 text-xs font-bold", row.original.cashCollected ? "text-emerald-700" : "text-rose-700")}>{row.original.cashCollected ? "COD collected" : "COD pending"}</p> : <p className="mt-1 text-xs text-[var(--muted)]">No COD</p>}</div>
    },
    {
      accessorKey: "taskStatus",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.taskStatus} />
    },
    {
      accessorKey: "lastFailureReason",
      header: "Issue",
      cell: ({ row }) => row.original.lastFailureReason ? (
        <span className="text-red-500 font-semibold">{row.original.lastFailureReason}</span>
      ) : (
        <span className="text-[var(--muted)]">-</span>
      )
    },
    {
      id: "priority",
      header: "Priority",
      accessorFn: (row) => priorities[row.id] ?? "Normal",
      cell: ({ row }) => <PriorityBadge value={priorities[row.original.id] ?? "Normal"} />
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
          View
        </ActionButton>
      )
    }
  ];
}

function getTailorColumns({
  onDelete,
  onOpen,
  onReview,
  pendingDelete
}: {
  onDelete: (tailor: TailorProfile) => void;
  onOpen: (tailor: TailorProfile) => void;
  onReview: (tailorId: string, status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED") => void;
  pendingDelete: boolean;
}): Array<ColumnDef<TailorProfile>> {
  return [
    {
      id: "tailor",
      header: "Tailor",
      accessorFn: (row) => row.user?.name ?? row.shopName ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{getTailorDisplayName(row.original)}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.user?.phone ?? "No phone"}</p>
        </div>
      )
    },
    {
      id: "shopName",
      header: "Shop Name",
      accessorFn: (row) => row.shopName ?? "—",
      cell: ({ row }) => <span>{row.original.shopName ?? "—"}</span>
    },
    {
      accessorKey: "darjiTailorId",
      header: "Tailor ID"
    },
    {
      id: "specialization",
      header: "Specialization",
      accessorFn: (row) => formatList(row.specialization),
      cell: ({ row }) => <span>{formatList(row.original.specialization)}</span>
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => (typeof row.original.rating === "number" ? row.original.rating.toFixed(1) : "-")
    },
    {
      accessorKey: "earnings",
      header: "Earnings",
      cell: ({ row }) => formatCurrency(row.original.earnings ?? 0)
    },
    {
      accessorKey: "verificationStatus",
      header: "Verification",
      cell: ({ row }) => <StatusBadge value={row.original.verificationStatus} />
    },
    {
      id: "availability",
      header: "Current status",
      accessorFn: (row) => String(row.isAvailable),
      cell: ({ row }) => <Badge tone={row.original.isAvailable ? "emerald" : "slate"}>{row.original.isAvailable ? "Online" : "Offline"}</Badge>
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
            View
          </ActionButton>
          {row.original.verificationStatus === "PENDING" || row.original.verificationStatus === "REUPLOAD_REQUIRED" || row.original.verificationStatus === "REJECTED" ? (
            <ActionButton className="px-3 py-2" onClick={() => onReview(row.original.id, "VERIFIED")}>
              Approve
            </ActionButton>
          ) : null}
          <ActionButton className="px-3 py-2" disabled={pendingDelete} variant="danger" onClick={() => onDelete(row.original)}>
            Delete
          </ActionButton>
        </div>
      )
    }
  ];
}

function getPartnerColumns({
  onDelete,
  onLocate,
  onOpen,
  onReview,
  pendingDelete
}: {
  onDelete: (partner: DeliveryPartnerProfile) => void;
  onLocate: (partner: DeliveryPartnerProfile) => void;
  onOpen: (partner: DeliveryPartnerProfile) => void;
  onReview: (partnerId: string, status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED") => void;
  pendingDelete: boolean;
}): Array<ColumnDef<DeliveryPartnerProfile>> {
  return [
    {
      id: "partner",
      header: "Partner",
      accessorFn: (row) => row.user?.name ?? "",
      cell: ({ row }) => (
        <div>
          <button className="flex flex-wrap items-center gap-2 text-left font-medium transition hover:text-orange-600" onClick={() => onLocate(row.original)} type="button">
            <MapPin size={15} />
            <span>{getPartnerDisplayName(row.original)}</span>
            {row.original.darjiPartnerId ? (
              <span className="text-xs font-semibold text-orange-500">({row.original.darjiPartnerId})</span>
            ) : null}
            <DeliveryRoleBadge partner={row.original} />
          </button>
          <p className="text-xs text-[var(--muted)]">{row.original.user?.phone ?? "No phone"}</p>
        </div>
      )
    },
    {
      accessorKey: "darjiPartnerId",
      header: "Partner ID"
    },
    {
      accessorKey: "vehicleNumber",
      header: "Vehicle",
      cell: ({ row }) => <span>{getPartnerVehicleNumber(row.original)}</span>
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => (typeof row.original.rating === "number" ? row.original.rating.toFixed(1) : "-")
    },
    {
      accessorKey: "verificationStatus",
      header: "Verification",
      cell: ({ row }) => <StatusBadge value={row.original.verificationStatus} />
    },
    {
      id: "availability",
      header: "Assignment status",
      accessorFn: (row) => row.verificationStatus === "VERIFIED" && row.isAvailable ? "active" : "inactive",
      cell: ({ row }) => {
        const isDashboardActive = row.original.verificationStatus === "VERIFIED" && row.original.isAvailable;
        if (isDashboardActive) {
          return <div><Badge tone="emerald">Active</Badge><p className="mt-1 text-xs text-[var(--muted)]">Available for assignments</p></div>;
        }
        if (row.original.isAvailable) {
          return <div><Badge tone="amber">Not active</Badge><p className="mt-1 max-w-[170px] text-xs text-[var(--muted)]">Available, but verification is required</p></div>;
        }
        return <div><Badge tone="slate">Inactive</Badge><p className="mt-1 text-xs text-[var(--muted)]">Not accepting assignments</p></div>;
      }
    },
    {
      id: "lastLocation",
      header: "Last phone GPS",
      accessorFn: (row) => row.lastLocationUpdatedAt ?? "",
      cell: ({ row }) => {
        const coordinates = row.original.currentLocation?.coordinates;
        if (!coordinates || coordinates.length < 2) {
          return <div><Badge tone="slate">Never received</Badge><p className="mt-1 max-w-[210px] text-xs text-[var(--muted)]">No GPS heartbeat reached Darji. Open the latest app, allow all-time precise location, and go online.</p></div>;
        }
        const [longitude, latitude] = coordinates;
        const locationAge = row.original.lastLocationUpdatedAt ? Date.now() - new Date(row.original.lastLocationUpdatedAt).getTime() : Number.POSITIVE_INFINITY;
        const isFresh = locationAge <= 5 * 60 * 1000;
        const tone = !isFresh ? "amber" : row.original.isAvailable ? "emerald" : "slate";
        const label = !isFresh ? "Stale GPS" : row.original.isAvailable ? "Live phone GPS" : "Recent GPS · Inactive";
        return <div className="min-w-[180px]"><Badge tone={tone}>{label}</Badge><p className="mt-1 font-mono text-xs">{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</p><p className="text-xs text-[var(--muted)]">Updated {formatDate(row.original.lastLocationUpdatedAt, true)}{row.original.lastLocationAccuracy != null ? ` · ±${Math.round(row.original.lastLocationAccuracy)}m` : ""}</p></div>;
      }
    },
    {
      accessorKey: "weeklyEarnings",
      header: "Weekly earnings",
      cell: ({ row }) => formatCurrency(row.original.weeklyEarnings ?? 0)
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onLocate(row.original)}>
            <MapPin size={14} /> Locate
          </ActionButton>
          <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
            View
          </ActionButton>
          {row.original.verificationStatus === "PENDING" || row.original.verificationStatus === "REUPLOAD_REQUIRED" ? (
            <ActionButton className="px-3 py-2" onClick={() => onReview(row.original.id, "VERIFIED")}>
              Approve
            </ActionButton>
          ) : null}
          <ActionButton className="px-3 py-2" disabled={pendingDelete} variant="danger" onClick={() => onDelete(row.original)}>
            Delete
          </ActionButton>
        </div>
      )
    }
  ];
}

function getUserColumns({
  onActivate,
  onBan,
  onDelete,
  onOpen,
  onSuspend,
  pending,
  pendingDelete
}: {
  onActivate: (userId: string) => void;
  onBan: (userId: string) => void;
  onDelete: (user: AdminUser) => void;
  onOpen: (user: AdminUser) => void;
  onSuspend: (userId: string) => void;
  pending: boolean;
  pendingDelete: boolean;
}): Array<ColumnDef<AdminUser>> {
  return [
    {
      id: "user",
      header: "Customer",
      accessorFn: (row) => row.name ?? row.phone,
      cell: ({ row }) => (
        <button className="rounded-xl px-2 py-1 text-left transition hover:bg-orange-50" onClick={() => onOpen(row.original)} type="button">
          <p className="font-medium">
            {getCustomerDisplayName(row.original)}{" "}
            {row.original.darjiCustomerId ? (
              <span className="text-xs font-semibold text-orange-500">({row.original.darjiCustomerId})</span>
            ) : null}
          </p>
          <p className="text-xs text-[var(--muted)]">{row.original.phone}</p>
        </button>
      )
    },
    {
      accessorKey: "darjiCustomerId",
      header: "Customer ID",
      cell: ({ row }) => <button className="font-semibold text-orange-600 hover:underline" onClick={() => onOpen(row.original)} type="button">{row.original.darjiCustomerId ?? "Assigning…"}</button>
    },
    {
      accessorKey: "accountStatus",
      header: "Account",
      cell: ({ row }) => <StatusBadge value={row.original.accountStatus} />
    },
    {
      accessorKey: "moderationReason",
      header: "Note",
      cell: ({ row }) => <span>{row.original.moderationReason ?? "-"}</span>
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const managedElsewhere = row.original.role !== "CUSTOMER" || Boolean(row.original.tailorProfile || row.original.deliveryProfile);
        if (row.original.archivedCustomer || managedElsewhere) {
          const label = row.original.archivedCustomer
            ? "Archived"
            : row.original.deliveryProfile || row.original.role === "DELIVERY_PARTNER"
              ? "Also delivery partner"
              : row.original.tailorProfile || row.original.role === "TAILOR"
                ? "Also tailor"
                : "Protected";
          return (
            <div className="flex flex-wrap gap-2">
              <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
                View
              </ActionButton>
              <Badge tone="slate">{label}</Badge>
            </div>
          );
        }
        return (
          <div className="flex flex-wrap gap-2">
            <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
              View
            </ActionButton>
            {row.original.accountStatus !== "ACTIVE" ? (
              <ActionButton className="px-3 py-2" disabled={pending} onClick={() => onActivate(row.original.id)}>
                Activate
              </ActionButton>
            ) : (
              <>
                <ActionButton className="px-3 py-2" disabled={pending} variant="secondary" onClick={() => onSuspend(row.original.id)}>
                  Suspend
                </ActionButton>
                <ActionButton className="px-3 py-2" disabled={pending} variant="danger" onClick={() => onBan(row.original.id)}>
                  Ban
                </ActionButton>
              </>
            )}
            <ActionButton className="px-3 py-2" disabled={pendingDelete} variant="danger" onClick={() => onDelete(row.original)}>
              Delete
            </ActionButton>
          </div>
        );
      }
    }
  ];
}

function getPaymentColumns({
  breakdowns,
  onMarkPaid,
  onOpenCustomer,
  onOpenOrder,
  onOpenPayment,
  pending
}: {
  breakdowns: Map<string, PaymentBreakdown>;
  onMarkPaid: (paymentId: string) => void;
  onOpenCustomer: (payment: Payment) => void;
  onOpenOrder: (payment: Payment) => void;
  onOpenPayment: (payment: Payment) => void;
  pending: boolean;
}): Array<ColumnDef<Payment>> {
  return [
    {
      id: "order",
      header: "Order",
      accessorFn: (row) => row.order?.orderNumber ?? "",
      cell: ({ row }) => (
        <button className="rounded-xl p-2 text-left transition hover:bg-orange-50" onClick={() => onOpenOrder(row.original)} type="button">
          <p className="font-medium text-[var(--foreground)]">{row.original.order?.orderNumber ?? row.original.darjiId ?? row.original.orderId ?? "-"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Order ID: {row.original.orderId}</p>
          {row.original.darjiId ? <p className="mt-1 text-xs text-[var(--muted)]">Payment ID: {row.original.darjiId}</p> : null}
        </button>
      )
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (row) => row.order?.customerName ?? row.order?.customerPhone ?? "",
      cell: ({ row }) => (
        <button className="rounded-lg px-2 py-1 text-left transition hover:bg-orange-50 disabled:cursor-default" disabled={!row.original.order?.customerId} onClick={() => onOpenCustomer(row.original)} type="button">
          <p className="font-medium text-[var(--foreground)]">{cleanText(row.original.order?.customerName) ?? cleanText(row.original.order?.customerPhone) ?? "Customer"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{row.original.order?.customerPhone ?? row.original.order?.customerId ?? "-"}</p>
        </button>
      )
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => <StatusBadge value={row.original.method} />
    },
    {
      accessorKey: "status",
      header: "Payment status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />
    },
    {
      id: "orderStatus",
      header: "Order status",
      accessorFn: (row) => row.order?.status ?? "",
      cell: ({ row }) => <StatusBadge value={row.original.order?.status ?? "Unknown"} />
    },
    {
      accessorKey: "amount",
      header: "Customer paid",
      cell: ({ row }) => (
        <div>
          <p>{formatCurrency(row.original.recognizedAmount ?? row.original.amount)}</p>
          {row.original.recognizedAmount != null && row.original.recognizedAmount !== row.original.amount ? <p className="mt-1 text-xs text-[var(--muted)]">Original payment {formatCurrency(row.original.amount)}</p> : null}
        </div>
      )
    },
    {
      id: "partnerCost",
      header: "Partner cost",
      cell: ({ row }) => {
        const breakdown = breakdowns.get(row.original.id) ?? getPaymentBreakdown(row.original, new Map(), new Map());
        return (
          <div>
            <p className="font-medium text-[var(--foreground)]">{breakdown.realized ? formatCurrency(breakdown.tailorQuote + breakdown.deliveryEarnings) : "Awaiting final costs"}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {breakdown.realized ? `Stitching ${formatCurrency(breakdown.tailorQuote - breakdown.measurementVisitCost)} + Measurement ${formatCurrency(breakdown.measurementVisitCost)} + Delivery ${formatCurrency(breakdown.deliveryEarnings)}` : "Delivered order and finalized wallet records required"}
            </p>
          </div>
        );
      }
    },
    {
      id: "netRevenue",
      header: "Net revenue",
      cell: ({ row }) => {
        const breakdown = breakdowns.get(row.original.id) ?? getPaymentBreakdown(row.original, new Map(), new Map());
        if (!breakdown.realized) return <Badge tone="amber">Unrealized</Badge>;
        return (
          <span className={cn("font-semibold", breakdown.netRevenue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {formatCurrency(breakdown.netRevenue)}
          </span>
        );
      }
    },
    {
      accessorKey: "providerRef",
      header: "Provider ref",
      cell: ({ row }) => row.original.providerRef ?? "-"
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt, true)
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => <div className="flex flex-wrap gap-2"><ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpenPayment(row.original)}><Eye size={14} />View</ActionButton>{row.original.status === "PENDING" ? <ActionButton className="px-3 py-2" disabled={pending} onClick={() => onMarkPaid(row.original.id)}>Mark paid</ActionButton> : null}</div>
    }
  ];
}

function getCouponColumns({ onDelete, onEdit, onHistory, onToggle, pendingId }: { onDelete: (coupon: Coupon) => void; onEdit: (coupon: Coupon) => void; onHistory: (coupon: Coupon) => void; onToggle: (coupon: Coupon) => void; pendingId?: string }): Array<ColumnDef<Coupon>> {
  return [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">{row.original.code}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.darjiId ?? "Darji ID pending"}</p>
        </div>
      )
    },
    {
      accessorKey: "description",
      header: "Description"
    },
    {
      accessorKey: "benefitType",
      header: "Benefit",
      cell: ({ row }) => <StatusBadge value={row.original.benefitType ?? (row.original.discountType === "PERCENTAGE" ? "ORDER_PERCENTAGE" : "ORDER_FLAT")} />
    },
    {
      accessorKey: "discountValue",
      header: "Value",
      cell: ({ row }) => ["ORDER_PERCENTAGE", "DELIVERY_PERCENTAGE"].includes(row.original.benefitType ?? "") || (!row.original.benefitType && row.original.discountType === "PERCENTAGE") ? `${row.original.discountValue}%` : ["FREE_DELIVERY", "WAIVE_PLATFORM_FEE", "WAIVE_SMALL_ORDER_FEE", "FREE_MEASUREMENT"].includes(row.original.benefitType ?? "") ? "Full charge" : formatCurrency(row.original.discountValue)
    },
    {
      accessorKey: "minOrderValue",
      header: "Min order",
      cell: ({ row }) => formatCurrency(row.original.minOrderValue)
    },
    {
      id: "eligibility",
      header: "Eligibility",
      cell: ({ row }) => <div><p className="font-medium">{formatStatus(row.original.orderEligibilityType ?? "ANY")}</p><p className="text-xs text-[var(--muted)]">{formatStatus(row.original.audienceType ?? "EVERYONE")} · {formatStatus(row.original.orderScope ?? "BOTH")}</p></div>
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => formatDate(row.original.expiresAt)
    },
    {
      id: "usage",
      header: "Usage",
      cell: ({ row }) => `${row.original.usedCount ?? 0}${row.original.usageLimit ? ` / ${row.original.usageLimit}` : " / ∞"}`
    },
    {
      accessorKey: "isActive",
      header: "State",
      cell: ({ row }) => <Badge tone={row.original.isActive ? "emerald" : "slate"}>{row.original.isActive ? "Active" : "Disabled"}</Badge>
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => <div className="flex flex-wrap gap-2"><ActionButton className="px-3 py-2" onClick={() => onHistory(row.original)} variant="secondary">History</ActionButton><ActionButton className="px-3 py-2" disabled={pendingId === row.original.id} onClick={() => onEdit(row.original)} variant="secondary">Edit</ActionButton><ActionButton className="px-3 py-2" disabled={pendingId === row.original.id} onClick={() => onToggle(row.original)} variant="secondary">{row.original.isActive ? "Disable" : "Enable"}</ActionButton><ActionButton className="px-3 py-2" disabled={pendingId === row.original.id || Number(row.original.usedCount ?? 0) > 0} onClick={() => onDelete(row.original)} variant="danger">Delete</ActionButton></div>
    }
  ];
}

function getTicketColumns({
  onOpen
}: {
  onOpen: (ticket: SupportTicket) => void;
}): Array<ColumnDef<SupportTicket>> {
  return [
    {
      accessorKey: "subject",
      header: "Ticket",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">{row.original.subject}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.darjiId ?? "Darji ID pending"}</p>
        </div>
      )
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (row) => row.user?.name ?? row.user?.phone ?? "",
      cell: ({ row }) => <span>{getCustomerDisplayName(row.original.user)}</span>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />
    },
    {
      id: "order",
      header: "Order",
      accessorFn: (row) => row.order?.orderNumber ?? "",
      cell: ({ row }) => row.original.order?.orderNumber ?? "-"
    },
    {
      accessorKey: "createdAt",
      header: "Opened",
      cell: ({ row }) => formatDate(row.original.createdAt, true)
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
          View
        </ActionButton>
      )
    }
  ];
}

function getChangeRequestColumns({ onOpen }: { onOpen: (req: AccountChangeRequest) => void }): Array<ColumnDef<AccountChangeRequest>> {
  return [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <span className="font-semibold text-orange-500">{row.original.type}</span>
    },
    {
      id: "user",
      header: "Partner/Tailor",
      accessorFn: (row) => row.user?.name ?? row.user?.phone ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm text-[var(--foreground)]">{getUserDisplayName(row.original.user, "Partner")}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.user?.phone ?? "No phone"}</p>
        </div>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />
    },
    {
      accessorKey: "createdAt",
      header: "Submitted",
      cell: ({ row }) => formatDate(row.original.createdAt, true)
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
          Review Request
        </ActionButton>
      )
    }
  ];
}

function getBugReportColumns({ onOpen, users }: { onOpen: (bug: BugReport) => void; users: AdminUser[] }): Array<ColumnDef<BugReport>> {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <span className="font-semibold text-[var(--foreground)]">{row.original.title}</span>
    },
    {
      id: "user",
      header: "Reporter",
      accessorFn: (row) => row.user?.name ?? row.user?.phone ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm text-[var(--foreground)]">{getUserDisplayName(row.original.user, "Reporter")}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.user?.phone ?? "No phone"}</p>
        </div>
      )
    },
    {
      accessorKey: "appVersion",
      header: "App Version"
    },
    {
      accessorKey: "deviceInfo",
      header: "Device Info",
      cell: ({ row }) => <span className="text-xs text-[var(--muted)] max-w-[120px] truncate block">{row.original.deviceInfo}</span>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />
    },
    {
      id: "assignedTo",
      header: "Assignee",
      cell: ({ row }) => {
        const assigneeId = row.original.assignedTo;
        const assignee = users.find(u => u.id === assigneeId);
        return <span>{assignee?.name ?? assignee?.phone ?? "Unassigned"}</span>;
      }
    },
    {
      accessorKey: "createdAt",
      header: "Reported At",
      cell: ({ row }) => formatDate(row.original.createdAt, true)
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
          Inspect Bug
        </ActionButton>
      )
    }
  ];
}

function formatDuration(ms?: number | null) {
  if (ms === undefined || ms === null || isNaN(ms)) return "-";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

function buildMetrics(
  orders: Order[],
  tailors: TailorProfile[],
  partners: DeliveryPartnerProfile[],
  payments: Payment[],
  finance: FinanceSummary
): DashboardMetrics {
  const paidPayments = payments.filter((payment) => payment.status === "PAID");
  const ordersToday = orders.filter((order) => isToday(order.createdAt)).length;
  const pendingVerifications =
    tailors.filter((tailor) => tailor.verificationStatus === "PENDING").length +
    partners.filter((partner) => partner.verificationStatus === "PENDING").length;
  const pendingCollections = payments.filter((payment) => payment.status === "PENDING").length;
  const completionRate = orders.length ? (orders.filter((order) => order.status === "DELIVERED").length / orders.length) * 100 : 0;
  const cancellationRate = orders.length ? (orders.filter((order) => order.status === "CANCELLED").length / orders.length) * 100 : 0;

  return {
    averageOrderValue: finance.averagePaidOrderValue,
    cancellationRate,
    completionRate,
    ordersToday,
    pendingCollections,
    pendingVerifications,
    revenueToday: finance.revenueToday,
    totalRevenue: finance.netRevenue
  };
}

function isTailorProfile(profile: TailorProfile | DeliveryPartnerProfile): profile is TailorProfile {
  return "shopName" in profile;
}

function buildLiveAlerts({
  deliveryRequests,
  operationalAlerts,
  orders,
  payments,
  setActiveSection,
  setBatchFocus,
  setDeliveryDetail,
  setOrderDetail,
  setTicketDetail,
  setTailoringDetail,
  tailoringRequests,
  tickets
}: {
  deliveryRequests: DeliveryRequest[];
  operationalAlerts: OperationalAlert[];
  orders: Order[];
  payments: Payment[];
  setActiveSection: (section: SectionId) => void;
  setBatchFocus: (target: BatchFocusTarget) => void;
  setDeliveryDetail: (request: DeliveryRequest) => void;
  setOrderDetail: (order: Order) => void;
  setTicketDetail: (ticket: SupportTicket) => void;
  setTailoringDetail: (request: TailoringRequest) => void;
  tailoringRequests: TailoringRequest[];
  tickets: SupportTicket[];
}): AdminAlert[] {
  const now = Date.now();
  const alerts: AdminAlert[] = [];
  const minutesAgo = (value?: string) => (value ? (now - new Date(value).getTime()) / 60000 : 0);
  const isOpenDelivery = (request: DeliveryRequest) => !["delivered", "completed", "cancelled", "CANCELLED"].includes(request.taskStatus);
  const openOrderForDelivery = (request: DeliveryRequest) => {
    const order = orders.find((item) => item.id === request.orderId || item.request?.id === request.orderId);
    if (order) {
      setOrderDetail(order);
      setActiveSection("orders");
    } else {
      setDeliveryDetail(request);
      setActiveSection("delivery");
    }
  };

  operationalAlerts
    .filter((alert) => alert.status === "OPEN")
    .forEach((alert) => {
      const metadata = alert.metadata ?? {};
      const candidateIds = [
        alert.entityId,
        metadata.taskId,
        metadata.orderId,
        metadata.requestId,
        metadata.paymentId,
        metadata.batchId
      ].filter(Boolean).map(String);
      const relatedDelivery = deliveryRequests.find((request) => candidateIds.includes(request.id) || candidateIds.includes(request.taskId) || candidateIds.includes(request.orderId));
      const orderIds = relatedDelivery?.orderId ? [...candidateIds, String(relatedDelivery.orderId)] : candidateIds;
      const relatedOrder = orders.find((order) => orderIds.includes(order.id) || orderIds.includes(String(order.darjiId ?? "")) || orderIds.includes(String(order.orderNumber ?? "")));
      const relatedTailoring = tailoringRequests.find((request) => candidateIds.includes(request.id) || candidateIds.includes(String(request.darjiId ?? "")));
      const relatedPayment = payments.find((payment) => candidateIds.includes(payment.id) || candidateIds.includes(payment.orderId));
      const relatedBatch = deliveryRequests.find((request) => candidateIds.includes(String((request as DeliveryRequest & { batchId?: string }).batchId ?? "")));
      alerts.push({
        createdAt: alert.createdAt ?? alert.updatedAt,
        detail: alert.message,
        id: `operational-${alert.id}`,
        onOpen: () => {
          if (relatedOrder) {
            setOrderDetail(relatedOrder);
            setActiveSection("orders");
          } else if (relatedDelivery) {
            openOrderForDelivery(relatedDelivery);
          } else if (relatedTailoring) {
            setTailoringDetail(relatedTailoring);
            setActiveSection("tailoring");
          } else if (relatedPayment) {
            const paymentOrder = orders.find((order) => order.id === relatedPayment.orderId);
            const paymentRequest = tailoringRequests.find((request) => request.id === relatedPayment.orderId);
            if (paymentOrder) setOrderDetail(paymentOrder);
            else if (paymentRequest) setTailoringDetail(paymentRequest);
            setActiveSection(paymentOrder ? "orders" : paymentRequest ? "tailoring" : "payments");
          } else if (alert.entityType === "delivery_batch" || alert.type.includes("BATCH")) {
            const batchId = String(metadata.batchId ?? alert.entityId ?? "");
            const roundAt = String(metadata.roundAt ?? relatedBatch?.createdAt ?? new Date().toISOString());
            if (batchId) setBatchFocus({ batchId, roundAt });
            setActiveSection("batches");
          } else if (alert.entityType === "tailoring_request") setActiveSection("tailoring");
          else if (alert.type.includes("DELIVERY") || alert.type.includes("COD")) setActiveSection("delivery");
          else setActiveSection("dashboard");
        },
        title: alert.title,
        tone: alert.severity === "CRITICAL" ? "burgundy" : alert.severity === "INFO" ? "sky" : "amber"
      });
    });

  tailoringRequests
    .filter((request) => request.status === "QUOTE_REQUESTED" && minutesAgo(request.createdAt) >= 1.5)
    .forEach((request) => {
      const order = orders.find((item) => item.id === request.id || item.request?.id === request.id);
      alerts.push({
        createdAt: request.createdAt,
        detail: `${formatCustomerRequestId(request.id)} has been waiting ${Math.floor(minutesAgo(request.createdAt))} min for tailor quotes.`,
        id: `tailoring-wait-${request.id}`,
        onOpen: () => {
          if (order) {
            setOrderDetail(order);
            setActiveSection("orders");
          } else {
            setTailoringDetail(request);
            setActiveSection("tailoring");
          }
        },
        title: "Quote pending",
        tone: "amber"
      });
    });

  deliveryRequests
    .filter((request) => isOpenDelivery(request) && !request.assignedDeliveryPartnerId && minutesAgo(request.createdAt) >= 10)
    .forEach((request) => {
      alerts.push({
        createdAt: request.createdAt,
        detail: `${request.taskId} has no delivery partner assigned.`,
        id: `delivery-unassigned-${request.id}`,
        onOpen: () => openOrderForDelivery(request),
        title: "Delivery unassigned",
        tone: "amber"
      });
    });

  deliveryRequests
    .filter((request) => isOpenDelivery(request) && Boolean(request.deadlineAt) && new Date(request.deadlineAt as string).getTime() < now)
    .forEach((request) => {
      alerts.push({
        createdAt: request.deadlineAt ?? request.createdAt,
        detail: `${request.taskId} is past ETA for ${formatStatus(request.type)}.`,
        id: `delivery-delay-${request.id}`,
        onOpen: () => openOrderForDelivery(request),
        title: request.type === "customer_to_tailor" ? "Pickup delayed" : "Drop delayed",
        tone: "rose"
      });
    });

  deliveryRequests
    .filter((request) => Boolean(request.lastFailureReason) && isOpenDelivery(request))
    .forEach((request) => {
      alerts.push({
        createdAt: request.updatedAt ?? request.createdAt,
        detail: `${request.taskId}: ${request.lastFailureReason}`,
        id: `delivery-failure-${request.id}`,
        onOpen: () => openOrderForDelivery(request),
        title: "Delivery exception",
        tone: "rose"
      });
    });

  payments
    .filter((payment) => payment.status === "FAILED")
    .forEach((payment) => {
      alerts.push({
        createdAt: payment.createdAt,
        detail: `${payment.darjiId ?? payment.orderId} failed for ${formatCurrency(payment.amount)}.`,
        id: `payment-failed-${payment.id}`,
        onOpen: () => setActiveSection("payments"),
        title: "Payment failed",
        tone: "rose"
      });
    });

  payments
    .filter((payment) => payment.status === "PENDING" && minutesAgo(payment.createdAt) >= 15)
    .forEach((payment) => {
      alerts.push({
        createdAt: payment.createdAt,
        detail: `${payment.darjiId ?? payment.orderId} is still awaiting ${formatCurrency(payment.amount)}.`,
        id: `payment-pending-${payment.id}`,
        onOpen: () => setActiveSection("payments"),
        title: "Payment pending",
        tone: "amber"
      });
    });

  tailoringRequests
    .filter((request) => request.status === "QUOTE_REQUESTED" && Boolean(request.lastQuoteSentAt) && minutesAgo(request.lastQuoteSentAt) >= 120)
    .forEach((request) => {
      const quoteSentAt = request.lastQuoteSentAt ?? request.updatedAt;
      alerts.push({
        createdAt: quoteSentAt,
        detail: `${request.darjiId ?? `TRQ-${request.id.slice(0, 8).toUpperCase()}`} has a tailor quote awaiting customer confirmation for over 2 hours.`,
        id: `quote-awaiting-confirmation-${request.id}`,
        onOpen: () => {
          setTailoringDetail(request);
          setActiveSection("tailoring");
        },
        title: "Quote awaiting confirmation",
        tone: "amber"
      });
    });

  tailoringRequests
    .filter((request) => request.status === "PAYMENT_PENDING" && request.paymentStatus !== "PAID" && minutesAgo(request.paymentPendingAt ?? request.updatedAt ?? request.createdAt) >= 120)
    .forEach((request) => {
      const pendingSince = request.paymentPendingAt ?? request.updatedAt ?? request.createdAt;
      alerts.push({
        createdAt: pendingSince,
        detail: `${request.darjiId ?? `TRQ-${request.id.slice(0, 8).toUpperCase()}`} has a selected tailor quote awaiting customer payment for over 2 hours.`,
        id: `quote-payment-overdue-${request.id}`,
        onOpen: () => {
          setTailoringDetail(request);
          setActiveSection("tailoring");
        },
        title: "Quote awaiting payment",
        tone: "rose"
      });
    });

  orders
    .filter((order) => ["ORDER_PLACED", "CONFIRMED", "AT_TAILOR", "STITCHING_STARTED"].includes(order.status) && minutesAgo(order.updatedAt ?? order.createdAt) >= 24 * 60)
    .forEach((order) => {
      alerts.push({
        createdAt: order.updatedAt ?? order.createdAt,
        detail: `${getOrderDisplayNumber(order)} has not moved since ${formatDate(order.updatedAt ?? order.createdAt, true)}.`,
        id: `order-stalled-${order.id}`,
        onOpen: () => {
          setOrderDetail(order);
          setActiveSection("orders");
        },
        title: ["AT_TAILOR", "STITCHING_STARTED"].includes(String(order.status).toUpperCase()) ? "Tailor delay" : "Order delayed",
        tone: "rose"
      });
    });

  tickets
    .filter((ticket) => ["HIGH", "URGENT"].includes(String(ticket.priority ?? "").toUpperCase()) && !["RESOLVED", "CLOSED"].includes(String(ticket.status).toUpperCase()))
    .forEach((ticket) => {
      alerts.push({
        createdAt: ticket.createdAt,
        detail: `${ticket.subject} from ${getUserDisplayName(ticket.user, "User")}.`,
        id: `support-priority-${ticket.id}`,
        onOpen: () => {
          setTicketDetail(ticket);
          setActiveSection("support");
        },
        title: "Priority support",
        tone: "amber"
      });
    });

  return alerts;
}

function buildTodayOperationsSummary({
  deliveryBatches,
  deliveryRequests,
  partners,
  periodScoped = false,
  tailoringRequests,
  tailors
}: {
  deliveryBatches: DeliveryBatch[];
  deliveryRequests: DeliveryRequest[];
  partners: DeliveryPartnerProfile[];
  periodScoped?: boolean;
  tailoringRequests: TailoringRequest[];
  tailors: TailorProfile[];
}) {
  const todayDeliveryRequests = periodScoped ? deliveryRequests : deliveryRequests.filter((request) => isToday(request.createdAt) || isToday(request.deadlineAt) || isToday(request.etaWindowStart));
  const pickupTasks = todayDeliveryRequests.filter((request) => request.type === "customer_to_tailor");
  const dropTasks = todayDeliveryRequests.filter((request) => request.type === "tailor_to_customer");
  const completedTasks = todayDeliveryRequests.filter((request) => ["delivered", "completed", "DELIVERED"].includes(request.taskStatus));
  const activeTailors = tailors.filter((tailor) => tailor.isAvailable && tailor.verificationStatus === "VERIFIED").length;
  const activePartners = partners.filter((partner) => partner.isAvailable && partner.verificationStatus === "VERIFIED").length;
  const stitchingNow = tailoringRequests.filter((request) => ["WORKING", "STITCHING_STARTED", "AT_TAILOR"].includes(String(request.workStatus ?? request.orderStatus))).length;
  const readyNow = tailoringRequests.filter((request) => ["READY", "READY_FOR_DELIVERY", "ready_for_delivery"].includes(String(request.workStatus ?? request.orderStatus))).length;
  const pendingDropBatches = deliveryBatches.filter((batch) => batch.deliveryType === "DROP" && !["completed", "cancelled"].includes(String(batch.status))).length;

  return [
    { label: periodScoped ? "Pickups in period" : "Pickups today", value: pickupTasks.length.toLocaleString("en-IN"), tone: "amber" as const, target: "delivery" as SectionId },
    { label: periodScoped ? "Drops in period" : "Drops today", value: dropTasks.length.toLocaleString("en-IN"), tone: "sky" as const, target: "delivery" as SectionId },
    { label: "Completed tasks", value: completedTasks.length.toLocaleString("en-IN"), tone: "emerald" as const, target: "delivery" as SectionId },
    { label: "In stitching", value: stitchingNow.toLocaleString("en-IN"), tone: "violet" as const, target: "tailoring" as SectionId },
    { label: "Ready orders", value: readyNow.toLocaleString("en-IN"), tone: "emerald" as const, target: "tailoring" as SectionId },
    { label: "Drop batches", value: pendingDropBatches.toLocaleString("en-IN"), tone: "rose" as const, target: "batches" as SectionId },
    { label: "Active tailors", value: activeTailors.toLocaleString("en-IN"), tone: "amber" as const, target: "tailors" as SectionId },
    { label: "Active partners", value: activePartners.toLocaleString("en-IN"), tone: "sky" as const, target: "partners" as SectionId }
  ];
}

function buildFinanceSummary(payments: Payment[], tailoringRequests: TailoringRequest[], deliveryRequests: DeliveryRequest[], deliveryBatches: DeliveryBatch[]): FinanceSummary {
  const tailoringCosts = new Map<string, number>();
  tailoringRequests.forEach((request) => {
    tailoringCosts.set(request.id, Number(request.quoteAmount ?? request.selectedQuote?.price ?? request.ownQuote?.price ?? 0));
  });

  const deliveryCosts = new Map<string, number>();
  const activeTasks = deliveryRequests.filter((request) => String(request.taskStatus).toLowerCase() !== "cancelled");
  activeTasks.filter((request) => !request.batchId).forEach((request) => {
    const payout = Number(request.finalPayout ?? request.estimatedPayout ?? request.estimatedEarnings ?? 0);
    deliveryCosts.set(request.orderId, (deliveryCosts.get(request.orderId) ?? 0) + payout);
  });
  const batchMap = new Map(deliveryBatches.map((batch) => [batch.batchId, batch]));
  const batchIds = [...new Set(activeTasks.map((request) => request.batchId).filter((value): value is string => Boolean(value)))];
  batchIds.forEach((batchId) => {
    const tasks = activeTasks.filter((request) => request.batchId === batchId);
    if (!tasks.length) return;
    const batch = batchMap.get(batchId);
    const payout = Number(batch?.finalPayout ?? batch?.estimatedPayout ?? batch?.estimatedEarnings ?? 0);
    const perTaskCost = payout / tasks.length;
    tasks.forEach((request) => deliveryCosts.set(request.orderId, (deliveryCosts.get(request.orderId) ?? 0) + perTaskCost));
  });

  const byPaymentId = new Map<string, PaymentBreakdown>();
  let grossPaid = 0;
  let tailorQuotes = 0;
  let deliveryEarnings = 0;
  let netRevenue = 0;
  let revenueToday = 0;
  let pendingAmount = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let refundedCount = 0;

  payments.forEach((payment) => {
    const breakdown = getPaymentBreakdown(payment, tailoringCosts, deliveryCosts);
    byPaymentId.set(payment.id, breakdown);

    if (payment.status === "PAID") {
      paidCount += 1;
      grossPaid += breakdown.customerPaid;
      tailorQuotes += breakdown.tailorQuote;
      deliveryEarnings += breakdown.deliveryEarnings;
      if (breakdown.realized) {
        netRevenue += breakdown.netRevenue;
        if (isToday(payment.createdAt)) revenueToday += breakdown.netRevenue;
      }
    } else if (payment.status === "PENDING") {
      pendingCount += 1;
      pendingAmount += Number(payment.amount ?? 0);
    } else if (payment.status === "FAILED") {
      failedCount += 1;
    } else if (payment.status === "REFUNDED") {
      refundedCount += 1;
    }
  });

  return {
    averagePaidOrderValue: paidCount ? grossPaid / paidCount : 0,
    deliveryEarnings,
    failedCount,
    grossPaid,
    netRevenue,
    paidCount,
    pendingAmount,
    pendingCount,
    refundedCount,
    revenueToday,
    tailorQuotes,
    totalPartnerCost: tailorQuotes + deliveryEarnings,
    byPaymentId
  };
}

function getPaymentBreakdown(payment: Payment, tailoringCosts: Map<string, number>, deliveryCosts: Map<string, number>): PaymentBreakdown {
  const customerPaid = Number(payment.customerPaid ?? payment.amount ?? 0);
  const tailorQuote = Number(payment.tailorQuote ?? tailoringCosts.get(payment.orderId) ?? 0);
  const measurementVisitCost = Number(payment.measurementVisitCost ?? 0);
  const deliveryEarnings = Number(payment.deliveryEarnings ?? deliveryCosts.get(payment.orderId) ?? 0);
  const packagingCost = Number(payment.packagingCost ?? 0);
  const realized = payment.realized === true && typeof payment.netRevenue === "number";
  const netRevenue = realized ? Number(payment.netRevenue) : 0;

  return {
    customerPaid,
    tailorQuote,
    measurementVisitCost,
    deliveryEarnings,
    packagingCost,
    netRevenue,
    realized
  };
}

function buildRevenueSeries(payments: Payment[], range: TrendRange, breakdowns: Map<string, PaymentBreakdown>, customSlots?: Array<{ key: string; label: string }>): RevenuePoint[] {
  const slots = customSlots ?? buildSlots(range);
  const totals = new Map(slots.map((slot) => [slot.key, 0]));
  payments
    .filter((payment) => payment.status === "PAID" && payment.createdAt)
    .forEach((payment) => {
      const key = bucketKey(new Date(payment.createdAt as string), range);
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + (breakdowns.get(payment.id)?.netRevenue ?? Number(payment.amount)));
      }
    });
  return slots.map((slot) => ({ label: slot.label, revenue: totals.get(slot.key) ?? 0 }));
}

function buildOrderTrendSeries(orders: Order[], range: TrendRange, customSlots?: Array<{ key: string; label: string }>): OrderTrendPoint[] {
  const slots = customSlots ?? buildSlots(range);
  const totals = new Map(slots.map((slot) => [slot.key, { completed: 0, active: 0, cancelled: 0, pending: 0 }]));
  orders.forEach((order) => {
    if (!order.createdAt) return;
    const key = bucketKey(new Date(order.createdAt), range);
    const item = totals.get(key);
    if (!item) return;
    item[classifyDashboardOrderStatus(order.status)] += 1;
  });
  return slots.map((slot) => ({ label: slot.label, ...(totals.get(slot.key) ?? { completed: 0, active: 0, cancelled: 0, pending: 0 }) }));
}

function buildWeekdayOrderSeries(orders: Order[]): OrderTrendPoint[] {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const bucketOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt ?? 0);
      return createdAt >= date && createdAt < nextDate;
    });

    return {
      label: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date),
      completed: bucketOrders.filter((order) => order.status === "DELIVERED").length,
      active: bucketOrders.filter((order) => classifyDashboardOrderStatus(order.status) === "active").length,
      cancelled: bucketOrders.filter((order) => order.status === "CANCELLED").length,
      pending: bucketOrders.filter((order) => classifyDashboardOrderStatus(order.status) === "pending").length
    };
  });
}

function buildGrowthSeries(orders: Order[], tailors: TailorProfile[], partners: DeliveryPartnerProfile[], range: TrendRange, customSlots?: Array<{ key: string; label: string }>): GrowthPoint[] {
  const slots = customSlots ?? buildSlots(range);
  const series = new Map(slots.map((slot) => [slot.key, { customers: 0, tailors: 0, partners: 0 }]));
  const firstOrderByCustomer = new Map<string, string>();
  orders.forEach((order) => {
    if (!order.customerId || !order.createdAt) return;
    const current = firstOrderByCustomer.get(order.customerId);
    if (!current || new Date(order.createdAt).getTime() < new Date(current).getTime()) {
      firstOrderByCustomer.set(order.customerId, order.createdAt);
    }
  });
  firstOrderByCustomer.forEach((createdAt) => {
    const key = bucketKey(new Date(createdAt), range);
    const bucket = series.get(key);
    if (bucket) bucket.customers += 1;
  });
  tailors.forEach((tailor) => {
    if (!tailor.createdAt) return;
    const key = bucketKey(new Date(tailor.createdAt), range);
    const bucket = series.get(key);
    if (bucket) bucket.tailors += 1;
  });
  partners.forEach((partner) => {
    if (!partner.createdAt) return;
    const key = bucketKey(new Date(partner.createdAt), range);
    const bucket = series.get(key);
    if (bucket) bucket.partners += 1;
  });
  return slots.map((slot) => ({ label: slot.label, ...(series.get(slot.key) ?? { customers: 0, tailors: 0, partners: 0 }) }));
}

function buildServiceMix(orders: Order[]): PiePoint[] {
  const totals = new Map<string, number>();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const category = item.service?.category?.name ?? "General";
      totals.set(category, (totals.get(category) ?? 0) + item.quantity);
    });
  });
  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

function buildCategoryChartData(items: PiePoint[], visibleCategories: number) {
  const sorted = [...items].sort((left, right) => right.value - left.value);
  const visible = sorted.slice(0, visibleCategories);
  const otherValue = sorted.slice(visibleCategories).reduce((sum, item) => sum + item.value, 0);
  return otherValue > 0 ? [...visible, { name: "Other", value: otherValue }] : visible;
}

function buildSlots(range: TrendRange) {
  const now = new Date();
  if (range === "daily") {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date)
      };
    });
  }
  if (range === "weekly") {
    return Array.from({ length: 8 }, (_, index) => {
      const date = startOfWeek(new Date(now));
      date.setDate(date.getDate() - (7 * (7 - index)));
      return {
        key: date.toISOString().slice(0, 10),
        label: `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date)}`
      };
    });
  }
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date)
    };
  });
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function bucketKey(date: Date, range: TrendRange) {
  if (range === "daily") return date.toISOString().slice(0, 10);
  if (range === "weekly") return startOfWeek(date).toISOString().slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function latestValue<T extends object>(series: T[], key: keyof T) {
  return Number(series[series.length - 1]?.[key] ?? 0);
}

function previousValue<T extends object>(series: T[], key: keyof T) {
  return Number(series[series.length - 2]?.[key] ?? 0);
}

function lastOrderPoint(series: OrderTrendPoint[]) {
  return series[series.length - 1] ?? { label: "", completed: 0, active: 0, cancelled: 0, pending: 0 };
}

function previousOrderPoint(series: OrderTrendPoint[]) {
  return series[series.length - 2] ?? { label: "", completed: 0, active: 0, cancelled: 0, pending: 0 };
}

function sumOrderPoint(point: Pick<OrderTrendPoint, "completed" | "active" | "cancelled" | "pending">) {
  return point.completed + point.active + point.cancelled + point.pending;
}

function classifyDashboardOrderStatus(status?: string): "pending" | "active" | "completed" | "cancelled" {
  const normalized = String(status ?? "").toUpperCase();
  if (["DELIVERED", "COMPLETED"].includes(normalized)) return "completed";
  if (normalized === "CANCELLED") return "cancelled";
  if (["ORDER_PLACED", "QUOTE_REQUESTED", "PAYMENT_PENDING", "PENDING"].includes(normalized)) return "pending";
  return "active";
}

function formatComparison(value: number | null) {
  if (value === null) return "No prior baseline";
  if (Math.abs(value) < 0.05) return "Stable";
  return `${value > 0 ? "+" : ""}${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)}%`;
}

function comparisonTone(value: number | null): "positive" | "negative" | "neutral" {
  if (value === null || Math.abs(value) < 0.05) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function liveStageColor(stage: string) {
  const colors: Record<string, string> = {
    "Waiting for quote": "#d97706",
    "Quote received": "#f59e0b",
    "Payment / confirmation pending": "#f59e0b",
    "Customer confirmed": "#2563eb",
    "Pickup pending": "#2563eb",
    "Picked up": "#0284c7",
    "With tailor": "#7c3aed",
    Ready: "#0891b2",
    "Drop pending": "#0284c7",
    "Awaiting payment": "#f59e0b",
    "Awaiting tailor": "#d97706",
    "Pickup in progress": "#2563eb",
    "At tailor": "#7c3aed",
    Stitching: "#9333ea",
    "Ready for delivery": "#0891b2",
    "Out for delivery": "#0284c7",
    Delivered: "#16a34a",
    Cancelled: "#dc2626"
  };
  return colors[stage] ?? "#64748b";
}

function buildTrendMeta(current: number, previous: number, inverse = false): { label: string; tone: "positive" | "negative" | "neutral" } {
  if (previous === 0) {
    if (current === 0) return { label: "Stable", tone: "neutral" };
    return {
      label: "New",
      tone: inverse ? "negative" : "positive"
    };
  }

  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const adjusted = inverse ? -delta : delta;
  if (Math.abs(adjusted) < 0.1) return { label: "Stable", tone: "neutral" };

  return {
    label: `${adjusted > 0 ? "+" : ""}${adjusted.toFixed(Math.abs(adjusted) >= 10 ? 0 : 1)}%`,
    tone: adjusted > 0 ? "positive" : "negative"
  };
}

function buildCountMeta(current: number, inverse = false, suffix = ""): { label: string; tone: "positive" | "negative" | "neutral" } {
  const adjusted = inverse ? -current : current;
  if (adjusted === 0) return { label: "Stable", tone: "neutral" };

  return {
    label: `${adjusted > 0 ? "+" : ""}${adjusted.toFixed(Number.isInteger(adjusted) ? 0 : 1)}${suffix}`,
    tone: adjusted > 0 ? "positive" : "negative"
  };
}

function buildDashboardDateRangeLabel(range: TrendRange) {
  const now = new Date();
  const start = new Date(now);

  if (range === "daily") start.setDate(now.getDate() - 6);
  else if (range === "weekly") start.setDate(now.getDate() - 49);
  else start.setMonth(now.getMonth() - 5);

  const formatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(now)}`;
}

function buildLiveOrderStatus(orders: Order[]) {
  const buckets = [
    { key: "pending", label: "Pending", color: "#f6a313", count: 0 },
    { key: "atTailor", label: "At Tailor", color: "#2a79ff", count: 0 },
    { key: "stitching", label: "Stitching", color: "#8b5cf6", count: 0 },
    { key: "ready", label: "Ready", color: "#22c55e", count: 0 },
    { key: "outForDelivery", label: "Out for Delivery", color: "#0ea5e9", count: 0 },
    { key: "delivered", label: "Delivered", color: "#16a34a", count: 0 }
  ];

  for (const order of orders) {
    const bucket = classifyOrderStage(order.status);
    const target = buckets.find((item) => item.key === bucket);
    if (target) target.count += 1;
  }

  return buckets;
}

function classifyOrderStage(status?: string) {
  const normalized = (status ?? "").toUpperCase();

  if (normalized === "DELIVERED") return "delivered";
  if (["OUT_FOR_DELIVERY", "DELIVERY_ASSIGNED", "DELIVERY_STARTED"].includes(normalized)) return "outForDelivery";
  if (["READY", "READY_FOR_DELIVERY", "STITCHING_COMPLETED"].includes(normalized)) return "ready";
  if (["WORKING", "STITCHING_STARTED", "CUTTING", "FINISHING"].includes(normalized)) return "stitching";
  if (["AT_TAILOR", "PICKUP_COMPLETED"].includes(normalized)) return "atTailor";
  return "pending";
}

function formatRoleLabel(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function countTailorOrders(orders: Order[], tailorId: string) {
  return orders.filter((order) => order.tailorId === tailorId).length;
}

function countPartnerOrders(orders: Order[], partnerId: string) {
  return orders.filter((order) => order.pickupPartnerId === partnerId || order.deliveryPartnerId === partnerId).length;
}

function tooltipStyle() {
  return {
    backgroundColor: "#fffdf7",
    border: "1px solid rgba(231, 213, 179, 0.88)",
    borderRadius: "18px",
    boxShadow: "0 18px 35px rgba(15, 23, 42, 0.08)",
    color: "#0b2241"
  };
}

function orderToCsv(order: Order) {
  return {
    orderNumber: getOrderDisplayNumber(order),
    customer: getCustomerDisplayName(order.customer),
    category: order.items[0]?.service?.category?.name ?? "General",
    tailor: order.tailor ? getTailorDisplayName(order.tailor) : "",
    deliveryPartner: order.deliveryPartner ? `${getPartnerDisplayName(order.deliveryPartner)} (${getPartnerRoleLabel(order.deliveryPartner)})` : "",
    amount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    status: order.status,
    createdAt: order.createdAt ?? ""
  };
}

function tailoringToCsv(request: TailoringRequest) {
  return {
    customer: getCustomerDisplayName(request.customer),
    clothType: request.clothType,
    workType: request.workType,
    urgency: request.urgency,
    status: request.status,
    workStatus: request.workStatus ?? "",
    quoteCount: request.quoteCount ?? 0,
    createdAt: request.createdAt ?? ""
  };
}

function deliveryToCsv(request: DeliveryRequest) {
  return {
    taskId: request.taskId,
    type: request.type,
    customer: request.customerName ?? "",
    tailor: request.tailorName ?? "",
    status: request.taskStatus,
    shift: request.shift,
    earnings: request.estimatedEarnings,
    createdAt: request.createdAt ?? ""
  };
}

function tailorToCsv(tailor: TailorProfile) {
  return {
    shopName: tailor.shopName ?? "",
    name: getUserDisplayName(tailor.user, "Tailor"),
    phone: tailor.user?.phone ?? "",
    rating: tailor.rating ?? "",
    earnings: tailor.earnings ?? 0,
    verificationStatus: tailor.verificationStatus ?? "",
    isAvailable: tailor.isAvailable
  };
}

function partnerToCsv(partner: DeliveryPartnerProfile) {
  return {
    name: getPartnerDisplayName(partner),
    phone: partner.user?.phone ?? "",
    deliveryType: getPartnerRoleLabel(partner),
    vehicleNumber: getPartnerVehicleNumber(partner),
    rating: partner.rating ?? "",
    weeklyEarnings: partner.weeklyEarnings ?? 0,
    verificationStatus: partner.verificationStatus ?? "",
    isAvailable: partner.isAvailable
  };
}

function userToCsv(user: AdminUser) {
  return {
    name: getCustomerDisplayName(user),
    phone: user.phone,
    email: user.email ?? "",
    role: user.role ?? "",
    accountStatus: user.accountStatus ?? "",
    moderationReason: user.moderationReason ?? "",
    suspendedUntil: user.suspendedUntil ?? "",
    tailorVerification: user.tailorProfile?.verificationStatus ?? "",
    deliveryVerification: user.deliveryProfile?.verificationStatus ?? ""
  };
}

function paymentToCsv(payment: Payment) {
  return {
    orderNumber: payment.order?.orderNumber ?? "",
    method: payment.method,
    status: payment.status,
    amount: payment.amount,
    providerRef: payment.providerRef ?? "",
    createdAt: payment.createdAt ?? ""
  };
}

function financialLedgerToCsv(entry: FinancialLedgerEntry) {
  return {
    date: entry.occurredAt ?? "",
    entry: entry.category,
    accountingType: entry.accountingType,
    direction: entry.direction,
    party: entry.partyName ?? "",
    partyType: entry.partyType ?? "",
    source: entry.sourceLabel ?? entry.sourceId ?? "",
    amount: entry.amount,
    method: entry.method ?? "",
    reference: entry.referenceNumber ?? "",
    status: entry.status
  };
}

function ticketToCsv(ticket: SupportTicket) {
  return {
    subject: ticket.subject,
    customer: ticket.user?.name ?? ticket.user?.phone ?? "",
    status: ticket.status,
    orderNumber: ticket.order?.orderNumber ?? "",
    createdAt: ticket.createdAt ?? ""
  };
}

function exportRowMatches(row: Record<string, unknown>, filters: { search: string; status: string; fromDate: string; toDate: string }) {
  const search = filters.search.trim().toLowerCase();
  if (search && !Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search))) return false;
  const status = filters.status.trim().toLowerCase();
  if (status) {
    const statusValues = Object.entries(row).filter(([key]) => /status|state/i.test(key)).map(([, value]) => String(value ?? "").toLowerCase());
    if (!statusValues.some((value) => value.includes(status))) return false;
  }
  if (!filters.fromDate && !filters.toDate) return true;
  const rawDate = Object.entries(row).find(([key]) => /created|date|time/i.test(key))?.[1];
  if (!rawDate) return false;
  const value = new Date(String(rawDate));
  if (Number.isNaN(value.getTime())) return false;
  const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
  const toExclusive = filters.toDate ? new Date(`${filters.toDate}T00:00:00`) : null;
  if (toExclusive) toExclusive.setDate(toExclusive.getDate() + 1);
  return (!from || value >= from) && (!toExclusive || value < toExclusive);
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? "");
          return `"${value.replace(/"/g, '""')}"`
        })
        .join(",")
    )
  ].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type DashboardPeriodBounds = { start: Date | null; endExclusive: Date | null };

function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDayStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) ? new Date(year, month - 1, day) : null;
}

function getDashboardPeriodBounds(preset: DashboardPeriodPreset, fromMonth: string, toMonth: string): DashboardPeriodBounds {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "lifetime") return { start: null, endExclusive: null };
  if (preset === "custom") {
    const from = localDayStart(fromMonth);
    const to = localDayStart(toMonth);
    if (!from || !to) return { start: new Date(today.getTime() - 29 * 86_400_000), endExclusive: new Date(today.getTime() + 86_400_000) };
    const start = from <= to ? from : to;
    const lastDay = from <= to ? to : from;
    return { start, endExclusive: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1) };
  }
  if (preset === "today") return { start: today, endExclusive: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) };
  if (preset === "yesterday") return { start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), endExclusive: today };
  if (preset === "last_7_days") return { start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), endExclusive: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) };
  if (preset === "last_30_days") return { start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29), endExclusive: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) };
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday);
  if (preset === "this_week") return { start: thisMonday, endExclusive: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) };
  if (preset === "last_week") return { start: new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7), endExclusive: thisMonday };
  if (preset === "previous_month") return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), endExclusive: new Date(today.getFullYear(), today.getMonth(), 1) };
  return { start: new Date(today.getFullYear(), today.getMonth(), 1), endExclusive: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
}

function isDateInDashboardPeriod(value: string | Date | null | undefined, bounds: DashboardPeriodBounds) {
  if (!bounds.start && !bounds.endExclusive) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (!bounds.start || date >= bounds.start) && (!bounds.endExclusive || date < bounds.endExclusive);
}

function buildDashboardPeriodLabel(preset: DashboardPeriodPreset, bounds: DashboardPeriodBounds) {
  if (preset === "lifetime") return "Lifetime";
  if (!bounds.start || !bounds.endExclusive) return "Select dates";
  const end = new Date(bounds.endExclusive);
  end.setDate(end.getDate() - 1);
  const format = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (bounds.start.toDateString() === end.toDateString()) return format.format(bounds.start);
  return `${format.format(bounds.start)} - ${format.format(end)}`;
}

function buildDashboardMonthSlots(bounds: DashboardPeriodBounds, values: Array<string | Date | null | undefined>) {
  const validDates = values.map((value) => value ? new Date(value) : null).filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())));
  const now = new Date();
  const earliest = validDates.length ? new Date(Math.min(...validDates.map((date) => date.getTime()))) : now;
  const start = bounds.start ?? new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const endExclusive = bounds.endExclusive ?? new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthCount = Math.max(1, (endExclusive.getFullYear() - start.getFullYear()) * 12 + endExclusive.getMonth() - start.getMonth());
  const includeYear = monthCount > 12 || start.getFullYear() !== now.getFullYear();
  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-IN", includeYear ? { month: "short", year: "2-digit" } : { month: "short" }).format(date)
    };
  });
}

async function downloadExcel(filename: string, title: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }
  try {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Darji Admin";
    workbook.created = new Date();
    const sheetName = title.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Export";
    const worksheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
    const sourceHeaders = Object.keys(rows[0]);
    const headers = ["S. No.", ...sourceHeaders.map(humanizeFieldLabel)];
    worksheet.addRow(headers);
    rows.forEach((row, index) => worksheet.addRow([
      index + 1,
      ...sourceHeaders.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (value instanceof Date || typeof value === "number" || typeof value === "boolean") return value;
        const cellText = typeof value === "object" ? JSON.stringify(value) : String(value);
        return /^[=+@\t\r]/.test(cellText) ? `'${cellText}` : cellText;
      })
    ]));
    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2241" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    worksheet.eachRow((row, rowNumber) => {
      row.font = { ...row.font, name: "Arial", size: 10 };
      row.alignment = { vertical: "middle" };
      if (rowNumber > 1 && rowNumber % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8EC" } };
      row.eachCell((cell) => { cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } }; });
    });
    worksheet.columns.forEach((column, columnIndex) => {
      let width = columnIndex === 0 ? 9 : headers[columnIndex]?.length ?? 12;
      column.eachCell?.({ includeEmpty: false }, (cell) => { width = Math.max(width, String(cell.value ?? "").length + 2); });
      column.width = Math.min(Math.max(width, 10), 42);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${title} Excel workbook downloaded`);
  } catch (error) {
    toast.error(extractError(error));
  }
}

function printTableReport(title: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }
  const reportWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!reportWindow) {
    toast.error("Allow pop-ups to create the PDF report");
    return;
  }
  const headers = ["S. No.", ...Object.keys(rows[0])];
  const cells = rows.map((row, index) => `<tr>${headers.map((header) => `<td>${escapeHtml(String(header === "S. No." ? index + 1 : row[header] ?? ""))}</td>`).join("")}</tr>`).join("");
  reportWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} report</title><style>@page{size:landscape;margin:12mm}body{font:12px ui-sans-serif,system-ui,sans-serif;color:#172033}h1{font-size:22px;margin:0 0 4px}p{color:#667085;margin:0 0 18px}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #d7dce3;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#fff1cf;color:#3b2a0c}tr:nth-child(even){background:#f8fafc}</style></head><body><h1>Darji — ${escapeHtml(title)}</h1><p>${rows.length} rows · Generated ${escapeHtml(new Date().toLocaleString("en-IN"))}</p><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${cells}</tbody></table><script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
  reportWindow.document.close();
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadFileBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim() || "order";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function collectOrderMedia(order: Order) {
  const media: Array<{ label: string; resourceType: "image" | "video"; url: string }> = [];
  const seen = new Set<string>();
  const add = (label: string, url?: string, resourceType: "image" | "video" = "image") => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    media.push({ label, resourceType, url });
  };

  (order.request?.media ?? []).forEach((item: any, index: number) => add(`Customer media ${index + 1}`, item?.url, item?.resourceType === "video" ? "video" : "image"));
  (order.request?.sampleMedia ?? []).forEach((item: any, index: number) => add(`Sample media ${index + 1}`, item?.url, item?.resourceType === "video" ? "video" : "image"));
  (order.request?.receivedMedia ?? []).forEach((item: any, index: number) => add(`Tailor received ${index + 1}`, item?.url, item?.resourceType === "video" ? "video" : "image"));
  (order.request?.stitchedMedia ?? []).forEach((item: any, index: number) => add(`Tailor stitched ${index + 1}`, item?.url, item?.resourceType === "video" ? "video" : "image"));
  (order.items ?? []).forEach((item, index) => add(`Order item ${index + 1}`, item.referenceImageUrl));
  add("Pickup proof", order.pickupImageUrl);
  add("Delivery proof", order.deliveryProofUrl);
  add("Final proof", order.finalImageUrl);

  return media;
}

function openPrintableInvoice(order: Order) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=980,height=860");
  if (!popup) {
    toast.error("Allow popups to print the invoice");
    return;
  }

  const customerName = getCustomerDisplayName(order.customer);
  const items = (order.items ?? [])
    .map((item, index) => {
      const title = escapeHtml(item.service?.name ?? "Service item");
      const subtitle = escapeHtml(`${item.service?.category?.name ?? "General"} / Qty ${item.quantity}`);
      const amount = formatCurrency(item.price ?? item.service?.price ?? 0);
      return `
        <tr>
          <td style="width:56px;padding:12px 12px 12px 0;border-bottom:1px solid #eee;color:#6b7280">${index + 1}</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <div style="font-weight:600;color:#111827">${title}</div>
            <div style="font-size:12px;color:#6b7280">${subtitle}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#111827">${amount}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(getOrderDisplayNumber(order))}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #faf7f0; color: #111827; }
          .page { max-width: 860px; margin: 0 auto; padding: 28px; }
          .card { background: #fff; border: 1px solid #ead8b2; border-radius: 24px; padding: 24px; box-shadow: 0 20px 45px rgba(0,0,0,0.06); }
          .header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
          .muted { color: #6b7280; font-size: 12px; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
          .stat { border: 1px solid #eee3c8; border-radius: 18px; padding: 14px; background: #fffdf8; }
          .stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #9a7a2b; }
          .stat .value { margin-top: 6px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          .total { display: flex; justify-content: space-between; margin-top: 18px; font-weight: 700; font-size: 18px; }
          .footer { margin-top: 18px; color: #6b7280; font-size: 12px; }
          @media print {
            body { background: white; }
            .page { padding: 0; max-width: none; }
            .card { border: none; box-shadow: none; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="card">
            <div class="header">
              <div>
                <div style="font-size:28px;font-weight:800;letter-spacing:-0.03em">Darji Invoice</div>
                <div class="muted">Order ${escapeHtml(getOrderDisplayNumber(order))}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700">${escapeHtml(formatStatus(order.status))}</div>
                <div class="muted">${escapeHtml(formatDate(order.createdAt, true))}</div>
              </div>
            </div>

            <div class="grid">
              <div class="stat"><div class="label">Customer</div><div class="value">${escapeHtml(customerName)}</div><div class="muted">${escapeHtml(order.customer?.phone ?? "No phone")}</div></div>
              <div class="stat"><div class="label">Payment</div><div class="value">${escapeHtml(order.paymentMethod)} / ${escapeHtml(order.paymentStatus)}</div><div class="muted">Order total ${escapeHtml(formatCurrency(order.totalAmount))}</div></div>
              <div class="stat"><div class="label">Tailor</div><div class="value">${escapeHtml(order.tailor ? getTailorDisplayName(order.tailor) : "Unassigned")}</div></div>
              <div class="stat"><div class="label">Pickup schedule</div><div class="value">${escapeHtml(formatDate(order.pickupScheduledAt, true))}</div></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:56px;text-align:left;padding:0 12px 12px 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em">S. No.</th>
                  <th style="text-align:left;padding:0 0 12px 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em">Item</th>
                  <th style="text-align:right;padding:0 0 12px 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em">Amount</th>
                </tr>
              </thead>
              <tbody>${items || `<tr><td colspan="3" style="padding:12px 0;color:#6b7280">No line items available.</td></tr>`}</tbody>
            </table>

            <div class="total">
              <span>Total</span>
              <span>${escapeHtml(formatCurrency(order.totalAmount))}</span>
            </div>

            ${order.instructions ? `<div class="footer"><strong>Instructions:</strong> ${escapeHtml(order.instructions)}</div>` : ""}
          </div>
        </div>
      </body>
    </html>
  `;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 250);
}
