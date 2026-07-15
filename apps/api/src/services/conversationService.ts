import type { ConversationTurn } from "@scenego/shared";
import { createAiProvider } from "../adapters/ai/providerFactory.js";
import type { AiStreamCallbacks } from "../adapters/ai/types.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { hashStudyText, normalizeStudyText, sanitizeTags } from "./textAnalysisService.js";

export interface ClassifyConversationInput {
  userId: string;
  message: string;
  language?: string;
  history?: ConversationTurn[];
}

export async function classifyConversationForUser(input: ClassifyConversationInput, callbacks?: AiStreamCallbacks) {
  const message = input.message.trim();
  if (!message) {
    throw new ApiError(400, "MESSAGE_REQUIRED", "Message is required");
  }

  const provider = createAiProvider();
  if (!provider) {
    throw new ApiError(
      503,
      "AI_PROVIDER_NOT_CONFIGURED",
      "AI provider is not configured. Set OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY, and AI_MODEL."
    );
  }

  const language = input.language?.trim() || "en";
  const history = (input.history ?? []).slice(-12).map((turn) => ({
    role: turn.role,
    content: turn.content.trim().slice(0, 4_000)
  }));
  const result = await provider.classifyConversation({
    userId: input.userId,
    language,
    message,
    history
  }, callbacks);
  const messageType = shouldTreatAsFollowUp(message, history) ? "follow_up" : result.messageType;
  const tags = messageType === "learning_candidate" ? sanitizeTags(result.tags) : [];

  await prisma.aiUsageLog.create({
    data: {
      userId: input.userId,
      actionType: "conversation_classification",
      inputHash: hashStudyText(normalizeStudyText(JSON.stringify({ message, history }))),
      modelName: result.modelName,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      totalTokens: result.usage?.totalTokens
    }
  });

  return {
    messageType,
    reply: result.reply,
    tags,
    modelName: result.modelName
  };
}

export function shouldTreatAsFollowUp(message: string, history: ConversationTurn[]): boolean {
  if (!history.length) {
    return false;
  }

  const followUpSignal = /(what\s+(?:does|is)|how\s+(?:do|can|should)|why\s+|explain|meaning|grammar|usage|\bthis\b|\bthat\b|previous|这里|这句|上一句|上面|刚才|什么意思|怎么用|语法|用法|解释)/i;
  const explicitExplanationRequest = /(what\s+|how\s+|why\s+|explain|meaning|grammar|usage|previous|这里|这句|上一句|上面|刚才|什么意思|怎么用|语法|用法|解释)/i;

  return followUpSignal.test(message) && (/[?？]/.test(message) || explicitExplanationRequest.test(message));
}
