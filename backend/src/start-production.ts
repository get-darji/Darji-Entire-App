// npm start is the deployed server entrypoint. Set this before dotenv/env.ts is
// imported so missing or stale host variables cannot enable development OTPs
// or development-only startup behavior on the public service. Local development
// continues through npm run dev (src/index.ts).
process.env.NODE_ENV = "production";
await import("./index.js");

export {};
