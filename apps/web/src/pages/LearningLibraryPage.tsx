import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FavoriteSentenceSummary,
  ReviewAttemptSummary,
  StudyItemSummary,
  VocabularyItemSummary
} from "@scenego/shared";
import { ArrowUpRight, Bookmark, Brain, Check, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listMistakes } from "../api/review.js";
import { listFavoriteSentences, updateSentenceProgress } from "../api/sentences.js";
import { deleteStudyItem, listStudyItems, updateStudyItem } from "../api/studyItems.js";
import { deleteVocabularyItem, listVocabulary } from "../api/vocabulary.js";
import { useAuthStore } from "../stores/authStore.js";

type LibraryFilter = "all" | "history" | "mistakes" | "notes" | "phrases" | "sentences" | "words";
type LibraryEntryKind = "mistake" | "sentence" | "study" | "vocabulary";

interface LibraryEntry {
  categories: LibraryFilter[];
  createdAt: string;
  detail?: string;
  href?: string;
  id: string;
  kind: LibraryEntryKind;
  label: string;
  mastery: "learning" | "mastered" | "new" | "review" | "saved";
  source: string;
  sourceDetail?: string;
  sourceRecord: FavoriteSentenceSummary | ReviewAttemptSummary | StudyItemSummary | VocabularyItemSummary;
  title: string;
}

type MasteryFilter = LibraryEntry["mastery"] | "all";

const filterOptions: Array<{ label: string; value: LibraryFilter }> = [
  { label: "全部", value: "all" },
  { label: "学习记录", value: "history" },
  { label: "单词", value: "words" },
  { label: "短语", value: "phrases" },
  { label: "句子", value: "sentences" },
  { label: "笔记", value: "notes" },
  { label: "错题", value: "mistakes" }
];

