import "dotenv/config";
import { serviceCatalog } from "@darzi/shared";
import { connectDatabase, disconnectDatabase } from "./db.js";
import {
  AddressModel,
  CouponModel,
  DeliveryPartnerModel,
  ServiceCategoryModel,
  ServiceModel,
  SettingModel,
  TailorModel,
  UserModel,
  WalletModel,
 } from "./models.js";

async function upsertUser(phone: string, data: { name: string; role: string }) {
  const user = await UserModel.findOneAndUpdate({ phone }, { $set: data, $setOnInsert: { phone } }, { upsert: true, returnDocument: "after" });
  await WalletModel.updateOne({ userId: user.id }, { $setOnInsert: { userId: user.id, balance: 0 } }, { upsert: true });
  return user;
}

export async function seedDatabase() {
  const admin = await upsertUser("9999999999", { name: "Darzi Admin", role: "ADMIN" });
  const customer = await upsertUser("9876543210", { name: "Aarav Sharma", role: "CUSTOMER" });
  const tailorUser = await upsertUser("9876500001", { name: "Imran Khan", role: "TAILOR" });
  const deliveryUser = await upsertUser("9876500002", { name: "Rohit Verma", role: "DELIVERY_PARTNER" });

  const tailor = await TailorModel.findOneAndUpdate(
    { userId: tailorUser.id },
    {
      $setOnInsert: {
        userId: tailorUser.id,
        shopName: "Perfect Fit Studio",
        specialization: ["Shirt", "Suit", "Blouse"],
        workingHours: { from: "10:00", to: "20:00" }
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  const deliveryPartner = await DeliveryPartnerModel.findOneAndUpdate(
    { userId: deliveryUser.id },
    { $setOnInsert: { userId: deliveryUser.id, vehicleNumber: "DL01AB1234" } },
    { upsert: true, returnDocument: "after" }
  );

  for (const category of serviceCatalog) {
    const savedCategory = await ServiceCategoryModel.findOneAndUpdate(
      { name: category.category },
      { $setOnInsert: { name: category.category, imageUrl: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=80" } },
      { upsert: true, returnDocument: "after" }
    );

    for (const [name, price, estimatedDelivery, description] of category.items) {
      await ServiceModel.findOneAndUpdate(
        { categoryId: savedCategory.id, name },
        {
          categoryId: savedCategory.id,
          name,
          price,
          estimatedDelivery,
          description,
          imageUrl: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=900&q=80",
          isActive: true
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  }

  const address = await AddressModel.findOneAndUpdate(
    { _id: "seed-address-delhi" },
    {
      _id: "seed-address-delhi",
      userId: customer.id,
      name: "Aarav Sharma",
      phone: customer.phone,
      line1: "B-42, Connaught Place",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110001",
      landmark: "Near Metro Gate 4",
      isDefault: true
    },
    { upsert: true, returnDocument: "after" }
  );

  await CouponModel.findOneAndUpdate(
    { code: "DARZI100" },
    {
      $setOnInsert: {
        code: "DARZI100",
        description: "Rs 100 off on first order",
        discountType: "FLAT",
        discountValue: 100,
        minOrderValue: 499,
        isActive: true
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  await SettingModel.findOneAndUpdate(
    { key: "platform" },
    { key: "platform", value: { supportPhone: "1800-000-000", pickupFee: 49, deliveryFee: 49, commissionPercent: 15 } },
    { upsert: true }
  );
  await SettingModel.findOneAndUpdate(
    { key: "delivery_rounds" },
    {
      key: "delivery_rounds",
      value: [
        { name: "ONE_PM", time: "13:00" },
        { name: "SIX_PM", time: "18:00" }
      ]
    },
    { upsert: true }
  );

  await SettingModel.findOneAndUpdate(
    { key: "enable_area_filtering" },
    {
      key: "enable_area_filtering",
      value: false
    },
    { upsert: true }
  );

  // Migrate existing data to assign IDs if missing
  const usersWithoutId = await UserModel.find({ darjiCustomerId: { $exists: false } });
  for (const user of usersWithoutId) {
    await user.save();
  }

  const partnersWithoutId = await DeliveryPartnerModel.find({ darjiPartnerId: { $exists: false } });
  for (const partner of partnersWithoutId) {
    await partner.save();
  }

  const tailorsWithoutId = await TailorModel.find({ darjiTailorId: { $exists: false } });
  for (const tailor of tailorsWithoutId) {
    await tailor.save();
  }

  console.log({ admin: admin.phone, customer: customer.phone, tailor: tailorUser.phone, delivery: deliveryUser.phone });
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  await connectDatabase();
  await seedDatabase();
  await disconnectDatabase();
}

