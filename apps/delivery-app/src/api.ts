import Constants from "expo-constants";
import { useAppStore } from "./store";
import type { PlatformStatus } from "../../../shared/src/platform-status";
import type { DeviceCoordinates } from "../../../shared/src/use-service-area-access";
import type { ServiceAreaCheck } from "../../../shared/src/service-area";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://backend-production-5a7e4.up.railway.app/api";
type RefreshResponse = { accessToken: string; refreshToken: string };
let refreshPromise: Promise<string | undefined> | undefined;
const sessionErrorPattern = /invalid or expired token|authentication required|invalid session|signed in on another device/i;

async function performAccessTokenRefresh() {
  const refreshToken = useAppStore.getState().refreshToken;
  if (!refreshToken) return undefined;

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify({ refreshToken })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(body.message ?? "Session expired");
    if (/signed in on another device/i.test(message)) useAppStore.getState().invalidateSession(message);
    else useAppStore.getState().signOut();
    throw new Error(message);
  }

  const data = body.data as RefreshResponse;
  useAppStore.getState().setAccessToken(data.accessToken);
  return data.accessToken;
}

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performAccessTokenRefresh().finally(() => {
      refreshPromise = undefined;
    });
  }
  return refreshPromise;
}

export async function getPlatformStatus() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await requestJson<PlatformStatus>("/platform-status", { signal: controller.signal }, undefined);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Platform status check timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function checkServiceArea(coordinates: DeviceCoordinates) {
  return api<ServiceAreaCheck>("/service-areas/check", { method: "POST", body: JSON.stringify(coordinates) });
}

export function requestServiceAreaLaunch(coordinates: DeviceCoordinates) {
  return api("/service-areas/notify", { method: "POST", body: JSON.stringify(coordinates) });
}

async function requestJson<T>(path: string, options: RequestInit, token?: string) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Request failed");
  return body.data as T;
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const currentToken = token ?? useAppStore.getState().token;
  try {
    return await requestJson<T>(path, options, currentToken);
  } catch (error) {
    if (!sessionErrorPattern.test(error instanceof Error ? error.message : "")) throw error;
    if (/signed in on another device/i.test(error instanceof Error ? error.message : "")) {
      useAppStore.getState().invalidateSession((error as Error).message);
      throw error;
    }
    const nextToken = await refreshAccessToken();
    if (!nextToken) throw error;
    return requestJson<T>(path, options, nextToken);
  }
}

export type UploadedMedia = {
  url: string;
  publicId: string;
  resourceType: "image" | "video";
  bytes: number;
  format?: string;
  originalName?: string;
};

function sendMediaUpload(files: { uri: string; name: string }[], token: string): Promise<UploadedMedia[]> {
  const form = new FormData();
  files.forEach((file) => form.append("media", { uri: file.uri, name: file.name, type: "image/jpeg" } as unknown as File));
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl}/delivery-requests/media`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.onload = () => {
      const body = JSON.parse(request.responseText || "{}") as { data?: UploadedMedia[]; message?: string };
      if (request.status < 200 || request.status >= 300) reject(new Error(body.message ?? "Upload failed"));
      else resolve(body.data ?? []);
    };
    request.onerror = () => reject(new Error("Upload failed. Check backend connection."));
    request.timeout = 120000;
    request.send(form);
  });
}

export async function uploadDeliveryMedia(files: { uri: string; name: string }[], token?: string) {
  const currentToken = token ?? useAppStore.getState().token;
  if (!currentToken) throw new Error("Authentication required");
  try {
    return await sendMediaUpload(files, currentToken);
  } catch (error) {
    if (!sessionErrorPattern.test(error instanceof Error ? error.message : "")) throw error;
    const nextToken = await refreshAccessToken();
    if (!nextToken) throw error;
    return sendMediaUpload(files, nextToken);
  }
}

function sendSingleImageUpload(path: string, fieldName: string, file: { uri: string; name: string }, token: string) {
  const form = new FormData();
  form.append(fieldName, { uri: file.uri, name: file.name, type: "image/jpeg" } as unknown as File);
  return new Promise<{ avatarUrl?: string; user?: unknown }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl}${path}`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.onload = () => {
      const body = JSON.parse(request.responseText || "{}") as { data?: { avatarUrl?: string; user?: unknown }; message?: string };
      if (request.status < 200 || request.status >= 300) reject(new Error(body.message ?? "Upload failed"));
      else resolve(body.data ?? {});
    };
    request.onerror = () => reject(new Error("Upload failed. Check backend connection."));
    request.timeout = 120000;
    request.send(form);
  });
}

function sendVerificationUpload(path: string, files: { uri: string; name: string }[], token: string): Promise<UploadedMedia[]> {
  const form = new FormData();
  files.forEach((file) => form.append("media", { uri: file.uri, name: file.name, type: "image/jpeg" } as unknown as File));
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl}${path}`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.onload = () => {
      const body = JSON.parse(request.responseText || "{}") as { data?: UploadedMedia[]; message?: string };
      if (request.status < 200 || request.status >= 300) reject(new Error(body.message ?? "Upload failed"));
      else resolve(body.data ?? []);
    };
    request.onerror = () => reject(new Error("Upload failed. Check backend connection."));
    request.timeout = 120000;
    request.send(form);
  });
}

export async function uploadDeliveryAvatar(file: { uri: string; name: string }, token?: string) {
  const currentToken = token ?? useAppStore.getState().token;
  if (!currentToken) throw new Error("Authentication required");
  try {
    return await sendSingleImageUpload("/delivery-partners/me/avatar", "avatar", file, currentToken);
  } catch (error) {
    if (!sessionErrorPattern.test(error instanceof Error ? error.message : "")) throw error;
    const nextToken = await refreshAccessToken();
    if (!nextToken) throw error;
    return sendSingleImageUpload("/delivery-partners/me/avatar", "avatar", file, nextToken);
  }
}

export async function uploadDeliveryVerificationDocs(files: { uri: string; name: string }[], token?: string) {
  const currentToken = token ?? useAppStore.getState().token;
  if (!currentToken) throw new Error("Authentication required");
  try {
    return await sendVerificationUpload("/delivery-partners/me/verification-media", files, currentToken);
  } catch (error) {
    if (!sessionErrorPattern.test(error instanceof Error ? error.message : "")) throw error;
    const nextToken = await refreshAccessToken();
    if (!nextToken) throw error;
    return sendVerificationUpload("/delivery-partners/me/verification-media", files, nextToken);
  }
}
