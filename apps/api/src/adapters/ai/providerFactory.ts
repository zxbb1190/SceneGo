import { env } from "../../config/env.js";
import { OpenAiCompatibleProvider } from "./openAiCompatibleProvider.js";
import type { AiProvider } from "./types.js";

export function createAiProvider(): AiProvider | null {
  if (!env.OPENAI_COMPATIBLE_BASE_URL || !env.OPENAI_COMPATIBLE_API_KEY || !env.AI_MODEL) {
    return null;
  }

  return new OpenAiCompatibleProvider({
    baseUrl: env.OPENAI_COMPATIBLE_BASE_URL,
    apiKey: env.OPENAI_COMPATIBLE_API_KEY,
    model: env.AI_MODEL,
    enableThinking: env.AI_ENABLE_THINKING,
    responseFormat: env.AI_RESPONSE_FORMAT,
    maxTokens: env.AI_MAX_TOKENS,
    requestTimeoutMs: env.AI_REQUEST_TIMEOUT_MS
  });
}
