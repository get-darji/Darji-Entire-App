# Darji Translation Implementation Report - 2026-09-13

## Scope

Implemented the English/Hindi localization foundation without changing delivery, payment, OTP, pricing, route optimization, or order-state logic.

## Completed

- Added backend-only dynamic translation endpoint: `POST /translation/translate`.
- Added authenticated access and rate limiting for translation requests.
- Added MongoDB translation cache collection: `translation_cache`.
- Added `preferredLanguage` to user profile data.
- Added preferred-language save support through `PATCH /auth/me`.
- Added client dynamic translation helpers for:
  - Customer app
  - Tailor app
  - Delivery app
  - Admin panel
  - Customer web
- Added local dynamic translation cache:
  - AsyncStorage for mobile apps
  - localStorage for web/admin
- Added static Hindi translation map in `shared/src/static-translations.ts`.
- Added static Text/TextInput translation wrappers in the main native app surfaces.
- Synced language selector changes to backend for customer, tailor, and delivery profiles.

## Google Cloud Boundary

Frontend apps do not call Google Translation directly.

Audit command:

```powershell
rg -n "translation.googleapis|GOOGLE_TRANSLATE|translate/v2" apps backend shared -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx'
```

Only backend matches were found:

- `backend/src/env.ts`
- `backend/src/services/translation.service.ts`

## Required Environment Variable

Backend/Railway only:

- `GOOGLE_TRANSLATE_API_KEY`
- Purpose: Google Cloud Translation REST API key for backend cache misses.
- Secret: yes.
- Frontend env vars: none added.

Recommended setup:

1. Enable Google Cloud Translation API in Google Cloud.
2. Create an API key restricted to Cloud Translation API.
3. Add `GOOGLE_TRANSLATE_API_KEY` to the backend service variables in Railway.
4. Redeploy/restart backend.
5. Test with an authenticated `POST /translation/translate` request.

## Validation

Typecheck:

```powershell
npm run typecheck --workspaces --if-present
```

Result: passed for backend, shared, admin panel, customer app, customer web, delivery app, and tailor app.

Translation cache smoke test:

- Same-language English to English returned without Google call.
- First English to Hindi dynamic request missed cache.
- Repeated normalized request hit Mongo cache.
- Mocked Google fetch calls: `1`.

Static string coverage audit after the latest dictionary pass:

```text
apps/customer-app/App.tsx      445/645
apps/tailor-app/App.tsx        150/214
apps/delivery-app/App.tsx      144/163
apps/customer-web              81/105
apps/admin-panel/src           151/231
known static strings           709
```

## Remaining Caveats

- Static translation is broad but not mathematically 100% complete. The scanner still finds literal UI strings that are not in the exact-match Hindi map.
- Dynamic translation helpers are available, but not every user-generated display field has been wired to call them yet.
- Customer web and admin have dynamic translation helpers, but no full static UI language toggle/wrapper layer yet.
- No live Google API request was run because no real `GOOGLE_TRANSLATE_API_KEY` is configured locally.
- No emulator/browser visual regression run was completed.

