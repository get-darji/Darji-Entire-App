import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { connectDatabase, disconnectDatabase } from "./db.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { router } from "./routes/index.js";
import { seedDatabase } from "./seed.js";
import { initFirebaseAdmin } from "./services/push.service.js";
import { backfillDarjiIds } from "./models.js";
import { setupSocketServer } from "./services/socket.service.js";
import { lockAndDispatchDueBatches } from "./services/hybrid-delivery.service.js";
import { getPlatformStatus } from "./services/platform-status.service.js";
import { monitorNoQuoteRequests } from "./services/operational-alert.service.js";
import { processDueNotificationCampaigns } from "./controllers/notificationController.js";

const app = express();
const configuredOrigins = new Set((env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
if (env.NODE_ENV !== "production") {
  ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"].forEach((origin) => configuredOrigins.add(origin));
}

app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || configuredOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  }
}));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use("/api", router);
app.use(notFound);
app.use(errorHandler);

await connectDatabase();
if (env.AUTO_SEED || env.NODE_ENV !== "production") {
  await seedDatabase();
}
await backfillDarjiIds();
initFirebaseAdmin();

async function processDueDeliveryBatches() {
  const platformStatus = await getPlatformStatus();
  if (platformStatus.maintenanceMode) return;
  await lockAndDispatchDueBatches();
  await monitorNoQuoteRequests();
  await processDueNotificationCampaigns();
}

const batchLockTimer = setInterval(() => {
  void processDueDeliveryBatches().catch((error) => {
    console.error("Failed to process due delivery batches", error);
  });
}, 60 * 1000);
batchLockTimer.unref?.();

void processDueDeliveryBatches().catch((error) => {
  console.error("Failed to process due delivery batches", error);
});

const server = app.listen(env.PORT, () => {
  console.log(`Darji backend running on port ${env.PORT}`);
});
setupSocketServer(server);

process.on("SIGINT", async () => {
  clearInterval(batchLockTimer);
  server.close();
  await disconnectDatabase();
  process.exit(0);
});
