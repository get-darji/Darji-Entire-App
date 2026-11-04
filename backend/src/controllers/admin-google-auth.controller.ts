import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.js";
import { completeAdminGoogleSignIn, createAdminGoogleAuthorizationUrl } from "../services/admin-google-auth.service.js";

export function startAdminGoogleSignInController(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: { authorizationUrl: createAdminGoogleAuthorizationUrl() } });
}

export async function completeAdminGoogleSignInController(req: Request, res: Response) {
  const input = z.object({ code: z.string().min(1).max(4096), state: z.string().min(1).max(4096) }).strict().safeParse(req.body);
  if (!input.success) throw new AppError(400, "Google sign-in response is incomplete");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({ data: await completeAdminGoogleSignIn(input.data.code, input.data.state, req) });
}
