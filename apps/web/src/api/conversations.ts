import type { ConversationDetail, ConversationSummary } from "@scenego/shared";
import { apiRequest } from "./http.js";

export function listConversations(token: string) {
  return apiRequest<{ conversations: ConversationSummary[] }>("/api/text/conversation", { token });
}

export function getConversation(token: string, conversationId: string) {
  return apiRequest<{ conversation: ConversationDetail }>(`/api/text/conversation/${conversationId}`, { token });
}
