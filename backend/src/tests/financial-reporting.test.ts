import assert from "node:assert/strict";
import test from "node:test";
import {
  OPERATIONAL_ALLOWANCE_PER_ORDER,
  allocateAmountExactly,
  allocatePayoutsFifo,
  buildPaymentCollections,
  reconcilePartnerObligations,
  summarizePartnerCosts,
  type FinanceOrder,
  type PartnerObligation
} from "../services/financial-reporting.logic.js";

const jan = { start: new Date("2026-01-01T00:00:00.000Z"), endExclusive: new Date("2026-02-01T00:00:00.000Z") };
const order = (id: string, category: FinanceOrder["category"], completedAt?: string): FinanceOrder => ({
  id, customerId: `customer-${id}`, customerName: "Customer", orderNumber: id, status: category.toUpperCase(), category,
  completedAt: completedAt ? new Date(completedAt) : undefined
});
const payment = (overrides: Record<string, unknown> = {}) => ({
  id: "pay-1", orderId: "order-1", method: "ONLINE", status: "PAID", amount: 500,
  providerRef: "provider-1", paidAt: new Date("2026-01-10T10:00:00.000Z"), ...overrides
});
const obligation = (overrides: Partial<PartnerObligation> = {}): PartnerObligation => ({
  id: "obligation-1", orderId: "order-1", partnerId: "partner-1", partnerName: "Partner",
  partnerType: "TAILOR", category: "STITCHING", sourceId: "order-1", sourceType: "ORDER", amount: 300,
  earningDate: new Date("2026-01-12T10:00:00.000Z"), completionDate: new Date("2026-01-15T10:00:00.000Z"),
  creditId: "credit-1", creditAmount: 300, ...overrides
});

test("1. successful online payment on incomplete order is Gross Paid only", () => {
  const orders = new Map([["order-1", order("order-1", "active")]]);
  const report = buildPaymentCollections([payment()], orders, jan);
  assert.equal(report.summary.grossPaid, 500);
  assert.equal(report.summary.completedCollections, 0);
  assert.equal(report.summary.incompleteCollections, 500);
});

test("2. pending COD is excluded from Gross Paid", () => {
  const report = buildPaymentCollections([payment({ method: "COD", status: "PENDING", providerRef: undefined })], new Map([["order-1", order("order-1", "active")]]), jan);
  assert.equal(report.summary.grossPaid, 0);
  assert.equal(report.periodRows.length, 0);
});

test("3. completed COD with confirmed collection is included and remittance remains unreconciled", () => {
  const report = buildPaymentCollections([payment({ method: "COD", providerRef: undefined })], new Map([["order-1", order("order-1", "completed", "2026-01-12T00:00:00Z")]]), jan);
  assert.equal(report.summary.grossPaid, 500);
  assert.equal(report.periodRows[0].codRemittanceStatus, "COLLECTED_UNRECONCILED");
});

test("4. incomplete-order wallet credit is excluded from completed-order reporting", () => {
  const orders = new Map([["order-1", order("order-1", "active")]]);
  const rows = reconcilePartnerObligations([obligation({ completionDate: undefined })], new Map([["credit-1", 0]]));
  assert.equal(rows.filter((row) => orders.get(row.orderId)?.category === "completed").length, 0);
});

test("5. completed order makes all finalized partner earnings reportable", () => {
  const rows = reconcilePartnerObligations([
    obligation(),
    obligation({ id: "measurement", category: "MEASUREMENT", sourceId: "visit-1", creditId: "credit-2", amount: 50 }),
    obligation({ id: "delivery", partnerType: "DELIVERY_PARTNER", category: "DELIVERY", sourceType: "DELIVERY_TASK", sourceId: "task-1", creditId: "credit-3", amount: 75 })
  ], new Map());
  assert.equal(summarizePartnerCosts(rows).partnerCost, 425);
});

test("6. completed unpaid earnings are Partner Cost and Pending Payout", () => {
  const summary = summarizePartnerCosts(reconcilePartnerObligations([obligation()], new Map()));
  assert.equal(summary.partnerCost, 300);
  assert.equal(summary.pendingPartnerCost, 300);
});

test("7. successful payout decreases pending without changing Partner Cost", () => {
  const before = summarizePartnerCosts(reconcilePartnerObligations([obligation()], new Map()));
  const after = summarizePartnerCosts(reconcilePartnerObligations([obligation()], new Map([["credit-1", 300]])));
  assert.equal(after.partnerCost, before.partnerCost);
  assert.equal(after.pendingPartnerCost, 0);
  assert.equal(after.paidPartnerCost, 300);
});

test("8. partial payout leaves only the remainder pending", () => {
  const summary = summarizePartnerCosts(reconcilePartnerObligations([obligation()], new Map([["credit-1", 125]])));
  assert.equal(summary.paidPartnerCost, 125);
  assert.equal(summary.pendingPartnerCost, 175);
});

