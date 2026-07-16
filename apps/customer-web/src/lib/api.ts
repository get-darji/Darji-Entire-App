"use client";

import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/src/store/auth-store";
import type { Address, CheckoutResponse, Coupon, HandoffOtp, NotificationRow, TailoringRequest, TailorQuote, UploadedMedia, WalletSummary } from "./types";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://backend-production-5a7e4.up.railway.app/api";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
});

type ApiEnvelope<T> = { data: T; message?: string };
type AuthSession = { accessToken: string; refreshToken: string; user: { id: string; phone: string; role: string; name?: string; email?: string } };

let refreshPromise: Promise<string | undefined> | undefined;

async function refreshAccessToken() {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return undefined;
  const response = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(`${apiBaseUrl}/auth/refresh`, { refreshToken });
  const token = response.data.data.accessToken;
  useAuthStore.getState().setAccessToken(token);
  return token;
}

function shouldRefresh(error: unknown) {
  const message = error instanceof AxiosError ? String(error.response?.data?.message ?? error.message) : error instanceof Error ? error.message : "";
  return /invalid or expired token|authentication required|invalid session|jwt expired/i.test(message);
}

async function request<T>(config: AxiosRequestConfig, retry = true): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  try {
    const response = await apiClient.request<ApiEnvelope<T>>({
      ...config,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...config.headers
      }
    });
    return response.data.data;
  } catch (error) {
    if (!retry || !shouldRefresh(error)) throw error;
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = undefined;
    });
    const nextToken = await refreshPromise;
    if (!nextToken) {
      useAuthStore.getState().signOut();
      throw error;
    }
    return request<T>(config, false);
  }
}

export const customerApi = {
  requestOtp: (phone: string) => request<{ otp?: string }>({ method: "POST", url: "/auth/request-otp", data: { phone, role: "CUSTOMER" } }),
  verifyOtp: (phone: string, otp: string) => request<AuthSession>({ method: "POST", url: "/auth/verify-otp", data: { phone, otp, role: "CUSTOMER" } }),
  me: () => request<AuthSession["user"] & { wallet?: { balance?: number } }>({ method: "GET", url: "/auth/me" }),
  updateProfile: (data: unknown) => request<AuthSession["user"]>({ method: "PATCH", url: "/auth/me", data }),
  uploadMedia: async (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("media", file));
    return request<UploadedMedia[]>({ method: "POST", url: "/tailoring-requests/media", data: form, headers: { "Content-Type": "multipart/form-data" } });
  },
  createTailoringRequest: (data: unknown) => request<TailoringRequest>({ method: "POST", url: "/tailoring-requests", data }),
  tailoringRequests: () => request<TailoringRequest[]>({ method: "GET", url: "/tailoring-requests" }),
  tailoringRequest: (id: string) => request<TailoringRequest>({ method: "GET", url: `/tailoring-requests/${id}` }),
  quotes: (requestId: string) => request<TailorQuote[]>({ method: "GET", url: `/tailoring-requests/${requestId}/quotes` }),
  checkout: (requestId: string, data: unknown) => request<CheckoutResponse>({ method: "POST", url: `/tailoring-requests/${requestId}/checkout`, data }),
  verifyCheckout: (requestId: string, data: unknown) => request<TailoringRequest>({ method: "POST", url: `/tailoring-requests/${requestId}/checkout/verify`, data }),
  cancelRequest: (requestId: string, reason?: string) => request<TailoringRequest>({ method: "POST", url: `/tailoring-requests/${requestId}/cancel`, data: { reason } }),
  coupons: () => request<Coupon[]>({ method: "GET", url: "/coupons" }),
  wallet: () => request<WalletSummary>({ method: "GET", url: "/wallet" }),
  notifications: () => request<NotificationRow[]>({ method: "GET", url: "/notifications" }),
  handoffOtps: (orderId: string) => request<HandoffOtp[]>({ method: "GET", url: `/delivery-requests/order/${orderId}/otps` }),
  addresses: () => request<Address[]>({ method: "GET", url: "/addresses" }),
  createAddress: (data: unknown) => request<Address>({ method: "POST", url: "/addresses", data }),
  supportTickets: () => request<any[]>({ method: "GET", url: "/support" }),
  bugReports: () => request<any[]>({ method: "GET", url: "/support/bug-reports" }),
  createSupportTicket: (data: unknown) => request<any>({ method: "POST", url: "/support", data }),
  createBugReport: (data: unknown) => request<any>({ method: "POST", url: "/support/bug-reports", data }),
  sendTicketMessage: (id: string, data: unknown) => request<any>({ method: "POST", url: `/support/${id}/messages`, data }),
  sendBugMessage: (id: string, data: unknown) => request<any>({ method: "POST", url: `/support/bug-reports/${id}/messages`, data }),
  updateTicketStatus: (id: string, status: string) => request<any>({ method: "PATCH", url: `/support/${id}`, data: { status } }),
  getDeliveryFares: () => request<any>({ method: "GET", url: "/settings/delivery-fares" })
};

export function errorMessage(error: unknown) {
  if (error instanceof AxiosError) return String(error.response?.data?.message ?? error.message);
  return error instanceof Error ? error.message : "Something went wrong";
}
