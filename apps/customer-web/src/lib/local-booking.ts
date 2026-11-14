export function openLocalBooking() {
  if (typeof window === "undefined") return false;
  window.location.assign("/dashboard");
  return true;
}
