import type { Request, Response } from "express";
import { z } from "zod";
import { authorizeOtpDeliveryCallback, deliveryStatuses, getOtpDeliveryCallbackSetup, getOtpDeliveryHistory, otpPeriods, receiveOtpDeliveryCallback } from "../services/otp-delivery.service.js";

export async function otpDeliveryCallbackController(req: Request, res: Response) {
  authorizeOtpDeliveryCallback(req.query.token);
  await receiveOtpDeliveryCallback(req.body ?? {});
  res.sendStatus(204);
}

export async function otpDeliveryHistoryController(req: Request, res: Response) {
  const query = z.object({ phone: z.string().regex(/^\d{1,10}$/).optional(), status: z.enum(deliveryStatuses).optional(), period: z.enum(otpPeriods).optional(), page: z.coerce.number().int().min(1).max(100000).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional() }).parse(req.query);
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: await getOtpDeliveryHistory(query.phone, query.status, query) });
}

export function otpDeliveryCallbackSetupController(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: getOtpDeliveryCallbackSetup() });
}
