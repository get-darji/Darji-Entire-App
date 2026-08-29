# Admin Dashboard Audit

Audit date: 29 August 2026

## KPI status

| Dashboard item | Source of truth | Status |
| --- | --- | --- |
| Total orders | Legacy orders plus confirmed tailoring requests | Verified; opens all orders |
| Active orders | Non-final, non-payment-pending orders | Verified; opens the active-order filter |
| Completed orders | Delivered legacy orders plus completed tailoring requests | Verified; opens the completed filter |
| Cancelled orders | Cancelled legacy and tailoring orders | Verified; opens the cancelled filter |
| Pending orders | Order-placed/payment-pending records | Verified; opens the pending filter |
| Gross paid | Payments whose status is `PAID` | Verified; opens the paid ledger |
| Tailor cost | Accepted quote for current tailoring requests; legacy orders retain their existing 45% payout rule | Verified against the payout rules used by the backend |
| Delivery cost | Final/estimated payout for instant jobs; one shared payout per batch allocated across its active tasks | Fixed; the batch payout is no longer multiplied by the number of tasks |
| Net revenue | Gross paid minus tailor cost minus delivery cost | Fixed and derived per payment |
| Pending payouts | Positive tailor and delivery-partner wallet balances | Fixed; no longer uses stale profile earning fields |
| Average order value | Gross paid divided by paid-payment count | Verified; opens the paid ledger |
| Completion rate | Delivered orders divided by all confirmed orders | Verified; opens completed orders |
| New customers | Customers' first-order dates in the selected trend period | Verified; opens Customers |
| New tailors / partners | Profile creation dates in the selected trend period | Verified; opens the relevant directory |
| Recent orders | Five most recently created confirmed orders | Verified; each row opens the order detail |
| Top tailors | Current-week wallet earnings, then rating | Fixed; rows open profiles and View All opens Tailors |
| Top delivery partners | Current-week wallet earnings, then rating | Fixed; rows open profiles and View All opens Delivery Partners |
| Live order status | Current normalized order statuses | Verified |
| Today's operations | Delivery tasks scheduled/created/due today plus current tailoring/fleet state | Verified; every tile opens its operational module |

## Live alerts

Operational alerts now resolve `entityId` and metadata identifiers (`taskId`, `orderId`, `requestId`, `paymentId`, and `batchId`) against current records. Clicking an alert opens the related delivery task, order, tailoring request, payment area, or batch. Generated quote-delay, delivery-delay, delivery-exception, failed-payment, stalled-order, and priority-support alerts also open their source record.

## Finance correction

The previous calculation summed `estimatedEarnings` on every delivery task. Batched tasks can carry the same whole-batch estimate, so this multiplied delivery expense and understated profit. Finance now counts an instant/unbatched payout individually and counts a batch payout once, allocating it proportionally across the batch's active tasks. Completed work prefers `finalPayout`; active work uses `estimatedPayout` and then `estimatedEarnings` as fallbacks.

Values will update after the corrected backend is restarted or deployed and the admin queries are refreshed. Historical wallet balances remain the payout source of truth; this change does not rewrite or duplicate wallet transactions.
