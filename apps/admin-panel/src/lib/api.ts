"use client";

import axios, { type AxiosRequestConfig } from "axios";
import { useAdminStore } from "@/src/store/admin-store";
import type { PlatformStatus } from "@darzi/shared";
import type {
  AdminUser,
  AnalyticsSummary,
  ApiEnvelope,
  AuthSession,
  Coupon,
  DeliveryPartnerProfile,
  DeliveryBatch,
  DeliveryRequest,
  MeResponse,
  Order,
  Payment,
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
  ServiceArea,
  LaunchRequest,
  LaunchRequestGroup
} from "@/src/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://backend-production-5a7e4.up.railway.app/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const message = String(error.response?.data?.message ?? "Session expired");
      if (/signed in on another device/i.test(message)) useAdminStore.getState().invalidateSession(message);
      else useAdminStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

async function unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>) {
  const response = await request;
  return response.data.data;
}

export function extractError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.message ?? error.message ?? "Request failed");
  }
  return error instanceof Error ? error.message : "Request failed";
}

export async function requestOtp(phone: string) {
  return unwrap<{ otp?: string }>(api.post("/auth/request-otp", { phone, role: "ADMIN" }));
}

export async function verifyOtp(phone: string, otp: string) {
  return unwrap<AuthSession>(api.post("/auth/verify-otp", { phone, otp, role: "ADMIN" }));
}

export async function getMe() {
  return unwrap<MeResponse>(api.get("/auth/me"));
}

export async function getAnalytics() {
  return unwrap<AnalyticsSummary>(api.get("/analytics"));
}

export async function getOrders(params?: AxiosRequestConfig["params"]) {
  return unwrap<Order[]>(api.get("/orders", { params }));
}

export async function getTailoringRequests() {
  return unwrap<TailoringRequest[]>(api.get("/tailoring-requests"));
}

export async function getDeliveryRequests() {
  return unwrap<DeliveryRequest[]>(api.get("/delivery-requests"));
}

export async function getDeliveryRetries() {
  return unwrap<DeliveryRequest[]>(api.get("/admin/delivery-retries"));
}

export async function getDeliveryBatches() {
  return unwrap<DeliveryBatch[]>(api.get("/admin/delivery-batches"));
}

export type NotifyDeliveryBatchResult = {
  batchId: string;
  notifiedPartners: number;
  notifiedTasks: number;
  status: string;
};

export async function notifyDeliveryBatch(batchId: string) {
  return unwrap<NotifyDeliveryBatchResult>(api.post(`/admin/delivery-batches/${batchId}/notify`, {}));
}

export async function reassignDeliveryBatchTask(payload: { taskId: string; batchId: string }) {
  const { taskId, ...body } = payload;
  return unwrap<DeliveryRequest>(api.patch(`/admin/delivery-batches/tasks/${taskId}`, body));
}

export async function retryDeliveryNow(taskId: string, payload?: { deliveryRound?: "ONE_PM" | "SIX_PM"; roundAt?: string }) {
  return unwrap<DeliveryRequest>(api.patch(`/admin/delivery-retries/${taskId}/retry-now`, payload ?? {}));
}

export async function resolveDeliveryRetry(taskId: string) {
  return unwrap<DeliveryRequest>(api.patch(`/admin/delivery-retries/${taskId}/resolve`, {}));
}

export async function cancelDeliveryRetry(taskId: string) {
  return unwrap<DeliveryRequest>(api.patch(`/admin/delivery-retries/${taskId}/cancel`, {}));
}

export async function getTailors() {
  return unwrap<TailorProfile[]>(api.get("/tailors"));
}

export async function getDeliveryPartners() {
  return unwrap<DeliveryPartnerProfile[]>(api.get("/delivery-partners"));
}

export async function getUsers() {
  return unwrap<AdminUser[]>(api.get("/users"));
}

export async function getPayments() {
  return unwrap<Payment[]>(api.get("/payments"));
}

export async function getWalletPayouts(userType: "TAILOR" | "DELIVERY_PARTNER") {
  return unwrap<WalletPayoutRow[]>(api.get("/admin/wallet-payouts", { params: { userType } }));
}

