# Darji Festival Theme Manager — assets and implementation brief for Codex

## Goal and source materials

Build a **real, admin-controlled Diwali theme** for Darji's existing customer mobile app. An authorized admin must be able to turn Diwali mode ON and OFF from the admin panel. The mobile app should display the festive visuals when active and **restore its original appearance** when inactive, without changing booking, search, orders, or navigation behavior.

This archive contains eight standalone, transparent-alpha PNGs. They are decorative **overlays**, not complete screens or buttons. **Also attach two reference images to Codex:** (1) the original Darji customer home-screen screenshot and (2) the approved `Darji_Actual_Home_Diwali_Concept.png` mockup from this conversation. Those screenshots are visual references, not assets to put behind the whole screen. The reference contains a personal name, avatar, sample search text, and order details; never hardcode those values.

**Codex instruction:** Inspect the actual customer-app, admin-panel, backend, database, authentication, storage, and existing feature-flag code before deciding the implementation. Reuse existing architecture and libraries. Implement the feature end to end and test it; do not stop after proposing a plan. If the customer app or admin/backend repository is unavailable, explain the missing integration surface and ask for access instead of inventing a disconnected system.

## 1. Asset mapping and layer placement

| File | Intended position | Rendering guidance |
| --- | --- | --- |
| `header_marigold_lights.png` | Across upper greeting/header | Fit across screen width using proportional scaling. Keep safe-area/status-bar and notification/profile controls unobstructed. |
| `hanging_lantern.png` | Small suspended ornaments near header edges | Reuse 1–3 instances at varied sizes. Do not overlap important taps. |
| `greeting_diya.png` | Beside `Happy Diwali, <user first name>!` | Small inline decoration, about 48–72 logical pixels high when suitable. The greeting text itself must be live UI. |
| `hero_maroon_fabric_corner.png` | Upper-right of dark tailoring-request card | Layer behind heading and action button; clip to the card's rounded corners. |
| `hero_diyas_marigolds.png` | Bottom-right of dark tailoring-request card | Keep clear of the existing `Stitch It Now` button and its touch region. |
| `hero_sparkle_overlay.png` | Above hero background, below live UI text | Scale to cover the card; use a subtle opacity and optional slow twinkle. |
| `gold_rangoli_corner.png` | Subtle corners on search/location/order cards | Use sparingly with low opacity, approximately 10–25%, clipped inside rounded card bounds; rotate/flip if useful. |
| `hero_gold_divider.png` | Thin ornamental divider inside hero card | Fit proportionally below heading, not over text. |

All eight PNGs are static images with true alpha channels. No Lottie, Rive, GIF, or other motion file is included. Use native/app animation APIs for small movements and opacity changes. Never rasterize the entire home-screen reference into a single image.

## 2. Exact visual intent

- The existing normal Darji home-screen hierarchy is authoritative: status bar/safe area; greeting/name and avatar; notifications; search; Current Location card; main tailoring-request hero; Your Orders card; fixed bottom navigation.
- Keep real user name, location, order status/ID, search state, and profile data dynamic. Keep navigation and `Stitch It Now` action working.
- In Diwali mode, switch the visible greeting to `Happy Diwali, <user first name>!` with the single-diya overlay, retaining localization and accessibility conventions.
- Use a warm ivory page surface around `#FFF9EE`, a deep chocolate hero around `#2C1708`, Darji gold around `#F6A500`, and maroon fabric around `#6B1016`. These are approximate visual references: prefer existing brand tokens where appropriate.
- Keep the main hero's core service message `Get Tailoring Done at Your Doorstep`, its supporting copy, and the `Stitch It Now` button. A small `FESTIVE SEASON` label is acceptable as live text.
- Keep rounded cards, restrained golden outlines, strong foreground/background contrast, and the original bottom navigation. No new offers, discounts, or fake customer content.
- Decorations must be absolutely positioned behind interactive content, have touch/pointer events disabled, and not change navigation hit targets or scroll behavior.
- Adapt to compact Android screens, larger phones, insets, text scaling, and accessibility contrast. Use clipping and proportional placement rather than hardcoded screenshot coordinates.

## 3. Subtle Diwali motion / glitter specification

The screenshot is a **static concept**; the actual app should feel gently alive without becoming visually noisy.

1. **Fairy lights:** Alternate a few bulbs' opacity/brightness with staggered timings, approximately every 2–4 seconds. Avoid rapid flashing.
2. **Diya flame:** Very slight breathing/flicker, e.g. about 5–10% variation in glow/opacity or a tiny scale movement. The lamp body should stay still.
3. **Hero sparkles:** Use `hero_sparkle_overlay.png` at reduced opacity (suggest starting around 25–40%) and gently fade its layer or a few tiny light particles. No dense glitter rain and no particles covering text.
4. **Hanging lanterns:** Optional slow sway of only a few degrees; do not let them enter tap areas.
5. **Animation lifecycle:** Pause/stop when the home screen is not focused or the app goes to background. Honor reduced-motion preferences by showing a static festive composition.
6. **Performance:** Reuse a small number of assets; avoid excessive CPU/GPU usage, layout thrashing, memory leaks, and unnecessary full-screen re-renders. Prefer an animation mechanism already installed in the project.

