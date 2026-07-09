import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AnalyzeTextApiResponse, StudyItemDetail } from "@scenego/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/authStore.js";
import { TextStudyPage } from "./TextStudyPage.js";

const apiMocks = vi.hoisted(() => ({
  addStudyItemVocabulary: vi.fn(),
  analyzeText: vi.fn(),
  listStudyItems: vi.fn(),
  updateStudyItem: vi.fn(),
  updateStudyItemNote: vi.fn()
}));

vi.mock("../api/textStudy.js", () => ({
  analyzeText: apiMocks.analyzeText
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
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    HTMLElement.prototype.scrollIntoView = vi.fn();
    apiMocks.listStudyItems.mockResolvedValue({ items: [] });
    apiMocks.addStudyItemVocabulary.mockResolvedValue({ item: {} });
  });

  it("fills an example, analyzes text, favorites it, and adds all AI vocabulary", async () => {
    const user = userEvent.setup();
    const response = createAnalyzeTextResponse();
    apiMocks.analyzeText.mockResolvedValue(response);
    apiMocks.updateStudyItem.mockResolvedValue({
      item: {
        ...response.item,
        isFavorite: true
      }
    });

    renderTextStudyPage();

    await user.click(screen.getByRole("button", { name: "口语表达" }));
    expect((screen.getByLabelText("文本学习内容") as HTMLTextAreaElement).value).toBe(
      "I'm not gonna lie, that was pretty impressive."
    );

    await user.click(screen.getByRole("button", { name: "分析" }));

    await screen.findByText("说实话，那确实令人印象深刻。");
    expect(apiMocks.analyzeText).toHaveBeenCalledWith(
      "test-token",
      expect.objectContaining({
        text: "I'm not gonna lie, that was pretty impressive."
      })
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("AI 分析结果区"));
    });

    await user.click(screen.getAllByRole("button", { name: "收藏当前内容" })[0]);
    expect(apiMocks.updateStudyItem).toHaveBeenCalledWith("test-token", "study-item-1", {
      isFavorite: true
    });

    await user.click(screen.getByRole("button", { name: "全部词汇加入生词本" }));
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

function createAnalyzeTextResponse(): AnalyzeTextApiResponse {
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
    item: {
      ...item,
      analysis
    },
    analysis,
    cached: false,
    modelName: "test-model"
  };
}
