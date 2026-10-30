import type { Request, Response } from "express";
import { getTailorActivity } from "../services/tailor-activity.service.js";
import { MeasurementVisitModel } from "../models.js";
import { AppError } from "../middleware/error.js";

export async function tailorActivityController(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: await getTailorActivity(String(req.params.id)) });
}

export async function adminMeasurementVisitDetailController(req: Request, res: Response) {
  const visit = await MeasurementVisitModel.findById(String(req.params.id));
  if (!visit) throw new AppError(404, "Measurement visit not found");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: visit });
}
