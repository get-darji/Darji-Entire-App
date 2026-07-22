import type { Request, Response } from "express";
import { z } from "zod";
import { LaunchRequestModel, ServiceAreaModel, UserModel } from "../models.js";
import { AppError } from "../middleware/error.js";
import { checkServiceArea, launchRequestLocationKey, serializeServiceArea } from "../services/service-area.service.js";

const pointSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const serviceAreaInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  isActive: z.boolean().default(true),
  polygon: z.array(pointSchema).min(3).max(500),
  edgeToleranceMeters: z.number().min(0).max(5000).default(100)
});
const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  areaLabel: z.string().trim().max(160).optional()
});

function databasePolygon(polygon: Array<[number, number]>) {
  return polygon.map(([longitude, latitude]) => ({ longitude, latitude }));
}

export async function listServiceAreasController(_req: Request, res: Response) {
  const areas = await ServiceAreaModel.find().sort({ isActive: -1, name: 1 });
  res.json({ data: areas.map(serializeServiceArea) });
}

export async function createServiceAreaController(req: Request, res: Response) {
  const input = serviceAreaInputSchema.parse(req.body);
  try {
    const area = await ServiceAreaModel.create({
      ...input,
      polygon: databasePolygon(input.polygon),
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    });
    res.status(201).json({ data: serializeServiceArea(area) });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new AppError(409, "A service area with this name already exists");
    }
    throw error;
  }
}

export async function updateServiceAreaController(req: Request, res: Response) {
  const input = serviceAreaInputSchema.parse(req.body);
  const area = await ServiceAreaModel.findByIdAndUpdate(
    String(req.params.id),
    { ...input, polygon: databasePolygon(input.polygon), updatedBy: req.user!.id },
    { returnDocument: "after", runValidators: true }
  );
  if (!area) throw new AppError(404, "Service area not found");
  res.json({ data: serializeServiceArea(area) });
}

export async function deleteServiceAreaController(req: Request, res: Response) {
  const area = await ServiceAreaModel.findByIdAndDelete(String(req.params.id));
  if (!area) throw new AppError(404, "Service area not found");
  res.json({ data: { deleted: true, id: area.id } });
}

export async function checkServiceAreaController(req: Request, res: Response) {
  const input = locationSchema.parse(req.body);
  const serviceArea = await checkServiceArea(input.latitude, input.longitude);
  res.json({ data: { available: Boolean(serviceArea), serviceArea, checkedAt: new Date().toISOString() } });
}

export async function createLaunchRequestController(req: Request, res: Response) {
  const input = locationSchema.parse(req.body);
  const user = await UserModel.findById(req.user!.id).select("phone role").lean();
  if (!user) throw new AppError(401, "Authentication required");
  const locationKey = launchRequestLocationKey(input.latitude, input.longitude);
  const request = await LaunchRequestModel.findOneAndUpdate(
    { userId: req.user!.id, locationKey },
    {
      userId: req.user!.id,
      phone: user.phone,
      role: user.role,
      latitude: input.latitude,
      longitude: input.longitude,
      areaLabel: input.areaLabel || undefined,
      locationKey,
      lastRequestedAt: new Date()
    },
    { upsert: true, returnDocument: "after" }
  );
  res.status(201).json({ data: request, message: "We'll notify you when Darji launches in your area." });
}

export async function listLaunchRequestsController(_req: Request, res: Response) {
  const [requests, grouped] = await Promise.all([
    LaunchRequestModel.find().sort({ lastRequestedAt: -1 }).limit(1000),
    LaunchRequestModel.aggregate<{ _id: string; count: number; latestRequestAt: Date; areaLabel?: string }>([
      { $group: { _id: "$locationKey", count: { $sum: 1 }, latestRequestAt: { $max: "$lastRequestedAt" }, areaLabel: { $first: "$areaLabel" } } },
      { $sort: { count: -1, latestRequestAt: -1 } }
    ])
  ]);
  res.json({ data: { requests, grouped } });
}
