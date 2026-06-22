import admin from "firebase-admin";
import { env } from "../env.js";
import { UserModel } from "../models.js";

export type PushPayload = {
  title: string;
  body: string;
  subtitle?: string;
  imageUrl?: string;
  data?: Record<string, string | number | boolean | undefined>;
  actions?: string[];
  channelId?: string;
  categoryId?: string;
  sound?: string;
  targetApps?: string[];
};

let firebaseReady = false;

const channelAppMap = {
  "customer-orders-v2": "customer",
  "customer-payments-v2": "customer",
  "customer-offers-v2": "customer",
  "tailor-new-requests-v2": "tailor",
  "tailor-pickup-updates-v2": "tailor",
  "delivery-pickup-assigned-v2": "delivery",
  "delivery-updates-v2": "delivery"
} as const;

function normalizeData(data?: PushPayload["data"]) {
  return Object.fromEntries(Object.entries(data ?? {}).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
}

function normalizeAppName(app?: string) {
  const value = app?.trim().toLowerCase();
  if (!value) return undefined;
  if (value.includes("customer")) return "customer";
  if (value.includes("tailor")) return "tailor";
  if (value.includes("delivery")) return "delivery";
  return value;
}

function resolveTargetApps(payload: PushPayload) {
  const explicitApps = [...new Set((payload.targetApps ?? []).map(normalizeAppName).filter(Boolean))];
  if (explicitApps.length) return explicitApps;
  const channelApp = payload.channelId ? channelAppMap[payload.channelId as keyof typeof channelAppMap] : undefined;
  return channelApp ? [channelApp] : [];
}

function firebaseCredential() {
  if (env.FCM_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON.replace(/\\n/g, "\n")));
  }
  if (env.FCM_PROJECT_ID && env.FCM_CLIENT_EMAIL && env.FCM_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: env.FCM_PROJECT_ID,
      clientEmail: env.FCM_CLIENT_EMAIL,
      privateKey: env.FCM_PRIVATE_KEY.replace(/\\n/g, "\n")
    });
  }
  return undefined;
}

export function initFirebaseAdmin() {
  if (firebaseReady || admin.apps.length) {
    firebaseReady = true;
    return;
  }

  const credential = firebaseCredential();
  if (!credential) return;

  admin.initializeApp({ credential, projectId: env.FCM_PROJECT_ID });
  firebaseReady = true;
}

export async function saveFcmToken(userId: string, input: { token: string; platform?: string; app?: string }) {
  const token = input.token.trim();
  if (!token) return null;
  const app = normalizeAppName(input.app) ?? input.app?.trim();
  await UserModel.updateOne({ _id: userId }, { $pull: { fcmTokens: { token } } });
  return UserModel.findByIdAndUpdate(
    userId,
    {
      fcmToken: token,
      $push: {
        fcmTokens: {
          token,
          platform: input.platform,
          app,
          updatedAt: new Date()
        }
      }
    },
    { returnDocument: "after" }
  );
}

export async function saveDeviceTokens(
  userId: string,
  input: { fcmToken?: string; expoPushToken?: string; platform?: string; app?: string }
) {
  const updates: Promise<unknown>[] = [];
  const fcmToken = input.fcmToken?.trim();
  const expoPushToken = input.expoPushToken?.trim();
  const app = normalizeAppName(input.app) ?? input.app?.trim();

  if (fcmToken) updates.push(saveFcmToken(userId, { token: fcmToken, platform: input.platform, app }));
  if (expoPushToken) {
    updates.push(
      UserModel.updateOne({ _id: userId }, { $pull: { expoPushTokens: { token: expoPushToken } } }).then(() =>
        UserModel.findByIdAndUpdate(userId, {
          $push: {
            expoPushTokens: {
              token: expoPushToken,
              platform: input.platform,
              app,
              updatedAt: new Date()
            }
          }
        })
      )
    );
  }
  await Promise.all(updates);
}

