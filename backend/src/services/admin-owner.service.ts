import { UserModel } from "../models.js";
import { OWNER_ADMIN_EMAIL, PROTECTED_ADMIN_PHONE } from "../utils/admin-access.js";

const PREVIOUS_PROTECTED_ADMIN_PHONE = "9971416471";

/** Reassert the protected owner identity on every persistent database startup. */
export async function ensureProtectedAdminOwner() {
  const emailPattern = OWNER_ADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const emailOwners = await UserModel.find({ email: { $regex: `^${emailPattern}$`, $options: "i" } });
  for (const emailOwner of emailOwners) {
    if (emailOwner.phone === PROTECTED_ADMIN_PHONE) continue;
    emailOwner.email = undefined;
    await emailOwner.save();
  }

  const owner = await UserModel.findOneAndUpdate(
    { phone: PROTECTED_ADMIN_PHONE },
    {
      $set: { role: "SUPER_ADMIN", email: OWNER_ADMIN_EMAIL, accountStatus: "ACTIVE" },
      $unset: { suspendedUntil: 1, moderationReason: 1, moderatedAt: 1 },
      $setOnInsert: { phone: PROTECTED_ADMIN_PHONE, name: "Darji Admin" }
    },
    { upsert: true, returnDocument: "after" }
  );
  if (!owner) throw new Error("Could not ensure the protected Darji owner account.");

  await UserModel.updateOne(
    { phone: PREVIOUS_PROTECTED_ADMIN_PHONE, role: "SUPER_ADMIN" },
    { $set: { role: "ADMIN" } }
  );

  console.info("[admin-access] Protected owner account is configured");
}
