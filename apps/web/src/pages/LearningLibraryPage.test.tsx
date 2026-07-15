import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { StudyItemSummary } from "@scenego/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/authStore.js";
import { LearningLibraryPage } from "./LearningLibraryPage.js";

const apiMocks = vi.hoisted(() => ({
  deleteStudyItem: vi.fn(),
  deleteVocabularyItem: vi.fn(),
  listFavoriteSentences: vi.fn(),
  listMistakes: vi.fn(),
  listStudyItems: vi.fn(),
  listVocabulary: vi.fn(),
  updateSentenceProgress: vi.fn(),
  updateStudyItem: vi.fn()
}));

vi.mock("../api/review.js", () => ({ listMistakes: apiMocks.listMistakes }));
vi.mock("../api/sentences.js", () => ({
  listFavoriteSentences: apiMocks.listFavoriteSentences,
  updateSentenceProgress: apiMocks.updateSentenceProgress
}));
vi.mock("../api/studyItems.js", () => ({
  deleteStudyItem: apiMocks.deleteStudyItem,
  listStudyItems: apiMocks.listStudyItems,
  updateStudyItem: apiMocks.updateStudyItem
}));
vi.mock("../api/vocabulary.js", () => ({
  deleteVocabularyItem: apiMocks.deleteVocabularyItem,
  listVocabulary: apiMocks.listVocabulary
}));

describe("LearningLibraryPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ accessToken: "test-token" });
    apiMocks.listStudyItems.mockResolvedValue({ items: [createStudyItem()] });
    apiMocks.listVocabulary.mockResolvedValue({ items: [] });
    apiMocks.listFavoriteSentences.mockResolvedValue({ sentences: [] });
    apiMocks.listMistakes.mockResolvedValue({ attempts: [] });
  });

  it("combines saved content, filters it, and opens the detail surface", async () => {
    const user = userEvent.setup();
    renderLibrary();

    const row = await screen.findByRole("button", { name: /pretty impressive/i });
    expect(screen.getByRole("button", { name: /短语\s*1/ })).toBeTruthy();

    await user.click(row);
    expect(screen.getByLabelText("学习内容详情").className).toContain("is-open");
    expect(screen.getByRole("heading", { name: "pretty impressive" })).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("筛选掌握度"), "mastered");
    expect(await screen.findByText("没有找到学习内容")).toBeTruthy();
  });
});

function renderLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/library"]}>
        <LearningLibraryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function createStudyItem(): StudyItemSummary {
  return {
    id: "study-item-1",
    userId: "user-1",
    itemType: "phrase",
    sourceType: "manual_input",
    language: "en",
    textOriginal: "pretty impressive",
    normalizedText: "pretty impressive",
    sourceNote: "work meeting",
    tags: [],
    isFavorite: true,
    masteryStatus: "learning",
    reviewCount: 1,
    createdAt: "2026-07-14T01:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
    translation: "相当令人印象深刻",
    vocabularyCount: 0
  };
}
