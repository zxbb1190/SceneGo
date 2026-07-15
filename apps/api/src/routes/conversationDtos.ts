import type { Conversation, ConversationMessage } from "@prisma/client";
import { toStudyItemDetailDto, type StudyItemRecord } from "./studyItemDtos.js";

export type ConversationRecord = Conversation & {
  messages?: ConversationMessageRecord[];
  _count?: { messages?: number };
};

export type ConversationMessageRecord = ConversationMessage & {
  studyItem?: StudyItemRecord | null;
};

export function toConversationSummaryDto(conversation: ConversationRecord) {
  const lastMessage = conversation.messages?.[0];

  return {
    id: conversation.id,
    title: conversation.title,
    messageCount: conversation._count?.messages ?? conversation.messages?.length ?? 0,
    lastMessage: lastMessage?.content,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString()
  };
}

export function toConversationDetailDto(conversation: ConversationRecord) {
  return {
    ...toConversationSummaryDto(conversation),
    messages: (conversation.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
      reasoning: message.reasoning ?? undefined,
      classificationReasoning: message.classificationReasoning ?? undefined,
      analysisReasoning: message.analysisReasoning ?? undefined,
      messageType: parseMessageType(message.messageType),
      shouldSave: message.shouldSave,
      tags: parseTags(message.tags),
      studyItem: message.studyItem ? toStudyItemDetailDto(message.studyItem) : undefined,
      createdAt: message.createdAt.toISOString()
    }))
  };
}

function parseMessageType(value: string | null) {
  if (value === "learning_candidate" || value === "follow_up" || value === "unrelated") {
    return value;
  }

  return undefined;
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}
