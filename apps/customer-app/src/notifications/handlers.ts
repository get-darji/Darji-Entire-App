import * as Notifications from "./expoNotifications";

export function configureForegroundNotificationHandler(options?: { shouldShow?: boolean }) {
  const shouldShow = options?.shouldShow ?? true;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      const show = shouldShow && data?.darjiRichNotification !== "true";
      return {
        shouldShowAlert: show,
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: show,
        priority: show ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.MIN
      };
    }
  });
}
