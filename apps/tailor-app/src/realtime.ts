import Constants from "expo-constants";
import { io, type Socket } from "socket.io-client";

export type ConnectionStatus = "Connected" | "Reconnecting" | "Offline";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://backend-production-5a7e4.up.railway.app/api";
const socketUrl = apiUrl.replace(/\/api\/?$/, "");

export function createRealtimeSocket(
  token: string,
  onStatus: (status: ConnectionStatus) => void,
  refreshToken?: () => Promise<string | undefined>
) {
  let refreshingAuthentication = false;
  const socket: Socket = io(socketUrl, {
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
