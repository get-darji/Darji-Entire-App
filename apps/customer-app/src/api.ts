import Constants from "expo-constants";
import { useAppStore } from "./store";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://backend-production-5a7e4.up.railway.app/api";

type RefreshResponse = { accessToken: string; refreshToken: string };
let refreshPromise: Promise<string | undefined> | undefined;

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
    useAppStore.getState().signOut();
    throw new Error(body.message ?? "Session expired");
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
  if (!response.ok) {
    throw new Error(body.message ?? "Request failed");
  }
  return body.data as T;
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const currentToken = token ?? useAppStore.getState().token;
  try {
    return await requestJson<T>(path, options, currentToken);
  } catch (error) {
    if (!/invalid or expired token|authentication required|invalid session/i.test(error instanceof Error ? error.message : "")) throw error;
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

function sendMediaUpload(files: { uri: string; type: "image" | "video"; name: string }[], token: string): Promise<UploadedMedia[]> {
  const form = new FormData();
  files.forEach((file) => {
    form.append("media", {
      uri: file.uri,
      name: file.name,
      type: file.type === "image" ? "image/jpeg" : "video/mp4"
    } as unknown as File);
  });

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl}/tailoring-requests/media`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.onload = () => {
      let body: { data?: UploadedMedia[]; message?: string } = {};
      try {
        body = JSON.parse(request.responseText || "{}");
      } catch {
        body = {};
      }

      if (request.status < 200 || request.status >= 300) {
        reject(new Error(body.message ?? "Upload failed"));
        return;
      }

      resolve(body.data ?? []);
    };

    request.onerror = () => reject(new Error("Upload failed. Check backend connection."));
    request.ontimeout = () => reject(new Error("Upload timed out. Try a smaller file."));
    request.timeout = 120000;
    request.send(form);
  });
}

export async function uploadMedia(files: { uri: string; type: "image" | "video"; name: string }[], token?: string): Promise<UploadedMedia[]> {
  const currentToken = token ?? useAppStore.getState().token;
  if (!currentToken) throw new Error("Authentication required");

  try {
    return await sendMediaUpload(files, currentToken);
  } catch (error) {
    if (!/invalid or expired token|authentication required|invalid session/i.test(error instanceof Error ? error.message : "")) throw error;
    const nextToken = await refreshAccessToken();
    if (!nextToken) throw error;
    return sendMediaUpload(files, nextToken);
  }
}
