import { UserModel } from "../models.js";
import { OWNER_ADMIN_EMAIL, PROTECTED_ADMIN_PHONE } from "../utils/admin-access.js";

const PREVIOUS_PROTECTED_ADMIN_PHONE = "9971416471";

export async function releaseOwnerEmailFromOtherAccounts(ownerUserId: string) {
  const emailPattern = OWNER_ADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const conflictingAccounts = await UserModel.find({
    email: { $regex: `^${emailPattern}$`, $options: "i" },
    _id: { $ne: ownerUserId }
  });
  for (const account of conflictingAccounts) {
    account.email = undefined;
    await account.save();
  }
}

/** Reassert the protected owner identity on every persistent database startup. */
export async function ensureProtectedAdminOwner() {
  const owner = await UserModel.findOneAndUpdate(
    { phone: PROTECTED_ADMIN_PHONE },
    {
      $set: { role: "SUPER_ADMIN", accountStatus: "ACTIVE" },
      $unset: { suspendedUntil: 1, moderationReason: 1, moderatedAt: 1 },
      $setOnInsert: { phone: PROTECTED_ADMIN_PHONE, name: "Darji Admin" }
    },
    { upsert: true, returnDocument: "after" }
  );
  if (!owner) throw new Error("Could not ensure the protected Darji owner account.");
  await releaseOwnerEmailFromOtherAccounts(owner.id);
  owner.email = OWNER_ADMIN_EMAIL;
  await owner.save();

  await UserModel.updateOne(
    { phone: PREVIOUS_PROTECTED_ADMIN_PHONE, role: "SUPER_ADMIN" },
    { $set: { role: "ADMIN" } }
  );

  console.info("[admin-access] Protected owner account is configured");
}
