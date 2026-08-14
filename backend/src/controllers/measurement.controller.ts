import type { Request, Response } from "express";
import { z } from "zod";
import { MeasurementVisitModel, TailorModel } from "../models.js";
import { AppError } from "../middleware/error.js";
import {
  assignMeasurementVisit,
  measurementVisitOtp,
  moveMeasurementVisitToPool,
  submitMeasurementVisit
} from "../services/measurement-visit.service.js";

const measurementMediaSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  resourceType: z.enum(["image", "video", "audio"]),
  bytes: z.number().nonnegative(),
  format: z.string().optional(),
  originalName: z.string().optional()
});

const submitMeasurementSchema = z.object({
  otp: z.string().trim().regex(/^\d{4}$/),
  measurement: z.object({
    label: z.string().optional(),
    fields: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    imageUrl: z.string().url().optional()
  }).optional(),
  fitPreferences: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().trim().max(2000).optional(),
  specialInstructions: z.string().trim().max(2000).optional(),
  voiceNotes: z.array(measurementMediaSchema).default([]),
  photos: z.array(measurementMediaSchema).default([])
});

const assignSchema = z.object({
  tailorId: z.string().trim().min(1)
});

const capabilitySchema = z.object({
  stitchingTailor: z.boolean().default(true),
  measurementPartner: z.boolean().default(false),
  visitPayout: z.number().nonnegative().optional(),
  serviceAreas: z.array(z.string().trim()).optional()
});

async function currentTailor(req: Request) {
  const tailor = await TailorModel.findOne({ userId: req.user!.id });
  if (!tailor) throw new AppError(404, "Tailor profile not found");
  if (tailor.verificationStatus !== "VERIFIED") throw new AppError(403, "Complete admin verification first");
  return tailor;
}

export async function listMeasurementVisitsController(req: Request, res: Response) {
  if (req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN") {
    const visits = await MeasurementVisitModel.find({}).sort({ status: 1, scheduledAt: 1, createdAt: -1 }).limit(200);
    res.json({ data: visits });
    return;
  }

  const tailor = await currentTailor(req);
  const canMeasure = Array.isArray(tailor.tailorRoles) && tailor.tailorRoles.includes("MEASUREMENT_PARTNER") && tailor.measurementPartner?.isEnabled;
  const where: Record<string, unknown> = {
    $or: [
      { offeredTailorId: tailor.id, status: "OFFERED_TO_STITCHING_TAILOR" },
      { assignedTailorId: tailor.id, status: { $in: ["ACCEPTED", "IN_PROGRESS", "SUBMITTED"] } }
    ]
  };
  if (canMeasure) {
    (where.$or as unknown[]).push({ status: "POOL", declinedTailorIds: { $ne: tailor.id } });
  }
  const visits = await MeasurementVisitModel.find(where).sort({ status: 1, scheduledAt: 1, createdAt: -1 }).limit(100);
  res.json({ data: visits });
}

export async function getMeasurementVisitOtpController(req: Request, res: Response) {
  const visit = await MeasurementVisitModel.findById(String(req.params.id));
  if (!visit) throw new AppError(404, "Measurement visit not found");
  if (req.user!.role === "CUSTOMER" && visit.customerId !== req.user!.id) throw new AppError(403, "Forbidden");
  res.json({ data: { visitId: visit.id, otp: measurementVisitOtp(visit.id), status: visit.status } });
}

export async function getMeasurementVisitOtpForRequestController(req: Request, res: Response) {
  const visit = await MeasurementVisitModel.findOne({ requestId: String(req.params.requestId) });
  if (!visit) throw new AppError(404, "Measurement visit not found");
  if (req.user!.role === "CUSTOMER" && visit.customerId !== req.user!.id) throw new AppError(403, "Forbidden");
  res.json({ data: { visitId: visit.id, requestId: visit.requestId, otp: measurementVisitOtp(visit.id), status: visit.status, scheduledAt: visit.scheduledAt } });
}

export async function acceptMeasurementVisitController(req: Request, res: Response) {
  const tailor = await currentTailor(req);
  const visit = await MeasurementVisitModel.findById(String(req.params.id));
  if (!visit) throw new AppError(404, "Measurement visit not found");
  const isOfferedTailor = visit.offeredTailorId === tailor.id;
  const isPool = visit.status === "POOL" && Array.isArray(tailor.tailorRoles) && tailor.tailorRoles.includes("MEASUREMENT_PARTNER") && tailor.measurementPartner?.isEnabled;
  if (!isOfferedTailor && !isPool) throw new AppError(403, "This measurement visit is not available to you");
  const updated = await assignMeasurementVisit(visit.id, tailor.id, req.user!.id);
  if (!updated) throw new AppError(409, "Measurement visit is no longer available");
  res.json({ data: updated });
}

export async function declineMeasurementVisitController(req: Request, res: Response) {
  const tailor = await currentTailor(req);
  const visit = await MeasurementVisitModel.findById(String(req.params.id));
  if (!visit) throw new AppError(404, "Measurement visit not found");
  if (visit.offeredTailorId !== tailor.id && visit.assignedTailorId !== tailor.id) throw new AppError(403, "This measurement visit is not assigned to you");
  const updated = await moveMeasurementVisitToPool(visit.id, tailor.id, "tailor_declined");
  res.json({ data: updated });
}

export async function submitMeasurementVisitController(req: Request, res: Response) {
  const tailor = await currentTailor(req);
  const input = submitMeasurementSchema.parse(req.body);
  try {
    const visit = await submitMeasurementVisit(String(req.params.id), tailor.id, input);
    if (!visit) throw new AppError(404, "Measurement visit not found");
    res.json({ data: visit });
  } catch (error) {
    throw new AppError(error instanceof Error && /otp/i.test(error.message) ? 400 : 409, error instanceof Error ? error.message : "Could not submit measurement visit");
  }
}

export async function adminAssignMeasurementVisitController(req: Request, res: Response) {
  const input = assignSchema.parse(req.body);
  const visit = await assignMeasurementVisit(String(req.params.id), input.tailorId, req.user!.id);
  if (!visit) throw new AppError(404, "Measurement visit not found");
  res.json({ data: visit });
}

export async function updateTailorMeasurementCapabilitiesController(req: Request, res: Response) {
  const input = capabilitySchema.parse(req.body);
  const tailor = await currentTailor(req);
  const roles = [
    input.stitchingTailor ? "STITCHING_TAILOR" : undefined,
    input.measurementPartner ? "MEASUREMENT_PARTNER" : undefined
  ].filter((role): role is string => Boolean(role));
  const updated = await TailorModel.findByIdAndUpdate(
    tailor.id,
    {
      $set: {
        tailorRoles: roles.length ? roles : ["STITCHING_TAILOR"],
        "measurementPartner.isEnabled": input.measurementPartner,
        ...(input.visitPayout != null ? { "measurementPartner.visitPayout": input.visitPayout } : {}),
        ...(input.serviceAreas ? { "measurementPartner.serviceAreas": input.serviceAreas } : {})
      }
    },
    { returnDocument: "after" }
  );
  res.json({ data: updated });
}
