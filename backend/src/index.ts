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
import { setupSocketServer } from "./services/socket.service.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use("/api", router);
app.use(notFound);
app.use(errorHandler);

await connectDatabase();
if (env.AUTO_SEED || env.NODE_ENV !== "production") {
  await seedDatabase();
}
initFirebaseAdmin();

const server = app.listen(env.PORT, () => {
  console.log(`Darzi backend running on port ${env.PORT}`);
});
setupSocketServer(server);

process.on("SIGINT", async () => {
  server.close();
  await disconnectDatabase();
  process.exit(0);
});
