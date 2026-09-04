# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Darji operations administrators use the dashboard on desktop, laptop, tablet, and smaller screens to monitor orders, payments, partner liabilities, fulfillment bottlenecks, and marketplace growth.

## Product Purpose

The Admin Panel is Darji's operational command center. It must provide truthful, traceable business metrics while preserving access to order management, partner management, payment operations, support, alerts, and platform settings.

## Positioning

The dashboard unifies Darji's legacy catalog orders and quotation-led tailoring workflow without treating their records or state vocabularies as interchangeable.

## Operating Context

Administrators scan current fulfillment state, investigate delayed or unassigned work, compare an explicitly selected period with the equivalent preceding period, open affected records from alerts and KPIs, and manage partner wallet payouts.

## Capabilities and Constraints

- Authentication, navigation, order management, partner management, filters, and existing operational workflows must remain functional.
- MongoDB contains distinct `Order`, `TailoringRequest`, `Payment`, `DeliveryTask`, `DeliveryBatch`, `WalletTransaction`, and `PaymentHistory` sources.
- Financial analytics must use collected payments and authoritative wallet earning records rather than limited frontend datasets or stale profile totals.
- Completed means delivered. Cancelled means explicitly cancelled, not a technical failure.
- Refund data currently supports only a whole-payment status; partial refund amounts are not represented.
- Packaging and other operational cost is currently fixed at ₹8 per applicable collected order.

## Brand Commitments

Preserve the Darji name, logo, existing warm brand accent, and professional operations tone. Semantic color communicates state: green success, blue active/information, amber attention, red danger, burgundy critical, and slate neutral.

## Evidence on Hand

The repository contains the production models, API routes, operational services, dashboard UI, and Darji logo. No fabricated KPI data, customer claims, or business benchmarks should be introduced.

## Product Principles

- Every displayed number has one explicit business meaning.
- Operational state and historical period are never silently conflated.
- Financial totals reconcile to collected money and authoritative partner liabilities.
- Alerts lead directly to the record requiring attention.
- Dense operational information remains calm, scannable, and responsive.

