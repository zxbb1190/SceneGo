import { useQuery } from "@tanstack/react-query";
import type { ReviewAttemptSummary } from "@scenego/shared";
import { Link } from "react-router-dom";
import { listMistakes } from "../api/review.js";
import { useAuthStore } from "../stores/authStore.js";

export function MistakesPage() {
  const token = useAuthStore((state) => state.accessToken);
  const mistakesQuery = useQuery({
    queryKey: ["mistakes"],
    queryFn: () => listMistakes(token ?? ""),
    enabled: Boolean(token)
  });
  const attempts = mistakesQuery.data?.attempts ?? [];

  return (
    <section className="space-y-4">
      <div className="rounded border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">错题本</h1>
            <p className="mt-1 text-sm text-slate-600">记录模糊、不认识和 AI 练习答错的内容。</p>
          </div>
          <Link className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white" to="/review/today">
            今日复习
          </Link>
        </div>
      </div>

      {mistakesQuery.isLoading ? (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载中...</div>
      ) : attempts.length ? (
        <div className="divide-y divide-line rounded border border-line bg-white">
          {attempts.map((attempt) => (
            <MistakeItem key={attempt.id} attempt={attempt} />
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">
          暂无错题
        </div>
      )}
    </section>
  );
}

function MistakeItem({ attempt }: { attempt: ReviewAttemptSummary }) {
  const title = attempt.target.vocabularyItem?.word ?? attempt.target.studyItem?.textOriginal ?? "复习内容";
  const meaning = attempt.target.vocabularyItem?.meaning ?? attempt.target.studyItem?.translation;

  return (
    <article className="grid gap-3 p-4 md:grid-cols-[160px_minmax(0,1fr)_180px]">
      <div>
        <span className="rounded bg-panel px-2 py-1 text-xs font-semibold text-slate-600">
          {resultLabels[attempt.result]}
        </span>
        {attempt.isCorrect === false ? <p className="mt-2 text-xs text-rose-600">练习答错</p> : null}
      </div>
      <div className="min-w-0">
        <p className="break-words font-medium">{title}</p>
        {meaning ? <p className="mt-1 text-sm text-slate-600">{meaning}</p> : null}
        {attempt.quiz ? (
          <div className="mt-3 rounded bg-panel p-3 text-sm">
            <p className="font-semibold">练习题</p>
            <p className="mt-1 text-slate-700">{attempt.quiz.questionText}</p>
            {attempt.userAnswer ? <p className="mt-2 text-slate-600">你的答案：{attempt.userAnswer}</p> : null}
            <p className="mt-1 text-slate-600">参考答案：{attempt.quiz.answer}</p>
            {attempt.quiz.explanation ? <p className="mt-1 text-slate-500">{attempt.quiz.explanation}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 md:justify-end md:text-right">
        <div className="w-full">{formatDate(attempt.createdAt)}</div>
        {attempt.studyItemId ? (
          <Link className="rounded border border-line px-3 py-2 text-sm text-slate-700" to={`/study-items/${attempt.studyItemId}`}>
            查看
          </Link>
        ) : null}
      </div>
    </article>
  );
}

const resultLabels = {
  known: "认识",
  fuzzy: "模糊",
  unknown: "不认识"
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
