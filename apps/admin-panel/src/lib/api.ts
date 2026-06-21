"use client";

import axios, { type AxiosRequestConfig } from "axios";
import { useAdminStore } from "@/src/store/admin-store";
import type {
  AdminUser,
  AnalyticsSummary,
  ApiEnvelope,
  AuthSession,
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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
      useAdminStore.getState().logout();
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

export async function getCoupons() {
  return unwrap<Coupon[]>(api.get("/coupons"));
}

export async function getSupportTickets() {
  return unwrap<SupportTicket[]>(api.get("/support"));
}

export async function getSettings() {
  return unwrap<SettingRecord[]>(api.get("/settings"));
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

export async function moderateUser(payload: {
  userId: string;
  action: "ACTIVE" | "SUSPENDED" | "BANNED";
  reason?: string;
  suspendedUntil?: string;
}) {
  const { userId, ...body } = payload;
  return unwrap<AdminUser>(api.patch(`/users/${userId}/moderation`, body));
}

export async function reviewTailorVerification(payload: {
  tailorId: string;
  status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED";
  reason?: string;
}) {
  const { tailorId, ...body } = payload;
  return unwrap<TailorProfile>(api.patch(`/tailors/${tailorId}/verification-review`, body));
}

export async function reviewDeliveryVerification(payload: {
  partnerId: string;
  status: "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED";
  reason?: string;
}) {
  const { partnerId, ...body } = payload;
  return unwrap<DeliveryPartnerProfile>(api.patch(`/delivery-partners/${partnerId}/verification-review`, body));
}
