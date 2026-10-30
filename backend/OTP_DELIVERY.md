# OTP SMS delivery setup

Normal `/api/auth/request-otp` requests default to real 2Factor SMS, including
older app versions that omit `mode`. The send URL remains
`https://2factor.in/API/V1/{API_KEY}/SMS/{PHONE}/AUTOGEN/OTP1` (GET).
The explicit legacy `mode: "default"` can use the configured local development
fallback outside production. Its response now says that no SMS was sent.

The previous 103-byte success response matches `provider: "dev", fallback: true`
with the old `OTP sent` message. A provider success means acceptance, not delivery.
Check the response provider and the `[otp] Request completed` log. No API key or
OTP code is logged. `/api/health` exposes the OTP build marker and non-secret
configuration flags to distinguish old deployments from this version.

The deployed `npm start` entrypoint explicitly sets `NODE_ENV=production` before
loading backend configuration. This prevents a missing/stale Railway environment
variable from enabling local development OTPs or development startup seeding.
Use `npm run dev` for local development. Also set `OTP_DEV_FALLBACK_ENABLED=false`
in the production host variables to keep the configured intent clear.

## Connect 2Factor delivery reports

1. Open **Admin -> Dashboard -> OTP SMS delivery -> Set up delivery reports**.
   The authenticated admin-only endpoint supplies a private callback URL. Copy it
   with **Copy callback URL**.

2. Paste that URL into the **SMS OTP callback** setting in your 2Factor account
   and save it. No additional Railway variable is required: the backend derives
   a scoped HMAC credential from its configured provider key. The provider key
   itself is never returned or included in the callback URL. Keep the URL private.

   Use the SMS OTP callback, not the transactional SMS/TSMS report endpoint.
   The documented legacy OTP POST fields are `mode=SMS_OTP`, `SessionId`, `To`,
   and `Status` (`DELIVERED`, `FAILED`, or `REJECTED`). Both JSON and URL-encoded
   callback bodies are accepted. Access logs redact this URL's query string.
   The control-panel URL must preserve the token query parameter. If the provider
   cannot preserve it, request its supported authenticated callback method rather
   than exposing an unauthenticated delivery endpoint.

3. Request one real SMS to an authorized test phone. Confirm the number and status
   in the delivery panel. Verify a real 2Factor callback transitions pending to
   the reported result. Backend callback readiness alone does not prove the URL
   has been registered with the provider. No historical delivery is assumed.

A dedicated independent credential is still supported: set
`TWOFACTOR_DLR_WEBHOOK_SECRET` (at least 32 random characters) in Railway and
redeploy before copying the URL. This takes precedence over derivation. Rotating
this secret, or rotating the API key when using derivation, changes the URL:
register the new URL with 2Factor after rotation. Callback setup is never returned
in the routine delivery-history response, and the setup response is not cached.

Provider reference: https://dial2verify.com/corp/support-system/tkt/knowledgebase.php?article=5

## Status and history

- The lifetime KPI counts provider-accepted requests and is labelled accordingly.
- The delivery panel lists up to 100 recent results, filters by phone/status, and
  refreshes every five seconds while open. It only permits authenticated admins.
- Delivery logs retain destination phone, account role, request time, provider
  acceptance and report times, and sanitized failures for 90 days. No OTP values
  are stored or returned by the delivery API.
- Missing callbacks remain pending; after ten minutes the row says no report was
  received. Expiry or HTTP 200 never becomes an assumed delivery.
- Receipt duplicates do not inflate totals. Callback-before-save races preserve
  the receipt, and delivery is never overwritten by a delayed failure.
- History begins with this backend update; historical accepted totals cannot be
  reconstructed as delivered SMS. Delivery reports confirm the provider's status,
  not that a person read the message.

## Partner app permission gate

Tailor and Delivery validate permissions after authentication, including restored
sessions, and recheck on foreground resume. The initial account workspace waits
for the check; subsequent checks show a blocking modal while keeping navigation
state mounted. Notification access is required on iOS/Android; Android additionally
requires overlay access and, on API 34+, full-screen alert access. There is no skip
button. A missing native alert module or check error shows a retry screen.

This gate uses the existing native APIs. Its JavaScript changes can ship by OTA
to matching builds. A build missing the native alert module needs a new binary.
Verify reinstall/login, permission denial, settings return, notification grant,
overlay/full-screen grant, and revocation/resume on physical partner devices.
