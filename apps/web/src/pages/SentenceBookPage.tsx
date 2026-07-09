import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FavoriteSentenceSummary } from "@scenego/shared";
import { Link } from "react-router-dom";
import { listFavoriteSentences, updateSentenceProgress } from "../api/sentences.js";
import { updateStudyItem } from "../api/studyItems.js";
import { useAuthStore } from "../stores/authStore.js";

export function SentenceBookPage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const favoritesQuery = useQuery({
    queryKey: ["favorite-sentences"],
    queryFn: () => listFavoriteSentences(token ?? ""),
    enabled: Boolean(token)
  });
  const unfavoriteMutation = useMutation({
    mutationFn: async (sentence: FavoriteSentenceSummary) => {
      if (sentence.source === "study_item") {
        await updateStudyItem(token ?? "", sentence.studyItem?.id ?? sentence.id, { isFavorite: false });
        return;
      }

      await updateSentenceProgress(token ?? "", sentence.id, { isFavorite: false });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
    }
  });

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">句子本</h1>
      {favoritesQuery.isLoading ? (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载中...</div>
      ) : favoritesQuery.data?.sentences.length ? (
        <div className="space-y-3">
          {favoritesQuery.data.sentences.map((sentence) => (
            <article key={sentence.id} className="rounded border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-panel px-2 py-1 text-xs font-semibold text-slate-600">
                      {getSourceLabel(sentence)}
                    </span>
                    {sentence.studyItem?.sourceNote ? (
                      <span className="text-xs text-slate-500">{sentence.studyItem.sourceNote}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 font-medium">{sentence.textOriginal}</p>
                  {sentence.translation ? <p className="mt-2 text-sm text-slate-600">{sentence.translation}</p> : null}
                  {sentence.project?.title ? <p className="mt-2 text-sm text-slate-600">{sentence.project.title}</p> : null}
                </div>
                <button
                  className="rounded border border-line px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                  type="button"
                  disabled={unfavoriteMutation.isPending}
                  onClick={() => unfavoriteMutation.mutate(sentence)}
                >
                  取消收藏
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {getSentenceHref(sentence) ? (
                  <Link
                    className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white"
                    to={getSentenceHref(sentence) ?? "/sentences"}
                  >
                    {sentence.source === "study_item" ? "查看学习内容" : sentence.subtitleLineId ? "回到这句" : "回到项目"}
                  </Link>
                ) : null}
                {sentence.subtitleLine ? (
                  <span className="text-xs text-slate-500">
                    {formatPlaybackTime(sentence.subtitleLine.startTime)}
                  </span>
                ) : null}
              </div>
              {sentence.note ? <p className="mt-3 rounded bg-panel p-3 text-sm text-slate-700">{sentence.note}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">
          暂无收藏句子
        </div>
      )}
    </section>
  );
}

function getSentenceHref(sentence: FavoriteSentenceSummary): string | undefined {
  if (sentence.source === "study_item") {
    return `/study-items/${sentence.studyItem?.id ?? sentence.id}`;
  }

  if (!sentence.projectId) {
    return undefined;
  }

  return getStudyHref(sentence.projectId, sentence.subtitleLineId);
}

function getStudyHref(projectId: string, subtitleLineId?: string): string {
  const baseHref = `/projects/${projectId}/study`;
  return subtitleLineId ? `${baseHref}?lineId=${subtitleLineId}` : baseHref;
}

function getSourceLabel(sentence: FavoriteSentenceSummary): string {
  return sentence.source === "study_item" ? "文本学习" : "视频句子";
}

function formatPlaybackTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
