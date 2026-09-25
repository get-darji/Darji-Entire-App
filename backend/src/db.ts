import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "./env.js";

let memoryServer: MongoMemoryServer | undefined;

export async function connectDatabase() {
  const uri = env.MONGODB_URI;

  if (uri) {
    await mongoose.connect(uri, env.MONGODB_DB_NAME ? { dbName: env.MONGODB_DB_NAME } : undefined);
    console.log(`MongoDB connected to ${mongoose.connection.name}`);
    if (mongoose.connection.name === "test") {
      console.warn("MongoDB is using the shared 'test' database. Set MONGODB_DB_NAME to an isolated Darji database after migrating existing data.");
    }
    return;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI is required in production. Refusing to start with mongodb-memory-server.");
  }

  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  console.log("MongoDB memory server connected. Data resets when backend stops.");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}
