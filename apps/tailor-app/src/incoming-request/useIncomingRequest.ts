import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Vibration } from "react-native";
import { startLoopingAppSound, stopAppSound } from "../services/soundService";

const DEFAULT_SECONDS = 30;

function secondsUntil(expiresAt?: string) {
  if (!expiresAt) return DEFAULT_SECONDS;
  const parsed = new Date(expiresAt).getTime();
  if (Number.isNaN(parsed)) return DEFAULT_SECONDS;
  return Math.max(0, Math.ceil((parsed - Date.now()) / 1000));
}

export function useIncomingRequest({
  active,
  expiresAt,
  soundEnabled = true,
  vibrationEnabled = true,
  onTimeout
}: {
  active: boolean;
  expiresAt?: string;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  onTimeout: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(expiresAt));
  const handledTimeoutRef = useRef(false);
  const totalSeconds = useMemo(() => Math.max(1, secondsUntil(expiresAt)), [expiresAt]);

  useEffect(() => {
    if (!active) {
      stopAppSound("request");
      Vibration.cancel();
      return undefined;
    }

    handledTimeoutRef.current = false;
    setSecondsLeft(secondsUntil(expiresAt));
    void startLoopingAppSound("request", soundEnabled);
    if (Platform.OS !== "web" && vibrationEnabled) {
      Vibration.vibrate([0, 600, 250, 600], true);
    }

    const timer = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
      stopAppSound("request");
      Vibration.cancel();
    };
  }, [active, expiresAt, soundEnabled, vibrationEnabled]);

  useEffect(() => {
    if (!active || secondsLeft > 0 || handledTimeoutRef.current) return;
    handledTimeoutRef.current = true;
    stopAppSound("request");
    Vibration.cancel();
    onTimeout();
  }, [active, onTimeout, secondsLeft]);

  return {
    secondsLeft,
    progress: Math.max(0, Math.min(1, secondsLeft / totalSeconds)),
    stopAlerts: () => {
      stopAppSound("request");
      Vibration.cancel();
    }
  };
}
