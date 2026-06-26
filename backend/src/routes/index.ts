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
  updateSupportTicketController,
  createBugReportController,
  listBugReportsController,
  updateBugReportController,
  createAccountChangeRequestController,
  listAccountChangeRequestsController,
  approveAccountChangeRequestController,
  rejectAccountChangeRequestController,
  inviteAdminController,
  getSupportStatsController,
  addSupportTicketMessageController,
  addBugReportMessageController,
  addChangeRequestMessageController,
  adminCreatePayoutController,
  adminWalletDetailController,
  adminWalletPayoutsController,
  getOrderController,
  getDeliveryFareSettingsController,
  listAddressesController,
  listCouponsController,
  listDeliveryPartnersController,
  listNotificationsController,
  listOrdersController,
  listSupportTicketsController,
  listTailorsController,
  listUsersController,
  markPaymentPaidController,
  moderateUserController,
  paymentsController,
  reviewDeliveryVerificationController,
  reviewTailorVerificationController,
  registerFcmTokenController,
  saveDeliveryVerificationDraftController,
  settingsController,
  submitDeliveryVerificationController,
  transactionsController,
  updateDeliveryAvailabilityController,
  updateDeliveryFareSettingsController,
  updateDeliveryProfileController,
  updateOrderStatusController,
  updateSettingController,
  updateTailorAvailabilityController,
  updateTailorProfileController,
  uploadDeliveryAvatar,
  uploadDeliveryAvatarController,
  uploadDeliveryVerificationMedia,
  uploadDeliveryVerificationMediaController,
  saveTailorVerificationDraftController,
  submitTailorVerificationController,
  uploadTailorAvatar,
  uploadTailorAvatarController,
  uploadTailorVerificationMedia,
  uploadTailorVerificationMediaController,
  walletController
} from "../controllers/resource.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { notificationRoutes } from "./notificationRoutes.js";
import {
  createTailoringRequestController,
  acceptDeliveryRequestController,
  cancelTailoringRequestController,
  confirmDeliveryCashCollectionController,
  getDeliveryRequestController,
  getDeliveryTaskOtpsController,
  listDeliveryRequestsController,
  createTailorQuoteController,
  getTailoringRequestController,
  listTailorQuotesController,
  listTailoringRequestsController,
  selectTailorQuoteController,
  saveDeliveryTaskPhotosController,
  startTailoringCheckoutController,
  updateDeliveryTaskStatusController,
  verifyDeliveryTaskOtpController,
  verifyTailoringCheckoutController,
  updateTailoringWorkStatusController,
  uploadTailoringMedia,
  uploadTailoringAuditMediaController,
  uploadTailoringMediaController,
  watchDeliveryRequestsController,
  watchTailoringRequestsController
} from "../controllers/request.controller.js";

export const router = Router();

router.get("/health", (_req, res) => res.json({ data: { ok: true, service: "darzi-backend" } }));
router.post("/auth/request-otp", requestOtpController);
router.post("/auth/verify-otp", verifyOtpController);
router.post("/auth/refresh", refreshController);
router.get("/auth/me", requireAuth, meController);

router.get("/catalog", catalogController);

