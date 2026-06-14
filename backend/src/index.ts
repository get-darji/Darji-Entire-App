import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { router } from "./routes/index.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use("/api", router);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`Darzi backend running on http://localhost:${env.PORT}/api`);
});

process.on("SIGINT", async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});
