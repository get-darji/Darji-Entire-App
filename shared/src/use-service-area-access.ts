import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { ServiceAreaCheck } from "./service-area";

export type DeviceCoordinates = { latitude: number; longitude: number; areaLabel?: string };

export function useServiceAreaAccess(options: {
  enabled: boolean;
  getCoordinates: () => Promise<DeviceCoordinates>;
  check: (coordinates: DeviceCoordinates) => Promise<ServiceAreaCheck>;
}) {
  const { enabled, getCoordinates, check } = options;
  const [status, setStatus] = useState<ServiceAreaCheck | null>(null);
  const [coordinates, setCoordinates] = useState<DeviceCoordinates | null>(null);
  const [checking, setChecking] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const mountedRef = useRef(true);

  const refresh = useCallback(async (manual = false) => {
    if (!enabled) {
      setChecking(false);
      return;
    }
    manual ? setRefreshing(true) : setChecking(true);
    setError(undefined);
    try {
      const nextCoordinates = await getCoordinates();
      const nextStatus = await check(nextCoordinates);
      if (!mountedRef.current) return;
      setCoordinates(nextCoordinates);
      setStatus(nextStatus);
    } catch (caught) {
      if (!mountedRef.current) return;
      setError(caught instanceof Error ? caught.message : "Unable to verify your location");
      setStatus(null);
    } finally {
      if (mountedRef.current) {
        setChecking(false);
        setRefreshing(false);
      }
    }
  }, [check, enabled, getCoordinates]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const timer = enabled ? setInterval(() => void refresh(), 5 * 60 * 1000) : undefined;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refresh();
    });
    return () => {
      mountedRef.current = false;
      if (timer) clearInterval(timer);
      subscription.remove();
    };
  }, [enabled, refresh]);

  return { status, coordinates, checking, refreshing, error, refresh };
}
