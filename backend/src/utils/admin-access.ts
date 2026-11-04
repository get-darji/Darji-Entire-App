export const PROTECTED_ADMIN_PHONE = "9625917902";
export const OWNER_ADMIN_EMAIL = "amankumarschool7@gmail.com";

export function nonAdminLoginUpdate(phone: string, role: string) {
  // A mobile-app login must not overwrite the owner's persisted admin access.
  return phone === PROTECTED_ADMIN_PHONE
    ? { $setOnInsert: { phone, role } }
    : { $set: { role }, $setOnInsert: { phone } };
}

export function adminInviteRole(phone: string, existingRole?: string) {
  return phone === PROTECTED_ADMIN_PHONE || existingRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
}
