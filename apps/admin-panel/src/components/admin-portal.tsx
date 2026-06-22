"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { orderStatuses } from "@darzi/shared";
import Image from "next/image";
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
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquareText,
  PackageCheck,
  ReceiptIndianRupee,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Ticket,
  Truck,
  UserCircle2,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  assignOrder,
  createCoupon,
  extractError,
  getAnalytics,
  getCoupons,
  getDeliveryPartners,
  getDeliveryRequests,
  getMe,
  getOrders,
  getPayments,
  getSettings,
  getSupportTickets,
  getTailoringRequests,
  getTailors,
  getUsers,
  markPaymentPaid,
  moderateUser,
  requestOtp,
  reviewDeliveryVerification,
  reviewTailorVerification,
  updateOrderStatus,
  updateSetting,
  verifyOtp
} from "@/src/lib/api";
import {
  cn,
  formatCurrency,
  formatDate,
  formatList,
  formatStatus,
  isToday,
  percentage,
  stringifyUnknown
} from "@/src/lib/utils";
import { type SectionId, useAdminStore } from "@/src/store/admin-store";
import type {
  AdminUser,
  AnalyticsSummary,
  Coupon,
  DeliveryPartnerProfile,
  DeliveryRequest,
  MeResponse,
  Order,
  Payment,
  SettingRecord,
  SupportTicket,
  TailorProfile,
  TailoringRequest
} from "@/src/types/admin";

type TrendRange = "daily" | "weekly" | "monthly";

type QueryBundle = {
  analytics: AnalyticsSummary;
  me: MeResponse;
  orders: Order[];
  tailoringRequests: TailoringRequest[];
  deliveryRequests: DeliveryRequest[];
  tailors: TailorProfile[];
  partners: DeliveryPartnerProfile[];
  users: AdminUser[];
  payments: Payment[];
  coupons: Coupon[];
  tickets: SupportTicket[];
  settings: SettingRecord[];
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

const sidebarSections: Array<{ id: SectionId; icon: React.ComponentType<{ size?: number }>; label: string; description: string }> = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard", description: "Platform health and trends" },
  { id: "orders", icon: PackageCheck, label: "Orders", description: "Assignment and status control" },
  { id: "tailoring", icon: Scissors, label: "Tailoring Requests", description: "Quote-led requests and work status" },
  { id: "delivery", icon: Truck, label: "Delivery Ops", description: "Pickup and delivery tasks" },
  { id: "tailors", icon: ShieldCheck, label: "Tailors", description: "Availability, verification, earnings" },
  { id: "partners", icon: Users, label: "Delivery Partners", description: "Fleet management and ratings" },
  { id: "users", icon: UserCircle2, label: "Users", description: "Customer and partner access control" },
  { id: "payments", icon: CreditCard, label: "Payments", description: "Collections and payment state" },
  { id: "coupons", icon: Ticket, label: "Coupons", description: "Offers and retention levers" },
  { id: "support", icon: Bell, label: "Support", description: "Tickets and customer follow-up" },
  { id: "settings", icon: Settings, label: "Settings", description: "Operational configuration" }
];

