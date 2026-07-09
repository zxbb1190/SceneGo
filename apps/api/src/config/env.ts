import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: path.resolve(process.cwd(), "../../.env") });
loadDotenv();

const optionalBooleanEnvSchema = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    if (value === "true" || value === "1") {
      return true;
    }

    if (value === "false" || value === "0") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const optionalPositiveIntEnvSchema = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  return value;
}, z.coerce.number().int().positive().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5174"),
  DATABASE_URL: z.string().default("mysql://scenego:password@localhost:3306/scenego"),
  JWT_SECRET: z.string().default("change-me-in-local-env"),
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional(),
  OPENAI_COMPATIBLE_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_ENABLE_THINKING: optionalBooleanEnvSchema,
  AI_RESPONSE_FORMAT: z.enum(["json_object"]).optional(),
  AI_MAX_TOKENS: optionalPositiveIntEnvSchema,
  AI_REQUEST_TIMEOUT_MS: optionalPositiveIntEnvSchema.default(60_000)
});

export const env = envSchema.parse(process.env);

process.env.DATABASE_URL = env.DATABASE_URL;