export function LearningLibraryPage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = parseFilter(searchParams.get("type"));
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter);
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const studyItemsQuery = useQuery({
    queryKey: ["study-items", "library"],
    queryFn: () => listStudyItems(token ?? ""),
    enabled: Boolean(token)
  });
  const vocabularyQuery = useQuery({
    queryKey: ["vocabulary"],
    queryFn: () => listVocabulary(token ?? ""),
    enabled: Boolean(token)
  });
  const sentencesQuery = useQuery({
    queryKey: ["favorite-sentences"],
    queryFn: () => listFavoriteSentences(token ?? ""),
    enabled: Boolean(token)
  });
  const mistakesQuery = useQuery({
    queryKey: ["mistakes"],
    queryFn: () => listMistakes(token ?? ""),
    enabled: Boolean(token)
  });

  const entries = useMemo(
    () =>
      normalizeLibraryEntries(
        studyItemsQuery.data?.items ?? [],
        vocabularyQuery.data?.items ?? [],
        sentencesQuery.data?.sentences ?? [],
        mistakesQuery.data?.attempts ?? []
      ),
    [mistakesQuery.data?.attempts, sentencesQuery.data?.sentences, studyItemsQuery.data?.items, vocabularyQuery.data?.items]
  );
  const filteredEntries = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();

    return entries.filter((entry) => {
      if (filter !== "all" && !entry.categories.includes(filter)) {
        return false;
      }

      if (masteryFilter !== "all" && entry.mastery !== masteryFilter) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      return [entry.title, entry.detail, entry.source, entry.sourceDetail]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(normalizedKeyword));
    });
  }, [entries, filter, keyword, masteryFilter]);
  const selectedEntry = filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0];
  const isLoading = studyItemsQuery.isLoading || vocabularyQuery.isLoading || sentencesQuery.isLoading || mistakesQuery.isLoading;
  const queryError = studyItemsQuery.error ?? vocabularyQuery.error ?? sentencesQuery.error ?? mistakesQuery.error;

  const deleteMutation = useMutation({
    mutationFn: (entry: LibraryEntry) => removeLibraryEntry(token ?? "", entry),
    onSuccess: () => {
      setSelectedId(undefined);
      setIsInspectorOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  useEffect(() => {
    const nextFilter = parseFilter(searchParams.get("type"));
    setFilter(nextFilter);
  }, [searchParams]);

  function changeFilter(nextFilter: LibraryFilter) {
    setFilter(nextFilter);
    setSelectedId(undefined);
    const nextParams = new URLSearchParams(searchParams);
    if (nextFilter === "all") {
      nextParams.delete("type");
    } else {
      nextParams.set("type", nextFilter);
    }
    setSearchParams(nextParams, { replace: true });
  }

  function handleDelete(entry: LibraryEntry) {
    if (entry.kind === "mistake") {
      return;
    }

    if (!window.confirm(`从学习库移除？\n\n${entry.title}`)) {
      return;
    }

    deleteMutation.mutate(entry);
  }

  return (
    <section className="library-page">
      <div className="library-content">
        <div className="library-toolbar">
          <label className="library-search-field">
            <Search aria-hidden="true" />
            <span className="sr-only">搜索学习库</span>
            <input
              type="search"
              placeholder="搜索表达、翻译、笔记或来源"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <label className="library-tool-select" title="筛选掌握度">
            <SlidersHorizontal aria-hidden="true" />
            <select
              aria-label="筛选掌握度"
              value={masteryFilter}
              onChange={(event) => setMasteryFilter(event.target.value as MasteryFilter)}
            >
              <option value="all">全部状态</option>
              <option value="new">新内容</option>
              <option value="learning">学习中</option>
              <option value="mastered">已掌握</option>
              <option value="saved">已收藏</option>
              <option value="review">需复习</option>
            </select>
          </label>
        </div>

        <div className="library-filter-strip" aria-label="学习库类型">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              className={filter === option.value ? "is-active" : ""}
              type="button"
              onClick={() => changeFilter(option.value)}
            >
              {option.label}
              <span>{countEntries(entries, option.value)}</span>
            </button>
          ))}
        </div>

        <div className="library-list-region">
          <div className="library-list-head" aria-hidden="true">
            <span></span>
            <span>内容</span>
            <span>释义 / 笔记</span>
            <span>来源</span>
            <span>掌握度</span>
          </div>
          {isLoading ? <LibraryStatus>正在载入学习内容...</LibraryStatus> : null}
          {queryError ? <LibraryStatus tone="error">{getErrorMessage(queryError)}</LibraryStatus> : null}
          {!isLoading && !queryError && !filteredEntries.length ? <LibraryStatus>没有找到学习内容</LibraryStatus> : null}
          {!isLoading && !queryError
            ? filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  className={selectedEntry?.id === entry.id ? "library-row is-active" : "library-row"}
                  type="button"
                  onClick={() => {
                    setSelectedId(entry.id);
                    setIsInspectorOpen(true);
                  }}
                >
                  <span className="library-row-check">{selectedEntry?.id === entry.id ? <Check aria-hidden="true" /> : null}</span>
                  <span className="library-row-primary">
                    <strong>{entry.title}</strong>
                    <small>{entry.label}</small>
                  </span>
                  <span className="library-row-detail">{entry.detail ?? "暂无补充内容"}</span>
                  <span className="library-row-source">
                    <strong>{entry.source}</strong>
                    <small>{entry.sourceDetail ?? formatDate(entry.createdAt)}</small>
                  </span>
                  <MasteryBadge mastery={entry.mastery} />
                </button>
              ))
            : null}
        </div>
      </div>

      {isInspectorOpen ? (
        <button className="library-mobile-scrim" type="button" aria-label="关闭学习内容详情" onClick={() => setIsInspectorOpen(false)} />
      ) : null}
      <aside className={isInspectorOpen ? "library-inspector is-open" : "library-inspector"} aria-label="学习内容详情">
        {selectedEntry ? (
          <>
            <div className="library-inspector-head">
              <div>
                <p>{selectedEntry.label}</p>
                <h2>{selectedEntry.title}</h2>
              </div>
              <div className="library-inspector-tools">
                {selectedEntry.kind === "sentence" ? <Bookmark aria-hidden="true" /> : <Brain aria-hidden="true" />}
                <button type="button" aria-label="关闭详情" onClick={() => setIsInspectorOpen(false)}><X aria-hidden="true" /></button>
              </div>
            </div>
            <p className="library-inspector-detail">{selectedEntry.detail ?? "暂无补充内容"}</p>
            <dl className="library-inspector-meta">
              <div><dt>来源</dt><dd>{selectedEntry.source}</dd></div>
              <div><dt>位置</dt><dd>{selectedEntry.sourceDetail ?? "学习库"}</dd></div>
              <div><dt>保存时间</dt><dd>{formatDate(selectedEntry.createdAt)}</dd></div>
            </dl>
            <div className="library-inspector-actions">
              {selectedEntry.href ? (
                <Link className="scene-primary-command" to={selectedEntry.href}>
                  打开学习内容 <ArrowUpRight aria-hidden="true" />
                </Link>
              ) : (
                <Link className="scene-primary-command" to="/review/today">
                  开始复习 <Brain aria-hidden="true" />
                </Link>
              )}
              {selectedEntry.kind !== "mistake" ? (
                <button
                  className="scene-danger-command"
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => handleDelete(selectedEntry)}
                >
                  <Trash2 aria-hidden="true" />
                  {selectedEntry.kind === "sentence" ? "取消收藏" : "从学习库移除"}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <LibraryStatus>选择一条内容查看详情</LibraryStatus>
        )}
      </aside>
    </section>
  );
}

