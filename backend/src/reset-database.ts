import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "./db.js";
import {
  AddressModel,
  CouponModel,
  DeliveryBatchModel,
  DeliveryPartnerModel,
  DeliveryRequestModel,
  NotificationModel,
  OrderModel,
  OtpRequestModel,
  PaymentModel,
  ReviewModel,
  ServiceCategoryModel,
  ServiceModel,
  SettingModel,
  SupportTicketModel,
  TailorModel,
  TailorQuoteModel,
  TailoringRequestModel,
  TransactionModel,
  UserModel,
  WalletModel
} from "./models.js";

type ResetModel = {
  collection: { name: string };
  deleteMany: (filter: Record<string, never>) => Promise<{ deletedCount?: number }>;
};

const models = [
  AddressModel,
  CouponModel,
  DeliveryBatchModel,
  DeliveryPartnerModel,
  DeliveryRequestModel,
  NotificationModel,
  OrderModel,
  OtpRequestModel,
  PaymentModel,
  ReviewModel,
  ServiceCategoryModel,
  ServiceModel,
  SettingModel,
  SupportTicketModel,
  TailorModel,
  TailorQuoteModel,
  TailoringRequestModel,
  TransactionModel,
  UserModel,
  WalletModel
] as unknown as ResetModel[];

await connectDatabase();

try {
  const results = await Promise.all(models.map(async (model) => [model.collection.name, await model.deleteMany({})] as const));
  console.log(
    Object.fromEntries(results.map(([name, result]) => [name, result.deletedCount]))
  );
} finally {
  await disconnectDatabase();
}
