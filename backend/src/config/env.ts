import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default("foodtruck_platform"),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev-only-change-this-secret"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  CORS_ORIGIN: z.string().default("*")
});

export const env = envSchema.parse(process.env);
