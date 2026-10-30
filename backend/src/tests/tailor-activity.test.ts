import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MeasurementVisitModel, OrderModel, TailorModel, TailorQuoteModel, TailoringRequestModel, UserModel, WalletModel, WalletTransactionModel } from "../models.js";
import { getTailorActivity } from "../services/tailor-activity.service.js";
import { adminMeasurementVisitDetailController, tailorActivityController } from "../controllers/tailor-activity.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { errorHandler } from "../middleware/error.js";
import { signAccessToken } from "../utils/tokens.js";

test("tailor activity uses actual assignments and recorded earnings, and opens protected persisted records", async () => {
  const database = await MongoMemoryServer.create();
  let server: Server | undefined;
  try {
    await mongoose.connect(database.getUri(), { dbName: "darji_tailor_activity_test" });
    const now = new Date();
    await UserModel.collection.insertMany([
      { _id: "user-a", phone: "9876543210", name: "Tailor A", role: "TAILOR", activeSessionId: "tailor-session" },
      { _id: "customer", phone: "9876543211", name: "Customer" },
      { _id: "admin", phone: "9876543212", role: "ADMIN", activeSessionId: "admin-session" }
    ] as any);
    await TailorModel.collection.insertMany([{ _id: "tailor-a", userId: "user-a", darjiTailorId: "DAR-TLR-100001" }, { _id: "tailor-b", userId: "user-b" }] as any);
    await OrderModel.collection.insertOne({ _id: "legacy-order", tailorId: "tailor-a", customerId: "customer", orderNumber: "ORD-1", status: "DELIVERED", totalAmount: 9000, createdAt: now } as any);
    await TailorQuoteModel.collection.insertMany([{ _id: "selected-quote", tailorId: "tailor-a", requestId: "selected-request" }, { _id: "unused-quote", tailorId: "tailor-a", requestId: "quoted-only" }] as any);
    await TailoringRequestModel.collection.insertMany([
      { _id: "selected-request", customerId: "customer", selectedQuoteId: "selected-quote", status: "TAILOR_SELECTED", orderStatus: "completed", createdAt: now },
      { _id: "assigned-request", customerId: "customer", assignedTailorId: "tailor-a", status: "TAILOR_SELECTED", orderStatus: "received_by_tailor", createdAt: now },
      { _id: "reassigned-request", customerId: "customer", assignedTailorId: "tailor-b", selectedQuoteId: "selected-quote", status: "TAILOR_SELECTED", createdAt: now },
      { _id: "quoted-only", customerId: "customer", status: "QUOTE_REQUESTED", createdAt: now }
    ] as any);
    await MeasurementVisitModel.collection.insertMany([
      { _id: "completed-visit", assignedTailorId: "tailor-a", requestId: "visit-request", status: "SUBMITTED", scheduledAt: now, submittedAt: now, visitPayout: 50, submission: { notes: "Saved measurement notes" } },
      { _id: "cancelled-visit", assignedTailorId: "tailor-a", requestId: "cancelled-request", status: "CANCELLED", scheduledAt: now },
      { _id: "alias-visit", assignedTailorId: "user-a", requestId: "alias-request", status: "IN_PROGRESS", scheduledAt: now },
      { _id: "other-tailor-visit", stitchingTailorId: "tailor-a", assignedTailorId: "tailor-b", requestId: "other-request", status: "SUBMITTED", scheduledAt: now },
      { _id: "offered-only", offeredTailorId: "tailor-a", requestId: "offer-request", status: "OFFERED_TO_STITCHING_TAILOR", scheduledAt: now }
    ] as any);
    await WalletModel.collection.insertOne({ _id: "wallet-a", userId: "user-a", userType: "TAILOR", balance: 70 } as any);
    await WalletTransactionModel.collection.insertMany([
      { _id: "stitching-credit", userId: "user-a", userType: "TAILOR", category: "ORDER_EARNING", transactionType: "CREDIT", amount: 100, orderId: "legacy-order", createdAt: now },
      { _id: "visit-credit", userId: "user-a", userType: "TAILOR", category: "ORDER_EARNING", transactionType: "CREDIT", amount: 50, orderId: "completed-visit", remarks: "Measurement visit earning", createdAt: now },
      { _id: "bonus", userId: "user-a", userType: "TAILOR", category: "BONUS", transactionType: "CREDIT", amount: 10, createdAt: now },
      { _id: "payout", userId: "user-a", userType: "TAILOR", category: "WEEKLY_PAYOUT", transactionType: "DEBIT", amount: 80, createdAt: now },
      { _id: "penalty", userId: "user-a", userType: "TAILOR", category: "PENALTY", transactionType: "DEBIT", amount: 10, createdAt: now },
      { _id: "other-user", userId: "user-b", userType: "TAILOR", category: "ORDER_EARNING", transactionType: "CREDIT", amount: 999, createdAt: now }
    ] as any);
    const activity = await getTailorActivity("tailor-a");
    assert.equal(activity.summary.orders, 3);
    assert.equal(activity.summary.completedOrders, 2);
    assert.equal(activity.summary.activeOrders, 1);
    assert.equal(activity.summary.measurementAssignments, 3);
    assert.equal(activity.summary.completedMeasurements, 1);
    assert.equal(activity.summary.recordedEarnings, 160);
    assert.equal(activity.summary.paidOut, 80);
    assert.equal(activity.summary.walletBalance, 70);
    assert.equal(activity.orders.some((order) => order.id === "reassigned-request" || order.id === "quoted-only"), false);
    assert.deepEqual(activity.earnings.find((row) => row.id === "visit-credit")?.link, { id: "completed-visit", source: "MEASUREMENT" });
    assert.deepEqual(activity.earnings.find((row) => row.id === "stitching-credit")?.link, { id: "legacy-order", source: "ORDER" });
    assert.equal(activity.earnings.find((row) => row.id === "bonus")?.link, null);
    assert.equal(await WalletTransactionModel.countDocuments(), 6);

    const app = express();
    app.get("/tailors/:id/activity", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), tailorActivityController);
    app.get("/measurement-visits/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), adminMeasurementVisitDetailController);
    app.use(errorHandler);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const adminToken = signAccessToken({ sub: "admin", role: "ADMIN", sid: "admin-session" });
    const tailorToken = signAccessToken({ sub: "user-a", role: "TAILOR", sid: "tailor-session" });
    assert.equal((await fetch(`${base}/tailors/tailor-a/activity`)).status, 401);
    assert.equal((await fetch(`${base}/tailors/tailor-a/activity`, { headers: { authorization: `Bearer ${tailorToken}` } })).status, 403);
    const response = await fetch(`${base}/tailors/tailor-a/activity`, { headers: { authorization: `Bearer ${adminToken}` } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.summary.recordedEarnings, 160);
    const measurement = await fetch(`${base}/measurement-visits/completed-visit`, { headers: { authorization: `Bearer ${adminToken}` } });
    assert.equal(measurement.status, 200);
    assert.equal((await measurement.json()).data.submission.notes, "Saved measurement notes");
  } finally {
    if (server) { server.closeAllConnections(); await new Promise<void>((resolve) => server!.close(() => resolve())); }
    await mongoose.disconnect();
    await database.stop();
  }
});
