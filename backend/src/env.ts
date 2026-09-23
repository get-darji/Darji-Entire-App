import "dotenv/config";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false", "1", "0", "yes", "no", "on", "off"])
  .transform((value) => ["true", "1", "yes", "on"].includes(value));

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev-refresh-secret-change-me"),
  OTP_DEV_CODE: z.string().length(6).default("123456"),
  OTP_DEV_FALLBACK_ENABLED: booleanString.default(true),
  TWOFACTOR_ENABLED: booleanString.default(false),
  TWOFACTOR_API_KEY: z.string().optional(),
  TWOFACTOR_TEMPLATE_NAME: z.string().default("DARJI_OTP"),
  TWOFACTOR_API_BASE_URL: z.string().url().default("https://2factor.in"),
  TWOFACTOR_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  ADMIN_ALLOWED_PHONES: z.string().default("9999999999"),
  AUTO_SEED: z.coerce.boolean().default(false),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  FCM_SERVICE_ACCOUNT_JSON: z.string().optional(),
  ALERT_EMAIL_WEBHOOK_URL: z.string().url().optional(),
  ADMIN_ALERT_EMAILS: z.string().optional(),
  NO_QUOTE_ALERT_MINUTES: z.coerce.number().default(2),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  BHASHINI_INFERENCE_API_KEY: z.string().optional(),
  BHASHINI_TRANSLATION_SERVICE_ID: z.string().default("ai4bharat/indictrans-v2-all-gpu--t4"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  ENFORCE_CLIENT_CHECKOUT_TOTALS: z.coerce.boolean().default(false),
  CORS_ALLOWED_ORIGINS: z.string().optional()
});

export const env = envSchema.parse(process.env);
