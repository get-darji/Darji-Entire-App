export function isLocalBookingHost(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
}

export function openLocalBooking() {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined" || !isLocalBookingHost(window.location.hostname)) return false;
  window.location.assign("/dashboard");
  return true;
}
