const NETWORK_PATTERN = /backend connection|cannot reach|failed to fetch|fetch failed|network request failed|network error|socket hang up|econn|enotfound|load failed/i;
const TIMEOUT_PATTERN = /timed out|timeout|request has been canceled|request was cancelled/i;
const SERVER_PATTERN = /internal server error|bad gateway|service unavailable|gateway timeout|application not found|railway/i;

export function userFacingMessage(message: unknown, fallback = "Something went wrong. Please try again.") {
  const text = typeof message === "string" ? message.trim() : message instanceof Error ? message.message.trim() : "";
  if (!text) return fallback;
  if (TIMEOUT_PATTERN.test(text)) return "This is taking longer than expected. Check your internet connection and try again.";
  if (NETWORK_PATTERN.test(text)) return "We are having trouble connecting right now. Check your internet connection and try again.";
  if (SERVER_PATTERN.test(text) || /\b(?:status|http)\s*5\d\d\b/i.test(text)) {
    return "We are having some trouble right now. Please try again in a moment.";
  }
  if (/unexpected token|json|cast to|validation failed|mongo|mongoose|prisma|stack trace|undefined is not|null is not/i.test(text)) {
    return fallback;
  }
  return text;
}
