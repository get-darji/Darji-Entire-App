import assert from "node:assert/strict";
import test from "node:test";
import { payoutBreakdown, replayWalletAllocations } from "../services/wallet.service.js";

const credit = (id: string, amount: number, createdAt: string, remarks: string, userType: "TAILOR" | "DELIVERY_PARTNER" = "TAILOR") => ({
  _id: id,
  userId: "partner-1",
  userType,
  orderId: `source-${id}`,
  transactionType: "CREDIT",
  category: "ORDER_EARNING",
  amount,
  remarks,
  createdAt: new Date(createdAt)
});

const debit = (id: string, amount: number, createdAt: string, category = "WEEKLY_PAYOUT") => ({
  _id: id,
  userId: "partner-1",
  userType: "TAILOR",
  transactionType: "DEBIT",
  category,
  amount,
  createdAt: new Date(createdAt)
});

test("reconstructs an old payout and leaves the unpaid earning remainder", () => {
  const replay = replayWalletAllocations([
    credit("stitching", 100, "2026-10-01T10:00:00.000Z", "Tailor earning for order ABC"),
    credit("measurement", 20, "2026-10-02T10:00:00.000Z", "Measurement visit payout for XYZ"),
    debit("payout", 90, "2026-10-07T10:00:00.000Z")
  ]);

  assert.deepEqual(replay.allocationsByPayoutTransactionId.get("payout")?.map(({ earningTransactionId, amount, sourceType }) => ({ earningTransactionId, amount, sourceType })), [
    { earningTransactionId: "stitching", amount: 90, sourceType: "STITCHING" }
  ]);
  assert.deepEqual(replay.outstanding.map(({ earningTransactionId, amount, sourceType }) => ({ earningTransactionId, amount, sourceType })), [
    { earningTransactionId: "stitching", amount: 10, sourceType: "STITCHING" },
    { earningTransactionId: "measurement", amount: 20, sourceType: "MEASUREMENT" }
  ]);
});

test("non-payout debits reduce the oldest liability before the weekly payout", () => {
  const replay = replayWalletAllocations([
    credit("stitching", 100, "2026-10-01T10:00:00.000Z", "Tailor earning for order ABC"),
    credit("measurement", 20, "2026-10-02T10:00:00.000Z", "Measurement visit payout for XYZ"),
    debit("penalty", 15, "2026-10-03T10:00:00.000Z", "PENALTY"),
    debit("payout", 105, "2026-10-07T10:00:00.000Z")
  ]);

  const allocations = replay.allocationsByPayoutTransactionId.get("payout") ?? [];
  assert.deepEqual(allocations.map(({ earningTransactionId, amount }) => ({ earningTransactionId, amount })), [
    { earningTransactionId: "stitching", amount: 85 },
    { earningTransactionId: "measurement", amount: 20 }
  ]);
  assert.equal(replay.outstanding.length, 0);
  assert.equal(payoutBreakdown(allocations).MEASUREMENT, 20);
});

test("separates delivery tasks from batch earnings", () => {
  const replay = replayWalletAllocations([
    credit("task", 70, "2026-10-01T10:00:00.000Z", "Delivery earning for DRQ-1", "DELIVERY_PARTNER"),
    credit("batch", 130, "2026-10-02T10:00:00.000Z", "Batch delivery earning for SIX_PM", "DELIVERY_PARTNER")
  ]);
  const breakdown = payoutBreakdown(replay.outstanding);
  assert.equal(breakdown.DELIVERY_TASK, 70);
  assert.equal(breakdown.DELIVERY_BATCH, 130);
});
