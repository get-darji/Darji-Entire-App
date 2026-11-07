import type { Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { v2 as cloudinary } from "cloudinary";
import { PromotionalBannerModel } from "../models.js";
import { AppError } from "../middleware/error.js";
import { getFestivalThemeState } from "../services/festival-theme.service.js";
import { env } from "../env.js";

const MAX_BYTES = 2 * 1024 * 1024;
const bannerImage = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: MAX_BYTES } }).single("media");
export const uploadPromotionalBannerImage = (req: Request, res: Response, next: (error?: unknown) => void) => bannerImage(req, res, (error) => {
  if (error && (error as { code?: string }).code === "LIMIT_FILE_SIZE") return next(new AppError(400, "Banner images must be 2 MB or smaller"));
  next(error);
});

function imageMetadata(buffer: Buffer) {
  if (buffer.length < 24) throw new AppError(400, "The selected file is not a valid image");
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { format: "png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1]!;
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { format: "jpeg", height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const kind = buffer.toString("ascii", 12, 16);
    if (kind === "VP8X" && buffer.length >= 30) return { format: "webp", width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (kind === "VP8 " && buffer.length >= 30) return { format: "webp", width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  throw new AppError(400, "Use a valid PNG, JPG, JPEG, or WebP image");
}

export function validatePromotionalBannerImage(buffer: Buffer, mimetype: string) {
  if (buffer.length > MAX_BYTES) throw new AppError(400, "Banner images must be 2 MB or smaller");
  const metadata = imageMetadata(buffer);
  if (!["image/png", "image/jpeg", "image/webp"].includes(mimetype) || !["png", "jpeg", "webp"].includes(metadata.format)) throw new AppError(400, "Use PNG, JPG, JPEG, or WebP images");
  if (metadata.width < 1000 || metadata.height < 400) throw new AppError(400, `Minimum image size is 1000 × 400 pixels. Selected: ${metadata.width} × ${metadata.height}`);
  if (Math.abs(metadata.width / metadata.height - 2.5) > 0.18) throw new AppError(400, `Image ratio must be close to 2.5:1. Selected: ${metadata.width} × ${metadata.height}`);
  return metadata;
}

export const promotionalBannerSchema = z.object({
  title: z.string().trim().min(1).max(120), imageUrl: z.string().url().refine((v) => /^https:\/\//i.test(v), "Use a secure image URL"),
  imagePublicId: z.string().max(240).optional().default(""), altText: z.string().trim().min(1).max(240), active: z.boolean().default(false),
  priority: z.number().int().min(1).max(10000), category: z.enum(["GENERAL", "FESTIVAL", "OFFER", "ANNOUNCEMENT"]),
  actionType: z.enum(["NONE", "SCREEN", "COUPONS", "TAILORING_REQUEST", "EXTERNAL_URL", "CONTACT"]),
  actionDestination: z.string().max(500).optional().default(""), startsAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional(),
  requiredFestivalMode: z.string().trim().max(40).optional().default("")
}).superRefine((value, ctx) => {
  if (value.actionType === "EXTERNAL_URL" && !/^https:\/\//i.test(value.actionDestination)) ctx.addIssue({ code: "custom", path: ["actionDestination"], message: "External links must use HTTPS" });
  if (value.actionType === "SCREEN" && !["search", "orders", "profile", "savedAddresses", "services", "helpCenter"].includes(value.actionDestination)) ctx.addIssue({ code: "custom", path: ["actionDestination"], message: "Choose a supported Customer App screen" });
  if (value.startsAt && value.expiresAt && new Date(value.expiresAt) <= new Date(value.startsAt)) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be after the start date" });
});

function serialize(doc: any) {
  const value = doc.toJSON();
  const now = Date.now();
  const status = !value.active ? "INACTIVE" : value.startsAt && new Date(value.startsAt).getTime() > now ? "SCHEDULED" : value.expiresAt && new Date(value.expiresAt).getTime() <= now ? "EXPIRED" : "ACTIVE";
  return { ...value, status };
}

export async function listEligiblePromotionalBannersController(_req: Request, res: Response) {
  const [theme, now] = await Promise.all([getFestivalThemeState(), Promise.resolve(new Date())]);
  const query: Record<string, unknown> = { active: true, $and: [
    { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
    { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] }
  ] };
  const docs = await PromotionalBannerModel.find(query).sort({ priority: 1, createdAt: 1 }).lean();
  const eligible = docs.filter((b) => !b.requiredFestivalMode || (theme.active && theme.themeId === b.requiredFestivalMode));
  res.json({ data: eligible.map((b) => ({ id: String(b._id), title: b.title, imageUrl: b.imageUrl, altText: b.altText, priority: b.priority, category: b.category, actionType: b.actionType, actionDestination: b.actionDestination })) });
}

export async function listAdminPromotionalBannersController(_req: Request, res: Response) {
  const docs = await PromotionalBannerModel.find().sort({ priority: 1, createdAt: 1 });
  res.json({ data: docs.map(serialize) });
}

export async function uploadPromotionalBannerImageController(req: Request, res: Response) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) throw new AppError(503, "Cloudinary is not configured on the backend");
  const file = req.file;
  if (!file) throw new AppError(400, "Select a banner image");
  const metadata = validatePromotionalBannerImage(file.buffer, file.mimetype);
  const result = await new Promise<{ secure_url: string; public_id: string; bytes: number; format: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "darji/promotional-banners", resource_type: "image", format: "webp", transformation: [{ width: 1500, height: 600, crop: "limit", quality: "auto" }] }, (error, uploaded) => error || !uploaded ? reject(error ?? new Error("Upload failed")) : resolve(uploaded));
    stream.end(file.buffer);
  });
  res.status(201).json({ data: { url: result.secure_url, publicId: result.public_id, bytes: result.bytes, format: result.format, originalName: file.originalname, width: metadata.width, height: metadata.height } });
}

export async function createPromotionalBannerController(req: Request, res: Response) {
  const input = promotionalBannerSchema.parse(req.body);
  const doc = await PromotionalBannerModel.create({ ...input, startsAt: input.startsAt ? new Date(input.startsAt) : null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, createdBy: req.user!.id, updatedBy: req.user!.id });
  res.status(201).json({ data: serialize(doc) });
}

export async function updatePromotionalBannerController(req: Request, res: Response) {
  const input = promotionalBannerSchema.parse(req.body);
  const doc = await PromotionalBannerModel.findByIdAndUpdate(String(req.params.id), { ...input, startsAt: input.startsAt ? new Date(input.startsAt) : null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, updatedBy: req.user!.id }, { new: true, runValidators: true });
  if (!doc) throw new AppError(404, "Promotional banner not found");
  res.json({ data: serialize(doc) });
}

export async function deletePromotionalBannerController(req: Request, res: Response) {
  const doc = await PromotionalBannerModel.findByIdAndDelete(String(req.params.id));
  if (!doc) throw new AppError(404, "Promotional banner not found");
  res.json({ data: { success: true } });
}

export async function reorderPromotionalBannersController(req: Request, res: Response) {
  const input = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }).parse(req.body);
  if (new Set(input.ids).size !== input.ids.length) throw new AppError(400, "Each banner must appear only once");
  const existing = await PromotionalBannerModel.countDocuments({ _id: { $in: input.ids } });
  if (existing !== input.ids.length) throw new AppError(400, "Refresh the list before changing banner order");
  await Promise.all(input.ids.map((id, index) => PromotionalBannerModel.updateOne({ _id: id }, { $set: { priority: index + 1, updatedBy: req.user!.id } })));
  const docs = await PromotionalBannerModel.find().sort({ priority: 1, createdAt: 1 });
  res.json({ data: docs.map(serialize) });
}
