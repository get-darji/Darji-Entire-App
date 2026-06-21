import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "./env.js";

let memoryServer: MongoMemoryServer | undefined;

export async function connectDatabase() {
  const uri = env.MONGODB_URI;

  if (uri) {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
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
