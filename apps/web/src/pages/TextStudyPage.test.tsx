import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AnalyzeConversationApiResponse, StudyItemDetail } from "@scenego/shared";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/authStore.js";
import { useConversationStreamStore } from "../stores/conversationStreamStore.js";
import { TextStudyPage } from "./TextStudyPage.js";

const apiMocks = vi.hoisted(() => ({
  addStudyItemVocabulary: vi.fn(),
  streamConversation: vi.fn(),
  getConversation: vi.fn(),
  listConversations: vi.fn(),
  listStudyItems: vi.fn(),
  updateStudyItem: vi.fn(),
  updateStudyItemNote: vi.fn()
}));

vi.mock("../api/textStudy.js", () => ({
  streamConversation: apiMocks.streamConversation
}));

vi.mock("../api/conversations.js", () => ({
  getConversation: apiMocks.getConversation,
  listConversations: apiMocks.listConversations
}));

vi.mock("../api/studyItems.js", () => ({
  addStudyItemVocabulary: apiMocks.addStudyItemVocabulary,
  listStudyItems: apiMocks.listStudyItems,
  updateStudyItem: apiMocks.updateStudyItem,
  updateStudyItemNote: apiMocks.updateStudyItemNote
}));

describe("TextStudyPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      accessToken: "test-token",
      user: {
        id: "user-1",
        email: "learner@example.com",
        createdAt: "2026-07-09T00:00:00.000Z",
        updatedAt: "2026-07-09T00:00:00.000Z"
      }
    });
    useConversationStreamStore.getState().reset();
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    HTMLElement.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollTo = vi.fn();
    apiMocks.listStudyItems.mockResolvedValue({ items: [] });
    apiMocks.listConversations.mockResolvedValue({ conversations: [] });
    apiMocks.streamConversation.mockReset();
    apiMocks.addStudyItemVocabulary.mockResolvedValue({ item: {} });
    apiMocks.updateStudyItemNote.mockImplementation(async (_token: string, _itemId: string, note: string) => ({
      item: {
        ...createAnalyzeConversationResponse().item,
        note
      }
    }));
  });

  it("supports a learning turn, favorites it, and adds all AI vocabulary", async () => {
    const user = userEvent.setup();
    const response = createAnalyzeConversationResponse();
    apiMocks.streamConversation.mockImplementation(async (_token, _input, callbacks) => {
      callbacks.onReasoningDelta?.("classification", "先判断这句话是否值得学习。\n");
      callbacks.onContentDelta?.("这是一条值得学习的表达，我已经为你加入学习库。");
      return response;
    });
    apiMocks.updateStudyItem.mockResolvedValue({
      item: {
        ...response.item,
        isFavorite: true
      }
    });

    renderTextStudyPage();

    await user.click(screen.getByRole("button", { name: "口语表达" }));
    expect((screen.getByLabelText("对话输入") as HTMLTextAreaElement).value).toBe(
      "I'm not gonna lie, that was pretty impressive."
    );

    await user.click(screen.getByRole("button", { name: "发送消息" }));

    await screen.findByText("说实话，那确实令人印象深刻。");
    expect(apiMocks.streamConversation).toHaveBeenCalledWith(
      "test-token",
      expect.objectContaining({
        message: "I'm not gonna lie, that was pretty impressive."
      }),
      expect.any(Object)
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("AI 分析结果区"));
    });

    await user.click(screen.getByRole("button", { name: "添加备注" }));
    await user.type(screen.getByLabelText("当前句备注"), "注意语气很自然");
    await user.click(screen.getByRole("button", { name: "保存备注" }));
    expect(apiMocks.updateStudyItemNote).toHaveBeenCalledWith("test-token", "study-item-1", "注意语气很自然");

    await user.click(screen.getByRole("button", { name: "收藏句子" }));
    expect(apiMocks.updateStudyItem).toHaveBeenCalledWith("test-token", "study-item-1", {
      isFavorite: true
    });

    await user.click(screen.getByRole("button", { name: "全部加入生词本" }));
    await waitFor(() => {
      expect(apiMocks.addStudyItemVocabulary).toHaveBeenCalledTimes(2);
    });
    expect(apiMocks.addStudyItemVocabulary).toHaveBeenCalledWith(
      "test-token",
      "study-item-1",
      expect.objectContaining({
        word: "impressive",
        meaning: "令人印象深刻的"
      })
    );
  });

  it("keeps follow-up questions in chat without creating a study item", async () => {
    const user = userEvent.setup();
    apiMocks.streamConversation.mockResolvedValue({
      conversationId: "conversation-1",
      messageType: "follow_up",
      shouldSave: false,
      reply: "这里的 pretty 表示程度，相当于‘很’。",
      tags: []
    });

    renderTextStudyPage();

    await user.type(screen.getByLabelText("对话输入"), "这里的 pretty 是什么意思？");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    expect(await screen.findByText("这里的 pretty 表示程度，相当于‘很’。")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "收藏句子" })).toBeNull();
    expect(apiMocks.streamConversation).toHaveBeenCalledWith(
      "test-token",
      expect.objectContaining({ history: [] }),
      expect.any(Object)
    );
  });

  it("follows a sent message and offers a return-to-bottom button after manual scrolling", async () => {
    const user = userEvent.setup();
    apiMocks.streamConversation.mockImplementation(() => new Promise(() => undefined));
    const view = renderTextStudyPage();
    const scrollRegion = view.container.querySelector<HTMLElement>(".chat-scroll-region");
    expect(scrollRegion).toBeTruthy();

    Object.defineProperties(scrollRegion!, {
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1_000 },
      scrollTop: { configurable: true, writable: true, value: 700 }
    });

    await user.type(screen.getByLabelText("对话输入"), "Show me this message.");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    expect(scrollRegion!.scrollTo).toHaveBeenCalledWith({ top: 1_000, behavior: "auto" });

    scrollRegion!.scrollTop = 100;
    fireEvent.scroll(scrollRegion!);
    const returnButton = await screen.findByRole("button", { name: "滚动到底部" });

    await user.click(returnButton);
    expect(scrollRegion!.scrollTo).toHaveBeenLastCalledWith({ top: 1_000, behavior: "smooth" });
  });

  it("keeps the assistant visible while streaming analysis becomes the final message", async () => {
    const user = userEvent.setup();
    const response = createAnalyzeConversationResponse();
    let callbacks: {
      onContentDelta?: (delta: string) => void;
      onReasoningDelta?: (phase: "classification" | "analysis", delta: string) => void;
      onAnalysisDelta?: (analysis: NonNullable<AnalyzeConversationApiResponse["analysis"]>) => void;
    } = {};
    let resolveStream: (value: AnalyzeConversationApiResponse) => void = () => undefined;
    apiMocks.streamConversation.mockImplementation(
      async (_token: string, _input: unknown, nextCallbacks: typeof callbacks) =>
        new Promise<AnalyzeConversationApiResponse>((resolve) => {
          callbacks = nextCallbacks;
          resolveStream = resolve;
        })
    );

    renderTextStudyPage();
    await user.type(screen.getByLabelText("对话输入"), "He wasn't like this in the past.");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    await act(async () => {
      callbacks.onReasoningDelta?.("classification", "先判断这是新的学习句子。");
      callbacks.onContentDelta?.("这句话的意思是‘他过去不是这样的’。");
    });
    expect(await screen.findByText("理解与分类 · 生成中")).toBeTruthy();
    const classificationContent = await screen.findByText("先判断这是新的学习句子。");
    Object.defineProperties(classificationContent, {
      scrollHeight: { configurable: true, value: 180 },
      scrollTop: { configurable: true, writable: true, value: 0 }
    });
    await act(async () => {
      callbacks.onReasoningDelta?.("classification", "继续检查上下文。");
    });
    await waitFor(() => {
      expect(screen.getByText("先判断这是新的学习句子。继续检查上下文。")).toBeTruthy();
      expect(classificationContent.scrollTop).toBe(180);
    });

    await act(async () => {
      callbacks.onReasoningDelta?.("analysis", "再分析时态和常用表达。");
      callbacks.onAnalysisDelta?.(response.analysis!);
    });
    expect(await screen.findByText("理解与分类")).toBeTruthy();
    expect(await screen.findByText("学习分析 · 生成中")).toBeTruthy();
    expect(await screen.findByText("这句话的意思是‘他过去不是这样的’。")).toBeTruthy();
    expect(await screen.findByText("说实话，那确实令人印象深刻。")).toBeTruthy();

    await act(async () => {
      resolveStream(response);
    });
    expect(await screen.findByText(response.reply)).toBeTruthy();
    expect(screen.getByText("说实话，那确实令人印象深刻。")).toBeTruthy();
  });
});

function renderTextStudyPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      },
      mutations: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TextStudyPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function createAnalyzeConversationResponse(): AnalyzeConversationApiResponse {
  const item: StudyItemDetail = {
    id: "study-item-1",
    userId: "user-1",
    itemType: "sentence",
    sourceType: "manual_input",
    language: "en",
    textOriginal: "I'm not gonna lie, that was pretty impressive.",
    normalizedText: "i'm not gonna lie, that was pretty impressive.",
    tags: [],
    isFavorite: false,
    masteryStatus: "new",
    reviewCount: 1,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
    translation: "说实话，那确实令人印象深刻。",
    summary: "表达坦诚的赞赏。",
    vocabularyCount: 2,
    notes: [],
    vocabulary: []
  };
  const analysis = {
    originalText: item.textOriginal,
    normalizedText: item.normalizedText,
    language: "en",
    itemType: "sentence" as const,
    translation: "说实话，那确实令人印象深刻。",
    summary: "表达坦诚的赞赏。",
    chunks: [
      {
        text: "I'm not gonna lie",
        meaning: "说实话"
      }
    ],
    vocabulary: [
      {
        word: "impressive",
        lemma: "impressive",
        partOfSpeech: "adjective",
        meaning: "令人印象深刻的",
        example: "That was impressive."
      },
      {
        word: "pretty",
        lemma: "pretty",
        partOfSpeech: "adverb",
        meaning: "相当，很",
        example: "It is pretty good."
      }
    ],
    grammar: [],
    naturalUsage: ["口语中常见。"],
    similarExpressions: ["To be honest, that was amazing."],
    examples: ["I'm not gonna lie, that was pretty impressive."],
    memoryTips: ["pretty 在这里不是漂亮，而是相当。"]
  };

  return {
    messageType: "learning_candidate",
    conversationId: "conversation-1",
    shouldSave: true,
    reply: "这是一条值得学习的表达，我已经为你加入学习库。",
    tags: ["casual", "praise"],
    item: {
      ...item,
      analysis
    },
    analysis,
    cached: false,
    modelName: "test-model"
  };
}
