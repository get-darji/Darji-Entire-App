import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  OrderModel,
  PaymentModel,
  TransactionModel,
  TailoringRequestModel,
  TailorQuoteModel,
  DeliveryRequestModel,
  DeliveryBatchModel
} from "./src/models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function wipeOrders() {
  try {
    console.log("Connecting to MongoDB...");
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI not found in environment variables");
    }
    
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    console.log("Wiping Order collections...");
    
    await OrderModel.deleteMany({});
    console.log("Cleared OrderModel");
    
    await PaymentModel.deleteMany({});
    console.log("Cleared PaymentModel");
    
    await TransactionModel.deleteMany({});
    console.log("Cleared TransactionModel");
    
    await TailoringRequestModel.deleteMany({});
    console.log("Cleared TailoringRequestModel");
    
    await TailorQuoteModel.deleteMany({});
    console.log("Cleared TailorQuoteModel");
    
    await DeliveryRequestModel.deleteMany({});
    console.log("Cleared DeliveryRequestModel");
    
    await DeliveryBatchModel.deleteMany({});
    console.log("Cleared DeliveryBatchModel");

    console.log("Successfully wiped all orders!");
    process.exit(0);
  } catch (error) {
    console.error("Error wiping orders:", error);
    process.exit(1);
  }
}

wipeOrders();
