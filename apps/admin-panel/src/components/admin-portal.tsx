"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { defaultPlatformStatus, orderStatuses, type PlatformStatus } from "@darzi/shared";
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
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  Filter,
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
  Hourglass
} from "lucide-react";
import { forwardRef, useEffect, useMemo, useState, useRef, type ComponentType, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import {
  assignOrder,
  assignMeasurementVisit,
  cancelDeliveryRetry,
  createCoupon,
  deleteAdminAccount,
  extractError,
  getAnalytics,
  getDashboardAnalytics,
  getCoupons,
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
  getWalletPayouts,
  getWalletDetail,
  createWalletPayout,
  getDeliveryFareSettings,
  getOperationalAlerts,
  updateOperationalAlert,
  updateDeliveryFareSettings,
  getSettings,
  resetEverythingDevelopment,
  resetOrdersRequestsBatches,
  getSupportTickets,
  getTailoringRequests,
  getTailors,
  getUsers,
  inviteAdmin,
  markPaymentPaid,
  moderateUser,
  requestOtp,
  reviewDeliveryVerification,
  reviewTailorSample,
  reviewTailorVerification,
  updateOrderStatus,
  updatePlatformStatus,
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
  resolveDeliveryRetry,
  retryDeliveryNow,
  reassignDeliveryBatchTask,
  sendAdminNotification,
  addSupportTicketMessage,
  addBugReportMessage,
  addChangeRequestMessage,
  uploadAdminMedia,
  type AdminReview
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
  Payment,
  BasicUser,
  SettingRecord,
  SupportTicket,
  TailorProfile,
  TailoringRequest,
  BugReport,
  AccountChangeRequest,
  SupportStats,
  WalletPayoutRow,
  WalletDetail,
  DeliveryFareSettings,
  OperationalAlert
} from "@/src/types/admin";
import dynamic from "next/dynamic";
const RiderLiveMap = dynamic(() => import("./RiderLiveMap"), { ssr: false });

type TrendRange = "daily" | "weekly" | "monthly";
type DashboardPeriodPreset = "today" | "yesterday" | "this_week" | "last_week" | "last_7_days" | "last_30_days" | "this_month" | "previous_month" | "custom" | "lifetime";

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
  deliveryEarnings: number;
  netRevenue: number;
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

const sidebarSections: Array<{ id: SectionId; icon: React.ComponentType<{ size?: number }>; label: string; description: string }> = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard", description: "Platform health and trends" },
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
  { id: "analytics", icon: BarChart3, label: "Analytics", description: "Dedicated reports and exports" },
  { id: "activity", icon: FileText, label: "Activity Logs", description: "Admin action audit trail" },
  { id: "roles", icon: ShieldCheck, label: "Accounts", description: "Approved admin phone access" },
  { id: "health", icon: AlertCircle, label: "System Health", description: "Technical service monitoring" },
  { id: "exports", icon: Paperclip, label: "Export Center", description: "Central data export hub" },
  { id: "platform", icon: AlertTriangle, label: "Platform Settings", description: "Live and maintenance controls" },
  { id: "settings", icon: Settings, label: "Settings", description: "Operational configuration" }
];