router.post(
  "/tailoring-requests/media",
  requireAuth,
  requireRole("CUSTOMER", "ADMIN"),
  rateLimit({ keyPrefix: "tailoring-media", windowMs: 15 * 60 * 1000, max: 10 }),
  uploadTailoringMedia,
  uploadTailoringMediaController
);
router.post("/tailoring-requests", requireAuth, requireRole("CUSTOMER", "ADMIN"), createTailoringRequestController);
router.get("/tailoring-requests", requireAuth, requireRole("CUSTOMER", "TAILOR", "ADMIN"), listTailoringRequestsController);
router.get("/tailoring-requests/events/watch", requireAuth, requireRole("TAILOR", "ADMIN"), watchTailoringRequestsController);
router.get("/tailoring-requests/:id", requireAuth, requireRole("CUSTOMER", "TAILOR", "ADMIN"), getTailoringRequestController);
router.post("/tailoring-requests/:id/audit-media", requireAuth, requireRole("TAILOR", "ADMIN"), uploadTailoringMedia, uploadTailoringAuditMediaController);
router.patch("/tailoring-requests/:id/work-status", requireAuth, requireRole("TAILOR", "ADMIN"), updateTailoringWorkStatusController);
router.post("/tailoring-requests/:id/checkout", requireAuth, requireRole("CUSTOMER", "ADMIN"), startTailoringCheckoutController);
router.post("/tailoring-requests/:id/checkout/verify", requireAuth, requireRole("CUSTOMER", "ADMIN"), verifyTailoringCheckoutController);
router.post("/tailoring-requests/:id/cancel", requireAuth, requireRole("CUSTOMER", "ADMIN"), cancelTailoringRequestController);
router.get("/tailoring-requests/:id/quotes", requireAuth, requireRole("CUSTOMER", "TAILOR", "ADMIN"), listTailorQuotesController);
router.post("/tailoring-requests/:id/quotes", requireAuth, requireRole("TAILOR", "ADMIN"), createTailorQuoteController);
router.post("/tailoring-requests/:id/quotes/:quoteId/select", requireAuth, requireRole("CUSTOMER", "ADMIN"), selectTailorQuoteController);

router.get("/delivery-requests", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), listDeliveryRequestsController);
router.get("/delivery-requests/order/:orderId/otps", requireAuth, requireRole("CUSTOMER", "TAILOR", "ADMIN"), getDeliveryTaskOtpsController);
router.post("/delivery-requests/media", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), uploadTailoringMedia, uploadTailoringMediaController);
router.get("/delivery-requests/events/watch", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), watchDeliveryRequestsController);
router.get("/delivery-requests/:id", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), getDeliveryRequestController);
router.post("/delivery-requests/:id/accept", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), acceptDeliveryRequestController);
router.post("/delivery-requests/:id/verify-otp", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), verifyDeliveryTaskOtpController);
router.patch("/delivery-requests/:id/photos", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), saveDeliveryTaskPhotosController);
router.patch("/delivery-requests/:id/cash-collection", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), confirmDeliveryCashCollectionController);
router.patch("/delivery-requests/:id/status", requireAuth, requireRole("DELIVERY_PARTNER", "ADMIN"), updateDeliveryTaskStatusController);

router.get("/addresses", requireAuth, listAddressesController);
router.post("/addresses", requireAuth, createAddressController);

router.get("/orders", requireAuth, listOrdersController);
router.post("/orders", requireAuth, requireRole("CUSTOMER", "ADMIN"), createOrderController);
router.get("/orders/:id", requireAuth, getOrderController);
router.patch("/orders/:id/status", requireAuth, requireRole("TAILOR", "DELIVERY_PARTNER", "ADMIN"), updateOrderStatusController);
router.patch("/orders/:id/assign", requireAuth, requireRole("ADMIN"), assignOrderController);

router.get("/tailors", requireAuth, listTailorsController);
router.patch("/tailors/:id/verification-review", requireAuth, requireRole("ADMIN"), reviewTailorVerificationController);
router.patch("/tailors/me/availability", requireAuth, requireRole("TAILOR"), updateTailorAvailabilityController);
router.patch("/tailors/me/profile", requireAuth, requireRole("TAILOR"), updateTailorProfileController);
router.patch("/tailors/me/verification-draft", requireAuth, requireRole("TAILOR"), saveTailorVerificationDraftController);
router.post("/tailors/me/verification", requireAuth, requireRole("TAILOR"), submitTailorVerificationController);
router.post("/tailors/me/avatar", requireAuth, requireRole("TAILOR"), uploadTailorAvatar, uploadTailorAvatarController);
router.post("/tailors/me/verification-media", requireAuth, requireRole("TAILOR"), uploadTailorVerificationMedia, uploadTailorVerificationMediaController);

