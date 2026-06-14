import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default("postgresql://darzi:darzi@localhost:5432/darzi?schema=public"),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev-refresh-secret-change-me"),
  OTP_DEV_CODE: z.string().length(6).default("123456"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
