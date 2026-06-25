import mongoose from "mongoose";
import { env } from "./src/env.js";
import { DeliveryPartnerModel } from "./src/models.js";

async function run() {
  await mongoose.connect(env.MONGODB_URI!);
  const result = await DeliveryPartnerModel.updateMany({}, { verificationStatus: "VERIFIED" });
  console.log(`Updated ${result.modifiedCount} delivery partners to VERIFIED.`);
  process.exit(0);
}

run().catch(console.error);
