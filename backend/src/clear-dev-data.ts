import { connectDatabase, disconnectDatabase } from "./db.js";
import {
  DeliveryBatchModel,
  DeliveryRequestModel,
  NotificationModel,
  OrderModel,
  PaymentModel,
  ReviewModel,
  SupportTicketModel,
  TailorQuoteModel,
  TailoringRequestModel,
  TransactionModel
} from "./models.js";

const modelsToClear = [
  DeliveryBatchModel.collection,
  DeliveryRequestModel.collection,
  TailorQuoteModel.collection,
  TailoringRequestModel.collection,
  OrderModel.collection,
  PaymentModel.collection,
  NotificationModel.collection,
  ReviewModel.collection,
  SupportTicketModel.collection,
  TransactionModel.collection
];

await connectDatabase();

try {
  for (const collection of modelsToClear) {
    const result = await collection.deleteMany({});
    console.log(`${collection.collectionName}: ${result.deletedCount}`);
  }
} finally {
  await disconnectDatabase();
}
