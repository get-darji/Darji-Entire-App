import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "./env.js";
import { migrateRoleScopedWallets } from "./migrations/role-scoped-wallets.js";

let memoryServer: MongoMemoryServer | undefined;

export async function connectDatabase() {
  const uri = env.MONGODB_URI;

  if (uri) {
    await mongoose.connect(uri, env.MONGODB_DB_NAME ? { dbName: env.MONGODB_DB_NAME } : undefined);
    await migrateRoleScopedWallets();
    console.log(`MongoDB connected to ${mongoose.connection.name}`);
    if (mongoose.connection.name === "test") {
      console.warn("MongoDB is using the shared 'test' database. Set MONGODB_DB_NAME to an isolated Darji database after migrating existing data.");
    }
    return;
  }

  const isRailwayRuntime = Boolean(
    process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID
  );
  if (env.NODE_ENV === "production" || isRailwayRuntime) {
    throw new Error("MONGODB_URI is required in hosted or production environments. Refusing to start with mongodb-memory-server.");
  }

  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  await migrateRoleScopedWallets();
  console.log("MongoDB memory server connected. Data resets when backend stops.");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}