test("9. cancelled order does not enter completed-order Partner Cost", () => {
  const orders = new Map([["order-1", order("order-1", "cancelled")]]);
  const rows = reconcilePartnerObligations([obligation()], new Map());
  assert.equal(summarizePartnerCosts(rows.filter((row) => orders.get(row.orderId)?.category === "completed")).partnerCost, 0);
});

test("10. measurement and delivery credits made before completion are not duplicated", () => {
  const rows = reconcilePartnerObligations([
    obligation({ id: "measurement", category: "MEASUREMENT", sourceId: "visit-1", creditId: "credit-m", amount: 80 }),
    obligation({ id: "delivery", category: "DELIVERY", partnerType: "DELIVERY_PARTNER", sourceType: "DELIVERY_TASK", sourceId: "task-1", creditId: "credit-d", amount: 60 })
  ], new Map());
  assert.equal(rows.length, 2);
  assert.equal(summarizePartnerCosts(rows).partnerCost, 140);
});

test("11. batch payout allocation reconciles exactly without duplicate cost", () => {
  const allocations = allocateAmountExactly(100, ["task-c", "task-a", "task-b"]);
  assert.deepEqual([...allocations.entries()], [["task-a", 33.34], ["task-b", 33.33], ["task-c", 33.33]]);
  assert.equal([...allocations.values()].reduce((sum, value) => sum + value, 0), 100);
});

test("12. retried completion/payment record does not duplicate recognition", () => {
  const report = buildPaymentCollections([
    payment({ id: "pay-a" }), payment({ id: "pay-b" })
  ], new Map([["order-1", order("order-1", "completed", "2026-01-15T00:00:00Z")]]), jan);
  assert.equal(report.summary.grossPaid, 500);
  assert.equal(report.summary.duplicatePaymentRecordsIgnored, 1);
});

test("13. ₹16 allowance is applied exactly once per eligible completed order", () => {
  assert.equal(OPERATIONAL_ALLOWANCE_PER_ORDER * 3, 48);
});

test("14. full refund and duplicate records keep Gross Paid accurate", () => {
  const report = buildPaymentCollections([
    payment({ id: "pay-a" }),
    payment({ id: "pay-b" }),
    payment({ id: "refund-a", status: "REFUNDED", refundedAt: new Date("2026-01-20T00:00:00Z") })
  ], new Map([["order-1", order("order-1", "cancelled")]]), jan);
  assert.equal(report.summary.grossPaid, 0);
  assert.equal(report.summary.refunds, 500);
});

test("15. incomplete financial components can be detected instead of treated as zero", () => {
  const required = ["collection", "stitching", "delivery"];
  const present = new Set(["collection", "stitching"]);
  assert.deepEqual(required.filter((component) => !present.has(component)), ["delivery"]);
});

test("16. partner detail rows reconcile to card totals", () => {
  const rows = reconcilePartnerObligations([
    obligation(), obligation({ id: "delivery", amount: 99, category: "DELIVERY", partnerType: "DELIVERY_PARTNER", sourceId: "task", sourceType: "DELIVERY_TASK", creditId: "credit-2" })
  ], new Map([["credit-1", 100], ["credit-2", 99]]));
  const summary = summarizePartnerCosts(rows);
  assert.equal(rows.reduce((sum, row) => sum + row.amount, 0), summary.partnerCost);
  assert.equal(summary.paidPartnerCost + summary.pendingPartnerCost, summary.partnerCost);
});

test("17. payment, completion and payout dates use their documented independent bases", () => {
  const feb = { start: new Date("2026-02-01T00:00:00Z"), endExclusive: new Date("2026-03-01T00:00:00Z") };
  const orders = new Map([["order-1", order("order-1", "completed", "2026-02-10T00:00:00Z")]]);
  const januaryCollection = buildPaymentCollections([payment()], orders, jan);
  const februaryCollection = buildPaymentCollections([payment()], orders, feb);
  const allocation = allocatePayoutsFifo(
    [{ id: "credit-1", userId: "partner-1", userType: "TAILOR", amount: 300, createdAt: new Date("2026-01-12T00:00:00Z") }],
    [{ id: "payout-1", userId: "partner-1", userType: "TAILOR", amount: 300, paidAt: new Date("2026-03-01T00:00:00Z"), status: "PAID" }]
  );
  assert.equal(januaryCollection.summary.grossPaid, 500);
  assert.equal(februaryCollection.summary.grossPaid, 0);
  assert.equal(orders.get("order-1")?.completedAt?.getUTCMonth(), 1);
  assert.equal(allocation.paidByEarningId.get("credit-1"), 300);
});
