import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StudySourceType, VocabularyMasteryStatus } from "@scenego/shared";
import { Link } from "react-router-dom";
import { deleteVocabularyItem, listVocabulary, updateVocabularyItem } from "../api/vocabulary.js";
import { useAuthStore } from "../stores/authStore.js";

export function WordBookPage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const vocabularyQuery = useQuery({
    queryKey: ["vocabulary"],
    queryFn: () => listVocabulary(token ?? ""),
    enabled: Boolean(token)
  });
  const updateMutation = useMutation({
    mutationFn: (input: { itemId: string; masteryStatus: VocabularyMasteryStatus }) =>
      updateVocabularyItem(token ?? "", input.itemId, { masteryStatus: input.masteryStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vocabulary"] })
  });
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteVocabularyItem(token ?? "", itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">生词本</h1>
      {vocabularyQuery.isLoading ? (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载中...</div>
      ) : vocabularyQuery.data?.items.length ? (
        <div className="divide-y divide-line rounded border border-line bg-white">
          {vocabularyQuery.data.items.map((item) => (
            <article key={item.id} className="grid gap-3 p-4 md:grid-cols-[180px_minmax(0,1fr)_220px]">
              <div>
                <h2 className="font-semibold">{item.word}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {item.sourceType ? sourceTypeLabels[item.sourceType] : item.project?.title ?? item.language}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-700">{item.meaning ?? item.note ?? "暂无释义"}</p>
                {item.sourceText ? (
                  <p className="rounded bg-panel p-2 text-xs text-slate-500">{item.sourceText}</p>
                ) : null}
                {!item.sourceText && item.subtitleLine?.textOriginal ? (
                  <p className="rounded bg-panel p-2 text-xs text-slate-500">{item.subtitleLine.textOriginal}</p>
                ) : null}
                {item.studyItemId ? (
                  <Link
                    className="inline-flex rounded bg-accent px-3 py-2 text-sm font-semibold text-white"
                    to={`/study-items/${item.studyItemId}`}
                  >
                    查看学习内容
                  </Link>
                ) : item.projectId ? (
                  <Link
                    className="inline-flex rounded bg-accent px-3 py-2 text-sm font-semibold text-white"
                    to={getStudyHref(item.projectId, item.subtitleLineId)}
                  >
                    {item.subtitleLineId ? "回到这句" : "回到项目"}
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <select
                  className="rounded border border-line bg-white px-2 py-2 text-sm"
                  value={item.masteryStatus}
                  onChange={(event) =>
                    updateMutation.mutate({
                      itemId: item.id,
                      masteryStatus: event.target.value as VocabularyMasteryStatus
                    })
                  }
                >
                  {masteryStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded border border-line px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">
          暂无生词
        </div>
      )}
    </section>
  );
}

const masteryStatusOptions: Array<{ value: VocabularyMasteryStatus; label: string }> = [
  { value: "new", label: "新词" },
  { value: "learning", label: "学习中" },
  { value: "mastered", label: "已掌握" }
];

const sourceTypeLabels: Record<StudySourceType, string> = {
  manual_input: "手动输入",
  video_subtitle: "视频字幕",
  external_manual: "外链手动"
};

function getStudyHref(projectId: string, subtitleLineId?: string): string {
  const baseHref = `/projects/${projectId}/study`;
  return subtitleLineId ? `${baseHref}?lineId=${subtitleLineId}` : baseHref;
}
