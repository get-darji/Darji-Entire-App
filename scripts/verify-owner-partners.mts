import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import mongoose from "mongoose";
import { UserModel, TailorModel, DeliveryPartnerModel } from "../backend/src/models.ts";

const config = parse(readFileSync(new URL("../backend/.env", import.meta.url)));
const apply = process.argv.includes("--apply");
const databases = process.argv.filter((arg) => arg === "darji" || arg === "darji_dev");
if (!config.MONGODB_URI || !databases.length) throw new Error("Database configuration and explicit database names required");

try {
  for (const dbName of new Set(databases)) {
    await mongoose.connect(config.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 12000 });
    const user = await UserModel.findOne({ phone: "9971416471" });
    if (!user || user.role !== "SUPER_ADMIN" || user.accountStatus !== "ACTIVE") throw new Error("Expected active protected owner account");
    for (const [kind, Model] of [["tailor", TailorModel], ["delivery", DeliveryPartnerModel]] as const) {
      const profile = await (Model as typeof TailorModel).findOne({ userId: user.id });
      if (apply) {
        const record = profile ?? (kind === "tailor"
          ? new TailorModel({ userId: user.id, shopName: user.name ? `${user.name}'s Studio` : "Darji Tailor", isAvailable: false })
          : new DeliveryPartnerModel({ userId: user.id, isAvailable: false }));
        // Manual owner approval, not a claim that identity documents were checked.
        record.verificationStatus = "VERIFIED";
        record.verificationReviewedAt = new Date();
        record.verificationRejectionReason = undefined;
        if (kind === "tailor") {
          record.set("verificationReuploadFields", []);
          record.set("verificationRejectedUntil", undefined);
        }
        await record.save();
      }
      const verified = await (Model as typeof TailorModel).findOne({ userId: user.id }).lean();
      console.log(JSON.stringify({ database: dbName, kind, applied: apply, status: verified?.verificationStatus, profileId: verified?._id }));
    }
    const unchanged = await UserModel.findById(user.id);
    if (unchanged?.role !== "SUPER_ADMIN") throw new Error("Owner role changed unexpectedly");
    console.log(JSON.stringify({ database: dbName, ownerRole: unchanged.role }));
    await mongoose.disconnect();
  }
} finally {
  await mongoose.disconnect();
}
