export function openLocalBooking() {
  if (typeof window === "undefined") return false;
  window.location.assign("/dashboard?signin=1");
  return true;
}
