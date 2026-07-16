import { env } from "../../config/env.js";
import { OpenAiCompatibleTranscriptionProvider } from "./openAiCompatibleTranscriptionProvider.js";
import type { TranscriptionProvider } from "./types.js";

export function createTranscriptionProvider(): TranscriptionProvider | null {
  const baseUrl = env.STT_BASE_URL ?? env.OPENAI_COMPATIBLE_BASE_URL;
  const apiKey = env.STT_API_KEY ?? env.OPENAI_COMPATIBLE_API_KEY;

  if (!baseUrl || !apiKey || !env.STT_MODEL) {
    return null;
  }

  return new OpenAiCompatibleTranscriptionProvider({
    baseUrl,
    apiKey,
    model: env.STT_MODEL,
    transcriptionPath: env.STT_TRANSCRIPTION_PATH,
    requestTimeoutMs: env.STT_REQUEST_TIMEOUT_MS
  });
}
