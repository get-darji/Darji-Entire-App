import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type { Role } from "@darzi/shared";
import { DeliveryPartnerModel, DeliveryRequestModel, TailorModel, UserModel, SupportTicketModel, BugReportModel, AccountChangeRequestModel } from "../models.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { getPlatformStatus } from "./platform-status.service.js";
import type { PlatformStatus } from "@darzi/shared";

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
  accuracy?: number;
  heading?: number;
  speed?: number;
};

let io: Server | undefined;

function userRoom(userId: string) {
  return `user:${userId}`;
}

function userRoleRoom(userId: string, role: string) {
  return `user:${userId}:role:${role}`;
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
  const user = await UserModel.findById(payload.sub).select("role activeSessionId activeSessionIds");
  if (!user) throw new Error("Invalid session");
  const activeSessionId = (user.activeSessionIds as Record<string, string> | undefined)?.[payload.role] ?? user.activeSessionId;
  if (!payload.sid || !activeSessionId || payload.sid !== activeSessionId) {
    throw new Error("Your account has been signed in on another device.");
  }
  if (payload.role !== "ADMIN" && payload.role !== "SUPER_ADMIN") {
    const platformStatus = await getPlatformStatus();
    if (platformStatus.maintenanceMode) throw new Error(platformStatus.title);
  }

  const [tailor, partner] = await Promise.all([
    payload.role === "TAILOR" ? TailorModel.findOne({ userId: user.id }).select("_id") : null,
    payload.role === "DELIVERY_PARTNER" ? DeliveryPartnerModel.findOne({ userId: user.id }).select("_id verificationStatus") : null
  ]);

  return {
    id: user.id,
    role: payload.role as Role,
    tailorId: tailor?.id,
    deliveryPartnerId: partner?.id,
    deliveryVerified: partner?.verificationStatus === "VERIFIED"
  };
}

async function joinRooms(socket: Socket, user: SocketUser) {
  await socket.join(userRoom(user.id));
  await socket.join(userRoleRoom(user.id, user.role));
  if (user.role !== "DELIVERY_PARTNER" || user.deliveryVerified) {
    await socket.join(roleRoom(user.role));
    if (user.role === "SUPER_ADMIN") {
      await socket.join(roleRoom("ADMIN"));
    }
  }
  if (user.tailorId) await socket.join(tailorRoom(user.tailorId));
  if (user.deliveryPartnerId && user.deliveryVerified) await socket.join(deliveryPartnerRoom(user.deliveryPartnerId));
}

