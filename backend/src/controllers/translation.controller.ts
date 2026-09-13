import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.js";
import { translateDynamicText } from "../services/translation.service.js";

const translateSchema = z.object({
  text: z.string().max(2000),
  sourceLanguage: z.enum(["en", "hi", "auto"]).optional().default("auto"),
  targetLanguage: z.enum(["en", "hi"]),
  context: z.string().trim().max(80).optional()
});

export async function translateController(req: Request, res: Response) {
  const input = translateSchema.parse(req.body ?? {});
  try {
    const result = await translateDynamicText(input);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Translation failed";
    if (/not configured/i.test(message)) throw new AppError(503, message);
    if (/unsupported/i.test(message)) throw new AppError(400, message);
    throw error;
  }
}
