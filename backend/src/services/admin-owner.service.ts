import { AdminAccessModel, UserModel } from "../models.js";
import { OWNER_ADMIN_EMAIL, PROTECTED_ADMIN_PHONE } from "../utils/admin-access.js";

function cleanPhone(value?: unknown) {
  const phone = String(value ?? "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(phone) ? phone : undefined;
}

function cleanEmail(value?: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return email || undefined;
}

async function migrateLegacyAdminUsers() {
  const legacyAdmins = await UserModel.find({ role: { $in: ["ADMIN", "SUPER_ADMIN"] } })
    .select("phone email name role accountStatus")
    .lean();

  for (const legacy of legacyAdmins) {
    const phone = cleanPhone(legacy.phone);
    const email = cleanEmail(legacy.email);
    if (phone === PROTECTED_ADMIN_PHONE || email === OWNER_ADMIN_EMAIL) continue;

    let access = phone ? await AdminAccessModel.findOne({ phone }) : null;
    if (!access && email) access = await AdminAccessModel.findOne({ email });
    if (!access) {
      await AdminAccessModel.create({
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
        name: legacy.name,
        role: legacy.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN",
        accountStatus: legacy.accountStatus === "BANNED" ? "BANNED" : "ACTIVE"
      });
      continue;
    }

    if (!access.phone && phone && !await AdminAccessModel.exists({ phone, _id: { $ne: access.id } })) access.phone = phone;
    if (!access.email && email && !await AdminAccessModel.exists({ email, _id: { $ne: access.id } })) access.email = email;
    if (!access.name && legacy.name) access.name = legacy.name;
    await access.save();
  }
}

/** Keeps admin authorization separate from every customer, tailor and delivery account. */
export async function ensureProtectedAdminOwner() {
  const ownerCandidates = await AdminAccessModel.find({
    $or: [{ isOwner: true }, { phone: PROTECTED_ADMIN_PHONE }, { email: OWNER_ADMIN_EMAIL }]
  }).sort({ isOwner: -1, createdAt: 1 });

  let owner = ownerCandidates[0];
  if (!owner) {
    owner = await AdminAccessModel.create({
      phone: PROTECTED_ADMIN_PHONE,
      email: OWNER_ADMIN_EMAIL,
      name: "Darji Owner",
      role: "SUPER_ADMIN",
      accountStatus: "ACTIVE",
      isOwner: true
    });
  } else {
    for (const duplicate of ownerCandidates.slice(1)) await AdminAccessModel.deleteOne({ _id: duplicate.id });
    owner.phone = PROTECTED_ADMIN_PHONE;
    owner.email = OWNER_ADMIN_EMAIL;
    owner.name = owner.name || "Darji Owner";
    owner.role = "SUPER_ADMIN";
    owner.accountStatus = "ACTIVE";
    owner.isOwner = true;
    await owner.save();
  }

  await migrateLegacyAdminUsers();
  console.info("[admin-access] Independent owner and legacy admin access are configured");
}
