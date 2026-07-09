import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  StudyItemMasteryStatus,
  TextVocabularyAnalysis,
  VocabularyMasteryStatus
} from "@scenego/shared";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addStudyItemVocabulary,
  deleteStudyItem,
  getStudyItem,
  updateStudyItem,
  updateStudyItemNote
} from "../api/studyItems.js";
import { TextAnalysisCard, getVocabularyKey } from "../components/TextStudy/TextAnalysisCard.js";
import { useAuthStore } from "../stores/authStore.js";

export function StudyItemDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [addingVocabularyKey, setAddingVocabularyKey] = useState<string | undefined>();
  const itemQuery = useQuery({
    queryKey: ["study-item", itemId],
    queryFn: () => getStudyItem(token ?? "", itemId ?? ""),
    enabled: Boolean(token && itemId)
  });
  const item = itemQuery.data?.item;

  useEffect(() => {
    if (item) {
      setNote(item.note ?? "");
    }
  }, [item?.id]);

  const updateMutation = useMutation({
    mutationFn: (input: { isFavorite?: boolean; masteryStatus?: StudyItemMasteryStatus }) =>
      updateStudyItem(token ?? "", itemId ?? "", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["study-item", itemId] });
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
    }
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteStudyItem(token ?? "", itemId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      navigate("/study-history", { replace: true });
    }
  });
  const noteMutation = useMutation({
    mutationFn: () => updateStudyItemNote(token ?? "", itemId ?? "", note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["study-item", itemId] });
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });
  const vocabularyMutation = useMutation({
    mutationFn: (input: { vocabulary: TextVocabularyAnalysis; key: string }) =>
      addStudyItemVocabulary(token ?? "", itemId ?? "", {
        word: input.vocabulary.word,
        meaning: input.vocabulary.meaning,
        sourceText: item?.textOriginal
      }),
    onMutate: (input) => setAddingVocabularyKey(input.key),
    onSettled: () => setAddingVocabularyKey(undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["study-item", itemId] });
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });

  if (itemQuery.isLoading) {
    return <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载中...</div>;
  }

  if (!item) {
    return <div className="rounded border border-line bg-white p-8 text-center text-sm text-red-600">学习内容不存在</div>;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="rounded border border-line bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link className="text-sm text-accent" to="/study-history">
                返回学习历史
              </Link>
              <h1 className="mt-2 text-xl font-semibold">{item.textOriginal}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {itemTypeLabels[item.itemType]} · {sourceTypeLabels[item.sourceType]}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={[
                  "rounded border px-3 py-2 text-sm disabled:opacity-50",
                  item.isFavorite ? "border-accent bg-accent text-white" : "border-line text-slate-700"
                ].join(" ")}
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ isFavorite: !item.isFavorite })}
              >
                {item.isFavorite ? "已收藏" : "收藏"}
              </button>
              <button
                className="rounded border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm(`删除这条学习记录？\n\n${item.textOriginal}`)) {
                    deleteMutation.mutate();
                  }
                }}
              >
                删除记录
              </button>
            </div>
          </div>
          {deleteMutation.error instanceof Error ? (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{deleteMutation.error.message}</p>
          ) : null}
          {item.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <TextAnalysisCard
          analysis={item.analysis}
          addingVocabularyKey={addingVocabularyKey}
          onAddVocabulary={(vocabulary) => {
            const index = item.analysis?.vocabulary.indexOf(vocabulary) ?? 0;
            vocabularyMutation.mutate({
              vocabulary,
              key: getVocabularyKey(vocabulary, index)
            });
          }}
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold">掌握状态</p>
          <select
            className="mt-3 w-full rounded border border-line bg-white px-3 py-2 text-sm"
            value={item.masteryStatus}
            onChange={(event) =>
              updateMutation.mutate({
                masteryStatus: event.target.value as StudyItemMasteryStatus
              })
            }
          >
            {masteryStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs text-slate-500">回看 {item.reviewCount} 次</p>
        </div>

        <div className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold">笔记</p>
          <textarea
            className="mt-3 min-h-32 w-full rounded border border-line bg-white p-3 text-sm outline-none focus:border-accent"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button
            className="mt-3 rounded border border-line px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
            type="button"
            disabled={noteMutation.isPending}
            onClick={() => noteMutation.mutate()}
          >
            保存笔记
          </button>
        </div>

        <div className="rounded border border-line bg-white p-4">
          <p className="text-sm font-semibold">已加入的生词</p>
          <div className="mt-3 space-y-2">
            {item.vocabulary.map((vocabulary) => (
              <div key={vocabulary.id} className="rounded bg-panel p-3 text-sm">
                <p className="font-medium">{vocabulary.word}</p>
                <p className="mt-1 text-slate-600">{vocabulary.meaning ?? "暂无释义"}</p>
                <p className="mt-1 text-xs text-slate-500">{masteryLabels[vocabulary.masteryStatus]}</p>
              </div>
            ))}
            {!item.vocabulary.length ? <p className="text-sm text-slate-500">暂无生词</p> : null}
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

const sourceTypeLabels = {
  manual_input: "手动输入",
  video_subtitle: "视频字幕",
  external_manual: "外链手动"
} as const;

const masteryStatusOptions: Array<{ value: StudyItemMasteryStatus; label: string }> = [
  { value: "new", label: "新内容" },
  { value: "learning", label: "学习中" },
  { value: "mastered", label: "已掌握" }
];

const masteryLabels: Record<VocabularyMasteryStatus, string> = {
  new: "新词",
  learning: "学习中",
  mastered: "已掌握"
};
