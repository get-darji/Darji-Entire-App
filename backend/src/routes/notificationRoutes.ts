import { Router } from "express";
import { registerDeviceTokenController, sendTestNotificationController, updateNotificationPreferencesController } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationRoutes = Router();

notificationRoutes.post("/device-token", requireAuth, registerDeviceTokenController);
notificationRoutes.patch("/preferences", requireAuth, updateNotificationPreferencesController);
notificationRoutes.post("/test", requireAuth, sendTestNotificationController);