export async function getWalletDetail(userId: string) {
  return unwrap<WalletDetail>(api.get(`/admin/wallets/${userId}`));
}

export async function createWalletPayout(payload: {
  userId: string;
  userType: "TAILOR" | "DELIVERY_PARTNER";
  amount: number;
  receiptUrl: string;
  notes?: string;
  weekStart?: string;
  weekEnd?: string;
  referenceNumber?: string;
}) {
  return unwrap(api.post("/admin/wallet-payouts", payload));
}

export async function getDeliveryFareSettings() {
  return unwrap<DeliveryFareSettings>(api.get("/settings/delivery-fares"));
}

export async function updateDeliveryFareSettings(payload: DeliveryFareSettings) {
  return unwrap<DeliveryFareSettings>(api.put("/settings/delivery-fares", payload));
}

export async function getCoupons() {
  return unwrap<Coupon[]>(api.get("/coupons"));
}

export async function getSupportTickets() {
  return unwrap<SupportTicket[]>(api.get("/support"));
}

export async function getSettings() {
  return unwrap<SettingRecord[]>(api.get("/settings"));
}

export async function getPlatformStatus() {
  return unwrap<PlatformStatus>(api.get("/platform-status"));
}

export async function updatePlatformStatus(payload: PlatformStatus) {
  return unwrap<PlatformStatus>(api.put("/admin/platform-status", payload));
}

export async function getServiceAreas() {
  return unwrap<ServiceArea[]>(api.get("/service-areas"));
}

export async function createServiceArea(payload: Omit<ServiceArea, "id" | "createdAt" | "updatedAt">) {
  return unwrap<ServiceArea>(api.post("/service-areas", payload));
}

export async function updateServiceArea(id: string, payload: Omit<ServiceArea, "id" | "createdAt" | "updatedAt">) {
  return unwrap<ServiceArea>(api.put(`/service-areas/${id}`, payload));
}

export async function deleteServiceArea(id: string) {
  return unwrap<{ deleted: boolean; id: string }>(api.delete(`/service-areas/${id}`));
}

export async function getLaunchRequests() {
  return unwrap<{ requests: LaunchRequest[]; grouped: LaunchRequestGroup[] }>(api.get("/admin/launch-requests"));
}

export async function assignOrder(payload: { orderId: string; tailorId?: string; deliveryPartnerId?: string; mode?: "pickup" | "delivery" }) {
  const { orderId, ...body } = payload;
  return unwrap<Order>(api.patch(`/orders/${orderId}/assign`, body));
}

export async function updateOrderStatus(payload: { orderId: string; status: string }) {
  const { orderId, ...body } = payload;
  return unwrap<Order>(api.patch(`/orders/${orderId}/status`, body));
}

export async function markPaymentPaid(payload: { paymentId: string; providerRef?: string }) {
  const { paymentId, ...body } = payload;
  return unwrap<Payment>(api.post(`/payments/${paymentId}/success`, body));
}

export async function createCoupon(payload: {
  code: string;
  description: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  expiresAt?: string | null;
  isActive: boolean;
}) {
  return unwrap<Coupon>(api.post("/coupons", payload));
}

export async function updateSetting(payload: { key: string; value: unknown }) {
  return unwrap<SettingRecord>(api.put(`/settings/${payload.key}`, { value: payload.value }));
}

export type DevelopmentResetResult = {
  deleted: Record<string, number>;
  reset?: Record<string, number>;
  preserved?: Record<string, boolean>;
};

export async function resetOrdersRequestsBatches() {
  return unwrap<DevelopmentResetResult>(api.post("/admin/development/reset-orders", {}));
}

export async function resetEverythingDevelopment() {
  return unwrap<DevelopmentResetResult>(api.post("/admin/development/reset-everything", {}));
}

export async function moderateUser(payload: {
  userId: string;
  action: "ACTIVE" | "SUSPENDED" | "BANNED";
  reason?: string;
  suspendedUntil?: string;
}) {
  const { userId, ...body } = payload;
  return unwrap<AdminUser>(api.patch(`/users/${userId}/moderation`, body));
}