Test animations on a lower-end Android device as well as a typical phone. If performance suffers, keep static PNGs and animate only one or two low-cost effects.

## 4. Admin panel: Festival Theme Manager

Add a section such as **App Settings → Festival Themes** within the existing authenticated Darji admin panel.

Minimum functional controls:

- Festival selection, starting with `diwali` and extensible to other festival IDs.
- A prominent **Enable / Disable** toggle.
- A **Preview** of normal vs festive home-screen state.
- **Save / Publish** with clear success and error feedback.
- Optional **Start** and **End** date-time fields, interpreted in `Asia/Kolkata`, for automatic seasonal scheduling.
- A visible current status: `Active`, `Scheduled`, `Inactive`, or `Expired`.
- A fast **Turn Off / Restore Normal** action for rollback.
- If the existing admin panel supports asset management, allow replacement of festival artwork with validated image URLs/files; otherwise begin with the provided bundled assets.

Only authenticated users with an admin role may write settings. Enforce authorization in the backend, not merely by hiding UI controls. Validate dates, theme names, and any asset URLs. Keep a change timestamp/updated-by value if it fits the existing data model.

Recommended precedence: `enabled=false` means the theme is always OFF; `enabled=true` with no schedule makes it active now; `enabled=true` with a valid schedule activates only inside the configured window. Show this logic in the admin UI.

## 5. Backend and app configuration

Use the current app backend, database, or remote-config service, not a second standalone system. The exact schema/endpoints should fit the existing codebase. A possible **logical configuration** is:

```json
{
  "themeId": "diwali",
  "enabled": false,
  "startAt": null,
  "endAt": null,
  "timezone": "Asia/Kolkata",
  "assetVersion": "diwali-v1"
}
```

Requirements:

- Persist the settings centrally so they survive admin reloads and logouts.
- Provide an admin-protected write path and a safe, read-only configuration path for the customer app. Do not expose admin credentials in the app.
- Compute active status reliably from the saved toggle and schedule. Prevent stale cached data from leaving an expired campaign active indefinitely.
- On app launch and return to foreground, fetch the active configuration. If the project already has real-time subscriptions or push/stream mechanisms, use them so an admin change can update an open app promptly. Otherwise implement a sensible refresh interval or next-foreground refresh, and document the expected delay.
- Cache safely and handle network errors without crashing. Default to the normal theme when no valid configuration has ever been received. Do not flash the festive theme while restoring normal state.
- If `enabled` becomes false, remove festive greetings, overlays, colors, and animations; restore the original layout and state **without resetting current user data or navigation**.
- Keep this as reusable themed components or a theme provider, not two duplicated home screens. Make the system extensible for future festivals.

For future festivals, support a configurable title/greeting, accent palette, start/end dates, and approved asset references as the architecture permits. Avoid claiming that entirely new native functionality can be shipped by a remote toggle; a one-time native rebuild may be required for a new animation dependency.

## 6. Acceptance tests Codex must perform

1. Admin switches **ON** → a customer app launched/refreshed while online shows Diwali visuals and greeting.
2. Admin switches **OFF** → app returns to its original pre-festival design; existing bookings, order data, search and navigation remain intact.
3. Admin setting persists after reload/logout/restart, and app receives it after relaunch.
4. Scheduled activation/deactivation works at `Asia/Kolkata` boundaries, including invalid date validation.
5. Unauthorized users cannot change theme settings, even by calling the backend directly.
6. Network failure, missing images, malformed config, and expired/offline cache do not break the UI.
7. Animation cleanup, reduced-motion behavior, small-screen layout, and touch targets all pass.
8. Capture **normal** and **Diwali** screenshots of a running app, compare to the two supplied references, and refine styling where feasible.
9. Run existing type checks, tests, build/lint checks as applicable, and report any checks that could not be run.

Do not deploy to production, publish a new app binary, change production data, or perform destructive migrations without explicit approval.

## 7. Codex completion report

When finished, report the changed files, database migration/configuration (if any), admin control location, mobile theme-refresh behavior, whether a one-time app build is necessary, tested ON/OFF scenarios, screenshots, known limitations, and any manual steps needed to publish safely.

**Definition of done:** The admin toggle genuinely controls the customer app's festive design through persisted configuration. A decorative screen with no backend connection or an admin-only switch is **not** a completed implementation.
