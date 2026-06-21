# Darzi Ecosystem

Monorepo for the Darzi customer app, tailor app, delivery partner app, admin panel, shared contracts, and backend API.

## Projects

- `backend` - Express, Mongoose, MongoDB, JWT, OTP auth, role protected REST APIs.
- `shared` - shared roles, order statuses, Zod validation, service catalog types.
- `apps/customer-app` - Expo React Native customer ordering app.
- `apps/tailor-app` - Expo React Native tailor dashboard app.
- `apps/delivery-app` - Expo React Native delivery partner app.
- `apps/admin-panel` - Next.js 16 admin panel.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Optional: set a MongoDB connection string in `backend/.env`:

   ```bash
   MONGODB_URI="mongodb+srv://..."
   ```

   If `MONGODB_URI` is empty, the backend starts an in-memory MongoDB automatically for local testing. Data resets when the backend stops.

3. Start the backend:

   ```bash
   npm run dev:backend
   ```

4. Start the admin panel:

   ```bash
   npm run dev:admin
   ```

5. Start a mobile app:

   ```bash
   npm --workspace @darzi/customer-app run start
   npm --workspace @darzi/tailor-app run start
   npm --workspace @darzi/delivery-app run start
   ```

## Test Accounts

The seed script creates these phone numbers. In local development the OTP is `123456`.

- Admin: `9999999999`
- Customer: `9876543210`
- Tailor: `9876500001`
- Delivery partner: `9876500002`

## Android Builds

Each Expo app has Android package IDs and EAS profiles configured.

```bash
npm --workspace @darzi/customer-app run apk
npm --workspace @darzi/customer-app run aab
npm --workspace @darzi/tailor-app run apk
npm --workspace @darzi/tailor-app run aab
npm --workspace @darzi/delivery-app run apk
npm --workspace @darzi/delivery-app run aab
```

APK/AAB generation requires EAS authentication and a configured Android build environment. Local `expo run:android` requires Android Studio, SDK, and an emulator or device.

## Verification

The current workspace passes:

```bash
npm --workspace backend run typecheck
npm run typecheck
npm run build
npm --workspace @darzi/customer-app exec -- expo config --type public
npm --workspace @darzi/tailor-app exec -- expo config --type public
npm --workspace @darzi/delivery-app exec -- expo config --type public
```

The backend auto-seeds service catalog and test users on startup. For persistent data, use MongoDB Atlas and set `MONGODB_URI`.
