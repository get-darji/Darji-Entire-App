import { Router } from "express";
import { meController, refreshController, requestOtpController, verifyOtpController } from "../controllers/auth.controller.js";
import {
  analyticsController,
  assignOrderController,
  catalogController,
  createAddressController,
  createCouponController,
  createOrderController,
  createReviewController,
  createSupportTicketController,
  getOrderController,
  listAddressesController,
  listCouponsController,
  listDeliveryPartnersController,
  listNotificationsController,
  listOrdersController,
  listSupportTicketsController,
  listTailorsController,
  paymentsController,
  settingsController,
  transactionsController,
  updateDeliveryAvailabilityController,
  updateOrderStatusController,
  updateSettingController,
  updateTailorAvailabilityController,
  walletController
} from "../controllers/resource.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const router = Router();

router.get("/health", (_req, res) => res.json({ data: { ok: true, service: "darzi-backend" } }));
router.post("/auth/request-otp", requestOtpController);
router.post("/auth/verify-otp", verifyOtpController);
router.post("/auth/refresh", refreshController);
router.get("/auth/me", requireAuth, meController);

router.get("/catalog", catalogController);

router.get("/addresses", requireAuth, listAddressesController);
router.post("/addresses", requireAuth, createAddressController);

router.get("/orders", requireAuth, listOrdersController);
router.post("/orders", requireAuth, requireRole("CUSTOMER", "ADMIN"), createOrderController);
router.get("/orders/:id", requireAuth, getOrderController);
router.patch("/orders/:id/status", requireAuth, requireRole("TAILOR", "DELIVERY_PARTNER", "ADMIN"), updateOrderStatusController);
router.patch("/orders/:id/assign", requireAuth, requireRole("ADMIN"), assignOrderController);

router.get("/tailors", requireAuth, listTailorsController);
router.patch("/tailors/me/availability", requireAuth, requireRole("TAILOR"), updateTailorAvailabilityController);

router.get("/delivery-partners", requireAuth, listDeliveryPartnersController);
router.patch("/delivery-partners/me/availability", requireAuth, requireRole("DELIVERY_PARTNER"), updateDeliveryAvailabilityController);

router.get("/payments", requireAuth, paymentsController);
router.get("/notifications", requireAuth, listNotificationsController);
router.post("/reviews", requireAuth, createReviewController);
router.get("/wallet", requireAuth, walletController);
router.get("/transactions", requireAuth, transactionsController);
router.get("/support", requireAuth, listSupportTicketsController);
router.post("/support", requireAuth, createSupportTicketController);

router.get("/coupons", requireAuth, listCouponsController);
router.post("/coupons", requireAuth, requireRole("ADMIN"), createCouponController);

router.get("/analytics", requireAuth, requireRole("ADMIN"), analyticsController);
router.get("/settings", requireAuth, requireRole("ADMIN"), settingsController);
router.put("/settings/:key", requireAuth, requireRole("ADMIN"), updateSettingController);
