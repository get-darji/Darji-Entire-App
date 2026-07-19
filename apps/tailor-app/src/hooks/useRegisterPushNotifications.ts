import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import { api } from "../api";
import { configureNotificationActions } from "../notifications/actions";
import { configureNotificationChannels, type DarjiApp } from "../notifications/channels";

type RegistrationState = "idle" | "registering" | "registered" | "denied" | "error";

type Options = {
  authToken?: string;
  app: DarjiApp;
  userId?: string;
};

const completedRegistrations = new Set<string>();
const pendingRegistrations = new Map<string, Promise<unknown>>();

function easProjectId() {
  return (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;
}

export function useRegisterPushNotifications({ authToken, app, userId }: Options) {
  const [status, setStatus] = useState<RegistrationState>("idle");

  useEffect(() => {
    if (!authToken || Platform.OS === "web") {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    async function getNativePushToken() {
      try {
        const firebaseToken = await messaging().getToken();
        if (firebaseToken) return firebaseToken;
      } catch (error) {
        console.warn("Firebase push token registration failed", error);
      }

      try {
        const nativeToken = await Notifications.getDevicePushTokenAsync();
        return String(nativeToken.data);
      } catch (error) {
        console.warn("Native push token registration failed", error);
      }
      return undefined;
    }

    async function saveTokens() {
      let expoPushToken: string | undefined;
      try {
        const projectId = easProjectId();
        if (projectId) expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (error) {
        console.warn("Expo push token registration failed", error);
      }

      const fcmToken = await getNativePushToken();
      if (!expoPushToken && !fcmToken) throw new Error("No push token could be generated");
      const registrationKey = `${app}:${userId ?? "unknown"}:${expoPushToken ?? ""}:${fcmToken ?? ""}`;
      const storageKey = `darji.push-registration.v2.${app}.${userId ?? "unknown"}`;
      if ((await AsyncStorage.getItem(storageKey)) === registrationKey) return;
      if (completedRegistrations.has(registrationKey)) return;
      const existingRegistration = pendingRegistrations.get(registrationKey);
      if (existingRegistration) {
        await existingRegistration;
        return;
      }

      const registration = api(
        "/notifications/device-token",
        {
          method: "POST",
          body: JSON.stringify({
            expoPushToken,
            fcmToken,
            platform: Platform.OS,
            app: Constants.expoConfig?.slug ?? app
          })
        },
        authToken
      );
      pendingRegistrations.set(registrationKey, registration);
      try {
        await registration;
        completedRegistrations.add(registrationKey);
        await AsyncStorage.setItem(storageKey, registrationKey);
      } finally {
        pendingRegistrations.delete(registrationKey);
      }
    }

    async function register() {
      try {
        setStatus("registering");
        await configureNotificationChannels(app);
        await configureNotificationActions(app);

        const existing = await Notifications.getPermissionsAsync();
        const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
        if (!permission.granted) {
          if (!cancelled) setStatus("denied");
          return;
        }
        await messaging().requestPermission().catch(() => undefined);

        await saveTokens();
        if (cancelled) return;
        if (!cancelled) setStatus("registered");
      } catch (error) {
        console.warn("Push notification registration failed", error);
        if (!cancelled) setStatus("error");
      }
    }

    void register();
    return () => {
      cancelled = true;
    };
  }, [app, authToken, userId]);

  return status;
}