const pieColors = ["#f6a313", "#0b2241", "#2a79ff", "#f97316"];
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
  const setToken = useAdminStore((state) => state.setToken);
  const sidebarOpen = useAdminStore((state) => state.sidebarOpen);
  const token = useAdminStore((state) => state.token);
  const [globalSearch, setGlobalSearch] = useState("");
  const [range] = useState<TrendRange>("monthly");
  const [orderFilter, setOrderFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [tailoringDetail, setTailoringDetail] = useState<TailoringRequest | null>(null);
  const [deliveryDetail, setDeliveryDetail] = useState<DeliveryRequest | null>(null);
  const [tailorDetail, setTailorDetail] = useState<TailorProfile | null>(null);
  const [partnerDetail, setPartnerDetail] = useState<DeliveryPartnerProfile | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUser | null>(null);
  const [ticketDetail, setTicketDetail] = useState<SupportTicket | null>(null);
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
  const queryClient = useQueryClient();
  const isAuthed = Boolean(token);

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
  const tailorsQuery = useQuery({
    queryKey: ["admin", "tailors"],
    queryFn: getTailors,
    enabled: isAuthed
  });
  const partnersQuery = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: getDeliveryPartners,
    enabled: isAuthed
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

  const dashboardData = useMemo<QueryBundle | null>(() => {
    if (
      !analyticsQuery.data ||
      !meQuery.data ||
      !ordersQuery.data ||
      !tailoringQuery.data ||
      !deliveryQuery.data ||
      !tailorsQuery.data ||
      !partnersQuery.data ||
      !usersQuery.data ||
      !paymentsQuery.data ||
      !couponsQuery.data ||
      !supportQuery.data ||
      !settingsQuery.data
    ) {
      return null;
    }
    return {
      analytics: analyticsQuery.data,
      me: meQuery.data,
      orders: ordersQuery.data,
      tailoringRequests: tailoringQuery.data,
      deliveryRequests: deliveryQuery.data,
      tailors: tailorsQuery.data,
      partners: partnersQuery.data,
      users: usersQuery.data,
      payments: paymentsQuery.data,
      coupons: couponsQuery.data,
      tickets: supportQuery.data,
      settings: settingsQuery.data
    };
  }, [
    analyticsQuery.data,
    meQuery.data,
    ordersQuery.data,
    tailoringQuery.data,
    deliveryQuery.data,
    tailorsQuery.data,
    partnersQuery.data,
    usersQuery.data,
    paymentsQuery.data,
    couponsQuery.data,
    supportQuery.data,
    settingsQuery.data
  ]);

  useEffect(() => {
    if (settingsQuery.data) {
      const nextDrafts = settingsQuery.data.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = typeof item.value === "string" ? item.value : JSON.stringify(item.value, null, 2);
        return acc;
      }, {});
      setSettingsDrafts(nextDrafts);
    }
  }, [settingsQuery.data]);

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

  const requestOtpMutation = useMutation({
    mutationFn: requestOtp,
    onSuccess: () => toast.success("OTP sent"),
    onError: (error) => toast.error(extractError(error))
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ phone, otp }: { phone: string; otp: string }) => verifyOtp(phone, otp),
    onSuccess: (session) => {
      setToken(session.accessToken);
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
      queryClient.invalidateQueries({ queryKey: ["admin", "tailors"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "payments"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "support"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
    ]);

  const assignMutation = useMutation({
    mutationFn: assignOrder,
    onSuccess: async () => {
      toast.success("Order assignment updated");
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

  const tailorReviewMutation = useMutation({
    mutationFn: reviewTailorVerification,
    onSuccess: async (_, variables) => {
      toast.success(`Tailor marked ${formatStatus(variables.status).toLowerCase()}`);
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

  if (!dashboardData || isBootLoading) {
    return (
      <PortalFrame
        activeSection={activeSection}
        alertCount={0}
        globalSearch={globalSearch}
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

  const { analytics, me, orders, tailoringRequests, deliveryRequests, tailors, partners, users, payments, coupons, tickets, settings } = dashboardData;
  const searchTerm = globalSearch.trim().toLowerCase();
  const alertCount =
    tickets.filter((ticket) => ticket.status === "OPEN").length +
    payments.filter((payment) => payment.status === "PENDING").length +
    tailors.filter((tailor) => tailor.verificationStatus === "PENDING").length +
    partners.filter((partner) => partner.verificationStatus === "PENDING").length;

  const metrics = buildMetrics(analytics, orders, tailors, partners, payments);
  const revenueSeries = buildRevenueSeries(payments, "monthly");
  const orderSeries = buildWeekdayOrderSeries(orders);
  const growthSeries = buildGrowthSeries(orders, tailors, partners, "monthly");
  const serviceMix = buildServiceMix(orders);
  const completedOrders = orders.filter((order) => order.status === "DELIVERED").length;
  const cancelledOrders = orders.filter((order) => order.status === "CANCELLED").length;
  const pendingOrders = orders.length - completedOrders - cancelledOrders;
  const recentOrders = [...orders].slice(0, 5);
  const openSupportTickets = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const dateRangeLabel = buildDashboardDateRangeLabel(range);
  const latestGrowthPoint = growthSeries[growthSeries.length - 1] ?? { customers: 0, tailors: 0, partners: 0 };
  const revenueDelta = buildTrendMeta(latestValue(revenueSeries, "revenue"), previousValue(revenueSeries, "revenue"));
  const orderDelta = buildTrendMeta(sumOrderPoint(lastOrderPoint(orderSeries)), sumOrderPoint(previousOrderPoint(orderSeries)));
  const customerDelta = buildTrendMeta(latestGrowthPoint.customers, previousValue(growthSeries, "customers"));
  const tailorDelta = buildTrendMeta(latestGrowthPoint.tailors, previousValue(growthSeries, "tailors"));
  const partnerDelta = buildTrendMeta(latestGrowthPoint.partners, previousValue(growthSeries, "partners"));
  const verificationDelta = buildCountMeta(metrics.pendingVerifications, true);
  const collectionDelta = buildCountMeta(metrics.pendingCollections, true);
  const cancellationDelta = buildCountMeta(Number(metrics.cancellationRate.toFixed(1)), true, "%");
  const statusBreakdown = buildLiveOrderStatus(orders);
  const categoryTotal = serviceMix.reduce((sum, item) => sum + item.value, 0);
  const categoryBreakdown = [...serviceMix]
    .sort((left, right) => right.value - left.value)
    .map((item) => ({
      ...item,
      share: categoryTotal ? Math.round((item.value / categoryTotal) * 100) : 0
    }))
    .slice(0, 4);
  const topTailors = [...tailors]
    .sort((left, right) => (right.earnings ?? 0) - (left.earnings ?? 0) || (right.rating ?? 0) - (left.rating ?? 0))
    .slice(0, 5);
  const topPartners = [...partners]
    .sort(
      (left, right) =>
        (right.weeklyEarnings ?? right.monthlyEarnings ?? right.dailyEarnings ?? 0) -
          (left.weeklyEarnings ?? left.monthlyEarnings ?? left.dailyEarnings ?? 0) ||
        (right.rating ?? 0) - (left.rating ?? 0)
    )
    .slice(0, 5);
  const dashboardStats = [
    {
      icon: PackageCheck,
      label: "Orders Today",
      note: "vs yesterday",
      tone: "teal" as const,
      value: metrics.ordersToday.toLocaleString("en-IN"),
      change: orderDelta.label,
      changeTone: orderDelta.tone,
      target: "orders" as SectionId
    },
    {
      icon: LayoutGrid,
      label: "Total Orders",
      note: "vs last 7 days",
      tone: "sky" as const,
      value: analytics.orders.toLocaleString("en-IN"),
      change: orderDelta.label,
      changeTone: orderDelta.tone,
      target: "orders" as SectionId
    },
    {
      icon: ReceiptIndianRupee,
      label: "Revenue Today",
      note: "vs yesterday",
      tone: "emerald" as const,
      value: formatCurrency(metrics.revenueToday),
      change: revenueDelta.label,
      changeTone: revenueDelta.tone,
      target: "payments" as SectionId
    },
    {
      icon: BarChart3,
      label: "Total Revenue",
      note: "vs last 30 days",
      tone: "sky" as const,
      value: formatCurrency(metrics.totalRevenue),
      change: revenueDelta.label,
      changeTone: revenueDelta.tone,
      target: "payments" as SectionId
    },
    {
      icon: ShieldCheck,
      label: "Active Tailors",
      note: "vs last 7 days",
      tone: "amber" as const,
      value: analytics.activeTailors.toLocaleString("en-IN"),
      change: tailorDelta.label,
      changeTone: tailorDelta.tone,
      target: "tailors" as SectionId
    },
    {
      icon: Users,
      label: "Active Customers",
      note: "vs last 7 days",
      tone: "violet" as const,
      value: analytics.customers.toLocaleString("en-IN"),
      change: customerDelta.label,
      changeTone: customerDelta.tone,
      target: "users" as SectionId
    },
    {
      icon: Truck,
      label: "Delivery Partners",
      note: "vs last 7 days",
      tone: "cyan" as const,
      value: analytics.activeDeliveryPartners.toLocaleString("en-IN"),
      change: partnerDelta.label,
      changeTone: partnerDelta.tone,
      target: "partners" as SectionId
    },
    {
      icon: ShieldCheck,
      label: "Pending Verifications",
      note: "vs yesterday",
      tone: "amber" as const,
      value: metrics.pendingVerifications.toLocaleString("en-IN"),
      change: verificationDelta.label,
      changeTone: verificationDelta.tone,
      target: "tailors" as SectionId
    },
    {
      icon: CreditCard,
      label: "Pending Payouts",
      note: "View details",
      tone: "amber" as const,
      value: metrics.pendingCollections.toLocaleString("en-IN"),
      change: collectionDelta.label,
      changeTone: collectionDelta.tone,
      target: "payments" as SectionId
    },
    {
      icon: AlertCircle,
      label: "Cancellation Rate",
      note: "vs last 7 days",
      tone: "rose" as const,
      value: percentage(metrics.cancellationRate),
      change: cancellationDelta.label,
      changeTone: cancellationDelta.tone,
      target: "orders" as SectionId
    }
  ];
  const miniTrendCards = [
    {
      icon: CheckCircle2,
      label: "Completion Rate",
      note: `${percentage(metrics.cancellationRate)} cancelled`,
      tone: "emerald" as const,
      value: percentage(metrics.completionRate),
      data: orderSeries.map((point) => ({
        label: point.label,
        value: sumOrderPoint(point) ? Number(((point.completed / sumOrderPoint(point)) * 100).toFixed(1)) : 0
      }))
    },
    {
      icon: ReceiptIndianRupee,
      label: "Average Order Value",
      note: revenueDelta.label,
      tone: "amber" as const,
      value: formatCurrency(metrics.averageOrderValue),
      data: revenueSeries.map((point) => ({ label: point.label, value: point.revenue }))
    },
    {
      icon: Users,
      label: "New Customers",
      note: buildCountMeta(latestGrowthPoint.customers).label,
      tone: "violet" as const,
      value: latestGrowthPoint.customers.toLocaleString("en-IN"),
      data: growthSeries.map((point) => ({ label: point.label, value: point.customers }))
    },
    {
      icon: Scissors,
      label: "New Tailors",
      note: buildCountMeta(latestGrowthPoint.tailors).label,
      tone: "amber" as const,
      value: latestGrowthPoint.tailors.toLocaleString("en-IN"),
      data: growthSeries.map((point) => ({ label: point.label, value: point.tailors }))
    },
    {
      icon: Truck,
      label: "New Partners",
      note: buildCountMeta(latestGrowthPoint.partners).label,
      tone: "sky" as const,
      value: latestGrowthPoint.partners.toLocaleString("en-IN"),
      data: growthSeries.map((point) => ({ label: point.label, value: point.partners }))
    }
  ];

  const filteredOrders = orders.filter((order) => {
    const content = [
      order.orderNumber,
      order.customer?.name,
      order.customer?.phone,
      order.status,
      order.tailor?.shopName,
      order.deliveryPartner?.user?.name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (!searchTerm || content.includes(searchTerm)) && (!orderFilter || order.status === orderFilter);
  });

  const filteredTailoring = tailoringRequests.filter((request) =>
    !searchTerm ||
    [request.description, request.clothType, request.workType, request.customer?.name, request.customer?.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredDelivery = deliveryRequests.filter((request) =>
    !searchTerm ||
    [request.taskId, request.customerName, request.tailorName, request.pickupAddress, request.dropAddress, request.taskStatus]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredTailors = tailors.filter((tailor) =>
    !searchTerm ||
    [tailor.shopName, tailor.user?.name, tailor.user?.phone, tailor.verificationStatus, formatList(tailor.specialization)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredPartners = partners.filter((partner) =>
    !searchTerm ||
    [partner.user?.name, partner.user?.phone, partner.vehicleNumber, partner.verificationStatus]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredUsers = users.filter((user) =>
    !searchTerm ||
    [
      user.name,
      user.phone,
      user.email,
      user.role,
      user.accountStatus,
      user.tailorProfile?.shopName,
      user.deliveryProfile?.vehicleNumber
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredPayments = payments.filter((payment) => {
    const content = [payment.order?.orderNumber, payment.method, payment.status, payment.providerRef].filter(Boolean).join(" ").toLowerCase();
    return (!searchTerm || content.includes(searchTerm)) && (!paymentFilter || payment.status === paymentFilter);
  });

  const filteredCoupons = coupons.filter((coupon) =>
    !searchTerm ||
    [coupon.code, coupon.description, coupon.discountType]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredTickets = tickets.filter((ticket) =>
    !searchTerm ||
    [ticket.subject, ticket.status, ticket.user?.phone, ticket.order?.orderNumber]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm)
  );

  const orderColumns = getOrderColumns({
    onAssign: setAssignOrderTarget,
    onOpen: setOrderDetail,
    onStatusChange: (orderId, status) => statusMutation.mutate({ orderId, status })
  });
  const tailoringColumns = getTailoringColumns({ onOpen: setTailoringDetail });
  const deliveryColumns = getDeliveryColumns({ onOpen: setDeliveryDetail, partners });
  const tailorColumns = getTailorColumns({
    onOpen: setTailorDetail,
    onReview: (tailorId, status) => tailorReviewMutation.mutate({ tailorId, status })
  });
  const partnerColumns = getPartnerColumns({
    onOpen: setPartnerDetail,
    onReview: (partnerId, status) => partnerReviewMutation.mutate({ partnerId, status })
  });
  const userColumns = getUserColumns({
    onActivate: (userId) => userModerationMutation.mutate({ userId, action: "ACTIVE" }),
    onBan: (userId) => userModerationMutation.mutate({ userId, action: "BANNED", reason: "Banned by admin" }),
    onOpen: setUserDetail,
    onSuspend: (userId) =>
      userModerationMutation.mutate({
        userId,
        action: "SUSPENDED",
        reason: "Temporarily suspended by admin",
        suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }),
    pending: userModerationMutation.isPending
  });
  const paymentColumns = getPaymentColumns({
    onMarkPaid: (paymentId) => paymentMutation.mutate({ paymentId }),
    pending: paymentMutation.isPending
  });
  const couponColumns = getCouponColumns();
  const ticketColumns = getTicketColumns({ onOpen: setTicketDetail });

  return (
    <>
      <PortalFrame
        activeSection={activeSection}
        alertCount={alertCount}
        globalSearch={globalSearch}
        me={me}
        onGlobalSearchChange={setGlobalSearch}
        onLogout={logout}
        onOpenSidebar={() => setSidebarOpen(true)}
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
              <div className="absolute left-0 right-0 top-0 h-full bg-[radial-gradient(circle_at_78%_24%,rgba(246,163,19,0.12),transparent_20%),radial-gradient(circle_at_88%_26%,rgba(246,163,19,0.12),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.92),rgba(255,250,240,0.58))]" />
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
                <div className="flex items-center gap-3 self-start rounded-2xl border border-[#ecd8b6] bg-white/90 px-4 py-2.5 text-sm font-medium text-[var(--deep)] shadow-[0_12px_30px_rgba(199,153,56,0.08)]">
                  <CalendarDays size={16} className="text-[#c1840f]" />
                  {dateRangeLabel}
                </div>
              </div>
            </Panel>

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
                  onClick={() => setActiveSection(item.target)}
                />
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <ChartCard
                title="Revenue Overview"
                description="Revenue tracked from paid payments."
                className="xl:col-span-5"
                action={<SelectPill label="Monthly" />}
              >
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[2rem] font-semibold tracking-tight text-[var(--deep)]">{formatCurrency(metrics.totalRevenue)}</p>
                    <p className="mt-1.5 text-sm text-emerald-600">
                      {revenueDelta.label} <span className="text-[var(--muted)]">vs previous period</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <MetricChip label="Today" value={formatCurrency(metrics.revenueToday)} />
                    <MetricChip label="AOV" value={formatCurrency(metrics.averageOrderValue)} />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueSeries}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f6a313" stopOpacity={0.42} />
                        <stop offset="95%" stopColor="#f6a313" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 175, 131, 0.26)" vertical={false} />
                    <XAxis axisLine={false} tickLine={false} dataKey="label" stroke="var(--muted)" />
                    <YAxis axisLine={false} tickLine={false} stroke="var(--muted)" tickFormatter={(value) => `₹${value}`} />
                    <Tooltip contentStyle={tooltipStyle()} formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Area dataKey="revenue" fill="url(#revenueFill)" stroke={darziChartPalette.orange} strokeWidth={3} type="monotone" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Orders Overview" description="Completed, cancelled, and pending orders." className="xl:col-span-3" action={<SelectPill label="Weekly" />}>
                <div className="mb-3 flex flex-wrap gap-3 text-sm">
                  <LegendDot color={darziChartPalette.success} label={`Completed ${completedOrders}`} />
                  <LegendDot color={darziChartPalette.rose} label={`Cancelled ${cancelledOrders}`} />
                  <LegendDot color={darziChartPalette.orange} label={`Pending ${pendingOrders}`} />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={orderSeries} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 175, 131, 0.2)" vertical={false} />
                    <XAxis axisLine={false} tickLine={false} dataKey="label" stroke="var(--muted)" />
                    <YAxis axisLine={false} tickLine={false} stroke="var(--muted)" />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Bar dataKey="completed" fill={darziChartPalette.success} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="cancelled" fill={darziChartPalette.rose} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="pending" fill={darziChartPalette.orange} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Order Category" description="Service split across current orders." className="xl:col-span-2" action={<SelectPill label="This Month" />}>
                <div className="grid gap-5">
                  <div className="relative mx-auto h-[180px] w-full max-w-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={serviceMix} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={4}>
                          {serviceMix.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle()} formatter={(value) => `${Number(value ?? 0)} items`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold text-[var(--deep)]">{analytics.orders.toLocaleString("en-IN")}</span>
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

              <LiveStatusPanel className="xl:col-span-2" items={statusBreakdown} />
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <RecentOrdersPanel className="xl:col-span-6" orders={recentOrders} onOpen={setOrderDetail} />
              <LeaderboardCard
                className="xl:col-span-3"
                title="Top Tailors"
                description="Highest earners this cycle."
                items={topTailors.map((tailor) => ({
                  id: tailor.id,
                  name: tailor.shopName ?? tailor.user?.name ?? "Unnamed tailor",
                  subtitle: `${countTailorOrders(orders, tailor.id)} orders`,
                  value: formatCurrency(tailor.earnings ?? 0),
                  rating: tailor.rating ? tailor.rating.toFixed(1) : undefined,
                  onClick: () => setTailorDetail(tailor)
                }))}
              />
              <LeaderboardCard
                className="xl:col-span-3"
                title="Top Delivery Partners"
                description="Top performing delivery network."
                items={topPartners.map((partner) => ({
                  id: partner.id,
                  name: partner.user?.name ?? "Unnamed partner",
                  subtitle: `${countPartnerOrders(orders, partner.id)} orders`,
                  value: formatCurrency(partner.weeklyEarnings ?? partner.monthlyEarnings ?? partner.dailyEarnings ?? 0),
                  rating: partner.rating ? partner.rating.toFixed(1) : undefined,
                  onClick: () => setPartnerDetail(partner)
                }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {miniTrendCards.map((item) => (
                <MiniTrendCard key={item.label} data={item.data} icon={item.icon} label={item.label} note={item.note} tone={item.tone} value={item.value} />
              ))}
            </div>
          </div>
        ) : null}

        {activeSection === "orders" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Order management"
              description="Assignment, status control, and operational inspection for the standard order pipeline."
              action={
                <div className="flex items-center gap-2">
                  <FilterSelect
                    value={orderFilter}
                    onChange={setOrderFilter}
                    options={[
                      { label: "All statuses", value: "" },
                      ...orderStatuses.map((status) => ({ label: formatStatus(status), value: status }))
                    ]}
                  />
                  <ActionButton variant="secondary" onClick={() => downloadCsv("darzi-orders.csv", filteredOrders.map(orderToCsv))}>
                    Export CSV
                  </ActionButton>
                </div>
              }
            />
            <DataTable columns={orderColumns} data={filteredOrders} emptyMessage="No orders match the current filters." />
          </div>
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
            <DataTable columns={deliveryColumns} data={filteredDelivery} emptyMessage="No delivery tasks available." />
          </div>
        ) : null}

        {activeSection === "tailors" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Tailor network"
              description="Availability, ratings, earnings, and verification state for tailoring partners."
              action={<ActionButton variant="secondary" onClick={() => downloadCsv("darzi-tailors.csv", filteredTailors.map(tailorToCsv))}>Export CSV</ActionButton>}
            />
            <DataTable columns={tailorColumns} data={filteredTailors} emptyMessage="No tailor profiles match the current search." />
          </div>
        ) : null}

        {activeSection === "partners" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Delivery partner network"
              description="Operational availability and rating visibility for delivery partners."
              action={<ActionButton variant="secondary" onClick={() => downloadCsv("darzi-delivery-partners.csv", filteredPartners.map(partnerToCsv))}>Export CSV</ActionButton>}
            />
            <DataTable columns={partnerColumns} data={filteredPartners} emptyMessage="No delivery partner profiles match the current search." />
          </div>
        ) : null}

        {activeSection === "users" ? (
          <div className="space-y-6">
            <SectionIntro
              title="User access control"
              description="Manage registration access across customers, tailors, and delivery partners with live account status and moderation actions."
              action={<ActionButton variant="secondary" onClick={() => downloadCsv("darzi-users.csv", filteredUsers.map(userToCsv))}>Export CSV</ActionButton>}
            />
            <DataTable columns={userColumns} data={filteredUsers} emptyMessage="No users match the current search." />
          </div>
        ) : null}

        {activeSection === "payments" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Payments and collections"
              description="Current payment ledger from the backend, including manual paid reconciliation."
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
            <DataTable columns={paymentColumns} data={filteredPayments} emptyMessage="No payment records match the current filters." />
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
          <div className="space-y-6">
            <SectionIntro
              title="Support tickets"
              description="Current support queue from the existing support API."
              action={<ActionButton variant="secondary" onClick={() => downloadCsv("darzi-support.csv", filteredTickets.map(ticketToCsv))}>Export CSV</ActionButton>}
            />
            <DataTable columns={ticketColumns} data={filteredTickets} emptyMessage="No support tickets match the current search." />
          </div>
        ) : null}

        {activeSection === "settings" ? (
          <div className="space-y-6">
            <SectionIntro
              title="Platform settings"
              description="Editable operational settings already persisted through the backend settings endpoints."
            />
            <div className="grid gap-4 xl:grid-cols-2">
              {settings.map((setting) => (
                <Panel key={setting.id}>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{setting.key}</h3>
                      <p className="text-sm text-[var(--muted)]">Last updated {formatDate(setting.updatedAt, true)}</p>
                    </div>
                    <Badge tone="slate">{typeof setting.value === "string" ? "Text" : "JSON"}</Badge>
                  </div>
                  <textarea
                    className="h-48 w-full rounded-2xl border border-[var(--panel-border)] bg-black/5 px-4 py-3 font-mono text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] dark:bg-white/5"
                    value={settingsDrafts[setting.key] ?? ""}
                    onChange={(event) => setSettingsDrafts((current) => ({ ...current, [setting.key]: event.target.value }))}
                  />
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
        onAssign={() => orderDetail && setAssignOrderTarget(orderDetail)}
        onStatusChange={(status) => orderDetail && statusMutation.mutate({ orderId: orderDetail.id, status })}
        open={Boolean(orderDetail)}
        order={orderDetail}
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
        open={Boolean(tailorDetail)}
        profile={tailorDetail}
        pending={tailorReviewMutation.isPending}
        onReview={(status) => tailorDetail && tailorReviewMutation.mutate({ tailorId: tailorDetail.id, status })}
        subtitle="Tailor profile"
        setOpen={(next) => {
          if (!next) setTailorDetail(null);
        }}
      />
      <ProfileDialog
        open={Boolean(partnerDetail)}
        profile={partnerDetail}
        pending={partnerReviewMutation.isPending}
        onReview={(status) => partnerDetail && partnerReviewMutation.mutate({ partnerId: partnerDetail.id, status })}
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
      <TicketDialog
        open={Boolean(ticketDetail)}
        ticket={ticketDetail}
        setOpen={(next) => {
          if (!next) setTicketDetail(null);
        }}
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
          if (assignTailorId && assignTailorId !== assignOrderTarget.tailorId) {
            assignMutation.mutate({ orderId: assignOrderTarget.id, tailorId: assignTailorId });
          }
          if (assignPickupPartnerId && assignPickupPartnerId !== assignOrderTarget.pickupPartnerId) {
            assignMutation.mutate({ orderId: assignOrderTarget.id, deliveryPartnerId: assignPickupPartnerId, mode: "pickup" });
          }
          if (assignDeliveryPartnerId && assignDeliveryPartnerId !== assignOrderTarget.deliveryPartnerId) {
            assignMutation.mutate({ orderId: assignOrderTarget.id, deliveryPartnerId: assignDeliveryPartnerId, mode: "delivery" });
          }
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
  const [phone, setPhone] = useState("9999999999");
  const [otp, setOtp] = useState("");
  const [requested, setRequested] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(246,163,19,0.18),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(246,163,19,0.12),transparent_24%),linear-gradient(180deg,#fffdf8_0%,#fff6e8_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-10 top-0 h-60 w-60 rounded-full border border-dashed border-[#f0cf88]" />
        <div className="absolute left-[28%] top-10 text-[#efdeb7]"><GhostSewIcon type="button" /></div>
        <div className="absolute left-[37%] top-36 text-[#efdeb7]"><GhostSewIcon type="spool" /></div>
        <div className="absolute left-[38%] bottom-52 text-[#efdeb7]"><GhostSewIcon type="scissors" /></div>
        <div className="absolute left-[46%] top-1/2 text-[#efdeb7]"><GhostSewIcon type="button" /></div>
      </div>

      <section className="mx-auto grid min-h-screen max-w-[1540px] items-center gap-8 px-5 py-8 xl:grid-cols-[1fr_0.92fr] xl:px-10">
        <div className="relative flex min-h-[760px] flex-col justify-between overflow-hidden rounded-[42px] bg-[radial-gradient(circle_at_top,rgba(255,213,94,0.16),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,248,231,0.72))] p-8 lg:p-12">
          <div>
            <Image alt="Darji" className="h-auto w-[240px]" height={146} priority src="/darji-logo.png" width={240} />
            <p className="mt-3 pl-2 text-[15px] font-medium text-[#59483a]">Stitching Made Simple</p>

            <div className="mt-12 max-w-[520px]">
              <h1 className="text-[3.35rem] font-semibold leading-[1.08] tracking-[-0.05em] text-[#4f3115]">
                Welcome to <span className="text-[#f2a600]">Darji</span>
                <br />
                Admin Portal
              </h1>
              <p className="mt-5 max-w-[470px] text-[1.04rem] leading-8 text-[#6f645a]">
                Manage your business, track performance, and grow Darji with data-driven insights while keeping every operation under one roof.
              </p>
              <div className="mt-7 h-[3px] w-[72px] rounded-full bg-[#f2a600]" />
            </div>

            <div className="mt-10 grid max-w-[520px] gap-6">
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

          <div className="mt-10">
            <SewingMachineIllustration />
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-10 top-10 h-36 rounded-full bg-[rgba(246,163,19,0.12)] blur-3xl" />
          <div className="relative overflow-hidden rounded-[38px] border border-[#ead6ad] bg-[linear-gradient(180deg,#ffffff_0%,#fffdf8_100%)] p-7 shadow-[0_28px_80px_rgba(181,135,37,0.14)] sm:p-10">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(246,163,19,0.12),transparent_65%)]" />
            <div className="relative z-10">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fff7de,#ffe9a4)] text-[#8f5d12] shadow-[0_16px_32px_rgba(246,163,19,0.16)]">
                <ShieldCheck size={44} strokeWidth={1.8} />
              </div>

              <div className="mt-8 text-center">
                <h2 className="text-[3rem] font-semibold tracking-[-0.04em] text-[#1f1f1f]">Welcome Back!</h2>
                <p className="mt-3 text-[1.12rem] text-[#6f6f79]">Login to access your Darji Admin Dashboard</p>
              </div>

              <div className="mt-10 space-y-6">
                <Field label="Phone Number">
                  <div className="flex h-[58px] items-center gap-4 rounded-[18px] border border-[#e7e3d8] bg-white px-5 shadow-[inset_0_0_0_1px_rgba(255,248,232,0.5)]">
                    <Users size={20} className="text-[#8f8f95]" />
                    <input
                      className="w-full bg-transparent outline-none placeholder:text-[#9a9aa3]"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
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

                <div className="flex items-center justify-between gap-4 text-sm">
                  <label className="inline-flex items-center gap-3 text-[#6a6460]">
                    <input
                      checked={rememberDevice}
                      className="h-4 w-4 rounded border-[#d4c9b5] accent-[#f6a313]"
                      onChange={(event) => setRememberDevice(event.target.checked)}
                      type="checkbox"
                    />
                    Remember this device
                  </label>
                  <button className="font-medium text-[#ff9d00]" type="button">
                    Need help?
                  </button>
                </div>

                  {returnedOtp ? (
                    <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Current test OTP: <span className="font-semibold">{returnedOtp}</span>
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-[#f2dfb8] bg-[#fff8e6] px-4 py-3 text-sm text-[#7d6b58]">
                      Temporary login OTP: <span className="font-semibold text-[#4a3620]">123456</span>
                    </div>
                  )}

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

              <div className="mt-10 flex items-center gap-4 text-[#8c8781]">
                <div className="h-px flex-1 bg-[#ece5d7]" />
                <span className="text-sm">Need help?</span>
                <div className="h-px flex-1 bg-[#ece5d7]" />
              </div>

              <div className="mt-6 text-center text-[1rem] text-[#6f6b66]">
                Contact Darji support for admin access assistance.
              </div>

              <div className="mt-10 text-center text-sm text-[#8c8781]">© 2024 Darji. All rights reserved.</div>
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
  me,
  onGlobalSearchChange,
  onLogout,
  onOpenSidebar,
  onSectionChange,
  sidebarOpen,
  supportCount
}: {
  activeSection: SectionId;
  alertCount: number;
  children: React.ReactNode;
  globalSearch: string;
  me?: MeResponse;
  onGlobalSearchChange: (value: string) => void;
  onLogout: () => void;
  onOpenSidebar: () => void;
  onSectionChange: (section: SectionId) => void;
  sidebarOpen: boolean;
  supportCount: number;
}) {
  const setSidebarOpen = useAdminStore((state) => state.setSidebarOpen);

  return (
    <main className="min-h-screen">
      <div className="darji-dashboard-scale relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(246,163,19,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(246,163,19,0.08),transparent_18%),linear-gradient(180deg,#fffbf5_0%,#fffefb_100%)]">
        <div className={cn("fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition lg:hidden", sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setSidebarOpen(false)} />
        <aside
          className={cn(
            "fixed inset-y-3 left-3 z-50 flex w-[252px] flex-col rounded-[30px] border border-[#e7ce9b] bg-[linear-gradient(180deg,rgba(255,253,248,0.99),rgba(255,248,238,0.99))] p-4 shadow-[var(--shadow)] backdrop-blur transition lg:inset-y-4 lg:left-4 lg:z-30 lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-[120%]"
          )}
        >
          <div className="mb-7 flex items-start justify-between">
            <LogoMark />
            <button className="rounded-full p-2 text-[var(--muted)] hover:bg-[#f4f7fb] hover:text-[var(--foreground)] lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2">
            {sidebarSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left transition",
                    isActive
                      ? "bg-[linear-gradient(90deg,rgba(246,163,19,0.22),rgba(246,163,19,0.08))] text-[#c97b00] shadow-[inset_0_0_0_1px_rgba(246,163,19,0.1)]"
                      : "text-[var(--foreground)] hover:bg-[#fff6e7]"
                  )}
                  onClick={() => onSectionChange(section.id)}
                >
                  <span className={cn("rounded-xl p-2.5", isActive ? "bg-[#fff0ca]" : "bg-[#fff8ea] text-[var(--muted)]")}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{section.label}</span>
                  </span>
                  <ChevronRight size={16} className={cn(isActive ? "text-[#cb7d00]" : "text-[#c8b79b]")} />
                </button>
              );
            })}
          </div>

          <div className="mt-auto space-y-4 pt-5">
            <div className="rounded-[24px] border border-[#f3dfba] bg-[linear-gradient(180deg,#fffaf1,#fff3dc)] p-5">
              <GrowthPromoGraphic />
              <p className="mt-4 text-lg font-semibold text-[var(--deep)]">Grow Your Business</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use analytics and reports to grow your business faster.</p>
              <button
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[var(--accent-strong)]"
                onClick={() => onSectionChange("payments")}
                type="button"
              >
                View Reports
              </button>
            </div>

            <div className="rounded-[22px] border border-[var(--panel-border)] bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <AvatarBadge me={me} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--deep)]">{me?.name ?? "Super Admin"}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{me?.phone ?? "admin@darzi.in"}</p>
                </div>
                <ChevronDown size={16} className="ml-auto text-[var(--muted)]" />
              </div>
            </div>
          </div>
        </aside>

        <div className="lg:pl-[278px]">
          <div className="sticky top-0 z-20 px-3 pt-3 lg:px-6 lg:pt-4">
            <header className="relative overflow-hidden rounded-[28px] border border-[#e8d2a7] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(255,249,241,0.98))] px-4 py-4 shadow-[var(--shadow)] backdrop-blur sm:px-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_120%,rgba(246,163,19,0.14),transparent_24%),radial-gradient(circle_at_78%_30%,rgba(246,163,19,0.12),transparent_20%),linear-gradient(90deg,transparent_0%,rgba(246,163,19,0.04)_34%,rgba(255,255,255,0)_70%)]" />
              <div className="pointer-events-none absolute right-10 top-0 hidden h-full w-80 opacity-60 xl:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle,#efc871_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(246,190,73,0.12)_28%,transparent_46%,rgba(246,190,73,0.08)_62%,transparent_84%)]" />
              </div>
              <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <button className="rounded-2xl border border-[var(--panel-border)] p-3 text-[var(--foreground)] lg:hidden" onClick={onOpenSidebar}>
                    <Menu size={18} />
                  </button>
                  <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-[#f0dcc0] bg-[#fff6e3] text-[#c78309] lg:flex">
                    <Menu size={18} />
                  </div>
                  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#e8cf9d] bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,245,224,0.55)] sm:min-w-[340px]">
                    <Search size={18} className="text-[var(--muted)]" />
                    <input
                      className="w-full bg-transparent outline-none"
                      value={globalSearch}
                      onChange={(event) => onGlobalSearchChange(event.target.value)}
                      placeholder="Search anything..."
                    />
                    <span className="hidden rounded-lg border border-[#eedec0] bg-[#fff8ea] px-2 py-1 text-[11px] font-semibold text-[var(--muted)] sm:inline-flex">
                      K
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="hidden items-center gap-2 rounded-2xl border border-[#f0dcc0] bg-white px-4 py-3 text-sm font-medium text-[var(--deep)] lg:inline-flex">
                    <CalendarDays size={17} className="text-[var(--accent)]" />
                    {buildDashboardDateRangeLabel("monthly")}
                  </div>

                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f0dcc0] bg-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                        <Bell size={18} />
                        {alertCount > 0 ? (
                          <span className="absolute right-2 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                            {alertCount}
                          </span>
                        ) : null}
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-80 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-strong)] p-3 shadow-[var(--shadow)] backdrop-blur">
                        <p className="px-3 py-2 text-sm font-semibold">Admin alerts</p>
                        <div className="space-y-2">
                          <AlertItem title="Open support tickets" value={String(alertCount)} icon={AlertCircle} />
                          <AlertItem title="Payment follow-ups" value="Review pending collections" icon={CreditCard} />
                          <AlertItem title="Verification queue" value="Check tailor and partner documents" icon={ShieldCheck} />
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  <button
                    className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f0dcc0] bg-white text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
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
                      <button className="flex items-center gap-3 rounded-2xl border border-[#f0dcc0] bg-white px-3 py-2.5 transition hover:border-[var(--accent)]">
                        <AvatarBadge me={me} size="sm" />
                        <div className="hidden text-left sm:block">
                          <p className="text-sm font-semibold">{me?.name ?? "Super Admin"}</p>
                          <p className="text-xs text-[var(--muted)]">{me?.role ? formatRoleLabel(me.role) : "Super Administrator"}</p>
                        </div>
                        <ChevronDown size={16} className="text-[var(--muted)]" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content align="end" className="z-50 w-64 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-strong)] p-2 shadow-[var(--shadow)] backdrop-blur">
                        <DropdownMenu.Item className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm outline-none transition hover:bg-[#f4f7fb]">
                          <UserCircle2 size={16} />
                          Signed in as {me?.name ?? "Admin"}
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

          <div className="px-3 py-4 lg:px-6 lg:pb-8">{children}</div>
        </div>
      </div>
    </main>
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
      <Image alt="Darji" className="h-auto w-[112px]" height={72} priority src="/darji-logo.png" width={112} />
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
        <AvatarIllustration className="h-full w-full" seed={me?.name ?? me?.phone ?? "Admin"} />
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
      <AvatarIllustration className="h-full w-full" seed={seed} />
    </div>
  );
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
  variant = "primary"
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
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
      type="button"
    >
      {children}
    </button>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "teal" | "amber" | "rose" | "sky" | "slate" | "emerald" | "violet" | "cyan" }) {
  const toneMap: Record<string, string> = {
    amber: "bg-amber-500/12 text-amber-700",
    cyan: "bg-cyan-500/12 text-cyan-700",
    emerald: "bg-emerald-500/12 text-emerald-700",
    rose: "bg-rose-500/12 text-rose-700",
    sky: "bg-sky-500/12 text-sky-700",
    slate: "bg-slate-500/12 text-slate-700",
    teal: "bg-teal-500/12 text-teal-700",
    violet: "bg-violet-500/12 text-violet-700"
  };

  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", toneMap[tone])}>{children}</span>;
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[26px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-4 shadow-[var(--shadow)]", className)}>{children}</div>;
}

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
  icon: Icon,
  label,
  note,
  onClick,
  tone,
  value
}: {
  change?: string;
  changeTone?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  note: React.ReactNode;
  onClick?: () => void;
  tone: "teal" | "sky" | "amber" | "rose" | "emerald" | "violet" | "cyan" | "slate";
  value: string;
}) {
  const toneMap: Record<string, string> = {
    amber: "bg-[#fff3de] text-[#d48500]",
    cyan: "bg-[#edf5ff] text-[#3a7cff]",
    emerald: "bg-[#ecf9ea] text-[#47a232]",
    rose: "bg-[#fff0f4] text-[#de4c72]",
    sky: "bg-[#edf5ff] text-[#3a7cff]",
    slate: "bg-slate-500/12 text-slate-700",
    teal: "bg-[#fff3de] text-[#d48500]",
    violet: "bg-[#f2edff] text-[#7b61ff]"
  };

  const content = (
      <div className="flex h-full flex-col rounded-[26px] p-4">
        <div className="flex items-center justify-between gap-4">
          <span className={cn("rounded-[18px] p-3 shadow-sm", toneMap[tone])}>
            <Icon size={18} />
          </span>
          {change ? <TrendPill tone={changeTone}>{change}</TrendPill> : null}
        </div>
        <div className="mt-5">
          <p className="text-sm font-medium text-[#433624]">{label}</p>
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
    <span className="inline-flex items-center gap-1 rounded-xl border border-[#f0dcc0] bg-[#fffaf1] px-3 py-1.5 text-xs font-semibold text-[#ba7b08]">
      {label}
      <ChevronDown size={14} />
    </span>
  );
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
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-[#f2e4cd] bg-[#fffdf8] px-4 py-3">
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
                      <MiniAvatar seed={order.tailor?.shopName ?? order.tailor?.user?.name ?? `tailor-${order.id}`} />
                      <span>{order.tailor?.shopName ?? order.tailor?.user?.name ?? "Unassigned"}</span>
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
  title
}: {
  className?: string;
  description: string;
  items: Array<{ id: string; name: string; subtitle: string; value: string; rating?: string; onClick?: () => void }>;
  title: string;
}) {
  return (
    <Panel className={className}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--deep)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
        <ActionButton className="px-3 py-2 text-xs font-semibold" variant="secondary">
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
  icon: Icon,
  label,
  note,
  tone,
  value
}: {
  data: Array<{ label: string; value: number }>;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  note: string;
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
    <Panel className="p-4">
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

function AlertItem({
  icon: Icon,
  title,
  value
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-3 py-3 text-sm">
      <span className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
        <Icon size={16} />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-[var(--muted)]">{value}</p>
      </div>
    </div>
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
            <thead className="bg-[var(--accent-cream)] text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
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
                <tr key={row.id} className="border-t border-[var(--panel-border)] bg-[var(--panel-strong)]/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-4 align-top">
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
  let tone: "teal" | "amber" | "rose" | "sky" | "slate" | "emerald" | "violet" | "cyan" = "slate";
  if (["ACTIVE", "DELIVERED", "PAID", "READY", "VERIFIED", "RESOLVED", "completed", "delivered", "accepted"].includes(normalized)) tone = "emerald";
  else if (["BANNED", "CANCELLED", "FAILED", "REJECTED", "cancelled"].includes(normalized)) tone = "rose";
  else if (["PENDING", "QUOTE_REQUESTED", "OPEN", "REUPLOAD_REQUIRED", "SUSPENDED", "pending", "accepted", "picked_up"].includes(normalized)) tone = "amber";
  else if (["STITCHING_STARTED", "AT_TAILOR", "IN_PROGRESS", "WORKING"].includes(normalized)) tone = "sky";
  return <Badge tone={tone}>{formatStatus(normalized)}</Badge>;
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
  onAssign,
  onStatusChange,
  open,
  order,
  setOpen
}: {
  onAssign: () => void;
  onStatusChange: (status: string) => void;
  open: boolean;
  order: Order | null;
  setOpen: (open: boolean) => void;
}) {
  const [nextStatus, setNextStatus] = useState(order?.status ?? "ORDER_PLACED");

  useEffect(() => {
    setNextStatus(order?.status ?? "ORDER_PLACED");
  }, [order]);

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,980px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          {order ? (
            <>
              <Dialog.Title className="text-2xl font-semibold">{order.orderNumber}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">
                Standard order workflow with current assignment and proof media visibility.
              </Dialog.Description>
              <div className="mt-6 space-y-5">
                <InspectGrid
                  items={[
                    { label: "Customer", value: `${order.customer?.name ?? "Unknown"} / ${order.customer?.phone ?? "No phone"}` },
                    { label: "Status", value: <StatusBadge value={order.status} /> },
                    {
                      label: "Payment",
                      value: (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{formatStatus(order.paymentMethod)}</span>
                          <StatusBadge value={order.paymentStatus} />
                        </div>
                      )
                    },
                    { label: "Order total", value: formatCurrency(order.totalAmount) },
                    { label: "Tailor", value: order.tailor?.shopName ?? order.tailor?.user?.name ?? "Unassigned" },
                    { label: "Pickup partner", value: order.pickupPartner?.user?.name ?? order.pickupPartner?.user?.phone ?? "Unassigned" },
                    { label: "Delivery partner", value: order.deliveryPartner?.user?.name ?? order.deliveryPartner?.user?.phone ?? "Unassigned" },
                    { label: "Pickup scheduled", value: formatDate(order.pickupScheduledAt, true) }
                  ]}
                />

                <Panel>
                  <h4 className="text-lg font-semibold">Order items</h4>
                  <div className="mt-4 space-y-3">
                    {order.items.map((item, index) => (
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
                </Panel>

                {order.instructions ? (
                  <Panel>
                    <h4 className="text-lg font-semibold">Instructions</h4>
                    <p className="mt-3 text-sm text-[var(--muted)]">{order.instructions}</p>
                  </Panel>
                ) : null}

                <Panel>
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold">Admin actions</h4>
                      <p className="mt-1 text-sm text-[var(--muted)]">Use current backend endpoints for reassignment or status change.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton variant="secondary" onClick={onAssign}>
                        Reassign
                      </ActionButton>
                      <select className="h-12 rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                      <ActionButton onClick={() => onStatusChange(nextStatus)}>Update status</ActionButton>
                    </div>
                  </div>
                </Panel>

                <div className="grid gap-4 md:grid-cols-3">
                  {order.pickupImageUrl ? <img alt="Pickup proof" className="aspect-video rounded-2xl border border-[var(--panel-border)] object-cover" src={order.pickupImageUrl} /> : null}
                  {order.finalImageUrl ? <img alt="Final proof" className="aspect-video rounded-2xl border border-[var(--panel-border)] object-cover" src={order.finalImageUrl} /> : null}
                  {order.deliveryProofUrl ? <img alt="Delivery proof" className="aspect-video rounded-2xl border border-[var(--panel-border)] object-cover" src={order.deliveryProofUrl} /> : null}
                </div>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
                    { label: "Customer", value: `${request.customer?.name ?? "Unknown"} / ${request.customer?.phone ?? "No phone"}` },
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
                    { label: "Assigned partner", value: assignedPartner?.user?.name ?? assignedPartner?.user?.phone ?? "Unassigned" },
                    { label: "Estimated earnings", value: formatCurrency(request.estimatedEarnings) },
                    { label: "Customer", value: `${request.customerName ?? "Unknown"} / ${request.customerPhone ?? "No phone"}` },
                    { label: "Tailor", value: `${request.tailorName ?? "Unknown"} / ${request.tailorPhone ?? "No phone"}` },
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
  open,
  pending,
  profile,
  setOpen,
  subtitle
}: {
  onReview?: (status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED") => void;
  open: boolean;
  pending?: boolean;
  profile: TailorProfile | DeliveryPartnerProfile | null;
  setOpen: (open: boolean) => void;
  subtitle: string;
}) {
  const submittedMedia = collectVerificationMedia(profile?.verification);
  const draftMedia = collectVerificationMedia(profile?.verificationDraft);

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,860px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          {profile ? (
            <>
              <Dialog.Title className="text-2xl font-semibold">
                {profile.user?.name ?? (isTailorProfile(profile) ? profile.shopName : undefined) ?? "Profile"}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">{subtitle}</Dialog.Description>
              <div className="mt-6 space-y-5">
                {onReview ? (
                  <div className="flex flex-wrap gap-3">
                    <ActionButton disabled={pending} onClick={() => onReview("VERIFIED")}>
                      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      Approve
                    </ActionButton>
                    <ActionButton disabled={pending} variant="secondary" onClick={() => onReview("REUPLOAD_REQUIRED")}>
                      Request reupload
                    </ActionButton>
                    <ActionButton disabled={pending} variant="danger" onClick={() => onReview("REJECTED")}>
                      Reject
                    </ActionButton>
                  </div>
                ) : null}
                <InspectGrid
                  items={[
                    { label: "Phone", value: profile.user?.phone ?? "—" },
                    { label: "Availability", value: profile.isAvailable ? "Available" : "Offline" },
                    { label: "Verification", value: <StatusBadge value={profile.verificationStatus} /> },
                    { label: "Rating", value: typeof profile.rating === "number" ? profile.rating.toFixed(1) : "—" },
                    { label: "Working hours", value: stringifyUnknown(profile.workingHours) },
                    { label: "Settings", value: stringifyUnknown(profile.settings) },
                    { label: "Verification reviewed", value: formatDate(profile.verificationReviewedAt, true) },
                    { label: "Rejection reason", value: profile.verificationRejectionReason ?? "—" }
                  ]}
                />
                {"specialization" in profile ? (
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
                ) : null}
                <Panel>
                  <h4 className="text-lg font-semibold">Verification payload</h4>
                  <pre className="mt-4 overflow-x-auto rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] p-4 text-xs text-[var(--muted)]">
                    {stringifyUnknown(profile.verification)}
                  </pre>
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
  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          {user ? (
            <>
              <Dialog.Title className="text-2xl font-semibold">{user.name ?? user.phone}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">Account moderation, registration visibility, and role-level access state.</Dialog.Description>
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
                    { label: "Phone", value: user.phone },
                    { label: "Email", value: user.email ?? "-" },
                    { label: "Role", value: <StatusBadge value={user.role} /> },
                    { label: "Account", value: <StatusBadge value={user.accountStatus} /> },
                    { label: "Suspended until", value: formatDate(user.suspendedUntil, true) },
                    { label: "Moderation note", value: user.moderationReason ?? "-" },
                    { label: "Tailor registration", value: user.tailorProfile ? <StatusBadge value={user.tailorProfile.verificationStatus} /> : "No profile" },
                    { label: "Delivery registration", value: user.deliveryProfile ? <StatusBadge value={user.deliveryProfile.verificationStatus} /> : "No profile" }
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

function TicketDialog({
  open,
  ticket,
  setOpen
}: {
  open: boolean;
  ticket: SupportTicket | null;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(96vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
          {ticket ? (
            <>
              <Dialog.Title className="text-2xl font-semibold">{ticket.subject}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">Support ticket detail view from the current support API.</Dialog.Description>
              <div className="mt-6 space-y-5">
                <InspectGrid
                  items={[
                    { label: "Customer", value: ticket.user?.name ?? ticket.user?.phone ?? "Unknown" },
                    { label: "Status", value: <StatusBadge value={ticket.status} /> },
                    { label: "Order", value: ticket.order?.orderNumber ?? "—" },
                    { label: "Opened", value: formatDate(ticket.createdAt, true) }
                  ]}
                />
                <Panel>
                  <h4 className="text-lg font-semibold">Customer message</h4>
                  <p className="mt-3 text-sm text-[var(--muted)]">{ticket.message ?? "No additional message available."}</p>
                </Panel>
              </div>
            </>
          ) : null}
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
                <p className="font-medium">{order.orderNumber}</p>
                <p className="mt-1 text-[var(--muted)]">{order.customer?.name ?? order.customer?.phone ?? "Unknown customer"}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tailor">
                  <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={values.tailorId} onChange={(event) => setAssignTailorId(event.target.value)}>
                    <option value="">Unassigned</option>
                    {tailors.map((tailor) => (
                      <option key={tailor.id} value={tailor.id}>
                        {tailor.shopName ?? tailor.user?.name ?? tailor.user?.phone ?? "Tailor"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pickup partner">
                  <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={values.pickupPartnerId} onChange={(event) => setAssignPickupPartnerId(event.target.value)}>
                    <option value="">Unassigned</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.user?.name ?? partner.user?.phone ?? "Partner"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Delivery partner">
                  <select className="h-12 w-full rounded-2xl border border-[var(--panel-border)] bg-[#fbfdff] px-4 outline-none" value={values.deliveryPartnerId} onChange={(event) => setAssignDeliveryPartnerId(event.target.value)}>
                    <option value="">Unassigned</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.user?.name ?? partner.user?.phone ?? "Partner"}
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
  onStatusChange
}: {
  onAssign: (order: Order) => void;
  onOpen: (order: Order) => void;
  onStatusChange: (orderId: string, status: string) => void;
}): Array<ColumnDef<Order>> {
  return [
    {
      accessorKey: "orderNumber",
      header: "Order",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.orderNumber}</p>
          <p className="text-xs text-[var(--muted)]">{formatDate(row.original.createdAt, true)}</p>
        </div>
      )
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (row) => row.customer?.name ?? row.customer?.phone ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.customer?.name ?? "Unknown"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.customer?.phone ?? "No phone"}</p>
        </div>
      )
    },
    {
      id: "category",
      header: "Category",
      accessorFn: (row) => row.items.map((item) => item.service?.category?.name ?? "General").join(", "),
      cell: ({ row }) => <span>{row.original.items[0]?.service?.category?.name ?? "General"}</span>
    },
    {
      id: "tailor",
      header: "Tailor",
      accessorFn: (row) => row.tailor?.shopName ?? row.tailor?.user?.name ?? "",
      cell: ({ row }) => <span>{row.original.tailor?.shopName ?? row.original.tailor?.user?.name ?? "Unassigned"}</span>
    },
    {
      id: "partner",
      header: "Delivery partner",
      accessorFn: (row) => row.deliveryPartner?.user?.name ?? row.deliveryPartner?.user?.phone ?? row.pickupPartner?.user?.name ?? "",
      cell: ({ row }) => <span>{row.original.deliveryPartner?.user?.name ?? row.original.deliveryPartner?.user?.phone ?? row.original.pickupPartner?.user?.phone ?? "Unassigned"}</span>
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span>
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment",
      cell: ({ row }) => <StatusBadge value={row.original.paymentMethod} />
    },
    {
      accessorKey: "status",
      header: "Current status",
      cell: ({ row }) => <StatusBadge value={row.original.status} />
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
          <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onAssign(row.original)}>
            Assign
          </ActionButton>
          <ActionButton className="px-3 py-2" variant="danger" onClick={() => onStatusChange(row.original.id, "CANCELLED")}>
            Cancel
          </ActionButton>
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
      cell: ({ row }) => <span>{row.original.customer?.name ?? row.original.customer?.phone ?? "Unknown"}</span>
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
      header: "Customer"
    },
    {
      accessorKey: "tailorName",
      header: "Tailor"
    },
    {
      id: "partner",
      header: "Assigned partner",
      accessorFn: (row) => partners.find((partner) => partner.id === row.assignedDeliveryPartnerId)?.user?.name ?? "",
      cell: ({ row }) => <span>{partners.find((partner) => partner.id === row.original.assignedDeliveryPartnerId)?.user?.name ?? "Unassigned"}</span>
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
  onOpen,
  onReview
}: {
  onOpen: (tailor: TailorProfile) => void;
  onReview: (tailorId: string, status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED") => void;
}): Array<ColumnDef<TailorProfile>> {
  return [
    {
      id: "tailor",
      header: "Tailor",
      accessorFn: (row) => row.shopName ?? row.user?.name ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.shopName ?? row.original.user?.name ?? "Unnamed"}</p>
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
      cell: ({ row }) => (typeof row.original.rating === "number" ? row.original.rating.toFixed(1) : "—")
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
      header: "Availability",
      accessorFn: (row) => String(row.isAvailable),
      cell: ({ row }) => <Badge tone={row.original.isAvailable ? "emerald" : "slate"}>{row.original.isAvailable ? "Available" : "Offline"}</Badge>
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
        </div>
      )
    }
  ];
}

function getPartnerColumns({
  onOpen,
  onReview
}: {
  onOpen: (partner: DeliveryPartnerProfile) => void;
  onReview: (partnerId: string, status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED") => void;
}): Array<ColumnDef<DeliveryPartnerProfile>> {
  return [
    {
      id: "partner",
      header: "Partner",
      accessorFn: (row) => row.user?.name ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.user?.name ?? "Unnamed"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.user?.phone ?? "No phone"}</p>
        </div>
      )
    },
    {
      accessorKey: "vehicleNumber",
      header: "Vehicle"
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => (typeof row.original.rating === "number" ? row.original.rating.toFixed(1) : "—")
    },
    {
      accessorKey: "verificationStatus",
      header: "Verification",
      cell: ({ row }) => <StatusBadge value={row.original.verificationStatus} />
    },
    {
      id: "availability",
      header: "Availability",
      accessorFn: (row) => String(row.isAvailable),
      cell: ({ row }) => <Badge tone={row.original.isAvailable ? "emerald" : "slate"}>{row.original.isAvailable ? "Available" : "Offline"}</Badge>
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
        </div>
      )
    }
  ];
}

function getUserColumns({
  onActivate,
  onBan,
  onOpen,
  onSuspend,
  pending
}: {
  onActivate: (userId: string) => void;
  onBan: (userId: string) => void;
  onOpen: (user: AdminUser) => void;
  onSuspend: (userId: string) => void;
  pending: boolean;
}): Array<ColumnDef<AdminUser>> {
  return [
    {
      id: "user",
      header: "User",
      accessorFn: (row) => row.name ?? row.phone,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name ?? "Unnamed user"}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.phone}</p>
        </div>
      )
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <StatusBadge value={row.original.role} />
    },
    {
      accessorKey: "accountStatus",
      header: "Account",
      cell: ({ row }) => <StatusBadge value={row.original.accountStatus} />
    },
    {
      id: "registration",
      header: "Registration",
      accessorFn: (row) => row.tailorProfile?.verificationStatus ?? row.deliveryProfile?.verificationStatus ?? "CUSTOMER",
      cell: ({ row }) => {
        if (row.original.tailorProfile) return <StatusBadge value={row.original.tailorProfile.verificationStatus} />;
        if (row.original.deliveryProfile) return <StatusBadge value={row.original.deliveryProfile.verificationStatus} />;
        return <Badge tone="slate">Customer</Badge>;
      }
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
        if (row.original.role === "ADMIN") {
          return (
            <div className="flex flex-wrap gap-2">
              <ActionButton className="px-3 py-2" variant="secondary" onClick={() => onOpen(row.original)}>
                View
              </ActionButton>
              <Badge tone="slate">Protected</Badge>
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
          </div>
        );
      }
    }
  ];
}

function getPaymentColumns({
  onMarkPaid,
  pending
}: {
  onMarkPaid: (paymentId: string) => void;
  pending: boolean;
}): Array<ColumnDef<Payment>> {
  return [
    {
      id: "order",
      header: "Order",
      accessorFn: (row) => row.order?.orderNumber ?? "",
      cell: ({ row }) => <span>{row.original.order?.orderNumber ?? "—"}</span>
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
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount)
    },
    {
      accessorKey: "providerRef",
      header: "Provider ref",
      cell: ({ row }) => row.original.providerRef ?? "—"
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
      header: "Code"
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
      header: "Ticket"
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (row) => row.user?.name ?? row.user?.phone ?? "",
      cell: ({ row }) => <span>{row.original.user?.name ?? row.original.user?.phone ?? "Unknown"}</span>
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
      cell: ({ row }) => row.original.order?.orderNumber ?? "—"
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

function buildMetrics(
  analytics: AnalyticsSummary,
  orders: Order[],
  tailors: TailorProfile[],
  partners: DeliveryPartnerProfile[],
  payments: Payment[]
): DashboardMetrics {
  const paidPayments = payments.filter((payment) => payment.status === "PAID");
  const revenueToday = paidPayments.filter((payment) => isToday(payment.createdAt)).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const ordersToday = orders.filter((order) => isToday(order.createdAt)).length;
  const pendingVerifications =
    tailors.filter((tailor) => tailor.verificationStatus === "PENDING").length +
    partners.filter((partner) => partner.verificationStatus === "PENDING").length;
  const pendingCollections = payments.filter((payment) => payment.status === "PENDING").length;
  const completionRate = orders.length ? (orders.filter((order) => order.status === "DELIVERED").length / orders.length) * 100 : 0;
  const cancellationRate = orders.length ? (orders.filter((order) => order.status === "CANCELLED").length / orders.length) * 100 : 0;

  return {
    averageOrderValue: paidPayments.length ? analytics.revenue / paidPayments.length : 0,
    cancellationRate,
    completionRate,
    ordersToday,
    pendingCollections,
    pendingVerifications,
    revenueToday,
    totalRevenue: analytics.revenue
  };
}

function isTailorProfile(profile: TailorProfile | DeliveryPartnerProfile): profile is TailorProfile {
  return "shopName" in profile;
}

function buildRevenueSeries(payments: Payment[], range: TrendRange): RevenuePoint[] {
  const slots = buildSlots(range);
  const totals = new Map(slots.map((slot) => [slot.key, 0]));
  payments
    .filter((payment) => payment.status === "PAID" && payment.createdAt)
    .forEach((payment) => {
      const key = bucketKey(new Date(payment.createdAt as string), range);
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + Number(payment.amount));
      }
    });
  return slots.map((slot) => ({ label: slot.label, revenue: totals.get(slot.key) ?? 0 }));
}

function buildOrderTrendSeries(orders: Order[], range: TrendRange): OrderTrendPoint[] {
  const slots = buildSlots(range);
  const totals = new Map(slots.map((slot) => [slot.key, { completed: 0, cancelled: 0, pending: 0 }]));
  orders.forEach((order) => {
    if (!order.createdAt) return;
    const key = bucketKey(new Date(order.createdAt), range);
    const item = totals.get(key);
    if (!item) return;
    if (order.status === "DELIVERED") item.completed += 1;
    else if (order.status === "CANCELLED") item.cancelled += 1;
    else item.pending += 1;
  });
  return slots.map((slot) => ({ label: slot.label, ...(totals.get(slot.key) ?? { completed: 0, cancelled: 0, pending: 0 }) }));
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
      cancelled: bucketOrders.filter((order) => order.status === "CANCELLED").length,
      pending: bucketOrders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status)).length
    };
  });
}

function buildGrowthSeries(orders: Order[], tailors: TailorProfile[], partners: DeliveryPartnerProfile[], range: TrendRange): GrowthPoint[] {
  const slots = buildSlots(range);
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
  return series[series.length - 1] ?? { label: "", completed: 0, cancelled: 0, pending: 0 };
}

function previousOrderPoint(series: OrderTrendPoint[]) {
  return series[series.length - 2] ?? { label: "", completed: 0, cancelled: 0, pending: 0 };
}

function sumOrderPoint(point: Pick<OrderTrendPoint, "completed" | "cancelled" | "pending">) {
  return point.completed + point.cancelled + point.pending;
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
    orderNumber: order.orderNumber,
    customer: order.customer?.name ?? order.customer?.phone ?? "",
    category: order.items[0]?.service?.category?.name ?? "General",
    tailor: order.tailor?.shopName ?? order.tailor?.user?.name ?? "",
    deliveryPartner: order.deliveryPartner?.user?.name ?? order.deliveryPartner?.user?.phone ?? "",
    amount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    status: order.status,
    createdAt: order.createdAt ?? ""
  };
}

function tailoringToCsv(request: TailoringRequest) {
  return {
    customer: request.customer?.name ?? request.customer?.phone ?? "",
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
    name: tailor.user?.name ?? "",
    phone: tailor.user?.phone ?? "",
    rating: tailor.rating ?? "",
    earnings: tailor.earnings ?? 0,
    verificationStatus: tailor.verificationStatus ?? "",
    isAvailable: tailor.isAvailable
  };
}

function partnerToCsv(partner: DeliveryPartnerProfile) {
  return {
    name: partner.user?.name ?? "",
    phone: partner.user?.phone ?? "",
    vehicleNumber: partner.vehicleNumber ?? "",
    rating: partner.rating ?? "",
    weeklyEarnings: partner.weeklyEarnings ?? 0,
    verificationStatus: partner.verificationStatus ?? "",
    isAvailable: partner.isAvailable
  };
}

function userToCsv(user: AdminUser) {
  return {
    name: user.name ?? "",
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