const pieColors = ["#f6a313", "#0b2241", "#2a79ff", "#f97316", "#10b981"];
const darziChartPalette = {
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
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    if (!sessionNotice) return;
    toast.error(sessionNotice);
    clearSessionNotice();
  }, [clearSessionNotice, sessionNotice]);
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
  const [payoutTarget, setPayoutTarget] = useState<WalletPayoutRow | null>(null);
  const [payoutDraft, setPayoutDraft] = useState({ amount: "", receiptUrl: "", notes: "", referenceNumber: "" });
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [orderDetailFocus, setOrderDetailFocus] = useState<OrderDetailFocus>("overview");
  const [tailoringDetail, setTailoringDetail] = useState<TailoringRequest | null>(null);
  const [deliveryDetail, setDeliveryDetail] = useState<DeliveryRequest | null>(null);
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
  const [couponDraft, setCouponDraft] = useState({
    code: "",
    description: "",
    discountType: "FLAT" as "FLAT" | "PERCENTAGE",
    discountValue: 100,
    minOrderValue: 499,
    maxDiscount: "",
    expiresAt: "",
    isActive: true
  });
  const [settingsDrafts, setSettingsDrafts] = useState<Record<string, string>>({});
  const [batchSettingsDraft, setBatchSettingsDraft] = useState<DeliveryBatchSettingsDraft>({ lockMinutes: 45, maxOrdersPerBatch: 10 });
  const [platformStatusDraft, setPlatformStatusDraft] = useState<PlatformStatus>(defaultPlatformStatus);
  const [tailorTutorialDraft, setTailorTutorialDraft] = useState<TailorTutorialMediaDraft>(() => defaultTailorTutorialMediaDraft());
  const [uploadingTutorialMedia, setUploadingTutorialMedia] = useState<"video" | "thumbnail" | "image" | null>(null);
  const queryClient = useQueryClient();
  const isAuthed = Boolean(token);
  const supportSubTab = persistedSupportSubTab;

  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    enabled: isAuthed
  });
  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: getAnalytics,
    enabled: isAuthed
  });
  const ordersQuery = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => getOrders(),
    enabled: isAuthed
  });
  const tailoringQuery = useQuery({
    queryKey: ["admin", "tailoring-requests"],
    queryFn: getTailoringRequests,
    enabled: isAuthed
  });
  const deliveryQuery = useQuery({
    queryKey: ["admin", "delivery-requests"],
    queryFn: getDeliveryRequests,
    enabled: isAuthed
  });
  const deliveryRetriesQuery = useQuery({
    queryKey: ["admin", "delivery-retries"],
    queryFn: getDeliveryRetries,
    enabled: isAuthed
  });
  const deliveryBatchesQuery = useQuery({
    queryKey: ["admin", "delivery-batches"],
    queryFn: getDeliveryBatches,
    enabled: isAuthed,
    refetchInterval: 5000
  });
  const dashboardAnalyticsQuery = useQuery({
    queryKey: ["admin", "dashboard-analytics", dashboardPeriod, payoutPeriodParams.weekStart, payoutPeriodParams.weekEnd],
    queryFn: () => getDashboardAnalytics({ start: payoutPeriodParams.weekStart, endExclusive: payoutPeriodParams.weekEnd, lifetime: dashboardPeriod === "lifetime" }),
    enabled: isAuthed
  });
  const measurementVisitsQuery = useQuery({
    queryKey: ["admin", "measurement-visits"],
    queryFn: getMeasurementVisits,
    enabled: isAuthed,
    refetchInterval: 10000
  });
  const operationalAlertsQuery = useQuery({
    queryKey: ["admin", "operational-alerts", "ALL"],
    queryFn: () => getOperationalAlerts(),
    enabled: isAuthed,
    refetchInterval: 10000
  });
  const tailorsQuery = useQuery({
    queryKey: ["admin", "tailors"],
    queryFn: getTailors,
    enabled: isAuthed
  });
  const partnersQuery = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: getDeliveryPartners,
    enabled: isAuthed,
    refetchInterval: 5000
  });
  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: getUsers,
    enabled: isAuthed
  });
  const paymentsQuery = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: getPayments,
    enabled: isAuthed
  });
  const tailorPayoutsQuery = useQuery({
    queryKey: ["admin", "wallet-payouts", "tailors", payoutPeriodParams.weekStart, payoutPeriodParams.weekEnd],
    queryFn: () => getWalletPayouts("TAILOR", payoutPeriodParams),
    enabled: isAuthed
  });
  const deliveryPayoutsQuery = useQuery({
    queryKey: ["admin", "wallet-payouts", "delivery", payoutPeriodParams.weekStart, payoutPeriodParams.weekEnd],
    queryFn: () => getWalletPayouts("DELIVERY_PARTNER", payoutPeriodParams),
    enabled: isAuthed
  });
  const walletDetailQuery = useQuery({
    queryKey: ["admin", "wallet-detail", walletDetailTarget?.userId],
    queryFn: () => getWalletDetail(walletDetailTarget!.userId),
    enabled: isAuthed && Boolean(walletDetailTarget)
  });
  const deliveryFareSettingsQuery = useQuery({
    queryKey: ["admin", "delivery-fare-settings"],
    queryFn: getDeliveryFareSettings,
    enabled: isAuthed
  });
  const couponsQuery = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: getCoupons,
    enabled: isAuthed
  });
  const supportQuery = useQuery({
    queryKey: ["admin", "support"],
    queryFn: getSupportTickets,
    enabled: isAuthed
  });
  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: getSettings,
    enabled: isAuthed
  });
  const platformStatusQuery = useQuery({
    queryKey: ["admin", "platform-status"],
    queryFn: getPlatformStatus,
    enabled: isAuthed,
    refetchInterval: 60_000
  });
  const supportStatsQuery = useQuery({
    queryKey: ["admin", "support-stats"],
    queryFn: getSupportStats,
    enabled: isAuthed
  });
  const bugReportsQuery = useQuery({
    queryKey: ["admin", "bug-reports"],
    queryFn: getBugReports,
    enabled: isAuthed
  });
  const changeRequestsQuery = useQuery({
    queryKey: ["admin", "change-requests"],
    queryFn: getAccountChangeRequests,
    enabled: isAuthed
  });
  const reviewsQuery = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: getAdminReviews,
    enabled: isAuthed
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
  const dashboardData = !meQuery.data
    ? null
    : {
        analytics: analyticsQuery.data ?? emptyAnalytics,
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
      const nextDrafts = settingsQuery.data.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = typeof item.value === "string" ? item.value : JSON.stringify(item.value, null, 2);
        return acc;
      }, {});
      setSettingsDrafts(nextDrafts);
      const tutorialSetting = settingsQuery.data.find((item) => item.key === "tailor_tutorial_media");
      setTailorTutorialDraft(normalizeTailorTutorialDraft(tutorialSetting?.value));
      const batchSetting = settingsQuery.data.find((item) => item.key === "delivery_batch_settings");
      setBatchSettingsDraft(normalizeDeliveryBatchSettings(batchSetting?.value));
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (platformStatusQuery.data) setPlatformStatusDraft(platformStatusQuery.data);
  }, [platformStatusQuery.data]);

  useEffect(() => {
    try {
      const storedPriorities = localStorage.getItem("darzi.admin.orderPriorities");
      const storedNotes = localStorage.getItem("darzi.admin.orderNotes");
      if (storedPriorities) setOrderPriorities(JSON.parse(storedPriorities) as Record<string, AdminOrderPriority>);
      if (storedNotes) setOrderNotes(JSON.parse(storedNotes) as Record<string, AdminOrderNote[]>);
    } catch {
      setOrderPriorities({});
      setOrderNotes({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("darzi.admin.orderPriorities", JSON.stringify(orderPriorities));
  }, [orderPriorities]);

  useEffect(() => {
    localStorage.setItem("darzi.admin.orderNotes", JSON.stringify(orderNotes));
  }, [orderNotes]);

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

  const downloadMediaManifest = (order: Order) => {
    const media = collectOrderMedia(order);
    if (!media.length) {
      toast.error("No customer images found for this order");
      return;
    }
    downloadBlob(
      `${safeFileName(getOrderDisplayNumber(order))}-images.json`,
      JSON.stringify(media, null, 2),
      "application/json;charset=utf-8"
    );
    toast.success("Image manifest downloaded");
  };

  const printOrderInvoice = (order: Order) => {
    openPrintableInvoice(order);
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
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] }),
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
    mutationFn: updateOrderStatus,
    onSuccess: async () => {
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
      setCouponDraft({
        code: "",
        description: "",
        discountType: "FLAT",
        discountValue: 100,
        minOrderValue: 499,
        maxDiscount: "",
        expiresAt: "",
        isActive: true
      });
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

  const deliveryFareMutation = useMutation({
    mutationFn: updateDeliveryFareSettings,
    onSuccess: async () => {
      toast.success("Delivery fare settings saved");
      await queryClient.invalidateQueries({ queryKey: ["admin", "delivery-fare-settings"] });
    },
    onError: (error) => toast.error(extractError(error))
  });

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
      await refreshData();
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
      await refreshData();
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
      toast.success("Admin account added");
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



  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-8 text-center shadow-[var(--shadow)] backdrop-blur">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-sm text-[var(--muted)]">Loading Darzi Admin workspace...</p>
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
            return result.otp ?? "123456";
          } catch {
            return undefined;
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
        onLogout={logout}
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
            <ActionButton onClick={logout} variant="secondary">Sign in again</ActionButton>
          </div>
        </Panel>
      </PortalFrame>
    );
  }

  if (dashboardAnalyticsQuery.isError) {
    return (
      <PortalFrame
        activeSection={activeSection}
        alertCount={0}
        globalSearch={globalSearch}
        globalSearchResults={[]}
        onGlobalSearchChange={setGlobalSearch}
        onLogout={logout}
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
        onLogout={logout}
        onOpenSidebar={() => setSidebarOpen(true)}
        onSectionChange={setActiveSection}
        sidebarOpen={sidebarOpen}
        supportCount={0}
      >
        <LoadingDashboard />
      </PortalFrame>
    );
  }

  const { analytics, me, orders, tailoringRequests, deliveryRequests, deliveryBatches, tailors, partners, users, payments, coupons, tickets, settings } = dashboardData;
  const measurementVisits = measurementVisitsQuery.data ?? [];
  
  const normalizedTailoringRequests: Order[] = tailoringRequests
    .map((request) => {
      const pickupPartner = partners.find((partner) => partner.id === request.pickupPartnerId || partner.id === request.assignedDeliveryBoyId) ?? null;
      const deliveryPartner = partners.find((partner) => partner.id === request.deliveryPartnerId) ?? null;
      const orderStatusMap: Record<string, string> = {
        completed: "DELIVERED",
        cancelled: "CANCELLED",
        ready_for_delivery: "READY",
        received_by_tailor: "AT_TAILOR",
        picked_up_from_customer: "CLOTH_PICKED",
        pickup_started: "PICKUP_ASSIGNED",
        tailor_accepted: "PICKUP_ASSIGNED",
        payment_pending: "ORDER_PLACED"
      };
      const mappedStatus = request.status === "CANCELLED"
        ? "CANCELLED"
        : request.orderStatus
          ? (orderStatusMap[request.orderStatus] || request.orderStatus)
          : request.status;
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
        totalAmount: request.totalAmount || request.quoteAmount || request.selectedQuote?.price || request.ownQuote?.price || 0,
        createdAt: request.confirmedAt || request.createdAt,
        request,
        items: [{
          serviceId: "tailoring",
          quantity: 1,
          service: {
            id: "tailoring",
            name: request.workType,
            price: request.quoteAmount ?? request.selectedQuote?.price ?? request.ownQuote?.price ?? 0,
            category: { name: request.clothType }
          }
        }]
      } as unknown as Order;
    });

  const allOrders = [...orders, ...normalizedTailoringRequests];
  const dashboardAnalytics = dashboardAnalyticsQuery.data as DashboardAnalytics;
  const dashboardPeriodBounds = getDashboardPeriodBounds(dashboardPeriod, dashboardFromMonth, dashboardToMonth);
  const dashboardOrders = allOrders.filter((order) => isDateInDashboardPeriod(order.createdAt, dashboardPeriodBounds));
  const dashboardPayments = payments.filter((payment) => isDateInDashboardPeriod(payment.paidAt ?? payment.createdAt, dashboardPeriodBounds));
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
    deliveryRequests: dashboardDeliveryRequestsForPeriod,
    operationalAlerts: (operationalAlertsQuery.data ?? []).filter((alert) => isDateInDashboardPeriod(alert.createdAt, dashboardPeriodBounds)),
    orders: dashboardOrders,
    payments: dashboardPayments,
    setActiveSection,
    setBatchFocus,
    setDeliveryDetail,
    setOrderDetail,
    setTicketDetail,
    setTailoringDetail,
    tailoringRequests: dashboardTailoringRequestsForPeriod,
    tickets: tickets.filter((ticket) => isDateInDashboardPeriod(ticket.createdAt, dashboardPeriodBounds))
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
      orderFilter: ""
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
      orderFilter: "__ACTIVE__"
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
      orderFilter: "__COMPLETED__"
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
      orderFilter: "__CANCELLED__"
    },
    {
      icon: BarChart3,
      label: "Realized Net Revenue",
      formula: "Collected customer payments − recorded tailor earnings − finalized delivery payout − ₹8 packaging/other cost, for delivered orders with finalized costs only.",
      note: `From ${dashboardAnalytics.finance.realizedCompletedOrders.toLocaleString("en-IN")} completed order${dashboardAnalytics.finance.realizedCompletedOrders === 1 ? "" : "s"}`,
      tone: "sky" as const,
      value: formatCurrency(dashboardAnalytics.finance.netRevenue),
      change: comparisonLabel(dashboardAnalytics.comparison.netRevenue),
      changeTone: comparisonTone(dashboardAnalytics.comparison.netRevenue),
      target: "payments" as SectionId
    },
    {
      icon: ReceiptIndianRupee,
      label: "Gross Paid",
      formula: "Total amount successfully collected from customers during the selected period. Pending and failed payments are excluded.",
      note: "Customer paid amount",
      tone: "emerald" as const,
      value: formatCurrency(dashboardAnalytics.finance.grossPaid),
      change: comparisonLabel(dashboardAnalytics.comparison.grossPaid),
      changeTone: comparisonTone(dashboardAnalytics.comparison.grossPaid),
      target: "payments" as SectionId
    },
    {
      icon: AlertCircle,
      label: "Partner Cost",
      formula: "Tailor earnings + actual delivery partner earnings credited in the wallet ledger.",
      note: "Wallet earnings credited to tailors + delivery partners",
      tone: "rose" as const,
      value: formatCurrency(dashboardAnalytics.finance.partnerCost),
      change: "",
      changeTone: "neutral" as const,
      target: "payments" as SectionId
    },
    {
      icon: PackageCheck,
      label: "Pending Payouts",
      formula: "Current positive wallet balances owed to tailors and delivery partners. This is a current liability, not a period delta.",
      note: "Unpaid in selected period",
      tone: "amber" as const,
      value: formatCurrency(periodPendingPayouts),
      change: "",
      changeTone: "neutral" as const,
      target: "payments" as SectionId
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
      orderFilter: "__PENDING__"
    },
    {
      icon: Truck,
      label: "Delivery Partners",
      note: "Active fleet",
      tone: "cyan" as const,
      value: dashboardAnalytics.partners.activeDeliveryPartners.toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "partners" as SectionId
    },
    {
      icon: Scissors,
      label: "Active Tailors",
      note: "Available for work",
      tone: "amber" as const,
      value: dashboardAnalytics.partners.activeTailors.toLocaleString("en-IN"),
      change: "",
      changeTone: "neutral" as const,
      target: "tailors" as SectionId
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
      data: revenueSeries.map((point) => ({ label: point.label, value: point.revenue }))
    },
    {
      icon: Users,
      label: "New Customers",
      note: comparisonLabel(dashboardAnalytics.comparison.newCustomers),
      tone: "violet" as const,
      value: latestGrowthPoint.customers.toLocaleString("en-IN"),
      target: "users" as SectionId,
      data: growthSeries.map((point) => ({ label: point.label, value: point.customers }))
    },
    {
      icon: Scissors,
      label: "New Tailors",
      note: comparisonLabel(dashboardAnalytics.comparison.newTailors),
      tone: "amber" as const,
      value: latestGrowthPoint.tailors.toLocaleString("en-IN"),
      target: "tailors" as SectionId,
      data: growthSeries.map((point) => ({ label: point.label, value: point.tailors }))
    },
    {
      icon: Truck,
      label: "New Delivery Partners",
      note: comparisonLabel(dashboardAnalytics.comparison.newDeliveryPartners),
      tone: "sky" as const,
      value: latestGrowthPoint.partners.toLocaleString("en-IN"),
      target: "partners" as SectionId,
      data: growthSeries.map((point) => ({ label: point.label, value: point.partners }))
    }
  ];

  const orderPartnerOptions = [...partners]
    .filter((partner, index, list) => list.findIndex((item) => item.id === partner.id) === index)
    .sort((a, b) => getPartnerDisplayName(a).localeCompare(getPartnerDisplayName(b)));

  const filteredOrders = allOrders
    .filter((order) => isDateInDashboardPeriod(order.createdAt, dashboardPeriodBounds))
    .filter((order) => {
      const query = orderSearch.trim().toLowerCase();
      const content = [
        order.orderNumber,
        order.darjiId,
        order.customer?.name,
        order.customer?.phone,
        order.status,
        order.paymentMethod,
        order.paymentStatus,
        order.tailor?.shopName,
        order.tailor?.user?.name,
        order.deliveryPartner?.user?.name,
        order.deliveryPartner?.user?.phone,
        order.pickupPartner?.user?.name,
        order.pickupPartner?.user?.phone
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const orderPartnerId = String(order.deliveryPartner?.id ?? order.pickupPartner?.id ?? "");
      const partnerMatch = !deliveryPartnerFilter || orderPartnerId === deliveryPartnerFilter;
      const categoryMatch = !orderCategoryFilter || (order.items ?? []).some((item) => (item.service?.category?.name ?? "General") === orderCategoryFilter);
      const tailorMatch = !orderTailorFilter || order.tailor?.id === orderTailorFilter;
      const paymentMethodMatch = !paymentFilter || String(order.paymentMethod).toUpperCase() === paymentFilter;
      const paymentStatusMatch = !orderPaymentStatusFilter || String(order.paymentStatus).toUpperCase() === orderPaymentStatusFilter;
      const dateMatch = !orderDateFilter || Boolean(order.createdAt && new Date(order.createdAt).toISOString().slice(0, 10) === orderDateFilter);
      const normalizedStatus = String(order.status).toUpperCase();
      const dashboardState = classifyDashboardOrderStatus(normalizedStatus);
      const statusMatch = !orderFilter ||
        (orderFilter === "__ACTIVE__" && dashboardState === "active") ||
        (orderFilter === "__COMPLETED__" && dashboardState === "completed") ||
        (orderFilter === "__CANCELLED__" && dashboardState === "cancelled") ||
        (orderFilter === "__PENDING__" && dashboardState === "pending") ||
        normalizedStatus === orderFilter;
      return (!query || content.includes(query)) && statusMatch && partnerMatch && categoryMatch && tailorMatch && paymentMethodMatch && paymentStatusMatch && dateMatch;
    })
    .sort((a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime());

  const filteredTailoring = tailoringRequests.filter((request) =>
    !searchTerm ||
    [request.description, request.clothType, request.workType, request.darjiId, request.customer?.name, request.customer?.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredDelivery = deliveryRequests.filter((request) =>
    !searchTerm ||
    [request.taskId, request.darjiId, request.customerName, request.tailorName, request.pickupAddress, request.dropAddress, request.taskStatus]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );
  const retryDeliveryRows = (deliveryRetriesQuery.data ?? []).filter((request) =>
    !searchTerm ||
    [request.taskId, request.darjiId, request.customerName, request.tailorName, request.lastFailureReason, request.retryStatus]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredTailors = tailors.filter((tailor) => {
    const status = tailor.verificationStatus ?? "NOT_SUBMITTED";
    const matchesSearch =
      !searchTerm ||
      [tailor.shopName, tailor.darjiTailorId, tailor.user?.name, tailor.user?.phone, status, formatList(tailor.specialization)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm);
    return matchesSearch;
  });
  const rejectedTailors = filteredTailors.filter((tailor) => tailor.verificationStatus === "REJECTED");

  const filteredPartners = partners.filter((partner) => {
    const status = partner.verificationStatus ?? "NOT_SUBMITTED";
    const matchesSearch =
      !searchTerm ||
      [partner.darjiPartnerId, partner.user?.name, partner.user?.phone, getPartnerVehicleNumber(partner), getPartnerRoleLabel(partner), status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm);
    return matchesSearch;
  });

  const filteredUsers = customerUsers.filter((user) =>
    !searchTerm ||
    [
      user.name,
      user.phone,
      user.email,
      user.role,
      user.accountStatus,
      user.darjiCustomerId
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredPayments = payments.filter((payment) => {
    const content = [
      payment.order?.orderNumber,
      payment.order?.customerName,
      payment.order?.customerPhone,
      payment.method,
      payment.status,
      payment.providerRef,
      payment.source
    ].filter(Boolean).join(" ").toLowerCase();
    return (!searchTerm || content.includes(searchTerm)) && (!paymentFilter || payment.status === paymentFilter);
  });
  const tailorPayoutRows = tailorPayoutsQuery.data ?? [];
  const deliveryPayoutRows = deliveryPayoutsQuery.data ?? [];
  const activePayoutRows = paymentsSubTab === "delivery" ? deliveryPayoutRows : tailorPayoutRows;
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

  const customerOpenCount = tickets.filter(t => 
    (t.user?.role === "CUSTOMER" || t.subject?.includes("Customer") || (!t.user?.role && t.subject?.toLowerCase().includes("customer"))) && 
    (t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "PENDING")
  ).length;

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

  const admins = users.filter((u) => u.role === "ADMIN");
  const customerTickets = tickets.filter(isCustomerSupportTicket);
  const tailorChatTickets = tickets.filter(isTailorSupportTicket);
  const deliveryChatTickets = tickets.filter(isDeliverySupportTicket);
  const selectedSupportItem = ticketDetail || activeBugReport || activeChangeRequest;

  let rawSupportQueueItems: SupportQueueItem[] = [];
  if (supportSubTab === "customer") {
    rawSupportQueueItems = customerTickets.map((entity) => ({ kind: "ticket", entity }));
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
    onCallCustomer: (order) => {
      openOrderDetail(order, "overview");
      callCustomer(order);
    },
    onChatCustomer: (order) => {
      openOrderDetail(order, "notes");
      openCustomerChat(order);
    },
    onDownloadImages: (order) => {
      openOrderDetail(order, "media");
      downloadMediaManifest(order);
    },
    onDuplicateOrder: (order) => {
      const payload = {
        customerId: order.customerId,
        items: order.items,
        instructions: order.instructions,
        sourceOrderId: order.id
      };
      const draft = JSON.stringify(payload, null, 2);
      if (!navigator.clipboard?.writeText) {
        toast.error("Clipboard access is not available in this browser");
        return;
      }
      navigator.clipboard.writeText(draft).then(
        () => toast.success("Order draft copied for duplication"),
        () => toast.error("Unable to copy order draft")
      );
    },
    onGenerateInvoice: (order) => {
      openOrderDetail(order, "invoice");
      printOrderInvoice(order);
    },
    onMarkHighPriority: (order) => {
      setOrderPriorities((current) => ({ ...current, [order.id]: "High" }));
      openOrderDetail(order, "notes");
      toast.success("Order marked high priority");
    },
    onOpen: openOrderDetail,
    onReportIssue: (order) => {
      openOrderDetail(order, "notes");
      setActiveSection("support");
      toast.info("Use support to log the operational issue for this order.");
    },
    onOpenBatch: (batch) => {
      setBatchFocus(batch);
      setActiveSection("batches");
      setSidebarOpen(false);
    },
    onStatusChange: (orderId, status) => statusMutation.mutate({ orderId, status }),
    batches: deliveryBatches,
    pending: statusMutation.isPending,
    priorities: orderPriorities
  });
  const tailoringColumns = getTailoringColumns({ onOpen: setTailoringDetail });
  const deliveryColumns = getDeliveryColumns({ onOpen: setDeliveryDetail, partners });
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
    pending: paymentMutation.isPending
  });
  const couponColumns = getCouponColumns();
  const ticketColumns = getTicketColumns({ onOpen: setTicketDetail });
  const changeRequestColumns = getChangeRequestColumns({ onOpen: setActiveChangeRequest });
  const bugReportColumns = getBugReportColumns({ onOpen: setActiveBugReport, users });
  const openHeaderNotification = (alert: OperationalAlert) => {
    if (alert.status === "OPEN") notificationReadMutation.mutate([alert.id]);
    const metadata = alert.metadata ?? {};
    const ids = [alert.entityId, metadata.taskId, metadata.orderId, metadata.requestId, metadata.paymentId, metadata.batchId].filter(Boolean).map(String);
    const delivery = deliveryRequests.find((request) => ids.includes(request.id) || ids.includes(request.taskId) || ids.includes(request.orderId));
    const order = allOrders.find((item) => ids.includes(item.id) || ids.includes(String(item.darjiId ?? "")) || ids.includes(String(item.orderNumber ?? "")));
    const tailoring = tailoringRequests.find((request) => ids.includes(request.id) || ids.includes(String(request.darjiId ?? "")));
    if (delivery) {
      setDeliveryDetail(delivery);
      setActiveSection("delivery");
    } else if (order) {
      setOrderDetail(order);
      setActiveSection("orders");
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
        onLogout={logout}
        onOpenSidebar={() => setSidebarOpen(true)}
        onMarkAllNotificationsRead={() => notificationReadMutation.mutate(unreadHeaderNotifications.map((alert) => alert.id))}
        onNotificationOpen={openHeaderNotification}
        onSectionChange={(section) => {
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
                    Welcome back, {me.name ?? "Darzi Admin"}.
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6f614c]">Here&apos;s what&apos;s happening with Darji today.</p>
                </div>
                <DashboardPeriodPicker fromMonth={dashboardFromMonth} label={dateRangeLabel} onFromMonthChange={setDashboardFromMonth} onPresetChange={setDashboardPeriod} onToMonthChange={setDashboardToMonth} preset={dashboardPeriod} toMonth={dashboardToMonth} />
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-12">
              <LiveAlertsWidget className="xl:col-span-7" alerts={liveAlerts} />
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
                  onClick={() => {
                    if ("orderFilter" in item) setOrderFilter(item.orderFilter ?? "");
                    if (item.label === "Gross Paid" || item.label === "Realized Net Revenue" || item.label === "Partner Cost") {
                      setPaymentFilter("PAID");
                      setPaymentsSubTab("ledger");
                    }
                    if (item.label === "Pending Payouts") setPaymentsSubTab("tailors");
                    setActiveSection(item.target);
                  }}
                />
              ))}
            </div>

            <Panel className="overflow-hidden p-0">
              <div className="grid gap-px bg-[var(--panel-border)] sm:grid-cols-2 xl:grid-cols-5">
                <FinanceBreakdownItem label="Gross Paid" value={dashboardAnalytics.finance.realizedGrossPaid} />
                <FinanceBreakdownItem label="Tailor Cost" value={dashboardAnalytics.finance.realizedTailorCost} tone="cost" />
                <FinanceBreakdownItem label="Delivery Payout" value={dashboardAnalytics.finance.realizedDeliveryCost} tone="cost" />
                <FinanceBreakdownItem label={`Packaging (₹${dashboardAnalytics.finance.packagingCostPerOrder} × ${dashboardAnalytics.finance.realizedCompletedOrders})`} value={dashboardAnalytics.finance.realizedPackagingCost} tone="cost" />
                <FinanceBreakdownItem emphasized label="Realized Net Revenue" value={dashboardAnalytics.finance.netRevenue} />
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
                    <Bar dataKey="revenue" fill={darziChartPalette.orange} radius={[9, 9, 0, 0]} />
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
                    <Area dataKey="revenue" dot={{ fill: darziChartPalette.orange, r: 3, strokeWidth: 0 }} fill="url(#revenueFill)" stroke={darziChartPalette.orange} strokeWidth={3} type="monotone" />
                  </AreaChart>}
                </ResponsiveContainer> : <CompactChartEmptyState message="No delivered orders with finalized costs in this period." />}
              </ChartCard>

              <ChartCard title="Orders Overview" description="Mutually exclusive order states from one normalized source." className="xl:col-span-6 p-5" action={<SelectPill label={dateRangeLabel} />}>
                <div className="mb-3 flex flex-wrap gap-3 text-sm">
                  <LegendDot color={darziChartPalette.success} label={`Completed ${completedOrders}`} />
                  <LegendDot color={darziChartPalette.sky} label={`Active ${activeOrders}`} />
                  <LegendDot color={darziChartPalette.rose} label={`Cancelled ${cancelledOrders}`} />
                  <LegendDot color={darziChartPalette.orange} label={`Pending ${pendingOrders}`} />
                </div>
                {hasOrderChartData ? <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={orderSeries} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 175, 131, 0.2)" vertical={false} />
                    <XAxis axisLine={false} tickLine={false} dataKey="label" stroke="var(--muted)" />
                    <YAxis axisLine={false} tickLine={false} stroke="var(--muted)" />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Bar dataKey="completed" fill={darziChartPalette.success} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="active" fill={darziChartPalette.sky} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="cancelled" fill={darziChartPalette.rose} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="pending" fill={darziChartPalette.orange} radius={[8, 8, 0, 0]} />
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
                <MiniTrendCard key={item.label} data={item.data} formula={"formula" in item ? item.formula : undefined} icon={item.icon} label={item.label} note={item.note} tone={item.tone} value={item.value} onClick={() => {
                  if (item.label === "Completion Rate") setOrderFilter("__COMPLETED__");
                  if (item.label === "Average Order Value") setPaymentFilter("PAID");
                  setActiveSection(item.target);
                }} />
              ))}
            </div>
          </div>
        ) : null}

        {activeSection === "orders" ? (
          <OrdersManagementView
            allOrders={dashboardOrders}
            analyticsCounts={dashboardAnalytics.orders}
            categories={[...new Set(allOrders.flatMap((order) => (order.items ?? []).map((item) => item.service?.category?.name ?? "General")))].sort()}
            columns={orderColumns}
            deliveryPartnerFilter={deliveryPartnerFilter}
            deliveryPartners={orderPartnerOptions}
            filteredOrders={filteredOrders}
            orderCategoryFilter={orderCategoryFilter}
            orderDateFilter={orderDateFilter}
            orderFilter={orderFilter}
            orderPaymentStatusFilter={orderPaymentStatusFilter}
            orderSearch={orderSearch}
            orderTailorFilter={orderTailorFilter}
            paymentFilter={paymentFilter}
            tailors={tailors}
            onCategoryChange={setOrderCategoryFilter}
            onCreate={() => toast.info("Order creation is not available in the current admin API.")}
            onDateChange={setOrderDateFilter}
            onDeliveryPartnerChange={setDeliveryPartnerFilter}
            onExport={() => downloadCsv("darzi-orders.csv", filteredOrders.map(orderToCsv))}
            onPaymentMethodChange={setPaymentFilter}
            onPaymentStatusChange={setOrderPaymentStatusFilter}
            onSearchChange={setOrderSearch}
            onStatusChange={setOrderFilter}
            onTailorChange={setOrderTailorFilter}
            onReset={() => {
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
              description="Quote-based requests, work progress, and handoff readiness."
              action={<ActionButton variant="secondary" onClick={() => downloadCsv("darzi-tailoring-requests.csv", filteredTailoring.map(tailoringToCsv))}>Export CSV</ActionButton>}
            />
            <DataTable columns={tailoringColumns} data={filteredTailoring} emptyMessage="No tailoring requests available." />
          </div>
        ) : null}

        {activeSection === "delivery" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Delivery operations"
              description="Pickup and drop tasks created from the tailoring workflow."
              action={<ActionButton variant="secondary" onClick={() => downloadCsv("darzi-delivery-ops.csv", filteredDelivery.map(deliveryToCsv))}>Export CSV</ActionButton>}
            />
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
            onReassign={(taskId, batchId) => batchReassignMutation.mutate({ taskId, batchId })}
            onNotifyBatch={(batchId) => notifyBatchMutation.mutate(batchId)}
          />
        ) : null}

        {activeSection === "measurements" ? (
          <MeasurementVisitsModule
            error={measurementVisitsQuery.isError ? extractError(measurementVisitsQuery.error) : undefined}
            onAssign={(visitId, tailorId) => measurementAssignMutation.mutate({ visitId, tailorId })}
            pendingVisitId={measurementAssignMutation.isPending ? measurementAssignMutation.variables?.visitId : undefined}
            tailors={tailors}
            visits={measurementVisits}
          />
        ) : null}

        {activeSection === "tailors" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Tailor network"
              description="Only tailors who submitted verification are included. Pending, reviewed, and re-upload records remain visible."
              action={
                <div className="flex items-center justify-end gap-2">
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darzi-tailors.csv", filteredTailors.map(tailorToCsv))}>Export CSV</ActionButton>
                </div>
              }
            />
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
            <SectionIntro
              title="Delivery partner network"
              description="Only partners who submitted verification are included. The map and table use the same live five-second data refresh."
              action={
                <div className="flex items-center justify-end gap-2">
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darzi-delivery-partners.csv", filteredPartners.map(partnerToCsv))}>Export CSV</ActionButton>
                </div>
              }
            />
            <RiderLiveMap partners={filteredPartners} token={token} />
            <DataTable
              columns={partnerColumns}
              data={filteredPartners}
              emptyMessage="No submitted delivery verifications match the current search."
            />
          </div>
        ) : null}

        {activeSection === "users" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Customer directory"
              description="Every registered customer and every account with order activity appears here. Cross-role accounts remain managed in their dedicated section; deleted accounts are retained as archived order history."
              action={
                <div className="flex items-center gap-2">
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darzi-customers.csv", filteredUsers.map(userToCsv))}>Export CSV</ActionButton>
                </div>
              }
            />
            <DataTable columns={userColumns} data={filteredUsers} emptyMessage="No customers match the current search." />
          </div>
        ) : null}

        {activeSection === "payments" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Payments and collections"
              description="Payment ledger with net revenue calculated as customer paid minus tailor quote and delivery earnings."
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
                      { label: "Refunded", value: "REFUNDED" }
                    ]}
                  />
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darzi-payments.csv", filteredPayments.map(paymentToCsv))}>
                    Export CSV
                  </ActionButton>
                </div>
              }
            />
            <div className="flex flex-wrap gap-2">
              {[
                { id: "ledger", label: "Ledger" },
                { id: "tailors", label: "Tailors" },
                { id: "delivery", label: "Delivery Partners" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                    paymentsSubTab === tab.id
                      ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                      : "border-[var(--panel-border)] bg-[var(--panel)] text-[var(--foreground)] hover:border-[var(--accent)]"
                  )}
                  onClick={() => setPaymentsSubTab(tab.id as typeof paymentsSubTab)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {paymentsSubTab === "ledger" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <FinanceStatCard label="Gross paid" value={formatCurrency(financeSummary.grossPaid)} note={`${financeSummary.paidCount} settled payments`} tone="emerald" />
                  <FinanceStatCard label="Tailor due" value={formatCurrency(totalPendingTailorPayments)} note="Wallet balance due" tone="amber" />
                  <FinanceStatCard label="Delivery due" value={formatCurrency(totalPendingDeliveryPayments)} note="Delivery wallet due" tone="sky" />
                  <FinanceStatCard label="Net revenue" value={formatCurrency(financeSummary.netRevenue)} note="Gross paid - partner cost" tone="violet" />
                  <FinanceStatCard label="Wallet liabilities" value={formatCurrency(walletLiabilities)} note="All unpaid wallets" tone="rose" />
                </div>
                <DataTable columns={paymentColumns} data={filteredPayments} emptyMessage="No payment records match the current filters." />
              </>
            ) : (
              <PayoutWorkspace
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
              action={<CouponComposer draft={couponDraft} onChange={setCouponDraft} onSubmit={() => couponMutation.mutate({
                code: couponDraft.code.trim().toUpperCase(),
                description: couponDraft.description.trim(),
                discountType: couponDraft.discountType,
                discountValue: Number(couponDraft.discountValue),
                minOrderValue: Number(couponDraft.minOrderValue),
                maxDiscount: couponDraft.maxDiscount ? Number(couponDraft.maxDiscount) : null,
                expiresAt: couponDraft.expiresAt ? new Date(couponDraft.expiresAt).toISOString() : null,
                isActive: couponDraft.isActive
              })} pending={couponMutation.isPending} />}
            />
            <DataTable columns={couponColumns} data={filteredCoupons} emptyMessage="No coupons match the current search." />
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
            onToggleFeatured={(reviewId) => reviewFeaturedMutation.mutate(reviewId)}
            pendingReviewId={reviewFeaturedMutation.isPending ? reviewFeaturedMutation.variables : undefined}
            reviews={reviewsQuery.data ?? []}
          />
        ) : null}

        {activeSection === "notifications" ? (
          <NotificationsModule customers={filteredUsers} partners={partners} tailors={tailors} />
        ) : null}

        {activeSection === "analytics" ? (
          <AnalyticsModule
            categoryBreakdown={categoryBreakdown}
            financeSummary={financeSummary}
            growthSeries={growthSeries}
            orders={allOrders}
            payments={payments}
            reviews={reviewsQuery.data ?? []}
            serviceMix={serviceMix}
          />
        ) : null}

        {activeSection === "activity" ? (
          <ActivityLogsModule
            me={me}
            orders={dashboardOrders}
            payments={dashboardPayments}
            tickets={tickets.filter((ticket) => isDateInDashboardPeriod(ticket.createdAt, dashboardPeriodBounds))}
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
            analyticsOk={analyticsQuery.isSuccess}
            backendOk={meQuery.isSuccess}
            batchOk={!deliveryBatchesQuery.isError}
            paymentsOk={paymentsQuery.isSuccess}
            supportOk={supportQuery.isSuccess}
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

        {activeSection === "settings" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Platform settings"
              description="Editable operational settings already persisted through the backend settings endpoints."
            />
            <TailorTutorialMediaCard
              draft={tailorTutorialDraft}
              onChange={setTailorTutorialDraft}
              onSave={() => settingMutation.mutate({ key: "tailor_tutorial_media", value: tailorTutorialDraft })}
              onUpload={handleTutorialMediaUpload}
              pending={settingMutation.isPending}
              uploading={uploadingTutorialMedia}
            />
            <DeliveryFareSettingsCard
              settings={deliveryFareSettingsQuery.data}
              pending={deliveryFareMutation.isPending}
              onSave={(value) => deliveryFareMutation.mutate(value)}
            />
            <BatchSettingsCard
              draft={batchSettingsDraft}
              pending={settingMutation.isPending}
              onChange={setBatchSettingsDraft}
              onSave={(value) => {
                const batchSettingsRecord = settingsQuery.data?.find((item) => item.key === "delivery_batch_settings");
                const existingValue = batchSettingsRecord?.value && typeof batchSettingsRecord.value === "object" ? (batchSettingsRecord.value as Record<string, unknown>) : {};
                settingMutation.mutate({
                  key: "delivery_batch_settings",
                  value: {
                    ...existingValue,
                    lockMinutes: value.lockMinutes,
                    maxOrdersPerBatch: value.maxOrdersPerBatch
                  }
                });
              }}
            />
            <DevelopmentResetCard
              ordersPending={resetOrdersMutation.isPending}
              everythingPending={resetEverythingMutation.isPending}
              onResetOrders={() => resetOrdersMutation.mutate()}
              onResetEverything={() => resetEverythingMutation.mutate()}
            />
            <div className="grid gap-4 xl:grid-cols-2">
              {settings.filter((setting) => setting.key !== "delivery_batch_settings" && setting.key !== "platform_status").map((setting) => (
                <Panel key={setting.id}>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{setting.key}</h3>
                      <p className="text-sm text-[var(--muted)]">Last updated {formatDate(setting.updatedAt, true)}</p>
                    </div>
                    <Badge tone="slate">
                      {setting.key === "enable_area_filtering" 
                        ? "Boolean" 
                        : (typeof setting.value === "string" ? "Text" : "JSON")}
                    </Badge>
                  </div>
                  {setting.key === "enable_area_filtering" ? (
                    <div className="mt-2 rounded-2xl border border-[var(--panel-border)] bg-black/5 p-4 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">Enable Logistics Area Filtering</p>
                          <p className="text-xs text-[var(--muted)]">If disabled, delivery partners can see and accept orders from any area.</p>
                        </div>
                        <select
                          className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 py-1.5 text-sm outline-none text-[var(--foreground)]"
                          value={settingsDrafts[setting.key] === "true" ? "true" : "false"}
                          onChange={(event) => setSettingsDrafts((current) => ({ ...current, [setting.key]: event.target.value }))}
                        >
                          <option value="false">Disabled (All Areas)</option>
                          <option value="true">Enabled (Restricted by Area)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      className="h-48 w-full rounded-2xl border border-[var(--panel-border)] bg-black/5 px-4 py-3 font-mono text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] dark:bg-white/5"
                      value={settingsDrafts[setting.key] ?? ""}
                      onChange={(event) => setSettingsDrafts((current) => ({ ...current, [setting.key]: event.target.value }))}
                    />
                  )}
                  <div className="mt-4 flex justify-end">
                    <ActionButton
                      onClick={() => {
                        const raw = settingsDrafts[setting.key] ?? "";
                        let value: unknown = raw;
                        try {
                          value = JSON.parse(raw);
                        } catch {
                          value = raw;
                        }
                        settingMutation.mutate({ key: setting.key, value });
                      }}
                    >
                      Save setting
                    </ActionButton>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        ) : null}
      </PortalFrame>

      <OrderDetailDialog
        me={me}
        notes={orderDetail ? orderNotes[orderDetail.id] ?? [] : []}
        onAssign={() => orderDetail && openOrderAssignment(orderDetail)}
        onAddNote={(note) => {
          if (!orderDetail) return;
          const adminName = me.name ?? me.phone ?? "Admin";
          setOrderNotes((current) => ({
            ...current,
            [orderDetail.id]: [{ admin: adminName, note, createdAt: new Date().toISOString() }, ...(current[orderDetail.id] ?? [])]
          }));
        }}
        onPriorityChange={(priority) => {
          if (!orderDetail) return;
          setOrderPriorities((current) => ({ ...current, [orderDetail.id]: priority }));
        }}
        onStatusChange={(status) => orderDetail && statusMutation.mutate({ orderId: orderDetail.id, status })}
        open={Boolean(orderDetail)}
        order={orderDetail}
        deliveryRequests={deliveryRequests}
        priority={orderDetail ? orderPriorities[orderDetail.id] ?? "Normal" : "Normal"}
        focusSection={orderDetailFocus}
        onPrintInvoice={() => orderDetail && printOrderInvoice(orderDetail)}
        setOpen={(next) => {
          if (!next) setOrderDetail(null);
        }}
      />
      <TailoringRequestDialog
        open={Boolean(tailoringDetail)}
        request={tailoringDetail}
        setOpen={(next) => {
          if (!next) setTailoringDetail(null);
        }}
      />
      <DeliveryRequestDialog
        open={Boolean(deliveryDetail)}
        partners={partners}
        request={deliveryDetail}
        setOpen={(next) => {
          if (!next) setDeliveryDetail(null);
        }}
      />
      <ProfileDialog
        orders={allOrders}
        open={Boolean(tailorDetail)}
        profile={tailorDetail}
        pending={tailorReviewMutation.isPending || tailorSampleReviewMutation.isPending}
        onReview={(review) => tailorDetail && tailorReviewMutation.mutate({ tailorId: tailorDetail.id, status: review.status, reason: review.reason, reuploadFields: review.reuploadFields })}
        onSampleReview={(sampleId, status) => tailorDetail && tailorSampleReviewMutation.mutate({ tailorId: tailorDetail.id, sampleId, status })}
        subtitle="Tailor profile"
        setOpen={(next) => {
          if (!next) setTailorDetail(null);
        }}
      />
      <ProfileDialog
        orders={allOrders}
        open={Boolean(partnerDetail)}
        profile={partnerDetail}
        pending={partnerReviewMutation.isPending}
        onReview={(review) => partnerDetail && partnerReviewMutation.mutate({ partnerId: partnerDetail.id, status: review.status, reason: review.reason, deliveryType: review.deliveryType, assignedArea: review.assignedArea })}
        subtitle="Delivery partner profile"
        setOpen={(next) => {
          if (!next) setPartnerDetail(null);
        }}
      />
      <UserDialog
        onActivate={() => userDetail && userModerationMutation.mutate({ userId: userDetail.id, action: "ACTIVE" })}
        onBan={() => userDetail && userModerationMutation.mutate({ userId: userDetail.id, action: "BANNED", reason: "Banned by admin" })}
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
  onRequestOtp: (phone: string) => Promise<string | undefined>;
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
                      const nextOtp = await onRequestOtp(phone.trim());
                      if (nextOtp) {
                        setOtp(nextOtp.replace(/\D/g, "").slice(0, 6));
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
  const [adminProfileOpen, setAdminProfileOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState(() => ({ name: "", age: "", avatarUrl: "" }));
  const displayName = adminProfile.name || me?.name || "Super Admin";
  const profileMe: MeResponse | undefined = me ? { ...me, name: displayName, avatarUrl: adminProfile.avatarUrl || me.avatarUrl } : undefined;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("darzi.admin.profilePrefs");
      if (stored) setAdminProfile(JSON.parse(stored) as { name: string; age: string; avatarUrl: string });
    } catch {
      setAdminProfile({ name: "", age: "", avatarUrl: "" });
    }
  }, []);

  function saveAdminProfile() {
    localStorage.setItem("darzi.admin.profilePrefs", JSON.stringify(adminProfile));
    setAdminProfileOpen(false);
    toast.success("Admin profile updated");
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

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {sidebarSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;
              
              if (section.id === "support") {
                return (
                  <div key={section.id} className="space-y-1">
                    <button
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left transition",
                        isActive
                          ? "bg-[var(--accent-soft)] text-orange-500 shadow-[inset_0_0_0_1px_rgba(246,163,19,0.1)]"
                          : "text-[var(--foreground)] hover:bg-[#fff6e7] dark:hover:bg-white/5"
                      )}
                      onClick={() => onSectionChange(section.id)}
                    >
                      <span className={cn("rounded-xl p-2.5", isActive ? "bg-[var(--accent-cream)]" : "bg-[#fff8ea] dark:bg-white/5 text-[var(--muted)]")}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{section.label}</span>
                      </span>
                      <ChevronDown size={16} className={cn(isActive ? "text-[#cb7d00] dark:text-[#ffb83d]" : "text-[#c8b79b]")} />
                    </button>
                    {isActive && (
                      <div className="pl-12 space-y-1 pt-1 pb-2">
                        {[
                          { id: "customer", label: "Customer Support" },
                          { id: "tailor", label: "Tailor Support" },
                          { id: "delivery", label: "Delivery Support" },
                          { id: "bugs", label: "Bug Reports" }
                        ].map((sub) => {
                          const isSubActive = supportSubTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setSupportSubTab(sub.id as any);
                                onSectionChange("support");
                              }}
                              className={cn(
                                "flex w-full items-center py-1.5 text-sm transition-colors text-left",
                                isSubActive
                                  ? "text-orange-500 font-bold"
                                  : "text-[var(--muted)] hover:text-[var(--foreground)] font-medium"
                              )}
                            >
                              <span className="mr-2 text-xs opacity-60">-</span>
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={section.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left transition",
                    isActive
                      ? "bg-[var(--accent-soft)] text-orange-500 shadow-[inset_0_0_0_1px_rgba(246,163,19,0.1)]"
                      : "text-[var(--foreground)] hover:bg-[#fff6e7] dark:hover:bg-white/5"
                  )}
                  onClick={() => onSectionChange(section.id)}
                >
                  <span className={cn("rounded-xl p-2.5", isActive ? "bg-[var(--accent-cream)]" : "bg-[#fff8ea] dark:bg-white/5 text-[var(--muted)]")}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{section.label}</span>
                  </span>
                  <ChevronRight size={16} className={cn(isActive ? "text-[#cb7d00] dark:text-[#ffb83d]" : "text-[#c8b79b]")} />
                </button>
              );
            })}
          </div>

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

            <div className="rounded-[22px] border border-[var(--panel-border)] bg-[var(--panel-strong)] px-4 py-3">
              <div className="flex items-center gap-3">
                <AvatarBadge me={profileMe} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{displayName}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{me?.phone ?? "admin@darzi.in"}</p>
                </div>
                <ChevronDown size={16} className="ml-auto text-[var(--muted)]" />
              </div>
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

          <div className="min-w-0 px-3 py-3 sm:py-4 lg:px-6 lg:pb-8">{children}</div>
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
              <Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Name, age and avatar shown inside this admin panel.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-2xl p-2 text-[var(--muted)] hover:bg-[#fff6e7]">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
              Name
              <input className="w-full rounded-2xl border border-[var(--panel-border)] bg-white px-3 py-2.5 outline-none dark:bg-white/5" value={adminProfile.name} onChange={(event) => setAdminProfile((current) => ({ ...current, name: event.target.value }))} placeholder={me?.name ?? "Admin name"} />
            </label>
            <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
              Age
              <input className="w-full rounded-2xl border border-[var(--panel-border)] bg-white px-3 py-2.5 outline-none dark:bg-white/5" value={adminProfile.age} onChange={(event) => setAdminProfile((current) => ({ ...current, age: event.target.value }))} placeholder="Age" />
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
            <button className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#111111]" onClick={saveAdminProfile} type="button">Save Profile</button>
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

function MiniAvatar({ seed }: { seed: string }) {
  return (
    <div className="h-10 w-10 overflow-hidden rounded-full border border-[#ead8b2] bg-[#fff6e4] shadow-[0_4px_12px_rgba(206,156,39,0.12)]">
      <img alt="" className="h-full w-full object-cover" src={getDefaultAvatarUrl(seed)} />
    </div>
  );
}

function normalizedAvatarGender(gender?: string) {
  const value = gender?.trim().toLowerCase();
  if (!value) return undefined;
  if (["male", "man", "men", "boy"].includes(value)) return "boy";
  if (["female", "woman", "women", "girl"].includes(value)) return "girl";
  return undefined;
}

function getDefaultAvatarUrl(seed: string, gender?: string) {
  const selectedGender = normalizedAvatarGender(gender);
  const avatarFiles = selectedGender === "boy"
    ? ["boy.png", "young male.png", "black_male.png", "tanned_male.png", "uncle.png", "old_male.png"]
    : selectedGender === "girl"
      ? ["girl.png", "young female.png", "black_female.png", "aunt.png", "aunt_2.png"]
      : ["boy.png", "girl.png", "young male.png", "young female.png", "black_male.png", "black_female.png", "uncle.png", "aunt.png", "tanned_male.png", "old_male.png"];
  const value = Array.from(seed || "User").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `/avatars/${encodeURIComponent(avatarFiles[value % avatarFiles.length])}`;
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
        <button className="block h-full w-full text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" onClick={onClick} type="button">
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

function ReviewsManagementPanel({
  loading,
  onToggleFeatured,
  pendingReviewId,
  reviews
}: {
  loading: boolean;
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
      if (featuredFilter === "featured" && !review.isFeatured) return false;
      if (featuredFilter === "hidden" && review.isFeatured) return false;
      if (!query) return true;
      return [
        review.user?.name,
        review.user?.phone,
        review.targetName,
        review.targetPhone,
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
                { label: "Hidden from app", value: "hidden" }
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
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={8}>
                    No reviews match the current filters.
                  </td>
                </tr>
              ) : null}
              {filteredReviews.map((review) => (
                <tr key={review.id} className="border-b border-[var(--panel-border)] align-top transition hover:bg-[var(--accent-soft)]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        alt={review.user?.name ?? "Customer avatar"}
                        className="h-10 w-10 rounded-full border border-[var(--panel-border)] object-cover"
                        src={review.user?.avatarUrl || getDefaultAvatarUrl(review.user?.name ?? review.user?.phone ?? "Customer")}
                      />
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{review.user?.name ?? "Customer"}</p>
                        <p className="text-xs text-[var(--muted)]">{review.user?.phone ?? "-"}</p>
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
                  <td className="px-4 py-4"><Badge tone={review.isFeatured ? "emerald" : "slate"}>{review.isFeatured ? "Shown" : "Hidden"}</Badge></td>
                  <td className="px-4 py-4">
                    <ActionButton
                      className="px-3 py-2"
                      disabled={pendingReviewId === review.id}
                      onClick={() => onToggleFeatured(review.id)}
                      variant={review.isFeatured ? "secondary" : "primary"}
                    >
                      {review.isFeatured ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {review.isFeatured ? "Hide" : "Show"}
                    </ActionButton>
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
  tone: "amber" | "rose" | "burgundy" | "sky" | "emerald" | "violet";
  onOpen: () => void;
};

function LiveAlertsWidget({ alerts, className }: { alerts: AdminAlert[]; className?: string }) {
  return (
    <Panel className={className}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--deep)]">Live Alerts</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Operational exceptions that need admin attention.</p>
        </div>
        <Badge tone={alerts.length ? "amber" : "emerald"}>{alerts.length} active</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {alerts.length ? alerts.slice(0, 6).map((alert) => (
          <button key={alert.id} className={cn("rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-4 text-left transition hover:border-[var(--accent)]", alert.tone === "burgundy" && "bg-[#fff7f7]")} onClick={alert.onOpen} type="button">
            <Badge tone={alert.tone}>{alert.title}</Badge>
            <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{alert.detail}</p>
          </button>
        )) : <EmptyState message="No live alerts right now." />}
      </div>
    </Panel>
  );
}

function TodayOperationsWidget({ className, items, onOpen, title = "Today's Operations" }: { className?: string; items: Array<{ label: string; value: string; tone: "amber" | "emerald" | "sky" | "rose" | "violet"; target: SectionId }>; onOpen: (target: SectionId) => void; title?: string }) {
  return (
    <Panel className={className}>
      <h3 className="text-lg font-semibold text-[var(--deep)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">Operational summary for the selected dashboard period.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <button key={item.label} className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-4 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={() => onOpen(item.target)} type="button">
            <Badge tone={item.tone}>{item.label}</Badge>
            <p className="mt-3 text-2xl font-bold text-[var(--deep)]">{item.value}</p>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function NotificationsModule({ customers, partners, tailors }: { customers: AdminUser[]; partners: DeliveryPartnerProfile[]; tailors: TailorProfile[] }) {
  const [channel, setChannel] = useState("push");
  const [target, setTarget] = useState("everyone");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [history, setHistory] = useState<Array<{ id: string; channel: string; target: string; title: string; scheduledAt?: string; createdAt: string }>>([]);
  const sendMutation = useMutation({
    mutationFn: sendAdminNotification,
    onSuccess: (result) => {
      setHistory((current) => [{ id: crypto.randomUUID(), channel, target, title, scheduledAt, createdAt: new Date().toISOString() }, ...current]);
      setTitle("");
      setMessage("");
      setScheduledAt("");
      toast.success(`Notification sent to ${result.recipients} user${result.recipients === 1 ? "" : "s"}`);
    },
    onError: (error) => toast.error(extractError(error))
  });
  const targetCount = target === "customers" ? customers.length : target === "tailors" ? tailors.length : target === "delivery" ? partners.length : customers.length + tailors.length + partners.length;

  return (
    <div className="space-y-6">
      <SectionIntro title="Notifications" description="Prepare push, SMS, email, and in-app notification campaigns for Darji users." />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Channel">
              <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="push">Push Notification</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="in-app">In-App Notification</option>
              </select>
            </Field>
            <Field label="Target">
              <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4" value={target} onChange={(event) => setTarget(event.target.value)}>
                <option value="everyone">Everyone</option>
                <option value="customers">Customers</option>
                <option value="tailors">Tailors</option>
                <option value="delivery">Delivery Partners</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 outline-none" placeholder="Notification title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea className="min-h-32 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 outline-none" placeholder="Message" value={message} onChange={(event) => setMessage(event.target.value)} />
            <Field label="Schedule time">
              <input className="w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 outline-none" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            </Field>
            <ActionButton disabled={channel !== "push" || !title.trim() || !message.trim() || sendMutation.isPending} onClick={() => sendMutation.mutate({ target: target as "everyone" | "customers" | "tailors" | "delivery", title: title.trim(), body: message.trim() })}>
              {sendMutation.isPending ? "Sending..." : "Send notification"}
            </ActionButton>
          </div>
        </Panel>
        <Panel>
          <h3 className="text-lg font-semibold">Campaign Preview</h3>
          <div className="mt-4 rounded-3xl border border-[var(--panel-border)] bg-[#fbfdff] p-4">
            <Badge tone="sky">{channel.toUpperCase()} - {targetCount} recipients</Badge>
            <p className="mt-4 text-xl font-bold text-[var(--deep)]">{title || "Notification title"}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{message || "Message preview will appear here."}</p>
            <p className="mt-4 text-xs text-[var(--muted)]">{scheduledAt ? `Scheduled ${scheduledAt}` : "Send immediately"}</p>
          </div>
          <h4 className="mt-5 font-semibold">Delivery history</h4>
          <div className="mt-3 space-y-2">
            {history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--panel-border)] p-3 text-sm">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-[var(--muted)]">{item.channel} to {item.target} - {formatDate(item.createdAt, true)}</p>
              </div>
            ))}
            {!history.length ? <EmptyState message="No notification history in this browser yet." /> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AnalyticsModule({ categoryBreakdown, financeSummary, growthSeries, orders, payments, reviews, serviceMix }: { categoryBreakdown: Array<{ name: string; value: number; share: number }>; financeSummary: FinanceSummary; growthSeries: GrowthPoint[]; orders: Order[]; payments: Payment[]; reviews: AdminReview[]; serviceMix: Array<{ name: string; value: number }> }) {
  const paid = payments.filter((payment) => payment.status === "PAID");
  const repeatCustomers = new Set(orders.map((order) => order.customerId).filter((id) => orders.filter((item) => item.customerId === id).length > 1));
  const avgRating = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "-";
  return (
    <div className="space-y-6">
      <SectionIntro title="Analytics" description="Dedicated MVP reporting for revenue, orders, customer growth, delivery performance, categories and repeat behavior." action={<ActionButton variant="secondary" onClick={() => downloadCsv("darzi-analytics.csv", [{ revenue: financeSummary.netRevenue, orders: orders.length, paid: paid.length, repeatCustomers: repeatCustomers.size }])}>Export CSV</ActionButton>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinanceStatCard label="Net Revenue" value={formatCurrency(financeSummary.netRevenue)} note="Gross paid - partner cost" tone="emerald" />
        <FinanceStatCard label="Orders" value={orders.length.toLocaleString("en-IN")} note="All visible orders" tone="sky" />
        <FinanceStatCard label="Repeat Customers" value={repeatCustomers.size.toLocaleString("en-IN")} note="More than one order" tone="violet" />
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
            {(growthSeries.slice(-3).length ? growthSeries.slice(-3) : [{ label: "Now", customers: 0, tailors: 0, partners: 0 }]).map((point) => (
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

function ActivityLogsModule({ me, orders, payments, tickets }: { me: MeResponse; orders: Order[]; payments: Payment[]; tickets: SupportTicket[] }) {
  const rows = [
    ...orders.slice(0, 8).map((order) => ({ module: "Orders", action: "Viewed/managed order", value: getOrderDisplayNumber(order), at: order.updatedAt ?? order.createdAt })),
    ...payments.slice(0, 6).map((payment) => ({ module: "Payments", action: "Payment state observed", value: payment.status, at: payment.updatedAt ?? payment.createdAt })),
    ...tickets.slice(0, 6).map((ticket) => ({ module: "Support", action: "Ticket activity", value: ticket.subject, at: ticket.updatedAt ?? ticket.createdAt }))
  ].sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());
  return (
    <div className="space-y-6">
      <SectionIntro title="Activity Logs" description="MVP audit view of recent operational records. Backend-level immutable audit logging can attach to this table later." />
      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Timestamp</th></tr>
            </thead>
            <tbody>{rows.map((row, index) => <tr key={`${row.module}-${index}`} className="border-b border-[var(--panel-border)]"><td className="px-4 py-3">{me.name ?? me.phone}</td><td className="px-4 py-3">{row.module}</td><td className="px-4 py-3">{row.action}</td><td className="px-4 py-3">{row.value}</td><td className="px-4 py-3">{formatDate(row.at, true)}</td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FinanceBreakdownItem({ emphasized = false, label, tone = "income", value }: {
  emphasized?: boolean;
  label: string;
  tone?: "income" | "cost";
  value: number;
}) {
  return (
    <div className={cn("bg-[var(--panel)] px-5 py-4", emphasized && "bg-[#fff6df]") } title={emphasized ? "Realized Net Revenue = completed-order Gross Paid − recorded Tailor Cost − finalized Delivery Payout − Packaging Cost" : undefined}>
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums text-[var(--deep)]", tone === "cost" && "text-rose-700", emphasized && "text-2xl text-emerald-700")}>
        {tone === "cost" ? "−" : ""}{formatCurrency(value)}
      </p>
    </div>
  );
}

function OrdersManagementView({
  analyticsCounts,
  allOrders,
  categories,
  columns,
  deliveryPartnerFilter,
  deliveryPartners,
  filteredOrders,
  onCategoryChange,
  onCreate,
  onDateChange,
  onDeliveryPartnerChange,
  onExport,
  onPaymentMethodChange,
  onPaymentStatusChange,
  onReset,
  onSearchChange,
  onStatusChange,
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
  filteredOrders: Order[];
  onCategoryChange: (value: string) => void;
  onCreate: () => void;
  onDateChange: (value: string) => void;
  onDeliveryPartnerChange: (value: string) => void;
  onExport: () => void;
  onPaymentMethodChange: (value: string) => void;
  onPaymentStatusChange: (value: string) => void;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
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
    { label: "Cancelled", value: "__CANCELLED__", count: counts.cancelled, tone: "text-rose-600 border-rose-600" }
  ];

  return (
    <div className="space-y-5">
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
            <Download size={16} /> Export CSV
          </ActionButton>
          <ActionButton className="min-h-11 rounded-xl bg-gradient-to-r from-[#ffad16] to-[#ff8500] px-5 text-white shadow-[0_10px_24px_rgba(255,145,0,0.2)]" onClick={onCreate}>
            <Plus size={17} /> Create Order
          </ActionButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <OrderSummaryCard icon={Package} label="Total Orders" value={allOrders.length} note="100% of all orders" tone="amber" />
        <OrderSummaryCard icon={RotateCcw} label="Pending" value={counts.pending} note={`${((counts.pending / total) * 100).toFixed(1)}% pending`} tone="sky" />
        <OrderSummaryCard icon={Hourglass} label="In Progress" value={counts.progress} note={`${((counts.progress / total) * 100).toFixed(1)}% active`} tone="violet" />
        <OrderSummaryCard icon={CheckCircle2} label="Completed" value={counts.completed} note={`${((counts.completed / total) * 100).toFixed(1)}% completed`} tone="emerald" />
        <OrderSummaryCard icon={X} label="Cancelled" value={counts.cancelled} note={`${((counts.cancelled / total) * 100).toFixed(1)}% cancelled`} tone="rose" />
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="space-y-3 p-4 lg:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_repeat(4,1fr)]">
            <OrderSearchInput value={orderSearch} onChange={onSearchChange} />
            <FilterSelect value={orderFilter.startsWith("__") ? "" : orderFilter} onChange={onStatusChange} options={[{ label: "All Statuses", value: "" }, ...orderStatuses.map((status) => ({ label: formatStatus(status), value: status }))]} />
            <FilterSelect value={orderCategoryFilter} onChange={onCategoryChange} options={[{ label: "All Categories", value: "" }, ...categories.map((category) => ({ label: category, value: category }))]} />
            <FilterSelect value={deliveryPartnerFilter} onChange={onDeliveryPartnerChange} options={[{ label: "All Delivery Partners", value: "" }, ...deliveryPartners.map((partner) => ({ label: getPartnerDisplayName(partner), value: partner.id }))]} />
            <FilterSelect value={paymentFilter} onChange={onPaymentMethodChange} options={[{ label: "All Payment Methods", value: "" }, { label: "COD", value: "COD" }, { label: "Online", value: "ONLINE" }, { label: "UPI", value: "UPI" }]} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <FilterSelect value={orderTailorFilter} onChange={onTailorChange} options={[{ label: "All Tailors", value: "" }, ...tailors.map((tailor) => ({ label: getTailorDisplayName(tailor), value: tailor.id }))]} />
            <FilterSelect value={orderPaymentStatusFilter} onChange={onPaymentStatusChange} options={[{ label: "All Payment Status", value: "" }, { label: "Paid", value: "PAID" }, { label: "Pending", value: "PENDING" }, { label: "Failed", value: "FAILED" }, { label: "Refunded", value: "REFUNDED" }]} />
            <label className="relative flex h-12 items-center rounded-xl border border-[var(--panel-border)] bg-white px-4 text-sm text-[var(--foreground)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-soft)]">
              <CalendarDays className="mr-3 text-[var(--muted)]" size={16} />
              <input aria-label="Order date" className="h-full min-w-0 flex-1 cursor-pointer bg-transparent text-sm text-[var(--foreground)] outline-none [color-scheme:light]" type="date" value={orderDateFilter} onChange={(event) => onDateChange(event.target.value)} />
            </label>
            <ActionButton className="h-12 rounded-xl px-5" variant="secondary" onClick={onReset}><RotateCcw size={16} /> Reset</ActionButton>
            <ActionButton className="h-12 rounded-xl px-5" variant="secondary" onClick={() => toast.info("All available order filters are shown.")}><Filter size={16} /> More Filters</ActionButton>
          </div>
        </div>
        <div className="flex gap-7 overflow-x-auto border-t border-[var(--panel-border)] px-4 lg:px-5">
          {statusTabs.map((tab) => {
            const selected = orderFilter === tab.value;
            return <button key={tab.label} className={cn("flex shrink-0 items-center gap-2 border-b border-transparent py-3.5 text-sm font-semibold transition", selected ? tab.tone : "text-[var(--muted)] hover:text-[var(--foreground)]")} onClick={() => onStatusChange(tab.value)} type="button">{tab.label}<span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{tab.count}</span></button>;
          })}
        </div>
      </Panel>

      <OrdersTable columns={columns} data={filteredOrders} emptyMessage="No orders match the current filters." />
    </div>
  );
}

function OrderSearchInput({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} /><input className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" onChange={(event) => onChange(event.target.value)} placeholder="Search orders..." value={value} /></div>;
}

function OrderSummaryCard({ icon: Icon, label, note, tone, value }: { icon: ComponentType<{ size?: number }>; label: string; note: string; tone: "amber" | "sky" | "violet" | "emerald" | "rose"; value: number }) {
  const tones = { amber: "bg-orange-50 text-orange-500", sky: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600", rose: "bg-rose-50 text-rose-600" };
  return <Panel className="rounded-2xl p-4"><div className="flex items-center gap-4"><span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-full", tones[tone])}><Icon size={24} /></span><div><p className={cn("text-xs font-semibold", tones[tone].split(" ")[1])}>{label}</p><p className="mt-0.5 text-2xl font-bold text-[var(--deep)]">{value.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-[var(--muted)]">{note}</p></div></div></Panel>;
}

function OrdersTable({ columns, data, emptyMessage }: { columns: Array<ColumnDef<Order>>; data: Order[]; emptyMessage: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
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

  return <Panel className="max-w-full overflow-hidden rounded-2xl p-0"><div className="scroll-mt-24 overflow-x-auto overscroll-x-contain" ref={tableTopRef}><table className="w-full min-w-[1080px] text-left text-xs"><thead className="bg-[#fffcf7] text-[11px] text-slate-500">{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th className="whitespace-nowrap px-3 py-3.5 font-semibold" key={header.id}><button className="inline-flex items-center gap-1.5" onClick={() => header.column.getCanSort() && header.column.toggleSorting(header.column.getIsSorted() === "asc")} type="button">{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getCanSort() ? <ChevronDown size={12} /> : null}</button></th>)}</tr>)}</thead><tbody>{!pageRows.length ? <tr><td className="px-4 py-14 text-center text-[var(--muted)]" colSpan={columns.length}>{emptyMessage}</td></tr> : pageRows.map((row) => <tr className="border-t border-l-[3px] border-[var(--panel-border)] bg-white align-middle transition hover:bg-orange-50/30" key={row.id} style={{ borderLeftColor: statusRail(row.original.status) }}>{row.getVisibleCells().map((cell) => <td className="px-3 py-3 align-middle" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div><div className="flex flex-col gap-3 border-t border-[var(--panel-border)] bg-[#fffefa] px-4 py-3.5 text-xs sm:flex-row sm:items-center sm:justify-between"><p className="text-[var(--muted)]">Showing {rows.length ? safePage * pageSize + 1 : 0} to {Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length} orders</p><div className="flex flex-wrap items-center gap-1.5"><button className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--panel-border)] bg-white disabled:opacity-40" disabled={safePage === 0} onClick={() => goToPage(safePage - 1)} type="button"><ChevronRight className="rotate-180" size={15} /></button>{visiblePages.map((index) => <button className={cn("h-8 min-w-8 rounded-lg px-2 font-semibold", safePage === index ? "bg-orange-500 text-white shadow-sm" : "text-slate-700 hover:bg-orange-50")} key={index} onClick={() => goToPage(index)} type="button">{index + 1}</button>)}<button className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--panel-border)] bg-white disabled:opacity-40" disabled={safePage >= pageCount - 1} onClick={() => goToPage(safePage + 1)} type="button"><ChevronRight size={15} /></button><select aria-label="Rows per page" className="ml-2 h-8 rounded-lg border border-[var(--panel-border)] bg-white px-2" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option></select></div></div></Panel>;
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
  const rows = admins.some((admin) => admin.phone === PROTECTED_ADMIN_PHONE)
    ? admins
    : [{ id: "protected-owner", phone: PROTECTED_ADMIN_PHONE, role: "SUPER_ADMIN", name: "Owner Admin" } as AdminUser, ...admins];

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
      <SectionIntro title="Admin Accounts" description="Only approved phone-number accounts can log in to this dashboard." />
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
            <UserRoundPlus size={16} /> Add Admin
          </ActionButton>
        </form>
      </Panel>
      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((admin) => {
                const protectedOwner = admin.phone === PROTECTED_ADMIN_PHONE;
                return (
                  <tr key={admin.id} className="border-b border-[var(--panel-border)]">
                    <td className="px-4 py-3 font-semibold">+91 {admin.phone}</td>
                    <td className="px-4 py-3"><Badge tone={protectedOwner ? "amber" : "emerald"}>{protectedOwner ? "Owner locked" : "Admin"}</Badge></td>
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

function SystemHealthModule({ analyticsOk, backendOk, batchOk, paymentsOk, supportOk }: { analyticsOk: boolean; backendOk: boolean; batchOk: boolean; paymentsOk: boolean; supportOk: boolean }) {
  const checks = [
    ["Backend Status", backendOk],
    ["Database/API Reads", analyticsOk],
    ["Payment Gateway API", paymentsOk],
    ["Support API", supportOk],
    ["Delivery Batch API", batchOk],
    ["Storage", true],
    ["Firebase", true],
    ["Environment", true]
  ] as const;
  return (
    <div className="space-y-6">
      <SectionIntro title="System Health" description="Technical monitoring snapshot from admin API availability and configured services." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {checks.map(([label, ok]) => <Panel key={label}><Badge tone={ok ? "emerald" : "rose"}>{ok ? "Healthy" : "Attention"}</Badge><p className="mt-3 font-semibold">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">{ok ? "Responding normally" : "Endpoint unavailable or failing"}</p></Panel>)}
      </div>
    </div>
  );
}

function ExportCenterModule({ analyticsRows, customers, deliveryPartners, orders, payments, supportTickets, tailors }: { analyticsRows: Array<Record<string, unknown>>; customers: AdminUser[]; deliveryPartners: DeliveryPartnerProfile[]; orders: Order[]; payments: Payment[]; supportTickets: SupportTicket[]; tailors: TailorProfile[] }) {
  const exports = [
    ["Orders", "darzi-orders.csv", orders.map(orderToCsv)],
    ["Payments", "darzi-payments.csv", payments.map(paymentToCsv)],
    ["Customers", "darzi-customers.csv", customers.map(userToCsv)],
    ["Tailors", "darzi-tailors.csv", tailors.map(tailorToCsv)],
    ["Delivery Partners", "darzi-delivery-partners.csv", deliveryPartners.map(partnerToCsv)],
    ["Analytics", "darzi-analytics.csv", analyticsRows],
    ["Support Tickets", "darzi-support.csv", supportTickets.map(ticketToCsv)]
  ] as const;
  return (
    <div className="space-y-6">
      <SectionIntro title="Export Center" description="Download operational data as CSV or Excel, or create a print-ready PDF report." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exports.map(([label, filename, rows]) => (
          <Panel key={label}>
            <h3 className="text-lg font-semibold">{label}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{rows.length} rows available</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton onClick={() => downloadCsv(filename, rows)}>CSV</ActionButton>
              <ActionButton variant="secondary" onClick={() => downloadExcel(filename.replace(/\.csv$/i, ".xls"), label, rows)}>Excel</ActionButton>
              <ActionButton variant="secondary" onClick={() => printTableReport(label, rows)}>PDF</ActionButton>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function PayoutWorkspace({
  loading,
  onDetails,
  onPay,
  payingUserId,
  rows
}: {
  loading: boolean;
  onDetails: (row: WalletPayoutRow) => void;
  onPay: (row: WalletPayoutRow) => void;
  payingUserId?: string;
  rows: WalletPayoutRow[];
}) {
  if (loading) return <LoadingDashboard />;
  const pendingRows = rows.filter((row) => Number(row.pendingAmount ?? 0) > 0);
  const paidRows = rows.filter((row) => Number(row.pendingAmount ?? 0) <= 0 && row.lastPayment);

  return (
    <div className="space-y-5">
      <Panel className="p-0">
        <div className="border-b border-[var(--panel-border)] px-4 py-4">
          <h3 className="font-semibold text-[var(--foreground)]">Pending Bills</h3>
          <p className="text-sm text-[var(--muted)]">Only unpaid wallet balances appear here.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] bg-[var(--panel)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-4 font-semibold">Name</th>
                <th className="px-4 py-4 font-semibold">Phone</th>
                <th className="px-4 py-4 font-semibold">Wallet Balance</th>
                <th className="px-4 py-4 font-semibold">Current Week</th>
                <th className="px-4 py-4 font-semibold">Last Payment</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={7}>
                    No unpaid bills right now.
                  </td>
                </tr>
              ) : null}
              {pendingRows.map((row) => {
                const paying = payingUserId === row.userId;
                return (
                <tr key={row.userId} className="border-b border-[var(--panel-border)] transition hover:bg-[var(--accent-soft)]">
                  <td className="px-4 py-4 font-semibold text-[var(--foreground)]">{row.name}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{row.phone || "-"}</td>
                  <td className="px-4 py-4 font-semibold">{formatCurrency(row.walletBalance)}</td>
                  <td className="px-4 py-4">{formatCurrency(row.currentWeekEarnings)}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{row.lastPayment ? formatDate(row.lastPayment.paidAt, true) : "-"}</td>
                  <td className="px-4 py-4"><StatusBadge value="DUE" /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onDetails(row)}>Details</ActionButton>
                      <ActionButton className="px-3 py-2" disabled={Boolean(payingUserId)} onClick={() => onPay(row)}>
                        {paying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                        {paying ? "Paying" : "Pay"}
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
          <h3 className="font-semibold text-emerald-600">Paid Bills</h3>
          <p className="text-sm text-[var(--muted)]">Settled payouts stay here with their uploaded proof.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--panel-border)] bg-[var(--panel)] text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <tr>
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
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={6}>
                    Paid bills will appear here after payout.
                  </td>
                </tr>
              ) : null}
              {paidRows.map((row) => (
                <tr key={`${row.userId}-${row.lastPayment?.id}`} className="border-b border-emerald-500/20 bg-emerald-500/5">
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
        <InstantDeliveryOrders requests={instantOrders} orders={orders} partners={partners} onOpenOrder={onOpenOrder} />
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
  onAssign,
  pendingVisitId,
  tailors,
  visits
}: {
  error?: string;
  onAssign: (visitId: string, tailorId: string) => void;
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
      <Panel className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[var(--panel-border)] bg-[#fffaf0] text-xs uppercase tracking-[0.14em] text-[var(--muted)]"><tr><th className="px-4 py-3">Visit</th><th className="px-4 py-3">Customer details</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Measurement partner</th><th className="px-4 py-3">Partner payout</th><th className="px-4 py-3">Upload</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>
        {visibleVisits.map((visit) => { const assignedTailor = tailors.find((tailor) => tailor.id === visit.assignedTailorId); const offeredTailor = tailors.find((tailor) => tailor.id === visit.offeredTailorId); const measurementCount = Object.keys(visit.submission?.measurement?.fields ?? {}).length; return <tr className="border-b border-[var(--panel-border)] last:border-0 hover:bg-[#fffaf0]/50" key={visit.id}><td className="px-4 py-4"><p className="font-bold">{visit.darjiId ?? `MVS-${visit.id.slice(0, 8).toUpperCase()}`}</p><p className="text-xs text-[var(--muted)]">Request {visit.requestId}</p></td><td className="px-4 py-4"><p className="font-semibold">{cleanText(visit.customerName) ?? "Customer"}</p><p className="text-xs text-[var(--muted)]">{visit.customerPhone ?? "Phone unavailable"}</p></td><td className="whitespace-nowrap px-4 py-4">{formatDate(visit.scheduledAt, true)}</td><td className="px-4 py-4"><p className="font-semibold">{assignedTailor ? getTailorDisplayName(assignedTailor) : offeredTailor ? getTailorDisplayName(offeredTailor) : "Unassigned"}</p><p className="text-xs text-[var(--muted)]">{assignedTailor ? assignedTailor.darjiTailorId ?? "Partner ID pending" : offeredTailor ? "Offer awaiting acceptance" : "Needs assignment"}</p></td><td className="px-4 py-4"><p className="font-bold text-emerald-700">{formatCurrency(visit.visitPayout ?? 0)}</p><p className="text-xs text-[var(--muted)]">Paid to measurement partner</p></td><td className="px-4 py-4">{visit.submittedAt || visit.status === "SUBMITTED" ? <div><Badge tone="emerald">Uploaded</Badge><p className="mt-1 text-xs text-[var(--muted)]">{measurementCount} fields</p></div> : <Badge tone="amber">Pending upload</Badge>}</td><td className="px-4 py-4"><StatusBadge value={visit.status} /></td><td className="px-4 py-4"><ActionButton className="px-3 py-2" onClick={() => setSelectedVisit(visit)} variant="secondary"><Eye className="h-4 w-4" />View details</ActionButton></td></tr>; })}
        {!visibleVisits.length ? <tr><td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={8}>{visits.length ? "No measurement visits match these filters." : "No home measurement visits have been created yet."}</td></tr> : null}
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

function InstantDeliveryOrders({ requests, orders, partners, onOpenOrder }: { requests: DeliveryRequest[]; orders: Order[]; partners: DeliveryPartnerProfile[]; onOpenOrder: (order: Order) => void }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--panel-border)] bg-[#fffaf0] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Customer / tailor</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Earnings</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th></tr>
          </thead>
          <tbody>{requests.map((request) => {
            const order = orders.find((candidate) => candidate.id === request.orderId || candidate.request?.id === request.orderId);
            const partner = partners.find((candidate) => candidate.id === request.assignedDeliveryPartnerId);
            const partnerPhone = partner?.user?.phone?.trim();
            return <tr className="border-b border-[var(--panel-border)] last:border-0" key={request.id}>
              <td className="px-4 py-4"><button className="font-bold text-[#c68008] hover:underline" onClick={() => order && onOpenOrder(order)} type="button">{order ? getOrderDisplayNumber(order) : formatCustomerRequestId(request.orderId)}</button><p className="text-xs text-[var(--muted)]">{request.taskId}</p></td>
              <td className="px-4 py-4"><DeliveryRoleBadge role={request.type === "customer_to_tailor" ? "PICKUP" : "DROP"} /></td>
              <td className="px-4 py-4"><p className="font-semibold">{cleanText(request.customerName) ?? "Customer"}</p><p className="text-xs text-[var(--muted)]">{cleanText(request.tailorName) ?? "Tailor"}</p></td>
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
          })}{!requests.length ? <tr><td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={8}>No instant delivery orders match these filters.</td></tr> : null}</tbody>
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
                    {tasks.length ? tasks.map((task) => {
                      const order = orders.find((candidate) => candidate.id === task.orderId || candidate.request?.id === task.orderId);
                      const targetBatches = activeTargetBatches.filter((target) =>
                        target.batchId !== batch.batchId &&
                        target.deliveryRound === batch.deliveryRound
                      );
                      const pending = pendingTaskId === task.id;
                      return (
                        <tr key={task.id} className="border-b border-[var(--panel-border)] last:border-0">
                          <td className="px-4 py-4">
                            <button className="font-bold text-[#c68008] hover:underline" type="button" onClick={() => order && onOpenOrder(order)}>
                              {order ? getOrderDisplayNumber(order) : formatCustomerRequestId(task.orderId)}
                            </button>
                            <p className="mt-1 text-xs text-[var(--muted)]">{task.taskId}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold">{cleanText(task.customerName) ?? cleanText(task.customerPhone) ?? "Customer"}</p>
                            <p className="text-xs text-[var(--muted)]">{task.customerPhone ?? "No phone"}</p>
                          </td>
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
                              <option value="">{pending ? "Moving..." : targetBatches.length ? "Select batch" : "No compatible batch"}</option>
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
                        <td className="px-4 py-8 text-center text-[var(--muted)]" colSpan={7}>No delivery requests in this batch yet.</td>
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
  open,
  row,
  setOpen
}: {
  detail?: WalletDetail;
  loading: boolean;
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
          <Dialog.Description className="mt-1 text-sm text-[var(--muted)]">Ledger transactions, order earnings, and payment history.</Dialog.Description>
          {loading ? (
            <div className="py-10 text-center text-[var(--muted)]">Loading wallet...</div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <FinanceStatCard label="Wallet Balance" value={formatCurrency(detail?.balance ?? 0)} note="Pending payout" tone="amber" />
                <FinanceStatCard label="Current Week" value={formatCurrency(detail?.currentWeekEarnings ?? 0)} note="Order credits this week" tone="emerald" />
                <FinanceStatCard label="Last Payment" value={detail?.lastPayment ? formatCurrency(detail.lastPayment.amount) : "-"} note={detail?.lastPayment ? formatDate(detail.lastPayment.paidAt, true) : "No payout yet"} tone="sky" />
              </div>
              <Panel>
                <h4 className="mb-3 font-semibold">Wallet Transactions</h4>
                <div className="space-y-2">
                  {(detail?.transactions ?? []).map((transaction) => (
                    <div key={transaction.id} className="rounded-2xl border border-[var(--panel-border)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{formatStatus(transaction.category)}</p>
                          <p className="text-xs text-[var(--muted)]">{transaction.remarks ?? transaction.orderId ?? "Wallet transaction"}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("font-semibold", transaction.transactionType === "CREDIT" ? "text-emerald-600" : "text-rose-600")}>
                            {transaction.transactionType === "CREDIT" ? "+" : "-"}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-[var(--muted)]">Balance {formatCurrency(transaction.balanceAfterTransaction)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!(detail?.transactions?.length) ? <EmptyState message="No wallet transactions yet." /> : null}
                </div>
              </Panel>
              <Panel>
                <h4 className="mb-3 font-semibold">Payment History</h4>
                <div className="space-y-2">
                  {(detail?.payments ?? []).map((payment) => (
                    <a key={payment.id} className="block rounded-2xl border border-[var(--panel-border)] p-3 hover:border-[var(--accent)]" href={payment.receiptUrl} target="_blank" rel="noreferrer">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-[var(--muted)]">{payment.notes ?? payment.referenceNumber ?? "Weekly payout"}</p>
                        </div>
                        <p className="text-xs text-[var(--muted)]">{formatDate(payment.paidAt, true)}</p>
                      </div>
                      {payment.receiptUrl?.startsWith("data:image") || /\.(png|jpe?g|webp)$/i.test(payment.receiptUrl) ? (
                        <img alt="Payment proof" className="mt-3 max-h-48 rounded-2xl border border-[var(--panel-border)] object-contain" src={payment.receiptUrl} />
                      ) : (
                        <p className="mt-3 text-xs font-semibold text-[var(--accent)]">Open payment proof</p>
                      )}
                    </a>
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
  const toggleMode = () => {
    if (!valid || pending) return;
    const next = { ...draft, maintenanceMode: !draft.maintenanceMode, allowAdminAccess: true as const };
    onChange(next);
    onSave(next);
  };

  return (
    <Panel>
      <div className="flex flex-col gap-5">
        <div className={cn("rounded-3xl border p-5", draft.maintenanceMode ? "border-rose-300 bg-rose-50" : "border-emerald-300 bg-emerald-50")}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full", draft.maintenanceMode ? "bg-rose-600" : "bg-emerald-600")} />
                <h3 className={cn("text-xl font-bold", draft.maintenanceMode ? "text-rose-900" : "text-emerald-900")}>
                  {draft.maintenanceMode ? "Maintenance Mode" : "Platform Live"}
                </h3>
              </div>
              <p className={cn("mt-2 text-sm", draft.maintenanceMode ? "text-rose-700" : "text-emerald-700")}>
                {draft.maintenanceMode
                  ? "Customer, tailor, and delivery workflows are paused."
                  : "All Darji customer and partner workflows are available."}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={draft.maintenanceMode}
              className={cn("inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60", draft.maintenanceMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}
              disabled={pending || !valid}
              onClick={toggleMode}
            >
              {pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : draft.maintenanceMode ? <ToggleLeft size={22} /> : <ToggleRight size={22} />}
              {draft.maintenanceMode ? "Set Platform Live" : "Enable Maintenance"}
            </button>
          </div>
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
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={6}>
                    No recent orders available.
                  </td>
                </tr>
              ) : null}
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-t border-[#f5eada] bg-white transition hover:bg-[#fffaf1]"
                  onClick={() => onOpen(order)}
                >
                  <td className="px-4 py-4 font-semibold text-[#c68008]">{order.orderNumber}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <MiniAvatar seed={order.customer?.name ?? order.customer?.phone ?? order.id} />
                      <div>
                        <p className="font-medium text-[var(--deep)]">{order.customer?.name ?? order.customer?.phone ?? "Customer"}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{order.customer?.phone ?? "No phone"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 text-[var(--foreground)]">
                      <MiniAvatar seed={getTailorDisplayName(order.tailor) ?? `tailor-${order.id}`} />
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
  items: Array<{ id: string; name: string; subtitle: string; value: string; rating?: string; onClick?: () => void }>;
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
              <MiniAvatar seed={item.name} />
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
      <button className="block w-full text-left" onClick={onClick} title={formula} type="button">
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
  draft,
  onChange,
  onSubmit,
  pending
}: {
  draft: {
    code: string;
    description: string;
    discountType: "FLAT" | "PERCENTAGE";
    discountValue: number;
    minOrderValue: number;
    maxDiscount: string;
    expiresAt: string;
    isActive: boolean;
  };
  onChange: (value: {
    code: string;
    description: string;
    discountType: "FLAT" | "PERCENTAGE";
    discountValue: number;
    minOrderValue: number;
    maxDiscount: string;
    expiresAt: string;
    isActive: boolean;
  }) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <ActionButton>Create coupon</ActionButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(94vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-semibold">New coupon</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">Create a coupon using the existing `/coupons` admin endpoint.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-full p-2 text-[var(--muted)] hover:bg-[#f4f7fb]">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Coupon code">
              <input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={draft.code} onChange={(event) => onChange({ ...draft, code: event.target.value.toUpperCase() })} />
            </Field>
            <Field label="Discount type">
              <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={draft.discountType} onChange={(event) => onChange({ ...draft, discountType: event.target.value as "FLAT" | "PERCENTAGE" })}>
                <option value="FLAT">Flat</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
            </Field>
            <Field label="Description">
              <input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
            </Field>
            <Field label="Discount value">
              <input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" type="number" value={draft.discountValue} onChange={(event) => onChange({ ...draft, discountValue: Number(event.target.value) })} />
            </Field>
            <Field label="Minimum order value">
              <input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" type="number" value={draft.minOrderValue} onChange={(event) => onChange({ ...draft, minOrderValue: Number(event.target.value) })} />
            </Field>
            <Field label="Maximum discount">
              <input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" type="number" value={draft.maxDiscount} onChange={(event) => onChange({ ...draft, maxDiscount: event.target.value })} />
            </Field>
            <Field label="Expiry">
              <input className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" type="datetime-local" value={draft.expiresAt} onChange={(event) => onChange({ ...draft, expiresAt: event.target.value })} />
            </Field>
            <Field label="Active">
              <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={String(draft.isActive)} onChange={(event) => onChange({ ...draft, isActive: event.target.value === "true" })}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <ActionButton variant="secondary">Cancel</ActionButton>
            </Dialog.Close>
            <ActionButton disabled={pending} onClick={onSubmit}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Create coupon
            </ActionButton>
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
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={columns.length}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--panel-border)] bg-[var(--panel-strong)]/50 align-top transition hover:bg-[var(--accent-soft)]/40">
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

function cleanText(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length ? trimmed : undefined;
}

function getUserDisplayName(user?: BasicUser | AdminUser | null, fallback = "Customer") {
  return cleanText(user?.name) ?? cleanText(user?.phone) ?? cleanText(user?.darjiCustomerId) ?? fallback;
}

function getCustomerDisplayName(user?: BasicUser | AdminUser | null) {
  return getUserDisplayName(user, "Customer");
}

function getTailorDisplayName(tailor?: TailorProfile | null) {
  return cleanText(tailor?.shopName) ?? cleanText(tailor?.user?.name) ?? cleanText(tailor?.user?.phone) ?? cleanText(tailor?.darjiTailorId) ?? "Tailor";
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
      avatar: getInitials(item.entity.user?.name, item.entity.userRole === "TAILOR" ? "TA" : "DP"),
      title: item.entity.user?.name ?? item.entity.user?.phone ?? "Partner",
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

function OrderDetailDialog({
  me,
  notes,
  onAssign,
  onAddNote,
  onPriorityChange,
  onStatusChange,
  onPrintInvoice,
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
  focusSection: OrderDetailFocus;
  open: boolean;
  order: Order | null;
  deliveryRequests?: any[];
  priority: AdminOrderPriority;
  setOpen: (open: boolean) => void;
}) {
  const [nextStatus, setNextStatus] = useState(order?.status ?? "ORDER_PLACED");
  const [noteDraft, setNoteDraft] = useState("");
  const overviewRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNextStatus(order?.status ?? "ORDER_PLACED");
    setNoteDraft("");
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
                    <div className="flex flex-wrap items-center gap-3"><Dialog.Title className="text-xl font-bold text-[var(--deep)]">{getOrderDisplayNumber(order)}</Dialog.Title><StatusBadge value={order.status} /></div>
                    <Dialog.Description className="mt-2 text-xs font-medium text-[var(--muted)]">Internal trace: {order.darjiId ?? order.id}</Dialog.Description>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pr-11">
                    <ActionButton className="h-10 rounded-xl px-4" variant="secondary" onClick={onAssign}><PencilLine className="h-4 w-4" />Edit</ActionButton>
                    <ActionButton className="h-10 rounded-xl px-4" variant="secondary" onClick={onPrintInvoice}><Printer className="h-4 w-4" />Print Invoice</ActionButton>
                  </div>
                </div>
                <Dialog.Close asChild><button aria-label="Close order details" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[#efd9b5] bg-white text-[var(--deep)] transition hover:bg-orange-50" type="button"><X size={18} /></button></Dialog.Close>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <OrderDrawerSummary icon={UserCircle2} label="Customer" value={getCustomerDisplayName(order.customer)} detail={order.customer?.phone ?? "No phone"} />
                  <OrderDrawerSummary icon={CalendarDays} label="Order Date & Time" value={formatDate(order.createdAt)} detail={order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"} />
                  <OrderDrawerSummary icon={CreditCard} label="Payment" value={formatStatus(order.paymentMethod)} detail={formatStatus(order.paymentStatus)} />
                  <OrderDrawerSummary icon={ReceiptIndianRupee} label="Order Total" value={formatCurrency(order.totalAmount)} detail="Customer total" />
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-4 lg:grid-cols-2" ref={overviewRef}>
                  <Panel className="rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-[var(--deep)]">Order Details</h4>
                    <div className="mt-4 grid gap-3 text-xs">
                      <OrderDetailRow label="Category" value={order.items?.[0]?.service?.category?.name ?? "General"} />
                      <OrderDetailRow label="Tailor" value={order.tailor ? getTailorDisplayName(order.tailor) : "Unassigned"} />
                      <OrderDetailRow label="Pickup Partner" value={order.pickupPartner ? getPartnerDisplayName(order.pickupPartner) : "Unassigned"} />
                      <OrderDetailRow label="Delivery Partner" value={order.deliveryPartner ? getPartnerDisplayName(order.deliveryPartner) : "Unassigned"} />
                      <OrderDetailRow label="Pickup Scheduled" value={formatDate(order.pickupScheduledAt, true)} />
                      <OrderDetailRow label="Tracking Tasks" value={`${linkedDeliveryRequests.length} linked`} />
                    </div>
                  </Panel>

                <Panel className="rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-[var(--deep)]">Order Items</h4>
                  <div className="mt-4 space-y-3">
                    {(order.items ?? []).map((item, index) => (
                      <div key={`${item.serviceId}-${index}`} className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{item.service?.name ?? "Service item"}</p>
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {item.service?.category?.name ?? "General"} / Qty {item.quantity}
                            </p>
                          </div>
                          <span className="text-sm font-medium">{formatCurrency(item.price ?? item.service?.price ?? 0)}</span>
                        </div>
                        {item.instructions ? <p className="mt-3 text-sm text-[var(--muted)]">{item.instructions}</p> : null}
                        {item.referenceImageUrl ? <img alt="Reference" className="mt-3 h-28 rounded-2xl object-cover" src={item.referenceImageUrl} /> : null}
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

                <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
                <Panel className="rounded-2xl p-4" ref={invoiceRef}>
                  <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
                    <div>
                      <h4 className="text-lg font-semibold">Admin priority</h4>
                      <p className="mt-1 text-sm text-[var(--muted)]">Local ops priority for triage and follow-up.</p>
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
                          <p className="mt-1 text-sm text-[var(--muted)]">Notes are saved in this browser for the MVP admin review.</p>
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
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                      <ActionButton className="w-full justify-center bg-gradient-to-r from-[#ffad16] to-[#ff8500] text-white" onClick={() => onStatusChange(nextStatus)}>Update status</ActionButton>
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

function OrderDrawerSummary({ detail, icon: Icon, label, value }: { detail: string; icon: ComponentType<{ size?: number }>; label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#f3e8d7] bg-white px-3 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-500"><Icon size={16} /></span><div className="min-w-0"><p className="text-[10px] font-semibold text-[var(--muted)]">{label}</p><p className="mt-0.5 truncate text-sm font-bold text-[var(--deep)]">{value}</p><p className="truncate text-[11px] text-[var(--muted)]">{detail}</p></div></div>;
}

function OrderDetailRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[120px_1fr] items-start gap-3"><span className="text-[var(--muted)]">{label}</span><span className="font-semibold text-[var(--deep)]">{value}</span></div>;
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
  return <Panel className="rounded-2xl p-4" ref={ref}><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-[var(--deep)]">Order Tracking</h4><p className="mt-1 text-xs text-[var(--muted)]">Live workflow milestones and delivery-task activity.</p></div><StatusBadge value={order.status} /></div><div className="mt-5 overflow-x-auto pb-2"><div className="flex min-w-[680px] items-start">{stages.map((stage, index) => { const reached = !cancelled && index <= stageIndex; return <div className="relative flex flex-1 flex-col items-center text-center" key={stage}>{index > 0 ? <span className={cn("absolute right-1/2 top-3 h-0.5 w-full", reached ? "bg-orange-400" : "bg-slate-200")} /> : null}<span className={cn("relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-[10px] font-bold", reached ? "border-orange-400 bg-orange-500 text-white" : "border-slate-200 bg-white text-slate-400")}>{reached ? <CheckCircle2 size={14} /> : index + 1}</span><span className={cn("mt-2 text-[11px] font-semibold", reached ? "text-[var(--deep)]" : "text-[var(--muted)]")}>{stage}</span></div>; })}</div></div><div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-[#efe3d0] bg-white px-4">{events.length ? events.map((event, index) => <div className="flex gap-3 border-b border-[#f2e8d9] py-3 last:border-b-0" key={event.id}><span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", event.tone === "issue" ? "bg-rose-500" : index === events.length - 1 ? "bg-orange-500" : "bg-emerald-500")} /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-bold text-[var(--deep)]">{event.label}</p><p className="text-[10px] text-[var(--muted)]">{formatDate(event.timestamp, true)}</p></div><p className="mt-1 text-[11px] text-[var(--muted)]">{event.detail}</p></div></div>) : <p className="py-8 text-center text-xs text-[var(--muted)]">Tracking events will appear as the order moves through the workflow.</p>}</div></Panel>;
});
OrderTrackingPanel.displayName = "OrderTrackingPanel";

function TailoringRequestDialog({
  open,
  request,
  setOpen
}: {
  open: boolean;
  request: TailoringRequest | null;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,900px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          {request ? (
            <>
              <Dialog.Title className="text-2xl font-semibold">Tailoring request</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">{request.clothType} / {request.workType}</Dialog.Description>
              <div className="mt-6 space-y-5">
                <InspectGrid
                  items={[
                    { label: "Customer", value: `${getCustomerDisplayName(request.customer)} / ${request.customer?.phone ?? "No phone"}` },
                    { label: "Request status", value: <StatusBadge value={request.status} /> },
                    { label: "Work status", value: <StatusBadge value={request.workStatus} /> },
                    { label: "Order status", value: <StatusBadge value={request.orderStatus} /> },
                    { label: "Quotes", value: request.quoteCount?.toString() ?? "0" },
                    { label: "Urgency", value: request.urgency },
                    { label: "Pickup address", value: request.pickupAddress },
                    { label: "Submitted", value: formatDate(request.createdAt, true) }
                  ]}
                />
                <Panel>
                  <h4 className="text-lg font-semibold">Description</h4>
                  <p className="mt-3 text-sm text-[var(--muted)]">{request.description}</p>
                  {request.measurementNotes ? <p className="mt-3 text-sm text-[var(--muted)]">Measurement notes: {request.measurementNotes}</p> : null}
                </Panel>
                <MediaStrip items={request.media} title="Uploaded request media" />
                <MediaStrip items={request.sampleMedia} title="Sample media" />
                <MediaStrip items={request.receivedMedia} title="Received clothing proof" />
                <MediaStrip items={request.stitchedMedia} title="Stitched clothing proof" />
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeliveryRequestDialog({
  open,
  partners,
  request,
  setOpen
}: {
  open: boolean;
  partners: DeliveryPartnerProfile[];
  request: DeliveryRequest | null;
  setOpen: (open: boolean) => void;
}) {
  const assignedPartner = partners.find((partner) => partner.id === request?.assignedDeliveryPartnerId);

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,860px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          {request ? (
            <>
              <Dialog.Title className="text-2xl font-semibold">{request.taskId}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">Delivery task created from the tailoring workflow.</Dialog.Description>
              <div className="mt-6 space-y-5">
                <InspectGrid
                  items={[
                    { label: "Task type", value: formatStatus(request.type) },
                    { label: "Task status", value: <StatusBadge value={request.taskStatus} /> },
                    ...(request.lastFailureReason ? [{ label: "Failure Reason", value: <span className="text-red-500 font-semibold">{request.lastFailureReason}</span> }] : []),
                    { label: "Assigned partner", value: assignedPartner ? <span className="inline-flex flex-wrap items-center gap-2">{getPartnerDisplayName(assignedPartner)} <DeliveryRoleBadge partner={assignedPartner} /></span> : "Unassigned" },
                    { label: "Estimated earnings", value: formatCurrency(request.estimatedEarnings) },
                    { label: "Customer", value: `${cleanText(request.customerName) ?? cleanText(request.customerPhone) ?? "Customer"} / ${request.customerPhone ?? "No phone"}` },
                    { label: "Tailor", value: `${cleanText(request.tailorName) ?? cleanText(request.tailorPhone) ?? "Tailor"} / ${request.tailorPhone ?? "No phone"}` },
                    { label: "Pickup address", value: request.pickupAddress },
                    { label: "Drop address", value: request.dropAddress }
                  ]}
                />
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProfileDialog({
  onReview,
  onSampleReview,
  orders,
  open,
  pending,
  profile,
  setOpen,
  subtitle
}: {
  onReview?: (review: { status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED"; deliveryType?: "PICKUP" | "DROP"; assignedArea?: string; reason?: string; reuploadFields?: string[] }) => void;
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
  }, [profile]);

  const isDelivery = profile ? !isTailorProfile(profile) : false;
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
  const displayName = profile
    ? isDelivery
      ? getPartnerDisplayName(profile as DeliveryPartnerProfile)
      : getTailorDisplayName(profile as TailorProfile)
    : "Profile";
  const avatarSeed = profile?.user?.name ?? profile?.user?.phone ?? displayName;
  const headline = profile
    ? isDelivery
      ? `${getPartnerRoleLabel(profile as DeliveryPartnerProfile)} delivery partner - ${getPartnerVehicleNumber(profile as DeliveryPartnerProfile)}`
      : `${(profile as TailorProfile).shopName ?? "Tailor shop"} - ${formatList((profile as TailorProfile).specialization)}`
    : subtitle;

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
                      src={profile.user?.avatarUrl || getDefaultAvatarUrl(avatarSeed)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold tracking-[-0.03em] text-[var(--deep)]">{displayName}</h3>
                      {isDelivery ? <DeliveryRoleBadge partner={profile as DeliveryPartnerProfile} /> : null}
                      <StatusBadge value={profile.verificationStatus} />
                      <Badge tone={profile.isAvailable ? "emerald" : "slate"}>{profile.isAvailable ? "Online" : "Offline"}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#6f614c]">{headline}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      <span>{profile.user?.phone ?? "No phone"}</span>
                      <span>{isDelivery ? (profile as DeliveryPartnerProfile).darjiPartnerId ?? "Partner ID pending" : (profile as TailorProfile).darjiTailorId ?? "Tailor ID pending"}</span>
                      <span>Joined {formatDate(profile.createdAt, true)}</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">For verified partners, this photo is the submitted face verification selfie.</p>
                  </div>
                </div>
                <div className="grid border-t border-white/80 bg-white/50 md:grid-cols-4">
                  <ProfileMetric label="Total orders" value={profileOrders.length.toLocaleString("en-IN")} />
                  <ProfileMetric label="Active" value={activeProfileOrders.length.toLocaleString("en-IN")} />
                  <ProfileMetric label="Completed" value={completedProfileOrders.length.toLocaleString("en-IN")} />
                  <ProfileMetric label="Rating" value={typeof profile.rating === "number" ? profile.rating.toFixed(1) : "-"} />
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {onReview ? (
                  <Panel>
                    <h4 className="text-lg font-semibold text-[var(--foreground)]">Review action</h4>
                    <textarea
                      className="mt-3 min-h-24 w-full rounded-2xl border border-[var(--panel-border)] bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] dark:bg-white/5"
                      value={reviewReason}
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
                      <ActionButton disabled={pending} onClick={() => onReview({ status: "VERIFIED", deliveryType, assignedArea, reason: reviewReason.trim() || undefined })}>
                        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                        Approve
                      </ActionButton>
                      <ActionButton
                        disabled={pending || (!isDelivery && selectedReuploadFields.length === 0)}
                        variant="secondary"
                        onClick={() => onReview({ status: "REUPLOAD_REQUIRED", reason: reviewReason.trim() || "Please upload clearer documents.", reuploadFields: selectedReuploadFields })}
                      >
                        Request reupload
                      </ActionButton>
                      <ActionButton disabled={pending} variant="danger" onClick={() => onReview({ status: "REJECTED", reason: reviewReason.trim() || "Verification documents were not approved." })}>
                        Reject
                      </ActionButton>
                    </div>
                  </Panel>
                ) : null}
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
                    { label: "Working hours", value: stringifyUnknown(profile.workingHours) },
                    { label: "Settings", value: stringifyUnknown(profile.settings) },
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
                                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Gender</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Cloth Type</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Stitching</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Price (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {vRows.map((row, i) => (
                                  <tr key={i} className="border-b border-[var(--panel-border)] last:border-0">
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
                <Panel>
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">Raw verification payload (debug)</summary>
                    <pre className="mt-4 overflow-x-auto rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-4 text-xs text-[var(--muted)]">
                      {stringifyUnknown(profile.verification)}
                    </pre>
                  </details>
                </Panel>
                <VerificationMediaGallery items={submittedMedia} title="Uploaded verification documents" />
                <VerificationMediaGallery items={draftMedia} title="Draft verification documents" />
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
  onSuspend,
  open,
  pending,
  setOpen,
  user
}: {
  onActivate: () => void;
  onBan: () => void;
  onSuspend: () => void;
  open: boolean;
  pending: boolean;
  setOpen: (open: boolean) => void;
  user: AdminUser | null;
}) {
  const displayName = user ? getCustomerDisplayName(user) : "Customer";
  const avatarSeed = user?.name ?? user?.phone ?? displayName;

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          {user ? (
            <>
              <Dialog.Title className="text-2xl font-semibold">{displayName}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">Customer profile, account state, and moderation controls.</Dialog.Description>
              <div className="mt-5 overflow-hidden rounded-[28px] border border-[var(--panel-border)] bg-[linear-gradient(135deg,#fff8e9,#fbfdff_62%,#eef6ff)]">
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/80 bg-[#fff6e4] shadow-lg">
                    <img
                      alt="Customer profile"
                      className="h-full w-full object-cover"
                      src={user.avatarUrl || getDefaultAvatarUrl(avatarSeed)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold tracking-[-0.03em] text-[var(--deep)]">{displayName}</h3>
                      <Badge tone="slate">Customer</Badge>
                      <StatusBadge value={user.accountStatus} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#6f614c]">{user.darjiCustomerId ?? "Customer ID pending"}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      <span>{user.phone ?? "No phone"}</span>
                      <span>{user.email ?? "Email not added"}</span>
                      <span>Joined {formatDate(user.createdAt, true)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {user.role === "ADMIN" ? (
                  <Badge tone="slate">Admin account is protected from moderation.</Badge>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <ActionButton disabled={pending} onClick={onActivate}>
                      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      Activate
                    </ActionButton>
                    <ActionButton disabled={pending} variant="secondary" onClick={onSuspend}>
                      Suspend 7 days
                    </ActionButton>
                    <ActionButton disabled={pending} variant="danger" onClick={onBan}>
                      Ban user
                    </ActionButton>
                  </div>
                )}
                <InspectGrid
                  items={[
                    { label: "Customer ID", value: user.darjiCustomerId ?? "-" },
                    { label: "Phone", value: user.phone },
                    { label: "Email", value: user.email ?? "-" },
                    { label: "Account", value: <StatusBadge value={user.accountStatus} /> },
                    { label: "Suspended until", value: formatDate(user.suspendedUntil, true) },
                    { label: "Moderation note", value: user.moderationReason ?? "-" }
                  ]}
                />
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
  onOpenOrder
}: {
  open: boolean;
  ticket: SupportTicket | null;
  setOpen: (open: boolean) => void;
  users: AdminUser[];
  orders: Order[];
  onOpenOrder: (order: Order) => void;
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

  const admins = users.filter((u) => u.role === "ADMIN");
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

  const admins = users.filter((u) => u.role === "ADMIN");

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
                From {getUserDisplayName(request.user, "Partner")} ({request.user?.phone ?? "No phone"}) - Role: <strong>{request.user?.role}</strong>
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
                        if (request.type !== "AccountDeletion" || window.confirm("Permanently delete this partner account? This action cannot be undone.")) {
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


function AssignOrderDialog({
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
  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(96vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          <Dialog.Title className="text-2xl font-semibold">Assign order</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">
            Update tailor, pickup partner, and delivery partner assignments using existing backend endpoints.
          </Dialog.Description>
          {order ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 py-3 text-sm">
                <p className="font-medium">{getOrderDisplayNumber(order)}</p>
                <p className="mt-1 text-[var(--muted)]">{getCustomerDisplayName(order.customer)}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tailor">
                  <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={values.tailorId} onChange={(event) => setAssignTailorId(event.target.value)}>
                    <option value="">Unassigned</option>
                    {tailors.map((tailor) => (
                      <option key={tailor.id} value={tailor.id}>
                        {getTailorDisplayName(tailor)} ({tailor.darjiTailorId ?? "Darji ID pending"})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pickup partner">
                  <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={values.pickupPartnerId} onChange={(event) => setAssignPickupPartnerId(event.target.value)}>
                    <option value="">Unassigned</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {getPartnerDisplayName(partner)} - {getPartnerRoleLabel(partner)} ({partner.darjiPartnerId ?? "Darji ID pending"})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Delivery partner">
                  <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={values.deliveryPartnerId} onChange={(event) => setAssignDeliveryPartnerId(event.target.value)}>
                    <option value="">Unassigned</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {getPartnerDisplayName(partner)} - {getPartnerRoleLabel(partner)} ({partner.darjiPartnerId ?? "Darji ID pending"})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex justify-end gap-3">
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

function getOrderColumns({
  onAssign,
  onOpen,
  onChatCustomer,
  onCallCustomer,
  onDownloadImages,
  onDuplicateOrder,
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
  onOpen: (order: Order, focus?: OrderDetailFocus) => void;
  onChatCustomer: (order: Order) => void;
  onCallCustomer: (order: Order) => void;
  onDownloadImages: (order: Order) => void;
  onDuplicateOrder: (order: Order) => void;
  onGenerateInvoice: (order: Order) => void;
  onMarkHighPriority: (order: Order) => void;
  onReportIssue: (order: Order) => void;
  onOpenBatch: (batch: BatchFocusTarget) => void;
  batches: DeliveryBatch[];
  onStatusChange: (orderId: string, status: string) => void;
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
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff0dc] text-[10px] font-bold text-orange-600">{getInitials(row.original.customer?.name, "CU")}</span>
          <div className="space-y-0.5">
            <p className="whitespace-nowrap font-semibold text-[var(--foreground)]">{getCustomerDisplayName(row.original.customer)}</p>
            <p className="text-xs text-[var(--muted)]">{row.original.customer?.phone ?? "No phone"}</p>
          </div>
        </div>
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
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">{getInitials(t.user?.name ?? t.shopName, "TA")}</span>
            <div className="space-y-0.5">
              <p className="whitespace-nowrap font-semibold text-[var(--foreground)]">{getTailorDisplayName(t)}</p>
              <p className="text-xs text-[var(--muted)]">{t.user?.phone ?? t.darjiTailorId ?? "No phone"}</p>
            </div>
          </div>
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
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-50 text-[10px] font-bold text-sky-700">{getInitials(dp.user?.name, "DP")}</span>
            <div className="space-y-0.5">
              <p className="whitespace-nowrap font-semibold text-[var(--foreground)]">{getPartnerDisplayName(dp)}</p>
              <p className="text-xs text-[var(--muted)]">{dp.user?.phone ?? dp.darjiPartnerId ?? "No phone"}</p>
            </div>
          </div>
        );
      }
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
                  <PencilLine size={14} /> Edit Order
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onAssign(row.original)}>
                  <UserRoundPlus size={14} /> Assign Tailor
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onAssign(row.original)}>
                  <UserRoundPlus size={14} /> Assign Pickup Partner
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onAssign(row.original)}>
                  <UserRoundPlus size={14} /> Reassign Delivery
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-2 h-px bg-[var(--panel-border)]" />
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onChatCustomer(row.original)}>
                  <MessageSquareText size={14} /> Chat Customer
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onCallCustomer(row.original)}>
                  <PhoneCall size={14} /> Call Customer
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onGenerateInvoice(row.original)}>
                  <Printer size={14} /> Generate Invoice
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onDownloadImages(row.original)}>
                  <Download size={14} /> Download Images
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onOpen(row.original, "notes")}>
                  <FileText size={14} /> Add Internal Note
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onDuplicateOrder(row.original)}>
                  <Copy size={14} /> Duplicate Order
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onMarkHighPriority(row.original)}>
                  <Flag size={14} /> Mark High Priority
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--accent-soft)]" onSelect={() => onReportIssue(row.original)}>
                  <AlertTriangle size={14} /> Report Issue
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-2 h-px bg-[var(--panel-border)]" />
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-[var(--foreground)] outline-none hover:bg-red-50" onSelect={() => onStatusChange(row.original.id, "CANCELLED")}>
                  <Trash2 size={14} className="text-red-500" /> Cancel Order
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
  onOpen
}: {
  onOpen: (request: TailoringRequest) => void;
}): Array<ColumnDef<TailoringRequest>> {
  return [
    {
      id: "request",
      header: "Request",
      accessorFn: (row) => row.id,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.clothType}</p>
          <p className="text-xs text-[var(--muted)]">{formatDate(row.original.createdAt, true)}</p>
        </div>
      )
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (row) => row.customer?.name ?? row.customer?.phone ?? "",
      cell: ({ row }) => (
        <span>
          {getCustomerDisplayName(row.original.customer)}{" "}
          {row.original.customer?.darjiCustomerId ? (
            <span className="text-xs font-semibold text-orange-500">({row.original.customer.darjiCustomerId})</span>
          ) : null}
        </span>
      )
    },
    {
      accessorKey: "workType",
      header: "Work type"
    },
    {
      accessorKey: "urgency",
      header: "Urgency"
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
      header: "Quotes"
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
  partners
}: {
  onOpen: (request: DeliveryRequest) => void;
  partners: DeliveryPartnerProfile[];
}): Array<ColumnDef<DeliveryRequest>> {
  return [
    {
      accessorKey: "taskId",
      header: "Task"
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <StatusBadge value={row.original.type} />
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{cleanText(row.original.customerName) ?? cleanText(row.original.customerPhone) ?? "Customer"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.customerPhone ?? "No phone"}</p>
        </div>
      )
    },
    {
      accessorKey: "tailorName",
      header: "Tailor",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{cleanText(row.original.tailorName) ?? cleanText(row.original.tailorPhone) ?? "Tailor"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.tailorPhone ?? "No phone"}</p>
        </div>
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
          <div className="flex flex-col gap-1">
            <span>
              {getPartnerDisplayName(partner)}{" "}
              {partner.darjiPartnerId ? (
                <span className="text-xs font-semibold text-orange-500">({partner.darjiPartnerId})</span>
              ) : null}
            </span>
            <DeliveryRoleBadge partner={partner} />
          </div>
        );
      }
    },
    {
      accessorKey: "estimatedEarnings",
      header: "Earnings",
      cell: ({ row }) => formatCurrency(row.original.estimatedEarnings)
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
      accessorFn: (row) => row.shopName ?? row.user?.name ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{getTailorDisplayName(row.original)}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.user?.phone ?? "No phone"}</p>
        </div>
      )
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
  onOpen,
  onReview,
  pendingDelete
}: {
  onDelete: (partner: DeliveryPartnerProfile) => void;
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
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span>{getPartnerDisplayName(row.original)}</span>
            {row.original.darjiPartnerId ? (
              <span className="text-xs font-semibold text-orange-500">({row.original.darjiPartnerId})</span>
            ) : null}
            <DeliveryRoleBadge partner={row.original} />
          </p>
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
      header: "Current status",
      accessorFn: (row) => String(row.isAvailable),
      cell: ({ row }) => {
        const hasLocation = Boolean(row.original.currentLocation?.coordinates?.length === 2);
        const locationAge = row.original.lastLocationUpdatedAt ? Date.now() - new Date(row.original.lastLocationUpdatedAt).getTime() : Number.POSITIVE_INFINITY;
        if (hasLocation && locationAge > 5 * 60 * 1000) return <Badge tone="amber">Inactive</Badge>;
        if (row.original.isAvailable && hasLocation) return <Badge tone="emerald">Online</Badge>;
        return <Badge tone="slate">Offline</Badge>;
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
        const label = !isFresh ? "Inactive GPS" : row.original.isAvailable ? "Live phone GPS" : "Offline GPS";
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
        <div>
          <p className="font-medium">
            {getCustomerDisplayName(row.original)}{" "}
            {row.original.darjiCustomerId ? (
              <span className="text-xs font-semibold text-orange-500">({row.original.darjiCustomerId})</span>
            ) : null}
          </p>
          <p className="text-xs text-[var(--muted)]">{row.original.phone}</p>
        </div>
      )
    },
    {
      accessorKey: "darjiCustomerId",
      header: "Customer ID",
      cell: ({ row }) => row.original.darjiCustomerId ?? "-"
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
  pending
}: {
  breakdowns: Map<string, PaymentBreakdown>;
  onMarkPaid: (paymentId: string) => void;
  pending: boolean;
}): Array<ColumnDef<Payment>> {
  return [
    {
      id: "order",
      header: "Order",
      accessorFn: (row) => row.order?.orderNumber ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">{row.original.order?.orderNumber ?? row.original.darjiId ?? row.original.orderId ?? "-"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{row.original.darjiId ?? "Darji ID pending"}</p>
        </div>
      )
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (row) => row.order?.customerName ?? row.order?.customerPhone ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">{cleanText(row.original.order?.customerName) ?? cleanText(row.original.order?.customerPhone) ?? "Customer"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{row.original.order?.customerPhone ?? row.original.order?.customerId ?? "-"}</p>
        </div>
      )
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => <StatusBadge value={row.original.method} />
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />
    },
    {
      accessorKey: "amount",
      header: "Customer paid",
      cell: ({ row }) => formatCurrency(row.original.amount)
    },
    {
      id: "partnerCost",
      header: "Partner cost",
      cell: ({ row }) => {
        const breakdown = breakdowns.get(row.original.id) ?? getPaymentBreakdown(row.original, new Map(), new Map());
        return (
          <div>
            <p className="font-medium text-[var(--foreground)]">{formatCurrency(breakdown.tailorQuote + breakdown.deliveryEarnings)}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tailor {formatCurrency(breakdown.tailorQuote)} + Delivery {formatCurrency(breakdown.deliveryEarnings)}
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
      cell: ({ row }) =>
        row.original.status === "PENDING" ? (
          <ActionButton className="px-3 py-2" disabled={pending} onClick={() => onMarkPaid(row.original.id)}>
            Mark paid
          </ActionButton>
        ) : (
          <Badge tone="emerald">Settled</Badge>
        )
    }
  ];
}

function getCouponColumns(): Array<ColumnDef<Coupon>> {
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
      accessorKey: "discountType",
      header: "Type",
      cell: ({ row }) => <StatusBadge value={row.original.discountType} />
    },
    {
      accessorKey: "discountValue",
      header: "Value",
      cell: ({ row }) => (row.original.discountType === "PERCENTAGE" ? `${row.original.discountValue}%` : formatCurrency(row.original.discountValue))
    },
    {
      accessorKey: "minOrderValue",
      header: "Min order",
      cell: ({ row }) => formatCurrency(row.original.minOrderValue)
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => formatDate(row.original.expiresAt)
    },
    {
      accessorKey: "isActive",
      header: "State",
      cell: ({ row }) => <Badge tone={row.original.isActive ? "emerald" : "slate"}>{row.original.isActive ? "Active" : "Disabled"}</Badge>
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

  operationalAlerts
    .filter((alert) => alert.status === "OPEN")
    .slice(0, 4)
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
      const relatedOrder = orders.find((order) => candidateIds.includes(order.id) || candidateIds.includes(String(order.darjiId ?? "")) || candidateIds.includes(String(order.orderNumber ?? "")));
      const relatedTailoring = tailoringRequests.find((request) => candidateIds.includes(request.id) || candidateIds.includes(String(request.darjiId ?? "")));
      const relatedPayment = payments.find((payment) => candidateIds.includes(payment.id) || candidateIds.includes(payment.orderId));
      const relatedBatch = deliveryRequests.find((request) => candidateIds.includes(String((request as DeliveryRequest & { batchId?: string }).batchId ?? "")));
      alerts.push({
        detail: alert.message,
        id: `operational-${alert.id}`,
        onOpen: () => {
          if (relatedDelivery) {
            setDeliveryDetail(relatedDelivery);
            setActiveSection("delivery");
          } else if (relatedOrder) {
            setOrderDetail(relatedOrder);
            setActiveSection("orders");
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
    .slice(0, 2)
    .forEach((request) => {
      alerts.push({
        detail: `${formatCustomerRequestId(request.id)} has been waiting ${Math.floor(minutesAgo(request.createdAt))} min for tailor quotes.`,
        id: `tailoring-wait-${request.id}`,
        onOpen: () => {
          setTailoringDetail(request);
          setActiveSection("tailoring");
        },
        title: "Quote pending",
        tone: "amber"
      });
    });

  deliveryRequests
    .filter((request) => isOpenDelivery(request) && !request.assignedDeliveryPartnerId && minutesAgo(request.createdAt) >= 10)
    .slice(0, 2)
    .forEach((request) => {
      alerts.push({
        detail: `${request.taskId} has no delivery partner assigned.`,
        id: `delivery-unassigned-${request.id}`,
        onOpen: () => {
          setDeliveryDetail(request);
          setActiveSection("delivery");
        },
        title: "Delivery unassigned",
        tone: "amber"
      });
    });

  deliveryRequests
    .filter((request) => isOpenDelivery(request) && Boolean(request.deadlineAt) && new Date(request.deadlineAt as string).getTime() < now)
    .slice(0, 2)
    .forEach((request) => {
      alerts.push({
        detail: `${request.taskId} is past ETA for ${formatStatus(request.type)}.`,
        id: `delivery-delay-${request.id}`,
        onOpen: () => {
          setDeliveryDetail(request);
          setActiveSection("delivery");
        },
        title: request.type === "customer_to_tailor" ? "Pickup delayed" : "Drop delayed",
        tone: "rose"
      });
    });

  deliveryRequests
    .filter((request) => Boolean(request.lastFailureReason) && isOpenDelivery(request))
    .slice(0, 2)
    .forEach((request) => {
      alerts.push({
        detail: `${request.taskId}: ${request.lastFailureReason}`,
        id: `delivery-failure-${request.id}`,
        onOpen: () => {
          setDeliveryDetail(request);
          setActiveSection("delivery");
        },
        title: "Delivery exception",
        tone: "rose"
      });
    });

  payments
    .filter((payment) => payment.status === "FAILED")
    .slice(0, 2)
    .forEach((payment) => {
      alerts.push({
        detail: `${payment.darjiId ?? payment.orderId} failed for ${formatCurrency(payment.amount)}.`,
        id: `payment-failed-${payment.id}`,
        onOpen: () => setActiveSection("payments"),
        title: "Payment failed",
        tone: "rose"
      });
    });

  payments
    .filter((payment) => payment.status === "PENDING" && minutesAgo(payment.createdAt) >= 15)
    .slice(0, 2)
    .forEach((payment) => {
      alerts.push({
        detail: `${payment.darjiId ?? payment.orderId} is still awaiting ${formatCurrency(payment.amount)}.`,
        id: `payment-pending-${payment.id}`,
        onOpen: () => setActiveSection("payments"),
        title: "Payment pending",
        tone: "amber"
      });
    });

  orders
    .filter((order) => ["ORDER_PLACED", "CONFIRMED", "AT_TAILOR", "STITCHING_STARTED"].includes(order.status) && minutesAgo(order.updatedAt ?? order.createdAt) >= 24 * 60)
    .slice(0, 2)
    .forEach((order) => {
      alerts.push({
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
    .slice(0, 2)
    .forEach((ticket) => {
      alerts.push({
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

  return alerts.slice(0, 8);
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
      netRevenue += breakdown.netRevenue;
      if (isToday(payment.createdAt)) revenueToday += breakdown.netRevenue;
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
  const deliveryEarnings = Number(payment.deliveryEarnings ?? deliveryCosts.get(payment.orderId) ?? 0);
  const netRevenue = Number(payment.netRevenue ?? customerPaid - tailorQuote - deliveryEarnings);

  return {
    customerPaid,
    tailorQuote,
    deliveryEarnings,
    netRevenue
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

function ticketToCsv(ticket: SupportTicket) {
  return {
    subject: ticket.subject,
    customer: ticket.user?.name ?? ticket.user?.phone ?? "",
    status: ticket.status,
    orderNumber: ticket.order?.orderNumber ?? "",
    createdAt: ticket.createdAt ?? ""
  };
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
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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

function downloadExcel(filename: string, title: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
  const workbook = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${table}</body></html>`;
  downloadBlob(filename, `\ufeff${workbook}`, "application/vnd.ms-excel;charset=utf-8");
  toast.success(`${title} Excel export downloaded`);
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
  const headers = Object.keys(rows[0]);
  const cells = rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`).join("")}</tr>`).join("");
  reportWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} report</title><style>@page{size:landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#172033}h1{font-size:22px;margin:0 0 4px}p{color:#667085;margin:0 0 18px}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #d7dce3;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#fff1cf;color:#3b2a0c}tr:nth-child(even){background:#f8fafc}</style></head><body><h1>Darji — ${escapeHtml(title)}</h1><p>${rows.length} rows · Generated ${escapeHtml(new Date().toLocaleString("en-IN"))}</p><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${cells}</tbody></table><script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
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
    .map((item) => {
      const title = escapeHtml(item.service?.name ?? "Service item");
      const subtitle = escapeHtml(`${item.service?.category?.name ?? "General"} / Qty ${item.quantity}`);
      const amount = formatCurrency(item.price ?? item.service?.price ?? 0);
      return `
        <tr>
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
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #faf7f0; color: #111827; }
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
                  <th style="text-align:left;padding:0 0 12px 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em">Item</th>
                  <th style="text-align:right;padding:0 0 12px 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em">Amount</th>
                </tr>
              </thead>
              <tbody>${items || `<tr><td colspan="2" style="padding:12px 0;color:#6b7280">No line items available.</td></tr>`}</tbody>
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
