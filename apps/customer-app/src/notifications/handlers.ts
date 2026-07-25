import * as Notifications from "expo-notifications";

export function configureForegroundNotificationHandler(options?: { shouldShow?: boolean }) {
  const shouldShow = options?.shouldShow ?? true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: shouldShow,
      shouldShowBanner: shouldShow,
      shouldShowList: shouldShow,
      shouldPlaySound: shouldShow,
      shouldSetBadge: shouldShow,
      priority: shouldShow ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.MIN
    })
  });
}