async function sendExpoPushNotifications(tokens: string[], payload: PushPayload, data: Record<string, string>) {
  if (!tokens.length) return { successCount: 0, failureCount: 0 };
  const messages = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    subtitle: payload.subtitle,
    data,
    sound: payload.sound ?? "ding.mp3",
    priority: "high",
    channelId: payload.channelId ?? "darji-alerts-v2",
    categoryId: payload.categoryId ?? "DARJI_ORDER",
    badge: 1,
    mutableContent: Boolean(payload.imageUrl),
    richContent: payload.imageUrl ? { image: payload.imageUrl } : undefined
  }));
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(messages)
  });
  if (!response.ok) throw new Error(`Expo push service returned ${response.status}`);
  const result = await response.json() as { data?: Array<{ status?: string; details?: { error?: string } }> };
  const tickets = result.data ?? [];
  const invalidTokens = tickets.flatMap((ticket, index) => ticket.details?.error === "DeviceNotRegistered" ? [tokens[index]] : []);
  if (invalidTokens.length) {
    await UserModel.updateMany({}, { $pull: { expoPushTokens: { token: { $in: invalidTokens } } } });
  }
  const successCount = tickets.filter((ticket) => ticket.status === "ok").length;
  return { successCount, failureCount: tickets.length - successCount };
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  initFirebaseAdmin();
  if (!firebaseReady) {
    console.warn("[FCM] Firebase Admin is not configured; using Expo push fallback only");
  }
  if (!userIds.length) return;
  const targetApps = resolveTargetApps(payload);
  const shouldFilterByApp = targetApps.length > 0;
  const matchesTargetApp = (app?: string) => !shouldFilterByApp || targetApps.includes(normalizeAppName(app) ?? "");

  const users = await UserModel.find({ _id: { $in: userIds } }).select("fcmToken fcmTokens expoPushTokens");
  const tokens = [
    ...new Set(
      users.flatMap((user) => {
        const json = user.toJSON() as { fcmToken?: string; fcmTokens?: Array<{ token?: string; app?: string }> };
        const matchingFcmTokens = (json.fcmTokens ?? []).filter((item) => item.token && matchesTargetApp(item.app)).map((item) => item.token!);
        const legacyToken = !shouldFilterByApp && json.fcmToken ? [json.fcmToken] : [];
        return [...legacyToken, ...matchingFcmTokens];
      })
    )
  ];
  const expoTokens = [
    ...new Set(users.flatMap((user) => {
      const json = user.toJSON() as {
        fcmToken?: string;
        fcmTokens?: Array<{ token?: string; app?: string }>;
        expoPushTokens?: Array<{ token?: string; platform?: string; app?: string }>;
      };
      const hasUsableFcm = firebaseReady && Boolean(
        (shouldFilterByApp ? false : json.fcmToken) || json.fcmTokens?.some((item) => item.token && matchesTargetApp(item.app))
      );
      return (json.expoPushTokens ?? [])
        .filter((item) => item.token && matchesTargetApp(item.app) && (item.platform !== "android" || !hasUsableFcm))
        .map((item) => item.token!);
    }))
  ];
  if (!tokens.length && !expoTokens.length) {
    const appLabel = targetApps.length ? ` app=${targetApps.join(",")}` : "";
    console.warn(`[Push] No registered device tokens for ${userIds.length} recipient(s)${appLabel}`);
    return;
  }

  try {
    const data: Record<string, string> = {
      ...normalizeData(payload.data),
      subtitle: payload.subtitle ?? "",
      actions: (payload.actions ?? []).join(","),
      categoryId: payload.categoryId ?? "DARZI_ORDER",
      categoryIdentifier: payload.categoryId ?? "DARZI_ORDER",
      brand: "Darzi"
    };
    const tag = data.taskId || data.requestId || data.orderId || "darzi-order";
    const result = tokens.length && firebaseReady ? await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl
      },
      data,
      android: {
        priority: "high",
        notification: {
          channelId: payload.channelId ?? "darji-alerts-v2",
          color: "#F98A04",
          sound: payload.sound ?? "ding.mp3",
          imageUrl: payload.imageUrl,
          priority: "max",
          visibility: "public",
          notificationCount: 1,
          tag
        }
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            sound: payload.sound ?? "ding.mp3",
            badge: 1,
            category: payload.categoryId ?? "DARJI_ORDER",
            "mutable-content": 1
          }
        },
        fcmOptions: {
          imageUrl: payload.imageUrl
        }
      }
    }) : { responses: [], successCount: 0, failureCount: 0 };

    const invalidTokens = result.responses.flatMap((response, index) => {
      const code = response.error?.code ?? "";
      return /registration-token-not-registered|invalid-registration-token|invalid-argument/i.test(code) ? [tokens[index]] : [];
    });
    if (invalidTokens.length) {
      await Promise.all([
        UserModel.updateMany({}, { $pull: { fcmTokens: { token: { $in: invalidTokens } } } }),
        UserModel.updateMany({ fcmToken: { $in: invalidTokens } }, { $unset: { fcmToken: "" } })
      ]);
    }
    const expoResult = await sendExpoPushNotifications(expoTokens, payload, data);
    console.log(`[Push] fcmSent=${result.successCount} fcmFailed=${result.failureCount} expoSent=${expoResult.successCount} expoFailed=${expoResult.failureCount} title="${payload.title}"`);
  } catch (error) {
    console.error("[FCM] Push delivery failed", error);
  }
}

export async function sendPushToRole(role: string, payload: PushPayload) {
  const users = await UserModel.find({ role: role as never }).select("_id");
  await sendPushToUsers(users.map((user) => String(user._id)), payload);
}
