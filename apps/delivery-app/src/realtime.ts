import Constants from "expo-constants";
import { io, type Socket } from "socket.io-client";
import { getActiveApiUrl } from "./api";

export type ConnectionStatus = "Connected" | "Reconnecting" | "Offline";

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://darji-entire-app-production.up.railway.app/api";
const devHostApiUrl = Constants.expoConfig?.hostUri
  ? `http://${Constants.expoConfig.hostUri.split(":")[0]}:4000/api`
  : undefined;
const socketUrls = Array.from(new Set([
  configuredApiUrl,
  devHostApiUrl,
  "http://localhost:4000/api",
  "http://10.0.2.2:4000/api",
  "http://127.0.0.1:4000/api"
].filter(Boolean).map((url) => String(url).replace(/\/api\/?$/, ""))));

function activeSocketUrl() {
  const active = getActiveApiUrl().replace(/\/api\/?$/, "");
  return socketUrls.includes(active) ? active : socketUrls[0];
}

export function createRealtimeSocket(
  token: string,
  onStatus: (status: ConnectionStatus) => void,
  refreshToken?: () => Promise<string | undefined>
) {
  let refreshingAuthentication = false;
  const socket: Socket = io(activeSocketUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000
  });

  socket.on("connect", () => onStatus("Connected"));
  socket.io.on("reconnect_attempt", () => onStatus("Reconnecting"));
  socket.io.on("reconnect", () => onStatus("Connected"));
  socket.on("disconnect", () => onStatus("Offline"));
  socket.on("connect_error", async (error) => {
    const authenticationFailed = /auth|expired|invalid session|jwt|token/i.test(error.message);
    if (!authenticationFailed) {
      onStatus("Reconnecting");
      return;
    }

    socket.io.reconnection(false);
    if (refreshingAuthentication) return;
    refreshingAuthentication = true;
    try {
      const nextToken = await refreshToken?.();
      if (!nextToken) {
        socket.disconnect();
        onStatus("Offline");
        return;
      }
      socket.auth = { token: nextToken };
      socket.io.reconnection(true);
      socket.connect();
    } catch {
      socket.disconnect();
      onStatus("Offline");
    } finally {
      refreshingAuthentication = false;
    }
  });

  return socket;
}
