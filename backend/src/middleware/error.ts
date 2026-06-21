import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: "Validation failed", issues: error.flatten() });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: "Videos must be 50 MB or smaller and photos must be 5 MB or smaller" });
    if (error.code === "LIMIT_FILE_COUNT") return res.status(400).json({ message: "Upload up to 6 files at a time" });
    return res.status(400).json({ message: error.message });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
}
