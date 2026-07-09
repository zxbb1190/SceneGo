import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalyzeTextApiResponse, TextVocabularyAnalysis } from "@scenego/shared";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listStudyItems, updateStudyItem, updateStudyItemNote, addStudyItemVocabulary } from "../api/studyItems.js";
import { analyzeText } from "../api/textStudy.js";
import { ApiRequestError } from "../api/http.js";
import { TextAnalysisCard, getVocabularyKey } from "../components/TextStudy/TextAnalysisCard.js";
import { useAuthStore } from "../stores/authStore.js";

export function TextStudyPage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const resultRegionRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [result, setResult] = useState<AnalyzeTextApiResponse | undefined>();
  const [note, setNote] = useState("");
  const [addingVocabularyKey, setAddingVocabularyKey] = useState<string | undefined>();

  const recentQuery = useQuery({
    queryKey: ["study-items", "recent"],
    queryFn: () => listStudyItems(token ?? ""),
    enabled: Boolean(token)
  });
  const analyzeMutation = useMutation({
    mutationFn: () =>
      analyzeText(token ?? "", {
        text,
        sourceNote: optionalString(sourceNote),
        tags: parseTags(tagInput)
      }),
    onSuccess: (response) => {
      setResult(response);
      setNote(response.item.note ?? "");
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });
  const updateMutation = useMutation({
    mutationFn: (input: { isFavorite?: boolean }) =>
      updateStudyItem(token ?? "", result?.item.id ?? "", input),
    onSuccess: (response) => {
      setResult((current) =>
        current
          ? {
              ...current,
              item: response.item
            }
          : current
      );
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
    }
  });
  const noteMutation = useMutation({
    mutationFn: () => updateStudyItemNote(token ?? "", result?.item.id ?? "", note),
    onSuccess: (response) => {
      setResult((current) =>
        current
          ? {
              ...current,
              item: response.item
            }
          : current
      );
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });
  const vocabularyMutation = useMutation({
    mutationFn: (input: { vocabulary: TextVocabularyAnalysis; key: string }) =>
      addStudyItemVocabulary(token ?? "", result?.item.id ?? "", {
        word: input.vocabulary.word,
        meaning: input.vocabulary.meaning,
        sourceText: result?.item.textOriginal
      }),
    onMutate: (input) => setAddingVocabularyKey(input.key),
    onSettled: () => setAddingVocabularyKey(undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });
  const batchVocabularyMutation = useMutation({
    mutationFn: async (vocabularyItems: TextVocabularyAnalysis[]) => {
      await Promise.all(
        vocabularyItems.map((vocabulary) =>
          addStudyItemVocabulary(token ?? "", result?.item.id ?? "", {
            word: vocabulary.word,
            meaning: vocabulary.meaning,
            sourceText: result?.item.textOriginal
          })
        )
      );
    },
    onMutate: () => setAddingVocabularyKey(ADD_ALL_VOCABULARY_KEY),
    onSettled: () => setAddingVocabularyKey(undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });

  useEffect(() => {
    if (!result) {
      return;
    }

    setNote(result.item.note ?? "");
  }, [result?.item.id]);

  useEffect(() => {
    if (!result?.item.id) {
      return;
    }

    window.requestAnimationFrame(() => {
      resultRegionRef.current?.focus({ preventScroll: true });
      resultRegionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [result?.item.id]);

  const analysisError = getErrorMessage(analyzeMutation.error);
  const canAnalyze = Boolean(text.trim()) && !analyzeMutation.isPending;
  const canAddAllVocabulary = Boolean(result?.analysis.vocabulary.length) && !batchVocabularyMutation.isPending;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <div className="rounded border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">文本学习</h1>
              <p className="mt-1 text-sm text-slate-600">粘贴英文单词、短语、句子或短段落。</p>
            </div>
            <Link className="rounded border border-line px-3 py-2 text-sm text-slate-700" to="/study-history">
              学习历史
            </Link>
          </div>
          <textarea
            className="mt-4 min-h-48 w-full rounded border border-line bg-white p-3 text-sm outline-none focus:border-accent"
            aria-label="文本学习内容"
            maxLength={4000}
            placeholder="I'm not gonna lie, that was pretty impressive."
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {exampleTexts.map((example) => (
              <button
                key={example.label}
                className="rounded border border-line bg-white px-3 py-2 text-sm text-slate-700 hover:border-accent"
                type="button"
                onClick={() => setText(example.text)}
              >
                {example.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              maxLength={255}
              placeholder="来源备注，例如：电影字幕、邮件、游戏、网页"
              value={sourceNote}
              onChange={(event) => setSourceNote(event.target.value)}
            />
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              placeholder="标签，用逗号分隔"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              type="button"
              disabled={!canAnalyze}
              onClick={() => analyzeMutation.mutate()}
            >
              {analyzeMutation.isPending ? "分析中..." : "分析"}
            </button>
            <button
              className="rounded border border-line px-4 py-2 text-sm text-slate-700"
              type="button"
              onClick={() => {
                setText("");
                setSourceNote("");
                setTagInput("");
                setResult(undefined);
                setNote("");
              }}
            >
              清空
            </button>
            {result?.cached ? <span className="text-xs text-slate-500">已读取缓存</span> : null}
          </div>
          {analysisError ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{analysisError}</p> : null}
        </div>

        <div
          ref={resultRegionRef}
          tabIndex={-1}
          aria-label="AI 分析结果区"
          className="outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {result ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-line bg-white p-3">
              <button
                className={[
                  "rounded border px-3 py-2 text-sm disabled:opacity-50",
                  result.item.isFavorite ? "border-accent bg-accent text-white" : "border-line text-slate-700"
                ].join(" ")}
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ isFavorite: !result.item.isFavorite })}
              >
                {result.item.isFavorite ? "取消收藏当前内容" : "收藏当前内容"}
              </button>
              <button
                className="rounded border border-line px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                type="button"
                disabled={!canAddAllVocabulary}
                onClick={() => batchVocabularyMutation.mutate(result.analysis.vocabulary)}
              >
                {batchVocabularyMutation.isPending ? "加入中..." : "全部词汇加入生词本"}
              </button>
              <Link
                className="rounded border border-line px-3 py-2 text-sm text-slate-700"
                to={`/study-items/${result.item.id}`}
              >
                查看详情
              </Link>
            </div>
          ) : null}
          <TextAnalysisCard
            analysis={result?.analysis}
            addingVocabularyKey={addingVocabularyKey}
            onAddVocabulary={(vocabulary) => {
              const index = result?.analysis.vocabulary.indexOf(vocabulary) ?? 0;
              vocabularyMutation.mutate({
                vocabulary,
                key: getVocabularyKey(vocabulary, index)
              });
            }}
          />
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold">当前内容</p>
          {result ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={[
                    "rounded border px-3 py-2 text-sm disabled:opacity-50",
                    result.item.isFavorite ? "border-accent bg-accent text-white" : "border-line text-slate-700"
                  ].join(" ")}
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ isFavorite: !result.item.isFavorite })}
                >
                  {result.item.isFavorite ? "已收藏" : "收藏当前内容"}
                </button>
                <Link className="rounded border border-line px-3 py-2 text-sm text-slate-700" to={`/study-items/${result.item.id}`}>
                  查看详情
                </Link>
              </div>
              <textarea
                className="min-h-28 w-full rounded border border-line bg-white p-3 text-sm outline-none focus:border-accent"
                placeholder="学习笔记"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button
                className="rounded border border-line px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                type="button"
                disabled={noteMutation.isPending}
                onClick={() => noteMutation.mutate()}
              >
                保存笔记
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">暂无分析内容</p>
          )}
        </div>

        <div className="rounded border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">最近分析</p>
            <Link className="text-sm text-accent" to="/study-history">
              全部
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recentQuery.data?.items.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                className="block rounded border border-line p-3 text-sm hover:border-accent"
                to={`/study-items/${item.id}`}
              >
                <p className="line-clamp-2 font-medium">{item.textOriginal}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {itemTypeLabels[item.itemType]} · {item.sourceNote ?? item.sourceType}
                </p>
              </Link>
            ))}
            {recentQuery.isLoading ? <p className="text-sm text-slate-500">加载中...</p> : null}
            {!recentQuery.isLoading && !recentQuery.data?.items.length ? (
              <p className="text-sm text-slate-500">暂无历史</p>
            ) : null}
          </div>
        </div>
      </aside>
    </section>
  );
}

const itemTypeLabels = {
  word: "单词",
  phrase: "短语",
  sentence: "句子",
  paragraph: "段落",
  mixed: "混合"
} as const;

const ADD_ALL_VOCABULARY_KEY = "__all__";

const exampleTexts = [
  {
    label: "口语表达",
    text: "I'm not gonna lie, that was pretty impressive."
  },
  {
    label: "工作场景",
    text: "Could you walk me through the main trade-offs before we make a decision?"
  },
  {
    label: "影视台词",
    text: "Sometimes the right path is not the easiest one, but it is still worth taking."
  }
] as const;

function parseTags(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "请求失败";
}
