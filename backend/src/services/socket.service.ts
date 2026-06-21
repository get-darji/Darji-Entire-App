import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type { Role } from "@darzi/shared";
import { DeliveryPartnerModel, DeliveryRequestModel, TailorModel, UserModel } from "../models.js";
import { verifyAccessToken } from "../utils/tokens.js";

type SocketUser = {
  id: string;
  role: Role;
  tailorId?: string;
  deliveryPartnerId?: string;
  deliveryVerified?: boolean;
};

type DeliveryLocationPayload = {
  requestId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
};

let io: Server | undefined;

function userRoom(userId: string) {
  return `user:${userId}`;
}

function roleRoom(role: string) {
  return `role:${role}`;
}

function tailorRoom(tailorId: string) {
  return `tailor:${tailorId}`;
}

function deliveryPartnerRoom(partnerId: string) {
  return `delivery-partner:${partnerId}`;
}

function trackingRoom(requestId: string) {
  return `delivery-request:${requestId}:tracking`;
}

async function authenticateSocket(socket: Socket): Promise<SocketUser> {
  const rawToken = socket.handshake.auth?.token || socket.handshake.headers.authorization?.toString().replace(/^Bearer\s+/i, "");
  if (!rawToken) throw new Error("Authentication required");

  const payload = verifyAccessToken(String(rawToken));
  const user = await UserModel.findById(payload.sub).select("role");
  if (!user) throw new Error("Invalid session");

  const [tailor, partner] = await Promise.all([
    user.role === "TAILOR" ? TailorModel.findOne({ userId: user.id }).select("_id") : null,
    user.role === "DELIVERY_PARTNER" ? DeliveryPartnerModel.findOne({ userId: user.id }).select("_id verificationStatus") : null
  ]);

  return {
    id: user.id,
    role: user.role as Role,
    tailorId: tailor?.id,
    deliveryPartnerId: partner?.id,
    deliveryVerified: partner?.verificationStatus === "VERIFIED"
  };
}

async function joinRooms(socket: Socket, user: SocketUser) {
  await socket.join(userRoom(user.id));
  if (user.role !== "DELIVERY_PARTNER" || user.deliveryVerified) {
    await socket.join(roleRoom(user.role));
  }
  if (user.tailorId) await socket.join(tailorRoom(user.tailorId));
  if (user.deliveryPartnerId && user.deliveryVerified) await socket.join(deliveryPartnerRoom(user.deliveryPartnerId));
}

async function handleDeliveryLocation(socket: Socket, user: SocketUser, payload: DeliveryLocationPayload) {
  if (user.role !== "DELIVERY_PARTNER" || !user.deliveryPartnerId || !user.deliveryVerified) return;
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  if (!payload.requestId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const request = await DeliveryRequestModel.findOneAndUpdate(
    { _id: payload.requestId, assignedDeliveryPartnerId: user.deliveryPartnerId },
    {
      partnerLocation: {
        latitude,
        longitude,
        heading: payload.heading,
        speed: payload.speed
      },
      lastLocationAt: new Date()
    },
    { returnDocument: "after" }
  );
  if (!request) return;

  io?.to(trackingRoom(request.id)).emit("delivery:location_updated", {
    requestId: request.id,
    location: request.partnerLocation,
    updatedAt: request.lastLocationAt
  });
  io?.to(userRoom(request.customerId)).emit("delivery:location_updated", {
    requestId: request.id,
    location: request.partnerLocation,
    updatedAt: request.lastLocationAt
  });
}

export function setupSocketServer(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: true, credentials: true },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000
  });

  io.use(async (socket, next) => {
    try {
      const user = await authenticateSocket(socket);
      socket.data.user = user;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Socket authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as SocketUser;
    await joinRooms(socket, user);
    socket.emit("connection:status", { status: "connected", role: user.role });

    socket.on("delivery:join_tracking", async ({ requestId }: { requestId?: string }) => {
      if (requestId) await socket.join(trackingRoom(requestId));
    });
    socket.on("delivery:leave_tracking", async ({ requestId }: { requestId?: string }) => {
      if (requestId) await socket.leave(trackingRoom(requestId));
    });
    socket.on("delivery:location_update", (payload: DeliveryLocationPayload) => {
      void handleDeliveryLocation(socket, user, payload);
    });
  });

  return io;
}

export function emitToCustomer(userId: string, event: string, payload: unknown) {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function emitToTailors(event: string, payload: unknown) {
  io?.to(roleRoom("TAILOR")).emit(event, payload);
}

export function emitToTailor(tailorId: string, event: string, payload: unknown) {
  io?.to(tailorRoom(tailorId)).emit(event, payload);
}

export function emitToDeliveryPartners(event: string, payload: unknown) {
  io?.to(roleRoom("DELIVERY_PARTNER")).emit(event, payload);
}

export function emitToDeliveryPartner(partnerId: string, event: string, payload: unknown) {
  io?.to(deliveryPartnerRoom(partnerId)).emit(event, payload);
}
