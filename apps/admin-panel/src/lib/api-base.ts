"use client";

const RETIRED_API_URL = "https://backend-production-5a7e4.up.railway.app/api";
const LIVE_API_URL = "https://darji-entire-app-production.up.railway.app/api";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL === RETIRED_API_URL
  ? LIVE_API_URL
  : process.env.NEXT_PUBLIC_API_URL ?? LIVE_API_URL;

const apiUrls = Array.from(new Set([
  configuredApiUrl,
  "http://localhost:4000/api",
  "http://127.0.0.1:4000/api",
  "http://192.168.1.2:4000/api"
].map((url) => url.replace(/\/$/, ""))));

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
