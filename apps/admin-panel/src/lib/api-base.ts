"use client";

const RETIRED_API_URL = "https://backend-production-5a7e4.up.railway.app/api";
const LIVE_API_URL = "https://darji-entire-app-production.up.railway.app/api";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL === RETIRED_API_URL
  ? LIVE_API_URL
  : process.env.NEXT_PUBLIC_API_URL ?? LIVE_API_URL;

const localDevApiUrl = process.env.NODE_ENV === "development" && typeof window !== "undefined"
  ? `http://${window.location.hostname}:4000/api`
  : undefined;
const apiUrls = [localDevApiUrl ?? configuredApiUrl.replace(/\/$/, "")];

let activeApiUrl = apiUrls[0];

export function getActiveApiUrl() {
  return activeApiUrl;
}

export function getSocketUrl() {
  return activeApiUrl.replace(/\/api\/?$/, "");
}

export function markApiUrlReachable(url: string) {
  activeApiUrl = url.replace(/\/$/, "");
}

export function nextApiUrlAfter(currentUrl?: string) {
  const normalizedCurrent = currentUrl?.replace(/\/$/, "") ?? activeApiUrl;
  const currentIndex = apiUrls.indexOf(normalizedCurrent);
  return apiUrls[currentIndex + 1];
}

export function shouldTryApiFallback(status?: number) {
  if (!status) return true;
  return status === 404 || status >= 500;
}
