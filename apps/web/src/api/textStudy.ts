import type {
  AnalyzeConversationApiResponse,
  AnalyzeConversationInput,
  ConversationStreamEvent,
  AnalyzeTextApiResponse,
  AnalyzeTextInput
} from "@scenego/shared";
import { API_BASE_URL, ApiRequestError, apiRequest } from "./http.js";

export interface ConversationStreamCallbacks {
  onConversationId?: (conversationId: string) => void;
  onContentDelta?: (delta: string) => void;
  onReasoningDelta?: (phase: "classification" | "analysis", delta: string) => void;
  onAnalysisDelta?: (analysis: NonNullable<AnalyzeConversationApiResponse["analysis"]>) => void;
}

export async function streamConversation(
  token: string,
  input: AnalyzeConversationInput,
  callbacks: ConversationStreamCallbacks = {},
  signal?: AbortSignal
): Promise<AnalyzeConversationApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/text/conversation/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    signal,
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiRequestError(
      response.status,
      body?.error?.message ?? `API request failed: ${response.status}`,
      body?.error?.code
    );
  }

  if (!response.body) {
    throw new ApiRequestError(502, "Conversation stream returned no response body", "EMPTY_STREAM");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AnalyzeConversationApiResponse | undefined;

  const consumeLine = (line: string) => {
    const value = line.trim();
    if (!value.startsWith("data:")) {
      return;
    }

    const event = JSON.parse(value.slice("data:".length).trim()) as ConversationStreamEvent;
    if (event.type === "conversation") {
      callbacks.onConversationId?.(event.conversationId);
    } else if (event.type === "reasoning_delta") {
      callbacks.onReasoningDelta?.(event.phase, event.delta);
    } else if (event.type === "content_delta") {
      callbacks.onContentDelta?.(event.delta);
    } else if (event.type === "analysis_delta") {
      callbacks.onAnalysisDelta?.(event.analysis);
    } else if (event.type === "result") {
      result = event.data;
    } else if (event.type === "error") {
      throw new ApiRequestError(502, event.message, event.code);
    }

  };

  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines.forEach(consumeLine);

    if (chunk.done) {
      break;
    }
  }

  if (buffer) {
    consumeLine(buffer);
  }

  if (!result) {
    throw new ApiRequestError(502, "Conversation stream ended before the final result", "INCOMPLETE_STREAM");
  }

  return result;
}

export function analyzeConversation(token: string, input: AnalyzeConversationInput) {
  return apiRequest<AnalyzeConversationApiResponse>("/api/text/conversation", {
    method: "POST",
    token,
    json: input
  });
}

export function analyzeText(token: string, input: AnalyzeTextInput) {
  return apiRequest<AnalyzeTextApiResponse>("/api/text/analyze", {
    method: "POST",
    token,
    json: input
  });
}