export async function inviteAdmin(payload: { phone: string }) {
  return unwrap<AdminUser>(api.post("/users/admin-invite", payload));
}

export async function reviewTailorVerification(payload: {
  tailorId: string;
  status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED";
  reason?: string;
  reuploadFields?: string[];
}) {
  const { tailorId, ...body } = payload;
  return unwrap<TailorProfile>(api.patch(`/tailors/${tailorId}/verification-review`, body));
}

export async function uploadAdminMedia(file: File) {
  const form = new FormData();
  form.append("media", file);
  return unwrap<{ url: string; publicId: string; resourceType: "image" | "video"; bytes: number; format?: string; originalName?: string }>(
    api.post("/admin/media", form, { headers: { "Content-Type": "multipart/form-data" } })
  );
}

export async function reviewDeliveryVerification(payload: {
  partnerId: string;
  status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED";
  reason?: string;
  deliveryType?: "PICKUP" | "DROP";
  assignedArea?: string;
}) {
  const { partnerId, ...body } = payload;
  return unwrap<DeliveryPartnerProfile>(api.patch(`/delivery-partners/${partnerId}/verification-review`, body));
}

export async function replyToSupportTicket(payload: { ticketId: string; adminResponse?: string; status?: string; priority?: string; assignedTo?: string | null }) {
  const { ticketId, ...body } = payload;
  return unwrap<SupportTicket>(api.patch(`/support/${ticketId}`, body));
}

export async function getSupportStats() {
  return unwrap<SupportStats>(api.get("/support/stats"));
}

export async function getBugReports() {
  return unwrap<BugReport[]>(api.get("/support/bug-reports"));
}

export async function updateBugReport(payload: { bugId: string; status?: string; assignedTo?: string | null }) {
  const { bugId, ...body } = payload;
  return unwrap<BugReport>(api.patch(`/support/bug-reports/${bugId}`, body));
}

export async function getAccountChangeRequests() {
  return unwrap<AccountChangeRequest[]>(api.get("/support/change-requests"));
}

export async function approveAccountChangeRequest(payload: { requestId: string }) {
  return unwrap<AccountChangeRequest>(api.patch(`/support/change-requests/${payload.requestId}/approve`));
}

export async function rejectAccountChangeRequest(payload: { requestId: string; adminNotes?: string }) {
  const { requestId, ...body } = payload;
  return unwrap<AccountChangeRequest>(api.patch(`/support/change-requests/${requestId}/reject`, body));
}

export async function addSupportTicketMessage(payload: {
  ticketId: string;
  text: string;
  type?: string;
  isInternal?: boolean;
  attachments?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  thumbnail?: string;
}) {
  const { ticketId, ...body } = payload;
  return unwrap<SupportTicket>(api.post(`/support/${ticketId}/messages`, body));
}

export async function addBugReportMessage(payload: {
  bugId: string;
  text: string;
  type?: string;
  isInternal?: boolean;
  attachments?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  thumbnail?: string;
}) {
  const { bugId, ...body } = payload;
  return unwrap<BugReport>(api.post(`/support/bug-reports/${bugId}/messages`, body));
}

export async function addChangeRequestMessage(payload: {
  requestId: string;
  text: string;
  type?: string;
  isInternal?: boolean;
  attachments?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  thumbnail?: string;
}) {
  const { requestId, ...body } = payload;
  return unwrap<AccountChangeRequest>(api.post(`/support/change-requests/${requestId}/messages`, body));
}

export async function getAdminReviews() {
  return unwrap<AdminReview[]>(api.get("/admin/reviews"));
}

export async function toggleReviewFeatured(reviewId: string) {
  return unwrap<AdminReview>(api.patch(`/admin/reviews/${reviewId}/featured`));
}

export type AdminReview = {
  id: string;
  userId: string;
  orderId: string;
  kind: "tailor" | "delivery" | "app";
  rating: number;
  comment?: string;
  isFeatured: boolean;
  createdAt: string;
  orderNumber: string;
  targetId?: string;
  targetName?: string;
  targetPhone?: string;
  targetAvatarUrl?: string;
  user: {
    name?: string;
    phone: string;
    avatarUrl?: string;
  } | null;
};