async function handleDeliveryLocation(socket: Socket, user: SocketUser, payload: DeliveryLocationPayload) {
  if (user.role !== "DELIVERY_PARTNER" || !user.deliveryPartnerId || !user.deliveryVerified) return;
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  if (!payload.requestId || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;

  const locationUpdatedAt = new Date();
  const [request] = await Promise.all([
    DeliveryRequestModel.findOneAndUpdate(
    { _id: payload.requestId, assignedDeliveryPartnerId: user.deliveryPartnerId },
    {
      partnerLocation: {
        latitude,
        longitude,
        heading: payload.heading,
        speed: payload.speed
      },
      lastLocationAt: locationUpdatedAt
    },
    { returnDocument: "after" }
    ),
    DeliveryPartnerModel.findByIdAndUpdate(user.deliveryPartnerId, {
      currentLocation: { type: "Point", coordinates: [longitude, latitude] },
      lastLocationAccuracy: Number.isFinite(Number(payload.accuracy)) ? Number(payload.accuracy) : undefined,
      lastLocationHeading: Number.isFinite(Number(payload.heading)) ? Number(payload.heading) : undefined,
      lastLocationSpeed: Number.isFinite(Number(payload.speed)) ? Number(payload.speed) : undefined,
      lastLocationUpdatedAt: locationUpdatedAt
    })
  ]);
  if (!request) return;

  emitToAdmins("rider:location_updated", {
    partnerId: user.deliveryPartnerId,
    latitude,
    longitude,
    accuracy: Number.isFinite(Number(payload.accuracy)) ? Number(payload.accuracy) : null,
    heading: Number.isFinite(Number(payload.heading)) ? Number(payload.heading) : null,
    lastLocationUpdatedAt: locationUpdatedAt
  });

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

export const onlineUsers = new Map<string, { lastSeen: Date; sockets: Set<string> }>();
export const activeViewers = new Map<string, { adminId: string; adminName: string }>();

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
    
    // User Name lookup for socket broadcasts
    let userName = "User";
    try {
      const dbUser = await UserModel.findById(user.id).select("name");
      if (dbUser?.name) userName = dbUser.name;
    } catch {}

    // Track online user
    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, { lastSeen: new Date(), sockets: new Set() });
      io?.to(roleRoom("ADMIN")).emit("user:status_changed", { userId: user.id, online: true });
    }
    onlineUsers.get(user.id)!.sockets.add(socket.id);

    socket.emit("connection:status", { status: "connected", role: user.role });

    // Sync state for new admin connection
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      socket.emit("user:online_list", Array.from(onlineUsers.keys()));
      socket.emit(
        "support:active_viewers",
        Array.from(activeViewers.entries()).map(([key, val]) => ({ key, ...val }))
      );
    }

    socket.on("delivery:join_tracking", async ({ requestId }: { requestId?: string }) => {
      if (requestId) await socket.join(trackingRoom(requestId));
    });
    socket.on("delivery:leave_tracking", async ({ requestId }: { requestId?: string }) => {
      if (requestId) await socket.leave(trackingRoom(requestId));
    });
    socket.on("delivery:location_update", (payload: DeliveryLocationPayload) => {
      void handleDeliveryLocation(socket, user, payload);
    });

    // Support Viewing state tracker
    socket.on("support:viewing", (payload: { type: string; id: string | null }) => {
      const viewKey = `${payload.type}:${payload.id}`;
      // Clean up previous viewing for this admin
      for (const [key, val] of activeViewers.entries()) {
        if (val.adminId === user.id) {
          activeViewers.delete(key);
          const [oldType, oldId] = key.split(":");
          io?.to(roleRoom("ADMIN")).emit("support:viewer_changed", {
            type: oldType,
            id: oldId,
            adminId: user.id,
            isViewing: false
          });
        }
      }

      if (payload.id) {
        activeViewers.set(viewKey, { adminId: user.id, adminName: userName });
        io?.to(roleRoom("ADMIN")).emit("support:viewer_changed", {
          type: payload.type,
          id: payload.id,
          adminId: user.id,
          adminName: userName,
          isViewing: true
        });
      }
    });

    // Typing Event propagator
    socket.on("typing:status", (payload: { type: string; id: string; recipientId: string; recipientRole?: string; isTyping: boolean }) => {
      if (payload.recipientId === "admin") {
        io?.to(roleRoom("ADMIN")).emit("typing:status", {
          type: payload.type,
          id: payload.id,
          recipientId: "admin",
          isTyping: payload.isTyping,
          senderId: user.id,
          senderName: userName
        });
      } else if (payload.recipientRole) {
        io?.to(userRoleRoom(payload.recipientId, payload.recipientRole)).emit("typing:status", {
          type: payload.type,
          id: payload.id,
          recipientId: payload.recipientId,
          isTyping: payload.isTyping,
          senderId: user.id,
          senderName: userName
        });
      }
    });

    // Mark messages as read event
    socket.on("support:mark_read", async (payload: { type: "ticket" | "bug" | "request"; id: string; recipientId: string }) => {
      try {
        const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
        const supportScope = isAdmin ? { _id: payload.id } : { _id: payload.id, userId: user.id, userRole: user.role };
        let recipientRole: string | undefined;
        if (payload.type === "ticket") {
          const ticket = await SupportTicketModel.findOneAndUpdate(supportScope, {
            $set: { "messages.$[].read": true }
          });
          recipientRole = ticket?.userRole;
        } else if (payload.type === "bug") {
          const bug = await BugReportModel.findOneAndUpdate(supportScope, {
            $set: { "messages.$[].read": true }
          });
          recipientRole = bug?.userRole;
        } else if (payload.type === "request") {
          const request = isAdmin
            ? await AccountChangeRequestModel.findByIdAndUpdate(payload.id, { $set: { "messages.$[].read": true } }, { returnDocument: "after" })
            : user.role === "TAILOR" || user.role === "DELIVERY_PARTNER"
              ? await AccountChangeRequestModel.findOneAndUpdate(
                  { _id: payload.id, userId: user.id, userRole: user.role },
                  { $set: { "messages.$[].read": true } },
                  { returnDocument: "after" }
                )
              : null;
          recipientRole = request?.userRole;
        }

        // Notify client and admins of read status
        if (payload.recipientId !== "admin" && recipientRole) {
          io?.to(userRoleRoom(payload.recipientId, recipientRole)).emit("support:read_receipt", { type: payload.type, id: payload.id });
        }
        io?.to(roleRoom("ADMIN")).emit("support:read_receipt", { type: payload.type, id: payload.id });
      } catch (err) {
        console.error("Error in support:mark_read event:", err);
      }
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      // Clear socket from online tracking
      const tracking = onlineUsers.get(user.id);
      if (tracking) {
        tracking.sockets.delete(socket.id);
        if (tracking.sockets.size === 0) {
          tracking.lastSeen = new Date();
          onlineUsers.delete(user.id);
          io?.to(roleRoom("ADMIN")).emit("user:status_changed", {
            userId: user.id,
            online: false,
            lastSeen: tracking.lastSeen
          });
        }
      }

      // Clear viewers
      for (const [key, val] of activeViewers.entries()) {
        if (val.adminId === user.id) {
          activeViewers.delete(key);
          const [oldType, oldId] = key.split(":");
          io?.to(roleRoom("ADMIN")).emit("support:viewer_changed", {
            type: oldType,
            id: oldId,
            adminId: user.id,
            isViewing: false
          });
        }
      }
    });
  });

  return io;
}

export function emitToCustomer(userId: string, event: string, payload: unknown) {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function emitToUserRole(userId: string, role: string, event: string, payload: unknown) {
  io?.to(userRoleRoom(userId, role)).emit(event, payload);
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

export function emitToAdmins(event: string, payload: unknown) {
  io?.to(roleRoom("ADMIN")).emit(event, payload);
}

export function publishPlatformStatus(status: PlatformStatus) {
  io?.emit("platform:status_changed", status);
  if (!status.maintenanceMode || !io) return;
  for (const socket of io.sockets.sockets.values()) {
    const user = socket.data.user as SocketUser | undefined;
    if (user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      socket.disconnect(true);
    }
  }
}