router.get("/delivery-partners", requireAuth, listDeliveryPartnersController);
router.patch("/delivery-partners/:id/verification-review", requireAuth, requireRole("ADMIN"), reviewDeliveryVerificationController);
router.patch("/delivery-partners/me/availability", requireAuth, requireRole("DELIVERY_PARTNER"), updateDeliveryAvailabilityController);
router.patch("/delivery-partners/me/profile", requireAuth, requireRole("DELIVERY_PARTNER"), updateDeliveryProfileController);
router.patch("/delivery-partners/me/verification-draft", requireAuth, requireRole("DELIVERY_PARTNER"), saveDeliveryVerificationDraftController);
router.post("/delivery-partners/me/verification", requireAuth, requireRole("DELIVERY_PARTNER"), submitDeliveryVerificationController);
router.post("/delivery-partners/me/avatar", requireAuth, requireRole("DELIVERY_PARTNER"), uploadDeliveryAvatar, uploadDeliveryAvatarController);
router.post("/delivery-partners/me/verification-media", requireAuth, requireRole("DELIVERY_PARTNER"), uploadDeliveryVerificationMedia, uploadDeliveryVerificationMediaController);

router.get("/payments", requireAuth, paymentsController);
router.post("/payments/:id/success", requireAuth, requireRole("ADMIN"), markPaymentPaidController);
router.get("/notifications", requireAuth, listNotificationsController);
router.post("/notifications/fcm-token", requireAuth, registerFcmTokenController);
router.use("/notifications", notificationRoutes);
router.post("/reviews", requireAuth, createReviewController);
router.get("/wallet", requireAuth, walletController);
router.get("/transactions", requireAuth, transactionsController);
router.get("/admin/wallet-payouts", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), adminWalletPayoutsController);
router.get("/admin/wallets/:userId", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), adminWalletDetailController);
router.post("/admin/wallet-payouts", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), adminCreatePayoutController);
router.get("/settings/delivery-fares", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), getDeliveryFareSettingsController);
router.put("/settings/delivery-fares", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), updateDeliveryFareSettingsController);
router.get("/support/stats", requireAuth, requireRole("ADMIN"), getSupportStatsController);
router.get("/support", requireAuth, listSupportTicketsController);
router.post("/support", requireAuth, createSupportTicketController);
router.patch("/support/:id", requireAuth, updateSupportTicketController);
router.post("/support/:id/messages", requireAuth, addSupportTicketMessageController);

router.post("/support/bug-reports", requireAuth, createBugReportController);
router.get("/support/bug-reports", requireAuth, listBugReportsController);
router.patch("/support/bug-reports/:id", requireAuth, requireRole("ADMIN"), updateBugReportController);
router.post("/support/bug-reports/:id/messages", requireAuth, addBugReportMessageController);

router.post("/support/change-requests", requireAuth, createAccountChangeRequestController);
router.get("/support/change-requests", requireAuth, listAccountChangeRequestsController);
router.patch("/support/change-requests/:id/approve", requireAuth, requireRole("ADMIN"), approveAccountChangeRequestController);
router.patch("/support/change-requests/:id/reject", requireAuth, requireRole("ADMIN"), rejectAccountChangeRequestController);
router.post("/support/change-requests/:id/messages", requireAuth, addChangeRequestMessageController);

router.get("/coupons", requireAuth, listCouponsController);
router.post("/coupons", requireAuth, requireRole("ADMIN"), createCouponController);

router.get("/analytics", requireAuth, requireRole("ADMIN"), analyticsController);
router.get("/users", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), listUsersController);
router.post("/users/admin-invite", requireAuth, requireRole("SUPER_ADMIN"), inviteAdminController);
router.patch("/users/:id/moderation", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), moderateUserController);
router.get("/settings", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), settingsController);
router.put("/settings/:key", requireAuth, requireRole("SUPER_ADMIN"), updateSettingController);
