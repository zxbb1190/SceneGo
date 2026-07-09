import { ZodError } from "zod";
import type { ErrorRequestHandler } from "express";
import { AiProviderInvalidResponseError } from "../adapters/ai/types.js";
import { isApiError } from "./apiError.js";

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (isApiError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten()
      }
    });
    return;
  }

  if (isPrismaDatabaseUnavailableError(error)) {
    response.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database is not reachable. Start MySQL and run migrations before using the API."
      }
    });
    return;
  }

  if (error instanceof Error && error.message === "AI provider request timed out") {
    response.status(504).json({
      error: {
        code: "AI_PROVIDER_TIMEOUT",
        message: "AI provider request timed out. Try again or use a faster model."
      }
    });
    return;
  }

  if (error instanceof AiProviderInvalidResponseError) {
    response.status(502).json({
      error: {
        code: "AI_PROVIDER_INVALID_RESPONSE",
        message:
          "AI provider returned invalid structured JSON. Try again with shorter text or increase AI_MAX_TOKENS.",
        details: error.details
      }
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error"
    }
  });
};

function isPrismaDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown; name?: unknown };
  const message = typeof record.message === "string" ? record.message : "";

  return (
    record.code === "P1001" ||
    record.name === "PrismaClientInitializationError" ||
    message.includes("Can't reach database server")
  );
}
