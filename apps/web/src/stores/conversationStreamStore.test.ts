import type { AnalyzeConversationApiResponse } from "@scenego/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConversationStreamStore } from "./conversationStreamStore.js";

const apiMocks = vi.hoisted(() => ({
  streamConversation: vi.fn()
}));

vi.mock("../api/textStudy.js", () => ({
  streamConversation: apiMocks.streamConversation
}));

describe("conversationStreamStore", () => {
  beforeEach(() => {
    apiMocks.streamConversation.mockReset();
    useConversationStreamStore.getState().reset();
  });

  it("keeps receiving a conversation stream after the current page dismisses it", async () => {
    let callbacks: {
      onConversationId?: (conversationId: string) => void;
      onContentDelta?: (delta: string) => void;
      onReasoningDelta?: (phase: "classification" | "analysis", delta: string) => void;
      onAnalysisDelta?: (analysis: NonNullable<AnalyzeConversationApiResponse["analysis"]>) => void;
    } = {};
    let resolveStream: (response: AnalyzeConversationApiResponse) => void = () => undefined;

    apiMocks.streamConversation.mockImplementation(
      async (_token: string, _input: unknown, nextCallbacks: typeof callbacks) =>
        new Promise<AnalyzeConversationApiResponse>((resolve) => {
          callbacks = nextCallbacks;
          resolveStream = resolve;
        })
    );

    const jobId = useConversationStreamStore.getState().start("test-token", {
      message: "Keep this running.",
      history: []
    });
    useConversationStreamStore.getState().dismissCurrent();

    callbacks.onConversationId?.("conversation-1");
    callbacks.onReasoningDelta?.("classification", "正在判断。");
    callbacks.onReasoningDelta?.("analysis", "正在分析。");
    callbacks.onContentDelta?.("继续输出");
    callbacks.onAnalysisDelta?.({
      originalText: "Keep this running.",
      normalizedText: "keep this running.",
      language: "en",
      itemType: "sentence",
      translation: "继续运行。",
      summary: "",
      chunks: [],
      vocabulary: [],
      grammar: [],
      naturalUsage: [],
      similarExpressions: [],
      examples: [],
      memoryTips: []
    });

    expect(useConversationStreamStore.getState().currentJobId).toBeUndefined();
    await vi.waitFor(() => {
      expect(useConversationStreamStore.getState().jobs[jobId]).toMatchObject({
        conversationId: "conversation-1",
        classificationReasoning: "正在判断。",
        analysisReasoning: "正在分析。",
        reply: "继续输出",
        analysis: expect.objectContaining({ translation: "继续运行。" }),
        status: "streaming"
      });
    });

    resolveStream({
      conversationId: "conversation-1",
      messageType: "unrelated",
      shouldSave: false,
      reply: "继续输出完成",
      tags: []
    });

    await vi.waitFor(() => {
      expect(useConversationStreamStore.getState().jobs[jobId]).toMatchObject({
        reply: "继续输出完成",
        status: "completed"
      });
    });
  });
});
