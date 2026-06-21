import Constants from "expo-constants";
import { useAppStore } from "./store";

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:4000/api";

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

async function requestJson<T>(path: string, options: RequestInit, token?: string): Promise<T> {
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

export type VerificationMedia = {
  url: string;
  publicId: string;
  bytes: number;
  format?: string;
  originalName?: string;
};

function sendAuditMediaUpload(requestId: string, stage: "RECEIVED" | "STITCHED", files: { uri: string; name: string }[], token: string): Promise<unknown> {
  const form = new FormData();
  form.append("stage", stage);
  files.forEach((file) => {
    form.append("media", {
      uri: file.uri,
      name: file.name,
      type: "image/jpeg"
    } as unknown as File);
  });

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl}/tailoring-requests/${requestId}/audit-media`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.onload = () => {
      let body: { data?: unknown; message?: string } = {};
      try {
        body = JSON.parse(request.responseText || "{}");
      } catch {
        body = {};
      }

      if (request.status < 200 || request.status >= 300) {
        reject(new Error(body.message ?? "Upload failed"));
        return;
      }

      resolve(body.data);
    };

    request.onerror = () => reject(new Error("Upload failed. Check backend connection."));
    request.ontimeout = () => reject(new Error("Upload timed out. Try smaller photos."));
    request.timeout = 120000;
    request.send(form);
  });
}

export async function uploadAuditMedia(requestId: string, stage: "RECEIVED" | "STITCHED", files: { uri: string; name: string }[], token?: string): Promise<unknown> {
  const currentToken = token ?? useAppStore.getState().token;
  if (!currentToken) throw new Error("Authentication required");

  try {
    return await sendAuditMediaUpload(requestId, stage, files, currentToken);
  } catch (error) {
    if (!/invalid or expired token|authentication required|invalid session/i.test(error instanceof Error ? error.message : "")) throw error;
    const nextToken = await refreshAccessToken();
    if (!nextToken) throw error;
    return sendAuditMediaUpload(requestId, stage, files, nextToken);
  }
}

function sendTailorAvatarUpload(file: { uri: string; name: string }, token: string): Promise<{ avatarUrl?: string }> {
  const form = new FormData();
  form.append("avatar", {
    uri: file.uri,
    name: file.name,
    type: "image/jpeg"
  } as unknown as File);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl}/tailors/me/avatar`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.onload = () => {
      let body: { data?: { avatarUrl?: string }; message?: string } = {};
      try {
        body = JSON.parse(request.responseText || "{}");
      } catch {
        body = {};
      }

      if (request.status < 200 || request.status >= 300) {
        reject(new Error(body.message ?? "Upload failed"));
        return;
      }

      resolve(body.data ?? {});
    };

    request.onerror = () => reject(new Error("Upload failed. Check backend connection."));
    request.ontimeout = () => reject(new Error("Upload timed out. Try a smaller photo."));
    request.timeout = 120000;
    request.send(form);
  });
}

export async function uploadTailorAvatar(file: { uri: string; name: string }, token?: string): Promise<{ avatarUrl?: string }> {
  const currentToken = token ?? useAppStore.getState().token;
  if (!currentToken) throw new Error("Authentication required");

  try {
    return await sendTailorAvatarUpload(file, currentToken);
  } catch (error) {
    if (!/invalid or expired token|authentication required|invalid session/i.test(error instanceof Error ? error.message : "")) throw error;
    const nextToken = await refreshAccessToken();
    if (!nextToken) throw error;
    return sendTailorAvatarUpload(file, nextToken);
  }
}

function sendTailorVerificationMediaUpload(files: { uri: string; name: string }[], token: string): Promise<VerificationMedia[]> {
  const form = new FormData();
  files.forEach((file) => {
    form.append("media", {
      uri: file.uri,
      name: file.name,
      type: "image/jpeg"
    } as unknown as File);
  });

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl}/tailors/me/verification-media`);
    request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.onload = () => {
      let body: { data?: VerificationMedia[]; message?: string } = {};
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
    request.ontimeout = () => reject(new Error("Upload timed out. Try smaller photos."));
    request.timeout = 120000;
    request.send(form);
  });
}

export async function uploadTailorVerificationMedia(files: { uri: string; name: string }[], token?: string): Promise<VerificationMedia[]> {
  const currentToken = token ?? useAppStore.getState().token;
  if (!currentToken) throw new Error("Authentication required");

  try {
    return await sendTailorVerificationMediaUpload(files, currentToken);
  } catch (error) {
    if (!/invalid or expired token|authentication required|invalid session/i.test(error instanceof Error ? error.message : "")) throw error;
    const nextToken = await refreshAccessToken();
    if (!nextToken) throw error;
    return sendTailorVerificationMediaUpload(files, nextToken);
  }
}
