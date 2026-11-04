import type { Request, Response } from "express";
import { z } from "zod";
import { AdminAccessModel, UserModel } from "../models.js";
import { AppError } from "../middleware/error.js";
import {
  normalizeAdminEmail,
  normalizeAdminPhone,
  requireOwnerAdminAccess,
  serializeAdminAccess
} from "../services/admin-access.service.js";
import { OWNER_ADMIN_EMAIL, PROTECTED_ADMIN_PHONE } from "../utils/admin-access.js";

export async function listAdminAccessController(_req: Request, res: Response) {
  const rows = await AdminAccessModel.find().sort({ isOwner: -1, createdAt: 1 });
  res.json({ data: rows.map(serializeAdminAccess) });
}

export async function createAdminAccessController(req: Request, res: Response) {
  await requireOwnerAdminAccess(req.user!.id);
  const input = z.object({
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().max(254).optional(),
    name: z.string().trim().min(2).max(100).optional()
  }).strict().parse(req.body ?? {});
  const phone = normalizeAdminPhone(input.phone);
  const email = normalizeAdminEmail(input.email);
  if (!phone && !email) throw new AppError(400, "Enter a valid phone number or email address");
  if (phone === PROTECTED_ADMIN_PHONE || email === OWNER_ADMIN_EMAIL) {
    const owner = await AdminAccessModel.findOne({ isOwner: true });
    if (!owner) throw new AppError(503, "Owner admin access is not configured");
    return res.json({ data: serializeAdminAccess(owner), message: "Owner access is already protected" });
  }

  const phoneMatch = phone ? await AdminAccessModel.findOne({ phone }) : null;
  const emailMatch = email ? await AdminAccessModel.findOne({ email }) : null;
  if (phoneMatch && emailMatch && phoneMatch.id !== emailMatch.id) {
    throw new AppError(409, "That phone number and email belong to separate admin access entries");
  }
  let access = phoneMatch ?? emailMatch;
  if (!access) {
    const userMatches: Array<{ phone: string } | { email: string }> = [];
    if (phone) userMatches.push({ phone });
    if (email) userMatches.push({ email });
    const matchingUser = await UserModel.findOne({ $or: userMatches }).select("name customerName").lean();
    access = await AdminAccessModel.create({
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      name: input.name || matchingUser?.customerName || matchingUser?.name,
      role: "ADMIN",
      accountStatus: "ACTIVE"
    });
  } else {
    if (access.isOwner) throw new AppError(409, "Owner access cannot be changed");
    if (phone) access.phone = phone;
    if (email) access.email = email;
    if (input.name) access.name = input.name;
    access.accountStatus = "ACTIVE";
    await access.save();
  }
  res.status(201).json({ data: serializeAdminAccess(access), message: "Full admin access granted" });
}

export async function deleteAdminAccessController(req: Request, res: Response) {
  await requireOwnerAdminAccess(req.user!.id);
  const target = await AdminAccessModel.findById(String(req.params.id));
  if (!target) throw new AppError(404, "Admin access entry not found");
  if (target.isOwner || target.phone === PROTECTED_ADMIN_PHONE || target.email === OWNER_ADMIN_EMAIL) {
    throw new AppError(400, "Owner admin access cannot be removed");
  }
  if (target.id === req.user!.id) throw new AppError(400, "You cannot remove your current admin access");
  await target.deleteOne();
  res.json({ data: { id: target.id } });
}
