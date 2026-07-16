import express, { Router } from "express";
import { createTranscriptionProvider } from "../adapters/transcription/providerFactory.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";

const supportedAudioTypes = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/octet-stream"
]);

export function createAudioRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.post(
    "/transcriptions",
    express.raw({ type: ["audio/*", "application/octet-stream"], limit: env.STT_MAX_AUDIO_BYTES }),
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const mimeType = normalizeMimeType(request.header("Content-Type"));

      if (!supportedAudioTypes.has(mimeType)) {
        throw new ApiError(415, "AUDIO_TYPE_UNSUPPORTED", "This audio format is not supported.");
      }

      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        throw new ApiError(400, "AUDIO_REQUIRED", "An audio recording is required.");
      }

      const provider = createTranscriptionProvider();
      if (!provider) {
        throw new ApiError(
          503,
          "STT_PROVIDER_NOT_CONFIGURED",
          "Speech transcription is not configured. Set STT_MODEL and provider credentials."
        );
      }

      const result = await provider.transcribe({
        audio: new Uint8Array(request.body),
        mimeType,
        fileName: sanitizeFileName(request.header("X-Audio-Filename"), mimeType)
      });

      await prisma.aiUsageLog.create({
        data: {
          userId,
          actionType: "audio_transcription",
          modelName: result.modelName
        }
      });

      response.json(result);
    })
  );

  return router;
}

function normalizeMimeType(contentType: string | undefined): string {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() || "application/octet-stream";
}

function sanitizeFileName(value: string | undefined, mimeType: string): string {
  const sanitized = value?.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return sanitized || `scenego-recording.${getAudioExtension(mimeType)}`;
}

function getAudioExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg"
  };
  return extensions[mimeType] ?? "webm";
}
