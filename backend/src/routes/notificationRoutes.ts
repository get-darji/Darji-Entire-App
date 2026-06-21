import { Router } from "express";
import { registerDeviceTokenController, sendTestNotificationController } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationRoutes = Router();

notificationRoutes.post("/device-token", requireAuth, registerDeviceTokenController);
notificationRoutes.post("/test", requireAuth, sendTestNotificationController);
