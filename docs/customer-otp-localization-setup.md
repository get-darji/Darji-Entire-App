# Customer OTP and Hindi setup

Deploy the backend changes and rebuild the customer app (or publish to its matching
Expo Updates channel/runtime). Existing installed builds do not change automatically.

## SMS

Set these on the backend in Railway, not in public Expo variables:

```dotenv
TWOFACTOR_ENABLED=true
TWOFACTOR_API_KEY=<account key>
TWOFACTOR_TEMPLATE_NAME=OTP1
```

Every request now calls GET `/API/V1/<key>/SMS/<phone>/AUTOGEN/OTP1`.
The old `twofactor` mode remains accepted for older clients. Both modes send SMS.
Cooldown: 60 seconds. Expiry: 10 minutes. Maximum incorrect attempts: 5.
Provider failures do not silently create a development OTP session.

Optional temporary customer test access requires all of:

```dotenv
OTP_DEV_FALLBACK_ENABLED=true
OTP_DEV_CODE=123456
OTP_TEST_CUSTOMER_PHONES=<comma-separated test customer phone numbers>
OTP_TEST_EXPIRES_AT=<future ISO timestamp with timezone>
```

Leave the last two empty to disable it. An active SMS OTP request is still required.
Admin login and accounts with ADMIN/SUPER_ADMIN roles cannot use this bypass.
Remove these settings when testing finishes. Never use a public universal OTP.

## Backend selection

Customer Expo and installed builds respect `EXPO_PUBLIC_API_URL`, then app config,
then the Railway default. Expo's Metro host no longer silently selects port 4000.
For intentional local testing, explicitly configure a reachable laptop LAN API URL.

## Hindi

Static UI copy ships with the app and does not call a translation API. Dynamic
results persist in device storage and MongoDB; identical concurrent requests are
combined within each client/server process. A cache miss, cleared device storage,
or changed text/context may trigger a request. Multiple backend replicas may still
compute a simultaneous first cache miss independently.

Profile names use display-only transliteration, preserving the stored name. Set
`BHASHINI_TRANSLITERATION_SERVICE_ID` to the English-to-Hindi transliteration
service ID returned by your Bhashini pipeline configuration, alongside
`BHASHINI_INFERENCE_API_KEY`. Do not reuse a translation model ID for this task.
If unavailable, the app retains the original name rather than translating its meaning.

External policy websites opened in the browser have their own language settings;
the mobile dictionary does not translate those websites.