function MasteryBadge({ mastery }: { mastery: LibraryEntry["mastery"] }) {
  const labels: Record<LibraryEntry["mastery"], string> = {
    learning: "学习中",
    mastered: "已掌握",
    new: "新内容",
    review: "需复习",
    saved: "已收藏"
  };

  return <span className={`library-mastery library-mastery-${mastery}`}>{labels[mastery]}</span>;
}

function LibraryStatus({ children, tone = "normal" }: { children: React.ReactNode; tone?: "error" | "normal" }) {
  return <div className={`library-status ${tone === "error" ? "is-error" : ""}`}>{children}</div>;
}

function normalizeLibraryEntries(
  studyItems: StudyItemSummary[],
  vocabularyItems: VocabularyItemSummary[],
  sentences: FavoriteSentenceSummary[],
  mistakes: ReviewAttemptSummary[]
): LibraryEntry[] {
  const entries = [
    ...studyItems.map(normalizeStudyItem),
    ...vocabularyItems.map(normalizeVocabularyItem),
    ...sentences.filter((sentence) => sentence.source === "sentence_progress").map(normalizeSentence),
    ...mistakes.map(normalizeMistake)
  ];

  return entries.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function normalizeStudyItem(item: StudyItemSummary): LibraryEntry {
  const categories: LibraryFilter[] = ["history"];
  if (item.itemType === "word") categories.push("words");
  if (item.itemType === "phrase") categories.push("phrases");
  if (item.itemType === "sentence") categories.push("sentences");
  if (item.note) categories.push("notes");

  return {
    categories,
    createdAt: item.createdAt,
    detail: item.translation ?? item.note ?? item.summary,
    href: `/study-items/${item.id}`,
    id: `study-${item.id}`,
    kind: "study",
    label: itemTypeLabels[item.itemType],
    mastery: item.masteryStatus,
    source: sourceTypeLabels[item.sourceType],
    sourceDetail: item.sourceNote,
    sourceRecord: item,
    title: item.textOriginal
  };
}

function normalizeVocabularyItem(item: VocabularyItemSummary): LibraryEntry {
  return {
    categories: ["words"],
    createdAt: item.createdAt,
    detail: item.meaning ?? item.note,
    href: item.studyItemId
      ? `/study-items/${item.studyItemId}`
      : item.projectId
        ? getProjectStudyHref(item.projectId, item.subtitleLineId)
        : undefined,
    id: `vocabulary-${item.id}`,
    kind: "vocabulary",
    label: "单词",
    mastery: item.masteryStatus,
    source: item.project?.title ?? (item.sourceType ? sourceTypeLabels[item.sourceType] : "手动添加"),
    sourceDetail: item.sourceText ?? item.subtitleLine?.textOriginal,
    sourceRecord: item,
    title: item.word
  };
}

function normalizeSentence(sentence: FavoriteSentenceSummary): LibraryEntry {
  return {
    categories: ["sentences"],
    createdAt: sentence.createdAt,
    detail: sentence.translation ?? sentence.note,
    href: sentence.projectId ? getProjectStudyHref(sentence.projectId, sentence.subtitleLineId) : undefined,
    id: `sentence-${sentence.id}`,
    kind: "sentence",
    label: "收藏句子",
    mastery: "saved",
    source: sentence.project?.title ?? "视频学习",
    sourceDetail: sentence.subtitleLine ? `字幕 ${sentence.subtitleLine.lineIndex + 1}` : undefined,
    sourceRecord: sentence,
    title: sentence.textOriginal
  };
}

function normalizeMistake(attempt: ReviewAttemptSummary): LibraryEntry {
  const studyItem = attempt.target.studyItem;
  const vocabularyItem = attempt.target.vocabularyItem;

  return {
    categories: ["mistakes"],
    createdAt: attempt.createdAt,
    detail: vocabularyItem?.meaning ?? studyItem?.translation ?? attempt.quiz?.explanation,
    href: attempt.studyItemId ? `/study-items/${attempt.studyItemId}` : undefined,
    id: `mistake-${attempt.id}`,
    kind: "mistake",
    label: attempt.isCorrect === false ? "练习答错" : attempt.result === "unknown" ? "不认识" : "模糊",
    mastery: "review",
    source: "复习记录",
    sourceDetail: attempt.quiz?.questionText,
    sourceRecord: attempt,
    title: vocabularyItem?.word ?? studyItem?.textOriginal ?? "复习内容"
  };
}

async function removeLibraryEntry(token: string, entry: LibraryEntry): Promise<void> {
  if (entry.kind === "study") {
    await deleteStudyItem(token, (entry.sourceRecord as StudyItemSummary).id);
    return;
  }

  if (entry.kind === "vocabulary") {
    await deleteVocabularyItem(token, (entry.sourceRecord as VocabularyItemSummary).id);
    return;
  }

  if (entry.kind === "sentence") {
    const sentence = entry.sourceRecord as FavoriteSentenceSummary;
    if (sentence.source === "study_item") {
      await updateStudyItem(token, sentence.studyItem?.id ?? sentence.id, { isFavorite: false });
      return;
    }
    await updateSentenceProgress(token, sentence.id, { isFavorite: false });
  }
}

function parseFilter(value: string | null): LibraryFilter {
  return filterOptions.some((option) => option.value === value) ? (value as LibraryFilter) : "all";
}

function countEntries(entries: LibraryEntry[], filter: LibraryFilter): number {
  return filter === "all" ? entries.length : entries.filter((entry) => entry.categories.includes(filter)).length;
}

function getProjectStudyHref(projectId: string, subtitleLineId?: string): string {
  const baseHref = `/projects/${projectId}/study`;
  return subtitleLineId ? `${baseHref}?lineId=${subtitleLineId}` : baseHref;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "学习库加载失败";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

const itemTypeLabels = {
  word: "单词",
  phrase: "短语",
  sentence: "句子",
  paragraph: "段落",
  mixed: "混合"
} as const;

const sourceTypeLabels = {
  manual_input: "手动输入",
  video_subtitle: "视频字幕",
  external_manual: "外链手动"
} as const;
