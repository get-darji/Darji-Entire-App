import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  defaultFestivalTheme,
  festivalThemeState,
  normalizeFestivalTheme,
  type FestivalThemeConfig,
  type FestivalThemeState
} from "../../../../shared/src/festival-theme";

const CACHE_KEY = "darji.festival-theme.v1";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useFestivalTheme(loadTheme: () => Promise<FestivalThemeState>, refreshKey?: unknown) {
  const loadThemeRef = useRef(loadTheme);
  const requestRef = useRef<Promise<void> | null>(null);
  const [config, setConfig] = useState<FestivalThemeConfig>(defaultFestivalTheme);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { loadThemeRef.current = loadTheme; }, [loadTheme]);

  const applyTheme = useCallback((value: unknown, persist = true) => {
    const normalized = normalizeFestivalTheme(value);
    setConfig(normalized);
    setNow(Date.now());
    if (persist) void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(normalized)).catch(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    if (requestRef.current) return requestRef.current;
    const request = loadThemeRef.current()
      .then((value) => applyTheme(value))
      .catch(() => undefined)
      .finally(() => { requestRef.current = null; });
    requestRef.current = request;
    return request;
  }, [applyTheme]);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(CACHE_KEY)
      .then((cached) => {
        if (!cancelled && cached) applyTheme(JSON.parse(cached), false);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) void refresh(); });
    return () => { cancelled = true; };
  }, [applyTheme, refresh, refreshKey]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(Date.now());
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    const remote = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => { clearInterval(clock); clearInterval(remote); };
  }, [refresh]);

  const state = useMemo(() => festivalThemeState(config, new Date(now)), [config, now]);
  return { config, state, refresh, applyRemoteTheme: applyTheme };
}
