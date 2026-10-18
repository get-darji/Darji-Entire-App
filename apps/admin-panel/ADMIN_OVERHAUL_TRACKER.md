# Darji Admin Panel Overhaul Tracker

Branch: `codex/admin-panel-overhaul`

This tracker records the audit and implementation checkpoints for the admin-panel UX overhaul. Business rules, pricing, payouts, dispatch algorithms, payment processing, and authorization remain unchanged.

## Source audit

### Current information architecture

- Overview: Dashboard, Live Alerts
- Orders and fulfilment: Orders, Tailoring Requests, Delivery Ops, Batch Management, Measurements
- Partners and customers: Tailors, Sample Work, Delivery Partners, Customers
- Finance and growth: Payments, Coupons, Analytics, Export Center
- Communication: Support, Reviews, Notifications
- Administration: Activity Logs, Accounts, System Health, Platform Settings, Configure Website, Settings

All destinations are currently rendered from one client-side page and one flat 24-item sidebar. Most implementation lives in `src/components/admin-portal.tsx`, including queries, mutations, dashboards, tables, profiles, order workflows, finance, exports, and dialogs.

### Existing supported operations confirmed in source

- Order creation, assignment, validated status transitions, metadata priority/notes, and invoice export
- Tailoring quote selection, checkout, work status, cancellation, and measurement visits
- Delivery task operations, retries, batch notification, and batch task reassignment
- Tailor and delivery-partner verification review
- Customer moderation and deletion restrictions
- Payment review, wallet detail, and payout creation
- Coupons, support queues, reviews, notifications, activity logs, health, platform controls, website settings, and operational settings

### Main UX and architecture issues

- The flat sidebar gives equal weight to frequent operations and rare configuration tools.
- Section state is persisted locally but is not represented in the URL, so refresh, browser history, and shared deep links are weak.
- Order, customer, tailor, delivery-partner, payment, job, and batch relationships are not consistently navigable in both directions.
- Complex records are primarily presented in layered dialogs; important context is lost when moving to another record.
- Several tables expose multiple buttons per row instead of one primary row action plus deliberate secondary actions.
- Tailor and delivery profiles repeat identity/status details and expose low-value serialized settings in the normal overview.
- Technical identifiers are visually prominent in several operational tables while action-required context is less prominent.
- Shared primitives exist, but detail headers, entity references, action groups, filters, and empty states are still implemented differently across modules.
- The main portal component is too large to maintain safely and makes duplicated presentation patterns difficult to detect.

### Browser audit status

- The existing local server responds on `http://localhost:3000`.
- Browser automation and the Windows native automation bridge were unavailable during the initial audit.
- Visual claims must remain limited until a browser session is available; source, HTTP, TypeScript, and build evidence will be reported separately.

## Implementation checkpoints

- [x] Preserve assisted-order location, voice, file validation, and Razorpay UPI-link QR work (`eb9a08d`).
- [x] Group navigation around operational workflows and synchronize section state with browser history.
- [x] Add page breadcrumbs; linked entity references continue in the connected-record checkpoint.
- [x] Simplify the orders list: full rows now open details, entity controls remain independently clickable, and duplicate assignment actions are consolidated.
- [x] Reorganize order details around overview, people/fulfilment, pricing, items, activity, proof media, and safe management actions.
- [x] Connect customer, tailor, delivery partner, delivery job, batch, payment, and payout navigation across operational and financial detail views.
- [x] Consolidate customer, tailor, and delivery-partner profiles: unified identity headers, readable operational fields, server-backed customer history, linked orders/jobs/batches, and wallet entry points.
- [x] Improve finance/payout traceability without changing calculations: financial source rows now link to orders and partner profiles.
- [x] Refine alerts into an action-oriented notification center with severity summaries, search, filtering, sorting, and direct record actions.
- [ ] Standardize remaining table actions, states, responsiveness, and accessibility. (Reusable entity links and keyboard-openable order rows complete; remaining low-frequency modules require browser QA.)
- [x] Complete admin/backend typechecks, admin production build, financial regression tests, HTTP smoke check, and Git diff validation.

## Validation evidence

- Admin TypeScript: passed (`npm --workspace @darji/admin-panel run typecheck`).
- Backend TypeScript: passed (`npm --workspace backend run typecheck`).
- Admin production build: passed (`npm --workspace @darji/admin-panel run build`).
- Financial reporting regression suite: 17/17 passed.
- Existing local server: HTTP 200 at `http://localhost:3000/?section=orders`, title `Darji Admin`.
- Browser screenshots and interactive visual acceptance remain unavailable because no browser-control surface or Windows automation bridge was exposed to this session.

## Git checkpoint convention

Each completed group receives a focused commit using one of these prefixes:

- `feat(admin-nav)` navigation and page context
- `feat(admin-orders)` orders and connected fulfilment
- `feat(admin-profiles)` customer and partner profiles
- `feat(admin-finance)` finance and payouts
- `feat(admin-alerts)` alerts and notifications
- `refactor(admin-ui)` reusable components and visual consistency
- `test(admin)` validation and regression coverage

