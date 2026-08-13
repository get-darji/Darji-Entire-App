import { Router } from "express";
import { registerDeviceTokenController, sendAdminNotificationController, sendTestNotificationController, unregisterDeviceTokenController, updateNotificationPreferencesController } from "../controllers/notificationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const notificationRoutes = Router();

notificationRoutes.post("/device-token", requireAuth, registerDeviceTokenController);
notificationRoutes.delete("/device-token", requireAuth, unregisterDeviceTokenController);
notificationRoutes.patch("/preferences", requireAuth, updateNotificationPreferencesController);
notificationRoutes.post("/test", requireAuth, sendTestNotificationController);
notificationRoutes.post("/admin-send", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), sendAdminNotificationController);
