import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { consumePendingIncomingAlertAction } from "@darzi/incoming-alert";
import type { DarjiApp } from "../notifications/channels";
import { resolveNotificationDestination, type NotificationData, type NotificationDestination } from "../utils/deepLinking";
import { cancelIncomingRequestNotifications } from "../incoming-request/NotificationService";

type NotificationContextValue = {
  lastNotification?: Notifications.Notification;
};

const NotificationContext = createContext<NotificationContextValue>({});

export function useNotificationContext() {
  return useContext(NotificationContext);
}

export function NotificationProvider({
  app,
  children,
  onNavigate
}: {
  app: DarjiApp;
  children: ReactNode;
  onNavigate: (destination: NotificationDestination) => void;
}) {
  const [lastNotification, setLastNotification] = useState<Notifications.Notification>();
  const handledResponseRef = useRef<string | undefined>(undefined);

  const handleNotificationData = useCallback((responseKey: string, data: NotificationData, actionIdentifier?: string) => {
    if (handledResponseRef.current === responseKey) return;
    handledResponseRef.current = responseKey;
    void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    void cancelIncomingRequestNotifications(data);
    onNavigate(resolveNotificationDestination(app, data, actionIdentifier));
  }, [app, onNavigate]);

  const handleResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as NotificationData;
    handleNotificationData(`${response.notification.request.identifier}:${response.actionIdentifier}`, data, response.actionIdentifier);
  }, [handleNotificationData]);

  const consumeNativeAction = useCallback(async () => {
    const pending = await consumePendingIncomingAlertAction();
    if (!pending) return;
    const data = pending.data as NotificationData;
    const entityId = data.requestId ?? data.taskId ?? data.pickupId ?? data.orderId ?? data.id ?? "current";
    handleNotificationData(`native:${String(entityId)}:${pending.actionIdentifier}`, data, pending.actionIdentifier);
  }, [handleNotificationData]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(setLastNotification);
    const response = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void consumeNativeAction();
    });
    void Notifications.getLastNotificationResponseAsync().then((initialResponse) => {
      if (initialResponse) handleResponse(initialResponse);
    });
    void consumeNativeAction();
    return () => {
      received.remove();
      response.remove();
      appState.remove();
    };
  }, [consumeNativeAction, handleResponse]);

  const value = useMemo(() => ({ lastNotification }), [lastNotification]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
