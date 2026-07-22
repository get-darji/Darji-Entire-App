import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { defaultPlatformStatus, normalizePlatformStatus, type PlatformStatus } from "./platform-status";

const PLATFORM_STATUS_POLL_INTERVAL_MS = 5 * 60 * 1000;

export function usePlatformStatus(loadStatus: () => Promise<PlatformStatus>, refreshKey?: unknown) {
  const loadStatusRef = useRef(loadStatus);
  const requestRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<PlatformStatus>(defaultPlatformStatus);
  const [checking, setChecking] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadStatusRef.current = loadStatus;
  }, [loadStatus]);

  const refresh = useCallback(async (manual = false) => {
    if (requestRef.current) return requestRef.current;
    if (manual) setRefreshing(true);
    const request = (async () => {
      try {
        const nextStatus = await loadStatusRef.current();
        setStatus(normalizePlatformStatus(nextStatus));
        setError(undefined);
      } catch (loadError) {
        // Fail open on first launch, but preserve an already received
        // maintenance state when a later refresh temporarily loses network.
        setError(loadError instanceof Error ? loadError.message : "Could not check platform status");
      } finally {
        setChecking(false);
        setRefreshing(false);
        requestRef.current = null;
      }
    })();
    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), PLATFORM_STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { status, checking, refreshing, error, refresh };
}
