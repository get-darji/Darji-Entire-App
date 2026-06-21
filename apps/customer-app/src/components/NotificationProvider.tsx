import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import type { DarjiApp } from "../notifications/channels";
import { resolveNotificationDestination, type NotificationData, type NotificationDestination } from "../utils/deepLinking";

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

  const handleResponse = useCallback((response: Notifications.NotificationResponse) => {
    const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if (handledResponseRef.current === responseKey) return;
    handledResponseRef.current = responseKey;
    void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    const data = response.notification.request.content.data as NotificationData;
    onNavigate(resolveNotificationDestination(app, data, response.actionIdentifier));
  }, [app, onNavigate]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(setLastNotification);
    const response = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then((initialResponse) => {
      if (initialResponse) handleResponse(initialResponse);
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [handleResponse]);

  const value = useMemo(() => ({ lastNotification }), [lastNotification]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
